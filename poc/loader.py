"""Load a BTS On-Time Performance month into the flights table via the S3 Tables IRC endpoint.

Usage: uv run python loader.py 2024 1
"""
import io
import sys
import zipfile

import pandas as pd
import pyarrow as pa
import requests

from common import catalog, NS, TABLE

# BTS prezipped "Reporting Carrier On-Time Performance (1987-present)" monthly file.
# Verify exact URL/filename at build — plan item b.
BTS_URL = (
    "https://transtats.bts.gov/PREZIP/"
    "On_Time_Reporting_Carrier_On_Time_Performance_1987_present_{y}_{m}.zip"
)

# BTS column -> flights-table column
COLS = {
    "FlightDate": "flight_date",
    "Reporting_Airline": "carrier",
    "Flight_Number_Reporting_Airline": "flight_number",
    "Origin": "origin",
    "Dest": "dest",
    "DepDelay": "dep_delay",
    "ArrDelay": "arr_delay",
    "Cancelled": "cancelled",
    "Diverted": "diverted",
    "AirTime": "air_time",
    "Distance": "distance",
    "CarrierDelay": "carrier_delay",
    "WeatherDelay": "weather_delay",
    "NASDelay": "nas_delay",
    "LateAircraftDelay": "late_aircraft_delay",
}


def fetch_month(year: int, month: int) -> pd.DataFrame:
    url = BTS_URL.format(y=year, m=month)
    print(f"downloading {url}")
    resp = requests.get(url, timeout=600)
    resp.raise_for_status()
    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    csv_name = next(n for n in zf.namelist() if n.lower().endswith(".csv"))
    df = pd.read_csv(zf.open(csv_name), usecols=list(COLS), low_memory=False)
    df = df.rename(columns=COLS)
    df["flight_date"] = pd.to_datetime(df["flight_date"]).dt.date
    df["flight_number"] = df["flight_number"].astype(str)
    return df


def load_month(year: int, month: int) -> None:
    df = fetch_month(year, month)
    tbl = catalog().load_table(f"{NS}.{TABLE}")
    tbl.append(pa.Table.from_pandas(df, preserve_index=False))
    snap = tbl.current_snapshot()
    print(f"appended {len(df):,} rows for {year}-{month:02d}; "
          f"snapshot={snap.snapshot_id if snap else 'none'}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: python loader.py <year> <month>")
    load_month(int(sys.argv[1]), int(sys.argv[2]))
