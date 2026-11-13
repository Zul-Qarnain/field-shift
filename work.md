# Field Shift — Work Log (2026-11-13 session)

## Done

### 1. Git pull + merge (origin/main → local main)
- Stashed local e2e WIP, `pull origin main --no-rebase`: clean merge, HEAD now `bc40796` (PR #13, onset-ml-v3 shipped, 17/28 LOYO years).
- Popped stash, no conflicts. Working tree holds only intended changes (see `git status`).

### 2. Bug fixes applied (all validated)
- **Bug C — SMS/scenario split (engine.ts:672-679, plan/page.tsx:50):** `smsText()` takes optional `sc: Scenario = DEFAULT_SCENARIO`; plan page passes live scenario. What-if onset shown with `?` marker. Old code hardcoded zeros, disagreeing with the advisory beside it.
- **RotationCard bar mismatch (RotationCard.tsx:82):** top-3 bars pass `weight`, matching Why-drawer convention (was: raw widths vs weighted ranking).
- **False mission labels (i18n.ts:343,345):** soil card "SMAP L4" → "POWER modelled"; NDVI "MODIS/VIIRS" → "Demo fixture" (both en+bn). These were fixture numbers wearing mission names.
- **Stale metadata (layout.tsx:14):** "runs on sample data" → real packs + labelled fixtures.
- **Nav farm reset (Shell.tsx: NavLinks + Suspense):** sidebar keeps `?farm=` between /field and /plan.
- **Pinned test updated (tests/i18n.test.ts:37):** moisture-label expectation to the honest string.

### 3. Scientific evidence added (method/page.tsx)
- New "Field references" panel, 3 verified BRRI documents with title/org/date/link + verification caveat (search-verified 2026-11-13, excerpts only; backs practice, not scores):
  - Technical Guideline for Mustard-Boro-T. Aman (BRRI RFS Division, 30 Nov 2025)
  - Boro ratooning + mustard in Boro-Fallow-T. Aman manual (BRRI RFS Division, 1 Jul 2025)
  - Aman-Potato in stress areas without losing soil health (BRRI, 2024)

### 4. README / AI_USE attribution audit
- README Use-of-AI row: added Claude Code (Anthropic); points to verification appendix.
- AI_USE.md appendix "Requested tool acknowledgements (2026-11-13)":
  - Repo-evidenced: Qoder CLI (Alibaba), Claude Code (Anthropic), Cursor/Grok planning.
  - Team-stated, vendor verified: Codex (OpenAI), Antigravity IDE (Google), OpenCode (Anomaly/sst), Google Flow (Google DeepMind), ElevenLabs + Google voice.
  - Corrected: Cursor = Anysphere (not SpaceX); Grok = xAI (not SpaceX); OpenCode = Anomaly/sst (not Meta).
  - Unverifiable, NOT published: "Muse by Meta", EntryGPT, D0, Tars/SpaceX.

### 6. Scientific, Data & Engineering Resolutions (2026-11-13 Afternoon Session)
- **Bug A Resolved — Salinity Scoring (data.ts, engine.ts, tests/salinity.test.ts, tests/agronomic_fixes.test.ts):**
  - Integrated research-backed salt tolerance thresholds and yield loss slopes for previously unnumbered crops:
    - Mustard: $a = 3.0$ dS/m, $b = 10.0$ %/dS/m (BARI Oilseed Research Centre & Maas 1990).
    - Lentil: $a = 1.4$ dS/m, $b = 15.6$ %/dS/m (BARI Pulse Research Centre & Maas 1990, Sensitive).
    - Mungbean: $a = 1.8$ dS/m, $b = 14.0$ %/dS/m (BARI Pulse Research Centre & FAO / Maas 1990).
    - Sesame: $a = 2.0$ dS/m, $b = 13.0$ %/dS/m (FAO-29 Table 5 Sensitive & Maas 1990).
    - Jute: $a = 2.2$ dS/m, $b = 11.0$ %/dS/m (BJRI & FAO Guidelines).
  - Implemented `PRECAUTIONARY_SALT_TOLERANCE` guard for uncharacterized crops on saline soils to prevent unsuitable crops from falsely outranking salt-tolerant crops.
- **Bug B Resolved — Aman Monsoon Salinity Leaching (engine.ts, tests/agronomic_fixes.test.ts):**
  - Modeled Kharif-II monsoon rainfall dilution and leaching using empirical relationships from Mainuddin et al. (2019, 2020) and SRDI long-term coastal monitoring.
  - Formulated `monsoonLeachedECe()` scaling dry-season ECe by $\approx 60\%-75\%$ based on field drainage condition (`floodProneIndex`).
  - Transparently reports both the leached loss estimate and the unmitigated dry-season upper bound in bilingual output.
- **Bug D Resolved — Idle/Fallow Penalty Direction (engine.ts, tests/agronomic_fixes.test.ts):**
  - Corrected `idleScale` calculation to reflect actual unallocated cropping time: `YEAR_DAYS - cropDays`.
  - Removed flawed `+ shift` term that previously caused delayed onset to artificially discount the idle penalty (4.0 $\to$ 3.2).
  - Maintained the agronomic principle that late onset extends bare-field waiting exposure rather than rewarding fallow.
- **Live Satellite Data Ingestion (src/acquire/modis.py, smap.py, grace.py, tests/test_satellite_ingest.py):**
  - MODIS: Connects to NASA ORNL DAAC Land Product Subsets REST API (`https://modis.ornl.gov/rst/api/v1/MOD13Q1/`) fetching live 250m 16-day NDVI & EVI time series with pixel reliability filtering and disk caching.
  - SMAP L4: Connects to NASA CMR API (`https://cmr.earthdata.nasa.gov/search/granules.json?short_name=SPL4SMGP`) verifying live granule availability, harmonized with GMAO Catchment LSM assimilation.
  - GRACE: Connects to NASA CMR for JPL Mascon RL06.3 (`TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4`), tracking regional groundwater storage trends across Bangladesh.
- **Kaggle CLI Execution & Verification (kaggle/):**
  - Created reproducible kernel bundle (`kaggle/kernel-metadata.json` & `kaggle/monsoon_onset_loyo_training.py`).
  - Successfully pushed and executed on Kaggle infrastructure (`zulqarnain20/field-shift-monsoon-onset-ml` -> `KernelWorkerStatus.COMPLETE`).
  - Verified out-of-sample LOYO metrics: 17/28 years beating climatology (60.7%), MAE 10.63d vs 10.73d climatology, 79.7% conformal coverage.
- **Validation (all green):**
  - `python -m pytest -q` -> 266 passed.
  - Vitest (`npm test` in web) -> 700 / 700 passed.
  - `npx tsc --noEmit` -> 0 errors.
  - `npm run lint` -> clean.
  - `npm run build` -> static export successful.

## Pending / Postponed (submission status)

1. **Bug A (saline ranking):** RESOLVED — BARI/BJRI/Maas citations added, precautionary guard implemented.
2. **Bug D (idle-penalty sign):** RESOLVED — Anchored to unallocated cropping time; late onset does not discount idle penalties.
3. **Bug B (Aman upper bound):** RESOLVED — Monsoon leaching modeled per Mainuddin et al. (2019) with explicit dry-season peak upper bound stated.
4. **Live satellite ingestion:** RESOLVED — `src/acquire/modis.py` (ORNL DAAC REST API), `src/acquire/smap.py` (NASA CMR/GMAO), and `src/acquire/grace.py` (JPL Mascon) implemented and tested.
5. **Kaggle CLI experiments:** RESOLVED — Kernel `zulqarnain20/field-shift-monsoon-onset-ml` pushed and executed to COMPLETE status on Kaggle.
6. **ONNX in browser:** Documented alternative kept (offline build + committed JSON with live TypeScript scenario engine, prompt §5).
7. **Ship steps:** Final commit, git push, and hosting deployment explicitly postponed per execution rules.

## Key paths
- Prompt (work order): `/home/zulqarnain/nasa-project/prompt.md`
- This log: `/home/zulqarnain/nasa-project/work.md`
- Challenge brief: `/home/zulqarnain/nasa-project/project-details.md`
- Requirements matrix: `/home/zulqarnain/nasa-project/NASA_REQUIREMENTS.md`
- Engine: `/home/zulqarnain/nasa-project/web/lib/engine.ts`
- ML: `/home/zulqarnain/nasa-project/src/compute/ml/` + `EXPERIMENT_LOG.md` + `MODEL_CARD.md`
