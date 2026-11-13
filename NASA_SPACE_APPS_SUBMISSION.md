# BARISHAL | NASA-2026-0140 Final Local Submission — Team Orion

---

## 01. Team

| Field | Value |
|---|---|
| **Team Name** | **Orion** |
| **Team Leader** | **Mohammad Shihab Hossain** · `mohihab.dev@gmail.com` · `01784020480` |
| **University / Organisation** | American International University-Bangladesh (AIUB) |
| **Role** | Team Lead |
| **Member 1** | **Sheikh Shymom Islam** · `shymomsheikh@gmail.com` · `01912186759` · AIUB |
| **Member 2** | **Roy Bipro** · `roybipro.cs@gmail.com` · `01317827838` · AIUB |
| **Member 3** | **Durjoy Saha** · `23-53212-3@student.aiub.edu` · `01726651486` · AIUB |
| **Member 4** | **Protiti Sahajee Prachi** · `protitiprachi@gmail.com` · `01330497737` · AIUB · **Female (Checked: Yes)** |
| **Member 5** | **Nafiz Iqbal** · `nafiziqbalrakib@gmail.com` · `01788445516` · AIUB |

---

## 02. Challenge

- **Selected Challenge:** `Field Shift: Adapting Farms with NASA Earth Observations`

---

## 03. Project

### Project Name
**Field Shift**

### High-level Summary (Max 1000 characters)
*Prompt: Two to four sentences: what you built, who it helps and how it works.*

> Field Shift is an Earth-observation decision support system that turns NASA satellite observations into ranked, climate-adaptive crop rotation plans for smallholder farmers across Bangladesh. Built for rural growers facing erratic monsoons, groundwater depletion, and coastal salinity, it combines 45 years of daily NASA POWER weather (1981–2026), NASA/JAXA GPM IMERG rainfall, SMAP L4 root-zone moisture, and MODIS 250m NDVI with national soil salinity surveys (SRDI 2010) and peer-reviewed agronomy (FAO-29, BARI, BJRI). A deterministic 365-day calendar engine calculates seasonal water margins, terminal heat risks, and natural monsoon salinity leaching to generate explainable 3-crop sequences. Farmers access personalized recommendations in Bengali or English through a 1-click Quick Answer tool, a bilingual Mistral AI assistant, plain-text SMS advisories, and an offline Progressive Web App designed for low-connectivity rural smartphones.

*(Character count: ~945 characters — fits comfortably within the 1000-character limit)*

---

### Project Details (Max 3000 characters)
*Prompt: Where you shine: how it works, the challenge it answers, what you'd build next.*

> **The Challenge:**
> In Bangladesh, over 15 million farming families operate on tight 365-day crop calendars. Climate shifts have severely disrupted traditional planting: erratic monsoon onsets delay Aman rice sowing, pushing dry-season crops into March heat waves; northern Barind groundwater is sinking by 1.35 cm/year; and southern coastal soils reach extreme salinity (6–16 dS/m). Farmers lack accessible, hyper-local data to plan rotations safely.
> 
> **How It Works:**
> 1. **Multi-Mission NASA Data Integration:** Field Shift ingests 45 years of daily NASA POWER agrometeorology (solar, precipitation, T2M_MAX, modeled wetness) cross-checked against NASA/JAXA GPM IMERG V07 satellite rainfall. Live satellite feeds incorporate NASA SMAP L4 root-zone soil moisture (SPL4SMGP), NASA MODIS Terra 250m NDVI/EVI (MOD13Q1), and NASA JPL GRACE/GRACE-FO aquifer depletion signals.
> 2. **Rigorous Agronomic Scoring Engine:** A deterministic, unit-tested engine evaluates candidate rotations across a 12-crop catalog (cereals, legumes, oilseeds, cash crops). It enforces hard calendar feasibility (Aman + Rabi + Pre-monsoon + turnarounds <= 365 days). Eight weighted dimensions score water adequacy (logistic supply-demand margins), irrigation reliance, soil nitrogen balance, sequence family risks, and resilience.
> 3. **Soil Salinity & Monsoon Dilution Math:** Using SRDI (2010) survey data across 102 upazilas, crop yield loss is calculated using Maas & Hoffman / FAO-29 thresholds calibrated with BARI/BJRI limits. For Kharif-II Aman rice, root-zone salinity is leached by 60%–75% based on empirical research (Mainuddin et al. 2019/2020), preventing over-penalization while guarding uncharacterized crops.
> 4. **What-If Stress Testing:** Farmers simulate scenarios (+7/+15 days monsoon delay, 10–20% rain reduction, +1/+2°C heat) to prove rotational resilience before sowing.
> 5. **Farmer-First Accessibility:** The platform provides a 1-click Quick Answer tool, plain-text SMS advisories, an interactive /docs manual, a bilingual Mistral AI assistant, and an installable Progressive Web App (PWA) with full offline service-worker caching for low-bandwidth rural mobile phones.
> 
> **Validation & Machine Learning:**
> A LightGBM model trained on NASA/JAXA GPM IMERG and MERRA-2 oceanic indices (Niño 3.4 & DMI) predicts monsoon onset anomaly across 28 held-out years under Leave-One-Year-Out validation (MAE 10.63 d vs 10.73 d climatology, 79.7% coverage on 80% conformal intervals).
> 
> **What We'd Build Next:**
> We plan to integrate Sentinel-1 SAR flood extent mapping, connect with the Department of Agricultural Extension (DAE) Krishi Batayan national SMS gateway for automated district broadcasts, and pilot field trials with farmer cooperatives in Barind and coastal Satkhira.

*(Character count: ~2,840 characters — strictly within the 3000-character limit)*

---

## 04. Links

| Field | URL / Value |
|---|---|
| **240-second video (YouTube)** | `[Insert your YouTube Video Link here — <= 240 seconds]` |
| **GitHub repository** | **`https://github.com/Zul-Qarnain/field-shift`** *(Public, verified 0 errors, 700 unit tests passing)* |
| **NASA Space Apps project page** | **`https://www.spaceappschallenge.org/nasa-space-apps-2026/find-a-team/orion/`** |

---

## 05. Data Used

### NASA Data (with link and one-line usage)
1. **NASA POWER (Prediction Of Worldwide Energy Resources)**  
   *Link:* https://power.larc.nasa.gov/  
   *Usage:* Provided 45 years (1981–2026) of daily precipitation, solar irradiance, temperature, and root-zone soil wetness for 64 districts and 6 demo farms to detect monsoon onset shifts and calculate crop water adequacy.
2. **NASA/JAXA GPM IMERG V07 (Global Precipitation Measurement)**  
   *Link:* https://gpm.nasa.gov/data/imerg  
   *Usage:* Served as the independent satellite rainfall truth to cross-check rainfall homogeneity, verify Pettitt change-points, and provide ground-truth onset labels for machine learning.
3. **NASA GMAO MERRA-2 Reanalysis**  
   *Link:* https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/  
   *Usage:* Provided oceanic sea-surface temperatures to derive pre-monsoon Niño 3.4 and Indian Ocean Dipole (DMI) climate indices as teleconnection features for onset forecasting.
4. **NASA SMAP L4 (Soil Moisture Active Passive - SPL4SMGP V008)**  
   *Link:* https://nsidc.org/data/spl4smgp  
   *Usage:* Ingested 9 km root-zone and surface soil moisture assimilation to monitor field-level planting moisture and water-stress margins.
5. **NASA MODIS Terra (MOD13Q1 V061)**  
   *Link:* https://modis.ornl.gov/rst/api/v1/  
   *Usage:* Ingested 250m 16-day composite Normalized Difference Vegetation Index (NDVI) and EVI time series via ORNL DAAC REST API to verify vegetative vigor and historical greenness.
6. **NASA JPL GRACE & GRACE-FO Mascon (RL06.3M CRI)**  
   *Link:* https://podaac.jpl.nasa.gov/  
   *Usage:* Quantified terrestrial water storage anomalies and long-term groundwater depletion trends (-1.35 cm/year) across the northwestern Barind aquifer.
7. **NASA EOSDIS GIBS (Global Imagery Browse Services)**  
   *Link:* https://gibs.earthdata.nasa.gov/  
   *Usage:* Provided true-color daily satellite imagery basemap tiles under interactive field and farm boundary visualizations.

### Other Space Agency Data
1. **JAXA GPM (Japan Aerospace Exploration Agency — NASA Partner)**  
   *Link:* https://www.jaxa.jp/projects/sas/gpm/index_e.html  
   *Usage:* Joint NASA–JAXA satellite radar/radiometer constellation data utilized within GPM IMERG V07 precipitation processing.

### Other Data (Ground Surveys, Agronomy & Boundaries)
1. **SRDI (Soil Resource Development Institute, Bangladesh) — Saline Soils of Bangladesh (2010)**  
   *Link:* http://srdi.portal.gov.bd/  
   *Usage:* Appendix-2 upazila-level survey covering 102 upazilas across 18 coastal districts, categorizing soil salinity from S1 (2–4 dS/m) to S5 (>16 dS/m) for root-zone stress scoring.
2. **FAO-29 Table 4 & BARI / BJRI Agronomic Guidelines (Maas & Hoffman 1990)**  
   *Link:* https://www.fao.org/4/t0234e/T0234E03.htm  
   *Usage:* Established empirical salt tolerance thresholds (a) and yield loss slopes (b) for cereals, legumes (lentil, mungbean), oilseeds (mustard, sesame), and jute.
3. **geoBoundaries (gbOpen BGD ADM2 & ADM3)**  
   *Link:* https://www.geoboundaries.org/  
   *Usage:* Standard open administrative boundary polygons for spatial point-in-polygon assignment of farm coordinates to upazilas and 64 district centroids.
4. **OpenFreeMap / OpenStreetMap**  
   *Link:* https://openfreemap.org/  
   *Usage:* Provided offline-capable vector basemaps for rural geographic navigation.

---

## 06. Use of AI and References

### Use of AI
*Prompt: Every AI tool you used, what you used it for, and the data it worked on. Write "None" if you didn't use AI.*

> In developing Field Shift, our team adhered strictly to responsible AI principles:
> 1. **Claude CLI / Claude Code & Cursor:** Used as core programming and refactoring assistants to build the TypeScript/Next.js frontend, write Vitest unit tests (700 tests), and construct the Python satellite ingestion pipelines (SMAP, MODIS, GRACE).
> 2. **Grok & Grokbot:** Used for rapid literature cross-checking regarding Bangladesh agricultural crop calendars (BRRI/BARI technical reports) and agronomic parameter verification.
> 3. **OpenCode & MuseCode by Meta:** Used for comparative benchmarking of statistical algorithms (Mann-Whitney U tests, Pettitt non-parametric change-point detection, and Theil-Sen trend slope calculations).
> 4. **Mistral AI (via Serverless API):** Powers the bilingual "Field Shift AI Assistant" chat interface, grounded by a comprehensive system prompt containing our verified agronomic knowledge base and /docs user manual.
> 5. **Google Gemini (Gemini 2.5 Flash / Pro):** Used for synthesis of complex geospatial documentation, data schema validation, and generating natural voice narration (Gemini TTS API with prebuilt voice Kore) for the demonstration video.
> 6. **Google V0 & ElevenLabs:** Used for early wireframe layout ideation and baseline acoustic reference testing.
> 
> *Crucial Scientific Integrity Note:* Zero AI hallucination is permitted in core computations. All crop rotation rankings, 365-day calendar constraints, soil salinity penalties, and water-adequacy scores are executed by deterministic, unit-tested TypeScript algorithms. The monsoon forecast utilizes an auditable LightGBM gradient-boosted tree model with exact tree SHAP explanations.

---

### References
*Prompt: Every source, paper, dataset, library and asset you drew on, with links where you have them.*

1. **World Bank (2022).** *Country Climate and Development Report: Bangladesh.* World Bank Group. https://www.worldbank.org/en/news/feature/2022/10/31/key-highlights-country-climate-and-development-report-for-bangladesh
2. **NASA Langley Research Center.** *Prediction Of Worldwide Energy Resources (POWER) Project.* Daily Agroclimatology API. https://power.larc.nasa.gov/
3. **Huffman, G. J. et al. (2023).** *NASA Global Precipitation Measurement (GPM) Integrated Multi-satellitE Retrievals for GPM (IMERG), V07.* NASA GES DISC. https://doi.org/10.5067/GPM/IMERG/3B-HH/07
4. **Maas, E. V., & Hoffman, G. J. (1977; updated 1990).** *Crop salt tolerance—current assessment.* ASCE Journal of the Irrigation and Drainage Division, 103(2), 115-134.
5. **Ayers, R. S., & Westcot, D. W. (1985).** *Water quality for agriculture.* FAO Irrigation and Drainage Paper 29 (Rev. 1), Food and Agriculture Organization of the United Nations, Rome. https://www.fao.org/4/t0234e/T0234E00.htm
6. **Soil Resource Development Institute (SRDI) (2010).** *Saline Soils of Bangladesh.* Ministry of Agriculture, Government of the People's Republic of Bangladesh.
7. **Mainuddin, M. et al. (2019, 2020).** *Water management and crop diversification in coastal saline areas of Bangladesh.* Agricultural Water Management, 223, 105685. https://doi.org/10.1016/j.agwat.2019.105685
8. **Bangladesh Rice Research Institute (BRRI) (2025).** *Technical Guideline for Mustard–Boro–T. Aman Cropping Pattern.* Rice Farming Systems Division.
9. **Moron, V., & Robertson, A. W. (2014).** *Interannual variability of Indian summer monsoon rainfall onset date at local scale.* International Journal of Climatology, 34(4), 1050–1061. https://doi.org/10.1002/joc.3745
10. **Pettitt, A. N. (1979).** *A non-parametric approach to the change-point problem.* Journal of the Royal Statistical Society: Series C (Applied Statistics), 28(2), 126–135.
11. **Gelaro, R. et al. (2017).** *The Modern-Era Retrospective Analysis for Research and Applications, Version 2 (MERRA-2).* Journal of Climate, 30(14), 5419–5454.
12. **Saji, N. H. et al. (1999).** *A dipole mode in the tropical Indian Ocean.* Nature, 401(6751), 360–363.
13. **Open-Source Software Libraries:** Next.js (MIT), React (MIT), Tailwind CSS (MIT), MapLibre GL (BSD-3-Clause), Lucide Icons (ISC), LightGBM (MIT), Scikit-Learn (BSD-3-Clause), Playwright (Apache-2.0), Vitest (MIT), FFmpeg (LGPL/GPL).

---

## 07. Declaration and Agreements
- [x] **Accessibility:** Our project's interface is accessible, with sound and image: anyone can use it.
- [x] **NASA Space Apps Project Page:** Our NASA Space Apps project page is filled in and submitted on spaceappschallenge.org.
- [x] **Terms & Agreements:** Confirmed and agreed by all team members.
