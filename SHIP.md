# Shipping Amazon S3 Tables Observability for Dynatrace

This solution has two independently deployable artifacts:

1. **Dynatrace AppEngine app** (`app/`) — customer-neutral two-view experience: Overview
   plus a URL-scoped Explore workspace, with dynamic dataset discovery and arbitrary
   multi-dataset filtering across operations, data profile, changes, and cost.
2. **Dynatrace Extensions 2.0 package** (`integration/`) — collection: reads the S3 Tables
   Iceberg REST Catalog and reports metrics, events, and topology.

## Current publication plan

1. Package the validated AppEngine app and Extensions 2.0 collector as one solution.
2. Erick Leon will connect the project team with a Dynatrace Solutions Architect to guide
   private-environment installation, extension signing/distribution, and Hub requirements.
3. Run a joint private pilot, close production-readiness gaps, and assemble the Hub listing
   assets (documentation, screenshots, demo, security/data inventory, support model).
4. Submit through the Dynatrace-supported Hub/technology-partner process.

## Stage 1 — local development (current)

```bash
bash app/dev.sh
```

The UI bundle runs from `localhost:3000`; authentication, DQL, Grail, and all data are from
the real Dynatrace SaaS environment `hgd83841`.

## Stage 2 — private deployment to a Dynatrace environment

### App

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
cd app
npm ci
npm run lint
npx dt-app deploy
```

This builds and installs app ID `com.amazonaws.s3tables.observability` in the configured
`hgd83841` environment. It requires interactive sign-in, or CI environment variables
`DT_APP_OAUTH_CLIENT_ID` and `DT_APP_OAUTH_CLIENT_SECRET`. It does **not** publish to the
public Dynatrace Hub.

> Keep the standard packaging path for this release. With the currently installed App
> Toolkit, `--optimize --enable-code-splitting` produced a manifest-only archive; the
> standard build produced the validated 619 KB bundle containing `ui/main.js`, CSS, and
> assets.

To generate a validated bundle without installing it:

```bash
npx dt-app deploy --dry-run
# app/out/artifact.zip
```

### Extension

```bash
cd integration
uv sync
uv pip install pip
uv run dt-sdk gencerts       # local development certificate only
uv run dt-sdk build
# integration/dist/custom_s3tables.iceberg-0.1.0.zip
```

Upload the signed extension ZIP through the Dynatrace Extensions app/API and deploy it to
an ActiveGate with AWS network access. A development-signed extension also requires the
root CA certificate on each ActiveGate host. For production distribution, use the signing
and trust model agreed with Dynatrace rather than distributing the local development CA.

## Stage 3 — repeatable internal distribution

Add CI that runs:

```text
app:       npm ci -> npm run lint -> dt-app build -> dt-app deploy
extension: uv sync -> dt-sdk build -> upload extension package
```

Store OAuth credentials in the CI secret store. Never commit app OAuth secrets, Dynatrace
tokens, AWS credentials, signing private keys, or extension certificates.

## Stage 4 — public Dynatrace Hub listing

The Hub is a curated catalog, not a self-service destination of `dt-app deploy`. A public,
supported listing requires Dynatrace product/partner sponsorship and review. The proposed
Hub solution should package the AppEngine app and Extensions 2.0 collector together.

Bring Dynatrace the following submission package:

- Product name, one-sentence value proposition, icon, screenshots, and demo video.
- App bundle plus extension package and source repository.
- Supported Dynatrace/ActiveGate versions and tested AWS regions/configurations.
- Security design: least-privilege AWS IAM, SigV4, credential handling, no row-level data
  leaving AWS except explicitly configured aggregate metrics/events.
- Data inventory: metric/event/entity keys, dimensions/cardinality, ingest volume, and DDU
  estimates.
- Installation, configuration, upgrade, rollback, and uninstall procedures.
- Support owner, release/version policy, known limitations, privacy/licensing statements,
  and test evidence.

The immediate ask for the Dynatrace product team is: **sponsor a private pilot in one or two
Dynatrace environments, align on the supported collection architecture, then route the
validated solution through Dynatrace's Hub/technology-partner review.**

## Current release evidence

- App version `0.1.0`: lint PASS, production build PASS, manifest validation PASS,
  distributable bundle generated (`app/out/artifact.zip`, 983 KB).
- Extension version `0.1.0`: signed package builds successfully (approximately 71 MB on
  macOS; build Linux wheels for ActiveGate deployment).
- Live data: approximately 38.6 million rows across five S3 Tables domains, with metadata,
  topology, and sampled data insights visible in Dynatrace.

Official references:

- [Deploy a Dynatrace app](https://developer.dynatrace.com/develop/guides/deploy-your-app/)
- [Dynatrace App Toolkit](https://developer.dynatrace.com/quickstart/app-toolkit/)
- [Manage Extensions](https://docs.dynatrace.com/docs/shortlink/extension-lifecycle)
- [Sign extensions](https://docs.dynatrace.com/docs/shortlink/sign-extension)
- [Dynatrace Hub](https://docs.dynatrace.com/docs/manage/hub)
