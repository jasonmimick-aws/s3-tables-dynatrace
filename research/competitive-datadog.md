# Competitive reference — Datadog's S3 Tables integration

Source: https://docs.datadoghq.com/integrations/amazon-s3-tables/ (integration v1.1.0).

## Pattern used

**CloudWatch metrics (pattern 4), not IRC.** Setup instructions:

1. Set up the base AWS integration first.
2. In the AWS integration tile, enable **`S3/Tables` under the Metric Collection tab**.
3. Install the dedicated **Amazon S3 Tables** integration tile.

This is CloudWatch metric collection against the `AWS/S3/Tables` namespace — the same
source Dynatrace uses. Datadog does **not** connect to the S3 Tables or Glue IRC endpoint,
and collects **no** schema, snapshot, or table-topology data. The integration explicitly
includes **no events** and **no service checks** — metrics only.

## What Datadog ships that Dynatrace (apparently) does not

- A **dedicated integration tile** for S3 Tables with named `aws.s3.tables.*` metrics and a
  one-click enable, rather than generic custom-namespace ingestion.
- Pre-named latency percentile metrics (`.p90`, `.p99`, `.minimum`, `.maximum`).

## Datadog metric namespace (`aws.s3.tables.*`) — for mapping/parity

Storage/maintenance: `table_bucket_size_bytes`, `table_bucket_number_of_objects`,
`table_size_bytes`, `table_number_of_objects`, `compaction_bytes_processed_binpack`,
`compaction_bytes_processed_sort`, `compaction_objects_count_binpack`,
`compaction_objects_count_sort`.

Requests: `all_requests`, `get_requests`, `put_requests`, `head_requests`,
`post_requests`, `get_table_metadata_location`, `update_table_metadata_location`,
`bytes_downloaded`, `bytes_uploaded`, `4xx_errors`, `5xx_errors`.

Latency: `first_byte_latency` and `total_request_latency`, each with
`.maximum / .minimum / .p90 / .p99`.

## Takeaway for the blog / GTM

Dynatrace reaches **parity on the data** (same CloudWatch source), and its differentiation
is **Davis / Dynatrace Intelligence** (automatic baselining, anomaly detection, causal
analysis) on top of these metrics. The clearest **leapfrog** is a schema-level IRC
integration (pattern 1/2) that neither vendor offers today.
