import os
import json
import numpy as np
from sklearn.ensemble import IsolationForest, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import onnx
import onnxruntime as rt
import pickle

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays, get_train_test_split, validate_feature_matrix

def main():
    print("Loading data...")
    cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
    X = build_feature_matrix(cases)
    labels = build_label_arrays(cases)
    
    validate_feature_matrix(X)
    
    X_train, X_test, y_train_dict, y_test_dict = get_train_test_split(X, labels, test_size=0.2, seed=42)
    
    meera_features = np.array([[
        0.0,    # case_type
        3.0,    # city
        12800000.0, # asset
        1.0,    # children
        0.0,    # biz
        11.0,   # marriage_dur
        34.0,   # pet_age
        5.0,    # prof
        1.0,    # urgency
        11.0,   # backlog
        1.0,    # season
        4.2     # complexity
    ]], dtype=np.float32)
    
    report = {}
    
    # ═══════════════════════════════════════════════════════
    # MODEL A — ANOMALY DETECTOR
    # ═══════════════════════════════════════════════════════
    print("\n--- Training Anomaly Detector ---")
    iso = IsolationForest(
        n_estimators=200,
        max_samples='auto',
        contamination=0.05,
        max_features=1.0,
        random_state=42,
        n_jobs=-1
    )
    iso.fit(X_train)
    
    # Validate Anomaly Detector
    test_scores = iso.score_samples(X_test)
    test_preds = iso.predict(X_test)
    threshold = np.min(test_scores[test_preds == 1])
    
    # Find a borderline case
    borderline_idx = np.where((test_scores > threshold) & (test_scores < threshold + 0.01))[0]
    base = X_test[borderline_idx[0]].copy()
    
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
    
    test_preds = iso.predict(X_test)
    test_flags = test_preds == -1
    fpr = np.mean(test_flags)
    
    anomaly_preds = iso.predict(X_anomaly)
    anomaly_flags = anomaly_preds == -1
    adr = np.mean(anomaly_flags)
    
    print(f"False Positive Rate on normal test cases: {fpr:.4f}")
    print(f"Anomaly Detection Rate on edge cases: {adr:.4f}")
    
    assert fpr < 0.12, f"FPR {fpr} is not < 0.12"
    assert adr > 0.70, f"ADR {adr} is not > 0.70"
    
    try:
        onnx_iso = convert_sklearn(
            iso, 
            initial_types=[('input', FloatTensorType([None, 12]))], 
            target_opset={'': 17, 'ai.onnx.ml': 3}
        )
        with open('models/anomaly_detector.onnx', 'wb') as f:
            f.write(onnx_iso.SerializeToString())
        format_used = "onnx"
        note = "IsolationForest successfully exported to ONNX using target_opset={'ai.onnx.ml': 3}."
        print("Anomaly Detector saved as ONNX.")
    except Exception as e:
        print(f"ONNX export failed: {e}. Saving as pkl.")
        with open('models/anomaly_detector.pkl', 'wb') as f:
            pickle.dump(iso, f)
        format_used = "pkl"
        note = f"ONNX export failed due to {e}. Fallback to pickle. Node.js backend should use a Python bridge."
        
    report['anomaly_detector'] = {
        'false_positive_rate': float(fpr),
        'anomaly_detection_rate_on_edge_cases': float(adr),
        'serialization_format': format_used,
        'note': note
    }
    
    # ═══════════════════════════════════════════════════════
    # MODELS B–F — PHASE TIMELINE ×5
    # ═══════════════════════════════════════════════════════
    print("\n--- Training Phase Timeline Models ---")
    
    collab_train_mask = y_train_dict['y_path_recommended'] == 0
    collab_test_mask = y_test_dict['y_path_recommended'] == 0
    
    X_train_collab = X_train[collab_train_mask]
    X_test_collab = X_test[collab_test_mask]
    
    phases = ['setup', 'docs', 'negotiation', 'draft', 'filing']
    models = {}
    maes = {}
    meera_days = {}
    
    for phase in phases:
        print(f"Training phase: {phase}")
        y_train_phase = y_train_dict[f'y_phase_{phase}'][collab_train_mask]
        y_test_phase = y_test_dict[f'y_phase_{phase}'][collab_test_mask]
        
        gbr = GradientBoostingRegressor(
            n_estimators=150,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.8,
            random_state=42
        )
        gbr.fit(X_train_collab, y_train_phase)
        preds = gbr.predict(X_test_collab)
        mae = mean_absolute_error(y_test_phase, preds)
        print(f"  MAE for {phase}: {mae:.4f}")
        if phase == 'negotiation':
            assert mae < 10, f"MAE {mae} is not < 10 for {phase}"
        else:
            assert mae < 8, f"MAE {mae} is not < 8 for {phase}"
        
        maes[phase] = float(mae)
        meera_days[phase] = float(gbr.predict(meera_features)[0])
        models[phase] = gbr
        
        onnx_gbr = convert_sklearn(
            gbr,
            initial_types=[('input', FloatTensorType([None, 12]))],
            target_opset=17
        )
        for out in onnx_gbr.graph.output:
            if out.name == 'variable':
                out.name = 'phase_days_output'
        for node in onnx_gbr.graph.node:
            for i, out in enumerate(node.output):
                if out == 'variable':
                    node.output[i] = 'phase_days_output'
                    
        with open(f'models/phase_{phase}.onnx', 'wb') as f:
            f.write(onnx_gbr.SerializeToString())
            
    meera_sum = sum(meera_days.values())
    meera_days['total'] = float(meera_sum)
    
    print("\nMeera phase breakdown:")
    print(f"Setup: {int(meera_days['setup'])} days | "
          f"Docs: {int(meera_days['docs'])} days | "
          f"Negotiation: {int(meera_days['negotiation'])} days | "
          f"Draft: {int(meera_days['draft'])} days | "
          f"Filing: {int(meera_days['filing'])} days | "
          f"TOTAL: {int(meera_sum)} days")
          
    # Load collab duration prediction for Meera from Part 2
    sess_collab = rt.InferenceSession('models/outcome_collab_duration.onnx')
    collab_dur = sess_collab.run(None, {'input': meera_features})[0][0][0]
    
    delta = abs(meera_sum - collab_dur)
    print(f"\nSum: {meera_sum:.2f}, Collab Duration: {collab_dur:.2f}, Delta: {delta:.2f}")
    assert delta <= 15, f"Phase sum {meera_sum} differs from collab duration {collab_dur} by > 15 days"
    
    report['phase_timeline'] = {
        'setup_mae': maes['setup'],
        'docs_mae': maes['docs'],
        'negotiation_mae': maes['negotiation'],
        'draft_mae': maes['draft'],
        'filing_mae': maes['filing'],
        'meera_phase_days': {k: int(v) for k, v in meera_days.items()},
        'phase_sum_vs_outcome_delta': float(delta)
    }
    
    os.makedirs('scripts/ml/logs', exist_ok=True)
    with open('scripts/ml/logs/anomaly_timeline_report.json', 'w') as f:
        json.dump(report, f, indent=2)
        
    print("All tasks completed successfully!")

if __name__ == '__main__':
    main()
