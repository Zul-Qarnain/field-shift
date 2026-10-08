# Use of AI in this project

> Living document — keep it current as we build (BD rule: third-party assets, templates, stock material, or AI-generated content must be explicitly declared and credited; the project page's "Use of AI" field requires every tool named, the prompts, and the reasoning). AI use is permitted; unexplained generated content is not.

## Tools

- **AI coding assistant (agentic CLI, Qoder)** — architecture drafting, verified web research, document editing, code scaffolding, refactoring, unit tests, documentation. *(Team: extend this list with every other AI tool used — image generation, translation helpers, research tools, etc.)*
- **Qoder CLI (model Qwen3.8-Flash)** — from 30 Sep 2026 the implementation agent for phase 2: the audit fixes (honesty labels, map fixes), the NASA POWER pipeline and onset v2 (acquire + compute + `scripts/build_packs.py`), the homogeneity/CHIRPS cross-check work, the rotation-engine changes (Boro staple scoring, the soft same-family penalty, the calendar-scaled idle-fallow penalty, Aus and Fallow added to the crop pool), the SRDI/FAO-29 salinity layer, the ML onset outlook, and the full Bangla pass. Every diff was reviewed, tested and committed by the reviewing agent, not merged on the assistant's own authority.
- **Qoder CLI (model Qwen3.8-Flash), 9 Oct 2026 round** — wrote the web side of the "next improvements" round under the reviewer's specification: `web/lib/nowcast.ts` (the TypeScript port of the nowcast summary, the live POWER fetch with timeout), the nowcast card, outage banner, quick answer, location picker, district profiles, the stacked score breakdown, the forward-looking wording pass, their Vitest tests and the Playwright suite. The reviewing agent wrote the Python side (`src/compute/nowcast.py`, `scripts/build_nowcast.py`, `scripts/build_district_table.py`, `tests/test_nowcast.py`), ran the NASA POWER acquisition, wrote ADR-011/012 and the README changes, reviewed every diff, and ran the full check gate before committing.
- **Cursor / Grok agents** — the reviewing side of phase 2: research, the architecture audit, deployment help, and directing the coding assistant. The reviewer found and directed the three fixes that changed the product's claims — the onset-rule **censoring** (v1 returned its window floor in 50–91 % of years), **NASA POWER's inhomogeneous precipitation** over 1981–2025 (Pettitt change points), and the **significance gate** that stops a non-significant median difference from entering the engine — ran the real-data acquisitions those findings needed, and performed the merges into the integration branch.
- **AI video generation — (tool name: TEAM TO FILL IN)** — the short cinematic intro clips (farmer, dry field, satellite, Earth zoom) in the prescreen video are AI-generated; they are illustrative, not real footage of a real farmer.

## What the AI did

- Drafted `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` from the team's decisions, supplied project documents, and cited research (now v1.4, with ADR-008/009/010 recording what the build changed).
- Verified data sources, competition rules, and free-tier facts via web research (results and citations recorded in the architecture document).
- Created `docs/FIELD_SHIFT_UI_UX_DESIGN_SYSTEM.md` (Phase 2) from the approved architecture.
- Implemented the audit fixes listed above under team direction: honesty labels, rotation-engine changes, map fixes, and the Bangla/i18n pass.
- Wrote the data pipeline and its science: `src/acquire` (POWER, CHIRPS, geoBoundaries, NOAA PSL indices, SRDI salinity), `src/compute` (onset v1/v2, Mann-Kendall, Theil-Sen, Pettitt, the ML outlook), `scripts/build_packs.py`, `scripts/build_onset_ml.py`, and their pytest/Vitest tests.
- Transcribed SRDI (2010) Appendix-2 and FAO-29 Table 4 into `src/data/salinity/` and the crop rows, with the source page numbers and the name-join decisions recorded for audit; verified the transcription against the downloaded PDF.
- Drafted the Bangla UI strings (district, division, farm, crop, heading and button text) and the bilingual advisory/SMS/penalty templates. They still need a native-speaker proofread before submission.
- Drafted this file, `docs/prompts_used.md`, `docs/science/onset.md`, `docs/science/onset_ml.md`, the README and the Method/Data pages — each time against the committed numbers, not from memory.
- **Did not decide what the project claims.** The negative findings (no significant onset shift; the ML outlook not beating climatology) were established by tests on real data that the reviewer measured and directed; the assistant recorded them.

## What the AI did not do

- **No number shown in this app is produced by a language model, at runtime or offline.** Every figure comes from a deterministic function over a named dataset (TypeScript engine, Python compute, committed JSON packs) or is labelled as a demo fixture/`ESTIMATE`. `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` ADR-006 keeps the decision path LLM-free.
- The one trained model in the product is **not** a language model: it is a LightGBM regression built offline (`src/compute/ml`), scored by a leave-one-year-out backtest, and shipped as static JSON (`web/public/data/onset_outlook.json`) with its metrics — measured skill −0.155 against climatology, so its status is `experimental` and no recommendation reads it. The browser never runs it.
- The decision engine is deterministic, team-reviewed code; no AI computes any number shown to users (see ADR-006 in the architecture doc).
- Agronomic thresholds and formulas are only accepted from cited sources (FAO-56, FAO EcoCrop, FAO-29 Table 4, peer-reviewed GDD literature); AI-proposed values require a citation before entering `src/compute`. The coefficients the web demo uses today are hand-set and labeled `ESTIMATE`, not cited values.
- Scope decisions (challenge, districts, crops, priorities) are human decisions recorded in the architecture document — including the v1.4 crop-pool change, recorded as ADR-008 for the team to review.
- The demo numbers in `web/lib/data.ts` (crop traits and durations, per-farm irrigation access, food & income values) are hand-set `ESTIMATE` values, labeled as estimates in the UI and in the code — no AI output is presented as a cited agronomic figure.
- Retrieval is real or it does not appear: the POWER, CHIRPS, SRDI, geoBoundaries, ONI/DMI dates quoted in the app come from the cached responses and committed JSON, and datasets that were never downloaded are marked "next phase" (with the demo value labelled) rather than filled in. The nowcast dates come from the POWER responses the same way, and a failed live call is shown as an outage with the saved pack's date, never as invented numbers.

## Prompts

Prompt log: `docs/prompts_used.md` — append significant prompts as work proceeds.

## Data the AI worked on

Team-supplied project documents (challenge guides, strategy notes), public NASA and partner documentation, public non-space data (CHIRPS, SRDI, FAO-29, geoBoundaries, NOAA PSL), and files in this repository. No personal or restricted data.
