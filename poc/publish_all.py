"""Publish metadata + data insights for EVERY table to Dynatrace.

For each table in the lakehouse:
  * IRC metadata (schema/snapshots/rows/files/bytes) via s3tables_core -> topology + metrics
  * a schema-state event

Then, for each sample dataset, schema-agnostic data insights (rows / category counts /
numeric averages). Flights keeps its richer, flight-specific insights.

Requires DT_TOKEN + DT_BASE in the environment (ingest token from Secrets Manager).

Usage: uv run python publish_all.py
"""
from __future__ import annotations

import common
import s3tables_core as core
import s3tables_insights_generic as gi
import s3tables_data_insights as fi  # flight-specific insights
from datasets import DATASETS

BUCKET = "airline-datalake-poc"
# (ns, table) for every table we expect in the lakehouse.
TABLES = [("ops", "flights")] + [(d.ns, d.table) for d in DATASETS.values()]


def main() -> None:
    print("== metadata + topology (all tables) ==")
    for ns, table in TABLES:
        try:
            st = core.collect(BUCKET, ns, table)
        except Exception as e:
            print(f"  skip {ns}/{table}: {e}")
            continue
        common.dt_metrics(core.to_metric_lines(st))
        ev = core.to_schema_state_event(st)
        common.dt_event(ev["title"], ev["properties"])
        print(f"  {ns}/{table}: rows={st.row_count:,} files={st.file_count} "
              f"snapshots={st.snapshot_count} fields={st.field_count}")

    print("== flight-specific data insights ==")
    try:
        di = fi.compute(BUCKET, "ops", "flights", limit=200_000)
        common.dt_metrics(fi.to_metric_lines(di))
        ev = fi.to_event(di)
        common.dt_event(ev["title"], ev["properties"])
        print(f"  flights: {di.rows_analyzed:,} rows · {di.distinct_carriers} carriers")
    except Exception as e:
        print(f"  flights insights skipped: {e}")

    print("== generic data insights (sample datasets) ==")
    for name in DATASETS:
        try:
            g = gi.compute(name, bucket=BUCKET, limit=200_000)
        except Exception as e:
            print(f"  skip {name}: {e}")
            continue
        common.dt_metrics(gi.to_metric_lines(g))
        ev = gi.to_event(g)
        common.dt_event(ev["title"], ev["properties"])
        top = g.categories[0]["value"] if g.categories else "n/a"
        print(f"  {name}: {g.rows_analyzed:,} rows · top {g.category_col}={top}")


if __name__ == "__main__":
    main()
