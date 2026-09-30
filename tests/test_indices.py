"""Parsing of the NOAA climate-index text files. Uses saved fixtures — no network."""

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from src.acquire import indices

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def oni_text():
    return (FIXTURES / "oni_tiny.txt").read_text()


@pytest.fixture
def dmi_text():
    return (FIXTURES / "dmi_tiny.txt").read_text()


def test_oni_missing_code_is_read_from_the_file(oni_text):
    assert indices.parse_missing_code(oni_text) == [-99.9]


def test_dmi_missing_code_is_read_from_the_file(dmi_text):
    assert indices.parse_missing_code(dmi_text) == [-9999.0]


def test_oni_header_and_footer_lines_are_not_rows(oni_text):
    frame = indices.parse_year_table(oni_text)
    assert sorted(frame["year"].unique()) == [1980, 1981, 1982, 1983]
    # Four years x twelve months; the trailing "-99.9" sentinel line is not a data row.
    assert len(frame) == 48


def test_oni_values_and_missing_months(oni_text):
    frame = indices.parse_year_table(oni_text)
    jan80 = frame[(frame["year"] == 1980) & (frame["month"] == 1)]["value"].iloc[0]
    assert jan80 == pytest.approx(-0.50)
    tail = frame[(frame["year"] == 1983) & (frame["month"] >= 6)]["value"]
    assert tail.isna().all(), "the -99.90 padding must become NaN, not a number"
    assert frame[(frame["year"] == 1983) & (frame["month"] == 5)]["value"].iloc[0] == pytest.approx(-1.25)


def test_dmi_uses_its_own_nine_thousand_sentinel(dmi_text):
    frame = indices.parse_year_table(dmi_text, missing=indices.parse_missing_code(dmi_text))
    assert frame[(frame["year"] == 1983) & (frame["month"] == 5)]["value"].isna().all()
    assert frame[(frame["year"] == 1980) & (frame["month"] == 1)]["value"].iloc[0] == pytest.approx(-0.438)


def test_parse_rejects_an_empty_or_prose_file():
    with pytest.raises(indices.IndexParseError):
        indices.parse_year_table("no rows here\njust text\n")


def test_download_writes_cache_and_meta(tmp_path, monkeypatch, oni_text):
    calls = {"n": 0}

    class Resp:
        text = oni_text

        def raise_for_status(self):
            return None

    def fake_get(url, timeout):
        calls["n"] += 1
        return Resp()

    monkeypatch.setattr(indices.requests, "get", fake_get)
    cache = tmp_path / "indices"
    frame = indices.oni(cache_dir=cache)

    assert calls["n"] == 1
    assert (cache / "oni.txt").read_text() == oni_text
    meta = json.loads((cache / "oni.meta.json").read_text())
    assert meta["url"] == indices.ONI_URL
    assert meta["retrieved_utc"] == frame.attrs["retrieved_utc"]
    assert frame.attrs["retrieved_utc"].endswith("+00:00")

    # Second call is served from the cache and does not touch the network again.
    again = indices.oni(cache_dir=cache)
    assert calls["n"] == 1
    assert again.index.equals(frame.index)
    assert again.attrs["retrieved_utc"] == frame.attrs["retrieved_utc"]


def test_cached_file_too_short_is_rejected(tmp_path, monkeypatch):
    class Resp:
        text = "404"

        def raise_for_status(self):
            return None

    monkeypatch.setattr(indices.requests, "get", lambda url, timeout: Resp())
    with pytest.raises(indices.IndexParseError):
        indices.oni(cache_dir=tmp_path)
    assert not (tmp_path / "oni.txt").exists(), "a failed download must not be cached"


def test_series_is_monthly_and_wide(tmp_path, monkeypatch, dmi_text):
    class Resp:
        text = dmi_text

        def raise_for_status(self):
            return None

    monkeypatch.setattr(indices.requests, "get", lambda url, timeout: Resp())
    frame = indices.dmi(cache_dir=tmp_path)
    assert list(frame.columns) == ["dmi"]
    assert isinstance(frame.index, pd.DatetimeIndex)
    assert frame.index[0] == pd.Timestamp(1980, 1, 1)
    assert np.isnan(frame.loc[pd.Timestamp(1983, 6, 1), "dmi"])
