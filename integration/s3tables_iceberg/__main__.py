"""Extension entrypoint.

Subclasses the Extensions 2.0 SDK ``Extension`` base. On each scheduled ``query`` it:
  * reads live Iceberg state over the S3 Tables IRC (via ``poc/s3tables_core``),
  * reports the five contract metrics (dims: bucket, ns, table),
  * emits the "S3 Tables schema state" CUSTOM_INFO event.

Targets are taken from the activation config when present, otherwise the POC defaults
(bucket ``airline-datalake-poc`` / namespace ``ops`` / table ``flights``), overridable
via the ``S3TABLES_BUCKET`` / ``S3TABLES_NS`` / ``S3TABLES_TABLE`` environment variables.
"""
import os
import sys

# Make the shared collector importable. On an ActiveGate the collector module is
# bundled alongside the extension; locally it lives in the sibling ``poc`` folder.
_HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (os.path.join(_HERE, "poc"), os.path.abspath(os.path.join(_HERE, "..", "..", "poc"))):
    if os.path.isdir(_p) and _p not in sys.path:
        sys.path.insert(0, _p)

from dynatrace_extension import Extension, DtEventType  # noqa: E402

import s3tables_core as core  # noqa: E402

_CUSTOM_INFO = getattr(DtEventType, "CUSTOM_INFO", "CUSTOM_INFO")


class S3TablesExtension(Extension):
    def initialize(self):
        self.ns = os.environ.get("S3TABLES_NS", "ops")
        self.table = os.environ.get("S3TABLES_TABLE", "flights")
        self.bucket = os.environ.get("S3TABLES_BUCKET", "airline-datalake-poc")

    def _targets(self):
        """Yield (bucket, ns, table) tuples from activation config or POC defaults."""
        cfg = getattr(self, "activation_config", None)
        endpoints = None
        if cfg is not None:
            try:
                endpoints = cfg.get("endpoints")  # ActivationConfig is mapping-like
            except Exception:
                endpoints = None
        if endpoints:
            for ep in endpoints:
                yield (
                    ep.get("bucket", self.bucket),
                    ep.get("namespace", self.ns),
                    ep.get("table", self.table),
                )
        else:
            yield (self.bucket, self.ns, self.table)

    def query(self):
        for bucket, ns, table in self._targets():
            try:
                state = core.collect(bucket, ns, table)
            except Exception as e:  # keep the scheduler alive; surface per-target failure
                self.logger.error(f"collect failed for {bucket}/{ns}/{table}: {e}")
                continue

            dims = {"bucket": state.bucket, "ns": state.ns, "table": state.table}
            self.report_metric("s3tables.iceberg.rows", state.row_count, dimensions=dims)
            self.report_metric("s3tables.iceberg.files", state.file_count, dimensions=dims)
            self.report_metric("s3tables.iceberg.snapshots.count", state.snapshot_count, dimensions=dims)
            self.report_metric("s3tables.iceberg.schema.fields", state.field_count, dimensions=dims)
            self.report_metric("s3tables.iceberg.storage.bytes", state.storage_bytes, dimensions=dims)

            ev = core.to_schema_state_event(state)
            self.report_dt_event(
                event_type=_CUSTOM_INFO,
                title=ev["title"],
                properties=ev["properties"],
            )


def main():
    S3TablesExtension(name="s3tables_iceberg").run()


if __name__ == "__main__":
    main()
