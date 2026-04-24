import numpy as np
import json
from sklearn.ensemble import GradientBoostingRegressor
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays, get_train_test_split

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
X = build_feature_matrix(cases)
y = build_label_arrays(cases)

c_50k = cases[:50000]
X_50k = X[:50000]
y_50k = {k: v[:50000] for k, v in y.items()}
X_tr, X_te, y_tr, y_te = get_train_test_split(X_50k, y_50k, test_size=0.2, seed=42)

model = GradientBoostingRegressor(n_estimators=200, max_depth=5, learning_rate=0.05, random_state=42)
model.fit(X_tr, y_tr['y_duration_collab'])
print("Feature importances:", model.feature_importances_)
