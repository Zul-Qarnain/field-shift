# NASA Requirements Matrix — Field Shift (Space Apps 2026)

Challenge: *Field Shift: Adapting Farms with NASA Data* (Adapting Farms with NASA Data).
Source: official challenge Details page (captured 2026-10-31; page Resources tab goes live Nov 13).
Legend: DONE = implemented & verified · PARTIAL = partly implemented · OPEN = missing/planned.

| # | Requirement (official) | Official source | Current implementation | Missing work | Priority | Verification |
|---|---|---|---|---|---|---|
| 1 | Decision-support tool combining NASA EO + local soil + crop characteristics + farmer priorities | Objectives | DONE: NASA POWER (rainfall/temp/heat/GWETROOT), GPM IMERG cross-check, SRDI salinity, SoilGrids pH, priority sliders | Replace remaining demo fixtures with real feeds (SMAP, MODIS, GRACE) | High | Site + code audit |
| 2 | Compare ≥3 rotation strategies incl. the existing rotation | Objectives | DONE: rotation engine ranks full crop pool (12 crops), top-3 shown, includes existing field crop | — | Done | web/tests/engine.*.test.ts |
| 3 | Explain why suggested, what evidence, benefits, information gaps, risks per strategy | Objectives | DONE: "See why" score breakdown, evidence text, risks list, limitation notes per source | More explicit per-strategy gap/limitation copy | Med | /quick, /plan screens |
| 4 | Farmer priorities & constraints input | Objectives | DONE: priority sliders (water/soil/stable/heat), pH override, scenario onset-shift | Optional: market/equipment/area constraints | Low | /plan page |
| 5 | Data provenance & transparency | Considerations | DONE: /data register, tier badges (NASA/Partner/Open), retrieval dates, sources on every chart | Keep updated as feeds become real | High | /data page |
| 6 | Use multiple NASA datasets (SMAP, ECOSTRESS, GPM, Landsat, MODIS, POWER, GRACE(-FO), SRTM) | Objectives | PARTIAL: POWER (full), GPM IMERG (cross-check), GIBS True Color basemap | SMAP L4 soil moisture, MODIS NDVI, GRACE water trend, ECOSTRESS/Landsat/SRTM optional | High | src/acquire, packs |
| 7 | Analyze temp, heat stress, rainfall, soil moisture, evaporation, frost risk, extreme precipitation, water trends | Objectives | PARTIAL: temp/heat/rainfall/trends/onset real; soil moisture card = fixture; no evap/frost/extreme indices | Build real soil-moisture + vegetation + water-trend indices | High | packs schema |
| 8 | Highlight bare-field times, vulnerable seasons, pest-cycle break, water demand, infiltration, supplemental income | Objectives | PARTIAL: calendar fallow penalty, crop-family breaks, income estimate (clearly labeled estimate) | Evidence-backed per-crop trait data | Med | engine.ts |
| 9 | Harmonize datasets of different spatial/temporal resolution | Considerations | OPEN: POWER is point/lat-lon; IMERG 0.1° cell; no common-grid step | Common-grid harmonization step (Kaggle) | Med | — |
| 10 | Interactive maps, time trends, overlays, scenario sliders | Considerations | PARTIAL: MapLibre map + location picker; scenario sliders; no timeline/overlay layers | GIBS PMTiles layers, timeline overlays | Med | UI |
| 11 | Farmer-centered design (simple language, mobile, not replacing expertise) | Considerations | DONE: Bangla+English, Bengali digits, plain advisory text, "not a forecast" disclaimers | Accessibility polish, performance audit | Med | UX audit |
| 12 | Scientific validity: no temporal leakage, honest evaluation, uncertainty shown | Considerations | DONE: leave-one-year-out backtest, conformal bands, "validating" status when no skill; provenance documented | Improve skill or keep honest null | High | src/compute/ml/metrics.json |

## Honest position
- The monsoon-onset ML model is currently **"validating" (skill 0.0)** — it does not beat district climatology out-of-sample and correctly ships nothing.
- Soil moisture, NDVI, water-adequacy, irrigation access and crop-trait values are **labeled demo fixtures** in the UI (never presented as measured).
- NASA Resources tab (extra datasets/links) appears **Nov 13** — re-check then.
