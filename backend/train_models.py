import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
# 🧠 Raitumitra ML Model Training Pipeline (Real-Data Aligned)
# Trains Random Forest, XGBoost, and PyTorch LSTM models on Telangana GEE signatures

import numpy as np
import pickle
import os
import csv
import json
import random
import math
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
try:
    from xgboost import XGBClassifier
    def make_xgb():
        return XGBClassifier(n_estimators=120, max_depth=5, learning_rate=0.1, random_state=42, n_jobs=1)
except ImportError:
    from sklearn.ensemble import GradientBoostingClassifier
    def make_xgb():
        return GradientBoostingClassifier(n_estimators=120, max_depth=5, learning_rate=0.1, random_state=42)

# Seed for reproducibility
np.random.seed(42)
random.seed(42)
torch.manual_seed(42)

CROP_CLASSES = ["Rice", "Wheat", "Cotton", "Maize", "Sugarcane"]
CROP_MAP = {crop: idx for idx, crop in enumerate(CROP_CLASSES)}
INV_CROP_MAP = {idx: crop for crop, idx in CROP_MAP.items()}

# --- 1. LOAD AND CLUSTER REAL GEE PIXELS FOR STATISTICS ---

def load_real_gee_stats():
    """
    Loads GEE exported CSV and extracts class-wise statistics for July (Month 7)
    using robust agronomic rule-based grouping.
    """
    csv_path = os.path.join(os.path.dirname(__file__), "data", "ML_pixels_July2024.csv")
    if not os.path.exists(csv_path):
        print("⚠️ GEE CSV not found locally. Using default historical regional baselines.")
        return None

    real_data = {crop: [] for crop in CROP_CLASSES}
    # Add a fallback for fallow/barren fields to assist classification variance
    real_data["Fallow"] = []

    print(f"📊 Analyzing real GEE CSV to extract class-wise parameters...")
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                ndvi = float(row["NDVI"])
                evi = float(row["EVI"])
                ndwi = float(row["NDWI"])
                vh = float(row["VH"])
                vv = float(row["VV"])
                
                if math.isnan(ndvi) or math.isnan(vh):
                    continue
                
                # Rule-based agronomic classification for July (Kharif sowing/early stage)
                if ndvi < 0.25:
                    real_data["Fallow"].append((ndvi, vh))
                elif ndwi > 0.15 and vv > -8.5:
                    real_data["Rice"].append((ndvi, vh))
                elif ndvi > 0.65 and vh > -14.5:
                    real_data["Sugarcane"].append((ndvi, vh))
                elif 0.3 <= ndvi <= 0.65 and -18.0 <= vh <= -14.5:
                    real_data["Cotton"].append((ndvi, vh))
                else:
                    real_data["Maize"].append((ndvi, vh))
            except Exception:
                continue

    # Compute mean and std dev for each crop type
    stats = {}
    for crop in CROP_CLASSES:
        # If Sugarcane/Rice is sparse in raw samples, backfill from other classes or defaults
        samples = real_data.get(crop, [])
        if len(samples) < 5:
            # Fallback typical values
            if crop == "Rice":
                stats[crop] = {"ndvi_mean": 0.38, "ndvi_std": 0.05, "vh_mean": -16.2, "vh_std": 0.8}
            elif crop == "Wheat":
                # Wheat is Rabi (Fallow/harvested in July)
                stats[crop] = {"ndvi_mean": 0.18, "ndvi_std": 0.04, "vh_mean": -21.5, "vh_std": 1.2}
            elif crop == "Cotton":
                stats[crop] = {"ndvi_mean": 0.48, "ndvi_std": 0.06, "vh_mean": -15.8, "vh_std": 0.9}
            elif crop == "Maize":
                stats[crop] = {"ndvi_mean": 0.42, "ndvi_std": 0.05, "vh_mean": -18.5, "vh_std": 1.1}
            elif crop == "Sugarcane":
                stats[crop] = {"ndvi_mean": 0.72, "ndvi_std": 0.06, "vh_mean": -13.2, "vh_std": 0.7}
        else:
            ndvis = [s[0] for s in samples]
            vhs = [s[1] for s in samples]
            stats[crop] = {
                "ndvi_mean": np.mean(ndvis),
                "ndvi_std": max(0.02, np.std(ndvis)),
                "vh_mean": np.mean(vhs),
                "vh_std": max(0.3, np.std(vhs))
            }
            print(f"   • {crop:10}: Found {len(samples)} real pixels. Aligned NDVI_July={stats[crop]['ndvi_mean']:.3f}, VH_July={stats[crop]['vh_mean']:.1f} dB")

    return stats

# --- 2. DATASET GENERATION ---

def get_base_ndvi(crop, month):
    """Base seasonal crop growth patterns."""
    base = 0.15
    if crop == "Rice":
        if month in [6, 7]: return base + 0.1 * (month - 5)
        elif month in [8, 9, 10]: return 0.3 + 0.5 * np.sin(np.pi * (month - 7) / 6)
        elif month in [11, 12]: return 0.8 - 0.5 * ((month - 10) / 2)
    elif crop == "Wheat":
        if month in [11, 12]: return base + 0.15 * (month - 10)
        elif month in [1, 2]: return 0.45 + 0.3 * np.sin(np.pi * month / 4)
        elif month in [3, 4]: return 0.75 - 0.55 * ((month - 2) / 2)
    elif crop == "Cotton":
        if month in [6, 7, 8]: return base + 0.45 * ((month - 5) / 3)
        elif month in [9, 10]: return 0.65 + 0.15 * np.sin(np.pi * (month - 8) / 4)
        elif month in [11, 12, 1]: return 0.8 - 0.6 * ((month - 10 if month >= 10 else month + 2) / 3)
    elif crop == "Maize":
        if month in [7, 8]: return base + 0.45 * (month - 6.5)
        elif month in [9]: return 0.75
        elif month in [10, 11]: return 0.75 - 0.55 * (month - 9)
    elif crop == "Sugarcane":
        if month in [2, 3]: return 0.45
        else: return 0.7 + 0.15 * np.sin(np.pi * month / 12)
    return base

def get_base_weather(month):
    """Typical temperature (C) and rainfall (mm) profiles for Telangana."""
    rain_profile = {
        1: 5, 2: 8, 3: 12, 4: 15, 5: 25, 6: 150,
        7: 280, 8: 240, 9: 170, 10: 60, 11: 15, 12: 4
    }
    temp_profile = {
        1: 18, 2: 22, 3: 28, 4: 33, 5: 35, 6: 31,
        7: 28, 8: 27, 9: 28, 10: 27, 11: 23, 12: 19
    }
    return rain_profile[month], temp_profile[month]

def generate_aligned_crop_data(num_samples=2500):
    real_stats = load_real_gee_stats()
    
    X = []
    y = []
    samples_per_crop = num_samples // len(CROP_CLASSES)
    
    for crop in CROP_CLASSES:
        crop_stats = real_stats[crop] if real_stats else None
        
        for _ in range(samples_per_crop):
            pixel_features = []
            
            # Incorporate regional weather deviations and soil fertility variations
            weather_anomaly = np.random.normal(0, 0.12)
            soil_quality = np.random.uniform(0.88, 1.12)
            
            for m in range(1, 13):
                # If we have real statistics and this is July (month 7), anchor to it!
                if m == 7 and crop_stats:
                    ndvi = np.random.normal(crop_stats["ndvi_mean"], crop_stats["ndvi_std"])
                    ndvi = max(0.1, min(0.95, ndvi))
                    vh = np.random.normal(crop_stats["vh_mean"], crop_stats["vh_std"])
                else:
                    # Otherwise, use growth profiles projected from standard curves
                    ndvi_base = get_base_ndvi(crop, m)
                    ndvi = ndvi_base * soil_quality + np.random.normal(0, 0.03)
                    ndvi = max(0.1, min(0.95, ndvi))
                    vh = -24.0 + ndvi * 12.0 + np.random.normal(0, 0.5)
                
                rain_base, temp_base = get_base_weather(m)
                rain = max(0.0, rain_base * (1.0 + weather_anomaly) + np.random.normal(0, 4))
                temp = temp_base + weather_anomaly * 4 + np.random.normal(0, 1)
                
                pixel_features.extend([ndvi, vh, rain, temp])
                
            X.append(pixel_features)
            y.append(CROP_MAP[crop])
            
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64)

# --- 3. TRAIN PIPELINE ---

def train_pipeline():
    print("⚡ Generating crop classification signature dataset aligned with real GEE data...")
    X, y = generate_aligned_crop_data(2500)
    print(f"   Dataset compiled. Shape: {X.shape}, labels: {y.shape}")

    # Split dataset: 70% Train, 15% Val, 15% Test
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.3, random_state=42, stratify=y)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42, stratify=y_temp)

    # 1. Train Random Forest
    print("\n🌲 Training Random Forest Classifier...")
    rf_model = RandomForestClassifier(n_estimators=180, max_depth=16, min_samples_leaf=3, random_state=42)
    rf_model.fit(X_train, y_train)
    rf_acc = rf_model.score(X_test, y_test)
    print(f"✅ Random Forest Test Accuracy: {rf_acc * 100:.2f}%")

    # 2. Train XGBoost
    print("\n🚀 Training XGBoost Classifier...")
    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
    xgb_model = make_xgb()
    xgb_model.fit(X_train, y_train)
    xgb_acc = xgb_model.score(X_test, y_test)
    print(f"✅ XGBoost Test Accuracy: {xgb_acc * 100:.2f}%")

    # 3. Train PyTorch LSTM
    print("\n🧠 Training PyTorch LSTM Classifier...")
    
    class CropLSTM(nn.Module):
        def __init__(self, input_size=4, hidden_size=64, num_layers=2, num_classes=5):
            super(CropLSTM, self).__init__()
            self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
            self.fc = nn.Linear(hidden_size, num_classes)
            
        def forward(self, x):
            out, _ = self.lstm(x)
            out = self.fc(out[:, -1, :])
            return out

    X_train_seq = X_train.reshape(-1, 12, 4)
    X_val_seq = X_val.reshape(-1, 12, 4)
    X_test_seq = X_test.reshape(-1, 12, 4)

    train_dataset = TensorDataset(torch.tensor(X_train_seq), torch.tensor(y_train))
    val_dataset = TensorDataset(torch.tensor(X_val_seq), torch.tensor(y_val))
    test_dataset = TensorDataset(torch.tensor(X_test_seq), torch.tensor(y_test))

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    lstm_model = CropLSTM().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(lstm_model.parameters(), lr=0.005, weight_decay=1e-4)

    epochs = 40
    for epoch in range(epochs):
        lstm_model.train()
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = lstm_model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

    lstm_model.eval()
    test_correct = 0
    test_total = 0
    all_preds = []
    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = lstm_model(inputs)
            _, predicted = torch.max(outputs.data, 1)
            test_total += targets.size(0)
            test_correct += (predicted == targets).sum().item()
            all_preds.extend(predicted.cpu().numpy())

    lstm_acc = test_correct / test_total
    print(f"✅ PyTorch LSTM Test Accuracy: {lstm_acc * 100:.2f}%")

    # 4. Save Models
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(models_dir, exist_ok=True)

    with open(os.path.join(models_dir, "rf_crop.pkl"), "wb") as f:
        pickle.dump(rf_model, f)
    with open(os.path.join(models_dir, "xgb_crop.pkl"), "wb") as f:
        pickle.dump(xgb_model, f)
    torch.save(lstm_model.state_dict(), os.path.join(models_dir, "lstm_crop.pt"))
    print("\n💾 All trained weights successfully updated inside models/ directory.")

if __name__ == "__main__":
    train_pipeline()
