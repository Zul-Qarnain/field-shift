# Prompt log

Companion to `docs/AI_USE.md` — the "Use of AI" disclosure asks for the tools, the prompts and the reasoning, not just the tools.

**Verbatim transcripts are not published here.** The full session exports (Qoder CLI, Cursor, Grok) stay with the team. What follows is the condensed instruction each workstream actually ran, oldest first, with the commit it produced — enough for a judge to reconstruct what the AI was asked to do and to check it against the diff.

## Entries — 30 September 2026 (phase 2, build against real data)

| Date | Tool | Prompt (condensed) | Result |
| --- | --- | --- | --- |
| 30 Sep 2026 | Qoder CLI (Qwen3.8-Flash), reviewed by Cursor/Grok | "Leftovers first: Boro must be able to win on irrigated farms — give the food/income score a real staple axis, price fallow by how much calendar room was actually free, finish the Bangla pass with Bengali digits, and make copy buttons confirm only on success." | `a656c15` — *Leftovers: Boro can win on irrigated farms (staple value, calendar-scaled fallow), full Bangla with Bangla digits, copy buttons confirm only on success* |
| 30 Sep 2026 | Qoder CLI, data downloaded/reviewed by the reviewer | "Replace the fixture climate numbers with real NASA POWER: fetch 1981→yesterday for the six farms and all 64 district centroids, cache with UTC retrieval timestamps, compute onset and trends, build committed packs, and wire them into the app with honest source chips." | `bb9e3fb` — *Real data: NASA POWER pipeline, onset v2, homogeneity checks, CHIRPS cross-check, packs for 6 farms + 64 districts, wired into the app* |
| 30 Sep 2026 | Cursor/Grok (review) → Qoder CLI (implement) | "Your onset rule returns DOY 145 for most years — that is censoring, not an onset. Measure it, replace it with a local-relative rule, and prove POWER's rainfall series itself is not homogeneous before you report any trend; cross-check with CHIRPS and label it as a non-NASA product." | `bb9e3fb` (onset v2, Pettitt homogeneity, CHIRPS cross-check) and `6f49247` — *Merge leftovers into real-data work: bilingual pack cards, onset v2 rule text in both languages* |
| 30 Sep 2026 | Cursor/Grok (review) → Qoder CLI (implement) | "A median difference that fails its own Mann-Whitney test must not buy a farm calendar days. Gate it at p < 0.05 everywhere the shift appears — card, advisory, SMS, plan page, penalties — and say 'no significant shift'." | `43924fb` — *Onset significance gate: say 'no significant shift' and use 0 days in the engine unless p < 0.05* |
| 30 Sep 2026 | Qoder CLI, backtest reviewed by the reviewer | "Try the ML question for real, but only outside the decision path: LightGBM on CHIRPS-derived onset labels with POWER/ONI/DMI features cut off at 25 April, leave-one-year-out against each district's own climatology, ship it only if skill is positive — and if it loses, say so in the UI." | `6218067` — *Onset ML outlook: CHIRPS-label LightGBM, leave-one-year-out backtest vs climatology, experimental status, UI card* (measured skill −0.155, status `experimental`) |
| 30 Sep 2026 | Qoder CLI, source fetched/verified by the reviewer | "Coastal farms' binding constraint is salt. Get SRDI (2010) Appendix-2 for real, transcribe the upazila table with its printed totals as the check, resolve each farm to an upazila by geoBoundaries ADM3, and score yield response with FAO-29 Table 4 / Maas-Hoffman — null where there is no surveyed value." | `cbfcaf1` — *Salinity: SRDI 2010 upazila salinity classes, FAO-29 crop salt tolerance, Maas-Hoffman penalty* |
| 30 Sep 2026 | Cursor/Grok (review) | "Bilingual salinity penalty and card; single requirements.txt; keep the honesty features intact." | `83139b1`, `126c14d`, `c4ad663` — merge commits bringing the audit cleanup into the salinity and ML workstreams |
| 30 Sep 2026 | Qoder CLI (this worktree), docs only | "Docs last: record v1.4 in the architecture (crop pool, ML vs ADR-005, onset v2 + homogeneity + cross-check + gate + salinity), rewrite the README against real counts and real findings, make the Data page show each dataset's real retrieval date and mark the unretrieved ones, fix the Method page, and disclose the AI use truthfully." | the docs change on `wip/docs` (uncommitted here — `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` v1.4 + ADR-008/009/010, `README.md`, `docs/AI_USE.md`, `docs/prompts_used.md`, `web/app/data/page.tsx`, `web/app/method/page.tsx`, `web/lib/i18n.ts`) |

## What to append, oldest first

For every significant prompt:

| Field | Content |
| --- | --- |
| Date | Day the prompt ran |
| Tool | Which assistant and model |
| Prompt | The prompt text, or where the export lives |
| Result | What changed because of it (commit or document section) |

## Where the reasoning already lives

- `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` — decisions, data contracts and ADRs (ADR-008/009/010 are the v1.4 records).
- `docs/AI_USE.md` — what the AI did and, equally, what it did not do.
- `docs/science/onset.md`, `docs/science/onset_ml.md` — the measurements behind the findings, with the commands that reproduce them.
- Git history — what actually landed, per reviewed commit.

*(TEAM TO FILL IN: link the verbatim session exports, and name the AI video tool, before the submission is locked.)*
