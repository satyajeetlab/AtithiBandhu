from app.services.location_service import LocationService
from app.ml.predict import predict_safety_score
from app.ml.feature_processing import FEATURES

class RecommendationService:
    def __init__(self, location_service: LocationService):
        self.location_service = location_service

    def get_safer_recommendations(self, 
                                  lat: float, 
                                  lon: float, 
                                  current_score: float, 
                                  radius_meters: float = 5000.0,
                                  limit: int = 5) -> list:
        """
        Recommends safer nearby areas when the current area has a safety score below 65.
        
        Ranking Formula:
          recommendation_score = safety_score - (distance_meters / 100.0)
          
        This means:
          - A 1-point increase in safety score is worth walking/traveling 100 meters.
          - High safety areas closer to the user are prioritized.
        """
        if not self.location_service.has_coordinates:
            raise ValueError("Coordinate mapping data is unavailable. Recommendations cannot be calculated.")
            
        # Find all zones within the radius
        nearby_zones = self.location_service.find_areas_in_radius(lat, lon, radius_meters)
        
        recommendations = []
        for zone in nearby_zones:
            area = zone["area"]
            distance = zone["distance_meters"]
            
            # Skip the exact same area if distance is practically zero
            if distance < 10.0:
                continue
                
            # Extract features for prediction
            features = {col: area[col] for col in FEATURES}
            
            # Predict safety score for the candidate area
            safety_score = predict_safety_score(features)
            
            # We only recommend areas that are considered "SAFE" or "VERY_SAFE" (score >= 65)
            # and are safer than the current area
            if safety_score >= 65.0 and safety_score > current_score:
                # Calculate recommendation utility score
                # 100 meters = 1 point penalty
                rec_score = safety_score - (distance / 100.0)
                
                # Risk level classification
                from app.utils.risk_classifier import classify_risk
                risk_info = classify_risk(safety_score)
                
                recommendations.append({
                    "area_id": area["area_id"],
                    "locality": area["locality"],
                    "district": area["district"],
                    "state_ut": area["state_ut"],
                    "latitude": float(area["latitude"]),
                    "longitude": float(area["longitude"]),
                    "safety_score": safety_score,
                    "distance_meters": round(distance, 1),
                    "risk_level": risk_info["risk_level"],
                    "color_category": risk_info["color_category"],
                    "recommendation_score": round(rec_score, 2)
                })
                
        # Sort recommendations by recommendation_score descending (best first)
        recommendations = sorted(recommendations, key=lambda x: x["recommendation_score"], reverse=True)
        
        return recommendations[:limit]
