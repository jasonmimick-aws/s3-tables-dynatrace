"""Phase 2 — teach Dynatrace to speak IRC.

Reads Iceberg catalog metadata (schema, snapshots) over the S3 Tables IRC endpoint and
publishes it to Dynatrace as metrics + events. This is the data neither Dynatrace nor
Datadog surfaces today via CloudWatch.

The IRC read + serialization now live in the shared, hardened collector
``s3tables_core``; this module keeps the original publish behavior: Dynatrace
metrics/events ingest plus the CloudWatch mirror, and the schema-change hook used
by ``evolve_schema.py``.

Usage: uv run python irc_metadata.py
"""
from common import NS, TABLE, BUCKET, REGION, dt_metrics, dt_event
import s3tables_core as core
import boto3


def publish() -> set[str]:
    state = core.collect(BUCKET, NS, TABLE)

    # Dynatrace metrics (contract keys/dims come straight from the collector).
    dt_metrics(core.to_metric_lines(state))

    # CloudWatch mirror (unchanged behavior — the native-metrics path).
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
                ("Rows", state.row_count, "Count"),
                ("Files", state.file_count, "Count"),
                ("Snapshots", state.snapshot_count, "Count"),
                ("SchemaFields", state.field_count, "Count"),
                ("StorageBytes", state.storage_bytes, "Bytes"),
            ]
        ],
    )

    # Dynatrace "schema state" CUSTOM_INFO event.
    event = core.to_schema_state_event(state)
    dt_event(event["title"], event["properties"])

    fields = {f.split(":", 1)[0] for f in state.fields}
    print(f"published schema ({len(fields)} fields), {state.snapshot_count} snapshots")
    return fields


def emit_schema_change(old_fields: set[str], new_fields: set[str]) -> None:
    event = core.schema_change_event(
        old_fields, new_fields, bucket=BUCKET, ns=NS, table=TABLE
    )
    if event:
        dt_event(event["title"], event["properties"])
        props = event["properties"]
        print(f"schema change event: +{props['added']} -{props['removed']}")


if __name__ == "__main__":
    publish()
