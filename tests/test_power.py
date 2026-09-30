"""NASA POWER acquisition: fill handling, cache reuse, request shape. No network."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from src.acquire import power


def payload(start: str, end: str, values: dict[str, dict[str, float]], fill: float = -999.0) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [89.915, 24.251, 12.0]},
        "properties": {"parameter": values},
        "header": {
            "title": "NASA/POWER Source Native Resolution Daily Data",
            "api": {"version": "v2.10.0", "name": "POWER Daily API"},
            "sources": ["MERRA2"],
            "fill_value": fill,
            "time_standard": "LST",
            "start": start,
            "end": end,
        },
        "messages": [],
    }


def test_fill_value_minus999_becomes_nan() -> None:
    frame = power.parse_payload(
        payload(
            "20200101",
            "20200104",
            {"PRECTOTCORR": {"20200101": 3.2, "20200102": -999.0, "20200103": 0.0, "20200104": -999}},
        )
    )
    assert frame["PRECTOTCORR"].tolist()[1] != frame["PRECTOTCORR"].tolist()[1]  # NaN, not -999
    assert frame["PRECTOTCORR"].tolist()[3] != frame["PRECTOTCORR"].tolist()[3]
    assert frame["PRECTOTCORR"].tolist()[0] == 3.2
    assert frame["PRECTOTCORR"].tolist()[2] == 0.0  # a real zero stays zero
    assert not (frame.to_numpy() == -999).any()


def test_header_declared_fill_value_is_nan_too() -> None:
    frame = power.parse_payload(payload("20200101", "20200103", {"T2M": {"20200101": 25.0, "20200102": -888.0, "20200103": 26.0}}, fill=-888.0))
    assert np.isnan(frame["T2M"].iloc[1])
    assert frame.attrs["fill_values_treated_as_nan"] == [-999.0, -888.0]


def test_non_numeric_value_becomes_nan_and_bad_dates_are_skipped() -> None:
    frame = power.parse_payload(
        payload("20200101", "20200102", {"T2M": {"20200101": "n/a", "20200102": 20.5, "not-a-date": 5.0}})
    )
    # a dated entry with an unreadable value keeps its date and becomes NaN (never 0),
    # and a key that is not YYYYMMDD is dropped rather than guessed at
    assert len(frame) == 2
    assert np.isnan(frame["T2M"].iloc[0])
    assert frame["T2M"].iloc[1] == 20.5
    assert frame.index[0].strftime("%Y%m%d") == "20200101"
    assert "not-a-date" not in json.dumps(list(frame.index.strftime("%Y%m%d")))


class FakeResponse:
    def __init__(self, body: dict, status_code: int = 200) -> None:
        self._body = body
        self.status_code = status_code
        self.headers: dict[str, str] = {}
        self.text = json.dumps(body)
        self.content = json.dumps(body).encode()

    def json(self) -> dict:
        return self._body


@pytest.fixture
def network(monkeypatch):
    """Patch requests.Session.get; records every outbound query so cache hits are provable."""

    calls: list[dict] = []

    class FakeSession:
        def get(self, url, params=None, timeout=None, headers=None):
            calls.append({"url": url, "params": dict(params or {})})
            days = pd.date_range(pd.Timestamp(params["start"]), pd.Timestamp(params["end"]), freq="D")
            values = {stamp.strftime("%Y%m%d"): (1.0 if stamp.day == 1 else 0.0) for stamp in days}
            values["20200102"] = -999.0
            return FakeResponse(payload(params["start"], params["end"], {"PRECTOTCORR": values}))

    monkeypatch.setattr(power.requests, "Session", FakeSession)
    monkeypatch.setattr(power, "MIN_REQUEST_INTERVAL_S", 0.0)
    return calls


def test_first_fetch_hits_network_and_writes_cache(network, tmp_path: Path) -> None:
    frame = power.fetch_daily(24.2514, 89.9152, "20200101", "20200110", ["PRECTOTCORR"], cache_dir=tmp_path)
    assert len(network) == 1
    assert frame.attrs["retrieval_source"] == "network"
    assert network[0]["params"]["community"] == "AG"
    assert network[0]["params"]["format"] == "JSON"
    assert network[0]["params"]["parameters"] == "PRECTOTCORR"
    assert json.loads(Path(frame.attrs["cache_meta_path"]).read_text())["retrieved_utc"] == frame.attrs["retrieved_utc"]


def test_cache_hit_makes_no_request_and_keeps_the_original_timestamp(network, tmp_path: Path) -> None:
    first = power.fetch_daily(24.2514, 89.9152, "20200101", "20200110", ["PRECTOTCORR"], cache_dir=tmp_path)
    second = power.fetch_daily(24.2514, 89.9152, "20200101", "20200110", ["PRECTOTCORR"], cache_dir=tmp_path)
    assert len(network) == 1  # the second call never touched the network
    assert second.attrs["retrieval_source"] == "cache"
    assert second.attrs["retrieved_utc"] == first.attrs["retrieved_utc"]
    assert second.equals(first)


def test_different_window_is_a_different_cache_key(network, tmp_path: Path) -> None:
    power.fetch_daily(24.2514, 89.9152, "20200101", "20200110", ["PRECTOTCORR"], cache_dir=tmp_path)
    power.fetch_daily(24.2514, 89.9152, "20200101", "20200210", ["PRECTOTCORR"], cache_dir=tmp_path)
    assert len(network) == 2


def test_default_end_is_yesterday_utc(network, tmp_path: Path) -> None:
    frame = power.fetch_daily(24.2514, 89.9152, "20200101", None, ["PRECTOTCORR"], cache_dir=tmp_path)
    expected = power._yesterday()
    assert network[0]["params"]["end"] == expected
    assert frame.attrs["end"] == expected


def test_more_than_twenty_parameters_is_rejected_before_any_request(network, tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="20"):
        power.fetch_daily(24.2514, 89.9152, "20200101", "20200110", [f"P{i}" for i in range(21)], cache_dir=tmp_path)
    assert network == []


def test_bad_coordinates_rejected_without_network(network, tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        power.fetch_daily(95.0, 89.9, cache_dir=tmp_path)
    assert network == []
