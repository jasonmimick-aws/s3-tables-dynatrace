# Data points Dynatrace can surface for S3 Tables

Dynatrace ingests the AWS CloudWatch **`AWS/S3/Tables`** namespace. Everything below is
sourced from AWS's authoritative CloudWatch metrics docs for S3 Tables. These are the data
points the blog post should surface. All metrics can be filtered/split by the three
dimensions at the bottom.

> Source: AWS S3 User Guide — "Monitoring metrics with Amazon CloudWatch" and
> "Metrics and dimensions" for S3 Tables. S3 Tables CloudWatch metrics launched Nov 2025.

## 1. Daily storage metrics — free, reported once/day

| Metric | Description | Unit | Stat |
|---|---|---|---|
| Total Bucket Storage | Storage in bytes used by all tables in a table bucket | Bytes | Sum |
| Total number of files | Total count of all files stored in a table bucket | Count | Sum |

Tracked per access tier and at table-bucket, table, and namespace level.

## 2. Table maintenance metrics — free, reported once/day

Automated S3-managed maintenance (e.g. compaction):

| Metric | Description | Unit | Stat |
|---|---|---|---|
| CompactionBytesProcessed | Bytes processed during table compaction operations | Bytes | Sum |
| CompactionObjectsCount | Objects processed during table compaction operations | Count | Sum |

(Datadog splits these into `binpack` and `sort` variants — i.e.
`compaction_bytes_processed_binpack/_sort` and `compaction_objects_count_binpack/_sort`.)

## 3. Request metrics — opt-in per table bucket, 1-minute, billed as custom metrics

Published only when all three dimensions (TableBucketName, Namespace, TableName) resolve;
otherwise use CloudTrail.

| Metric | Description | Unit | Stat |
|---|---|---|---|
| All requests count | Total HTTP requests to a table bucket (excludes Get/UpdateTableMetadataLocation) | Count | Sum |
| Get requests count | HTTP GET requests retrieving objects from tables | Count | Sum |
| Put requests count | HTTP PUT requests adding objects to tables | Count | Sum |
| Head requests count | HTTP HEAD requests retrieving metadata | Count | Sum |
| Post requests count | HTTP POST requests to tables | Count | Sum |
| UpdateTableMetadataLocation requests count | Metadata-location update requests | Count | Sum |
| GetTableMetadataLocation requests count | Metadata-location read requests | Count | Sum |
| BytesDownloaded | Bytes downloaded for table requests | Bytes | Sum |
| BytesUploaded | Bytes uploaded for table requests | Bytes | Sum |
| 4xxErrors | HTTP 4xx client error responses | Count | Sum |
| 5xxErrors | HTTP 5xx server error responses | Count | Sum |
| FirstByteLatency | Time from complete request received to first response byte | Milliseconds | Sum |
| TotalRequestLatency | Elapsed time from first byte received to last byte sent | Milliseconds | Sum |

Datadog additionally exposes latency as `min`/`max`/`p90`/`p99` gauges — these come from
CloudWatch statistic sets on the latency metrics, and Dynatrace can request the same
statistics when ingesting.

## Dimensions (filter / split)

| Dimension | Description | Example |
|---|---|---|
| TableBucketName | The S3 table bucket | `my-table-bucket` |
| Namespace | Namespace within the bucket containing one or more tables | `my-department` |
| TableName | A specific table within a namespace | `transactions` |

## What this enables in Dynatrace (observability use cases)

- **Capacity & cost** — storage-bytes and file-count growth trends per bucket/namespace/table.
- **Maintenance health** — compaction volume over time; spot runaway compaction.
- **Traffic & performance** — request mix (GET/PUT/HEAD/POST), throughput (bytes up/down),
  FirstByte/Total latency with percentiles.
- **Reliability** — 4xx/5xx error rate alerting.
- **Davis/Dynatrace Intelligence** — anomaly detection, baselining, and alerting on any of
  the above once ingested as timeseries.

## What is NOT available via this pattern (sets up the Build opportunity)

- Table **schema** and schema-evolution history
- Iceberg **snapshot** history, partition specs, row counts
- Table bucket → namespace → table **topology** as first-class entities
- Correlating an operational symptom to the specific **schema/table change** that caused it

These require an Iceberg REST Catalog integration (pattern 1 or 2) — see
[`integration-patterns.md`](integration-patterns.md).
