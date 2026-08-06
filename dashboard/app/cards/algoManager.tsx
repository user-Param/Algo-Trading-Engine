"use client";

import { useState } from "react";
import { useEngine } from "@/app/lib/engine-context";

export default function AlgoManager() {
  const { algorithms, startAlgo, stopAlgo, registerAlgo } = useEngine();
  const [name, setName] = useState("Alpha");
  const [type, setType] = useState("test1");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const handleRegister = async () => {
    if (!name || !type) return;
    setBusy(true);
    const ok = await registerAlgo({ name, type });
    setMsg(ok ? "Registered " + name : "Register failed");
    setBusy(false);
  };

  const handleStart = async (id: string) => {
    await startAlgo(id);
  };

  const handleStop = async (id: string) => {
    await stopAlgo(id);
  };

  return (
    <div className="h-full w-full p-2 flex flex-col gap-2 text-xs overflow-auto">
      <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-gray-700 pb-1">
        <span>Algorithm Manager</span>
        <span>{algorithms.length} registered</span>
      </div>

      <div className="flex gap-1">
        <input
          className="bg-gray-800/50 border border-gray-700 px-2 py-1 text-[11px] flex-1"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="bg-gray-800/50 border border-gray-700 px-2 py-1 text-[11px]"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="test1">test1</option>
        </select>
        <button
          onClick={handleRegister}
          disabled={busy}
          className="px-2 py-1 bg-blue-700 rounded hover:bg-blue-600 text-[10px]"
        >
          Register
        </button>
      </div>
      {msg && <div className="text-[10px] text-green-400">{msg}</div>}

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
        {algorithms.length === 0 && (
          <div className="px-2 py-4 text-center text-gray-500 text-[10px]">
            No algorithms registered. Register one above.
          </div>
        )}
        {algorithms.map((algo) => (
          <div key={algo.id} className="flex items-center justify-between gap-2 px-2 py-1 bg-gray-800/40 border border-gray-700">
            <div className="flex flex-col">
              <span className="font-mono font-semibold">{algo.name}</span>
              <span className="text-[9px] text-gray-500">
                {algo.id} • {algo.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-1.5 py-0.5 text-[9px] rounded ${
                  algo.status === "running" ? "bg-green-800 text-green-200" : "bg-gray-700 text-gray-300"
                }`}
              >
                {algo.status}
              </span>
              {algo.status === "running" ? (
                <button
                  onClick={() => handleStop(algo.id)}
                  className="px-2 py-0.5 bg-red-800 rounded hover:bg-red-700 text-[10px]"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => handleStart(algo.id)}
                  className="px-2 py-0.5 bg-green-800 rounded hover:bg-green-700 text-[10px]"
                >
                  Start
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
