# Dynatrace × Amazon S3 Tables

Working project to (1) determine the **integration pattern** Dynatrace uses for Amazon
S3 Tables, (2) enumerate **every data point** Dynatrace can surface to customers today,
and (3) produce a **blog post** on the integration — with an option to propose deeper,
net-new integration patterns.

## Origin

Strategic initiative on **S3 Tables adoption** (owner: Nidhi Gupta). Ask routed to Jason
Mimick to confirm what Dynatrace has today, identify the integration pattern, and then
decide between **GTM** (if build already exists) vs. **Build** (if a deeper integration
is needed). Full originating Slack thread: [`docs/slack-thread.md`](docs/slack-thread.md).

## People

| Name | Role |
|---|---|
| Nidhi Gupta | Owns the S3 Tables adoption strategic initiative (can fund Build or GTM) |
| Jason Mimick | AWS PSA to Dynatrace — driving this analysis |
| Srinivas Kesanapally | Shared Datadog reference; hypothesized "pattern 1 (S3 Tables IRC)" |
| Michael Stephan | Dynatrace PM to engage for roadmap / net-new integration |

## Headline finding (the premise correction)

The thread asks *"which of these three patterns did Dynatrace use?"* — where the three
candidate patterns were all **data-plane / Iceberg-catalog** access methods:

1. Connect to S3 Tables via the **S3 Tables Iceberg REST Catalog (IRC)** endpoint
2. Connect to S3 Tables via the **AWS Glue IRC** endpoint
3. **ISV solution built on** an S3 Tables bucket

**Dynatrace (and Datadog) used none of these.** The shipping integration is
**CloudWatch metrics ingestion** of the `AWS/S3/Tables` namespace through the standard
AWS integration (CloudWatch Metric Streams / metric polling) — i.e. operational,
infrastructure-level observability. The three IRC patterns above describe **table/schema
data-plane access**, which is exactly the *deep integration that does **not** exist yet*
(matching Jason's note: "basic discovery + metrics, but not deep schema discovery").

So the two tracks are cleanly separable:

- **GTM-now track** — the CloudWatch-metrics monitoring already works. The blog post
  surfaces those data points. See [`research/dynatrace-s3-tables-data-points.md`](research/dynatrace-s3-tables-data-points.md).
- **Build track (opportunity)** — a true IRC-based integration (pattern 1 or 2) for
  schema discovery, table/namespace topology, snapshot/compaction insight. Net-new; this
  is where Nidhi's initiative could fund Build and where Michael Stephan comes in.

Full analysis: [`research/integration-patterns.md`](research/integration-patterns.md).

## Status

- [x] Confirm the integration pattern Dynatrace uses (CloudWatch metrics, not IRC)
- [x] Enumerate the data points surfaced (authoritative `AWS/S3/Tables` metric list)
- [x] Capture Datadog as the competitive reference
- [ ] Verify Dynatrace coverage detail (dedicated hub tile vs. generic custom namespace)
- [ ] (Optional) Probe a live Dynatrace env with real S3 Tables buckets
- [ ] Draft the blog post
- [ ] Decide GTM-now vs. propose Build (IRC integration) — align with Michael Stephan

## Layout

```
README.md                                  this file
docs/slack-thread.md                       originating thread (verbatim)
research/integration-patterns.md           pattern analysis + the correction
research/dynatrace-s3-tables-data-points.md full data-point / metric enumeration
research/competitive-datadog.md            Datadog integration reference
```

## Live POC (2026-10-01)

The POC is deployed in AWS account `347830095179`, Region `us-east-1`. January 2025 BTS airline on-time data is loaded into `airline-datalake-poc / ops / flights`; an asynchronous CodeBuild workload continuously queries and appends records.

- [Dynatrace Operations dashboard](https://hgd83841.apps.dynatrace.com/ui/apps/dynatrace.dashboards/dashboard/f00cf22e-4c6c-4847-bad1-6d2be5780ffc)
- [Dynatrace FinOps & Intelligence dashboard](https://hgd83841.apps.dynatrace.com/ui/apps/dynatrace.dashboards/dashboard/0ac17116-8d77-4201-b96d-925bc939c2b7)
- Current operational state and resource names: [`STATUS.md`](STATUS.md)
- Blog draft: [`BLOG-DRAFT.md`](BLOG-DRAFT.md)
