"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import { useDatafeed } from "@/app/lib/datafeed-context";


interface ChartProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}



export default function Chart({ selectedSymbol, onSymbolChange }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });


  const { tickerData, connected } = useDatafeed();


  const [dropdownOpen, setDropdownOpen] = useState(false);

  
  const symbols = Object.keys(tickerData);

  

  // Candle aggregation
  const CANDLE_TICKS = 5; // number of price updates per candle
  const candleBufferRef = useRef<number[]>([]);
  const candlesRef = useRef<{ time: number; open: number; high: number; low: number; close: number }[]>([]);
  const lastCandleTimeRef = useRef<number>(0);


useEffect(() => {
  if (!selectedSymbol && symbols.length > 0 && onSymbolChange) {  
    onSymbolChange(symbols[0]);
  }
}, [selectedSymbol, symbols, onSymbolChange]);

 const getPrice = (sym: string): number | null => {
    const tick = tickerData[sym];
    if (tick && tick.price > 0) {
      return tick.price;
    }
    return null;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
        // If chart exists, update its size
        if (chartRef.current) {
          chartRef.current.applyOptions({ width, height });
        }
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Create chart when container size is known
  useEffect(() => {
    if (!containerRef.current || containerSize.width === 0) return;
    if (chartRef.current) {
      chartRef.current.applyOptions(containerSize);
      return;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0a" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      width: containerSize.width,
      height: containerSize.height || 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#066bcc",
      downColor: "#d83b2a",
      borderVisible: true,
      wickUpColor: "#066bcc",
      wickDownColor: "#d83b2a",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
    chart.remove();
    chartRef.current = null;
    seriesRef.current = null;
  };

  }, [containerSize]);

  // --------------------------------------------
  // Data Update Loop
  // --------------------------------------------
  useEffect(() => {
    if (!seriesRef.current) return;
    if (!selectedSymbol) return;

    const series = seriesRef.current;
    const now = Date.now();

    // Get current price
    const price = getPrice(selectedSymbol);
    if (price === null) return;

    // Push to buffer
    candleBufferRef.current.push(price);

    // When buffer reaches threshold, form a candle
    if (candleBufferRef.current.length >= CANDLE_TICKS) {
      const prices = candleBufferRef.current;
      const open = prices[0];
      const close = prices[prices.length - 1];
      const high = Math.max(...prices);
      const low = Math.min(...prices);

      // Use current time (rounded to nearest second) as candle time
      const time = Math.floor(now / 1000);
      // Ensure we don't have duplicate timestamps (if updates are faster than 1s)
      if (time !== lastCandleTimeRef.current) {
        candlesRef.current.push({ time, open, high, low, close });
        lastCandleTimeRef.current = time;

        // Keep only last 200 candles
        if (candlesRef.current.length > 200) {
          candlesRef.current = candlesRef.current.slice(-200);
        }

        // Update chart
        series.setData(candlesRef.current);
        // Auto-fit time scale if chart is not zoomed
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      }

      // Reset buffer for next candle
      candleBufferRef.current = [];
    }

    // If no data yet, add a placeholder candle? Not needed.
  }, [tickerData, selectedSymbol, connected]); // Re-run when data changes

  // --------------------------------------------
  // Reset data on symbol change
  // --------------------------------------------
  useEffect(() => {
    candleBufferRef.current = [];
    candlesRef.current = [];
    lastCandleTimeRef.current = 0;
    if (seriesRef.current) {
      seriesRef.current.setData([]);
    }
  }, [selectedSymbol]);

  // --------------------------------------------
  // Symbol Dropdown
  // --------------------------------------------
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);
  const selectSymbol = (sym: string) => {
    onSymbolChange(sym);
    setDropdownOpen(false);
  };

  return (
    <div className="h-[600px] w-full flex flex-col">
      {/* Symbol Selector */}
      <div className="absolute p-2 z-10">
        <button
          onClick={toggleDropdown}
          className="px-3 py-1 border border-gray-700 bg-gray-800 text-sm text-gray-200"
        >
          {selectedSymbol || "Select Symbol"}
        </button>
        {dropdownOpen && (
          <div className="absolute top-10 left-0 bg-gray-900 border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto w-36">
            {symbols.map((sym) => (
              <button
                key={sym}
                className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-700 text-gray-300"
                onClick={() => selectSymbol(sym)}
              >
                {sym}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="h-[600px] w-full" />
    </div>
  );
}