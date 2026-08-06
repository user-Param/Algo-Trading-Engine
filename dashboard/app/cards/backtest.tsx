"use client";

import { useState } from "react";
import { useEngine } from "@/app/lib/engine-context";

export default function Backtest() {
  const { backtestStatus, startBacktest, stopBacktest } = useEngine();
  const [symbol, setSymbol] = useState("BTC/USD");
  const [capital, setCapital] = useState(10000);

  const handleStart = async () => {
    await startBacktest(symbol, capital);
  };

  return (
    <div className="h-full w-full p-2 flex flex-col gap-2 text-xs">
      <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-gray-700 pb-1">
        <span>Backtest</span>
        <span className={backtestStatus.is_running ? "text-green-400" : ""}>
          {backtestStatus.is_running ? "Running" : "Idle"}
        </span>
      </div>

      <div className="flex gap-1">
        <input
          className="bg-gray-800/50 border border-gray-700 px-2 py-1 text-[11px] flex-1"
          placeholder="Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <input
          type="number"
          className="bg-gray-800/50 border border-gray-700 px-2 py-1 text-[11px] w-24"
          placeholder="Capital"
          value={capital}
          onChange={(e) => setCapital(Number(e.target.value))}
        />
        {backtestStatus.is_running ? (
          <button
            onClick={stopBacktest}
            className="px-2 py-1 bg-red-800 rounded hover:bg-red-700 text-[10px]"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="px-2 py-1 bg-green-800 rounded hover:bg-green-700 text-[10px]"
          >
            Start
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-gray-400">Symbol</span>
          <span>{backtestStatus.current_symbol || "-"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Start Capital</span>
          <span>${(backtestStatus.start_capital || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Current Capital</span>
          <span>${(backtestStatus.current_capital || 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Progress</span>
          <span>{backtestStatus.progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded h-1.5 mt-1">
          <div
            className="bg-green-600 h-1.5 rounded"
            style={{ width: `${Math.min(100, backtestStatus.progress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
