"""Mann-Kendall / Theil-Sen / two-era helpers on synthetic series. No network."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pytest
from scipy import stats

from src.compute import trends


def annual_series(start_year: int, values: list[float]) -> pd.Series:
    return pd.Series(values, index=list(range(start_year, start_year + len(values))), dtype="float64")


def test_mann_kendall_detects_a_clean_increase() -> None:
    result = trends.mann_kendall(list(range(20)))
    assert result["S"] == 190  # n(n-1)/2 with no ties
    assert result["tau"] == pytest.approx(1.0)
    assert result["trend"] == "increasing"
    assert result["pValue"] < 1e-6


def test_mann_kendall_detects_a_clean_decrease() -> None:
    result = trends.mann_kendall(list(range(20, 0, -1)))
    assert result["S"] == -190
    assert result["trend"] == "decreasing"
    assert result["tau"] == pytest.approx(-1.0)


def test_mann_kendall_is_insignificant_on_scatter_with_no_drift() -> None:
    rng = np.random.default_rng(7)
    values = list(rng.normal(1000, 120, 30))
    result = trends.mann_kendall(values)
    assert result["pValue"] > 0.05
    assert result["trend"] in {"no trend", "increasing", "decreasing"}  # the point is the p-value


def test_mann_kendall_tie_correction_matches_the_hand_computed_variance() -> None:
    values = [1.0, 1.0, 2.0, 2.0, 2.0, 3.0]  # tied groups of size 2 and 3
    n = len(values)
    # Var(S) = [n(n-1)(2n+5) - sum t(t-1)(2t+5)] / 18 over tied groups of size t.
    expected_var = (n * (n - 1) * (2 * n + 5) - (2 * 1 * 9 + 3 * 2 * 11)) / 18.0
    result = trends.mann_kendall(values)
    assert result["varS"] == pytest.approx(expected_var)
    # Verified against an exact enumeration: the 60 distinct arrangements of this series have
    # Var(S) = 23.6667, which the (2t+5) correction reproduces and the uncorrected value does not.
    assert result["varS"] == pytest.approx(23.6667, abs=1e-3)
    assert result["varS"] < n * (n - 1) * (2 * n + 5) / 18.0


def test_mann_kendall_tau_and_p_agree_with_scipy_within_the_continuity_correction() -> None:
    values = [1200.0, 1350.0, 1180.0, 1400.0, 1290.0, 1500.0, 1310.0, 1600.0, 1420.0, 1700.0]
    result = trends.mann_kendall(values)
    tau, p = stats.kendalltau(values, list(range(len(values))))
    assert result["tau"] == pytest.approx(float(tau), abs=1e-9)
    assert result["pValue"] == pytest.approx(float(p), abs=0.02)  # we apply the continuity correction


def test_mann_kendall_needs_at_least_three_points() -> None:
    result = trends.mann_kendall([1.0, 2.0])
    assert math.isnan(result["pValue"])
    assert result["trend"] == "insufficient data"


def test_theil_sen_slope_of_an_exact_line() -> None:
    result = trends.theil_sen([1, 3, 5, 7, 9], x=[1, 2, 3, 4, 5])
    assert result["slope"] == pytest.approx(2.0)
    assert result["intercept"] == pytest.approx(-1.0)


def test_theil_sen_ignores_a_single_outlier_year() -> None:
    clean = [10.0, 20.0, 30.0, 40.0, 50.0]
    # The outlier sits at the last year, i.e. where it has maximum leverage.
    with_outlier = [10.0, 20.0, 30.0, 40.0, 900.0]
    assert trends.theil_sen(clean)["slope"] == pytest.approx(10.0)
    assert trends.theil_sen(with_outlier)["slope"] == pytest.approx(10.0)
    # an OLS fit on the same data is dragged to 180; that is why the pack quotes Theil-Sen
    assert np.polyfit([1, 2, 3, 4, 5], with_outlier, 1)[0] == pytest.approx(180.0)


def test_trend_report_percent_per_decade_is_scaled_by_the_mean() -> None:
    series = annual_series(2000, [1000.0 + 10.0 * i for i in range(26)])  # +10 mm/yr on a ~1125 mm mean
    report = trends.trend_report(series, percent_of_mean=True)
    assert report["slopePerDecade"] == pytest.approx(100.0)
    assert report["pctPerDecade"] == pytest.approx(100.0 / float(np.mean(series.to_numpy())) * 100, abs=0.5)
    assert report["trend"] == "increasing"
    assert report["n"] == 26


def test_two_era_delta_sign_and_p_value() -> None:
    series = annual_series(2001, [40.0, 45.0, 38.0, 50.0, 42.0, 47.0, 39.0, 51.0, 44.0, 46.0, 41.0, 49.0, 70.0, 75.0, 68.0, 80.0, 72.0, 77.0, 69.0, 81.0, 74.0, 76.0, 71.0, 79.0, 73.0])
    result = trends.two_era(series)
    assert result["eraA"]["n"] == 12
    assert result["eraB"]["n"] == 13
    assert result["delta"] > 0
    assert result["pValue"] < 0.001
    assert result["eraB"]["median"] - result["eraA"]["median"] == pytest.approx(result["delta"])


def test_two_era_handles_a_negative_shift() -> None:
    series = annual_series(2001, [25.4] * 12 + [24.4] * 13)
    result = trends.two_era(series)
    assert result["delta"] == pytest.approx(-1.0)


def test_annual_indicator_drops_incomplete_years() -> None:
    days = pd.date_range("2019-01-01", "2021-09-30", freq="D")
    rain = pd.Series(2.0, index=days, name="PRECTOTCORR")
    annual = trends.annual_rainfall_mm(rain)
    assert list(annual.index) == [2019, 2020]
    assert annual.loc[2019] == pytest.approx(365 * 2.0)
    assert annual.loc[2020] == pytest.approx(366 * 2.0)


def test_annual_indicator_drops_years_with_missing_days() -> None:
    days = pd.date_range("2019-01-01", "2021-12-31", freq="D")
    rain = pd.Series(2.0, index=days, name="PRECTOTCORR")
    rain.loc[rain.index.year == 2020] = np.nan  # a whole year of no data
    annual = trends.annual_rainfall_mm(rain)
    assert list(annual.index) == [2019, 2021]


def test_heat_days_counts_strictly_above_the_threshold() -> None:
    days = pd.date_range("2020-01-01", "2020-12-31", freq="D")
    values = np.full(days.size, 30.0)
    values[:10] = 35.0  # exactly at the threshold: not a heat day
    values[10:25] = 35.01  # above: 15 heat days
    result = trends.heat_days_per_year(pd.Series(values, index=days, name="T2M_MAX"))
    assert int(result.loc[2020]) == 15


def test_monthly_climatology_returns_all_twelve_months() -> None:
    days = pd.date_range("2019-01-01", "2021-12-31", freq="D")
    wetness = pd.Series(days.month.to_numpy(dtype=float) / 12.0, index=days, name="GWETROOT")
    climatology = trends.monthly_climatology(wetness)
    assert list(climatology.index) == list(range(1, 13))
    assert climatology.loc[1] == pytest.approx(1 / 12)
    assert climatology.loc[12] == pytest.approx(1.0)


def test_recent_series_drops_the_partial_final_month() -> None:
    days = pd.date_range("2025-01-01", "2026-09-27", freq="D")
    rain = pd.Series(1.0, index=days, name="PRECTOTCORR")
    result = trends.recent_series(rain, months=12, years=10)
    assert result["monthlyRainfall"]["label"][-1] == "2026-08"  # September is incomplete
    assert len(result["monthlyRainfall"]["values"]) == 12
    assert result["annualRainfall"]["label"][-1] == "2025"


def test_complete_year_list_excludes_a_truncated_year() -> None:
    days = pd.date_range("2024-01-01", "2026-09-27", freq="D")
    series = pd.Series(1.0, index=days, name="PRECTOTCORR")
    assert trends.complete_year_list(series) == [2024, 2025]


# ---- Pettitt change-point test (POWER precip is not homogeneous over 1981-2025) ------


def _labelled(start_year: int, values: list[float]) -> pd.Series:
    return pd.Series(values, index=list(range(start_year, start_year + len(values))), dtype="float64")


def test_pettitt_finds_a_clean_step_and_its_year() -> None:
    values = [900.0] * 12 + [1900.0] * 13  # the regime change begins in year 2013
    result = trends.pettitt(_labelled(2001, values))
    assert result["changeYear"] == 2013
    assert result["breakpointLastYear"] == 2012
    assert result["significant"] is True
    assert result["pValue"] < 0.001
    assert result["pValueText"].startswith("p =")
    assert result["beforeMean"] == pytest.approx(900.0)
    assert result["afterMean"] == pytest.approx(1900.0)
    assert result["step"] == pytest.approx(1000.0)
    assert result["direction"] == "increase"


def test_pettitt_p_value_matches_the_published_asymptotic_formula() -> None:
    series = _labelled(2001, [1000.0] * 10 + [1500.0] * 10)
    result = trends.pettitt(series)
    n, k = 20, result["K"]
    expected = 2 * math.exp((-6 * k**2) / (n**3 + n**2 + n))
    assert result["pValue"] == pytest.approx(expected)


def test_pettitt_returns_no_step_for_a_flat_noisy_series() -> None:
    rng = np.random.default_rng(11)
    series = _labelled(2001, list(rng.normal(1500, 120, 25)))
    result = trends.pettitt(series)
    assert result["significant"] is False
    assert result["pValue"] > 0.05


def test_pettitt_refuses_a_series_too_short_for_the_asymptote() -> None:
    result = trends.pettitt(_labelled(2001, [1.0, 2.0, 30.0, 4.0, 5.0]))
    assert result["n"] == 5
    assert result["changeYear"] is None
    assert "too short" in result["note"]


def test_pettitt_needs_a_year_indexed_series() -> None:
    with pytest.raises(TypeError, match="Series"):
        trends.pettitt([1.0, 2.0, 3.0])


def test_homogeneity_report_flags_a_step_inside_the_analysis_window() -> None:
    # 1981-1996 dry regime, 1997-2015 mid, 2016+ wet: the POWER pattern found in the review.
    values = [700.0, 750.0, 800.0, 850.0, 900.0] * 4  # 1981-2000
    values += [1600.0] * 15 + [2800.0] * 10  # 2001-2015, 2016-2025
    series = _labelled(1981, values)
    report = trends.homogeneity_report(series)
    assert report["homogeneous"] is False
    assert report["affectsEraComparison"] is True
    assert report["changePointInsideAnalysisWindow"] == 2016
    assert report["changePointLocation"] == "inside era B"
    assert 2001 in report["changePoints"]  # the 1997-2015 regime change in the full record
    assert "partly the product" in report["implication"]


def test_homogeneity_report_passes_a_homogeneous_series() -> None:
    rng = np.random.default_rng(3)
    series = _labelled(1981, list(rng.normal(1600, 150, 45)))
    report = trends.homogeneity_report(series)
    assert report["homogeneous"] is True
    assert report["changePointInsideAnalysisWindow"] is None
    assert report["affectsEraComparison"] is False
    assert "No significant step" in report["implication"]


def test_annual_indicator_can_average_as_well_as_sum() -> None:
    days = pd.date_range("2020-01-01", "2021-12-31", freq="D")
    values = np.full(days.size, 30.0)
    values[days.month == 7] = 40.0
    result = trends.annual_indicator(pd.Series(values, index=days, name="T2M_MAX"), "mean")
    assert list(result.index) == [2020, 2021]
    assert result.loc[2020] == pytest.approx(30.0 + 10.0 * 31 / 366)
