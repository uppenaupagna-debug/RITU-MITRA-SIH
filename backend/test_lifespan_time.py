import sys
import os
import time
sys.path.append(os.path.dirname(__file__))

print("[START] Loading TestClient and performing client.get('/')...", flush=True)
t0 = time.time()

from main import app
from fastapi.testclient import TestClient

print(f"[TIME] Imported main & TestClient in {time.time() - t0:.2f}s", flush=True)

t1 = time.time()
with TestClient(app) as client:
    print(f"[TIME] TestClient initialized & lifespan entered in {time.time() - t1:.2f}s", flush=True)
    
    t2 = time.time()
    r = client.get("/")
    print(f"[TIME] client.get('/') completed in {time.time() - t2:.2f}s! Status: {r.status_code}", flush=True)
    print(f"[RESULT] Body: {r.json()}", flush=True)

print(f"[FINISHED] Total duration: {time.time() - t0:.2f}s", flush=True)

