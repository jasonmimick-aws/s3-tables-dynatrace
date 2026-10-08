"""Shared, hardened S3 Tables IRC collector.

This is the single collector used by every caller in the project:
local scripts (``irc_metadata.py``), the Dynatrace Extensions 2.0 extension
(``integration/``), and tests. It reads Iceberg table state over the Amazon
S3 Tables Iceberg REST Catalog (IRC) endpoint via PyIceberg's ``RestCatalog``
— exactly the config proven in ``common.py`` — and serializes it to the
Dynatrace metric keys and event names defined in
``design/integration-build-plan.md`` (the authoritative contract).

Design points:
- No Dynatrace token or boto3 dependency here; this module only *reads* IRC
  state and *produces* payloads. Ingest/mirroring stays in the callers so the
  helpers in ``common.py`` (``dt_metrics``/``dt_event``) keep working.
- Robust against empty tables, a table with no current snapshot, and snapshot
  summaries that are missing optional keys.

Metric contract (DO NOT rename — dashboards + app depend on these), dims
``bucket``, ``ns``, ``table``:
    s3tables.iceberg.rows
    s3tables.iceberg.files
    s3tables.iceberg.snapshots.count
    s3tables.iceberg.schema.fields
    s3tables.iceberg.storage.bytes

Event contract (CUSTOM_INFO):
    "S3 Tables schema state"  — current schema/snapshot snapshot
    "S3 Tables schema change" — added/removed columns
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Optional

from pyiceberg.catalog.rest import RestCatalog

import common

# Iceberg snapshot-summary keys we read (all optional at the Iceberg level).
_ROWS_KEY = "total-records"
_FILES_KEY = "total-data-files"
_BYTES_KEY = "total-files-size"

# Event titles — must match the contract exactly.
SCHEMA_STATE_EVENT = "S3 Tables schema state"
SCHEMA_CHANGE_EVENT = "S3 Tables schema change"


# --------------------------------------------------------------------------- #
# State model
# --------------------------------------------------------------------------- #
@dataclass
class TableState:
    """Point-in-time view of one S3 Tables Iceberg table.

    ``fields`` is a list of ``"name:type"`` strings (schema column order).
    ``snapshot_history`` is a list of ``{"snapshot_id": int, "timestamp_ms": int}``
    dicts, oldest-to-newest as returned by the table metadata.
    """

    bucket: str
    ns: str
    table: str
    schema_id: int
    fields: list[str] = field(default_factory=list)
    field_count: int = 0
    snapshot_count: int = 0
    current_snapshot_id: Optional[int] = None
    snapshot_history: list[dict[str, Optional[int]]] = field(default_factory=list)
    row_count: int = 0
    file_count: int = 0
    storage_bytes: int = 0

    def dims(self) -> str:
        """Dynatrace line-protocol dimension string: ``bucket=..,ns=..,table=..``."""
        return f"bucket={self.bucket},ns={self.ns},table={self.table}"


# --------------------------------------------------------------------------- #
# Catalog
# --------------------------------------------------------------------------- #
def _arn_for(bucket: str) -> str:
    """Table-bucket ARN used as the IRC ``warehouse``.

    For the default bucket, prefer the ARN written by ``infra/deploy.sh``
    (via ``common.table_bucket_arn``); otherwise synthesize from the configured
    region/account so the collector works for any bucket name.
    """
    if bucket == common.BUCKET:
        return common.table_bucket_arn()
    return f"arn:aws:s3tables:{common.REGION}:{common.ACCOUNT}:bucket/{bucket}"


def catalog_for(bucket: str) -> RestCatalog:
    """S3 Tables Iceberg REST Catalog scoped to ``bucket``.

    Same config strings as ``common.catalog()`` (uri, sigv4, signing name/region)
    with the warehouse pointed at the requested bucket's ARN.
    """
    return RestCatalog(
        name="s3tables",
        **{
            "type": "rest",
            "uri": f"https://s3tables.{common.REGION}.amazonaws.com/iceberg",
            "warehouse": _arn_for(bucket),
            "rest.sigv4-enabled": "true",
            "rest.signing-name": "s3tables",
            "rest.signing-region": common.REGION,
        },
    )


# --------------------------------------------------------------------------- #
# Collection
# --------------------------------------------------------------------------- #
def _safe_int(value: Any) -> int:
    """Coerce an Iceberg summary value (often a string) to int; 0 on anything odd."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _summary_dict(current_snapshot: Any) -> dict[str, Any]:
    """Return the current snapshot's summary as a plain dict, robustly.

    Handles: no current snapshot, a summary that is already a dict, or a
    pydantic ``Summary`` model (``.model_dump()``).
    """
    if current_snapshot is None:
        return {}
    summary = getattr(current_snapshot, "summary", None)
    if summary is None:
        return {}
    if isinstance(summary, dict):
        return summary
    model_dump = getattr(summary, "model_dump", None)
    if callable(model_dump):
        try:
            return model_dump()
        except Exception:  # pragma: no cover - defensive
            return {}
    # Fallback: best-effort attribute scrape.
    try:
        return dict(summary)
    except Exception:  # pragma: no cover - defensive
        return {}


def collect(
    bucket: str = common.BUCKET,
    ns: str = common.NS,
    table: str = common.TABLE,
    *,
    catalog: Optional[RestCatalog] = None,
) -> TableState:
    """Read one table's live state over IRC and return a :class:`TableState`.

    ``catalog`` may be supplied to reuse an existing ``RestCatalog`` (e.g. the
    Extensions 2.0 extension holds one open across its poll loop); otherwise a
    catalog scoped to ``bucket`` is created.
    """
    cat = catalog if catalog is not None else catalog_for(bucket)
    tbl = cat.load_table(f"{ns}.{table}")

    schema = tbl.schema()
    fields = [f"{f.name}:{f.field_type}" for f in schema.fields]

    snapshots = list(tbl.metadata.snapshots or [])
    snapshot_history = [
        {
            "snapshot_id": getattr(s, "snapshot_id", None),
            "timestamp_ms": getattr(s, "timestamp_ms", None),
        }
        for s in snapshots
    ]

    current = tbl.current_snapshot()
    summary = _summary_dict(current)

    return TableState(
        bucket=bucket,
        ns=ns,
        table=table,
        schema_id=schema.schema_id,
        fields=fields,
        field_count=len(fields),
        snapshot_count=len(snapshots),
        current_snapshot_id=getattr(current, "snapshot_id", None) if current else None,
        snapshot_history=snapshot_history,
        row_count=_safe_int(summary.get(_ROWS_KEY, 0)),
        file_count=_safe_int(summary.get(_FILES_KEY, 0)),
        storage_bytes=_safe_int(summary.get(_BYTES_KEY, 0)),
    )


# --------------------------------------------------------------------------- #
# Serializers — EXACT contract metric keys / event names
# --------------------------------------------------------------------------- #
def to_metric_lines(state: TableState) -> list[str]:
    """Serialize a :class:`TableState` to Dynatrace line-protocol metric lines.

    Keys and dims match the metric contract exactly.
    """
    dims = state.dims()
    return [
        f"s3tables.iceberg.rows,{dims} {state.row_count}",
        f"s3tables.iceberg.files,{dims} {state.file_count}",
        f"s3tables.iceberg.snapshots.count,{dims} {state.snapshot_count}",
        f"s3tables.iceberg.schema.fields,{dims} {state.field_count}",
        f"s3tables.iceberg.storage.bytes,{dims} {state.storage_bytes}",
    ]


def to_schema_state_event(state: TableState) -> dict:
    """Build the ``S3 Tables schema state`` CUSTOM_INFO event payload.

    Returns a full event dict (``eventType``/``title``/``properties``). Property
    values are stringified so the payload is ready for the events ingest API;
    ``common.dt_event`` also stringifies, so passing ``event["properties"]`` to
    it remains correct.
    """
    props = {
        "bucket": state.bucket,
        "namespace": state.ns,
        "table": state.table,
        "schema_id": state.schema_id,
        "fields": ",".join(state.fields),
        "current_snapshot": state.current_snapshot_id
        if state.current_snapshot_id is not None
        else "none",
        "snapshot_count": state.snapshot_count,
        "row_count": state.row_count,
        "file_count": state.file_count,
        "storage_bytes": state.storage_bytes,
    }
    return {
        "eventType": "CUSTOM_INFO",
        "title": SCHEMA_STATE_EVENT,
        "properties": {k: str(v) for k, v in props.items()},
    }


def _names(fields: Iterable[str]) -> set[str]:
    """Normalize an iterable of field identifiers to a set of column names.

    Accepts either bare names (``"carrier"``) or ``"name:type"`` strings
    (``"carrier:string"``) — comparing on the name before the first colon.
    """
    out: set[str] = set()
    for f in fields:
        if f is None:
            continue
        out.add(str(f).split(":", 1)[0])
    return out


def schema_change_event(
    old_fields: Iterable[str],
    new_fields: Iterable[str],
    *,
    bucket: Optional[str] = None,
    ns: Optional[str] = None,
    table: Optional[str] = None,
) -> Optional[dict]:
    """Build the ``S3 Tables schema change`` event, or ``None`` if nothing changed.

    ``old_fields``/``new_fields`` may be bare column names or ``"name:type"``
    strings (e.g. ``TableState.fields``). ``bucket``/``ns``/``table`` are
    optional context; when provided they are added to the event properties to
    satisfy the full event contract.
    """
    old = _names(old_fields)
    new = _names(new_fields)
    added = new - old
    removed = old - new
    if not added and not removed:
        return None

    props: dict[str, Any] = {}
    if bucket is not None:
        props["bucket"] = bucket
    if ns is not None:
        props["namespace"] = ns
    if table is not None:
        props["table"] = table
    props["added"] = ",".join(sorted(added)) or "none"
    props["removed"] = ",".join(sorted(removed)) or "none"

    return {
        "eventType": "CUSTOM_INFO",
        "title": SCHEMA_CHANGE_EVENT,
        "properties": {k: str(v) for k, v in props.items()},
    }


if __name__ == "__main__":
    # Convenience: print the default table's live state as a quick manual check.
    import json

    st = collect()
    print(json.dumps(st.__dict__, indent=2, default=str))
