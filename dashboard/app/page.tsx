"use client";

import Navbar from "./component/navbar";
import Sidebar from "./component/sidebar";
import Ticker from "./component/ticker";
import { useState, useCallback } from 'react';
import { DatafeedProvider } from "./lib/datafeed-context";
import DashboardGrid from './component/dashboardgrid';
import Card from './cards/card';

// Import cards
import Chart from "./cards/charts/chart";
import Performance from "./cards/performance/performance";
import Latency from "./cards/latency/latency";
import Health from "./cards/health/health";
import Throughput from "./cards/throughput/throughput";
import Exchange from "./cards/exchange/exchange";
import Pipeline from "./cards/pipeline/pipeline";
import Pannel from "./cards/pannel/pannel";
import Network from "./cards/network/network";
import Database from "./cards/database/database";
import Event from "./cards/event/event";
import Insight from "./cards/insight/insight";
import Config from "./cards/config/config";
import Session from "./cards/session/session";
import AlgoManager from "./cards/algoManager";
import Backtest from "./cards/backtest";
import RiskMonitor from "./cards/riskMonitor";
import TradeHistory from "./cards/tradeHistory";

// Import view components
import Alpha from "./alpha/page";
import Terminal from "./cards/terminal";
import Lab from "./lab/page";
import Inventory from "./inventory/page";
import Help from "./history/page";
import Positions from "./cards/positions";

interface CardItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

type ViewMode = "alpha" | "terminal" | "lab" | "inventory" | "trade-history" | "help";

export default function Home() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>("alpha");

  const toggleSidebar = () => setSidebarExpanded((prev) => !prev);

  const [cards, setCards] = useState<CardItem[]>([
    { id: 'chart', title: 'Charts', content: <Chart /> },
    { id: 'health', title: 'Engine Health', content: <Health /> },
    { id: 'throughput', title: 'Throughput', content: <Throughput /> },
    { id: 'latency', title: 'Latency', content: <Latency /> },
    { id: 'performance', title: 'Performance', content: <Performance /> },
    { id: 'exchange', title: 'Exchange Orderbook', content: <Exchange /> },
    { id: 'algorithms', title: 'Algorithm Manager', content: <AlgoManager /> },
    { id: 'risk', title: 'Risk Monitor', content: <RiskMonitor /> },
    { id: 'backtest', title: 'Backtest Control', content: <Backtest /> },
    { id: 'positions', title: 'Positions', content: <Positions /> },
    { id: 'network', title: 'Network', content: <Network /> },
    { id: 'database', title: 'Database', content: <Database /> },
    { id: 'event', title: 'Event', content: <Event /> },
    { id: 'insight', title: 'Insight', content: <Insight /> },
    { id: 'config', title: 'Config', content: <Config /> },
    { id: 'session', title: 'Session', content: <Session /> },
    { id: 'terminal', title: 'Terminal', content: <Terminal /> },
    { id: 'history', title: 'Trade History', content: <TradeHistory /> },
  ]);

  const [minimized, setMinimized] = useState<Record<string, boolean>>({});
  const [refreshTriggers, setRefreshTriggers] = useState<Record<string, number>>({});

  const handleRemove = (id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
  };

  const handleToggleMinimize = (id: string) => {
    setMinimized((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRefresh = useCallback((id: string) => {
    setRefreshTriggers((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  }, []);

  // Render the appropriate view based on currentView
  const renderView = () => {
    switch (currentView) {
      case "alpha":
        return (
          <DashboardGrid>
            {cards.map((card) => (
              <Card
                key={card.id}
                id={card.id}
                title={card.title}
                onRemove={handleRemove}
                onToggleMinimize={handleToggleMinimize}
                onRefresh={handleRefresh}
                isMinimized={minimized[card.id] || false}
              >
                <div key={refreshTriggers[card.id] || 0}>
                  {card.content}
                </div>
              </Card>
            ))}
          </DashboardGrid>
        );
      
      case "terminal":
        return <Terminal />;
      
      case "lab":
        return <Lab />;
      
      case "inventory":
        return <Inventory />;
      
      case "trade-history":
        return <History />;
      
      case "help":
        return <Help />;
      
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <DatafeedProvider>
      <div className="h-screen flex flex-col bg-[#0a0a0a]">
        <Navbar currentView={currentView} onViewChange={setCurrentView} />
        
        <div className="flex-1 flex overflow-hidden">
          <div
            className={`transition-all duration-300 ${
              sidebarExpanded ? "w-56" : "w-12"
            } flex-shrink-0 bg-[#0a0a0a] border-r border-gray-800`}
          >
            <Sidebar expanded={sidebarExpanded} onToggle={toggleSidebar} />
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <Ticker />
            <div className="flex-1 overflow-auto p-4">
              {renderView()}
            </div>
          </div>
        </div>
      </div>
    </DatafeedProvider>
  );
}