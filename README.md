# FIELD SHIFT — Adapting Farms with NASA Data

**A NASA Space Apps Challenge 2026 participant project** (Bangladesh local event). Not an official NASA product.

Field Shift is a decision-support web app designed to turn NASA Earth observations (POWER, SMAP, MODIS …) into **ranked, explainable crop-rotation strategies** for a specific farm. Pick a farm, see what has shifted in your environment (rainfall onset, heat days, soil moisture, greenness), set your priorities, and get rotations you can interrogate — every number names its dataset. The UI runs in **English or Bangla** (the choice is remembered on the device). **The climate numbers are now real**: NASA POWER daily data, retrieved 2026-09-30 for the six demo farms and all 64 Bangladesh district centroids, cross-checked against CHIRPS v2.0, reduced to committed JSON data packs (`web/public/data/packs/`). Everything else the app shows — SMAP soil moisture, NDVI, SoilGrids soil, crop traits, irrigation access — is still a labelled demo fixture (`web/lib/data.ts`).

## What it does

The build computes for real — deterministic constraint filtering and weighted scoring in TypeScript, plus onset and trend statistics in Python — and reads the climate inputs from the packs it built. Anything not backed by a retrieval is labelled in the UI (fixture chips, `data pack` chips with the real retrieval date, provenance drawer, uncertainty card).

- **Field Analysis** — rainfall-onset shift computed per year from 45 years of POWER `PRECTOTCORR` using **onset definition v2** (a local-relative 5-day accumulation rule adapted from the Moron & Robertson 2014 family: window DOY 121–270, threshold = this point's own Jun–Sep 2001–2025 mean 5-day rainfall, no 10-day break under 5 mm in the following 30 days), two eras 2001–2012 vs 2013–2025 with a two-sided Mann-Whitney U, a ±20 % threshold sensitivity and the year-censoring rate. Every pack also re-states the same statistics from **CHIRPS v2.0** as an independent cross-check, and a **Pettitt change-point test** decides which product each number comes from — because POWER's precipitation series is not homogeneous over 1981–2025. Heat days above 35 °C, mean temperature and root-zone wetness come from POWER `T2M_MAX`/`T2M`/`GWETROOT` (GWETROOT is modelled wetness, **not** SMAP — labelled); SMAP soil moisture, NDVI and SoilGrids soil remain fixtures.
- **Crop Planning** — a deterministic engine ranks rotations from your crop pool and priorities: hard constraints first (one crop per season, and the sequence must fit a 365-day calendar of crop durations, 10-day turnarounds and the onset shift), then eight weighted scores — water adequacy, thermal fit, soil compatibility, soil-health balance, diversity & break, resilience, low irrigation reliance, and food & income. Common Bangladesh sequences such as Aman → Boro are legal and cost soil-health points for repeating a crop family; the pool also includes Aus rice and an idle Fallow season whose penalty scales with how much of the year the calendar actually left free. What-if scenarios re-rank live: drier (−10 % / −20 % rainfall), hotter (+1 °C / +2 °C) and later monsoon onset (+7 / +15 days). Advisory sentence + ≤160-character SMS in Bangla and English. The engine's onset shift is the one measured for that farm, not the fixture value.
- **Method & Data** — every definition and threshold, marked computed vs planned, plus the dataset list with id/version and the real POWER and CHIRPS retrieval dates and covered range. The onset rule, its statistics, the homogeneity tests and what the data actually shows are written up in `docs/science/onset.md`.
- **Estimates are labeled** — per-farm irrigation access, crop durations and traits, and the income and staple-food values behind food & income are hand-set demo numbers marked `ESTIMATE` in the code and in the UI, pending citation.
- **Honest limits** — the headline climate result of this build is a *negative* one: POWER alone says the monsoon onset moved ~15 days earlier at most farms (p < 0.05), but CHIRPS does not corroborate it (median −1.5 d, 4/64 significant, year-to-year agreement r ≈ 0.26), and POWER's own precipitation series steps at 2015–2016 — inside the era boundary. So no onset shift is claimed, each number names the product it came from, and the other product's figure is printed beside it. Threshold censoring, product drift in the temperature variables, and the rejected first attempt at the onset rule are all measured, recorded in every pack and written up in `docs/science/onset.md`.
- **Bangla UI** — district, division, farm, crop, soil texture, farm context, score labels, headings, chart legends and tooltips, button text and every number (Bengali digits) switch language, including in the data-pack panels; the advisory, the SMS and the engine's reason, risk and penalty sentences are generated in both languages with the same numbers in each. Dataset names, version ids and the packs' own method/caveat text stay in English, and the UI says so.

## Architecture (summary)

Static-first by design: pre-event Python (`src/acquire`, `src/compute`) caches NASA data and derives indicator packs that are committed to the repo; the web app (`web/`) is a Next.js app whose client-side engine composes decisions from those packs. No runtime backend, no server database, no paid services. See `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` (v1.3) for the full contract and `docs/FIELD_SHIFT_UI_UX_DESIGN_SYSTEM.md` for the design system.

## Run it

```bash
cd web
npm ci
npm test        # 177 Vitest unit tests: engine constraints & scoring, determinism, bilingual output, data contracts, data packs
npm run dev     # http://localhost:3000
npm run build   # production build (type-checked)
```

Python pipeline (needs the venv packages in `requirements.txt`; the packs are committed, so this is only to rebuild them):

```bash
/workspace/fs-venv/bin/python -m pytest -q                        # 108 tests, no network required
```

## Rebuild the data packs

```bash
/workspace/fs-venv/bin/python -m src.acquire.districts   # geoBoundaries BGD ADM2 -> cache/ + src/acquire/bd_districts.csv
/workspace/fs-venv/bin/python scripts/build_packs.py      # NASA POWER + CHIRPS -> web/public/data/packs/
/workspace/fs-venv/bin/python scripts/build_packs.py --only-farms   # the six demo farms only
```

Roughly 70 sequential POWER requests (1981-01-01 to yesterday, 7 parameters each), spaced 1.5 s
apart with retry/backoff — about four minutes cold, ~70 s from cache. Raw responses and their UTC
retrieval timestamps are cached under `cache/` (gitignored) and reused, so a rerun costs nothing
and keeps the original `retrievedUtc` in every pack. The CHIRPS cross-check reads local netCDF
files from `${CHIRPS_DIR:-/workspace/fs-cache/chirps}` (never committed); each keeps the
`source_url` and `retrieved_utc` attributes written by the download, which the packs surface as
`crossCheck.retrievedUtc`. Never run either from a page view — the packs are the shipped artifact.

## Data sources

NASA: POWER · GPM IMERG · SMAP L4 · MODIS/VIIRS NDVI · MOD16 ET · GIBS tiles. Partners (supplementary tier): ESA Copernicus Sentinel-2/-1 · JAXA GSMaP/AMSR2. Open non-space (labeled): CHIRPS v2.0 (Climate Hazards Center UCSB / USGS) · SoilGrids 2.0 (CC-BY-4.0) · FAO-56/EcoCrop/GAEZ · OpenFreeMap. OpenET is excluded — its coverage is United States only. **Retrieved for real and committed as data packs:** NASA POWER daily point series (6 demo farms + 64 district centroids, retrieved 2026-09-30) and CHIRPS v2.0 daily 0.25° over Bangladesh (1981–2025) as the independent cross-check, plus geoBoundaries BGD ADM2 boundaries for the district centroids. Not retrieved yet, and rendered as labelled demo fixtures: GPM IMERG, SMAP L4, MODIS/VIIRS NDVI, MOD16 ET, SoilGrids — their provenance entries read "not yet (demo fixture)". The live network requests in the running app are the map's: the OpenFreeMap/OpenStreetMap vector basemap and the NASA GIBS True Color satellite tiles, both streamed when online — the map shows an offline state when they cannot load.

## Repository

- `docs/` — architecture, UI/UX design system, `AI_USE.md` (mandatory AI-use disclosure) with `prompts_used.md`, `docs/science/onset.md` (the onset rule, the statistics, what the data shows), verification screenshots, Lighthouse reports.
- `web/` — Next.js 16 + TypeScript + Tailwind v4 + MapLibre + Recharts app with the Vitest suite. `web/public/data/packs/` holds the committed NASA POWER data packs (index + 6 farms + 64 districts).
- `src/` — Python acquisition (`src/acquire`: POWER point API, CHIRPS netCDF cross-check reader, geoBoundaries) and deterministic science (`src/compute`: onset v1/v2, Mann-Kendall/Theil-Sen/Pettitt trends). `scripts/build_packs.py` turns cache + compute into the packs. `tests/` holds the pytest suite.
- CI: `.github/workflows/ci.yml` runs the unit tests and a production build on pushes to `main` and on pull requests.

## License

Apache-2.0. Third-party data and libraries are credited in `docs/` and the in-app Data page.
