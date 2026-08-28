from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["data"]["status"] == "healthy"

def test_model_info():
    response = client.get("/model-info")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert "model_name" in json_data["data"]
    assert "metrics" in json_data["data"]

def test_predict_success():
    payload = {
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
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert "tourist_safety_score" in json_data["data"]
    assert "risk_level" in json_data["data"]
    assert "explanation" in json_data["data"]

def test_predict_validation_error():
    # Out of range (crime_risk_index = 150.0 is invalid)
    payload = {
        "crime_risk_index": 150.0,
        "accident_risk_index": 40.0,
        "road_condition_score": 75.0,
        "sanitation_hygiene_score": 85.0,
        "public_review_score": 88.0,
        "emergency_access_score": 80.0,
        "environment_score": 70.0,
        "infrastructure_score": 78.0,
        "tourist_facilities_score": 82.0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 400
    json_data = response.json()
    assert json_data["success"] is False
    assert "Validation error" in json_data["message"]

def test_predict_location_success():
    payload = {
        "latitude": 20.2961,  # Near Bhubaneswar
        "longitude": 85.8245
    }
    response = client.post("/predict-location", json=payload)
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert "matched_area" in json_data["data"]
    assert "tourist_safety_score" in json_data["data"]
    assert "distance_meters" in json_data["data"]

def test_predict_location_validation_error():
    # Latitude out of bounds
    payload = {
        "latitude": 100.0,
        "longitude": 85.8245
    }
    response = client.post("/predict-location", json=payload)
    assert response.status_code == 400
    json_data = response.json()
    assert json_data["success"] is False

def test_nearby_zones_success():
    response = client.get("/nearby-zones?latitude=20.2961&longitude=85.8245&radius=10000")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert isinstance(json_data["data"], list)

def test_safer_areas_success():
    response = client.get("/safer-areas?latitude=20.2961&longitude=85.8245&radius=10000")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert "current_safety_score" in json_data["data"]
    assert "recommendations" in json_data["data"]
