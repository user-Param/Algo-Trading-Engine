"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { useEngine } from "@/app/lib/engine-context";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
interface RiskMetrics {
  totalOrders: number;
  rejected: number;
  passed: number;
  totalWins: number;
  totalLoss: number;
  winRate: number;       // 0–100
  riskReward: number;    // e.g. 1.5
  profitFactor: number;  // e.g. 1.2
}

// ------------------------------------------------------------
// Helper: generate random walk equity
// ------------------------------------------------------------
function generateEquityData(
  points: number,
  startBalance: number = 100,
  volatility: number = 0.1
): { balance: number; drawdown: number; profitLimit: number }[] {
  const data: { balance: number; drawdown: number; profitLimit: number }[] = [];
  let balance = startBalance;
  const maxBalance = startBalance * 1.2;   // arbitrary profit limit
  const minBalance = startBalance * 0.85;  // arbitrary drawdown limit

  for (let i = 0; i < points; i++) {
    // random walk with drift
    const change = (Math.random() - 0.48) * volatility * balance;
    balance = Math.max(minBalance, Math.min(maxBalance, balance + change));

    // current drawdown (relative to start)
    const drawdown = ((startBalance - balance) / startBalance) * 100;
    // profit limit (relative to start)
    const profitLimit = ((balance - startBalance) / startBalance) * 100;

    data.push({
      balance,
      drawdown: Math.max(0, drawdown),
      profitLimit: Math.max(0, profitLimit),
    });
  }
  return data;
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function RiskMonitor() {
  // We'll later use the real engine, but for now just a placeholder
  // const engine = useEngine();

  // --- Metrics state (dummy) ---
  const [metrics, setMetrics] = useState<RiskMetrics>({
    totalOrders: 0,
    rejected: 0,
    passed: 0,
    totalWins: 0,
    totalLoss: 0,
    winRate: 0,
    riskReward: 0,
    profitFactor: 0,
  });

  // --- Chart ref and data ---
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [equityData, setEquityData] = useState<
    { balance: number; drawdown: number; profitLimit: number }[]
  >([]);

  // --- Update metrics and equity data every 2 seconds ---
  useEffect(() => {
    const updateData = () => {
      // 1. Generate random metrics
      const totalOrders = Math.floor(Math.random() * 200 + 50);
      const rejected = Math.floor(Math.random() * totalOrders * 0.2);
      const passed = totalOrders - rejected;
      const totalWins = Math.floor(Math.random() * passed * 0.6 + passed * 0.1);
      const totalLoss = passed - totalWins;
      const winRate = passed > 0 ? (totalWins / passed) * 100 : 0;
      const riskReward = parseFloat((Math.random() * 2 + 0.5).toFixed(2));
      const profitFactor = parseFloat((Math.random() * 2 + 0.2).toFixed(2));

      setMetrics({
        totalOrders,
        rejected,
        passed,
        totalWins,
        totalLoss,
        winRate,
        riskReward,
        profitFactor,
      });

      // 2. Generate a new equity curve (50 points)
      const newData = generateEquityData(50, 10000, 0.02);
      setEquityData(newData);
    };

    // Initial update
    updateData();

    // Update every 2 seconds
    const interval = setInterval(updateData, 2000);
    return () => clearInterval(interval);
  }, []);

  // --- Initialize and update chart ---
  useEffect(() => {
    if (!chartRef.current) return;

    // Create chart instance
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, "dark");
    }

    const chart = chartInstance.current;

    // Resize handler
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  // --- Update chart when data changes ---
  useEffect(() => {
    if (!chartInstance.current || equityData.length === 0) return;

    const chart = chartInstance.current;

    const dates = equityData.map((_, i) => `T${i + 1}`);
    const balances = equityData.map((d) => d.balance);
    const drawdowns = equityData.map((d) => d.drawdown);
    const profitLimits = equityData.map((d) => d.profitLimit);

    // Calculate max drawdown and max profit (as numbers for horizontal lines)
    const maxDrawdown = Math.max(...drawdowns);
    const maxProfit = Math.max(...profitLimits);
    const currentBalance = balances[balances.length - 1];
    const startBalance = 10000;

    // For horizontal lines we use markLine on the balance series
    // The lines show the limits relative to the balance axis.
    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const p = params[0];
          const idx = p.dataIndex;
          const dataPoint = equityData[idx];
          return `
            <b>Time ${idx + 1}</b><br/>
            Balance: $${dataPoint.balance.toFixed(2)}<br/>
            Drawdown: ${dataPoint.drawdown.toFixed(2)}%<br/>
            Profit: ${dataPoint.profitLimit.toFixed(2)}%
          `;
        },
      },
      grid: { left: "5%", right: "5%", top: "10%", bottom: "10%" },
      xAxis: {
        type: "category",
        data: dates,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 9, color: "#888" },
      },
      yAxis: {
        type: "value",
        name: "Balance ($)",
        nameTextStyle: { fontSize: 10, color: "#888" },
        axisLabel: { fontSize: 10, formatter: "${value}" },
        splitLine: { lineStyle: { color: "#333", type: "dashed" } },
      },
      series: [
        {
          name: "Equity",
          type: "line",
          data: balances,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#f9f6f6", width: 2 },
          areaStyle: { color: "rgba(34, 34, 34, 0.15)" },
          markLine: {
            silent: true,
            symbol: "none",
            label: {
              show: true,
              formatter: (params: any) => {
                if (params.value === startBalance) return "Start: $" + startBalance;
                if (params.value === maxProfit) return "Max Profit: +" + ((maxProfit - startBalance) / startBalance * 100).toFixed(1) + "%";
                if (params.value === maxDrawdown) return "Max Drawdown: -" + ((startBalance - maxDrawdown) / startBalance * 100).toFixed(1) + "%";
                return "";
              },
              position: "end",
              fontSize: 10,
              color: "#facc15",
            },
            lineStyle: {
              color: "#facc15",
              type: "dashed",
              width: 1,
            },
            data: [
              { yAxis: startBalance, name: "Start" },
              { yAxis: maxProfit, name: "Max Profit" },
              { yAxis: startBalance - maxDrawdown, name: "Max Drawdown" },
            ],
          },
        },
      ],
    };

    chart.setOption(option, true);
    chart.resize();
  }, [equityData]);

  // --- Render metrics cards ---
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
      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        <MetricCard label="Total Orders" value={metrics.totalOrders} />
        <MetricCard label="Rejected" value={metrics.rejected} />
        <MetricCard label="Passed" value={metrics.passed}  />
        <MetricCard label="Total Wins" value={metrics.totalWins}  />
        <MetricCard label="Total Loss" value={metrics.totalLoss}  />
        <MetricCard label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`}  />
        <MetricCard label="R:R" value={metrics.riskReward}  />
        <MetricCard label="Profit Factor" value={metrics.profitFactor}  />
      </div>

      {/* Equity Curve Chart */}
      <div className="flex-1 min-h-[full]">
        <div ref={chartRef} className="w-full h-full" style={{ minHeight: "200px" }} />
      </div>
    </div>
  );
}