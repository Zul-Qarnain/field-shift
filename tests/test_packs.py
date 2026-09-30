"""The committed data packs: shape, provenance and honesty invariants. Reads files only."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
PACKS = REPO_ROOT / "web" / "public" / "data" / "packs"

FARM_IDS = ["farm-12", "rajshahi-07", "barishal-03", "khulna-09", "rangpur-21", "sylhet-15"]


def load(relative: str) -> dict:
    return json.loads((PACKS / relative).read_text())


@pytest.fixture(scope="module")
def index() -> dict:
    if not (PACKS / "index.json").exists():
        pytest.skip("data packs not built yet")
    return load("index.json")


def test_index_covers_six_farms_and_all_sixty_four_districts(index: dict) -> None:
    assert index["schema_version"] == 2
    assert index["source"] == "NASA POWER daily point API, community AG"
    assert index["counts"] == {"farms": 6, "districts": 64}
    assert len(index["farms"]) == 6
    assert len(index["districts"]) == 64
    assert "districtErrors" not in index


def test_index_states_the_rule_and_the_cross_check_it_was_built_with(index: dict) -> None:
    assert index["onsetWindow"] == {"startDoy": 121, "endDoy": 270}
    assert "Moron & Robertson" in index["onsetDefinition"]
    assert index["crossCheck"]["source"].startswith("CHIRPS")
    assert index["trendWindow"].startswith("2001")


def test_every_pack_carries_a_real_retrieval_timestamp(index: dict) -> None:
    assert index["retrievedRange"]["earliest"].startswith("20")
    for entry in index["farms"] + index["districts"]:
        assert "+" in entry["retrievedUtc"] or "Z" in entry["retrievedUtc"]
        assert not entry["retrievedUtc"].startswith("not yet")


@pytest.mark.parametrize("farm_id", FARM_IDS)
def test_farm_pack_shape(farm_id: str) -> None:
    pack = load(f"farms/{farm_id}.json")
    assert pack["kind"] == "farm"
    assert pack["id"] == farm_id
    assert set(pack["parameters"]) == {
        "PRECTOTCORR", "T2M", "T2M_MAX", "T2M_MIN", "GWETROOT", "RH2M", "ALLSKY_SFC_SW_DWN"
    }
    assert pack["covered"]["start"] == "1981-01-01"
    assert pack["completeYears"]["first"] == 1981
    assert len(pack["method"]["caveats"]) >= 3


@pytest.mark.parametrize("farm_id", FARM_IDS)
def test_onset_block_is_v2_and_honest_about_censoring(farm_id: str) -> None:
    onset = load(f"farms/{farm_id}.json")["onset"]
    assert onset["definition"] == "v2"
    assert onset["window"] == {"startDoy": 121, "endDoy": 270}
    assert onset["thresholdText"] == "5-day rainfall ≥ local Jun–Sep mean (2001–2025), no break ≥ 10 days under 5 mm"
    assert onset["thresholdMm"] > 0
    assert onset["referencePeriod"] == [2001, 2025]
    assert onset["eraA"]["n"] == 12
    assert onset["shiftDays"] == pytest.approx(onset["medianB"] - onset["medianA"])
    # censoring is recorded, and v2 must be far less censored than the rule it replaced
    censored = onset["censoredAtWindowStart"]
    assert censored["count"] <= censored["of"]
    assert censored["sharePct"] < onset["legacyV1"]["censoredAtWindowStart"]["sharePct"]
    assert onset["legacyV1"]["censoredAtWindowStart"]["sharePct"] >= 50.0
    assert [row["thresholdFactor"] for row in onset["sensitivity"]] == [0.8, 1.0, 1.2]
    assert onset["yearsMissing"] == [int(y) for y in onset["yearsMissing"]]


@pytest.mark.parametrize("farm_id", FARM_IDS)
def test_rainfall_trend_is_windowed_and_flagged_when_needed(farm_id: str) -> None:
    pack = load(f"farms/{farm_id}.json")
    metrics = pack["metrics"]
    assert metrics["rainfallTrendWindow"].startswith("2001")
    assert min(metrics["rainfallYearsUsed"]) >= 2001  # never a 1981-2025 trend
    homogeneity = pack["quality"]["precipHomogeneity"]
    assert isinstance(homogeneity["homogeneous"], bool)  # booleans, not 1/0
    assert isinstance(homogeneity["affectsEraComparison"], bool)
    assert homogeneity["analysisWindow"].startswith("2001")
    if homogeneity["changePointInsideAnalysisWindow"] is not None:
        assert metrics["rainfallTrendCaution"].startswith("caution: POWER precipitation has source changes")
        assert pack["onset"]["caution"].startswith("POWER precipitation has a Pettitt change point")


@pytest.mark.parametrize("farm_id", FARM_IDS)
def test_cross_check_is_a_real_independent_series(farm_id: str) -> None:
    cross = load(f"farms/{farm_id}.json")["crossCheck"]
    assert cross["available"] is True
    assert cross["source"].startswith("CHIRPS")
    assert cross["tierLabel"] == "Open (UCSB CHC / USGS)"
    assert "Funk" in cross["citation"]
    assert cross["retrievedUtc"].startswith("2026-")
    assert cross["yearsOnDisk"] == {"first": 1981, "last": 2025, "count": 45}
    assert cross["grid"]["degrees"] == 0.25
    assert len(cross["annualRainfall"]["label"]) == len(cross["annualRainfall"]["values"]) == 45
    trend = cross["rainfallTrend2001toLatest"]
    assert trend["window"].startswith("2001") and trend["n"] == 25
    onset = cross["onset"]
    assert onset["medianB"] - onset["medianA"] == pytest.approx(onset["shiftDays"])
    agreement = cross["agreement"]["onsetYears"]
    assert agreement["yearsCompared"] >= 40
    assert 0.0 <= abs(agreement["mae"]) < 60


@pytest.mark.parametrize("farm_id", FARM_IDS)
def test_preferred_source_follows_the_tests_not_a_hand_choice(farm_id: str) -> None:
    pack = load(f"farms/{farm_id}.json")
    preferred = pack["preferred"]
    flagged = pack["quality"]["precipHomogeneity"]["changePointInsideAnalysisWindow"] is not None
    chirps_flagged = pack["crossCheck"]["homogeneity"]["changePointInsideAnalysisWindow"] is not None
    if not flagged:
        assert preferred["rainfallTrend"]["source"] == "NASA POWER"
    elif not chirps_flagged:
        assert preferred["rainfallTrend"]["source"] == "CHIRPS v2.0"
    else:
        assert preferred["rainfallTrend"]["source"] == "none"
    assert preferred["onsetShift"]["source"] == preferred["rainfallTrend"]["source"]


def test_temperature_side_is_tested_too() -> None:
    for farm_id in FARM_IDS:
        homogeneity = load(f"farms/{farm_id}.json")["quality"]["tempMaxHomogeneity"]
        assert homogeneity["fullRecord"]["test"].startswith("Pettitt")
        assert homogeneity["analysisWindow"].startswith("2001")
        assert homogeneity["fullRecord"]["n"] >= 40


def test_district_packs_match_the_centroid_table(index: dict) -> None:
    csv_rows = (REPO_ROOT / "src" / "acquire" / "bd_districts.csv").read_text().splitlines()
    assert len(csv_rows) - 1 == 64
    for entry in index["districts"]:
        pack = load(entry["path"].replace("/data/packs/", ""))
        assert pack["slug"] == entry["slug"]
        assert pack["boundary"]["provider"] == "geoBoundaries gbOpen BGD ADM2"
        assert pack["crossCheck"]["available"] is True
        assert 20 <= pack["lat"] <= 27 and 88 <= pack["lon"] <= 93


def _numbers(node):
    if isinstance(node, dict):
        for value in node.values():
            yield from _numbers(value)
    elif isinstance(node, list):
        for value in node:
            yield from _numbers(value)
    elif isinstance(node, (int, float)) and not isinstance(node, bool):
        yield node


def test_no_power_fill_value_or_raw_nan_leaked_into_any_pack(index: dict) -> None:
    """POWER's -999 sentinel must never survive as a value; NaN must not appear as raw JSON.

    Only the exact sentinel is checked: a legitimate statistic (e.g. a POWER-minus-CHIRPS annual
    bias of -963 mm at Sylhet) must not be mistaken for a fill value.
    """
    relative_paths = [f"farms/{farm_id}.json" for farm_id in FARM_IDS] + [
        entry["path"].replace("/data/packs/", "") for entry in index["districts"]
    ]
    for relative in relative_paths:
        text = (PACKS / relative).read_text()

        def reject_constant(value: str) -> None:
            raise AssertionError(f"raw {value} written in {relative}")

        payload = json.loads(text, parse_constant=reject_constant)
        assert [v for v in _numbers(payload) if v == -999 or v == -999.0] == [], f"{relative} still carries -999"


def test_quality_block_labels_what_is_still_a_fixture(index: dict) -> None:
    for farm_id in FARM_IDS:
        quality = load(f"farms/{farm_id}.json")["quality"]
        assert quality["ndvi"] == "not retrieved — demo fixture"
        assert "SoilGrids" in quality["soil"]
        assert "GWETROOT" in quality["smapSoilMoisture"]
        assert quality["smapSoilMoisture"].startswith("not retrieved")


def test_method_text_documents_the_rejected_rule_and_the_products(index: dict) -> None:
    method = load(f"farms/{FARM_IDS[0]}.json")["method"]
    assert "Moron & Robertson" in method["onsetDefinition"]
    assert "DOY 145" in method["onsetRejected"]
    assert "Mann-Whitney" in method["eras"]
    assert "Pettitt" in method["homogeneity"]
    assert "UCSB" in method["crossCheck"]
    assert any("CHIRPS" in caveat for caveat in method["caveats"])
