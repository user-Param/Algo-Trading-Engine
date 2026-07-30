"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/app/lib/engine-context";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
interface Position {
  id: string;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  leverage: number;
  pnl: number;          // absolute
  pnlPercent: number;   // %
  liquidationPrice: number;
}

// ------------------------------------------------------------
// Helper: generate a random position
// ------------------------------------------------------------
const symbols = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "DOGE/USD", "ADA/USD"];

function generateRandomPosition(): Position {
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const side = Math.random() > 0.5 ? "long" : "short";
  const basePrice = symbol === "BTC/USD" ? 65000 :
                    symbol === "ETH/USD" ? 3500 :
                    symbol === "SOL/USD" ? 180 :
                    symbol === "XRP/USD" ? 0.6 :
                    symbol === "DOGE/USD" ? 0.15 : 0.4;
  const entryPrice = basePrice * (1 + (Math.random() - 0.5) * 0.01);
  const quantity = parseFloat((Math.random() * 1.5 + 0.1).toFixed(4));
  const leverage = Math.floor(Math.random() * 10) + 1;
  // liquidation: for long ~ entry * (1 - 1/leverage), for short ~ entry * (1 + 1/leverage)
  const liqPrice = side === "long"
    ? entryPrice * (1 - 0.9 / leverage)
    : entryPrice * (1 + 0.9 / leverage);
  return {
    id: Math.random().toString(36).substring(2, 9),
    symbol,
    side,
    entryPrice,
    currentPrice: entryPrice,
    quantity,
    leverage,
    pnl: 0,
    pnlPercent: 0,
    liquidationPrice: liqPrice,
  };
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function Positions() {
  // const engine = useEngine(); // future integration

  const [positions, setPositions] = useState<Position[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize with 8 random positions
  useEffect(() => {
    const initial = Array.from({ length: 8 }, generateRandomPosition);
    setPositions(initial);
  }, []);

  // Update prices and P&L every 10ms
  useEffect(() => {
    if (isPaused || positions.length === 0) return;

    const interval = setInterval(() => {
      setPositions((prev) =>
        prev.map((pos) => {
          // Random walk price change (±0.2%)
          const change = (Math.random() - 0.5) * 0.004 * pos.currentPrice;
          const newPrice = Math.max(0.01, pos.currentPrice + change);

          // Calculate P&L
          let pnl = 0;
          if (pos.side === "long") {
            pnl = (newPrice - pos.entryPrice) * pos.quantity * pos.leverage;
          } else {
            pnl = (pos.entryPrice - newPrice) * pos.quantity * pos.leverage;
          }
          const pnlPercent = (pnl / (pos.entryPrice * pos.quantity)) * 100;

          return {
            ...pos,
            currentPrice: newPrice,
            pnl,
            pnlPercent,
          };
        })
      );
    }, 10); // 10ms = 100 updates/sec

    return () => clearInterval(interval);
  }, [isPaused, positions.length]);

  const togglePause = () => setIsPaused((p) => !p);

  // Compute summary stats
  const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalExposure = positions.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);

  return (
    <div className="h-full w-full p-2 flex flex-col gap-1 text-xs">
      {/* Header with summary */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-gray-700 pb-1">
        <span>Open Positions ({positions.length})</span>
        <div className="flex items-center gap-3">
          <span>
            Total P&L:{" "}
            <span className={totalPnL >= 0 ? "text-green-400" : "text-red-400"}>
              ${totalPnL.toFixed(2)}
            </span>
          </span>
          <span>Exposure: ${totalExposure.toFixed(2)}</span>
          <button
            onClick={togglePause}
            className="px-2 py-0.5 bg-gray-700 rounded hover:bg-gray-600 text-[10px]"
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {/* Scrollable positions list */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-0.5">
          {positions.map((pos) => (
            <div
              key={pos.id}
              className={`flex justify-between gap-2 px-2 py-1 border-gray ${
                pos.side === "long"
                  ? "border-gray"
                  : "border-gray"
              }`}
            >
              {/* Symbol */}
              <span className="font-mono font-semibold w-16">{pos.symbol}</span>

              {/* Side */}
              <span
                className={`w-10 text-center font-bold ${
                  pos.side === "long" ? "text-[#00FF00]" : "text-[#FF764e]"
                }`}
              >
                {pos.side.toUpperCase()}
              </span>

              {/* Entry Price */}
              <span className="font-mono w-16 text-right">${pos.entryPrice.toFixed(2)}</span>

              {/* Current Price */}
              <span className="font-mono w-16 text-right">${pos.currentPrice.toFixed(2)}</span>

              {/* Quantity */}
              <span className="font-mono w-12 text-right">{pos.quantity.toFixed(4)}</span>

              {/* Leverage */}
              <span className="font-mono w-10 text-center text-yellow-400">{pos.leverage}x</span>

              {/* P&L */}
              <span
                className={`font-mono w-20 text-right font-bold ${
                  pos.pnl >= 0 ? "text-[#00FF00]" : "text-[#FF764e]"
                }`}
              >
                ${pos.pnl.toFixed(2)}
                <span className="text-[9px] ml-1">
                  ({pos.pnlPercent >= 0 ? "+" : ""}
                  {pos.pnlPercent.toFixed(1)}%)
                </span>
              </span>

              {/* Liquidation Price */}
              <span className="font-mono w-14 text-right text-gray-400">
                {pos.liquidationPrice.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}