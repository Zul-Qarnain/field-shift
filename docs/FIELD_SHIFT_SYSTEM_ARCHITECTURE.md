# FIELD SHIFT — SYSTEM ARCHITECTURE

**Project:** Field Shift: Adapting Farms with NASA Data — NASA Space Apps Challenge 2026, Bangladesh local event (Dhaka), theme "The Next Frontier"
**Document version:** 1.3 · 26 September 2026 · Phase 1 approved — Phase 2 (UI/UX) initiated
**Status:** READY FOR REVIEW — implementation does not begin until this document is approved, and is re-validated against the full challenge statement on 28 October 2026.
**v1.3 changes (26 Sep 2026 — Phase 1 approved by team):** (1) **District coverage expanded to all 64 Bangladesh districts** — NASA-core packs (POWER, SMAP/MODIS/MOD16 via AppEEARS point sampling, SoilGrids) are built per-district-centroid for all 64; SHOULD-tier partner layers (Sentinel-2/-1, GSMaP) remain limited to the 6 curated demo farms at farm resolution. (2) Crop pool locked: Aman/Aus/Boro rice, wheat, maize, mustard, lentil, mungbean, potato (8). (3) Pre-event-permission question resolved by team (USER-REPORTED: Local Lead permission granted — recorded as team-reported, not independently verified). (4) `docs/AI_USE.md` created (disclosure is mandatory even though AI use is permitted). (5) Team-reported a previously built "high-accuracy model" (domain unspecified): integration path — document what it predicts, its labeled training data, and validation metrics; only then can it enter as a documented component per ADR-005. Not part of the MVP.

**v1.2 changes (26 Sep 2026):** (1) Bangladesh confirmed as the demo region; product reframed as a region-agnostic engine demonstrated on Bangladesh (universal-capable via data packs, English-first UI with Bangla toggle). (2) Partner layers demoted from MUST to SHOULD: Sentinel-2 field-level NDVI, Sentinel-1 flood days, JAXA GSMaP cross-check become supplementary enhancements with graceful fallback — the NASA-only path is the golden path. JRC Global Surface Water (Landsat/NASA-origin) added as the no-SAR flood-proneness prior. AMSR2 demoted to optional. (3) Governance clarifications: access path does not change provenance (GEE/AWS retrieval of ESA/NASA data remains partner data); acquisition precedence order fixed for the prep window.

**v1.1 change (26 Sep 2026; corrected same day):** data-governance rule adopted — **NASA data is the compulsory foundation: 100% of the core science must run on NASA data, and the NASA-only path must stand alone.** Space Agency Partner data (ESA Sentinel-2/-1, JAXA GSMaP/AMSR2; 17 partners, VERIFIED from the official partners page this session) is strictly **supplementary — layered on top of the NASA base, never a substitute for it**. Non-partner data (SoilGrids, SRDI/BARC, basemap/geocoding/boundaries infrastructure) retained but explicitly relabeled as the non-space open-data layer.

**Label legend used throughout:**
`FACT` = verified in a cited source · `PROJECT SOURCE` = from the team's supplied documents (Build Guide, Challenge Breakdown PDF, BD Participants Guide summary, strategy doc) · `VERIFIED` = checked live this session by web research against primary sources · `UNVERIFIED` = could not be confirmed · `ESTIMATE` = this analysis' own modelling · `ASSUMPTION` = decision pending verification, treated as a working premise · `HYPOTHETICAL` = clearly-not-real demonstration content.

---

## 0. Source basis and material conflicts

Per the master prompt, every artifact was inventoried before designing anything.

| Artifact | What it is | Requirements it introduces | Authority |
|---|---|---|---|
| `inputprompt.md` | Master architecture prompt (this document's spec) | 40-section architecture, zero-cost rule, TS preference, Phase 1 gate | Governing instruction |
| `Space-Apps-2026-Bangladesh-Build-Guide.html` | Technical companion guide for BD teams | `src/{acquire,compute,agents,api}` boundary, offline-first (`OFFLINE=1`, `demo_fixtures/`), Apache-2.0, `docs/AI_USE.md`, score sheet, per-challenge Field Shift build plan | PROJECT SOURCE (its 2026 challenge list cross-checks against the official site) |
| `NASA Space Apps 2026 - 14 Challenges Breakdown & Selection Guide.pdf` | Third-party-style breakdown of the 14 challenges | Field Shift summary text, data/stack recommendations (SMAP, MODIS/Landsat VI, GPM, OpenET, POWER, FastAPI, Next.js PWA, Leaflet/MapLibre) | PROJECT SOURCE |
| `Markdown to PDF.pdf` | Bangladesh local event rules | Prescreen 1 Oct 11:59 PM (240 s concept video), hackathon 13–14 Nov, score sheet (100 + 15 + 3 binary + 5% women bonus), under-18 safeguard, AI/third-party attribution | PROJECT SOURCE |
| `spaceapps2026_strategy.html` | Win-strategy analysis with cited sources | Judging analysis, region math, winner patterns, "5 of 27 BD nominees in 2025 were agriculture; 0 finalists → need depth beyond a dashboard" | PROJECT SOURCE (its global sources are cited URLs) |

**Verified this session (web research, September 2026):** Field Shift is an official 2026 challenge — `https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/` (VERIFIED, title in official URL/search index; full statement text UNVERIFIED until 28 Oct). Global hackathon 14–15 Nov 2026, submissions close 15 Nov 11:59 PM local (VERIFIED). Challenges revealed 17 Sep; full statements 28 Oct (VERIFIED). Brand guidelines live at `https://www.spaceappschallenge.org/brand/` (VERIFIED location; blue-led palette with neon-yellow accent, libre-licensed fonts). Judging dimensions Impact/Creativity/Validity/Relevance/Presentation confirmed on 2026 local-event pages (VERIFIED, partially). **2026 AI-disclosure and dataset-citation wording: UNVERIFIED** — the detailed submission/judging guides publish 13 Nov 2026; we follow the BD guide's rules until then.

**Verified 26 Sep 2026 — 2026 Space Agency Partners (VERIFIED from `https://www.spaceappschallenge.org/2026/space-agency-partners/`):** 17 partners — Angola (GGPEN), Argentina (CONAE), Bahrain (BSA), Brazil (AEB), Canada (CSA), European Space Agency (ESA), India (ISRO), Italy (ASI), Japan (JAXA), Korea (KASA), Nigeria (NASRDA), Paraguay (AEP), Senegal (ASES), Spain (AEE), Türkiye (TUA), UAE (MBRSC), UK Space Agency. The official page states: *"Alongside NASA's free and open data, Space Agency Partners provide additional space-based data for participants to use."*

**Data-governance rule (v1.1, corrected — team decision):** the challenge must be answerable with **NASA data alone — NASA is the compulsory, primary evidence layer, and 100% of the core science runs on it**. Space Agency Partner data (ESA, JAXA) may only be added **on top of a working NASA-only base, as supplementary cross-checks and enhancements — never as a substitute or a dependency**. Non-partner data falls into two explicitly labeled tiers and is never presented as partner data: (a) **open non-space data** (SoilGrids soil properties, SRDI/BARC curated references, FAO agronomic literature) — needed because no space agency publishes BD soil data; (b) **app infrastructure** (basemap tiles, geocoding, admin boundaries) — plumbing, not science inputs. Every dataset badge in the UI carries its tier: `NASA` · `Partner (ESA/JAXA)` · `Open non-space` · `User-provided`. **Access path does not change provenance** — Sentinel data retrieved via Google Earth Engine or AWS is still ESA data, Landsat via GEE is still NASA/USGS data; what matters is the originating agency, not the pipeline used to fetch it.

**Material conflicts found (not silently ignored):**

1. **Product scope.** The challenge summary (PDF) asks for a *crop-rotation advisor* (SMAP soil moisture + MODIS/Landsat VI + GPM precipitation + OpenET + local soil health → resilient rotation calendars and risk-reduction strategies). The Build Guide's Field Shift page narrows the build to a *planting-window advisory for Bangladeshi rice* (rainfall onset + growing-degree-day shift, Mann-Whitney two-period test). **Resolution:** rotation is the core engine; planting-window science (onset, GDD) is one module inside it — the rotation engine literally needs "when can this crop be planted" answers, which the window module provides. Both readings are satisfied; the rotation framing is primary because it matches the official challenge summary text.
2. **OpenET.** Named in the challenge summary, but OpenET is **United-States-only** (expanded to all 48 contiguous states Dec 2025; no Asia coverage — VERIFIED from OpenET docs and coverage announcements). We cannot use it over Bangladesh. Resolution: substitute verified free ET sources covering Bangladesh (MOD16A2, SSEBop, ERA5-Land) and state this substitution openly in the project page — turning a limitation into a demonstrated data-judgment point.
3. **Pre-event work vs the global FAQ.** The global FAQ says teams may not begin working on the challenges before the hackathon; the BD pipeline demands a prescreening video by 1 Oct and the Build Guide prescribes pre-caching data. The strategy doc already flags this. Resolution: architecture supports both postures — pre-event work is limited to *general preparation* (accounts, keys, data caching, repo scaffolding, generic library code) and the challenge-specific solution build happens on 13–14 Nov; the Local Lead will be asked in writing what counts as prep (open question, §40).
4. **Challenge numbering.** The PDF numbers Field Shift as #3, the Build Guide as #7. Same challenge, different list orderings; no action needed beyond noting it.

---

## 1. Executive summary

Field Shift is a **decision-support web app**: an explainable crop-rotation engine that works for **any region supplied as a data pack — demonstrated end-to-end on Bangladesh** (confirmed demo region, 26 Sep 2026). It turns 25+ years of NASA Earth observations (compulsory foundation; supplementary Space-partner and open soil layers on top) into **explainable crop-rotation strategies** for a specific farm. A user picks a farm (demo farms or a map pin), sees *what has shifted* in their environment (rainfall onset, temperature, soil moisture, vegetation, evapotranspiration — with statistical tests, not vibes), enters their soil corrections and priorities (water conservation, soil health, yield stability, …), and receives ranked multi-season rotation strategies. Every number traces to a named dataset and a deterministic, unit-tested function; every recommendation ships with a why-panel, risks, and an SMS-length advisory in Bangla and English.

The architecture is **static-first**: all heavy science (Python, `src/compute`, tested) runs **before the event** and writes committed indicator packs (`demo_fixtures/`); the runtime app (Next.js + TypeScript) is a client-side deterministic decision engine over those packs. There is **no server database, no runtime LLM, and no paid service** anywhere in the demo path. The demo works with the wifi off. Optional live queries (SoilGrids, POWER point fetch, geocoding) enrich the experience when the network allows and degrade gracefully to the committed packs, with an honest source badge ("live / cache / fixture") in the UI.

This shape was chosen for three reasons: (a) it is the only deployment model that is genuinely zero-cost and cannot cold-start-fail during judging; (b) it matches the Build Guide's discipline — deterministic code does the science, the demo runs offline; (c) past agriculture winners won with exactly this profile — a named decision, real modelling, visible data depth (§37).

---

## 2. Problem definition

The challenge (PROJECT SOURCE, official summary): agricultural producers face severe rainfall volatility, shifting seasonal temperatures, and declining soil fertility, making **multi-season crop-rotation planning risky and uncertain**. Farmers lack localized, accessible decision-support tools that integrate satellite soil moisture, evapotranspiration, and climate information with farm-specific agronomic constraints.

The concrete Bangladeshi form of the problem (PROJECT SOURCE + domain framing): a farmer or extension officer in, say, Rajshahi must decide what to plant across the next 2–3 seasons (e.g., Aman rice → what winter crop → what pre-monsoon crop). Their practical questions:

- Has the usable-rainfall onset moved? By how much, with what evidence?
- Is my soil (pH, texture, organic carbon) compatible with the crops I'm considering?
- Which rotation feeds the soil (legumes, residue) instead of repeatedly mining it?
- What happens to this plan if the season runs hotter or drier than usual?

**The product must answer a decision question, not display data.** The Build Guide's "where the points are" note applies verbatim: the failure mode is a dashboard that shows data and leaves the farmer to work it out; end on a sentence, not a chart.

**Scope guard (honesty):** Field Shift is a *decision-support exploration tool*, not an autonomous agronomic authority. Its outputs are advisory, sourced, uncertainty-flagged, and explicitly not a yield forecast (we have no validated BD yield-response model — claiming one would be a validity failure).

## 3. Product concept

One sentence: **"Choose a farm → see what NASA data says has shifted → set priorities → get ranked, explained crop rotations → stress-test them with what-ifs → walk away with an advisory you can read out loud."**

Product principles:

1. **NASA data changes the answer, or it isn't shown.** Every displayed layer feeds a scoring component (§11–12). No decorative maps.
2. **The farmer never sees a raw satellite unit.** Values are translated ("usable-rainfall onset now ≈ 18 June, 11 days later than 2001–2012 — FACT with test statistic attached").
3. **Explainability is the UI.** Each recommendation has a why-panel: component scores, the thresholds crossed, dataset ids, and the honest uncertainty note.
4. **Uncertainty is a first-class citizen.** Modeled ≠ measured ≠ user-entered; each is labeled and styled differently. Data-quality flags lower a recommendation's confidence visibly.
5. **Works offline.** `OFFLINE=1` + committed fixtures. A "cache" badge reads as rigour (Build Guide), not failure.

## 4. User personas

| Persona | Who | Goal | How they use it |
|---|---|---|---|
| **Primary: the mediated farmer advisor** | Extension officer, NGO field worker, or a literate family member mediating for a smallholder in Rajshahi/Barishal | "What should we rotate this year given the way the rains have moved?" | Phone or shared laptop; picks the upazila, corrects soil if they know it, sets 2–3 priorities, reads the Bangla advisory sentence aloud |
| **Secondary: the district agriculture officer / NGO planner** | Plans program messaging across a district | Compare rotations across demo farms; defensible sourcing | Desktop; uses the compare view and provenance drawer |
| **Tertiary: judge / researcher / student** | Evaluates validity; explores method | Verify claims, inspect method and data | Opens Method and Provenance pages; reads `docs/` |

Deliberate **cut**: no multi-tenant accounts, no farm-management SaaS features (input inventories, market prices) — they dilute the primary journey. One user type gets an excellent 5-minute experience (master prompt §6).

## 5. Core user journey

```text
Choose Farm (demo farms or map pin / district)
      ↓
Understand Conditions (env digest + what-shifted evidence + soil profile)
      ↓
Set Priorities (water · soil health · yield stability · heat/flood risk …)
      ↓
Generate Rotations (ranked, from the chosen crop pool)
      ↓
Compare Strategies (side-by-side component scores)
      ↓
Understand Why (per-recommendation why-panel + provenance drawer)
      ↓
Explore What-If (drier season / hotter season / late onset / new soil)
      ↓
Act (advisory sentence + ≤160-char SMS text, Bangla & English)
```

Screen inventory for this journey is a Phase 2 deliverable (master prompt §32–33); the architecture only fixes the data each step consumes.

## 6. Functional requirements

**MUST**

- F1. Farm selection: ≥6 curated demo farms across contrasting BD agro-ecological conditions + district search (Photon/Nominatim geocoding) + map pin.
- F2. Environmental digest per farm: monsoon-rainfall onset distribution (two eras), annual/seasonal rainfall trend, temperature trend, extreme-heat days trend, SMAP soil-moisture seasonality, NDVI greenness trend (MODIS/VIIRS archive), ET/PET balance — each with stated definition, era, test statistic, and dataset citation. Field-level Sentinel-2 greenness and Sentinel-1 flood-day observations are **SHOULD-tier enhancements (F13), not dependencies** — the NASA-only path stands alone per the v1.1 governance rule.
- F3. Soil profile: SoilGrids-derived pH, texture (sand/silt/clay), organic carbon, CEC, bulk density at root depths; user overrides (they know their plot is sandy/flooded); provenance labels (modeled vs user-entered).
- F4. Crop pool: ≥8 Bangladesh-relevant crops with source-cited traits (season windows, water demand, GDD base, Kc curve, pH/texture tolerance, N demand/fixation, root depth, heat/flood tolerance, residue, family for break-crop rules).
- F5. Rotation engine: generate valid multi-season (2–4 season) sequences from the pool under hard constraints; score with the §11 model; rank; return top N with full component breakdowns.
- F6. Farmer priorities: 4–6 sliders that re-weight the score instantly (client-side, deterministic).
- F7. Explainability: per-rotation why-panel (top contributors, thresholds, datasets) + provenance drawer (raw values → source URL, id, version).
- F8. What-if scenarios: rainfall −10/−20%, +1/+2 °C, onset +7/+15 days, soil pH shift; same engine re-run; before/after ranking deltas; labeled HYPOTHETICAL.
- F9. Advisory output: one plain-language sentence + ≤160-char SMS text, Bangla and English, template-generated from tool results only.
- F10. Demo mode: `OFFLINE=1` forces committed fixtures; source badge ("live / cache / fixture") on every data block.
- F11. Method & data pages: definitions, formulas, every dataset with id + URL (submission requirement).
- F12. Bangla/English UI toggle; mobile-first layout.

**SHOULD:** live point queries for custom pins (SoilGrids, POWER) with graceful fallback; pre-tiled GIBS satellite overlay for demo regions (PMTiles); PWA install + service-worker cache (PDF stack recommendation); comparison across two demo farms; **F13 — partner-data enhancements (supplementary tier, each degrading to the NASA-only baseline): Sentinel-2 10–20 m field-level NDVI validation; flood layer = JRC Global Surface Water flood-proneness prior (Landsat/NASA-origin, no SAR processing) and/or Sentinel-1 observed flood-exposure days (cited threshold method, validated on known flooded demo-farm dates); JAXA GSMaP rainfall cross-check for the onset claim; JAXA AMSR2 optional (lowest value-per-module, cut first).**

**CUT (explicit):** runtime LLM anywhere in the decision path; user accounts/auth; server database; yield forecasting ML; market/economics module; real-time weather; polygon drawing (pin + district is enough); non-Bangladesh geographies.

## 7. Non-functional requirements

| NFR | Target | Rationale |
|---|---|---|
| Demo reliability | 100% of golden-path interactions succeed with network disabled | Build Guide offline rule |
| Interactive latency | Priority-slider re-rank < 100 ms client-side; page interactions < 1 s on mid-range Android | 240-second demo has no patience |
| Bundle/first load | Initial JS < 300 KB gz; data packs loaded per-district on demand | Rural bandwidth honesty |
| Zero cost | No card-required service anywhere in build or demo path | Master prompt §3 (absolute) |
| Testability | Every `src/compute` function unit-tested incl. sensitivity checks; engine golden tests | Validity criterion |
| Traceability | Every displayed number → dataset id + URL + retrieval date | "NASA may remove nominations from teams that don't cite resources" (strategy doc citing legal) |
| Accessibility | WCAG-AA contrast, keyboard nav, non-color-only indicators, semantic HTML, Bangla font stack | Score sheet "User experience" + brand guidance |
| License/compliance | Apache-2.0, public repo, no under-18 likeness in videos, AI tools named in `docs/AI_USE.md` | BD rules (PROJECT SOURCE) |

## 8. Data-source architecture

Two planes, one rule (**the layer rule**, from the Build Guide): *the web app never calls NASA during a demo — it reads committed packs; acquisition runs before the event and, when the network allows, live.*

```text
PLANE A — PRE-EVENT (Python, this machine, good internet)
  src/acquire/<source>.py  →  cache/ (raw)  →  src/compute/*.py  →  demo_fixtures/ (committed packs)
PLANE B — RUNTIME (Next.js, browser + optional route handlers)
  demo_fixtures packs (default)  ·  optional live enrich (SoilGrids/POWER/geocode) with fixture fallback
```

Every fetch goes through the Build Guide's `safe.py` pattern: **live → cache → committed fixture**, never raising during a demo, returning a source label the UI shows.

## 9. NASA + Space-partner data strategy

| Dataset | Provider | Variables used | Resolution | Temporal | Access | Free/card? | Role in the decision | Limits / notes |
|---|---|---|---|---|---|---|---|---|
| **NASA POWER** | NASA Langley | PRECTOTCORR, T2M/T2M_MAX/T2M_MIN, ALLSKY_SFC_SW_DWN, WS2M, RH2M | Point + 0.5°/1° grids | Daily, **1981–present** (solar 1984+) | `power.larc.nasa.gov/api/temporal/daily/point`, JSON/CSV | Free, no card, no key required (throttled) | Backbone: onset detection, GDD, heat-stress days, rainfall trends | Max 20 params/request; unauthenticated throttling (limit not published — VERIFIED core, UNVERIFIED exact limit) |
| **GPM IMERG v07** | NASA GES DISC (NASA–JAXA mission) | Calibrated precipitation | 0.1° (~10 km) | Half-hourly/daily, 2000–present (Final run ~3.5-mo lag) | GES DISC (OPeNDAP/HTTPS), Earthdata Login | Free (email account, no card) | Primary gridded rainfall: spatial rainfall detail beyond POWER points; onset detection | Final-run lag; use Early Run only if "now" matters (it doesn't for climatology) |
| **JAXA GSMaP** | JAXA (Space Agency Partner) | Gauge-calibrated satellite precipitation | 0.1° | Hourly/daily, 2000–present | JAXA G-Portal / EORC GSMaP distribution | Free (G-Portal registration) | Rainfall cross-check for onset detection — POWER + IMERG + GSMaP agreement strengthens the onset claim (R5 defense) | Registration required; per-layer product details verify at acquire time (UNVERIFIED this session) |
| **SMAP L4 (SPL4SMGP.008)** | NSIDC/GES DISC | Surface + root-zone soil moisture, ET, runoff | 9 km EASE-Grid | 3-hourly, 31 Mar 2015–present | AppEEARS / GES DISC / NSIDC | Free Earthdata Login, not restricted | "Is the field workable / profile moisture" component; dry-spell evidence | Starts 2015 — too short for trend claims; used for current-state, not trends |
| **JAXA AMSR2 (GCOM-W)** | JAXA (Space Agency Partner) | Surface soil moisture | ~25 km | Daily-ish, **2012–present** | G-Portal (free registration) | Free | SMAP cross-check **plus pre-2015 soil-moisture context** that SMAP cannot provide | Coarser than SMAP (25 km vs 9 km); used for cross-validation, not primary |
| **MODIS NDVI (MOD13Q1/MYD13Q1) & VIIRS VNP13** | LP DAAC via AppEEARS | NDVI/EVI | 250 m (MODIS) / 463 m (VIIRS) | 16-day, 2000– (VIIRS 2012–) | AppEEARS point/area API | Free Earthdata Login | **Historical greenness archive (2000–present)**: long-trend degradation signal + two-era greenness test | **MODIS Terra/Aqua winding down late 2026; Suomi-NPP data ends 1 Nov 2026** (Build Guide status note) → archive role only; current-state greenness moves to Sentinel-2 below |
| **ESA Sentinel-2 (MSI)** | ESA (Space Agency Partner) via Copernicus Data Space Ecosystem | NDVI/EVI at **10–20 m** | 10–20 m | ~5-day revisit (cloud-permitting), 2015– (S2B 2017–) | Copernicus Data Space Ecosystem (free registration; open data) | Free, no card | **Primary current-state field-level greenness**: resolves individual smallholder plots (MODIS 250 m cannot); season-timing validation | Cloud cover in monsoon season — pair with Sentinel-1; per-product API details verify at acquire time (UNVERIFIED this session) |
| **ESA Sentinel-1 (C-SAR)** | ESA (Space Agency Partner) via Copernicus Data Space Ecosystem | C-band backscatter (GRD) | ~10 m | ~6–12-day revisit, 2014– | Copernicus Data Space Ecosystem (free registration) | Free, no card | **Observed flood-exposure signal**: SAR sees inundated Aman-season fields through monsoon clouds — turns the flood penalty (P in §11) from an assumed rule into a data-driven, testable component | Requires SAR processing (threshold-based open-water mapping in `src/compute`); methodology must be cited |
| **MOD16A2 ET/PET** | LP DAAC (MODIS) | Actual ET, PET | 500 m, 8-day, global | 2000–present | AppEEARS/GES DISC | Free | Water-balance component (demand side) | replaces OpenET (see conflict #2) |
| **NEX-GDDP-CMIP6 (future scope)** | NASA NEX / AWS Open Data | Downscaled CMIP6 precipitation/temperature | ~25 km | Daily, scenario projections | AWS Open Data (s3, no auth) | Free | Scenario engine's "NASA climate futures" upgrade | Heavy data; HYPOTHETICAL labeling mandatory; **not in MVP** |

**Partner-data story (stated on the project page):** NASA supplies the climate backbone (POWER, GPM), soil moisture (SMAP), vegetation archive (MODIS/VIIRS) and ET (MOD16); **Space Agency Partner data supplies the two things NASA data alone does poorly for Bangladesh — field-level optical greenness and flood observation under monsoon cloud (ESA Sentinel-1/-2) — plus independent cross-checks (JAXA GSMaP, AMSR2).** Soil properties remain the explicitly-labeled non-space open-data layer (§10). This mapping is deliberate: each partner dataset fixes a named weakness of the NASA-only stack, so partner usage reads as judgment, not decoration.

**How NASA data actually changes the decision (master prompt §7 requirement):**

- Rainfall-onset shift (POWER + GPM IMERG + JAXA GSMaP agreement, two-era Mann-Whitney) → shifts every crop's feasible planting window in the rotation engine; a +11-day late onset can flip a maize→mungbean sequencing recommendation. Multi-source agreement is shown in the why-panel ("three independent satellites agree the onset moved").
- Heat-day trend (POWER T2M_MAX) → penalizes heat-sensitive crops in the affected season (wheat terminal-heat in Boro is the classic BD case).
- SMAP root-zone moisture + AMSR2 (JAXA) cross-check + POWER/IMERG/GSMaP rainfall → water-adequacy score per crop-season; drives the water-conservation priority weight.
- MOD16 ET + FAO-56 Kc → crop water demand vs observed supply; irrigation-dependency risk flag.
- NDVI trend (MODIS/VIIRS archive) → long-run degradation signal raises soil-health priority; **Sentinel-2 (ESA) 10 m NDVI** → field-level greenness validation of the advisory against what farmers actually planted (Build Guide's exact framing, now at smallholder-plot resolution).
- **Sentinel-1 (ESA) SAR open-water mapping** → observed flood-exposure days per season for the demo farms; drives the flood penalty (P) and the flood-tolerance component of S6 with data instead of assumption.
- SoilGrids pH/texture → hard compatibility gates and amendments note (e.g., acid-soil warning against chickpea). *(Open non-space layer — see §10.)*

**Explicit non-use:** no dataset is included merely to claim NASA usage. Every variable above maps to a named scoring component in §11.

## 10. Soil-data strategy

| Source | What it provides | Status |
|---|---|---|
| **SoilGrids 2.0 (ISRIC)** *(Open non-space layer — not a NASA/partner dataset; relabeled per v1.1 governance rule)* | pH (H₂O), SOC, nitrogen, CEC, sand/silt/clay, bulk density, water content at 6 standard depths, 250 m, static 2020 release, CC-BY-4.0, REST `rest.isric.org/soilgrids/v2.0/...` | VERIFIED — endpoint live-tested this session with Dhaka coordinates; free, no auth; fair-use throttling |
| **SRDI / BARC (Bangladesh)** *(Open non-space layer)* | National soil maps, upazila-level fertility, AEZ zones, fertilizer recommendations, national crop calendar | PARTIALLY VERIFIED — web presence exists via BARC portals; machine-readable bulk download UNVERIFIED. MVP: hand-curated reference values per demo district, cited; not an API integration |
| **User-entered corrections** | Farmer/advisor overrides: texture class, drainage/flooding, known pH, salinity | Product feature (F3), labeled `user-provided`, highest priority in the merge order |
| **FAO GAEZ v4** *(Open non-space layer — agronomic priors only)* | Crop suitability indices, agro-climatic indicators (global, incl. BD), CC-BY-4.0 | VERIFIED — used as corroboration for crop-suitability priors, not a runtime dependency |

**Why soil stays non-partner (v1.1, explicit):** none of the 17 Space Agency Partners publishes soil-property data for Bangladesh, and soil compatibility is a hard constraint the engine cannot drop. We therefore keep SoilGrids/SRDI as a clearly-labeled **open non-space** layer, show its tier badge in the UI, and let NASA/partner EO data (Sentinel-1 flooding, SMAP/AMSR2 moisture, NDVI) do the satellite work around it. This is presented openly on the project page rather than hidden.

**Merge order (and it is displayed):** `user-provided` > `SoilGrids (modeled)` > `district reference (curated from SRDI/BARC docs)` > `crop-database defaults`. The UI must always say which layer is in force — this is the master prompt's uncertainty-communication requirement, and it is cheap to build.

**Scientific honesty:** SoilGrids is a global soil-model product; pH/SOC can be locally wrong. We never present SoilGrids as "your soil"; we present it as "modeled regional soil context — correct it if you know better," and the why-panel shows which soil layer drove each score.

## 11. Decision-engine architecture

**Form: transparent rule-based constraint filtering + multi-criteria weighted scoring (MCDA). No ML.** Justification (ADR-005): no validated labeled dataset of BD rotation outcomes exists at hackathon scale; the score sheet's Validity 20 explicitly rewards "validated data and methods … clear performance metrics," which a transparent rules engine can defend and an unjustified XGBoost cannot; the Build Guide's three-sentence rule puts statistics in our code, and ML on top of invented labels would be the opposite of that.

```text
Hard constraints (filter — a rotation is valid or not)
  C1 season feasibility: crop season window fits between previous harvest and next planting (uses onset-shifted windows)
  C2 GDD feasibility: expected accumulated GDD ≥ crop requirement (base temp per crop, cited)
  C3 water source sanity: irrigation-dependent crop in a flagged rain-fed context → allowed but visibly penalized, never silent
  C4 break-crop rule: same botanical family in consecutive seasons → invalid (pest/disease carryover; cited agronomic rule)

Soft scoring (0–1 per component, weighted, −penalties)
  S1 water adequacy        — crop water demand (FAO-56 Kc × reference ET) vs observed rainfall/soil-moisture supply, per season
  S2 thermal fit           — GDD surplus margin + heat-day exposure penalty (crop-specific thresholds)
  S3 soil compatibility    — pH/texture/drainage tolerance distance (EcoCrop/FAO-56/literature tolerances)
  S4 soil-health balance   — N-demand vs N-fixation across the sequence + residue return + SOC trend context
  S5 break/diversity bonus — family diversity, deep/shallow root alternation, coverage continuity
  S6 resilience            — drought/flood/heat exposure of the sequence under its own season windows
  S7 priority alignment    — cosine-style match between component vector and farmer's priority weights
  P  risk penalties        — subtractions for late-monsoon flood exposure (Aman), terminal heat (Boro wheat), dry-spell risk; each penalty cites its rule source
```

```text
RotationScore = Σᵢ wᵢ·Sᵢ − Σⱼ Pⱼ        (all S ∈ [0,1]; w from user priorities, renormalized; P documented per rule)
Confidence = f(data-quality flags)     (missing SMAP era, user-overridden soil, SoilGrids-only pH, short NDVI record → lower)
```

Every Sᵢ and Pⱼ has a named definition, input list, normalization, weight, interpretation, uncertainty note, and dataset source in `docs/science/scoring.md` (master prompt §11 requirement). The engine is implemented twice-by-design: TypeScript at runtime (§16 rationale) with **golden-fixture cross-validation against a Python reference implementation** in `src/compute/validate/` — same inputs must produce identical scores, asserted in tests. That keeps the "deterministic science lives in tested Python" story true end-to-end.

**Example output shape (the master prompt's required explainability pattern):**

> **Recommended rotation: Aman rice → lentil → mungbean**
> Because: usable-rainfall onset has moved ~11 days later since 2001–2012 (Mann-Whitney p=0.008, POWER), shortening the post-monsoon window — a short-duration lentil fits it; the legume improves the nitrogen balance (S4 = 0.81); root-zone moisture (SMAP L4) supports the rabi sequence without irrigation in 7 of 10 recent years (S1 = 0.74); it matches your priority on water conservation (w_water = 0.35).
> Risks: terminal-heat exposure for late-planted lentil (P_heat), modeled soil pH 5.8 near chickpea tolerance — corrected value recommended.

## 12. Scoring model (normative detail)

| Component | Inputs (all traced) | Transformation | Source of thresholds |
|---|---|---|---|
| S1 water adequacy | POWER/CHIRPS rainfall, SMAP L4, MOD16 PET, crop Kc (FAO-56) | seasonal supply/demand ratio → logistic squashing to [0,1] | FAO-56; BD critical-period values ESTIMATE until domain review |
| S2 thermal fit | POWER T2M, GDD bases (literature), heat-day counts | GDD margin + heat-days penalty curve | cited per-crop papers (VERIFIED availability) |
| S3 soil compatibility | SoilGrids + user overrides; crop tolerance ranges (EcoCrop) | tolerance-distance per variable, worst-of composition | EcoCrop/FAO; BD-specific calibrations flagged ESTIMATE |
| S4 soil health | crop N balance table, residue coefficients, SOC trend | sequence-level budget | FAO/literature; labeled simplified demonstration rules where approximate |
| S5 diversity | family/root-depth/growth-habit matrix | rule bonus | standard agronomy rules, cited |
| S6 resilience | era-shifted onset distributions, flood-prone flags (BD context) — upgraded with the SHOULD-tier flood layer (JRC GSW prior / Sentinel-1 observed days) where available | exceedance-probability penalties | computed from our own data + BD AEZ context |
| S7 priority match | user sliders → weights | dot-product alignment, renormalized | — (user preference, not science) |
| Penalties | flood/heat/dry-spell rules — flood penalty upgraded to observed where the SHOULD-tier flood layer (JRC GSW / Sentinel-1) is available, rule-based fallback otherwise | additive −, each with citation | Build Guide onset definition pattern: state every definition openly |

Sensitivity outputs are built into the engine (Build Guide's requirement): shifting the onset threshold ±5 mm or any weight ±0.1 must recompute and expose the rank-stability — the UI shows "this ranking is stable to ±5 mm threshold" or the reverse. That single feature is a large chunk of the Validity argument.

## 13. Explainability architecture

Three layers, all deterministic:

1. **Why-panel** (per recommendation): component bars + the top 3 contributing facts in plain language, generated by **templates from tool results only** (no LLM in the demo path — ADR-006). Each fact carries its dataset id badge.
2. **Provenance drawer** (per number): raw value → variable → dataset → provider → version/date → retrieval URL. The Build Guide's `cite_check` gate is implemented as an engine-level invariant: **a recommendation JSON cannot serialize without complete provenance blocks** (enforced by schema validation in tests).
3. **Method page**: every definition and formula, in Bangla and English. "Onset has a dozen definitions; naming yours is the difference between 10 and 20 on validity" (Build Guide) — ours is stated, configurable, and sensitivity-tested on screen.

## 14. Scenario engine

Scenarios are **perturbations of observed climatology re-run through the identical engine** — never presented as forecasts:

| Scenario | Mechanism | Label |
|---|---|---|
| Drier season (−10/−20% rainfall) | scale daily series → recompute onset, supply ratios | HYPOTHETICAL |
| Hotter season (+1/+2 °C) | shift T series → recompute GDD, heat days | HYPOTHETICAL |
| Later onset (+7/+15 days) | shift era distribution → recompute windows | HYPOTHETICAL |
| Soil change (pH/texture override) | soil-layer merge order change | user-input |
| Future-climate view | NEX-GDDP-CMIP6 scenario deltas (FUTURE SCOPE, NASA dataset) | MODELED PROJECTION |

The UI renders scenario outputs side-by-side with the observed baseline and carries a persistent explanation line: "This is your observed data perturbed by a stated amount; it is not a climate forecast." (master prompt §12's anti-overclaim requirement, made literal.)

## 15. Geospatial architecture

| Concern | Choice | Detail |
|---|---|---|
| Map library | **MapLibre GL JS** (BSD-3-Clause, VERIFIED) | vector-first, mobile-friendly, PMTiles-native |
| Basemap | **OpenFreeMap** (Positron/Liberty) | free, no key, no card (VERIFIED); fallback: CARTO basemaps (free non-commercial, VERIFIED) |
| NASA overlay | **GIBS WMTS** — MODIS Terra CorrectedReflectance TrueColor + land-products layers for demo dates | no auth (Build Guide table); explicit date parameter; pre-tiled to **PMTiles** for offline demo regions (Build Guide tile recipe); GIBS SMAP/land-layer availability per layer checked at build time (UNVERIFIED per-layer — verify before relying) |
| Boundaries | **geoBoundaries** district/upazila polygons (open) + BD hydrography context | simplification pass via tippecanoe → PMTiles |
| Geocoding | **Photon** (Komoot) primary, Nominatim fallback | free, no key, 1 req/s policy respected (VERIFIED); used only for custom-pin search, never on demo path |
| Farm input | demo farms (curated, named) + district click + map pin | polygon drawing CUT (master prompt allows district/pin; drawing is weekend risk) |
| Offline tiles | region-limited PMTiles built pre-event | z0–9 country context + z10–12 demo districts |

The map is a **spine, not the product**: the advisory sentence, the what-shifted panel, and the why-panel rank above it on mobile (Build Guide: "drop the map, keep the advisory" is the first cut — so the map must be droppable by design, i.e., purely presentational over pack data).

## 16. Frontend architecture

| Aspect | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** (static export capable) | PDF stack recommendation (React/Next.js PWA); TS preference of the master prompt; static export → host anywhere free |
| Styling | Tailwind CSS + design tokens (Phase 2 defines the system; brand palette per official guidelines — blue-led, neon-yellow accent, libre fonts) | speed; tokens make the Phase 2 spec enforceable |
| Charts | **Recharts** (MIT, VERIFIED) for distributions/trends; sparkline variants for cards | familiar, composable; Plotly rejected (bundle weight) |
| State | URL state + React context; **no global store** | 48-hour scale |
| Decision engine | **`web/lib/engine/` — pure TS functions, no I/O**, running client-side (Web Worker if profiling demands) | instant priority-slider response; works offline; mirrors Python reference (§11) |
| Data loading | per-district pack fetch (`/data/packs/{id}.json`) with `fetch` cache; live enrich behind a `tryLive()` helper | packs are small (<200 KB target each) |
| i18n | Bangla-first copy, English toggle; ICU-lite dictionary; Bangla webfont subset | killer demo is "in Bangla, on a phone" (Build Guide) |
| PWA | service worker + precache manifest (SHOULD) | PDF's offline-field-use recommendation; not on demo critical path |

## 17. Backend architecture

**There is no runtime backend in the demo path** (ADR-001). What exists:

- `src/acquire/` — Python batch acquisition, one module per source (POWER, GES DISC/IMERG, AppEEARS [NDVI, SMAP L4, MOD16], **Copernicus Data Space [Sentinel-2 NDVI, Sentinel-1 GRD]**, **G-Portal [AMSR2, GSMaP]**, SoilGrids, geoBoundaries), each writing `cache/` then derived packs.
- `src/compute/` — deterministic science (onset, GDD, trends/Mann-Kendall/Theil-Sen, two-era tests, water balance, engine reference implementation), pytest-covered, **no LLM imports possible** (folder boundary).
- `src/validate/` — golden-fixture cross-check between Python reference and TS engine outputs.
- Optional Next.js route handlers (`web/app/api/`) — thin, cache-serving, CORS-safe wrappers for live SoilGrids/POWER/geocode enrichment; each falls back to packs; each is a SHOULD, not a MUST.
- Optional agent layer (Build Guide's orchestrator pattern) — CUT from MVP; `src/agents/` scaffolding kept for the post-MVP narration agent, which would then be named in `docs/AI_USE.md`.

The master prompt's example categories (`GET /api/environment` etc.) are satisfied by the route-handler layer spec in §18 — with the explicit note that in the offline demo they serve from committed JSON.

## 18. API specification

All endpoints are JSON, versioned under `/api/v1`, cache-friendly, and never required for the golden-path demo (packs are loaded statically).

| Method & path | Purpose | Request | Response | Validation | Caching | Failure behavior |
|---|---|---|---|---|---|---|
| `GET /api/v1/health` | liveness + source state | — | `{status, sources:{soilgrids:"live/cache", power:"cache"}}` | — | no-cache | always 200 |
| `GET /api/v1/districts` | district list + bounds for map/search | — | GeoJSON FeatureCollection (simplified) | — | immutable, long cache | 500 (static file) |
| `GET /api/v1/packs/{districtId}` | full indicator pack (conditions + soil + crop calendar context) | — | pack JSON (schema-validated) | district id allow-list | immutable | 404 + client falls back to nearest pack |
| `GET /api/v1/soil?lat=&lon=` | live SoilGrids point query | lat/lon in BD bbox | normalized soil profile + provenance | bbox + rate guard | content-hash, 30 d | fallback to nearest district pack, source badge `cache` |
| `GET /api/v1/climate/point?lat=&lon=&start=&end=` | live POWER point fetch (custom pin) | lat/lon, ≤ 30 y window | daily series subset | bbox, window caps | content-hash to `cache/` | fallback: era climatology from packs, badge `fixture` |
| `GET /api/v1/geocode?q=` | Photon proxy | query string | GeoJSON results | length cap, UA set | 1 h | client-side fallback to district list |
| `POST /api/v1/rotation/analyze` | engine cross-validation endpoint (not needed by the UI) | `{farmId\|lat,lon, cropPool[], priorities{}, scenario{}}` | ranked rotations, full component breakdown, provenance | JSON Schema | none | 422 with schema errors |
| `GET /api/v1/provenance/{packId}` | provenance manifest for a pack | — | dataset list (ids, URLs, versions, retrieval dates) | — | immutable | 404 |

Rate limiting: per-IP token bucket on live-enrich routes; request-size caps; input coordinate bounding-box validation (BD bbox ≈ 88–93 E, 20–27 N) — malformed coordinates rejected before any upstream call (security §22).

## 19. Database design

**No server database (ADR-007).** The "database" is the **Field Shift Data Pack**: a versioned, schema-validated bundle of static files (JSON for runtime, Parquet/SQLite for build-time analytics). Rationale: read-heavy, immutable, offline-first; the Build Guide explicitly warns against installing PostGIS at 2 am. If a server DB ever becomes necessary (post-MVP user-generated farms), SQLite/Cloudflare D1 is the path.

**Entities (ERD):**

```text
DISTRICT (pk district_id, name_en, name_bn, bbox, aez_zone)
FARM_DEMO (pk farm_id, fk district_id, lat, lon, name_en, name_bn, notes)            # curated demo farms
INDICATOR_PACK (pk pack_id = district_id + pack_version, fk district_id,
                onset_stats, rainfall_trend, temperature_trend, heat_days,
                smap_state, ndvi_trend, et_balance, generated_at, engine_version)
SOIL_PROFILE (pk soil_id, fk pack_id, lat, lon, ph_h2o, soc, cec, sand, silt, clay, bdod,
              depth_ranges[], source: soilgrids|user|district_ref, provenance_id)
CROP (pk crop_id, name_en, name_bn, family, seasons[], traits_ref)
CROP_TRAIT (pk crop_id + trait_version, season_window, gdd_base, gdd_req, kc_curve[],
            water_demand, root_depth, ph_range, texture_prefs, heat_tol, flood_tol,
            n_demand, n_fixing, residue_index, sources[])                             # every value cites a source
PRIORITY_PROFILE (pk priority_id, weights{water, soil_health, stability, risk, ...}, version)
ROTATION_CANDIDATE (derived, not stored at rest: seasons[], crop_ids[])
ROTATION_SCORE (derived: components{s1..s7}, penalties{}, total, confidence, provenance_refs[])
SCENARIO (pk scenario_id, type, params, baseline_pack_ref)                           # HYPOTHETICAL-labeled
PROVENANCE_RECORD (pk prov_id, dataset_id, provider, version, retrieval_url,
                   retrieval_date, license, notes)
DATA_SOURCE (pk dataset_id, title, provider, url, license, citation_text)
```

**Relationships:** DISTRICT 1—n FARM_DEMO · DISTRICT 1—1 INDICATOR_PACK (per version) · PACK 1—1 SOIL_PROFILE · CROP 1—1 CROP_TRAIT (versioned) · ROTATION_SCORE n—n PROVENANCE_RECORD (every component references inputs).

**Indexes/constraints (SQLite build-time snapshot):** unique (district_id, pack_version); CHECK on coordinate bbox; CHECK ph ∈ [3,10]; crop trait version immutability; pack JSON Schema validation is the runtime gate.

## 20. Caching strategy

Four tiers, matching the Build Guide's `safe.py` flow:

1. **Committed fixtures** (`demo_fixtures/`) — the exact bytes the demo needs; immutable; the offline golden path.
2. **Runtime HTTP cache** — packs served with immutable headers; SW precache when PWA is on.
3. **Live-enrich disk cache** (`cache/`, gitignored) — content-hash keyed; 30-day TTL for soil, season TTL for climate point fetches.
4. **Upstream respect** — POWER throttling and SoilGrids fair-use are treated as design constraints: batch pre-fetch, never per-page-load bursts; geocode ≤ 1 req/s (policies VERIFIED).

"A chart must never wait on a query" (Build Guide) → every chart renders from pack JSON.

## 21. Data-provenance system

Provenance is a **serialization gate**, not documentation. Each pack embeds a `provenance` manifest; each scored result embeds `provenance_refs` for every component input. The engine refuses to emit a recommendation whose components lack provenance (enforced by schema test — the programmatic form of the Build Guide's `cite_check` tool). The UI exposes it as a one-tap drawer opened during demos ("open the drawer during the demo — it takes ten seconds and it is worth points on validity" — Build Guide). The project page's "NASA data sources used" and "References" fields are generated **from the same manifest** — one source of truth, no drift.

## 22. Security model

Proportionate to a public, stateless, read-only advisory app:

- Input validation: coordinates bbox-checked; all API params schema-validated; JSON body size caps; `POST /analyze` allows-listed enums.
- No secrets in the client; no API keys required by any MVP dependency (SoilGrids, GIBS, OpenFreeMap, Photon are keyless). If POWER key adoption becomes necessary, it lives in route handlers' env vars only, `.env` gitignored, `.env.example` committed (Build Guide key list).
- CORS: explicit allow-list; live-enrich routes rate-limited (per-IP bucket); upstream fair-use protected (we throttle, not spam).
- XSS: React escaping; no `dangerouslySetInnerHTML` for user content; Bangla strings in dictionary files, reviewed.
- GeoJSON inputs: none accepted in MVP (pin/district only) — the upload-attack surface is deleted by scope.
- Dependencies: lockfile + `npm audit`/`pip-audit` in CI; no postinstall scripts.
- Privacy: no accounts, no analytics by default, no location persistence beyond the session (rural-user dignity + zero compliance burden).

## 23. Performance model

| Stage | Budget | Mechanism |
|---|---|---|
| First meaningful paint (demo district) | < 2 s on mid-range Android over 3G | static export; route-level code splitting; Bangla font subset; map deferred until interaction |
| Priority-slider re-rank | < 100 ms | client-side pure engine (no network) |
| District switch | < 1 s | pack prefetch of neighboring districts |
| Live enrich (optional path) | ≤ 1.5 s or graceful degrade | parallel fetch with 1.2 s timeout → fixture fallback + badge |
| Build-time science | hours, offline | pre-event batch; not user-facing |

Demo-path network requests after first load: **zero** (the number that matters at 18:30 on Day 1).

## 24. Demo mode

- `OFFLINE=1` (env or in-app toggle in a debug drawer) forces fixture reads everywhere; identical UX otherwise.
- `demo_fixtures/` carries: 6 demo-farm packs + district packs for ≥ 6 districts + simplified boundary PMTiles + GIBS demo-date tiles + chart series. Committed (Build Guide rule).
- Source badges (`live / cache / fixture`) visible on every data block — honesty as a feature.
- Rehearsed failover: the 240-second local-judging video is recorded with wifi off (Build Guide), and the 30-second global video is recorded against the offline build so the two never diverge.
- Determinism: same pack + same priorities + same scenario ⇒ byte-identical recommendations (golden tests). Demo-day surprises are eliminated, not handled.

## 25. Deployment architecture

Primary: **Vercel Hobby** (free, **no card**, 100 GB transfer / 1 M function invocations, non-commercial — VERIFIED; over-limit pauses rather than bills). Static export of the Next.js app + optional route handlers as Vercel functions.
Fallback A: **Cloudflare Pages** (free, no card, static requests unlimited — VERIFIED), static export only.
Fallback B: **GitHub Pages** (free, static-only, VERIFIED) — pure static export with packs in-repo.
Rule: the golden-path demo needs only the static export, so all three are interchangeable; hosting is a 10-minute end-of-build decision, not an architecture decision. Repo on GitHub, public, Apache-2.0, before the hackathon (binary check points).

## 26. Free-tool matrix

| Service | Purpose | Free? | Card? | Limits | Backup |
|---|---|---|---|---|---|
| NASA POWER | climate backbone | yes | no | throttled; 20 params/req | ERA5-Land (non-partner emergency fallback, relabeled v1.1) |
| GPM IMERG (GES DISC) | gridded rainfall | yes | no | Earthdata a/c; concurrency | JAXA GSMaP (partner) |
| JAXA GSMaP (G-Portal) | rainfall cross-check (partner) | yes | no | G-Portal registration; fair use | — |
| AppEEARS (MODIS VI, SMAP L4, MOD16) | NDVI archive/soil-moisture/ET | yes | no | queued area jobs | GES DISC direct |
| Copernicus Data Space (ESA) | Sentinel-2 NDVI, Sentinel-1 flood (partner) | yes | no | free registration; quota fair use | MODIS/VIIRS (archive) + rule-based flood flags |
| JAXA AMSR2 (G-Portal) | soil-moisture cross-check + pre-2015 context (partner) | yes | no | G-Portal registration | SMAP-only (drop cross-check) |
| SoilGrids 2.0 | soil properties *(open non-space)* | yes | no | fair-use; bulk via WCS | district ref values (curated) |
| OpenFreeMap | basemap *(infrastructure)* | yes | no | donation-funded, generous | CARTO basemaps |
| GIBS | NASA satellite overlay | yes | no | fair use; explicit dates | pre-tiled PMTiles only |
| Photon / Nominatim | geocoding *(infrastructure)* | yes | no | 1 req/s | district list search |
| geoBoundaries | admin polygons *(infrastructure)* | yes | no | — | HDX/admin datasets |
| Next.js/React/TS/Tailwind/Recharts/MapLibre | app stack | yes (OSS) | no | — | — |
| Vercel Hobby | hosting | yes | **no** | 100 GB, non-commercial | Cloudflare Pages / GitHub Pages |
| SQLite (build-time) | analytics snapshot | yes (public domain) | no | — | Parquet + DuckDB |
| Supabase/Neon/D1 | server DB | — | — | **not used** (Supabase free pauses after 1 wk inactivity — VERIFIED; judge revisiting a paused app is a demo death) | — |
| OpenET | ET | **dropped** | — | US-only coverage (VERIFIED) | MOD16A2 + ERA5-Land (non-partner, relabeled) |
| Mapbox | — | — | **card required** (VERIFIED) | excluded | MapLibre + OpenFreeMap |

## 27. Project folder structure

(Adapts the Build Guide skeleton; `web/` is the Next.js app.)

```text
field-shift/
├── LICENSE                      # Apache-2.0
├── README.md                    # what/how/run + full dataset list with URLs
├── CLAUDE.md / AGENTS.md        # agent rules (compute boundary, provenance gate)
├── .env.example                 # EARTHDATA creds note, POWER key (optional) — no secrets
├── .gitignore                   # existing, incl. the never-ignore disclosure guard
├── docs/
│   ├── AI_USE.md                # every AI tool + prompts (kept current, committed, public)
│   ├── FIELD_SHIFT_SYSTEM_ARCHITECTURE.md   # this document
│   ├── science/                 # scoring.md, onset.md, definitions, sensitivity results
│   ├── data/                    # dataset register + retrieval log
│   └── competition/             # project-page drafts, video scripts (en/bn)
├── cache/                       # gitignored raw downloads
├── demo_fixtures/               # committed demo bytes (packs, tiles, series)
├── src/
│   ├── acquire/                 # power.py, imerg.py, appeears.py, sentinel.py, gportal.py, soilgrids.py, boundaries.py, safe.py
│   ├── compute/                 # onset.py, gdd.py, trends.py, water.py, engine_ref.py, sensitivity.py
│   ├── validate/                # golden fixtures: python ↔ typescript parity tests
│   └── api/                     # (optional) FastAPI mirror of §18 for local dev
├── web/
│   ├── app/                     # routes: /, /farm, /conditions, /priorities, /rotations,
│   │                            # /compare, /why, /scenarios, /method, /data, /about
│   ├── components/              # map, charts, why-panel, provenance-drawer, badges
│   ├── lib/engine/              # pure TS decision engine + scenario engine
│   ├── lib/data/                # pack loaders, soil merge, i18n dictionaries (bn/en)
│   └── public/data/packs/       # build output of src/acquire+compute (committed)
├── scripts/                     # make_cache.sh, build_packs.py, build_tiles.sh, crosscheck.sh
├── tests/                       # pytest (compute) + vitest (engine) + golden fixtures
└── docs/prompts_used.md         # prompt log (referenced by AI_USE.md)
```

## 28. System diagrams

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ PRE-EVENT (Python, this machine)                                         │
│  NASA: POWER · IMERG · AppEEARS(NDVI/SMAP/MOD16) · GIBS                  │
│  Partners: ESA Copernicus(S2 NDVI · S1 SAR flood) · JAXA G-Portal        │
│            (AMSR2 · GSMaP)                                               │
│  Open non-space: SoilGrids · SRDI/BARC curated · geoBoundaries           │
│      → cache/ (raw, gitignored)                                          │
│      → src/compute (onset · GDD · trends · water balance · flood         │
│         mapping · engine ref)                                            │
│      → demo_fixtures/ + web/public/data/packs/ (committed, versioned)    │
└──────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ RUNTIME (Next.js static export on free host)                             │
│  MapLibre(+OpenFreeMap/GIBS-PMTiles)  ·  Recharts  ·  i18n bn/en         │
│  lib/engine: constraints → MCDA scoring → why/ provenance → advisory     │
│  optional /api route handlers: soilgrids · power · geocode               │
│    (live → cache → fixture; badges shown; never on golden path)          │
└──────────────────────────────────────────────────────────────────────────┘
```

## 29. Data-flow diagram

```text
raw daily series (25 y) ──onset detect──► onset distributions (2 eras) ──Mann-Whitney──► window shift
        │  (POWER + IMERG + GSMaP cross-checked)                                          │
        ├─ GDD accumulation ──► season feasibility                                        │
        ├─ heat days ──► thermal penalties                                                │
        ├─ rainfall/SMAP/AMSR2/MOD16 ──► supply-demand ratio ──► S1                       │
        ├─ Sentinel-1 SAR ──► open-water/flood days ──► flood penalty + S6                │
        └─ NDVI (MODIS/VIIRS archive + Sentinel-2 10 m) ──► greenness trend ──► context   │
                                                                                          ▼
SoilGrids+user overrides ──merge──► soil profile ────────────────► S2/S3/S4 inputs ─┐
Crop trait DB (cited) ────────────────────────────────────────────► constraints/S* ─┤
User priorities (sliders) ────────────────────────────────────────► weights ────────┼──► ranked rotations
Scenario params ──perturb──► same pipeline re-run ────────────────► deltas ─────────┘        │
                                                                                             ▼
                                                                       why-panel · provenance · advisory (bn/en)
```

## 30. ERD

See §19 (entities, keys, versioning, constraints rendered as the pack schema).

## 31. API-flow diagram

```text
UI ──static import──► packs (golden path, offline)
UI ──optional──► /api/v1/soil ──live SoilGrids──► 200 + badge "live"
                    │ timeout/429/5xx
                    └──► nearest district pack ──► badge "cache"
UI ──optional──► /api/v1/climate/point ──live POWER──► cache write ──► badge "live"
                    └──► era climatology from packs ──► badge "fixture"
CI ──POST /api/v1/rotation/analyze──► engine (server context) ──► parity assert vs web/lib/engine
```

## 32. User-flow diagram

```text
Landing ──pick demo farm / search district / drop pin──► Farm
   │                                                     │
   ▼                                                     ▼
Conditions digest (what shifted, tests, badges) ──"continue"──► Priorities (sliders)
                                                                     │
                                                                     ▼
                                              Rotations (ranked cards, top-N)
                                                │            │            │
                                                ▼            ▼            ▼
                                          Why-panel    Compare view   What-if
                                                │            │            │
                                                └────────────┴────────────┘
                                                             ▼
                                            Advisory sentence + SMS (bn/en) + Method/Data links
```

## 33. MVP scope (MUST — demo-complete set)

1. Six curated demo-farm packs (killer demo) — Rajshahi, Barishal, Dhaka, Rangpur, Sylhet, Khulna — **plus NASA-core data packs for all 64 Bangladesh districts** (POWER + AppEEARS point sampling + SoilGrids per district centroid), so any district a judge taps works; SHOULD-tier partner layers stay on the 6 demo farms.
2. Conditions digest with onset two-era test + GDD + heat trend + soil profile + badges.
3. Crop pool of ≥ 8 BD crops with fully cited traits.
4. Engine (constraints + 7 components + penalties), priority sliders, top-N ranking, why-panel, provenance drawer.
5. What-if: rainfall −%, temperature +°C, onset shift, soil override.
6. Advisory sentence + SMS text, bn/en. Method + Data pages. Bangla/English toggle. Mobile-first.
7. Offline build + recorded 240 s fallback video.
**Deliberately absent (CUT list §6):** everything else. "A project that does one thing convincingly outscores one that half-does five" (Build Guide).

## 34. Future scope

- NEX-GDDP-CMIP6 future-climate scenarios (NASA) as a fourth scenario type.
- BD-wide pack coverage (all 64 districts) and upazila resolution.
- Optional narration agent (Build Guide agent pattern) with named model + prompts in AI_USE.md.
- SMS/IVR delivery integration concept; advisor annotation layer; Bangla audio walkthrough.
- Monsoon-flood overlay (BD Water Development Board records — partner-data bonus the Build Guide explicitly recommends).

## 35. Risks

| # | Risk | Likelihood | Impact | Early warning |
|---|---|---|---|---|
| R1 | 28 Oct full statement changes the ask (named datasets, required features) | medium | high | statement diff review session, 28 Oct |
| R2 | Agronomic thresholds judged as invented | medium | high | every value cited; ESTIMATE flags; domain reviewer pre-event |
| R3 | Data acquisition blocked late (AppEEARS queues, GES DISC auth) | medium | high | acquire + cache complete by 12 Nov dry-run gate |
| R4 | Engine/TS↔Python divergence | medium | medium | golden parity tests in CI |
| R5 | Onset-definition dispute | low | medium | stated definition + ±5 mm sensitivity on screen |
| R6 | Bangla copy quality | medium | medium | native-speaker review pass; bilingual screenshots test |
| R7 | Free-tier drift (host/tiles change terms) | low | low | three interchangeable static hosts; tile fallbacks |
| R8 | Team velocity / 48-h scope creep | high | high | MUST/SHOULD/CUT list enforced; cut order pre-agreed |
| R9 | Pre-event-work rule ambiguity (FAQ conflict) | medium | medium | written clarification from Local Lead (open question §40) |
| R10 | AI-disclosure wording mismatch with 13 Nov guides | low | medium | AI_USE.md kept current; wording re-aligned on 13 Nov |
| R11 | Partner-data access friction (Copernicus Data Space + G-Portal registrations; Sentinel processing quota) or SAR flood-mapping methodology judged as unvalidated | medium | medium | accounts created during 2–27 Oct prep window; flood mapping uses a simple, cited threshold method with the rule-based fallback retained (graceful degradation to v1.0 behavior) |

## 36. Mitigations (summary)

Statement-diff ritual on 28 Oct (R1) · citation-first crop DB with reviewer sign-off (R2) · two independent acquisition paths per critical source + fixtures (R3) · parity tests + single formula source of truth in `docs/science/scoring.md` (R4) · the sensitivity feature itself (R5) · bn copy review + UI font checks (R6) · static-first hosting triangle (R7) · freeze ritual Day-2 noon + cut order (R8) · ask-in-writing posture (R9) · disclosure doc as living file (R10) · partner registrations done in the Oct prep window + cited threshold flood method with rule-based fallback (R11).

## 37. Competition / judging alignment

| Feature | Criterion | How it earns | Evidence anchor |
|---|---|---|---|
| NASA POWER/SMAP/MODIS-NDVI/MOD16 + **partner ESA Sentinel-1/-2, JAXA GSMaP/AMSR2** named on camera; every variable drives a score; NASA-first governance rule — core science 100% NASA, partner data layered on top (v1.1 corrected) | Relevance 20 | NASA-data-first, not NASA-data-added; Space Agency Partner usage read off the official 2026 partners list | score sheet wording + partners page |
| Advisory sentence + window shift in days, bn/en | Impact 20 | a decision a real farmer could act on; BD framing with real numbers | Build Guide "where the points are" |
| What-shifted evidence (two-era tests, distributions) | Creativity 20 | "one surprising visual" — the two distributions that prove the shift | Build Guide killer demo |
| Tested `src/compute` + parity tests + stated definitions + sensitivity | Validity 20 | "our statistics live here, in tested functions" — pointable boundary | Build Guide 3-sentence rule |
| NASA POWER/SMAP/MODIS-NDVI/MOD16 named on camera; every variable drives a score | Relevance 20 | NASA-data-first, not NASA-data-added | score sheet wording |
| 240 s arc: farm → shift → priorities → rotation → why → what-if → sentence | Presentation 20 | clear beginning/middle/end, global-audience English + Bangla | score sheet |
| Roles + commit hygiene, mixed-skill team | Teamwork 5 | visible roles and commits | score sheet |
| Mobile Bangla-first, badges, drawer, keyboard/contrast | UX 5 | usable without training | score sheet |
| NASA + Space Agency Partner (ESA, JAXA) EO data + open non-space layers (SoilGrids/ISRIC, SRDI/BARC, FAO — labeled as such) | NASA data usage 5 | NASA open data **plus official Space Apps partners plus other agencies, each tier-badged and clearly shown** | score sheet + Build Guide ("partner and third-party sources on top of NASA data is what a 5 looks like") + v1.1 governance rule |
| Challenge named, public repo, complete project page | 3 binary points | 15 minutes of work, most-often-lost points | Build Guide |
| ≥ 1 woman member | +5% aggregate | team composition | BD guide |
| Award-category targeting: **Best Use of Data / Local Impact / Galactic Impact** | nomination | agriculture won Best Use of Data + Galactic Impact 2024 | strategy doc (cited) |

Winner-pattern fit (VERIFIED research): 2024's dedicated EO-agriculture challenge produced two global winners in year one (Waterwise-GaamaRamma; 2plant-NVS-knot) — the winning profile was exactly a named grower decision from EO data; BD strategy doc adds: 5 of 27 BD nominees in 2025 were agriculture, 0 finalists ⇒ **depth beyond a dashboard is the differentiator**, which this architecture treats as the design center (tests, provenance, sensitivity, scenario deltas — all depth artifacts).

## 38. Implementation roadmap

| Window | Work | Gate |
|---|---|---|
| Now → 1 Oct | This doc approved · repo scaffold (LICENSE/README/CLAUDE.md/.gitignore/docs) · Earthdata + keys collected · **240 s prescreen video (concept)** uploaded by 1 Oct 11:59 PM | prescreen submitted |
| 2–27 Oct (prep posture) | `src/acquire` modules + cache build for candidate districts · `src/compute` + tests · generic UI shell (no challenge-specific solution work, per FAQ-conflict posture §0.3; Local Lead asked in writing). **Acquisition precedence order (pre-agreed triage): POWER → AppEEARS (SMAP L4 + MODIS/VIIRS NDVI + MOD16) → SoilGrids → Sentinel-2 NDVI → GSMaP → Sentinel-1 → AMSR2. If the window compresses, the tail is cut — never the NASA core.** | caches dry-run clean |
| 28 Oct | Full statement lands → diff review → re-validate data plan; if NASA names datasets we lack, **caching them is that day's only job** | data plan re-locked |
| 2–12 Nov | Build MVP in MUST order · Bangla copy · parity tests green · **full offline dry run by 12 Nov** | offline gate |
| 13 Nov | Submission/Judging guides publish → align wording + AI_USE.md · hackathon Day 1: finalize demo, record 240 s local video by 18:30 | local video |
| 14 Nov | Freeze at noon · project page fields · public repo check in private window · 30 s global video (subtitles) · submit before 15 Nov 11:59 PM local | submission complete |

## 39. Technology justification (against the master prompt's criteria)

- **TypeScript/Next.js** (prompt preference) is honored for the entire product surface; **Python is retained only where the science justifies it** (xarray/scipy ecosystem for acquisition + statistics; the Build Guide and PDF both prescribe it) — and the runtime decision engine lives in TS so the prompt's interactivity and cost constraints win where they bind.
- **MapLibre + OpenFreeMap + GIBS + PMTiles** vs paid providers: free, keyless, offline-tileable; Mapbox excluded on card requirement (VERIFIED).
- **Static pack architecture** vs FastAPI-on-PaaS: equal scientific credibility (the science is Python either way), strictly higher demo reliability, and deployable free on three interchangeable hosts; the FastAPI mirror is kept in-repo for local dev/judging scrutiny.
- **No ML**: no labels, no time; transparency scores; the PDF's XGBoost/LightGBM suggestion is explicitly declined for MVP (recorded in ADR-005) rather than silently ignored.
- **No runtime LLM**: kills hallucination risk in a scored system, simplifies AI disclosure to build-time tooling, strengthens offline guarantee (ADR-006).

## 40. Known assumptions and unknowns

**ASSUMPTION — NEEDS VERIFICATION**

1. 2026 AI-disclosure/dataset-citation wording (UNVERIFIED until 13 Nov guides; BD-guide rules assumed meanwhile).
2. POWER unauthenticated rate limit (throttled, exact cap unpublished).
3. GIBS per-layer availability for SMAP/land-product overlays (verify at tile-build time).
4. SRDI/BARC machine-readable soil data (curated hand-copies assumed for MVP).
5. BD-specific crop coefficient/GDD calibrations (literature values used; domain review to confirm).
6. Slot rule for BD cities with < 10 submissions (irrelevant to architecture, relevant to strategy).
7. Local Lead's written definition of permissible pre-event prep (FAQ conflict, §0.3).
8. Copernicus Data Space Ecosystem + G-Portal product/API details for Sentinel-2/1, AMSR2, GSMaP (partnership VERIFIED from the official 2026 partners page; per-product access mechanics to be verified during the Oct prep window).
9. Sentinel-1 open-water threshold method performance over BD mixed paddy landscapes (validate against known flooded demo-farm dates before committing the flood component).

**Unknowns:** full statement text (28 Oct); exact 2026 global award category names (partially verified); whether OpenET's challenge-name-drop implies NASA expects it (we substitute and document — if the statement mandates OpenET specifically, that becomes a 28-Oct re-plan item).

**Open human questions (gating nothing in Phase 1):** final district list for packs; whether the team includes ≥ 1 woman member (+5% is a team composition fact, not an architecture decision); the AI-tool inventory for `docs/AI_USE.md` (which assistants, used for what — still unanswered from the previous session).

---

# ARCHITECTURE READY FOR REVIEW

## Architecture Summary

Static-first decision-support app: pre-event Python acquires **NASA data (POWER, IMERG, SMAP L4, MODIS/VIIRS NDVI, MOD16 ET — OpenET dropped, US-only) plus official 2026 Space Agency Partner data (ESA Sentinel-2 NDVI, Sentinel-1 SAR flood mapping, JAXA GSMaP rainfall, AMSR2 soil moisture)** and runs tested deterministic science (onset shift, GDD, trends, water balance, flood exposure) into committed versioned data packs; a Next.js/TypeScript client-side engine (constraints + 7-component MCDA + penalties, mirrored against a Python reference via golden tests) turns farm + soil + priorities + scenarios into ranked, fully-provenanced crop-rotation recommendations with a Bangla/English advisory sentence. Soil data (SoilGrids/SRDI) is an explicitly-labeled open non-space layer. No runtime backend, no server DB, no runtime LLM, no paid/card services; deploys free on Vercel/Cloudflare/GitHub Pages interchangeably; demo runs 100% offline with source-tier badges (`NASA · Partner · Open non-space · User-provided`).

## Critical Decisions

1. Rotation engine is the core; planting-window science is a module inside it (resolves the PDF-vs-Build-Guide conflict).
2. OpenET substituted with MOD16A2/SSEBop/ERA5-Land — substitution documented openly on the project page.
3. **Data-governance rule (v1.1, corrected): NASA data is the compulsory foundation — the core science runs 100% on NASA data and must stand alone; Space Agency Partner data (ESA Sentinel-1/-2, JAXA GSMaP/AMSR2) is strictly supplementary, layered on top** to strengthen named NASA weaknesses (field-level greenness, monsoon-cloud flood observation, rainfall/soil-moisture cross-checks); soil stays a labeled open non-space layer.
4. Two-tier compute: Python (offline science, tested) + TypeScript (runtime engine, pure, parity-tested).
5. No server DB — versioned, schema-validated data packs; SQLite only as build-time snapshot.
6. Transparent MCDA, not ML (no labels, no defensibility; declined the PDF's XGBoost suggestion explicitly).
7. No runtime LLM — templates generate language from tool results; AI disclosure covers build-time tools only.
8. MapLibre + OpenFreeMap + GIBS/PMTiles; Mapbox excluded (card required).
9. Provenance as a serialization gate (results cannot emit without complete citations).

## Critical Risks

- 28 Oct statement may rename datasets or require features (re-plan ritual scheduled).
- Agronomic thresholds must be citation-backed or Validity collapses (domain review is on the critical path).
- Acquisition (AppEEARS/GES DISC) must complete by the 12 Nov offline gate.
- Pre-event-work ambiguity vs global FAQ (needs written Local Lead clarification).
- Bangla copy quality and TS↔Python parity are quality gates, not afterthoughts.

## Questions Requiring Human Decision

1. **Districts for the demo packs** — I propose Rajshahi, Barishal, Dhaka, Rangpur, Sylhet, Khulna; confirm or change.
2. **Crop pool for MVP** — I propose Aman/Aus/Boro rice, wheat, maize, mustard, lentil, mungbean, potato (8); adjust.
3. **Prescreen video ownership** — who scripts/records the 1 Oct concept video while architecture is underway?
4. **AI tool inventory** — which AI tools were actually used on this project so far, and for what (needed for `docs/AI_USE.md` before submission)?
5. **Local Lead clarification** — do you want me to draft the written question about permissible pre-event prep?

Phase 2 (UI/UX design system) begins only after you approve — reply **ARCHITECTURE APPROVED** to proceed.
