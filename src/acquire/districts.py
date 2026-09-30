"""Bangladesh district (ADM2) centroids from geoBoundaries gbOpen.

Source: https://www.geoboundaries.org/api/current/gbOpen/BGD/ADM2/ -> ``gjDownloadURL``.
The raw GeoJSON is cached under ``cache/`` (gitignored); the derived centroid table is
committed at ``src/acquire/bd_districts.csv`` so the pack build and the app can run
without re-downloading 46 MB of boundaries.

Centroid method (documented deliberately): shapely ``representative_point()``, i.e. a
point *guaranteed to lie inside* the district polygon (a pole of inaccessibility
approximation), not ``centroid()``, which can fall outside a concave or multipart
district and would then sample POWER over the wrong cell (river islands, coastal
Bhola/Patuakhali, the hilly east). Both are written to the CSV so the choice is visible.
"""

from __future__ import annotations

import csv
import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from shapely.geometry import shape

API_URL = "https://www.geoboundaries.org/api/current/gbOpen/BGD/ADM2/"
USER_AGENT = "FieldShift/0.1 (NASA Space Apps 2026 team; scientific demo)"
REPO_ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = REPO_ROOT / "cache"
GEOJSON_PATH = CACHE_DIR / "geoBoundaries-BGD-ADM2.geojson"
CSV_PATH = Path(__file__).with_name("bd_districts.csv")
EXPECTED_DISTRICT_COUNT = 64


def _utc_today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def download_geojson(cache_path: Path = GEOJSON_PATH, *, force: bool = False) -> tuple[Path, str, str]:
    """Return (path, gjDownloadURL, retrieved_date). Re-uses the cache when present."""
    cache_path = Path(cache_path)
    meta_path = cache_path.with_suffix(".meta.json")
    if not force and cache_path.exists():
        retrieved = _utc_today()
        source_url = ""
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())
            retrieved = str(meta.get("retrieved_utc", retrieved))[:10]
            source_url = str(meta.get("gjDownloadURL", ""))
        return cache_path, source_url, retrieved

    api = requests.get(API_URL, timeout=120, headers={"User-Agent": USER_AGENT})
    api.raise_for_status()
    info = api.json()
    source_url = info["gjDownloadURL"]
    response = requests.get(source_url, timeout=600, headers={"User-Agent": USER_AGENT})
    response.raise_for_status()
    payload = response.json()

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(payload))
    retrieved_utc = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    meta_path.write_text(
        json.dumps(
            {
                "retrieved_utc": retrieved_utc,
                "apiURL": API_URL,
                "gjDownloadURL": source_url,
                "boundarySource": info.get("boundarySource"),
                "license": info.get("boundaryLicense"),
                "admUnitCount": info.get("admUnitCount"),
                "boundaryYearRepresented": info.get("boundaryYearRepresented"),
                "buildDate": info.get("buildDate"),
            },
            indent=2,
        )
    )
    return cache_path, source_url, retrieved_utc[:10]


def district_centroids(cache_path: Path = GEOJSON_PATH) -> list[dict]:
    """One row per ADM2 unit: name, slug, representative point, centroid, source, date."""
    path, source_url, retrieved = download_geojson(cache_path)
    features = json.loads(path.read_text())["features"]
    if len(features) != EXPECTED_DISTRICT_COUNT:
        raise ValueError(
            f"geoBoundaries gbOpen BGD ADM2 returned {len(features)} features, expected {EXPECTED_DISTRICT_COUNT} districts"
        )

    rows: list[dict] = []
    for feature in features:
        properties = feature["properties"]
        name = str(properties.get("shapeName", "")).strip()
        if not name:
            continue
        geometry = shape(feature["geometry"])
        anchor = geometry.representative_point()
        centre = geometry.centroid
        rows.append(
            {
                "name": name,
                "slug": slugify(name),
                "lat": round(anchor.y, 4),
                "lon": round(anchor.x, 4),
                "centroid_lat": round(centre.y, 4),
                "centroid_lon": round(centre.x, 4),
                "method": "shapely representative_point (pole of inaccessibility, inside the polygon)",
                "source_url": source_url or "https://www.geoboundaries.org/api/current/gbOpen/BGD/ADM2/",
                "retrieved": retrieved,
            }
        )
    rows.sort(key=lambda row: row["slug"])
    return rows


def slugify(name: str) -> str:
    cleaned = "".join(character if character.isalnum() else "-" for character in name.lower())
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-")


def write_csv(rows: list[dict], csv_path: Path = CSV_PATH) -> Path:
    csv_path = Path(csv_path)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return csv_path


def load_csv(csv_path: Path = CSV_PATH) -> list[dict]:
    with Path(csv_path).open(newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    rows = district_centroids()
    path = write_csv(rows)
    print(f"{len(rows)} districts -> {path}")
    for row in rows[:3]:
        print(f"  {row['name']:<20} {row['lat']},{row['lon']}  (centroid {row['centroid_lat']},{row['centroid_lon']})")


if __name__ == "__main__":
    main()
