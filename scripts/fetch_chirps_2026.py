"""One-off fetch of CHIRPS v2.0 daily 2026, kept as a Bangladesh box.

Mirrors the reviewer's script for 1981–2025 so the outlook year uses the same product on
the same grid. The retrieval time is written into the file, and the file is what
src/acquire/chirps.py reads — nothing here invents a value: if the download fails, stop.

    /workspace/fs-venv/bin/python scripts/fetch_chirps_2026.py
"""

from __future__ import annotations

import datetime as dt
import subprocess
import sys
from pathlib import Path

import xarray as xr

URL = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/netcdf/p25/chirps-v2.0.2026.days_p25.nc"
OUT = Path("cache/chirps/chirps_bd_2026.nc")
TMP = Path("/tmp/chirps_2026_full.nc")
BOX = {"latitude": slice(20, 27), "longitude": slice(88, 93)}


def main() -> int:
    if not TMP.exists():
        print(f"downloading {URL}")
        result = subprocess.run(["curl", "-s", "-f", "-m", "900", "-o", str(TMP), URL], check=False)
        if result.returncode != 0:
            print("CHIRPS download failed — not writing a box file", file=sys.stderr)
            return 1

    retrieved = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    dataset = xr.open_dataset(TMP)
    subset = dataset.sel(**BOX).load()
    subset.attrs["source_url"] = URL
    subset.attrs["retrieved_utc"] = retrieved
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subset.to_netcdf(OUT)
    dataset.close()
    print("wrote", OUT, subset["precip"].shape, retrieved)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
