"""Write web/public/data/districts.json: all 64 Bangladesh districts for the location picker.

Coordinates come only from src/acquire/bd_districts.csv, which src/acquire/districts.py derives
from geoBoundaries gbOpen BGD ADM2 (Bangladesh Bureau of Statistics / OCHA ROAP, 2020 boundaries,
CC BY 3.0 IGO; Runfola et al. 2020, PLoS ONE 15(4): e0231866):

  * ``centroid`` = shapely polygon centroid of the district — the location the picker reports
    when you choose a district from the list;
  * ``point``    = shapely representative_point (guaranteed inside the polygon) — the point the
    district's NASA POWER data pack was built for.

The common English spelling (``name_en``: e.g. Chattogram, Cumilla, Jashore, Bogura) and the Bangla
name and division are hand-entered below, keyed by the geoBoundaries name (``gbName``), which is
what the data packs and salinity.json use. Nothing numeric is hand-entered.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = REPO_ROOT / "src" / "acquire" / "bd_districts.csv"
OUT = REPO_ROOT / "web" / "public" / "data" / "districts.json"

DIVISIONS = {
    "Barishal": "বরিশাল", "Chattogram": "চট্টগ্রাম", "Dhaka": "ঢাকা", "Khulna": "খুলনা",
    "Mymensingh": "ময়মনসিংহ", "Rajshahi": "রাজশাহী", "Rangpur": "রংপুর", "Sylhet": "সিলেট",
}

# gbName: (common English name, Bangla name, division)
NAMES = {
    "Bagerhat": ("Bagerhat", "বাগেরহাট", "Khulna"),
    "Bandarban": ("Bandarban", "বান্দরবান", "Chattogram"),
    "Barguna": ("Barguna", "বরগুনা", "Barishal"),
    "Barisal": ("Barishal", "বরিশাল", "Barishal"),
    "Bhola": ("Bhola", "ভোলা", "Barishal"),
    "Bogra": ("Bogura", "বগুড়া", "Rajshahi"),
    "Brahamanbaria": ("Brahmanbaria", "ব্রাহ্মণবাড়িয়া", "Chattogram"),
    "Chandpur": ("Chandpur", "চাঁদপুর", "Chattogram"),
    "Chittagong": ("Chattogram", "চট্টগ্রাম", "Chattogram"),
    "Chuadanga": ("Chuadanga", "চুয়াডাঙ্গা", "Khulna"),
    "Comilla": ("Cumilla", "কুমিল্লা", "Chattogram"),
    "Cox's Bazar": ("Cox's Bazar", "কক্সবাজার", "Chattogram"),
    "Dhaka": ("Dhaka", "ঢাকা", "Dhaka"),
    "Dinajpur": ("Dinajpur", "দিনাজপুর", "Rangpur"),
    "Faridpur": ("Faridpur", "ফরিদপুর", "Dhaka"),
    "Feni": ("Feni", "ফেনী", "Chattogram"),
    "Gaibandha": ("Gaibandha", "গাইবান্ধা", "Rangpur"),
    "Gazipur": ("Gazipur", "গাজীপুর", "Dhaka"),
    "Gopalganj": ("Gopalganj", "গোপালগঞ্জ", "Dhaka"),
    "Habiganj": ("Habiganj", "হবিগঞ্জ", "Sylhet"),
    "Jamalpur": ("Jamalpur", "জামালপুর", "Mymensingh"),
    "Jessore": ("Jashore", "যশোর", "Khulna"),
    "Jhalokati": ("Jhalokati", "ঝালকাঠি", "Barishal"),
    "Jhenaidah": ("Jhenaidah", "ঝিনাইদহ", "Khulna"),
    "Joypurhat": ("Joypurhat", "জয়পুরহাট", "Rajshahi"),
    "Khagrachhari": ("Khagrachhari", "খাগড়াছড়ি", "Chattogram"),
    "Khulna": ("Khulna", "খুলনা", "Khulna"),
    "Kishoreganj": ("Kishoreganj", "কিশোরগঞ্জ", "Dhaka"),
    "Kurigram": ("Kurigram", "কুড়িগ্রাম", "Rangpur"),
    "Kushtia": ("Kushtia", "কুষ্টিয়া", "Khulna"),
    "Lakshmipur": ("Lakshmipur", "লক্ষ্মীপুর", "Chattogram"),
    "Lalmonirhat": ("Lalmonirhat", "লালমনিরহাট", "Rangpur"),
    "Madaripur": ("Madaripur", "মাদারীপুর", "Dhaka"),
    "Magura": ("Magura", "মাগুরা", "Khulna"),
    "Manikganj": ("Manikganj", "মানিকগঞ্জ", "Dhaka"),
    "Maulvibazar": ("Moulvibazar", "মৌলভীবাজার", "Sylhet"),
    "Meherpur": ("Meherpur", "মেহেরপুর", "Khulna"),
    "Munshiganj": ("Munshiganj", "মুন্সীগঞ্জ", "Dhaka"),
    "Mymensingh": ("Mymensingh", "ময়মনসিংহ", "Mymensingh"),
    "Naogaon": ("Naogaon", "নওগাঁ", "Rajshahi"),
    "Narail": ("Narail", "নড়াইল", "Khulna"),
    "Narayanganj": ("Narayanganj", "নারায়ণগঞ্জ", "Dhaka"),
    "Narsingdi": ("Narsingdi", "নরসিংদী", "Dhaka"),
    "Natore": ("Natore", "নাটোর", "Rajshahi"),
    "Nawabganj": ("Chapai Nawabganj", "চাঁপাইনবাবগঞ্জ", "Rajshahi"),
    "Netrakona": ("Netrokona", "নেত্রকোনা", "Mymensingh"),
    "Nilphamari": ("Nilphamari", "নীলফামারী", "Rangpur"),
    "Noakhali": ("Noakhali", "নোয়াখালী", "Chattogram"),
    "Pabna": ("Pabna", "পাবনা", "Rajshahi"),
    "Panchagarh": ("Panchagarh", "পঞ্চগড়", "Rangpur"),
    "Patuakhali": ("Patuakhali", "পটুয়াখালী", "Barishal"),
    "Pirojpur": ("Pirojpur", "পিরোজপুর", "Barishal"),
    "Rajbari": ("Rajbari", "রাজবাড়ী", "Dhaka"),
    "Rajshahi": ("Rajshahi", "রাজশাহী", "Rajshahi"),
    "Rangamati": ("Rangamati", "রাঙ্গামাটি", "Chattogram"),
    "Rangpur": ("Rangpur", "রংপুর", "Rangpur"),
    "Satkhira": ("Satkhira", "সাতক্ষীরা", "Khulna"),
    "Shariatpur": ("Shariatpur", "শরীয়তপুর", "Dhaka"),
    "Sherpur": ("Sherpur", "শেরপুর", "Mymensingh"),
    "Sirajganj": ("Sirajganj", "সিরাজগঞ্জ", "Rajshahi"),
    "Sunamganj": ("Sunamganj", "সুনামগঞ্জ", "Sylhet"),
    "Sylhet": ("Sylhet", "সিলেট", "Sylhet"),
    "Tangail": ("Tangail", "টাঙ্গাইল", "Dhaka"),
    "Thakurgaon": ("Thakurgaon", "ঠাকুরগাঁও", "Rangpur"),
}


def main() -> int:
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    if len(rows) != 64 or {r["name"] for r in rows} != set(NAMES):
        raise SystemExit("bd_districts.csv and NAMES disagree — refusing to write a partial table")
    districts = []
    for r in sorted(rows, key=lambda r: NAMES[r["name"]][0]):
        en, bn, division = NAMES[r["name"]]
        districts.append({
            "slug": r["slug"], "gbName": r["name"], "name_en": en, "name_bn": bn,
            "division": division, "division_bn": DIVISIONS[division],
            "centroid": {"lat": float(r["centroid_lat"]), "lon": float(r["centroid_lon"])},
            "point": {"lat": float(r["lat"]), "lon": float(r["lon"])},
        })
    first = rows[0]
    OUT.write_text(json.dumps({
        "source": "geoBoundaries gbOpen BGD ADM2 (Bangladesh Bureau of Statistics / OCHA ROAP), CC BY 3.0 IGO",
        "citation": "Runfola, D. et al. (2020) geoBoundaries: A global database of political administrative boundaries. PLoS ONE 15(4): e0231866",
        "url": first["source_url"],
        "retrieved": first["retrieved"],
        "centroidMethod": "shapely centroid() of the ADM2 polygon",
        "pointMethod": first["method"],
        "count": len(districts),
        "districts": districts,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {len(districts)} districts -> {OUT.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
