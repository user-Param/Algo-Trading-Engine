"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

export default function Sidebar({ expanded, onToggle }: SidebarProps) {
  return (
    <div className="bg-[#101010] text-white h-screen flex flex-col py-4">
      {/* Toggle button at the top */}
      <button
        onClick={onToggle}
        className="p-2 hover:bg-[#161616] rounded transition-colors mb-4"
        aria-label="Toggle sidebar"
      >
        {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Sidebar content – conditionally show labels */}
      <div className="flex flex-col w-full">
        <div className="w-full px-2 py-1">
          {expanded ? <button className="text-sm px-2 bg-[#161616] border border-gray-600 w-full">Portfolio</button> : <button className="text-xs border border-gray-600 w-full">port</button>}
        </div>
        <div className="w-full px-2 py-1">
          {expanded ? <button className="text-sm px-2 bg-[#161616] border border-gray-600 w-full">Performance</button> : <button className="text-xs border border-gray-600 w-full">perf</button>}
        </div>
        <div className="w-full px-2 py-1">
          {expanded ? <button className="text-sm px-2 bg-[#161616] border border-gray-600 w-full">Latency</button> : <button className="text-xs border border-gray-600 w-full">lat</button>}
        </div>
        <div className="w-full px-2 py-1">
          {expanded ? <button className="text-sm px-2 bg-[#161616] border border-gray-600 w-full">Window</button> : <button className="text-xs border border-gray-600 w-full">win</button>}
        </div>
        <div className="w-full px-2 py-1">
          {expanded ? <button className="text-sm px-2 bg-[#161616] border border-gray-600 w-full">Inventory</button> : <button className="text-xs border border-gray-600 w-full">inv</button>}
        </div>
        <div className="w-full px-2 py-1">
          {expanded ? <button className="text-sm px-2 bg-[#161616] border border-gray-600 w-full">System</button> : <button className="text-xs border border-gray-600 w-full">sys</button>}
        </div>
        <div className="w-full px-2 py-1">
          {expanded ? <button className="text-sm px-2 bg-[#161616] border border-gray-600 w-full">Settings</button> : <button className="text-xs border border-gray-600 w-full">sett</button>}
        </div>
      </div>
    </div>
  );
}