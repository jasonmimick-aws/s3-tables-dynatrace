# Observing Amazon S3 Tables with Dynatrace — One-Pager

**Status:** Live POC verified in AWS `347830095179` / us-east-1 · **Date:** 2026-10-02

---

## Context

Amazon S3 Tables provide fully managed Apache Iceberg storage for analytics. As lakehouse
workloads move onto S3 Tables, customers need to know both whether the storage service is
healthy and what is happening inside their tables. This defines how much of that Dynatrace
answers today and what it should build to answer the rest.

## What exists today

Dynatrace observes S3 Tables through **CloudWatch metrics ingestion** of the `AWS/S3/Tables`
namespace (metrics launched Nov 2025), via CloudWatch Metric Streams or metric polling. The
telemetry is operational: daily **storage** (bytes, file counts) and **maintenance**
(compaction bytes/objects), plus opt-in 1-minute **request** metrics (request mix, bytes
up/down, 4xx/5xx, first-byte and total latency), all split by table bucket, namespace, and
table. This supports capacity, cost-trend, maintenance, performance, and reliability
monitoring of the storage layer, with Dynatrace Intelligence baselining and alerting on top.

## The gaps

CloudWatch metrics describe how the storage *service* behaves, not the Iceberg model inside
the tables. Not available through this path: **schema and schema-evolution history**;
**snapshot history, partition specs, row/file counts**; table bucket → namespace → table
**topology** as first-class entities; and **correlation** of an operational symptom to the
data-model change that caused it. These live in the Iceberg catalog, reachable only through
an Iceberg REST Catalog (IRC) integration.

## What the POC shows

A live POC runs **two telemetry planes against the same real airline dataset**
(`airline-datalake-poc / ops / flights`):

- **Native operational plane (ships today):** a dedicated Metric Stream serializes
  `AWS/S3/Tables` as OpenTelemetry 1.0 → Firehose → Dynatrace. No cross-account IAM trust;
  the ingest token stays in Secrets Manager and is resolved at runtime; failed records are
  backed up and the pipeline is self-observable.
- **Iceberg intelligence plane (the gap, prototyped):** a collector reads the S3 Tables IRC
  endpoint and publishes record/file counts, storage bytes, snapshots, schema field count,
  and schema-change events.

Demonstrated capability: the schema evolved 15 → 16 fields (added `co2_estimate_kg`) and
Dynatrace captured the change as an event correlated — on the same dashboards — with table
growth, snapshots, maintenance, latency, and estimated cost. Two dashboards (Operations and
FinOps & Intelligence) present it. Scale is real: 1.3M+ rows under continuous read/write,
~20 ms avg latency, zero errors.

## What is missing / what Dynatrace should build

Native support is accurate but shallow: streamed metrics arrive as generic keys, not a
first-class S3 Tables service with an entity model (Datadog already ships a dedicated tile;
Dynatrace does not yet). The net-new opportunity is a supported **IRC-based integration**:

1. First-class entities for table bucket → namespace → table topology.
2. Schema + snapshot model with evolution history from Iceberg metadata.
3. Correlation of operational metrics to the data-model change that drove them.
4. Packaging as a supported connector (S3 Tables IRC and/or Glue IRC) with one-click enable.

The POC's second plane is a working prototype of exactly this.

## Recommendation

- **GTM now** on the operational plane — accurate, shippable, and the subject of the blog.
- **Build** the IRC integration for schema/topology/correlation — the differentiated value.
- **POC hygiene:** the demo workload runs ~48 small CodeBuild jobs/day; disable the schedule
  when not demoing (teardown runbook in `TASKS-kiro.md`).

---

*Full write-up in `README.md` · live state in `STATUS.md` · blog draft in `BLOG-DRAFT.md`*
