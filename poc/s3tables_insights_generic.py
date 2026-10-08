"""Schema-agnostic data insights for any dataset.

Samples a dataset's rows over the IRC and emits generic data-level metrics that the
app can render for any table:
  * s3tables.data.rows_analyzed              (dims: bucket, ns, table)
  * s3tables.data.category_count             (+ dim: category)   — top values of the
                                               dataset's primary categorical column
  * s3tables.data.numeric_avg                (+ dim: field)      — mean of each numeric
                                               column

Dataset config (which column is the category, which are numeric) comes from
``datasets.DATASETS``.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import common
from datasets import DATASETS
from s3tables_core import catalog_for

BUCKET = "airline-datalake-poc"
TOP_N = 12


@dataclass
class GenericInsights:
    name: str
    bucket: str
    ns: str
    table: str
    rows_analyzed: int = 0
    category_col: str = ""
    categories: list[dict] = field(default_factory=list)   # {value, count}
    numeric_avgs: list[dict] = field(default_factory=list)  # {field, avg}

    def dims(self) -> str:
        return f"bucket={self.bucket},ns={self.ns},table={self.table}"


def _sanitize(v: str) -> str:
    s = "".join(ch if (ch.isalnum() or ch in "-_.") else "_" for ch in str(v).strip())
    return s[:60] or "unknown"


def compute(name: str, bucket: str = BUCKET, limit: int = 200_000) -> GenericInsights:
    ds = DATASETS[name]
    tbl = catalog_for(bucket).load_table(ds.ident)
    cols = tuple([ds.category_col, *ds.numeric_cols])
    df = tbl.scan(selected_fields=cols, limit=limit).to_pandas()

    out = GenericInsights(name=name, bucket=bucket, ns=ds.ns, table=ds.table,
                          rows_analyzed=int(len(df)), category_col=ds.category_col)
    if out.rows_analyzed == 0:
        return out

    counts = df[ds.category_col].fillna("unknown").value_counts().head(TOP_N)
    out.categories = [{"value": str(k), "count": int(v)} for k, v in counts.items()]
    for c in ds.numeric_cols:
        if c in df:
            m = df[c].astype("float64").mean(skipna=True)
            out.numeric_avgs.append({"field": c, "avg": round(float(m), 3) if m == m else 0.0})
    return out


def to_metric_lines(gi: GenericInsights) -> list[str]:
    base = gi.dims()
    lines = [f"s3tables.data.rows_analyzed,{base} {gi.rows_analyzed}"]
    for c in gi.categories:
        lines.append(f's3tables.data.category_count,{base},category="{_sanitize(c["value"])}" {c["count"]}')
    for nmr in gi.numeric_avgs:
        lines.append(f's3tables.data.numeric_avg,{base},field="{_sanitize(nmr["field"])}" {nmr["avg"]}')
    return lines


def to_event(gi: GenericInsights) -> dict:
    top = gi.categories[0]["value"] if gi.categories else "none"
    return {
        "title": "S3 Tables data insight",
        "properties": {
            "bucket": gi.bucket,
            "namespace": gi.ns,
            "table": gi.table,
            "dataset": gi.name,
            "rows_analyzed": str(gi.rows_analyzed),
            "category_col": gi.category_col,
            "top_category": str(top),
        },
    }


def main() -> None:
    import sys
    name = sys.argv[1] if len(sys.argv) > 1 else "trips"
    gi = compute(name)
    print(f"{name}: {gi.rows_analyzed:,} rows · top {gi.category_col}="
          f"{gi.categories[0]['value'] if gi.categories else 'n/a'}")
    print("metrics:", common.dt_metrics(to_metric_lines(gi)))
    ev = to_event(gi)
    print("event:", common.dt_event(ev["title"], ev["properties"]) or "ok")


if __name__ == "__main__":
    main()
