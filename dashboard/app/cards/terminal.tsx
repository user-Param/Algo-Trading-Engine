"use client";

import { useState, useEffect } from "react";
import { useEngine } from "@/app/lib/engine-context";

type OrderType =
  | "Market Execution"
  | "Buy Limit"
  | "Sell Limit"
  | "Buy Stop"
  | "Sell Stop"
  | "Buy Stop Limit"
  | "Sell Stop Limit";

type FillPolicy = "Fill or Kill" | "Immediate or Cancel";

export default function Terminal() {
  const engine = useEngine();

  // --- Form State ---
  const [symbol, setSymbol] = useState("BTC/USD");
  const [orderType, setOrderType] = useState<OrderType>("Market Execution");
  const [quantityPercent, setQuantityPercent] = useState<number>(0.5); // percentage of capital
  const [manualQuantity, setManualQuantity] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");
  const [fillPolicy, setFillPolicy] = useState<FillPolicy>("Immediate or Cancel");

  // --- Price Simulation (dummy) ---
  const [askPrice, setAskPrice] = useState<number>(65000.50);
  const [bidPrice, setBidPrice] = useState<number>(65000.00);
  const [capital] = useState<number>(10000); // dummy capital

  // Simulate price updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 20; // +/- 10
      const newAsk = Math.max(50000, askPrice + change);
      const newBid = Math.max(50000, newAsk - 0.5);
      setAskPrice(Math.round(newAsk * 100) / 100);
      setBidPrice(Math.round(newBid * 100) / 100);
    }, 2000);
    return () => clearInterval(interval);
  }, [askPrice]);

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
    console.log(`SELL ${qty} ${symbol} at market price ${bidPrice}`);
    // Here you would later call an API to place the order
  };

  const handleBuy = () => {
    const qty = getQuantity();
    if (qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }
    console.log(`BUY ${qty} ${symbol} at market price ${askPrice}`);
    // Here you would later call an API to place the order
  };

  const handleCancel = () => {
    setManualQuantity("");
    setStopLoss("");
    setTakeProfit("");
    // Reset other fields if needed
  };

  // --- Available symbols (fallback if engine has none) ---
  const symbols = Object.keys(engine.tickerData).length > 0
    ? Object.keys(engine.tickerData)
    : ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD"];

  // Update symbol when engine tickerData changes
  useEffect(() => {
    if (Object.keys(engine.tickerData).length > 0 && !symbols.includes(symbol)) {
      setSymbol(symbols[0]);
    }
  }, [engine.tickerData, symbols]);

  return (
    <div className="h-[100%] w-full p-3 flex flex-col gap-5 text-xs border border-gray-800 overflow-y-auto">
      {/* Symbol */}
	  <div className="flex justify-evenly">
      <div className="flex items-center text-center gap-2 -none">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-red p-5 text-sm font-semibold flex-1"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Order Type */}
      <div className="flex items-center gap-2">
        <label className="text-gray-400 w-20">Order Type</label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as OrderType)}
          className="border border-gray-700 px-2 py-1 flex-1"
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
            className=" border border-gray-700 px-2 py-1 w-24 text-right"
          />
          <span className="text-gray-400 text-[10px]">or</span>
          <span className="text-gray-400 text-[10px]">% of capital</span>
        </div>
        <div className="flex gap-1 mt-3 ml-22">
          {[0.25, 0.50, 0.75, 1.0, 1.25].map((pct) => (
            <button
              key={pct}
              onClick={() => {
                setQuantityPercent(pct);
                setManualQuantity(""); // clear manual when preset is used
              }}
              className={`px-2 py-0.5 text-xs ${
                quantityPercent === pct && !manualQuantity
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="gap-4">
        <div className="flex">
          <label className="text-gray-400 mb-0.5">Stop Loss</label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="e.g. 64000"
            className="w-full bg-gray-800 border border-gray-700 px-2 py-1"
          />
        </div>
        <div className="flex mt-4">
          <label className="text-gray-400 block mb-0.5">Take Profit</label>
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="e.g. 66000"
            className="w-full bg-gray-800 border border-gray-700 px-2 py-1"
          />
        </div>
      </div>

      {/* Fill Policy */}
      <div className="flex items-center gap-2">
        <label className="text-gray-400 w-20">Fill Policy</label>
        <select
          value={fillPolicy}
          onChange={(e) => setFillPolicy(e.target.value as FillPolicy)}
          className=" border border-gray-700 px-2 py-1 flex-1"
        >
          <option value="Immediate or Cancel">Immediate or Cancel</option>
          <option value="Fill or Kill">Fill or Kill</option>
        </select>
      </div>

      {/* Price & Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        {/* Sell Side */}
        <div className="flex flex-col items-center bg-red-900/20 border border-red-800/50  p-2">
          <div className="text-red-400 text-lg font-mono font-bold">
            ${bidPrice.toFixed(2)}
          </div>
          <button
            onClick={handleSell}
            className="mt-1 w-full text-white py-1.5  text-sm font-medium"
          >
            Sell by Market
          </button>
        </div>

        {/* Buy Side */}
        <div className="flex flex-col items-center bg-green-900/20 border border-green-800/50  p-2">
          <div className="text-green-400 text-lg font-mono font-bold">
            ${askPrice.toFixed(2)}
          </div>
          <button
            onClick={handleBuy}
            className="mt-1 w-full text-white py-1.5  text-sm font-medium"
          >
            Buy by Market
          </button>
        </div>
      </div>

      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        className="mt-1 w-full bg-gray-700 hover:bg-gray-600 text-gray-300 py-1.5  text-sm font-medium"
      >
        Cancel
      </button>
    </div>
  );
}