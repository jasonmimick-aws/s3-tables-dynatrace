# L8 review — optimizing the Dynatrace × S3 Tables POC

Review of `TASKS.md` from a principal-engineer standpoint: de-risk the critical path, kill
the 24-hour wait, harden the token handling, and sequence so failures surface in minutes,
not hours. Nothing here deploys anything.

## Verdict

The plan is sound and the account/stream decisions are right. But as written it back-loads
its two real risks (the Dynatrace stream **format** and the **PyIceberg→IRC write**) behind
a lot of setup, and it leans the cost/storage story on **daily** CloudWatch metrics — a
~24h stall for a POC. Six changes below remove most of the schedule risk and make the
dashboards live in minutes.

---

## The only two things that can actually sink this

1. **Metric-stream output format mismatch.** The #1 cause of "metrics silently never arrive
   in Dynatrace" is the Metric Stream `OutputFormat` / Firehose wiring not matching what the
   DT Firehose endpoint expects. We have a **working reference in the same account**
   (`agentcore-to-dynatrace`). **Clone its exact settings** — `OutputFormat` (JSON vs
   OpenTelemetry 1.0.0), the HTTP endpoint URL/path, buffering, and content encoding — rather
   than hand-authoring. This is the single highest-leverage move.
2. **PyIceberg write to the S3 Tables IRC endpoint.** Everything data-side depends on one
   `tbl.append()` working against SigV4 + the right catalog config + a compatible PyIceberg
   version. Treat this as a **15-minute smoke test done early**, not an assumption baked into
   `loader.py`.

Everything else is routine.

## Six optimizations (high-impact first)

### 1. Build a thin "walking skeleton" and fail fast
Front-load both risks with throwaway probes before any real data:
- **Pipe probe:** stand up the stream+Firehose, but **temporarily include a chatty namespace**
  (e.g. `AWS/Firehose` or `AWS/S3`) alongside `AWS/S3/Tables`. Confirm points land in
  Dynatrace within ~3–10 min, then **narrow the filter to `AWS/S3/Tables` only**. This proves
  the DT format/endpoint independently of S3 Tables — isolating variable #1.
- **IRC probe:** after the S3 Tables stack exists, do one tiny PyIceberg append (5 rows) and
  read-back. If it works, `loader.py`/`loadgen.py` are trivial. If not, we learn in minutes
  and switch loaders (see #6).

### 2. Kill the 24-hour wait — drive live cost/storage from IRC, reconcile with CloudWatch
S3 Tables **storage + compaction metrics are daily**, and the cost story is storage-dominated.
Waiting a day for a POC is unacceptable. Instead:
- Pull **table size bytes + file counts from Iceberg metadata via the IRC endpoint**
  (available the instant we write data) and compute the **live storage-cost estimate** from
  those.
- When the daily CloudWatch `TableBucketStorage` metric ticks, **reconcile** the estimate
  against it on the same chart.

This turns the daily-metric weakness into a **showcase of the Phase 2 IRC differentiator
feeding the cost dashboard** — exactly the "deep integration" story. Net: cost + storage
dashboards are live immediately; request/latency/error are live from 1-min request metrics.

### 3. Token never touches CloudFormation — use Firehose SecretsManagerConfiguration
Don't pass the DT ingest token as a CFN parameter (it lands in stack parameter history) and
don't inline it. Mint the scoped token via the golden token, `create-secret` it, and have the
Firehose HTTP-endpoint destination reference it via **`SecretsManagerConfiguration`
(SecretARN + RoleARN)** so Firehose resolves the key at runtime. Token stays only in Secrets
Manager; CFN never sees the value. Scope the token to **`metrics.ingest` only**.

### 4. Expect S3 Tables metrics to arrive *generically keyed* in Dynatrace — and use it
Dynatrace has no S3 Tables service/entity model, so streamed `AWS/S3/Tables` metrics will
likely land as **raw/generic metric keys with dimensions**, not a first-class entity with
topology. Verify the actual keys early (a DQL `fetch` right after the pipe probe) so dashboard
DQL is correct — and note it: the lack of entity mapping is **direct evidence for the "support
is shallow" thesis** and strengthens the Build pitch.

### 5. Make the pipeline self-observable (so debugging is seconds, not guesswork)
Add to the stream stack: watch Firehose `DeliveryToHttpEndpoint.Success` /
`...Records`, and point failed records at the **S3 backup bucket** (`FailedDataOnly`). If DT
shows nothing, the backup bucket + that metric tell you instantly whether the problem is
AWS-side (nothing produced) or DT-side (delivery failing). Cheap insurance.

### 6. De-risk the loader: timebox PyIceberg, keep Athena as the fallback
PyIceberg is the lightest laptop path, so keep it primary — but **pin a known-good version**
and copy a proven config (AWS "PyIceberg via S3 Tables IRC" blog / Marvik example) verbatim
rather than guessing strings. **Timebox to ~45 min.** If it fights us, fall back to **Athena
`INSERT INTO`** against the S3 Tables catalog (managed, no local SigV4) — slightly more setup
(Lake Formation grant) but robust. Either way request metrics get generated.

## Security / hygiene (principal checklist)

- Least-privilege roles: metric-stream role → `firehose:PutRecord*` on **its** stream only;
  Firehose role → `s3:PutObject` on **its** backup prefix + `secretsmanager:GetSecretValue`
  on **its** secret only. No wildcards.
- S3 backup bucket: Block Public Access on, SSE, and a short lifecycle expiry (failed records
  are debug-only).
- Serverless throughout (Firehose/MetricStream/S3 Tables/Lambda-none) → **NAWS/PVRE EC2
  patching does not apply** here; don't over-engineer that.
- Tag everything `Owner=mimjasov`, `Project=s3tables-dt-poc` for cleanup/attribution.
- Token rotation note: it's a POC token; still store only in Secrets Manager and delete on
  teardown.

## Cost containment

- Request metrics bill as CloudWatch **custom metrics** (13 metrics × up to 3-dim cardinality,
  1-min). Trivial at POC scale but real — **stop `loadgen` and disable request metrics when
  idle**. Keep table/namespace cardinality to 1 each for the POC.
- Metric stream + Firehose ingestion costs are negligible at this volume.

## Optimized sequence (replaces TASKS.md phases 0–4)

```
0  [READ]   Inspect agentcore-to-dynatrace stream+Firehose -> clone format/endpoint/roles
1  [CREATE] metricstream.yaml: Firehose(+SecretsManagerConfig, S3 backup, success metric),
            MetricStream filter = [chatty ns + AWS/S3/Tables], least-priv roles
2  [VERIFY] metrics land in DT in minutes (chatty ns) -> then narrow filter to AWS/S3/Tables
3  [CREATE] s3tables.yaml: TableBucket + ops namespace + flights table
4  [VERIFY] 5-row PyIceberg append+read over IRC (timeboxed; Athena fallback)   <-- gate
5  [CREATE] enable request metrics; load 1 BTS month; start loadgen
6  [VERIFY] AWS/S3/Tables metrics in DT; capture actual metric keys (DQL)
7  [CREATE] usage dashboard; cost dashboard (IRC-driven live + CloudWatch daily reconcile)
8  [CREATE] Phase 2: irc_metadata (schema/snapshots) + evolve_schema + correlation demo
9  [DOC]    teardown runbook (empty tables->bucket, delete stream/firehose/secret/backup)
```

The gate at step 4 is the whole ballgame: if the IRC write works, the rest is execution.

## Revised ETA (vs TASKS.md)

- **Milestone A (metrics visibly in Dynatrace):** ~**60–90 min** — faster than before because
  step 2 proves the pipe with a chatty namespace, independent of S3 Tables and PyIceberg.
- **IRC write proven (step 4 gate):** +**15–45 min** (the real uncertainty, now isolated).
- **Usage + cost dashboards live:** +**1.5–2 h** — and **no 24h wait**, because cost/storage
  is IRC-driven (optimization #2).
- **Phase 2 correlation demo:** +**1.5–2 h**.
- **Net: a focused ~half day** gets a fully live POC (usage + cost + IRC correlation), with the
  daily CloudWatch storage metric reconciling in later as a bonus — not a blocker.

## Teardown (write before we build)

S3 Tables bucket won't delete while tables exist: delete table(s) → namespace → bucket.
Then delete metric stream, Firehose, S3 backup bucket (empty first), the Secrets Manager
secret, and the DT token. Per your rule: **I will not delete anything without explicit
confirmation.**

## Sharpened verify-at-build

- Clone `agentcore-to-dynatrace` `OutputFormat` + endpoint path (don't guess OTLP vs JSON).
- Firehose `SecretsManagerConfiguration` property shape for HTTP endpoint destination.
- PyIceberg version + exact S3 Tables IRC catalog config (copy a known-good example).
- CFN `AWS::S3Tables::Table` `IcebergMetadata` nesting.
- Actual Dynatrace metric keys for streamed `AWS/S3/Tables` (likely generic).
- BTS prezip URL; cost unit prices from AWS Pricing.
