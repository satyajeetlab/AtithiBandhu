import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

class Config:
    PROJECT_NAME = "AI-Powered Tourist Safety & Area Risk Intelligence System"
    VERSION = "1.0.0"
    
    # Model configuration
    MODEL_PATH = os.getenv("MODEL_PATH", "models/safety_model.joblib")
    PREPROCESSOR_PATH = os.getenv("PREPROCESSOR_PATH", "models/preprocessor.joblib")
    METADATA_PATH = os.getenv("METADATA_PATH", "models/model_metadata.json")
    
    # Dataset configuration
    DATASET_PATH = os.getenv("DATASET_PATH", "data/raw/india_tourist_safety_5000_area_dataset.csv")
    COORDINATES_PATH = os.getenv("COORDINATES_PATH", "data/raw/area_coordinates.csv")
    
    # CORS Configuration
    # Defaults to local dev server origins. In production, configure through the .env file.
    ALLOWED_ORIGINS = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
    ).split(",")

config = Config()
