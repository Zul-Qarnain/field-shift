# Use of AI in this project

> Living document — keep it current as we build (BD rule: third-party assets, templates, stock material, or AI-generated content must be explicitly declared and credited; the project page's "Use of AI" field requires every tool named, the prompts, and the reasoning). AI use is permitted; unexplained generated content is not.

## Tools

- **AI coding assistant (agentic CLI, Qoder)** — architecture drafting, verified web research, document editing, code scaffolding, refactoring, unit tests, documentation. *(Team: extend this list with every other AI tool used — image generation, translation helpers, research tools, etc.)*
- **Qoder CLI (model Qwen3.8-Flash)** — used from 30 Sep 2026 to implement the audit fixes (honesty cleanup, rotation engine changes, map fixes, Bangla/i18n), with every diff reviewed, tested and committed by the team.
- **Cursor / Grok agents** — used for research, the architecture audit, deployment help, and directing the coding assistant.
- **AI video generation — (tool name: TEAM TO FILL IN)** — the short cinematic intro clips (farmer, dry field, satellite, Earth zoom) in the prescreen video are AI-generated; they are illustrative, not real footage of a real farmer.

## What the AI did

- Drafted `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` from the team's decisions, supplied project documents, and cited research.
- Verified data sources, competition rules, and free-tier facts via web research (results and citations recorded in the architecture document).
- Created `docs/FIELD_SHIFT_UI_UX_DESIGN_SYSTEM.md` (Phase 2) from the approved architecture.
- Implemented the audit fixes listed above under team direction: honesty labels, rotation-engine changes, map fixes, and the Bangla/i18n pass.
- Drafted the Bangla UI strings (district, division, farm, crop, heading and button text). They still need a native-speaker proofread before submission.
- Will scaffold application code, write acquisition/compute modules and tests, and draft UI copy — all under team review.

## What the AI did not do

- The decision engine is deterministic, team-reviewed code; no AI computes any number shown to users (see ADR-006 in the architecture doc).
- Agronomic thresholds and formulas are only accepted from cited sources (FAO-56, FAO EcoCrop, peer-reviewed GDD literature); AI-proposed values require a citation before entering `src/compute`. The coefficients the web demo uses today are hand-set and labeled `ESTIMATE`, not cited values.
- Scope decisions (challenge, districts, crops, priorities) are human decisions recorded in the architecture document.
- The demo numbers in `web/lib/data.ts` (crop traits and durations, per-farm irrigation access, food & income values) are hand-set `ESTIMATE` values, labeled as estimates in the UI and in the code — no AI output is presented as a cited agronomic figure.

## Prompts

Prompt log: `docs/prompts_used.md` — append significant prompts as work proceeds.

## Data the AI worked on

Team-supplied project documents (challenge guides, strategy notes), public NASA and partner documentation, and files in this repository. No personal or restricted data.
