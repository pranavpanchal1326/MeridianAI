import numpy as np
from sklearn.isotonic import IsotonicRegression
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

iso = IsotonicRegression(out_of_bounds='clip')
iso.fit(np.random.rand(10), np.random.rand(10))

try:
    convert_sklearn(iso, initial_types=[('input', FloatTensorType([None, 1]))], target_opset=17)
    print("Exported Isotonic")
except Exception as e:
    print("Isotonic failed:", str(e))
