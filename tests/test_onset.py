"""Onset v2 (local-relative 5-day accumulation) on synthetic series, plus the rejected v1 for
comparison, censoring accounting and the era test. No network, no real data files."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest

from src.compute import onset


def year_rain(year: int, spec: list[tuple[int, int, float]], fill: float = 0.0) -> pd.Series:
    """Daily rainfall for one calendar year from (start_doy, end_doy, mm_per_day) blocks."""
    days = pd.date_range(f"{year:04d}-01-01", f"{year:04d}-12-31", freq="D")
    values = np.full(len(days), fill)
    for start, stop, amount in spec:
        values[start - 1 : stop] = amount
    return pd.Series(values, index=days, name="precip")


def span_rain(years: range, mm_per_day: float) -> pd.Series:
    """Multi-year flat series so local_threshold has a reference period to calibrate on."""
    return pd.concat([year_rain(year, [(1, 366, mm_per_day)]) for year in years])


# ---- the local threshold -------------------------------------------------------------


def test_local_threshold_is_the_mean_five_day_jjas_accumulation() -> None:
    series = span_rain(range(2001, 2026), 2.0)  # 2 mm/day everywhere, every month
    assert onset.local_threshold(series) == pytest.approx(10.0)  # 5 days x 2 mm


def test_local_threshold_ignores_months_outside_june_to_september() -> None:
    days = pd.date_range("2001-01-01", "2025-12-31", freq="D")
    values = np.where(days.month.isin([6, 7, 8, 9]), 4.0, 0.0)
    series = pd.Series(values, index=days, name="precip")
    threshold = onset.local_threshold(series)
    # every Jun–Sep window is worth 20 mm except the four that spill into October; the
    # zero-valued months must not drag the mean down toward 5 mm
    assert 19.0 < threshold <= 20.0


def test_local_threshold_ignores_years_outside_the_reference_period() -> None:
    days = pd.date_range("1985-01-01", "2025-12-31", freq="D")
    values = np.where(days.year >= onset.REFERENCE_PERIOD[0], 2.0, 50.0)
    series = pd.Series(values, index=days, name="precip")
    assert onset.local_threshold(series) == pytest.approx(10.0)


def test_local_threshold_is_nan_without_reference_data() -> None:
    series = year_rain(1990, [(1, 365, 3.0)])
    assert math.isnan(onset.local_threshold(series))


def test_threshold_is_point_relative_not_a_national_constant() -> None:
    dry = span_rain(range(2001, 2026), 2.0)  # -> 10 mm
    wet = span_rain(range(2001, 2026), 12.0)  # -> 60 mm
    assert onset.local_threshold(dry) == pytest.approx(10.0)
    assert onset.local_threshold(wet) == pytest.approx(60.0)


# ---- the three conditions ------------------------------------------------------------


def test_first_wet_day_that_reaches_the_local_threshold_is_the_onset() -> None:
    # threshold 20 mm; rain starts DOY 160 at 5 mm/day. DOY 156-159 windows reach 20 mm only
    # by including days that are themselves dry, and condition (a) rejects those.
    rain = year_rain(2010, [(160, 240, 5.0)])
    assert onset.onset_for_year(rain, 2010, threshold_mm=20.0) == 160


def test_candidate_day_must_itself_be_a_wet_day() -> None:
    rain = year_rain(2010, [(161, 240, 5.0)])
    # the window from DOY 160 holds 20 mm, but day 160 is dry -> onset is 161
    assert onset.onset_for_year(rain, 2010, threshold_mm=20.0) == 161


def test_a_single_deluge_is_not_an_onset() -> None:
    # 30 mm on one day clears the 5-day threshold, but the following 30 days contain a
    # 10-day period under 5 mm, which is a real monsoon break -> rejected.
    rain = year_rain(2010, [(160, 160, 30.0)])
    assert math.isnan(onset.onset_for_year(rain, 2010, threshold_mm=20.0))


def test_a_break_of_eight_days_under_the_minimum_rejects_the_candidate() -> None:
    rain = year_rain(2010, [(160, 175, 5.0), (176, 195, 0.2), (196, 250, 5.0)])
    # 10 days at 0.2 mm = 2 mm total < 5 mm -> the 160 candidate dies; the series resumes and
    # a later clean candidate wins.
    assert onset.onset_for_year(rain, 2010, threshold_mm=20.0) > 195


def test_no_onset_before_the_window_and_the_floor_is_reportable() -> None:
    wet_early = year_rain(2010, [(100, 240, 5.0)])
    assert onset.onset_for_year(wet_early, 2010, threshold_mm=20.0) == onset.WINDOW_START_DOY
    assert onset.onset_for_year(wet_early, 2010, threshold_mm=20.0, window_start_doy=100) == 100


def test_no_onset_after_the_window() -> None:
    late = year_rain(2010, [(280, 320, 5.0)])
    assert math.isnan(onset.onset_for_year(late, 2010, threshold_mm=20.0))


def test_dry_year_returns_nan_and_a_missing_threshold_returns_nan() -> None:
    dry = year_rain(2010, [(1, 365, 0.0)])
    assert math.isnan(onset.onset_for_year(dry, 2010, threshold_mm=20.0))
    assert math.isnan(onset.onset_for_year(dry, 2010, threshold_mm=math.nan))


def test_leap_year_day_of_year_is_honest() -> None:
    rain = year_rain(2020, [(162, 240, 5.0)])  # DOY 162 = 10 June 2020 in a leap year
    assert onset.onset_for_year(rain, 2020, threshold_mm=20.0) == 162
    same_doy = year_rain(2019, [(162, 240, 5.0)])  # DOY 162 = 11 June 2019
    assert onset.onset_for_year(same_doy, 2019, threshold_mm=20.0) == 162


# ---- missing data --------------------------------------------------------------------


def test_a_gap_delays_detection_instead_of_inventing_an_onset() -> None:
    rain = year_rain(2010, [(160, 240, 5.0)])
    broken = rain.copy()
    broken.iloc[162] = np.nan  # DOY 163
    assert onset.onset_for_year(broken, 2010, threshold_mm=20.0) == 164
    assert onset.onset_for_year(rain, 2010, threshold_mm=20.0) == 160


def test_poorly_covered_year_is_nan_rather_than_a_guess() -> None:
    rain = year_rain(2010, [(121, 340, 5.0)])
    for offset in range(14):
        rain.iloc[130 + offset] = np.nan
    assert math.isnan(onset.onset_for_year(rain, 2010, threshold_mm=20.0))


# ---- series, censoring, eras ---------------------------------------------------------


def test_onset_series_covers_complete_years_only() -> None:
    days = pd.date_range("2019-01-01", "2021-09-30", freq="D")
    values = np.full(days.size, 5.0)
    series = pd.Series(values, index=days, name="precip")
    result = onset.onset_series(series, threshold_mm=20.0)
    assert list(result.index) == [2019, 2020]


def test_censoring_counts_onsets_stuck_on_the_window_floor() -> None:
    onsets = pd.Series({2001: 121.0, 2002: 121.0, 2003: 150.0, 2004: 163.0}, dtype="float64")
    result = onset.censoring(onsets)
    assert result == {"count": 2, "of": 4, "sharePct": 50.0}


def test_censoring_of_an_empty_series_is_reported_not_zero_divided() -> None:
    assert onset.censoring(pd.Series(dtype="float64")) == {"count": 0, "of": 0, "sharePct": None}


def test_compare_eras_sign_and_test() -> None:
    onsets = pd.Series(
        {year: float(150 + (i % 3)) for i, year in enumerate(range(2001, 2013))}
        | {year: float(168 + (i % 3)) for i, year in enumerate(range(2013, 2026))},
        dtype="float64",
    )
    result = onset.compare_eras(onsets)
    assert (result["eraA"]["n"], result["eraB"]["n"]) == (12, 13)
    assert result["shiftDays"] > 0
    assert result["direction"] == "later"
    assert result["pValue"] < 0.001
    assert result["medianB"] - result["medianA"] == result["shiftDays"]


def test_compare_eras_earlier_direction() -> None:
    onsets = pd.Series({y: 170.0 for y in range(2001, 2013)} | {y: 155.0 for y in range(2013, 2026)}, dtype="float64")
    result = onset.compare_eras(onsets)
    assert result["shiftDays"] == -15
    assert result["direction"] == "earlier"


def test_compare_eras_is_nan_when_an_era_is_empty() -> None:
    result = onset.compare_eras(pd.Series({y: 150.0 for y in range(1990, 2000)}, dtype="float64"))
    assert result["eraB"]["n"] == 0
    assert math.isnan(result["shiftDays"])
    assert math.isnan(result["pValue"])


def test_split_eras_requires_a_series() -> None:
    with pytest.raises(TypeError, match="Series"):
        onset.split_eras([150.0, 155.0])


# ---- the rejected v1, kept only to document its censoring ----------------------------


def test_v2_finds_the_monsoon_where_v1_only_reports_its_window_floor() -> None:
    # A weak pre-monsoon trickle (3 mm/day, DOY 140–160) already clears the v1 rule's fixed
    # 20 mm/7-day bar, so v1 answers 145 — its floor, not an onset. v2's threshold is this
    # point's own monsoon normal (40 mm here), which the trickle cannot reach, so it reports
    # the day the real rain starts.
    rain = year_rain(2010, [(140, 160, 3.0), (161, 250, 12.0)])
    assert onset.onset_for_year(rain, 2010, rule="v1") == onset.V1_WINDOW_START_DOY
    # 159 is a wet day whose 5-day window (3+3+12+12+12 = 42 mm) clears the 40 mm local
    # threshold, so v2 lands two days before the monsoon proper rather than at its floor.
    assert onset.onset_for_year(rain, 2010, rule="v2", threshold_mm=40.0) == 159


def test_v2_can_also_censor_and_that_is_counted_not_hidden() -> None:
    rain = year_rain(2010, [(100, 250, 12.0)])  # already above threshold on the first searchable day
    assert onset.onset_for_year(rain, 2010, rule="v2", threshold_mm=40.0) == onset.WINDOW_START_DOY
    series = pd.Series({2010: onset.WINDOW_START_DOY, 2011: 150.0}, dtype="float64")
    assert onset.censoring(series) == {"count": 1, "of": 2, "sharePct": 50.0}


def test_v1_rejects_a_short_shower_and_picks_up_the_real_onset() -> None:
    rain = year_rain(2010, [(160, 166, 4.0), (167, 200, 0.0), (201, 250, 4.0)])
    # the 160-166 burst is followed by 34 dry days, so v1 must reject it and answer only once
    # the resumed rain fills a 7-day window (which it can do from day 199, straddling the break)
    assert onset.onset_for_year(rain, 2010, rule="v1") >= 197


def test_unknown_rule_is_rejected() -> None:
    with pytest.raises(ValueError, match="unknown onset rule"):
        onset.onset_for_year(year_rain(2010, [(160, 200, 5.0)]), 2010, rule="v3")
