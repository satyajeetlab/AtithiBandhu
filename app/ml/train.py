import os
import json
from datetime import datetime
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

# Import local preprocessing modules
from app.ml.feature_processing import FEATURES, TARGET, SafetyFeaturePreprocessor, load_and_preprocess_raw_data

def train_and_select_model():
    # Setup directories
    os.makedirs("models", exist_ok=True)
    
    raw_data_path = "data/raw/india_tourist_safety_5000_area_dataset.csv"
    if not os.path.exists(raw_data_path):
        print(f"Error: Raw dataset not found at {raw_data_path}. Please place it there.")
        return False
        
    print(f"Loading and preprocessing dataset from {raw_data_path}...")
    X, y = load_and_preprocess_raw_data(raw_data_path)
    print(f"Cleaned dataset size: {X.shape[0]} rows.")

    # Split into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Train set size: {X_train.shape[0]}, Test set size: {X_test.shape[0]}")

    # Fit the feature preprocessor
    preprocessor = SafetyFeaturePreprocessor()
    preprocessor.fit(X_train)
    
    # Transform train and test features
    X_train_clean = preprocessor.transform(X_train)
    X_test_clean = preprocessor.transform(X_test)

    # Define candidate models
    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(random_state=42, n_estimators=100, n_jobs=-1),
        "Extra Trees": ExtraTreesRegressor(random_state=42, n_estimators=100, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(random_state=42, n_estimators=100)
    }

    # Optional: Try importing XGBoost and LightGBM
    try:
        import xgboost as xgb
        models["XGBoost"] = xgb.XGBRegressor(random_state=42, n_estimators=100, n_jobs=-1)
        print("XGBoost is available and added to training options.")
    except ImportError:
        pass

    try:
        import lightgbm as lgb
        models["LightGBM"] = lgb.LGBMRegressor(random_state=42, n_estimators=100, n_jobs=-1, verbose=-1)
        print("LightGBM is available and added to training options.")
    except ImportError:
        pass

    results = []
    trained_models = {}

    print("\nTraining and evaluating models...")
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train_clean, y_train)
        
        # Predict on test set
        y_pred = model.predict(X_test_clean)
        
        # Calculate metrics
        mae = mean_absolute_error(y_test, y_pred)
        rmse = root_mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        results.append({
            "Model": name,
            "MAE": mae,
            "RMSE": rmse,
            "R2": r2
        })
        trained_models[name] = model

    # Generate comparison table
    df_results = pd.DataFrame(results)
    print("\n" + "="*60)
    print("MODEL COMPARISON TABLE")
    print("="*60)
    print(df_results.to_string(index=False))
    print("="*60)

    # Select best model based on lowest RMSE
    best_row = df_results.loc[df_results['RMSE'].idxmin()]
    best_model_name = best_row['Model']
    print(f"\nBest Model Selected Automatically: {best_model_name} (RMSE: {best_row['RMSE']:.4f})")

    # Retrain preprocessor and best model on the ENTIRE dataset for final persistence
    print(f"\nRetraining preprocessor and '{best_model_name}' on the entire dataset of {X.shape[0]} rows...")
    final_preprocessor = SafetyFeaturePreprocessor()
    final_preprocessor.fit(X)
    X_clean_full = final_preprocessor.transform(X)
    
    # Instantiate a fresh copy of the best model architecture
    if best_model_name == "Linear Regression":
        final_model = LinearRegression()
    elif best_model_name == "Random Forest":
        final_model = RandomForestRegressor(random_state=42, n_estimators=100, n_jobs=-1)
    elif best_model_name == "Extra Trees":
        final_model = ExtraTreesRegressor(random_state=42, n_estimators=100, n_jobs=-1)
    elif best_model_name == "Gradient Boosting":
        final_model = GradientBoostingRegressor(random_state=42, n_estimators=100)
    elif best_model_name == "XGBoost":
        import xgboost as xgb
        final_model = xgb.XGBRegressor(random_state=42, n_estimators=100, n_jobs=-1)
    elif best_model_name == "LightGBM":
        import lightgbm as lgb
        final_model = lgb.LGBMRegressor(random_state=42, n_estimators=100, n_jobs=-1, verbose=-1)

    final_model.fit(X_clean_full, y)

    # Save model and preprocessor
    model_path = "models/safety_model.joblib"
    preprocessor_path = "models/preprocessor.joblib"
    
    joblib.dump(final_model, model_path)
    joblib.dump(final_preprocessor, preprocessor_path)
    print(f"Saved model to {model_path}")
    print(f"Saved preprocessor to {preprocessor_path}")

    # Check for target leakage
    # If R2 is extremely close to 1.0 (e.g. > 0.999), it is highly likely that there is target leakage.
    leakage_warning = False
    if best_row['R2'] > 0.999:
        leakage_warning = True
        print("\n[WARNING] Target leakage detected! R² is extremely close to 1.0. This indicates the safety score might be generated directly from the inputs using a fixed formula.")

    # Save metadata
    metadata = {
        "model_name": best_model_name,
        "model_version": "1.0.0",
        "training_dataset_size": X.shape[0],
        "features": FEATURES,
        "metrics": {
            "mae": float(best_row['MAE']),
            "rmse": float(best_row['RMSE']),
            "r2": float(best_row['R2'])
        },
        "training_timestamp": datetime.now().isoformat(),
        "dataset_status": "SYNTHETIC_STARTER_DO_NOT_TREAT_AS_REAL",
        "target_leakage_detected": leakage_warning
    }
    
    metadata_path = "models/model_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=4)
    print(f"Saved metadata to {metadata_path}")
    
    return True

if __name__ == "__main__":
    train_and_select_model()
