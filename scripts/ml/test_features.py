import numpy as np
from scripts.ml.features import load_cases, build_feature_matrix

cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")[:10]
X_built = build_feature_matrix(cases)
X_json = np.array([c['ml_features'] for c in cases], dtype=np.float32)

for i in range(10):
    diff = X_built[i] - X_json[i]
    if np.any(np.abs(diff) > 1e-4):
        print(f"Diff in row {i}:")
        for j in range(12):
            if abs(X_built[i, j] - X_json[i, j]) > 1e-4:
                print(f"  Feature {j}: built={X_built[i, j]}, json={X_json[i, j]}")
    else:
        print(f"Row {i} MATCHES")
