"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/app/lib/engine-context";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
interface Trade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  leverage: number;
  algoName: string;
  fee: number;
  timestamp: number;
}

// ------------------------------------------------------------
// Helper: generate a random trade
// ------------------------------------------------------------
const symbols = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "DOGE/USD", "ADA/USD"];
const algos = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"];

function generateRandomTrade(): Trade {
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const side = Math.random() > 0.5 ? "buy" : "sell";
  const basePrice = symbol === "BTC/USD" ? 65000 :
                    symbol === "ETH/USD" ? 3500 :
                    symbol === "SOL/USD" ? 180 :
                    symbol === "XRP/USD" ? 0.6 :
                    symbol === "DOGE/USD" ? 0.15 : 0.4;
  const price = basePrice * (1 + (Math.random() - 0.5) * 0.02); // ±2%
  const quantity = parseFloat((Math.random() * 2 + 0.1).toFixed(4));
  const leverage = Math.floor(Math.random() * 10) + 1;
  const algoName = algos[Math.floor(Math.random() * algos.length)];
  const fee = parseFloat((quantity * price * 0.001).toFixed(2)); // 0.1% fee
  return {
    id: Math.random().toString(36).substring(2, 9),
    symbol,
    side,
    price,
    quantity,
    leverage,
    algoName,
    fee,
    timestamp: Date.now(),
  };
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function TradeHistory() {
  // We'll later use real engine context, but for now dummy.
  // const engine = useEngine();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  // Generate a new trade every 10ms (100 per second)
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const newTrade = generateRandomTrade();
      setTrades((prev) => {
        // Keep only the last 150 trades to avoid memory issues
        const updated = [newTrade, ...prev];
        if (updated.length > 150) updated.pop();
        return updated;
      });
    }, 1000); // 10ms = 100 trades/sec

    return () => clearInterval(interval);
  }, [isPaused]);

  // Format timestamp
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  // Toggle pause for debugging
  const togglePause = () => setIsPaused((p) => !p);

  return (
    <div className="h-full w-full p-2 flex flex-col gap-1 text-xs">
      {/* Header with stats */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-gray-700 pb-1">
        <span>Live Trades</span>
        <span>
          {trades.length} trades • {isPaused ? "⏸ Paused" : "▶ Streaming"}
        </span>
        <button
          onClick={togglePause}
          className="px-2 py-0.5 bg-gray-700 rounded hover:bg-gray-600 text-[10px]"
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
      </div>

      {/* Scrollable trade list */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-0.5">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className={`flex justify-between gap-2 px-2 py-1 ${
                trade.side === "buy"
                  ? "border-green-500 bg-green-900/10"
                  : "border-red-500 bg-red-900/10"
              }`}
            >
              {/* Symbol */}
              <span className="font-mono font-semibold w-16">{trade.symbol}</span>

              {/* Side */}
              <span
                className={`w-8 text-center font-bold ${
                  trade.side === "buy" ? "text-green-400" : "text-red-400"
                }`}
              >
                {trade.side.toUpperCase()}
              </span>

              {/* Price */}
              <span className="font-mono w-20 text-right">
                ${trade.price.toFixed(2)}
              </span>

              {/* Quantity */}
              <span className="font-mono w-14 text-right">
                {trade.quantity.toFixed(4)}
              </span>

              {/* Leverage */}
              <span className="font-mono w-12 text-center text-yellow-400">
                {trade.leverage}x
              </span>

              {/* Algo Name */}
              <span className="text-gray-300 w-16 truncate">
                {trade.algoName}
              </span>

              {/* Fee */}
              <span className="font-mono w-14 text-right text-gray-400">
                ${trade.fee.toFixed(2)}
              </span>

              {/* Time */}
              <span className="font-mono text-gray-500 w-16 text-right text-[9px]">
                {formatTime(trade.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}