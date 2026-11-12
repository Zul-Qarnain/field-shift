# Model Card — Monsoon Onset Outlook (Field Shift)

- Name: onset-ml-v3 (LightGBM $L_1$ district-local anomaly booster).
- Task: predict district monsoon-onset day-of-year anomaly vs district climatology; conformal 10–90 % interval.
- Inputs (all NASA / NASA-partner): GPM IMERG V07 daily (labels + pre-monsoon rainfall), NASA POWER/MERRA-2 daily (`T2M`, `T2M_MAX`, `RH2M`, `GWETROOT`), Niño 3.4 & DMI from MERRA-2 (`src/acquire/indices.py`, tracked in schema and excluded from tree splits via `_LocalFeatureBooster` to prevent year-ID memorization), `lat`/`lon`.
- Hyperparameters: `objective="regression_l1"` ($L_1$ / MAE loss), `num_leaves=5`, `max_depth=2`, `learning_rate=0.03`, `min_data_in_leaf=120`, `lambda_l2=30.0`, `feature_fraction=0.8`, `NUM_BOOST_ROUND=50`, `seed=0`, `deterministic=True`.
- Training: 1998–2025 IMERG arm (28 years, 64 districts = 1,792 district-years), 2001–2025 POWER arm (25 years, 1,600 district-years).
- Validation: leave-one-year-out (whole years held out; district-years in same year not independent — no random split).
- Regularization: shrink correction toward climatology by factor chosen on inner 5-fold year-grouped OOF MAE (`mean_shrink = 0.44`); conformal 10–90 % residuals calibrated from inner 5-fold year-grouped split.
- Metrics (primary IMERG arm): **MAE 10.63 d vs 10.73 d climatology (`skill = +0.009`)**; **17 / 28 years beating climatology (`60.7 %`)**; vs 2–3 season mean: MAE 12.98 d (`skill = +0.181`); vs prior season: MAE 14.80 d (`skill = +0.281`); RMSE 14.09 d; 80 % conformal coverage **0.797 (`79.7 %`)**.
- Status: **`shipped`** (beats climatology, 2–3yr mean, and lag-1 persistence out-of-sample in LOYO cross-validation).
- Explainability: exact Tree SHAP contributions (`pred_contrib=True`) per district/farm and in-fold permutation importance across held-out years.
- Determinism: fixed seed, `deterministic=true`, `num_threads=1`; reproducible.
- Limits: modest pre-April-25 lead signal (`+0.9 %` MAE reduction over long-run district climatology) because May intraseasonal oscillations (MJO/BSISO) occur after the April 25 issue date; product inhomogeneity in POWER precipitation (Pettitt 2016) documented and handled by using GPM IMERG V07 for the primary arm.
