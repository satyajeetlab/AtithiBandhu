import joblib
import os
import pandas as pd
import numpy as np
from app.ml.feature_processing import FEATURES

# Map internal feature names to user-friendly display names
FEATURE_DISPLAY_NAMES = {
    'crime_risk_index': 'Crime Safety (Low Crime)',
    'accident_risk_index': 'Accident Safety (Low Accident)',
    'road_condition_score': 'Road Infrastructure Quality',
    'sanitation_hygiene_score': 'Sanitation and Hygiene',
    'public_review_score': 'Public Review & Feedback',
    'emergency_access_score': 'Emergency Service Access',
    'environment_score': 'Environmental Quality',
    'infrastructure_score': 'General Infrastructure',
    'tourist_facilities_score': 'Tourist Amenities & Facilities'
}

class ExplanationService:
    def __init__(self, model_path="models/safety_model.joblib"):
        self.model_path = model_path
        self.model = None
        self.coefficients = None
        self.intercept = None
        self._load_model()

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                # Check if it has coef_ (Linear Regression)
                if hasattr(self.model, 'coef_'):
                    self.coefficients = self.model.coef_
                    self.intercept = self.model.intercept_
            except Exception as e:
                print(f"Error loading model in ExplanationService: {e}")

    def explain_prediction(self, features_dict: dict) -> dict:
        """
        Explains why a score was predicted based on input features and model coefficients.
        Returns lists of positive_factors and risk_factors.
        """
        positive_factors = []
        risk_factors = []
        
        # If model has coefficients, use them for exact linear contribution
        if self.coefficients is not None:
            contributions = {}
            for idx, col in enumerate(FEATURES):
                val = float(features_dict.get(col, 50.0))
                coef = float(self.coefficients[idx])
                contrib = coef * val
                contributions[col] = (val, contrib, coef)
                
            # Sort features by their contributions
            sorted_features = sorted(contributions.items(), key=lambda item: item[1][1], reverse=True)
            
            for col, (val, contrib, coef) in sorted_features:
                disp_name = FEATURE_DISPLAY_NAMES.get(col, col)
                
                # Check direction of coefficient to classify
                if coef >= 0:
                    # Positive coefficient feature (e.g. sanitation score)
                    # If the value is high, it's a strong positive contributor
                    if val >= 50.0:
                        positive_factors.append({
                            "factor": disp_name,
                            "value": round(val, 1),
                            "impact": "positive",
                            "score_contribution": round(contrib, 2)
                        })
                    else:
                        # Even though it has a positive coefficient, its low value acted as a detractor
                        risk_factors.append({
                            "factor": disp_name,
                            "value": round(val, 1),
                            "impact": "negative",
                            "description": "Needs improvement",
                            "score_contribution": round(contrib, 2)
                        })
                else:
                    # Negative coefficient feature (e.g. crime risk index)
                    # A high risk index reduces safety, acting as a negative factor
                    if val >= 40.0:
                        risk_factors.append({
                            "factor": disp_name,
                            "value": round(val, 1),
                            "impact": "negative",
                            "score_contribution": round(contrib, 2)
                        })
                    else:
                        # A low risk index increases safety, acting as a positive factor
                        positive_factors.append({
                            "factor": disp_name,
                            "value": round(val, 1),
                            "impact": "positive",
                            "description": "Low risk benefits safety",
                            "score_contribution": round(contrib, 2)
                        })
        else:
            # Fallback to rule-based explanation if coefficients are not available (e.g. tree models)
            for col in FEATURES:
                val = float(features_dict.get(col, 50.0))
                disp_name = FEATURE_DISPLAY_NAMES.get(col, col)
                
                if col in ['crime_risk_index', 'accident_risk_index']:
                    if val >= 40.0:
                        risk_factors.append({
                            "factor": disp_name,
                            "value": round(val, 1),
                            "impact": "negative"
                        })
                    else:
                        positive_factors.append({
                            "factor": disp_name,
                            "value": round(val, 1),
                            "impact": "positive",
                            "description": "Low risk benefits safety"
                        })
                else:
                    if val >= 70.0:
                        positive_factors.append({
                            "factor": disp_name,
                            "value": round(val, 1),
                            "impact": "positive"
                        })
                    elif val < 50.0:
                        risk_factors.append({
                            "factor": disp_name,
                            "value": round(val, 1),
                            "impact": "negative",
                            "description": "Needs improvement"
                        })
                        
        # Sort factors to return the most significant ones first
        positive_factors = sorted(positive_factors, key=lambda x: x.get('score_contribution', x['value']), reverse=True)
        risk_factors = sorted(risk_factors, key=lambda x: x.get('score_contribution', -x['value']))
        
        return {
            "positive_factors": positive_factors[:3],  # Top 3 positive factors
            "risk_factors": risk_factors[:3]          # Top 3 risk factors
        }
