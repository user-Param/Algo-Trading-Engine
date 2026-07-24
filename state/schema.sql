CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS algorithms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    config JSONB,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    algo_id INTEGER REFERENCES algorithms(id),
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    quantity DOUBLE PRECISION NOT NULL,
    leverage DOUBLE PRECISION DEFAULT 1.0,
    stop_loss DOUBLE PRECISION,
    take_profit DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER REFERENCES trades(id),
    order_type VARCHAR(50) NOT NULL,
    price DOUBLE PRECISION,
    quantity DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'pending',
    exchange_order_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    mode VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS backtest_results (
    id SERIAL PRIMARY KEY,
    algo_id INTEGER REFERENCES algorithms(id),
    symbol VARCHAR(50),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    start_capital DOUBLE PRECISION,
    end_capital DOUBLE PRECISION,
    win_rate DOUBLE PRECISION,
    total_trades INTEGER,
    winning_trades INTEGER,
    losing_trades INTEGER,
    profit_factor DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT NOW()
);
