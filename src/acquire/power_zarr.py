"""NASA POWER on AWS Open Data — a minimal, read-only Zarr v2 reader over HTTPS.

NASA POWER publishes the same v10 archive its point API serves as public Zarr stores in the
``nasa-power`` S3 bucket (AWS Registry of Open Data, https://registry.opendata.aws/nasa-power/;
no key, no Earthdata login). Three stores are used here:

* ``merra2_daily``   — POWER's MERRA-2–based daily meteorology (PRECTOTCORR, T2M, T2M_MAX,
  T2M_MIN, RH2M, GWETROOT …) on the native 0.5° × 0.625° grid, local solar time, 1981 → present.
  This is the source the daily point API answers from.
* ``merra2_monthly`` — the monthly means of the same product; its ``TS`` (skin temperature) over
  open ocean is MERRA-2's sea-surface skin temperature, which `indices.py` turns into Niño 3.4 and
  Indian-Ocean-Dipole indices so the forecast needs no non-NASA climate index.
* ``imerg_daily``    — POWER's daily aggregation of NASA/JAXA GPM IMERG precipitation
  (``IMERG_PRECTOT``, mm/day, 0.1°, 1998 → present), the independent satellite rainfall product
  that replaces CHIRPS as the cross-check and as the forecast's label source.
* ``syn1deg_daily``  — CERES SYN1deg surface irradiance (ALLSKY_SFC_SW_DWN), 2001 → present.

The reader fetches ``.zmetadata`` once, then only the chunks a request touches; each compressed
chunk is cached on disk exactly as downloaded, so a rerun is offline and byte-identical. Chunks
are decoded with ``numcodecs`` (Blosc + FixedScaleOffset, as declared per array). A chunk the
bucket does not hold (HTTP 403/404) is the array's fill value — POWER pre-allocates the time axis
to 2029 — so it decodes to NaN, never to a plausible number.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import cached_property
from itertools import product
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import requests

BUCKET_URL = os.environ.get("POWER_ZARR_URL", "https://nasa-power.s3.amazonaws.com")
REGISTRY_URL = "https://registry.opendata.aws/nasa-power/"
STORES = {
    "merra2_daily": "merra2/temporal/power_merra2_daily_temporal_lst.zarr",
    "merra2_monthly": "merra2/temporal/power_merra2_monthly_temporal_utc.zarr",
    "imerg_daily": "imerg/temporal/power_imerg_daily_temporal_utc.zarr",
    "syn1deg_daily": "syn1deg/temporal/power_syn1deg_daily_temporal_lst.zarr",
}
DEFAULT_CACHE = Path(os.environ.get("POWER_ZARR_CACHE", "cache/power_zarr"))
USER_AGENT = "FieldShift/0.2 (NASA Space Apps 2026; scientific demo; static JSON packs)"
TIMEOUT_S = 300
MAX_RETRIES = 4


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _get(url: str, session: requests.Session) -> requests.Response | None:
    """GET with retry; ``None`` for a chunk the bucket does not hold."""
    last: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            response = session.get(url, timeout=TIMEOUT_S, headers={"User-Agent": USER_AGENT})
        except requests.RequestException as exc:
            last = exc
        else:
            if response.status_code == 200:
                return response
            if response.status_code in (403, 404):
                return None
            last = RuntimeError(f"HTTP {response.status_code} for {url}")
        time.sleep(2.0 * 2**attempt)
    raise RuntimeError(f"NASA POWER S3 request failed after {MAX_RETRIES} attempts: {last}")


def _decode_time(values: np.ndarray, units: str) -> pd.DatetimeIndex:
    step, _, origin = units.partition(" since ")
    if step.strip() != "days":
        raise ValueError(f"unsupported time units {units!r}")
    return pd.DatetimeIndex(pd.Timestamp(origin.strip()) + pd.to_timedelta(values.astype("float64"), unit="D"))


@dataclass
class ZarrStore:
    """One POWER Zarr store, read chunk by chunk with an on-disk cache."""

    name: str
    cache_dir: Path = DEFAULT_CACHE
    session: requests.Session | None = None

    def __post_init__(self) -> None:
        if self.name not in STORES:
            raise ValueError(f"unknown store {self.name!r} (one of {sorted(STORES)})")
        self.cache_dir = Path(self.cache_dir) / self.name
        self.session = self.session or requests.Session()

    @property
    def url(self) -> str:
        return f"{BUCKET_URL}/{STORES[self.name]}"

    @cached_property
    def metadata(self) -> dict[str, Any]:
        path = self.cache_dir / ".zmetadata"
        meta_path = self.cache_dir / ".retrieved.json"
        if not path.exists():
            response = _get(f"{self.url}/.zmetadata", self.session)
            if response is None:
                raise FileNotFoundError(f"{self.url}/.zmetadata is not readable")
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            path.write_bytes(response.content)
            meta_path.write_text(json.dumps({"retrieved_utc": _utc_now_iso(), "url": self.url}, indent=2))
        return json.loads(path.read_text())["metadata"]

    @property
    def retrieved_utc(self) -> str:
        self.metadata  # noqa: B018 - make sure the sidecar exists
        meta_path = self.cache_dir / ".retrieved.json"
        return str(json.loads(meta_path.read_text()).get("retrieved_utc", "unknown")) if meta_path.exists() else "unknown"

    @property
    def attrs(self) -> dict[str, Any]:
        return dict(self.metadata.get(".zattrs", {}))

    def variables(self) -> list[str]:
        return sorted(key[: -len("/.zarray")] for key in self.metadata if key.endswith("/.zarray"))

    def array_meta(self, var: str) -> dict[str, Any]:
        key = f"{var}/.zarray"
        if key not in self.metadata:
            raise KeyError(f"{var!r} is not in store {self.name} ({', '.join(self.variables())})")
        return self.metadata[key]

    def var_attrs(self, var: str) -> dict[str, Any]:
        return dict(self.metadata.get(f"{var}/.zattrs", {}))

    # -- coordinates -----------------------------------------------------------------------
    @cached_property
    def lat(self) -> np.ndarray:
        return self._read_full("lat").astype("float64")

    @cached_property
    def lon(self) -> np.ndarray:
        return self._read_full("lon").astype("float64")

    @cached_property
    def time(self) -> pd.DatetimeIndex:
        return _decode_time(self._read_full("time"), str(self.var_attrs("time")["units"]))

    def _read_full(self, var: str) -> np.ndarray:
        meta = self.array_meta(var)
        return self.read(var, tuple(slice(0, n) for n in meta["shape"]))

    # -- chunk I/O ---------------------------------------------------------------------------
    def _chunk_bytes(self, var: str, key: str) -> bytes | None:
        path = self.cache_dir / var / key
        missing = path.with_suffix(path.suffix + ".missing") if path.suffix else Path(str(path) + ".missing")
        if path.exists():
            return path.read_bytes()
        if missing.exists():
            return None
        response = _get(f"{self.url}/{var}/{key}", self.session)
        path.parent.mkdir(parents=True, exist_ok=True)
        if response is None:
            missing.write_text("")
            return None
        tmp = Path(str(path) + ".tmp")
        tmp.write_bytes(response.content)
        tmp.replace(path)
        return response.content

    def _decode(self, meta: dict[str, Any], raw: bytes | None) -> np.ndarray:
        import numcodecs

        chunks = tuple(meta["chunks"])
        dtype = np.dtype(meta["dtype"])
        if raw is None:
            fill = meta.get("fill_value")
            fill = np.nan if fill in (None, "NaN") else fill
            out_dtype = np.float64 if fill is np.nan and dtype.kind in "iu" else dtype
            return np.full(chunks, fill, dtype=out_dtype)
        data: Any = raw
        if meta.get("compressor"):
            data = numcodecs.get_codec(meta["compressor"]).decode(data)
        array = np.frombuffer(data, dtype=dtype) if not isinstance(data, np.ndarray) else data.view(dtype)
        for spec in reversed(meta.get("filters") or []):
            array = numcodecs.get_codec(spec).decode(array)
        array = np.asarray(array).reshape(chunks, order=meta.get("order", "C"))
        fill = meta.get("fill_value")
        if fill not in (None, "NaN") and dtype.kind == "f":
            array = np.where(array == fill, np.nan, array)
        return array

    def read(self, var: str, index: tuple[slice, ...]) -> np.ndarray:
        """Read ``var[index]`` (contiguous slices only), fetching just the chunks it touches."""
        meta = self.array_meta(var)
        shape, chunks = meta["shape"], meta["chunks"]
        bounds = [(s.start or 0, min(s.stop if s.stop is not None else n, n)) for s, n in zip(index, shape, strict=True)]
        if any(lo >= hi for lo, hi in bounds):
            raise ValueError(f"empty selection {bounds} for {var}")
        out: np.ndarray | None = None
        ranges = [range(lo // c, (hi - 1) // c + 1) for (lo, hi), c in zip(bounds, chunks, strict=True)]
        for block in product(*ranges):
            key = ".".join(str(b) for b in block)
            chunk = self._decode(meta, self._chunk_bytes(var, key))
            src, dst = [], []
            for b, (lo, hi), c in zip(block, bounds, chunks, strict=True):
                start, stop = max(lo, b * c), min(hi, (b + 1) * c)
                src.append(slice(start - b * c, stop - b * c))
                dst.append(slice(start - lo, stop - lo))
            if out is None:
                # Everything read here is numeric and may hold NaN fills, so float64 throughout.
                out = np.full([hi - lo for lo, hi in bounds], np.nan, dtype=np.float64)
            out[tuple(dst)] = chunk[tuple(src)]
        assert out is not None
        return out

    # -- convenience -----------------------------------------------------------------------
    def nearest_index(self, lat: float, lon: float) -> tuple[int, int]:
        return int(np.abs(self.lat - float(lat)).argmin()), int(np.abs(self.lon - float(lon)).argmin())

    def cell_of(self, lat: float, lon: float) -> tuple[float, float]:
        i, j = self.nearest_index(lat, lon)
        return round(float(self.lat[i]), 4), round(float(self.lon[j]), 4)

    def time_slice(self, start: str | pd.Timestamp, end: str | pd.Timestamp) -> slice:
        times = self.time
        lo = int(times.searchsorted(pd.Timestamp(start), side="left"))
        hi = int(times.searchsorted(pd.Timestamp(end), side="right"))
        return slice(lo, hi)

    def box(
        self,
        var: str,
        lat_range: tuple[float, float],
        lon_range: tuple[float, float],
        start: str | pd.Timestamp,
        end: str | pd.Timestamp,
    ):
        """``var`` over a lat/lon box and a date range, as an xarray DataArray (time, lat, lon)."""
        import xarray as xr

        lat_idx = np.where((self.lat >= min(lat_range)) & (self.lat <= max(lat_range)))[0]
        lon_idx = np.where((self.lon >= min(lon_range)) & (self.lon <= max(lon_range)))[0]
        if lat_idx.size == 0 or lon_idx.size == 0:
            raise ValueError(f"box {lat_range}×{lon_range} holds no grid cell of {self.name}")
        tsl = self.time_slice(start, end)
        values = self.read(var, (tsl, slice(int(lat_idx[0]), int(lat_idx[-1]) + 1), slice(int(lon_idx[0]), int(lon_idx[-1]) + 1)))
        return xr.DataArray(
            values,
            dims=("time", "lat", "lon"),
            coords={"time": self.time[tsl], "lat": self.lat[lat_idx[0] : lat_idx[-1] + 1], "lon": self.lon[lon_idx[0] : lon_idx[-1] + 1]},
            name=var,
            attrs=self.var_attrs(var),
        )

    def point(self, var: str, lat: float, lon: float, start: str | pd.Timestamp, end: str | pd.Timestamp) -> pd.Series:
        """Daily (or monthly) series of ``var`` at the grid cell containing the point."""
        i, j = self.nearest_index(lat, lon)
        tsl = self.time_slice(start, end)
        values = self.read(var, (tsl, slice(i, i + 1), slice(j, j + 1)))[:, 0, 0].astype("float64")
        return pd.Series(values, index=pd.DatetimeIndex(self.time[tsl], name="date"), name=var)


def provenance(store: ZarrStore) -> dict[str, Any]:
    """What the store says about itself, for the packs' data-source entries."""
    attrs = store.attrs
    return {
        "store": store.name,
        "url": store.url,
        "registry": REGISTRY_URL,
        "version": attrs.get("version"),
        "institution": attrs.get("institution"),
        "dateCreated": attrs.get("date_created"),
        "timeStandard": attrs.get("time_standard"),
        "gridDegrees": [attrs.get("geospatial_lat_resolution"), attrs.get("geospatial_lon_resolution")],
        "retrievedUtc": store.retrieved_utc,
    }
