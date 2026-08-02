"use client";

import { useState, useEffect } from "react";
import { useDatafeed } from "@/app/lib/datafeed-context";

type OrderType =
  | "Market Execution"
  | "Buy Limit"
  | "Sell Limit"
  | "Buy Stop"
  | "Sell Stop"
  | "Buy Stop Limit"
  | "Sell Stop Limit";

type FillPolicy = "Fill or Kill" | "Immediate or Cancel";

interface TerminalProps {
  selectedSymbol: string;
  onSymbolChange?: (symbol: string) => void; // optional, if you want to change from terminal
}

export default function Terminal({ selectedSymbol, onSymbolChange }: TerminalProps) {
  const datafeed = useDatafeed();

  // --- Form State ---
  const [orderType, setOrderType] = useState<OrderType>("Market Execution");
  const [quantityPercent, setQuantityPercent] = useState<number>(0.5);
  const [manualQuantity, setManualQuantity] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [fillPolicy, setFillPolicy] = useState<FillPolicy>("Immediate or Cancel");

  // --- Real prices from the feed ---
  const ticker = selectedSymbol ? datafeed.tickerData[selectedSymbol] : null;
  const bidPrice = ticker?.bid ?? 0;
  const askPrice = ticker?.ask ?? 0;

  // --- Capital (mock, later from engine) ---
  const capital = 10000;

  // --- Quantity calculation ---
  const getQuantity = (): number => {
    if (manualQuantity) {
      const q = parseFloat(manualQuantity);
      if (!isNaN(q) && q > 0) return q;
    }
    return (capital * quantityPercent) / 100;
  };

  // --- Order Handlers ---
  const handleSell = () => {
    const qty = getQuantity();
    if (qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }
    console.log(`SELL ${qty} ${selectedSymbol} at market price ${bidPrice}`);
    // API call later
  };

  const handleBuy = () => {
    const qty = getQuantity();
    if (qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }
    console.log(`BUY ${qty} ${selectedSymbol} at market price ${askPrice}`);
    // API call later
  };

  const handleCancel = () => {
    setManualQuantity("");
    setStopLoss("");
    setTakeProfit("");
  };

  // --- Available symbols (from datafeed) ---
  const symbols = Object.keys(datafeed.tickerData);

  // --- Auto-select first symbol if none selected ---
  useEffect(() => {
    if (!selectedSymbol && symbols.length > 0 && onSymbolChange) {
      onSymbolChange(symbols[0]);
    }
  }, [selectedSymbol, symbols, onSymbolChange]);

  return (
    <div className="h-full w-full p-5 flex flex-col gap-5 text-xs border border-gray-800 overflow-y-auto scrollbar-hide">
      {/* Symbol + Order Type row */}
      <div className="flex justify-between items-center gap-4">
        {/* Symbol Selector */}
        <div className="flex items-center gap-2 flex-1">
          <select
            value={selectedSymbol || ""}
            onChange={(e) => onSymbolChange?.(e.target.value)}
            className="appearance-none bg-[#181818] bg-none border border-gray-700 px-3 py-2 text-sm font-semibold flex-1"
          >
            {symbols.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Order Type */}
        <div className="flex items-center gap-2 flex-1">
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as OrderType)}
            className="appearance-none bg-[#181818] bg-none border border-gray-700 px-3 py-2 text-sm flex-1"
          >
            <option value="Market Execution">Market Execution</option>
            <option value="Buy Limit">Buy Limit</option>
            <option value="Sell Limit">Sell Limit</option>
            <option value="Buy Stop">Buy Stop</option>
            <option value="Sell Stop">Sell Stop</option>
            <option value="Buy Stop Limit">Buy Stop Limit</option>
            <option value="Sell Stop Limit">Sell Stop Limit</option>
          </select>
        </div>
      </div>

      {/* Quantity */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-gray-400 w-20">Quantity</label>
          <input
            type="number"
            value={manualQuantity}
            onChange={(e) => setManualQuantity(e.target.value)}
            placeholder="Manual"
            className="appearance-none bg-[#181818] bg-none border border-gray-700 px-3 py-2 w-full"
          />
        </div>
        <div className="flex gap-1 mt-2">
          {[0.25, 0.50, 0.75, 1.0, 1.25].map((pct) => (
            <button
              key={pct}
              onClick={() => {
                setQuantityPercent(pct);
                setManualQuantity("");
              }}
              className={`px-3 py-1 text-xs ${
                quantityPercent === pct && !manualQuantity
                  ? "bg-[#242424] text-white"
                  : "bg-[#181818] text-gray-300 hover:bg-gray-700"
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-gray-400 block mb-0.5">Stop Loss</label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="e.g. 64000"
            className="appearance-none bg-[#181818] bg-none border border-gray-700 px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="text-gray-400 block mb-0.5">Take Profit</label>
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="e.g. 66000"
            className="appearance-none bg-[#181818] bg-none border border-gray-700 px-3 py-2 w-full"
          />
        </div>
      </div>

      {/* Fill Policy */}
      <div className="flex items-center gap-2">
        <label className="text-gray-400 w-20">Fill Policy</label>
        <select
          value={fillPolicy}
          onChange={(e) => setFillPolicy(e.target.value as FillPolicy)}
          className="appearance-none bg-[#181818] bg-none border border-gray-700 px-3 py-2 flex-1"
        >
          <option value="Immediate or Cancel">Immediate or Cancel</option>
          <option value="Fill or Kill">Fill or Kill</option>
        </select>
      </div>

      {/* Price & Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        {/* Sell Side */}
        <div className="flex flex-col items-center p-3">
          <div className="text-white text-xs">Sell by Market</div>
          <div className="text-white text-lg font-mono font-bold">
            ${bidPrice.toFixed(2)}
          </div>
          <button
            onClick={handleSell}
            disabled={bidPrice === 0}
            className="mt-1 w-full appearance-none bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 rounded text-sm font-medium"
          >
            Sell
          </button>
        </div>

        {/* Buy Side */}
        <div className="flex flex-col items-center p-3">
          <div className="text-white text-xs">Buy by Market</div>
          <div className="text-white text-lg font-mono font-bold">
            ${askPrice.toFixed(2)}
          </div>
          <button
            onClick={handleBuy}
            disabled={askPrice === 0}
            className="mt-1 w-full appearance-none bg-[#066bcc] disabled:bg-gray-600 text-white py-2 text-sm font-medium"
          >
            Buy
          </button>
        </div>
      </div>

      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        className="w-full appearance-none bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded text-sm font-medium"
      >
        Cancel
      </button>
    </div>
  );
}