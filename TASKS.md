# POC task list — Dynatrace × S3 Tables

Stopped to capture the plan. Nothing below is deployed yet. Each **[CREATE]** step is gated
on your explicit go; **[READ]** steps are read-only; **[LOCAL]** steps are files on disk.

## Decisions locked

- **Account:** `347830095179` (personal Isengard), **region us-east-1**.
- **Metric path:** build a **ground-up, standalone CloudWatch Metric Stream** dedicated to
  this POC — a **new** stream `s3tables-to-dynatrace`. Do **not** reuse or modify the
  existing `agentcore-to-dynatrace` stream (that's another test; leave it untouched).
- **No external-ID / cross-account Dynatrace role** (that's the polling path and the
  Isengard trigger). Streams only: CloudWatch → Firehose → Dynatrace HTTP endpoint
  (`https://hgd83841.da.dynatrace.com/api/aws/firehose/v1/metrics`) authed by an ingest token.
- **Token:** create a **new scoped Dynatrace ingest token** (`metrics.ingest`) via the
  golden token (DT API), store it in **AWS Secrets Manager**, reference from CFN. Standalone,
  no token inline — best practice for the POC.
- **IaC:** plain **CloudFormation** only (no SAM/macros).
- **Dataset:** BTS Airline On-Time Performance. **Cost dashboard:** in scope.
- **Schema-evolution column (Phase 2):** `co2_estimate_kg` (default; swap for real BTS
  codeshare field if preferred).

## Why "new stream" (the gated approach, plainly)

A CloudWatch Metric Stream has a namespace **include/exclude filter**. Rather than editing
your existing `agentcore-to-dynatrace` stream's filter (risky — it's live for another test),
we stand up a **separate** stream that includes only `AWS/S3/Tables` and delivers through its
own Firehose to Dynatrace. It's isolated, disposable, and can't disturb your other work.
"Gated" just means: I show you each create step and wait for your "go" before running it.

---

## Phase 0 — access & recon

- [x] **[READ]** Confirm creds for `347830095179` (role `mimjasov-admin`); identity verified.
- [x] **[READ]** Inventory account: existing streams (`agentcore-to-dynatrace`,
      `CustomFull-*`), Firehoses, `DynatraceMonitoringRole`, no S3 table buckets yet.
- [ ] **[READ]** Inspect `agentcore-to-dynatrace` stream + its Firehose destination to copy
      the known-good Firehose→Dynatrace pattern (endpoint, token wiring, roles).

## Phase 1 — streaming plumbing (ground-up, standalone)

- [ ] **[CREATE]** Dynatrace: mint a scoped ingest token (`metrics.ingest`) via golden token.
- [ ] **[CREATE]** `infra/metricstream.yaml` (CFN): Secrets Manager secret (DT token),
      Firehose → DT metrics endpoint (S3 bucket for failed-record backup), Firehose delivery
      role, metric-stream role, `AWS::CloudWatch::MetricStream` with include filter
      `AWS/S3/Tables`. All in-account roles; no external trust.
- [ ] **[CREATE]** Deploy `metricstream.yaml`.

## Phase 2 — S3 Tables + data

- [ ] **[CREATE]** Deploy `infra/s3tables.yaml`: TableBucket `airline-datalake-poc` +
      namespace `ops` + `flights` table (BTS Iceberg schema).
- [ ] **[CREATE]** Enable 1-min request metrics (`put-table-bucket-metrics-configuration`).
- [ ] **[LOCAL]** `uv sync` in `poc/`.
- [ ] **[CREATE]** `loader.py`: load BTS month(s) via S3 Tables IRC endpoint.
- [ ] **[CREATE]** `loadgen.py`: sustained read/write traffic (realtime at scale).

## Phase 3 — verify + dashboards

- [ ] **[READ]** Confirm `AWS/S3/Tables` metrics arriving in Dynatrace (DQL check).
- [ ] **[CREATE]** `dashboards/usage.json`: throughput, latency, errors, storage, compaction.
- [ ] **[CREATE]** `dashboards/cost.json`: estimated $ by namespace/table (DQL × parameterized
      unit prices from AWS Pricing).

## Phase 4 — differentiator (IRC)

- [ ] **[CREATE]** `irc_metadata.py`: schema/snapshot metrics + events → Dynatrace.
- [ ] **[CREATE]** `evolve_schema.py`: add `co2_estimate_kg` → schema-change event.
- [ ] **[READ]** Demo: schema-change event marker lands on the compaction/cost spike.

## Phase 5 — wrap

- [ ] **[LOCAL]** Blog draft from the dashboards + correlation demo.
- [ ] **[LOCAL]** Record account map + streams-not-polling decision into notes/steering.

---

## Verify-at-build (don't assume)

- BTS prezip URL pattern.
- CFN `IcebergMetadata` nested property names.
- PyIceberg S3 Tables IRC config strings (uri / signing-name / warehouse).
- Dynatrace Firehose **metrics** endpoint path + required token scope.
- Cost unit prices (pull from AWS Pricing).

## Already scaffolded (local, not deployed)

`infra/s3tables.yaml`, `infra/deploy.sh`, `poc/common.py` (account set to 347830095179),
`poc/loader.py`, `poc/loadgen.py`, `poc/irc_metadata.py`, `poc/evolve_schema.py`,
`poc/pyproject.toml`, `poc/README.md`, `.gitignore`, `design/poc-plan.md`.
