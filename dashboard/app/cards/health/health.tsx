"use client";

import { useEngine } from "@/app/lib/engine-context";

export default function Health() {
  const { health, connected } = useEngine();

  const items = [
    { label: "Engine", ok: health.status === "running" },
    { label: "Feed", ok: !!health.feed },
    { label: "Database", ok: health.db === "connected" },
    { label: "Connection", ok: connected },
  ];

  return (
    <div className="h-full w-full p-2 flex flex-col gap-2 text-xs">
      <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-gray-700 pb-1">
        <span>System Health</span>
        <span>Algo instances: {health.algo_instances}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between px-2 py-1.5 border ${
              item.ok ? "border-green-800 bg-green-900/10" : "border-red-800 bg-red-900/10"
            }`}
          >
            <span className="text-gray-300">{item.label}</span>
            <span className={`font-mono ${item.ok ? "text-green-400" : "text-red-400"}`}>
              {item.ok ? "OK" : "DOWN"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
