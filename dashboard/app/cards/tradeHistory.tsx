"use client";

import { useEngine } from "@/app/lib/engine-context";

export default function TradeHistory() {
  const { trades } = useEngine();

  const formatTime = (ts: string) => {
    if (!ts) return "-";
    const d = new Date(ts.replace(" ", "T"));
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="h-full w-full p-2 flex flex-col gap-1 text-xs">
      <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-gray-700 pb-1">
        <span>Live Trades</span>
        <span>{trades.length} trades</span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-0.5">
          {trades.length === 0 && (
            <div className="px-2 py-4 text-center text-gray-500 text-[10px]">
              No trades yet. Start the engine and run an algorithm to see executed trades.
            </div>
          )}
          {trades.map((trade) => (
            <div
              key={trade.id}
              className={`flex justify-between gap-2 px-2 py-1 ${
                trade.side === "buy"
                  ? "border-green-500 bg-green-900/10"
                  : "border-red-500 bg-red-900/10"
              }`}
            >
              <span className="font-mono font-semibold w-16">{trade.symbol}</span>
              <span
                className={`w-8 text-center font-bold ${
                  trade.side === "buy" ? "text-green-400" : "text-red-400"
                }`}
              >
                {trade.side.toUpperCase()}
              </span>
              <span className="font-mono w-20 text-right">
                ${trade.price.toFixed(2)}
              </span>
              <span className="font-mono w-14 text-right">
                {trade.quantity.toFixed(4)}
              </span>
              <span className="font-mono w-12 text-center text-yellow-400">
                {(trade.leverage || 1).toFixed(0)}x
              </span>
              <span className="text-gray-300 w-16 truncate">
                {trade.algoId}
              </span>
              <span className="font-mono w-14 text-right text-gray-400">
                {trade.status}
              </span>
              <span className="font-mono text-gray-500 w-16 text-right text-[9px]">
                {formatTime(trade.created_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
