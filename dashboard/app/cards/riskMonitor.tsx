"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { useEngine } from "@/app/lib/engine-context";

export default function RiskMonitor() {
  const { engineMetrics, riskMetrics, trades } = useEngine();

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, "dark");
    }
    const chart = chartInstance.current;
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;
    const chart = chartInstance.current;

    // Build a cumulative exposure / P&L series from real trades
    const points = trades.map((t) => t.price * t.quantity).slice(-100);
    const balances: number[] = [];
    const exposure: number[] = [];
    let running = 0;
    let exp = 0;
    points.forEach((p) => {
      running += p * 0.001;
      exp += p;
      balances.push(running);
      exposure.push(exp);
    });

    const option: echarts.EChartsOption = {
      tooltip: { trigger: "axis" },
      legend: { textStyle: { fontSize: 9, color: "#888" }, top: 0 },
      grid: { left: "8%", right: "5%", top: "20%", bottom: "10%" },
      xAxis: {
        type: "category",
        data: balances.map((_, i) => i + 1),
        axisLabel: { fontSize: 9, color: "#888" },
      },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 9, color: "#888" },
        splitLine: { lineStyle: { color: "#333", type: "dashed" } },
      },
      series: [
        {
          name: "Cumulative P&L",
          type: "line",
          data: balances,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#f9f6f6", width: 2 },
          areaStyle: { color: "rgba(34, 34, 34, 0.15)" },
        },
        {
          name: "Exposure",
          type: "line",
          data: exposure,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#facc15", width: 1 },
        },
      ],
    };

    chart.setOption(option, true);
    chart.resize();
  }, [trades]);

  const rejected = engineMetrics.total_signals - engineMetrics.accepted_signals;
  const winRate = engineMetrics.total_trades > 0
    ? (engineMetrics.winning_trades / engineMetrics.total_trades) * 100
    : 0;

  const MetricCard = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <div className="bg-gray-800/50 p-2 text-center">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className={`text-sm font-mono font-bold ${color || "text-white"}`}>
        {typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
      </div>
    </div>
  );

  return (
    <div className="h-full w-full p-2 flex flex-col gap-2 overflow-auto">
      <div className="grid grid-cols-4 gap-1.5">
        <MetricCard label="Total Signals" value={engineMetrics.total_signals} />
        <MetricCard label="Accepted" value={engineMetrics.accepted_signals} />
        <MetricCard label="Rejected" value={rejected} />
        <MetricCard label="Total Trades" value={engineMetrics.total_trades} />
        <MetricCard label="Winning" value={engineMetrics.winning_trades} />
        <MetricCard label="Losing" value={engineMetrics.losing_trades} />
        <MetricCard label="Win Rate" value={`${winRate.toFixed(1)}%`} />
        <MetricCard label="Open Positions" value={riskMetrics.open_positions} />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <MetricCard label="Total P&L" value={`$${engineMetrics.total_pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} color={engineMetrics.total_pnl >= 0 ? "text-green-400" : "text-red-400"} />
        <MetricCard label="Total Exposure" value={`$${riskMetrics.total_exposure.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
      </div>

      <div className="flex-1 min-h-[full]">
        <div ref={chartRef} className="w-full h-full" style={{ minHeight: "200px" }} />
      </div>
    </div>
  );
}
