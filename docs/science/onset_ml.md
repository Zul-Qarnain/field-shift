# Onset ML outlook

A build-time experiment: can the *date* of Bangladesh's usable-rainfall onset be predicted
in April, from what April already knows? It is trained and scored offline; the browser only
reads the JSON it writes. Nothing in the app runs a model.

**Status: built and shown in the app** as the "Machine-learning monsoon forecast" card on every
farm page. On the leave-one-year-out backtest its mean error is above that of each district's own
mean onset, so the payload's internal `status` field is `experimental` (the rule in
[Backtest](#backtest)), the card prints both errors side by side, and the rotation engine keeps
the district mean as its onset baseline. The numbers are in [Backtest](#backtest) and in
`src/compute/ml/metrics.json`.

## Data

| Input | Product | Where it is used |
| --- | --- | --- |
| Onset labels + pre-monsoon rainfall | CHIRPS v2.0 daily, 0.25° — Climate Hazards Center, UCSB; Funk et al. 2015, *Sci. Data* 2:150066 | the `onset_doy` label and the `rain_anom_mar_apr` feature, every year 1981–2025 |
| Temperature, humidity, root-zone moisture | NASA POWER daily point series (AG community) | `t2m_anom`, `t2m_max_anom`, `rh2m_anom`, `gwetroot_eow_anom` |
| ENSO | NOAA PSL ONI (3-month running mean of ERSSTv6 Niño 3.4) | `oni_djf`, `oni_fma` |
| IOD | NOAA PSL DMI (HadISST1.1) | `dmi_feb_mar` |
| Places | geoBoundaries BGD ADM2 centroids (64 districts) via `src/acquire/districts.py`; the six demo farms from `web/lib/data.ts` | the feature grid points |

Retrieval times are recorded per source in the payload (`data_sources.*.retrieved_utc`,
plus `sources.chirps_retrieved`, which separates the training-year files from the outlook-year
file). The 1981–2025 CHIRPS Bangladesh boxes were pulled by the reviewer's fetch script; the
2026 box was pulled in this worktree by `scripts/fetch_chirps_2026.py`, which stores its own
`retrieved_utc` in the file. CHIRPS is a 0.25° grid: a point's value is its **nearest cell**,
not a station reading.

### Why POWER rainfall is not the label

NASA POWER `PRECTOTCORR` is not homogeneous over 1981–2025 — the product's sources changed.
Measured from the cached series at Tangail (24.2514, 89.9152), annual totals average
**937 mm in 1981–1996, 1714 mm in 1997–2015 and 2814 mm in 2016–2025**. An anomaly taken
against a 45-year climatology built on that series would be measuring the product switch,
not the monsoon.

So, applied rather than discussed:

* the shipped arm labels rainfall and measures the pre-monsoon rain anomaly with **CHIRPS**;
* a second arm does both with **POWER, restricted to 2001–2025**, and is reported beside the
  first so the reader can see what the source choice costs;
* POWER still supplies temperature, humidity and root-zone moisture in both arms. Those are
  physical quantities without the rainfall jump, but they come from a reanalysis-merged
  product too; the residual inhomogeneity risk is stated in the payload
  (`sources.power_weather_note`) instead of being assumed away.

## Onset label

The deterministic **v2** rule in `src/compute/onset.py`: the first wet day in DOY 121–270
whose 5-day rainfall reaches that point's own mean 5-day June–September accumulation over
2001–2025, with no 10-day period under 5 mm in the following 30 days — adapted from the
Moron & Robertson (2014) family of definitions. A year where no day qualifies is **absent**
from the series; nothing is substituted, and the coverage test means a truncated year cannot
be scored at all.

## Features, and what the 25 April issue date forbids

The outlook is issued on **25 April**. A feature may only use information that existed then:

| Feature | Definition | Available by 25 April |
| --- | --- | --- |
| `rain_anom_mar_apr` | CHIRPS rainfall summed 1 Mar – 20 Apr, minus the fold climatology | yes — the window closes 5 days before issue |
| `t2m_anom`, `t2m_max_anom`, `rh2m_anom` | POWER means over the same window, as anomalies | yes |
| `gwetroot_eow_anom` | mean GWETROOT over the window's last 5 days (16–20 Apr), as an anomaly | yes |
| `prior_onset_doy` | this district's onset in the previous year | yes — observed by April |
| `oni_djf`, `oni_fma` | ONI at its January and March centres (Dec–Feb, Feb–Apr) | yes |
| `dmi_feb_mar` | DMI averaged over February and March | yes — nothing from April is read |
| `lat`, `lon` | the point's coordinates | not time-dependent |

A year whose window is incomplete, or that has any missing day inside it, becomes NaN rather
than a short sum, so a gap cannot quietly flatter the climatology.

**Timing caveat, stated plainly:** the v2 window opens at DOY 121 — 1 May 2026, six days
after the issue date. In some districts the real onset lands within days of the outlook being
issued. This is a *nowcast at the edge of the season*, not a seasonal forecast; the payload
carries the same note (`issue_before_onset`).

### Leakage controls

1. **Fold-local climatology.** Every anomaly is measured against a climatology built inside
   the current fold from its training years only. `FoldClimatology` remembers the years it
   was built from and raises `LeakageError` for a baseline request outside the fold.
2. **A training row does not inform its own baseline.** For a training year the baseline
   drops that year as well, so neither test nor train rows can pull their own weather into
   the mean they are compared against. This matters because the anomaly *is* the feature.
3. **Whole-year holdout.** Leave-one-year-out removes **all 64 districts of a year at once**.
   Districts in the same year share one monsoon; splitting by district-year would let the
   model memorise the season.
4. **The target year's label is never an input.** Only `year − 1` is read from the onset
   series, and the outlook year is never labelled in the training path.
5. **Features are the model's entire input.** Year, district, label and baseline columns sit
   outside the feature frame — asserted in `tests/test_onset_ml.py`.
6. **Farms never train.** A demo farm borrows its district's onset history for the prior-year
   and baseline columns; feeding that back in as a training row would count the district's
   label twice, so training is restricted to the 64 district points.

## Model

LightGBM gradient boosting with **fixed** hyper-parameters — no tuning loop, and nothing
tuned inside a fold either: `num_leaves=15`, `learning_rate=0.05`, `min_data_in_leaf=25`,
`feature_fraction=0.9`, 250 rounds, `num_threads=1`, `deterministic=true`, seed 0.

Three heads per fold: a conditional mean (`objective=regression`) and two quantile heads
(`objective=quantile`, α = 0.1 and α = 0.9) that give the interval. NaN features are handled
natively by LightGBM's tree construction, so a district-year with a gap is dropped by the
label rule rather than imputed with a plausible-looking number.

The baseline to beat is each district's **mean onset over the fold's training years** — the
same climatology the deterministic part of the app already shows. Because `prior_onset_doy`
is a feature, two stricter comparators are reported too: the district's mean of the two
seasons before the one predicted, and last season's onset itself.

## Backtest

`scripts/build_onset_ml.py`, 64 districts, leave-one-year-out, real data
(model `onset-ml-v2`; full numbers in `src/compute/ml/metrics.json`):

| Arm | Years | Folds | District-years | MAE model (d) | MAE climatology (d) | Skill | RMSE (d) | 10–90 coverage | Years won | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CHIRPS labels (shipped arm) | 1981–2025 | 45 | 2880 | 11.59 | 10.04 | **−0.155** | 15.07 | 0.55 | 12 / 45 (26.7 %) | experimental |
| POWER labels, restricted | 2001–2025 | 25 | 1600 | 14.97 | 13.20 | −0.134 | 18.65 | 0.40 | 9 / 25 (36.0 %) | experimental |

Against the stricter baselines in the shipped arm: **11.99 d** for the two-season mean
(skill +0.033 over 2752 district-years) and **13.31 d** for last season on its own
(skill +0.129). 64 district-years have no prior-season onset to use — the first year of the
record in each fold's past.

So the model beats *repeating last year*, and edges past the two-season mean, but it is
**worse than the district's long-run mean** — which is the baseline the app's own onset
display already uses. The decision rule is applied to the CHIRPS arm's headline skill, so
the payload status is `experimental`; the card (since v1.5, 9 Oct 2026) presents the forecast as
built, under the heading "Machine-learning monsoon forecast", and prints the model's and the
district mean's errors side by side without claiming either way.

### What the features actually rank

Permutation importance on the held-out years (mean increase in days of MAE when one column is
shuffled inside the fold), shipped arm, top three: **`lon`, `t2m_max_anom`,
`prior_onset_doy`**. Full ranking in `metrics.json` under `variants.chirps.importance`.

The variance in the labels says where the problem is. Across the 2880 labelled district-years
the onset of a district's *mean* differs between districts by only **5.8 days** (SD of the 64
district means, which range DOY 127–154), while the year-to-year scatter *inside* one district is
**13.0 days**. So most of what there is to predict is the part that changes from year to year,
and the columns that rank highest say *where* rather than *when*: `lon` and `lat` are the district
itself, and `prior_onset_doy` is that district's own recent history. Geography is the smaller
share of the variance, and it is the share the baseline already has. The model spends its capacity
on the easy part and adds noise to the hard part, so the climatology — which is exactly and only
the easy part — wins.

The year-by-year view says the same thing: the model beats the climatology in only **12 of 45**
held-out years (9 of 25 in the POWER arm).

Coverage of 0.55 against a nominal 0.80 says the same thing from the other side: the quantile
heads are under-dispersed, so the "10–90 range" in the app should be read as the model's own
spread, not as an 80 % confidence statement.

### The 2026 season itself

2026 was in no training fold, and by the time this was built the v2 rule could already confirm
an onset in all 64 districts (earliest DOY 122, latest 181). Scoring the April prediction
against those observations gives, in the shipped arm:

| | MAE vs observed 2026 | Bias | Interval hit |
| --- | --- | --- | --- |
| Model | 4.34 d | −1.67 d (too early) | 60 / 64 |
| District climatology | 4.71 d | −0.88 d | — |

One season of apparent skill (+0.078 against the climatology) next to 45 folds of negative
skill (−0.155) is exactly why the single-year number is reported as a check and not as
evidence: 2026 was an early, spatially orderly monsoon, which is the case the district
geography handles well. The payload carries the same table as `out_of_sample`.

## Per-prediction contributions

For each district and each demo farm the payload carries three contributions computed with
LightGBM's `pred_contrib=True` — **exact tree SHAP values**, not an approximation and not a
permutation ablation. They are in days relative to the model's base value, and they sum to
the prediction together with that base value (asserted in `tests/test_outlook.py`).

2026 is out-of-sample by construction: it is in no training fold. Whether its onset is
already confirmable under the v2 rule is stated per point in `observed_notes`; where the
record is too short for the rule's 30-day break check, the outlook says "not confirmable
yet" rather than reporting a monsoon that failed to arrive.

## Limitations

* **Same-source labels and features.** Onset labels and the rainfall feature both come from
  CHIRPS. The backtest therefore measures how well April's weather predicts *this product's*
  onset rule. No independent cross-check against a third rainfall dataset (IMERG, APHRODITE,
  station records) has been run.
* **POWER weather anomalies** carry the same reanalysis-merged inhomogeneity risk as its
  rainfall; using anomalies against a fold climatology limits that but does not remove it.
* **The v2 rule itself is unverified.** It is defined on the same series it is scored on.
* **One grid cell stands in for a district and for a farm.** A district is not its area, and
  a farm is its nearest 0.25° cell. The cell actually read for every point is published in
  the payload as `chirps_cells`, so the substitution is visible rather than implied.
* **Farms borrow their district's onset history** for the prior-year feature and the
  baseline; only their pre-monsoon rainfall is their own.
* **64 district-years per year are not independent** — they share one monsoon. That is why
  the split is by year and why "years won" is reported next to the pooled MAE.
* **No local agronomy.** The outlook predicts the rainfall rule, not a planting date; the
  engine's onset penalty is a separate, deterministic thing.
* Demo farms and everything else on the page remain fixtures. This is a research artifact
  built for the NASA Space Apps Challenge — **not an official NASA product**, and not advice.

## Rebuilding

```
/workspace/fs-venv/bin/python scripts/fetch_chirps_2026.py   # real CHIRPS download (one-off)
/workspace/fs-venv/bin/python scripts/build_onset_ml.py      # backtest + outlook, ~2.5 min
```

`--limit`, `--years` and `--rounds` shrink a run for smoke testing. Outputs:
`src/compute/ml/metrics.json` (this module's own metrics, both arms) and
`web/public/data/onset_outlook.json`. The data pipeline's pack builder and
`web/public/data/packs/` are not touched by anything here.
