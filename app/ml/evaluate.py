import os
import json
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from app.ml.feature_processing import load_and_preprocess_raw_data

def evaluate_model():
    raw_data_path = "data/raw/india_tourist_safety_5000_area_dataset.csv"
    model_path = "models/safety_model.joblib"
    preprocessor_path = "models/preprocessor.joblib"
    metadata_path = "models/model_metadata.json"
    
    if not all(os.path.exists(p) for p in [raw_data_path, model_path, preprocessor_path, metadata_path]):
        print("Error: Required files for evaluation are missing. Make sure to run 'python -m app.ml.train' first.")
        return
        
    # Load metadata
    with open(metadata_path, 'r') as f:
        meta = json.load(f)
        
    print("=== MODEL METADATA ===")
    print(f"Model Name: {meta.get('model_name')}")
    print(f"Model Version: {meta.get('model_version')}")
    print(f"Training Time: {meta.get('training_timestamp')}")
    print(f"Dataset Size: {meta.get('training_dataset_size')}")
    print(f"Saved MAE: {meta['metrics']['mae']:.4f}")
    print(f"Saved RMSE: {meta['metrics']['rmse']:.4f}")
    print(f"Saved R2: {meta['metrics']['r2']:.4f}")
    print(f"Target Leakage Warning: {meta.get('target_leakage_detected')}")
    print("======================")
    
    # Load dataset and evaluate on test split
    print("\nRunning evaluation on a fresh 20% test split to verify model validity...")
    X, y = load_and_preprocess_raw_data(raw_data_path)
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = joblib.load(model_path)
    preprocessor = joblib.load(preprocessor_path)
    
    X_test_clean = preprocessor.transform(X_test)
    y_pred = model.predict(X_test_clean)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = root_mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Verification Metrics on Test Split:")
    print(f"  MAE: {mae:.6f}")
    print(f"  RMSE: {rmse:.6f}")
    print(f"  R2: {r2:.6f}")

if __name__ == "__main__":
    evaluate_model()
