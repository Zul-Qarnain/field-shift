# Use of AI in Field Shift

NASA Space Apps asks every team to name each AI tool it used, with the prompts, the reasoning and the data the tool worked on, and treats unexplained generated content as unacceptable. This page does that for Field Shift: what was used, why, on which data, under whose direction, and what the tool did not do.

**Why we used AI.** We are a small student team of six. AI tools let us tell Karim's story on film and in a spoken narration, and let us build and document a large data pipeline and app in the time of one hackathon. The scientific decisions, the data choices and the final checking stayed with the team.

**No AI-generated data is used as a scientific input.** Every number in the app comes from a named dataset (NASA POWER, CHIRPS, SRDI, NOAA, geoBoundaries) through deterministic code. No language model runs in the app, at build time or in the browser, and no model output feeds a score or a recommendation.

## At a glance

| # | Area | AI tool | What it did | Data it worked on |
|---|---|---|---|---|
| 1 | Machine learning | **LightGBM** (gradient-boosted trees; not generative AI) | Trained offline to forecast the monsoon-onset date shown on each farm page | CHIRPS v2.0 rainfall, NASA POWER weather, NOAA ONI and DMI |
| 2a | Coding, audits, documentation | **Qoder CLI** with model **Qwen3.8-Flash** | Implemented code, tests and documents from written specifications | This repository, the public datasets it reads |
| 2b | Planning and review | **Cursor / Grok agents** | Planned the work, reviewed every change, ran the test gate, merged on the team lead's instruction | This repository, project documents, public sources |
| 3a | Story clips in the project video | **Google Veo** | Generated the short cinematic clips of the fictional farmer Karim and his fields | Text descriptions of scenes |
| 3b | Narration voice in the project video | **Google Gemini text-to-speech**, voice **Sulafat** | Spoke the team's narration script | The narration text |
| 3c | Video support | **faster-whisper** (speech-to-text), **Demucs** (audio source separation) | Timed and checked subtitles against the audio; confirmed the clip audio held no speech | The video's own audio |
| — | Music | *Inspired* by Kevin MacLeod, CC BY 4.0 | **Not AI.** Credited on the closing card | — |
| — | Space and stock footage | Pixabay | **Not AI.** Credited on the closing card | — |

---

## 1. Machine learning: the monsoon-onset forecast (LightGBM)

This is the only trained model in the product. It is a gradient-boosted decision-tree regression, not a language model and not a generative model. It makes no accuracy claim here; the backtest design and its numbers are published in [`docs/science/onset_ml.md`](science/onset_ml.md) and `src/compute/ml/metrics.json`.

| | |
|---|---|
| Purpose | Forecast, for 2026, the date the usable-rainfall monsoon onset begins at each point, with a 10–90 range and the drivers that moved it. Shown as the card **"Machine-learning monsoon forecast"** on every farm page |
| Model | LightGBM, version label `onset-ml-v2`: one conditional-mean model and two quantile models (α = 0.1 and 0.9) for the range |
| Training data, labels | Monsoon-onset dates derived from **CHIRPS v2.0** daily rainfall (Climate Hazards Center, UCSB / USGS) with the same deterministic onset rule v2 the data packs use (`src/compute/onset.py`) |
| Training data, features | **NASA POWER** daily point series: pre-monsoon anomalies of `T2M`, `T2M_MAX`, `RH2M`, end-of-window root-zone wetness `GWETROOT`; **CHIRPS** pre-monsoon rainfall anomaly (1 Mar – 20 Apr); the previous season's onset; **NOAA PSL** ONI (Dec–Feb and Feb–Apr centres, ERSSTv6 Niño 3.4) and DMI (Feb–Mar, HadISST1.1); point latitude and longitude |
| Places and years | All 64 districts of Bangladesh as training points; 45 seasons, 1981–2025. The six demo farms read their own forecast row and are not used for training |
| Issue date | 25 April. A feature may only use information that existed by then; this is enforced in code and asserted in tests (`tests/test_onset_ml.py`) |
| Training procedure | Fixed hyper-parameters (`num_leaves=15`, `learning_rate=0.05`, `min_data_in_leaf=25`, `feature_fraction=0.9`, 250 rounds, seed 0, deterministic, single thread), no tuning loop. Anomalies use a climatology built from the training years only. A leave-one-year-out backtest holds out all 64 districts of a year together |
| Explanation | The "What moved this prediction" list uses exact tree SHAP contributions (`pred_contrib=True`), in days |
| Where it runs | Offline only: `scripts/build_onset_ml.py` writes `web/public/data/onset_outlook.json`. The browser reads that JSON; it never runs the model |
| Reasoning | Onset timing matters to the planting calendar, and satellite rainfall plus ocean indices are the standard drivers in the literature. The forecast is season context beside the measured onset statistics; the rotation ranking runs on the deterministic onset rule |

Retrieval times of every input are recorded in the payload (`data_sources.*.retrieved_utc`). Method, feature table and leakage controls: [`docs/science/onset_ml.md`](science/onset_ml.md).

---

## 2. AI-assisted coding, audits and documentation

### Who did what

- **Qoder CLI (model Qwen3.8-Flash)** was the implementation assistant. Used from 30 September 2026 for the NASA POWER pipeline and onset rule v2, the CHIRPS cross-check, the rotation-engine changes (staple scoring for Boro, the soft same-family penalty, the calendar-scaled fallow penalty, Aus and Fallow in the crop pool), the SRDI / FAO-29 salinity layer, the ML onset outlook and the Bangla pass. On 9 October 2026 it wrote the web side of the "next improvements" round: the nowcast port and card, outage banner, quick answer, location picker, district profiles, stacked score breakdown, wording pass, and their Vitest and Playwright tests. Qoder CLI was also used for the project video's graphics and demo-recording script (section 3c).
- **Cursor / Grok agents** were the planning and review side: research, the architecture audit, deployment help, writing the specifications handed to Qoder, the Python side of the nowcast, ADR-011/012, the README, and the merges. The review found the three fixes that changed the product's claims: the onset-rule **censoring** (version 1 returned its window floor in 50–91 % of years), **NASA POWER's inhomogeneous precipitation** over 1981–2025 (Pettitt change points), and the **significance gate** that stops a non-significant median difference from entering the engine.

### Human in the loop

The team lead set the tasks, chose the data and the scope, and reviewed the results; the merge to `main` was the team lead's decision. Each change was reviewed as a diff, then had to pass the full gate before merge:

| Gate | Count | What it covers |
|---|---|---|
| `pytest` (`tests/`) | 260 tests | Onset rule v1/v2, Mann-Kendall, Theil-Sen, Pettitt, the POWER and CHIRPS readers, NOAA index parsing, the SRDI salinity pipeline, pack invariants, nowcast summaries, ML features, leakage guards and outlook payload |
| `vitest` (`web/tests/`) | 688 tests, 11 files | Rotation-engine constraints and scoring, determinism, weights and penalties, the significance gate, FAO-29 maths, bilingual output, data-pack contracts, nowcast maths, location snapping, quick-answer arithmetic |
| Playwright (`web/e2e/`) | 12 tests, 3 files | Home, Bangla toggle, farm page, what-if re-ranking, outage banner and retry, quick answer, location snapping, map click, with NASA POWER mocked |
| `eslint`, `tsc --noEmit`, `next build` | 0 errors | Lint, type check and the production build |

### Prompts

The condensed instruction behind each workstream, oldest first, with the commit it produced, is in [`prompts_used.md`](prompts_used.md). The full session exports stay with the team. For example, the instruction that produced the onset rule v2 was:

> "Your onset rule returns DOY 145 for most years — that is censoring, not an onset. Measure it, replace it with a local-relative rule, and prove POWER's rainfall series itself is not homogeneous before you report any trend; cross-check with CHIRPS and label it as a non-NASA product."

and the one that produced the salinity layer:

> "Coastal farms' binding constraint is salt. Get SRDI (2010) Appendix-2 for real, transcribe the upazila table with its printed totals as the check, resolve each farm to an upazila by geoBoundaries ADM3, and score yield response with FAO-29 Table 4 / Maas-Hoffman — null where there is no surveyed value."

### What the AI did not do

- It did not decide what the project claims. The findings (no significant onset shift at the demo farms; POWER's rainfall series is not homogeneous) were established by tests on real data and recorded, not asserted.
- Agronomic thresholds and formulas are accepted only from cited sources (FAO-56, FAO EcoCrop, FAO-29 Table 4, peer-reviewed literature). Crop trait values in `web/lib/data.ts` are hand-set demo estimates and are labelled `ESTIMATE` in the UI and the code.
- Retrieval is real or it does not appear: every retrieval date in the app comes from a cached response and the committed JSON. If a live NASA POWER call fails, the app says so and shows the saved pack with its date.
- Bangla interface strings (district, crop and heading names, and the advisory and penalty templates) were drafted with AI assistance.

---

## 3. Project video and presentation

The 240-second judging video (final cut: v7) combines AI-generated story clips, an AI-generated narration voice, real screen recordings of the app, stock space footage and licensed music. Each element is declared here.

### 3a. Story clips: Google Veo

- **Tool:** Google **Veo** (text-to-video).
- **Who:** the team lead generated the clips from text descriptions of the scenes below.
- **What they are:** ten AI-generated clips of eight seconds each. They are illustrative. **"Karim" is a fictional character; the man on screen is not a real person and is not a real farmer.** The closing card credits them as "Story clips: AI-generated (Google Veo)".
- **Data they worked on:** none. Text description in, video out.
- **Where in the video:** the story section (0:00–1:36): Karim, his fields, the calendar, the phone, and the Earth-from-space zoom. Pixabay footage fills the satellite shots (3d).
- **Audio:** the clips carried generated ambient sound. The story section uses only that ambient bed, checked to contain no speech (faster-whisper and Demucs, below), with no added music. One clip contained a speaking voice; its audio was left out.
- **Not used for science:** the clips carry no data, and no number in the video comes from them.

**Prompts.** The original Veo prompt texts could not be found in the project files, so they are not reproduced here and we have not reconstructed them. Instead, each clip is described below as it appears on screen. Each was generated by the team lead with Google's Veo from a text description of that scene.

| Clip | Scene as shown on screen | Original prompt text |
|---|---|---|
| 1 (`VID-20260930-WA0000`) | A weathered man in a green T-shirt, red-checked scarf and blue lungi stands in a field of harvested rice stubble at low sun, looking toward the camera (Karim) | to be added by the team lead |
| 2 (`VID-20260930-WA0001`) | A dry, cracked field with rows of dry stubble under a hazy, low sun and a pale sky | to be added by the team lead |
| 3 (`VID-20260930-WA0002`) | Close-up of red, cracked, dried soil with a dry green shoot rising between the plates | to be added by the team lead |
| 4 (`VID-20260930-WA0003`) | A lone figure walking along a path between dry and red plots, with palm trees on the horizon at sunrise | to be added by the team lead |
| 5 (`VID-20260930-WA0006`) | Close-up of Karim crouching in the stubble, crumbling a handful of dry soil | to be added by the team lead |
| 6 (`VID-20260930-WA0007`) | An aerial view of a village and a patchwork of green and red-brown fields in the morning light | to be added by the team lead |
| 7 (`VID-20260930-WA0008`) | Close-up of Karim's face, lit from a window, looking at a mobile phone in his hand | to be added by the team lead |
| 8 (`VID-20260930-WA0009`) | A fast zoom from space into the Earth over South Asia, clouds sweeping past | to be added by the team lead |
| 9 (`VID-20260930-WA0010`) | Karim sitting on a bench inside a village room, light from a window, looking down at his hands | to be added by the team lead |
| 10 (`VID-20260930-WA0011`) | An observation satellite with solar panels in orbit above the Earth, with sunlight flaring at the horizon | to be added by the team lead |

*Original prompt text: to be added by the team lead.*

### 3b. Narration voice: Google Gemini text-to-speech

- **Tool:** Google **Gemini text-to-speech**, called through the Gemini API (`generateContent`, audio output), prebuilt voice **Sulafat**. Most lines used the `gemini-3.8-flash-lite-tts` model; four late lines (the impact line, "What we need", the vision line and "And Karim?") used `gemini-3.8-flash-tts` with the same voice and style, because the free daily quota of the first model ran out.
- **What it worked on:** the narration text below, written by the team. It spoke exactly these words; speed was adjusted afterwards with ffmpeg `atempo`, which keeps the pitch.
- **Style prompt**, sent verbatim with every line:

> Warm, calm documentary storyteller. Gentle, sincere and unhurried, with soft natural pauses between sentences; a quiet smile in the voice; clear English diction.

- **Text sent to the voice, verbatim and in order of the final video:**

1. In Rajshahi's dry Barind tract, where the earth is red and the summers are long, Karim bhai has farmed since boyhood. His father taught him one simple rule: when the monsoon comes, plant the rice. When it ends, harvest.
2. But the sky is harder to read now. Some years the rain comes late. Some years too little, or all at once. Last season, Karim planted on the old date, and his seedlings sat in dry soil, waiting for water.
3. He has no satellite maps, no soil reports. Only memory, a neighbour's advice, and a calendar he can no longer trust.
4. Each year he plants rice again, because it is what he knows. And each year, the soil grows a little more tired. The fertilizer seller has one answer. A neighbour has another. Karim listens to everyone, and still doesn't know whom to trust.
5. The World Bank warns that by 2050, climate variability and extreme events could cost Bangladesh one-third of its agricultural GDP.
6. Karim is not alone. Across South and Southeast Asia, millions of farmers face the same question, with no data, and no one to ask.
7. Yet from space, part of the answer already exists. NASA satellites and models measure rain, heat and soil, every single day. Our challenge: turn those Earth observations, local soil information and a farmer's own priorities into crop rotations that protect the soil and adapt to change.
8. We are Team Orion. And we built Field Shift, for Karim.
9. Field Shift starts with a farm. Here, a demo field in Rajshahi, one of six across Bangladesh.
10. The Field page shows real NASA POWER weather since 1981. Field Shift tests the rain-onset trend with real statistics, and our machine-learning model forecasts the monsoon onset.
11. On the coast in Khulna, official SRDI survey data shows salty soil, so salt-sensitive crops lose points.
12. On the plan page, the farmer sets priorities: save water, protect the soil, or keep the harvest stable. Field Shift ranks the best rotations, and Why explains every score, with its data source. What-if buttons test a later monsoon, or less rain.
13. Every page works in Bangla, too.
14. And the Data page lists every dataset, with its source and retrieval date.
15. Today, Field Shift runs on NASA POWER weather, CHIRPS rainfall, SRDI soil salinity surveys, and NOAA climate indices. Next, we are adding GPM IMERG rainfall, SMAP soil moisture, MODIS crop greenness, and SoilGrids soil maps.
16. For a farmer like Karim, Field Shift turns NASA data into a planting decision he can trust, explained in his own language.
17. What we've built: a NASA data pipeline, a crop-rotation engine, a bilingual app in English and Bangla, and a machine-learning monsoon forecast trained on satellite rainfall. Now in progress: more satellite layers, and field tests with real farmers.
18. One day, every farmer across South and Southeast Asia could get a season plan from Earth data, in their own language.
19. And Karim? This season, he plants with confidence.
20. Field Shift. Earth data, for smarter farms. From Team Orion.

### 3c. Video support tools

- **faster-whisper** (Whisper "medium" model, run locally): word-level timestamps for the subtitles, and a check that the spoken audio matches the subtitle text. The narration text was written first; Whisper only listened.
- **Demucs** (`htdemucs_ft`, run locally): separated vocals from each clip's audio to confirm the story bed contained no speech.
- **Qoder CLI** (a separate use from the code work above; the model is not recorded in the project files): wrote the HTML templates for the title, progress, dataset and closing cards (rendered to PNG by headless Chrome) and the script that recorded the app demo. The instruction asked for the card layouts, the text of each card and a scripted tour of the app's pages; the numbers on the cards are the real ones from the app.

### 3d. Music and stock footage (not AI)

- **Music:** *Inspired* by Kevin MacLeod (incompetech.com), licensed CC BY 4.0, from the team card to the end, ducked under the voice.
- **Space and stock footage:** Pixabay, under the Pixabay licence, credited on the closing card.
- **Screen recordings** of the app are real captures of the running build, recorded by script (3c). They are not generated footage.
- **The one external statistic** in the video, one-third of Bangladesh's agricultural GDP at risk by 2050, is from the World Bank (2022), cited on screen and listed in the README references.

---

## Where the team's own work went

AI helped us move faster. These parts are the team's own work:

- **Data pipeline:** choosing NASA POWER, CHIRPS, SRDI, NOAA and geoBoundaries, deciding how each is retrieved, joined and cached, and verifying them against the real files.
- **Scoring engine:** the rotation rules, the eight components, the penalties, the weights and what each farmer priority moves, with every threshold tied to a cited source or labelled as an estimate.
- **App design:** the user journeys (farm, plan, quick answer, location picker), the "See why" panels, the bilingual interface and the plain-language advisory and SMS text.
- **Scripting:** the story of Karim, the narration text and the structure of the video.
- **Editing and demo:** assembling the clips, voice, music, cards and screen recordings into the final video, and recording and narrating the live demo.

## Data the AI worked on

Team-supplied project documents (challenge guides, strategy notes), public NASA and partner documentation, public non-space data (CHIRPS, SRDI, FAO-29, geoBoundaries, NOAA PSL), the files of this repository, and the video's own audio and text. No personal or restricted data. A key for the Gemini API was used to call the voice model and is not stored in the repository.

## Contents of this disclosure

- [`prompts_used.md`](prompts_used.md) — the coding prompt log
- [`science/onset_ml.md`](science/onset_ml.md) — the machine-learning method
- [`FIELD_SHIFT_SYSTEM_ARCHITECTURE.md`](FIELD_SHIFT_SYSTEM_ARCHITECTURE.md) — ADR-006 keeps the decision path free of language models
