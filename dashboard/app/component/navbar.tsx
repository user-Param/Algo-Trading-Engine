"use client";

import { useMemo } from "react";


export default function Navbar() {
  

  

  return (
    <div className="bg-[#101010] text-white p-4 w-full max-h-16 flex items-center justify-between">
      <div className="flex gap-3">
        <h1 className="text-xl font-bold">Protype</h1>
        <span className="bg-[#161616] rounded px-4">History</span>
        <span className="bg-[#161616] rounded px-4">Tools</span>
        <span className="bg-[#161616] rounded px-4">Windows</span>
        <span className="bg-[#161616] rounded px-4">Layouts</span>
        <span className="bg-[#161616] rounded px-4">Help</span>
      </div>
      <div className="flex gap-3">
        <span className="bg-[#161616] rounded px-4">
          Uptime {"-"}h
        </span>
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