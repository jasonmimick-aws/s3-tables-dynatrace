"""Data-level insights for an S3 Tables Iceberg table.

Where ``s3tables_core`` reports the table's *shape* (schema, snapshots, counts),
this module reads a sample of the actual *rows* over the S3 Tables IRC and computes
business aggregates — flights by carrier, average departure delay, cancellation rate,
top routes — then serializes them to Dynatrace metrics + a summary event.

This is the "option 1" data-insights path: it rides the exact same ingest pipeline as
the metadata collector, so Dynatrace surfaces data-level signal alongside the
operational/IRC signal. Aggregates are computed over a bounded sample (``limit`` rows)
to keep the scan fast and light; ``rows_analyzed`` records the sample size.

Usage: uv run python s3tables_data_insights.py          # collect + ingest
       uv run python s3tables_data_insights.py 2000000  # custom sample size
"""
from __future__ import annotations

import sys
from dataclasses import dataclass, field

import common
from s3tables_core import catalog_for

# Columns we need for the aggregates (projection keeps the scan light).
_COLS = ("carrier", "origin", "dest", "dep_delay", "arr_delay", "cancelled", "diverted")
_DEFAULT_LIMIT = 1_000_000
_TOP_N = 12


@dataclass
class DataInsights:
    bucket: str
    ns: str
    table: str
    rows_analyzed: int = 0
    distinct_carriers: int = 0
    overall_avg_dep_delay: float = 0.0
    cancel_rate_pct: float = 0.0
    cancelled: int = 0
    diverted: int = 0
    # list of {carrier, flights, avg_dep_delay, avg_arr_delay}
    by_carrier: list[dict] = field(default_factory=list)
    # list of {route, flights}
    top_routes: list[dict] = field(default_factory=list)

    def dims(self) -> str:
        return f"bucket={self.bucket},ns={self.ns},table={self.table}"


def _sanitize(v: str) -> str:
    """Dimension-safe value: keep it simple (alnum, dash, underscore)."""
    s = "".join(ch if (ch.isalnum() or ch in "-_") else "_" for ch in str(v).strip())
    return s[:48] or "unknown"


def compute(bucket: str, ns: str, table: str, limit: int = _DEFAULT_LIMIT) -> DataInsights:
    tbl = catalog_for(bucket).load_table(f"{ns}.{table}")
    # Project only the columns we aggregate; bound the scan with ``limit``.
    scan = tbl.scan(selected_fields=_COLS, limit=limit)
    df = scan.to_pandas()

    out = DataInsights(bucket=bucket, ns=ns, table=table, rows_analyzed=int(len(df)))
    if out.rows_analyzed == 0:
        return out

    # Normalize numeric columns (nullable doubles -> float, NaN preserved).
    for c in ("dep_delay", "arr_delay", "cancelled", "diverted"):
        if c in df:
            df[c] = df[c].astype("float64")

    out.overall_avg_dep_delay = round(float(df["dep_delay"].mean(skipna=True)), 2) if "dep_delay" in df else 0.0
    out.cancelled = int(df["cancelled"].fillna(0).gt(0).sum()) if "cancelled" in df else 0
    out.diverted = int(df["diverted"].fillna(0).gt(0).sum()) if "diverted" in df else 0
    out.cancel_rate_pct = round(out.cancelled / out.rows_analyzed * 100, 3)

    # Flights + delays by carrier (top N by flight count).
    if "carrier" in df:
        g = df.groupby(df["carrier"].fillna("UNKNOWN"))
        agg = g.agg(
            flights=("carrier", "size"),
            avg_dep_delay=("dep_delay", "mean"),
            avg_arr_delay=("arr_delay", "mean"),
        ).reset_index(names="carrier")
        agg = agg.sort_values("flights", ascending=False).head(_TOP_N)
        out.distinct_carriers = int(df["carrier"].nunique())
        out.by_carrier = [
            {
                "carrier": str(r.carrier),
                "flights": int(r.flights),
                "avg_dep_delay": round(float(r.avg_dep_delay), 2) if r.avg_dep_delay == r.avg_dep_delay else 0.0,
                "avg_arr_delay": round(float(r.avg_arr_delay), 2) if r.avg_arr_delay == r.avg_arr_delay else 0.0,
            }
            for r in agg.itertuples(index=False)
        ]

    # Top routes by flight count.
    if "origin" in df and "dest" in df:
        routes = (df["origin"].fillna("???") + "-" + df["dest"].fillna("???")).value_counts().head(_TOP_N)
        out.top_routes = [{"route": str(k), "flights": int(v)} for k, v in routes.items()]

    return out


def to_metric_lines(di: DataInsights) -> list[str]:
    base = di.dims()
    lines = [
        f"s3tables.data.rows_analyzed,{base} {di.rows_analyzed}",
        f"s3tables.data.overall_avg_dep_delay_min,{base} {di.overall_avg_dep_delay}",
        f"s3tables.data.cancel_rate_pct,{base} {di.cancel_rate_pct}",
        f"s3tables.data.cancellations,{base} {di.cancelled}",
        f"s3tables.data.diversions,{base} {di.diverted}",
        f"s3tables.data.distinct_carriers,{base} {di.distinct_carriers}",
    ]
    for c in di.by_carrier:
        carrier = _sanitize(c["carrier"])
        lines.append(f's3tables.data.flights_by_carrier,{base},carrier="{carrier}" {c["flights"]}')
        lines.append(f's3tables.data.avg_dep_delay_by_carrier_min,{base},carrier="{carrier}" {c["avg_dep_delay"]}')
        # Also publish to the schema-agnostic contract used by the unified
        # Data Intelligence screen across every lakehouse dataset.
        lines.append(f's3tables.data.category_count,{base},category="{carrier}" {c["flights"]}')
    lines.append(
        f's3tables.data.numeric_avg,{base},field="avg_dep_delay_min" {di.overall_avg_dep_delay}'
    )
    lines.append(
        f's3tables.data.numeric_avg,{base},field="cancel_rate_pct" {di.cancel_rate_pct}'
    )
    for r in di.top_routes:
        route = _sanitize(r["route"])
        lines.append(f's3tables.data.flights_by_route,{base},route="{route}" {r["flights"]}')
    return lines


def to_event(di: DataInsights) -> dict:
    top_carrier = di.by_carrier[0]["carrier"] if di.by_carrier else "none"
    top_route = di.top_routes[0]["route"] if di.top_routes else "none"
    return {
        "title": "S3 Tables data insight",
        "properties": {
            "bucket": di.bucket,
            "namespace": di.ns,
            "table": di.table,
            "rows_analyzed": str(di.rows_analyzed),
            "distinct_carriers": str(di.distinct_carriers),
            "overall_avg_dep_delay_min": str(di.overall_avg_dep_delay),
            "cancel_rate_pct": str(di.cancel_rate_pct),
            "top_carrier": str(top_carrier),
            "top_route": str(top_route),
        },
    }


def main() -> None:
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else _DEFAULT_LIMIT
    di = compute("airline-datalake-poc", "ops", "flights", limit=limit)
    print(f"analyzed {di.rows_analyzed:,} rows · {di.distinct_carriers} carriers · "
          f"avg dep delay {di.overall_avg_dep_delay} min · cancel {di.cancel_rate_pct}%")
    lines = to_metric_lines(di)
    print("metrics:", common.dt_metrics(lines))
    ev = to_event(di)
    print("event:", common.dt_event(ev["title"], ev["properties"]) or "ok")


if __name__ == "__main__":
    main()
