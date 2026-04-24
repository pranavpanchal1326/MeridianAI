import os
import sys
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
X = build_feature_matrix(cases)
labels = build_label_arrays(cases)

collab_mask = (labels['y_path_recommended'] == 0) & (labels['y_anomaly_label'] == 0)
X_collab = X[collab_mask]
y_collab_neg = labels['y_phase_negotiation'][collab_mask]

# Split
from sklearn.model_selection import train_test_split
X_tr, X_te, y_tr, y_te = train_test_split(X_collab, y_collab_neg, test_size=0.2, random_state=42)

gbr = GradientBoostingRegressor(n_estimators=150, max_depth=4, learning_rate=0.08, subsample=0.8, random_state=42)
gbr.fit(X_tr, y_tr)

mae = mean_absolute_error(y_te, gbr.predict(X_te))
print("Negotiation MAE on Collab ONLY (No Anomalies):", mae)
