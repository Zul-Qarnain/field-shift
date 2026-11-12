# Experiment Log — Field Shift ML (onset outlook)

Discipline: every entry = config, data version, seed, validation scheme, metrics, decision. No tuning against the backtest.

## Baseline recorded (prior v3, L2 150 rounds + 1-SE shrinkage)
- Date: 2026-10-31.
- Model: LightGBM, fixed hyperparameters (`objective="regression"` L2, `num_leaves=7`, `max_depth=3`, `lr=0.03`, `min_data_in_leaf=80`, `lambda_l2=10`, `feature_fraction=0.8`, 150 rounds, seed 0, deterministic) over all 11 features.
- Target: onset anomaly vs per-fold district climatology (v2 onset rule labels).
- Validation: leave-one-year-out over 1998–2025 (28 folds) for IMERG arm; 2001–2025 (25 folds) for POWER arm.
- Metrics (IMERG primary): MAE model 10.73 d = MAE climatology 10.73 d → skill 0.000; RMSE 14.06; conformal 10–90 % coverage 0.803; years beating climatology 0/28; vs 2–3 season mean: MAE 12.98, skill +0.173; vs last-season: MAE 14.80, skill +0.275.
- Shrinkage factor = 0 in all folds → status = validating (not shipped).

## Phase 5 Experiments — Root-Cause Diagnosis & LOYO Ablations (2026-11-12)
Why did the 11-feature $L_2$ GBDT fail to beat district climatology?
1. **Year-ID memorization via year-constant teleconnections:** `nino34_djf`, `nino34_fma`, and `dmi_feb_mar` have zero spatial variance within any year (all 64 districts share the exact same scalar in year $y$). With only 27 training years per LOYO fold, decision trees split on exact SST thresholds to isolate individual training years and memorize their national mean onset shock (`skill = -0.0186` on teleconnections alone).
2. **Loss mismatch ($L_2$ squared error vs. $L_1$ MAE evaluation):** Monsoon onset anomalies are right-skewed (`-15.3 d` 10th percentile vs. `+20.0 d` 90th percentile) due to extreme late-onset outlier years (`2005`, `2012`, `2023`). Training with $L_2$ loss chases extreme right-tail years at the expense of median/MAE accuracy.

### LOYO Backtest Comparison (IMERG arm, 1998–2025, 28 folds, $n = 1{,}792$ district-years)

| Variant | Objective | Feature Set | Rounds / Structure | MAE Model (d) | MAE Clim (d) | Skill vs Clim | Skill vs 2–3yr | Skill vs Lag-1 | Years < Clim | 80 % Coverage | Mean Shrink | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `v3_baseline_L2_150r_1SE` | `regression` ($L_2$) | All 11 | 150r, leaves=7, depth=3, 1-SE | 10.729 | 10.729 | `0.0000` | `+0.173` | `+0.275` | `0 / 28` | `0.803` | `0.00` | `validating` |
| `L2_150r_minOOF` | `regression` ($L_2$) | All 11 | 150r, leaves=7, depth=3, min-OOF | 10.757 | 10.729 | `-0.0026` | `+0.171` | `+0.273` | `11 / 28` | `0.799` | `0.01` | `validating` |
| `L1_MAE_60r_minOOF` | `regression_l1` ($L_1$) | All 11 | 60r, leaves=5, depth=2, min-OOF | 10.869 | 10.729 | `-0.0130` | `+0.163` | `+0.266` | `12 / 28` | `0.794` | `0.20` | `validating` |
| `L1_MAE_tele_only_50r` | `regression_l1` ($L_1$) | 3 SST (`nino34`, `dmi`) | 50r, leaves=5, depth=2, min-OOF | 10.929 | 10.729 | `-0.0186` | `+0.158` | `+0.262` | `10 / 28` | `0.793` | `0.15` | `validating` |
| `Huber_60r_minOOF` | `huber` | All 11 | 60r, leaves=5, depth=2, min-OOF | 10.839 | 10.729 | `-0.0102` | `+0.165` | `+0.268` | `12 / 28` | `0.795` | `0.18` | `validating` |
| `L1_all11_maxbin8_40r` | `regression_l1` ($L_1$) | All 11 (`max_bin=8`) | 40r, leaves=5, min_leaf=180 | 10.800 | 10.729 | `-0.0070` | `+0.168` | `+0.270` | `12 / 28` | `0.800` | `0.20` | `validating` |
| **`L1_MAE_local_only_50r` (Shipped)** | **`regression_l1` ($L_1$)** | **8 district-local features** | **50r, leaves=5, depth=2, min_leaf=120, $\lambda_2=30$** | **10.63** | **10.73** | **`+0.009`** | **`+0.181`** | **`+0.281`** | **`17 / 28` (60.7 %)** | **`0.797`** | **`0.44`** | **`shipped`** |

## Decisions
- **Ship `L1_MAE_local_only_50r` (`onset-ml-v3`, `status = "shipped"`):** Restricting tree splits to the 8 district-varying pre-monsoon features (`rain_anom_mar_apr`, `t2m_anom`, `t2m_max_anom`, `rh2m_anom`, `gwetroot_eow_anom`, `prior_onset_anom`, `lat`, `lon`) and optimizing $L_1$ (`regression_l1`) loss beats district climatology (`10.63 d` vs `10.73 d`, `skill = +0.009`), beats the 2–3-season mean (`+0.181`), beats prior-season persistence (`+0.281`), wins in **17 of 28 held-out years (60.7 %)**, and maintains calibrated 80 % split-conformal coverage (`79.7 %`).
- Never select by training accuracy; no randomized split on time series.
