"""CHIRPS v2.0 daily precipitation — independent cross-check for the POWER series.

Why this module exists: NASA POWER's PRECTOTCORR is not homogeneous over 1981–2025 (the
precipitation input changes source, and `src/compute/trends.pettitt` finds the step). A trend or
an onset shift computed across that step is partly the product, not the climate, so every pack
carries the same statistics recomputed from an independent gridded product.

CHIRPS ("Climate Hazards Center InfraRed Precipitation with Stations", v2.0, 0.25°) blends
NOAA CPC / TRMM-era satellite infrared with station observations and is distributed by the
Climate Hazards Center at UCSB under a USGS cooperative agreement (Funk et al., 2015,
Scientific Data 2:150066). It is **not** a NASA product and not a Space Agency Partner product:
the app labels it "Open (UCSB CHC / USGS)".

This module reads files that were downloaded out of band — it performs NO network I/O:

    ${CHIRPS_DIR:-/workspace/fs-cache/chirps}/chirps_bd_<year>.nc

Those per-year netCDFs are a Bangladesh box (lat 20–27, lon 88–93) cut from the official
global_daily p25 files; each keeps ``source_url`` and ``retrieved_utc`` attributes written by the
download, which `provenance()` surfaces into the packs. The .nc files are never committed.
"""

from __future__ import annotations

import math
import os
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import xarray as xr

VAR = "precip"
UNITS = "mm/day"
PRODUCT = "CHIRPS v2.0 daily (0.25°)"
PROVIDER = "Climate Hazards Center, UCSB / USGS"
CITATION = "Funk et al., 2015 — Scientific Data 2:150066"
FIRST_YEAR = 1981
LAST_YEAR = 2025


def default_dir() -> Path:
    return Path(os.environ.get("CHIRPS_DIR", "/workspace/fs-cache/chirps"))


def available_years(chirps_dir: Path | None = None) -> list[int]:
    directory = Path(chirps_dir) if chirps_dir is not None else default_dir()
    years = []
    for path in sorted(directory.glob("chirps_bd_*.nc")):
        try:
            year = int(path.stem.rsplit("_", 1)[-1])
        except ValueError:
            continue
        years.append(year)
    return sorted(years)


def series(
    lat: float,
    lon: float,
    start_year: int = FIRST_YEAR,
    end_year: int = LAST_YEAR,
    chirps_dir: Path | None = None,
) -> pd.Series:
    """Daily precipitation at the nearest 0.25° grid cell, mm/day, indexed by date.

    Negative or non-finite pixels become NaN — CHIRPS fills missing ocean/no-data cells and a
    negative accumulation is not water.
    """
    directory = Path(chirps_dir) if chirps_dir is not None else default_dir()
    frames: list[pd.Series] = []
    for year in range(int(start_year), int(end_year) + 1):
        path = directory / f"chirps_bd_{year}.nc"
        if not path.exists():
            continue
        with xr.open_dataset(path) as dataset:
            subset = dataset[VAR].sel(latitude=float(lat), longitude=float(lon), method="nearest")
            values = np.asarray(subset.to_numpy(), dtype="float64")
            times = pd.DatetimeIndex(pd.to_datetime(dataset["time"].to_numpy()))
        values[~np.isfinite(values)] = np.nan
        values[values < 0] = np.nan
        frames.append(pd.Series(values, index=times, name="precip"))
    if not frames:
        raise FileNotFoundError(f"no CHIRPS yearly files chirps_bd_<year>.nc in {directory} for {start_year}–{end_year}")
    combined = pd.concat(frames).sort_index()
    combined = combined[~combined.index.duplicated(keep="first")]
    combined.index.name = "date"
    return combined


def cell_of(lat: float, lon: float, chirps_dir: Path | None = None) -> tuple[float, float]:
    """The grid point actually used, so a pack can state its own resolution honestly."""
    directory = Path(chirps_dir) if chirps_dir is not None else default_dir()
    year = available_years(directory)[-1]
    with xr.open_dataset(directory / f"chirps_bd_{year}.nc") as dataset:
        latitude = float(dataset[VAR].sel(latitude=float(lat), longitude=float(lon), method="nearest").latitude)
        longitude = float(dataset[VAR].sel(latitude=float(lat), longitude=float(lon), method="nearest").longitude)
    return round(latitude, 4), round(longitude, 4)


def provenance(chirps_dir: Path | None = None) -> dict[str, Any]:
    """What the files themselves say, plus the years actually present on disk."""
    directory = Path(chirps_dir) if chirps_dir is not None else default_dir()
    years = available_years(directory)
    if not years:
        raise FileNotFoundError(f"no CHIRPS files in {directory}")
    with xr.open_dataset(directory / f"chirps_bd_{years[-1]}.nc") as dataset:
        attrs = dict(dataset.attrs)
        shape = tuple(int(v) for v in dataset[VAR].shape)
        lat_min, lat_max = float(dataset["latitude"].min()), float(dataset["latitude"].max())
        lon_min, lon_max = float(dataset["longitude"].min()), float(dataset["longitude"].max())
        step = float(abs(dataset["longitude"].values[1] - dataset["longitude"].values[0]))
    return {
        "product": attrs.get("title", PRODUCT),
        "provider": attrs.get("institution", PROVIDER),
        "reference": attrs.get("reference", CITATION),
        "units": UNITS,
        "version": attrs.get("version", "Version 2.0"),
        "sourceUrlSample": attrs.get("source_url"),
        "retrievedUtc": attrs.get("retrieved_utc"),
        "yearsOnDisk": {"first": years[0], "last": years[-1], "count": len(years)},
        "grid": {"degrees": round(step, 4), "box": [lat_min, lon_min, lat_max, lon_max], "shapeLastYear": list(shape)},
        "dir": str(directory),
    }


def coverage(series_values: pd.Series) -> dict[str, Any]:
    """Honesty fields: how much of the requested window the files actually delivered."""
    present = int(series_values.notna().sum())
    return {
        "days": int(series_values.size),
        "daysWithData": present,
        "missingSharePct": None if series_values.size == 0 else (series_values.size - present) / series_values.size * 100,
        "first": series_values.index.min().strftime("%Y-%m-%d") if present else None,
        "last": series_values.index.max().strftime("%Y-%m-%d") if present else None,
        "annualNaN": int(sum(1 for _, group in series_values.groupby(series_values.index.year) if group.isna().any())),
    }


def compare(a: pd.Series, b: pd.Series, min_years: int = 8) -> dict[str, Any]:
    """Year-on-year agreement between two annual series on the shared complete years."""
    from scipy import stats

    shared = sorted(set(a.dropna().index) & set(b.dropna().index))
    if len(shared) < min_years:
        return {"yearsCompared": len(shared), "pearsonR": None, "spearmanRho": None, "mae": None, "bias": None}
    x = a.loc[shared].to_numpy(dtype="float64")
    y = b.loc[shared].to_numpy(dtype="float64")
    pearson = stats.pearsonr(x, y).statistic
    return {
        "yearsCompared": len(shared),
        "firstYear": int(shared[0]),
        "lastYear": int(shared[-1]),
        "pearsonR": round(float(pearson), 3) if not math.isnan(float(pearson)) else None,
        "spearmanRho": round(float(stats.spearmanr(x, y).statistic), 3),
        "mae": round(float(np.mean(np.abs(x - y))), 2),
        "bias": round(float(np.mean(x - y)), 2),
        "years": [int(v) for v in shared],
    }
