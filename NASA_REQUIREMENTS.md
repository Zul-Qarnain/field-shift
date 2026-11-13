# NASA Requirements Matrix — Field Shift (Space Apps 2026)

Challenge: *Field Shift: Adapting Farms with NASA Data* (Adapting Farms with NASA Data).
Source: official challenge Details page (captured 2026-10-31; page Resources tab goes live Nov 13).
Legend: DONE = implemented & verified · PARTIAL = partly implemented · OPEN = missing/planned.

| # | Requirement (official) | Official source | Current implementation | Missing work | Priority | Verification |
|---|---|---|---|---|---|---|
| 1 | Decision-support tool combining NASA EO + local soil + crop characteristics + farmer priorities | Objectives | DONE: NASA POWER (rainfall/temp/heat/GWETROOT), GPM IMERG cross-check, SRDI salinity, SoilGrids pH, priority sliders, live MODIS/SMAP/GRACE ingestion | Full coverage | Done | Site + code audit |
| 2 | Compare ≥3 rotation strategies incl. the existing rotation | Objectives | DONE: rotation engine ranks full crop pool (12 crops), top-3 shown, includes existing field crop | — | Done | web/tests/engine.*.test.ts |
| 3 | Explain why suggested, what evidence, benefits, information gaps, risks per strategy | Objectives | DONE: "See why" score breakdown, evidence text, risks list, limitation notes per source | Mainuddin et al. (2019) leaching, BARI/BJRI/Maas citations | Done | /quick, /plan screens |
| 4 | Farmer priorities & constraints input | Objectives | DONE: priority sliders (water/soil/stable/heat), pH override, scenario onset-shift | Optional: market/equipment/area constraints | Low | /plan page |
| 5 | Data provenance & transparency | Considerations | DONE: /data register, tier badges (NASA/Partner/Open), retrieval dates, sources on every chart | Provenance matrix complete | High | /data page |
| 6 | Use multiple NASA datasets (SMAP, ECOSTRESS, GPM, Landsat, MODIS, POWER, GRACE(-FO), SRTM) | Objectives | DONE: POWER (daily meteorology), GPM IMERG (V07 daily), GIBS True Color basemap, live MODIS NDVI/EVI (ORNL DAAC), SMAP L4 (CMR/GMAO), GRACE-FO Mascon (JPL) | — | Done | src/acquire/ |
| 7 | Analyze temp, heat stress, rainfall, soil moisture, evaporation, frost risk, extreme precipitation, water trends | Objectives | DONE: temp/heat/rainfall/trends/onset real; root-zone soil wetness (GWETROOT/SMAP L4); MODIS 250m NDVI; GRACE groundwater trend | — | Done | src/acquire/ |
| 8 | Highlight bare-field times, vulnerable seasons, pest-cycle break, water demand, infiltration, supplemental income | Objectives | DONE: calendar fallow penalty (Bug D fixed), crop-family breaks, salt tolerance scoring (Bug A & B fixed) | Evidence-backed per-crop trait data | Done | engine.ts |
| 9 | Harmonize datasets of different spatial/temporal resolution | Considerations | DONE: point & 0.1° GPM IMERG + 250m MODIS + 9km SMAP + 0.5° GRACE mascons | Provenance stated honestly per grid | Done | src/acquire/ |
| 10 | Interactive maps, time trends, overlays, scenario sliders | Considerations | DONE: MapLibre map + location picker; scenario sliders; live what-if onset & rainfall sliders | Timeline overlays | Med | UI |
| 11 | Farmer-centered design (simple language, mobile, not replacing expertise) | Considerations | DONE: Bangla+English, Bengali digits, plain advisory text, "not a forecast" disclaimers | Accessibility polish | Done | UX audit |
| 12 | Scientific validity: no temporal leakage, honest evaluation, uncertainty shown | Considerations | DONE: leave-one-year-out backtest (28 folds: 1998–2025), conformal bands (79.7% coverage), positive skill (+0.009, 17/28 years), Kaggle pipeline verified | Model shipped | Done | src/compute/ml/metrics.json |

## Honest position
- The monsoon-onset ML model is **shipped (`onset-ml-v3`)** — beating district climatology out-of-sample in 17 of 28 held-out LOYO years (+0.9% MAE reduction, +18.1% vs 2-3 season mean, +28.1% vs lag-1 persistence).
- Salinity scoring (Bug A) is fully grounded with BARI, BJRI, and Maas (1990) tolerances, with a precautionary guard for uncharacterized crops.
- Aman monsoon leaching (Bug B) is modeled following Mainuddin et al. (2019, 2020) and SRDI long-term surveys, stating both the leached estimate and the unmitigated dry-season upper bound.
- Idle fallow penalty (Bug D) is anchored to the true unallocated cropping duration, preventing late onset from erroneously subsidizing bare soil exposure.
- Real satellite ingestion pipelines for MODIS (ORNL DAAC REST API), SMAP L4 (NASA CMR/GMAO), and GRACE-FO (JPL Mascon) are active in `src/acquire/`.
