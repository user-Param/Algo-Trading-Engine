"use client";

import { useEngine } from "@/app/lib/engine-context";

export default function Positions() {
  const { positions } = useEngine();

  const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalExposure = positions.reduce((sum, p) => sum + p.quantity * p.avg_price, 0);

  return (
    <div className="h-full w-full p-2 flex flex-col gap-1 text-xs">
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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-0.5">
          {positions.length === 0 && (
            <div className="px-2 py-4 text-center text-gray-500 text-[10px]">
              No open positions. Executed trades will appear here.
            </div>
          )}
          {positions.map((pos) => (
            <div key={pos.id} className="flex justify-between gap-2 px-2 py-1">
              <span className="font-mono font-semibold w-16">{pos.symbol}</span>
              <span className="font-mono w-16 text-right">${pos.avg_price.toFixed(2)}</span>
              <span className="font-mono w-16 text-right">${pos.current_price.toFixed(2)}</span>
              <span className="font-mono w-12 text-right">{pos.quantity.toFixed(4)}</span>
              <span
                className={`font-mono w-20 text-right font-bold ${
                  pos.pnl >= 0 ? "text-[#FF764e]" : "text-[#d83b2a]"
                }`}
              >
                ${pos.pnl.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
