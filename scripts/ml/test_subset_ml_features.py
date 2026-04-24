import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from scripts.ml.features import load_cases, build_label_arrays

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
X_full = np.array([c['ml_features'] for c in cases], dtype=np.float32)
y_full = build_label_arrays(cases)

# use first 50k
X_50k = X_full[:50000]
y_50k = {k: v[:50000] for k, v in y_full.items()}

collab_mask = y_50k['y_path_recommended'] == 0
X_collab = X_50k[collab_mask]
y_collab = {k: v[collab_mask] for k, v in y_50k.items()}

X_tr, X_te, y_tr_dur, y_te_dur = train_test_split(X_collab, y_collab['y_duration_collab'], test_size=0.2, random_state=42)

model = GradientBoostingRegressor(
    n_estimators=200, max_depth=5, learning_rate=0.05,
    subsample=0.8, min_samples_leaf=20, random_state=42,
    validation_fraction=0.1, n_iter_no_change=15, tol=1e-4
)
model.fit(X_tr, y_tr_dur)
preds = model.predict(X_te)
mae = mean_absolute_error(y_te_dur, preds)
print(f"Subset Collab with ml_features MAE: {mae:.2f}")

