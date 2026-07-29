#!/usr/bin/env python3
"""
test1.py – Integration test for the Algo Trading Engine
Runs against a local engine instance at http://localhost:8080
"""

import asyncio
import json
import sys
import time
import requests
import websockets

# ----------------------------------------------------------------------
# REST API endpoints (HTTP)
# ----------------------------------------------------------------------
BASE_URL = "http://localhost:8080"

def api_start_engine():
    resp = requests.post(f"{BASE_URL}/api/engine/start")
    print(f"[API] Start engine: {resp.status_code} {resp.text}")

def api_stop_engine():
    resp = requests.post(f"{BASE_URL}/api/engine/stop")
    print(f"[API] Stop engine: {resp.status_code} {resp.text}")

def api_engine_status():
    resp = requests.get(f"{BASE_URL}/api/engine/status")
    print(f"[API] Engine status: {resp.status_code} {resp.text}")
    return resp.json()

def api_connect_feed():
    resp = requests.post(f"{BASE_URL}/api/feeds/connect")
    print(f"[API] Connect feed: {resp.status_code} {resp.text}")

def api_backtest_start(symbol="BTC/USD", capital=10000.0):
    resp = requests.post(f"{BASE_URL}/api/backtest/start", json={"symbol": symbol, "capital": capital})
    print(f"[API] Backtest start: {resp.status_code} {resp.text}")

def api_backtest_stop():
    resp = requests.post(f"{BASE_URL}/api/backtest/stop")
    print(f"[API] Backtest stop: {resp.status_code} {resp.text}")

def api_list_algos():
    resp = requests.get(f"{BASE_URL}/api/algos/list")
    print(f"[API] List algos: {resp.status_code} {resp.text}")

# ----------------------------------------------------------------------
# WebSocket client (commands and receiving ticks)
# ----------------------------------------------------------------------
async def websocket_test(symbol="BTC/USD", duration=5):
    """Connect to /engine, send commands, and receive tick data"""
    uri = "ws://localhost:8080/engine"
    try:
        async with websockets.connect(uri) as websocket:
            print(f"[WS] Connected to {uri}")

            # Send a 'subscribe' command
            sub_cmd = f"subscribe {symbol}"
            await websocket.send(sub_cmd)
            print(f"[WS] Sent: {sub_cmd}")

            # Start receiving messages for 'duration' seconds
            print(f"[WS] Listening for ticks (press Ctrl+C to stop)...")
            start_time = time.time()
            tick_count = 0

            while time.time() - start_time < duration:
                try:
                    msg = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    print(f"[WS] Received: {msg}")
                    # If the message looks like a tick (starts with "TICK"), count it
                    if msg.startswith("TICK"):
                        tick_count += 1
                except asyncio.TimeoutError:
                    # No message within 1 second, continue
                    pass

            print(f"[WS] Received {tick_count} ticks in {duration} seconds.")
            # Optionally, send a 'status' command
            await websocket.send("status")
            status = await websocket.recv()
            print(f"[WS] Engine status: {status}")

    except websockets.exceptions.ConnectionClosedError as e:
        print(f"[WS] Connection closed unexpectedly: {e}")
    except Exception as e:
        print(f"[WS] Error: {e}")

# ----------------------------------------------------------------------
# Main test runner
# ----------------------------------------------------------------------
def run_tests():
    print("=== Algo Trading Engine Integration Test ===\n")

    # 1. Check initial status (should be stopped)
    print("[1] Checking initial status...")
    api_engine_status()

    # 2. Start the engine
    print("\n[2] Starting engine...")
    api_start_engine()
    time.sleep(0.5)

    # 3. Verify engine is running
    print("\n[3] Verifying engine is running...")
    api_engine_status()

    # 4. Connect the market data feed
    print("\n[4] Connecting market data feed...")
    api_connect_feed()
    time.sleep(2)  # give time for connection attempt

    # 5. List registered algorithms (if any)
    print("\n[5] Listing algorithms...")
    api_list_algos()

    # 6. Run WebSocket test (subscribe & receive ticks)
    print("\n[6] Running WebSocket test (subscribe to BTC/USD for 10 seconds)...")
    asyncio.run(websocket_test(symbol="BTC/USD", duration=10))

    # 7. (Optional) Start a backtest – uncomment if backtest is implemented
    # print("\n[7] Starting backtest...")
    # api_backtest_start("BTC/USD", 10000.0)
    # time.sleep(1)
    # api_backtest_stop()

    # 8. Stop the engine
    print("\n[8] Stopping engine...")
    api_stop_engine()

    # 9. Final status check
    print("\n[9] Final status check...")
    api_engine_status()

    print("\n=== Test completed ===")

if __name__ == "__main__":
    run_tests()
