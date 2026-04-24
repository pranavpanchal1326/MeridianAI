import numpy as np
import json
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.utils import resample
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays, get_train_test_split

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
X_full = np.array([c['ml_features'] for c in cases], dtype=np.float32)
y_full = build_label_arrays(cases)

def test_sampling(X_50k, y_50k, name):
    X_tr, X_te, y_tr, y_te = get_train_test_split(X_50k, y_50k, test_size=0.2, seed=42)
    model = GradientBoostingRegressor(
        n_estimators=200, max_depth=5, learning_rate=0.05,
        subsample=0.8, min_samples_leaf=20, random_state=42,
        validation_fraction=0.1, n_iter_no_change=15, tol=1e-4
    )
    model.fit(X_tr, y_tr['y_duration_collab'])
    preds = model.predict(X_te)
    mae = mean_absolute_error(y_te['y_duration_collab'], preds)
    print(f"{name} MAE: {mae:.2f}")

# Method 1: sklearn resample replace=False
vals1 = resample(X_full, *y_full.values(), n_samples=50000, random_state=42, replace=False)
y_50k_1 = dict(zip(y_full.keys(), vals1[1:]))
test_sampling(vals1[0], y_50k_1, "sklearn replace=False")

# Method 2: sklearn resample replace=True
vals2 = resample(X_full, *y_full.values(), n_samples=50000, random_state=42, replace=True)
y_50k_2 = dict(zip(y_full.keys(), vals2[1:]))
test_sampling(vals2[0], y_50k_2, "sklearn replace=True")

# Method 3: first 50k
y_50k_3 = {k: v[:50000] for k, v in y_full.items()}
test_sampling(X_full[:50000], y_50k_3, "First 50k")

# Method 4: train_test_split on full to get 50k
X_50k_4, _, *y_50k_4_rest = get_train_test_split(X_full, y_full, test_size=len(X_full)-50000, seed=42)
# get_train_test_split returns X_train, X_test, y_train_dict, y_test_dict
y_50k_4 = y_50k_4_rest[0]
test_sampling(X_50k_4, y_50k_4, "train_test_split 50k")
