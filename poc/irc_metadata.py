"""Phase 2 — teach Dynatrace to speak IRC.

Reads Iceberg catalog metadata (schema, snapshots) over the S3 Tables IRC endpoint and
publishes it to Dynatrace as metrics + events. This is the data neither Dynatrace nor
Datadog surfaces today via CloudWatch.

Usage: uv run python irc_metadata.py
"""
from common import catalog, NS, TABLE, BUCKET, REGION, dt_metrics, dt_event
import boto3


def publish() -> set[str]:
    tbl = catalog().load_table(f"{NS}.{TABLE}")
    schema = tbl.schema()
    snapshots = list(tbl.metadata.snapshots)
    current = tbl.current_snapshot()
    summary = current.summary.model_dump() if current else {}
    row_count = int(summary.get("total-records", 0))
    file_count = int(summary.get("total-data-files", 0))
    storage_bytes = int(summary.get("total-files-size", 0))
    dims = f"bucket={BUCKET},ns={NS},table={TABLE}"

    dt_metrics([
        f"s3tables.iceberg.schema.fields,{dims} {len(schema.fields)}",
        f"s3tables.iceberg.snapshots.count,{dims} {len(snapshots)}",
        f"s3tables.iceberg.rows,{dims} {row_count}",
        f"s3tables.iceberg.files,{dims} {file_count}",
        f"s3tables.iceberg.storage.bytes,{dims} {storage_bytes}",
    ])
    boto3.client("cloudwatch", region_name=REGION).put_metric_data(
        Namespace="S3Tables/POC",
        MetricData=[
            {
                "MetricName": name,
                "Dimensions": [
                    {"Name": "Bucket", "Value": BUCKET},
                    {"Name": "Namespace", "Value": NS},
                    {"Name": "Table", "Value": TABLE},
                ],
                "Value": value,
                "Unit": unit,
            }
            for name, value, unit in [
                ("Rows", row_count, "Count"),
                ("Files", file_count, "Count"),
                ("Snapshots", len(snapshots), "Count"),
                ("SchemaFields", len(schema.fields), "Count"),
                ("StorageBytes", storage_bytes, "Bytes"),
            ]
        ],
    )

    fields = {f.name for f in schema.fields}
    dt_event("S3 Tables schema state", {
        "bucket": BUCKET,
        "namespace": NS,
        "table": TABLE,
        "schema_id": schema.schema_id,
        "fields": ",".join(f"{f.name}:{f.field_type}" for f in schema.fields),
        "current_snapshot": current.snapshot_id if current else "none",
        "snapshot_count": len(snapshots),
        "row_count": row_count,
        "file_count": file_count,
        "storage_bytes": storage_bytes,
    })
    print(f"published schema ({len(fields)} fields), {len(snapshots)} snapshots")
    return fields


def emit_schema_change(old_fields: set[str], new_fields: set[str]) -> None:
    added, removed = new_fields - old_fields, old_fields - new_fields
    if added or removed:
        dt_event("S3 Tables schema change", {
            "bucket": BUCKET, "namespace": NS, "table": TABLE,
            "added": ",".join(sorted(added)) or "none",
            "removed": ",".join(sorted(removed)) or "none",
        })
        print(f"schema change event: +{sorted(added)} -{sorted(removed)}")


if __name__ == "__main__":
    publish()
