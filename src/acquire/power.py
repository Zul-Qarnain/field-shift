"""NASA POWER daily point data — acquisition with a polite, on-disk cache.

Public API (stable — other workstreams import exactly this):

    fetch_daily(lat, lon, start="19810101", end=None, params=DEFAULT_PARAMS,
                cache_dir=Path("cache/power")) -> pandas.DataFrame

Backends (``backend=`` or the ``POWER_BACKEND`` environment variable):

* ``"api"``  — the daily point API below (the original path);
* ``"s3"``   — the same POWER v10 archive read from NASA POWER's public Zarr stores on AWS
  Open Data (`src.acquire.power_zarr`); values are identical to the API's for the grid cell
  containing the point (verified at Tangail: annual PRECTOTCORR 2016–2025 matches to 0.1 mm);
* ``"auto"`` (default) — the API, falling back to S3 for the rest of the run the first time
  the API cannot be reached.

Returns one column per parameter, indexed by date (daily, POWER's local-time
standard), with ``df.attrs["retrieved_utc"]`` set to the UTC ISO timestamp of
the HTTP retrieval that produced the data (cache hit -> the timestamp stored
alongside the cached payload, so provenance stays truthful on reruns).

Endpoint: https://power.larc.nasa.gov/api/temporal/daily/point
Community AG, format JSON. No key required; unauthenticated requests are
throttled, so this module is sequential, rate-limited and backoff-aware.
POWER fills missing values with a header-declared ``fill_value`` (in practice
-999) — every fill is converted to NaN here, never to a plausible-looking
number. Parameters whose product starts later than 1981 simply carry NaN for
the earlier days (e.g. ALLSKY_SFC_SW_DWN 1984+, GWETROOT from 2001).
"""

from __future__ import annotations

import hashlib
import json
import os
import random
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence

import pandas as pd
import requests

API_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
COMMUNITY = "AG"
# Identify the project politely; some operators block generic agents.
USER_AGENT = "FieldShift/0.1 (NASA Space Apps 2026 team; scientific demo; static JSON packs)"

DEFAULT_PARAMS: tuple[str, ...] = (
    "PRECTOTCORR",  # precipitation quality-controlled and gap-filled (mm/day)
    "T2M",          # 2 m air temperature (°C)
    "T2M_MAX",      # daily maximum 2 m temperature (°C)
    "T2M_MIN",      # daily minimum 2 m temperature (°C)
    "GWETROOT",     # root-zone soil wetness (m3/m3)
    "RH2M",         # 2 m relative humidity (%)
    "ALLSKY_SFC_SW_DWN",  # surface shortwave downwelling irradiance (kW-h/m2/day)
)

MAX_PARAMS_PER_REQUEST = 20
DEFAULT_START = "19810101"
FILL_SENTINEL = -999.0  # POWER's documented sentinel, used even if the header omits fill_value

# Politeness: never send two requests closer than this, and back off on pressure.
MIN_REQUEST_INTERVAL_S = 1.5
MAX_RETRIES = 5
BACKOFF_BASE_S = 3.0
REQUEST_TIMEOUT_S = 180

_last_request_mono = 0.0
_api_unreachable = False

BACKENDS = ("auto", "api", "s3")
#: Which POWER Zarr store each parameter lives in on AWS (everything else: MERRA-2 daily).
S3_PARAM_STORE = {"ALLSKY_SFC_SW_DWN": "syn1deg_daily"}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _norm_date(value: str | date, *, which: str) -> str:
    if isinstance(value, date):
        return value.strftime("%Y%m%d")
    cleaned = str(value).replace("-", "").replace("/", "").strip()
    try:
        datetime.strptime(cleaned, "%Y%m%d")
    except ValueError as exc:
        raise ValueError(f"{which}={value!r} is not a YYYYMMDD date") from exc
    return cleaned


def _yesterday() -> str:
    return (datetime.now(timezone.utc).date() - timedelta(days=1)).strftime("%Y%m%d")


def _params_key(params: Sequence[str]) -> str:
    return hashlib.sha1(",".join(sorted(params)).encode()).hexdigest()[:12]


def _cache_paths(cache_dir: Path, lat: float, lon: float, params: Sequence[str], start: str, end: str) -> tuple[Path, Path]:
    stem = f"power_{lat:.4f}_{lon:.4f}_{start}_{end}_{_params_key(params)}"
    return cache_dir / f"{stem}.json", cache_dir / f"{stem}.meta.json"


def _wait_for_turn() -> None:
    """Space out outbound requests (POWER throttles unauthenticated traffic)."""
    global _last_request_mono
    wait = MIN_REQUEST_INTERVAL_S - (time.monotonic() - _last_request_mono)
    if wait > 0:
        time.sleep(wait)
    _last_request_mono = time.monotonic()


def _get_session(session: requests.Session | None) -> requests.Session:
    return session if session is not None else requests.Session()


def request_point(
    session: requests.Session,
    lat: float,
    lon: float,
    start: str,
    end: str,
    params: Sequence[str],
) -> dict[str, Any]:
    """One POWER daily-point request, with retry + exponential backoff and jitter."""
    if len(params) > MAX_PARAMS_PER_REQUEST:
        raise ValueError(f"POWER accepts at most {MAX_PARAMS_PER_REQUEST} parameters per request, got {len(params)}")

    query = {
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "start": start,
        "end": end,
        "parameters": ",".join(params),
        "community": COMMUNITY,
        "format": "JSON",
    }
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        _wait_for_turn()
        retry_in: float | None = None
        try:
            response = session.get(API_URL, params=query, timeout=REQUEST_TIMEOUT_S, headers={"User-Agent": USER_AGENT})
        except requests.RequestException as exc:  # network flakiness is retryable
            last_error = exc
        else:
            if response.status_code == 200:
                try:
                    payload = response.json()
                except ValueError as exc:
                    last_error = ValueError(f"POWER returned a non-JSON body ({len(response.content)} bytes)")
                else:
                    messages = payload.get("messages") if isinstance(payload, dict) else None
                    errors = [m for m in (messages or []) if str(m.get("type", "")).lower() in {"error", "fatal"}] if isinstance(messages, list) else []
                    if errors:
                        raise RuntimeError(f"POWER rejected the request: {errors}")
                    return payload
            elif response.status_code == 204 or not response.content:
                # POWER answers with an empty body when no data covers the window.
                return {"properties": {"parameter": {}}, "header": {}, "messages": []}
            elif response.status_code in {429, 500, 502, 503, 504}:
                last_error = RuntimeError(f"POWER HTTP {response.status_code}")
                retry_after = response.headers.get("Retry-After", "")
                retry_in = float(retry_after) if retry_after.isdigit() else BACKOFF_BASE_S * 2**attempt
            else:
                raise RuntimeError(f"POWER HTTP {response.status_code}: {response.text[:200]}")
        if attempt < MAX_RETRIES - 1:
            time.sleep(min(BACKOFF_BASE_S * 2**attempt if retry_in is None else retry_in, 120.0) + random.uniform(0, 1.5))
    raise RuntimeError(f"POWER request failed after {MAX_RETRIES} attempts: {last_error}")


def parse_payload(payload: dict[str, Any]) -> pd.DataFrame:
    """POWER JSON -> tidy daily DataFrame (one column per parameter, fill values -> NaN)."""
    header = payload.get("header") or {}
    fill_values = {FILL_SENTINEL}
    declared = header.get("fill_value")
    if isinstance(declared, (int, float)):
        fill_values.add(float(declared))

    raw = (payload.get("properties") or {}).get("parameter") or {}
    columns: dict[str, pd.Series] = {}
    for param, series in raw.items():
        if not isinstance(series, dict):
            continue
        values: dict[str, float] = {}
        for key, value in series.items():
            stamp = str(key)
            if len(stamp) != 8 or not stamp.isdigit():
                continue
            try:
                number = float(value)
            except (TypeError, ValueError):
                number = float("nan")
            if any(number == fill for fill in fill_values):
                number = float("nan")
            values[f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:8]}"] = number
        columns[param] = pd.Series(values, dtype="float64")

    if not columns:
        frame = pd.DataFrame(columns=list(raw) or [])
        frame.index = pd.DatetimeIndex([], name="date")
    else:
        frame = pd.DataFrame(columns)
        frame.index = pd.DatetimeIndex(frame.index, name="date")
        frame = frame.sort_index()
    frame.attrs["fill_values_treated_as_nan"] = sorted(fill_values)
    frame.attrs["power_sources"] = header.get("sources") or []
    frame.attrs["power_api"] = (header.get("api") or {}).get("version", "unknown")
    frame.attrs["time_standard"] = header.get("time_standard", "LST")
    frame.attrs["requested_parameters"] = list(raw)
    return frame


def _read_cache(payload_path: Path, meta_path: Path) -> tuple[dict[str, Any], str] | None:
    if not payload_path.exists():
        return None
    try:
        payload = json.loads(payload_path.read_text())
    except (ValueError, OSError):
        return None
    retrieved_utc = ""
    if meta_path.exists():
        try:
            retrieved_utc = str(json.loads(meta_path.read_text()).get("retrieved_utc", ""))
        except (ValueError, OSError):
            retrieved_utc = ""
    if not retrieved_utc:  # pre-sidecar caches fall back to the file's own mtime
        retrieved_utc = datetime.fromtimestamp(payload_path.stat().st_mtime, timezone.utc).replace(microsecond=0).isoformat()
    return payload, retrieved_utc


def fetch_daily(
    lat: float,
    lon: float,
    start: str = DEFAULT_START,
    end: str | None = None,
    params: Iterable[str] = DEFAULT_PARAMS,
    cache_dir: Path = Path("cache/power"),
    *,
    force_refresh: bool = False,
    session: requests.Session | None = None,
    backend: str | None = None,
) -> pd.DataFrame:
    """Daily NASA POWER point series, served from ``cache_dir`` when already fetched.

    ``lat``/``lon`` are rounded to 4 decimals for the cache key and the request.
    ``end`` defaults to yesterday (UTC). ``force_refresh`` re-downloads.
    """
    global _api_unreachable
    mode = (backend or os.environ.get("POWER_BACKEND", "auto")).lower()
    if mode not in BACKENDS:
        raise ValueError(f"backend must be one of {BACKENDS}, got {mode!r}")
    if mode == "s3" or (mode == "auto" and _api_unreachable):
        return fetch_daily_s3(lat, lon, start=start, end=end, params=params)
    if mode == "auto":
        try:
            return _fetch_daily_api(lat, lon, start, end, params, cache_dir, force_refresh=force_refresh, session=session)
        except (RuntimeError, requests.RequestException) as exc:
            if "rejected the request" in str(exc):
                raise
            _api_unreachable = True
            print(f"  NASA POWER API unreachable ({str(exc)[:80]}); reading the POWER Zarr archive on AWS instead")
            return fetch_daily_s3(lat, lon, start=start, end=end, params=params)
    return _fetch_daily_api(lat, lon, start, end, params, cache_dir, force_refresh=force_refresh, session=session)


def fetch_daily_s3(
    lat: float,
    lon: float,
    start: str = DEFAULT_START,
    end: str | None = None,
    params: Iterable[str] = DEFAULT_PARAMS,
) -> pd.DataFrame:
    """The same daily series read from NASA POWER's Zarr stores on AWS Open Data.

    Same columns, index and attrs contract as the API path. The archive's fill (NaN) is kept
    as NaN; dates past the archive's last day come back as NaN rows and are trimmed.
    """
    from src.acquire import power_zarr

    latitude, longitude = float(lat), float(lon)
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError(f"coordinates out of range: lat={latitude}, lon={longitude}")
    params_list = list(dict.fromkeys(params))
    if not params_list:
        raise ValueError("params must contain at least one POWER parameter name")
    start_stamp = _norm_date(start or DEFAULT_START, which="start")
    end_stamp = _norm_date(end or _yesterday(), which="end")
    if end_stamp < start_stamp:
        raise ValueError(f"end {end_stamp} precedes start {start_stamp}")

    columns: dict[str, pd.Series] = {}
    stores: dict[str, power_zarr.ZarrStore] = {}
    for param in params_list:
        name = S3_PARAM_STORE.get(param, "merra2_daily")
        store = stores.setdefault(name, power_zarr.ZarrStore(name))
        columns[param] = store.point(param, latitude, longitude, start_stamp, end_stamp)
    frame = pd.DataFrame(columns)
    frame.index = pd.DatetimeIndex(frame.index, name="date")
    full = pd.date_range(pd.Timestamp(start_stamp), pd.Timestamp(end_stamp), freq="D", name="date")
    frame = frame.reindex(full)
    present = frame.dropna(how="all")
    if not present.empty:
        frame = frame.loc[: present.index.max()]
    main = stores.get("merra2_daily") or next(iter(stores.values()))
    frame.attrs.update(
        {
            "retrieved_utc": main.retrieved_utc,
            "retrieval_source": "s3",
            "dataset": "NASA POWER v10 daily (Zarr, AWS Open Data registry), MERRA-2 grid cell",
            "power_sources": sorted({"MERRA2" if n == "merra2_daily" else n.split("_")[0].upper() for n in stores}),
            "power_api": str(main.attrs.get("version", "POWER Version 10")),
            "time_standard": "LST",
            "requested_parameters": params_list,
            "fill_values_treated_as_nan": ["NaN"],
            "lat": round(latitude, 4),
            "lon": round(longitude, 4),
            "grid_cell": main.cell_of(latitude, longitude),
            "start": start_stamp,
            "end": end_stamp,
            "source_url": main.url,
        }
    )
    return frame


def _fetch_daily_api(
    lat: float,
    lon: float,
    start: str,
    end: str | None,
    params: Iterable[str],
    cache_dir: Path,
    *,
    force_refresh: bool = False,
    session: requests.Session | None = None,
) -> pd.DataFrame:
    """The daily point API path, with its JSON cache."""
    latitude = float(lat)
    longitude = float(lon)
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError(f"coordinates out of range: lat={latitude}, lon={longitude}")
    params_list = list(dict.fromkeys(params))
    if not params_list:
        raise ValueError("params must contain at least one POWER parameter name")

    start_stamp = _norm_date(start or DEFAULT_START, which="start")
    end_stamp = _norm_date(end or _yesterday(), which="end")
    if end_stamp < start_stamp:
        raise ValueError(f"end {end_stamp} precedes start {start_stamp}")

    cache_dir = Path(cache_dir)
    payload_path, meta_path = _cache_paths(cache_dir, latitude, longitude, params_list, start_stamp, end_stamp)

    cached = None if force_refresh else _read_cache(payload_path, meta_path)
    if cached is not None:
        payload, retrieved_utc = cached
        source = "cache"
    else:
        payload = request_point(_get_session(session), latitude, longitude, start_stamp, end_stamp, params_list)
        retrieved_utc = _utc_now_iso()
        source = "network"
        cache_dir.mkdir(parents=True, exist_ok=True)
        tmp_path = payload_path.with_suffix(".json.tmp")
        tmp_path.write_text(json.dumps(payload))
        tmp_path.replace(payload_path)
        meta_tmp = meta_path.with_suffix(".meta.json.tmp")
        meta_tmp.write_text(
            json.dumps(
                {
                    "retrieved_utc": retrieved_utc,
                    "source": source,
                    "url": API_URL,
                    "community": COMMUNITY,
                    "lat": round(latitude, 4),
                    "lon": round(longitude, 4),
                    "start": start_stamp,
                    "end": end_stamp,
                    "parameters": params_list,
                    "user_agent": USER_AGENT,
                },
                indent=2,
            )
        )
        meta_tmp.replace(meta_path)

    frame = parse_payload(payload)
    frame.attrs.update(
        {
            "retrieved_utc": retrieved_utc,
            "retrieval_source": source,
            "dataset": "NASA POWER daily point API, community AG",
            "lat": round(latitude, 4),
            "lon": round(longitude, 4),
            "start": start_stamp,
            "end": end_stamp,
            "cache_path": str(payload_path),
            "cache_meta_path": str(meta_path),
        }
    )
    return frame


def covered_range(frame: pd.DataFrame) -> tuple[str | None, str | None]:
    """First and last date that actually carry data (per the request window)."""
    if frame.empty or frame.dropna(how="all").empty:
        return None, None
    present = frame.dropna(how="all")
    return present.index.min().strftime("%Y-%m-%d"), present.index.max().strftime("%Y-%m-%d")


def parameter_ranges(frame: pd.DataFrame) -> dict[str, tuple[str, str]]:
    """First/last non-NaN date per parameter (documents late-starting products)."""
    out: dict[str, tuple[str, str]] = {}
    for column in frame.columns:
        series = frame[column].dropna()
        if series.empty:
            continue
        out[str(column)] = (series.index.min().strftime("%Y-%m-%d"), series.index.max().strftime("%Y-%m-%d"))
    return out
