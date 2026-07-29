"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";

// Configuration - Update these to match your engine
const HOST = "localhost:8080"; // Your engine host:port
const BASE_URL = `http://${HOST}`;
const WS_URL = `ws://${HOST}/engine`; // Your engine WebSocket endpoint

// --- Type Definitions (matching your engine's data structures) ---

export interface LatencyStats {
  average: number;
  maximum: number;
  minimum: number;
  p50: number;
  p95: number;
  p99: number;
  sample_count: number;
}

export interface PerformanceData {
  [category: string]: LatencyStats;
}

export interface ThroughputData {
  messages_per_sec: number;
  packets_per_sec: number;
  signals_per_sec: number;  // Changed from signal_per_sec
  bytes_per_sec: number;
  broadcasts_per_sec: number;
  subscriptions_per_sec: number;
  ticks_per_sec: number;    // Added for market data
  trades_per_sec: number;   // Added for trade execution
  cumulative: {
    total_messages: number;
    total_signals: number;
    total_trades: number;
    total_packets: number;
    total_bytes: number;
    total_broadcasts: number;
    total_subscriptions: number;
    total_ticks: number;     // Added
  };
  database_reads_per_sec: number;
  database_writes_per_sec: number;
}

export interface HealthData {
  db: string;
  algo_instances: number;   // Changed from feed_instances
  status: string;
  engine_uptime: number;    // Added
}

export interface EngineHealthData {
  health_score: number;
  status: number;
  stale_engine: boolean;
  corrupted_packets: number;
  duplicate_packets: number;
  invalid_messages: number;
  missing_ticks: number;
  out_of_order_packets: number;
  packet_drops: number;
  parse_failures: number;
  sequence_gaps: number;
}

export interface ConfigData {
  version: string;
  adapter_version: string;
  deployment_id: string;
  schema_version: number;
  runtime?: Record<string, string>;
  engine_mode: "live" | "backtest";  // Added
}

export interface AnalyticsData {
  average_latency: number;
  worst_latency: number;
  peak_throughput: number;
  average_throughput: number;
  peak_cpu: number;
  average_cpu: number;
  peak_memory: number;
  average_memory: number;
  most_active_algo: string;
  engine_uptime_seconds: number;
  health_score: number;
  total_algorithms: number;      // Added
  active_algorithms: number;     // Added
  database_performance: {
    insert_latency_ms: number;
    query_latency_ms: number;
    reads_per_sec: number;
    writes_per_sec: number;
  };
}

export interface DatabaseData {
  active_connections: number;
  connection_failures: number;
  failed_writes: number;
  insert_latency_ms: number;
  query_latency_ms: number;
  queue_waiting: number;
  reads_per_sec: number;
  successful_writes: number;
  transaction_count: number;
  writes_per_sec: number;
}

export interface SessionData {
  active_sessions: number;
  active_clients: number;
  active_subscriptions: number;
  authentication_failures: number;
  avg_session_duration_ms: number;
  longest_session_duration_ms: number;
  reconnect_count: number;
  total_connections: number;
  total_disconnections: number;
}

export interface AlertItem {
  id?: string;
  message: string;
  severity: "info" | "warning" | "critical";
  timestamp?: string;
  source?: string;  // Added for algorithm/engine source
}

export interface AuditEvent {
  id?: string;
  timestamp?: string;
  action: string;
  actor: string;
  target: string;
  result: string;
}

export interface AlgoInstance {
  id: string;
  name: string;
  type: string;
  status: "running" | "stopped" | "sleeping";
  enabled: boolean;
  signals_generated: number;
  trades_executed: number;
  win_rate: number;
  profit_loss: number;
}

export interface TradeData {
  id: number;
  algo_id: number;
  symbol: string;
  side: "buy" | "sell";
  price: number;
  quantity: number;
  leverage: number;
  status: "open" | "closed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface RiskMetrics {
  max_quantity: number;
  max_leverage: number;
  total_exposure: number;
  daily_pnl: number;
  weekly_pnl: number;
  monthly_pnl: number;
  open_positions: number;
}

export interface EngineMetrics {
  mode: "live" | "backtest";
  total_signals: number;
  accepted_signals: number;
  rejected_signals: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
}

export interface BacktestStatus {
  is_running: boolean;
  current_symbol: string;
  progress: number;  // 0-100
  start_capital: number;
  current_capital: number;
}

// --- Main Engine State Interface ---

interface EngineState {
  performance: PerformanceData | Record<string, never>;
  throughput: ThroughputData;
  health: HealthData;
  engineHealth: EngineHealthData;
  config: ConfigData;
  analytics: AnalyticsData;
  database: DatabaseData;
  session: SessionData;
  alerts: AlertItem[];
  audit: AuditEvent[];
  algorithms: AlgoInstance[];
  trades: TradeData[];
  riskMetrics: RiskMetrics;
  engineMetrics: EngineMetrics;
  backtestStatus: BacktestStatus;
  tickerData: Record<string, { symbol: string; price: number; bid: number; ask: number; timestamp: number }>;
  connected: boolean;
  lastUpdate: number;
}

interface EngineContextValue extends EngineState {
  refresh: () => void;
  startEngine: () => Promise<boolean>;
  stopEngine: () => Promise<boolean>;
  startBacktest: (symbol: string, capital: number) => Promise<boolean>;
  stopBacktest: () => Promise<boolean>;
  registerAlgo: (algo: { name: string; type: string }) => Promise<boolean>;
  startAlgo: (algoId: string) => Promise<boolean>;
  stopAlgo: (algoId: string) => Promise<boolean>;
}

// --- Default State ---

const defaultState: EngineState = {
  performance: {},
  throughput: {
    messages_per_sec: 0,
    packets_per_sec: 0,
    signals_per_sec: 0,
    bytes_per_sec: 0,
    broadcasts_per_sec: 0,
    subscriptions_per_sec: 0,
    ticks_per_sec: 0,
    trades_per_sec: 0,
    cumulative: {
      total_messages: 0,
      total_signals: 0,
      total_trades: 0,
      total_packets: 0,
      total_bytes: 0,
      total_broadcasts: 0,
      total_subscriptions: 0,
      total_ticks: 0,
    },
    database_reads_per_sec: 0,
    database_writes_per_sec: 0,
  },
  health: {
    db: "unknown",
    algo_instances: 0,
    status: "unknown",
    engine_uptime: 0,
  },
  engineHealth: {
    health_score: 0,
    status: 0,
    stale_engine: false,
    corrupted_packets: 0,
    duplicate_packets: 0,
    invalid_messages: 0,
    missing_ticks: 0,
    out_of_order_packets: 0,
    packet_drops: 0,
    parse_failures: 0,
    sequence_gaps: 0,
  },
  config: {
    version: "unknown",
    adapter_version: "unknown",
    deployment_id: "unknown",
    schema_version: 0,
    engine_mode: "live",
  },
  analytics: {
    average_latency: 0,
    worst_latency: 0,
    peak_throughput: 0,
    average_throughput: 0,
    peak_cpu: 0,
    average_cpu: 0,
    peak_memory: 0,
    average_memory: 0,
    most_active_algo: "unknown",
    engine_uptime_seconds: 0,
    health_score: 0,
    total_algorithms: 0,
    active_algorithms: 0,
    database_performance: {
      insert_latency_ms: 0,
      query_latency_ms: 0,
      reads_per_sec: 0,
      writes_per_sec: 0,
    },
  },
  database: {
    active_connections: 0,
    connection_failures: 0,
    failed_writes: 0,
    insert_latency_ms: 0,
    query_latency_ms: 0,
    queue_waiting: 0,
    reads_per_sec: 0,
    successful_writes: 0,
    transaction_count: 0,
    writes_per_sec: 0,
  },
  session: {
    active_sessions: 0,
    active_clients: 0,
    active_subscriptions: 0,
    authentication_failures: 0,
    avg_session_duration_ms: 0,
    longest_session_duration_ms: 0,
    reconnect_count: 0,
    total_connections: 0,
    total_disconnections: 0,
  },
  alerts: [],
  audit: [],
  algorithms: [],
  trades: [],
  riskMetrics: {
    max_quantity: 100000,
    max_leverage: 100,
    total_exposure: 0,
    daily_pnl: 0,
    weekly_pnl: 0,
    monthly_pnl: 0,
    open_positions: 0,
  },
  engineMetrics: {
    mode: "live",
    total_signals: 0,
    accepted_signals: 0,
    rejected_signals: 0,
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0,
    win_rate: 0,
    total_pnl: 0,
  },
  backtestStatus: {
    is_running: false,
    current_symbol: "",
    progress: 0,
    start_capital: 0,
    current_capital: 0,
  },
  tickerData: {},
  connected: false,
  lastUpdate: 0,
};

// --- Context Creation ---

const EngineContext = createContext<EngineContextValue>({
  ...defaultState,
  refresh: () => {},
  startEngine: async () => false,
  stopEngine: async () => false,
  startBacktest: async () => false,
  stopBacktest: async () => false,
  registerAlgo: async () => false,
  startAlgo: async () => false,
  stopAlgo: async () => false,
});

export function useEngine() {
  return useContext(EngineContext);
}

// --- Helper Functions ---

async function fetchJSON<T = unknown>(url: string, label: string): Promise<T | null> {
  try {
    console.log(`[Engine] REST fetch: ${label} -> ${url}`);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[Engine] REST fetch failed: ${label} -> ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`[Engine] REST fetch error: ${label} -> ${url}`, error);
    return null;
  }
}

async function postJSON<T = unknown>(url: string, data?: any): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// --- Provider Component ---

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EngineState>(defaultState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = useCallback((partial: Partial<EngineState>) => {
    setState((prev) => {
      const newState = { ...prev, lastUpdate: Date.now() };
      Object.keys(partial).forEach((key) => {
        const value = partial[key as keyof EngineState];
        if (value !== null && value !== undefined) {
          (newState as any)[key] = value;
        }
      });
      return newState;
    });
  }, []);

  // --- REST API Methods ---

  const startEngine = useCallback(async (): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/engine/start`);
    if (result) {
      await fetchAll();
      return true;
    }
    return false;
  }, []);

  const stopEngine = useCallback(async (): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/engine/stop`);
    if (result) {
      await fetchAll();
      return true;
    }
    return false;
  }, []);

  const startBacktest = useCallback(async (symbol: string, capital: number): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/backtest/start`, { symbol, capital });
    if (result) {
      await fetchAll();
      return true;
    }
    return false;
  }, []);

  const stopBacktest = useCallback(async (): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/backtest/stop`);
    if (result) {
      await fetchAll();
      return true;
    }
    return false;
  }, []);

  const registerAlgo = useCallback(async (algo: { name: string; type: string }): Promise<boolean> => {
    // This would require a new API endpoint to register algorithms
    // For now, we'll just log it
    console.log("[Engine] Register algorithm:", algo);
    return true;
  }, []);

  const startAlgo = useCallback(async (algoId: string): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/algos/start`, { algoId });
    if (result) {
      await fetchAll();
      return true;
    }
    return false;
  }, []);

  const stopAlgo = useCallback(async (algoId: string): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/algos/stop`, { algoId });
    if (result) {
      await fetchAll();
      return true;
    }
    return false;
  }, []);

  // --- Data Fetching ---

  const fetchAll = useCallback(async () => {
    console.log("[Engine] Starting full REST poll...");

    const [
      status,
      algos,
      backtestStatus,
      engineMetrics,
      riskMetrics,
    ] = await Promise.all([
      fetchJSON<{ running: boolean }>(`${BASE_URL}/api/engine/status`, "status"),
      fetchJSON<AlgoInstance[]>(`${BASE_URL}/api/algos/list`, "algos"),
      fetchJSON<BacktestStatus>(`${BASE_URL}/api/backtest/status`, "backtest"),
      fetchJSON<EngineMetrics>(`${BASE_URL}/api/engine/metrics`, "metrics"),
      fetchJSON<RiskMetrics>(`${BASE_URL}/api/risk/metrics`, "risk"),
    ]);

    // Update state with fetched data
    update({
      health: {
        ...state.health,
        status: status?.running ? "running" : "stopped",
        algo_instances: algos?.length || 0,
      },
      algorithms: algos || [],
      backtestStatus: backtestStatus || defaultState.backtestStatus,
      engineMetrics: engineMetrics || defaultState.engineMetrics,
      riskMetrics: riskMetrics || defaultState.riskMetrics,
      connected: true,
    });

    console.log("[Engine] REST poll completed.");
  }, [update, state.health]);

  const refresh = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  // --- WebSocket Setup ---

  useEffect(() => {
    console.log("[Engine] Provider mounted, initializing...");

    fetchAll();
    pollTimer.current = setInterval(fetchAll, 2000);

    function connectWs() {
      console.log(`[Engine] WebSocket connecting to ${WS_URL}...`);

      try {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log("[Engine] WebSocket connected.");
          // Subscribe to engine data topics
          const topics = [
            "status",
            "ticker",
            "performance",
            "throughput",
            "algorithms",
            "trades",
            "risk",
            "health",
          ];
          topics.forEach((topic) => {
            ws.send(JSON.stringify({ type: "subscribe", topic }));
            console.log(`[Engine] WS sent subscription: ${topic}`);
          });
        };

        ws.onmessage = (event: MessageEvent) => {
          try {
            const msg = JSON.parse(event.data);
            console.log("[Engine] WS message:", msg);

            // Handle ticker data
            if (msg.type === "ticker" || msg.topic === "ticker") {
              const data = msg.data || msg;
              if (data.symbol && data.price) {
                setState((prev) => ({
                  ...prev,
                  tickerData: {
                    ...prev.tickerData,
                    [data.symbol]: {
                      symbol: data.symbol,
                      price: data.price,
                      bid: data.bid || data.price,
                      ask: data.ask || data.price,
                      timestamp: Date.now(),
                    },
                  },
                  lastUpdate: Date.now(),
                }));
              }
              return;
            }

            // Handle engine status updates
            if (msg.type === "status" || msg.topic === "status") {
              update({
                health: {
                  ...state.health,
                  status: msg.data?.status || msg.status || "unknown",
                },
                engineMetrics: msg.data?.metrics || state.engineMetrics,
              });
              return;
            }

            // Handle algorithm updates
            if (msg.type === "algorithms" || msg.topic === "algorithms") {
              update({ algorithms: msg.data || [] });
              return;
            }

            // Handle trade updates
            if (msg.type === "trade" || msg.topic === "trades") {
              const trades = Array.isArray(msg.data) ? msg.data : [msg.data];
              setState((prev) => ({
                ...prev,
                trades: [...trades, ...prev.trades].slice(0, 100), // Keep last 100 trades
                lastUpdate: Date.now(),
              }));
              return;
            }

            // Handle performance metrics
            if (msg.type === "performance" || msg.topic === "performance") {
              update({ performance: msg.data || {} });
              return;
            }

            // Handle throughput metrics
            if (msg.type === "throughput" || msg.topic === "throughput") {
              update({ throughput: msg.data || defaultState.throughput });
              return;
            }

            // Handle alerts
            if (msg.type === "alert" || msg.topic === "alerts") {
              setState((prev) => ({
                ...prev,
                alerts: [msg.data, ...prev.alerts].slice(0, 50),
                lastUpdate: Date.now(),
              }));
              return;
            }

          } catch (err) {
            console.error("[Engine] Error parsing WebSocket message:", err);
          }
        };

        ws.onclose = () => {
          console.warn("[Engine] WebSocket closed. Reconnecting in 5s...");
          wsRef.current = null;
          reconnectTimer.current = setTimeout(connectWs, 5000);
        };

        ws.onerror = (err) => {
          console.error("[Engine] WebSocket error:", err);
          ws.close();
        };

        wsRef.current = ws;
      } catch (err) {
        console.error("[Engine] WebSocket connection error:", err);
        reconnectTimer.current = setTimeout(connectWs, 5000);
      }
    }

    connectWs();

    return () => {
      console.log("[Engine] Provider unmounting, cleaning up...");
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [fetchAll, update, state.health, state.engineMetrics]);

  // --- Context Value ---

  const contextValue: EngineContextValue = {
    ...state,
    refresh,
    startEngine,
    stopEngine,
    startBacktest,
    stopBacktest,
    registerAlgo,
    startAlgo,
    stopAlgo,
  };

  return (
    <EngineContext.Provider value={contextValue}>
      {children}
    </EngineContext.Provider>
  );
}