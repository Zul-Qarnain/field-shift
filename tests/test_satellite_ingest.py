"""Unit tests for live satellite data ingestion modules (MODIS, SMAP, GRACE)."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.acquire import grace, modis, smap


def test_modis_parse_records_handles_scaling_and_reliability() -> None:
    raw_payload = {
        "subset": [
            {
                "modis_date": "A2024001",
                "calendar_date": "2024-01-01",
                "band": "250m_16_days_NDVI",
                "data": [6245],
            },
            {
                "modis_date": "A2024001",
                "calendar_date": "2024-01-01",
                "band": "250m_16_days_EVI",
                "data": [4120],
            },
            {
                "modis_date": "A2024001",
                "calendar_date": "2024-01-01",
                "band": "250m_16_days_pixel_reliability",
                "data": [0],
            },
        ]
    }
    records = modis.parse_modis_records(raw_payload)
    assert len(records) == 1
    rec = records[0]
    assert rec["date"] == "2024-01-01"
    assert rec["ndvi"] == 0.6245  # 6245 * 0.0001
    assert rec["evi"] == 0.4120  # 4120 * 0.0001
    assert rec["reliability"] == 0


def test_modis_ingest_graceful_fallback_on_network_error() -> None:
    with patch("src.acquire.modis.fetch_modis_subset", side_effect=OSError("Network unreachable")):
        res = modis.ingest_live_ndvi(24.2514, 89.9152, force_refresh=True)
        assert res["available"] is False
        assert "live_unavailable" in res["status"]
        assert res["tierLabel"] == "NASA EOSDIS (Terra MODIS)"
        assert res["coordinates"]["lat"] == 24.2514


def test_smap_ingest_computes_volumetric_wetness_and_provenance() -> None:
    mock_granule = {
        "producer_granule_id": "SMAP_L4_SM_gph_20261113_001.h5",
        "time_start": "2026-11-13T00:00:00.000Z",
    }
    with patch("src.acquire.smap.query_cmr_granules", return_value=[mock_granule]):
        res = smap.ingest_live_smap(24.2514, 89.9152, modeled_gwetroot=0.72, force_refresh=True)
        assert res["available"] is True
        assert res["status"] == "live_granules_verified"
        assert res["resolutionKm"] == 9.0
        assert res["rootZoneSoilMoistureM3M3"] == round(0.72 * 0.45, 3)
        assert res["rootZoneRelativeSaturationPct"] == 72.0
        assert res["latestGranuleId"] == "SMAP_L4_SM_gph_20261113_001.h5"


def test_grace_regional_trends_distinguish_northwest_from_south() -> None:
    mock_granule = {
        "producer_granule_id": "GRCTellus.JPL.200204_202609.GLO.RL06.3M.MSCNv04CRI",
        "time_start": "2002-04-16T00:00:00.000Z",
    }
    with patch("src.acquire.grace.query_grace_cmr", return_value=mock_granule):
        rajshahi = grace.ingest_live_grace("Rajshahi", 24.3636, 88.3277, force_refresh=True)
        barishal = grace.ingest_live_grace("Barishal", 22.8486, 90.2512, force_refresh=True)

        assert rajshahi["available"] is True
        assert barishal["available"] is True

        # Northwest Barind has severe groundwater depletion from tubewell irrigation
        assert rajshahi["waterStorageTrendCmPerYear"] <= -1.0
        assert rajshahi["depletionStatus"] == "severe_depletion"

        # Southern delta has near-neutral / stable buffer
        assert barishal["waterStorageTrendCmPerYear"] >= 0.0
        assert barishal["depletionStatus"] == "stable_or_recharging"
