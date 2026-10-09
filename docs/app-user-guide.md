# Amazon S3 Tables Observability — User Guide

## Purpose

The app combines native `AWS/S3/Tables` telemetry with Iceberg REST Catalog metadata and
bounded data aggregates. It helps platform, data, and FinOps teams answer:

1. Which tables need attention?
2. Is a symptom isolated to one dataset or shared across a subset?
3. Did the table contract or data profile change near the symptom?
4. Which table is driving storage, file-monitoring, or request cost?

The app has only two destinations: **Overview** and **Explore**.

![Overview — estate KPIs, discovered dataset catalog, contract changes, and native AWS telemetry](images/app-overview-long.png)

![Explore — shared dataset scope, Iceberg metadata, and operational investigation](images/app-explore-long.png)

## Overview

Overview is the environment-level starting point. It dynamically discovers tables from
live metric dimensions; it does not assume a fixed number of namespaces or datasets.

- **Estate KPIs:** rows, tables, active files, and snapshots.
- **Dataset catalog:** current rows/files/snapshots/columns for each table.
- **Contract changes:** number of actual schema-change events in the last 30 days. Routine
  schema-state observations are not counted as changes.
- **Native AWS telemetry:** request volume, latency, transfer, and errors.

Click any catalog row to open **Explore** with that table selected. Click **Explore all
datasets** to keep the entire environment in scope.

## Explore

### Dataset scope

The scope bar drives every section on the page:

- **All:** all discovered datasets.
- **One chip:** single-table investigation, including field-level schema inspection.
- **Multiple chips:** comparison across any subset.

The selected keys are stored in the URL (`?datasets=namespace/table,...`), so an
investigation can be bookmarked or shared.

### Section controls

The section controls use in-page scrolling; they do not reload or route away from Explore.
Use **How to use Explore** to show the inline quick-start guide.

### 1. Iceberg state

Current IRC-derived metadata: rows, active files, snapshots, and table count. Clicking a
row narrows the whole Explore workspace to that table.

### 2. Operational activity

Native CloudWatch Metric Stream data, filtered by the selected namespaces: request volume,
first-byte/total latency, bytes transferred, and 4xx/5xx errors.

### 3. Data profile

Bounded samples are summarized inside AWS and only low-cardinality aggregates are sent to
Dynatrace: category counts and numeric averages. Raw rows are not copied to Dynatrace. Use
these signals as operational context, not as a replacement for Athena/Spark/BI analysis.

### 4. Change intelligence

Schema evolution is normal and is not automatically an incident. This section deliberately
separates:

- **Schema state:** current contract observations.
- **Schema change:** added/removed fields detected between contracts.

The primary value is correlation. Added fields can affect file shape, compaction, storage,
and downstream processing; removed fields or incompatible type changes can break readers
and should receive higher attention. Select one dataset to inspect its current fields.

### 5. Cost & capacity

Immediate operational estimates based on IRC bytes/files and native requests. Values follow
the dataset scope. They are not AWS billing records; use AWS Billing and Cost Management for
financial reporting.

## Data freshness

- Native request metrics arrive through CloudWatch Metric Streams.
- IRC metadata/data-profile metrics arrive when the collector runs and use a 24-hour
  last-non-null lookup in the UI.
- Schema changes use a 30-day event window.

If IRC cards are empty, refresh credentials and run `poc/publish_all.py`; see `BUILD.md`.

## Limitations of the POC

- Data-profile aggregation is configured per dataset schema; production packaging needs a
  settings-driven profile definition and cardinality guardrails.
- Cost values are estimates using example rates.
- The app currently filters native request telemetry at namespace granularity because that
  is the dimension exposed by the ingested metric series in this environment.
- Production extension deployment requires a Linux ActiveGate build and supported signing
  model.

## Installation and development

- Local development: `bash app/dev.sh`
- Build/test: see [`../BUILD.md`](../BUILD.md)
- Private deployment and Hub path: see [`../SHIP.md`](../SHIP.md)
