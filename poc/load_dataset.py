"""Create and load a big sample dataset into S3 Tables over the IRC.

Creates the namespace + table (if absent) from the dataset's PyArrow schema, then
appends synthetic rows in batches (one Iceberg snapshot per batch).

Usage:
    uv run python load_dataset.py trips 3000000
    uv run python load_dataset.py orders 4000000 --batch 500000
"""
from __future__ import annotations

import sys

from datasets import DATASETS
from s3tables_core import catalog_for

BUCKET = "airline-datalake-poc"


def load(name: str, total_rows: int, batch: int = 250_000, bucket: str = BUCKET) -> None:
    if name not in DATASETS:
        raise SystemExit(f"unknown dataset {name!r}; choices: {', '.join(DATASETS)}")
    ds = DATASETS[name]
    cat = catalog_for(bucket)

    try:
        cat.create_namespace(ds.ns)
        print(f"created namespace {ds.ns}", flush=True)
    except Exception:
        pass  # already exists

    try:
        tbl = cat.load_table(ds.ident)
        print(f"table {ds.ident} exists; appending", flush=True)
    except Exception:
        tbl = cat.create_table(ds.ident, schema=ds.schema)
        print(f"created table {bucket}/{ds.ident}", flush=True)

    loaded = 0
    while loaded < total_rows:
        n = min(batch, total_rows - loaded)
        tbl.append(ds.gen(n, loaded))
        loaded += n
        print(f"{name}: appended {loaded:,}/{total_rows:,}", flush=True)

    print(f"{name}: DONE {loaded:,} rows -> {bucket}/{ds.ident}", flush=True)


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("usage: load_dataset.py <name> [total_rows] [--batch N]")
    name = sys.argv[1]
    total = int(sys.argv[2]) if len(sys.argv) > 2 and not sys.argv[2].startswith("-") else 3_000_000
    batch = 250_000
    if "--batch" in sys.argv:
        batch = int(sys.argv[sys.argv.index("--batch") + 1])
    load(name, total, batch)


if __name__ == "__main__":
    main()
