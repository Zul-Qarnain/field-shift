"""NASA/JAXA GPM IMERG daily precipitation — the independent rainfall product.

Why this module exists: NASA POWER's PRECTOTCORR (MERRA-2 based) is not homogeneous over
1981–2025 — `src/compute/trends.pettitt` finds steps near 1997 and 2016 at most Bangladeshi
points — so a trend or onset shift computed across a step is partly the product, not the
climate. Every pack therefore recomputes the same statistics from a second, satellite-based
product, and the onset forecast takes its labels from it.

That product is the Integrated Multi-satellitE Retrievals for GPM (IMERG, V07; Huffman et al.),
the precipitation record of the NASA–JAXA Global Precipitation Measurement mission — passive
microwave from the GPM constellation, intercalibrated to the GPM Core Observatory's
Dual-frequency Precipitation Radar (JAXA) and GMI (NASA), merged with IR and gauge-adjusted to
GPCC in the Final run. It is read here from NASA POWER's daily aggregation
(``IMERG_PRECTOT``, mm/day, 0.1° grid, 1998 → present) in the public POWER Zarr store on AWS
Open Data — see `src.acquire.power_zarr`. NASA and a Space Agency Partner (JAXA): no non-NASA
rainfall source remains in the pipeline.

Caveats stated, not hidden:

* POWER aggregates IMERG to the UTC day, while the MERRA-2 meteorology is on local solar time;
  a 6-hour offset moves some convective rain across midnight. Onset uses 5-day sums, so the
  effect is small, but the two products are never mixed inside one statistic.
* The store marks IMERG_PRECTOT ``status: reviewing``, and its most recent months come from
  IMERG's near-real-time runs until the gauge-adjusted Final run replaces them. Training uses
  complete years through `LAST_YEAR`; the current year is only used for the observed onset.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from src.acquire import power_zarr

STORE = "imerg_daily"
VAR = "IMERG_PRECTOT"
UNITS = "mm/day"
PRODUCT = "NASA GPM IMERG V07 daily (0.1°, via NASA POWER)"
SHORT = "GPM IMERG"
PROVIDER = "NASA GSFC / JAXA — GPM mission; daily aggregation by NASA POWER (LaRC)"
CITATION = "Huffman et al., GPM IMERG V07 — doi:10.5067/GPM/IMERG/3B-HH/07"
TIER = "NASA + JAXA (GPM)"
FIRST_YEAR = 1998
LAST_YEAR = 2025

_STORE: power_zarr.ZarrStore | None = None


def store() -> power_zarr.ZarrStore:
    global _STORE
    if _STORE is None:
        _STORE = power_zarr.ZarrStore(STORE)
    return _STORE


def series(lat: float, lon: float, start_year: int = FIRST_YEAR, end_year: int = LAST_YEAR) -> pd.Series:
    """Daily IMERG precipitation at the 0.1° cell containing the point, mm/day, indexed by date.

    Negative or non-finite values become NaN; days past the archive's last day are trimmed.
    """
    first = max(int(start_year), FIRST_YEAR)
    values = store().point(VAR, float(lat), float(lon), f"{first}-01-01", f"{int(end_year)}-12-31")
    values = values.astype("float64")
    values[~np.isfinite(values.to_numpy())] = np.nan
    values[values < 0] = np.nan
    present = values.dropna()
    if present.empty:
        raise FileNotFoundError(f"IMERG has no data at {lat:.4f}, {lon:.4f} for {first}–{end_year}")
    values = values.loc[: present.index.max()]
    values.index.name = "date"
    values.name = "precip"
    return values


def cell_of(lat: float, lon: float) -> tuple[float, float]:
    """The grid cell actually used, so a pack can state its own resolution honestly."""
    return store().cell_of(lat, lon)


def available_years(values: pd.Series) -> list[int]:
    """Calendar years the series covers completely."""
    out = []
    for year, group in values.groupby(values.index.year):
        days = 366 if pd.Timestamp(year=int(year), month=12, day=31).dayofyear == 366 else 365
        if len(group) == days and not group.isna().any():
            out.append(int(year))
    return out


def provenance() -> dict[str, Any]:
    meta = power_zarr.provenance(store())
    return {
        "product": PRODUCT,
        "provider": PROVIDER,
        "reference": CITATION,
        "units": UNITS,
        "version": "IMERG V07 (POWER " + str(meta.get("version") or "v10") + ")",
        "sourceUrlSample": meta["url"],
        "registry": meta["registry"],
        "retrievedUtc": meta["retrievedUtc"],
        "grid": {"degrees": 0.1},
        "timeStandard": "UTC day",
    }


def coverage(series_values: pd.Series) -> dict[str, Any]:
    """Honesty fields: how much of the requested window the archive actually delivered."""
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
