# S3 Tables integration — Dynatrace Extensions 2.0

A Dynatrace Extensions 2.0 Python extension (`custom:s3tables.iceberg`) that runs on an
ActiveGate, polls the Amazon S3 Tables **Iceberg REST Catalog (IRC)**, and reports to
Dynatrace what the native CloudWatch integration cannot: Iceberg schema, snapshots, and
table topology. All IRC reading is delegated to the shared collector
[`../poc/s3tables_core.py`](../poc/s3tables_core.py).

## What it produces

**Metrics** (dimensions `bucket`, `ns`, `table`):

| Key | Meaning |
|---|---|
| `s3tables.iceberg.rows` | total records |
| `s3tables.iceberg.files` | total data files |
| `s3tables.iceberg.snapshots.count` | snapshot count |
| `s3tables.iceberg.schema.fields` | schema field (column) count |
| `s3tables.iceberg.storage.bytes` | current file storage bytes |

**Events** — `CUSTOM_INFO`: `S3 Tables schema state` (every cycle) and `S3 Tables schema
change` (on field add/remove).

**Topology** — custom entity types `s3tables:table_bucket` → `s3tables:namespace` →
`s3tables:table` (contains relationships), built from the metric dimensions.

## Layout

```
extension/extension.yaml        manifest: metrics, topology, python datasource
extension/activationSchema.json config UI (region, bucket, table, credential ref)
s3tables_iceberg/__main__.py    Extension subclass; scheduled query() -> collector
setup.py / pyproject.toml        packaging
```

## Build

```bash
cd integration
uv sync
uv pip install pip                 # dt-sdk shells out to `python -m pip wheel`
uv run dt-sdk gencerts             # one-time dev signing cert -> ~/.dynatrace/certificates
uv run dt-sdk build                # -> dist/custom_s3tables.iceberg-<ver>.zip (signed)
```

> The signed zip bundles wheels for the **build host** platform. This macOS build is fine
> for local validation; for a real (Linux) ActiveGate, build with an explicit Linux
> platform/python target so `pyarrow`/`pyiceberg` wheels match the ActiveGate.

## Configure & deploy (ActiveGate)

1. Upload `dist/custom_s3tables.iceberg-<ver>.zip` to your environment (Extensions) and
   deploy it to an ActiveGate host group that can reach AWS.
2. Create a monitoring configuration from `activationSchema.json`: AWS region, table bucket
   (`airline-datalake-poc`), namespace/table, and the Dynatrace ingest credential.
3. The ingest token is read from **AWS Secrets Manager**
   (`s3tables-dynatrace/metadata-ingest-token`, scopes `metrics.ingest`+`events.ingest`) —
   never inline a token in the manifest or config.

## Verified

See [`VERIFICATION.md`](VERIFICATION.md) — collector read, live metric + event ingest, and a
signed build all pass against the live `airline-datalake-poc/ops/flights` table.
