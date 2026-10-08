"""'This season so far' nowcast: recent NASA POWER days against the point's own climatology.

Pure functions, no I/O. The web app re-implements ``window_summary`` in TypeScript
(``web/lib/nowcast.ts``) and a Vitest test checks both give the same numbers on every
committed nowcast pack, so the browser's live path and this offline path cannot drift.

Definitions (stated once, used everywhere):

* **Calendar key** — every date maps to its day-of-year in a *leap* year (Jan 1 = 0,
  Feb 29 = 59, Mar 1 = 60, Dec 31 = 365), so 1 March is the same key in every year.
* **Climatology** — for each of the 366 keys, the mean of all baseline-year values whose
  calendar key lies within ``half_window`` days of it (circular across the year end).
  Fill values (NaN) are skipped. With 9 baseline years and a ±7-day window each key
  averages up to 135 daily values.
* **Window summary** — over the last ``n_days`` calendar days ending at ``end``:
  rain is summed and compared with the climatological sum *for the same valid days*
  (missing days are excluded from both sides, never filled); temperature and surface
  wetness are averaged and compared with the climatological mean of the same days.
  A variable with fewer than ``MIN_VALID_SHARE`` of its days present is reported as
  ``None`` rather than as a number built on a gap.
"""

from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Iterable, Mapping, Sequence

PARAMS: tuple[str, ...] = ("PRECTOTCORR", "T2M", "GWETTOP")
KEYS = 366
MIN_VALID_SHARE = 0.8
_CUM_LEAP = (0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335)


def calendar_key(day: date) -> int:
    """Day-of-year on a leap-year calendar, 0-based (Feb 29 = 59, Mar 1 = 60 in every year)."""
    return _CUM_LEAP[day.month - 1] + day.day - 1


def _finite(value: float | None) -> bool:
    return value is not None and isinstance(value, (int, float)) and math.isfinite(value)


def climatology(
    series: Mapping[date, float | None],
    first_year: int,
    last_year: int,
    half_window: int = 7,
) -> list[float | None]:
    """366 smoothed calendar-day means over ``first_year``..``last_year`` (inclusive)."""
    sums = [0.0] * KEYS
    counts = [0] * KEYS
    for day, value in series.items():
        if not first_year <= day.year <= last_year or not _finite(value):
            continue
        sums[calendar_key(day)] += float(value)  # type: ignore[arg-type]
        counts[calendar_key(day)] += 1
    out: list[float | None] = []
    for key in range(KEYS):
        total = 0.0
        n = 0
        for offset in range(-half_window, half_window + 1):
            k = (key + offset) % KEYS
            total += sums[k]
            n += counts[k]
        out.append(total / n if n else None)
    return out


def last_complete_day(columns: Mapping[str, Mapping[date, float | None]], params: Sequence[str] = PARAMS) -> date | None:
    """Latest date on which every parameter has a real (non-fill) value."""
    shared: set[date] | None = None
    for param in params:
        days = {d for d, v in columns.get(param, {}).items() if _finite(v)}
        shared = days if shared is None else shared & days
    return max(shared) if shared else None


def _days(end: date, n_days: int) -> list[date]:
    return [end - timedelta(days=offset) for offset in range(n_days - 1, -1, -1)]


def window_summary(
    columns: Mapping[str, Mapping[date, float | None]],
    clim: Mapping[str, Sequence[float | None]],
    end: date,
    n_days: int,
) -> dict:
    """Totals/means for the window and their anomalies against the climatology of the same days."""
    days = _days(end, n_days)
    need = math.ceil(MIN_VALID_SHARE * n_days)
    result: dict = {"start": days[0].isoformat(), "end": end.isoformat(), "days": n_days, "validDays": {}}

    def pairs(param: str) -> list[tuple[float, float]]:
        values = columns.get(param, {})
        normals = clim[param]
        out = []
        for d in days:
            v = values.get(d)
            c = normals[calendar_key(d)]
            if _finite(v) and _finite(c):
                out.append((float(v), float(c)))  # type: ignore[arg-type]
        return out

    rain = pairs("PRECTOTCORR")
    temp = pairs("T2M")
    wet = pairs("GWETTOP")
    result["validDays"] = {"PRECTOTCORR": len(rain), "T2M": len(temp), "GWETTOP": len(wet)}

    if len(rain) >= need:
        total = sum(v for v, _ in rain)
        normal = sum(c for _, c in rain)
        result.update(
            rainTotalMm=round(total, 3),
            rainNormalMm=round(normal, 3),
            rainAnomalyMm=round(total - normal, 3),
            rainPctOfNormal=round(100 * total / normal, 3) if normal > 0 else None,
        )
    else:
        result.update(rainTotalMm=None, rainNormalMm=None, rainAnomalyMm=None, rainPctOfNormal=None)

    for key, data in (("temp", temp), ("wet", wet)):
        if len(data) >= need:
            mean_v = sum(v for v, _ in data) / len(data)
            mean_c = sum(c for _, c in data) / len(data)
            result[f"{key}Mean"] = round(mean_v, 4)
            result[f"{key}Normal"] = round(mean_c, 4)
            result[f"{key}Anomaly"] = round(mean_v - mean_c, 4)
        else:
            result[f"{key}Mean"] = result[f"{key}Normal"] = result[f"{key}Anomaly"] = None
    return result


def recent_block(columns: Mapping[str, Mapping[date, float | None]], end: date, n_days: int, params: Iterable[str] = PARAMS) -> dict:
    """The last ``n_days`` daily values ending at ``end``; fills stay ``None``."""
    days = _days(end, n_days)
    block: dict = {"dates": [d.isoformat() for d in days]}
    for param in params:
        values = columns.get(param, {})
        block[param] = [round(float(values[d]), 3) if _finite(values.get(d)) else None for d in days]  # type: ignore[arg-type]
    return block
