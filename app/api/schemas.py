from pydantic import BaseModel, Field

class PredictionInputSchema(BaseModel):
    crime_risk_index: float = Field(..., ge=0.0, le=100.0, description="Crime risk index (0 to 100, lower is safer)")
    accident_risk_index: float = Field(..., ge=0.0, le=100.0, description="Accident risk index (0 to 100, lower is safer)")
    road_condition_score: float = Field(..., ge=0.0, le=100.0, description="Road condition score (0 to 100, higher is safer)")
    sanitation_hygiene_score: float = Field(..., ge=0.0, le=100.0, description="Sanitation and hygiene score (0 to 100, higher is safer)")
    public_review_score: float = Field(..., ge=0.0, le=100.0, description="Public safety review score (0 to 100, higher is safer)")
    emergency_access_score: float = Field(..., ge=0.0, le=100.0, description="Emergency service access score (0 to 100, higher is safer)")
    environment_score: float = Field(..., ge=0.0, le=100.0, description="Environment quality score (0 to 100, higher is safer)")
    infrastructure_score: float = Field(..., ge=0.0, le=100.0, description="Infrastructure adequacy score (0 to 100, higher is safer)")
    tourist_facilities_score: float = Field(..., ge=0.0, le=100.0, description="Tourist facilities presence score (0 to 100, higher is safer)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "crime_risk_index": 35.0,
                "accident_risk_index": 40.0,
                "road_condition_score": 75.0,
                "sanitation_hygiene_score": 85.0,
                "public_review_score": 88.0,
                "emergency_access_score": 80.0,
                "environment_score": 70.0,
                "infrastructure_score": 78.0,
                "tourist_facilities_score": 82.0
            }
        }
    }

class LocationInputSchema(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude of the location")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude of the location")

    model_config = {
        "json_schema_extra": {
            "example": {
                "latitude": 22.5726,
                "longitude": 88.3639
            }
        }
    }
