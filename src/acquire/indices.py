"""Fetch and parse NOAA's public Niño 3.4 (ONI) and Indian Ocean Dipole (DMI) indices.

Both series are published as plain text, one row per year with twelve monthly
columns, a leading ``first_year last_year`` line and a trailing block that names the
missing-value code. Neither index has a station grid, so the files are small enough to
keep in the cache and parse without a dataframe round trip.
"""

from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

import pandas as pd
import requests

ONI_URL = "https://psl.noaa.gov/data/correlation/oni.data"
DMI_URL = "https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data"

CACHE_DIR = Path("cache/indices")
DEFAULT_TIMEOUT = 60

# NOAA writes the sentinel in the file itself; these are the codes seen in practice.
FALLBACK_MISSING = (-99.99, -99.9, -999.0, -9999.0)

_ROW = re.compile(r"^\s*(\d{4})(.*)$")


class IndexParseError(ValueError):
    """Raised when a downloaded file does not look like the expected NOAA layout."""


def _utcnow() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def parse_missing_code(text: str) -> list[float]:
    """Read the sentinel value NOAA prints on its own line below the data block."""
    codes: list[float] = []
    for line in text.splitlines():
        stripped = line.strip()
        # A lone negative number with no 4-digit year prefix is the sentinel line.
        if re.fullmatch(r"-\d+(\.\d+)?", stripped):
            codes.append(float(stripped))
    return codes or list(FALLBACK_MISSING)


def parse_year_table(text: str, missing: list[float] | None = None) -> pd.DataFrame:
    """Parse a ``year + 12 monthly columns`` text table into a long (year, month, value) frame.

    Rows with fewer than twelve numeric columns are skipped: NOAA's trailing notes are
    prose, and a partially written final year still carries twelve columns (padded with
    the missing code), so a short row is never real data.
    """
    if missing is None:
        missing = parse_missing_code(text)
    sentinels = {round(m, 4) for m in missing}

    records: list[dict[str, object]] = []
    for line in text.splitlines():
        match = _ROW.match(line)
        if not match:
            continue
        year = int(match.group(1))
        tokens = match.group(2).split()
        if len(tokens) < 12:
            continue
        try:
            values = [float(tok) for tok in tokens[:12]]
        except ValueError:
            continue
        for month, value in enumerate(values, start=1):
            if round(value, 4) in sentinels:
                value = float("nan")
            records.append({"year": year, "month": month, "value": value})

    if not records:
        raise IndexParseError("no year rows found in the index file")
    frame = pd.DataFrame.from_records(records)
    frame["date"] = pd.to_datetime(frame["year"].astype(str) + "-" + frame["month"].astype(str) + "-01")
    return frame[["date", "year", "month", "value"]].sort_values("date").reset_index(drop=True)


def _cache_paths(cache_dir: Path, name: str) -> tuple[Path, Path]:
    return cache_dir / f"{name}.txt", cache_dir / f"{name}.meta.json"


def _download(url: str, cache_dir: Path, name: str, force: bool = False) -> tuple[str, str]:
    """Return (text, retrieval_utc_iso). Cached files carry their own retrieval timestamp."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    data_path, meta_path = _cache_paths(cache_dir, name)
    if data_path.exists() and meta_path.exists() and not force:
        meta = json.loads(meta_path.read_text())
        return data_path.read_text(), str(meta.get("retrieved_utc", "unknown"))

    response = requests.get(url, timeout=DEFAULT_TIMEOUT)
    response.raise_for_status()
    text = response.text
    if len(text) < 200:
        raise IndexParseError(f"{url} returned {len(text)} characters — not an index file")
    retrieved = _utcnow()
    data_path.write_text(text)
    meta_path.write_text(
        json.dumps({"url": url, "retrieved_utc": retrieved, "bytes": len(text.encode()), "source": "NOAA PSL"}, indent=2)
    )
    return text, retrieved


def _series(name: str, url: str, cache_dir: Path, force: bool) -> pd.DataFrame:
    text, retrieved = _download(url, cache_dir, name, force)
    frame = parse_year_table(text)
    # A plain Series keeps the NaN months; pivot_table would silently drop them.
    series = pd.Series(frame["value"].to_numpy(), index=pd.DatetimeIndex(frame["date"])).sort_index()
    wide = series.to_frame(name=name)
    wide.attrs["retrieved_utc"] = retrieved
    wide.attrs["source_url"] = url
    wide.attrs["missing_codes"] = parse_missing_code(text)
    return wide


def oni(cache_dir: Path = CACHE_DIR, force: bool = False) -> pd.DataFrame:
    """ONR/PSL ONI: 3-month running mean of Niño 3.4 anomalies, indexed by the centre month.

    So ``DJF`` is the January column of the following year and ``FMA`` is February.
    """
    return _series("oni", ONI_URL, cache_dir, force)


def dmi(cache_dir: Path = CACHE_DIR, force: bool = False) -> pd.DataFrame:
    """PSL DMI (HadISST1.1): dipole z-score per calendar month."""
    return _series("dmi", DMI_URL, cache_dir, force)


def seasonal_mean(frame: pd.DataFrame, months: list[int], year: int) -> float:
    """Mean of `months` in `year`; NaN unless every month is present.

    Callers must only ask for windows that closed before the issue date — features.py
    enforces that, so a NaN here means the index itself has not published the month yet.
    """
    values = [frame["value"].get(pd.Timestamp(year=year, month=m, day=1)) for m in months]
    values = [float(v) for v in values if v is not None and not pd.isna(v)]
    if len(values) != len(months):
        return float("nan")
    return sum(values) / len(values)
