import json
import os
from fastapi import APIRouter, HTTPException, Query
from app.api.schemas import PredictionInputSchema, LocationInputSchema
from app.ml.predict import predict_safety_score
from app.ml.feature_processing import FEATURES
from app.utils.risk_classifier import classify_risk
from app.services.location_service import LocationService
from app.services.recommendation_service import RecommendationService
from app.services.explanation_service import ExplanationService
from app.config import config

router = APIRouter()

# Initialize services
try:
    location_service = LocationService(
        dataset_path=config.DATASET_PATH,
        coordinates_path=config.COORDINATES_PATH
    )
    recommendation_service = RecommendationService(location_service=location_service)
    explanation_service = ExplanationService(model_path=config.MODEL_PATH)
except Exception as e:
    print(f"Error initializing services: {e}")
    location_service = None
    recommendation_service = None
    explanation_service = None

def get_reliability_metric(features_provided: int, values_clipped: int) -> dict:
    """
    Computes a Prediction Reliability metric.
    Factors in data completeness and input validation quality.
    """
    completeness = features_provided / 9.0
    quality = max(0.0, 1.0 - (values_clipped * 0.05))
    
    score = completeness * quality
    percentage = int(round(score * 100))
    
    # Cap maximum reliability at 98% because no ML regression is 100% certain in real-world settings
    percentage = min(98, percentage)
    
    if percentage >= 90:
        label = "HIGH"
    elif percentage >= 70:
        label = "MEDIUM"
    else:
        label = "LOW"
        
    return {
        "percentage": percentage,
        "label": label,
        "calculation_basis": "Based on input data completeness (100%) and feature constraint mapping."
    }

@router.get("/")
def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "service": "Tourist Safety AI Backend",
            "version": config.VERSION
        },
        "message": "Health check successful."
    }

@router.get("/model-info")
def get_model_info():
    if not os.path.exists(config.METADATA_PATH):
        raise HTTPException(
            status_code=404, 
            detail="Model metadata file not found. Make sure the model has been trained."
        )
        
    try:
        with open(config.METADATA_PATH, 'r') as f:
            metadata = json.load(f)
        return {
            "success": True,
            "data": metadata,
            "message": "Model information retrieved successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading model metadata: {str(e)}")

@router.post("/predict")
def predict_safety(payload: PredictionInputSchema):
    try:
        input_data = payload.model_dump()
        
        # Predict safety score
        score = predict_safety_score(input_data)
        
        # Risk classification
        risk_classification = classify_risk(score)
        
        # Explanation
        explanation = explanation_service.explain_prediction(input_data)
        
        # Reliability metric (Since Pydantic ensures all 9 features exist, completeness is 100%)
        reliability = get_reliability_metric(features_provided=9, values_clipped=0)
        
        # Safe AI Disclaimer
        disclaimer = (
            "DISCLAIMER: This system utilizes synthetic dataset scores for hackathon validation. "
            "It should not be treated as a live index for actual crime rates or danger."
        )
        
        response_data = {
            "tourist_safety_score": score,
            "risk_level": risk_classification["risk_level"],
            "color_category": risk_classification["color_category"],
            "prediction_reliability": reliability,
            "explanation": explanation,
            "recommendation": risk_classification["recommendation"],
            "disclaimer": disclaimer
        }
        
        return {
            "success": True,
            "data": response_data,
            "message": "Prediction generated successfully."
        }
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal prediction error: {str(e)}")

@router.post("/predict-location")
def predict_location(payload: LocationInputSchema):
    if location_service is None or not location_service.has_coordinates:
        raise HTTPException(
            status_code=503,
            detail="Location services are unavailable. The area_coordinates.csv mapping file is missing."
        )
        
    try:
        lat = payload.latitude
        lon = payload.longitude
        
        # Find nearest area
        nearest_area, distance = location_service.find_nearest_area(lat, lon)
        
        # Extract features for ML prediction
        features = {col: nearest_area[col] for col in FEATURES}
        
        # Run ML model
        score = predict_safety_score(features)
        
        # Risk classification
        risk_classification = classify_risk(score)
        
        # Reliability metric
        # Check if coordinates are synthetic
        is_synthetic = nearest_area.get("is_synthetic", "NO") == "YES_SYNTHETIC"
        reliability = get_reliability_metric(features_provided=9, values_clipped=0)
        if is_synthetic:
            reliability["label"] = "MEDIUM (SYNTHETIC LOCATION MAPPING)"
            reliability["percentage"] = min(75, reliability["percentage"]) # Limit reliability for synthetic mapping
            
        disclaimer = (
            "DISCLAIMER: Matches are calculated against synthetic geographic coordinates. "
            "Do not rely on this matching for real-world route planning."
        )
        
        matched_area_info = {
            "area_id": nearest_area["area_id"],
            "locality": nearest_area["locality"],
            "district": nearest_area["district"],
            "state_ut": nearest_area["state_ut"],
            "latitude": float(nearest_area["latitude"]),
            "longitude": float(nearest_area["longitude"]),
            "is_synthetic_coordinate": is_synthetic
        }
        
        response_data = {
            "requested_location": {
                "latitude": lat,
                "longitude": lon
            },
            "matched_area": matched_area_info,
            "distance_meters": round(distance, 1),
            "tourist_safety_score": score,
            "risk_level": risk_classification["risk_level"],
            "color_category": risk_classification["color_category"],
            "prediction_reliability": reliability,
            "recommendation": risk_classification["recommendation"],
            "disclaimer": disclaimer
        }
        
        return {
            "success": True,
            "data": response_data,
            "message": "Location safety prediction completed."
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal location prediction error: {str(e)}")

@router.get("/nearby-zones")
def get_nearby_zones(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude center"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude center"),
    radius: float = Query(5000.0, gt=0.0, description="Radius in meters")
):
    if location_service is None or not location_service.has_coordinates:
        raise HTTPException(
            status_code=503,
            detail="Location services are unavailable. The area_coordinates.csv mapping file is missing."
        )
        
    try:
        # Find nearby zones within radius
        zones = location_service.find_areas_in_radius(latitude, longitude, radius)
        
        formatted_zones = []
        for item in zones:
            area = item["area"]
            distance = item["distance_meters"]
            
            # Predict safety score for each nearby area
            features = {col: area[col] for col in FEATURES}
            score = predict_safety_score(features)
            risk_classification = classify_risk(score)
            
            formatted_zones.append({
                "area_id": area["area_id"],
                "locality": area["locality"],
                "district": area["district"],
                "state_ut": area["state_ut"],
                "latitude": float(area["latitude"]),
                "longitude": float(area["longitude"]),
                "safety_score": score,
                "risk_level": risk_classification["risk_level"],
                "color_category": risk_classification["color_category"],
                "distance_meters": round(distance, 1)
            })
            
        return {
            "success": True,
            "data": formatted_zones,
            "message": f"Found {len(formatted_zones)} safety zones within {radius} meters."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error retrieving nearby zones: {str(e)}")

@router.get("/safer-areas")
def get_safer_areas(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude center"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude center"),
    radius: float = Query(5000.0, gt=0.0, description="Search radius in meters")
):
    if location_service is None or not location_service.has_coordinates:
        raise HTTPException(
            status_code=503,
            detail="Location services are unavailable. The area_coordinates.csv mapping file is missing."
        )
        
    try:
        # 1. Find nearest area to establish the current safety baseline
        nearest_area, distance = location_service.find_nearest_area(latitude, longitude)
        features = {col: nearest_area[col] for col in FEATURES}
        current_score = predict_safety_score(features)
        
        # 2. Get recommendations
        # Only return recommendations if current_score is risky/moderate (< 65)
        # Or if the user explicitly wants safer alternatives. The spec says:
        # "If the user's current area has score < 65, search nearby zones for safer alternatives."
        recommendations = []
        message = f"Current area safety score is {current_score} (SAFE). No alternative recommendations needed."
        
        if current_score < 65.0:
            recommendations = recommendation_service.get_safer_recommendations(
                lat=latitude,
                lon=longitude,
                current_score=current_score,
                radius_meters=radius
            )
            if recommendations:
                message = "Safer nearby alternatives found."
            else:
                message = "No safer nearby alternatives found within the search radius."
                
        risk_info = classify_risk(current_score)
        
        response_data = {
            "current_location": {
                "latitude": latitude,
                "longitude": longitude
            },
            "current_matched_area": {
                "area_id": nearest_area["area_id"],
                "locality": nearest_area["locality"],
                "safety_score": current_score,
                "risk_level": risk_info["risk_level"],
                "color_category": risk_info["color_category"]
            },
            "current_safety_score": current_score,
            "recommendations": recommendations
        }
        
        return {
            "success": True,
            "data": response_data,
            "message": message
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error getting safer recommendations: {str(e)}")
