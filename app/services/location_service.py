import os
import pandas as pd
import numpy as np
from app.utils.geo_utils import haversine_distance

class LocationService:
    def __init__(self, 
                 dataset_path="data/raw/india_tourist_safety_5000_area_dataset.csv",
                 coordinates_path="data/raw/area_coordinates.csv"):
        self.dataset_path = dataset_path
        self.coordinates_path = coordinates_path
        
        self.df_merged = None
        self.has_coordinates = False
        self._load_and_merge_data()

    def _load_and_merge_data(self):
        if not os.path.exists(self.dataset_path):
            print(f"Warning: Main dataset not found at {self.dataset_path}")
            return
            
        df_main = pd.read_csv(self.dataset_path)
        
        if os.path.exists(self.coordinates_path):
            df_coords = pd.read_csv(self.coordinates_path)
            # Merge on area_id
            self.df_merged = pd.merge(df_main, df_coords, on="area_id", how="left")
            
            # Check if latitude and longitude columns are present and contain valid numbers
            if "latitude" in self.df_merged.columns and "longitude" in self.df_merged.columns:
                # Drop rows with null coordinates for geographic queries
                self.df_geographic = self.df_merged.dropna(subset=["latitude", "longitude"])
                if not self.df_geographic.empty:
                    self.has_coordinates = True
                    print(f"Location Service: Loaded {len(self.df_geographic)} areas with coordinates.")
                    return
                    
        # Fallback if no coordinate mapping exists
        self.df_merged = df_main
        self.df_geographic = pd.DataFrame()
        self.has_coordinates = False
        print("Location Service Warning: Coordinate mapping data is missing or empty. Location-based features will be disabled.")

    def find_nearest_area(self, lat: float, lon: float) -> tuple:
        """
        Finds the nearest area to the given latitude and longitude.
        Returns (matched_area_dict, distance_meters).
        """
        if not self.has_coordinates:
            raise ValueError(
                "Coordinate mapping data is unavailable. Please make sure data/raw/area_coordinates.csv is configured."
            )
            
        # Get coordinate vectors
        lats = self.df_geographic["latitude"].values
        lons = self.df_geographic["longitude"].values
        
        # Vectorized Haversine distance
        lat1_rad = np.radians(lat)
        lon1_rad = np.radians(lon)
        lats_rad = np.radians(lats)
        lons_rad = np.radians(lons)
        
        dlat = lats_rad - lat1_rad
        dlon = lons_rad - lon1_rad
        
        a = np.sin(dlat/2.0)**2 + np.cos(lat1_rad) * np.cos(lats_rad) * np.sin(dlon/2.0)**2
        c = 2.0 * np.arcsin(np.sqrt(a))
        r = 6371000.0  # Earth radius in meters
        distances = c * r
        
        # Find index of minimum distance
        min_idx = np.argmin(distances)
        nearest_distance = float(distances[min_idx])
        
        # Extract row
        nearest_row = self.df_geographic.iloc[min_idx].to_dict()
        
        return nearest_row, nearest_distance

    def find_areas_in_radius(self, lat: float, lon: float, radius_meters: float) -> list:
        """
        Finds all areas within a certain radius (in meters) of the given coordinates.
        Returns a list of dicts: [{"area": row_dict, "distance_meters": dist}, ...]
        """
        if not self.has_coordinates:
            raise ValueError(
                "Coordinate mapping data is unavailable. Please make sure data/raw/area_coordinates.csv is configured."
            )
            
        # Get coordinate vectors
        lats = self.df_geographic["latitude"].values
        lons = self.df_geographic["longitude"].values
        
        # Vectorized Haversine distance
        lat1_rad = np.radians(lat)
        lon1_rad = np.radians(lon)
        lats_rad = np.radians(lats)
        lons_rad = np.radians(lons)
        
        dlat = lats_rad - lat1_rad
        dlon = lons_rad - lon1_rad
        
        a = np.sin(dlat/2.0)**2 + np.cos(lat1_rad) * np.cos(lats_rad) * np.sin(dlon/2.0)**2
        c = 2.0 * np.arcsin(np.sqrt(a))
        r = 6371000.0  # Earth radius in meters
        distances = c * r
        
        # Find indices within radius
        indices_in_radius = np.where(distances <= radius_meters)[0]
        
        results = []
        for idx in indices_in_radius:
            row_dict = self.df_geographic.iloc[idx].to_dict()
            dist = float(distances[idx])
            results.append({
                "area": row_dict,
                "distance_meters": dist
            })
            
        # Sort by distance
        results = sorted(results, key=lambda x: x["distance_meters"])
        return results
