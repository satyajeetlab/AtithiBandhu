import pandas as pd
import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin

# Define the features and target
FEATURES = [
    'crime_risk_index',
    'accident_risk_index',
    'road_condition_score',
    'sanitation_hygiene_score',
    'public_review_score',
    'emergency_access_score',
    'environment_score',
    'infrastructure_score',
    'tourist_facilities_score'
]

TARGET = 'tourist_safety_score'

class SafetyFeaturePreprocessor(BaseEstimator, TransformerMixin):
    """
    A robust custom transformer for safety features.
    Handles missing values and clips features to their valid 0-100 ranges.
    """
    def __init__(self):
        self.feature_defaults = {}

    def fit(self, X, y=None):
        # Store default values (median) for each feature to fill missing values during prediction
        if isinstance(X, pd.DataFrame):
            for col in FEATURES:
                if col in X.columns:
                    self.feature_defaults[col] = float(X[col].median())
                else:
                    self.feature_defaults[col] = 50.0  # Safe fallback
        else:
            X_arr = np.array(X)
            for idx, col in enumerate(FEATURES):
                self.feature_defaults[col] = float(np.median(X_arr[:, idx]))
        return self

    def transform(self, X):
        X_clean = X.copy()
        
        # If input is a dictionary, convert to DataFrame
        if isinstance(X_clean, dict):
            X_clean = pd.DataFrame([X_clean])
            
        # Ensure it's a DataFrame
        if not isinstance(X_clean, pd.DataFrame):
            X_clean = pd.DataFrame(X_clean, columns=FEATURES)

        for col in FEATURES:
            # Fill missing values
            if col not in X_clean.columns:
                X_clean[col] = self.feature_defaults.get(col, 50.0)
            else:
                X_clean[col] = X_clean[col].fillna(self.feature_defaults.get(col, 50.0))
            
            # Convert to numeric
            X_clean[col] = pd.to_numeric(X_clean[col], errors='coerce').fillna(self.feature_defaults.get(col, 50.0))
            
            # Clip values to valid range [0, 100]
            X_clean[col] = np.clip(X_clean[col], 0.0, 100.0)

        return X_clean[FEATURES]

def load_and_preprocess_raw_data(data_path: str):
    """
    Loads raw CSV data, handles duplicates, cleans records, and splits into X and y.
    """
    df = pd.read_csv(data_path)
    
    # 1. Remove duplicate records
    df = df.drop_duplicates()
    
    # 2. Check for missing values in target and drop those records
    df = df.dropna(subset=[TARGET])
    
    # 3. Separate features and target
    X = df[FEATURES]
    y = df[TARGET]
    
    # 4. Handle target variable constraints (safety score must be 0-100)
    y = np.clip(y, 0.0, 100.0)
    
    return X, y
