# Live POC status

Last verified: 2026-10-01 18:07 EDT

## Result

The end-to-end POC is running and verified in AWS account `347830095179`, Region `us-east-1`.

- **885,752 flight rows** in `airline-datalake-poc / ops / flights`
- **175 Iceberg data files and snapshots**
- **7,587,694 bytes** current Iceberg file storage
- Schema evolved from 15 to 16 fields; schema ID advanced from 0 to 1
- `co2_estimate_kg` schema-change event is visible in Dynatrace
- Native `AWS/S3/Tables` metrics are visible in Dynatrace
- The completed workload generated 45,671 requests, 23,850 GETs, and 1,159,062,348 downloaded bytes in the validation window, with zero 4xx or 5xx errors

## Dashboards

- [Airline Data Lake — Operations](https://hgd83841.apps.dynatrace.com/ui/apps/dynatrace.dashboards/dashboard/f00cf22e-4c6c-4847-bad1-6d2be5780ffc) — version 2
- [Airline Data Lake — FinOps & Intelligence](https://hgd83841.apps.dynatrace.com/ui/apps/dynatrace.dashboards/dashboard/0ac17116-8d77-4201-b96d-925bc939c2b7) — version 2

## Live AWS resources

- S3 Tables stack: `s3tables-dt-poc` — `CREATE_COMPLETE`
- Table bucket: `airline-datalake-poc`
- Namespace/table: `ops.flights`
- Request metrics configuration: `EntireBucket`
- Metric-stream stack: `s3tables-dt-metricstream` — `CREATE_COMPLETE`
- CloudWatch Metric Stream: `s3tables-to-dynatrace` — `running`, `opentelemetry1.0`, filter `AWS/S3/Tables`
- Firehose: `s3tables-to-dynatrace` -> `https://aws.cloud.dynatrace.com/metrics`
- Cloud loader stack: `s3tables-dt-cloud-loader` — `UPDATE_COMPLETE`
- CodeBuild project: `s3tables-bts-loader`
- Completed build: `ef8ffe79-95aa-4fa9-9b39-88894707d9d4` — `SUCCEEDED`
- Dynatrace tenant: `hgd83841`

## Verified Dynatrace signals

Native CloudWatch Metric Streams keys include:

- `cloud.aws.s3.tables.allRequestsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName`
- `cloud.aws.s3.tables.getRequestsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName`
- `cloud.aws.s3.tables.headRequestsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName`
- `cloud.aws.s3.tables.bytesDownloadedByAccountIdFilterIdNamespaceRegionTableBucketNameTableName`
- `cloud.aws.s3.tables.bytesUploadedByAccountIdFilterIdNamespaceRegionTableBucketNameTableName`
- `cloud.aws.s3.tables.firstByteLatencyByAccountIdFilterIdNamespaceRegionTableBucketNameTableName`
- `cloud.aws.s3.tables.totalRequestLatencyByAccountIdFilterIdNamespaceRegionTableBucketNameTableName`
- `cloud.aws.s3.tables.4xxErrorsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName`
- `cloud.aws.s3.tables.5xxErrorsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName`
- Metadata-location GET/UPDATE and POST/PUT request keys

IRC-derived keys include rows, files, storage bytes, snapshots, and schema fields. Dynatrace `CUSTOM_INFO` events record schema state and the `co2_estimate_kg` schema change.

## Firehose verification

- Firehose HTTP delivery success: 40 successful records in the final 15-minute verification window
- Failed-record backup: empty
- Required Secrets Manager shape: `{"api_key":"<token>"}`

## Cost dashboard assumptions

Current AWS S3 pricing example rates: storage `$0.0265/GB-month`, object monitoring `$0.025/1,000 objects`, GET `$0.0004/1,000`, PUT `$0.005/1,000`, binpack compaction `$0.005/GB + $0.002/1,000 objects`. Dashboard values are operational estimates, not billing data.

Daily storage and compaction CloudWatch metrics have not reached their reporting cycle yet. The dashboard uses immediate IRC storage/file state and will expose native daily signals when AWS publishes them.

## Security

- Metric-stream token secret: `s3tables-dynatrace/metrics-ingest-token` (`metrics.ingest` only)
- IRC metadata token secret: `s3tables-dynatrace/metadata-ingest-token` (`metrics.ingest`, `events.ingest`)
- No token values in source, CloudFormation parameters, or documentation
- No cross-account Dynatrace IAM trust; streaming uses in-account roles and outbound Firehose

## Update — 2026-10-02 10:19 EDT

- Root cause of "no data today": the original loader was a one-off run that ended 2026-10-01 18:05; nothing was generating requests.
- Added recurring workload: CodeBuild `s3tables-live-workload` (15-min read/write run) triggered by EventBridge Scheduler `s3tables-live-workload-every-30m`; `ConcurrentBuildLimit: 1` prevents overlap. Each run also publishes IRC table state to Dynatrace and CloudWatch (`S3Tables/POC`).
- Added AWS operator UX: CloudWatch dashboard `S3Tables-Dynatrace-POC` (stack `s3tables-dt-operator-dashboard`) — https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=S3Tables-Dynatrace-POC
- Verified today: two scheduled runs succeeded (09:32, 10:02); table now 1,315,752 rows / 391 snapshots; Dynatrace shows 79,469 requests and 2.35 GB downloaded in the last hour, ~20 ms avg latency, zero 5xx.
- Observed overnight S3 Tables automatic compaction: data files dropped from 175 to 29 before today's writes.
- Cost note: the schedule runs ~48 small CodeBuild builds/day. Disable with `aws scheduler update-schedule ... --state DISABLED` when not demoing.
