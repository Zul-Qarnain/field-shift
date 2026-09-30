# Monsoon onset — definition, homogeneity, cross-check, and what the data actually shows

Code: `src/compute/onset.py` (rule + tests in `tests/test_onset.py`), `src/compute/trends.py`
(Mann-Kendall, Theil-Sen, Pettitt), `src/acquire/power.py`, `src/acquire/chirps.py`.
Pack builder: `scripts/build_packs.py`. Packs: `web/public/data/packs/`.

## 1. Onset definition v2 — the rule, exactly

The UI states the rule as **"5-day rainfall ≥ local Jun–Sep mean (2001–2025), no break ≥ 10 days
under 5 mm"**. That is the same rule this file computes:

| Element | Value | Constant in `onset.py` |
|---|---|---|
| Search window | DOY 121–270 (≈1 May – 27 Sep) | `WINDOW_START_DOY`, `WINDOW_END_DOY` |
| Candidate day must be wet | rainfall(*d*) ≥ 1 mm | `WET_DAY_MM` |
| Accumulation | 5-day sum starting at *d* ≥ `T_local` | `ACCUM_DAYS` |
| `T_local` | this point's mean 5-day accumulation over Jun 1–Sep 30, **2001–2025**, from the same series | `local_threshold()`, `REFERENCE_PERIOD`, `REFERENCE_MONTHS` |
| No break | in the 30 days after the 5-day window, no 10-day period totals < 5 mm | `BREAK_CHECK_DAYS`, `BREAK_WINDOW_DAYS`, `BREAK_MIN_MM` |
| Which day | the FIRST day satisfying all three, as a DOY | — |
| No qualifying day | NaN; the year is absent from the series | — |

**Adapted from Moron & Robertson (2014, *Int. J. Climatol.* 34:1050–1061)** — this is a
local-relative accumulation rule *in that family*. It is not their method: their window geometry,
threshold statistics and significance testing differ, and we make no claim to have reimplemented
them. The point of the local-relative form is that a single national mm constant is meaningless
when Sylhet's monsoon normal is 103 mm per 5 days and Rajshahi's is 37 mm.

Data handling, stated because it changes results: a candidate whose 5-day window contains any
missing day is rejected (we never sum four days and call it five); a missing day **breaks** a run of
dry days (an unobserved day cannot confirm a break); and a year whose DOY 121–305 slice is less
than 95 % observed returns NaN (`MIN_COVERAGE`).

The rule looks forward: if heavy rain starts DOY 161, a window opened on DOY 159 already contains
three monsoon days, so 159 can be the answer. `tests/test_onset.py` pins that behaviour instead of
pretending it away.

### Why the reference period is 2001–2025

POWER's PRECTOTCORR is not homogeneous over 1981–2025 (§3). Calibrating "normal monsoon rain" on
1981–1996 would bake the product's dry early segment into the yardstick. Consequence, stated
plainly: **both eras share one threshold calibrated across both eras**, so the era test measures a
change in arrival *order* against a fixed local yardstick — it is not independent of the reference
period.

## 2. Why v1 (7-day ≥ 20 mm from DOY 145) was rejected, measured

The originally specified rule was implemented and run on the real cached POWER series first. It is
**censored by its own window floor**: Bengal's pre-monsoon *kal-baishakhi* convection clears
≥ 20 mm in 7 days with ≥ 4 wet days by late May, and the following 30 days rarely contain a 7-day
dry spell, so the answer is simply "the first day we allowed".

| Farm | District | v1 years pinned to DOY 145 | v2 years pinned to DOY 121 | v2 spread (sd, days) |
|---|---|---|---|---|
| farm-12 | Tangail | 35/45 = **78 %** | 8/43 = 19 % | 22.4 |
| rajshahi-07 | Rajshahi | 23/45 = **51 %** | 0/43 = 0 % | 21.7 |
| barishal-03 | Barishal | 28/45 = **62 %** | 3/43 = 7 % | 27.8 |
| khulna-09 | Khulna | 25/45 = **56 %** | 3/43 = 7 % | 25.9 |
| rangpur-21 | Rangpur | 37/45 = **82 %** | 3/43 = 7 % | 22.6 |
| sylhet-15 | Sylhet | 40/45 = **89 %** | 5/44 = 11 % | 17.2 |

Across the 64 district packs the rejected rule censored **50–91 %** of years; v2 brings the median
to ~9 %. Also measured during the review and rejected: fixed thresholds (5-day ≥ 40/50 mm, 7-day
≥ 60 mm at DOY 145) still left 30–70 % censored, and a Liebmann-style anomalous-accumulation
definition was much noisier (sd 35–55 days). Every pack carries both censoring rates
(`onset.censoredAtWindowStart`, `onset.legacyV1`) and a ±20 % local-threshold sensitivity table
(`onset.sensitivity`).

## 3. POWER precipitation is not homogeneous — and that decides which number we show

`src/compute/trends.pettitt` is a own-implementation Pettitt (1979) rank-based change-point test
(`U(t) = 2·Σ_{i≤t} rank(x_i) − t(n+1)`, `K = max|U|`, `p ≈ 2·exp(−6K²/(n³+n²+n))`).

| Farm | Full-record 1981–2025 change year | Step | Change point inside 2001–2025 | Onset/trend source used |
|---|---|---|---|---|
| farm-12 | 1998 | +1,159 mm | **2016** | CHIRPS |
| rajshahi-07 | 1998 | +592 mm | none | NASA POWER |
| barishal-03 | 1998 | +1,082 mm | **2015** | CHIRPS |
| khulna-09 | 2007 | +925 mm | **2015** | CHIRPS |
| rangpur-21 | 1998 | +1,094 mm | **2016** | CHIRPS |
| sylhet-15 | 2000 | +1,927 mm | **2015** | CHIRPS |

63 of 64 district packs carry a significant step inside 2001–2025. Consequences built into the
pipeline:

* **No 1981–2025 rainfall trend is published anywhere.** `metrics.rainfallTrendPctPerDecade` is
  computed over 2001–2025 only (`method.trendWindow`), and carries
  `rainfallTrendCaution = "caution: POWER precipitation has source changes …"` when a step falls
  inside that window.
* The onset block carries the same caution, because the threshold and both eras sit on the
  inhomogeneous series.
* `preferred` in each pack decides, from the tests, which product the UI reads — POWER when its own
  series is clean, CHIRPS when POWER steps and CHIRPS does not, and `"none"` if both step.

Independent spot check of the same point (hand-run, 2026-09-30, ERA5 daily archive via Open-Meteo,
24.2514 N 89.9152 E): annual totals 1,423 mm (1985), 1,993 (2005), 2,606 (2017), 1,937 (2024)
versus POWER's 831 / 1,976 / 4,159 / 2,982 mm — POWER's early years too dry and its recent years
too wet. CHIRPS (below) gives 1,802 / 1,963 / 2,578 / 1,890 mm, tracking ERA5 far more closely.

## 4. POWER vs CHIRPS: the actual onset result

Both products, same v2 rule, same eras (2001–2012 vs 2013–2025), CHIRPS v2.0 daily 0.25° at the
nearest cell (files retrieved 2026-09-30; Climate Hazards Center UCSB / USGS; Funk et al. 2015,
*Sci Data* 2:150066 — labelled **Open (UCSB CHC / USGS)**, not NASA).

| Farm | POWER `T` mm | POWER med A→B | shift | p | CHIRPS `T` mm | CHIRPS med A→B | shift | p | onset-year r | MAE d | bias d |
|---|---|---|---|---|---|---|---|---|---|---|---|
| farm-12 | 57.1 | 138→123 | **−15.0** | 0.016 | 51.3 | 134→128 | −6.0 | 0.764 | 0.10 | 15.8 | +10.5 |
| rajshahi-07 | 37.2 | 142→136 | −6.0 | 0.173 | 42.9 | 145→140 | −5.0 | 0.531 | 0.35 | 16.3 | +5.8 |
| barishal-03 | 59.1 | 155→127 | **−28.0** | 0.041 | 62.3 | 135→140 | **+5.0** | 0.568 | 0.27 | 19.2 | +13.4 |
| khulna-09 | 51.4 | 150→127 | −23.5 | 0.064 | 50.1 | 138→129 | −9.0 | 0.806 | 0.53 | 16.3 | +11.8 |
| rangpur-21 | 57.4 | 142→131 | **−11.0** | 0.017 | 63.3 | 132→137 | **+5.0** | 0.157 | −0.12 | 23.2 | +13.3 |
| sylhet-15 | 103.1 | 143→128 | **−15.0** | 0.000 | 103.9 | 130→130 | 0.0 | 0.978 | −0.06 | 16.5 | +12.8 |

Across all 64 districts: POWER median shift **−14.8 d** with 38/64 at p < 0.05; CHIRPS median shift
**−1.5 d** with only **4/64** at p < 0.05; median year-to-year agreement r = **0.26**.

**Reading.** POWER alone would support "the monsoon now arrives about two weeks earlier, and the
change is statistically significant at most farms". The independent product does not corroborate
that: CHIRPS finds a small, non-significant shift and at Barishal and Rangpur the *opposite sign*.
Since POWER's precipitation series steps upward at 2015–2016 inside exactly the era boundary being
compared, and since the two products barely agree on which year the onset fell in (r ≈ 0.26, MAE
16–23 days), **the defensible statement is that no onset shift is established by these data** — and
that is what the packs, the UI and the engine now carry (the era figure is taken from CHIRPS where
POWER is flagged). Reporting POWER's −15 d/p = 0.016 as a climate finding would be reporting the
product's own discontinuity as weather.

## 5. What the product does with a non-significant shift

Because the era test usually does *not* reject the null, the claim had to be gated. In
`web/lib/engine.ts`:

```
onsetShiftSignificant(pack) = pack.onset.pValue < ONSET_ALPHA        // ONSET_ALPHA = 0.05, two-sided
measuredOnsetShift(pack)    = significant ? median(B) − median(A) : 0
effectiveOnsetShift(pack)   = measuredOnsetShift(pack) + scenario.onsetShiftDays
```

The gate is applied everywhere the shift appears, so the interface cannot say one thing and
compute another:

* Headline card: **"No significant onset shift"**, with the measured figures as secondary text
  ("median −6 days, p = 0.76, not significant"). Only p < 0.05 renders "… days earlier/later".
* "What this changes" copy switches to a statement that the two eras are not distinguishable,
  instead of claiming the window opens earlier or later.
* Advisory and SMS: `No significant onset shift on this farm (CHIRPS v2.0, p=0.764; median −6 days)
  — the calendar treats it as 0`, and the SMS shortens to `onset n.s. (p=0.76)`. Bangla carries the
  same wording with Bengali digits.
* Home farm cards mark a gated value `n.s.` and stop colouring it as good/bad news.
* Plan page states the baseline the engine is using: `Baseline onset shift used by the engine: 0 days
  (measured −6 days, p = 0.764, not significant)`.
* Why list carries "The measured onset shift (median −6 days, p = 0.764) is not significant, so it is
  treated as 0 here", and the late-onset penalty's source line names the rule.
* The calendar budget and the late-onset/early-onset terms all read `effectiveOnsetShift`, so a
  non-significant shift can no longer buy or cost a farm growing days. The what-if buttons (+7/+15 d)
  still apply — they are stated hypotheticals, not claims about the farm.

Consequence for the demo rankings, measured: with the gate no farm gets extra calendar room from an
unsupported earlier onset, so Aman→Boro stays #1 at Rangpur in all four Water 0–25 × Stable 75–100
corners, while at Tangail it drops from 3rd to 4th (by 0.2 points) in the Water 25 + Stable 75 corner.
`tests/packs.test.ts` pins both the gate and that reported outcome.

## 6. Rainfall and temperature trends (2001–2025, never 1981–2025)

| Farm | POWER %/decade | CHIRPS %/decade (τ, p) | CHIRPS Mann-Kendall | Heat days > 35 °C era Δ (p) | Mean T2M era Δ | T2M_MAX step in window |
|---|---|---|---|---|---|---|
| farm-12 | +21.2 (caution) | −0.0 (0.00, 1.00) | no trend | −12 d (0.006) | +0.05 °C | 2017 |
| rajshahi-07 | +6.5 | +0.2 (0.00, 1.00) | no trend | +0.5 d (0.785) | +0.26 °C | none |
| barishal-03 | +26.5 (caution) | +3.4 (0.10, 0.50) | no trend | −17 d (0.027) | −0.00 °C | 2017 |
| khulna-09 | +27.3 (caution) | +1.1 (0.03, 0.83) | no trend | −13 d (0.026) | −0.09 °C | 2017 |
| rangpur-21 | +18.6 (caution) | −2.7 (−0.13, 0.39) | no trend | −7 d (0.041) | +0.05 °C | none |
| sylhet-15 | +28.8 (caution) | −0.6 (−0.01, 0.98) | no trend | −4.5 d (0.105) | +0.20 °C | none |

CHIRPS shows **no significant rainfall trend at any of the six farms**; POWER shows +18 to +29 %
per decade at five of them. That gap is the product, not the climate. Temperature: POWER's own
T2M/T2M_MAX also drifts (farm-12 1981–1990 mean T2M 26.38 °C vs 25.42 °C for 2016–2025; a hand-run
ERA5 spot check for 1985 gave 25.28 °C), so the *falling* count of > 35 °C days at four farms is not
evidence that heat has eased — `quality.tempMaxHomogeneity` states the test result and
`metrics.heatDaysCaution` fires where a step was found.

## 7. What this pipeline does **not** claim

* No onset shift is established; the app shows the era figure from whichever product survives its
  own homogeneity test, names that product, and prints the other product's figure beside it — and
  because that figure fails its era test at five of the six farms, the engine is handed **0** and the
  headline, advisory, SMS, plan page and Why list all say so (§5).
* No SMAP soil moisture: `metrics.rootZoneWetnessMonthly` is POWER **GWETROOT** (modelled root-zone
  wetness), labelled in the pack and the UI.
* No NDVI, no SoilGrids, no crop-trait or irrigation citations: those remain demo fixtures.
* CHIRPS is a 0.25° grid cell (≈25 km), not the farm; each pack states the cell actually used and
  its distance from the requested point.
* No forecast. This is climatology from gridded/reanalysis products.
* The original "+11 days later at Rajshahi" headline was demo fixture data; the real series does not
  support it under any rule tested here.

## 8. Reproduce

```bash
/workspace/fs-venv/bin/python -m src.acquire.districts      # 64 ADM2 centroids -> bd_districts.csv
/workspace/fs-venv/bin/python scripts/build_packs.py         # POWER + CHIRPS -> 70 packs (~70 s)
/workspace/fs-venv/bin/python -m pytest -q                   # 108 tests; no network required
```

The web layer is checked separately: `cd web && npx vitest run` (183 tests, including the onset
significance rule and the A1 guarantees re-run against the real packs), `npx tsc --noEmit`,
`npx eslint .`.

CHIRPS files are read from `${CHIRPS_DIR:-/workspace/fs-cache/chirps}` and are never committed;
each keeps the `source_url` and `retrieved_utc` attributes written by the download, which the packs
surface as `crossCheck.retrievedUtc` / `crossCheck.sourceUrlSample`.
