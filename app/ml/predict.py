import os
import joblib
import pandas as pd
import numpy as np

# Load model paths
MODEL_PATH = "models/safety_model.joblib"
PREPROCESSOR_PATH = "models/preprocessor.joblib"

_model = None
_preprocessor = None

def _load_model_and_preprocessor():
    global _model, _preprocessor
    if _model is None or _preprocessor is None:
        if not os.path.exists(MODEL_PATH) or not os.path.exists(PREPROCESSOR_PATH):
            raise FileNotFoundError(
                "Model files not found. Please train the model first by running 'python -m app.ml.train'."
            )
        _model = joblib.load(MODEL_PATH)
        _preprocessor = joblib.load(PREPROCESSOR_PATH)
    return _model, _preprocessor

def predict_safety_score(features_dict: dict) -> float:
    """
    Predicts the tourist safety score for a single set of feature inputs.
    Cleans inputs, runs prediction, and clips the final score to [0, 100].
    """
    model, preprocessor = _load_model_and_preprocessor()
    
    # Preprocess the input features
    df_features = pd.DataFrame([features_dict])
    df_clean = preprocessor.transform(df_features)
    
    # Generate prediction
    prediction = model.predict(df_clean)[0]
    
    # Clip score between 0 and 100 and round to 2 decimal places
    final_score = float(np.clip(prediction, 0.0, 100.0))
    return round(final_score, 2)
