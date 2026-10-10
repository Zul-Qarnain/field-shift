"""Synthetic-data tests for the onset ML pipeline: leakage guards, splitter, status rule.

No POWER download and no real NOAA numbers here — the frames are generated in-process so
the guards are checked deterministically.
"""

import json

import numpy as np
import pandas as pd
import pytest

from src.compute.ml import features as F
from src.compute.ml import onset_ml as M

YEARS = list(range(1985, 2005))
DISTRICTS = [F.District(f"d{i}", f"District {i}", 23.0 + 0.3 * i, 88.5 + 0.35 * i) for i in range(8)]


def synthetic_power(onset_by_year: dict[int, float], lat: float, seed: int) -> pd.DataFrame:
    """Daily POWER-like frame whose pre-monsoon window carries the onset signal.

    Rain total over 1 Mar – 5 May falls as the onset gets later; temperature, humidity
    and soil wetness follow the same pattern. Everything after 5 May is plain noise, so a
    window bug would show up as a changed feature.
    """
    rng = np.random.default_rng(seed)
    stamps = []
    for year in sorted(set(onset_by_year) | {1980, 2026}):
        stamps.extend(pd.date_range(pd.Timestamp(year=year, month=1, day=1), pd.Timestamp(year=year, month=12, day=31), freq="D"))
    index = pd.DatetimeIndex(stamps)
    frame = pd.DataFrame(index=index)
    frame["PRECTOTCORR"] = np.abs(rng.normal(1.5, 1.5, len(index)))
    frame["T2M"] = 28.0 + rng.normal(0, 0.6, len(index)) + (lat - 23.0) * -0.12
    frame["T2M_MAX"] = frame["T2M"] + 5.0 + rng.normal(0, 0.8, len(index))
    frame["RH2M"] = 72.0 + rng.normal(0, 2.0, len(index))
    frame["GWETROOT"] = np.clip(0.35 + rng.normal(0, 0.03, len(index)), 0, 1)

    for year, onset in onset_by_year.items():
        lo, hi = pd.Timestamp(year=year, month=3, day=1), pd.Timestamp(year=year, month=5, day=5)
        days = int((hi - lo).days) + 1
        rain_total = max(0.0, 240.0 - 4.0 * (onset - 170.0) + rng.normal(0, 12.0))
        wet = rng.random(days) < 0.45
        frame.loc[lo:hi, "PRECTOTCORR"] = np.where(wet, rain_total / max(int(wet.sum()), 1), 0.0)
        warm = 0.6 * (onset - 170.0) / 10.0
        frame.loc[lo:hi, "T2M"] = frame.loc[lo:hi, "T2M"] + warm
        frame.loc[lo:hi, "T2M_MAX"] = frame.loc[lo:hi, "T2M_MAX"] + 1.3 * warm
        frame.loc[lo:hi, "RH2M"] = frame.loc[lo:hi, "RH2M"] - 2.0 * warm
        may_lo = pd.Timestamp(year=year, month=5, day=1)
        frame.loc[may_lo:hi, "GWETROOT"] = np.clip(frame.loc[may_lo:hi, "GWETROOT"] - 0.02 * warm, 0, 1)
    return frame


def synthetic_indices(seed: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(seed)
    index = pd.DatetimeIndex(pd.date_range("1980-01-01", "2026-06-01", freq="MS"))
    oni = pd.Series(rng.normal(0, 0.7, len(index)), index=index).rolling(3, center=True).mean().ffill().bfill()
    oni.index = pd.DatetimeIndex([ts.normalize() for ts in oni.index])
    dmi = pd.Series(rng.normal(0, 0.5, len(index)), index=index).ffill().bfill()
    dmi.index = pd.DatetimeIndex([ts.normalize() for ts in dmi.index])
    return oni.to_frame("oni"), dmi.to_frame("dmi")


def synthetic_inputs(seed: int = 7) -> tuple[dict[str, pd.DataFrame], dict[str, pd.Series], pd.DataFrame, pd.DataFrame]:
    """Per-district window scalars and onset labels, sharing one pair of index series."""
    oni, dmi = synthetic_indices(seed)
    rng = np.random.default_rng(seed)
    onsets: dict[str, pd.Series] = {}
    scalars: dict[str, pd.DataFrame] = {}
    for i, district in enumerate(DISTRICTS):
        base = 168.0 + 2.0 * i
        year_onset = {
            year: base - 3.2 * F.oni_centre(oni, year, 1) + 9.0 * F.dmi_mean(dmi, year) + rng.normal(0, 2.5)
            for year in YEARS
        }
        onsets[district.slug] = pd.Series(year_onset, name="onset_doy", dtype="float64").sort_index()
        power = synthetic_power(year_onset, district.lat, seed=seed + i)
        scalars[district.slug] = F.pre_window_scalars(power, YEARS)
    return scalars, onsets, oni, dmi


def synthetic_dataset(seed: int = 7) -> pd.DataFrame:
    scalars, onsets, oni, dmi = synthetic_inputs(seed)
    return M.build_samples(DISTRICTS, scalars, onsets, oni, dmi, YEARS)


def _one_district(seed: int) -> tuple[F.District, pd.Series, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    district = DISTRICTS[0]
    scalars, onsets, oni, dmi = synthetic_inputs(seed)
    return district, onsets[district.slug], oni, dmi, scalars[district.slug]


def test_window_scalars_only_look_at_the_early_season():
    power = synthetic_power({1990: 175.0, 1991: 175.0}, 23.5, seed=1)
    before = F.pre_window_scalars(power, [1990, 1991])
    # Blow up the season after the window: nothing a 25 April forecast reads may notice.
    power.loc[pd.Timestamp("1990-04-21") : pd.Timestamp("1990-12-31"), "PRECTOTCORR"] = 900.0
    power.loc[pd.Timestamp("1990-04-21") : pd.Timestamp("1990-12-31"), "T2M"] = 45.0
    after = F.pre_window_scalars(power, [1990, 1991])
    assert before.loc[1990, "rain"] == pytest.approx(after.loc[1990, "rain"])
    assert before.loc[1990, "t2m"] == pytest.approx(after.loc[1990, "t2m"])
    assert before.loc[1991, "rain"] == pytest.approx(after.loc[1991, "rain"])


def test_soil_wetness_is_read_at_the_end_of_the_window():
    power = synthetic_power({1995: 170.0}, 23.0, seed=12)
    scalars = F.pre_window_scalars(power, [1995])
    lo, hi = F.window_bounds(1995)
    tail = power.loc[hi - pd.Timedelta(days=F.SOIL_END_DAYS - 1) : hi, F.SOIL]
    assert len(tail) == F.SOIL_END_DAYS
    assert scalars.loc[1995, "gwetroot_eow"] == pytest.approx(float(tail.mean()))
    # A CHIRPS rainfall series replaces the POWER column, and only for the same window.
    chirps_rain = power[F.RAIN] * 2.0
    swapped = F.pre_window_scalars(power, [1995], rain=chirps_rain)
    assert swapped.loc[1995, "rain"] == pytest.approx(2.0 * scalars.loc[1995, "rain"])
    assert swapped.loc[1995, "t2m"] == pytest.approx(scalars.loc[1995, "t2m"])
    assert (hi - lo).days + 1 == 51


def test_window_sum_matches_the_stated_dates():
    power = synthetic_power({1995: 170.0}, 23.0, seed=2)
    lo, hi = F.window_bounds(1995)
    assert (lo.month, lo.day, hi.month, hi.day) == (3, 1, 4, 20)
    assert F.pre_window_scalars(power, [1995]).loc[1995, "rain"] == pytest.approx(power.loc[lo:hi, "PRECTOTCORR"].sum())


def test_missing_day_voids_its_own_variable_only():
    power = synthetic_power({1995: 170.0}, 23.0, seed=3)
    power.loc[pd.Timestamp("1995-04-11"), "PRECTOTCORR"] = np.nan
    scalars = F.pre_window_scalars(power, [1995])
    # A hole in the rainfall record must not become a short, silently-low total.
    assert np.isnan(scalars.loc[1995, "rain"])
    # Temperature is measured on its own days, so it survives a rainfall gap.
    assert np.isfinite(scalars.loc[1995, "t2m"])
    power.loc[pd.Timestamp("1995-04-11"), "T2M"] = np.nan
    assert np.isnan(F.pre_window_scalars(power, [1995]).loc[1995, "t2m"])


def test_fold_climatology_ignores_the_held_out_year():
    district, onsets, oni, dmi, scalars = _one_district(4)
    held_out = 1995
    train = [y for y in YEARS if y != held_out]
    clim = F.fold_climatology(scalars, held_out, train)

    tampered = scalars.copy()
    tampered.loc[held_out, "rain"] = tampered.loc[held_out, "rain"] + 5000.0
    assert F.fold_climatology(tampered, held_out, train).means["rain"] == pytest.approx(clim.means["rain"])

    features = F.features_from_scalars(clim, district, [held_out], onsets, oni, dmi)
    assert features.loc[0, "rain_anom_mar_apr"] == pytest.approx(scalars.loc[held_out, "rain"] - clim.means["rain"])
    # Not the all-years mean, which would already contain the held-out year.
    assert features.loc[0, "rain_anom_mar_apr"] != pytest.approx(scalars.loc[held_out, "rain"] - scalars["rain"].mean())


def test_a_training_row_does_not_inform_its_own_baseline():
    _, onsets, oni, dmi, scalars = _one_district(5)
    district = DISTRICTS[0]
    held_out = 1995
    train = [y for y in YEARS if y != held_out]
    clim = F.fold_climatology(scalars, held_out, train)
    row = 1990
    expected = scalars.loc[[y for y in train if y != row]].mean()
    pd.testing.assert_series_equal(clim.baseline_for(row), expected, check_names=False)
    assert clim.means["rain"] == pytest.approx(scalars.loc[train, "rain"].mean())

    features = F.features_from_scalars(clim, district, [row], onsets, oni, dmi)
    assert features.loc[0, "rain_anom_mar_apr"] == pytest.approx(scalars.loc[row, "rain"] - expected["rain"])


def test_years_outside_the_fold_are_refused():
    district, onsets, oni, dmi, scalars = _one_district(6)
    train = [y for y in YEARS if y != 1995]
    with pytest.raises(F.LeakageError, match="climatology training set"):
        F.fold_climatology(scalars, 1995, [1990, 1995])
    with pytest.raises(F.LeakageError, match="belongs to no part of fold"):
        F.fold_climatology(scalars, 1995, train).baseline_for(1975)
    with pytest.raises(F.LeakageError, match="no part of fold"):
        F.features_from_scalars(F.fold_climatology(scalars, 1995, train), district, [1975], onsets, oni, dmi)
    with pytest.raises(F.LeakageError, match="climatology training set"):
        power = synthetic_power({y: 170.0 for y in YEARS}, district.lat, seed=6)
        F.make_features(power, district, [1995], [1990, 1995], onsets, oni, dmi)
    with pytest.raises(F.LeakageError, match="at least one training year"):
        F.fold_climatology(scalars, 1995, [])


def test_only_the_previous_year_onset_is_used_as_a_feature():
    district, onsets, oni, dmi, scalars = _one_district(8)
    train = [y for y in YEARS if y != 1995]
    clim = F.fold_climatology(scalars, 1995, train)
    got = F.features_from_scalars(clim, district, [1995], onsets, oni, dmi)
    assert got.loc[0, "prior_onset_doy"] == pytest.approx(float(onsets[1994]))

    shifted = onsets.copy()
    shifted[1995] = shifted[1995] + 90.0  # the label being predicted
    shifted[1996] = shifted[1996] + 90.0  # the future
    pd.testing.assert_frame_equal(got, F.features_from_scalars(clim, district, [1995], shifted, oni, dmi))

    earlier = onsets.copy()
    earlier[1994] = earlier[1994] + 90.0  # last season is a legitimate signal
    moved = F.features_from_scalars(clim, district, [1995], earlier, oni, dmi)
    assert moved.loc[0, "prior_onset_doy"] == pytest.approx(float(earlier[1994]))


def test_splitter_holds_out_whole_years_only():
    splits = M.leave_one_year_split(YEARS)
    assert len(splits) == len(YEARS)
    for test_year, train_years in splits:
        assert test_year not in train_years
        assert set(train_years) | {test_year} == set(YEARS)
        assert len(train_years) == len(YEARS) - 1


def test_folds_never_share_a_district_year_between_train_and_test():
    samples = synthetic_dataset()
    folds = M.backtest_rows(samples, M.leave_one_year_split(YEARS))
    assert folds
    for fold in folds:
        train_keys = set(zip(fold.train_keys["district"], fold.train_keys["year"], strict=True))
        test_keys = set(zip(fold.test_keys["district"], fold.test_keys["year"], strict=True))
        assert not (train_keys & test_keys), "a district-year cannot train on itself"
        assert set(fold.test_keys["year"]) == {fold.test_year}, "a whole year leaves together"
        assert set(fold.train_keys["year"]) == set(fold.train_years)
        assert len(fold.x_train) == len(fold.y_train) and len(fold.x_test) == len(fold.y_test)
        # The model sees features only: no year, district, label or baseline column.
        assert list(fold.x_train.columns) == F.FEATURE_NAMES
        assert list(fold.x_test.columns) == F.FEATURE_NAMES


def test_baseline_climatology_uses_training_years_only():
    onsets = {"a": pd.Series({1990: 170.0, 1991: 180.0, 1992: 190.0}, name="onset_doy", dtype="float64")}
    assert M.climatology_onset(onsets, [1990, 1991]) == pytest.approx({"a": 175.0})
    assert M.climatology_onset(onsets, [1992]) == pytest.approx({"a": 190.0})
    # A district with no training-year onset gets no baseline rather than a guessed one.
    assert M.climatology_onset(onsets, [1999]) == {}
    # A missing label year is skipped, not filled with the other districts' mean.
    gappy = {"a": pd.Series({1990: 170.0, 1991: np.nan, 1992: 190.0}, name="onset_doy", dtype="float64")}
    assert M.climatology_onset(gappy, [1990, 1991, 1992])["a"] == pytest.approx(180.0)


def test_status_rule_ships_only_when_the_model_beats_climatology():
    good = [_pred(2000, "a", 170.0, 171.0, 178.0), _pred(2000, "b", 176.0, 175.0, 183.0)]
    bad = [_pred(2000, "a", 170.0, 179.0, 175.0), _pred(2000, "b", 176.0, 169.0, 172.0)]
    assert M.metrics_from_predictions(good)["status"] == "shipped"
    assert M.metrics_from_predictions(good)["skill"] > 0
    assert M.metrics_from_predictions(bad)["status"] == "validating"
    assert M.metrics_from_predictions(bad)["skill"] <= 0
    assert M.status_from_skill(0.0) == "validating"
    assert M.status_from_skill(-0.2) == "validating"
    assert M.status_from_skill(float("nan")) == "validating"


def _pred(year: int, district: str, observed: float, predicted: float, clim: float) -> M.Prediction:
    return M.Prediction(
        year=year, district=district, observed=observed, predicted=predicted,
        clim_onset=clim, low=observed - 5.0, high=observed + 5.0,
    )


def test_metrics_report_mae_rmse_coverage_and_share():
    predictions = []
    for year in range(2000, 2006):
        for i in range(3):
            observed = 170.0 + i + (year % 3)
            # The model wins in the even years and loses in the odd ones.
            predicted = observed + (2.0 if year % 2 == 0 else 8.0)
            predictions.append(
                M.Prediction(year=year, district=f"d{i}", observed=observed, predicted=predicted,
                             clim_onset=observed + 6.0, low=observed - 3.0, high=observed + 3.0)
            )
    metrics = M.metrics_from_predictions(predictions)
    assert metrics["mae_model"] == pytest.approx(5.0)
    assert metrics["mae_clim"] == pytest.approx(6.0)
    assert metrics["skill"] == pytest.approx(0.167, abs=0.001)
    assert metrics["rmse"] == pytest.approx(round(np.sqrt(np.mean([e**2 for e in (2.0, 8.0) * 9])), 2))
    assert metrics["coverage"] == pytest.approx(1.0)
    assert metrics["years_beating_climatology"] == 3
    assert metrics["share_years_beating_climatology"] == pytest.approx(0.5)
    assert metrics["status"] == "shipped"
    assert metrics["n_district_years"] == 18


def test_rows_without_a_baseline_are_dropped_from_both_arms():
    predictions = [
        M.Prediction(2000, "a", 170.0, 171.0, float("nan"), 165.0, 175.0),
        M.Prediction(2000, "b", 172.0, 173.0, 178.0, 167.0, 177.0),
    ]
    assert M.metrics_from_predictions(predictions)["n_district_years"] == 1


def test_backtest_runs_end_to_end_and_returns_ranked_importance():
    samples = synthetic_dataset()
    folds = M.backtest_rows(samples, M.leave_one_year_split(YEARS))
    report = M.run_backtest(folds, rounds=40)
    metrics = report["metrics"]
    assert metrics["n_district_years"] > 0
    assert {"mae_model", "mae_clim", "skill", "rmse", "coverage", "status"} <= set(metrics)
    assert metrics["status"] == M.status_from_skill(metrics["skill"])
    assert len(report["importance"]) == len(F.FEATURE_NAMES)
    assert report["importance"] == sorted(report["importance"], key=lambda row: row["mae_increase_days"], reverse=True)
    assert len(report["top_features"]) == 3
    assert np.isfinite(metrics["mae_model"])
    # The clock and the label must never be features.
    assert {"year", "district", "onset_doy", "clim_onset", "fold"}.isdisjoint(F.FEATURE_NAMES)


def test_predictions_match_the_held_out_rows():
    samples = synthetic_dataset()
    folds = M.backtest_rows(samples, M.leave_one_year_split(YEARS))
    report = M.run_backtest(folds, rounds=25)
    predictions = report["predictions"]
    assert len(predictions) == sum(len(fold.x_test) for fold in folds)
    assert {p.year for p in predictions} == {fold.test_year for fold in folds}
    for row in report["per_year"]:
        subset = [p for p in predictions if p.year == row["year"] and np.isfinite(p.clim_onset)]
        assert row["n"] == len(subset)
        assert row["mae_model"] == pytest.approx(float(np.mean([p.model_error for p in subset])), abs=0.02)


def test_write_metrics_serialises_non_finite_numbers_as_null(tmp_path):
    samples = synthetic_dataset()
    folds = M.backtest_rows(samples, M.leave_one_year_split(YEARS))
    report = M.run_backtest(folds, rounds=20)
    report["metrics"]["mae_clim"] = float("nan")
    variants = {"chirps": M.variant_record(report, YEARS, len(DISTRICTS))}
    path = M.write_metrics(variants, tmp_path / "metrics.json", primary="chirps")
    text = path.read_text()
    payload = json.loads(text)
    assert payload["model_version"] == M.MODEL_VERSION
    assert payload["primary_variant"] == "chirps"
    assert payload["status"] == variants["chirps"]["metrics"]["status"]
    assert payload["variants"]["chirps"]["metrics"]["mae_clim_days"] is None
    assert "NaN" not in text, "NaN would break JSON.parse in the browser"


def test_backtest_reports_both_baselines_the_april_forecast_actually_has():
    """Skill against the training mean is the headline, but not the only yardstick."""
    samples = synthetic_dataset()
    folds = M.backtest_rows(samples, M.leave_one_year_split(YEARS))
    metrics = M.run_backtest(folds, rounds=25)["metrics"]
    for key in ("mae_model", "mae_clim", "skill", "mae_clim2", "skill_vs_clim2", "mae_lag1", "skill_vs_lag1", "n_missing_prior"):
        assert key in metrics
    assert metrics["n_missing_prior"] <= metrics["n_district_years"]
    assert metrics["n_district_years_vs_clim2"] <= metrics["n_district_years"]


def test_features_are_all_available_before_the_issue_date():
    """Nothing a feature reads may fall on or after 25 April."""
    from datetime import date

    assert date(2026, F.ISSUE_MONTH, F.ISSUE_DAY) == date(2026, 4, 25)
    assert date(2026, *F.PRE_END) < date(2026, F.ISSUE_MONTH, F.ISSUE_DAY)

    # April's DMI value must not reach the feature: change it and the value holds.
    index = pd.DatetimeIndex([pd.Timestamp(2000, month, 1) for month in (1, 2, 3, 4, 5)])
    frame = pd.DataFrame({"dmi": [0.1, 0.2, 0.4, 9.9, 9.9]}, index=index)
    before = F.dmi_mean(frame, 2000)
    assert before == pytest.approx(0.3), "the DMI feature is Feb–Mar"
    frame.loc[pd.Timestamp(2000, 4, 1), "dmi"] = -9.9
    frame.loc[pd.Timestamp(2000, 5, 1), "dmi"] = -9.9
    assert F.dmi_mean(frame, 2000) == pytest.approx(before)

    # ONI enters only at its January and March centres.
    oni = pd.DataFrame({"oni": [0.5, 0.4, 0.3, 9.9, 9.9]}, index=index)
    assert F.oni_centre(oni, 2000, 1) == pytest.approx(0.5)
    assert F.oni_centre(oni, 2000, 3) == pytest.approx(0.3)


def test_a_missing_index_month_yields_nan_rather_than_a_short_mean():
    index = pd.DatetimeIndex([pd.Timestamp(2000, month, 1) for month in (1, 2, 3)])
    frame = pd.DataFrame({"dmi": [0.1, 0.2, float("nan")]}, index=index)
    assert np.isnan(F.dmi_mean(frame, 2000))
