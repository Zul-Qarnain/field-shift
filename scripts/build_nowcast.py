"""Build the 'This season so far' nowcast packs: NASA POWER daily -> web/public/data/nowcast/.

Run from the repo root:

    /workspace/fs-venv/bin/python scripts/build_nowcast.py            # all 70 points
    /workspace/fs-venv/bin/python scripts/build_nowcast.py --limit 3  # smoke test

For each of the 70 precomputed points (6 demo farms + 64 district points, the same coordinates
as web/public/data/packs/index.json) this makes ONE POWER daily-point request for
PRECTOTCORR, T2M and GWETTOP from 2017-01-01 to yesterday (UTC), caches the raw payload under
cache/nowcast/ (gitignored) with its real retrieval timestamp, and writes:

  * a 366-day calendar climatology over the 2017–2025 baseline (±7-day smoothing), which the
    browser also uses for its live fetch, so live and saved anomalies share one baseline;
  * the last 60 days ending at the latest day all three parameters are present (the saved
    fallback the app shows, labelled with this retrieval date, when the live fetch fails);
  * 30- and 60-day summaries from src/compute/nowcast.py (the web test re-derives them in TS).

Why 2017–2025: POWER's precipitation series steps at 2014–2016 at most of these points
(Pettitt change point recorded in every data pack). A baseline that starts after the step
compares this season with the same product regime the recent days come from. The count of
points whose change point falls inside the baseline is computed and written, not assumed.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from src.acquire.power import fetch_daily  # noqa: E402
from src.compute import nowcast  # noqa: E402

PACK_INDEX = REPO_ROOT / "web" / "public" / "data" / "packs" / "index.json"
OUT_DIR = REPO_ROOT / "web" / "public" / "data" / "nowcast"
CACHE_DIR = REPO_ROOT / "cache" / "nowcast"
START = "20170101"
BASELINE = (2017, 2025)
HALF_WINDOW = 7
RECENT_DAYS = 60
SUMMARY_WINDOWS = (30, 60)
SCHEMA_VERSION = 1
POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
UNITS = {
    "PRECTOTCORR": "mm/day (precipitation, bias-corrected)",
    "T2M": "°C (2 m air temperature, daily mean)",
    "GWETTOP": "0–1 (surface soil wetness, top ~5 cm; 0 = dry, 1 = saturated)",
}
BASELINE_WHY = (
    "Normal = mean of 2017–2025 for the same calendar dates (±7-day window). The baseline starts after the "
    "2014–2016 step POWER precipitation shows at most of these points (Pettitt test, recorded in each data pack), "
    "so this season is compared with the same product regime its recent days come from."
)


def _columns(frame) -> dict[str, dict[date, float | None]]:
    cols: dict[str, dict[date, float | None]] = {}
    for param in nowcast.PARAMS:
        if param not in frame:
            cols[param] = {}
            continue
        series = frame[param]
        cols[param] = {ts.date(): (None if v != v else float(v)) for ts, v in series.items()}
    return cols


def build_point(entry: dict, kind: str, end: str) -> dict:
    frame = fetch_daily(entry["lat"], entry["lon"], start=START, end=end, params=nowcast.PARAMS, cache_dir=CACHE_DIR)
    cols = _columns(frame)
    # Rounded once, here: the summaries below are computed from exactly the climatology that is
    # committed, so the browser (web/lib/nowcast.ts) re-derives them to the last digit.
    clim = {
        p: [None if v is None else round(v, 4) for v in nowcast.climatology(cols[p], *BASELINE, half_window=HALF_WINDOW)]
        for p in nowcast.PARAMS
    }
    last = nowcast.last_complete_day(cols)
    if last is None:
        raise RuntimeError(f"{entry['name']}: POWER returned no day with all of {nowcast.PARAMS}")
    change_point = entry.get("precipChangePoint")
    pack = {
        "schema_version": SCHEMA_VERSION,
        "kind": kind,
        "id": entry.get("id") or entry["slug"],
        "name": entry["name"],
        "lat": entry["lat"],
        "lon": entry["lon"],
        "source": "NASA POWER daily point API, community AG",
        "source_url": POWER_URL,
        "powerApiVersion": frame.attrs.get("power_api"),
        "powerSources": frame.attrs.get("power_sources"),
        "timeStandard": frame.attrs.get("time_standard"),
        "parameters": UNITS,
        "retrievedUtc": frame.attrs.get("retrieved_utc"),
        "requested": {"start": f"{START[:4]}-{START[4:6]}-{START[6:]}", "end": f"{end[:4]}-{end[4:6]}-{end[6:]}"},
        "lastCompleteDate": last.isoformat(),
        "baseline": {
            "firstYear": BASELINE[0],
            "lastYear": BASELINE[1],
            "halfWindowDays": HALF_WINDOW,
            "calendar": "366-day leap-year calendar, index 0 = 1 Jan, 59 = 29 Feb",
            "why": BASELINE_WHY,
            "precipChangePoint": change_point,
            "changePointInsideBaseline": bool(change_point and BASELINE[0] <= change_point <= BASELINE[1]),
        },
        "climatology": clim,
        "recent": nowcast.recent_block(cols, last, RECENT_DAYS),
        "summary": {str(n): nowcast.window_summary(cols, clim, last, n) for n in SUMMARY_WINDOWS},
    }
    return pack


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--limit", type=int, default=None, help="only the first N points (smoke test)")
    parser.add_argument("--end", default=None, help="YYYYMMDD; default yesterday (UTC)")
    args = parser.parse_args()

    index = json.loads(PACK_INDEX.read_text())
    end = args.end or (datetime.now(timezone.utc).date() - timedelta(days=1)).strftime("%Y%m%d")
    points = [(e, "farm") for e in index["farms"]] + [(e, "district") for e in index["districts"]]
    if args.limit:
        points = points[: args.limit]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    entries = []
    for i, (entry, kind) in enumerate(points, 1):
        pack = build_point(entry, kind, end)
        (OUT_DIR / f"{pack['id']}.json").write_text(json.dumps(pack, ensure_ascii=False, separators=(",", ":")) + "\n")
        entries.append({
            "id": pack["id"], "kind": kind, "name": pack["name"], "lat": pack["lat"], "lon": pack["lon"],
            "path": f"/data/nowcast/{pack['id']}.json", "retrievedUtc": pack["retrievedUtc"],
            "lastCompleteDate": pack["lastCompleteDate"],
            "changePointInsideBaseline": pack["baseline"]["changePointInsideBaseline"],
        })
        print(f"[{i}/{len(points)}] {pack['id']}: last complete {pack['lastCompleteDate']}, retrieved {pack['retrievedUtc']}", flush=True)

    retrieved = sorted(e["retrievedUtc"] for e in entries if e["retrievedUtc"])
    inside = [e["id"] for e in entries if e["changePointInsideBaseline"]]
    (OUT_DIR / "index.json").write_text(json.dumps({
        "schema_version": SCHEMA_VERSION,
        "generatedUtc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": "NASA POWER daily point API, community AG",
        "parameters": list(nowcast.PARAMS),
        "baseline": {"firstYear": BASELINE[0], "lastYear": BASELINE[1], "halfWindowDays": HALF_WINDOW, "why": BASELINE_WHY},
        "recentDays": RECENT_DAYS,
        "summaryWindows": list(SUMMARY_WINDOWS),
        "retrievedRange": {"earliest": retrieved[0], "latest": retrieved[-1]} if retrieved else None,
        "lastCompleteDates": sorted({e["lastCompleteDate"] for e in entries}),
        "changePointInsideBaseline": inside,
        "count": len(entries),
        "points": entries,
    }, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {len(entries)} nowcast packs + index; change point inside baseline at: {inside or 'none'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
