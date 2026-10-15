"""The NASA POWER Zarr reader, exercised fully offline through its own on-disk chunk cache."""

import json

import numcodecs
import numpy as np
import pandas as pd
import pytest

from src.acquire import power_zarr

META = {
    "time": {"shape": [6], "chunks": [6], "dtype": "<f8", "compressor": None, "filters": None, "fill_value": "NaN", "order": "C", "zarr_format": 2},
    "lat": {"shape": [4], "chunks": [4], "dtype": "<f8", "compressor": None, "filters": None, "fill_value": "NaN", "order": "C", "zarr_format": 2},
    "lon": {"shape": [4], "chunks": [4], "dtype": "<f8", "compressor": None, "filters": None, "fill_value": "NaN", "order": "C", "zarr_format": 2},
    "PRECTOTCORR": {
        "shape": [6, 4, 4],
        "chunks": [4, 2, 2],
        "dtype": "<f4",
        "compressor": {"id": "blosc", "cname": "zstd", "clevel": 3, "shuffle": 2, "blocksize": 0},
        "filters": [{"id": "fixedscaleoffset", "offset": 1000, "scale": 100, "dtype": "<f4", "astype": "<f4"}],
        "fill_value": "NaN",
        "order": "C",
        "zarr_format": 2,
    },
}
TRUTH = np.arange(6 * 4 * 4, dtype="float32").reshape(6, 4, 4) / 4.0


def _write_store(root):
    store = root / "merra2_daily"
    store.mkdir(parents=True)
    metadata = {".zattrs": {"version": "POWER Version 10.0.0"}}
    for name, meta in META.items():
        metadata[f"{name}/.zarray"] = meta
    metadata["time/.zattrs"] = {"units": "days since 2020-01-01 00:00:00"}
    (store / ".zmetadata").write_text(json.dumps({"metadata": metadata}))
    (store / ".retrieved.json").write_text(json.dumps({"retrieved_utc": "2026-10-15T00:00:00+00:00"}))
    for name, values in {"time": np.arange(6.0), "lat": np.array([20.0, 20.5, 21.0, 21.5]), "lon": np.array([88.0, 88.625, 89.25, 89.875])}.items():
        (store / name).mkdir()
        (store / name / "0").write_bytes(values.astype("<f8").tobytes())
    codec = numcodecs.get_codec(META["PRECTOTCORR"]["compressor"])
    scale = numcodecs.get_codec(META["PRECTOTCORR"]["filters"][0])
    (store / "PRECTOTCORR").mkdir()
    for t in range(2):
        for i in range(2):
            for j in range(2):
                block = np.full((4, 2, 2), np.nan, dtype="float32")
                part = TRUTH[t * 4 : t * 4 + 4, i * 2 : i * 2 + 2, j * 2 : j * 2 + 2]
                block[: part.shape[0]] = part
                if (t, i, j) == (1, 1, 1):
                    # A chunk the bucket does not hold: the reader must give NaN, not a number.
                    (store / "PRECTOTCORR" / f"{t}.{i}.{j}.missing").write_text("")
                    continue
                encoded = codec.encode(scale.encode(block))
                (store / "PRECTOTCORR" / f"{t}.{i}.{j}").write_bytes(encoded)
    return root


@pytest.fixture
def store(tmp_path):
    return power_zarr.ZarrStore("merra2_daily", cache_dir=_write_store(tmp_path))


def test_coordinates_and_time_decode(store):
    assert store.time[0] == pd.Timestamp("2020-01-01") and store.time[-1] == pd.Timestamp("2020-01-06")
    assert store.cell_of(20.6, 89.3) == (20.5, 89.25)


def test_read_across_chunk_boundaries_matches_the_array(store):
    got = store.read("PRECTOTCORR", (slice(1, 6), slice(1, 3), slice(0, 2)))
    np.testing.assert_allclose(got, TRUTH[1:6, 1:3, 0:2], atol=0.01)


def test_a_missing_chunk_is_nan(store):
    got = store.read("PRECTOTCORR", (slice(4, 6), slice(2, 4), slice(2, 4)))
    assert np.isnan(got).all()


def test_point_series_is_the_containing_cell(store):
    series = store.point("PRECTOTCORR", 21.0, 88.6, "2020-01-02", "2020-01-04")
    assert list(series.index) == list(pd.date_range("2020-01-02", "2020-01-04"))
    np.testing.assert_allclose(series.to_numpy(), TRUTH[1:4, 2, 1], atol=0.01)


def test_box_returns_labelled_coordinates(store):
    box = store.box("PRECTOTCORR", (20.4, 21.1), (88.5, 89.3), "2020-01-01", "2020-01-02")
    assert list(box["lat"].values) == [20.5, 21.0] and list(box["lon"].values) == [88.625, 89.25]
    np.testing.assert_allclose(box.values, TRUTH[0:2, 1:3, 1:3], atol=0.01)


def test_unknown_store_and_variable_are_refused(store, tmp_path):
    with pytest.raises(ValueError):
        power_zarr.ZarrStore("era5", cache_dir=tmp_path)
    with pytest.raises(KeyError):
        store.array_meta("NOT_A_VARIABLE")


def test_provenance_reports_store_and_retrieval(store):
    meta = power_zarr.provenance(store)
    assert meta["version"] == "POWER Version 10.0.0"
    assert meta["retrievedUtc"] == "2026-10-15T00:00:00+00:00"
    assert meta["registry"] == power_zarr.REGISTRY_URL
