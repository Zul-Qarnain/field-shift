"""Offline tests for the SRDI salinity pipeline (no downloads, real committed CSV).

Run: /workspace/fs-venv/bin/python -m pytest -q
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest
from shapely.geometry import box

from src.acquire import salinity as S

ROWS = S.load_upazilas()
PUBLISHED = S.load_published_totals()
JSON_OUT = json.loads((S.REPO / "web" / "public" / "data" / "salinity.json").read_text(encoding="utf-8"))


def row(**kw):
    base = {
        "district": "Testpur",
        "upazila": "Test Sadar",
        "total_ha": 1000,
        "uncultivated_ha": 400,
        "cultivated_ha": 600,
        "saline_ha": 500,
        "S1_ha": 300,
        "S2_ha": 150,
        "S3_ha": 50,
        "S4_ha": 0,
        "S5_ha": 0,
        "gb_adm3": "Test Sadar",
        "page": "31",
    }
    base.update(kw)
    return base


# ---------------------------------------------------------------- the committed data


def test_csv_parses_and_is_not_empty():
    assert len(ROWS) == 102
    assert len({r["district"] for r in ROWS}) == 18


def test_classes_sum_to_the_printed_saline_area_on_every_row():
    problems, _ = S.validate(ROWS, PUBLISHED)
    assert problems == []
    for r in ROWS:
        assert sum(r[f"{c}_ha"] for c in S.CLASS_LABELS) == r["saline_ha"], r["upazila"]


def test_district_and_belt_totals_recomputed_from_rows_equal_the_printed_totals():
    belt = PUBLISHED["COASTAL_BELT"]
    assert sum(r["saline_ha"] for r in ROWS) == belt["saline_ha"] == 1056260
    assert sum(r["S1_ha"] for r in ROWS) == belt["S1_ha"] == 328430
    assert sum(r["S5_ha"] for r in ROWS) == belt["S5_ha"] == 101920
    khulna = PUBLISHED["Khulna"]
    assert sum(r["total_ha"] for r in ROWS if r["district"] == "Khulna") == khulna["total_ha"] == 213820


def test_a_broken_class_split_is_caught():
    tampered = copy.deepcopy(ROWS)
    tampered[0]["S2_ha"] += 10
    problems, _ = S.validate(tampered, PUBLISHED)
    assert any("classes sum" in p for p in problems)


def test_a_saline_area_above_the_total_area_is_caught():
    bad = [row(total_ha=100, saline_ha=500, S1_ha=300, S2_ha=150, S3_ha=50)]
    problems, _ = S.validate(bad, {"_note": ""})
    assert any("exceeds total" in p for p in problems)


def test_area_identity_mismatch_is_reported_not_failed():
    # SRDI prints the administrative total; 37 rows do not split it into cultivated + uncultivated.
    problems, notes = S.validate(ROWS, PUBLISHED)
    assert problems == []
    assert len(notes) == 37


def test_two_upazila_rows_cannot_share_one_geoBoundaries_name():
    dupe = [row(district="A", upazila="One", gb_adm3="Same"), row(district="B", upazila="Two", gb_adm3="Same")]
    with pytest.raises(ValueError, match="ambiguous"):
        S.upazila_index(dupe)


# ------------------------------------------------------------------- the derivations


def test_saline_share_is_saline_over_total():
    assert S.saline_share(row(total_ha=1000, saline_ha=500)) == 0.5


def test_class_shares_are_of_the_saline_area_and_sum_to_one():
    shares = S.class_shares(row(saline_ha=500, S1_ha=300, S2_ha=150, S3_ha=50, S4_ha=0, S5_ha=0))
    assert shares == {"S1": 0.6, "S2": 0.3, "S3": 0.1, "S4": 0.0, "S5": 0.0}
    assert sum(shares.values()) == pytest.approx(1.0)


def test_rep_ec_is_the_area_weighted_midpoint_and_S5_uses_its_lower_bound():
    # 0.6*3.0 + 0.3*6.05 + 0.1*10.05 = 1.8 + 1.815 + 1.005
    assert S.rep_ec(row()) == 4.62
    only_s5 = row(saline_ha=100, S1_ha=0, S2_ha=0, S3_ha=0, S4_ha=0, S5_ha=100)
    assert S.rep_ec(only_s5) == 16.0


def test_rep_ec_is_none_when_the_upazila_has_no_saline_area():
    assert S.rep_ec(row(saline_ha=0, S1_ha=0, S2_ha=0, S3_ha=0)) is None
    assert S.class_shares(row(saline_ha=0)) == {c: 0.0 for c in S.CLASS_LABELS}


def test_rollup_is_area_weighted_not_a_mean_of_shares():
    a = row(district="Testpur", upazila="A", total_ha=1000, uncultivated_ha=0, cultivated_ha=1000,
             saline_ha=900, S1_ha=900, S2_ha=0, S3_ha=0)
    b = row(district="Testpur", upazila="B", total_ha=9000, uncultivated_ha=0, cultivated_ha=9000,
             saline_ha=100, S1_ha=0, S2_ha=100, S3_ha=0)
    out = S.rollup([a, b])
    assert out["salineShare"] == pytest.approx(1000 / 10000, abs=1e-4)  # area-weighted, not 0.5/0.011 mean
    assert out["classShares"]["S1"] == pytest.approx(0.9)
    assert out["repECe"] == pytest.approx(0.9 * 3.0 + 0.1 * 6.05, abs=0.01)


# --------------------------------------------------------------- aliases and mapping


@pytest.mark.parametrize(
    ("spelling", "canonical"),
    [("Barishal", "Barisal"), ("barisal", "Barisal"), ("Jashore", "Jessore"), ("Jessore", "Jessore"),
     ("Chattogram", "Chittagong"), ("Bogura", "Bogra"), ("Cumilla", "Comilla"), ("Cox's", "Cox's Bazar"),
     ("Jhalakathi", "Jhalokati"), ("Tangail", "Tangail")],
)
def test_district_spelling_variants_join_to_one_name(spelling, canonical):
    assert S.canonical_district(spelling) == canonical


def test_locate_finds_the_containing_polygon_and_reports_none_outside():
    units = [("West", box(0, 0, 1, 1)), ("East", box(1, 0, 2, 1))]
    assert S.locate(units, 0.5, 0.5) == "West"
    assert S.locate(units, 0.5, 1.5) == "East"
    assert S.locate(units, 5, 5) is None


def test_farm_block_returns_nulls_not_zeros_outside_the_survey():
    units = [("Tangail Sadar", box(89.8, 24.2, 90.0, 24.4)), ("Test Sadar", box(89.5, 22.7, 89.6, 22.9))]
    districts = [("Tangail", box(89.5, 24.0, 90.5, 24.9)), ("Khulna", box(89.2, 22.6, 89.7, 22.9))]
    index = S.upazila_index([row()])

    outside = S.farm_block(24.2514, 89.9152, units, districts, index)
    assert outside["status"] == "outside SRDI coastal saline survey area"
    assert outside["salineShare"] is None and outside["repECe"] is None

    inside = S.farm_block(22.8, 89.55, units, districts, index)
    assert inside["status"] == "in SRDI coastal saline survey"
    assert inside["salineShare"] == 0.5 and inside["repECe"] == 4.62

    nowhere = S.farm_block(0.0, 0.0, units, districts, index)
    assert nowhere["salineShare"] is None and "nearbyDistrict" in nowhere


def test_unmapped_srdi_upazilas_are_kept_in_the_csv_but_left_out_of_the_index():
    # geoBoundaries gbOpen has no ADM3 polygon for these four; they must not be silently dropped.
    unmapped = [(r["district"], r["upazila"]) for r in ROWS if not (r["gb_adm3"] or "").strip()]
    assert sorted(unmapped) == [("Bagerhat", "Kachua"), ("Chittagong", "C. Sadar"), ("Narail", "Lohagara"), ("Satkhira", "Kaliganj")]
    assert len(S.upazila_index(ROWS)) == len(ROWS) - 4


def test_district_table_marks_non_surveyed_districts_as_null():
    table = S.district_table([row(district="Khulna")], ["Khulna", "Tangail"])
    assert table["Tangail"] == {"status": "not in SRDI coastal saline survey", "salineShare": None, "repECe": None}
    assert table["Khulna"]["status"] == "in SRDI coastal saline survey"
    assert table["Khulna"]["upazilas"] == 1


def test_district_table_rejects_an_srdi_name_that_is_not_in_the_register():
    with pytest.raises(SystemExit, match="not found in the geoBoundaries"):
        S.district_table([row(district="Nowhere")], ["Khulna"])


# ----------------------------------------------------------------- data.ts and output


def test_demo_farm_coordinates_are_read_from_data_ts():
    farms = S.parse_demo_farms()
    assert len(farms) == 6
    assert farms["khulna-09"] == pytest.approx((22.8029, 89.4018))
    assert farms["barishal-03"] == pytest.approx((22.8486, 90.2512))


def test_emitted_json_agrees_with_the_committed_csv_for_the_coastal_farms():
    dumuria = next(r for r in ROWS if r["district"] == "Khulna" and r["upazila"] == "Dumuria")
    farm = JSON_OUT["farms"]["khulna-09"]
    assert (farm["district"], farm["upazila"]) == ("Khulna", "Dumuria")
    assert farm["saline_ha"] == dumuria["saline_ha"] == 30610
    assert farm["salineShare"] == pytest.approx(S.saline_share(dumuria), abs=1e-4)
    assert farm["repECe"] == S.rep_ec(dumuria)
    assert sum(farm["classShares"].values()) == pytest.approx(1.0, abs=1e-3)
    assert farm["page"] == 31

    wazirpur = JSON_OUT["farms"]["barishal-03"]
    assert (wazirpur["district"], wazirpur["upazila"]) == ("Barisal", "Wazirpur")
    assert wazirpur["salineShare"] < farm["salineShare"]  # the Khulna farm is the saltier site


def test_emitted_json_covers_64_districts_and_only_18_are_surveyed():
    assert len(JSON_OUT["districts"]) == 64
    assert len(JSON_OUT["surveyedDistricts"]) == 18
    assert JSON_OUT["districts"]["Rajshahi"]["salineShare"] is None
    assert JSON_OUT["districts"]["Khulna"]["salineShare"] == pytest.approx(
        PUBLISHED["Khulna"]["saline_ha"] / PUBLISHED["Khulna"]["total_ha"], abs=1e-4
    )


def test_emitted_json_carries_a_citation_and_a_real_retrieval_date():
    assert JSON_OUT["retrieved"] == "2026-09-30"
    assert "Appendix-2" in JSON_OUT["citation"]
    assert JSON_OUT["url"].startswith("https://objectstorage.")
    assert JSON_OUT["geometry"]["retrieved"] == "2026-09-30"
    assert "dry season" in JSON_OUT["measured"]
    for farm in JSON_OUT["farms"].values():
        assert farm["lat"] and farm["lon"]
