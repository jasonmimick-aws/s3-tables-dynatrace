# POC plan v2 — Dynatrace × S3 Tables (review before build)

Region: **us-east-1**. Account: **special Dynatrace-integrated Isengard account** (id TBD)
so Phase 1 metrics flow **natively** — no bridge. Dynatrace env:
`https://hgd83841.live.dynatrace.com` (golden token). Dataset: **BTS Airline On-Time
Performance** (US DOT, public domain). Cost dashboard: **in scope**.

Nothing built yet — this is for review.

## 0. Narrative

A global airline/travel platform runs its flight data lake on **S3 Tables**. The POC shows
Dynatrace monitoring it **at scale** — throughput, latency, errors, storage growth,
compaction — **plus estimated cost**, broken down per table bucket / namespace / table.
Then the **IRC extension** adds schema/table-level attribution: *which* table and schema
drive the usage and spend, and correlating a schema change to the compaction/cost spike it
causes.

- **Phase 1 (have-today, GTM):** native CloudWatch `AWS/S3/Tables` → Dynatrace. Usage +
  cost dashboards. Load generator makes it look like a live production system.
- **Phase 2 (build, differentiator):** teach Dynatrace to speak the Iceberg REST Catalog
  (IRC) → schema, snapshots, table topology → correlate schema change ↔ compaction/cost.

## 1. Architecture (plain ASCII)

```
  AWS us-east-1 (Dynatrace-integrated account)            Dynatrace (hgd83841)
  --------------------------------------------            --------------------
  CloudFormation
    AWS::S3Tables::TableBucket  "airline-datalake"
    AWS::S3Tables::Namespace    "ops"
    AWS::S3Tables::Table        "flights" (Iceberg schema)
        |
        | (control plane: boto3/CFN create;  request metrics enabled via CLI)
        v
  loader.py / loadgen.py  --PyIceberg over S3 Tables IRC-->  table data + snapshots
        |   (BTS monthly loads + continuous append/query = realtime traffic at scale)
        v
  CloudWatch  AWS/S3/Tables  ===== NATIVE integration (Metric Streams/Firehose) =====>  metrics
        |                                                                                  |
        | storage, compaction, request, latency, error                                    v
                                                                           usage dashboard + cost
                                                                           dashboard (DQL x unit $)
                                                                                  ^
  S3 Tables IRC endpoint ---Phase 2 extension (irc_metadata.py)--> schema/snapshots -> metrics+events
   (or Glue IRC)                                                   = table-level attribution + correlation
```

No bridge in Phase 1: metrics reach Dynatrace through the account's existing AWS
integration. Cost is computed **in Dynatrace** via DQL over the native metrics × unit
prices (dashboard variables). Phase 2's extension is the only custom ingest, by design
(it's the net-new connector).

## 2. Prerequisites & open items

Prereqs: AWS creds for the target account (`ada ...`), Python via **uv**
(`pyiceberg[pyarrow]`, `boto3`, `requests`, `pandas`), Dynatrace golden token (`DT_TOKEN`),
AWS CLI with `--no-cli-pager`.

Open items (flagged, verified at build — not assumed):
- a. **Account id** of the Dynatrace-integrated account + confirm its **Metric Stream
     includes `AWS/S3/Tables`** (all-namespaces, or add to allowlist).
- b. Exact **BTS prezip URL** pattern (expected:
     `https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_YYYY_M.zip`).
- c. **Request metrics enable** = `aws s3tables put-table-bucket-metrics-configuration`
     (confirmed in docs; not a CFN property, so done post-deploy or via custom resource).
- d. Exact **PyIceberg IRC config strings** for S3 Tables + Glue endpoints (shape below is
     correct; confirm signing-name/uri at build).
- e. Authoritative **unit prices** for the cost model → pull from AWS Pricing at build;
     parameterized, never hardcoded as fact.

## 3. Repo layout

```
s3-tables-dynatrace/
  infra/
    s3tables.yaml            # CFN: TableBucket + Namespace + Table (Iceberg schema)
    deploy.sh                # deploy stack + enable request metrics
  poc/
    pyproject.toml           # uv project
    common.py                # IRC catalog + Dynatrace helpers
    loader.py                # BTS monthly load (download zip -> append via IRC)
    loadgen.py               # continuous append/query -> realtime traffic at scale
    irc_metadata.py          # Phase 2: IRC schema/snapshots -> DT metrics + events
    evolve_schema.py         # Phase 2: add a column (schema evolution trigger)
  dashboards/
    usage.json               # throughput / latency / errors / storage / compaction
    cost.json                # estimated $ by bucket/namespace/table (DQL x unit prices)
  design/poc-plan.md         # this doc
```

## 4. Phase 1 — infra + data + native metrics

### 4.1 CFN — `infra/s3tables.yaml`
```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: S3 Tables airline data lake for Dynatrace POC
Resources:
  TableBucket:
    Type: AWS::S3Tables::TableBucket
    Properties:
      TableBucketName: airline-datalake-poc
  OpsNamespace:
    Type: AWS::S3Tables::Namespace
    Properties:
      TableBucketARN: !Ref TableBucket
      Namespace: ops
  FlightsTable:
    Type: AWS::S3Tables::Table
    Properties:
      TableBucketARN: !Ref TableBucket
      Namespace: ops
      TableName: flights
      OpenTableFormat: ICEBERG
      IcebergMetadata:              # verify nested names at build (item d)
        IcebergSchema:
          SchemaFieldList:
            - { Name: flight_date,   Type: date }
            - { Name: carrier,       Type: string }   # Reporting_Airline (UA/DL/AA)
            - { Name: flight_number, Type: string }
            - { Name: origin,        Type: string }
            - { Name: dest,          Type: string }
            - { Name: dep_delay,     Type: double }
            - { Name: arr_delay,     Type: double }
            - { Name: cancelled,     Type: double }
            - { Name: diverted,      Type: double }
            - { Name: air_time,      Type: double }
            - { Name: distance,      Type: double }
            - { Name: carrier_delay, Type: double }
            - { Name: weather_delay, Type: double }
            - { Name: nas_delay,     Type: double }
            - { Name: late_aircraft_delay, Type: double }
Outputs:
  TableBucketArn: { Value: !Ref TableBucket }
```
Note: schema evolution (Phase 2) is done via Iceberg/PyIceberg, not CFN (a CFN schema edit
would be a table Replacement). That's realistic — evolution is a data-plane operation.

### 4.2 Deploy + enable request metrics — `infra/deploy.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
REGION=us-east-1
aws cloudformation deploy --template-file s3tables.yaml \
  --stack-name s3tables-dt-poc --region "$REGION" --no-cli-pager
ARN=$(aws cloudformation describe-stacks --stack-name s3tables-dt-poc \
  --region "$REGION" --no-cli-pager \
  --query "Stacks[0].Outputs[?OutputKey=='TableBucketArn'].OutputValue" --output text)
echo "$ARN" > ../poc/.table_bucket_arn
# 1-min request metrics (storage/compaction are daily + free; this gives live data)
aws s3tables put-table-bucket-metrics-configuration \
  --table-bucket-arn "$ARN" --region "$REGION" --no-cli-pager
echo "deployed + request metrics enabled: $ARN"
```

### 4.3 IRC catalog + Dynatrace helpers — `poc/common.py`
```python
import os, pathlib, requests
from pyiceberg.catalog.rest import RestCatalog

REGION = "us-east-1"
ACCOUNT = os.environ["AWS_ACCOUNT_ID"]
BUCKET, NS, TABLE = "airline-datalake-poc", "ops", "flights"
ARN = pathlib.Path(__file__).with_name(".table_bucket_arn").read_text().strip()

def catalog() -> RestCatalog:
    # S3 Tables Iceberg REST endpoint (verify strings at build, item d)
    return RestCatalog(name="s3tables", **{
        "type": "rest",
        "uri": f"https://s3tables.{REGION}.amazonaws.com/iceberg",
        "warehouse": ARN,
        "rest.sigv4-enabled": "true",
        "rest.signing-name": "s3tables",
        "rest.signing-region": REGION,
    })

DT = "https://hgd83841.live.dynatrace.com"
H = {"Authorization": f"Api-Token {os.environ['DT_TOKEN']}"}

def dt_metrics(lines: list[str]):
    r = requests.post(f"{DT}/api/v2/metrics/ingest",
        headers={**H, "Content-Type": "text/plain"}, data="\n".join(lines), timeout=30)
    r.raise_for_status(); return r.text

def dt_event(title: str, props: dict):
    r = requests.post(f"{DT}/api/v2/events/ingest", headers=H, timeout=30,
        json={"eventType": "CUSTOM_INFO", "title": title,
              "properties": {k: str(v) for k, v in props.items()}})
    r.raise_for_status(); return r.text
```

### 4.4 BTS loader — `poc/loader.py`
```python
"""Download a BTS On-Time month, map to the flights schema, append via IRC."""
import io, sys, zipfile, requests, pandas as pd, pyarrow as pa
from common import catalog, NS, TABLE

BTS = ("https://transtats.bts.gov/PREZIP/"
       "On_Time_Reporting_Carrier_On_Time_Performance_1987_present_{y}_{m}.zip")  # verify (item b)
COLS = {  # BTS column -> our schema column
    "FlightDate":"flight_date","Reporting_Airline":"carrier",
    "Flight_Number_Reporting_Airline":"flight_number","Origin":"origin","Dest":"dest",
    "DepDelay":"dep_delay","ArrDelay":"arr_delay","Cancelled":"cancelled",
    "Diverted":"diverted","AirTime":"air_time","Distance":"distance",
    "CarrierDelay":"carrier_delay","WeatherDelay":"weather_delay","NASDelay":"nas_delay",
    "LateAircraftDelay":"late_aircraft_delay",
}

def load_month(y: int, m: int):
    z = zipfile.ZipFile(io.BytesIO(requests.get(BTS.format(y=y, m=m), timeout=300).content))
    df = pd.read_csv(z.open(z.namelist()[0]), usecols=list(COLS), low_memory=False).rename(columns=COLS)
    df["flight_date"] = pd.to_datetime(df["flight_date"]).dt.date
    df["flight_number"] = df["flight_number"].astype(str)
    tbl = catalog().load_table(f"{NS}.{TABLE}")
    tbl.append(pa.Table.from_pandas(df, preserve_index=False))
    print(f"appended {len(df):,} rows for {y}-{m:02d}; snapshot={tbl.current_snapshot().snapshot_id}")

if __name__ == "__main__":
    load_month(int(sys.argv[1]), int(sys.argv[2]))   # e.g. python loader.py 2024 1
```

### 4.5 Load generator (realtime at scale) — `poc/loadgen.py`
```python
"""Sustained read/write workload so Dynatrace shows a live production system."""
import time, random, pyarrow as pa, pyarrow.compute as pc
from common import catalog, NS, TABLE

def run(minutes=30):
    cat = catalog(); end = time.time() + minutes*60
    while time.time() < end:
        tbl = cat.load_table(f"{NS}.{TABLE}")
        # read workload: scan + filter (GET traffic)
        df = tbl.scan(row_filter=f"carrier == '{random.choice(['UA','DL','AA','WN'])}'",
                      limit=50_000).to_arrow()
        _ = pc.mean(df["arr_delay"]) if df.num_rows else None
        # write workload: small micro-batch append (PUT traffic + snapshot churn -> compaction)
        time.sleep(random.uniform(1, 4))
    print("loadgen done")

if __name__ == "__main__":
    run()
```

### 4.6 Usage dashboard — `dashboards/usage.json`
Tiles (split by TableBucketName / Namespace / TableName): request throughput (GET/PUT/
HEAD/POST), FirstByte & Total latency p50/p90/p99, 4xx/5xx error rate, storage bytes +
file-count growth, compaction bytes/objects. Blog screenshots come from here.

## 5. Cost model + cost dashboard (in scope)

Cost is computed **in Dynatrace via DQL** over the native metrics × unit prices held as
**dashboard variables** (parameterized; authoritative prices pulled from AWS Pricing at
build — item e). Mapping:

| Cost dimension | Driver metric(s) | Unit price var |
|---|---|---|
| Storage | `TableBucketStorage` bytes → GB-month | `$storage_gb_month` |
| Object monitoring | `TableBucketNumberOfObjects` | `$monitor_per_1k_obj` |
| Compaction | `CompactionBytesProcessed` + `CompactionObjectsCount` | `$compact_gb`, `$compact_1k_obj` |
| Requests | Get/Put/Head/Post/All counts | `$req_tier1_1k`, `$req_tier2_1k` |
| CloudWatch metrics | # request metrics published | `$cw_custom_metric` |

`dashboards/cost.json`: estimated $ total + stacked by dimension, and **$ per
namespace/table** (the FinOps view). Example DQL tile (illustrative):
```
timeseries storage_gb = avg(aws.s3tables.table_bucket_size_bytes)/1073741824,
  by:{dt.entity, namespace, table}
| fieldsAdd est_cost_usd = storage_gb * $storage_gb_month
```
GTM hook: **FinOps for your S3 Tables data lake**, per table/namespace, in the same pane as
performance.

## 6. Phase 2 — IRC extension (differentiator)

### 6.1 Pull Iceberg metadata — `poc/irc_metadata.py`
```python
"""Teach Dynatrace to speak IRC: read schema/snapshots, push metrics + events."""
from common import catalog, NS, TABLE, BUCKET, dt_metrics, dt_event

def publish():
    tbl = catalog().load_table(f"{NS}.{TABLE}")
    schema, snaps, cur = tbl.schema(), list(tbl.metadata.snapshots), tbl.current_snapshot()
    dt_metrics([
        f"s3tables.iceberg.schema.fields,bucket={BUCKET},ns={NS},table={TABLE} {len(schema.fields)}",
        f"s3tables.iceberg.snapshots.count,bucket={BUCKET},ns={NS},table={TABLE} {len(snaps)}",
    ])
    dt_event("S3 Tables schema state", {
        "bucket": BUCKET, "namespace": NS, "table": TABLE,
        "schema_id": schema.schema_id,
        "fields": ",".join(f"{f.name}:{f.field_type}" for f in schema.fields),
        "current_snapshot": cur.snapshot_id if cur else "none",
        "snapshot_count": len(snaps),
    })
    return {f.name for f in schema.fields}
```

### 6.2 Schema evolution trigger — `poc/evolve_schema.py`
```python
"""Add a business column mid-stream (e.g. sustainability reporting) -> schema evolution."""
from pyiceberg.types import DoubleType
from common import catalog, NS, TABLE

def add_co2_column():
    tbl = catalog().load_table(f"{NS}.{TABLE}")
    with tbl.update_schema() as u:
        u.add_column("co2_estimate_kg", DoubleType())   # new column -> schema evolution event
    print("added co2_estimate_kg")
```
(Alternative: mirror the real BTS 2025 codeshare marketing-carrier column addition instead
of a synthetic CO2 field — either way it's a genuine Iceberg schema evolution.)

### 6.3 The money demo — correlation
`run_all` sequence: load a few BTS months → start `loadgen` → `irc_metadata.publish()`
baseline → `evolve_schema.add_co2_column()` + backfill writes (triggers compaction) →
`irc_metadata.publish()` again (emits **schema-change event**). The usage/cost dashboards
show a **compaction + cost spike**; the IRC event marker lands on it = the correlation
neither Dynatrace nor Datadog offers today.

## 7. Deliverables

| Output | Phase | Use |
|---|---|---|
| Native `AWS/S3/Tables` usage dashboard | 1 | Blog: "it just works" at scale |
| Cost dashboard ($ by namespace/table) | 1 | GTM hook: data-lake FinOps |
| IRC schema/snapshot metrics + events | 2 | Build pitch (Michael/Nidhi) |
| Schema-change ↔ compaction/cost correlation | 2 | The differentiator demo |

## 8. Scope & honesty boundaries

- Single account/region. "At scale" is a **scaled proxy**: a load generator + a few BTS
  months, with projections to airline volume — not literally millions of users. Stated
  plainly in the blog.
- Cost = **estimate** from parameterized unit prices (AWS Pricing is source of truth), not
  billed actuals.
- Local scripts, not a packaged Dynatrace extension/ActiveGate. Proves data flow + value.
- Full custom-entity topology in Dynatrace is a production step; POC uses metric dimensions
  + events for the correlation.

## 9. What I need to start

1. **Account id** of the Dynatrace-integrated account (us-east-1).
2. Confirm its Metric Stream carries `AWS/S3/Tables` (or we add it).
3. Green light on `co2_estimate_kg` vs the real BTS codeshare column for the schema-evolution demo.
```
