"""Phase 2 trigger — add a business column mid-stream to cause a real Iceberg schema evolution.

Default: add `co2_estimate_kg` (a sustainability-reporting column). This is a genuine
Iceberg schema change; the IRC extension (irc_metadata.py) detects it and emits a
schema-change event that lands on the resulting compaction/cost spike.

Usage: uv run python evolve_schema.py
"""
from pyiceberg.types import DoubleType

from common import catalog, NS, TABLE
import irc_metadata

NEW_COLUMN = "co2_estimate_kg"


def add_column() -> None:
    before = {f.name for f in catalog().load_table(f"{NS}.{TABLE}").schema().fields}
    tbl = catalog().load_table(f"{NS}.{TABLE}")
    with tbl.update_schema() as update:
        update.add_column(NEW_COLUMN, DoubleType())
    print(f"added column {NEW_COLUMN}")
    after = {f.name for f in catalog().load_table(f"{NS}.{TABLE}").schema().fields}
    irc_metadata.emit_schema_change(before, after)


if __name__ == "__main__":
    add_column()
