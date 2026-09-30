"""Trend statistics for the annual climate indicators: Mann-Kendall + Theil-Sen.

Mann-Kendall is implemented here (not pulled from a package) so the tie correction and
the variance formula are auditable: S = sign(x_j − x_i) summed over all i < j, and
Var(S) = [n(n−1)(2n+5) − Σ t(t−1)(2t+1)] / 18 with one term per tied group of size t.
The standard normal approximation with a continuity correction gives Z and a two-sided
p-value; it is valid for n >= 8, which annual series always satisfy. Kendall tau is the
same S normalised by the number of comparable pairs (tau-b, tie-corrected in the
denominator) — reported alongside the p-value because tau, not p, is the effect size.

Theil-Sen slope (scipy.stats.theilslopes) is the median of all pairwise slopes: robust to
the outlier years that dominate Bangladesh rainfall, so a "mm per decade" figure quoted in
the UI is never driven by one extreme season.

Only COMPLETE calendar years are ever used (see ``onset.complete_years``); a partial final
year would look like a dramatic drying trend and is dropped instead.
"""

from __future__ import annotations

import math
from typing import Any, Sequence

import numpy as np
import pandas as pd
from scipy import stats

from src.compute.onset import complete_years

HEAT_DAY_C = 35.0
MONTHS = list(range(1, 13))
ANALYSIS_FIRST_YEAR = 2001


def pettitt(values: Sequence[float] | pd.Series) -> dict[str, Any]:
    """Pettitt (1979) rank-based change-point test on a labelled annual series.

    U(t) = 2·Σ_{i<=t} rank(x_i) − t(n+1) over the possible split points t = 1..n−1; the statistic
    K = max|U| locates the breakpoint, and p ≈ 2·exp(−6K²/(n³+n²+n)) is Pettitt's asymptotic
    two-sided approximation. Returns the first year of the AFTER segment as ``changeYear``
    (the regime starts with that year), plus segment means and the step. Implemented here rather
    than pulled from a package so the formula and the tie handling are auditable.
    """
    if not isinstance(values, pd.Series):
        raise TypeError("pettitt expects a pandas Series indexed by year so the change point is a year")
    series = values.dropna().astype("float64")
    n = int(series.size)
    out: dict[str, Any] = {
        "test": "Pettitt 1979 rank-based change-point test (asymptotic p)",
        "n": n,
        "K": None,
        "pValue": None,
        "changeYear": None,
        "beforeMean": None,
        "afterMean": None,
        "step": None,
        "significant": None,
    }
    if n < 8:
        out["note"] = "series too short for the asymptotic p-value"
        return out

    ranks = stats.rankdata(series.to_numpy(dtype="float64"), method="average")
    t_values = np.arange(1, n, dtype="float64")
    u = 2.0 * np.cumsum(ranks)[: n - 1] - t_values * (n + 1)
    k_position = int(np.argmax(np.abs(u)))
    k_statistic = float(abs(u[k_position]))
    p = float(2.0 * math.exp((-6.0 * k_statistic**2) / (n**3 + n**2 + n)))
    before = series.iloc[: k_position + 1]
    after = series.iloc[k_position + 1 :]
    out.update(
        {
            "K": round(k_statistic, 1),
            "pValue": p,
            "pValueText": "p < 1e-6" if p < 1e-6 else f"p = {p:.4f}",
            "breakpointLastYear": int(series.index[k_position]),
            "changeYear": int(series.index[k_position + 1]),
            "beforeMean": round(float(before.mean()), 2),
            "afterMean": round(float(after.mean()), 2),
            "step": round(float(after.mean() - before.mean()), 2),
            "significant": bool(p < 0.05),
            "direction": "increase" if after.mean() > before.mean() else "decrease",
        }
    )
    return out


def homogeneity_report(
    annual: pd.Series,
    *,
    full_label: str = "1981–latest",
    analysis_start: int = ANALYSIS_FIRST_YEAR,
    era_boundary: int | None = 2013,
) -> dict[str, Any]:
    """Run Pettitt on the full record and on the analysis window; flag inhomogeneity for the UI."""
    full = annual[annual.index >= 1981]
    recent = annual[annual.index >= analysis_start]
    full_test = pettitt(full)
    recent_test = pettitt(recent)
    flagged = bool(full_test["significant"] or recent_test["significant"])
    inside_analysis = recent_test["changeYear"] if recent_test["significant"] else None
    # Any significant step inside the analysis window sits between, before or after the two eras
    # being compared — in every one of those cases the era difference is partly the step.
    crosses_eras = inside_analysis is not None
    where = None
    if inside_analysis is not None and era_boundary is not None:
        where = "in era A or at the era boundary" if inside_analysis <= era_boundary else "inside era B"
    return {
        "analysisWindow": f"{analysis_start}–{int(recent.index.max()) if recent.size else 'n/a'}",
        "fullRecord": full_test,
        "analysisWindowTest": recent_test,
        "homogeneous": not flagged,
        "changePoints": sorted({y for y in (full_test["changeYear"], inside_analysis) if y is not None}),
        "changePointInsideAnalysisWindow": inside_analysis,
        "changePointLocation": where,
        "affectsEraComparison": crosses_eras,
        "implication": (
            "A step inside the analysis window means any trend or era difference computed across it "
            "is partly the product changing, not the climate changing. Report it with the caution and "
            "prefer the independent cross-check."
            if flagged
            else "No significant step detected in this series over the tested windows."
        ),
    }


def mann_kendall(values: Sequence[float] | pd.Series) -> dict[str, Any]:
    """Tie-corrected Mann-Kendall test: S, Var(S), Z, two-sided p, tau-b, n."""
    series = pd.Series(list(values) if not isinstance(values, pd.Series) else values.to_numpy(), dtype="float64").dropna()
    n = int(series.size)
    result: dict[str, Any] = {"n": n, "S": 0, "varS": math.nan, "z": math.nan, "pValue": math.nan, "tau": math.nan, "trend": "insufficient data"}
    if n < 3:
        return result

    x = series.to_numpy(dtype="float64")
    pairs = x[None, :] - x[:, None]
    i_upper = np.triu_indices(n, k=1)
    signs = np.sign(pairs[i_upper])
    s = float(signs.sum())

    _, counts = np.unique(x, return_counts=True)
    tie_term = float(sum(t * (t - 1) * (2 * t + 5) for t in counts if t > 1))
    var_s = (n * (n - 1) * (2 * n + 5) - tie_term) / 18.0

    if var_s <= 0:
        z = 0.0
    elif s > 0:
        z = (s - 1) / math.sqrt(var_s)
    elif s < 0:
        z = (s + 1) / math.sqrt(var_s)
    else:
        z = 0.0

    denominator = n * (n - 1) / 2 - sum(t * (t - 1) / 2 for t in counts if t > 1)
    tau = s / denominator if denominator > 0 else math.nan

    result.update(
        {
            "S": s,
            "varS": var_s,
            "z": float(z),
            "pValue": float(2 * (1 - stats.norm.cdf(abs(z)))),
            "tau": float(tau),
            "trend": "no trend" if z == 0 else ("increasing" if z > 0 else "decreasing"),
        }
    )
    return result


def theil_sen(values: Sequence[float] | pd.Series, x: Sequence[float] | None = None) -> dict[str, float]:
    """Robust Theil-Sen slope (per unit of x), from scipy.stats.theilslopes."""
    series = pd.Series(list(values) if not isinstance(values, pd.Series) else values.to_numpy(), dtype="float64")
    mask = series.notna()
    y = series[mask].to_numpy(dtype="float64")
    xs = np.asarray(x, dtype="float64")[mask.to_numpy()] if x is not None else np.arange(y.size, dtype="float64")
    if y.size < 3:
        return {"slope": math.nan, "intercept": math.nan, "n": int(y.size)}
    slope, intercept, _, _ = stats.theilslopes(y, xs)
    return {"slope": float(slope), "intercept": float(intercept), "n": int(y.size)}


def annual_indicator(frame: pd.DataFrame | pd.Series, reducer: str = "sum", min_days: int = 350) -> pd.Series:
    """Aggregate a daily series to complete calendar years only (>= min_days of real data)."""
    series = frame if isinstance(frame, pd.Series) else frame.iloc[:, 0]
    grouped = series.groupby(series.index.year)
    values = getattr(grouped, reducer)()
    observed = grouped.count()
    keep = observed >= min_days
    return values[keep].astype("float64")


def annual_rainfall_mm(rainfall: pd.Series) -> pd.Series:
    """Total rainfall per complete year (mm)."""
    return annual_indicator(rainfall, "sum")


def heat_days_per_year(t2m_max: pd.Series, threshold_c: float = HEAT_DAY_C) -> pd.Series:
    """Days per complete year with T2M_MAX above ``threshold_c`` (strictly greater)."""
    exceed = (t2m_max > threshold_c).astype("float64")
    exceed[t2m_max.isna()] = np.nan
    return annual_indicator(exceed, "sum")


def annual_mean_temperature(t2m: pd.Series) -> pd.Series:
    """Mean 2 m temperature per complete year (°C)."""
    return annual_indicator(t2m, "mean")


def monthly_climatology(series: pd.Series, month_doy_range: tuple[int, int] | None = None) -> pd.Series:
    """Month-of-year mean across all years (the GWETROOT seasonal cycle)."""
    values = series.dropna()
    if values.empty:
        return pd.Series(dtype="float64", index=pd.Index(MONTHS, name="month"))
    means = values.groupby(values.index.month).mean()
    return means.reindex(MONTHS)


def trend_report(annual: pd.Series, *, percent_of_mean: bool = False) -> dict[str, Any]:
    """Mann-Kendall + Theil-Sen on one annual series, with the % per decade form."""
    years = np.asarray(annual.index, dtype="float64")
    mk = mann_kendall(annual.to_numpy())
    ts = theil_sen(annual.to_numpy(), x=years)
    per_decade = ts["slope"] * 10 if not math.isnan(ts["slope"]) else math.nan
    mean_value = float(np.nanmean(annual.to_numpy())) if annual.size else math.nan
    out: dict[str, Any] = {
        "n": int(annual.size),
        "years": [int(y) for y in annual.index],
        "values": [round(float(v), 2) for v in annual.to_numpy()],
        "mean": round(mean_value, 3) if not math.isnan(mean_value) else math.nan,
        "median": round(float(np.nanmedian(annual.to_numpy())), 3) if annual.size else math.nan,
        "slopePerYear": round(ts["slope"], 4) if not math.isnan(ts["slope"]) else math.nan,
        "slopePerDecade": round(per_decade, 4) if not math.isnan(per_decade) else math.nan,
        "mannKendall": {key: (round(value, 4) if isinstance(value, float) and not math.isnan(value) else (None if isinstance(value, float) else value)) for key, value in mk.items()},
        "trend": mk["trend"],
        "pValue": mk["pValue"] if math.isnan(mk["pValue"]) else round(mk["pValue"], 4),
        "tau": mk["tau"] if math.isnan(mk["tau"]) else round(mk["tau"], 4),
    }
    if percent_of_mean and not math.isnan(mean_value) and mean_value != 0 and not math.isnan(per_decade):
        out["pctPerDecade"] = round(per_decade / mean_value * 100, 2)
    return out


def two_era(series: pd.Series, era_a: tuple[int, int] = (2001, 2012), era_b: tuple[int, int | None] = (2013, None)) -> dict[str, Any]:
    """Era medians, the delta between them, and a two-sided Mann-Whitney U p-value."""
    latest = int(series.index.max())
    b_end = int(era_b[1]) if era_b[1] is not None else latest
    a = series.loc[(series.index >= era_a[0]) & (series.index <= era_a[1])].dropna()
    b = series.loc[(series.index >= era_b[0]) & (series.index <= b_end)].dropna()
    out: dict[str, Any] = {
        "eraA": {"label": f"{era_a[0]}–{era_a[1]}", "n": int(a.size), "median": round(float(a.median()), 3) if a.size else None, "values": [round(float(v), 3) for v in a]},
        "eraB": {"label": f"{era_b[0]}–{b_end}", "n": int(b.size), "median": round(float(b.median()), 3) if b.size else None, "values": [round(float(v), 3) for v in b]},
        "delta": None,
        "pValue": None,
    }
    if a.size and b.size:
        out["delta"] = round(float(b.median() - a.median()), 3)
        if a.size >= 2 and b.size >= 2:
            try:
                out["pValue"] = round(float(stats.mannwhitneyu(a, b, alternative="two-sided").pvalue), 4)
            except ValueError:
                pass
    return out


def complete_months(series: pd.Series) -> pd.Series:
    """Drop a trailing partial month — a half-recorded September is not a monthly value."""
    if series.empty:
        return series
    grouped = series.groupby(series.index.to_period("M"))
    counts = grouped.count()
    expected = pd.Series([stamp.days_in_month for stamp in counts.index], index=counts.index)
    complete = counts[counts == expected].index
    return series[series.index.to_period("M").isin(complete)]


def recent_series(rainfall: pd.Series, months: int = 12, years: int = 10) -> dict[str, Any]:
    """Monthly rainfall for the last ``months`` complete months, and annual totals for the last ``years``."""
    monthly = complete_months(rainfall).resample("MS").sum(min_count=1).dropna()
    last_months = monthly.iloc[-months:] if monthly.size >= months else monthly
    annual = annual_indicator(rainfall, "sum")
    return {
        "monthlyRainfall": {
            "label": [stamp.strftime("%Y-%m") for stamp in last_months.index],
            "values": [round(float(value), 1) for value in last_months],
        },
        "annualRainfall": {
            "label": [str(int(year)) for year in annual.index[-years:]],
            "values": [round(float(value), 1) for value in annual.iloc[-years:]],
        },
    }


def complete_year_list(frame: pd.DataFrame | pd.Series) -> list[int]:
    """Years reaching the end of the calendar (shared definition across indicators)."""
    return complete_years(frame)
