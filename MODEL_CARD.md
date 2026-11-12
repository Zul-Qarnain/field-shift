# Model Card — Monsoon Onset Outlook (Field Shift)

- Name: onset-ml-v3 (LightGBM).
- Task: predict district monsoon-onset day-of-year anomaly vs district climatology; conformal 10–90 % interval.
- Inputs (all NASA / NASA-partner): GPM IMERG V07 daily (labels + pre-monsoon rainfall), NASA POWER/MERRA-2 daily (T2M, T2M_MAX, RH2M, GWETROOT), Niño 3.4 & DMI from MERRA-2 (src/acquire/indices.py), lat/lon.
- Training: 1998–2025 IMERG arm (28 years, 64 districts), 2001–2025 POWER arm.
- Validation: leave-one-year-out (whole years held out; district-years in same year not independent — no random split).
- Regularization: shrink correction toward climatology by factor chosen on inner OOF (1-SE rule); conformal residuals from inner 5-fold year-grouped split.
- Metrics (primary arm): MAE 10.73 d = climatology; skill 0.0; coverage 0.803.
- Status: **validating — not shipped.** The forecast UI uses climatology (honest fallback) until a model beats it.
- Explainability: permutation importance in-fold (all zero at shrink 0, correctly).
- Determinism: fixed seed, deterministic=true; reproducible.
- Limits: small sample; same-source label/feature coupling; product inhomogeneity in POWER precipitation (Pettitt 2016) documented and handled by era caution text.
