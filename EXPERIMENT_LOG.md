# Experiment Log — Field Shift ML (onset outlook)

Discipline: every entry = config, data version, seed, validation scheme, metrics, decision. No tuning against the backtest.

## Baseline recorded (shipped code, v3)
- Date: 2026-10-31 (metrics.json in repo).
- Model: LightGBM, fixed hyperparameters (num_leaves 7, max_depth 3, lr 0.03, min_data 80, L2 10, feature_fraction 0.8, seed 0, deterministic).
- Target: onset anomaly vs per-fold district climatology (v2 onset rule labels).
- Validation: leave-one-year-out over 1998–2025 (28 folds) for IMERG arm; 2001–2025 (25 folds) for POWER arm.
- Metrics (IMERG primary): MAE model 10.73 d = MAE climatology 10.73 d → skill 0.000; RMSE 14.06; conformal 10–90 % coverage 0.803; years beating climatology 0/28; vs 2–3 season mean: MAE 12.98, skill +0.173; vs last-season: MAE 14.80, skill +0.275.
- Shrinkage factor = 0 in all folds → model adds nothing; status = validating (not shipped).
- Interpretation: honest null; features do not beat district climatology out-of-sample on this data. Not an artifact of the split (LOYO, features rebuilt per fold, baselines train-only).

## Open questions (next experiments — Kaggle)
1. Feature timing/domain: is Mar–Apr pre-monsoon rainfall anomaly + prior onset + Nino34/DMI the right information set? Try longer pre-monsoon windows, April SST, daily-resolution accumulation variants.
2. Same-source label/feature coupling: labels & rainfall feature both from IMERG — product jumps may cancel signal. Test POWER-label/POWER-feature arm (already exists, 2001–2025) and cross-product combos.
3. Sample size: 28 years × 64 districts but effective per-district years small; district-identity confounding risk. Consider spatial pooling / hierarchical model.
4. Alternative targets: onset probability, dry-spell risk, wet-season duration — more decision-relevant than one DOY.
5. Baselines to beat: climatology (10.7 d) and 2–3-season mean (13.0 d) and last-season persistence (14.8 d).

## Decisions
- Any candidate model must beat climatology AND the stricter baselines in LOYO, with honest conformal coverage, before shipping.
- Never select by training accuracy; no randomized split on time series.
