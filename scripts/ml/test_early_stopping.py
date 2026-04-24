import numpy as np
import json
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays, get_train_test_split

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
X_full = build_feature_matrix(cases)
y_full = build_label_arrays(cases)

indices = np.random.RandomState(42).choice(len(X_full), 50000, replace=False)
X_50k = X_full[indices]
y_50k = {k: v[indices] for k, v in y_full.items()}
X_tr, X_te, y_tr, y_te = get_train_test_split(X_50k, y_50k, test_size=0.2, seed=42)

model = GradientBoostingRegressor(
    n_estimators=200, max_depth=5, learning_rate=0.05,
    subsample=0.8, min_samples_leaf=20, random_state=42,
    validation_fraction=0.1, n_iter_no_change=15, tol=1e-4
)
model.fit(X_tr, y_tr['y_duration_collab'])
preds = model.predict(X_te)
mae = mean_absolute_error(y_te['y_duration_collab'], preds)
print(f"MAE: {mae:.2f}")
print(f"Trees used: {model.n_estimators_}")
