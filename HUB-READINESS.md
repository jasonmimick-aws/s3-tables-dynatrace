# Dynatrace Hub Readiness Review — Amazon S3 Tables Observability

**Review date:** 2026-10-16  
**Proposed solution:** Amazon S3 Tables Observability App + Extensions 2.0 IRC collector  
**Current maturity:** Working POC / private-pilot candidate; not yet production-ready or Hub-approved

## Executive summary

Dynatrace publicly documents how to build and privately deploy AppEngine apps, package and
sign Extensions 2.0, and install catalog content from Hub. It does **not** publicly document
a self-service workflow for a third party to publish an app/extension to the public Hub.
Public Hub onboarding must therefore be confirmed with the Dynatrace Technology Alliance /
Partner team. Erick Leon is arranging a Dynatrace Solutions Architect connection for that
step.

The recommended sequence is:

1. Agree with Dynatrace on publisher, ownership, support, and the supported architecture.
2. Harden the collector and app for customer-neutral configuration.
3. Run a private pilot in a clean Dynatrace environment with a Linux ActiveGate.
4. Complete security, scale/cardinality, compatibility, documentation, and lifecycle gates.
5. Submit the combined solution through the Dynatrace partner/Hub process specified by the SA.

## What is already proven

| Area | Status | Evidence |
|---|---|---|
| AppEngine application | **PASS** | Two-view Overview + Explore app; dynamic table discovery, multi-dataset scope, DQL, inline guide, full-page PNG export |
| App quality gate | **PASS** | Node 24; lint PASS; build PASS; manifest validation PASS; standard dry-run bundle contains JS/CSS/assets |
| Native AWS telemetry | **PASS** | `AWS/S3/Tables` metrics delivered through CloudWatch Metric Streams → Firehose → Dynatrace |
| IRC metadata | **PASS** | Rows, files, bytes, snapshots, schema fields read from the S3 Tables Iceberg REST Catalog |
| Events | **PASS** | Schema-state and schema-change events accepted by Dynatrace; actual `co2_estimate_kg` addition visible |
| Data-level context | **PASS (POC)** | Bounded samples converted into category counts and numeric averages; raw rows remain in AWS |
| Multi-domain scale | **PASS (POC)** | Approximately 39 million rows across five tables/namespaces |
| Extensions 2.0 package | **PARTIAL** | Package builds and signs with a development certificate on macOS; not yet deployed/tested on Linux ActiveGate |
| Documentation assets | **PASS (POC)** | README, user guide, build/deploy guide, demo script, architecture narrative, high-resolution screenshots |

## Production work before Hub submission

### 1. Product ownership and support

- [ ] Decide whether the publisher is Dynatrace, AWS, or a joint/technology-partner listing.
- [ ] Name the engineering owner, support owner, escalation path, and release manager.
- [ ] Define support boundaries between the AppEngine app, ActiveGate extension, AWS
      configuration, and S3 Tables itself.
- [ ] Define semantic-versioning, compatibility, upgrade, rollback, deprecation, and
      vulnerability-response policies.

### 2. Customer-neutral collector architecture

- [ ] Replace POC defaults (`airline-datalake-poc`, `ops/flights`) with settings-driven
      discovery and selection of table buckets, namespaces, and tables.
- [ ] Confirm supported AWS authentication for ActiveGate: instance role, workload identity,
      or customer-configured assume-role/credential-vault flow. Do not ship static keys.
- [ ] Remove the POC requirement for a Dynatrace ingest token in AWS Secrets Manager when the
      extension SDK can report through the authenticated ActiveGate runtime.
- [ ] Support multiple accounts/regions/table buckets without unbounded polling or
      cardinality.
- [ ] Implement retries, exponential backoff, timeout budgets, proxy support, endpoint health,
      partial-failure handling, and actionable extension status messages.
- [ ] Decide whether both S3 Tables IRC and AWS Glue IRC are supported in v1.

### 3. ActiveGate production package

- [ ] Build Python/`pyiceberg`/`pyarrow` dependencies for the supported Linux ActiveGate
      architecture(s); the current macOS development ZIP is not distributable.
- [ ] Replace the local development CA with the production signing/trust process specified by
      Dynatrace.
- [ ] Install and run the signed package on a clean Linux ActiveGate.
- [ ] Verify activation schema, credential handling, upgrades, restarts, disabled
      configurations, and uninstall.
- [ ] Confirm minimum Dynatrace and ActiveGate versions with Dynatrace.

### 4. Data model and scale guardrails

- [ ] Review custom metric keys, event properties, and custom entity/topology model with
      Dynatrace semantic-model owners.
- [ ] Define stable table-bucket → namespace → table entity identity and relationships.
- [ ] Measure DDU/Grail usage at realistic table and account counts.
- [ ] Enforce limits on tables, dimensions, field lists, event frequency, and sampled-data
      categories.
- [ ] Make data profiling opt-in and settings-driven; do not assume domain-specific columns.
- [ ] Document exactly what leaves AWS. Default to metadata only; raw table rows must not be
      sent to Dynatrace.

### 5. App production hardening

- [ ] Deploy the app bundle to a clean private-pilot environment (not only local-dev-server).
- [ ] Confirm least-privilege app scopes and behavior when a scope/data source is unavailable.
- [ ] Add onboarding/empty/error states for: no extension, no tables, expired data, missing
      request metrics, and insufficient permissions.
- [ ] Add settings-driven pricing/region behavior; example rates must not be represented as
      billing data.
- [ ] Test accessibility, localization expectations, responsive layouts, browser support,
      RUM/self-monitoring, and high-cardinality/large-catalog UX.
- [ ] Resolve the App Toolkit optimized/code-splitting packaging issue or agree to ship the
      validated standard bundle path.

### 6. Security and privacy review

- [ ] Produce an architecture/data-flow diagram and threat model.
- [ ] Document AWS IAM actions and provide a least-privilege policy; verify read-only access
      for collection.
- [ ] Verify secrets never enter app bundles, source, logs, screenshots, events, or metric
      dimensions.
- [ ] Document data residency, retention, telemetry inventory, network destinations, and
      customer opt-in behavior.
- [ ] Run dependency/SBOM, license, vulnerability, static-analysis, and artifact-signature
      checks in CI.
- [ ] Complete the security/privacy/legal process required by the Dynatrace publisher model.

### 7. Test and compatibility matrix

- [ ] S3 Tables direct IRC across agreed AWS regions.
- [ ] Glue IRC, if included.
- [ ] Empty table, no snapshot, large schema, schema add/remove/type evolution, automatic
      compaction, throttling, access denied, expired credentials, and network failure.
- [ ] Multiple accounts, buckets, namespaces, and tables at agreed scale limits.
- [ ] Supported Dynatrace SaaS/Managed and ActiveGate versions/platforms.
- [ ] App install, update, rollback, and uninstall from a clean environment.

## Hub listing package

Prepare these assets even if Dynatrace ultimately supplies a different submission template:

- [x] Product name and concise value proposition.
- [x] High-resolution Overview and Explore screenshots.
- [x] Working demo and talk track.
- [x] Source repositories and private release history.
- [x] Initial user, build, deployment, and architecture documentation.
- [ ] Final icon/visual identity and Hub tile artwork.
- [ ] Supported versions/platforms/regions and prerequisites.
- [ ] Installation, onboarding, configuration, upgrade, rollback, and uninstall docs.
- [ ] Security/data-handling statement, IAM policy, SBOM, licenses, and privacy statement.
- [ ] Metric/event/entity inventory and ingest/cardinality estimates.
- [ ] Release notes, known limitations, support contact, SLA, and lifecycle policy.
- [ ] Signed production app and extension artifacts produced by approved CI/signing paths.

## Questions for the Dynatrace SA / Partner team

These are the key items not answered by public documentation:

1. **Submission route:** Which Partner Portal workflow/team accepts new AppEngine +
   Extensions 2.0 Hub solutions? Is there an internal intake form or product sponsor?
2. **Publisher model:** Should this be Dynatrace-supported, partner-supported, or jointly
   supported, and how is that represented on Hub?
3. **Review gates:** What architecture, UX, security, privacy, legal, licensing, QA, and
   performance reviews are mandatory?
4. **Signing:** Who signs the production app and extension artifacts, and what certificate /
   trust-chain requirements apply to customer ActiveGates?
5. **Packaging:** Can one Hub tile install an AppEngine app and an Extensions 2.0 package as
   a coordinated solution? How are prerequisites and versions linked?
6. **Distribution:** Which SaaS/Managed environments, regions, and release channels are
   supported for partner apps?
7. **Updates:** How are staged rollout, rollback, deprecation, security patches, and customer
   notifications handled?
8. **Commercial/legal:** Are a partner agreement, marketplace terms, license, DPA/privacy
   disclosures, export review, or commercial SKU required?
9. **Telemetry economics:** What DDU/cardinality guidance and certification thresholds apply?
10. **Ownership:** Which Dynatrace product team owns AWS/S3 Tables, AppEngine review, and the
    extension after publication?

## Proposed SA review agenda (60 minutes)

1. **5 min** — customer problem and current CloudWatch-only gap.
2. **10 min** — live Overview + Explore demo.
3. **10 min** — architecture: Metric Streams + IRC collector + AppEngine.
4. **15 min** — review the ten questions above; identify publisher and formal intake route.
5. **10 min** — choose private-pilot environment, ActiveGate, AWS auth, and success criteria.
6. **10 min** — owners, required artifacts, review timeline, and next checkpoint.

## Public source references

- [Dynatrace Hub](https://docs.dynatrace.com/docs/manage/hub) — Hub installs and manages apps
  and extensions, including continuous updates.
- [Deploy your app](https://developer.dynatrace.com/develop/guides/deploy-your-app/) — CI flow:
  install, lint, build, and `dt-app deploy`; OAuth client environment variables.
- [AppEngine platform service](https://developer.dynatrace.com/platform-services/services/app-engine/)
  — app bundles contain code, metadata, static resources, settings, and functions.
- [Manage Extensions](https://docs.dynatrace.com/docs/shortlink/extension-lifecycle) — extension
  installation/configuration lifecycle.
- [Sign extensions](https://docs.dynatrace.com/docs/shortlink/sign-extension) — signed
  extensions and certificate trust on ActiveGate/OneAgent hosts.
- [Extension YAML](https://docs.dynatrace.com/docs/ingest-from/extensions20/extension-yaml) —
  core extension package metadata/configuration.
- [Technology Alliance Partners](https://www.dynatrace.com/partners/technology-partners/) —
  partner application/contact path and Partner Portal.

> Public documentation explains development, private deployment, signing, and Hub
> installation. The public pages reviewed do not provide a complete third-party Hub
> submission/certification procedure; the Dynatrace SA/Partner team must supply that process.
