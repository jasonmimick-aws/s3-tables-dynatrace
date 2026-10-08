"""Dynatrace Extensions 2.0 extension for Amazon S3 Tables (Iceberg via the S3 Tables IRC).

The scheduled callback reads live Iceberg table state over the S3 Tables Iceberg REST
Catalog and reports it to Dynatrace as metrics, a schema-state event, and topology
(table bucket -> namespace -> table). All IRC reading is delegated to the shared
collector ``poc/s3tables_core.py`` so the extension and the standalone POC stay in sync.
"""

__version__ = "0.1.0"
