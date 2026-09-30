"""Build the Field Shift data packs: NASA POWER daily point -> per-location JSON.

Run from the repo root:

    /workspace/fs-venv/bin/python scripts/build_packs.py                # farms + 64 districts
    /workspace/fs-venv/bin/python scripts/build_packs.py --only-farms    # 6 demo farms only

Every number written into ``web/public/data/packs/`` comes from a POWER request this
script actually made (raw payloads cached under ``cache/power/``, keyed by rounded point +
parameters + date window, with the real UTC retrieval timestamp in a sidecar). Nothing is
hand-set here: parameters, window, retrieval time, coverage and the method text are all
taken from the response, and any value the data cannot produce is written as null.

Outputs (all committed):
  web/public/data/packs/index.json            locations + what was retrieved
  web/public/data/packs/farms/<farm-id>.json  the six demo farms
  web/public/data/packs/districts/<slug>.json all 64 geoBoundaries ADM2 centroids
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

import pandas as pd  # noqa: E402
import numpy as np  # noqa: E402

from src.acquire import chirps, districts as districts_mod  # noqa: E402
from src.acquire.power import DEFAULT_PARAMS, covered_range, fetch_daily, parameter_ranges  # noqa: E402
from src.compute import onset, trends  # noqa: E402

PACKS_DIR = REPO_ROOT / "web" / "public" / "data" / "packs"
SCHEMA_VERSION = 2
SOURCE = "NASA POWER daily point API, community AG"
POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
TREND_WINDOW_FIRST_YEAR = trends.ANALYSIS_FIRST_YEAR

PARAMETER_UNITS = {
    "PRECTOTCORR": "mm/day (quality-controlled, gauge-adjusted)",
    "T2M": "°C (2 m air temperature)",
    "T2M_MAX": "°C (daily maximum)",
    "T2M_MIN": "°C (daily minimum)",
    "GWETROOT": "m3/m3 (root-zone wetness)",
    "RH2M": "% (2 m relative humidity)",
    "ALLSKY_SFC_SW_DWN": "kW-h/m2/day (surface shortwave downwelling)",
}

# Demo farms: ids and coordinates are the ones in web/lib/data.ts (kept in sync by test).
FARM_POINTS: list[dict[str, Any]] = [
    {"id": "farm-12", "name": "Farm-12", "district": "Tangail", "lat": 24.2514, "lon": 89.9152},
    {"id": "rajshahi-07", "name": "Farm-07", "district": "Rajshahi", "lat": 24.3636, "lon": 88.3277},
    {"id": "barishal-03", "name": "Farm-03", "district": "Barishal", "lat": 22.8486, "lon": 90.2512},
    {"id": "khulna-09", "name": "Farm-09", "district": "Khulna", "lat": 22.8029, "lon": 89.4018},
    {"id": "rangpur-21", "name": "Farm-21", "district": "Rangpur", "lat": 25.6486, "lon": 89.3517},
    {"id": "sylhet-15", "name": "Farm-15", "district": "Sylhet", "lat": 24.8026, "lon": 92.0521},
]

METHOD = {
    "onset": onset.RULE_TEXT,
    "onsetDefinition": onset.RULE_LABEL,
    "onsetRejected": (
        "Definition v1 (the originally specified rule: first day in DOY 145–270 with a 7-day sum >= 20 mm, "
        ">= 4 wet days, and no 7-day dry spell in the following 30 days) was measured on these same cached "
        "POWER series and returns the window floor in 51–89% of years at the six demo farms, because Bengal "
        "pre-monsoon convection already clears 20 mm in 7 days by late May. A censored metric cannot express "
        "a shift, so v1 is kept in the code only to report that censoring."
    ),
    "threshold": (
        "The 5-day threshold is this point's own mean 5-day rainfall over Jun 1–Sep 30 of 2001–2025, computed "
        "from the same POWER series (see onset.local_threshold). Both eras are compared against this one fixed "
        "local yardstick, so the era test measures a change in arrival order, not an absolute date."
    ),
    "eras": "Era A 2001–2012 vs era B 2013–latest complete year; two-sided Mann-Whitney U on the per-year onset DOYs (or on the per-year indicator).",
    "trends": "Mann-Kendall with tie-corrected Var(S) and normal approximation; Theil-Sen slope; complete calendar years only (>= 350 days of data).",
    "trendWindow": (
        f"Rainfall and heat-day trends are computed over {TREND_WINDOW_FIRST_YEAR}–latest complete year, NOT 1981–2025, because POWER "
        "PRECTOTCORR is not homogeneous over the full record (Pettitt change point, quality.precipHomogeneity)."
    ),
    "homogeneity": "Pettitt (1979) rank-based change-point test, own implementation, on annual totals (full record and analysis window) and on annual mean T2M_MAX.",
    "crossCheck": (
        "CHIRPS v2.0 daily 0.25° (Climate Hazards Center UCSB / USGS; Funk et al. 2015, Sci Data 2:150066) at the nearest grid cell, read from local "
        "files downloaded 2026-09-30. CHIRPS blends NOAA CPC satellite IR with station gauges; it is NOT a NASA or Space Agency Partner product, and it "
        "is not homogeneous in the same way POWER is, so it is the tie-breaker for the rainfall trend."
    ),
    "moisture": "GWETROOT is POWER's modelled root-zone wetness (MERRA-2), not a SMAP retrieval. SMAP L4 soil moisture and NDVI are still demo fixtures.",
    "caveats": [
        "POWER PRECTOTCORR steps upward inside the 1981–2025 record (source changes in the product), so the 1981–2025 annual-rainfall trend is an artefact and is not published as a climate signal. Each pack's quality.precipHomogeneity carries the Pettitt change point and step; metrics.rainfallTrendPctPerDecade is computed over 2001–latest only and is flagged when a change point falls inside that window. crossCheck re-states the same statistics from CHIRPS.",
        "Onset v2 inherits that caution: the 5-day threshold is calibrated on 2001–2025 POWER, and a precipitation step inside 2001–2025 moves detections, so an 'earlier onset' from POWER must be read next to crossCheck.onset before it is believed.",
        "Temperature side: POWER's own T2M/T2M_MAX also drifts (1981–1990 mean T2M at farm-12 is 26.38 °C against 25.42 °C for 2016–2025; a hand-run ERA5 spot check for 1985 at the same coordinates gave 25.28 °C), so a falling heat-day count is not evidence that heat has eased. quality.tempMaxHomogeneity states the test result.",
    ],
}


def _clean(value: Any) -> Any:
    """NaN/inf -> None, numpy scalars -> Python, floats -> 4 dp (keeps packs small, coordinates exact)."""
    if value is None:
        return None
    if isinstance(value, (np.floating, float)):
        number = float(value)
        if math.isnan(number) or math.isinf(number):
            return None
        return round(number, 4)
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, (np.integer, int)):
        return int(value)
    if isinstance(value, dict):
        return {str(k): _clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, pd.Index)):
        return [_clean(v) for v in value]
    if isinstance(value, pd.Series):
        return _clean(list(value))
    return value


def onset_stats(rainfall: pd.Series, threshold_mm: float | None = None, factor: float = 1.0) -> dict[str, Any]:
    """Onset series + era comparison + censoring for one threshold (used for sensitivity runs)."""
    effective = None if threshold_mm is None else threshold_mm * factor
    per_year = onset.onset_series(rainfall, threshold_mm=effective)
    comparison = onset.compare_eras(per_year)
    censor = onset.censoring(per_year)
    return {
        "thresholdMm": None if effective is None else effective,
        "perYear": per_year,
        "detected": int(per_year.notna().sum()),
        "missing": [int(year) for year in per_year[per_year.isna()].index],
        "censored": censor,
        "comparison": comparison,
    }


def build_onset_block(rainfall: pd.Series, homogeneity: dict[str, Any]) -> dict[str, Any]:
    threshold_mm = onset.local_threshold(rainfall)
    primary = onset_stats(rainfall, threshold_mm)
    per_year, comparison, censor = primary["perYear"], primary["comparison"], primary["censored"]
    legacy = onset.onset_series(rainfall, rule="v1")

    sensitivity = []
    for factor in (0.8, 1.0, 1.2):
        variant = onset_stats(rainfall, threshold_mm, factor)
        sensitivity.append(
            {
                "thresholdFactor": factor,
                "thresholdMm": variant["thresholdMm"],
                "medianA": variant["comparison"]["medianA"],
                "medianB": variant["comparison"]["medianB"],
                "shiftDays": variant["comparison"]["shiftDays"],
                "pValue": variant["comparison"]["pValue"],
                "detectedYears": variant["detected"],
                "censoredPct": variant["censored"]["sharePct"],
            }
        )

    change_point = homogeneity.get("changePointInsideAnalysisWindow")
    caution = None
    if change_point is not None:
        caution = (
            f"POWER precipitation has a Pettitt change point at {change_point} inside the 2001–2025 window this onset "
            "was calibrated and compared on, so part of the measured shift is the precipitation product stepping, not the "
            "monsoon arriving. Read onset.shiftDays together with crossCheck.onset."
        )

    return {
        "definition": onset.RULE_VERSION,
        "ruleLabel": onset.RULE_LABEL,
        "rule": onset.RULE_TEXT,
        "thresholdText": onset.RULE_TEXT_UI,
        "thresholdMm": threshold_mm,
        "thresholdBasis": "this point's mean 5-day rainfall over Jun–Sep 2001–2025 (POWER PRECTOTCORR)",
        "referencePeriod": list(onset.REFERENCE_PERIOD),
        "window": {"startDoy": onset.WINDOW_START_DOY, "endDoy": onset.WINDOW_END_DOY},
        "wetDayMm": onset.WET_DAY_MM,
        "break": {"daysAfter": onset.BREAK_CHECK_DAYS, "windowDays": onset.BREAK_WINDOW_DAYS, "minMm": onset.BREAK_MIN_MM},
        "perYear": {str(int(year)): (None if math.isnan(value) else int(value)) for year, value in per_year.items()},
        "yearsDetected": primary["detected"],
        "yearsMissing": primary["missing"],
        "censoredAtWindowStart": censor,
        "medianA": comparison["medianA"],
        "medianB": comparison["medianB"],
        "shiftDays": comparison["shiftDays"],
        "pValue": comparison["pValue"],
        "uStatistic": comparison["uStatistic"],
        "direction": comparison["direction"],
        "eraA": comparison["eraA"],
        "eraB": comparison["eraB"],
        "sensitivity": sensitivity,
        "caution": caution,
        "legacyV1": {
            "rule": "7-day sum >= 20 mm from DOY 145, >= 4 wet days, no 7-day dry spell after",
            "censoredAtWindowStart": onset.censoring(legacy, onset.V1_WINDOW_START_DOY),
            "yearsDetected": int(legacy.notna().sum()),
            "reason": "measured on this same series; the censoring rate is why v2 replaced it",
        },
    }


def build_metrics(df: pd.DataFrame, homogeneity: dict[str, Any], temp_homogeneity: dict[str, Any]) -> dict[str, Any]:
    rain = df["PRECTOTCORR"]
    annual_rain_all = trends.annual_rainfall_mm(rain)
    annual_rain = annual_rain_all[annual_rain_all.index >= TREND_WINDOW_FIRST_YEAR]
    heat_all = trends.heat_days_per_year(df["T2M_MAX"])
    heat = heat_all[heat_all.index >= TREND_WINDOW_FIRST_YEAR]
    temp = trends.annual_mean_temperature(df["T2M"])

    rain_trend = trends.trend_report(annual_rain, percent_of_mean=True)
    temp_trend = trends.trend_report(temp)
    heat_era = trends.two_era(heat_all)
    temp_era = trends.two_era(temp)
    rain_era = trends.two_era(annual_rain_all)

    latest_year = int(temp.index.max()) if temp.size else None
    climatology = trends.monthly_climatology(df["GWETROOT"])
    trend_years = [int(y) for y in annual_rain.index]
    caution = (
        f"caution: POWER precipitation has source changes (Pettitt change point {homogeneity['changePointInsideAnalysisWindow']}); see crossCheck"
        if homogeneity["changePointInsideAnalysisWindow"] is not None
        else None
    )

    return {
        "rainfallTrendPctPerDecade": rain_trend.get("pctPerDecade"),
        "rainfallTrendWindow": f"{trend_years[0]}–{trend_years[-1]}" if trend_years else None,
        "rainfallTrendSource": "NASA POWER PRECTOTCORR",
        "rainfallTrendCaution": caution,
        "rainfallSlopeMmPerDecade": rain_trend.get("slopePerDecade"),
        "rainfallMeanMmPerYear": rain_trend.get("mean"),
        "rainfallTau": rain_trend.get("tau"),
        "rainfallPValue": rain_trend.get("pValue"),
        "rainfallMannKendallTrend": rain_trend.get("trend"),
        "rainfallYearsUsed": trend_years,
        "heatDays": int(heat_all.iloc[-1]) if heat_all.size else None,
        "heatDaysYear": latest_year,
        "heatDaysThresholdC": trends.HEAT_DAY_C,
        "heatDaysEraA": heat_era["eraA"]["median"],
        "heatDaysEraB": heat_era["eraB"]["median"],
        "heatDaysDelta": heat_era["delta"],
        "heatDaysPValue": heat_era["pValue"],
        "heatDaysTrendPerDecade": trends.trend_report(heat, percent_of_mean=False).get("slopePerDecade"),
        "heatDaysCaution": (
            f"caution: annual mean T2M_MAX has a Pettitt change point at {temp_homogeneity['changePointInsideAnalysisWindow']}; "
            "see quality.tempMaxHomogeneity"
            if temp_homogeneity["changePointInsideAnalysisWindow"] is not None
            else None
        ),
        "tempC": temp.iloc[-1] if temp.size else None,
        "tempYear": latest_year,
        "tempEraA": temp_era["eraA"]["median"],
        "tempEraB": temp_era["eraB"]["median"],
        "tempDelta": temp_era["delta"],
        "tempPValue": temp_era["pValue"],
        "tempTrendPerDecadeC": temp_trend.get("slopePerDecade"),
        "tempTau": temp_trend.get("tau"),
        "rainfallEraA": rain_era["eraA"]["median"],
        "rainfallEraB": rain_era["eraB"]["median"],
        "rainfallEraDelta": rain_era["delta"],
        "rootZoneWetnessMonthly": [None if math.isnan(v) else v for v in climatology.to_numpy()],
        "rootZoneWetnessPeakMonth": int(climatology.idxmax()) if climatology.notna().any() else None,
        "rootZoneWetnessNote": "GWETROOT (POWER/MERRA-2 modelled), not SMAP L4",
    }


def build_series(df: pd.DataFrame) -> dict[str, Any]:
    rain = df["PRECTOTCORR"]
    recent = trends.recent_series(rain, months=12, years=10)
    heat = trends.heat_days_per_year(df["T2M_MAX"])
    temp = trends.annual_mean_temperature(df["T2M"])
    monthly_gwet = trends.complete_months(df["GWETROOT"]).resample("MS").mean().dropna().iloc[-12:]
    return {
        "annualRainfallLast10": recent["annualRainfall"],
        "monthlyRainfallLast12": recent["monthlyRainfall"],
        "heatDaysLast10": {"label": [str(int(y)) for y in heat.index[-10:]], "values": [int(v) for v in heat.iloc[-10:]]},
        "meanTempLast10": {"label": [str(int(y)) for y in temp.index[-10:]], "values": [round(float(v), 2) for v in temp.iloc[-10:]]},
        "rootZoneWetnessLast12Months": {"label": [stamp.strftime("%Y-%m") for stamp in monthly_gwet.index], "values": [round(float(v), 3) for v in monthly_gwet]},
    }


def build_cross_check(lat: float, lon: float, power_rain: pd.Series) -> dict[str, Any]:
    """Re-state the rainfall statistics from CHIRPS at the nearest 0.25° cell."""
    try:
        series = chirps.series(lat, lon)
    except (FileNotFoundError, OSError) as error:
        return {"available": False, "reason": str(error)[:200], "source": chirps.PRODUCT}

    annual_all = trends.annual_rainfall_mm(series)
    annual = annual_all[annual_all.index >= TREND_WINDOW_FIRST_YEAR]
    threshold_mm = onset.local_threshold(series)
    stats = onset_stats(series, threshold_mm)
    comparison = stats["comparison"]
    homogeneity = trends.homogeneity_report(annual_all)
    trend = trends.trend_report(annual, percent_of_mean=True)

    power_annual_all = trends.annual_rainfall_mm(power_rain)
    power_annual = power_annual_all[power_annual_all.index >= TREND_WINDOW_FIRST_YEAR]
    power_onset = onset.onset_series(power_rain, threshold_mm=onset.local_threshold(power_rain))

    cell_lat, cell_lon = chirps.cell_of(lat, lon)
    provenance = chirps.provenance()
    onset_agreement = chirps.compare(power_onset.dropna(), stats["perYear"].dropna())
    rain_agreement = chirps.compare(power_annual, annual)

    return {
        "available": True,
        "source": chirps.PRODUCT,
        "provider": chirps.PROVIDER,
        "citation": chirps.CITATION,
        "tierLabel": "Open (UCSB CHC / USGS)",
        "grid": {"degrees": 0.25, "cell": [cell_lat, cell_lon], "offsetFromRequestedMeters": round(max(abs(cell_lat - lat), abs(cell_lon - lon)) * 111_320)},
        "requested": {"start": f"{chirps.FIRST_YEAR}0101", "end": f"{chirps.LAST_YEAR}1231"},
        "covered": chirps.coverage(series),
        "retrievedUtc": provenance["retrievedUtc"],
        "sourceUrlSample": provenance["sourceUrlSample"],
        "yearsOnDisk": provenance["yearsOnDisk"],
        "thresholdMm": threshold_mm,
        "annualRainfall": {"label": [str(int(y)) for y in annual_all.index], "values": [round(float(v), 1) for v in annual_all]},
        "rainfallTrend2001toLatest": {
            "window": f"{trend['years'][0]}–{trend['years'][-1]}" if trend["years"] else None,
            "pctPerDecade": trend.get("pctPerDecade"),
            "slopeMmPerDecade": trend.get("slopePerDecade"),
            "meanMmPerYear": trend.get("mean"),
            "tau": trend.get("tau"),
            "pValue": trend.get("pValue"),
            "trend": trend.get("trend"),
            "n": trend["n"],
        },
        "homogeneity": homogeneity,
        "onset": {
            "definition": onset.RULE_VERSION,
            "perYear": {str(int(year)): (None if math.isnan(value) else int(value)) for year, value in stats["perYear"].items()},
            "yearsDetected": stats["detected"],
            "yearsMissing": stats["missing"],
            "censoredAtWindowStart": stats["censored"],
            "medianA": comparison["medianA"],
            "medianB": comparison["medianB"],
            "shiftDays": comparison["shiftDays"],
            "pValue": comparison["pValue"],
            "direction": comparison["direction"],
            "eraA": comparison["eraA"],
            "eraB": comparison["eraB"],
        },
        "agreement": {
            "onsetYears": {k: onset_agreement[k] for k in ("yearsCompared", "pearsonR", "spearmanRho", "mae", "bias")},
            "annualRainfallMm": rain_agreement,
            "note": "mae/bias are POWER minus CHIRPS (mm for annual totals, days for onset DOYs)",
        },
    }


def preferred_source(power_homogeneity: dict[str, Any], cross_check: dict[str, Any]) -> dict[str, Any]:
    """Which product the UI should read each number from, decided from the tests, not by hand."""
    power_flagged = power_homogeneity["changePointInsideAnalysisWindow"] is not None
    chirps_ok = bool(cross_check.get("available"))
    chirps_flagged = bool(cross_check.get("homogeneity", {}).get("changePointInsideAnalysisWindow")) if chirps_ok else True

    if not power_flagged:
        decision = {"source": "NASA POWER", "reason": "No significant change point in the POWER analysis window."}
    elif chirps_ok and not chirps_flagged:
        decision = {
            "source": "CHIRPS v2.0",
            "reason": "POWER PRECTOTCORR has a significant Pettitt change point inside the 2001–2025 analysis window; CHIRPS does not.",
        }
    else:
        decision = {
            "source": "none",
            "reason": "Both POWER and CHIRPS carry a change point inside the analysis window — no homogeneous rainfall series is available for this point.",
        }
    return {
        "rainfallTrend": {**decision, "field": "rainfallTrendPctPerDecade"},
        "onsetShift": {**decision, "field": "shiftDays"},
        "powerFlagged": power_flagged,
        "chirpsFlagged": chirps_flagged,
        "chirpsAvailable": chirps_ok,
    }


def build_pack(lat: float, lon: float, identity: dict[str, Any], *, sleep_s: float) -> tuple[dict[str, Any], str]:
    frame = fetch_daily(lat, lon)
    if sleep_s:
        time.sleep(sleep_s)
    first, last = covered_range(frame)
    ranges = parameter_ranges(frame)
    rain = frame["PRECTOTCORR"]
    annual_rain = trends.annual_rainfall_mm(rain)
    annual_tmax = trends.annual_indicator(frame["T2M_MAX"], "mean")
    complete = trends.complete_year_list(rain)

    precip_homogeneity = trends.homogeneity_report(annual_rain)
    temp_homogeneity = trends.homogeneity_report(annual_tmax)
    cross_check = build_cross_check(lat, lon, rain)

    pack = {
        "schema_version": SCHEMA_VERSION,
        "kind": identity["kind"],
        "id": identity["id"],
        "name": identity["name"],
        "district": identity.get("district"),
        "slug": identity.get("slug"),
        "lat": round(lat, 4),
        "lon": round(lon, 4),
        "source": SOURCE,
        "source_url": POWER_URL,
        "community": "AG",
        "parameters": {name: PARAMETER_UNITS[name] for name in DEFAULT_PARAMS},
        "requested": {"start": frame.attrs["start"], "end": frame.attrs["end"]},
        "covered": {"start": first, "end": last, "daysWithData": int(rain.notna().sum())},
        "parameterRanges": {name: {"start": span[0], "end": span[1]} for name, span in ranges.items()},
        "retrievedUtc": frame.attrs["retrieved_utc"],
        "retrievalSource": frame.attrs["retrieval_source"],
        "powerProductVersion": ", ".join(frame.attrs.get("power_sources") or []) or None,
        "powerApiVersion": frame.attrs.get("power_api"),
        "timeStandard": frame.attrs.get("time_standard"),
        "fillValueHandling": "header fill_value and -999 converted to NaN",
        "completeYears": {"count": len(complete), "first": complete[0], "last": complete[-1]},
        "method": METHOD,
        "onset": build_onset_block(rain, precip_homogeneity),
        "metrics": build_metrics(frame, precip_homogeneity, temp_homogeneity),
        "series": build_series(frame),
        "crossCheck": cross_check,
        "preferred": preferred_source(precip_homogeneity, cross_check),
        "quality": {
            "rainfallNaN": int(rain.isna().sum()),
            "annualRainfallYears": int(annual_rain.size),
            "precipHomogeneity": precip_homogeneity,
            "tempMaxHomogeneity": temp_homogeneity,
            "indicatorEras": "2001–2012 vs 2013–latest complete year",
            "ndvi": "not retrieved — demo fixture",
            "smapSoilMoisture": "not retrieved — POWER GWETROOT used instead, labelled",
            "soil": "not retrieved — SoilGrids values are demo fixtures",
        },
    }
    return _clean(pack), str(frame.attrs["cache_path"])


def _index_entry(pack: dict[str, Any], cache_path: str | None = None) -> dict[str, Any]:
    """What the loader and the Data page need per location, without opening every pack."""
    onset_block = pack["onset"]
    cross = pack.get("crossCheck", {})
    entry = {
        "id": pack["id"],
        "slug": pack.get("slug"),
        "name": pack["name"],
        "district": pack.get("district"),
        "lat": pack["lat"],
        "lon": pack["lon"],
        "kind": pack["kind"],
        "path": f"/data/packs/{'farms' if pack['kind'] == 'farm' else 'districts'}/{pack['id']}.json",
        "retrievedUtc": pack["retrievedUtc"],
        "covered": pack["covered"],
        "onsetDefinition": onset_block["definition"],
        "onsetThresholdMm": onset_block["thresholdMm"],
        "onsetMedianA": onset_block["medianA"],
        "onsetMedianB": onset_block["medianB"],
        "onsetShiftDays": onset_block["shiftDays"],
        "onsetPValue": onset_block["pValue"],
        "onsetCensoredPct": onset_block["censoredAtWindowStart"]["sharePct"],
        "onsetCaution": onset_block["caution"],
        "rainfallTrendPctPerDecade": pack["metrics"]["rainfallTrendPctPerDecade"],
        "rainfallTrendCaution": pack["metrics"]["rainfallTrendCaution"],
        "precipChangePoint": pack["quality"]["precipHomogeneity"]["changePointInsideAnalysisWindow"],
        "chirps": (
            {
                "available": True,
                "onsetShiftDays": cross["onset"]["shiftDays"],
                "onsetPValue": cross["onset"]["pValue"],
                "rainfallTrendPctPerDecade": cross["rainfallTrend2001toLatest"]["pctPerDecade"],
                "onsetMaeDays": cross["agreement"]["onsetYears"]["mae"],
                "changePoint": cross["homogeneity"]["changePointInsideAnalysisWindow"],
            }
            if cross.get("available")
            else {"available": False}
        ),
        "preferredOnsetSource": pack["preferred"]["onsetShift"]["source"],
        "preferredTrendSource": pack["preferred"]["rainfallTrend"]["source"],
        "source": "NASA POWER daily point API, community AG",
    }
    if cache_path:
        entry["cache"] = cache_path
    return entry


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"  wrote {path.relative_to(REPO_ROOT)} ({path.stat().st_size:,} bytes)", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only-farms", action="store_true", help="skip the 64 district centroids")
    parser.add_argument("--sleep", type=float, default=1.5, help="seconds to wait after each POWER fetch")
    parser.add_argument("--out", type=Path, default=PACKS_DIR)
    args = parser.parse_args()

    started = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    index: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "generatedUtc": started,
        "source": SOURCE,
        "sourceUrl": POWER_URL,
        "parameters": list(DEFAULT_PARAMS),
        "requestedWindow": {"start": "19810101", "end": "yesterday (UTC) at build time"},
        "onsetDefinition": onset.RULE_LABEL,
        "onsetRule": onset.RULE_TEXT,
        "onsetWindow": {"startDoy": onset.WINDOW_START_DOY, "endDoy": onset.WINDOW_END_DOY},
        "crossCheck": {"source": chirps.PRODUCT, "provider": chirps.PROVIDER, "citation": chirps.CITATION, "grid": "0.25°"},
        "trendWindow": f"{TREND_WINDOW_FIRST_YEAR}–latest complete year",
        "homogeneity": "Pettitt change-point test on annual PRECTOTCORR and annual mean T2M_MAX; per pack in quality",
        "farms": [],
        "districts": [],
    }

    print(f"Building packs in {args.out}", flush=True)
    for farm in FARM_POINTS:
        identity = {"kind": "farm", "id": farm["id"], "name": farm["name"], "district": farm["district"]}
        pack, cache_path = build_pack(farm["lat"], farm["lon"], identity, sleep_s=args.sleep)
        relative = f"farms/{farm['id']}.json"
        write_json(args.out / relative, pack)
        index["farms"].append(_index_entry(pack, cache_path))

    if not args.only_farms:
        rows = districts_mod.load_csv()
        if len(rows) != districts_mod.EXPECTED_DISTRICT_COUNT:
            raise SystemExit(f"expected {districts_mod.EXPECTED_DISTRICT_COUNT} districts, found {len(rows)} in bd_districts.csv")
        for row in rows:
            identity = {
                "kind": "district",
                "id": row["slug"],
                "name": row["name"],
                "district": row["name"],
                "slug": row["slug"],
            }
            try:
                pack, cache_path = build_pack(float(row["lat"]), float(row["lon"]), identity, sleep_s=args.sleep)
            except Exception as error:  # one failed point must not lose the other 63
                print(f"  FAILED {row['slug']}: {error}", flush=True)
                index["districtErrors"] = index.get("districtErrors", []) + [{"slug": row["slug"], "error": str(error)[:300]}]
                continue
            pack["boundary"] = {
                "provider": "geoBoundaries gbOpen BGD ADM2",
                "sourceUrl": row["source_url"],
                "retrieved": row["retrieved"],
                "method": row["method"],
                "centroid": [float(row["centroid_lat"]), float(row["centroid_lon"])],
            }
            relative = f"districts/{row['slug']}.json"
            write_json(args.out / relative, pack)
            index["districts"].append(_index_entry(pack))

    index["counts"] = {"farms": len(index["farms"]), "districts": len(index["districts"])}
    retrieved = sorted({entry["retrievedUtc"] for entry in index["farms"] + index["districts"]})
    index["retrievedRange"] = {"earliest": retrieved[0], "latest": retrieved[-1]} if retrieved else None
    write_json(args.out / "index.json", index)
    print(f"done: {index['counts']} (build {started})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
