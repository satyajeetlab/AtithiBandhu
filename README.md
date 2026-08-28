# AtithiBandhu — Smart Tourist Safety & Area Risk Intelligence System

AtithiBandhu is an AI-powered safety platform for tourists. It combines a MERN-stack frontend and real-time dashboard with a **high-performance Python AI/ML backend and geospatial intelligence engine**.

---

## SYSTEM ARCHITECTURE & INTEGRATION

The project is structured to run the React/Node.js application alongside the Python AI/ML microservice:

```text
                 Frontend (React / Leaflet Map)
                     │
                     ▼
              Node.js Services (Auth, Sockets, Mongo)
                     │
              REST API / HTTP
                     │
                     ▼
         Python AI/ML Backend (FastAPI / Uvicorn)
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
     ML Model     Geo Engine    Dataset
```

* **Frontend & Real-Time Tracking:** Uses Leaflet maps and Socket.io to stream real-time location logs from tourist devices.
* **Blockchain-based digital ID:** An append-only SHA-256 hash-chained ledger stored in MongoDB to verify tourist credentials and prevent tampering.
* **Python AI/ML Backend:** Handles dataset preprocessing, model training and selection, geospatial Haversine calculations, explainable AI (XAI) feature impact, and REST safety APIs.

---

## PYTHON AI/ML BACKEND

The Python backend predicts the safety level of geographic areas in India for tourists. It analyzes multiple safety and risk factors and generates:
* **Tourist Safety Score (0–100)**
* **Risk Level Classification** (`VERY_SAFE`, `SAFE`, `MODERATE`, `RISKY`, `HIGH_RISK`) and color coding (`GREEN`, `YELLOW`, `ORANGE`, `RED`).
* **Safety Factor Breakdown** (Positive contributors vs. risk detractors).
* **Prediction Reliability Metric** (accounting for missing data, synthetic offsets, etc.).
* **Nearby Safety Zones & Safer Alternatives** (balances safety scores and distance).

### Project Directory Structure

```text
c:\Users\KIIT\Desktop\SIH PROJECT/
├── app/
│   ├── main.py                     # FastAPI server initialization & middleware
│   ├── config.py                   # Environment settings & CORS config
│   ├── api/
│   │   ├── routes.py               # REST API endpoints (/predict, /safer-areas, etc.)
│   │   └── schemas.py              # Pydantic schemas & validation
│   ├── services/
│   │   ├── location_service.py     # Vectorized coordinate mapping & search
│   │   ├── recommendation_service.py # Safer alternative ranking utility
│   │   └── explanation_service.py  # Model-based feature contribution analysis
│   ├── ml/
│   │   ├── train.py                # Regression model training & selection pipeline
│   │   ├── evaluate.py             # Validation & metadata verification script
│   │   ├── predict.py              # Serialized prediction wrapper
│   │   └── feature_processing.py   # Outlier clipping & preprocessing pipeline
│   └── utils/
│       ├── risk_classifier.py      # Deterministic score-to-risk classifier
│       └── geo_utils.py            # Haversine distance calculations
│
├── data/
│   ├── raw/
│   │   ├── india_tourist_safety_5000_area_dataset.csv  # Main dataset (5,000 areas)
│   │   └── area_coordinates.csv                        # Geolocation mapping file
│   └── processed/
│
├── models/
│   ├── safety_model.joblib          # Persisted best-performing model
│   ├── preprocessor.joblib          # Serialized preprocessor object
│   └── model_metadata.json          # Selected model metrics and train timestamp
│
├── tests/
│   ├── test_api.py                  # Integration tests for FastAPI endpoints
│   └── test_risk_classifier.py      # Unit tests for scoring categories
│
├── requirements.txt                 # Python dependencies
├── .env.example                     # Environment template
└── README.md                        # Project documentation (this file)
```

---

## GETTING STARTED (PYTHON BACKEND)

### 1. Prerequisites
Ensure Python 3.10+ is installed on your system. If not installed, you can create a virtual environment from a local Python bundle (e.g. from Blender/GIMP) or install Python 3.11/3.12 from the Microsoft Store.

### 2. Environment Setup
From the project root directory, run:

```bash
# Create virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Dataset Setup
* Place the main dataset file `india_tourist_safety_5000_area_dataset.csv` in `data/raw/`.
* The location service automatically reads geolocations from `data/raw/area_coordinates.csv`. (A synthetic set matching Odisha, Kolkata, and major states has been pre-generated for you).

### 4. Run the ML Pipeline
Train multiple regressor candidates (Linear Regression, Random Forest, Extra Trees, Gradient Boosting), compare metrics, and select the best model:

```bash
python -m app.ml.train
```

To verify the persisted model metrics and run a test-split validation:
```bash
python -m app.ml.evaluate
```

### 5. Run the FastAPI server
Start the REST API server:

```bash
uvicorn app.main:app --reload
```
The server will start on `http://127.0.0.1:8000`.

* **Swagger Docs:** `http://127.0.0.1:8000/docs`
* **ReDoc:** `http://127.0.0.1:8000/redoc`

### 6. Run Tests
Verify API stability and calculations using pytest:

```bash
python -m pytest
```

---

## API ENDPOINTS REFERENCE

All responses adhere to the standard JSON envelope: `{"success": true, "data": {...}, "message": "..."}`.

### `GET /`
Health check.

### `GET /model-info`
Returns information about the trained model, metrics ($R^2$, MAE, RMSE), version, and features.

### `POST /predict`
Generates a safety score and XAI breakdown from custom raw features.
* **Payload:**
  ```json
  {
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
  ```

### `POST /predict-location`
Finds the nearest matched area in India and returns safety scores.
* **Payload:**
  ```json
  {
    "latitude": 22.5726,
    "longitude": 88.3639
  }
  ```

### `GET /nearby-zones`
Returns all registered areas within a specific radius.
* **Query Parameters:** `latitude` (req), `longitude` (req), `radius` (in meters, default: 5000)

### `GET /safer-areas`
Suggests safer alternative locations within a radius if the current location is moderate/unsafe (score < 65).
* **Query Parameters:** `latitude` (req), `longitude` (req), `radius` (in meters, default: 5000)

---

## DATA SCIENCE & GEOSPATIAL VALIDATION

### Target Leakage Detection
During training, the pipeline automatically checks for **Target Leakage** (e.g. if the target was generated directly from input features via a weighted formula). 
* **Observation:** Linear Regression achieves a perfect $R^2 = 1.0$, while Random Forest/Gradient Boosting achieve $\approx 0.93 - 0.96$. This confirms that the dataset's `tourist_safety_score` was created using a weighted linear combination of the inputs. A target leakage flag has been saved in `model_metadata.json` for full audit transparency.

### Recommendation Ranking Formula
Alternative locations are ranked using a multi-criteria utility function:
$$\text{Utility} = \text{Safety Score} - \left( \frac{\text{Distance in Meters}}{100} \right)$$
* This implies a trade-off where a **1-point increase in safety score is worth traveling 100 meters**. Closer safe zones are prioritized over extremely distant very safe zones.

### Geospatial Calculations
The geofencing and proximity searches use the **Haversine formula** to calculate great-circle distances over the Earth's surface:
$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
For high-scale production systems, the numpy-vectorized search can be seamlessly replaced with a spatial index (e.g., PostgreSQL/PostGIS or R-Trees).

---

## LIMITATIONS & DISCLAIMERS
* **Synthetic Data Warning:** The current starter dataset (`SYNTHETIC_STARTER_DO_NOT_TREAT_AS_REAL`) uses simulated scores and coordinates. It should **never** be used for real-world navigation or danger predictions.
* **Production Integration:** To use real crime/accident indices, replace the contents of `data/raw/india_tourist_safety_5000_area_dataset.csv` with official statistics (e.g. NCRB records) and provide coordinates in `data/raw/area_coordinates.csv`.

---

## MERN BACKEND & FRONTEND SETUP (EXISTING)

### 1. Node.js Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: Set MONGO_URI and JWT_SECRET
npm run dev
```
Runs on `http://localhost:5000`.

### 2. Frontend
```bash
cd frontend
npm install
npm start
```
Runs on `http://localhost:3000`. Accepts browser geolocations.
