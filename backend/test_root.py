import sys
sys.path.append("backend")
from main import root
import asyncio

print("Imported root, calling it now...", flush=True)
try:
    res = asyncio.run(root())
    print("Call succeeded! Result:", res, flush=True)
except Exception as e:
    print("Call failed with exception:", e, flush=True)

