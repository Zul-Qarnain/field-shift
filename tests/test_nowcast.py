"""Nowcast maths (src/compute/nowcast.py) and the committed nowcast packs / district table."""

from __future__ import annotations

import json
import math
from datetime import date, timedelta
from pathlib import Path

import pytest

from src.compute import nowcast

REPO = Path(__file__).resolve().parents[1]
NOWCAST_DIR = REPO / "web" / "public" / "data" / "nowcast"
DISTRICTS_JSON = REPO / "web" / "public" / "data" / "districts.json"
PACK_INDEX = REPO / "web" / "public" / "data" / "packs" / "index.json"


def test_calendar_key_is_leap_year_doy():
    assert nowcast.calendar_key(date(2025, 1, 1)) == 0
    assert nowcast.calendar_key(date(2024, 2, 29)) == 59
    assert nowcast.calendar_key(date(2024, 3, 1)) == 60
    assert nowcast.calendar_key(date(2025, 3, 1)) == 60  # same key in a non-leap year
    assert nowcast.calendar_key(date(2025, 12, 31)) == 365


def test_climatology_constant_series_and_wraparound():
    series = {}
    d = date(2017, 1, 1)
    while d <= date(2025, 12, 31):
        series[d] = 2.0
        d += timedelta(days=1)
    clim = nowcast.climatology(series, 2017, 2025, half_window=7)
    assert len(clim) == 366
    assert all(abs(v - 2.0) < 1e-12 for v in clim)


def test_climatology_ignores_years_outside_baseline_and_nans():
    series = {date(2016, 6, 1): 100.0, date(2018, 6, 1): 4.0, date(2019, 6, 1): float("nan"), date(2020, 6, 1): None}
    clim = nowcast.climatology(series, 2017, 2025, half_window=0)
    key = nowcast.calendar_key(date(2018, 6, 1))
    assert clim[key] == 4.0
    assert clim[key + 1] is None


def test_window_summary_against_hand_numbers():
    end = date(2026, 10, 5)
    days = [end - timedelta(days=i) for i in range(10)]
    cols = {
        "PRECTOTCORR": {d: 1.0 for d in days},
        "T2M": {d: 30.0 for d in days},
        "GWETTOP": {d: 0.5 for d in days},
    }
    clim = {"PRECTOTCORR": [2.0] * 366, "T2M": [28.0] * 366, "GWETTOP": [0.6] * 366}
    s = nowcast.window_summary(cols, clim, end, 10)
    assert s["start"] == "2026-09-26" and s["end"] == "2026-10-05"
    assert s["rainTotalMm"] == 10.0 and s["rainNormalMm"] == 20.0 and s["rainAnomalyMm"] == -10.0
    assert s["rainPctOfNormal"] == 50.0
    assert s["tempAnomaly"] == 2.0
    assert math.isclose(s["wetAnomaly"], -0.1, abs_tol=1e-9)


def test_window_summary_reports_none_on_gaps():
    end = date(2026, 10, 5)
    days = [end - timedelta(days=i) for i in range(10)]
    cols = {"PRECTOTCORR": {d: 1.0 for d in days[:7]}, "T2M": {d: 30.0 for d in days}, "GWETTOP": {}}
    clim = {"PRECTOTCORR": [2.0] * 366, "T2M": [28.0] * 366, "GWETTOP": [0.6] * 366}
    s = nowcast.window_summary(cols, clim, end, 10)
    assert s["validDays"] == {"PRECTOTCORR": 7, "T2M": 10, "GWETTOP": 0}
    assert s["rainTotalMm"] is None and s["rainPctOfNormal"] is None  # 7 of 10 < 80 %
    assert s["tempMean"] == 30.0
    assert s["wetMean"] is None


def test_last_complete_day_needs_all_parameters():
    cols = {
        "PRECTOTCORR": {date(2026, 10, 5): 1.0, date(2026, 10, 6): 1.0},
        "T2M": {date(2026, 10, 5): 30.0, date(2026, 10, 6): None},
        "GWETTOP": {date(2026, 10, 5): 0.5, date(2026, 10, 6): 0.5},
    }
    assert nowcast.last_complete_day(cols) == date(2026, 10, 5)
    assert nowcast.last_complete_day({"PRECTOTCORR": {}, "T2M": {}, "GWETTOP": {}}) is None


def _packs():
    return [json.loads(p.read_text()) for p in sorted(NOWCAST_DIR.glob("*.json")) if p.name != "index.json"]


def test_every_precomputed_point_has_a_nowcast_pack():
    index = json.loads(PACK_INDEX.read_text())
    expected = {e["id"] for e in index["farms"]} | {e["slug"] for e in index["districts"]}
    packs = {p["id"]: p for p in _packs()}
    assert set(packs) == expected and len(packs) == 70
    coords = {e.get("id") or e["slug"]: (e["lat"], e["lon"]) for e in index["farms"] + index["districts"]}
    for pid, pack in packs.items():
        assert (pack["lat"], pack["lon"]) == coords[pid]


@pytest.mark.parametrize("pack", _packs(), ids=lambda p: p["id"])
def test_committed_summaries_recompute_from_committed_series(pack):
    recent = pack["recent"]
    days = [date.fromisoformat(d) for d in recent["dates"]]
    cols = {p: dict(zip(days, recent[p])) for p in nowcast.PARAMS}
    end = date.fromisoformat(pack["lastCompleteDate"])
    assert days[-1] == end and len(days) == 60
    assert all(len(pack["climatology"][p]) == 366 for p in nowcast.PARAMS)
    for n in ("30", "60"):
        again = nowcast.window_summary(cols, pack["climatology"], end, int(n))
        for key, value in pack["summary"][n].items():
            if isinstance(value, float):
                assert again[key] == pytest.approx(value, abs=1e-9), key
            else:
                assert again[key] == value, key
    assert pack["retrievedUtc"] and pack["source_url"].startswith("https://power.larc.nasa.gov/")


def test_district_table_is_complete_and_matches_csv():
    table = json.loads(DISTRICTS_JSON.read_text(encoding="utf-8"))
    assert table["count"] == 64 and len(table["districts"]) == 64
    index = json.loads(PACK_INDEX.read_text())
    pack_points = {e["slug"]: (e["lat"], e["lon"]) for e in index["districts"]}
    divisions = {}
    for d in table["districts"]:
        assert d["name_bn"] and d["division_bn"]
        assert (d["point"]["lat"], d["point"]["lon"]) == pack_points[d["slug"]]
        assert 20.5 < d["centroid"]["lat"] < 26.7 and 88.0 < d["centroid"]["lon"] < 92.7
        divisions[d["division"]] = divisions.get(d["division"], 0) + 1
    assert divisions == {"Dhaka": 13, "Chattogram": 11, "Khulna": 10, "Rajshahi": 8, "Rangpur": 8, "Barishal": 6, "Sylhet": 4, "Mymensingh": 4}
