# FIELD SHIFT — Adapting Farms with NASA Data

**A NASA Space Apps Challenge 2026 participant project** (Bangladesh local event). Not an official NASA product.

Field Shift is a decision-support web app that turns 45 years of Earth observations into **ranked, explainable crop-rotation strategies** for a specific farm. Pick a farm, see what the data says about your environment (rainfall onset, heat days, temperature, root-zone wetness, soil salinity), set your priorities, and get rotations you can interrogate — every number names its dataset, its version and the day it was retrieved. The UI runs in **English or Bangla** (Bengali digits included; the choice is remembered on the device).

**What is real in this build.** NASA POWER daily point series for 70 points (the six demo farms + all 64 Bangladesh district centroids, 1981-01-01 → 2026-09-27, retrieved 2026-09-30 between 08:53:57 and 09:08:07 UTC, Daily API v2.10.0) reduced to committed JSON packs; the same rainfall statistics re-computed from **CHIRPS v2.0** (0.25° nearest cell, 1981–2025, retrieved 2026-09-30) as an independent cross-check; **soil salinity from SRDI (2010) *Saline Soils of Bangladesh* Appendix-2** (102 upazilas, 18 districts, fetched 2026-09-30) joined to each farm by geoBoundaries ADM3 point-in-polygon, scored with **FAO Irrigation & Drainage Paper 29 Rev.1 Table 4**; a **build-time ML onset outlook** trained on those real series (CHIRPS labels, NASA POWER weather, NOAA PSL ONI + DMI); and a **"This season so far" nowcast** — NASA POWER rain, temperature and surface soil wetness (`GWETTOP`) for the last 30–60 days against each point's own 2017–2025 normal, fetched live in the browser, with a committed fallback pack for all 70 points (retrieved 2026-10-08 19:27–19:29 UTC, data to 2026-10-05).

**What is still a demo fixture.** NDVI greenness, SMAP soil moisture (never retrieved — the wetness figures are POWER `GWETROOT`, a modelled product, and are labelled as such), SoilGrids soil properties, per-farm irrigation access, and every crop trait the engine scores (durations, water demand, tolerances, N and residue indices, income and staple values) — all marked `ESTIMATE` or `fixture` in the code and in the UI. GPM IMERG, MODIS/VIIRS, MOD16, Sentinel-2/-1 and GSMaP/AMSR2 are named in the design and have **not** been retrieved; the Data page says which is which.

## What it does

- **Quick answer** (`/quick`) — one screen: pick a district (any of the 64), your current crop and a priority, and get the top 3 rotations that keep that crop in its season. Each shows a stacked score bar — the eight component contributions, penalties as a subtraction, the early-onset credit — with the equation printed underneath so the parts visibly add up to the total. "See why" opens the full analysis: every component's value × weight, every penalty with its rule and source, the reasons and risks, and the inputs used (the district's NASA POWER pack and onset verdict, SRDI district salinity, and the nearest demo farm whose soil/water/irrigation inputs the district borrows until district layers arrive in the next phase).
- **Pick a location** (`/locate`) — click the map or choose a district; the pick snaps to the nearest of the 70 precomputed points and the page says which point it used and how far away it is (district picks use that district's own data point). District coordinates are geoBoundaries gbOpen BGD ADM2 (BBS / OCHA ROAP, CC BY 3.0 IGO; Runfola et al. 2020) — the list in `web/public/data/districts.json` carries each district's polygon centroid and the representative point its data pack was built at.
- **This season so far** — a nowcast card on every farm page, the quick answer and the location picker: the last 30 or 60 days of NASA POWER `PRECTOTCORR`, `T2M` and `GWETTOP` as totals/means and anomalies against the point's own normal for the same calendar dates (2017–2025, ±7-day window — the baseline starts after POWER's 2014–2016 precipitation step). The browser fetches the recent days from the public POWER daily API (no key, 8 s timeout); the normal comes from the committed pack. It is season context, not a forecast, and it does not change any score.
- **Data outages** — if the live call fails, a banner says live data is unavailable, the card shows the saved pack's numbers with their retrieval date, and a Retry button tries again. If even the saved pack is missing, the card says so and shows no numbers. `?nowcast=offline` simulates the outage.
- **Field Analysis** — rainfall-onset shift computed per year from 45 years of POWER `PRECTOTCORR` with **onset definition v2** (a local-relative 5-day accumulation rule adapted from the Moron & Robertson 2014 family: window DOY 121–270, threshold = this point's own Jun–Sep 2001–2025 mean 5-day rainfall, no 10-day break under 5 mm in the following 30 days), eras 2001–2012 vs 2013–2025 compared with a two-sided Mann-Whitney U, plus the ±20 % threshold sensitivity and the year-censoring rate for every point. Each pack also re-states the same statistics from CHIRPS v2.0, runs a **Pettitt change-point test** on both series and records which product each figure came from — because POWER's precipitation is not homogeneous over 1981–2025 (63 of 64 district packs, and 5 of the 6 farms, carry a significant step inside 2001–2025). Heat days above 35 °C, mean temperature and root-zone wetness come from POWER `T2M_MAX`/`T2M`/`GWETROOT`.
- **Soil salinity** — a surveyed upazila's SRDI class areas become a representative ECe (area-weighted class midpoint) and then an expected yield loss per crop through FAO-29's own line Y = 100 − b·(ECe − a). Worked from the committed JSON: at **Khulna / Dumuria** (68.3 % of the upazila is saline — 30 610 of 44 797 ha) a rice season loses ~42 % expected yield → −6.8 engine points, maize or potato ~49 % → −7.8, wheat ~19 % → −3.0; at **Barishal / Wazirpur** (8.1 % saline) rice loses ~0.6 % → −0.1. Upazilas outside SRDI's coastal survey carry **no value at all** — the penalty is skipped and the UI says why, because absent data is not zero salt. Crops FAO-29 publishes no ECe for (mustard, lentil, mungbean, sesame, jute) are listed as risks, never scored against salinity.
- **Crop Planning** — a deterministic engine ranks rotations from your crop pool and priorities: hard constraints first (one crop per season, and the sequence must fit a 365-day calendar of crop durations, 10-day turnarounds and the effective onset shift), then eight weighted scores — water adequacy, thermal fit, soil compatibility, soil-health balance, diversity & break, resilience, low irrigation reliance, food & income. The pool is 12 entries: the crops v1.3 named plus **Sesame** and **Jute** (real pre-kharif options — Potato–Jute–T.Aman, sesame in the south-west) and **Fallow**, so Boro–Fallow–T.Aman can be represented with a calendar-scaled idle penalty instead of being forced into a crop the year has no room for. Common sequences such as Aman → Boro are legal and cost soil-health points for repeating a crop family. What-if scenarios re-rank live: drier (−10 % / −20 %), hotter (+1 °C / +2 °C), later onset (+7 / +15 days). Advisory sentence + ≤160-character SMS in Bangla and English.
- **The onset significance gate** — the engine uses a measured shift **only when that farm's era test is significant (p < 0.05)**; a non-significant median difference is treated as 0 everywhere: the calendar budget, the late/early-onset penalties, the headline card, the advisory, the SMS, the plan page's stated baseline and the Why list. At the six demo farms the preferred product's test is non-significant at all six (p = 0.157–0.978), so the engine is handed 0 days and the card reads "No significant onset shift".
- **Machine-learning monsoon forecast** (built; on every farm page) — `src/compute/ml` + `scripts/build_onset_ml.py` train LightGBM offline on real CHIRPS onset labels and NASA POWER / NOAA PSL pre-monsoon features (cut off at a 25 April issue date), backtest it leave-one-year-out against each district's own mean onset, and write `src/compute/ml/metrics.json` + `web/public/data/onset_outlook.json`. The card reads "Machine-learning monsoon forecast. Trained on satellite rainfall (CHIRPS) and NASA POWER, with NOAA ocean indices." and shows the 2026 forecast date, its 10–90 range and what moved it. The backtest numbers are printed beside it as they are: model MAE 11.59 d vs the district mean onset's 10.04 d (skill −0.155, 2 880 district-years over 45 folds; 10–90 interval coverage 0.55 against a nominal 0.80; the model has the lower error in 12 of 45 years). Because of that, the rotation scores keep the district's average start as their onset baseline, and the forecast is never an input to a recommendation (the payload's internal `status` field is `experimental` for exactly this rule, ADR-009). What is in progress next is farmer field testing and more satellite layers, not the model's existence.
- **Method & Data** — every definition and threshold, computed vs planned, plus the dataset list with real retrieval dates and versions read from the committed artifacts. The onset rule, its statistics, the homogeneity tests and what the data shows are written up in `docs/science/onset.md`; the ML experiment in `docs/science/onset_ml.md`.
- **Honest limits** — the headline climate result is a *negative* one: POWER alone says the onset moved ~15 days earlier at most farms (median −14.8 d, 38/64 districts at p < 0.05), CHIRPS does not corroborate it (median −1.5 d, 4/64 significant, onset-year agreement r ≈ 0.26), and POWER's own series steps at 2015–2016 — inside the era boundary. So no shift is claimed, each number names the product it came from, and the other product's figure is printed beside it. Threshold censoring, product drift in the temperature variables, the rejected v1 onset rule and the ML model's failure to beat a mean are all measured, recorded in every pack and written up in `docs/`.
- **Bangla UI** — district, division, farm, crop, soil texture, farm context, score labels, headings, chart legends and tooltips, button text and every number (Bengali digits) switch language, including in the data-pack and salinity panels; the advisory, the SMS and the engine's reason, risk and penalty sentences are generated in both languages with the same numbers in each. Dataset names, version ids, file paths and the packs' own method/caveat text stay in English, and the UI says so.

## Architecture (summary)

Static-first: pre-event Python (`src/acquire`, `src/compute`) caches the data and derives indicator packs that are committed to the repo; the web app (`web/`) is a Next.js app whose client-side engine composes decisions from those packs. No runtime backend, no server database, no runtime LLM, no paid services. Besides map tiles, the one runtime data call is the nowcast's NASA POWER request, which degrades to a committed pack. The full contract, including the v1.4/v1.5 changes and ADR-008 to ADR-012 (crop pool, the ML outlook beside ADR-005, onset v2 + the cross-check/gate + salinity, the live nowcast with its fallback, quick answer + location picker), is in `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md`; `docs/FIELD_SHIFT_UI_UX_DESIGN_SYSTEM.md` is the design system.

## Run it

```bash
cd web
npm ci              # fresh clone (the project's other worktrees symlink node_modules)
npm test            # 688 Vitest tests (11 files): engine constraints & scoring, determinism,
                    # bilingual output, onset significance rule, salinity math, ML payload, data packs,
                    # nowcast maths, location snapping, quick answer and its score breakdown
npm run dev         # http://localhost:3000
npm run build       # production build (type-checked)
npm run test:e2e    # 12 Playwright tests against `npm start` on the built app (port 3210, E2E_PORT to change);
                    # NASA POWER is mocked from the committed packs, so no live API call is made
                    # first time only: npx playwright install chromium
```

Checks used before pushing:

```bash
cd web && npm ci && npm run lint                         # clean
cd web && npx tsc --noEmit                               # clean
cd web && npx vitest run                                 # 688 passed (11 files)
cd web && npm run build && npm run test:e2e              # build OK; 12 passed (3 files)
/workspace/fs-venv/bin/python -m pytest -q               # 260 passed, no network required
```

## Rebuild the data packs

```bash
/workspace/fs-venv/bin/python -m src.acquire.districts          # geoBoundaries BGD ADM2 → cache/ + src/acquire/bd_districts.csv
/workspace/fs-venv/bin/python scripts/build_packs.py            # NASA POWER + CHIRPS → web/public/data/packs/ (70 packs + index)
/workspace/fs-venv/bin/python scripts/build_packs.py --only-farms   # the six demo farms only
```

Each point is one NASA POWER request for 7 parameters, 1981-01-01 to yesterday, spaced `--sleep` (default 1.5 s) apart with retry/backoff. Raw responses and their UTC retrieval timestamps are cached under `cache/` (gitignored) and reused, so a rerun costs nothing and keeps the original `retrievedUtc` in every pack. The CHIRPS cross-check reads local netCDF boxes from `${CHIRPS_DIR:-/workspace/fs-cache/chirps}`; those files are never committed but each keeps the `source_url` and `retrieved_utc` attributes written by the download, which the packs surface as `crossCheck.retrievedUtc` / `crossCheck.sourceUrlSample`. Never run either from a page view — the packs are the shipped artifact.

## Rebuild the ML onset outlook

```bash
/workspace/fs-venv/bin/python scripts/fetch_chirps_2026.py   # one real CHIRPS download → cache/chirps/
/workspace/fs-venv/bin/python scripts/build_onset_ml.py      # backtest + outlook, ~2.5 min
```

It reads `cache/power/` (shared with the pack builder), `cache/chirps/` (1981–2026 Bangladesh boxes) and `cache/indices/` (NOAA PSL ONI and DMI, downloaded on first run); `--limit`, `--years` and `--rounds` shrink a run for smoke testing. Outputs: `src/compute/ml/metrics.json` (both arms) and `web/public/data/onset_outlook.json`. The decision rule is in `status_from_skill()` — the outlook is only labeled `shipped` if backtest skill against climatology is positive, and −0.155 makes it `experimental`.

## Rebuild the nowcast packs and the district list

```bash
/workspace/fs-venv/bin/python scripts/build_nowcast.py           # 70 POWER requests (PRECTOTCORR, T2M, GWETTOP, 2017 → yesterday) → web/public/data/nowcast/
/workspace/fs-venv/bin/python scripts/build_district_table.py    # src/acquire/bd_districts.csv → web/public/data/districts.json (64 districts)
```

`build_nowcast.py` caches raw responses under `cache/nowcast/` with their UTC retrieval time, writes per point a 366-day 2017–2025 climatology (±7-day window), the last 60 days ending at the last day all three parameters are present, and 30/60-day summaries computed by `src/compute/nowcast.py`; the web test re-derives every summary in TypeScript. `--limit N` smoke-tests, `--end YYYYMMDD` pins the window.

## Rebuild the salinity layer

```bash
/workspace/fs-venv/bin/python src/acquire/salinity.py             # SRDI 2010 CSV + geoBoundaries ADM3/ADM2 → web/public/data/salinity.json
/workspace/fs-venv/bin/python src/acquire/salinity.py --offline    # fail instead of downloading boundary files
```

The SRDI Appendix-2 rows are the committed transcription in `src/data/salinity/srdi_2010_upazila.csv` (checked character-wise against the downloaded PDF; provenance and the name-join decisions are documented in `src/data/salinity/README.md`). Boundary geojson is cached under `cache/`, never committed; `salinity.json` is the committed fixture.

## Data sources

**Retrieved for real, and the app reads those numbers:** NASA POWER daily point series (70 points, retrieved 2026-09-30, Daily API v2.10.0) · NASA POWER `PRECTOTCORR`/`T2M`/`GWETTOP` 2017-01-01 → 2026-10-05 for the nowcast packs (70 points, retrieved 2026-10-08 UTC) plus the same API live from the browser · CHIRPS v2.0 daily 0.25° (1981–2025, retrieved 2026-09-30 — an **open non-space product of the Climate Hazards Center at UCSB and USGS, not NASA and not a Space Agency Partner product**; labelled that way in every pack, in the provenance drawer and on the Data page) · SRDI (2010) *Saline Soils of Bangladesh*, Appendix-2 (fetched 2026-09-30) · FAO-29 Rev.1 Table 4 (Ayers & Westcot 1985, read 2026-09-30) · geoBoundaries gbOpen BGD ADM2 + ADM3 (retrieved 2026-09-30) · NOAA PSL ONI and DMI (2026-09-30, ML features only) · NASA GIBS True Color and OpenFreeMap/OSM tiles (live map requests, with a stated offline state).

**Named in the design, not retrieved — rendered as labelled demo fixtures:** GPM IMERG v07 · SMAP L4 · MODIS/VIIRS NDVI · MOD16A2 ET/PET · SoilGrids 2.0 · Copernicus Sentinel-2/-1 · JAXA GSMaP/AMSR2 · FAO-56/EcoCrop/GAEZ crop coefficients · BBS crop and household statistics. Their entries read "next phase (demo value shown)" in the provenance drawer and "NEXT PHASE" on the Data page. OpenET is excluded — its coverage is the United States only.

## Repository

- `docs/` — `FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` (v1.5, with ADR-008 to ADR-012), `FIELD_SHIFT_UI_UX_DESIGN_SYSTEM.md`, `science/onset.md` (the rule, the statistics, the homogeneity findings), `science/onset_ml.md` (the ML experiment, leakage controls, limitations), `AI_USE.md` (mandatory AI disclosure) with `prompts_used.md`, screenshots and Lighthouse reports.
- `web/` — Next.js 16 + TypeScript + Tailwind v4 + MapLibre + Recharts app with the Vitest suite (`web/tests/`) and the Playwright end-to-end suite (`web/e2e/`, `playwright.config.ts`). `web/public/data/packs/` holds the committed POWER packs (index + 6 farms + 64 districts), `web/public/data/nowcast/` the 70 nowcast packs + index, plus `districts.json`, `salinity.json` and `onset_outlook.json`. `web/e2e/` is the Playwright suite.
- `src/` — Python acquisition (`src/acquire`: POWER point API, CHIRPS netCDF reader, geoBoundaries districts, NOAA PSL indices, SRDI salinity) and deterministic science (`src/compute`: onset v1/v2, Mann-Kendall / Theil-Sen / Pettitt trends, `ml/` outlook). `src/data/salinity/` is the committed SRDI transcription.
- `scripts/` — `build_packs.py`, `build_onset_ml.py`, `fetch_chirps_2026.py`, `build_nowcast.py`, `build_district_table.py`.
- `tests/` — the pytest suite (260 tests). CI: `.github/workflows/ci.yml` runs the **web** suite (`npm test`) and a production build on pushes to `main` and on pull requests; the Python suite is run locally with the venv command above — CI has no Python job.

## License

Apache-2.0. Third-party data and libraries are credited in `docs/` and the in-app Data page.
