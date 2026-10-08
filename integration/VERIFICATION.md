# Verification — Dynatrace × S3 Tables integration + app

Last run: 2026-10-08, AWS account `347830095179` / us-east-1, Dynatrace tenant `hgd83841`.
All tests run against the **live** table `airline-datalake-poc / ops / flights`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Collector reads live IRC | **PASS** | `s3tables_core.collect('airline-datalake-poc','ops','flights')` → rows=21,347,752, files=22, snapshots=7,325, fields=16, storage_bytes=120,756,654, schema_id=1 |
| 2 | Live Dynatrace metric ingest | **PASS** | POST `/api/v2/metrics/ingest` → `{"linesOk":5,"linesInvalid":0,"error":null}` (all 5 `s3tables.iceberg.*` lines accepted) |
| 3 | Live Dynatrace event ingest | **PASS** | POST `/api/v2/events/ingest` (schema-state CUSTOM_INFO) → `{"reportCount":1,...,"status":"OK"}` |
| 4 | Extension builds + signs | **PASS** | `dt-sdk build` exit 0 → signed `dist/custom_s3tables.iceberg-0.1.0.zip` (deployable to an ActiveGate) |
| 5 | Dynatrace app builds | **PASS** | `npm run build` (Node v24.12) exit 0 — all four screens bundle |

## Notes / known requirements

- **Ingest token** is fetched at runtime from AWS Secrets Manager
  `s3tables-dynatrace/metadata-ingest-token` (stored as a raw token string, scopes
  `metrics.ingest` + `events.ingest`). Never inlined in source or config.
- **Extension build prerequisites on this host:** the uv venv needs `pip`
  (`uv pip install pip`) because `dt-sdk build` shells out to `python -m pip wheel`; and a
  dev signing cert from `dt-sdk gencerts` (writes `~/.dynatrace/certificates/`).
- **App requires Node 24** — `export PATH="/opt/homebrew/opt/node@24/bin:$PATH"` before
  `npm`/`dt-app`.

## Not yet done (needs interactive / infra, not a code gap)

- **Extension deploy** needs an ActiveGate to upload the signed zip to.
- **App deploy / live preview** (`dt-app dev` or `dt-app deploy`) needs an interactive
  Dynatrace OAuth login and an app OAuth client — cannot run headless.
- The signed extension zip bundles macOS wheels; a real ActiveGate (Linux) deploy should be
  built with an explicit Linux platform/python target (see `integration/README.md`).
