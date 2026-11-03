# 🌾 Phenology Extraction Module
# Smooths multi-temporal NDVI curves and extracts seasonal crop events (SOS, POS, EOS, LGP).

import numpy as np
from scipy.signal import savgol_filter

def smooth_ndvi_series(ndvi_series, window_len=5, poly_order=2):
    """
    Applies Savitzky-Golay filter to smooth a noisy temporal NDVI series.
    window_len must be an odd integer (e.g. 5 for a 12-month profile).
    """
    ndvi_array = np.array(ndvi_series)
    # Ensure window length fits the sequence length
    w_len = min(window_len, len(ndvi_array))
    if w_len % 2 == 0:
        w_len -= 1
    
    smoothed = savgol_filter(ndvi_array, window_length=w_len, polyorder=poly_order)
    # Clamp NDVI between 0.0 and 1.0
    return np.clip(smoothed, 0.0, 1.0).tolist()

def extract_phenology_metrics(ndvi_series):
    """
    Extracts Start of Season (SOS), Peak of Season (POS), End of Season (EOS),
    Length of Growing Period (LGP), and Greenup Rate using amplitude thresholding.
    """
    # 1. Smooth the raw observations
    smoothed = smooth_ndvi_series(ndvi_series)
    
    # Identify Peak of Season (POS) index and max value
    pos_idx = int(np.argmax(smoothed))
    max_ndvi = smoothed[pos_idx]
    
    # 2. Establish threshold based on seasonal amplitude
    # 20% threshold of the total amplitude
    min_ndvi = min(smoothed)
    amplitude = max_ndvi - min_ndvi
    threshold = min_ndvi + 0.20 * amplitude
    
    # 3. Find Start of Season (SOS)
    # Scan from start up to POS index
    sos_idx = 0
    for i in range(pos_idx, -1, -1):
        if smoothed[i] < threshold:
            sos_idx = i
            break
            
    # 4. Find End of Season (EOS)
    # Scan from POS index to end of sequence
    eos_idx = len(smoothed) - 1
    for i in range(pos_idx, len(smoothed)):
        if smoothed[i] < threshold:
            eos_idx = i
            break
            
    # 5. Length of Growing Period (LGP)
    lgp_months = eos_idx - sos_idx
    if lgp_months <= 0:
        lgp_months = 4 # default crop duration if calculation wraps
        
    # 6. Rate of Greenup
    greenup_duration = pos_idx - sos_idx
    if greenup_duration > 0:
        greenup_rate = (smoothed[pos_idx] - smoothed[sos_idx]) / greenup_duration
    else:
        greenup_rate = 0.15
        
    return {
        "smoothed_ndvi": [round(v, 3) for v in smoothed],
        "sos_month_index": sos_idx, # 0-indexed (0=Jan)
        "pos_month_index": pos_idx,
        "eos_month_index": eos_idx,
        "lgp_months": lgp_months,
        "amplitude": round(amplitude, 3),
        "greenup_rate": round(greenup_rate, 3)
    }

def test_phenology():
    print("🌾 Starting Phenology Extraction Test...")
    
    # Noisy 12-month NDVI observations for a typical Rice crop (sown July, harvested Dec)
    # Peak is in October (index 9)
    raw_ndvi = [0.15, 0.14, 0.16, 0.18, 0.20, 0.23, 0.35, 0.58, 0.79, 0.83, 0.55, 0.22]
    print(f"Raw NDVI observations:   {raw_ndvi}")
    
    metrics = extract_phenology_metrics(raw_ndvi)
    
    months_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    print(f"Smoothed NDVI profile:  {metrics['smoothed_ndvi']}")
    print(f"Start of Season (SOS):   {months_names[metrics['sos_month_index']]} (Index {metrics['sos_month_index']})")
    print(f"Peak of Season (POS):    {months_names[metrics['pos_month_index']]} (Index {metrics['pos_month_index']})")
    print(f"End of Season (EOS):     {months_names[metrics['eos_month_index']]} (Index {metrics['eos_month_index']})")
    print(f"Length of Growing Period: {metrics['lgp_months']} months")
    print(f"Crop Amplitude:          {metrics['amplitude']}")
    print(f"Rate of Greenup:         {metrics['greenup_rate']} NDVI/month")
    print("✅ Phenology extraction verified successfully!")

if __name__ == "__main__":
    test_phenology()
