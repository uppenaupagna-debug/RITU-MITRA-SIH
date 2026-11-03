import sys
import asyncio

print("Testing Windows event loop policy...", flush=True)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append("backend")
import torch
from main import root

print("Imported torch & root. Now running asyncio.run(root())...", flush=True)
res = asyncio.run(root())
print("SUCCESS! Root returned:", res, flush=True)

