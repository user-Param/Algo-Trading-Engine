"use client";

import { useEngine } from "@/app/lib/engine-context";
import { useDatafeed } from "@/app/lib/datafeed-context";
import { useState, useMemo } from "react";
import Image from "next/image";

// Helper functions
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 2 }).format(value / 100);

export default function Profile() {
  const { positions, trades, engineMetrics, riskMetrics, backtestStatus } = useEngine();
  const { tickerData } = useDatafeed();

  // Mock user info – replace with real auth later
  const user = {
    username: "QuantTrader",
    joinDate: "2024-01-15",
    avatar: "/avatar-placeholder.png", // you can add an SVG or use initials
  };

  // Compute stats from trades
  const stats = useMemo(() => {
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => t.pnl && t.pnl > 0).length;
    const losingTrades = totalTrades - winningTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Sum P&L from trades (if available) – fallback to engineMetrics
    let totalPnL = engineMetrics.total_pnl || 0;
    // If trades have pnl field, sum them
    const tradePnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    if (tradePnL !== 0) totalPnL = tradePnL;

    // Average win/loss
    const avgWin = winningTrades > 0 ? trades.filter(t => t.pnl && t.pnl > 0).reduce((s, t) => s + t.pnl!, 0) / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? trades.filter(t => t.pnl && t.pnl < 0).reduce((s, t) => s + t.pnl!, 0) / losingTrades : 0;

    // Profit factor
    const grossProfit = trades.filter(t => t.pnl && t.pnl > 0).reduce((s, t) => s + t.pnl!, 0);
    const grossLoss = trades.filter(t => t.pnl && t.pnl < 0).reduce((s, t) => s + Math.abs(t.pnl!), 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPnL,
      avgWin,
      avgLoss,
      profitFactor,
    };
  }, [trades, engineMetrics]);

  // Portfolio allocation by symbol (sum of absolute notional value)
  const allocation = useMemo(() => {
    const map = new Map<string, number>();
    positions.forEach((pos) => {
      const value = Math.abs(pos.quantity * pos.avg_price);
      map.set(pos.symbol, (map.get(pos.symbol) || 0) + value);
    });
    return Array.from(map.entries()).map(([symbol, value]) => ({ symbol, value }));
  }, [positions]);

  // Total equity = balance + unrealized PnL
  const totalPositionPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
  // Use backtest start capital as initial balance, or a default
  const initialBalance = backtestStatus.start_capital || 10000;
  const balance = initialBalance + stats.totalPnL; // realised PnL
  const equity = balance + totalPositionPnL;

  // Risk metrics
  const exposure = positions.reduce((sum, p) => sum + Math.abs(p.quantity * p.current_price), 0);
  const openPositions = positions.length;

  // Simple drawdown (mock – we don't have historical equity, but we can show current drawdown from peak)
  // We'll just show 0 for now

  return (
    <div className="p-6 bg-[#0a0a0a] text-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header: User Info */}
        <div className="flex items-center gap-6 bg-[#101010] p-6 rounded-xl border border-gray-800">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-3xl font-bold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.username}</h1>
            <p className="text-gray-400 text-sm">Member since {user.joinDate}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm text-gray-400">Equity</div>
            <div className="text-2xl font-mono font-bold">{formatCurrency(equity)}</div>
            <div className={`text-sm ${totalPositionPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPositionPnL >= 0 ? '+' : ''}{formatCurrency(totalPositionPnL)} today
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Trades" value={stats.totalTrades} />
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
          <StatCard label="Total P&L" value={formatCurrency(stats.totalPnL)} color={stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'} />
          <StatCard label="Profit Factor" value={stats.profitFactor.toFixed(2)} />
          <StatCard label="Avg Win" value={formatCurrency(stats.avgWin)} />
          <StatCard label="Avg Loss" value={formatCurrency(Math.abs(stats.avgLoss))} />
          <StatCard label="Open Positions" value={openPositions} />
          <StatCard label="Exposure" value={formatCurrency(exposure)} />
        </div>

        {/* Two-column layout: Positions + Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Positions Table */}
          <div className="bg-[#101010] p-4 rounded-xl border border-gray-800">
            <h2 className="text-lg font-semibold mb-3">Open Positions</h2>
            {positions.length === 0 ? (
              <p className="text-gray-400 text-sm">No open positions</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2">Symbol</th>
                      <th className="text-right py-2">Size</th>
                      <th className="text-right py-2">Avg Price</th>
                      <th className="text-right py-2">Current</th>
                      <th className="text-right py-2">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => (
                      <tr key={pos.symbol} className="border-b border-gray-800">
                        <td className="py-2 font-medium">{pos.symbol}</td>
                        <td className="text-right">{pos.quantity.toFixed(4)}</td>
                        <td className="text-right">{formatCurrency(pos.avg_price)}</td>
                        <td className="text-right">{formatCurrency(pos.current_price)}</td>
                        <td className={`text-right font-mono ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(pos.pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Portfolio Allocation */}
          <div className="bg-[#101010] p-4 rounded-xl border border-gray-800">
            <h2 className="text-lg font-semibold mb-3">Portfolio Allocation</h2>
            {allocation.length === 0 ? (
              <p className="text-gray-400 text-sm">No positions to allocate</p>
            ) : (
              <div className="space-y-2">
                {allocation.map(({ symbol, value }) => {
                  const totalValue = allocation.reduce((s, a) => s + a.value, 0);
                  const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
                  return (
                    <div key={symbol}>
                      <div className="flex justify-between text-sm">
                        <span>{symbol}</span>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-[#101010] p-4 rounded-xl border border-gray-800">
          <h2 className="text-lg font-semibold mb-3">Recent Trades</h2>
          {trades.length === 0 ? (
            <p className="text-gray-400 text-sm">No trades yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-left py-2">Side</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Quantity</th>
                    <th className="text-right py-2">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 20).map((trade) => (
                    <tr key={trade.id} className="border-b border-gray-800">
                      <td className="py-2 text-gray-400">
                        {trade.created_at ? new Date(trade.created_at).toLocaleTimeString() : '-'}
                      </td>
                      <td className="py-2">{trade.symbol}</td>
                      <td className={`py-2 ${trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.side.toUpperCase()}
                      </td>
                      <td className="text-right">{formatCurrency(trade.price)}</td>
                      <td className="text-right">{trade.quantity.toFixed(4)}</td>
                      <td className="text-right font-mono">
                        {trade.pnl !== undefined ? formatCurrency(trade.pnl) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Risk Monitor (simple) */}
        <div className="bg-[#101010] p-4 rounded-xl border border-gray-800">
          <h2 className="text-lg font-semibold mb-3">Risk Monitor</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <RiskMetric label="Total Exposure" value={formatCurrency(exposure)} />
            <RiskMetric label="Open Positions" value={openPositions} />
            <RiskMetric label="Max Leverage" value={`${riskMetrics.max_leverage || 100}x`} />
            <RiskMetric label="Daily P&L" value={formatCurrency(riskMetrics.daily_pnl || 0)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components
function StatCard({ label, value, color = "text-white" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-[#101010] p-4 rounded-xl border border-gray-800">
      <div className="text-sm text-gray-400">{label}</div>
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}

function RiskMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-lg font-mono font-bold">{value}</div>
    </div>
  );
}
