"""Niño 3.4 / DMI from MERRA-2 skin temperature — box means, land mask and anomalies. No network."""

import numpy as np
import pandas as pd
import pytest
import xarray as xr

from src.acquire import indices


class FakeStore:
    """Stands in for power_zarr.ZarrStore: a 2×3 grid, one land cell, a known SST field."""

    url = "https://example.invalid/merra2_monthly"
    retrieved_utc = "2026-10-15T00:00:00+00:00"

    def __init__(self, times: pd.DatetimeIndex, field: np.ndarray):
        self.times = times
        self.field = field  # (time, lat, lon)
        self.lat = np.array([-0.25, 0.25])
        self.lon = np.array([10.0, 10.625, 11.25])

    def box(self, var, lat_range, lon_range, start, end):
        if var == indices.MASK:
            mask = np.full((1, 2, 3), np.nan)
            mask[0, 1, 2] = 0.7  # a land cell: the land model defines GWETROOT there
            return xr.DataArray(mask, dims=("time", "lat", "lon"), coords={"time": self.times[:1], "lat": self.lat, "lon": self.lon})
        return xr.DataArray(self.field, dims=("time", "lat", "lon"), coords={"time": self.times, "lat": self.lat, "lon": self.lon})


BOX = {"lat": (-1.0, 1.0), "lon": (9.0, 12.0)}


def _store(months: int = 24, land_value: float = 99.0) -> FakeStore:
    times = pd.date_range("1991-01-31", periods=months, freq="ME")
    field = np.full((months, 2, 3), 27.0)
    field[:, 1, 2] = land_value
    return FakeStore(times, field)


def test_land_cells_never_enter_the_box_mean():
    means = indices.box_mean(_store(), BOX)
    assert np.allclose(means.to_numpy(), 27.0), "the 99 °C land cell must be masked out"


def test_box_mean_is_indexed_by_month_start():
    means = indices.box_mean(_store(), BOX)
    assert means.index[0] == pd.Timestamp("1991-01-01")


def test_a_month_with_a_missing_ocean_cell_is_nan():
    store = _store()
    store.field[5, 0, 0] = np.nan
    means = indices.box_mean(store, BOX)
    assert np.isnan(means.iloc[5]) and np.isfinite(means.iloc[4])


def test_anomalies_remove_the_calendar_month_mean_of_the_base():
    index = pd.date_range("1991-01-01", "2020-12-01", freq="MS")
    seasonal = pd.Series(25.0 + 2.0 * np.sin(2 * np.pi * index.month / 12), index=index)
    seasonal.loc["2010-01-01"] += 1.5
    anomaly = indices.anomalies(seasonal)
    assert anomaly.loc["2010-01-01"] == pytest.approx(1.5 - 1.5 / 30)
    assert abs(anomaly.loc["2011-07-01"]) < 0.1


def test_anomalies_need_every_calendar_month_in_the_base():
    short = pd.Series([1.0, 2.0], index=pd.to_datetime(["1995-01-01", "1995-02-01"]))
    with pytest.raises(ValueError, match="twelve months"):
        indices.anomalies(short)


def test_running_mean_is_centred_and_needs_all_three_months():
    values = pd.Series([1.0, 2.0, 3.0, np.nan, 5.0], index=pd.date_range("2000-01-01", periods=5, freq="MS"))
    smooth = indices.running3(values)
    assert np.isnan(smooth.iloc[0])
    assert smooth.iloc[1] == pytest.approx(2.0)  # Feb = mean(Jan, Feb, Mar): "JFM" centred on Feb
    assert np.isnan(smooth.iloc[2]) and np.isnan(smooth.iloc[3])


def test_boxes_follow_the_published_definitions():
    assert indices.NINO34_BOX == {"lat": (-5.0, 5.0), "lon": (-170.0, -120.0)}
    assert indices.DMI_WEST == {"lat": (-10.0, 10.0), "lon": (50.0, 70.0)}
    assert indices.DMI_EAST == {"lat": (-10.0, 0.0), "lon": (90.0, 110.0)}
    assert indices.BASE == (1991, 2020)
