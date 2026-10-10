"""Leave-one-year-out backtest and outlook-year prediction for the monsoon-onset model.

Labels are the deterministic v2 onset rule from :mod:`src.compute.onset`, applied to CHIRPS
daily rainfall in the shipped arm and to NASA POWER PRECTOTCORR in the restricted 2001–2025
arm. The model is a small fixed LightGBM gradient booster — no tuning loop — compared
against the baseline that matters here: each district's own mean onset over the training
years, plus two stricter comparators (the two-season mean, and last season itself).

Everything fold-dependent is rebuilt inside the fold: the window climatology that anomalies
are measured against, and the baseline mean onset. Both see training years only, and a
training row's baseline drops its own year as well. The split holds out a whole year across
all districts at once, because districts in the same year share one monsoon and are not
independent draws.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from src.compute.ml.features import FEATURE_NAMES, District, features_from_scalars, fold_climatology

MODEL_VERSION = "onset-ml-v2"
ISSUE_TEXT = "25 April"
RANDOM_SEED = 0
QUANTILES = (0.1, 0.9)

BASE_PARAMS: dict[str, object] = {
    "num_leaves": 15,
    "learning_rate": 0.05,
    "min_data_in_leaf": 25,
    "feature_fraction": 0.9,
    "extra_seed": RANDOM_SEED,
    "first_metric_only": True,
    "verbosity": -1,
    "num_threads": 1,
    "deterministic": True,
    "force_row_wise": True,
}
NUM_BOOST_ROUND = 250


@dataclass
class Fold:
    """One leave-one-year-out split.

    ``x_*`` holds only model features; ``train_keys`` / ``test_keys`` keep the year, the
    district and the two baselines for those rows, so a prediction can be traced back and
    scored without the model ever seeing them as inputs.
    """

    test_year: int
    train_years: list[int]
    x_train: pd.DataFrame
    y_train: pd.Series
    x_test: pd.DataFrame
    y_test: pd.Series
    train_keys: pd.DataFrame
    test_keys: pd.DataFrame

    @property
    def feature_names(self) -> list[str]:
        return list(self.x_train.columns)


def leave_one_year_split(years: list[int]) -> list[tuple[int, list[int]]]:
    """(held-out year, all other years) for every year. Whole years leave; never part-one."""
    unique = sorted({int(y) for y in years})
    return [(held, [y for y in unique if y != held]) for held in unique]


def build_samples(
    districts: list[District],
    scalars: dict[str, pd.DataFrame],
    onsets: dict[str, pd.Series],
    oni: pd.DataFrame,
    dmi: pd.DataFrame,
    years: list[int],
) -> pd.DataFrame:
    """Long sample frame: one row per district-year *per fold* it appears in.

    Features are rebuilt inside every fold, so the same district-year carries different
    anomaly values in different folds — each one benchmarked against that fold's training
    years only. That redundancy is the point: it is what makes the backtest honest.
    """
    rows: list[pd.DataFrame] = []
    for test_year, train_years in leave_one_year_split(years):
        baseline = climatology_onset(onsets, train_years)
        for district in districts:
            series = onsets.get(district.slug)
            frame = scalars.get(district.slug)
            if series is None or frame is None or test_year not in frame.index:
                continue
            clim = fold_climatology(frame, test_year, train_years)
            features = features_from_scalars(
                clim, district, [test_year, *train_years], series, oni, dmi
            )
            if features.empty:
                continue
            features["fold"] = test_year
            features["clim_onset"] = baseline.get(district.slug, float("nan"))
            features["clim2_onset"] = [lagged_climatology(series, int(year)) for year in features["year"]]
            rows.append(features)
    if not rows:
        return pd.DataFrame(columns=["year", "district", "fold", "clim_onset", *FEATURE_NAMES])
    samples = pd.concat(rows, ignore_index=True)
    samples["onset_doy"] = [
        float(onsets[str(d)].get(int(y), float("nan"))) if str(d) in onsets else float("nan")
        for d, y in zip(samples["district"], samples["year"], strict=True)
    ]
    return samples


def backtest_rows(samples: pd.DataFrame, splits: list[tuple[int, list[int]]]) -> list[Fold]:
    """Slice a long sample frame into leave-one-year-out folds.

    `samples` carries one row per (district, year, fold): the fold-local feature columns,
    `onset_doy` as the label, `clim_onset` as that district's training-year mean onset and
    `clim2_onset` as its two-and-three-season mean — the two baselines that get reported.
    """
    folds: list[Fold] = []
    labeled = samples.dropna(subset=["onset_doy"])
    keys = [column for column in ("year", "district", "clim_onset", "clim2_onset") if column in labeled.columns]
    for test_year, train_years in splits:
        test = labeled[(labeled["fold"] == test_year) & (labeled["year"] == test_year)]
        train = labeled[(labeled["fold"] == test_year) & (labeled["year"] != test_year)]
        if test.empty or train.empty:
            continue
        folds.append(
            Fold(
                test_year=test_year,
                train_years=list(train_years),
                x_train=train[FEATURE_NAMES],
                y_train=train["onset_doy"],
                x_test=test[FEATURE_NAMES],
                y_test=test["onset_doy"],
                train_keys=train[keys].reset_index(drop=True),
                test_keys=test[keys].reset_index(drop=True),
            )
        )
    return folds


def fit(params: dict[str, object], x: pd.DataFrame, y: pd.Series, rounds: int = NUM_BOOST_ROUND):
    import lightgbm as lgb

    merged = {**BASE_PARAMS, **params}
    dataset = lgb.Dataset(x, label=y, free_raw_data=False)
    return lgb.train(merged, dataset, num_boost_round=rounds)


@dataclass
class Prediction:
    year: int
    district: str
    observed: float
    predicted: float
    clim_onset: float
    low: float
    high: float
    #: The district's mean onset two seasons back — the baseline a forecast made in
    #: April actually has, since last season is inside the model as a feature.
    clim2_onset: float = float("nan")
    #: Last season's onset itself: the "do what the neighbour did in May" rule a farmer
    #: could apply with no model at all, reported so the model is measured against it too.
    lag1_onset: float = float("nan")

    @property
    def model_error(self) -> float:
        return abs(self.predicted - self.observed)

    @property
    def clim_error(self) -> float:
        return abs(self.clim_onset - self.observed)

    @property
    def clim2_error(self) -> float:
        return abs(self.clim2_onset - self.observed)

    @property
    def lag1_error(self) -> float:
        return abs(self.lag1_onset - self.observed)

    @property
    def covered(self) -> bool:
        return bool(self.low <= self.observed <= self.high)


def _mae(errors: list[float]) -> float:
    return float(np.mean(errors)) if errors else float("nan")


def metrics_from_predictions(predictions: list[Prediction]) -> dict[str, object]:
    """Headline backtest numbers, including the shipped/validating decision."""
    scored = [p for p in predictions if np.isfinite(p.clim_onset)]
    model_errors = [p.model_error for p in scored]
    clim_errors = [p.clim_error for p in scored]
    mae_model = _mae(model_errors)
    mae_clim = _mae(clim_errors)
    skill = 1.0 - mae_model / mae_clim if mae_clim and np.isfinite(mae_clim) and mae_clim > 0 else float("nan")
    rmse = float(np.sqrt(np.mean([e * e for e in model_errors]))) if model_errors else float("nan")
    coverage = float(np.mean([p.covered for p in scored])) if scored else float("nan")

    by_year: dict[int, list[Prediction]] = {}
    for prediction in scored:
        by_year.setdefault(prediction.year, []).append(prediction)
    wins = [year for year, items in by_year.items() if _mae([p.model_error for p in items]) < _mae([p.clim_error for p in items])]

    lagged = [p for p in scored if np.isfinite(p.clim2_onset)]
    mae_clim2 = _mae([p.clim2_error for p in lagged])
    skill_vs_clim2 = (
        1.0 - mae_model / mae_clim2 if mae_clim2 and np.isfinite(mae_clim2) and mae_clim2 > 0 else float("nan")
    )
    persistent = [p for p in scored if np.isfinite(p.lag1_onset)]
    mae_lag1 = _mae([p.lag1_error for p in persistent])
    skill_vs_lag1 = (
        1.0 - mae_model / mae_lag1 if mae_lag1 and np.isfinite(mae_lag1) and mae_lag1 > 0 else float("nan")
    )

    return {
        "mae_model": _round(mae_model, 2),
        "mae_clim": _round(mae_clim, 2),
        "skill": _round(skill, 3),
        "rmse": _round(rmse, 2),
        "coverage": _round(coverage, 3),
        "n_district_years": len(scored),
        "n_years": len(by_year),
        "years_beating_climatology": len(wins),
        "share_years_beating_climatology": _round(len(wins) / len(by_year), 3) if by_year else float("nan"),
        # Two stricter baselines, because last season's onset is a feature: what April knows
        # without a model is the district's own recent history, and the model has to beat
        # that too before "skill over climatology" means anything to a farmer.
        "mae_clim2": _round(mae_clim2, 2),
        "skill_vs_clim2": _round(skill_vs_clim2, 3),
        "n_district_years_vs_clim2": len(lagged),
        "mae_lag1": _round(mae_lag1, 2),
        "skill_vs_lag1": _round(skill_vs_lag1, 3),
        "n_missing_prior": len(scored) - len(persistent),
        "status": status_from_skill(skill),
    }


def status_from_skill(skill: float) -> str:
    """The decision rule: the model ships only if it beats its own district climatology."""
    return "shipped" if np.isfinite(skill) and skill > 0 else "validating"


def _round(value: float, digits: int) -> float:
    return float(round(float(value), digits)) if np.isfinite(value) else float("nan")


def run_backtest(
    folds: list[Fold],
    *,
    quantiles: tuple[float, ...] = QUANTILES,
    rounds: int = NUM_BOOST_ROUND,
) -> dict[str, object]:
    """Train every fold, score it, and return metrics, per-fold rows and importance."""
    predictions: list[Prediction] = []
    importances: dict[str, list[float]] = {}
    per_year: list[dict[str, object]] = []

    for fold in folds:
        mean_model = fit({"objective": "regression"}, fold.x_train, fold.y_train, rounds)
        quantile_models = {q: fit({"objective": "quantile", "alpha": q}, fold.x_train, fold.y_train, rounds) for q in quantiles}
        predicted = np.asarray(mean_model.predict(fold.x_test), dtype=float)
        bounds = {q: np.asarray(model.predict(fold.x_test), dtype=float) for q, model in quantile_models.items()}
        clim = fold.test_keys["clim_onset"].to_numpy(dtype=float) if "clim_onset" in fold.test_keys else np.full(len(fold.test_keys), np.nan)
        clim2 = fold.test_keys["clim2_onset"].to_numpy(dtype=float) if "clim2_onset" in fold.test_keys else np.full(len(fold.test_keys), np.nan)

        rows = []
        for i, (year, district) in enumerate(zip(fold.test_keys["year"], fold.test_keys["district"], strict=True)):
            observed = float(fold.y_test.iloc[i])
            low_q, high_q = min(quantiles), max(quantiles)
            rows.append(
                Prediction(
                    year=int(year),
                    district=str(district),
                    observed=observed,
                    predicted=float(predicted[i]),
                    clim_onset=float(clim[i]),
                    low=float(bounds[low_q][i]),
                    high=float(bounds[high_q][i]),
                    clim2_onset=float(clim2[i]),
                    lag1_onset=float(fold.x_test["prior_onset_doy"].iloc[i]),
                )
            )
        predictions.extend(rows)
        per_year.append(_fold_summary(fold.test_year, rows))
        importances.update(_permutation_importance(fold, mean_model))

    metrics = metrics_from_predictions(predictions)
    mean_importance = {
        name: _round(float(np.nanmean(values)), 3) for name, values in importances.items() if values
    }
    ranked = sorted(mean_importance.items(), key=lambda kv: kv[1], reverse=True)
    return {
        "metrics": metrics,
        "predictions": predictions,
        "per_year": per_year,
        "importance": [{"feature": f, "mae_increase_days": v} for f, v in ranked],
        "top_features": [f for f, _ in ranked[:3]],
        "folds": len(folds),
    }


def _fold_summary(year: int, rows: list[Prediction]) -> dict[str, object]:
    scored = [r for r in rows if np.isfinite(r.clim_onset)]
    return {
        "year": year,
        "n": len(scored),
        "mae_model": _round(_mae([r.model_error for r in scored]), 2),
        "mae_clim": _round(_mae([r.clim_error for r in scored]), 2),
        "coverage": _round(float(np.mean([r.covered for r in scored])) if scored else float("nan"), 3),
    }


def _permutation_importance(fold: Fold, model) -> dict[str, list[float]]:
    """Increase in held-out MAE when one feature column is shuffled inside the fold."""
    base = float(np.mean(np.abs(np.asarray(model.predict(fold.x_test), dtype=float) - fold.y_test.to_numpy(dtype=float))))
    rng = np.random.default_rng(RANDOM_SEED)
    out: dict[str, list[float]] = {}
    for name in fold.feature_names:
        shuffled = fold.x_test.copy()
        shuffled[name] = rng.permutation(shuffled[name].to_numpy())
        score = float(np.mean(np.abs(np.asarray(model.predict(shuffled), dtype=float) - fold.y_test.to_numpy(dtype=float))))
        out[name] = [score - base]
    return out


def climatology_onset(onsets: dict[str, pd.Series], train_years: list[int]) -> dict[str, float]:
    """Per-district mean onset DOY over the training years only — the reference each forecast is scored against."""
    used = {int(y) for y in train_years}
    means: dict[str, float] = {}
    for district, series in onsets.items():
        values = [float(v) for year, v in series.items() if int(year) in used and np.isfinite(v)]
        if values:
            means[district] = float(np.mean(values))
    return means


def lagged_climatology(series: pd.Series, year: int, seasons: tuple[int, ...] = (2, 3)) -> float:
    """This district's mean onset ``seasons`` back — what April actually knows.

    The all-years training mean is the baseline the brief asks the model to beat, but a
    forecast issued in April also knows last season. Comparing against the two-and-three-
    season-old mean is the stricter test, and the model's skill against it is reported
    alongside the headline skill rather than instead of it.
    """
    values = [float(series[year - lag]) for lag in seasons if year - lag in series.index]
    values = [value for value in values if np.isfinite(value)]
    return float(np.mean(values)) if values else float("nan")


def to_json_safe(value: object) -> object:
    """Replace non-finite floats with None.

    ``JSON.parse`` in the browser rejects ``NaN``, so a metric that could not be computed
    has to travel as an explicit null rather than as a number that is not a number.
    """
    if isinstance(value, dict):
        return {str(k): to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_json_safe(v) for v in value]
    if isinstance(value, np.floating):
        value = float(value)
    if isinstance(value, float):
        return value if np.isfinite(value) else None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (int, str, bool)) or value is None:
        return value
    return str(value)


def payload_metrics(metrics: dict[str, object]) -> dict[str, object]:
    """This module's metric names, spelled the way the app reads them."""
    return {
        "mae_model_days": metrics.get("mae_model"),
        "mae_clim_days": metrics.get("mae_clim"),
        "skill": metrics.get("skill"),
        "rmse_days": metrics.get("rmse"),
        "coverage": metrics.get("coverage"),
        "n_district_years": metrics.get("n_district_years"),
        "n_years": metrics.get("n_years"),
        "years_beating_climatology": metrics.get("years_beating_climatology"),
        "share_years_beating_climatology": metrics.get("share_years_beating_climatology"),
        # The stricter comparators, reported because last season's onset is itself a feature.
        "mae_clim2_days": metrics.get("mae_clim2"),
        "skill_vs_clim2": metrics.get("skill_vs_clim2"),
        "n_district_years_vs_clim2": metrics.get("n_district_years_vs_clim2"),
        "mae_lag1_days": metrics.get("mae_lag1"),
        "skill_vs_lag1": metrics.get("skill_vs_lag1"),
        "n_missing_prior": metrics.get("n_missing_prior"),
        "status": metrics.get("status"),
    }


def variant_record(
    report: dict[str, object],
    years: list[int],
    points: int,
    metrics: dict[str, object] | None = None,
) -> dict[str, object]:
    """One arm of the comparison, as it goes into metrics.json and the outlook payload."""
    return {
        "training_years": {"start": years[0], "end": years[-1], "count": len(years)} if years else None,
        "districts": points,
        "folds": report["folds"],
        "metrics": metrics if metrics is not None else payload_metrics(report["metrics"]),
        "per_year": report["per_year"],
        "importance": report["importance"],
        "top_features": report["top_features"],
    }


def write_metrics(variants: dict[str, dict[str, object]], path: Path, *, primary: str) -> Path:
    """Metrics for every arm, with the shipped/validating decision taken on `primary`.

    This is the ML module's own file — the data pipeline's pack builder is not touched.
    """
    payload = {
        "model_version": MODEL_VERSION,
        "issue_date": ISSUE_TEXT,
        "hyperparameters": {**BASE_PARAMS, "num_boost_round": NUM_BOOST_ROUND, "quantiles": list(QUANTILES)},
        "features": FEATURE_NAMES,
        "primary_variant": primary,
        "status": str(variants[primary]["metrics"]["status"]),
        "variants": variants,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(to_json_safe(payload), indent=2, allow_nan=False) + "\n")
    return path
