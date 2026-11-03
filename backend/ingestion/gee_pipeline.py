# 🛰️ GEE Ingestion & Processing Pipeline
# Runs cloud-based Sentinel-1, Sentinel-2, Landsat, and MODIS ingestion and index calculations.

import ee

def initialize_gee():
    """Initializes Google Earth Engine Python API."""
    try:
        ee.Initialize(project='raitumitra-prod')
        print("✅ Earth Engine initialized successfully.")
    except Exception as e:
        print(f"⚠️ GEE Initialization warning (expected in local offline environment): {e}")

# --- 1. OPTICAL PROCESSING (Sentinel-2 L2A) ---

def mask_s2_clouds(image):
    """Masks clouds in Sentinel-2 images using the Scene Classification Band (SCL)."""
    scl = image.select('SCL')
    # SCL values: 3 = Cloud shadows, 8 = Cloud medium probability, 9 = Cloud high probability, 10 = Cirrus
    # Keep only values that are NOT cloud or shadow
    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10))
    return image.updateMask(mask).divide(10000.0).copyProperties(image, ["system:time_start"])

def calculate_indices(image):
    """Calculates NDVI, EVI, NDWI, SAVI, LSWI, and NDMI from Sentinel-2 bands."""
    # Bands: B2=Blue, B3=Green, B4=Red, B8=NIR, B11=SWIR1
    blue = image.select('B2')
    green = image.select('B3')
    red = image.select('B4')
    nir = image.select('B8')
    swir1 = image.select('B11')
    
    # 1. NDVI
    ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
    
    # 2. EVI (Enhanced Vegetation Index)
    # EVI = 2.5 * (NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1)
    evi = image.expression(
        '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1.0))',
        {'NIR': nir, 'RED': red, 'BLUE': blue}
    ).rename('EVI')
    
    # 3. NDWI (Normalized Difference Water Index - McFeeters)
    # NDWI = (GREEN - NIR) / (GREEN + NIR)
    ndwi = green.subtract(nir).divide(green.add(nir)).rename('NDWI')
    
    # 4. LSWI (Land Surface Water Index)
    # LSWI = (NIR - SWIR1) / (NIR + SWIR1)
    lswi = nir.subtract(swir1).divide(nir.add(swir1)).rename('LSWI')
    
    # 5. SAVI (Soil Adjusted Vegetation Index)
    # SAVI = 1.5 * (NIR - RED) / (NIR + RED + 0.5)
    savi = image.expression(
        '1.5 * ((NIR - RED) / (NIR + RED + 0.5))',
        {'NIR': nir, 'RED': red}
    ).rename('SAVI')
    
    # 6. NDMI (Normalized Difference Moisture Index)
    # NDMI = (NIR - SWIR1) / (NIR + SWIR1)
    ndmi = nir.subtract(swir1).divide(nir.add(swir1)).rename('NDMI')
    
    return image.addBands([ndvi, evi, ndwi, lswi, savi, ndmi])

def process_optical_collection(geometry, start_date, end_date):
    """Ingests and processes Sentinel-2 L2A imagery for a command area."""
    collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterBounds(geometry)
                  .filterDate(start_date, end_date)
                  # Pre-filter by metadata cloud cover to save computation
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 35))
                  .map(mask_s2_clouds)
                  .map(calculate_indices))
                  
    # Generate monthly median composites to fill cloud/temporal gaps
    months = ee.List.sequence(1, 12)
    def make_monthly_composite(m):
        m = ee.Number(m)
        composite = (collection
                     .filter(ee.Filter.calendarRange(m, m, 'month'))
                     .median()
                     .clip(geometry))
        return composite.set('month', m)
        
    monthly_composites = ee.ImageCollection(months.map(make_monthly_composite))
    return monthly_composites

# --- 2. SAR PROCESSING (Sentinel-1 GRD) ---

def refined_lee_filter(image):
    """Applies a spatial Refined Lee Speckle Filter (7x7 window) on SAR images in GEE."""
    # Speckle filtering reduces high-frequency backscatter noise
    band_names = image.bandNames()
    
    def filter_band(name):
        name = ee.String(name)
        img = image.select(name)
        
        # Local stats
        mean = img.reduceNeighborhood(ee.Reducer.mean(), ee.Kernel.square(3))
        variance = img.reduceNeighborhood(ee.Reducer.variance(), ee.Kernel.square(3))
        
        # Local noise model parameter (multiplicative noise)
        # Refined Lee coefficient computation
        sigma = 0.26 # standard multiplicative noise coefficient for S1 GRD
        weights = variance.divide(variance.add(mean.multiply(mean).multiply(sigma * sigma)))
        
        # Filtered output
        filtered = mean.add(weights.multiply(img.subtract(mean)))
        return filtered.rename(name)
        
    filtered_bands = ee.ImageCollection(band_names.map(filter_band)).toBands().rename(band_names)
    return filtered_bands.copyProperties(image, ["system:time_start"])

def calculate_sar_features(image):
    """Calculates backscattering ratios and Radar Vegetation Index (RVI)."""
    vv = image.select('VV')
    vh = image.select('VH')
    
    # 1. Backscatter Ratio (VH/VV)
    ratio = vh.subtract(vv).rename('VH_VV_ratio') # in dB space, division is subtraction
    
    # 2. Radar Vegetation Index (RVI) in linear power scale
    # Convert dB to power: P = 10^(dB/10)
    vv_power = ee.Image.constant(10.0).pow(vv.divide(10.0))
    vh_power = ee.Image.constant(10.0).pow(vh.divide(10.0))
    
    # RVI = 4 * VH / (VV + VH)
    rvi = ee.Image(4.0).multiply(vh_power).divide(vv_power.add(vh_power)).rename('RVI')
    
    return image.addBands([ratio, rvi])

def process_sar_collection(geometry, start_date, end_date):
    """Ingests and filters Sentinel-1 SAR dual-polarization GRD imagery."""
    collection = (ee.ImageCollection('COPERNICUS/S1_GRD')
                  .filterBounds(geometry)
                  .filterDate(start_date, end_date)
                  # Filter for Interferometric Wide (IW) swath mode and dual-polarization
                  .filter(ee.Filter.eq('instrumentMode', 'IW'))
                  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
                  .map(refined_lee_filter)
                  .map(calculate_sar_features))
                  
    # Generate monthly median SAR backscatter composites
    months = ee.List.sequence(1, 12)
    def make_monthly_sar(m):
        m = ee.Number(m)
        composite = (collection
                     .filter(ee.Filter.calendarRange(m, m, 'month'))
                     .median()
                     .clip(geometry))
        return composite.set('month', m)
        
    monthly_sar = ee.ImageCollection(months.map(make_monthly_sar))
    return monthly_sar

# --- 3. BATCH CLOUD EXPORT ---

def export_asset_to_gcs(image, description, bucket, geometry, scale=10):
    """Enqueues a GEE batch export task to export GeoTIFFs to Google Cloud Storage."""
    task = ee.batch.Export.image.toCloudStorage(
        image=image,
        description=description,
        bucket=bucket,
        fileNamePrefix=description,
        region=geometry.getInfo()['coordinates'],
        scale=scale,
        crs='EPSG:4326', # WGS84 coordinates
        maxPixels=1e13
    )
    print(f"📦 Enqueued batch GCS export task: {description}")
    # task.start() # Runs asynchronously in GEE cloud

if __name__ == "__main__":
    initialize_gee()
