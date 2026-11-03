import json
import requests

def test_farmer_logging():
    url_log = "http://localhost:8000/api/v1/farmer/log-task"
    url_get = "http://localhost:8000/api/v1/farmer/logs"
    
    # Send a sample log payload
    payload = {
        "uid": "testfarmer",
        "crop_id": "maize",
        "phase_key": "fertilizer",
        "confirmed": True,
        "pest_status": "Mild",
        "notes": "Leaves showing minor borer signs.",
        "expense": 2400.0,
        "fertilizer_brand": "IFFCO NPK",
        "fertilizer_amount": 50.0
    }
    
    print("Testing POST /api/v1/farmer/log-task ...")
    r_post = requests.post(url_log, json=payload)
    print("POST Response Status:", r_post.status_code)
    assert r_post.status_code == 200, "POST request failed"
    post_data = r_post.json()
    print("Logged Entry:", json.dumps(post_data, indent=2))
    assert post_data["uid"] == "testfarmer"
    assert post_data["phase_key"] == "fertilizer"
    
    print("\nTesting GET /api/v1/farmer/logs ...")
    r_get = requests.get(url_get, params={"uid": "testfarmer"})
    print("GET Response Status:", r_get.status_code)
    assert r_get.status_code == 200, "GET request failed"
    logs = r_get.json()
    print(f"Total retrieved logs: {len(logs)}")
    assert len(logs) > 0, "No logs retrieved"
    
    # Check if our logged entry is present
    match = [l for l in logs if l["id"] == post_data["id"]]
    assert len(match) == 1, "Log ID mismatch"
    print("✅ All backend logging tests passed successfully!")

if __name__ == "__main__":
    test_farmer_logging()
