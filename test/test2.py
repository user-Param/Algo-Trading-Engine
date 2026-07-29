#!/usr/bin/env python3
"""
test_stress.py – Comprehensive stress test for the Algo Trading Engine

Tests:
- REST API: start/stop/status/backtest endpoints, concurrent requests
- WebSocket control: multiple connections, subscribe/status commands
- Feed data availability (via a new /api/feed/latest/<symbol> endpoint – must be implemented)
- Engine responsiveness under load
"""

import asyncio
import json
import random
import threading
import time
import requests
import websockets
from concurrent.futures import ThreadPoolExecutor

BASE_URL = "http://localhost:8080"

# ----------------------------------------------------------------------
# Helper functions (REST)
# ----------------------------------------------------------------------
def api_start():
    return requests.post(f"{BASE_URL}/api/engine/start")

def api_stop():
    return requests.post(f"{BASE_URL}/api/engine/stop")

def api_status():
    return requests.get(f"{BASE_URL}/api/engine/status")

def api_feed_connect():
    return requests.post(f"{BASE_URL}/api/feeds/connect")

def api_feed_latest(symbol="BTC/USD"):
    # This endpoint must be implemented in the engine
    try:
        return requests.get(f"{BASE_URL}/api/feed/latest/{symbol}")
    except:
        return None

def api_backtest_start(symbol="BTC/USD", capital=10000):
    return requests.post(f"{BASE_URL}/api/backtest/start", json={"symbol": symbol, "capital": capital})

def api_backtest_stop():
    return requests.post(f"{BASE_URL}/api/backtest/stop")

def api_list_algos():
    return requests.get(f"{BASE_URL}/api/algos/list")

# ----------------------------------------------------------------------
# WebSocket client
# ----------------------------------------------------------------------
async def ws_command(command, duration=2):
    """Send a command to /engine and return responses"""
    uri = "ws://localhost:8080/engine"
    try:
        async with websockets.connect(uri) as ws:
            await ws.send(command)
            responses = []
            # Read for a short time to get response(s)
            start = time.time()
            while time.time() - start < duration:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=0.5)
                    responses.append(msg)
                except asyncio.TimeoutError:
                    break
            return responses
    except Exception as e:
        return [f"Error: {e}"]

# ----------------------------------------------------------------------
# Stress tests
# ----------------------------------------------------------------------
def test_concurrent_api_requests(num_requests=50):
    """Fire many start/stop/status requests concurrently"""
    print(f"[Stress] Sending {num_requests} concurrent API requests...")
    def worker():
        for _ in range(num_requests // 4):
            api_status()
            api_start()
            api_stop()
            api_feed_connect()
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(worker) for _ in range(4)]
        for f in futures:
            f.result()
    print("[Stress] Concurrent API requests done.")

def test_websocket_load(num_connections=20):
    """Open many WebSocket connections and send commands"""
    print(f"[Stress] Opening {num_connections} WebSocket connections...")
    async def connect_and_send():
        uri = "ws://localhost:8080/engine"
        try:
            async with websockets.connect(uri) as ws:
                await ws.send("status")
                resp = await asyncio.wait_for(ws.recv(), timeout=1)
                return resp
        except Exception as e:
            return f"Error: {e}"

    async def run_all():
        tasks = [connect_and_send() for _ in range(num_connections)]
        results = await asyncio.gather(*tasks)
        # Count success
        ok = sum(1 for r in results if r == "running" or r == "stopped")
        print(f"[Stress] WebSocket load: {ok}/{num_connections} succeeded")
        return results

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(run_all())
    loop.close()

def test_feed_data_availability(symbol="BTCUSDT", samples=10):
    """Check if feed data is coming through by polling the latest endpoint (if available)"""
    # First, try to get latest via API
    resp = api_feed_latest(symbol)
    if resp is None or resp.status_code != 200:
        print("[Stress] Feed latest endpoint not available, skipping feed data test.")
        return

    print(f"[Stress] Checking feed data for {symbol}...")
    count = 0
    for _ in range(samples):
        try:
            resp = api_feed_latest(symbol)
            if resp and resp.status_code == 200:
                data = resp.json()
                if data.get("price", 0) > 0:
                    count += 1
            time.sleep(0.5)
        except:
            pass
    print(f"[Stress] Feed data available in {count}/{samples} polls.")

def test_engine_stability():
    """Run a mixed workload for a period and check if engine stays alive"""
    print("[Stress] Running mixed workload for 10 seconds...")
    start_time = time.time()
    while time.time() - start_time < 10:
        # Random mix of API calls
        r = random.random()
        if r < 0.3:
            api_status()
        elif r < 0.6:
            api_feed_connect()
        elif r < 0.8:
            api_list_algos()
        else:
            # WebSocket command (async)
            asyncio.run(ws_command("status", duration=0.5))
        time.sleep(0.1)
    print("[Stress] Mixed workload completed.")

# ----------------------------------------------------------------------
# Main runner
# ----------------------------------------------------------------------
def run_stress_test():
    print("=== Algo Trading Engine Stress Test ===\n")

    # Ensure engine is started and feed connected
    print("[Setup] Starting engine and feed...")
    api_start()
    api_feed_connect()
    time.sleep(2)   # wait for feed to connect

    # Check initial status
    status = api_status().json()
    print(f"[Setup] Engine status: {status}")

    # 1. Concurrent API stress
    test_concurrent_api_requests(100)

    # 2. WebSocket load
    test_websocket_load(30)

    # 3. Feed data test (if endpoint available)
    test_feed_data_availability("BTCUSDT", samples=15)

    # 4. Stability test
    test_engine_stability()

    # 5. Backtest test (if implemented)
    print("[Stress] Testing backtest endpoints...")
    resp = api_backtest_start("BTC/USD", 10000)
    print(f"  Backtest start: {resp.status_code} {resp.text}")
    time.sleep(1)
    resp = api_backtest_stop()
    print(f"  Backtest stop: {resp.status_code} {resp.text}")

    # Final cleanup
    print("[Cleanup] Stopping engine...")
    api_stop()
    print("=== Stress test completed ===")

if __name__ == "__main__":
    run_stress_test()
