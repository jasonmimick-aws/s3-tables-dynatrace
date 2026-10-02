# POC run guide

Prereqs: valid AWS creds for account `347830095179` (us-east-1), `uv`, and env vars:

```
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=347830095179
export DT_BASE=https://hgd83841.live.dynatrace.com
export DT_TOKEN=<golden token>
```

Install deps:

```
cd poc && uv sync
```

## Phase 1 — infra, data, native metrics

```
../infra/deploy.sh                 # CFN stack + enable request metrics
uv run python loader.py 2024 1     # load a BTS month (repeat for more months)
uv run python loadgen.py 30        # 30 min of live read/write traffic
```

Metrics flow natively to Dynatrace via the account's AWS integration (no bridge).
Build the usage + cost dashboards from `../dashboards/`.

## Phase 2 — IRC schema/snapshots + correlation

```
uv run python irc_metadata.py      # baseline schema/snapshot metrics + event
uv run python evolve_schema.py     # add co2_estimate_kg -> schema-change event
uv run python loader.py 2024 2     # more writes -> compaction/cost spike to correlate
uv run python irc_metadata.py      # re-publish; event marker lands on the spike
```

> Verify-at-build items (see design/poc-plan.md §2): BTS URL, CFN IcebergMetadata nesting,
> PyIceberg IRC config strings, request-metrics enable, cost unit prices.
