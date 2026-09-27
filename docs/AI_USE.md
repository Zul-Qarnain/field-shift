# Use of AI in this project

> Living document — keep it current as we build (BD rule: third-party assets, templates, stock material, or AI-generated content must be explicitly declared and credited; the project page's "Use of AI" field requires every tool named, the prompts, and the reasoning). AI use is permitted; unexplained generated content is not.

## Tools

- **AI coding assistant (agentic CLI, Qoder)** — architecture drafting, verified web research, document editing, code scaffolding, refactoring, unit tests, documentation. *(Team: extend this list with every other AI tool used — image generation, translation helpers, research tools, etc.)*

## What the AI did

- Drafted `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` from the team's decisions, supplied project documents, and cited research.
- Verified data sources, competition rules, and free-tier facts via web research (results and citations recorded in the architecture document).
- Created `docs/FIELD_SHIFT_UI_UX_DESIGN_SYSTEM.md` (Phase 2) from the approved architecture.
- Will scaffold application code, write acquisition/compute modules and tests, and draft UI copy — all under team review.

## What the AI did not do

- The decision engine is deterministic, team-reviewed code; no AI computes any number shown to users (see ADR-006 in the architecture doc).
- Agronomic thresholds and formulas are only accepted from cited sources (FAO-56, FAO EcoCrop, peer-reviewed GDD literature); AI-proposed values require a citation before entering `src/compute`.
- Scope decisions (challenge, districts, crops, priorities) are human decisions recorded in the architecture document.

## Prompts

Prompt log: `docs/prompts_used.md` — append significant prompts as work proceeds.

## Data the AI worked on

Team-supplied project documents (challenge guides, strategy notes), public NASA and partner documentation, and files in this repository. No personal or restricted data.
