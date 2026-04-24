import os
import json
import numpy as np
from sklearn.ensemble import IsolationForest

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from scripts.ml.features import load_cases, build_feature_matrix, get_train_test_split

def main():
    cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
    X = build_feature_matrix(cases)
    
    np.random.seed(42)
    # just basic split
    X_train = X[:160000]
    X_test = X[160000:]
    
    meera_features = np.array([[
        0.0, 3.0, 12800000.0, 1.0, 0.0, 11.0, 34.0, 5.0, 1.0, 11.0, 1.0, 4.2
    ]], dtype=np.float32)
    
    iso = IsolationForest(
        n_estimators=200,
        max_samples='auto',
        contamination=0.05,
        max_features=1.0,
        random_state=42,
        n_jobs=-1
    )
    iso.fit(X_train)
    
    base = meera_features[0].copy()
    c6_10 = np.array([4.0, 6.0, 500000000.0, 3.0, 1.0, 45.0, 72.0, 10.0, 3.0, 18.0, 1.2, 10.0])
    
    c1 = base.copy(); c1[2] = 500000000
    c2 = base.copy(); c2[5] = 45.0
    c3 = base.copy(); c3[3] = 3.0; c3[11] = 9.8
    c4 = base.copy(); c4[9] = 18.0; c4[11] = 10.0
    c5 = base.copy(); c5[6] = 72.0
    c6 = c6_10.copy()
    c7 = base.copy(); c7[7] = 0.0
    c8 = base.copy(); c8[10] = 0.5; c8[9] = 18.0
    c9 = base.copy(); c9[4] = 1.0; c9[2] = 480000000.0
    c10 = c6_10.copy()
    
    X_anomaly = np.array([c1, c2, c3, c4, c5, c6, c7, c8, c9, c10], dtype=np.float32)
    
    print("Test FPR (predict == -1):", np.mean(iso.predict(X_test) == -1))
    print("Test FPR (score < -0.5):", np.mean(iso.score_samples(X_test) < -0.5))
    
    print("\nAnomaly Scores:")
    scores = iso.score_samples(X_anomaly)
    preds = iso.predict(X_anomaly)
    for i, (s, p) in enumerate(zip(scores, preds)):
        print(f"Case {i+1}: score={s:.4f}, pred={p}")
        
if __name__ == '__main__':
    main()
