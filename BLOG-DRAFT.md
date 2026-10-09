# Monitor an airline data lake on Amazon S3 Tables with Dynatrace

Amazon S3 Tables provides managed Apache Iceberg storage optimized for analytics workloads. This proof of concept shows how an airline can load current flight-operation data into S3 Tables and observe both the storage service and the tables inside it with Dynatrace.

## The scenario

A travel platform continuously analyzes flight choices, routes, delays, cancellations, and operational performance. We loaded the January 2025 US Department of Transportation BTS Airline On-Time Performance corpus—539,747 flight records—into an S3 Tables Iceberg table and then ran sustained filtered queries and micro-batch appends.

The table is `airline-datalake-poc / ops / flights` in AWS account `347830095179`, Region `us-east-1`.

## Two complementary telemetry planes

### Native AWS operational telemetry

S3 Tables publishes request, latency, error, storage, and maintenance metrics to the `AWS/S3/Tables` CloudWatch namespace. A dedicated CloudWatch Metric Stream serializes those metrics as OpenTelemetry 1.0 and sends them through Amazon Data Firehose to Dynatrace's official AWS metrics endpoint.

This path uses no cross-account Dynatrace IAM trust. The scoped ingest token remains in AWS Secrets Manager and Firehose retrieves it at runtime.

### Iceberg table intelligence via IRC

CloudWatch describes service behavior but doesn't expose the Iceberg model inside the table. The POC also connects to the S3 Tables Iceberg REST Catalog (IRC) endpoint and publishes:

- Record and data-file counts
- Current storage bytes
- Snapshot count and current snapshot
- Schema field count and schema-state events
- Explicit schema-change events

During the workload, the table schema evolved from 15 to 16 fields by adding `co2_estimate_kg`. Dynatrace captured the change alongside table growth and snapshot churn, demonstrating how an IRC-aware integration can correlate data-model changes with operational and cost effects.

## FinOps view

The FinOps dashboard converts live Iceberg storage and object counts into an immediate operational estimate using current AWS S3 Tables example rates:

- Standard storage: $0.0265/GB-month
- Object monitoring: $0.025/1,000 objects
- GET: $0.0004/1,000 requests
- PUT: $0.005/1,000 requests
- Binpack compaction: $0.005/GB plus $0.002/1,000 objects processed

These are estimates, not billing records, and actual rates vary by Region and usage. The
Dynatrace App combines native request metrics with IRC-derived storage and file state.

## What the POC proves

1. S3 Tables can feed Dynatrace through a native AWS Metric Streams architecture.
2. Multiple real-world dataset domains can be loaded and queried through the standard Iceberg REST Catalog path.
3. Dynatrace can surface immediate table-level state that CloudWatch does not provide.
4. Schema evolution can be captured as an observability event and correlated with table growth, snapshots, maintenance, latency, and estimated cost.
5. A native Dynatrace App can present the operational and Iceberg intelligence planes as one investigation workflow.

## Dynatrace App experience

The customer-neutral **Overview** discovers the connected environment's namespaces and
tables, then combines estate KPIs, current Iceberg metadata, contract-change awareness, and
native AWS telemetry.

![Amazon S3 Tables Observability Overview](docs/images/app-overview-long.png)

The **Explore** workspace keeps one dataset, any subset, or all tables in scope while moving
through Iceberg state, operational activity, sampled data profile, actual schema changes,
and cost/capacity.

![Amazon S3 Tables Observability Explore](docs/images/app-explore-long.png)

The next product-level step is for Dynatrace to support this application and its IRC
collector as a native integration, including first-class table-bucket, namespace, and table
entities plus supported installation and lifecycle management.
