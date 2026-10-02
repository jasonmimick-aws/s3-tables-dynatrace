"""Continuous read/write workload so Dynatrace shows a live production system.

Generates GET traffic (filtered scans) and PUT traffic + snapshot churn (micro-batch
appends sampled from existing data). Run after at least one month is loaded.

Usage: uv run python loadgen.py [minutes]
"""
import random
import sys
import time

import pyarrow.compute as pc

from common import catalog, NS, TABLE

CARRIERS = ["UA", "DL", "AA", "WN", "B6", "AS"]


def run(minutes: float = 30.0) -> None:
    cat = catalog()
    deadline = time.time() + minutes * 60
    reads = writes = 0
    while time.time() < deadline:
        tbl = cat.load_table(f"{NS}.{TABLE}")

        # READ workload (GET): filtered scan + a cheap aggregate
        carrier = random.choice(CARRIERS)
        arrow = tbl.scan(row_filter=f"carrier == '{carrier}'", limit=50_000).to_arrow()
        if arrow.num_rows:
            _ = pc.mean(arrow.column("arr_delay"))
        reads += 1

        # WRITE workload (PUT + snapshot): re-append a small sample to drive churn/compaction
        if arrow.num_rows and random.random() < 0.5:
            sample = arrow.slice(0, min(2_000, arrow.num_rows))
            tbl.append(sample)
            writes += 1

        if (reads + writes) % 10 == 0:
            print(f"reads={reads} writes={writes}")
        time.sleep(random.uniform(1.0, 4.0))

    print(f"loadgen done: reads={reads} writes={writes}")


if __name__ == "__main__":
    run(float(sys.argv[1]) if len(sys.argv) > 1 else 30.0)
