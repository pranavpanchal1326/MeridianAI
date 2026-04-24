import os
import sys
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, IsolationForest
from sklearn.metrics import mean_absolute_error

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays, get_train_test_split

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
X = build_feature_matrix(cases)
labels = build_label_arrays(cases)

X_train, X_test, y_train_dict, y_test_dict = get_train_test_split(X, labels, test_size=0.2, seed=42)

iso = IsolationForest(n_estimators=200, max_samples='auto', contamination=0.05, max_features=1.0, random_state=42, n_jobs=-1)
iso.fit(X_train)
normal_train_mask = iso.predict(X_train) == 1

y_train = y_train_dict['y_phase_docs']
y_test = y_test_dict['y_phase_docs']

gbr = GradientBoostingRegressor(n_estimators=150, max_depth=4, learning_rate=0.08, subsample=0.8, random_state=42)

# Normal
gbr.fit(X_train, y_train)
print("Normal MAE:", mean_absolute_error(y_test, gbr.predict(X_test)))

# Cleaned train
gbr.fit(X_train[normal_train_mask], y_train[normal_train_mask])
print("Cleaned Train MAE (test on all):", mean_absolute_error(y_test, gbr.predict(X_test)))

# Cleaned train and test
normal_test_mask = iso.predict(X_test) == 1
print("Cleaned Train & Test MAE:", mean_absolute_error(y_test[normal_test_mask], gbr.predict(X_test[normal_test_mask])))
