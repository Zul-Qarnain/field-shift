# FIELD SHIFT — UI/UX DESIGN SYSTEM

**Version:** 1.0 · 26 September 2026 · Phase 2 deliverable (approved architecture v1.3)
**Purpose:** the complete visual + interaction contract for implementation. Given to any designer/generator/builder, this file defines what the product looks like and how every screen behaves.
**Companion:** `docs/FIELD_SHIFT_SYSTEM_ARCHITECTURE.md` (data, engine, APIs). If a screen cannot be built from the architecture, the screen is wrong — not the architecture.

---

## 1. Design principle

> **NASA Earth science + modern geospatial intelligence + practical agricultural decision support.**

The product must NOT look like: a generic admin dashboard, a SaaS landing page, a crypto terminal, a chatbot, or a "NASA-themed" fan site.

It must feel like **an observatory instrument pointed at a farm**: dark, calm, precise, with live signal color reserved for the one thing that matters — **what has shifted**.

Three laws (every screen obeys all three):

1. **Answer first.** The advisory sentence is the top-most content element of every result screen. Charts are evidence *below* the answer, never above it.
2. **Evidence one tap away.** Every number opens its provenance (dataset, version, URL, retrieval date). Nothing is unexplained.
3. **Honest uncertainty.** Modeled ≠ measured ≠ user-entered ≠ hypothetical — visibly distinguished by badges, never hidden.

## 2. Brand interpretation (NASA Space Apps)

Verified brand guidance (spaceappschallenge.org/brand): **blue-led palette with a neon-yellow accent, libre-licensed fonts.** Rules respected here:

- No NASA insignia, no meatball/worm logo, no implied NASA endorsement. Footer line on every screen: *"Built for the NASA Space Apps Challenge — a community science initiative. Not an official NASA product."* (bn + en)
- Our palette is brand-adjacent but independent: deep observatory navy + NASA blue for actions + neon-lime as the "signal" accent + earth green for agriculture semantics.
- Libre fonts only (OFL-licensed): Space Grotesk, Inter, Noto Sans Bengali, IBM Plex Mono.

## 3. Product visual identity

- **Metaphor:** night-side Earth from orbit — a dark canvas where *data is the light*.
- **Signature accent:** neon lime marks **change** (the shifted onset, the delta in a scenario, the winning rotation). Lime is never decorative: if something glows lime, it means "this moved / this is the answer."
- **Imagery:** real satellite basemap (GIBS) under data layers; no illustrations, no stock photos of farmers. The single human-facing warmth is the advisory sentence itself.

## 4. Color tokens

CSS custom properties; all pairings below meet WCAG AA on their stated backgrounds.

### Canvas & surfaces (dark theme, primary)

| Token | Value | Use |
|---|---|---|
| `--bg-canvas` | `#0A1220` | app background |
| `--bg-surface` | `#101B2E` | cards, panels |
| `--bg-elevated` | `#16243D` | modals, drawers, dropdowns |
| `--bg-inset` | `#0D1526` | chart wells, map chrome, code/provenance blocks |

### Ink (text)

| Token | Value | Use |
|---|---|---|
| `--ink-hi` | `#E8EEF7` | headings, primary text (AA on all surfaces) |
| `--ink-mid` | `#9FB0C7` | body, labels (AA on surface) |
| `--ink-low` | `#5F7292` | captions, timestamps (AA on canvas for ≥14px) |

### Semantic

| Token | Value | Use |
|---|---|---|
| `--action-blue` | `#3D7BFF` | primary buttons, links, focus |
| `--nasa-blue` | `#0B3D91` | NASA tier badge, brand references only |
| `--signal-lime` | `#D4F94E` | THE accent: shifts, deltas, winners, focus on data |
| `--earth-green` | `#57C785` | good/suitable scores, positive deltas |
| `--water-blue` | `#4EA8DE` | water metrics, rainfall charts |
| `--heat-amber` | `#F2B84B` | moderate risk, heat metrics |
| `--risk-red` | `#EF6C4D` | high risk, penalties, invalid |
| `--partner-violet` | `#8B7BF0` | Partner (ESA/JAXA) tier badge |
| `--open-gray` | `#6B7A93` | Open non-space tier badge |

### Tier badges (fixed mapping — same everywhere)

| Badge | Chip style |
|---|---|
| `NASA` | `--nasa-blue` fill, white text |
| `Partner` | `--partner-violet` outline, violet text |
| `Open` | `--open-gray` outline, gray text |
| `You` | `--signal-lime` outline, lime text |
| `live` / `cache` / `fixture` | small mono chip top-right of every data block: live=`--earth-green`, cache=`--water-blue`, fixture=`--heat-amber` |

**Light theme:** not in MVP. The observatory identity is dark; a light theme would double the QA surface for zero judging value. (Cut per scope discipline.)

## 5. Typography

| Role | Font | Weights | Notes |
|---|---|---|---|
| Display / numerals-hero | **Space Grotesk** | 500, 700 | advisory sentences, big stats |
| Body / UI | **Inter** | 400, 500, 600, 700 | everything else |
| Bangla | **Noto Sans Bengali** | 400, 600 | `:lang(bn)` swap; line-height 1.7 (Bengali needs it) |
| Data / mono | **IBM Plex Mono** | 400, 500 | coordinates, p-values, dates, provenance JSON |

Scale (px): 12 caption · 14 body-sm · 16 body · 20 title-sm · 28 title · 40 hero (mobile hero 28).
Tabular numerals (`font-variant-numeric: tabular-nums`) on every stat and chart axis.

## 6. Spacing, radius, elevation

- **Spacing:** 4-pt scale — 4, 8, 12, 16, 24, 32, 48, 64. Page gutters: 16 (mobile) / 32 (desktop). Max content width 1200.
- **Radius:** 4 chips · 8 inputs/buttons · 12 cards · 16 modals/drawers.
- **Elevation:** dark theme uses **borders over shadows**: `1px solid #1E2F4D` card borders; elevated surfaces get `0 8px 24px rgba(0,0,0,.35)` only for modals/drawers.
- **Focus:** 2px `--signal-lime` outline, 2px offset — on interactive elements only.

## 7. Iconography

- **Lucide** (ISC license), 1.5px stroke, 20px default.
- Domain set: `map-pin, map, droplets, thermometer, sprout, leaf, sun, cloud-rain, wind, layers, database, external-link, info, alert-triangle, check, x, chevron-*, play, globe, languages, share-2, copy, download`.
- Never color-code meaning with icon alone (a11y) — icons accompany text labels.

## 8. Core components

### Buttons
| Variant | Style | Use |
|---|---|---|
| Primary | `--action-blue` fill, white text, radius 8 | one per view: "Analyze my farm", "Generate rotations" |
| Secondary | transparent, `1px --action-blue` border, blue text | "Compare", "What-if" |
| Ghost | no border, `--ink-mid`, hover bg `--bg-elevated` | toolbar actions, language toggle |
| Signal | `--signal-lime` fill, `#0A1220` text, **700** | the single "money" action per view — the next step of the journey |
| Disabled | 40% opacity, no hover | always with a helper line explaining why |

Sizes: 40px height (touch, min 44 on mobile), 8px label, icon+label.

### Cards
- **Metric card:** label (14, `--ink-mid`) · value (28 Space Grotesk, tabular) · delta chip (`+11 d` lime / `−3 d` green / warning amber) · source tier chip · sparkline · "?" opens provenance popover.
- **Rotation card (the product's hero component):** see §16.
- **Farm card:** map thumbnail (static, pre-rendered) · name (bn+en stacked) · district chip · 3 mini metrics (water/heat/soil) · "Open".
- Hover: border → `--action-blue`; never scale-transform cards (motion sickness + layout shift).

### Inputs
- **Priority sliders (the key input):** custom range 0–100, thumb 24px lime, filled track gradient gray→semantic color per dimension (water=blue, soil=green…), live weight % label, reset link. Above each slider: one-line plain-language meaning ("How much do you care about saving water?"). Debounced 80ms → instant re-rank.
- **Select / search:** dark dropdown on `--bg-elevated`, mono font for coordinates, 8px radius.
- **Text input:** 40px, inset background, 1px border → blue on focus.

### Tabs
Underline style (2px `--signal-lime` active), `--ink-mid` inactive. Used in: Conditions (Rainfall/Heat/Moisture/Vegetation), Compare (Scores/Assumptions).

### Tables
Compare table only: sticky first column (seasons), zebra `--bg-inset`, values right-aligned tabular mono, best-in-row cell gets lime left-border. No vertical borders.

### Charts (Recharts, all dark-styled)
| Chart | Use | Style |
|---|---|---|
| **Two-era distribution** (signature) | onset dates 2001–12 vs 2013–25 | two overlapping smoothed histograms (water-blue vs signal-lime, 55% opacity), vertical median lines, lime arrow labeled "+11 days" between medians |
| Trend line | annual rainfall/temp 1981–present | line + 10-y loess band (inset fill), era shading |
| Component bars | why-panel S1–S7 | horizontal bars 0–1, value mono, threshold tick |
| Water supply/demand | S1 evidence | 12-month bars (supply) + step line (demand) |
| Delta chart | scenario before/after | paired bars with lime/green/red deltas |
| Sparkline | metric cards | 80×24, 1.5px |

Chart chrome: no gridlines except dashed `#1E2F4D` baseline; axes `--ink-low` 12px; unit + era + source always in the subtitle line, not a tooltip.

### Map (MapLibre)
- Basemap: OpenFreeMap **dark style**, de-saturated (`raster-fade-duration 0`).
- NASA layer toggle: GIBS TrueColor/land layers, opacity slider 0–70%, date picker (explicit dates only).
- District layer: fills colored by the active metric (sequential scale water-blue→risk-red, 5 bins, legend attached); hover raises name + value.
- Demo farms: lime pins with pulse on selection; custom pin: blue.
- Map is **never above the answer**: on mobile it renders 240px tall *below* the advisory.
- Offline: pre-tiled PMTiles; no network request — tiles badge shows `fixture`.

### Tooltips / popovers
Trigger: tap/click AND hover (desktop). 200ms delay. Contain: value · definition (one line) · tier chip · "Open source ↗". Max 320px. Dismiss: Esc / outside tap.

### Alerts
| Type | Border-left | Copy pattern |
|---|---|---|
| Info | `--water-blue` | definition/scope note ("Soil values are modeled at 250 m — correct them if you know your plot.") |
| Warning | `--heat-amber` | assumption with impact ("Onset threshold ±5 mm shifts the recommendation by ≤2 days (sensitivity tested).") |
| Risk | `--risk-red` | data gap ("SMAP era unavailable for this district — moisture score uses rainfall proxy; confidence lowered.") |
| Success | `--earth-green` | completion ("Advisory copied — 148 characters.") |

### States (every data region implements all five)
1. **Loading:** skeleton of the exact layout (no spinners); mono caption "loading POWER 1981–2025…" only on slow ops.
2. **Empty:** never a blank card — "No {crop} calendar for {district} yet — pick from the 8 supported crops." + link to supported list.
3. **Error:** plain language + recovery ("Couldn't reach SoilGrids — showing modeled district values instead." + retry). Source chip flips to `cache`/`fixture` — an error that degrades gracefully is a Success state in disguise, and says so.
4. **Success:** quiet — data just appears; the delta is the celebration.
5. **Restricted/unverified:** confidence chip on the metric ("modeled", "low confidence") linking to Method.

## 9. Accessibility

- WCAG 2.1 AA: contrast table above is normative; never encode meaning in color alone (every score has a text label: Low/Med/High + number).
- Full keyboard path: farm → digest → sliders → rotations → why → scenario; focus order = reading order; skip-to-content link.
- Screen reader: charts get `aria-label` = the one-sentence interpretation (not "chart of rainfall"); live region announces re-rank results ("Top recommendation unchanged, score +0.08").
- Bangla: `lang` attribute toggles, font swap, 1.7 line-height, no uppercase transforms on bn.
- Touch targets ≥ 44px; map controls 44px.
- `prefers-reduced-motion`: disable pulse/count-up; keep state changes instant.

## 10. Responsive behavior

| Breakpoint | Layout |
|---|---|
| < 640 (primary) | single column; sticky bottom action bar (Signal button); map 240px below answer; tabs scroll horizontal |
| 640–1024 | two-column: content 60% / evidence rail 40% |
| > 1024 | three-zone: farm/map rail (320px) · main flow · evidence rail (360px, sticky) |

Mobile-first is non-negotiable (the killer demo is "in Bangla, on a phone").

---

## 11. Core experience (the flow every screen serves)

```text
Choose Farm → Understand Conditions → Set Priorities → Generate Rotations
→ Compare → Understand Why → Explore What-If → Act (advisory + SMS)
```

Persistent header (all views): logo wordmark "FIELD SHIFT" (Space Grotesk 700, lime SHIFT) · language toggle (বাং/EN) · "Method" · "Data" · offline/online chip.
Persistent footer: participant-project line + license + top-3 dataset chips.

Progress affordance: the 4 journey steps (Farm · Conditions · Priorities · Results) render as a thin lime progress rail under the header on mobile, as breadcrumbs on desktop. The user always knows **where am I / what data am I looking at / what does it mean**.

## 12. Screen inventory

| # | Screen | Purpose | Key data | Journey step |
|---|---|---|---|---|
| S1 | Landing | orient + start in ≤10 s | demo farms, pitch | — |
| S2 | Farm select | pick farm/district/pin | districts 64, demo farms 6 | Farm |
| S3 | Conditions ("What shifted") | the evidence digest | indicator pack | Conditions |
| S4 | Soil check | review/correct modeled soil | soil profile + merge order | Conditions |
| S5 | Priorities | set weights | sliders | Priorities |
| S6 | Rotations | ranked recommendations | engine output | Results |
| S7 | Why (drawer/detail) | explainability + provenance | component breakdown | Results |
| S8 | Compare | 2–3 rotations side-by-side | engine output ×N | Results |
| S9 | Scenarios | what-if stress test | scenario engine | Results |
| S10 | Advisory | the sentence + SMS + share | templates | Act |
| S11 | Method | definitions, formulas, sensitivity | docs data | — |
| S12 | Data | every dataset: id, URL, license, retrieval date | provenance manifest | — |

Cut from MVP (deliberate): About page (fold into Landing footer), multi-farm dashboard, settings.

### S1 — Landing
- **Purpose:** judge/user understands the product in 10 seconds and starts.
- **Layout:** hero = the advisory sentence pattern itself as the pitch ("The rains shifted. Your calendar should too.") + one Signal button "Choose a demo farm" + secondary "Search my district". Below: 3 metric cards (what the app does: onset shift · soil fit · what-if). No marketing sections, no scroll-jacking.
- **Data:** none (static). **Empty/loading:** n/a. **Mobile:** hero 28px, demo-farm chips horizontal scroll.

### S2 — Farm select
- **Purpose:** choose location with zero training.
- **Layout (mobile):** search field (district, bn/en) → results list; horizontal demo-farm chips (curated, named, e.g. "Rajshahi — dry tract"); map below with district fills.
- **Interactions:** tap chip → S3; tap district → S3; long-press map → drop pin (enables live-enrich path); "Use my location" ghost button.
- **States:** map loads from PMTiles (instant offline); search = local district list (no network); pin mode shows "live data when online" notice.

### S3 — Conditions
- **Purpose:** answer "what changed here?" with proof. **This screen wins Validity.**
- **Layout (mobile):** ① Advisory-grade headline ("Usable-rainfall onset ≈ 18 June — **11 days later** than 2001–2012") ② the two-era distribution chart ③ metric card grid (rainfall trend, heat days, soil moisture, greenness, ET balance) each with delta chip + tier chip ④ sensitivity note ("stable to ±5 mm threshold") ⑤ Signal button "Set priorities".
- **Tabs:** Rainfall · Heat · Moisture · Vegetation (per-tab chart + interpretation).
- **Data:** pack JSON only — zero network. **Error:** impossible offline; if a pack section is absent → Warning alert + confidence chip.

### S4 — Soil check
- **Purpose:** show modeled soil + let the user correct it.
- **Layout:** soil cards (pH, texture triangle mini-viz, organic carbon, CEC) each labeled `modeled`/`You`; merge-order explainer strip (You > modeled > district reference); "This doesn't match my field" → inline edit → values re-badge `You` + scores recompute notice.
- **Data:** pack soil block + local state. **Empty:** district reference fallback with badge.

### S5 — Priorities
- **Purpose:** 4 sliders, zero jargon, instant consequence preview.
- **Sliders (defaults 50):** 💧 Water saving · 🌱 Soil health · 📈 Stable harvest · ⚡ Heat/flood safety — plus crop pool checkboxes (8 crops, all checked).
- **Live feedback:** tiny text under sliders: "Right now: lentil-led rotations lead by 0.12" (re-ranks client-side, debounced).
- **Signal button:** "Generate rotations".

### S6 — Rotations
- **Purpose:** the ranked answer list. **Answer first.**
- **Layout:** ① one-line result summary ("7 valid rotations from your 8 crops — top 3 shown") ② top-3 Rotation cards ③ "Show all valid" ghost ④ Signal "Copy advisory" on card #1.
- **Rotation card anatomy (§16):** sequence chips with arrows (Aman rice → lentil → mungbean) · total score (Space Grotesk, /100) · confidence chip · 3 component mini-bars (water/soil/risk) · risk flags (chips w/ tooltip) · tier chips row · buttons: Why · Compare (+) · What-if.
- **States:** engine is instant (no loading); if < 3 valid → Success alert explaining which constraint bit ("No winter crop fits the shifted onset window — rice→fallow→mungbean shown instead").

### S7 — Why
- **Purpose:** the explainability drawer — opened during the demo on purpose.
- **Layout:** drawer (mobile) / right rail (desktop): ① plain-language "Because…" list (3 bullets, template-generated) ② component bars S1–S7 with thresholds ③ penalties list with rule citations ④ **Provenance table**: every input value → dataset chip → id → retrieval date → URL ⑤ sensitivity line.
- **Interaction:** every bullet's number tap-expands its raw JSON (mono, inset).

### S8 — Compare
- **Purpose:** 2–3 rotations side-by-side, differences not totals.
- **Layout:** table (§8) rows = seasons + S1–S7 + penalties; best-in-row lime border; above the table: one-sentence auto-verdict ("Rotation A wins on water, B on soil health — your weight on water decides it").
- **Interaction:** toggle "Scores / Assumptions" tabs (assumptions = thresholds & era used).

### S9 — Scenarios
- **Purpose:** stress-test without lying about it.
- **Layout:** scenario chips (Drier −10% · Drier −20% · Hotter +1 °C · Hotter +2 °C · Onset +7 d · Onset +15 d · custom pH) → paired before/after: **rank changes** (arrows between ranked cards) + delta chart + headline ("Under −20% rainfall, mungbean drops out — chickpea enters at #3 but fails soil-pH check").
- **Persistent banner (non-dismissible, amber):** "This is your observed data with a stated change applied — a stress test, not a forecast."

### S10 — Advisory
- **Purpose:** the takeaway the farmer walks away with.
- **Layout:** the advisory sentence in a quote card (Space Grotesk 20, bn + en stacked) · SMS chip "148/160 characters" + copy button · share (web share API) · "View the data behind this" → S7 · restart ghost.
- **Success:** copy → Success toast "Advisory copied".

### S11 — Method / S12 — Data
Static, server-rendered from the same JSON the engine uses. Method: every definition (onset, GDD, each Sᵢ, penalties) in bn + en with the sensitivity table. Data: the provenance manifest as a filterable table — this page **generates the project page's "NASA data sources used" content**. Footer of both: AI_USE link + license.

## 13. The data story (every chart answers a question)

| Bad (never) | Good (always) |
|---|---|
| "Temperature: 29.4°C" | "Heat days above 35 °C: 14 per season now vs 6 in 2001–2012 — bad for late wheat" |
| "Soil pH: 5.7" | "Modeled soil is acidic (pH 5.7) — chickpea and lentil yields suffer; mustard is safe" |
| "Rainfall chart" | "Onset moved 11 days later — the post-monsoon window shrank; short-duration crops fit it" |

Chart subtitle template (enforced): `unit · era/years · dataset tier chip · "open evidence" link`.

## 14. Recommendation UI rules

Never show an unexplained score. Every Rotation card: score **plus** the three component bars that most moved it, plus risks, plus confidence, plus tier chips. The why-panel is one tap from anywhere a score appears. If two rotations are within 0.05, say "statistically tied — your priorities break the tie" instead of fake precision.

## 15. Judge demo experience (90-second golden path)

1. (0–10 s) Landing → tap **"Rajshahi — dry tract"** demo chip.
2. (10–30 s) Conditions: the two-era chart + "+11 days" arrow lands; tap the provenance "?" once — say "NASA POWER, 25 years" out loud.
3. (30–40 s) Priorities: drag Water saving to 80 — note the live re-rank line.
4. (40–55 s) Rotations: top card reads itself; open **Why** — component bars + provenance drawer.
5. (55–70 s) Scenarios: tap **Drier −20%** — ranking flips; read the amber banner ("stress test, not forecast").
6. (70–85 s) Advisory: copy the SMS — "148 characters, Bangla or English."
7. (85–90 s) Zoom out on the map — "works for any of Bangladesh's 64 districts, offline."
Rehearsed with wifi off; identical with wifi on.

## 16. Markdown wireframes (major screens)

```text
S3 — CONDITIONS (mobile)
┌─────────────────────────────────┐
│ FIELD SHIFT      বাং|EN  ●cache │
│ Farm · Conditions · Priorities · Results   (rail)
├─────────────────────────────────┤
│ Rajshahi, Monsoon onset         │
│ ≈ 18 June — 11 DAYS LATER       │  ← headline (lime delta)
│ than 2001–2012                  │
│ ┌─────────────────────────────┐ │
│ │  two-era distribution       │ │  ← signature chart
│ │  ▂▅▇  vs  ▁▃▆█   → +11 d    │ │
│ │  POWER · 1981–2025 · NASA ⓘ │ │
│ └─────────────────────────────┘ │
│ ┌───────┐┌───────┐┌───────┐    │
│ │Rain↓  ││Heat↑  ││Moist↘ │    │  ← metric cards + deltas
│ │-6%/dec││+8 d   ││-0.04  │    │
│ └───────┘└───────┘└───────┘    │
│ ⓘ Stable to ±5 mm threshold     │
│ [        SET PRIORITIES       ] │  ← Signal
└─────────────────────────────────┘
```

```text
S6 — ROTATIONS (mobile)
┌─────────────────────────────────┐
│ 7 valid rotations · top 3       │
│ ┌─────────────────────────────┐ │
│ │ #1  Aman → LENTIL → Mungbean│ │  ← sequence chips
│ │     78/100 ●high conf       │ │
│ │     water ▇▇▇▇▇▇░ 0.81      │ │
│ │     soil  ▇▇▇▇▇░░ 0.74      │ │
│ │     risk  ▇▇▇▇▇▇▇ 0.12 pen  │ │
│ │     ⚠terminal heat ⓘ        │ │
│ │     [Why] [+Compare] [W-I]  │ │
│ └─────────────────────────────┘ │
│ ┌ #2 Aman→Mustard→Mung  74 ───┐ │
│ ┌ #3 Aman→Fallow→Mung   71 ───┐ │
│ [        COPY ADVISORY        ] │
└─────────────────────────────────┘
```

```text
S7 — WHY (drawer over S6)
┌─────────────────────────────────┐
│ Why #1?                    [×]  │
│ • Onset +11 d → short winter    │
│   window fits lentil (p=0.008)  │
│ • Legume fixes N: S4 0.81       │
│ • Moisture OK 7/10 recent yrs   │
│ S1 ▇▇▇▇▇▇▇░ 0.74  water         │
│ S2 ▇▇▇▇▇▇░░ 0.68  heat fit      │
│ S4 ▇▇▇▇▇▇▇▇ 0.81  soil health   │
│ Penalties: terminal-heat −0.06  │
│ ┌ PROVENANCE ─────────────────┐ │
│ │ onset → POWER  NASA  09/26 ↗│ │
│ │ pH 5.8 → SoilGrids Open  ↗  │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

```text
S9 — SCENARIOS (mobile)
┌─────────────────────────────────┐
│ ⚠ Stress test — not a forecast  │
│ [−10%][−20%][+1°][+2°][+7d]     │
│ ─────────────────────────────── │
│ #1 Aman→Lentil→Mung  78 → 61    │
│ #2 Aman→Mustard→Mung 74 → 66 ▲1 │  ← lime arrow = rank change
│ #3 Aman→Fallow→Mung  71 → 64 ▲1 │
│ mungbean drops out (water<min)  │
│ [ paired delta chart ]          │
│ [        BACK TO PLAN         ] │
└─────────────────────────────────┘
```

## 17. Implementation mapping (every component → architecture)

| UI component | Data source | API/pack | Engine/service | Notes |
|---|---|---|---|---|
| Metric cards + charts (S3) | pack `conditions` | `web/public/data/packs/{district}.json` | precomputed in `src/compute` | zero runtime network |
| Two-era distribution (S3) | pack `onset_stats` | same | `src/compute/onset.py` | signature visual |
| Soil cards + merge (S4) | pack `soil` + local state | same / optional `GET /api/v1/soil` | soil merge order | re-badge on edit |
| Priority sliders (S5) | local state | — | `web/lib/engine` (client) | <100 ms re-rank |
| Rotation cards (S6) | engine output | — | `web/lib/engine` + Python parity tests | top-3 + all-valid |
| Why drawer (S7) | engine output `provenance_refs` | — | serialization gate | opens raw JSON |
| Compare (S8) | engine output ×N | — | same | best-in-row calc client-side |
| Scenarios (S9) | pack + scenario params | — | same engine, perturbed inputs | HYPOTHETICAL banner |
| Advisory (S10) | engine output | — | template generator (bn/en) | ≤160 chars enforced |
| Map (S2/S3) | PMTiles + GIBS | static | — | offline tiles committed |
| Method/Data (S11/12) | provenance manifest | pack | — | generates project-page text |
| Tier/source chips | every data block | — | `safe.py` source label | `live/cache/fixture` |

## 18. Motion & sound

Motion: 120–200ms ease-out fades/height transitions only; count-up numerals on the hero stat (400ms); pulse only on selected demo pin. No parallax, no confetti. Sound: none.

## 19. Definition of done (UI)

A screen is done when: golden path works offline · all five states exist · bn/en complete · keyboard path complete · charts have interpretation subtitles · every number opens provenance · matches this spec's tokens exactly.
