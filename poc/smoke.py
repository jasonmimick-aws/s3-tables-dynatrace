"""Minimal IRC write/read smoke test — proves the S3 Tables Iceberg REST config works."""
import datetime as dt
import pyarrow as pa
from common import catalog, NS, TABLE

cat = catalog()
tbl = cat.load_table(f"{NS}.{TABLE}")
print("loaded:", f"{NS}.{TABLE}", "| fields:", [f.name for f in tbl.schema().fields])

rows = 5
data = pa.table({
    "flight_date": pa.array([dt.date(2024, 1, 1)] * rows, pa.date32()),
    "carrier": pa.array(["UA", "DL", "AA", "WN", "B6"]),
    "flight_number": pa.array(["101", "202", "303", "404", "505"]),
    "origin": pa.array(["JFK", "ATL", "ORD", "DEN", "BOS"]),
    "dest": pa.array(["LAX", "MCO", "DFW", "PHX", "FLL"]),
    "dep_delay": pa.array([1.0, 2.0, 3.0, 4.0, 5.0]),
    "arr_delay": pa.array([1.0, -2.0, 3.0, -4.0, 5.0]),
    "cancelled": pa.array([0.0] * rows),
    "diverted": pa.array([0.0] * rows),
    "air_time": pa.array([300.0] * rows),
    "distance": pa.array([2475.0, 760.0, 802.0, 1024.0, 187.0]),
    "carrier_delay": pa.array([0.0] * rows),
    "weather_delay": pa.array([0.0] * rows),
    "nas_delay": pa.array([0.0] * rows),
    "late_aircraft_delay": pa.array([0.0] * rows),
})
tbl.append(data)

tbl2 = cat.load_table(f"{NS}.{TABLE}")
print("rows now:", tbl2.scan().to_arrow().num_rows)
print("snapshot:", tbl2.current_snapshot().snapshot_id)
