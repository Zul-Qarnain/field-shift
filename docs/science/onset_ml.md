# Onset ML outlook

A build-time model that forecasts the *date* of Bangladesh's usable-rainfall onset in April,
from what April already knows. It is trained and scored offline; the browser only reads the
JSON it writes. Nothing in the app runs a model at request time.

**Status: built, trained on NASA and NASA-partner data only, and shown in the app** as the
"Machine-learning monsoon forecast" card on every farm page. The honest headline of model
`onset-ml-v3`: **at a 25 April issue date, none of the April predictors carries out-of-sample
skill over each district's own average onset.** The model knows this about itself: a
cross-validation inside the training years switches its correction off (shrinkage factor 0), so
the published forecast is the district climatology with a **calibrated** 80 % range, and the card
says so in plain words. The payload's `status` stays `validating` while backtest skill is not
above zero (the rule in [Backtest](#backtest)).

## What changed in v3 (15 Oct 2026)

| | v2 | v3 |
| --- | --- | --- |
| Labels + pre-monsoon rainfall | CHIRPS v2.0 (UCSB CHC / USGS) | **NASA/JAXA GPM IMERG V07** via NASA POWER |
| ENSO / IOD | NOAA PSL ONI (ERSST) and DMI (HadISST) | **Niño 3.4 and DMI computed from NASA MERRA-2** sea-surface skin temperature |
| Target | absolute onset day-of-year | **onset anomaly** vs the district's fold climatology |
| Prior-season feature | raw day-of-year | anomaly vs the same baseline |
| Interval | LightGBM quantile heads (α 0.1 / 0.9) — covered **55 %** | **conformal** band from held-out-year residuals — covers **80 %** |
| Guard against noise | none | **shrinkage** of the correction, chosen by inner CV with the one-SE rule |
| Hyper-parameters | 15 leaves, 25 per leaf, 250 rounds | 7 leaves, depth 3, 80 per leaf, λ₂ = 10, 150 rounds |
| Backtest skill vs climatology | **−0.155** (worse than climatology) | **0.000** (never worse, never better) |

A bug was fixed on the way: permutation importance was aggregated with `dict.update`, so v2's
"feature ranking" was the *last* fold's ranking, not the mean over folds.

## Data — NASA and NASA-partner only

| Input | Product | Where it is used |
| --- | --- | --- |
| Onset labels + pre-monsoon rainfall | NASA/JAXA **GPM IMERG V07** daily, 0.1°, aggregated to the UTC day by NASA POWER (`IMERG_PRECTOT`), read from POWER's public Zarr store on AWS Open Data — `src/acquire/imerg.py` | the onset label and the `rain_anom_mar_apr` feature, every complete year 1998–2025 |
| Temperature, humidity, root-zone moisture | **NASA POWER v10** daily (MERRA-2) — point API or the same archive on AWS (`src/acquire/power.py`, `power_zarr.py`) | `t2m_anom`, `t2m_max_anom`, `rh2m_anom`, `gwetroot_eow_anom` |
| ENSO | **Niño 3.4 from NASA MERRA-2** monthly skin temperature over ocean, 5°S–5°N, 170°W–120°W, anomalies vs 1991–2020, 3-month running mean — `src/acquire/indices.py` | `nino34_djf`, `nino34_fma` |
| IOD | **Dipole Mode Index from NASA MERRA-2** (Saji et al. 1999 boxes) | `dmi_feb_mar` |
| Places | geoBoundaries BGD ADM2 centroids (64 districts); the six demo farms from `web/lib/data.ts` | the feature grid points (administrative geometry, not an observation) |

**Index validation.** The MERRA-2 Niño 3.4 agrees with NOAA's published ONI to about ±0.2 °C at
every event checked — DJF 1983 2.12 (ONI 2.2), 1989 −1.82 (−1.7), 1998 2.02 (2.2), 2000 −1.64
(−1.7), 2011 −1.52 (−1.4), 2016 2.37 (2.5), 2024 1.83 (1.8) — and the MERRA-2 DMI reproduces the
1997 (+1.2) and 2019 (+2.0) positive and 2016 (−1.0) negative IOD events. Ocean cells are chosen
with MERRA-2 itself: the land model's `GWETROOT` is undefined over ocean, so Sumatra and the Horn of
Africa never enter the IOD boxes.

**Why it reads from AWS.** NASA POWER publishes its v10 archive as public Zarr stores on the AWS
Registry of Open Data (`nasa-power` bucket). The values are the ones the daily API serves — at
Tangail, annual PRECTOTCORR 2016–2025 from the store equals the committed API packs to 0.1 mm — and
the store also carries POWER's daily IMERG aggregation, so no Earthdata login is needed to
reproduce anything here.

### Why POWER rainfall is not the label

NASA POWER `PRECTOTCORR` is not homogeneous over 1981–2025 — the product's sources changed.
Measured at Tangail (24.2514, 89.9152), annual totals average **937 mm in 1981–1996, 1714 mm in
1997–2015 and 2814 mm in 2016–2025**. So:

* the shipped arm labels rainfall and measures the pre-monsoon rain anomaly with **GPM IMERG**,
  whose annual totals at the same points show no step (Pettitt test in every pack's `crossCheck`;
  no district has an IMERG change point inside 2001–2025);
* a second arm does both with **POWER, restricted to 2001–2025**, reported beside the first;
* POWER still supplies temperature, humidity and root-zone moisture in both arms, as anomalies
  against each fold's own climatology; the residual reanalysis-inhomogeneity risk is stated in
  the payload (`sources.power_weather_note`).

## Onset label

The deterministic **v2** rule in `src/compute/onset.py`: the first wet day in DOY 121–270
whose 5-day rainfall reaches that point's own mean 5-day June–September accumulation over
2001–2025, with no 10-day period under 5 mm in the following 30 days — adapted from the
Moron & Robertson (2014) family of definitions. A year where no day qualifies is **absent**;
nothing is substituted.

## Features, and what the 25 April issue date forbids

| Feature | Definition | Available by 25 April |
| --- | --- | --- |
| `rain_anom_mar_apr` | IMERG rainfall summed 1 Mar – 20 Apr, minus the fold climatology | yes — the window closes 5 days before issue |
| `t2m_anom`, `t2m_max_anom`, `rh2m_anom` | POWER means over the same window, as anomalies | yes |
| `gwetroot_eow_anom` | mean GWETROOT over 16–20 Apr, as an anomaly | yes |
| `prior_onset_anom` | last season's onset minus this row's onset baseline | yes — observed by April |
| `nino34_djf`, `nino34_fma` | MERRA-2 Niño 3.4 at its January and March centres | yes |
| `dmi_feb_mar` | MERRA-2 DMI averaged over February and March | yes — nothing from April is read |
| `lat`, `lon` | the point's coordinates | not time-dependent |

A year whose window is incomplete, or that has any missing day inside it, becomes NaN rather
than a short sum.

**Timing note:** the v2 window opens at DOY 121 — 1 May 2026, six days after the issue date. This
is a *nowcast at the edge of the season*, not a seasonal forecast (`issue_before_onset`).

### Leakage controls

1. **Fold-local climatology.** Every weather anomaly is measured against a climatology built
   inside the current fold from its training years only (`FoldClimatology`, which raises
   `LeakageError` for any request outside the fold).
2. **No row informs its own baseline.** For a training year, both the weather baseline and the
   onset baseline (`onset_baseline`) drop that year, so the anomaly target never contains its
   own label.
3. **Whole-year holdout.** Leave-one-year-out removes all 64 districts of a year at once.
4. **The target year's label is never an input.** Only `year − 1` is read as the prior season.
5. **Inner CV sees training years only.** Shrinkage and the conformal band come from a 5-fold,
   year-grouped split *inside* each outer fold's training years.
6. **Farms never train.** A demo farm borrows its district's onset history; training is
   restricted to the 64 district points.
7. **The index anomaly base is fixed (1991–2020)**, as for every published ONI: one constant per
   calendar month shared by all years, so it carries no information about a held-out year.

## Model

* **Target:** onset anomaly `y − base`, where `base` is the district's mean onset over the fold's
  training years (own year excluded for training rows). Prediction = `base + s · f(x)`.
* **f:** LightGBM regression with fixed, a-priori hyper-parameters — `num_leaves=7`, `max_depth=3`,
  `learning_rate=0.03`, `min_data_in_leaf=80`, `lambda_l2=10`, `feature_fraction=0.8`, 150 rounds,
  `num_threads=1`, `deterministic=true`, seed 0. No tuning loop (one would leak the folds).
* **s (shrinkage):** out-of-fold predictions from the inner year-grouped 5-fold give MAE for
  `s ∈ {0, 0.1, …, 1}`; `s` is the smallest value within one standard error (over years) of the
  best — Breiman's one-SE rule — so a flat, noisy curve stays at 0.
* **Interval:** the 10th/90th percentiles of those inner out-of-fold residuals (after shrinkage),
  added to the point prediction — a split-conformal band with years as the exchangeable unit.

## Backtest

`scripts/build_onset_ml.py`, 64 districts, leave-one-year-out, real NASA data (model
`onset-ml-v3`; full numbers in `src/compute/ml/metrics.json`):

| Arm | Years | Folds | District-years | MAE model (d) | MAE climatology (d) | Skill | RMSE (d) | 80 % coverage | Mean shrink | Role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GPM IMERG labels | 1998–2025 | 28 | 1792 | 10.73 | 10.73 | **0.000** | 14.06 | **0.803** | 0.00 | shipped arm |
| POWER labels, restricted | 2001–2025 | 25 | 1600 | 13.20 | 13.20 | 0.000 | 16.46 | 0.814 | 0.00 | comparison arm |

Against the stricter comparators in the shipped arm: **12.98 d** for the mean of the two and three
seasons back (climatology's skill over it +0.173) and **14.80 d** for "last season again" (+0.275).
The long-run district mean is the hardest baseline to beat here, and neither persistence rule
comes close to it.

**Before the guard (same data, no shrinkage):** the anomaly model alone scored MAE 11.75 d vs
10.73 d (skill −0.095) in the IMERG arm and −0.131 in the POWER arm — the learned corrections were
noise, which is exactly what the inner CV detects. With the arg-min shrinkage rule (before the
one-SE rule) the skill was −0.003; with one-SE it is 0.000 in every fold.

### Where the variance sits

In the IMERG labels, district *means* differ by **5.1 days** (SD of the 64 district means, DOY
127–148), while the year-to-year spread *inside* one district is **13.3 days**. Climatology captures
the first for free; the second is what the April predictors would have to explain, and on 28 years
they do not — permutation importance is 0.000 days for every feature because the shipped forecast
does not use them.

### The 2026 season itself

2026 was in no training fold, and the v2 rule can already confirm an onset in all 64 districts in
the IMERG record (DOY 121–189). Against those observations the forecast (= climatology) has MAE
19.0 d, bias −16.0 d (observed onsets *later* than climatology), and 40 / 64 districts inside the
80 % band. **Caveat, measured:** POWER's IMERG store marks the variable `status: reviewing`, and its
most recent months come from IMERG's near-real-time runs until the gauge-adjusted Final run replaces
them. 2026 Apr–May IMERG totals are unusually low against MERRA-2 (Tangail 284 vs 737 mm, a ratio of
0.39 against 0.5–0.8 in 2021–2025), and the CHIRPS-based v2 build had found 2026 an *early* season.
The single-season check is reported (`out_of_sample`) and should be re-run once IMERG Final covers
2026; it is not evidence of skill either way.

## Per-prediction contributions

The payload still carries three exact tree-SHAP contributions per point (`pred_contrib=True`),
scaled by the shrinkage — so with `s = 0` they are all 0 days, and the card replaces the "what moved
this prediction" list with the plain statement that the correction is switched off.

## Design notes

* **Same-source labels and features.** Labels and the rainfall feature both come from IMERG, so the
  backtest measures how well April predicts *this product's* onset rule.
* **One grid cell stands in for a district and for a farm** (0.1° IMERG cell; published per point as
  `imerg_cells`).
* **UTC vs local day.** IMERG is aggregated to the UTC day, MERRA-2 to local solar time; the two are
  never mixed inside one statistic, and onset uses 5-day sums, which damp the 6-hour offset.
* **Scope.** The outlook predicts the rainfall rule, not a planting date; the rotation engine keeps
  the district mean as its onset baseline and is unaffected by the model.
* Demo farms are illustrative. This is a NASA Space Apps Challenge project — **not an official NASA
  product**, and not agricultural advice.

## Next phase

* Predictors with a physical lead on onset that April can see: NASA SMAP L4 root-zone moisture,
  MERRA-2 low-level winds / moisture flux over the Bay of Bengal, and MODIS land-surface temperature.
* A probabilistic target (onset before/after the district median) scored with the Brier skill score,
  which is a fairer test of a weak signal than MAE.
* Re-run the 2026 check on IMERG Final; add JAXA GSMaP as a second partner rainfall label.

## Rebuilding

```
POWER_BACKEND=s3 python scripts/build_onset_ml.py      # backtest + outlook, ~3 min, public AWS data
```

`--limit`, `--years` and `--rounds` shrink a run for smoke testing. Outputs:
`src/compute/ml/metrics.json` (both arms) and `web/public/data/onset_outlook.json`.
