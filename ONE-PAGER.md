# Dynatrace × Amazon S3 Tables — One-Pager

**Owner:** Jason Mimick (AWS PSA → Dynatrace)  ·  **Initiative owner:** Nidhi Gupta (S3 Tables adoption)
**Status:** Live POC verified in AWS `347830095179` / us-east-1  ·  **Date:** 2026-10-02

---

## The ask

The S3 Tables adoption initiative needed to know **what Dynatrace observability exists for Amazon S3 Tables today**, which **integration pattern** it uses, and whether the next move is **GTM** (surface what already ships) or **Build** (fund a deeper, net-new integration).

## The finding (premise correction)

The originating thread assumed Dynatrace used one of three **data-plane / Iceberg-catalog** patterns: S3 Tables IRC, AWS Glue IRC, or an ISV solution on an S3 Tables bucket.

**Dynatrace — like Datadog — uses none of these.** The shipping integration is **CloudWatch metrics ingestion** of the `AWS/S3/Tables` namespace via the standard AWS integration (Metric Streams / polling). That is operational, infrastructure-level observability. The three IRC patterns describe **table/schema data-plane access** — which is exactly the **deep integration that does not exist yet**.

So the tracks separate cleanly:

- **GTM-now** — CloudWatch-metrics monitoring already works. Surface those data points, publish the blog, position the capability.
- **Build (opportunity)** — a true **IRC-based** integration for schema discovery, table/namespace topology, and snapshot/compaction insight. Net-new; this is where the initiative could fund Build.

## What we built (proof, not slideware)

A live, end-to-end POC loading real **BTS airline on-time data** into S3 Tables (`airline-datalake-poc / ops / flights`) and observing it through **two complementary telemetry planes**:

- **Native plane** — a dedicated CloudWatch Metric Stream serializes `AWS/S3/Tables` as OpenTelemetry 1.0 and delivers through Amazon Data Firehose to Dynatrace's official AWS metrics endpoint. No cross-account IAM trust; ingest token stays in AWS Secrets Manager and is resolved by Firehose at runtime.
- **IRC plane (the differentiator)** — a collector reads the Iceberg REST Catalog and publishes record/file counts, storage bytes, snapshots, schema field count, and **schema-change events** that CloudWatch cannot see.

**Demonstrated:** schema evolved 15 → 16 fields (added `co2_estimate_kg`); Dynatrace captured the change event correlated with table growth, snapshots, latency, and estimated cost. Two dashboards live — **Operations** and **FinOps & Intelligence** (live IRC-driven cost estimate, reconciled against native daily storage metrics).

**Scale verified:** 1.3M+ rows, continuous scheduled read/write workload, ~20 ms avg latency, zero 4xx/5xx. The lack of a first-class S3 Tables entity model in Dynatrace is itself direct evidence for the "support is shallow" thesis that motivates Build.

## What's next (decision needed)

1. **GTM-now vs. Build** — align with **Michael Stephan (Dynatrace PM)** on roadmap; decide whether Nidhi's initiative funds a supported IRC collector (first-class table-bucket / namespace / table topology).
2. **Publish** — finalize and ship the blog post (draft complete).
3. **POC hygiene** — the demo workload runs ~48 small CodeBuild jobs/day; disable the schedule when not demoing (teardown runbook documented).

**The one-line pitch to Build:** CloudWatch tells you the storage *service* is healthy; only an IRC-aware integration tells you what is happening *inside* your tables — and that is the gap Dynatrace can own.

---

*Operations dashboard · FinOps & Intelligence dashboard · full state in `STATUS.md` · blog in `BLOG-DRAFT.md`*
