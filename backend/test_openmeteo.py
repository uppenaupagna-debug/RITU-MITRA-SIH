import requests
import json

def test_fetch():
    # Centroid of Nagarjuna Sagar Left Canal Command area (around Nalgonda/Suryapet, Telangana)
    lat, lng = 17.0, 79.5
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,shortwave_radiation_sum,et0_fao_evapotranspiration&timezone=auto"
    print(f"Querying: {url}")
    try:
        r = requests.get(url, timeout=10)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print("Daily keys:", data.get("daily", {}).keys())
            print("Sample daily temperature_2m_max:", data.get("daily", {}).get("temperature_2m_max")[:5])
            print("Sample daily et0:", data.get("daily", {}).get("et0_fao_evapotranspiration")[:5])
        else:
            print("Error response:", r.text)
    except Exception as e:
        print("Request failed:", e)

    # Test soil moisture from Open-Meteo Land Selection API (soil variables)
    url_soil = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm&timezone=auto"
    print(f"\nQuerying Soil: {url_soil}")
    try:
        r = requests.get(url_soil, timeout=10)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print("Hourly keys:", data.get("hourly", {}).keys())
            print("Sample hourly soil_moisture_0_to_7cm:", data.get("hourly", {}).get("soil_moisture_0_to_7cm")[:5])
        else:
            print("Error response:", r.text)
    except Exception as e:
        print("Request failed:", e)

    # Test Open-Meteo Historical Archive API
    url_archive = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lng}&start_date=2025-06-01&end_date=2025-06-15&daily=temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration&timezone=auto"
    print(f"\nQuerying Archive: {url_archive}")
    try:
        r = requests.get(url_archive, timeout=10)
        print(f"Status Code: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print("Archive daily keys:", data.get("daily", {}).keys())
            print("Sample archive temperature_2m_max:", data.get("daily", {}).get("temperature_2m_max")[:5])
            print("Sample archive et0:", data.get("daily", {}).get("et0_fao_evapotranspiration")[:5])
        else:
            print("Error response:", r.text)
    except Exception as e:
        print("Request failed:", e)

if __name__ == "__main__":
    test_fetch()
