# FIELD SHIFT — Adapting Farms with NASA Data

**A NASA Space Apps Challenge 2026 participant project** (Bangladesh local event). Not an official NASA product.

Field Shift is a decision-support web app that turns 25+ years of NASA Earth observations into **ranked, explainable crop-rotation strategies** for a specific farm. Pick a farm, see what has shifted in your environment (rainfall onset, heat days, soil moisture, greenness) with statistical evidence, set your priorities, and get rotations you can interrogate — every number traces to a named dataset, and the whole demo runs offline.

## What it does

- **Field Analysis** — rainfall-onset shift (two-era Mann-Whitney test), temperature/heat trends, SMAP soil moisture, NDVI greenness, evapotranspiration balance, modeled soil with user corrections, full provenance drawer.
- **Crop Planning** — a deterministic engine (hard agronomic constraints + weighted multi-criteria scoring) ranks rotations from your crop pool and priorities; What-if scenarios (drier/hotter seasons) re-rank live; advisory sentence + ≤160-char SMS in Bangla and English.
- **Method & Data** — every definition, threshold, sensitivity result, and dataset with id/version/URL.

## Architecture (summary)

Static-first: pre-event Python (`src/acquire`, `src/compute`) will cache NASA data and derive indicator packs; the web app (`web/`) is a Next.js static export whose client-side engine composes decisions from those packs. No runtime backend, no server database, no paid services. See `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` (v1.3) for the full contract and `docs/FIELD_SHIFT_UI_UX_DESIGN_SYSTEM.md` for the design system.

## Run it

```bash
cd web
npm ci
npm test        # 42 unit tests: engine constraints, determinism, data contracts
npm run dev     # http://localhost:3000
npm run build   # static production export (type-checked)
```

## Data sources

NASA: POWER · GPM IMERG · SMAP L4 · MODIS/VIIRS NDVI · MOD16 ET · GIBS tiles. Partners (supplementary tier): ESA Copernicus Sentinel-2/-1 · JAXA GSMaP/AMSR2. Open non-space (labeled): SoilGrids 2.0 (CC-BY-4.0) · FAO-56/EcoCrop/GAEZ · OpenFreeMap. OpenET is excluded — its coverage is United States only. The current UI ships deterministic **demo fixtures** with the exact schema of the real data packs; the pipeline fills them with cached NASA data next.

## Repository

- `docs/` — architecture, UI/UX design system, `AI_USE.md` (mandatory AI-use disclosure), verification screenshots, Lighthouse reports.
- `web/` — Next.js 16 + TypeScript + Tailwind v4 + MapLibre + Recharts app with Vitest suite.
- `src/` — Python acquisition + compute pipeline (next milestone).
- CI: `.github/workflows/ci.yml` runs tests + production build on every push.

## License

Apache-2.0. Third-party data and libraries are credited in `docs/` and the in-app Data page.
