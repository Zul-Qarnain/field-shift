"""Usable-rainfall monsoon onset — deterministic, threshold-explicit, per year.

Two rule definitions live here. **v2 is the one the packs and the UI use.**

v2 — local-relative accumulation, adapted from the Moron & Robertson (2014, Int. J.
Climatol. 34:1050–1061) family of definitions. It is *inspired by* that approach, not a
reimplementation of it: their exact window geometry, threshold statistics and significance
testing differ, so we describe it only as "adapted from". A candidate day ``d`` in the search
window is the onset when all three hold:

  (a) ``d`` is a wet day: rainfall(d) >= 1 mm;
  (b) the 5-day rainfall sum starting at ``d`` is >= ``T_local``, where ``T_local`` is the
      **local climatological mean 5-day rainfall of June–September**, computed from the same
      point's own series over the fixed reference period 2001–2025 (every calendar day whose
      date falls in Jun 1–Sep 30 of a reference year contributes one 5-day accumulation;
      ``T_local`` is the mean of those accumulations). The threshold is therefore relative to
      how much rain *this* point normally catches in the monsoon, which is what makes the rule
      usable from Rangpur to Khulna instead of one national constant;
  (c) the 30 days following that 5-day window contain no 10-day period whose total is < 5 mm
      (a real monsoon break, rather than a pre-monsoon burst that dies away).

  Search window: DOY 121–270 (≈1 May – 27 Sep). Onset = FIRST qualifying day, as a DOY.

Why not DOY 145 with a fixed 20 mm window (v1, kept below as the documented rejected option)?
Measured on this same cached POWER series at the six demo farms, the v1 rule reports onset
exactly on the first searchable day in 51–89 % of years (Tangail 78 %, Sylhet 89 %, Rangpur
82 %): Bengal's pre-monsoon *kal-baishakhi* convection already delivers ≥ 20 mm in 7 days with
4 wet days by late May. A metric pinned to the floor of its own window cannot express a shift —
era medians come out equal by construction, and the era comparison is meaningless. Fixed
thresholds tried during the review (5-day ≥ 40/50 mm, 7-day ≥ 60 mm at DOY 145) still left
30–70 % censored, and an anomaly-based (Liebmann-style) definition was far noisier (sd 35–55 d).
v2 with the DOY 121 window brings censoring down to single/double digits and returns no missing
years; every pack records its own `censoredAtWindowStart` share so the reader can see how much
of the signal the window floor still swallows.

Why the reference period is 2001–2025 and not 1981–2025: POWER's PRECTOTCORR is not homogeneous
over the full record (documented source changes; see `src/compute/trends.pettitt` and each pack's
`quality.precipHomogeneity`). Calibrating a "normal" 5-day accumulation on 1981–1996 would bake
the product's dry early segment into the threshold, so the threshold is calibrated on the
homogeneous-enough recent period the indicators also use. Consequence, stated plainly: both eras
share the threshold, so the era comparison tests a change in *arrival order* against a fixed
local yardstick — it is not independent of the reference period.

Input: daily rainfall in mm/day (NASA POWER ``PRECTOTCORR``, or NASA/JAXA GPM IMERG for the cross-check).
Missing days are reindexed onto the full daily calendar and stay NaN. A candidate whose 5-day
window contains any NaN is rejected (we never sum fewer than five days and call it five), and a
NaN cannot confirm a break: an unobserved day resets the dry-run counter. Years whose DOY
121–305 slice is less than 95 % observed return NaN.

Statistics: two eras (2001–2012 vs 2013–latest complete year) with a two-sided Mann-Whitney U
test (scipy). ``shift_days`` = median(era B) − median(era A); positive = onset has moved LATER.
See docs/science/onset.md.
"""

from __future__ import annotations

import math
from typing import Any, Iterable, Sequence

import numpy as np
import pandas as pd
from scipy import stats

RULE_VERSION = "v2"
RULE_LABEL = "Onset definition v2 (local-relative 5-day accumulation, adapted from Moron & Robertson 2014)"
RULE_TEXT = (
    "Onset v2: first wet day (≥ 1 mm) in DOY 121–270 whose 5-day rainfall reaches this point's own "
    "June–September mean 5-day rainfall over 2001–2025, with no 10-day period under 5 mm in the 30 days after."
)
RULE_TEXT_UI = "5-day rainfall ≥ local Jun–Sep mean (2001–2025), no break ≥ 10 days under 5 mm"

# v2 constants
WINDOW_START_DOY = 121
WINDOW_END_DOY = 270
ACCUM_DAYS = 5
WET_DAY_MM = 1.0
BREAK_CHECK_DAYS = 30
BREAK_WINDOW_DAYS = 10
BREAK_MIN_MM = 5.0
REFERENCE_MONTHS = (6, 7, 8, 9)
REFERENCE_PERIOD = (2001, 2025)
MIN_COVERAGE = 0.95

# v1 constants — the rejected option, kept so the pack can show the censoring it produced
V1_WINDOW_START_DOY = 145
V1_WINDOW_END_DOY = 270
V1_ACCUM_DAYS = 7
V1_MIN_WINDOW_MM = 20.0
V1_MIN_WET_DAYS = 4
V1_DRY_SPELL_DAYS = 7

ERA_A = (2001, 2012)
ERA_B = (2013, None)  # None = latest complete year in the data


def _year_calendar(rainfall: pd.Series, year: int) -> pd.Series:
    """Reindex one year onto its full daily calendar so windows count real days."""
    days = pd.date_range(f"{year:04d}-01-01", f"{year:04d}-12-31", freq="D")
    subset = rainfall[rainfall.index.year == year]
    return subset[~subset.index.duplicated(keep="first")].reindex(days)


def _rolling_sums(values: np.ndarray, days: int) -> np.ndarray:
    """Sum of ``days`` consecutive values starting at each index; NaN if any day in the window is NaN.

    Result is shorter than the input by (days - 1): position i covers values[i : i + days].
    """
    length = values.size
    if length < days:
        return np.full(0, np.nan)
    valid = ~np.isnan(values)
    filled = np.where(valid, values, 0.0)
    prefix = np.concatenate(([0.0], np.cumsum(filled)))
    counts = np.concatenate(([0], np.cumsum(valid)))
    positions = np.arange(length - days + 1)
    sums = prefix[positions + days] - prefix[positions]
    complete = counts[positions + days] - counts[positions] == days
    return np.where(complete, sums, np.nan)


def local_threshold(
    rainfall: pd.Series,
    reference_period: tuple[int, int] = REFERENCE_PERIOD,
    months: Iterable[int] = REFERENCE_MONTHS,
    days: int = ACCUM_DAYS,
) -> float:
    """Mean ``days``-day rainfall accumulation over Jun–Sep of the reference period, this point only."""
    low, high = reference_period
    calendar = pd.date_range(f"{low:04d}-01-01", f"{high:04d}-12-31", freq="D")
    aligned = rainfall[~rainfall.index.duplicated(keep="first")].reindex(calendar)
    sums = _rolling_sums(aligned.to_numpy(dtype="float64"), days)
    if sums.size == 0:
        return math.nan
    start_months = calendar[: sums.size].month.isin(list(months))
    picked = sums[start_months]
    picked = picked[~np.isnan(picked)]
    if picked.size == 0:
        return math.nan
    return float(np.mean(picked))


def onset_for_year(
    rainfall: pd.Series,
    year: int,
    *,
    rule: str = "v2",
    threshold_mm: float | None = None,
    window_start_doy: int | None = None,
    window_end_doy: int = WINDOW_END_DOY,
    accum_days: int = ACCUM_DAYS,
    wet_day_mm: float = WET_DAY_MM,
    break_check_days: int = BREAK_CHECK_DAYS,
    break_window_days: int = BREAK_WINDOW_DAYS,
    break_min_mm: float = BREAK_MIN_MM,
    min_coverage: float = MIN_COVERAGE,
) -> float:
    """Onset DOY for ``year`` under rule v2 (or the rejected v1), or NaN when nothing qualifies."""
    if rule == "v2":
        threshold = threshold_mm if threshold_mm is not None else local_threshold(rainfall)
        return _onset_v2(
            rainfall, year, threshold,
            window_start=window_start_doy if window_start_doy is not None else WINDOW_START_DOY,
            window_end=window_end_doy, accum_days=accum_days, wet_day_mm=wet_day_mm,
            break_check_days=break_check_days, break_window_days=break_window_days,
            break_min_mm=break_min_mm, min_coverage=min_coverage,
        )
    if rule == "v1":
        return _onset_v1(
            rainfall, year,
            window_start=window_start_doy if window_start_doy is not None else V1_WINDOW_START_DOY,
            window_end=window_end_doy, accum_days=V1_ACCUM_DAYS, min_mm=V1_MIN_WINDOW_MM,
            wet_day_mm=wet_day_mm, min_wet_days=V1_MIN_WET_DAYS,
            dry_spell_days=V1_DRY_SPELL_DAYS, break_check_days=break_check_days, min_coverage=min_coverage,
        )
    raise ValueError(f"unknown onset rule {rule!r} (use 'v2' or 'v1')")


def _observed_ok(values: np.ndarray, window_start: int, last_needed: int, min_coverage: float) -> bool:
    slice_ = values[window_start - 1 : min(last_needed, values.size)]
    if slice_.size == 0:
        return False
    return float(np.mean(~np.isnan(slice_))) >= min_coverage


def _onset_v2(
    rainfall: pd.Series, year: int, threshold_mm: float, *, window_start: int, window_end: int,
    accum_days: int, wet_day_mm: float, break_check_days: int, break_window_days: int,
    break_min_mm: float, min_coverage: float,
) -> float:
    if threshold_mm is None or math.isnan(threshold_mm):
        return math.nan
    values = _year_calendar(rainfall, year).to_numpy(dtype="float64")
    if values.size == 0:
        return math.nan
    last_needed = window_end + accum_days + break_check_days
    if not _observed_ok(values, window_start, last_needed, min_coverage):
        return math.nan

    accum = _rolling_sums(values, accum_days)
    break_accum = _rolling_sums(values, break_window_days)
    for start in range(window_start - 1, min(window_end, values.size - accum_days)):
        if math.isnan(values[start]) or values[start] < wet_day_mm:
            continue  # (a) the candidate day itself must be a wet day
        total = accum[start]
        if math.isnan(total) or total < threshold_mm:
            continue  # (b) 5-day accumulation vs this point's own monsoon normal
        # (c) no 10-day period under 5 mm in the 30 days following the accumulation window
        first = start + accum_days
        last = min(first + break_check_days, values.size - break_window_days)
        broken = False
        for position in range(first, max(first, last)):
            span = break_accum[position]
            if math.isnan(span):
                continue  # an unobserved span cannot confirm a break
            if span < break_min_mm:
                broken = True
                break
        if broken:
            continue
        return float(start + 1)
    return math.nan


def _onset_v1(
    rainfall: pd.Series, year: int, *, window_start: int, window_end: int, accum_days: int,
    min_mm: float, wet_day_mm: float, min_wet_days: int, dry_spell_days: int,
    break_check_days: int, min_coverage: float,
) -> float:
    """The originally specified fixed-threshold rule, kept only to document its censoring."""
    values = _year_calendar(rainfall, year).to_numpy(dtype="float64")
    if values.size == 0:
        return math.nan
    if not _observed_ok(values, window_start, window_end + accum_days + break_check_days, min_coverage):
        return math.nan
    accum = _rolling_sums(values, accum_days)
    for start in range(window_start - 1, min(window_end, values.size - accum_days)):
        window = values[start : start + accum_days]
        if math.isnan(accum[start]) or accum[start] < min_mm:
            continue
        if int(np.sum(window >= wet_day_mm)) < min_wet_days:
            continue
        run = 0
        broken = False
        for value in values[start + accum_days : start + accum_days + break_check_days]:
            if math.isnan(value) or value >= wet_day_mm:
                run = 0
            else:
                run += 1
                if run >= dry_spell_days:
                    broken = True
                    break
        if broken:
            continue
        return float(start + 1)
    return math.nan


def onset_series(
    rainfall: pd.Series,
    years: Sequence[int] | None = None,
    *,
    rule: str = "v2",
    threshold_mm: float | None = None,
    **kwargs: Any,
) -> pd.Series:
    """Per-year onset DOY (NaN where no usable onset) for every complete year."""
    if years is None:
        years = complete_years(rainfall)
    if rule == "v2" and threshold_mm is None:
        threshold_mm = local_threshold(rainfall)
    values = {
        year: onset_for_year(rainfall, year, rule=rule, threshold_mm=threshold_mm, **kwargs) for year in years
    }
    return pd.Series(values, name="onset_doy", dtype="float64").sort_index()


def censoring(onsets: pd.Series, window_start: int = WINDOW_START_DOY) -> dict[str, Any]:
    """How many detected onsets sit on the first searchable day — the metric's own floor."""
    detected = onsets.dropna()
    if detected.empty:
        return {"count": 0, "of": 0, "sharePct": None}
    count = int((detected <= window_start + 0.5).sum())
    return {"count": count, "of": int(detected.size), "sharePct": count / detected.size * 100}


def complete_years(frame: pd.DataFrame | pd.Series, max_doy: int = 366) -> list[int]:
    """Years whose data reaches the end of the calendar year (no partial final year)."""
    series = frame if isinstance(frame, pd.Series) else frame.iloc[:, 0]
    coverage = pd.DataFrame({"year": series.index.year, "doy": series.index.dayofyear, "value": series.to_numpy()})
    coverage = coverage[coverage["value"].notna()]
    if coverage.empty:
        return []
    last_doy = coverage.groupby("year")["doy"].max()
    return sorted(int(year) for year in last_doy[last_doy >= max_doy - 1].index)


def split_eras(
    onsets: pd.Series,
    era_a: tuple[int, int] = ERA_A,
    era_b: tuple[int, int | None] = ERA_B,
) -> tuple[list[float], list[float], int]:
    """Split a per-year onset series into the two eras; ``era_b[1] = None`` uses the latest year."""
    if not isinstance(onsets, pd.Series):
        raise TypeError("onsets must be a pandas Series indexed by year")
    latest = int(onsets.index.max())
    b_end = int(era_b[1]) if era_b[1] is not None else latest

    def _era(low: int, high: int) -> list[float]:
        slice_ = onsets.loc[(onsets.index >= low) & (onsets.index <= high)]
        return [float(v) for v in slice_.dropna()]

    return _era(int(era_a[0]), int(era_a[1])), _era(int(era_b[0]), b_end), b_end


def compare_eras(
    onsets: pd.Series,
    era_a: tuple[int, int] = ERA_A,
    era_b: tuple[int, int | None] = ERA_B,
) -> dict[str, Any]:
    """Two-era onset comparison: medians, shift in days, two-sided Mann-Whitney U p-value."""
    a, b, b_end = split_eras(onsets, era_a, era_b)

    def _years(low: int, high: int) -> list[int]:
        slice_ = onsets.loc[(onsets.index >= low) & (onsets.index <= high)]
        return [int(year) for year in slice_.dropna().index]

    out = {
        "eraA": {"label": f"{era_a[0]}–{era_a[1]}", "years": _years(int(era_a[0]), int(era_a[1])), "values": a, "n": len(a)},
        "eraB": {"label": f"{era_b[0]}–{b_end}", "years": _years(int(era_b[0]), b_end), "values": b, "n": len(b)},
        "medianA": float(np.median(a)) if a else math.nan,
        "medianB": float(np.median(b)) if b else math.nan,
        "shiftDays": float(np.median(b) - np.median(a)) if a and b else math.nan,
        "pValue": math.nan,
        "uStatistic": math.nan,
        "direction": "unknown",
    }
    if len(a) >= 2 and len(b) >= 2:
        try:
            test = stats.mannwhitneyu(a, b, alternative="two-sided")
            out["pValue"] = float(test.pvalue)
            out["uStatistic"] = float(test.statistic)
        except ValueError:  # e.g. both eras are a single repeated value
            pass
        if not math.isnan(out["shiftDays"]) and out["shiftDays"] != 0:
            out["direction"] = "later" if out["shiftDays"] > 0 else "earlier"
    return out
