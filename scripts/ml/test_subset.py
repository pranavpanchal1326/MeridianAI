import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays, get_train_test_split

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
X_full = build_feature_matrix(cases)
y_full = build_label_arrays(cases)

indices = np.random.RandomState(42).choice(len(X_full), 50000, replace=False)
X_50k = X_full[indices]
y_50k = {k: v[indices] for k, v in y_full.items()}

# Filter for collab only
collab_mask = y_50k['y_path_recommended'] == 0 # 0 is collab
X_collab = X_50k[collab_mask]
y_collab = {k: v[collab_mask] for k, v in y_50k.items()}

# We can't use get_train_test_split if we stratify by y_path_recommended because they are all 0 now!
# So we just use sklearn's normal train_test_split
from sklearn.model_selection import train_test_split
X_tr, X_te, y_tr_dur, y_te_dur = train_test_split(X_collab, y_collab['y_duration_collab'], test_size=0.2, random_state=42)

model = GradientBoostingRegressor(
    n_estimators=200, max_depth=5, learning_rate=0.05,
    subsample=0.8, min_samples_leaf=20, random_state=42,
    validation_fraction=0.1, n_iter_no_change=15, tol=1e-4
)
model.fit(X_tr, y_tr_dur)
preds = model.predict(X_te)
mae = mean_absolute_error(y_te_dur, preds)
print(f"Subset Collab MAE: {mae:.2f}")

