# Tasks — Field Shift (NASA Space Apps 2026)

## Phase 1–2 Discovery & requirements (done)
- [x] Inspect host/VPS config, secret file format (SSH key only), tool availability
- [x] Extract official NASA challenge statement (Details tab)
- [x] Clone repo, inspect docs + source tree, test suite, production site
- [x] Write NASA_REQUIREMENTS.md matrix

## Phase 3 Agent/infra prep
- [x] Verify Kaggle CLI + token (works); Vercel token present (CLI not installed)
- [x] Verify Muse Code (spark-1.3, max effort) headless execution (MUSE_OK)
- [x] GitHub push credential located: valid `GITHUB_TOKEN` exported in `~/.bashrc` (HTTP 200)
- [x] Kaggle dataset `shihabdev20/field-shift-ml` created (source + requirements)
- [x] Kaggle kernel `shihabdev20/field-shift-onset-ml-baseline-v3-reproduction` pushed, RUNNING

## Phase 5 ML experiments (Kaggle)
- [ ] Understand current null result (skill 0.0) — documented
- [ ] Experiment plan: feature variants, GP, spatial pooling, different targets (write EXPERIMENT_LOG)
- [ ] Baseline reproduction on Kaggle; then variant grid; honest evaluation (LOYO)
- [ ] If any variant beats climatology × stricter baselines → pick, export artifact

## Phase 4/6 Product integration
- [ ] Replace soil-moisture/NDVI fixtures with real SMAP L4 / MODIS NDVI (via pipeline; Kaggle for heavy processing)
- [ ] Add GIBS layer tiles (PMTiles) where feasible
- [ ] Add per-strategy gap/limitation copy
- [ ] Accessibility/mobile polish after automated audit

## Phase 7 Testing & deployment
- [ ] Web unit tests (run), lint, build, e2e smoke
- [ ] Preview deploy → production deploy via Vercel token
- [ ] Confirm deployed commit == verified changes

## Phase 8 Reporting
- [ ] Technical report, ML report, LaTeX PDF (reporting agent after results; verify)
- [ ] Update README / AI_USE / screenshots as needed
