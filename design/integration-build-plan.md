# Build blueprint — Dynatrace S3 Tables integration + app

Single source of truth for the build. Every component below MUST conform to the contracts
here so the collector, the Extensions 2.0 integration, the Dynatrace app, and the existing
dashboards all line up on the same metric keys, event names, and topology.

## Goal

Turn the working IRC prototype (`poc/irc_metadata.py`) into two productized, testable
Dynatrace-native deliverables:

1. **`integration/`** — a **Dynatrace Extensions 2.0** Python extension (runs on an
   ActiveGate) that polls the Amazon S3 Tables Iceberg REST Catalog (IRC) on a schedule and
   ingests metrics, schema/snapshot **events**, and **topology** into Dynatrace. This is the
   "integration" that would live on the Dynatrace Hub.
2. **`app/`** — a **Dynatrace App** (AppEngine, built with the `dt-app` App Toolkit) that
   visualizes the data: overview, table-bucket→namespace→table topology browser, schema
   evolution timeline, and FinOps. This is the "build your own app" UX layer.

Both build on a shared, hardened collector module in `poc/`.

## Live resources (real — use these for testing)

- AWS account `347830095179`, region `us-east-1`, role `mimjasov-admin` (creds are live).
- S3 Tables bucket `airline-datalake-poc`, namespace `ops`, table `flights`.
- IRC catalog config (PyIceberg `RestCatalog`), proven working in `poc/common.py`:
  - `uri = https://s3tables.us-east-1.amazonaws.com/iceberg`
  - `warehouse = <table bucket ARN>` (`poc/.table_bucket_arn`, or
    `arn:aws:s3tables:us-east-1:347830095179:bucket/airline-datalake-poc`)
  - `rest.sigv4-enabled=true`, `rest.signing-name=s3tables`, `rest.signing-region=us-east-1`
- Dynatrace tenant `hgd83841`:
  - metrics ingest: `https://hgd83841.live.dynatrace.com/api/v2/metrics/ingest`
  - events ingest: `https://hgd83841.live.dynatrace.com/api/v2/events/ingest`
  - apps env: `https://hgd83841.apps.dynatrace.com`
- Ingest token: **fetch at runtime from AWS Secrets Manager** id
  `s3tables-dynatrace/metadata-ingest-token` (JSON `{"api_key":"..."}`, scopes
  `metrics.ingest`+`events.ingest`). NEVER hardcode a token in source, config, or prompts.

## Metric contract (DO NOT rename — dashboards + app depend on these)

IRC-derived metrics (Dynatrace line protocol, dims `bucket`, `ns`, `table`):

| Key | Meaning |
|---|---|
| `s3tables.iceberg.rows` | total records |
| `s3tables.iceberg.files` | total data files |
| `s3tables.iceberg.snapshots.count` | snapshot count |
| `s3tables.iceberg.schema.fields` | schema field (column) count |
| `s3tables.iceberg.storage.bytes` | current file storage bytes |

Native AWS metrics already arrive via CloudWatch Metric Streams under keys like
`cloud.aws.s3.tables.allRequestsBy...`, `...getRequestsBy...`, `...firstByteLatencyBy...`,
`...bytesDownloadedBy...`, `...4xxErrorsBy...` (see `dashboards/airline-operations.dashboard.yaml`
for the exact keys and DQL). The app reuses those verbatim.

## Event contract

`CUSTOM_INFO` events, titles exactly:
- `S3 Tables schema state` — props: bucket, namespace, table, schema_id, fields (csv
  `name:type`), current_snapshot, snapshot_count, row_count, file_count, storage_bytes.
- `S3 Tables schema change` — props: bucket, namespace, table, added (csv), removed (csv).

## Topology contract (NEW — the differentiator)

Custom entity types (Extensions 2.0 `topology`), with parent→child relationships:
- `s3tables:table_bucket` — key by bucket name.
- `s3tables:namespace` — key by `bucket/ns`; child of table_bucket.
- `s3tables:table` — key by `bucket/ns/table`; child of namespace; attributes: schema_id,
  field_count.
Relationship: `table_bucket` —contains→ `namespace` —contains→ `table`. Metrics above are
split by `bucket,ns,table` so they attach to the `s3tables:table` entities.

## App screens (dt-app, Strato components + DQL)

1. **Overview** — single-value tiles (rows, files, snapshots, schema fields) + native request
   volume / latency / errors (reuse DQL from the operations dashboard).
2. **Topology** — browse table bucket → namespace → table; select a table to see its current
   metrics.
3. **Schema timeline** — `fetch events | filter event.name startsWith "S3 Tables schema"`
   timeline + current schema field list.
4. **FinOps** — storage/request cost estimate (reuse DQL + unit rates from
   `dashboards/airline-finops.dashboard.yaml`).

## Repo layout to produce

```
poc/s3tables_core.py            shared hardened collector (IRC read -> metrics/events/topology)
integration/                    Dynatrace Extensions 2.0 python extension
  extension/extension.yaml       manifest: metrics, topology, schedule
  extension/activationSchema.json config UI (endpoint, bucket, creds ref)
  <python package>               wraps poc/s3tables_core
  README.md
app/                            dt-app project (npx dt-app@latest create)
  README.md
BUILD.md                        install/build/deploy/test runbook (root)
```

## Tooling notes (environment is preflighted)

- Node v23.11 present (dt-app targets Node 24 — scaffold/build anyway; if `dt-app dev` or
  create hard-blocks on the version, document it and hand-author the project structure).
- `npx dt-app@latest create --yes` to scaffold the app.
- Python 3.14 + uv present. For `poc/` deps use `uv sync` (pin `uv python pin 3.13` if
  pyiceberg/pyarrow 3.14 wheels are missing). Extensions SDK: `uv add dt-extensions-sdk`
  (provides the `dt-sdk` CLI; `dt-sdk build`, `dt-sdk run`/simulate).
- AWS creds are live → the IRC read path is testable now. DT deploy of the app needs an OAuth
  client; the extension deploy needs an ActiveGate — if those aren't available, build + local
  simulate + document the deploy step.

## Rules for all builders

- Conform to every contract above. Reuse existing metric keys / event names / DQL.
- Do NOT print, log, or hardcode tokens. Fetch the ingest token from Secrets Manager only.
- Do NOT run `git commit`, `git push`, or touch git — only create/edit files and verify.
  The orchestrator commits at the end.
- Work only in your assigned directory to avoid collisions.
- Verify what you build (run it); report what passed and what is blocked, with evidence.
