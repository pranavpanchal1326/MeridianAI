import numpy as np
from sklearn.ensemble import IsolationForest
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

iso = IsolationForest(n_estimators=10, random_state=42)
iso.fit(np.random.rand(10, 12))

try:
    onnx_model = convert_sklearn(iso, initial_types=[('input', FloatTensorType([None, 12]))], target_opset={'': 17, 'ai.onnx.ml': 3})
    print("IsolationForest ONNX export succeeded.")
except Exception as e:
    print("IsolationForest ONNX export failed:", str(e))
