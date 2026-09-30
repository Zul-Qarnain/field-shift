"""Variant construction: which rainfall source feeds labels and features, and which points may train."""

import numpy as np
import pandas as pd
import pytest

from src.compute.ml import dataset as D
from src.compute.ml import features as F

YEARS = list(range(1995, 2012))
POINTS = [
    D.Point("dha", "Dhaka", 23.8103, 90.4125, "district"),
    D.Point("rangpur", "Rangpur", 25.6486, 89.3517, "district"),
    D.Point("farm-21", "Farm-21 (Rangpur)", 25.6486, 89.3517, "farm", "rangpur"),
]


def daily(onset_doy: int, seed: int, scale: float = 1.0) -> pd.Series:
    """A complete calendar year of rainfall with a monsoon that starts at `onset_doy`."""
    rng = np.random.default_rng(seed)
    index = pd.date_range("1995-01-01", "2012-12-31", freq="D")
    values = np.abs(rng.normal(0.4, 0.4, len(index))) * scale
    monsoon = (index.dayofyear >= onset_doy) & (index.dayofyear <= onset_doy + 120)
    values[monsoon] += 9.0
    return pd.Series(values, index=index, name="precip", dtype="float64")


def frames() -> tuple[dict[str, pd.DataFrame], dict[str, pd.Series]]:
    """POWER frames whose rain is twice the CHIRPS rain, so the source is identifiable."""
    power: dict[str, pd.DataFrame] = {}
    chirps: dict[str, pd.Series] = {}
    for position, point in enumerate(POINTS):
        onset = 150 + 8 * position
        rain = daily(onset, seed=position)
        calendar = pd.DatetimeIndex(pd.date_range("1995-01-01", "2012-12-31", freq="D"))
        frame = pd.DataFrame(index=calendar)
        frame[F.RAIN] = rain.to_numpy() * 2.0
        frame["T2M"] = 28.0 + calendar.month * 0.2
        frame["T2M_MAX"] = 34.0
        frame["RH2M"] = 70.0
        frame[F.SOIL] = 0.4
        power[point.key] = frame
        # A farm reads the same grid cell as its district here, so give it its own series
        # only for the districts; the farm's CHIRPS entry is its own nearest cell.
        chirps[point.key] = rain
    return power, chirps


def test_chirps_arm_uses_chirps_rain_and_power_weather():
    power, chirps = frames()
    variant = D.build_variant("chirps", POINTS, power, chirps, outlook_year=2013)
    scalars = variant.scalars["dha"]
    window = F.window_bounds(2000)
    assert scalars.loc[2000, "rain"] == pytest.approx(float(chirps["dha"].loc[window[0] : window[1]].sum()))
    assert scalars.loc[2000, "t2m"] == pytest.approx(float(power["dha"].loc[window[0] : window[1], "T2M"].mean()))
    assert variant.source == D.SOURCE_NAMES["chirps"]


def test_power_arm_uses_power_rain_and_starts_only_after_the_inhomogeneity():
    power, chirps = frames()
    variant = D.build_variant("power", POINTS, power, chirps, outlook_year=2013)
    scalars = variant.scalars["dha"]
    lo, hi = F.window_bounds(2005)
    assert scalars.loc[2005, "rain"] == pytest.approx(float(power["dha"].loc[lo:hi, F.RAIN].sum()))
    assert min(variant.years) >= D.POWER_FIRST_YEAR, "POWER PRECTOTCORR before 2001 is not comparable"
    assert max(variant.years) < 2013, "the outlook year is predicted, never labelled here"
    # The CHIRPS arm is not year-restricted: its rainfall does not jump between segments.
    chirps_arm = D.build_variant("chirps", POINTS, power, chirps, outlook_year=2013)
    assert min(chirps_arm.years) < D.POWER_FIRST_YEAR
    assert 2000 in chirps_arm.scalars["dha"].index and 2000 not in scalars.index


def test_a_farm_borrows_its_district_labels_but_never_trains():
    power, chirps = frames()
    variant = D.build_variant("chirps", POINTS, power, chirps, outlook_year=2013)
    assert "farm-21" not in variant.trainable
    assert {"dha", "rangpur"} == variant.trainable
    pd.testing.assert_series_equal(variant.labels["farm-21"], variant.labels["rangpur"])
    # Its own window is still its own, so a farm off-centre gets its own rainfall.
    assert variant.scalars["farm-21"].index.equals(variant.scalars["rangpur"].index)


def test_year_pool_requires_half_the_districts():
    power, chirps = frames()
    variant = D.build_variant("chirps", POINTS, power, chirps, outlook_year=2013)
    pool = D.year_pool(variant)
    assert pool and set(pool) <= set(variant.years)
    # A year only one of two districts reaches is dropped: one row is not a backtest.
    thin = D.Variant(
        name="chirps",
        points=variant.points,
        scalars=variant.scalars,
        labels={"dha": pd.Series({2000: 150.0, 2001: 151.0}, dtype="float64"), "rangpur": pd.Series({2000: 140.0}, dtype="float64")},
        years=[2000, 2001],
        trainable={"dha", "rangpur"},
    )
    assert D.year_pool(thin) == [2000]


def test_unknown_variant_is_refused():
    power, chirps = frames()
    with pytest.raises(ValueError, match="unknown variant"):
        D.build_variant("era5", POINTS, power, chirps, outlook_year=2013)


def test_district_point_defaults_its_baseline_to_itself():
    point = D.Point("kushtia", " Kushtia", 23.9, 89.1, "district")
    assert point.clim_key == "kushtia"
    assert point.district().slug == "kushtia"
    farm = D.Point("farm-12", "Farm-12", 24.25, 89.9, "farm", "tangail")
    assert farm.clim_key == "tangail"
