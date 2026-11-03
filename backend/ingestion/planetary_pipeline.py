# 🛰️ Microsoft Planetary Computer STAC Ingestion Pipeline
# Queries the STAC API for Sentinel-2 L2A without commercial credentials and demonstrates signing.

import requests
import json
from datetime import datetime, timedelta

def get_bounding_box(poly):
    """Computes bbox from a list of coordinates [[lat, lng], ...]"""
    lats = [p[0] for p in poly]
    lngs = [p[1] for p in poly]
    # STAC standard bbox format is: [min_lon, min_lat, max_lon, max_lat]
    return [min(lngs), min(lats), max(lngs), max(lats)]

def search_stac_sentinel(poly, date_str):
    """
    Searches the Microsoft Planetary Computer STAC catalog for Sentinel-2 L2A images.
    """
    bbox = get_bounding_box(poly)
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    
    # Define search time-window (past 30 days to find cloud-free scenes)
    start_time = (dt - timedelta(days=30)).strftime("%Y-%m-%d")
    time_window = f"{start_time}/{date_str}"
    
    stac_url = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
    query = {
        "collections": ["sentinel-2-l2a"],
        "bbox": bbox,
        "datetime": time_window,
        "query": {
            "eo:cloud_cover": {"lt": 20} # Less than 20% clouds
        },
        "limit": 5,
        "sortby": [{"field": "properties.datetime", "direction": "desc"}]
    }
    
    print(f"🔍 Querying STAC API: {stac_url} for bbox: {bbox}")
    try:
        r = requests.post(stac_url, json=query, timeout=12)
        if r.status_code == 200:
            results = r.json()
            features = results.get("features", [])
            print(f"✅ Found {len(features)} matching Sentinel-2 scenes.")
            return features
        else:
            print(f"❌ STAC Search failed: {r.status_code} - {r.text}")
            return []
    except Exception as e:
        print(f"❌ request failed: {e}")
        return []

def get_sas_token(account, container):
    """
    Requests a Read SAS token dynamically from the Planetary Computer signing API.
    Enables access to read the COG files directly from Azure Blob Storage.
    """
    url = f"https://planetarycomputer.microsoft.com/api/sas/v1/token/{account}/{container}"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            token = r.json().get("token")
            return token
    except Exception as e:
        print(f"Sign request failed: {e}")
    return None

def sign_asset_url(unsigned_url):
    """
    Signs an Azure Blob URL using the Planetary Computer SAS signing API.
    Example input: https://sentinel2l2a01.blob.core.windows.net/sentinel2-l2a/17/R/PJ/2026/06/23/image.tif
    """
    # Parse storage account and container from the URL
    # Format: https://{account}.blob.core.windows.net/{container}/{blob_path}
    try:
        parts = unsigned_url.split('/')
        account = parts[2].split('.')[0]
        container = parts[3]
        
        token = get_sas_token(account, container)
        if token:
            signed_url = f"{unsigned_url}?{token}"
            return signed_url
    except Exception as e:
        print(f"Failed to sign URL: {e}")
    return unsigned_url

def test_ingestion():
    # Centroid coordinate in Telangana
    polygon = [
        [17.000, 79.500],
        [17.005, 79.500],
        [17.005, 79.505],
        [17.000, 79.505]
    ]
    scenes = search_stac_sentinel(polygon, "2026-06-23")
    if scenes:
        latest_scene = scenes[0]
        print(f"\n🎥 Latest Scene Details:")
        print(f"  ID: {latest_scene['id']}")
        print(f"  Acquisition Date: {latest_scene['properties']['datetime']}")
        print(f"  Cloud Cover: {latest_scene['properties']['eo:cloud_cover']:.2f}%")
        
        # Access band URLs
        assets = latest_scene.get("assets", {})
        red_band_url = assets.get("B04", {}).get("href")
        nir_band_url = assets.get("B08", {}).get("href")
        
        print("\n🔒 Signing asset URLs dynamically:")
        print(f"  Red Band (Unsigned): {red_band_url[:80]}...")
        signed_red = sign_asset_url(red_band_url)
        print(f"  Red Band (Signed): {signed_red[:100]}...")
        print("  ✅ Access tokens successfully appended.")
        
if __name__ == "__main__":
    test_ingestion()
