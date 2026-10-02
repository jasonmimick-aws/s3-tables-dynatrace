# Integration pattern analysis — what Dynatrace actually uses for S3 Tables

## TL;DR

Dynatrace's shipping S3 Tables support is **CloudWatch metrics ingestion of the
`AWS/S3/Tables` namespace** via the standard AWS integration. It is **not** any of the
three Iceberg-catalog patterns raised in the thread. The same is true of Datadog — its
docs explicitly describe enabling `S3/Tables` under *Metric Collection* in the AWS
integration tile, which is CloudWatch metric collection, not an IRC/data-plane connection.

So the common hypothesis "they most likely used pattern 1 (S3 Tables IRC endpoint)" is
**incorrect** for both vendors as of today.

## Two different axes (why the thread's framing needs correcting)

The three patterns Nidhi listed are all **data-plane / Apache Iceberg catalog** access —
they read the actual table data, metadata, schemas, and snapshots:

| # | Pattern | What it accesses | Protocol |
|---|---|---|---|
| 1 | S3 Tables **Iceberg REST Catalog (IRC)** endpoint | Table/namespace catalog, schemas, snapshots, data | Iceberg REST spec, directly against the table bucket |
| 2 | **Glue IRC** endpoint | Same, but catalog hosted in Glue Data Catalog (adds Lake Formation perms, federation) | Iceberg REST spec via Glue |
| 3 | **ISV solution built on** an S3 Tables bucket | The ISV stores/queries its own data in S3 Tables | Any Iceberg engine (Spark, PyIceberg, etc.) |

What Dynatrace/Datadog ship is a **fourth, orthogonal axis** — the **control-plane /
operational** view:

| # | Pattern | What it accesses | Protocol |
|---|---|---|---|
| 4 | **CloudWatch metrics ingestion** | Operational metrics about the table buckets (storage bytes, file counts, compaction, request counts, latency, errors) | AWS → CloudWatch `AWS/S3/Tables` namespace → Dynatrace |

Pattern 4 tells you *how the storage is behaving* (size, growth, request health). Patterns
1–3 would let you see *what is inside* (tables, columns, schema evolution, snapshot
history). They are complementary, not substitutes — and only pattern 4 exists in-product
today.

## How Dynatrace ingests it (pattern 4, in detail)

Dynatrace's AWS Cloud Platform Monitoring ingests CloudWatch metrics two ways:

- **CloudWatch Metric Streams** (recommended for new connections) — AWS streams metrics in
  near real time through Amazon Data Firehose to a Dynatrace endpoint.
- **Metric polling** (classic connections) — Dynatrace polls the CloudWatch API.

Critically, Dynatrace can ingest **any CloudWatch namespace from any AWS service** that
publishes to CloudWatch (per the "CloudWatch metrics" docs). The `AWS/S3/Tables` namespace
is therefore ingestible today. The open question is **packaging**:

- Datadog shipped a **dedicated S3 Tables integration tile** (`amazon-s3-tables`, v1.1.0)
  with named `aws.s3.tables.*` metrics and a one-click enable.
- Dynatrace, as of this research, does **not** appear to have a dedicated S3 Tables Hub
  tile. S3 Tables metrics would come in as a (possibly manually added) **custom CloudWatch
  namespace**, rather than a first-class supported service with purpose-built entities.
  → This is the item to verify (see "Open questions") and a potential competitive gap /
  easy GTM + build win.

Note on timeline: **S3 Tables CloudWatch metrics launched November 2025**, so any
"integration" is recent and thin by nature. Storage + maintenance metrics are free/daily;
request metrics are opt-in per table bucket and billed as CloudWatch custom metrics.

## What "deep integration" would require (the Build opportunity)

Jason's note — "basic discovery + metrics, but not deep schema discovery yet" — maps
exactly to the gap between pattern 4 (have) and patterns 1/2 (don't have). A deeper
integration would connect to the **S3 Tables IRC endpoint (pattern 1)** or **Glue IRC
endpoint (pattern 2)** to surface:

- Table bucket → namespace → table **topology** as first-class Dynatrace entities
- **Schema** and schema-evolution history per table
- **Snapshot** history, partition spec, row/file counts from Iceberg metadata
- Correlation of operational metrics (pattern 4) with the specific table/schema causing
  them (e.g. a schema change that triggered a compaction storm)

Pattern 1 vs. 2 trade-off for a Dynatrace build:
- **Pattern 1 (S3 Tables IRC)** — direct, fewer dependencies, no Glue/Lake Formation
  needed. Best when the customer just has S3 Tables.
- **Pattern 2 (Glue IRC)** — centralized catalog, Lake Formation permissions, catalog
  federation (e.g. external catalogs into Glue). Best for customers standardized on Glue
  Data Catalog / SageMaker Lakehouse.
- A robust integration would likely support **both**, selected by customer configuration.

Pattern 3 (ISV builds *on* S3 Tables) is a different play — e.g. Dynatrace using S3 Tables
as a sink for its own long-term telemetry/Grail export. Lower relevance to this ask but
worth flagging as a separate conversation.

## Recommendation

1. **GTM now** on pattern 4 (CloudWatch metrics) — accurate, shippable today, and the
   subject of the blog post. Be precise that it is operational monitoring, not schema.
2. **Propose Build** for pattern 1/2 (IRC) schema-level integration — this is the
   differentiated, net-new value and the right topic for Michael Stephan + Nidhi's
   build funding.
3. Verify the packaging question (dedicated tile vs. custom namespace) before publishing.

## Open questions to verify

- Does Dynatrace have (or plan) a **dedicated S3 Tables Hub tile** / supported-service
  entry, or is it generic custom-namespace ingestion today?
- Are **purpose-built entities** created for table buckets, or do metrics attach to a
  generic cloud entity?
- Is anything on the Dynatrace **roadmap** for Iceberg/S3 Tables schema discovery? (Michael
  Stephan)
- Confirm against a **live environment** with real S3 Tables buckets what actually renders.
