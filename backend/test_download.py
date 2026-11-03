import os
import requests
import json
import rasterio
from rasterio.windows import Window
from rasterio.warp import transform
from datetime import datetime, timedelta

def search_sentinel_scene(lat, lng):
    # Search for a 30-day window around today
    dt = datetime.now()
    start_time = (dt - timedelta(days=60)).strftime("%Y-%m-%d")
    end_time = dt.strftime("%Y-%m-%d")
    
    # Bounding box around the point
    delta = 0.02
    bbox = [lng - delta, lat - delta, lng + delta, lat + delta]
    
    stac_url = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
    query = {
        "collections": ["sentinel-2-l2a"],
        "bbox": bbox,
        "datetime": f"{start_time}/{end_time}",
        "query": {
            "eo:cloud_cover": {"lt": 10}
        },
        "limit": 1,
        "sortby": [{"field": "properties.datetime", "direction": "desc"}]
    }
    
    r = requests.post(stac_url, json=query)
    if r.status_code == 200:
        features = r.json().get("features", [])
        if features:
            return features[0]
    return None

def sign_url(unsigned_url):
    parts = unsigned_url.split('/')
    account = parts[2].split('.')[0]
    container = parts[3]
    url = f"https://planetarycomputer.microsoft.com/api/sas/v1/token/{account}/{container}"
    r = requests.get(url)
    if r.status_code == 200:
        token = r.json().get("token")
        return f"{unsigned_url}?{token}"
    return unsigned_url

def download_cropped_satellite(lat, lng, output_path):
    print("🔍 Searching for latest cloud-free Sentinel-2 scene...")
    scene = search_sentinel_scene(lat, lng)
    if not scene:
        print("❌ No scenes found.")
        return False
        
    print(f"✅ Found scene: {scene['id']} (Cloud Cover: {scene['properties']['eo:cloud_cover']:.2f}%)")
    
    # We will download the 'visual' asset (True Color RGB GeoTIFF)
    visual_url = scene["assets"]["visual"]["href"]
    print("🔒 Signing asset URL...")
    signed_url = sign_url(visual_url)
    
    print("🛰️ Opening remote Cloud-Optimized GeoTIFF (COG)...")
    # Define bounding box for the crop (e.g. ~1.5km x 1.5km around the coordinate)
    delta = 0.008
    min_lat, max_lat = lat - delta, lat + delta
    min_lng, max_lng = lng - delta, lng + delta
    
    with rasterio.open(signed_url) as src:
        # Transform WGS84 (lat/lng) bounding box to the image UTM projection
        print(f"🌐 Image Projection (CRS): {src.crs}")
        xs, ys = transform("EPSG:4326", src.crs, [min_lng, max_lng], [min_lat, max_lat])
        
        # Convert UTM coordinates to pixel indices (row, col)
        # Note: y decreases as row increases, so max_y maps to row_start, min_y to row_stop
        row_start, col_start = src.index(xs[0], ys[1])
        row_stop, col_stop = src.index(xs[1], ys[0])
        
        # Bound to image dimensions
        row_start = max(0, min(src.height - 1, row_start))
        row_stop = max(0, min(src.height - 1, row_stop))
        col_start = max(0, min(src.width - 1, col_start))
        col_stop = max(0, min(src.width - 1, col_stop))
        
        # Ensure correct order
        r_start, r_stop = min(row_start, row_stop), max(row_start, row_stop)
        c_start, c_stop = min(col_start, col_stop), max(col_start, col_stop)
        
        width = c_stop - c_start
        height = r_stop - r_start
        
        print(f"📐 Crop Window: size={width}x{height} pixels (offset: col={c_start}, row={r_start})")
        
        if width <= 0 or height <= 0:
            print("❌ Invalid crop window size.")
            return False
            
        # Read the cropped window (3 bands: Red, Green, Blue)
        window = Window(c_start, r_start, width, height)
        data = src.read([1, 2, 3], window=window)
        
        # Prepare metadata for the output cropped GeoTIFF
        meta = src.meta.copy()
        meta.update({
            "driver": "GTiff",
            "height": height,
            "width": width,
            "transform": rasterio.windows.transform(window, src.transform),
            "count": 3
        })
        
        print(f"💾 Saving cropped GeoTIFF to {output_path}...")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with rasterio.open(output_path, "w", **meta) as dst:
            dst.write(data)
            
    print("🎉 Satellite crop successfully downloaded and saved!")
    return True

if __name__ == "__main__":
    # Nalgonda, Telangana coordinate
    download_cropped_satellite(17.025, 79.621, "data/satellite/test_crop.tif")
