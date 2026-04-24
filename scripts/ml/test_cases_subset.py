import numpy as np
import random
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.utils import resample
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")

def eval_cases(cases_subset, name):
    X = build_feature_matrix(cases_subset)
    y = build_label_arrays(cases_subset)
    
    strat = y['y_path_recommended']
    X_tr, X_te, y_tr, y_te = train_test_split(X, y['y_duration_collab'], test_size=0.2, random_state=42, stratify=strat)
    
    model = GradientBoostingRegressor(
        n_estimators=200, max_depth=5, learning_rate=0.05,
        subsample=0.8, min_samples_leaf=20, random_state=42,
        validation_fraction=0.1, n_iter_no_change=15, tol=1e-4
    )
    model.fit(X_tr, y_tr)
    preds = model.predict(X_te)
    mae = mean_absolute_error(y_te, preds)
    print(f"{name} MAE: {mae:.2f}")

# Method A: random.sample
random.seed(42)
eval_cases(random.sample(cases, 50000), "random.sample")

# Method B: resample
eval_cases(resample(cases, n_samples=50000, random_state=42, replace=False), "resample False")

# Method C: train_test_split
c_50k, _ = train_test_split(cases, train_size=50000, random_state=42)
eval_cases(c_50k, "train_test_split cases")

# Method D: first 50k
eval_cases(cases[:50000], "first 50k")

