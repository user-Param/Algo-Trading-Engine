"use client";

import { useMemo, useState } from "react";

type ViewMode = "alpha" | "market" | "terminal" | "lab" | "inventory" | "trade-history" | "docs" | "user";

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
    { id: "market", label: "Market" },
    { id: "terminal", label: "Terminal" },
    { id: "lab", label: "Lab" },
    { id: "inventory", label: "Inventory" },
    { id: "trade-history", label: "Trade History" },
    { id: "docs", label: "Docs" },
    { id: "user", label: "user" },
  ];

  const[isRunning, setIsRunning] = useState(false);
  const handleClick = () =>{
    setIsRunning(!isRunning);
  }

  return (
    <div className="text-white p-4 w-full min-h-48 flex items-center justify-center">
      <div className="flex gap-8">
        <h1 className="text-6xl font-bold">Protype</h1>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`px-4 transition-colors ${
              currentView === item.id
                ? " text-white"
                : " hover:bg-[#252525]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}