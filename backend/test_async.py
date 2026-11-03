import asyncio

async def f():
    return {"status": "ok"}

print("Result:", asyncio.run(f()))

