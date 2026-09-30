"""CHIRPS reader against a synthetic netCDF written into tmp_path. Never touches the network
and never depends on the real /workspace/fs-cache files being present."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest
import xarray as xr

from src.acquire import chirps
from src.compute import onset

LAT = np.array([22.0, 24.0, 26.0], dtype="float32")
LON = np.array([88.0, 90.0, 92.0], dtype="float32")


def write_fake_year(directory, year: int, values: np.ndarray, retrieved_utc: str = "2026-01-01T00:00:00+00:00") -> None:
    times = pd.date_range(f"{year}-01-01", f"{year}-12-31", freq="D")
    array = xr.DataArray(
        values.astype("float32"),
        dims=("time", "latitude", "longitude"),
        coords={"time": times, "latitude": LAT, "longitude": LON},
        name="precip",
        attrs={"units": "mm/day"},
    )
    dataset = xr.Dataset({"precip": array})
    dataset.attrs["title"] = "CHIRPS Version 2.0"
    dataset.attrs["version"] = "Version 2.0"
    dataset.attrs["institution"] = "Climate Hazards Group.  University of California at Santa Barbara"
    dataset.attrs["reference"] = "Funk et al., 2015 — Scientific Data 2:150066"
    dataset.attrs["source_url"] = f"https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/netcdf/p25/chirps-v2.0.{year}.days_p25.nc"
    dataset.attrs["retrieved_utc"] = retrieved_utc
    dataset.to_netcdf(directory / f"chirps_bd_{year}.nc")
    dataset.close()


@pytest.fixture
def chirps_dir(tmp_path):
    """Three years, one grid cell deliberately wetter than the rest."""
    for year in (2001, 2002, 2003):
        values = np.zeros((365 if year != 2004 else 366, LAT.size, LON.size))
        values[:, 1, 1] = 3.0  # the (24, 90) cell gets 3 mm every day
        write_fake_year(tmp_path, year, values)
    return tmp_path


def test_available_years_and_missing_files_are_visible(chirps_dir) -> None:
    assert chirps.available_years(chirps_dir) == [2001, 2002, 2003]
    assert chirps.available_years(chirps_dir / "nowhere") == []


def test_series_reads_the_nearest_cell_in_millimetres_per_day(chirps_dir) -> None:
    series = chirps.series(24.2, 89.9, 2001, 2003, chirps_dir=chirps_dir)
    assert series.size == 365 * 3
    assert float(series.iloc[0]) == pytest.approx(3.0)
    assert series.index.name == "date"
    assert math.isnan(float(chirps.series(22.0, 92.0, 2001, 2001, chirps_dir=chirps_dir).iloc[5])) is False


def test_nearest_cell_is_reported_so_the_pack_can_state_its_own_resolution(chirps_dir) -> None:
    assert chirps.cell_of(24.2, 89.9, chirps_dir=chirps_dir) == (24.0, 90.0)
    assert chirps.cell_of(26.5, 91.6, chirps_dir=chirps_dir) == (26.0, 92.0)


def test_missing_and_negative_pixels_become_nan_not_zero(chirps_dir) -> None:
    values = np.zeros((365, LAT.size, LON.size))
    values[:, 1, 1] = 2.0
    values[10, 1, 1] = -999.0  # a fill value must never read as 0 mm of rain
    values[11, 1, 1] = np.nan
    write_fake_year(chirps_dir, 2005, values)
    series = chirps.series(24.0, 90.0, 2005, 2005, chirps_dir=chirps_dir)
    assert math.isnan(float(series.iloc[10]))
    assert math.isnan(float(series.iloc[11]))
    assert float(series.iloc[0]) == pytest.approx(2.0)


def test_series_raises_when_no_files_exist(tmp_path) -> None:
    with pytest.raises(FileNotFoundError):
        chirps.series(24.0, 90.0, 2001, 2003, chirps_dir=tmp_path)


def test_provenance_surfaces_what_the_files_say(chirps_dir) -> None:
    provenance = chirps.provenance(chirps_dir)
    assert provenance["product"] == "CHIRPS Version 2.0"
    assert provenance["sourceUrlSample"].startswith("https://data.chc.ucsb.edu/")
    assert provenance["retrievedUtc"] == "2026-01-01T00:00:00+00:00"
    assert provenance["yearsOnDisk"] == {"first": 2001, "last": 2003, "count": 3}
    assert provenance["grid"]["degrees"] == 2.0  # the fake grid spacing, read from the file
    assert "Climate Hazards" in provenance["provider"]
    assert "Funk" in provenance["reference"]


def test_coverage_counts_days_and_missing_share(chirps_dir) -> None:
    coverage = chirps.coverage(chirps.series(24.0, 90.0, 2001, 2003, chirps_dir=chirps_dir))
    assert coverage["days"] == 365 * 3
    assert coverage["daysWithData"] == 365 * 3
    assert coverage["missingSharePct"] == pytest.approx(0.0)
    assert coverage["first"] == "2001-01-01"


def test_compare_reports_agreement_on_shared_years() -> None:
    a = pd.Series({2001: 100.0, 2002: 200.0, 2003: 300.0})
    b = pd.Series({2001: 110.0, 2002: 210.0, 2003: 310.0, 2004: 400.0})
    result = chirps.compare(a, b, min_years=3)
    assert result["yearsCompared"] == 3
    assert result["bias"] == pytest.approx(-10.0)
    assert result["mae"] == pytest.approx(10.0)
    assert result["pearsonR"] == pytest.approx(1.0)
    assert result["spearmanRho"] == pytest.approx(1.0)


def test_compare_declines_instead_of_inventing_statistics() -> None:
    result = chirps.compare(pd.Series({2001: 1.0}), pd.Series({2001: 2.0}), min_years=8)
    assert result == {"yearsCompared": 1, "pearsonR": None, "spearmanRho": None, "mae": None, "bias": None}


def test_the_v2_rule_runs_on_a_chirps_shaped_series(chirps_dir) -> None:
    series = chirps.series(24.0, 90.0, 2001, 2003, chirps_dir=chirps_dir)
    threshold = onset.local_threshold(series)
    assert threshold == pytest.approx(15.0)  # 5 days x 3 mm
    per_year = onset.onset_series(series, threshold_mm=threshold)
    assert per_year.notna().all()
    assert set(per_year.unique()) == {onset.WINDOW_START_DOY}
