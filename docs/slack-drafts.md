# Slack drafts

## 1. DM / note to Michael Stephan (Dynatrace PM)

Hi Michael — Jason Mimick here (AWS PSA working with Dynatrace). AWS has a strategic
initiative underway on **Amazon S3 Tables** adoption, and your name came up as the PM who
owns this area on your side.

Quick context on where I've landed digging into current state: Dynatrace ingests the
`AWS/S3/Tables` CloudWatch namespace today via the standard AWS integration — so storage,
compaction, request, latency, and error metrics all flow in (same source Datadog uses).
What doesn't exist yet on either side is a **deeper, Iceberg-catalog-level integration** —
schema discovery, table/namespace topology, snapshot history — via the S3 Tables or Glue
Iceberg REST Catalog (IRC) endpoints.

Two things I'd love 20–30 min on:
1. Confirm current S3 Tables support + anything on the roadmap I should know about.
2. Explore a net-new IRC-based integration — AWS has an initiative that could help on both
   **build** and **GTM**, and I think there's a clean differentiation story here.

Happy to work around your calendar. Thanks!

---

## 2. Reply to the Nidhi / Srinivas thread

Thanks both — dug into this and have the pattern answer, with one useful nuance:

Dynatrace's S3 Tables support today is **CloudWatch metrics ingestion of the
`AWS/S3/Tables` namespace** through the standard AWS integration (Metric Streams/Firehose
or polling). It's *not* one of the three IRC patterns — and notably, **Datadog uses the
same CloudWatch path**, not IRC (their setup is literally "enable S3/Tables under Metric
Collection"). So it's operational/infra monitoring, not schema- or catalog-level access.

What's surfaced today: storage bytes + file counts, compaction (maintenance), and
(opt-in) request counts, bytes up/down, 4xx/5xx errors, and first-byte/total latency —
filterable by table bucket / namespace / table.

What's **not** there yet (either vendor): schema discovery, table topology, Iceberg
snapshot history — i.e. the "deep integration" piece. That maps cleanly to the two tracks
you called out:
- **GTM now** on the existing CloudWatch monitoring → I'll draft a blog post surfacing all
  the data points.
- **Build opportunity** → a true IRC integration (S3 Tables IRC or Glue IRC endpoint) for
  schema-level observability. Net-new, and a clear differentiator.

Reaching out to Michael Stephan to confirm current state + roadmap. Next step on my side:
stand up a quick POC + blog draft. Will share.
