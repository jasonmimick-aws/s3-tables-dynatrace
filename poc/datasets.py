"""Big sample datasets for the S3 Tables × Dynatrace POC.

Each dataset is a distinct domain with a realistic schema and a fast synthetic
row generator (PyArrow + NumPy). They load into their own namespace/table in the
same S3 Tables bucket so Dynatrace topology shows a multi-domain lakehouse:

    airline-datalake-poc
      ├─ ops/flights            (existing — BTS airline on-time)
      ├─ rides/trips            (NYC-taxi-style trips)
      ├─ retail/orders          (e-commerce orders)
      ├─ iot/sensor_readings    (device telemetry)
      └─ security/auth_events   (auth / access logs)

Each dataset also declares an insight config (one categorical column + a few
numeric columns) so the generic insights collector can summarize any of them.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

import numpy as np
import pyarrow as pa

_RNG = np.random.default_rng(7)
_EPOCH_US = 1_735_689_600_000_000  # 2025-01-01T00:00:00Z in microseconds


@dataclass
class Dataset:
    ns: str
    table: str
    label: str
    schema: pa.Schema
    gen: Callable[[int, int], pa.Table]  # (n_rows, offset) -> Arrow table
    category_col: str
    numeric_cols: list[str] = field(default_factory=list)

    @property
    def ident(self) -> str:
        return f"{self.ns}.{self.table}"


def _pick(pool: list[str], n: int) -> pa.Array:
    arr = np.array(pool, dtype=object)
    return pa.array(arr[_RNG.integers(0, len(pool), n)], type=pa.string())


def _ts(n: int, span_days: int = 120) -> pa.Array:
    span_us = span_days * 86_400_000_000
    micros = _EPOCH_US + _RNG.integers(0, span_us, n)
    return pa.array(micros.astype("int64"), type=pa.timestamp("us"))


# --------------------------------------------------------------------------- #
# rides / trips  — NYC-taxi-style
# --------------------------------------------------------------------------- #
_VENDORS = ["CMT", "VTS", "DDS"]
_ZONES = ["JFK", "LGA", "EWR", "Midtown", "SoHo", "Harlem", "Brooklyn", "Queens", "Bronx", "FiDi"]
_PAYMENTS = ["credit_card", "cash", "no_charge", "dispute"]

_TRIPS_SCHEMA = pa.schema([
    pa.field("trip_id", pa.int64()),
    pa.field("vendor", pa.string()),
    pa.field("pickup_ts", pa.timestamp("us")),
    pa.field("passenger_count", pa.int64()),
    pa.field("trip_distance", pa.float64()),
    pa.field("fare_amount", pa.float64()),
    pa.field("tip_amount", pa.float64()),
    pa.field("payment_type", pa.string()),
    pa.field("pickup_zone", pa.string()),
    pa.field("dropoff_zone", pa.string()),
])


def _gen_trips(n: int, offset: int) -> pa.Table:
    dist = np.round(_RNG.gamma(2.0, 2.1, n), 2)
    fare = np.round(2.5 + dist * 2.3 + _RNG.normal(0, 1.5, n).clip(-2, 8), 2)
    tip = np.round((fare * _RNG.uniform(0, 0.3, n)).clip(0), 2)
    return pa.table({
        "trip_id": pa.array(np.arange(offset, offset + n, dtype="int64")),
        "vendor": _pick(_VENDORS, n),
        "pickup_ts": _ts(n),
        "passenger_count": pa.array(_RNG.integers(1, 6, n).astype("int64")),
        "trip_distance": pa.array(dist, type=pa.float64()),
        "fare_amount": pa.array(fare, type=pa.float64()),
        "tip_amount": pa.array(tip, type=pa.float64()),
        "payment_type": _pick(_PAYMENTS, n),
        "pickup_zone": _pick(_ZONES, n),
        "dropoff_zone": _pick(_ZONES, n),
    }, schema=_TRIPS_SCHEMA)


# --------------------------------------------------------------------------- #
# retail / orders — e-commerce
# --------------------------------------------------------------------------- #
_CATEGORIES = ["electronics", "apparel", "home", "grocery", "beauty", "toys", "sports", "books"]
_CHANNELS = ["web", "mobile", "store", "marketplace"]
_COUNTRIES = ["US", "CA", "GB", "DE", "FR", "JP", "AU", "BR"]
_STATUSES = ["placed", "shipped", "delivered", "returned", "cancelled"]

_ORDERS_SCHEMA = pa.schema([
    pa.field("order_id", pa.int64()),
    pa.field("customer_id", pa.int64()),
    pa.field("order_ts", pa.timestamp("us")),
    pa.field("category", pa.string()),
    pa.field("channel", pa.string()),
    pa.field("country", pa.string()),
    pa.field("quantity", pa.int64()),
    pa.field("unit_price", pa.float64()),
    pa.field("order_total", pa.float64()),
    pa.field("status", pa.string()),
])


def _gen_orders(n: int, offset: int) -> pa.Table:
    qty = _RNG.integers(1, 6, n)
    price = np.round(_RNG.gamma(2.0, 18.0, n).clip(1), 2)
    total = np.round(qty * price, 2)
    return pa.table({
        "order_id": pa.array(np.arange(offset, offset + n, dtype="int64")),
        "customer_id": pa.array(_RNG.integers(1, 500_000, n).astype("int64")),
        "order_ts": _ts(n),
        "category": _pick(_CATEGORIES, n),
        "channel": _pick(_CHANNELS, n),
        "country": _pick(_COUNTRIES, n),
        "quantity": pa.array(qty.astype("int64")),
        "unit_price": pa.array(price, type=pa.float64()),
        "order_total": pa.array(total, type=pa.float64()),
        "status": _pick(_STATUSES, n),
    }, schema=_ORDERS_SCHEMA)


# --------------------------------------------------------------------------- #
# iot / sensor_readings — device telemetry
# --------------------------------------------------------------------------- #
_SITES = ["us-east-dc1", "us-west-dc2", "eu-central-dc1", "ap-south-dc1", "factory-floor-a", "factory-floor-b"]
_DEV_STATUS = ["ok", "degraded", "warning", "critical"]

_SENSOR_SCHEMA = pa.schema([
    pa.field("reading_id", pa.int64()),
    pa.field("device_id", pa.int64()),
    pa.field("site", pa.string()),
    pa.field("reading_ts", pa.timestamp("us")),
    pa.field("temperature_c", pa.float64()),
    pa.field("humidity_pct", pa.float64()),
    pa.field("battery_pct", pa.float64()),
    pa.field("status", pa.string()),
])


def _gen_sensor(n: int, offset: int) -> pa.Table:
    temp = np.round(_RNG.normal(22, 6, n), 2)
    hum = np.round(_RNG.normal(45, 12, n).clip(0, 100), 2)
    batt = np.round(_RNG.uniform(2, 100, n), 1)
    return pa.table({
        "reading_id": pa.array(np.arange(offset, offset + n, dtype="int64")),
        "device_id": pa.array(_RNG.integers(1, 50_000, n).astype("int64")),
        "site": _pick(_SITES, n),
        "reading_ts": _ts(n, span_days=30),
        "temperature_c": pa.array(temp, type=pa.float64()),
        "humidity_pct": pa.array(hum, type=pa.float64()),
        "battery_pct": pa.array(batt, type=pa.float64()),
        "status": _pick(_DEV_STATUS, n),
    }, schema=_SENSOR_SCHEMA)


# --------------------------------------------------------------------------- #
# security / auth_events — access logs
# --------------------------------------------------------------------------- #
_ACTIONS = ["login", "logout", "mfa_challenge", "password_reset", "token_refresh", "api_call"]
_RESULTS = ["success", "failure", "blocked", "challenged"]
_GEOS = ["US", "CA", "GB", "DE", "IN", "BR", "NG", "RU", "CN", "SG"]

_AUTH_SCHEMA = pa.schema([
    pa.field("event_id", pa.int64()),
    pa.field("event_ts", pa.timestamp("us")),
    pa.field("user_id", pa.int64()),
    pa.field("source_ip", pa.string()),
    pa.field("action", pa.string()),
    pa.field("result", pa.string()),
    pa.field("geo", pa.string()),
    pa.field("mfa_used", pa.string()),
    pa.field("risk_score", pa.float64()),
])


def _gen_auth(n: int, offset: int) -> pa.Table:
    octets = _RNG.integers(1, 255, (n, 4))
    ips = pa.array([f"{a}.{b}.{c}.{d}" for a, b, c, d in octets], type=pa.string())
    risk = np.round(_RNG.beta(2, 5, n) * 100, 1)
    mfa = _pick(["yes", "no"], n)
    return pa.table({
        "event_id": pa.array(np.arange(offset, offset + n, dtype="int64")),
        "event_ts": _ts(n, span_days=30),
        "user_id": pa.array(_RNG.integers(1, 200_000, n).astype("int64")),
        "source_ip": ips,
        "action": _pick(_ACTIONS, n),
        "result": _pick(_RESULTS, n),
        "geo": _pick(_GEOS, n),
        "mfa_used": mfa,
        "risk_score": pa.array(risk, type=pa.float64()),
    }, schema=_AUTH_SCHEMA)


DATASETS: dict[str, Dataset] = {
    "trips": Dataset("rides", "trips", "NYC-taxi-style trips", _TRIPS_SCHEMA, _gen_trips,
                     category_col="payment_type", numeric_cols=["trip_distance", "fare_amount", "tip_amount"]),
    "orders": Dataset("retail", "orders", "E-commerce orders", _ORDERS_SCHEMA, _gen_orders,
                      category_col="category", numeric_cols=["quantity", "unit_price", "order_total"]),
    "sensors": Dataset("iot", "sensor_readings", "IoT device telemetry", _SENSOR_SCHEMA, _gen_sensor,
                       category_col="status", numeric_cols=["temperature_c", "humidity_pct", "battery_pct"]),
    "auth": Dataset("security", "auth_events", "Auth / access events", _AUTH_SCHEMA, _gen_auth,
                    category_col="result", numeric_cols=["risk_score"]),
}
