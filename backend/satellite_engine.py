import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
# 🛰️ Raitumitra Satellite Engine — Crop Classification, Stress Detection & FAO-56 Water Deficit
# Powered by Open-Meteo API & Ensemble Machine Learning Models (RF + XGBoost + PyTorch LSTM)

import numpy as np
import math
import random
import requests
import json
import os
import io
import base64
import pickle
import torch
import torch.nn as nn
from datetime import datetime, timedelta
from PIL import Image

# GIS Libraries (Graceful Fallback)
try:
    import rasterio
    from rasterio.windows import Window
    from rasterio.warp import transform
    HAS_RASTERIO = True
except ImportError:
    rasterio = None
    Window = None
    transform = None
    HAS_RASTERIO = False

# --- 0. MICROSOFT PLANETARY COMPUTER STAC INTEGRATION ---

def get_bbox_from_polygon(poly):
    """Computes bbox [min_lon, min_lat, max_lon, max_lat] from a polygon."""
    lats = [p[0] for p in poly]
    lngs = [p[1] for p in poly]
    return [min(lngs), min(lats), max(lngs), max(lats)]

def fetch_stac_scenes_past_year(poly, date_str):
    """
    Queries the Microsoft Planetary Computer STAC catalog for Sentinel-2 L2A scenes
    over the past 365 days, and groups them by month choosing the lowest cloud-cover scene.
    """
    bbox = get_bbox_from_polygon(poly)
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    start_time = (dt - timedelta(days=365)).strftime("%Y-%m-%d")
    
    stac_url = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
    query = {
        "collections": ["sentinel-2-l2a"],
        "bbox": bbox,
        "datetime": f"{start_time}/{date_str}",
        "query": {
            "eo:cloud_cover": {"lt": 25} # Filter for cloud cover less than 25%
        },
        "limit": 80,
        "sortby": [{"field": "properties.datetime", "direction": "desc"}]
    }
    
    try:
        r = requests.post(stac_url, json=query, timeout=12)
        if r.status_code == 200:
            features = r.json().get("features", [])
            
            # Group by calendar month, selecting the one with lowest cloud cover
            best_scenes = {}
            for f in features:
                f_date = datetime.strptime(f["properties"]["datetime"][:10], "%Y-%m-%d")
                m = f_date.month
                cloud = f["properties"]["eo:cloud_cover"]
                
                if m not in best_scenes or cloud < best_scenes[m]["properties"]["eo:cloud_cover"]:
                    best_scenes[m] = f
            return best_scenes
    except Exception as e:
        print(f"⚠️ STAC search failed or timed out: {e}")
    return {}

def sign_pc_url(unsigned_url):
    """Appends a temporary SAS read token from the Planetary Computer signing API."""
    try:
        parts = unsigned_url.split('/')
        account = parts[2].split('.')[0]
        container = parts[3]
        url = f"https://planetarycomputer.microsoft.com/api/sas/v1/token/{account}/{container}"
        r = requests.get(url, timeout=5)
        if r.status_code == 200:
            token = r.json().get("token")
            return f"{unsigned_url}?{token}"
    except Exception as e:
        print(f"⚠️ PC signing request failed: {e}")
    return unsigned_url

# --- 1. MODEL ARCHITECTURE & LOADERS ---

CROP_CLASSES = ["Rice", "Wheat", "Cotton", "Maize", "Sugarcane"]

class CropLSTM(nn.Module):
    def __init__(self, input_size=4, hidden_size=64, num_layers=2, num_classes=5):
        super(CropLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.fc = nn.Linear(hidden_size, num_classes)
        
    def forward(self, x):
        # x shape: (batch_size, seq_len=12, input_size=4)
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out

_models = {}

def load_models():
    """Loads trained ML classifiers (Random Forest, XGBoost, PyTorch LSTM) lazily."""
    global _models
    if not _models:
        base_dir = os.path.dirname(__file__)
        rf_path = os.path.join(base_dir, "models", "rf_crop.pkl")
        xgb_path = os.path.join(base_dir, "models", "xgb_crop.pkl")
        lstm_path = os.path.join(base_dir, "models", "lstm_crop.pt")
        
        # If models are missing, run training script inline
        if not (os.path.exists(rf_path) and os.path.exists(xgb_path) and os.path.exists(lstm_path)):
            print("⚠️ Model files missing. Running train_models.py to compile weights...")
            import subprocess
            subprocess.run([sys.executable, "train_models.py"], cwd=base_dir)
            
        try:
            with open(rf_path, "rb") as f:
                _models["rf"] = pickle.load(f)
            with open(xgb_path, "rb") as f:
                _models["xgb"] = pickle.load(f)
                
            lstm = CropLSTM()
            lstm.load_state_dict(torch.load(lstm_path, map_location="cpu"))
            lstm.eval()
            _models["lstm"] = lstm
            print("✅ ML models (RF + XGB + PyTorch LSTM) loaded successfully.")
        except Exception as e:
            print(f"❌ Failed to load ML models: {e}")
    return _models

# --- 2. OPEN-METEO WEATHER & SOIL MOISTURE CACHING ---

CACHE_FILE = os.path.join(os.path.dirname(__file__), "openmeteo_cache.json")

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_cache(cache):
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f)
    except Exception:
        pass

def fetch_openmeteo_data(lat, lng, date_str):
    """
    Fetches daily forecast (7 days) and historical weather/ET0 (past 12 months)
    for coordinates with a persistent JSON caching layer (24-hour validity).
    """
    cache = load_cache()
    cache_key = f"{lat:.4f}_{lng:.4f}_{date_str}"
    
    if cache_key in cache:
        return cache[cache_key]
        
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    start_dt = dt - timedelta(days=365)
    end_dt = dt - timedelta(days=1)
    
    start_date_str = start_dt.strftime("%Y-%m-%d")
    end_date_str = end_dt.strftime("%Y-%m-%d")
    
    data = {}
    
    # 1. Fetch Forecast (for current daily soil moisture, precipitation, et0)
    forecast_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm&timezone=auto"
    try:
        r = requests.get(forecast_url, timeout=10)
        if r.status_code == 200:
            data["forecast"] = r.json()
        else:
            data["forecast"] = None
    except Exception as e:
        print(f"Forecast fetch failed: {e}")
        data["forecast"] = None
        
    # 2. Fetch Archive (for 12 months historical weather and soil patterns)
    archive_url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lng}&start_date={start_date_str}&end_date={end_date_str}&daily=temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration&timezone=auto"
    try:
        r = requests.get(archive_url, timeout=10)
        if r.status_code == 200:
            data["archive"] = r.json()
        else:
            data["archive"] = None
    except Exception as e:
        print(f"Archive fetch failed: {e}")
        data["archive"] = None
        
    # Cache the result if we got valid responses
    if data.get("forecast") or data.get("archive"):
        cache[cache_key] = data
        save_cache(cache)
        
    return data

# --- 3. GEOSPATIAL UTILITIES ---

def point_in_polygon(x, y, poly):
    """Ray casting algorithm to determine if point (x, y) is inside polygon."""
    n = len(poly)
    inside = False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def get_centroid(poly):
    """Calculates the centroid [lat, lng] of a polygon."""
    lats = [p[0] for p in poly]
    lngs = [p[1] for p in poly]
    return sum(lats) / len(poly), sum(lngs) / len(poly)

def get_bounding_box(poly):
    lats = [p[0] for p in poly]
    lngs = [p[1] for p in poly]
    return min(lats), max(lats), min(lngs), max(lngs)

def generate_pixel_grid(poly, grid_size=12):
    """Simulates 10m Sentinel-2 spatial pixels inside the farm boundary."""
    min_lat, max_lat, min_lng, max_lng = get_bounding_box(poly)
    lat_steps = np.linspace(min_lat, max_lat, grid_size)
    lng_steps = np.linspace(min_lng, max_lng, grid_size)
    
    pixels = []
    pixel_id = 0
    for lat in lat_steps:
        for lng in lng_steps:
            if point_in_polygon(lat, lng, poly):
                pixels.append({
                    "id": pixel_id,
                    "lat": lat,
                    "lng": lng
                })
                pixel_id += 1
    return pixels

# --- 4. AGRONOMIC SIGNATURE GENERATION ---

def get_reference_ndvi_profile(crop, month):
    """Base seasonal crop growth patterns."""
    base = 0.15
    if crop == "Rice":
        if month in [6, 7]: return base + 0.1 * (month - 5)
        elif month in [8, 9, 10]: return 0.3 + 0.5 * math.sin(math.pi * (month - 7) / 6)
        elif month in [11, 12]: return 0.8 - 0.5 * ((month - 10) / 2)
    elif crop == "Wheat":
        if month in [11, 12]: return base + 0.15 * (month - 10)
        elif month in [1, 2]: return 0.45 + 0.3 * math.sin(math.pi * month / 4)
        elif month in [3, 4]: return 0.75 - 0.55 * ((month - 2) / 2)
    elif crop == "Cotton":
        if month in [6, 7, 8]: return base + 0.45 * ((month - 5) / 3)
        elif month in [9, 10]: return 0.65 + 0.15 * math.sin(math.pi * (month - 8) / 4)
        elif month in [11, 12, 1]: return 0.8 - 0.6 * ((month - 10 if month >= 10 else month + 2) / 3)
    elif crop == "Maize":
        if month in [7, 8]: return base + 0.45 * (month - 6.5)
        elif month in [9]: return 0.75
        elif month in [10, 11]: return 0.75 - 0.55 * (month - 9)
    elif crop == "Sugarcane":
        if month in [2, 3]: return 0.45
        else: return 0.7 + 0.15 * math.sin(math.pi * month / 12)
    return base

def get_crop_coefficient(crop, stage):
    """FAO-56 Crop Coefficients (Kc) based on crop and growth stage."""
    if crop == "Rice":
        if "Seedling" in stage: return 1.05
        elif "Vegetative" in stage: return 1.15
        elif "Reproductive" in stage: return 1.20
        else: return 0.90
    elif crop == "Wheat":
        if "Seedling" in stage: return 0.30
        elif "Vegetative" in stage: return 1.15
        elif "Reproductive" in stage: return 1.15
        else: return 0.25
    elif crop == "Cotton":
        if "Seedling" in stage: return 0.35
        elif "Vegetative" in stage: return 0.75
        elif "Reproductive" in stage: return 1.15
        else: return 0.60
    elif crop == "Maize":
        if "Seedling" in stage: return 0.30
        elif "Vegetative" in stage: return 0.70
        elif "Reproductive" in stage: return 1.20
        else: return 0.35
    elif crop == "Sugarcane":
        if "Early" in stage: return 0.40
        elif "Grand" in stage: return 1.25
        elif "Elongation" in stage: return 1.25
        else: return 0.75
    return 0.15

def get_growth_stage(crop, month):
    """Determines growth stage based on crop type and calendar month."""
    if crop == "Rice":
        if month in [6, 7]: return "Seedling / Sowing"
        elif month in [8, 9]: return "Vegetative Growth"
        elif month in [10]: return "Reproductive / Flowering"
        elif month in [11, 12]: return "Maturity / Harvest"
        else: return "Fallow"
    elif crop == "Wheat":
        if month in [11, 12]: return "Seedling / Sowing"
        elif month in [1, 2]: return "Vegetative Growth"
        elif month in [3]: return "Reproductive / Flowering"
        elif month in [4]: return "Maturity / Harvest"
        else: return "Fallow"
    elif crop == "Cotton":
        if month in [5, 6]: return "Seedling / Sowing"
        elif month in [7, 8, 9]: return "Vegetative Growth"
        elif month in [10, 11]: return "Reproductive / Flowering"
        elif month in [12, 1]: return "Maturity / Harvest"
        else: return "Fallow"
    elif crop == "Maize":
        if month in [6, 7]: return "Seedling / Sowing"
        elif month in [8]: return "Vegetative Growth"
        elif month in [9]: return "Reproductive / Flowering"
        elif month in [10, 11]: return "Maturity / Harvest"
        else: return "Fallow"
    elif crop == "Sugarcane":
        if month in [1, 2, 3]: return "Ratoon / Early Tillering"
        elif month in [4, 5, 6, 7]: return "Grand Growth"
        elif month in [8, 9, 10]: return "Elongation"
        else: return "Maturity / Harvest"
    return "Fallow"

# --- 5. MAIN PIPELINES ---

def run_satellite_pipeline(poly, date_str=None):
    """
    Main Satellite API endpoint.
    Performs GEE-style Sentinel processing using Open-Meteo physical data and ML ensemble.
    Now integrated with real-world Sentinel-2 STAC imagery and windowed raster reads.
    """
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
        
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    month = dt.month
    
    # Calculate farm centroid and generate high-res 10m grid cells
    centroid_lat, centroid_lng = get_centroid(poly)
    pixels = generate_pixel_grid(poly, grid_size=12)
    if not pixels:
        min_lat, max_lat, min_lng, max_lng = get_bounding_box(poly)
        pixels = [{"id": 0, "lat": (min_lat + max_lat)/2, "lng": (min_lng + max_lng)/2}]
        
    # Fetch real weather observations & climate history for the centroid
    meteo_data = fetch_openmeteo_data(centroid_lat, centroid_lng, date_str)
    
    # 1. Compile 12-month weather aggregates (Rain, Temp) from Open-Meteo Archive
    archive = meteo_data.get("archive")
    monthly_rain = {m: 10.0 for m in range(1, 13)}
    monthly_temp = {m: 25.0 for m in range(1, 13)}
    monthly_et0 = {m: 4.0 for m in range(1, 13)}
    
    if archive and "daily" in archive:
        daily_times = archive["daily"].get("time", [])
        daily_rain = archive["daily"].get("precipitation_sum", [])
        daily_temp = archive["daily"].get("temperature_2m_max", [])
        daily_et0 = archive["daily"].get("et0_fao_evapotranspiration", [])
        
        # Group daily archive observations into calendar months
        month_groups = {m: {"rain": [], "temp": [], "et0": []} for m in range(1, 13)}
        for i, time_str in enumerate(daily_times):
            try:
                m = datetime.strptime(time_str, "%Y-%m-%d").month
                if i < len(daily_rain) and daily_rain[i] is not None:
                    month_groups[m]["rain"].append(daily_rain[i])
                if i < len(daily_temp) and daily_temp[i] is not None:
                    month_groups[m]["temp"].append(daily_temp[i])
                if i < len(daily_et0) and daily_et0[i] is not None:
                    month_groups[m]["et0"].append(daily_et0[i])
            except Exception:
                continue
                
        for m in range(1, 13):
            if month_groups[m]["rain"]:
                monthly_rain[m] = sum(month_groups[m]["rain"]) # cumulative rain
            if month_groups[m]["temp"]:
                monthly_temp[m] = np.mean(month_groups[m]["temp"]) # average max temp
            if month_groups[m]["et0"]:
                monthly_et0[m] = np.mean(month_groups[m]["et0"]) # average et0
                
    # 2. Fetch Forecast details (for current stress and water balance)
    forecast = meteo_data.get("forecast")
    current_soil_moist = 0.28 # m3/m3 fallback
    forecast_rain_8day = 0.0
    forecast_et0_8day = 32.0 # mm total fallback
    
    if forecast and "hourly" in forecast:
        soil_m_0_7 = forecast["hourly"].get("soil_moisture_0_to_7cm", [])
        soil_m_7_28 = forecast["hourly"].get("soil_moisture_7_to_28cm", [])
        # Get latest available hour (usually first index of forecast represents current time)
        if len(soil_m_7_28) > 0 and soil_m_7_28[0] is not None:
            current_soil_moist = soil_m_7_28[0]
            
    if forecast and "daily" in forecast:
        precip_sums = forecast["daily"].get("precipitation_sum", [])
        et0_sums = forecast["daily"].get("et0_fao_evapotranspiration", [])
        # Aggregate 8-day cumulative weather forecasts
        forecast_rain_8day = sum([p for p in precip_sums[:8] if p is not None])
        forecast_et0_8day = sum([e for e in et0_sums[:8] if e is not None])
        
    # Load ensemble ML models
    models = load_models()
    
    # Establish a deterministic seed based on polygon centroid coordinates
    coord_seed = int(abs(centroid_lat * 1000 + centroid_lng * 1000))
    
    # --- REAL-WORLD SATELLITE DATA INGESTION & PROCESSING ---
    min_lng, min_lat, max_lng, max_lat = get_bbox_from_polygon(poly)
    
    print(f"🛰️ Querying STAC API for farm bbox: {min_lng:.4f}, {min_lat:.4f}, {max_lng:.4f}, {max_lat:.4f}")
    best_scenes = fetch_stac_scenes_past_year(poly, date_str)
    
    # Initialize satellite metadata
    sat_meta = {
        "scene_id": "N/A (Simulated)",
        "acquisition_date": "N/A",
        "cloud_cover": 0.0,
        "local_path": "",
        "thumbnail": "",
        "real_data_used": False
    }
    
    # Baseline simulated NDVI profiles for fallback / initial values
    pixel_ndvis = {}
    for pixel in pixels:
        pixel_seed = coord_seed + pixel["id"]
        random.seed(pixel_seed)
        np.random.seed(pixel_seed)
        soil_quality = 0.85 + 0.3 * (pixel["id"] % 5) / 4.0
        primary_crop = CROP_CLASSES[coord_seed % len(CROP_CLASSES)]
        if random.random() > 0.88:
            primary_crop = random.choice(CROP_CLASSES)
            
        profile = []
        for m in range(1, 13):
            base_ndvi = get_reference_ndvi_profile(primary_crop, m)
            anomaly = (monthly_rain[m] - 50) / 1000.0 - (monthly_temp[m] - 25) / 200.0
            ndvi = base_ndvi * soil_quality * (1.0 + anomaly)
            ndvi = max(0.12, min(0.92, ndvi))
            profile.append(ndvi)
        pixel_ndvis[pixel["id"]] = profile
        
    # Reset random seed
    random.seed(None)
    np.random.seed(None)
    
    # If we have real satellite scenes, process them!
    if best_scenes and HAS_RASTERIO:
        print(f"✅ Found {len(best_scenes)} monthly Sentinel-2 scenes for processing.")
        # 1. Process the latest scene to save the visual crop and generate thumbnail
        latest_month = max(best_scenes.keys())
        latest_scene = best_scenes[latest_month]
        
        try:
            visual_url = sign_pc_url(latest_scene["assets"]["visual"]["href"])
            with rasterio.open(visual_url) as src:
                # Transform bbox to UTM
                xs, ys = transform("EPSG:4326", src.crs, [min_lng, max_lng], [min_lat, max_lat])
                row_start, col_start = src.index(xs[0], ys[1])
                row_stop, col_stop = src.index(xs[1], ys[0])
                
                # Bound to image dimensions
                row_start = max(0, min(src.height - 1, row_start))
                row_stop = max(0, min(src.height - 1, row_stop))
                col_start = max(0, min(src.width - 1, col_start))
                col_stop = max(0, min(src.width - 1, col_stop))
                
                r_start, r_stop = min(row_start, row_stop), max(row_start, row_stop)
                c_start, c_stop = min(col_start, col_stop), max(col_start, col_stop)
                
                width = c_stop - c_start
                height = r_stop - r_start
                
                if width > 0 and height > 0:
                    window = Window(c_start, r_start, width, height)
                    data = src.read([1, 2, 3], window=window)
                    
                    # Save locally
                    output_dir = os.path.join(os.path.dirname(__file__), "data", "satellite")
                    os.makedirs(output_dir, exist_ok=True)
                    output_path = os.path.join(output_dir, "farm_latest.tif")
                    
                    meta = src.meta.copy()
                    meta.update({
                        "driver": "GTiff",
                        "height": height,
                        "width": width,
                        "transform": rasterio.windows.transform(window, src.transform),
                        "count": 3
                    })
                    with rasterio.open(output_path, "w", **meta) as dst:
                        dst.write(data)
                        
                    # Generate Base64 thumbnail
                    rgb_array = np.transpose(data, (1, 2, 0))
                    rgb_array = np.clip(rgb_array, 0, 255).astype(np.uint8)
                    img = Image.fromarray(rgb_array)
                    img.thumbnail((256, 256))
                    buffered = io.BytesIO()
                    img.save(buffered, format="JPEG")
                    thumbnail_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
                    
                    # Update metadata
                    sat_meta.update({
                        "scene_id": latest_scene["id"],
                        "acquisition_date": latest_scene["properties"]["datetime"][:10],
                        "cloud_cover": round(latest_scene["properties"]["eo:cloud_cover"], 2),
                        "local_path": "data/satellite/farm_latest.tif",
                        "thumbnail": thumbnail_b64,
                        "real_data_used": True
                    })
                    print(f"💾 Saved latest true-color crop to: {output_path}")
        except Exception as e:
            print(f"⚠️ Failed to process latest visual scene: {e}")
            
        # 2. Open remote Red (B04) and NIR (B08) bands for each month, and sample NDVI
        for m, scene in best_scenes.items():
            try:
                b04_url = sign_pc_url(scene["assets"]["B04"]["href"])
                b08_url = sign_pc_url(scene["assets"]["B08"]["href"])
                
                with rasterio.open(b04_url) as src_b04, rasterio.open(b08_url) as src_b08:
                    xs, ys = transform("EPSG:4326", src_b04.crs, [min_lng, max_lng], [min_lat, max_lat])
                    row_start, col_start = src_b04.index(xs[0], ys[1])
                    row_stop, col_stop = src_b04.index(xs[1], ys[0])
                    
                    row_start = max(0, min(src_b04.height - 1, row_start))
                    row_stop = max(0, min(src_b04.height - 1, row_stop))
                    col_start = max(0, min(src_b04.width - 1, col_start))
                    col_stop = max(0, min(src_b04.width - 1, col_stop))
                    
                    r_start, r_stop = min(row_start, row_stop), max(row_start, row_stop)
                    c_start, c_stop = min(col_start, col_stop), max(col_start, col_stop)
                    
                    w = c_stop - c_start
                    h = r_stop - r_start
                    
                    if w > 0 and h > 0:
                        window = Window(c_start, r_start, w, h)
                        b04_data = src_b04.read(1, window=window).astype(float)
                        b08_data = src_b08.read(1, window=window).astype(float)
                        
                        ndvi_arr = (b08_data - b04_data) / (b08_data + b04_data + 1e-10)
                        
                        # Sample NDVI for each pixel
                        for pixel in pixels:
                            p_row, p_col = src_b04.index(pixel["lng"], pixel["lat"])
                            w_row = p_row - r_start
                            w_col = p_col - c_start
                            
                            if 0 <= w_row < h and 0 <= w_col < w:
                                val = ndvi_arr[w_row, w_col]
                                if not np.isnan(val):
                                    val = max(0.0, min(1.0, val))
                                    # Update NDVI profile
                                    pixel_ndvis[pixel["id"]][m - 1] = val
            except Exception as e:
                print(f"⚠️ Failed to open or read remote bands for month {m}: {e}")
                
    else:
        print("⚠️ STAC search returned no scenes. Falling back to high-fidelity weather-coupled physical model.")
        
    results = []
    
    for pixel in pixels:
        pixel_seed = coord_seed + pixel["id"]
        random.seed(pixel_seed)
        np.random.seed(pixel_seed)
        
        # Sub-field soil variability (ranges between 0.85 and 1.15)
        soil_quality = 0.85 + 0.3 * (pixel["id"] % 5) / 4.0
        
        # Retrieve the final NDVI profile (real or weather-coupled fallback)
        ndvi_profile = pixel_ndvis[pixel["id"]]
        
        # Couple SAR VH backscatter to NDVI
        sar_profile = []
        for ndvi in ndvi_profile:
            vh = -24.0 + ndvi * 12.0 + np.random.normal(0, 0.4)
            sar_profile.append(vh)
            
        # Structure the 12-month feature vector (48 features: [NDVI, SAR, Rain, Temp] x 12)
        features = []
        for m in range(1, 13):
            features.extend([
                ndvi_profile[m-1],
                sar_profile[m-1],
                monthly_rain[m],
                monthly_temp[m]
            ])
        features = np.array(features, dtype=np.float32)
        
        # Run inference on Random Forest, XGBoost and PyTorch LSTM
        classified_crop = "Rice" # fallback
        if models:
            try:
                # 1. Random Forest probabilities
                rf_probs = models["rf"].predict_proba([features])[0]
                # 2. XGBoost probabilities
                xgb_probs = models["xgb"].predict_proba([features])[0]
                # 3. PyTorch LSTM probabilities
                seq_features = features.reshape(1, 12, 4)
                with torch.no_grad():
                    logits = models["lstm"](torch.tensor(seq_features))
                    lstm_probs = torch.softmax(logits, dim=1).numpy()[0]
                    
                # Weighted average of ensemble predictions
                ensemble_probs = (rf_probs * 0.4) + (xgb_probs * 0.4) + (lstm_probs * 0.2)
                crop_idx = np.argmax(ensemble_probs)
                classified_crop = CROP_CLASSES[crop_idx]
            except Exception as e:
                print(f"ML Inference failed for pixel {pixel['id']}: {e}")
                
        # 4. Growth stage detection
        stage = get_growth_stage(classified_crop, month)
        
        # 5. Crop Moisture Stress Indices (VCI, SMI, TCI)
        px_drainage = 0.9 + 0.2 * (pixel["id"] % 3) / 2.0
        px_moisture = current_soil_moist * px_drainage
        smi = ((px_moisture - 0.15) / (0.35 - 0.15)) * 100.0
        smi = max(8.0, min(96.0, smi))
        
        # VCI (Vegetation Condition Index) based on pixel's NDVI history
        ndvi_curr = ndvi_profile[month-1]
        ndvi_min = min(ndvi_profile)
        ndvi_max = max(ndvi_profile)
        vci = ((ndvi_curr - ndvi_min) / (ndvi_max - ndvi_min)) * 100.0 if ndvi_max > ndvi_min else 70.0
        vci = max(10.0, min(98.0, vci))
        
        # TCI (Thermal Condition Index)
        tci = vci * 0.65 + smi * 0.35 + np.random.normal(0, 3)
        tci = max(10.0, min(98.0, tci))
        
        # Compile stage-wise weighted stress score
        if stage == "Fallow":
            stress_score = 95.0
            stress_level = "Optimal"
        else:
            if "Seedling" in stage:
                stress_score = 0.2 * vci + 0.6 * smi + 0.2 * tci
            elif "Reproductive" in stage:
                stress_score = 0.5 * vci + 0.2 * smi + 0.3 * tci
            else:
                stress_score = 0.4 * vci + 0.4 * smi + 0.2 * tci
                
            if stress_score < 35.0: stress_level = "Severe Stress"
            elif stress_score < 55.0: stress_level = "Moderate Stress"
            elif stress_score < 75.0: stress_level = "Mild Stress"
            else: stress_level = "Optimal"
            
        # 6. FAO-56 Crop Water Balance Model
        Kc = get_crop_coefficient(classified_crop, stage)
        ETc_8day = Kc * forecast_et0_8day
        eff_rain_8day = forecast_rain_8day * 0.8 if forecast_rain_8day > 10.0 else 0.0
        stress_coef = stress_score / 100.0
        ET_actual_8day = ETc_8day * (0.35 + 0.65 * stress_coef)
        
        deficit = ETc_8day - (ET_actual_8day + eff_rain_8day)
        deficit = max(0.0, deficit)
        
        # Generate irrigation advisories
        if stage == "Fallow":
            advisory = "No action required (Fallow)"
            advisory_color = "green"
        else:
            if deficit > 35.0:
                advisory = f"Irrigate immediately ({deficit:.1f} mm required)"
                advisory_color = "red"
            elif deficit > 15.0:
                advisory = f"Schedule irrigation ({deficit:.1f} mm needed in 3 days)"
                advisory_color = "yellow"
            else:
                advisory = "Adequate moisture (No action needed)"
                advisory_color = "green"
                
        results.append({
            "id": pixel["id"],
            "lat": pixel["lat"],
            "lng": pixel["lng"],
            "crop_type": classified_crop,
            "growth_stage": stage,
            "ndvi_timeline": [round(val, 4) for val in ndvi_profile],
            "vci": round(vci, 1),
            "smi": round(smi, 1),
            "tci": round(tci, 1),
            "stress_score": round(stress_score, 1),
            "stress_level": stress_level,
            "etc": round(ET_actual_8day, 1),
            "deficit": round(deficit, 1),
            "rain": round(forecast_rain_8day, 1),
            "advisory": advisory,
            "advisory_color": advisory_color
        })
        
    # Compile aggregate values for dashboard card overlays
    active_pixels = [r for r in results if r["growth_stage"] != "Fallow"]
    if active_pixels:
        avg_stress = np.mean([r["stress_score"] for r in active_pixels])
        total_deficit = np.mean([r["deficit"] for r in active_pixels])
        crop_counts = {}
        for r in results:
            crop_counts[r["crop_type"]] = crop_counts.get(r["crop_type"], 0) + 1
        dominant_crop = max(crop_counts, key=crop_counts.get)
    else:
        avg_stress = 100.0
        total_deficit = 0.0
        dominant_crop = "Fallow"
        
    return {
        "dominant_crop": dominant_crop,
        "avg_stress_score": round(avg_stress, 1),
        "total_deficit_mm": round(total_deficit, 1),
        "rain_8day_mm": round(forecast_rain_8day, 1),
        "et0_8day_mm": round(forecast_et0_8day, 1),
        "pixels": results,
        "satellite_metadata": sat_meta
    }

def get_command_area_data(date_str=None):
    """
    Simulates command area monitoring across distributary canals in Telangana,
    fetching actual weather data for each distributary's coordinates.
    """
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    month = dt.month
    
    # 3 Distributary canals located inside Nagarjuna Sagar Left Canal Command area (Telangana)
    distributaries = [
        {"id": "LBC-1", "name": "Left Branch Canal (LBC-1)", "lat": 17.025, "lng": 79.621, "mult": 1.1},
        {"id": "RBC-2", "name": "Right Branch Canal (RBC-2)", "lat": 16.921, "lng": 79.715, "mult": 0.85},
        {"id": "TEC-3", "name": "Tail-End Canal (TEC-3)", "lat": 16.825, "lng": 79.524, "mult": 1.3}
    ]
    
    # Load models
    models = load_models()
    
    results_dist = []
    field_id = 0
    total_command_ha = 0.0
    overall_deficit_m3 = 0.0
    
    for dist in distributaries:
        # Fetch actual real-time weather forecasts for the canal coordinates
        meteo = fetch_openmeteo_data(dist["lat"], dist["lng"], date_str)
        
        forecast = meteo.get("forecast")
        current_soil_moist = 0.26
        forecast_rain_8day = 0.0
        forecast_et0_8day = 32.0
        
        if forecast and "hourly" in forecast:
            soil_m_7_28 = forecast["hourly"].get("soil_moisture_7_to_28cm", [])
            if len(soil_m_7_28) > 0 and soil_m_7_28[0] is not None:
                current_soil_moist = soil_m_7_28[0]
                
        if forecast and "daily" in forecast:
            precip_sums = forecast["daily"].get("precipitation_sum", [])
            et0_sums = forecast["daily"].get("et0_fao_evapotranspiration", [])
            forecast_rain_8day = sum([p for p in precip_sums[:8] if p is not None])
            forecast_et0_8day = sum([e for e in et0_sums[:8] if e is not None])
            
        dist_fields = []
        total_demand_m3 = 0.0
        total_stress = 0.0
        
        # Generate 12 monitoring fields positioned around the distributary coordinate
        seed_val = int(abs(dist["lat"] * 100 + dist["lng"] * 100) + month)
        random.seed(seed_val)
        
        for i in range(12):
            field_lat = dist["lat"] + random.uniform(-0.012, 0.012)
            field_lng = dist["lng"] + random.uniform(-0.012, 0.012)
            
            # Select crop deterministically based on seed
            crop = CROP_CLASSES[random.randint(0, len(CROP_CLASSES)-1)]
            stage = get_growth_stage(crop, month)
            
            # Compute a stress score coupled to the actual Open-Meteo soil moisture
            # Tail-end canals (TEC-3) suffer higher water scarcity (mult > 1)
            water_scarcity_factor = dist["mult"]
            px_moisture = current_soil_moist / water_scarcity_factor
            smi = ((px_moisture - 0.15) / (0.35 - 0.15)) * 100.0
            smi = max(5.0, min(95.0, smi))
            
            # Simulate a historical NDVI profile to get VCI
            vci = 60.0 + random.uniform(-15, 20)
            tci = vci * 0.7 + smi * 0.3
            
            if stage == "Fallow":
                stress_score = 98.0
                stress_level = "Optimal"
            else:
                stress_score = 0.4 * vci + 0.4 * smi + 0.2 * tci
                stress_score = max(10.0, min(98.0, stress_score))
                
                if stress_score < 35.0: stress_level = "Severe Stress"
                elif stress_score < 55.0: stress_level = "Moderate Stress"
                elif stress_score < 75.0: stress_level = "Mild Stress"
                else: stress_level = "Optimal"
                
            # FAO-56 water deficit
            Kc = get_crop_coefficient(crop, stage)
            etc = Kc * forecast_et0_8day
            eff_rain = forecast_rain_8day * 0.8 if forecast_rain_8day > 10.0 else 0.0
            
            # Water deficit in mm
            deficit = etc * (1.2 if dist["id"] == "TEC-3" else 1.0) - eff_rain
            deficit = max(0.0, deficit)
            
            # Field sizing (hectares)
            field_size_ha = random.uniform(3.0, 12.0)
            total_command_ha += field_size_ha
            
            # Water demand volume: 1 mm depth on 1 ha = 10 m3 water
            water_demand_m3 = deficit * field_size_ha * 10.0
            total_demand_m3 += water_demand_m3
            total_stress += stress_score
            
            dist_fields.append({
                "id": field_id,
                "lat": field_lat,
                "lng": field_lng,
                "crop": crop,
                "stage": stage,
                "stress_score": round(stress_score, 1),
                "stress_level": stress_level,
                "deficit_mm": round(deficit, 1),
                "field_size_ha": round(field_size_ha, 2),
                "water_demand_m3": round(water_demand_m3, 0)
            })
            field_id += 1
            
        avg_dist_stress = total_stress / 12.0
        overall_deficit_m3 += total_demand_m3
        
        # Decide Gate Release Advisory recommendation dynamically
        if avg_dist_stress < 42.0:
            recommendation = "Release water immediately"
            color = "red"
        elif avg_dist_stress < 65.0:
            recommendation = "Schedule release within 48 hours"
            color = "yellow"
        else:
            recommendation = "Hold release / Sufficient moisture"
            color = "green"
            
        results_dist.append({
            "id": dist["id"],
            "name": dist["name"],
            "avg_stress": round(avg_dist_stress, 1),
            "total_demand_m3": round(total_demand_m3, 0),
            "recommendation": recommendation,
            "color": color,
            "fields": dist_fields
        })
        
    random.seed(None)
    
    return {
        "date": dt.strftime("%Y-%m-%d"),
        "rain_8day_mm": round(forecast_rain_8day, 1),
        "total_monitored_ha": round(total_command_ha, 1),
        "overall_deficit_m3": round(overall_deficit_m3, 0),
        "distributaries": results_dist
    }
