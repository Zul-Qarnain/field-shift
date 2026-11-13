"""Kaggle Experiment Driver — Monsoon Onset Outlook LOYO Backtest.

Reproducible script for Kaggle CLI model training and experimental validation.
Tests Phase 6 ablations under Leave-One-Year-Out (LOYO) cross-validation (1998–2025, 28 folds).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))

import numpy as np
import pandas as pd

from src.compute.ml import dataset as D
from src.compute.ml import features as F
from src.compute.ml import onset_ml as M


def run_experiment(name: str, params: dict[str, Any], feature_set: list[str]) -> dict[str, Any]:
    print(f"\n==========================================")
    print(f"Running Experiment: {name}")
    print(f"Features: {feature_set}")
    print(f"Params: {params}")
    print(f"==========================================")

    # Load dataset
    ds = D.load_or_build(primary="imerg")
    years = ds.years
    n_years = len(years)

    oof_preds = []
    oof_clims = []
    oof_actuals = []
    years_beating_clim = 0
    fold_maes = []
    fold_clim_maes = []

    for holdout_year in years:
        train_years = [y for y in years if y != holdout_year]
        train_df = ds.df[ds.df["year"].isin(train_years)]
        test_df = ds.df[ds.df["year"] == holdout_year]

        if test_df.empty:
            continue

        # Build fold climatology
        clim_map = train_df.groupby("district")["onset_doy"].mean().to_dict()
        test_actual = test_df["onset_doy"].to_numpy()
        test_clim = test_df["district"].map(clim_map).to_numpy()

        # Train model
        X_train = train_df[feature_set]
        y_train = train_df["onset_doy"].to_numpy() - train_df["district"].map(clim_map).to_numpy()
        X_test = test_df[feature_set]

        import lightgbm as lgb
        train_data = lgb.Dataset(X_train, label=y_train)
        gbm = lgb.train(params, train_data, num_boost_round=params.get("num_boost_round", 50))

        pred_anomaly = gbm.predict(X_test)
        pred_onset = test_clim + pred_anomaly * 0.44  # shrinkage

        mae_model = float(np.mean(np.abs(test_actual - pred_onset)))
        mae_clim = float(np.mean(np.abs(test_actual - test_clim)))

        fold_maes.append(mae_model)
        fold_clim_maes.append(mae_clim)

        if mae_model < mae_clim:
            years_beating_clim += 1

        oof_preds.extend(pred_onset)
        oof_clims.extend(test_clim)
        oof_actuals.extend(test_actual)

    overall_mae_model = float(np.mean(np.abs(np.array(oof_actuals) - np.array(oof_preds))))
    overall_mae_clim = float(np.mean(np.abs(np.array(oof_actuals) - np.array(oof_clims))))
    overall_rmse = float(np.sqrt(np.mean((np.array(oof_actuals) - np.array(oof_preds)) ** 2)))
    skill_vs_clim = (overall_mae_clim - overall_mae_model) / overall_mae_clim

    results = {
        "experiment": name,
        "n_years": n_years,
        "overall_mae_model": round(overall_mae_model, 4),
        "overall_mae_clim": round(overall_mae_clim, 4),
        "overall_rmse": round(overall_rmse, 4),
        "skill_vs_clim": round(skill_vs_clim, 5),
        "years_beating_clim": f"{years_beating_clim} / {n_years} ({years_beating_clim / n_years * 100:.1f}%)",
    }
    print("Results:", json.dumps(results, indent=2))
    return results


if __name__ == "__main__":
    local_features = M.LOCAL_FEATURE_NAMES
    base_params = {
        "objective": "regression_l1",
        "num_leaves": 5,
        "max_depth": 2,
        "learning_rate": 0.03,
        "min_data_in_leaf": 120,
        "lambda_l2": 30.0,
        "feature_fraction": 0.8,
        "num_boost_round": 50,
        "seed": 0,
        "deterministic": True,
        "verbose": -1,
    }
    res = run_experiment("shipped_onset_v3_reproducibility", base_params, local_features)
