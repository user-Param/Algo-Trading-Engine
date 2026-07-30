"use client";

import * as echarts from "echarts";
import { useEffect, useRef, useState, useCallback } from "react";
import { useDatafeed } from "@/app/lib/datafeed-context";

// Generate a random walk price series for dummy data
function generateDummyPrice(prevPrice: number): number {
  const change = (Math.random() - 0.5) * 2; // change between -1 and +1
  let newPrice = prevPrice + change;
  // Keep price within reasonable range for BTC
  if (newPrice < 500) newPrice = 500 + Math.random() * 500;
  if (newPrice > 700) newPrice = 700 - Math.random() * 500;
  return Math.round(newPrice * 100) / 100;
}

// Dummy symbols to show when real data is absent
const DUMMY_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD"];

export default function Chart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const dataRef = useRef<number[][]>([]);
  const candleRef = useRef<{
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);
  const userZoomedRef = useRef(false);
  const [symbol, setSymbol] = useState<string>("");
  const { tickerData } = useDatafeed();

  // Get list of symbols: real ones if available, otherwise dummy ones
  const symbols = Object.keys(tickerData).length > 0 
    ? Object.keys(tickerData) 
    : DUMMY_SYMBOLS;

  // State to track the last price for dummy data (per symbol)
  const dummyPriceRef = useRef<Record<string, number>>({});

  // Initialize dummy prices for each symbol if not already set
  useEffect(() => {
    symbols.forEach((sym) => {
      if (!(sym in dummyPriceRef.current)) {
        // Start dummy price around 65000 for BTC, different for others
        let base = 65;
        if (sym.includes("ETH")) base = 30;
        else if (sym.includes("SOL")) base = 15;
        else if (sym.includes("XRP")) base = 0.5;
        dummyPriceRef.current[sym] = base + (Math.random() - 0.5) * 1000;
      }
    });
  }, [symbols]);

  // Set default symbol if not set
  useEffect(() => {
    if (!symbol && symbols.length > 0) {
      setSymbol(symbols[0]);
    }
  }, [symbol, symbols]);

  // Helper to get current price (real or dummy)
  const getPrice = useCallback((sym: string) => {
    // 1. Try real data
    const realTick = tickerData[sym];
    if (realTick && realTick.price > 0) {
      return realTick.price;
    }
    // 2. Fallback to dummy: generate random walk
    const last = dummyPriceRef.current[sym] || 65000;
    const newPrice = generateDummyPrice(last);
    dummyPriceRef.current[sym] = newPrice;
    return newPrice;
  }, [tickerData]);

  // Reset chart data when symbol changes
  useEffect(() => {
    dataRef.current = [];
    candleRef.current = null;
    userZoomedRef.current = false;
  }, [symbol]);

  // Main chart update
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, "dark");
    instanceRef.current = chart;

    const data = dataRef.current;

    chart.on("dataZoom", () => {
      userZoomedRef.current = true;
    });

    const windowSize = 80;

    const update = () => {
      // Get price (real or dummy)
      const price = getPrice(symbol);
      if (!price) return;

      // Build candlestick
      if (!candleRef.current) {
        candleRef.current = {
          open: price,
          high: price,
          low: price,
          close: price,
        };
      } else {
        candleRef.current.high = Math.max(candleRef.current.high, price);
        candleRef.current.low = Math.min(candleRef.current.low, price);
        candleRef.current.close = price;
      }

      // Push OHLC: [open, close, low, high] (ECharts order)
      data.push([
        candleRef.current.open,
        candleRef.current.close,
        candleRef.current.low,
        candleRef.current.high,
      ]);

      // Reset for next candle
      candleRef.current = {
        open: price,
        high: price,
        low: price,
        close: price,
      };

      const opt: any = {
        grid: { top: 8, bottom: 24, left: 8, right: 60 },
        xAxis: {
          type: "category",
          show: true,
          axisLine: { show: true },
          axisTick: { show: true },
          splitLine: { show: false },
          axisLabel: { fontSize: 10 },
        },
        yAxis: {
          type: "value",
          show: true,
          position: "right",
          splitLine: {
            show: true,
            lineStyle: { color: "#333", type: "dashed" },
          },
          axisLabel: { fontSize: 10, formatter: (v: any) => v.toFixed(2) },
        },
        series: [
          {
            type: "candlestick",
            data,
            animation: false,
            markLine: {
              silent: true,
              symbol: "none",
              lineStyle: { color: "#e0e0e0", width: 1 },
              label: {
                show: true,
                formatter: () => price.toFixed(2),
                position: "end",
                backgroundColor: "#e0e0e0",
                color: "#000",
                padding: [2, 6],
                borderRadius: 2,
                fontSize: 11,
              },
              data: [{ yAxis: price }],
            },
          },
        ],
      };

      if (!userZoomedRef.current) {
        const endVal = data.length - 1;
        const startVal = Math.max(0, endVal - windowSize + 1);
        opt.dataZoom = [
          {
            type: "inside",
            xAxisIndex: [0],
            startValue: startVal,
            endValue: endVal,
          },
          { type: "inside", yAxisIndex: [0] },
        ];
      }

      chart.setOption(opt);
    };

    // Run update immediately and then every second
    update();
    const interval = setInterval(update, 10000);

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [symbol, getPrice]);

  return (
    <div className="h-full w-full">
      <div className="relative p-2">
        <button
          onClick={() => setOpen(!open)}
          className="px-3 py-1 absolute z-1 rounded border border-gray-700"
        >
          {symbol || "Select Symbol"}
        </button>

        {open && (
          <div className="absolute top-10 left-0 bg-[#090909] border border-zinc-700 max-h-64 overflow-y-auto z-50 no-scrollbar">
            {symbols.map((s) => (
              <button
                key={s}
                className="block w-full text-left hover:bg-zinc-700 no-scrollbar"
                onClick={() => {
                  setSymbol(s);
                  dataRef.current = [];
                  candleRef.current = null;
                  setOpen(false);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={chartRef} className="h-[1000px] w-full" />
    </div>
  );
}