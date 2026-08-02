"use client";

import { useMemo, useState } from "react";

type ViewMode = "alpha" | "terminal" | "lab" | "inventory" | "trade-history" | "help";

interface NavbarProps {
  currentView?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
}

export default function Navbar({ 
  currentView = "alpha", 
  onViewChange = () => {} 
}: NavbarProps) {

  const navItems: { id: ViewMode; label: string }[] = [
    { id: "alpha", label: "Alpha" },
    { id: "terminal", label: "Terminal" },
    { id: "lab", label: "Lab" },
    { id: "inventory", label: "Inventory" },
    { id: "trade-history", label: "Trade History" },
    { id: "help", label: "Help" },
  ];

  const[isRunning, setIsRunning] = useState(false);
  const handleClick = () =>{
    setIsRunning(!isRunning);
  }

  return (
    <div className="bg-[#101010] text-white p-4 w-full max-h-16 flex items-center justify-between">
      <div className="flex gap-3">
        <h1 className="text-xl font-bold">Protype</h1>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`rounded px-4 py-1 transition-colors ${
              currentView === item.id
                ? "bg-[#242424] text-white"
                : "bg-[#161616] hover:bg-[#252525]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button className="bg-[#161616] rounded px-8 border"
          onClick={handleClick}
          >
          {isRunning ? "Stop" : "Start"}
        </button>
        <span className="bg-[#161616] rounded px-4">
          Exchange {"-"}
        </span>
        <span className="bg-[#161616] rounded px-4">
          Network {"-"}
        </span>
        <span className="bg-[#161616] rounded px-4">
          Health {"-"}
        </span>
        <span className="bg-[#161616] rounded px-4">
          Connections {"-"}
        </span>
        <span className="bg-[#161616] rounded px-4">
          Latency {"-"}
        </span>
        <span className="bg-[#161616] rounded px-4">
          Alerts {"-"}
        </span>
        <span className="bg-[#161616] rounded px-4">Param</span>
      </div>
    </div>
  );
}