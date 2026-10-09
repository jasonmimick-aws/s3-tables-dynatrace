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

### 1 · Overview (45s)  — *tab: Overview*
> "Top line: lakehouse-wide totals — rows, data files, snapshots, and five tables — all
> computed live from the Iceberg catalog. Below, every dataset with its row, file, snapshot,
> and column counts. And at the bottom, the **native** `AWS/S3/Tables` CloudWatch metrics —
> request volume, latency, bytes, and 4xx/5xx — streamed into Dynatrace via Metric Streams.
> That native plane is what ships today."

### 2 · Topology (40s)  — *tab: Topology*
> "Here's the piece that does **not** exist in any observability tool today: the S3 Tables
> lakehouse as first-class topology — table bucket → namespace → table. Pick any table and
> you get its current Iceberg state: rows, data files, snapshots, schema fields. This comes
> from the Iceberg REST Catalog, not CloudWatch."

### 3 · Datasets — data insights (60s)  — *tab: Datasets*
> "And we don't stop at structure. For every domain we sample the actual rows and compute
> business aggregates — top categories and numeric averages — ingested as Dynatrace metrics.
> Trips break down by payment type; orders by product category; IoT by device status; auth
> events by result — look, you can see success vs. blocked vs. challenged right here. That's
> data-level signal sitting next to operational signal, in one platform."

### 4 · Schema timeline (40s)  — *tab: Schema timeline*
> "Iceberg is schema-evolving storage, so schema change is an operational event. Here's the
> current 16-field flights schema, and the timeline of schema-state and schema-change events
> — including when we added `co2_estimate_kg`. Now a schema change can be correlated with a
> compaction storm, a latency spike, or a cost jump."

### 5 · FinOps (40s)  — *tab: FinOps*
> "Because we have live Iceberg state, we can turn it into a running cost estimate — storage,
> object monitoring, request costs — and project it to airline scale. Estimates, not billing,
> but driven by real table state and reconciled against native daily storage metrics."

### 6 · Close — the pitch (30s)
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
