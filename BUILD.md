# Build & test runbook

End-to-end build, test, and deploy for the productized Dynatrace × Amazon S3 Tables
integration. Everything here was verified live against `airline-datalake-poc / ops / flights`
in AWS `347830095179` / us-east-1, Dynatrace tenant `hgd83841`
(see [`integration/VERIFICATION.md`](integration/VERIFICATION.md)).

## Components

| Path | What |
|---|---|
| `poc/s3tables_core.py` | shared collector — reads Iceberg state over the S3 Tables IRC; serializes metrics, events, topology |
| `integration/` | Dynatrace Extensions 2.0 extension (runs on an ActiveGate) built on the collector |
| `app/` | Dynatrace app (dt-app) — customer-neutral Overview + URL-scoped Explore workspace |

## Prerequisites

- AWS credentials for the account holding the table bucket (IRC reads are SigV4-signed).
- `uv` (Python); `node@24` for the app (`export PATH="/opt/homebrew/opt/node@24/bin:$PATH"`).
- Dynatrace ingest token in AWS Secrets Manager `s3tables-dynatrace/metadata-ingest-token`
  (scopes `metrics.ingest`+`events.ingest`). Never inline tokens.

## 1. Collector (read live Iceberg state)

```bash
cd poc && uv sync        # if pyarrow/pyiceberg wheels fail on 3.14: uv python pin 3.13 && uv sync
uv run python -c "import s3tables_core as c; print(c.collect('airline-datalake-poc','ops','flights'))"
```

## 2. Push to Dynatrace (end-to-end test)

```bash
cd poc
TOKEN="$(aws secretsmanager get-secret-value --secret-id s3tables-dynatrace/metadata-ingest-token \
  --query SecretString --output text --no-cli-pager)"
DT_TOKEN="$TOKEN" DT_BASE=https://hgd83841.live.dynatrace.com uv run python -c "
import s3tables_core as c, common
s=c.collect('airline-datalake-poc','ops','flights')
print('metrics:', common.dt_metrics(c.to_metric_lines(s)))
ev=c.to_schema_state_event(s); print('event:', common.dt_event(ev['title'], ev['properties']))"
# expect: {"linesOk":5,"linesInvalid":0,...} and event status OK
```

## 3. Build the extension

```bash
cd integration && uv sync && uv pip install pip
uv run dt-sdk gencerts        # one-time dev signing cert
uv run dt-sdk build           # -> dist/custom_s3tables.iceberg-<ver>.zip (signed)
```

Deploy: upload the signed zip to Dynatrace → Extensions, deploy to an ActiveGate that can
reach AWS, then create a monitoring config (region, bucket, namespace/table, credential).

## 4. Build / run the app

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
cd app && npm install && npm run build
npm run start     # local dev server (interactive Dynatrace login)
npm run deploy    # deploy to the environment (needs an app OAuth client)
```

## Legacy validation dashboards

The YAML definitions in `dashboards/` were used to validate metric keys and DQL before the
AppEngine experience existed. They remain as engineering reference only; the supported
customer UX proposed by this project is the **Amazon S3 Tables Observability App**.
