# S3 Tables Observability — Dynatrace App

A Dynatrace App (AppEngine, built with the `dt-app` App Toolkit) that visualizes the Amazon
S3 Tables telemetry — both the native `AWS/S3/Tables` CloudWatch metrics and the
IRC-derived Iceberg intelligence from the companion [extension](../integration/README.md).

## Screens

1. **Overview** — single-value tiles (rows, files, snapshots, schema fields) plus native
   request volume, latency, and 4xx/5xx reliability charts.
2. **Topology** — browse table bucket → namespace → table; select a table for its current
   metrics.
3. **Schema timeline** — `S3 Tables schema state`/`schema change` events over time plus the
   current schema field list.
4. **FinOps** — storage/request cost estimate from live Iceberg state and native request
   telemetry.

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
