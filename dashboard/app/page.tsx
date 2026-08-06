"use client";

import Navbar from "./component/navbar";
import Sidebar from "./component/sidebar";
import Ticker from "./component/ticker";
import { useState, useCallback, useEffect } from 'react';
import { DatafeedProvider } from "./lib/datafeed-context";
import { EngineProvider } from "./lib/engine-context";
import DashboardGrid from './component/dashboardgrid';
import Card from './cards/card';

// Import cards
import Chart from "./cards/charts/chart";
import Insight from "./cards/insight/insight";

import AlgoManager from "./cards/algoManager";

import RiskMonitor from "./cards/riskMonitor";
import TradeHistory from "./cards/tradeHistory";
import History from "./history/page";

// Import view components
import Alpha from "./alpha/page";
import Terminal from "./cards/terminal";
import Lab from "./lab/page";
import Inventory from "./inventory/page";
import Docs from "./docs/page";
import Positions from "./cards/positions";
import Orderbook from "./cards/exchange/orderbook";
import Market from "./market/page"
import Profile from "./profile/page"

interface CardItem {
  id: string;
  title: string;
}

type ViewMode = "terminal" | "alpha" | "market" | "lab" | "inventory" | "trade-history" | "docs" | "user";

export default function Home() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
    const saved = localStorage.getItem("currentView") as ViewMode;
    return saved || "terminal";
  }
  return "terminal";
});

useEffect(() => {
    localStorage.setItem("currentView", currentView);
}, [currentView]);




  const [selectedSymbol, setSelectedSymbol] = useState<string>("");

  const toggleSidebar = () => setSidebarExpanded((prev) => !prev);

  const CARD_DEFS: CardItem[] = [
    { id: 'chart', title: 'Charts' },
    { id: 'exchange', title: 'Orderbook' },
    { id: 'algorithms', title: 'Algorithm Manager' },
    { id: 'risk', title: 'Risk Monitor' },
    { id: 'positions', title: 'Positions' },
    { id: 'insight', title: 'Insight' },
    { id: 'terminal', title: 'Terminal' },
    { id: 'history', title: 'Trade History' },
  ];

  const renderCardContent = (id: string) => {
    switch (id) {
      case 'chart':
        return <Chart selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />;
      case 'exchange':
        return <Orderbook selectedSymbol={selectedSymbol} />;
      case 'algorithms':
        return <AlgoManager />;
      case 'risk':
        return <RiskMonitor />;
      case 'positions':
        return <Positions />;
      case 'insight':
        return <Insight />;
      case 'terminal':
        return <Terminal selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol}/>;
      case 'history':
        return <TradeHistory />;
      default:
        return null;
    }
  };

  const [cards, setCards] = useState<CardItem[]>(CARD_DEFS);

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
      case "terminal":
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
                  {renderCardContent(card.id)}
                </div>
              </Card>
            ))}
          </DashboardGrid>
        );
      
      case "alpha":
        return (
          <Alpha />
        );

      case "market":
        return <Market />;
      
      case "lab":
        return <Lab />;
      
      case "inventory":
        return <Inventory />;
      
      case "trade-history":
        return <History />;
      
      case "docs":
        return <Docs />;

      case "user":
        return <Profile />;
      
      default:
        return <div>View not found</div>;
    }
  };


  const hideSidebarAndTicker = currentView === "alpha" || currentView === "lab" || currentView === "inventory" || currentView === "trade-history" || currentView === "docs" || currentView === "user";

  return (
    <EngineProvider>
      <DatafeedProvider>
        <div className="h-screen flex flex-col bg-[#0a0a0a]">
          {/* Navbar always visible */}
          <Navbar currentView={currentView} onViewChange={setCurrentView} />

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar – hidden for alpha */}
            {!hideSidebarAndTicker && (
              <div
                className={`transition-all duration-300 ${
                  sidebarExpanded ? "w-56" : "w-12"
                } flex-shrink-0 bg-[#0a0a0a] border-r border-gray-800`}
              >
                <Sidebar expanded={sidebarExpanded} onToggle={toggleSidebar} />
              </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Ticker – hidden for alpha */}
              {!hideSidebarAndTicker && <Ticker />}
              <div className="flex-1 overflow-auto p-4">
                {renderView()}
              </div>
            </div>
          </div>
        </div>
      </DatafeedProvider>
    </EngineProvider>
  );
}