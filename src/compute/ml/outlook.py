"""Turning a fitted onset model into the per-district and per-farm outlook payload.

The payload is what the app reads from ``web/public/data/onset_outlook.json``. It is
produced offline: the browser never runs the model, it only shows what the model said on
the day the JSON was built.
"""

from __future__ import annotations

import datetime as dt
import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

from src.compute.ml.features import FEATURE_LABELS_BN, FEATURE_LABELS_EN, FEATURE_NAMES
from src.compute.ml.onset_ml import INTERVAL_TEXT, MODEL_VERSION, QUANTILES, SHRINK_TEXT, TARGET_TEXT, to_json_safe

#: Predicted day-of-year values are shown as dates in this year's monsoon season.
OUTLOOK_YEAR = 2026
CONTRIBUTION_METHOD = (
    "LightGBM tree SHAP via pred_contrib=True on the anomaly model — days of onset shift away from "
    "the district climatology"
)


@dataclass
class FittedOutlook:
    """The final anomaly model, its conformal band and the climatology it corrects."""

    mean_model: object
    #: Residual quantiles (low, high) added to the point prediction — see onset_ml.inner_calibration.
    interval_offsets: tuple[float, float]
    #: Factor on the model's anomaly correction chosen by the inner cross-validation.
    shrink: float
    clim_by_district: dict[str, float]
    training_years: list[int]
    trained_at: str
    data_retrieved_utc: dict[str, str] = field(default_factory=dict)


@dataclass
class OutlookTarget:
    key: str
    kind: str  # "district" | "farm"
    label: str
    lat: float
    lon: float
    clim_key: str  # district whose onset climatology is the baseline


def write_payload(payload: dict[str, object], path: Path) -> Path:
    """Write the outlook JSON, with non-finite numbers flattened to null."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(to_json_safe(payload), indent=2, allow_nan=False) + "\n")
    return path


def doy_to_date(doy: float, year: int = OUTLOOK_YEAR) -> str | None:
    """Half-up, like the browser's Math.round — Python's round() is banker's rounding.

    A predicted DOY of 142.5 must become the same calendar date in the JSON and on screen.
    """
    if doy is None or not np.isfinite(float(doy)):
        return None
    rounded = int(np.floor(float(doy) + 0.5))
    if rounded < 1:
        return None
    try:
        return (dt.date(year, 1, 1) + dt.timedelta(days=rounded - 1)).isoformat()
    except ValueError:
        return None


def contributions(model, row: pd.DataFrame, scale: float = 1.0) -> list[dict[str, object]]:
    """Per-prediction feature contributions, biggest movers first.

    LightGBM's ``pred_contrib=True`` returns exact tree SHAP values. Together with the
    base value they sum to the prediction, so ``effect_days`` is in days of onset and the
    features are directly comparable with each other.
    """
    matrix = np.asarray(model.predict(row, pred_contrib=True), dtype=float)
    # Scaled by the shrinkage, so the effects are the days actually applied to the forecast.
    values = matrix[0][:-1] * float(scale)
    out: list[dict[str, object]] = []
    for index in np.argsort(-np.abs(values))[:3]:
        name = FEATURE_NAMES[int(index)]
        out.append(
            {
                "feature": name,
                "label_en": FEATURE_LABELS_EN[name],
                "label_bn": FEATURE_LABELS_BN[name],
                "effect_days": round(float(values[int(index)]), 2),
            }
        )
    return out


def predict_targets(fitted: FittedOutlook, rows: pd.DataFrame, targets: list[OutlookTarget]) -> list[dict[str, object]]:
    """One outlook record per target: prediction, interval, baseline and top movers.

    `rows` must be aligned with `targets` — same order, one row each. The model predicts an
    anomaly; the record's onset is the target's district climatology plus that anomaly.
    """
    features = rows[FEATURE_NAMES]
    anomaly = np.asarray(fitted.mean_model.predict(features), dtype=float)
    q_low, q_high = fitted.interval_offsets

    records: list[dict[str, object]] = []
    for position, target in enumerate(targets):
        clim = fitted.clim_by_district.get(target.clim_key, float("nan"))
        point = clim + fitted.shrink * anomaly[position]
        lo, hi = _ordered_interval(point + q_low, point + q_high)
        # Round first, then derive the date, so a tenth of a day can never disagree.
        predicted_doy = _maybe_round(point)
        low_doy, high_doy = _maybe_round(lo), _maybe_round(hi)
        clim_doy = _maybe_round(clim)
        records.append(
            {
                "key": target.key,
                "kind": target.kind,
                "label": target.label,
                "lat": round(float(target.lat), 4),
                "lon": round(float(target.lon), 4),
                "predicted_doy": predicted_doy,
                "predicted_date": doy_to_date(predicted_doy),
                "interval_low_doy": low_doy,
                "interval_low_date": doy_to_date(low_doy),
                "interval_high_doy": high_doy,
                "interval_high_date": doy_to_date(high_doy),
                "climatology_doy": clim_doy,
                "climatology_date": doy_to_date(clim_doy),
                "vs_climatology_days": round(predicted_doy - clim_doy, 1)
                if clim_doy is not None and predicted_doy is not None
                else None,
                "top_contributions": contributions(fitted.mean_model, features.iloc[[position]], fitted.shrink),
            }
        )
    return records


def _ordered_interval(low: float, high: float) -> tuple[float, float]:
    if not (np.isfinite(low) and np.isfinite(high)):
        return float("nan"), float("nan")
    return (low, high) if low <= high else (high, low)


def _maybe_round(value: float) -> float | None:
    return round(float(value), 1) if np.isfinite(value) else None


def out_of_sample_check(records: list[dict[str, object]]) -> dict[str, object] | None:
    """Score the outlook year against the onsets already observed in it.

    This is one season, so it is a check and not a skill claim: a year that happens to be
    easy says nothing about the next one. It is published because the backtest is the only
    other number the reader has, and the backtest averages 45 years.
    """
    rows = [
        r for r in records
        if r["kind"] == "district" and r.get("observed_doy") is not None and r.get("predicted_doy") is not None
    ]
    if not rows:
        return None
    model = [abs(float(r["predicted_doy"]) - float(r["observed_doy"])) for r in rows]  # type: ignore[arg-type]
    signed = [float(r["predicted_doy"]) - float(r["observed_doy"]) for r in rows]  # type: ignore[arg-type]
    clim = [
        abs(float(r["climatology_doy"]) - float(r["observed_doy"]))
        for r in rows
        if r.get("climatology_doy") is not None
    ]
    hits = [
        1
        for r in rows
        if r.get("interval_low_doy") is not None
        and r.get("interval_high_doy") is not None
        and float(r["interval_low_doy"]) <= float(r["observed_doy"]) <= float(r["interval_high_doy"])  # type: ignore[arg-type]
    ]
    return {
        "districts_compared": len(rows),
        "mae_model_days": round(float(np.mean(model)), 2),
        "bias_days": round(float(np.mean(signed)), 2),
        "mae_clim_days": round(float(np.mean(clim)), 2) if clim else None,
        "interval_hits": len(hits),
        "note": (
            "One season only, and only where the v2 rule could already confirm the onset; "
            "it is not evidence of skill on its own."
        ),
    }


def build_payload(
    fitted: FittedOutlook,
    metrics: dict[str, object],
    records: list[dict[str, object]],
    *,
    issue_date: str,
    observed: dict[str, float] | None = None,
    label_note: str,
    variants: dict[str, object] | None = None,
    sources: dict[str, object] | None = None,
) -> dict[str, object]:
    """Assemble the JSON the app reads, with the honesty fields always present.

    `metrics` arrives in payload naming — see :func:`src.compute.ml.onset_ml.payload_metrics`.
    """
    observed = observed or {}
    for record in records:
        value = observed.get(str(record["key"]))
        if value is not None and np.isfinite(float(value)):
            record["observed_doy"] = round(float(value), 1)
            record["observed_date"] = doy_to_date(float(value))
            record["observed_note"] = (
                "This year's onset was already observed by the stated rule before the outlook was built."
            )
        else:
            record["observed_doy"] = None
            record["observed_date"] = None
            record["observed_note"] = "No observed onset for this year yet — this row is a prediction only."

    return {
        "model_version": MODEL_VERSION,
        "status": str(metrics.get("status", "validating")),
        "issue_date": issue_date,
        "outlook_year": OUTLOOK_YEAR,
        "trained_on": {
            "start": min(fitted.training_years),
            "end": max(fitted.training_years),
            "years": len(fitted.training_years),
        },
        "built_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "model_trained_at_utc": fitted.trained_at,
        "quantile_interval": {"low": QUANTILES[0], "high": QUANTILES[1]},
        "interval_method": INTERVAL_TEXT,
        "interval_offsets_days": {"low": _maybe_round(fitted.interval_offsets[0]), "high": _maybe_round(fitted.interval_offsets[1])},
        "target": TARGET_TEXT,
        "shrink": round(float(fitted.shrink), 2),
        "shrinkage": SHRINK_TEXT,
        "contribution_method": CONTRIBUTION_METHOD,
        "data_sources": {
            "imerg": {"name": "NASA/JAXA GPM IMERG V07 daily, via NASA POWER Zarr (AWS Open Data)", "retrieved_utc": fitted.data_retrieved_utc.get("imerg", "unknown")},
            "power": {"name": "NASA POWER v10 daily (MERRA-2), via NASA POWER Zarr (AWS Open Data)", "retrieved_utc": fitted.data_retrieved_utc.get("power", "unknown")},
            "nino34": {"name": "Niño 3.4 from NASA MERRA-2 monthly skin temperature", "retrieved_utc": fitted.data_retrieved_utc.get("nino34", "unknown")},
            "dmi": {"name": "Dipole Mode Index from NASA MERRA-2 monthly skin temperature", "retrieved_utc": fitted.data_retrieved_utc.get("dmi", "unknown")},
        },
        "metrics": metrics,
        "backtest": "leave-one-year-out, all districts of a year held out together",
        "features": FEATURE_NAMES,
        "label_note": label_note,
        "sources": sources or {},
        "variants": variants or {},
        "districts": [r for r in records if r["kind"] == "district"],
        "farms": [r for r in records if r["kind"] == "farm"],
    }
