#!/usr/bin/env python3
"""
test_stress.py – Multi‑method stress test for Algo Trading Engine
"""

import asyncio
import json
import random
import time
import requests
import websockets
from concurrent.futures import ThreadPoolExecutor

BASE = "http://localhost:8080"
WS_URL = "ws://localhost:8080/engine"

# ---------- REST helpers ----------
def api(method, path, data=None):
    url = BASE + path
    try:
        if method == "GET":
            r = requests.get(url, timeout=3)
        else:
            r = requests.post(url, json=data, timeout=3)
        return r.status_code, r.text
    except Exception as e:
        return 0, str(e)

def start_engine():
    return api("POST", "/api/engine/start")

def stop_engine():
    return api("POST", "/api/engine/stop")

def status():
    return api("GET", "/api/engine/status")

def connect_feed():
    return api("POST", "/api/feeds/connect")

def register_algo(name="Alpha", type="test1"):
    return api("POST", "/api/algos/register", {"name": name, "type": type})

def start_algo(algo_id):
    return api("POST", "/api/algos/start", {"algoId": algo_id})

def stop_algo(algo_id):
    return api("POST", "/api/algos/stop", {"algoId": algo_id})

def backtest_start(symbol="BTC/USD", capital=10000):
    return api("POST", "/api/backtest/start", {"symbol": symbol, "capital": capital})

def backtest_stop():
    return api("POST", "/api/backtest/stop")

# ---------- WebSocket ----------
async def ws_command(cmd, timeout=5):
    try:
        async with websockets.connect(WS_URL) as ws:
            await ws.send(cmd)
            resp = await asyncio.wait_for(ws.recv(), timeout=timeout)
            return resp
    except Exception as e:
        return f"WS error: {e}"

# ---------- Stress tests ----------
def test_concurrent_api(num_workers=20):
    """Fire many concurrent API requests (mix of status and start/stop)."""
    print(f"[Stress] {num_workers} concurrent API calls...")
    def worker():
        for _ in range(10):
            status()
            start_engine()
            stop_engine()
            connect_feed()
    with ThreadPoolExecutor(max_workers=num_workers) as ex:
        futures = [ex.submit(worker) for _ in range(num_workers)]
        for f in futures:
            f.result()
    print("[Stress] Concurrent API done.")

async def test_websocket_load(num_connections=30):
    """Open many WebSocket connections, send 'status' and 'subscribe'."""
    print(f"[Stress] {num_connections} WebSocket connections...")
    tasks = []
    for i in range(num_connections):
        cmd = "status" if i % 2 == 0 else "subscribe BTC/USD"
        tasks.append(ws_command(cmd))
    results = await asyncio.gather(*tasks)
    ok = sum(1 for r in results if "running" in r or "subscribed" in r)
    print(f"[Stress] WebSocket load: {ok}/{num_connections} succeeded")
    return results

def test_backtest_flow():
    """Start a backtest, wait for progress, then stop."""
    print("[Stress] Testing backtest flow...")
    code, _ = backtest_start()
    if code != 200:
        print(f"  Backtest start failed: {code}")
        return
    time.sleep(3)
    code, _ = backtest_stop()
    print(f"  Backtest stop: {code}")

def test_algo_lifecycle():
    """Register, start, stop an algorithm."""
    print("[Stress] Testing algo lifecycle...")
    code, resp = register_algo("TestAlgo", "test1")
    if code != 200:
        print(f"  Register failed: {code}")
        return
    try:
        algo_id = json.loads(resp).get("algoId")
        if not algo_id:
            print("  No algoId in response")
            return
        print(f"  Registered {algo_id}")
        code, _ = start_algo(algo_id)
        print(f"  Start: {code}")
        time.sleep(1)
        code, _ = stop_algo(algo_id)
        print(f"  Stop: {code}")
    except:
        pass

def run_stress():
    print("=== Algo Trading Engine Stress Test ===")
    # Ensure engine is running
    code, _ = start_engine()
    if code != 200:
        print("Engine failed to start. Is it built and running?")
        return
    time.sleep(1)

    # 1. Concurrent API
    test_concurrent_api(30)

    # 2. WebSocket load
    asyncio.run(test_websocket_load(40))

    # 3. Algo lifecycle
    test_algo_lifecycle()

    # 4. Backtest
    test_backtest_flow()

    # 5. Final status
    code, text = status()
    print(f"Final status: {code} {text}")

    print("=== Stress test completed ===")

if __name__ == "__main__":
    run_stress()
