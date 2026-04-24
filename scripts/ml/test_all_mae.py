import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
X = build_feature_matrix(cases)
y = build_label_arrays(cases)

c_50k, _ = train_test_split(cases, train_size=50000, random_state=42)
X_50k = build_feature_matrix(c_50k)
y_50k = build_label_arrays(c_50k)

def test_model(target, name):
    strat = y_50k['y_path_recommended']
    X_tr, X_te, y_tr, y_te = train_test_split(X_50k, y_50k[target], test_size=0.2, random_state=42, stratify=strat)
    
    model = GradientBoostingRegressor(
        n_estimators=200, max_depth=5, learning_rate=0.05,
        subsample=0.8, min_samples_leaf=20, random_state=42,
        validation_fraction=0.1, n_iter_no_change=15, tol=1e-4
    )
    model.fit(X_tr, y_tr)
    preds = model.predict(X_te)
    mae = mean_absolute_error(y_te, preds)
    print(f"{name} MAE: {mae:.2f}")

test_model('y_duration_collab', 'collab_duration')
test_model('y_cost_collab', 'collab_cost')
test_model('y_duration_med', 'med_duration')
test_model('y_cost_med', 'med_cost')
test_model('y_duration_court', 'court_duration')
test_model('y_cost_court', 'court_cost')
