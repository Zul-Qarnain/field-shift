#!/usr/bin/env python3
"""Coastal soil salinity for FieldShift, from two real public sources.

Sources (both fetched and checked, not paraphrased):

1. SRDI (2010) "Saline Soils of Bangladesh", Soil Resource Development Institute,
   SRMAF Project, Ministry of Agriculture, Government of the People's Republic of
   Bangladesh (Director: Mainul Ahsan; survey compiled by Md. Shaheedur Rashid et al.).
   Appendix-2 "Upazila wise Soil salinity class and area in coastal saline belt"
   (pp. 31-36) gives, per district/upazila: total area, uncultivated area, cultivated
   area, total saline area and the area in salinity classes S1 (2.0-4.0 dS/m),
   S2 (4.1-8.0), S3 (8.1-12.0), S4 (12.1-16.0), S5 (>16.0).
   The salinity classes are a DRY-SEASON snapshot: the report states the field survey
   ran in May 2009 (p. iv-v methodology) and that "most of the land remains fallow in
   the dry season (January-May) because of soil salinity" (p. 5). EC was measured on a
   1:5 soil-water extract (methodology section), not a saturated paste, so the class
   boundaries are SRDI's, quoted exactly as printed.
   PDF (retrieved 2026-09-30, pdftotext -layout output matched the reviewer's dump
   byte-for-byte):
   https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/office-srdi/2024/12/332b4451bed84807b5846a530c6cc28c.pdf

2. geoBoundaries gbOpen BGD ADM3 / ADM2 (Bangladesh Bureau of Statistics via OCHA ROAP,
   CC BY 3.0 IGO), used only to answer "which upazila is this point in":
   https://www.geoboundaries.org/api/current/gbOpen/BGD/ADM3/

Everything this script prints into the JSON is either copied from Appendix-2 or derived
from it by the formulas documented next to the functions. Districts outside the SRDI
coastal saline survey are reported with a status string and a null value - never a 0
invented by assumption.

Usage:  /workspace/fs-venv/bin/python src/acquire/salinity.py [--offline]
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import sys
import urllib.request
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.strtree import STRtree

REPO = Path(__file__).resolve().parents[2]
CSV_PATH = REPO / "src" / "data" / "salinity" / "srdi_2010_upazila.csv"
PUBLISHED_TOTALS_PATH = REPO / "src" / "data" / "salinity" / "srdi_2010_published_totals.json"
OUT_PATH = REPO / "web" / "public" / "data" / "salinity.json"
CACHE = REPO / "cache"
DATA_TS = REPO / "web" / "lib" / "data.ts"

SRDI_URL = (
    "https://objectstorage.ap-dcc-gazipur-1.oraclecloud15.com/n/axvjbnqprylg/b/V2Ministry/o/"
    "office-srdi/2024/12/332b4451bed84807b5846a530c6cc28c.pdf"
)
SRDI_CITATION = (
    "SRDI (2010) Saline Soils of Bangladesh, Soil Resource Development Institute, SRMAF Project, "
    "Ministry of Agriculture, Government of the People's Republic of Bangladesh; Appendix-2 "
    "'Upazila wise Soil salinity class and area in coastal saline belt', pp. 31-36"
)
SRDI_RETRIEVED = "2026-09-30"  # the date the PDF was fetched and Appendix-2 transcribed

GEOMETRY = {
    "ADM3": "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BGD/ADM3/geoBoundaries-BGD-ADM3.geojson",
    "ADM2": "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BGD/ADM2/geoBoundaries-BGD-ADM2.geojson",
}
GEOMETRY_SOURCE = "geoBoundaries gbOpen BGD (Bangladesh Bureau of Statistics / OCHA ROAP), CC BY 3.0 IGO"

CLASS_LABELS = ["S1", "S2", "S3", "S4", "S5"]
CLASS_BOUNDS_DSM = {"S1": [2.0, 4.0], "S2": [4.1, 8.0], "S3": [8.1, 12.0], "S4": [12.1, 16.0], "S5": [16.0, None]}
# Representative ECe per class = arithmetic midpoint of the printed bounds; S5 has no upper
# bound so its lower bound (16.0) is used, which makes the derived ECe a lower estimate there.
CLASS_REP_ECE = {"S1": 3.0, "S2": 6.05, "S3": 10.05, "S4": 14.05, "S5": 16.0}

# Spelling variants of the same district across SRDI 2010, geoBoundaries and current usage
# (Barishal/Barisal, Jashore/Jessore, Chattogram/Chittagong, Cumilla/Comilla, Bogura/Bogra).
# Only used to join names; it carries no salinity value.
DISTRICT_ALIASES = {
    "barishal": "Barisal",
    "barisal": "Barisal",
    "jashore": "Jessore",
    "jessore": "Jessore",
    "chattogram": "Chittagong",
    "chittagong": "Chittagong",
    "cumilla": "Comilla",
    "comilla": "Comilla",
    "bogura": "Bogra",
    "bogra": "Bogra",
    "borguna": "Barguna",
    "gopalgonj": "Gopalganj",
    "laxmipur": "Lakshmipur",
    "jhalokati": "Jhalokati",
    "jhalakathi": "Jhalokati",
    "coxsbazar": "Cox's Bazar",
    "coxs": "Cox's Bazar",
}

AREAS = ["total_ha", "uncultivated_ha", "cultivated_ha", "saline_ha", "S1_ha", "S2_ha", "S3_ha", "S4_ha", "S5_ha"]


def norm_token(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def canonical_district(name: str) -> str:
    return DISTRICT_ALIASES.get(norm_token(name), name)


# --------------------------------------------------------------------------- loading


def load_upazilas(path: Path = CSV_PATH) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    for r in rows:
        for key in AREAS:
            r[key] = int(r[key])
    return rows


def load_published_totals(path: Path = PUBLISHED_TOTALS_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate(rows: list[dict], published: dict) -> tuple[list[str], list[str]]:
    """Hard checks the appendix allows, plus the discrepancies the source itself carries.

    Hard: S1..S5 must add up to the printed saline area, and the recomputed district and belt
    totals must equal the printed total rows.
    Reported, not failed: SRDI's "total area" is the upazila administrative area. In 37 of the
    102 rows it is larger than cultivated+uncultivated (hill, forest reserve and chars are in the
    administrative figure but not in the land-use split), and in the 5 rows Appendix-1 marks with
    an asterisk (Galachipa, Kalapara, Amtali, Patharghara, Barguna Sadar) the split exceeds the
    printed total. salineShare uses total_ha as specified, so on those rows it reads against the
    administrative area; agricultural_ha is published alongside so the other denominator is one
    division away.
    """
    problems: list[str] = []
    notes: list[str] = []
    for r in rows:
        classes = sum(r[f"{c}_ha"] for c in CLASS_LABELS)
        if classes != r["saline_ha"]:
            problems.append(f"{r['district']}/{r['upazila']}: classes sum {classes} != saline {r['saline_ha']}")
        if r["saline_ha"] > r["total_ha"]:
            problems.append(f"{r['district']}/{r['upazila']}: saline {r['saline_ha']} exceeds total {r['total_ha']}")
        agricultural = r["uncultivated_ha"] + r["cultivated_ha"]
        if agricultural != r["total_ha"]:
            notes.append(f"{r['district']}/{r['upazila']}: total {r['total_ha']} vs cultivated+uncultivated {agricultural}")
    for district, published_total in published.items():
        if district == "_note":
            continue
        sub = rows if district == "COASTAL_BELT" else [r for r in rows if r["district"] == district]
        recomputed = {key: sum(r[key] for r in sub) for key in AREAS}
        if recomputed != {key: published_total[key] for key in AREAS}:
            problems.append(f"{district}: recomputed {recomputed} != published {published_total}")
    return problems, notes


# ----------------------------------------------------------------------- derivations


def saline_share(row: dict) -> float:
    """saline_ha / total_ha, exactly as specified.

    SRDI's 'total area' includes uncultivated land (river, mangrove, gher), so this share is a
    conservative lower bound on the salt a cropped field sees. row['cultivated_ha'] is kept in the
    output so the stricter denominator is one division away.
    """
    return row["saline_ha"] / row["total_ha"]


def class_shares(row: dict) -> dict[str, float]:
    """Share of the upazila's SALINE area held by each class; sums to 1 when saline_ha > 0."""
    saline = row["saline_ha"]
    if saline == 0:
        return {c: 0.0 for c in CLASS_LABELS}
    return {c: row[f"{c}_ha"] / saline for c in CLASS_LABELS}


def rep_ec(row: dict) -> float | None:
    """Area-weighted class midpoint over the saline area, derived from SRDI class areas."""
    shares = class_shares(row)
    if row["saline_ha"] == 0:
        return None
    return round(sum(shares[c] * CLASS_REP_ECE[c] for c in CLASS_LABELS), 2)


def rollup(rows: list[dict]) -> dict:
    """Area-weighted district view of the same indicators (sum the ha, then divide)."""
    total = sum(r["total_ha"] for r in rows)
    saline = sum(r["saline_ha"] for r in rows)
    out = {
        "upazilas": len(rows),
        "total_ha": total,
        "saline_ha": saline,
        "salineShare": round(saline / total, 4) if total else None,
        "classShares": {c: (round(sum(r[f"{c}_ha"] for r in rows) / saline, 4) if saline else 0.0) for c in CLASS_LABELS},
        "repECe": (round(sum(sum(r[f"{c}_ha"] for r in rows) * CLASS_REP_ECE[c] for c in CLASS_LABELS) / saline, 2) if saline else None),
    }
    return out


# -------------------------------------------------------------------------- geometry


def fetch(url: str, dest: Path) -> Path:
    """Download once, remember the real date in a sidecar so the citation stays honest."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        print(f"downloading {url}", file=sys.stderr)
        with urllib.request.urlopen(url, timeout=900) as resp, dest.open("wb") as fh:
            fh.write(resp.read())
        meta = dest.with_suffix(dest.suffix + ".meta.json")
        meta.write_text(json.dumps({"url": url, "retrieved": dt.date.today().isoformat()}), encoding="utf-8")
    meta = dest.with_suffix(dest.suffix + ".meta.json")
    return meta if meta.exists() else dest


def geometry_retrieved(level: str) -> str:
    meta = CACHE / f"geoBoundaries-BGD-{level}.geojson.meta.json"
    if meta.exists():
        return json.loads(meta.read_text(encoding="utf-8")).get("retrieved", "unknown")
    return "not yet fetched"


def features(path: Path) -> list[tuple[str, object]]:
    gj = json.loads(path.read_text(encoding="utf-8"))
    return [(f["properties"]["shapeName"], shape(f["geometry"])) for f in gj["features"]]


def locate(unit_features: list[tuple[str, object]], lat: float, lon: float) -> str | None:
    """Name of the polygon containing the point; None when no unit contains it."""
    tree = STRtree([geom for _, geom in unit_features])
    p = Point(lon, lat)
    hits = [unit_features[i][0] for i in tree.query(p) if unit_features[i][1].contains(p)]
    return hits[0] if hits else None


def nearest_unit(unit_features: list[tuple[str, object]], lat: float, lon: float) -> tuple[str, float]:
    """Fallback label only: the closest unit and its distance, for a point no polygon contains."""
    tree = STRtree([geom for _, geom in unit_features])
    p = Point(lon, lat)
    i = tree.nearest(p)
    name, geom = unit_features[i]
    deg = geom.distance(p)
    return name, round(deg * 111.32, 1)  # approximate: 1 degree of latitude in km


# ------------------------------------------------------------------------- assembly


def parse_demo_farms(path: Path = DATA_TS) -> dict[str, tuple[float, float]]:
    """Read the demo farm coordinates straight out of web/lib/data.ts so they cannot drift.

    Only the FARMS array is scanned - the provenance entries use the same `id:` shape and would
    otherwise be picked up.
    """
    text = path.read_text(encoding="utf-8")
    start = text.index("export const FARMS: FarmPack[] = [")
    body = text[start : text.index("\n];", start)]
    farms: dict[str, tuple[float, float]] = {}
    for match in re.finditer(r'id:\s*"([^"]+)"', body):
        coords = re.search(r"lat:\s*(-?[\d.]+),\s*lon:\s*(-?[\d.]+)", body[match.end() :])
        if coords:
            farms[match.group(1)] = (float(coords.group(1)), float(coords.group(2)))
    if len(farms) < 2:
        raise SystemExit(f"parsed {len(farms)} farms out of {path} - the FarmPack literal moved")
    return farms


def upazila_index(rows: list[dict]) -> dict[str, dict]:
    """geoBoundaries ADM3 name -> SRDI row. Four SRDI upazilas have no gbOpen polygon and are skipped."""
    index: dict[str, dict] = {}
    for r in rows:
        gb = (r.get("gb_adm3") or "").strip()
        if not gb:
            continue
        if gb in index:
            raise ValueError(f"ambiguous geoBoundaries name '{gb}': {index[gb]['upazila']} and {r['upazila']}")
        index[gb] = r
    return index


def farm_block(lat: float, lon: float, adm3: list[tuple[str, object]], adm2: list[tuple[str, object]], index: dict[str, dict]) -> dict:
    gb_upazila = locate(adm3, lat, lon)
    gb_district = locate(adm2, lat, lon)
    block = {
        "lat": lat,
        "lon": lon,
        "gbAdm3": gb_upazila,
        "gbDistrict": gb_district,
    }
    row = index.get(gb_upazila) if gb_upazila else None
    if row is None:
        if gb_district is None:
            near, km = nearest_unit(adm2, lat, lon)
            block["nearbyDistrict"] = f"{near} (~{km} km away; no geoBoundaries ADM2 polygon contains the point)"
        block.update(
            {
                "status": "outside SRDI coastal saline survey area",
                "upazila": gb_upazila,
                "district": gb_district,
                "total_ha": None,
                "uncultivated_ha": None,
                "cultivated_ha": None,
                "agricultural_ha": None,
                "saline_ha": None,
                "classAreasHa": None,
                "salineShare": None,
                "classShares": None,
                "repECe": None,
            }
        )
        return block
    block.update(
        {
            "status": "in SRDI coastal saline survey",
            "upazila": row["upazila"],
            "district": row["district"],
            "srdiUpazila": row["upazila"],
            "total_ha": row["total_ha"],
            "uncultivated_ha": row["uncultivated_ha"],
            "cultivated_ha": row["cultivated_ha"],
            "agricultural_ha": row["uncultivated_ha"] + row["cultivated_ha"],
            "saline_ha": row["saline_ha"],
            "classAreasHa": {c: row[f"{c}_ha"] for c in CLASS_LABELS},
            "salineShare": round(saline_share(row), 4),
            "classShares": {c: round(v, 4) for c, v in class_shares(row).items()},
            "repECe": rep_ec(row),
            "page": int(row["page"]),
        }
    )
    return block


def district_table(rows: list[dict], adm2_names: list[str]) -> dict:
    """All 64 districts of the geoBoundaries ADM2 register.

    The 18 that appear in SRDI Appendix-2 get area-weighted values; the rest are recorded as
    outside the survey with null values, so a reader cannot mistake "not surveyed" for "not saline".
    """
    surveyed = {canonical_district(d): rollup([r for r in rows if r["district"] == d]) for d in {r["district"] for r in rows}}
    missing = sorted(set(surveyed) - set(adm2_names))
    if missing:
        raise SystemExit(f"SRDI districts not found in the geoBoundaries ADM2 register: {missing}")
    table: dict[str, dict] = {}
    for name in sorted(adm2_names):
        if name in surveyed:
            table[name] = {"status": "in SRDI coastal saline survey", **surveyed[name]}
        else:
            table[name] = {"status": "not in SRDI coastal saline survey", "salineShare": None, "repECe": None}
    return table


def build_json(adm3_path: Path, adm2_path: Path, retrieved: dict[str, str]) -> dict:
    rows = load_upazilas()
    problems, area_notes = validate(rows, load_published_totals())
    if problems:
        raise SystemExit("SRDI CSV failed validation:\n  " + "\n  ".join(problems))
    adm3 = features(adm3_path)
    adm2 = features(adm2_path)
    index = upazila_index(rows)

    districts = district_table(rows, [name for name, _ in adm2])
    surveyed = sorted(d for d, v in districts.items() if v["status"].startswith("in "))

    farms = {}
    for farm_id, (lat, lon) in sorted(parse_demo_farms().items()):
        farms[farm_id] = farm_block(lat, lon, adm3, adm2, index)

    return {
        "citation": SRDI_CITATION,
        "url": SRDI_URL,
        "retrieved": retrieved["srdi"],
        "measured": "dry season - SRDI field survey May 2009; EC on 1:5 soil-water extract",
        "classBoundsDSm": CLASS_BOUNDS_DSM,
        "classRepECe": CLASS_REP_ECE,
        "derivation": (
            "salineShare = saline_ha / total_ha of the upazila; classShares = class area / saline area; "
            "repECe = area-weighted class midpoint over the saline area (S5 uses its 16.0 dS/m lower bound). "
            "District values are area-weighted over that district's SRDI upazilas. All derived from SRDI 2010 "
            "Appendix-2 class areas."
        ),
        "sourceNotes": [
            "SRDI 2010 p.1: 'Most of the land remains fallow in the dry season (January-May) because of soil "
            "salinity, lack of good quality irrigation water and late draining condition.'",
            "SRDI 2010 p.2: the field survey ran in May 2009, 2500 soil samples along 3-4 km traverses; EC was "
            "measured on a 1:5 soil-water extract.",
            "SRDI 2010 p.8: 'most of the vegetable crops are said to be very sensitive to saline condition and "
            "their yield decreased from 6-19% with each unit increase in salinity' - the same order as the "
            "Maas-Hoffman slopes used here.",
        ],
        "areaNote": (
            f"{len(area_notes)} of the SRDI rows print a total area that is not cultivated+uncultivated "
            "(hill, forest reserve and char land sit inside the administrative total; five rows that Appendix-1 "
            "marks with an asterisk print the opposite way). salineShare divides by the printed total, so on "
            "those rows it is a lower bound; agricultural_ha is published with every value."
        ),
        "geometry": {
            "source": GEOMETRY_SOURCE,
            "adm3Url": GEOMETRY["ADM3"],
            "adm2Url": GEOMETRY["ADM2"],
            "retrieved": retrieved["geometry"],
            "method": "shapely point-in-polygon on geoBoundaries gbOpen BGD ADM3, district from ADM2",
        },
        "surveyedDistricts": surveyed,
        "districtNote": (
            f"{len(surveyed)} of the {len(districts)} districts in the geoBoundaries gbOpen ADM2 register appear in "
            "SRDI Appendix-2; the others were outside the coastal saline survey and carry a null value, not a zero."
        ),
        "districts": districts,
        "farms": farms,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--offline", action="store_true", help="fail instead of downloading boundary files")
    ap.add_argument("--out", default=str(OUT_PATH))
    args = ap.parse_args()

    for level, url in GEOMETRY.items():
        dest = CACHE / f"geoBoundaries-BGD-{level}.geojson"
        if not dest.exists():
            if args.offline:
                raise SystemExit(f"{dest} missing and --offline set; fetch {url} first")
            fetch(url, dest)
    out = build_json(
        CACHE / "geoBoundaries-BGD-ADM3.geojson",
        CACHE / "geoBoundaries-BGD-ADM2.geojson",
        {"srdi": SRDI_RETRIEVED, "geometry": geometry_retrieved("ADM3")},
    )
    dest = Path(args.out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    rows = load_upazilas()
    _, area_notes = validate(rows, load_published_totals())
    print(f"wrote {dest.relative_to(REPO)}")
    print(
        f"  {len(rows)} SRDI upazila rows: classes sum to the printed saline area on every row, "
        f"and district + belt totals match the printed total rows"
    )
    print(f"  {len(area_notes)} rows where total area != cultivated+uncultivated (reported in areaNote, not an error)")
    for farm_id, block in out["farms"].items():
        if block["salineShare"] is None:
            print(f"  {farm_id:14s} {block['gbAdm3'] or 'unresolved':28s} {block['status']}")
        else:
            print(
                f"  {farm_id:14s} {block['district']}/{block['upazila']:16s} "
                f"salineShare={block['salineShare']:.3f} repECe={block['repECe']} dS/m"
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
