import sys
sys.path.append("backend")
import inspect
from main import root

print("Is coroutine function?", inspect.iscoroutinefunction(root), flush=True)
coro = root()
print("Coro object:", coro, flush=True)
try:
    coro.send(None)
except StopIteration as e:
    print("Direct send(None) result:", e.value, flush=True)
print("Finished direct call!", flush=True)

