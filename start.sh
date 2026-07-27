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

# ── Run ──────────────────────────────────────────────────────
echo ""
echo "--- Starting Engine ---"
cd "$ROOT"
exec "$BINARY" "0.0.0.0" "8080" "$ROOT/www" "4"
