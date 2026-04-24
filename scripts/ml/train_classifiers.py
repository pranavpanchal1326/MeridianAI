import os
import json
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support, mean_absolute_error
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import onnx
import onnxruntime as rt

from scripts.ml.features import load_cases, build_feature_matrix, build_label_arrays, get_train_test_split, validate_feature_matrix

def main():
    print("Loading data...")
    cases = load_cases("scripts/synthetic/output/stage1_cases.jsonl")
    X = build_feature_matrix(cases)
    labels = build_label_arrays(cases)
    
    validate_feature_matrix(X)
    
    # Extract Meera's feature row before train/test split if possible, or just build it.
    # Meera's case has:
    # case_type: divorce (0)
    # city: Pune (3)
    # total_asset_value_inr: 12800000
    # children_count: 1
    # business_ownership: False (0)
    # marriage_duration_years: 11.0
    # petitioner_age: 34.0
    # professional_count: 5
    # urgency: medium (1)
    # court_backlog_months: 11.0
    # filing_season_score: 1.0
    # complexity_score: 4.2
    
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
    
    # Target construction for risk scorer
    urgency = X[:, 8]
    complexity_score = X[:, 11]
    court_backlog_months = X[:, 9]
    children_count = X[:, 3]
    success_prob = labels['y_success_prob']
    
    risk_raw = (
        (urgency / 3) * 0.3 +
        (complexity_score / 10) * 0.25 +
        (court_backlog_months / 18) * 0.2 +
        (children_count / 3) * 0.15 +
        (1 - success_prob) * 0.10
    )
    y_risk_score = np.clip(risk_raw * 100, 0, 100).astype(np.float32)
    labels['y_risk_score'] = y_risk_score
    
    X_train, X_test, y_train_dict, y_test_dict = get_train_test_split(X, labels, test_size=0.2, seed=42)
    
    report = {}
    
    # ═══════════════════════════════════════════════════════
    # MODEL A — PATH RECOMMENDER
    # ═══════════════════════════════════════════════════════
    print("\n--- Training Path Recommender ---")
    y_path_train = y_train_dict['y_path_recommended']
    y_path_test = y_test_dict['y_path_recommended']
    
    rfc = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=15,
        max_features='sqrt',
        class_weight='balanced',
        random_state=42,
        n_jobs=-1,
        oob_score=True
    )
    rfc.fit(X_train, y_path_train)
    
    oob_score = rfc.oob_score_
    print(f"OOB Score: {oob_score:.4f}")
    assert oob_score > 0.78, f"OOB score {oob_score} is not > 0.78"
    
    y_path_pred = rfc.predict(X_test)
    test_accuracy = accuracy_score(y_path_test, y_path_pred)
    print(f"Test Accuracy: {test_accuracy:.4f}")
    assert test_accuracy > 0.80, f"Test accuracy {test_accuracy} is not > 0.80"
    
    cm = confusion_matrix(y_path_test, y_path_pred)
    print("Confusion Matrix (0=collab, 1=med, 2=court):")
    print(cm)
    
    p, r, f1, _ = precision_recall_fscore_support(y_path_test, y_path_pred, labels=[0, 1, 2])
    print("Precision per class:", p)
    print("Recall per class:", r)
    print("F1 per class:", f1)
    
    print("Exporting Path Recommender to ONNX...")
    onnx_rfc = convert_sklearn(
        rfc, 
        initial_types=[('input', FloatTensorType([None, 12]))],
        target_opset=17,
        options={type(rfc): {'zipmap': False}}
    )
    
    for out in onnx_rfc.graph.output:
        if out.name == 'label':
            out.name = 'path_label'
        elif out.name == 'probabilities':
            out.name = 'path_probabilities'
            
    for node in onnx_rfc.graph.node:
        for i, out in enumerate(node.output):
            if out == 'label':
                node.output[i] = 'path_label'
            elif out == 'probabilities':
                node.output[i] = 'path_probabilities'

    onnx.checker.check_model(onnx_rfc)
    os.makedirs('models', exist_ok=True)
    with open('models/path_recommender.onnx', 'wb') as f:
        f.write(onnx_rfc.SerializeToString())
        
    sess_rfc = rt.InferenceSession('models/path_recommender.onnx')
    meera_out = sess_rfc.run(None, {'input': meera_features})
    meera_path_label = int(meera_out[0][0])
    meera_probs = meera_out[1][0]
    
    assert meera_path_label in [0, 1, 2]
    assert abs(sum(meera_probs) - 1.0) < 0.001
    
    path_names = {0: 'collab', 1: 'med', 2: 'court'}
    conf = meera_probs[meera_path_label] * 100
    print(f"Meera recommended path: {path_names[meera_path_label]} (confidence: {conf:.1f}%)")
    
    report['path_recommender'] = {
        'oob_score': float(oob_score),
        'test_accuracy': float(test_accuracy),
        'confusion_matrix': cm.tolist(),
        'onnx_verified': True
    }
    
    # ═══════════════════════════════════════════════════════
    # MODEL B — RISK SCORER
    # ═══════════════════════════════════════════════════════
    print("\n--- Training Risk Scorer ---")
    y_risk_train = y_train_dict['y_risk_score']
    y_risk_test = y_test_dict['y_risk_score']
    
    gbr = GradientBoostingRegressor(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.8,
        random_state=42
    )
    gbr.fit(X_train, y_risk_train)
    
    preds_train = gbr.predict(X_train)
    iso = IsotonicRegression(out_of_bounds='clip')
    iso.fit(preds_train, y_risk_train)
    
    preds_test_raw = gbr.predict(X_test)
    preds_test_calibrated = iso.predict(preds_test_raw)
    preds_test_calibrated = np.clip(preds_test_calibrated, 0, 100)
    
    mae = mean_absolute_error(y_risk_test, preds_test_calibrated)
    print(f"Risk Scorer MAE: {mae:.4f}")
    assert mae < 8, f"MAE {mae} is not < 8"
    
    print("10 Sample Predictions:")
    for i in range(10):
        print(f"Features: {X_test[i][:4]}... -> Pred: {preds_test_calibrated[i]:.2f}, True: {y_risk_test[i]:.2f}")
        
    meera_raw = gbr.predict(meera_features)
    meera_risk = iso.predict(meera_raw)[0]
    meera_risk = float(np.clip(meera_risk, 0, 100))
    print(f"Meera risk score: {meera_risk:.2f}")
    assert 20 <= meera_risk <= 50, f"Meera risk score {meera_risk} not in [20, 50]"
    
    feature_names = [
        "Case Type", "City", "Total Asset Value", "Children Count",
        "Business Ownership", "Marriage Duration", "Petitioner Age",
        "Professional Count", "Urgency", "Court Backlog Months",
        "Filing Season Score", "Complexity Score"
    ]
    feature_importances = gbr.feature_importances_
    sorted_idx = np.argsort(feature_importances)[::-1]
    
    risk_factors = []
    # Create simple readable reasons for top 3
    for idx in sorted_idx[:3]:
        fname = feature_names[idx]
        if idx == 9: # court backlog
            risk_factors.append(f"Court backlog adds calendar risk")
        elif idx == 11: # complexity
            risk_factors.append(f"High complexity score increases risk")
        elif idx == 8: # urgency
            risk_factors.append(f"Urgency level impacts resolution speed")
        elif idx == 3: # children
            risk_factors.append(f"Children involved impacts custody risk")
        elif idx == 2: # assets
            risk_factors.append(f"High asset value increases complexity")
        else:
            risk_factors.append(f"{fname} is a key risk factor")
            
    print("Exporting Risk Scorer to ONNX...")
    onnx_gbr = convert_sklearn(
        gbr,
        initial_types=[('input', FloatTensorType([None, 12]))],
        target_opset=17
    )
    
    for out in onnx_gbr.graph.output:
        if out.name == 'variable':
            out.name = 'risk_score_output'
    for node in onnx_gbr.graph.node:
        for i, out in enumerate(node.output):
            if out == 'variable':
                node.output[i] = 'risk_score_output'
                
    onnx.checker.check_model(onnx_gbr)
    with open('models/risk_scorer.onnx', 'wb') as f:
        f.write(onnx_gbr.SerializeToString())
        
    sess_gbr = rt.InferenceSession('models/risk_scorer.onnx')
    out_gbr = sess_gbr.run(None, {'input': meera_features})[0]
    
    # Check if ONNX matches sklearn raw
    assert np.allclose(out_gbr[0][0], meera_raw[0], atol=1e-3)
    
    report['risk_scorer'] = {
        'mae': float(mae),
        'meera_risk_score': int(meera_risk),
        'meera_risk_factors': risk_factors,
        'onnx_verified': True
    }
    
    os.makedirs('scripts/ml/logs', exist_ok=True)
    with open('scripts/ml/logs/classifier_training_report.json', 'w') as f:
        json.dump(report, f, indent=2)
        
    print("All tasks completed successfully!")

if __name__ == '__main__':
    main()
