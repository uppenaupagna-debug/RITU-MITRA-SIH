import sys
import os
import asyncio
sys.path.append(os.path.dirname(__file__))

print("[TRACE-1] Starting trace diagnostic", flush=True)

from main import app, root, lifespan, load_disease_model
print("[TRACE-2] main imported successfully", flush=True)

# Diagnostic A: Call root() directly
print("[TRACE-3] Calling root() directly via asyncio.run()...", flush=True)
direct_res = asyncio.run(root())
print(f"[TRACE-3] root() direct result: {direct_res}", flush=True)

# Diagnostic B: Run lifespan directly via asyncio
print("[TRACE-4] Testing lifespan(app) directly via asyncio.run()...", flush=True)
async def run_lifespan_test():
    print("[TRACE-4a] Entering lifespan context...", flush=True)
    async with lifespan(app):
        print("[TRACE-4b] Inside lifespan context!", flush=True)
    print("[TRACE-4c] Exited lifespan context!", flush=True)

asyncio.run(run_lifespan_test())
print("[TRACE-4] Direct lifespan test completed successfully!", flush=True)

# Diagnostic C: TestClient with context manager
print("[TRACE-5] Importing TestClient...", flush=True)
from fastapi.testclient import TestClient

print("[TRACE-6] Entering with TestClient(app) as client...", flush=True)
with TestClient(app) as client:
    print("[TRACE-7] Inside TestClient context. Calling client.get('/')...", flush=True)
    r = client.get("/")
    print(f"[TRACE-8] client.get('/') completed! Status: {r.status_code}, body: {r.json()}", flush=True)

print("[TRACE-9] Trace diagnostic finished with COMPLETE SUCCESS!", flush=True)
