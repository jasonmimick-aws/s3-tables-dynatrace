# S3 Tables Observability — Dynatrace App

A Dynatrace App (AppEngine, built with the `dt-app` App Toolkit) that visualizes the Amazon
S3 Tables telemetry — both the native `AWS/S3/Tables` CloudWatch metrics and the
IRC-derived Iceberg intelligence from the companion [extension](../integration/README.md).

## Experience

The app is customer-neutral and discovers datasets dynamically from live metric dimensions.
Its two decision-oriented views are:

1. **Overview** — customer-neutral estate health, dynamically discovered table catalog,
   recent contract-change signal, and native AWS request/performance/reliability telemetry.
   Clicking any table opens a scoped investigation.
2. **Explore** — one URL-scoped workspace for a single table, arbitrary subset, or all
   datasets. It combines Iceberg state, operational activity, sampled data profile, actual
   schema changes/current contract, and cost/capacity allocation.

The former standalone Topology, Schema Timeline, Data Insights, and FinOps tabs were merged
into Explore so metadata appears inside an investigation rather than as isolated,
read-only destinations.

All screens use Strato components and DQL (`@dynatrace-sdk/client-query`) against the metric
keys and event names defined in [`../design/integration-build-plan.md`](../design/integration-build-plan.md).

## Prerequisites

- **Node 24** (required by `dt-app`): `export PATH="/opt/homebrew/opt/node@24/bin:$PATH"`
- Dependencies: `npm install`

## Build

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
cd app
npm run build        # dt-app build -> production bundle
```

## Run locally / deploy

```bash
npm run start        # dt-app dev — local dev server; opens a browser for Dynatrace login
npm run deploy       # dt-app deploy — needs an app OAuth client in the environment
```

Both require an interactive Dynatrace sign-in (OAuth) to `https://hgd83841.apps.dynatrace.com`.
The app's required scopes (`storage:metrics:read`, `storage:events:read`,
`storage:buckets:read`) are declared in `app.config.json`.

## Note on live data

The app renders the metrics/events the collector and extension ingest. The collector has
already pushed live values for `airline-datalake-poc/ops/flights`, so the Overview and
Schema screens populate against real data once you sign in.
