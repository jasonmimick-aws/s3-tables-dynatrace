"""Shared config: S3 Tables IRC catalog + Dynatrace ingest helpers."""
import os
import pathlib
import requests
from pyiceberg.catalog.rest import RestCatalog

REGION = os.environ.get("AWS_REGION", "us-east-1")
ACCOUNT = os.environ.get("AWS_ACCOUNT_ID", "347830095179")  # personal Isengard — metric-streams path (no external-ID role)
BUCKET = os.environ.get("S3TABLES_BUCKET", "airline-datalake-poc")
NS = "ops"
TABLE = "flights"

_ARN_FILE = pathlib.Path(__file__).with_name(".table_bucket_arn")


def table_bucket_arn() -> str:
    """ARN written by infra/deploy.sh, or synthesized from account/bucket."""
    if _ARN_FILE.exists():
        return _ARN_FILE.read_text().strip()
    return f"arn:aws:s3tables:{REGION}:{ACCOUNT}:bucket/{BUCKET}"


def catalog() -> RestCatalog:
    """S3 Tables Iceberg REST Catalog (verify config strings at build — plan item d)."""
    return RestCatalog(
        name="s3tables",
        **{
            "type": "rest",
            "uri": f"https://s3tables.{REGION}.amazonaws.com/iceberg",
            "warehouse": table_bucket_arn(),
            "rest.sigv4-enabled": "true",
            "rest.signing-name": "s3tables",
            "rest.signing-region": REGION,
        },
    )


# --- Dynatrace ingest -------------------------------------------------------
DT_BASE = os.environ.get("DT_BASE", "https://hgd83841.live.dynatrace.com")
_DT_HEADERS = {"Authorization": f"Api-Token {os.environ.get('DT_TOKEN', '')}"}


def dt_metrics(lines: list[str]) -> str:
    """Ingest metric lines (Dynatrace line protocol: 'key,dim=val value')."""
    r = requests.post(
        f"{DT_BASE}/api/v2/metrics/ingest",
        headers={**_DT_HEADERS, "Content-Type": "text/plain"},
        data="\n".join(lines),
        timeout=30,
    )
    r.raise_for_status()
    return r.text


def dt_event(title: str, props: dict) -> str:
    """Ingest a CUSTOM_INFO event (used for schema-change / snapshot markers)."""
    r = requests.post(
        f"{DT_BASE}/api/v2/events/ingest",
        headers=_DT_HEADERS,
        json={
            "eventType": "CUSTOM_INFO",
            "title": title,
            "properties": {k: str(v) for k, v in props.items()},
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.text
