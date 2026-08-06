#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$ROOT/build"
BINARY="$BUILD_DIR/algo_engine"
DB_NAME="engine"
DB_USER="${PGUSER:-param}"
DB_HOST="${PGHOST:-/tmp}"
DB_PORT="${PGPORT:-5432}"

echo "=== Algo Trading Engine ==="

# ── Database ──────────────────────────────────────────────────
echo ""
echo "--- Database Setup ---"

if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" &>/dev/null; then
    echo "ERROR: PostgreSQL is not running at $DB_HOST:$DB_PORT"
    echo "Start it with: brew services start postgresql"
    exit 1
fi

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tc \
    "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" \
    | grep -q 1 \
    || psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "CREATE DATABASE $DB_NAME;"

echo "Running schema.sql on $DB_NAME ..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$ROOT/state/schema.sql" -q
echo "Database ready."

# ── Build ────────────────────────────────────────────────────
echo ""
echo "--- Build ---"
mkdir -p "$BUILD_DIR"
cmake -S "$ROOT" -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE=Release &>/dev/null
cmake --build "$BUILD_DIR" -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)"
echo "Build complete."

# ── Start Mock Feed ─────────────────────────────────────────
echo ""
echo "--- Starting Mock Feed (port 8765) ---"
if pgrep -f "mock_feed.py" > /dev/null; then
    echo "Mock feed already running. Killing old instance..."
    pkill -f "mock_feed.py" || true
fi
python3 "$ROOT/mock_feed.py" > "$ROOT/mock_feed.log" 2>&1 &
MOCK_PID=$!
echo "Mock feed PID: $MOCK_PID (logs: mock_feed.log)"

# ── Start Dashboard ──────────────────────────────────────────
echo ""
echo "--- Starting Dashboard (port 3000) ---"
cd "$ROOT/dashboard"
if [ ! -d "node_modules" ]; then
    echo "Installing dashboard dependencies..."
    npm install
fi
npm run dev > "$ROOT/dashboard.log" 2>&1 &
DASHBOARD_PID=$!
echo "Dashboard PID: $DASHBOARD_PID (logs: dashboard.log)"

# ── Start Engine ─────────────────────────────────────────────
echo ""
echo "--- Starting Engine (port 8080) ---"
cd "$ROOT"
"$BINARY" "0.0.0.0" "8080" "$ROOT/www" "4" &
ENGINE_PID=$!
echo "Engine PID: $ENGINE_PID"

# Wait for engine to be ready (simple sleep, but could be improved with a health check)
echo "Waiting for engine to be ready..."
sleep 3

# Start the engine via API
echo "Starting engine via REST API..."
curl -s -X POST http://localhost:8080/api/engine/start > /dev/null
echo "Engine started."

# ── Trap to clean up background processes ────────────────────
cleanup() {
    echo ""
    echo "Shutting down all services..."
    kill $MOCK_PID $DASHBOARD_PID $ENGINE_PID 2>/dev/null || true
    wait $MOCK_PID $DASHBOARD_PID $ENGINE_PID 2>/dev/null || true
    echo "All services stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for the engine process to finish (will block until Ctrl+C or engine crash)
wait $ENGINE_PID