import numpy as np
from sklearn.ensemble import RandomForestClassifier
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import onnx
import onnxruntime as rt

rfc = RandomForestClassifier(n_estimators=10, max_depth=2).fit(np.random.rand(10, 12), np.random.randint(0, 3, 10))
onnx_model = convert_sklearn(
    rfc, 
    initial_types=[('input', FloatTensorType([None, 12]))],
    target_opset=17,
    options={type(rfc): {'zipmap': False}}
)

for out in onnx_model.graph.output:
    if out.name == 'label':
        out.name = 'path_label'
    elif out.name == 'probabilities':
        out.name = 'path_probabilities'
        
for node in onnx_model.graph.node:
    for i, out in enumerate(node.output):
        if out == 'label':
            node.output[i] = 'path_label'
        elif out == 'probabilities':
            node.output[i] = 'path_probabilities'

onnx.checker.check_model(onnx_model)
with open('test.onnx', 'wb') as f:
    f.write(onnx_model.SerializeToString())

sess = rt.InferenceSession('test.onnx')
print("Outputs:", [o.name for o in sess.get_outputs()])
