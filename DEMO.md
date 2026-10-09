# Demo runbook & talk track — Dynatrace × Amazon S3 Tables

A ~5-minute walkthrough of the live POC: a multi-domain S3 Tables lakehouse observed in
Dynatrace through both the native CloudWatch plane and the IRC intelligence plane.

## The lakehouse you're demoing

One S3 Tables bucket, `airline-datalake-poc`, five domains (~38.6M rows total):

| Namespace / table | Domain | Rows |
|---|---|---|
| `ops/flights` | Airline on-time (BTS) | ~21.5M |
| `rides/trips` | NYC-taxi-style trips | ~4.05M |
| `retail/orders` | E-commerce orders | ~4M |
| `iot/sensor_readings` | IoT device telemetry | ~6M |
| `security/auth_events` | Auth / access events | ~3M |

## Pre-flight (do this right before recording)

```bash
# 1. Fresh AWS creds (Isengard tokens expire ~daily)
ada credentials update --account=347830095179 --role=mimjasov-admin --provider=isengard --once

# 2. Re-publish fresh metrics/events so the 24h windows are full
cd poc
TOKEN="$(aws secretsmanager get-secret-value --secret-id s3tables-dynatrace/metadata-ingest-token --query SecretString --output text --no-cli-pager)"
DT_TOKEN="$TOKEN" DT_BASE=https://hgd83841.live.dynatrace.com uv run python -u publish_all.py   # ~1 min

# 3. Start the app (opens browser; sign in to Dynatrace once)
cd .. && bash app/dev.sh
```

Record with macOS screen capture (`Cmd+Shift+5` → Record Selected Portion). Keep the browser
at the local-dev-server URL the CLI prints.

---

## Talk track

### 0 · Open (15s)
> "Amazon S3 Tables give you managed Apache Iceberg storage. The question we set out to
> answer: how much can Dynatrace actually tell you about a lakehouse built on them — and
> where's the opportunity to go deeper? This is a live POC against a real multi-domain
> lakehouse: airline, rides, retail, IoT, and security data — about 38 million rows."

### 1 · Overview (55s)  — *view: Overview*
> "The application discovers the connected customer's namespaces and tables at runtime—this
> demo happens to contain five domains. The bento KPIs summarize the current catalog, while
> the dataset catalog puts rows, files, snapshots, and columns beside each table. Native
> `AWS/S3/Tables` request, latency, throughput, and error telemetry completes the operational
> picture."

### 2 · Explore (2m 30s)  — *view: Explore*
> "Click a table on Overview to enter Explore with that dataset already selected, or use the
> chips to compare any subset. One scope drives the entire investigation. Iceberg state
> shows rows, files, snapshots, and current table metadata; Operations adds native AWS
> request, latency, throughput, and errors."
>
> "Data profile adds bounded, low-cardinality aggregates without moving raw rows into
> Dynatrace. Change intelligence separates actual contract changes from state heartbeats—we
> can see the real `co2_estimate_kg` addition and inspect the current field contract when one
> table is selected. Cost & capacity closes the loop with storage, file-monitoring, request,
> and per-table allocation estimates."

### 3 · Close — the pitch (30s)
> "So two planes: the native CloudWatch plane that ships today, and the IRC intelligence
> plane — topology, schema, snapshots, and data-level insights — that we prototyped here on
> Dynatrace's own AppEngine and Extensions 2.0 frameworks. The opportunity is to productize
> that second plane as a supported integration. The gap is real, and as you just saw, the
> fill is tractable."

---

## Numbers worth memorizing

- ~38.6M rows across 5 tables / 5 namespaces in one bucket.
- Flights: ~21.5M rows, 16 columns, thousands of snapshots.
- Native metric ingest: all lines accepted, zero invalid; schema events `status: OK`.
- Everything is real: live AWS account `347830095179`, live Dynatrace tenant `hgd83841`.

## If a tile is empty during the demo
The IRC/data metrics are sparse (ingested when the collector runs). Re-run `publish_all.py`
and refresh — the app's current-state queries use a 24h lookback and last-non-null, so a
fresh publish always fills them.
