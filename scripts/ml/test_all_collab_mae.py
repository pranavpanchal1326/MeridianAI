import os
import sys
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays, get_train_test_split

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
X = build_feature_matrix(cases)
labels = build_label_arrays(cases)

X_tr, X_te, y_tr_dict, y_te_dict = get_train_test_split(X, labels, test_size=0.2, seed=42)

collab_tr_mask = y_tr_dict['y_path_recommended'] == 0
collab_te_mask = y_te_dict['y_path_recommended'] == 0

X_tr_c = X_tr[collab_tr_mask]
X_te_c = X_te[collab_te_mask]

phases = ['setup', 'docs', 'negotiation', 'draft', 'filing']
maes = []
for phase in phases:
    y_tr_c = y_tr_dict[f'y_phase_{phase}'][collab_tr_mask]
    y_te_c = y_te_dict[f'y_phase_{phase}'][collab_te_mask]
    
    gbr = GradientBoostingRegressor(n_estimators=150, max_depth=4, learning_rate=0.08, subsample=0.8, random_state=42)
    gbr.fit(X_tr_c, y_tr_c)
    mae = mean_absolute_error(y_te_c, gbr.predict(X_te_c))
    maes.append(mae)
    print(f"{phase}: {mae:.2f}")

print(f"Average MAE: {np.mean(maes):.2f}")
