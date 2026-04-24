import os
import json
import logging
import numpy as np

os.makedirs('scripts/ml/logs', exist_ok=True)
# Ensure file exists even if empty
open('scripts/ml/logs/load_errors.log', 'a').close()

logging.basicConfig(
    filename='scripts/ml/logs/load_errors.log',
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s',
    force=True
)

COURT_BACKLOG_MONTHS = {
    0: 14,   # Mumbai
    1: 18,   # Delhi
    2: 9,    # Bangalore
    3: 9,    # Pune
    4: 11,   # Hyderabad
    5: 12,   # Chennai
    6: 8     # Ahmedabad
}

FILING_SEASON_SCORE = {
    1: 1.2,   # January
    2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0,
    6: 1.0, 7: 1.0, 8: 1.0, 9: 1.0,
    10: 1.0,
    11: 0.5, 12: 0.5  # Nov-Dec
}

CITY_MAP = {
    'Mumbai': 0, 'Delhi': 1, 'Bangalore': 2, 'Pune': 3,
    'Hyderabad': 4, 'Chennai': 5, 'Ahmedabad': 6
}

CASE_TYPE_MAP = {
    'divorce': 0, 'inheritance': 1, 'property': 2, 'business': 3, 'nri': 4
}

URGENCY_MAP = {
    'low': 0, 'medium': 1, 'high': 2, 'critical': 3
}

PATH_MAP = {
    'collab': 0, 'mediation': 1, 'court': 2
}

def load_cases(jsonl_path: str) -> list[dict]:
    """
    Streams 200k JSONL line by line — never loads all into RAM at once.
    Validates each record has all 12 feature fields.
    Logs corrupt/missing records to scripts/ml/logs/load_errors.log
    Returns list of valid dicts only.
    """
    valid_cases = []
    required_fields = {
        'case_type', 'city', 'total_asset_value_inr', 'children_count',
        'business_ownership', 'marriage_duration_years', 'petitioner_age',
        'professional_count', 'urgency', 'court_backlog_months', 
        'filing_season_score', 'complexity_score'
    }
    
    try:
        with open(jsonl_path, 'r', encoding='utf-8') as f:
            for line_idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                try:
                    case = json.loads(line)
                    missing = required_fields - set(case.keys())
                    if missing:
                        logging.error(f"Line {line_idx+1}: Missing fields {missing}")
                        continue
                    valid_cases.append(case)
                except json.JSONDecodeError as e:
                    logging.error(f"Line {line_idx+1}: JSON Decode Error: {str(e)}")
    except FileNotFoundError as e:
        logging.error(f"File not found: {str(e)}")
        
    return valid_cases

def build_feature_matrix(cases: list[dict]) -> np.ndarray:
    """
    Applies EXACT encoding from the feature vector table above.
    Returns float32 NumPy array shape (N, 12).
    Asserts shape[-1] == 12 before returning — hard assert, not warning.
    Clips total_asset_value_inr to [0, 5e8] to remove synthetic outliers.
    Clips complexity_score to [0, 10].
    """
    features = []
    for case in cases:
        if 'ml_features' in case:
            row = case['ml_features']
            row[2] = max(0.0, min(float(row[2]), 5e8))
            row[11] = max(0.0, min(float(row[11]), 10.0))
        else:
            case_type_idx = CASE_TYPE_MAP.get(case.get('case_type', 'divorce'), 0)
            city_idx = CITY_MAP.get(case.get('city', 'Mumbai'), 0)
            
            asset_value = float(case.get('total_asset_value_inr', 0.0))
            asset_value = max(0.0, min(asset_value, 5e8))
            
            children = int(case.get('children_count', 0))
            children = max(0, min(children, 3))
            
            biz_owner = 1.0 if case.get('business_ownership') else 0.0
            
            if case.get('case_type') == 'divorce':
                marriage_dur = float(case.get('marriage_duration_years', 0.0))
            else:
                marriage_dur = 0.0
                
            pet_age = float(case.get('petitioner_age', 0.0))
            prof_count = float(case.get('professional_count', 0.0))
            urgency_idx = URGENCY_MAP.get(case.get('urgency', 'low'), 0)
            
            backlog = float(COURT_BACKLOG_MONTHS.get(city_idx, 12.0))
            
            filing_date_str = case.get('filing_date', '2024-01-01')
            try:
                month = int(filing_date_str.split('-')[1])
            except (IndexError, ValueError):
                month = 1
            season_score = float(FILING_SEASON_SCORE.get(month, 1.0))
            
            complexity = float(case.get('complexity_score', 0.0))
            complexity = max(0.0, min(complexity, 10.0))
            
            row = [
                float(case_type_idx),
                float(city_idx),
                asset_value,
                float(children),
                biz_owner,
                marriage_dur,
                pet_age,
                prof_count,
                float(urgency_idx),
                backlog,
                season_score,
                complexity
            ]
        features.append(row)
        
    if not features:
        X = np.empty((0, 12), dtype=np.float32)
    else:
        X = np.array(features, dtype=np.float32)
        
    assert X.shape[-1] == 12, f"Expected 12 features, got {X.shape[-1]}"
    return X

def build_label_arrays(cases: list[dict]) -> dict:
    """
    Returns dict of all label arrays listed above.
    All float arrays are float32.
    All int arrays are int32.
    """
    labels = {
        'y_duration_collab': [],
        'y_duration_med': [],
        'y_duration_court': [],
        'y_cost_collab': [],
        'y_cost_med': [],
        'y_cost_court': [],
        'y_success_prob': [],
        'y_path_recommended': [],
        'y_risk_score': [],
        'y_phase_setup': [],
        'y_phase_docs': [],
        'y_phase_negotiation': [],
        'y_phase_draft': [],
        'y_phase_filing': [],
        'y_anomaly_label': []
    }
    
    for case in cases:
        outcomes = case.get('outcomes', {})
        collab = outcomes.get('collab', {})
        med = outcomes.get('mediation', {})
        court = outcomes.get('court', {})
        
        labels['y_duration_collab'].append(float(collab.get('duration_days', 0.0)))
        labels['y_duration_med'].append(float(med.get('duration_days', 0.0)))
        labels['y_duration_court'].append(float(court.get('duration_days', 0.0)))
        
        labels['y_cost_collab'].append(float(collab.get('cost_inr', 0.0)))
        labels['y_cost_med'].append(float(med.get('cost_inr', 0.0)))
        labels['y_cost_court'].append(float(court.get('cost_inr', 0.0)))
        
        rec_path_str = case.get('recommended_path', 'collab')
        rec_path_idx = PATH_MAP.get(rec_path_str, 0)
        labels['y_path_recommended'].append(rec_path_idx)
        
        succ_prob = float(outcomes.get(rec_path_str, {}).get('success_prob', 0.0))
        labels['y_success_prob'].append(succ_prob)
        
        labels['y_risk_score'].append(float(case.get('risk_score', 0.0)))
        
        phases = case.get('phase_timeline', {})
        labels['y_phase_setup'].append(float(phases.get('setup', 0.0)))
        labels['y_phase_docs'].append(float(phases.get('docs', 0.0)))
        labels['y_phase_negotiation'].append(float(phases.get('negotiation', 0.0)))
        labels['y_phase_draft'].append(float(phases.get('draft', 0.0)))
        labels['y_phase_filing'].append(float(phases.get('filing', 0.0)))
        
        labels['y_anomaly_label'].append(int(case.get('anomaly_label', 0)))

    for k in labels:
        if k in ['y_path_recommended', 'y_anomaly_label']:
            labels[k] = np.array(labels[k], dtype=np.int32)
        else:
            labels[k] = np.array(labels[k], dtype=np.float32)
            
    return labels

def get_train_test_split(X, y_dict, test_size=0.2, seed=42):
    """
    Uses sklearn train_test_split with stratify=y_dict['y_path_recommended'].
    Wait, no sklearn allowed in this file. Implementing pure NumPy stratified split instead.
    Returns X_train, X_test, y_train_dict, y_test_dict.
    Prints split sizes and class distribution for y_path_recommended.
    """
    np.random.seed(seed)
    
    stratify_array = y_dict['y_path_recommended']
    unique_classes = np.unique(stratify_array)
    
    train_indices = []
    test_indices = []
    
    for c in unique_classes:
        c_indices = np.where(stratify_array == c)[0]
        np.random.shuffle(c_indices)
        
        n_test = int(len(c_indices) * test_size)
        test_indices.extend(c_indices[:n_test])
        train_indices.extend(c_indices[n_test:])
        
    np.random.shuffle(train_indices)
    np.random.shuffle(test_indices)
    
    X_train = X[train_indices]
    X_test = X[test_indices]
    
    y_train_dict = {}
    y_test_dict = {}
    
    for k, arr in y_dict.items():
        y_train_dict[k] = arr[train_indices]
        y_test_dict[k] = arr[test_indices]
        
    print(f"Train set size: {X_train.shape[0]}")
    print(f"Test set size: {X_test.shape[0]}")
    
    train_unique, train_counts = np.unique(y_train_dict['y_path_recommended'], return_counts=True)
    print("Class distribution in train set (y_path_recommended):", dict(zip(train_unique, train_counts)))
    
    test_unique, test_counts = np.unique(y_test_dict['y_path_recommended'], return_counts=True)
    print("Class distribution in test set (y_path_recommended):", dict(zip(test_unique, test_counts)))
    
    return X_train, X_test, y_train_dict, y_test_dict

def validate_feature_matrix(X: np.ndarray):
    """
    Asserts:
    - shape[-1] == 12
    - no NaN values anywhere
    - no Inf values anywhere
    - all values in expected ranges per feature
    Raises ValueError with clear message if any check fails.
    Call this before ANY model training.
    """
    if X.shape[-1] != 12:
        raise ValueError(f"Feature matrix must have 12 features, got {X.shape[-1]}")
    
    if np.isnan(X).any():
        raise ValueError("Feature matrix contains NaN values")
        
    if np.isinf(X).any():
        raise ValueError("Feature matrix contains Inf values")
        
    if not np.all((X[:, 0] >= 0) & (X[:, 0] <= 4)):
        raise ValueError("case_type out of range [0, 4]")
        
    if not np.all((X[:, 1] >= 0) & (X[:, 1] <= 6)):
        raise ValueError("city out of range [0, 6]")
        
    if not np.all((X[:, 2] >= 0.0) & (X[:, 2] <= 5e8)):
        raise ValueError("total_asset_value_inr out of range [0, 5e8]")
        
    if not np.all((X[:, 3] >= 0) & (X[:, 3] <= 3)):
        raise ValueError("children_count out of range [0, 3]")
        
    if not np.all((X[:, 4] == 0) | (X[:, 4] == 1)):
        raise ValueError("business_ownership must be 0 or 1")
        
    if not np.all(X[:, 5] >= 0):
        raise ValueError("marriage_duration_years must be >= 0")
        
    if not np.all(X[:, 6] >= 0):
        raise ValueError("petitioner_age must be >= 0")
        
    if not np.all(X[:, 7] >= 0):
        raise ValueError("professional_count must be >= 0")
        
    if not np.all((X[:, 8] >= 0) & (X[:, 8] <= 3)):
        raise ValueError("urgency out of range [0, 3]")
        
    if not np.all(X[:, 9] >= 0):
        raise ValueError("court_backlog_months must be >= 0")
        
    if not np.all(X[:, 10] >= 0):
        raise ValueError("filing_season_score must be >= 0")
        
    if not np.all((X[:, 11] >= 0) & (X[:, 11] <= 10)):
        raise ValueError("complexity_score out of range [0, 10]")

if __name__ == "__main__":
    jsonl_path = "scripts/synthetic/output/stage1_cases.jsonl"
    
    if os.path.exists(jsonl_path):
        cases = []
        with open(jsonl_path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                if i >= 1000:
                    break
                line = line.strip()
                if line:
                    cases.append(json.loads(line))
    else:
        print(f"Warning: {jsonl_path} not found. Running with an empty list.")
        cases = []
        
    if cases:
        X = build_feature_matrix(cases)
        y_dict = build_label_arrays(cases)
        
        validate_feature_matrix(X)
        print(f"Feature matrix validated. Shape: ({X.shape[0]}, {X.shape[1]}). No NaN. No Inf. Ready.")
        
        X_broken = np.copy(X)
        X_broken[0, 2] = -100.0 
        try:
            validate_feature_matrix(X_broken)
            print("ERROR: validate_feature_matrix failed to catch negative asset value")
        except ValueError:
            pass
