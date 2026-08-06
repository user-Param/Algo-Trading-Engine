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
  signals_per_sec: number;
  bytes_per_sec: number;
  broadcasts_per_sec: number;
  subscriptions_per_sec: number;
  ticks_per_sec: number;
  trades_per_sec: number;
  cumulative: {
    total_messages: number;
    total_signals: number;
    total_trades: number;
    total_packets: number;
    total_bytes: number;
    total_broadcasts: number;
    total_subscriptions: number;
    total_ticks: number;
  };
  database_reads_per_sec: number;
  database_writes_per_sec: number;
}

export interface HealthData {
  db: string;
  algo_instances: number;
  status: string;
  engine_uptime: number;
  feed?: boolean;
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
  engine_mode: "live" | "backtest";
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
  total_algorithms: number;
  active_algorithms: number;
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
  source?: string;
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
  algoId: string;
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
  progress: number; // 0-100
  start_capital: number;
  current_capital: number;
}

export interface PositionData {
  id: string;
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  unrealized_pnl_pct: number;
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
  positions: PositionData[];
  riskMetrics: RiskMetrics;
  engineMetrics: EngineMetrics;
  backtestStatus: BacktestStatus;
  tickerData: Record<string, { symbol: string; price: number; bid: number; ask: number; timestamp: number }>;
  connected: boolean; // REST reachability
  wsConnected: boolean; // WebSocket reachability
  lastUpdate: number;
}

interface EngineContextValue extends EngineState {
  refresh: () => void;
  connectFeed: () => Promise<boolean>;
  registerUser: (username: string) => Promise<boolean>;
  startEngine: () => Promise<boolean>;
  stopEngine: () => Promise<boolean>;
  startBacktest: (symbol: string, capital: number) => Promise<boolean>;
  stopBacktest: () => Promise<boolean>;
  registerAlgo: (algo: { name: string; type: string }) => Promise<boolean>;
  startAlgo: (algoId: string) => Promise<boolean>;
  stopAlgo: (algoId: string) => Promise<boolean>;
  /** Subscribes to a market-data symbol over the WS feed (backend text protocol: "subscribe <symbol>") */
  subscribeSymbol: (symbol: string) => void;
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
  positions: [],
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
  wsConnected: false,
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
  connectFeed: async () => false,
  registerUser: async () => false,
  subscribeSymbol: () => {},
});

export function useEngine() {
  return useContext(EngineContext);
}

// --- Helper Functions ---

async function fetchJSON<T = unknown>(url: string, label: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[Engine] REST fetch failed (${res.status}): ${label} -> ${url}`);
      return null;
    };
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
  } catch (error) {
    console.error(`[Engine] REST post error -> ${url}`, error);
    return null;
  }
}

// --- Provider Component ---
//
// Architecture note: the backend's /engine WebSocket is request/response
// only (plain text in, plain text out) — it does NOT push topic updates on
// its own. There is no server-side broadcast loop. So this provider treats
// REST polling as the single source of truth for all dashboard data (a
// CRUD/polling pattern), and only uses the WebSocket for the two things the
// backend actually supports there: a lightweight "status" ping/connectivity
// check and "subscribe <symbol>" for market-data feed symbols.

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EngineState>(defaultState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

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

  // --- REST API Methods (CRUD actions against the backend) ---

  const startEngine = useCallback(async (): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/engine/start`);
    if (result) {
      await fetchAllRef.current();
      return true;
    }
    return false;
  }, []);

  const stopEngine = useCallback(async (): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/engine/stop`);
    if (result) {
      await fetchAllRef.current();
      return true;
    }
    return false;
  }, []);

  const startBacktest = useCallback(async (symbol: string, capital: number): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/backtest/start`, { symbol, capital });
    if (result) {
      await fetchAllRef.current();
      return true;
    }
    return false;
  }, []);

  const stopBacktest = useCallback(async (): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/backtest/stop`);
    if (result) {
      await fetchAllRef.current();
      return true;
    }
    return false;
  }, []);

  const registerAlgo = useCallback(async (algo: { name: string; type: string; userId?: number }): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/algos/register`, {
      name: algo.name,
      type: algo.type,
      userId: algo.userId || 1,
    });
    if (result) {
      await fetchAllRef.current();
      return true;
    }
    return false;
  }, []);

  const connectFeed = useCallback(async (): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/feeds/connect`);
    if (result) {
      await fetchAllRef.current();
      return true;
    }
    return false;
  }, []);

  const registerUser = useCallback(async (username: string): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/users/register`, { username });
    if (result) {
      await fetchAllRef.current();
      return true;
    }
    return false;
  }, []);

  const startAlgo = useCallback(async (algoId: string): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/algos/start`, { algoId });
    if (result) {
      await fetchAllRef.current();
      return true;
    }
    return false;
  }, []);

  const stopAlgo = useCallback(async (algoId: string): Promise<boolean> => {
    const result = await postJSON(`${BASE_URL}/api/algos/stop`, { algoId });
    if (result) {
      await fetchAllRef.current();
      return true;
    }
    return false;
  }, []);

  // --- Data Fetching (single source of truth) ---

  const fetchAll = useCallback(async () => {
    const [
      status,
      algosRaw,
      backtestStatus,
      engineMetrics,
      riskMetrics,
      health,
      tradesRaw,
      positionsRaw,
    ] = await Promise.all([
      fetchJSON<{ status?: string; running: boolean }>(`${BASE_URL}/api/engine/status`, "status"),
      fetchJSON<{ status?: string; algos: AlgoInstance[] }>(`${BASE_URL}/api/algos/list`, "algos"),
      fetchJSON<{ status?: string; running: boolean; symbol: string; progress: number; start_capital: number; current_capital: number }>(`${BASE_URL}/api/backtest/status`, "backtest"),
      fetchJSON<{ status?: string } & EngineMetrics>(`${BASE_URL}/api/engine/metrics`, "metrics"),
      fetchJSON<{ status?: string } & RiskMetrics>(`${BASE_URL}/api/risk/metrics`, "risk"),
      fetchJSON<{ status?: string; engine: boolean; feed: boolean; database: boolean }>(`${BASE_URL}/api/health`, "health"),
      fetchJSON<{ status?: string; trades: TradeData[] }>(`${BASE_URL}/api/trades?limit=50`, "trades"),
      fetchJSON<{ status?: string; positions: PositionData[] }>(`${BASE_URL}/api/positions`, "positions"),
    ]);

    if (!mountedRef.current) return;

    const algos = algosRaw?.algos || [];
    const trades = tradesRaw?.trades || [];
    // A REST call succeeding at all (even a single one) means the backend is reachable.
    const anyRestOk = [status, algosRaw, backtestStatus, engineMetrics, riskMetrics, health].some(
      (v) => v !== null
    );

    update({
      health: {
        db: health?.database ? "connected" : "disconnected",
        algo_instances: algos.length,
        status: status?.running ? "running" : "stopped",
        engine_uptime: 0,
        feed: health?.feed,
      },
      algorithms: algos,
      trades,
      positions: positionsRaw?.positions || [],
      backtestStatus: backtestStatus
        ? {
            is_running: backtestStatus.running,
            current_symbol: backtestStatus.symbol || "",
            progress: backtestStatus.progress || 0,
            start_capital: backtestStatus.start_capital || 0,
            current_capital: backtestStatus.current_capital || 0,
          }
        : defaultState.backtestStatus,
      engineMetrics: engineMetrics ? (engineMetrics as EngineMetrics) : defaultState.engineMetrics,
      riskMetrics: riskMetrics ? (riskMetrics as RiskMetrics) : defaultState.riskMetrics,
      connected: anyRestOk,
    });
  }, [update]);

  // Keep a stable ref to the latest fetchAll so action methods (start/stop/etc,
  // defined above with empty dep arrays) can always call the current version
  // without needing to be redeclared or included in the WS effect's deps.
  const fetchAllRef = useRef(fetchAll);
  useEffect(() => {
    fetchAllRef.current = fetchAll;
  }, [fetchAll]);

  const refresh = useCallback(() => {
    fetchAllRef.current();
  }, []);

  // --- WebSocket: connectivity ping + symbol subscription only ---
  // The backend's WS handler speaks plain text, not JSON:
  //   send "status"            -> replies "running" | "stopped"
  //   send "subscribe <sym>"   -> replies "subscribed to <sym>"
  //   send "start" / "stop"    -> controls the engine
  //   anything else            -> replies "unknown command"
  // There is no server-initiated push, so we don't treat this socket as a
  // data stream — REST polling (fetchAll) owns all dashboard state.

  const subscribeSymbol = useCallback((symbol: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(`subscribe ${symbol}`);
    } else {
      console.warn("[Engine] Cannot subscribe, WebSocket not open");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Kick off REST polling immediately; this is the real data source.
    fetchAllRef.current();
    pollTimer.current = setInterval(() => fetchAllRef.current(), 2000);

    function connectWs() {
      try {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log("[Engine] WebSocket connected.");
          update({ wsConnected: true });
          // Simple connectivity ping; matches the backend's plain-text protocol.
          ws.send("status");
        };

        ws.onmessage = (event: MessageEvent) => {
          // Backend replies are plain text (e.g. "running", "stopped",
          // "subscribed to BTCUSD", "unknown command") — do not JSON.parse.
          const text = String(event.data);

          if (text === "running" || text === "stopped") {
            update({
              health: { ...defaultState.health, ...state.health, status: text },
            });
            return;
          }

          if (text.startsWith("subscribed to ")) {
            console.log(`[Engine] Feed ${text}`);
            return;
          }

          if (text === "unknown command") {
            console.warn("[Engine] Backend did not recognize the last WS command");
            return;
          }

          console.log("[Engine] WS message:", text);
        };

        ws.onclose = () => {
          console.warn("[Engine] WebSocket closed. Reconnecting in 5s...");
          wsRef.current = null;
          update({ wsConnected: false });
          if (mountedRef.current) {
            reconnectTimer.current = setTimeout(connectWs, 5000);
          }
        };

        ws.onerror = () => {
          // The subsequent onclose handles reconnection; avoid closing twice.
          console.error("[Engine] WebSocket error");
        };

        wsRef.current = ws;
      } catch (err) {
        console.error("[Engine] WebSocket connection error:", err);
        if (mountedRef.current) {
          reconnectTimer.current = setTimeout(connectWs, 5000);
        }
      }
    }

    connectWs();

    return () => {
      mountedRef.current = false;
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect-on-unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // Empty deps: this effect must run exactly once on mount. `update` and
    // `fetchAllRef.current()` are stable; reading `state` directly here was
    // the bug that caused the socket to be torn down and rebuilt on every
    // state change (the connection storm you saw in the logs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    connectFeed,
    registerUser,
    subscribeSymbol,
  };

  return (
    <EngineContext.Provider value={contextValue}>
      {children}
    </EngineContext.Provider>
  );
}