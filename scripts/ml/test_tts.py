import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
X_full = build_feature_matrix(cases)
y_full = build_label_arrays(cases)

X_50k, _, y_50k_dur, _ = train_test_split(X_full, y_full['y_duration_collab'], train_size=50000, random_state=42)

X_tr, X_te, y_tr, y_te = train_test_split(X_50k, y_50k_dur, test_size=0.2, random_state=42)

model = GradientBoostingRegressor(
    n_estimators=200, max_depth=5, learning_rate=0.05,
    subsample=0.8, min_samples_leaf=20, random_state=42,
    validation_fraction=0.1, n_iter_no_change=15, tol=1e-4
)
model.fit(X_tr, y_tr)
preds = model.predict(X_te)
mae = mean_absolute_error(y_te, preds)
print(f"train_test_split 50k MAE: {mae:.2f}")

