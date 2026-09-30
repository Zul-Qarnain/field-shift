# FIELD SHIFT — Adapting Farms with NASA Data

**A NASA Space Apps Challenge 2026 participant project** (Bangladesh local event). Not an official NASA product.

Field Shift is a decision-support web app designed to turn NASA Earth observations (POWER, SMAP, MODIS …) into **ranked, explainable crop-rotation strategies** for a specific farm. Pick a farm, see what has shifted in your environment (rainfall onset, heat days, soil moisture, greenness), set your priorities, and get rotations you can interrogate — every number names its dataset. The UI runs in **English or Bangla** (the choice is remembered on the device). **This build runs on hand-made demo fixtures** (`web/lib/data.ts`); the pipeline that fills those packs with cached NASA data is the next milestone, and offline mode is planned.

## What it does

The current build computes for real — deterministic constraint filtering and weighted scoring in TypeScript — but reads demo fixture values, and the UI labels them as such (fixture chips, provenance drawer, uncertainty card).

- **Field Analysis** — rainfall-onset shift (the two-era Mann-Whitney test is planned; the values shown are sample data), temperature/heat trends, SMAP soil moisture, NDVI greenness, SoilGrids soil (labeled as modeled), and a per-dataset provenance drawer with retrieval status.
- **Crop Planning** — a deterministic engine ranks rotations from your crop pool and priorities: hard constraints first (one crop per season, and the sequence must fit a 365-day calendar of crop durations, 10-day turnarounds and the onset shift), then eight weighted scores — water adequacy, thermal fit, soil compatibility, soil-health balance, diversity & break, resilience, low irrigation reliance, and food & income. Common Bangladesh sequences such as Aman → Boro are legal and cost soil-health points for repeating a crop family; the pool also includes Aus rice and an idle Fallow season. What-if scenarios re-rank live: drier (−10 % / −20 % rainfall), hotter (+1 °C / +2 °C) and later monsoon onset (+7 / +15 days). Advisory sentence + ≤160-character SMS in Bangla and English.
- **Method & Data** — every definition and threshold, marked computed vs planned, plus the dataset list with id/version. Sensitivity results and retrieval dates are planned, not computed.
- **Estimates are labeled** — per-farm irrigation access, crop durations and traits, and the food & income values are hand-set demo numbers marked `ESTIMATE` in the code and in the UI, pending citation.
- **Bangla UI** — district, division, farm, crop, score-label, heading and button text switch language, and the advisory/SMS are generated in Bangla. The engine's reason, risk and penalty sentences are written in English today; the "Why" drawer says so when Bangla is on.

## Architecture (summary)

Static-first by design: pre-event Python (`src/acquire`, `src/compute` — **planned, not written yet**) will cache NASA data and derive indicator packs; the web app (`web/`) is a Next.js app whose client-side engine composes decisions from those packs. No runtime backend, no server database, no paid services. See `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` (v1.3) for the full contract and `docs/FIELD_SHIFT_UI_UX_DESIGN_SYSTEM.md` for the design system.

## Run it

```bash
cd web
npm ci
npm test        # 92 Vitest unit tests: engine constraints & scoring, determinism, data contracts
npm run dev     # http://localhost:3000
npm run build   # production build (type-checked)
```

## Data sources

NASA: POWER · GPM IMERG · SMAP L4 · MODIS/VIIRS NDVI · MOD16 ET · GIBS tiles. Partners (supplementary tier): ESA Copernicus Sentinel-2/-1 · JAXA GSMaP/AMSR2. Open non-space (labeled): SoilGrids 2.0 (CC-BY-4.0) · FAO-56/EcoCrop/GAEZ · OpenFreeMap. OpenET is excluded — its coverage is United States only. The current UI ships deterministic **demo fixtures** with the exact schema of the real data packs; none of those datasets has been retrieved yet, so every provenance entry reads "not yet (demo fixture)" until the pipeline caches the data. The only live network requests today are the map's: the OpenFreeMap/OpenStreetMap vector basemap and the NASA GIBS True Color satellite tiles, both streamed when online — the map shows an offline state when they cannot load.

## Repository

- `docs/` — architecture, UI/UX design system, `AI_USE.md` (mandatory AI-use disclosure) with `prompts_used.md`, verification screenshots, Lighthouse reports.
- `web/` — Next.js 16 + TypeScript + Tailwind v4 + MapLibre + Recharts app with the Vitest suite.
- `src/` — **planned** Python acquisition + compute pipeline (next milestone); the directory does not exist yet.
- CI: `.github/workflows/ci.yml` runs the unit tests and a production build on pushes to `main` and on pull requests.

## License

Apache-2.0. Third-party data and libraries are credited in `docs/` and the in-app Data page.
