/**
 * Central DQL + contract constants for the S3 Tables observability app.
 *
 * Every query here is reused VERBATIM from the authoritative dashboards
 * (dashboards/airline-operations.dashboard.yaml and airline-finops.dashboard.yaml)
 * and the integration build plan (design/integration-build-plan.md), so the app,
 * the dashboards, the Extensions 2.0 integration and the collector all agree on the
 * same metric keys, event names and topology. DO NOT rename keys here.
 */

/** The POC table coordinates (AWS account 347830095179 / us-east-1). */
export const POC = {
  bucket: "airline-datalake-poc",
  namespace: "ops",
  table: "flights",
} as const;

/** IRC-derived metric keys (Dynatrace line protocol), split by {bucket, ns, table}. */
export const ICEBERG_METRICS = {
  rows: "s3tables.iceberg.rows",
  files: "s3tables.iceberg.files",
  snapshots: "s3tables.iceberg.snapshots.count",
  schemaFields: "s3tables.iceberg.schema.fields",
  storageBytes: "s3tables.iceberg.storage.bytes",
} as const;

/** FinOps unit rates (current AWS S3 pricing example — operational estimate, not billing). */
export const RATES = {
  storagePerGbMonth: 0.0265,
  monitoringPer1kObjects: 0.025,
  getPer1k: 0.0004,
  putPer1k: 0.005,
  binpackPerGb: 0.005,
  binpackPer1kObjects: 0.002,
} as const;

/* ----------------------------------------------------------------------------
 * Overview — single-value tiles (operations dashboard, verbatim).
 * Each returns a single record with the named field.
 * -------------------------------------------------------------------------- */
// IRC metrics are ingested only when the collector runs (sparse), unlike the
// per-minute native AWS metrics. So "current state" tiles pin a 24h lookback and
// take the last NON-null sample (arrayRemoveNulls) to always find the latest value
// regardless of the global timeframe.
export const SINGLE_VALUE = {
  rows: {
    field: "flights",
    query: `timeseries values=max(${ICEBERG_METRICS.rows}), from:now()-24h
| fieldsAdd flights=arrayLast(arrayRemoveNulls(values))
| fieldsKeep flights`,
  },
  files: {
    field: "files",
    query: `timeseries values=max(${ICEBERG_METRICS.files}), from:now()-24h
| fieldsAdd files=arrayLast(arrayRemoveNulls(values))
| fieldsKeep files`,
  },
  snapshots: {
    field: "snapshots",
    query: `timeseries values=max(${ICEBERG_METRICS.snapshots}), from:now()-24h
| fieldsAdd snapshots=arrayLast(arrayRemoveNulls(values))
| fieldsKeep snapshots`,
  },
  schemaFields: {
    field: "fields",
    query: `timeseries values=max(${ICEBERG_METRICS.schemaFields}), from:now()-24h
| fieldsAdd fields=arrayLast(arrayRemoveNulls(values))
| fieldsKeep fields`,
  },
} as const;

/* ----------------------------------------------------------------------------
 * Overview — native AWS request telemetry charts (operations dashboard, verbatim).
 * -------------------------------------------------------------------------- */
export const OPS_CHARTS = {
  requests: `timeseries all_requests=sum(cloud.aws.s3.tables.allRequestsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), get_requests=sum(cloud.aws.s3.tables.getRequestsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), head_requests=sum(cloud.aws.s3.tables.headRequestsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), metadata_reads=sum(cloud.aws.s3.tables.getTableMetadataLocationByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), metadata_updates=sum(cloud.aws.s3.tables.updateTableMetadataLocationByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), interval:1m`,
  latency: `timeseries first_byte_ms=avg(cloud.aws.s3.tables.firstByteLatencyByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), total_ms=avg(cloud.aws.s3.tables.totalRequestLatencyByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), interval:1m`,
  bytes: `timeseries downloaded=sum(cloud.aws.s3.tables.bytesDownloadedByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), uploaded=sum(cloud.aws.s3.tables.bytesUploadedByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), interval:1m`,
  errors: `timeseries errors_4xx=sum(cloud.aws.s3.tables.4xxErrorsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), errors_5xx=sum(cloud.aws.s3.tables.5xxErrorsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), interval:1m`,
} as const;

/* ----------------------------------------------------------------------------
 * Topology — current per-table state grouped by {bucket, ns, table}
 * (finops dashboard "metadata" tile, verbatim).
 * -------------------------------------------------------------------------- */
export const TOPOLOGY_STATE = `timeseries rows=max(${ICEBERG_METRICS.rows}), files=max(${ICEBERG_METRICS.files}), bytes=max(${ICEBERG_METRICS.storageBytes}), snapshots=max(${ICEBERG_METRICS.snapshots}), schema_fields=max(${ICEBERG_METRICS.schemaFields}), by:{bucket, ns, table}, from:now()-24h
| fieldsAdd current_rows=arrayLast(arrayRemoveNulls(rows)), current_files=arrayLast(arrayRemoveNulls(files)), current_bytes=arrayLast(arrayRemoveNulls(bytes)), current_snapshots=arrayLast(arrayRemoveNulls(snapshots)), current_schema_fields=arrayLast(arrayRemoveNulls(schema_fields))
| fieldsKeep bucket, ns, table, current_rows, current_files, current_bytes, current_snapshots, current_schema_fields`;

export interface TableStateRecord {
  bucket: string;
  ns: string;
  table: string;
  current_rows: number | null;
  current_files: number | null;
  current_bytes: number | null;
  current_snapshots: number | null;
  current_schema_fields: number | null;
}

/* ----------------------------------------------------------------------------
 * Schema timeline — schema state + schema change events (operations dashboard,
 * aligned with the build-plan event contract).
 * -------------------------------------------------------------------------- */
export const SCHEMA_EVENTS = `fetch events
| filter event.name == "S3 Tables schema change" or event.name == "S3 Tables schema state"
| fields timestamp, event.name, bucket, namespace, table, schema_id, row_count, file_count, snapshot_count, storage_bytes, added, removed, fields
| sort timestamp desc
| limit 100`;

export interface SchemaEventRecord {
  timestamp: string;
  "event.name": string;
  bucket?: string;
  namespace?: string;
  table?: string;
  schema_id?: string | number;
  row_count?: number;
  file_count?: number;
  snapshot_count?: number;
  storage_bytes?: number;
  added?: string;
  removed?: string;
  fields?: string;
}

/** Latest "S3 Tables schema state" event — used for the current schema field list. */
export const LATEST_SCHEMA_STATE = `fetch events
| filter event.name == "S3 Tables schema state"
| fields timestamp, bucket, namespace, table, schema_id, fields
| sort timestamp desc
| limit 1`;

/* ----------------------------------------------------------------------------
 * FinOps — cost estimate single values + trends (finops dashboard, verbatim).
 * -------------------------------------------------------------------------- */
export const FINOPS_SINGLE_VALUE = {
  storage: {
    field: "monthly_storage_usd",
    query: `timeseries bytes=max(${ICEBERG_METRICS.storageBytes}), from:now()-24h
| fieldsAdd monthly_storage_usd=arrayLast(arrayRemoveNulls(bytes))/1073741824*${RATES.storagePerGbMonth}
| fieldsKeep monthly_storage_usd`,
  },
  monitoring: {
    field: "monthly_monitoring_usd",
    query: `timeseries objects=max(${ICEBERG_METRICS.files}), from:now()-24h
| fieldsAdd monthly_monitoring_usd=arrayLast(arrayRemoveNulls(objects))/1000*${RATES.monitoringPer1kObjects}
| fieldsKeep monthly_monitoring_usd`,
  },
  requests: {
    field: "request_cost_usd",
    query: `timeseries gets=sum(cloud.aws.s3.tables.getRequestsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), puts=sum(cloud.aws.s3.tables.putRequestsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName)
| fieldsAdd request_cost_usd=arraySum(gets)/1000*${RATES.getPer1k} + arraySum(puts)/1000*${RATES.putPer1k}
| fieldsKeep request_cost_usd`,
  },
  total: {
    field: "estimated_monthly_usd",
    query: `timeseries bytes=max(${ICEBERG_METRICS.storageBytes}), objects=max(${ICEBERG_METRICS.files}), from:now()-24h
| fieldsAdd estimated_monthly_usd=arrayLast(arrayRemoveNulls(bytes))/1073741824*${RATES.storagePerGbMonth} + arrayLast(arrayRemoveNulls(objects))/1000*${RATES.monitoringPer1kObjects}
| fieldsKeep estimated_monthly_usd`,
  },
} as const;

export const FINOPS_CHARTS = {
  costTrend: `timeseries bytes=max(${ICEBERG_METRICS.storageBytes}), by:{bucket, ns, table}, interval:5m
| fieldsAdd estimated_storage_usd=bytes[]/1073741824*${RATES.storagePerGbMonth}
| fieldsRemove bytes`,
  requestTrend: `timeseries gets=sum(cloud.aws.s3.tables.getRequestsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), puts=sum(cloud.aws.s3.tables.putRequestsByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), metadata_reads=sum(cloud.aws.s3.tables.getTableMetadataLocationByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), metadata_updates=sum(cloud.aws.s3.tables.updateTableMetadataLocationByAccountIdFilterIdNamespaceRegionTableBucketNameTableName), interval:1m`,
} as const;

/** Airline-scale monthly storage projection (finops "scale" tile, verbatim). */
export const FINOPS_SCALE = `data record(scale="100 GB", gb=100.0), record(scale="1 TB", gb=1024.0), record(scale="10 TB", gb=10240.0), record(scale="50 TB", gb=51200.0)
| fieldsAdd storage_usd=gb*${RATES.storagePerGbMonth}`;

/** Static FinOps rate card (finops "priceCard" markdown tile). */
export const PRICE_CARD: Array<{ driver: string; rate: string; source: string }> = [
  { driver: "Standard storage", rate: "$0.0265 / GB-month", source: "IRC live bytes; reconcile with daily CloudWatch storage" },
  { driver: "Object monitoring", rate: "$0.025 / 1,000 objects", source: "IRC live file count" },
  { driver: "GET", rate: "$0.0004 / 1,000 requests", source: "Native AWS/S3/Tables Metric Stream" },
  { driver: "PUT", rate: "$0.005 / 1,000 requests", source: "Native AWS/S3/Tables Metric Stream" },
  { driver: "Binpack bytes", rate: "$0.005 / GB processed", source: "Daily native compaction metric" },
  { driver: "Binpack objects", rate: "$0.002 / 1,000 objects", source: "Daily native compaction metric" },
];

/* ----------------------------------------------------------------------------
 * Data insights — business aggregates computed from the actual table rows by the
 * collector (poc/s3tables_data_insights.py) and ingested as s3tables.data.* metrics.
 * This is the "data-level" signal, distinct from the operational/IRC signal above.
 * -------------------------------------------------------------------------- */
export const DATA_METRICS = {
  rowsAnalyzed: "s3tables.data.rows_analyzed",
  distinctCarriers: "s3tables.data.distinct_carriers",
  avgDepDelay: "s3tables.data.overall_avg_dep_delay_min",
  cancelRate: "s3tables.data.cancel_rate_pct",
  flightsByCarrier: "s3tables.data.flights_by_carrier",
  avgDepDelayByCarrier: "s3tables.data.avg_dep_delay_by_carrier_min",
  flightsByRoute: "s3tables.data.flights_by_route",
} as const;

const lastNonNull = (metric: string, field: string) =>
  `timeseries v=max(${metric}), from:now()-24h
| fieldsAdd ${field}=arrayLast(arrayRemoveNulls(v))
| fieldsKeep ${field}`;

export const DATA_SINGLE_VALUE = {
  rowsAnalyzed: { field: "rows_analyzed", query: lastNonNull(DATA_METRICS.rowsAnalyzed, "rows_analyzed") },
  distinctCarriers: { field: "distinct_carriers", query: lastNonNull(DATA_METRICS.distinctCarriers, "distinct_carriers") },
  avgDepDelay: { field: "avg_dep_delay", query: lastNonNull(DATA_METRICS.avgDepDelay, "avg_dep_delay") },
  cancelRate: { field: "cancel_rate", query: lastNonNull(DATA_METRICS.cancelRate, "cancel_rate") },
} as const;

/** Flights + avg departure delay per carrier (top carriers). */
export const DATA_BY_CARRIER = `timeseries flights=max(${DATA_METRICS.flightsByCarrier}), dep=max(${DATA_METRICS.avgDepDelayByCarrier}), by:{carrier}, from:now()-24h
| fieldsAdd flights_n=arrayLast(arrayRemoveNulls(flights)), dep_delay=arrayLast(arrayRemoveNulls(dep))
| fieldsKeep carrier, flights_n, dep_delay
| sort flights_n desc`;

export interface CarrierRow {
  carrier: string;
  flights_n: number | null;
  dep_delay: number | null;
}

/** Flights per route (top routes). */
export const DATA_TOP_ROUTES = `timeseries v=max(${DATA_METRICS.flightsByRoute}), by:{route}, from:now()-24h
| fieldsAdd flights=arrayLast(arrayRemoveNulls(v))
| fieldsKeep route, flights
| sort flights desc`;

export interface RouteRow {
  route: string;
  flights: number | null;
}
