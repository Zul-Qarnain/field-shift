"""Tests for the outlook payload: dates, contributions, interval sanity, JSON safety."""

import json

import numpy as np
import pandas as pd
import pytest

from src.compute.ml import features as F
from src.compute.ml import onset_ml as M
from src.compute.ml import outlook as O

TARGETS = [
    O.OutlookTarget("dhaka", "district", "Dhaka", 23.8103, 90.4125, "dhaka"),
    O.OutlookTarget("farm-12", "farm", "Farm-12 (Tangail)", 24.2514, 89.9152, "tangail"),
]


def _rows(values: np.ndarray) -> pd.DataFrame:
    return pd.DataFrame(values, columns=F.FEATURE_NAMES)


@pytest.fixture(scope="module")
def fitted() -> O.FittedOutlook:
    rng = np.random.default_rng(3)
    train = rng.normal(0, 1.0, size=(400, len(F.FEATURE_NAMES)))
    # Only the first feature and the last two (lat/lon) carry signal.
    # The model learns an anomaly against the district climatology, not an absolute DOY.
    truth = -6.0 * train[:, 0] + 3.0 * train[:, 5] + 0.8 * train[:, 9]
    frame = _rows(train)
    labels = pd.Series(truth, name="onset_anomaly")
    return O.FittedOutlook(
        mean_model=M.fit({"objective": "regression"}, frame, labels, 60),
        interval_offsets=(-12.0, 15.0),
        shrink=1.0,
        clim_by_district={"dhaka": 176.0, "tangail": 178.0},
        training_years=list(range(1981, 2026)),
        trained_at="2026-05-10T00:00:00+00:00",
        data_retrieved_utc={"power": "2026-05-09T10:00:00+00:00", "nino34": "2026-05-09T10:00:00+00:00", "dmi": "2026-05-09T10:00:00+00:00"},
    )


@pytest.fixture
def records(fitted) -> list[dict]:
    rows = _rows(np.round(np.random.default_rng(9).normal(0, 1, size=(2, len(F.FEATURE_NAMES))), 3))
    return O.predict_targets(fitted, rows, TARGETS)


def test_interval_is_the_conformal_band_around_the_point(records):
    for record in records:
        assert record["interval_low_doy"] == pytest.approx(record["predicted_doy"] - 12.0, abs=0.11)
        assert record["interval_high_doy"] == pytest.approx(record["predicted_doy"] + 15.0, abs=0.11)


def test_a_zero_shrink_forecast_is_exactly_climatology(fitted):
    import dataclasses

    flat = dataclasses.replace(fitted, shrink=0.0)
    rows = _rows(np.random.default_rng(1).normal(0, 1, size=(2, len(F.FEATURE_NAMES))))
    out = O.predict_targets(flat, rows, TARGETS)
    assert [r["predicted_doy"] for r in out] == [176.0, 178.0]
    assert all(c["effect_days"] == 0 for r in out for c in r["top_contributions"])


def test_doy_to_date_matches_the_calendar():
    assert O.doy_to_date(1, 2026) == "2026-01-01"
    assert O.doy_to_date(150, 2026) == "2026-05-30"
    assert O.doy_to_date(151, 2024) == "2024-05-30", "leap years shift the mapping"
    assert O.doy_to_date(170.4) == "2026-06-19"
    # Half-up, the same way the browser rounds: Python's own round() would give 142 here.
    assert O.doy_to_date(142.5) == "2026-05-23"
    assert O.doy_to_date(130.5) == "2026-05-11"
    assert O.doy_to_date(float("nan")) is None
    assert O.doy_to_date(0) is None


def test_one_record_per_target_in_order(records):
    assert [r["key"] for r in records] == ["dhaka", "farm-12"]
    assert [r["kind"] for r in records] == ["district", "farm"]
    assert records[1]["climatology_doy"] == 178.0, "the farm baseline comes from its district"


def test_dates_and_numbers_agree(records):
    for record in records:
        assert record["predicted_date"] == O.doy_to_date(record["predicted_doy"])
        assert np.isfinite(record["predicted_doy"])
        low, high = record["interval_low_doy"], record["interval_high_doy"]
        assert low <= high, "the 10–90 interval must be ordered"
        assert record["interval_low_date"] == O.doy_to_date(low)
        assert record["interval_high_date"] == O.doy_to_date(high)


def test_vs_climatology_is_the_difference(records):
    for record in records:
        assert record["vs_climatology_days"] == pytest.approx(
            round(record["predicted_doy"] - record["climatology_doy"], 1), abs=0.05
        )


def test_contributions_are_the_three_biggest_movers(fitted, records):
    rows = _rows(np.round(np.random.default_rng(9).normal(0, 1, size=(2, len(F.FEATURE_NAMES))), 3))
    for position, record in enumerate(records):
        contributions = record["top_contributions"]
        assert len(contributions) == 3
        magnitudes = [abs(c["effect_days"]) for c in contributions]
        assert magnitudes == sorted(magnitudes, reverse=True)
        for contribution in contributions:
            assert contribution["feature"] in F.FEATURE_NAMES
            assert contribution["label_en"] == F.FEATURE_LABELS_EN[contribution["feature"]]
        # Tree SHAP is exact: contributions plus the base value rebuild the anomaly, and the
        # anomaly plus the district climatology is the prediction.
        matrix = np.asarray(fitted.mean_model.predict(rows.iloc[[position]], pred_contrib=True), dtype=float)
        anomaly = matrix[0][:-1].sum() + matrix[0][-1]
        assert anomaly + record["climatology_doy"] == pytest.approx(record["predicted_doy"], abs=0.06)
        # The synthetic signal lives in the first feature, so it should be a top mover.
        assert {c["feature"] for c in contributions} & {F.FEATURE_NAMES[0], F.FEATURE_NAMES[5]}


def test_payload_splits_districts_and_farms(fitted, records):
    metrics = M.payload_metrics(
        M.metrics_from_predictions([M.Prediction(2000, "dhaka", 170.0, 172.0, 176.0, 165.0, 178.0)] * 4)
    )
    payload = O.build_payload(
        fitted,
        metrics,
        records,
        issue_date="2026-04-25",
        observed={"dhaka": 168.0},
        label_note="labels come from POWER rainfall",
    )
    assert payload["model_version"] == M.MODEL_VERSION
    assert payload["status"] == metrics["status"]
    assert payload["trained_on"] == {"start": 1981, "end": 2025, "years": 45}
    assert [d["key"] for d in payload["districts"]] == ["dhaka"]
    assert [f["key"] for f in payload["farms"]] == ["farm-12"]
    assert payload["metrics"]["mae_model_days"] == metrics["mae_model_days"]
    assert payload["data_sources"]["nino34"]["retrieved_utc"] == "2026-05-09T10:00:00+00:00"


def test_observed_onset_is_reported_alongside_the_prediction(fitted, records):
    metrics = {"status": "validating", "mae_model_days": 9.0}
    payload = O.build_payload(
        fitted, metrics, records, issue_date="2026-04-25", observed={"dhaka": 168.4}, label_note="x"
    )
    district, farm = payload["districts"][0], payload["farms"][0]
    assert district["observed_doy"] == 168.4
    assert district["observed_date"] == "2026-06-17"
    assert "already observed" in district["observed_note"]
    assert farm["observed_doy"] is None
    assert "prediction only" in farm["observed_note"]


def test_write_payload_produces_browser_safe_json(tmp_path, fitted, records):
    metrics = {"status": "validating", "mae_clim_days": float("nan")}
    payload = O.build_payload(fitted, metrics, records, issue_date="2026-04-25", label_note="x")
    path = O.write_payload(payload, tmp_path / "onset_outlook.json")
    text = path.read_text()
    assert "NaN" not in text
    parsed = json.loads(text)
    assert parsed["metrics"]["mae_clim_days"] is None
    assert parsed["status"] == "validating"
