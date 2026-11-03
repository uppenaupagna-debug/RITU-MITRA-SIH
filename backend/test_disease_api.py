import sys
import os
sys.path.append(os.path.dirname(__file__))

import io
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient
from main import app, load_disease_model

client = TestClient(app)

def create_image_bytes(img: Image.Image, format="JPEG"):
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()

def test_backend_endpoints():
    print("=" * 60)
    print("🧪 RAITUMITRA BACKEND & DISEASE DETECTION TEST SUITE")
    print("=" * 60)

    # 1. Health check
    r = client.get("/")
    assert r.status_code == 200, f"Root endpoint failed: {r.status_code}"
    print("✅ 1. Root & Health Check: PASSED ->", r.json()["status"])

    # 2. Valid Plant Leaf Upload (demo-leaf.jpeg)
    demo_leaf_path = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "demo-leaf.jpeg")
    assert os.path.exists(demo_leaf_path), "demo-leaf.jpeg not found"
    with open(demo_leaf_path, "rb") as f:
        leaf_bytes = f.read()

    r = client.post("/predict", files={"file": ("leaf.jpeg", leaf_bytes, "image/jpeg")}, data={"plant_part": "leaf"})
    assert r.status_code == 200, f"Predict failed: {r.status_code}"
    res = r.json()
    assert res["status"] == "success", f"Expected success status, got: {res.get('status')}"
    assert res["best"] is not None, "Best prediction must not be null"
    assert "friendly" in res["best"], "Expected friendly name in diagnosis"
    assert "symptoms" in res["best"] and len(res["best"]["symptoms"]) > 0, "Symptoms must be present"
    assert "suggested_actions" in res["best"], "Actions must be present"
    assert len(res["top3"]) == 3, "Top 3 predictions must have 3 entries"
    assert res["gradcam"] is not None, "Real Grad-CAM overlay must be present"
    print(f"✅ 2. Valid Leaf Prediction: PASSED -> Diagnosis: {res['best']['friendly']} ({res['best']['crop']}) | Confidence: {res['best']['confidence']:.2%}")
    print(f"      Top 3: {[(t['label'], t['confidence']) for t in res['top3']]}")

    # 3. Non-Plant Rejection: Blank / Solid Document
    blank_img = Image.new("RGB", (256, 256), (255, 255, 255))
    r = client.post("/predict", files={"file": ("blank.jpg", create_image_bytes(blank_img), "image/jpeg")}, data={"plant_part": "leaf"})
    assert r.status_code == 200
    res = r.json()
    assert res["status"] in ["rejected_blank", "rejected_not_plant"], f"Expected non-plant rejection, got {res.get('status')}"
    print(f"✅ 3. Non-Plant (Blank Document) Rejection: PASSED -> Status: {res['status']} | Message: {res['message']}")

    # 4. Human / Face Rejection: High Skin-Tone Cluster
    # Construct an image simulating human face skin tones
    skin_arr = np.full((256, 256, 3), [220, 160, 140], dtype=np.uint8)
    # Add slight variation to pass variance check
    noise = np.random.randint(-15, 15, (256, 256, 3), dtype=np.int16)
    skin_arr = np.clip(skin_arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    skin_img = Image.fromarray(skin_arr)

    r = client.post("/predict", files={"file": ("face.jpg", create_image_bytes(skin_img), "image/jpeg")}, data={"plant_part": "leaf"})
    assert r.status_code == 200
    res = r.json()
    assert res["status"] in ["rejected_human", "rejected_not_plant"], f"Expected human rejection, got: {res.get('status')}"
    print(f"✅ 4. Human / Face Rejection: PASSED -> Status: {res['status']} | Message: {res['message']}")

    # 5. Non-Plant (Vehicle / Metallic / Blue Sky)
    blue_arr = np.full((256, 256, 3), [50, 100, 220], dtype=np.uint8)
    blue_noise = np.random.randint(-20, 20, (256, 256, 3), dtype=np.int16)
    blue_arr = np.clip(blue_arr.astype(np.int16) + blue_noise, 0, 255).astype(np.uint8)
    blue_img = Image.fromarray(blue_arr)

    r = client.post("/predict", files={"file": ("car.jpg", create_image_bytes(blue_img), "image/jpeg")}, data={"plant_part": "leaf"})
    assert r.status_code == 200
    res = r.json()
    assert res["status"] == "rejected_not_plant", f"Expected rejected_not_plant, got: {res.get('status')}"
    print(f"✅ 5. Non-Plant (Vehicle/Sky) Rejection: PASSED -> Status: {res['status']} | Message: {res['message']}")

    # 6. Plant Part Scope Check: Stem / Bud
    r = client.post("/predict", files={"file": ("leaf.jpeg", leaf_bytes, "image/jpeg")}, data={"plant_part": "stem"})
    assert r.status_code == 200
    res = r.json()
    assert res["status"] == "unsupported_part", f"Expected unsupported_part, got: {res.get('status')}"
    print(f"✅ 6. Unsupported Plant Part (Stem) Boundary: PASSED -> Message: {res['message']}")

    # 7. Empty File Check
    r = client.post("/predict", files={"file": ("empty.jpg", b"", "image/jpeg")})
    assert r.status_code == 400
    print("✅ 7. Empty File Handling: PASSED -> HTTP 400 Bad Request")

    # 8. Corrupt File Check
    r = client.post("/predict", files={"file": ("corrupt.jpg", b"NOT_AN_IMAGE_DATA_12345", "image/jpeg")})
    assert r.status_code == 400
    print("✅ 8. Corrupt Image Handling: PASSED -> HTTP 400 Bad Request")

    # 9. Simulation Endpoint
    r = client.post("/simulate", json={"disease": "Tomato___Early_blight", "days": 7, "usage": 0.5})
    assert r.status_code == 200
    sim = r.json()
    assert "infection_percent" in sim and "yield_loss_percent" in sim
    print(f"✅ 9. Simulation Endpoint: PASSED -> Infection: {sim['infection_percent']}% | Yield Loss: {sim['yield_loss_percent']}%")

    # 10. Soil Analysis Endpoint
    r = client.get("/api/v1/soil/analyze?lat=17.385&lon=78.486")
    assert r.status_code == 200
    soil = r.json()
    assert "pH" in soil and "SOC" in soil
    print(f"✅ 10. Soil Analysis: PASSED -> pH: {soil['pH']}, SOC: {soil['SOC']}, Clay: {soil['clay']}")

    # 11. Satellite Pipeline Endpoint
    poly = [[17.385, 78.486], [17.386, 78.487], [17.385, 78.488]]
    r = client.post("/satellite/analyze", json={"polygon": poly, "date": "2024-07-15"})
    assert r.status_code == 200
    sat = r.json()
    assert "dominant_crop" in sat and "pixels" in sat
    print(f"✅ 11. Satellite Analysis Endpoint: PASSED -> Dominant Crop: {sat['dominant_crop']}, Stress: {sat['avg_stress_score']}")

    print("=" * 60)
    print("🎉 ALL 11 BACKEND & DISEASE DETECTION TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    test_backend_endpoints()

