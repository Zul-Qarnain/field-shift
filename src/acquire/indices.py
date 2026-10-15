"""Niño 3.4 and Indian Ocean Dipole indices computed from NASA MERRA-2 — no NOAA files.

The forecast's two large-scale predictors used to be NOAA PSL's ONI (ERSSTv5) and DMI
(HadISST1.1). Both are now computed here from NASA data only: MERRA-2 (NASA GMAO) monthly
surface skin temperature ``TS`` as published in NASA POWER's monthly Zarr store on AWS Open
Data (`src.acquire.power_zarr`, store ``merra2_monthly``). Over open water MERRA-2's skin
temperature is its sea-surface temperature (the reanalysis prescribes SST from its ocean
boundary-condition analysis), so the box means below are SST indices in the usual sense.

* **Niño 3.4** — area-weighted (cos φ) mean over 5°S–5°N, 170°W–120°W; anomaly against the
  1991–2020 calendar-month climatology (the current WMO normal, as NOAA's ONI uses); the
  3-month running mean centred on each month gives the ONI-equivalent ``nino34`` series, so
  January == DJF and March == FMA, exactly as the old ONI file was indexed.
* **DMI** — Saji et al. (1999): west box 10°S–10°N, 50°E–70°E minus east box 10°S–0°, 90°E–110°E,
  each an anomaly against the same 1991–2020 base, in °C (monthly, not smoothed).

Ocean cells are chosen with MERRA-2 itself: the land model's root-zone wetness ``GWETROOT`` is
undefined (NaN) over ocean, so a cell enters a box only if GWETROOT is NaN there. That keeps
Sumatra out of the eastern IOD box and the Horn of Africa out of the western one without a
non-NASA coastline file.

The anomaly base is fixed (1991–2020) and therefore spans backtest years, as every published
ONI does; it is one constant per calendar month shared by all years, so it cannot tell the
model anything about an individual held-out year.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from src.acquire import power_zarr

STORE = "merra2_monthly"
SST = "TS"
MASK = "GWETROOT"
BASE = (1991, 2020)
FIRST = "1981-01-01"

NINO34_BOX = {"lat": (-5.0, 5.0), "lon": (-170.0, -120.0)}
DMI_WEST = {"lat": (-10.0, 10.0), "lon": (50.0, 70.0)}
DMI_EAST = {"lat": (-10.0, 0.0), "lon": (90.0, 110.0)}

SOURCE = "NASA MERRA-2 monthly skin temperature (TS) over ocean, via NASA POWER v10 Zarr on AWS"
NINO34_TEXT = "Niño 3.4 (5°S–5°N, 170°W–120°W), 3-month running mean of anomalies vs 1991–2020"
DMI_TEXT = "Dipole Mode Index (Saji et al. 1999): 50–70°E,10°S–10°N minus 90–110°E,10°S–0°, anomalies vs 1991–2020"


def _end() -> str:
    return pd.Timestamp.now(tz="UTC").strftime("%Y-%m-%d")


def box_mean(store: power_zarr.ZarrStore, box: dict[str, tuple[float, float]], start: str = FIRST, end: str | None = None) -> pd.Series:
    """Area-weighted monthly mean of SST over the ocean cells of `box`."""
    sst = store.box(SST, box["lat"], box["lon"], start, end or _end())
    mask_field = store.box(MASK, box["lat"], box["lon"], "2000-01-01", "2000-12-31")
    ocean = np.isnan(mask_field.values).all(axis=0)
    if not ocean.any():
        raise ValueError(f"box {box} holds no ocean cell")
    weights = np.cos(np.deg2rad(sst["lat"].values))[:, None] * ocean
    values = sst.values
    valid = np.isfinite(values) & (weights[None, :, :] > 0)
    numerator = np.where(valid, values * weights[None, :, :], 0.0).sum(axis=(1, 2))
    denominator = np.where(valid, weights[None, :, :], 0.0).sum(axis=(1, 2))
    # A month counts only when every ocean cell is present, so a half-written month is NaN.
    complete = valid.sum(axis=(1, 2)) == int(ocean.sum())
    means = np.where(complete & (denominator > 0), numerator / np.where(denominator > 0, denominator, 1), np.nan)
    index = pd.DatetimeIndex(sst["time"].values).to_period("M").to_timestamp()
    return pd.Series(means, index=index, name="sst").sort_index()


def anomalies(monthly: pd.Series, base: tuple[int, int] = BASE) -> pd.Series:
    """Monthly anomaly against the calendar-month mean over the `base` years."""
    in_base = monthly[(monthly.index.year >= base[0]) & (monthly.index.year <= base[1])]
    climatology = in_base.groupby(in_base.index.month).mean()
    if climatology.size != 12:
        raise ValueError(f"base {base} does not cover all twelve months")
    return monthly - climatology.reindex(monthly.index.month).to_numpy()


def running3(anomaly: pd.Series) -> pd.Series:
    """3-month running mean labelled by its centre month; NaN unless all three months exist."""
    return anomaly.rolling(3, center=True, min_periods=3).mean()


def _frame(values: pd.Series, name: str, store: power_zarr.ZarrStore, text: str) -> pd.DataFrame:
    frame = values.rename(name).to_frame()
    frame.index.name = "date"
    frame.attrs.update({"retrieved_utc": store.retrieved_utc, "source": SOURCE, "source_url": store.url, "definition": text})
    return frame


def nino34(store: power_zarr.ZarrStore | None = None, end: str | None = None) -> pd.DataFrame:
    """ONI-equivalent Niño 3.4 series from MERRA-2, indexed by centre month."""
    store = store or power_zarr.ZarrStore(STORE)
    return _frame(running3(anomalies(box_mean(store, NINO34_BOX, end=end))), "nino34", store, NINO34_TEXT)


def dmi(store: power_zarr.ZarrStore | None = None, end: str | None = None) -> pd.DataFrame:
    """Monthly Dipole Mode Index (°C) from MERRA-2."""
    store = store or power_zarr.ZarrStore(STORE)
    west = anomalies(box_mean(store, DMI_WEST, end=end))
    east = anomalies(box_mean(store, DMI_EAST, end=end))
    return _frame(west - east, "dmi", store, DMI_TEXT)


def write_csv(frame: pd.DataFrame, path: Path) -> Path:
    """A small, reviewable copy of an index next to the cache (not committed)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, float_format="%.4f")
    return path
