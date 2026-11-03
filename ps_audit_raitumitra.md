# 🌾 Raitumitra — Full-Scale Production Plan
## AI-Driven Crop Monitoring, Stress Detection & Irrigation Advisory

> No time constraint. Build it right. Build it to last.

---

## 🔄 What Changes Without the 30-Hour Limit

| Aspect | Hackathon (30hr) | Full Build |
|---|---|---|
| **ML Models** | Random Forest only | RF + XGBoost + **LSTM** + **U-Net** + **Temporal CNN** — ensemble |
| **Data** | 1 season, 1 area | Multi-season, multi-year, expandable to any region |
| **Validation** | Quick accuracy check | Full cross-validation, k-fold, independent test set, field verification |
| **Dashboard** | Static HTML maps | **Full-stack web app** with real-time updates, user accounts, alerts |
| **Irrigation Advisory** | Simplified formula | Full **FAO-56 Penman-Monteith** with soil water balance model |
| **SAR Integration** | Basic VV/VH composites | Proper speckle filtering, decomposition, SAR-optical fusion |
| **Deployment** | Local demo | **Cloud-deployed**, API-driven, mobile-ready |
| **Farmer Interface** | Mock-up | Working **WhatsApp bot / SMS alerts / mobile app** |
| **Languages** | English only | Hindi, Telugu, Kannada, Tamil — configurable |

---

## 🏗️ Full System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          RAITUMITRA PLATFORM                            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      DATA INGESTION LAYER                          │ │
│  │                                                                     │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │Sentinel-2│ │Sentinel-1│ │ Landsat  │ │  MODIS   │ │  Weather │ │ │
│  │  │ (Optical)│ │  (SAR)   │ │ 8/9      │ │ (ET,LAI) │ │ (IMD/ERA)│ │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │ │
│  │       └──────┬──────┴──────┬─────┴──────┬─────┴──────┬─────┘       │ │
│  └──────────────┼─────────────┼────────────┼────────────┼─────────────┘ │
│                 ▼             ▼            ▼            ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    PROCESSING PIPELINE                              │ │
│  │                                                                     │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐                │ │
│  │  │ Atmospheric  │  │   Speckle   │  │   Temporal   │                │ │
│  │  │ Correction   │  │  Filtering  │  │  Compositing │                │ │
│  │  │ (Sen2Cor)    │  │ (Refined Lee│  │  (8/16-day)  │                │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘                │ │
│  │         └────────────────┼────────────────┘                         │ │
│  │                          ▼                                          │ │
│  │  ┌──────────────────────────────────────────────────────┐           │ │
│  │  │              FEATURE ENGINEERING                      │           │ │
│  │  │                                                       │           │ │
│  │  │  Optical: NDVI, EVI, NDWI, SAVI, LSWI, NBR           │           │ │
│  │  │  SAR: σ°VV, σ°VH, VH/VV ratio, RVI, entropy, α      │           │ │
│  │  │  Phenology: SOS, POS, EOS, LGP, amplitude, rate      │           │ │
│  │  │  Texture: GLCM (contrast, homogeneity, entropy)      │           │ │
│  │  │  Temporal: Monthly stacks, harmonic coefficients      │           │ │
│  │  └──────────────────────┬────────────────────────────────┘           │ │
│  └─────────────────────────┼───────────────────────────────────────────┘ │
│                            ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      AI / ML ENGINE                                 │ │
│  │                                                                     │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────┐  │ │
│  │  │  CROP CLASSIFIER │  │  STRESS DETECTOR │  │ IRRIGATION ENGINE │  │ │
│  │  │                  │  │                  │  │                    │  │ │
│  │  │  • Random Forest │  │  • LSTM (time-   │  │ • FAO-56 Water    │  │ │
│  │  │  • XGBoost       │  │    series stress)│  │   Balance Model   │  │ │
│  │  │  • LSTM (temporal│  │  • VCI / TCI /   │  │ • ETc = Kc × ET₀  │  │ │
│  │  │    sequences)    │  │    SMCI anomaly  │  │ • Deficit = ETc -  │  │ │
│  │  │  • U-Net (spatial│  │  • Stage-aware   │  │   (Rain + ΔSM)    │  │ │
│  │  │    segmentation) │  │    thresholds    │  │ • Canal scheduling │  │ │
│  │  │  • Ensemble      │  │  • SAR moisture  │  │ • Advisory rules   │  │ │
│  │  └────────┬─────────┘  └────────┬─────────┘  └─────────┬──────────┘  │ │
│  └───────────┼──────────────────────┼──────────────────────┼────────────┘ │
│              └──────────────────────┼──────────────────────┘              │
│                                     ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     OUTPUT & DELIVERY LAYER                         │ │
│  │                                                                     │ │
│  │  ┌──────────┐ ┌──────────────┐ ┌─────────┐ ┌───────────────────┐   │ │
│  │  │  Web     │ │  Mobile App  │ │WhatsApp │ │ API (for govt     │   │ │
│  │  │Dashboard │ │  (Farmer)    │ │ Bot/SMS │ │  integration)     │   │ │
│  │  └──────────┘ └──────────────┘ └─────────┘ └───────────────────┘   │ │
│  │                                                                     │ │
│  │  Maps: Crop Type │ Stress (stage-wise) │ Irrigation Advisory        │ │
│  │  Charts: NDVI timeline │ Stress history │ Water balance              │ │
│  │  Alerts: "Irrigate field X by Thursday" │ "Pest risk in zone Y"     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Phase-Wise Development Plan

### Phase 1: Data Infrastructure & Collection (Week 1–2)

#### 1.1 Pilot Area Selection
Choose **one canal command area** to start. Recommended options:

| Region | State | Why Good for Pilot |
|---|---|---|
| Nagarjuna Sagar Left Canal Command | Telangana/AP | Large irrigated area, multiple crops, good ground truth availability |
| Tungabhadra Command Area | Karnataka | Well-documented, rice + cotton + maize diversity |
| Bhakra Command Area | Punjab/Haryana | Wheat-rice system, well-studied, lots of reference data |
| Upper Krishna Project | Karnataka | Canal-irrigated, kharif + rabi seasons |

#### 1.2 Data Collection Checklist

| Data Source | Resolution | Temporal | Access |
|---|---|---|---|
| **Sentinel-2 (L2A)** | 10m | 5-day revisit | Copernicus Hub / GEE |
| **Sentinel-1 (GRD)** | 10m | 12-day revisit | Copernicus Hub / GEE |
| **Landsat 8/9** | 30m | 16-day revisit | USGS EarthExplorer / GEE |
| **MODIS (MOD13, MOD16)** | 250m–1km | 8/16-day | LP DAAC / GEE |
| **LISS-III / AWiFS** | 23.5m / 56m | As available | Bhuvan / Bhoonidhi |
| **IMD Gridded Rainfall** | 0.25° | Daily | IMD Pune |
| **ERA5 Weather** | 0.25° | Hourly | Copernicus CDS |
| **Soil Map** | District level | Static | NBSS&LUP / SoilGrids |
| **Ground Truth** | Point / polygon | Seasonal | State Agri Dept / field survey |

#### 1.3 Ground Truth Strategy
- Collect **minimum 1,500–2,000 labeled points** (aim for 200+ per crop class)
- Sources: State agriculture department records, Kisan portal, field visits
- Split: 70% training, 15% validation, 15% independent test
- Include: crop type, sowing date, irrigation source, soil type

---

### Phase 2: Processing Pipeline (Week 2–4)

#### 2.1 Optical Data Processing
```
Raw Sentinel-2 L1C
    ↓ Sen2Cor (atmospheric correction → L2A)
    ↓ Cloud masking (SCL band + s2cloudless)
    ↓ Gap-filling (temporal interpolation for cloud gaps)
    ↓ Monthly median composites (12 months × 10 bands)
    ↓ Spectral index computation
```

**Indices to compute:**
| Index | Formula | Purpose |
|---|---|---|
| NDVI | (NIR - Red) / (NIR + Red) | Vegetation vigour |
| EVI | 2.5 × (NIR - Red) / (NIR + 6×Red - 7.5×Blue + 1) | Enhanced vegetation (low saturation) |
| NDWI | (Green - NIR) / (Green + NIR) | Water content |
| LSWI | (NIR - SWIR1) / (NIR + SWIR1) | Land surface water |
| SAVI | 1.5 × (NIR - Red) / (NIR + Red + 0.5) | Soil-adjusted vegetation |
| NDMI | (NIR - SWIR1) / (NIR + SWIR1) | Moisture index |

#### 2.2 SAR Data Processing
```
Raw Sentinel-1 GRD
    ↓ Apply orbit file
    ↓ Thermal noise removal
    ↓ Radiometric calibration (→ σ° backscatter)
    ↓ Speckle filtering (Refined Lee, 7×7)
    ↓ Terrain correction (SRTM 30m DEM)
    ↓ Convert to dB
    ↓ Monthly composites (VV, VH, VH/VV)
```

**SAR features:**
| Feature | Formula | Sensitivity |
|---|---|---|
| σ°VV | Direct | Soil moisture, crop structure |
| σ°VH | Direct | Volume scattering (biomass) |
| VH/VV Ratio | σ°VH / σ°VV | Crop type discrimination |
| RVI (Radar Veg Index) | 4 × VH / (VV + VH) | Vegetation biomass |

#### 2.3 Phenology Extraction
From smoothed NDVI time-series (Savitzky-Golay filter):
- **SOS** (Start of Season): NDVI crosses 20% of amplitude (upward)
- **POS** (Peak of Season): Maximum NDVI
- **EOS** (End of Season): NDVI drops below 20% of amplitude (downward)
- **LGP** (Length of Growing Period): EOS - SOS
- **Amplitude**: Peak NDVI - Base NDVI
- **Rate of Greenup**: slope between SOS and POS

---

### Phase 3: AI/ML Model Development (Week 4–7)

#### 3.1 Crop Type Classification — Multi-Model Ensemble

**Model 1: Random Forest / XGBoost (Tabular Baseline)**
- Input: Pixel-level feature vector (monthly indices + SAR + phenology) → ~60-80 features
- Architecture: 500 trees, max_depth=20, min_samples_leaf=5
- Expected accuracy: **85–90%**
- Role: Fast baseline, feature importance analysis

**Model 2: LSTM / Temporal CNN (Time-Series)**
- Input: Monthly time-series per pixel → (T, F) where T=12 months, F=features per timestep
- Architecture:
  ```
  Input(12, F) → LSTM(128) → LSTM(64) → Dense(32) → Softmax(num_crops)
  ```
  OR
  ```
  Input(12, F) → Conv1D(64, k=3) → Conv1D(128, k=3) → GlobalAvgPool → Dense(num_crops)
  ```
- Expected accuracy: **88–93%** (captures temporal dynamics)
- Role: Captures crop phenological signatures in time

**Model 3: U-Net (Spatial Segmentation)**
- Input: Multi-band image patch (256×256 pixels, C channels)
- Architecture:
  ```
  Encoder: Conv blocks (64→128→256→512) with MaxPool
  Bridge: Conv(1024)
  Decoder: UpConv + skip connections (512→256→128→64)
  Output: Softmax(num_crops) per pixel
  ```
- Expected accuracy: **87–92%** (preserves field boundaries)
- Role: Spatially coherent maps, respects field boundaries

**Ensemble Strategy:**
```
Final Prediction = weighted_vote(RF_pred, LSTM_pred, UNet_pred)
Weights optimized on validation set
Expected ensemble accuracy: 90–95%
```

#### 3.2 Moisture Stress Detection — Stage-Aware Model

**Stage Classification Pipeline:**
1. Use phenology metrics to assign each pixel to a growth stage:
   - **Stage 1**: Sowing / Germination (SOS to SOS + 20% LGP)
   - **Stage 2**: Vegetative Growth (20% to 50% LGP)
   - **Stage 3**: Reproductive / Flowering (50% to 75% LGP)
   - **Stage 4**: Maturity / Senescence (75% to EOS)

2. Compute stress indices **per stage**:

| Index | Formula | Stress Threshold |
|---|---|---|
| VCI | (NDVI - NDVImin) / (NDVImax - NDVImin) × 100 | <35 = severe, 35-50 = moderate |
| TCI | (LSTmax - LST) / (LSTmax - LSTmin) × 100 | <35 = thermal stress |
| SMCI | (σ°VH - σ°VHmin) / (σ°VHmax - σ°VHmin) × 100 | <40 = soil moisture stress |
| VSWI | NDVI / LST | Low values = combined stress |

3. **Stage-specific stress sensitivity:**

| Growth Stage | Most Critical Stress Indicator | Why |
|---|---|---|
| Germination | SMCI (soil moisture) | Seeds need moisture to establish |
| Vegetative | VCI (vegetation condition) | Canopy development affected |
| Reproductive | VCI + TCI combined | Flowering is most drought-sensitive |
| Maturity | TCI (thermal) | Heat stress affects grain filling |

4. **LSTM for stress prediction:**
   - Input: Time-series of stress indices → predict stress level 8-16 days ahead
   - Architecture: LSTM(64) → Dense(4) → Softmax(No/Mild/Moderate/Severe)

#### 3.3 Irrigation Advisory Engine

**Full FAO-56 Water Balance Model:**

$$ET_0 = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T+273} u_2 (e_s - e_a)}{\Delta + \gamma (1 + 0.34 u_2)}$$

**Daily soil water balance:**

$$D_{r,i} = D_{r,i-1} - (P_i - RO_i) - I_i - CR_i + ET_{c,i} + DP_i$$

Where:
- $D_r$ = root zone depletion (mm)
- $P$ = precipitation, $RO$ = runoff, $I$ = irrigation
- $CR$ = capillary rise, $ET_c$ = crop ET, $DP$ = deep percolation

**8-Day Advisory Logic:**

```python
def generate_advisory(pixel):
    Kc = get_crop_coefficient(crop_type, growth_stage)
    ETc = Kc * ET0_8day
    effective_rain = sum(daily_rain[8_days]) * 0.8  # 80% efficiency
    
    deficit = ETc - effective_rain
    soil_reserve = available_water_capacity - current_depletion
    
    net_irrigation_need = max(0, deficit - soil_reserve)
    
    if net_irrigation_need > 40:
        return "🔴 URGENT: Irrigate {net_irrigation_need}mm within 2 days"
    elif net_irrigation_need > 15:
        return "🟡 SCHEDULED: Irrigate {net_irrigation_need}mm within 5 days"
    elif net_irrigation_need > 0:
        return "🟢 MONITOR: Minor deficit, irrigate if no rain expected"
    else:
        return "✅ NO IRRIGATION: Sufficient moisture available"
```

**Crop Coefficients (FAO-56) — Sample:**

| Crop | Kc_ini | Kc_mid | Kc_end | Total Days |
|---|---|---|---|---|
| Rice (paddy) | 1.05 | 1.20 | 0.90 | 120–150 |
| Wheat | 0.30 | 1.15 | 0.25 | 120–150 |
| Cotton | 0.35 | 1.15 | 0.50 | 150–180 |
| Maize | 0.30 | 1.20 | 0.35 | 100–130 |
| Sugarcane | 0.40 | 1.25 | 0.75 | 270–365 |
| Groundnut | 0.40 | 1.15 | 0.35 | 100–130 |

---

### Phase 4: Full-Stack Web Application (Week 7–10)

#### 4.1 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js / Next.js + Leaflet.js (maps) + Recharts (graphs) |
| **Backend** | Python FastAPI (REST API) |
| **Database** | PostgreSQL + PostGIS (spatial data) |
| **ML Serving** | TensorFlow Serving / ONNX Runtime |
| **Satellite Processing** | Google Earth Engine Python API (batch) |
| **File Storage** | AWS S3 / Google Cloud Storage (GeoTIFFs) |
| **Map Tiles** | GeoServer or Titiler (COG-based) |
| **Alerts** | Twilio (SMS) / WhatsApp Business API |
| **Hosting** | AWS / GCP / Azure |

#### 4.2 Dashboard Features

**For Farmers (Simple View):**
- 🗺️ "My Farm" — see your field on map with crop identified
- 🌡️ "Crop Health" — Green/Yellow/Red stress indicator
- 💧 "Water Advisory" — plain language: "Irrigate 30mm before Friday"
- 📈 "Growth Tracker" — visual timeline of crop stages
- 🔔 "Alerts" — push notifications / SMS / WhatsApp
- 🌐 "Language" — Hindi, Telugu, Kannada, Tamil, Marathi

**For Officials / Irrigation Dept (Advanced View):**
- 📊 Command area overview — aggregate crop distribution pie chart
- 🗺️ Canal-wise stress maps — which canals need priority water release
- 📉 Water demand forecast — 8-day rolling demand per canal branch
- 📋 Reports — downloadable PDF/Excel for planning meetings
- 🔄 Season comparison — this year vs last year performance

#### 4.3 API Endpoints

```
GET  /api/v1/crops/map?area=pilot_1&season=kharif_2025
GET  /api/v1/stress/current?area=pilot_1&stage=reproductive
GET  /api/v1/stress/timeseries?pixel_id=xyz&start=2025-06-01
GET  /api/v1/irrigation/advisory?area=pilot_1&period=8day
GET  /api/v1/irrigation/deficit-map?area=pilot_1&date=2025-09-15
POST /api/v1/farmer/register   (name, phone, field boundary)
GET  /api/v1/farmer/{id}/alerts
GET  /api/v1/reports/command-area?area=pilot_1&format=pdf
```

---

### Phase 5: Validation & Accuracy (Week 10–12)

#### 5.1 Crop Classification Validation

| Metric | Target | How to Compute |
|---|---|---|
| Overall Accuracy (OA) | > 90% | Correct / Total predictions |
| Kappa Coefficient (κ) | > 0.85 | Agreement beyond chance |
| Per-class F1-Score | > 0.80 each | Precision × Recall balance |
| Producer's Accuracy | > 85% | How well each class is detected |
| User's Accuracy | > 85% | How reliable each prediction is |

- Use **stratified k-fold cross-validation** (k=5)
- Hold out **15% as independent test set** (never seen during training)
- Generate full **confusion matrix** and class-wise error analysis

#### 5.2 Stress Detection Validation

| Validation Method | Data Source |
|---|---|
| Compare VCI stress maps with actual drought reports | IMD drought bulletins, NDMA reports |
| Correlate SMCI with in-situ soil moisture (if available) | State soil moisture stations |
| Cross-validate with crop yield data | Yield drops in stressed areas confirm detection |
| Temporal consistency check | Stress should increase during dry spells, decrease after rain |

#### 5.3 Irrigation Advisory Validation

| Check | Method |
|---|---|
| Water deficit vs actual ET | Compare with MODIS ET (MOD16A2) |
| Advisory vs canal release data | Match recommendations with actual irrigation scheduling |
| Farmer feedback | Pilot group of 50–100 farmers evaluate usefulness |

---

### Phase 6: Deployment & Scaling (Week 12–14+)

#### 6.1 Deployment Architecture

```
┌───────────────────────────────────────────────────────┐
│                   CLOUD (AWS/GCP)                     │
│                                                       │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐  │
│  │ GEE     │  │ FastAPI  │  │ PostgreSQL + PostGIS│  │
│  │ Batch   │──│ Server   │──│ (spatial database)  │  │
│  │ Pipeline│  │ (API)    │  │                     │  │
│  └─────────┘  └────┬─────┘  └─────────────────────┘  │
│                     │                                 │
│              ┌──────┴──────┐                          │
│              │   Nginx /   │                          │
│              │  CloudFront │                          │
│              └──────┬──────┘                          │
└─────────────────────┼─────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │   Web   │  │  Mobile  │  │ WhatsApp │
   │Dashboard│  │   App    │  │   Bot    │
   └─────────┘  └──────────┘  └──────────┘
```

#### 6.2 Automation — Scheduled Pipeline

```
Every 8 days (automatic):
  1. GEE pulls latest Sentinel-2 + Sentinel-1 imagery
  2. Pre-processing pipeline runs (cloud mask, compositing)
  3. ML models run inference (crop update, stress detection)
  4. Water balance model updates deficit
  5. Advisory maps generated
  6. Dashboard refreshed
  7. Alerts sent to farmers (SMS/WhatsApp)
```

#### 6.3 Scaling Path

| Scale | Coverage | Users |
|---|---|---|
| **v1 Pilot** | 1 canal command (~50,000 ha) | 500 farmers, 10 officials |
| **v2 District** | Full district (~500,000 ha) | 5,000 farmers |
| **v3 State** | Entire state | 50,000+ farmers |
| **v4 National** | Multi-state, PMKSY integration | Government platform |

---

## 📅 Timeline Summary

```
Week 1-2   ████████████████ Data collection, pilot area setup, GEE config
Week 2-4   ████████████████ Processing pipeline (optical + SAR + features)
Week 4-7   ████████████████████████ ML model development (RF → LSTM → U-Net)
Week 7-10  ████████████████████████ Full-stack web app + dashboard
Week 10-12 ████████████████ Validation, accuracy, field testing
Week 12-14 ████████████████ Deployment, automation, farmer onboarding
```

---

## 💰 Cost Estimate (Infrastructure)

| Item | Cost |
|---|---|
| Satellite data (Sentinel, Landsat, MODIS) | **FREE** (open access) |
| LISS-III / AWiFS (if needed) | Free via Bhuvan / Bhoonidhi |
| Google Earth Engine | **FREE** (for research / non-commercial) |
| Google Colab Pro (for training) | ₹800/month (~$10) |
| Cloud hosting (AWS/GCP basic) | ₹3,000–5,000/month |
| Domain + SSL | ₹1,000/year |
| Twilio SMS (alerts) | ₹0.15–0.30 per SMS |
| **Total for pilot** | **~₹5,000–8,000/month** |

---

## 🎯 What I Can Build For You Right Now

| # | Component | Description |
|---|---|---|
| 1 | **GEE Processing Pipeline** | Python scripts for Sentinel-2/S1 ingestion, compositing, index generation |
| 2 | **Feature Engineering Module** | Complete feature extraction (spectral, SAR, phenology, texture) |
| 3 | **ML Training Pipeline** | RF + XGBoost + LSTM + U-Net with ensemble strategy |
| 4 | **Stress Detection Engine** | Stage-aware VCI/TCI/SMCI computation and classification |
| 5 | **Irrigation Advisory Module** | FAO-56 water balance model + advisory generation |
| 6 | **Raitumitra Web Dashboard** | Full-stack React + FastAPI + Leaflet interactive app |
| 7 | **Alert System** | SMS/WhatsApp notification templates |

> [!IMPORTANT]
> **Tell me which components to start building first, and confirm your pilot area so I can customize the data pipeline for your region.**

