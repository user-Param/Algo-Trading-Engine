"use client";

import { useDatafeed } from "@/app/lib/datafeed-context";
import React, { useEffect, useMemo, useState } from "react";

interface ExchangeEntry {
  name: string;
  status: "connected" | "disconnected" | "stale" | "unknown";
  uptime: number;
  latency: number;
  messages_received: number;
  messages_dropped: number;
  parse_errors: number;
}

interface OrderBookLevel {
  price: number;
  size: number;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case "connected":
      return "bg-green-400";
    case "stale":
      return "bg-yellow-400";
    case "disconnected":
      return "bg-red-400";
    default:
      return "bg-gray-400";
  }
};

// Dummy exchange names
const DUMMY_EXCHANGES = ["Binance", "Coinbase", "Kraken", "Bybit", "OKX"];

// Helper: random number between min and max
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

// Generate dummy exchange data with realistic ranges
const generateDummyExchanges = (): ExchangeEntry[] => {
  return DUMMY_EXCHANGES.map((name) => {
    const statuses: ExchangeEntry["status"][] = [
      "connected",
      "connected",
      "connected",
      "stale",
      "disconnected",
    ];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    return {
      name,
      status,
      uptime: 1, // 1 minute to 30 days
      latency: rand(5, 200),
      messages_received: Math.floor(rand(1000, 1000000)),
      messages_dropped: Math.floor(rand(0, 1000)),
      parse_errors: Math.floor(rand(0, 50)),
    };
  });
};

// Generate dummy orderbook levels (bids and asks)
const generateDummyOrderBook = (basePrice: number = 65000): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } => {
  const levels = 20;
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];

  // Generate bids (prices below base, sizes large)
  for (let i = 0; i < levels; i++) {
    const price = basePrice - (i + 1) * (rand(5, 50) + rand(0, 10));
    const size = rand(0.1, 5);
    bids.push({ price: Math.round(price * 100) / 100, size: Math.round(size * 100) / 100 });
  }

  // Generate asks (prices above base, sizes large)
  for (let i = 0; i < levels; i++) {
    const price = basePrice + (i + 1) * (rand(5, 50) + rand(0, 10));
    const size = rand(0.1, 5);
    asks.push({ price: Math.round(price * 100) / 100, size: Math.round(size * 100) / 100 });
  }

  return { bids, asks };
};

export default function Exchange() {
  const { exchanges } = useDatafeed();
  const [entries, setEntries] = useState<ExchangeEntry[]>([]);
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }>({
    bids: [],
    asks: [],
  });

  // Update exchange entries from real or dummy data
  useEffect(() => {
    let validEntries: ExchangeEntry[] = [];

    if (Array.isArray(exchanges) && exchanges.length > 0) {
      validEntries = exchanges
        .filter(
          (ex): ex is Record<string, any> =>
            ex !== null && typeof ex === "object"
        )
        .map((ex) => ({
          name: ex.name ?? ex.exchange ?? "Unknown",
          status: (ex.status ?? "unknown") as ExchangeEntry["status"],
          uptime: ex.uptime ?? ex.uptime_seconds ?? 0,
          latency: ex.latency ?? ex.latency_ms ?? ex.exchange_latency_ms ?? 0,
          messages_received: ex.messages_received ?? 0,
          messages_dropped: ex.messages_dropped ?? 0,
          parse_errors: ex.parse_errors ?? 0,
        }));
    } else if (exchanges && typeof exchanges === "object" && !Array.isArray(exchanges)) {
      validEntries = Object.entries(exchanges)
        .filter(
          ([_, ex]): ex is Record<string, any> =>
            ex !== null && typeof ex === "object"
        )
        .map(([name, ex]) => ({
          name,
          status: (ex.status ?? "unknown") as ExchangeEntry["status"],
          uptime: ex.uptime ?? ex.uptime_seconds ?? 0,
          latency: ex.latency ?? ex.latency_ms ?? ex.exchange_latency_ms ?? 0,
          messages_received: ex.messages_received ?? 0,
          messages_dropped: ex.messages_dropped ?? 0,
          parse_errors: ex.parse_errors ?? 0,
        }));
    }

    if (validEntries.length === 0) {
      validEntries = generateDummyExchanges();
    }

    setEntries(validEntries);
  }, [exchanges]);

  // Update orderbook periodically with random data
  useEffect(() => {
    const updateOrderBook = () => {
      // Use a base price around 65000, with small random variation
      const basePrice = 65000 + rand(-1000, 1000);
      const newBook = generateDummyOrderBook(basePrice);
      setOrderBook(newBook);
    };

    updateOrderBook();
    const interval = setInterval(updateOrderBook, 2000); // refresh every 2s

    return () => clearInterval(interval);
  }, []);

  const summary = useMemo(() => {
    if (entries.length === 0) return null;

    const connected = entries.filter((e) => e.status === "connected").length;
    const stale = entries.filter((e) => e.status === "stale").length;
    const disconnected = entries.filter(
      (e) => e.status === "disconnected"
    ).length;

    return {
      total: entries.length,
      connected,
      stale,
      disconnected,
      healthy: connected === entries.length,
    };
  }, [entries]);

  return (
    <div className="h-full w-full p-2 flex flex-col gap-2 text-xs overflow-auto">
      {/* Exchange Status Table */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-1">Exchange</th>
              <th className="text-center py-1">Status</th>
              <th className="text-right py-1">Uptime</th>
              <th className="text-right py-1">Latency</th>
              <th className="text-right py-1">Received</th>
              <th className="text-right py-1">Dropped</th>
              <th className="text-right py-1">Errors</th>
            </tr>
          </thead>

          <tbody>
            {entries.map((ex) => (
              <tr
                key={ex.name}
                className="border-b border-gray-800 hover:bg-gray-800/50"
              >
                <td className="py-1 font-medium">{ex.name}</td>

                <td className="text-center">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${getStatusColor(
                      ex.status
                    )}`}
                  />
                </td>

                <td className="text-right font-mono">
                  {ex.uptime.toFixed(0)}s
                </td>

                <td className="text-right font-mono">
                  {ex.latency.toFixed(2)}h
                </td>

                <td className="text-right font-mono">
                  {ex.messages_received.toLocaleString()}
                </td>

                <td className="text-right font-mono">
                  {ex.messages_dropped.toLocaleString()}
                </td>

                <td className="text-right font-mono">
                  {ex.parse_errors.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Orderbook Section */}
      <div className="border-t border-gray-700 pt-2">
        <div className="text-xs text-gray-400 mb-1">Orderbook (BTC/USD)</div>
        <div className="grid grid-cols-2 gap-4 text-[10px]">
          {/* Bids */}
          <div>
            <div className="text-green-400 font-medium mb-1">Bids</div>
            <div className="space-y-0.5 p-4 flex-1 overflow-y-auto">
              {orderBook.bids.map((level, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-green-300">${level.price.toFixed(2)}</span>
                  <span className="text-gray-400">{level.size.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Asks */}
          <div>
            <div className="text-red-400 font-medium mb-1">Asks</div>
            <div className="space-y-0.5 p-4 flex-1 overflow-y-auto">
              {orderBook.asks.map((level, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-red-300">${level.price.toFixed(2)}</span>
                  <span className="text-gray-400">{level.size.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}