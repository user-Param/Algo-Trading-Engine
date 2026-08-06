#!/usr/bin/env python3
"""
Mock Datafeed Server – mimics the real feed for the Algo Trading Engine.
Now handles dashboard's subscription format.
Run: python3 mock_feed.py [--host HOST] [--port PORT] [--interval SECONDS]
"""

import asyncio
import json
import random
import argparse
import logging
from datetime import datetime
import websockets

# ----- Configuration -----
SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOGE/USD"]
BASE_PRICES = {
    "BTC/USD": 65000.0,
    "ETH/USD": 3500.0,
    "SOL/USD": 180.0,
    "XRP/USD": 0.60,
    "ADA/USD": 0.40,
    "DOGE/USD": 0.15,
}
VOLATILITY = {
    "BTC/USD": 50.0,
    "ETH/USD": 20.0,
    "SOL/USD": 5.0,
    "XRP/USD": 0.02,
    "ADA/USD": 0.01,
    "DOGE/USD": 0.005,
}

# Global state: current price for each symbol
current_prices = BASE_PRICES.copy()

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s')
logger = logging.getLogger(__name__)

ticker_interval = 0.5  # seconds per tick


def generate_ticker() -> dict:
    """Produce a random ticker update in the format the engine expects."""
    symbol = random.choice(SYMBOLS)
    base = current_prices[symbol]
    vol = VOLATILITY[symbol]

    change = (random.random() - 0.5) * vol * 2.0
    new_price = base + change
    if new_price < base * 0.95:
        new_price = base * 0.95 + random.random() * vol
    if new_price > base * 1.05:
        new_price = base * 1.05 - random.random() * vol
    new_price = round(new_price, 2)
    current_prices[symbol] = new_price

    spread = random.uniform(0.1, 0.5)
    if symbol in ["BTC/USD"]:
        spread = random.uniform(0.5, 2.0)
    bid = round(new_price - spread * 0.5, 2)
    ask = round(new_price + spread * 0.5, 2)

    return {
        "topic": "ticker_",
        "symbol": symbol,
        "price": new_price,
        "bid": bid,
        "ask": ask,
        "timestamp": int(datetime.now().timestamp() * 1000),
    }


async def handler(websocket):
    """Handle a single WebSocket connection."""
    client = websocket.remote_address
    logger.info(f"Client connected: {client}")

    subscribed_to_ticker = False
    send_task = None

    try:
        async for message in websocket:
            logger.debug(f"Received: {message[:100]}...")

            # 1. Handle raw '_Live'
            if message.strip() == "_Live":
                logger.info("Client sent _Live")
                continue

            # 2. Try to parse as JSON
            try:
                data = json.loads(message)
                msg_type = data.get("type")
                topic = data.get("topic")

                # 2a. Subscription message
                if msg_type == "subscribe":
                    if topic == "ticker_":
                        logger.info("Subscribed to ticker_")
                        subscribed_to_ticker = True
                        # Start sending ticks if not already
                        if send_task is None:
                            async def send_ticks():
                                while True:
                                    ticker = generate_ticker()
                                    await websocket.send(json.dumps(ticker))
                                    await asyncio.sleep(ticker_interval)
                            send_task = asyncio.create_task(send_ticks())
                    else:
                        logger.info(f"Ignoring subscription to {topic}")
                    continue

                # 2b. Switch exchange message (ignore)
                elif msg_type == "switch_exchange":
                    logger.info(f"Switch exchange: {data.get('exchange')} with {len(data.get('symbols', []))} symbols")
                    # Optionally, you could update the symbol list here
                    continue

                # 2c. Old-style subscribe (fallback)
                elif "subscribe" in data and data["subscribe"] == "ticker_":
                    logger.info("Subscribed to ticker_ (old format)")
                    subscribed_to_ticker = True
                    if send_task is None:
                        async def send_ticks():
                            while True:
                                ticker = generate_ticker()
                                await websocket.send(json.dumps(ticker))
                                await asyncio.sleep(ticker_interval)
                        send_task = asyncio.create_task(send_ticks())
                    continue

            except json.JSONDecodeError:
                # Not JSON, ignore
                pass

            logger.warning(f"Unknown message: {message[:50]}")

    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Client disconnected: {client}")
    finally:
        if send_task:
            send_task.cancel()
            await send_task  # optional: wait for cancellation


async def main():
    parser = argparse.ArgumentParser(description="Mock Datafeed Server for Algo Trading Engine")
    parser.add_argument("--host", default="0.0.0.0", help="Bind address (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8765, help="Listen port (default: 8765)")
    parser.add_argument("--interval", type=float, default=0.5, help="Ticker interval in seconds (default: 0.5)")
    args = parser.parse_args()

    global ticker_interval
    ticker_interval = args.interval

    logger.info(f"Starting mock feed on ws://{args.host}:{args.port}")
    logger.info(f"Symbols: {', '.join(SYMBOLS)}")
    logger.info(f"Ticker interval: {ticker_interval}s")

    async with websockets.serve(handler, args.host, args.port):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
