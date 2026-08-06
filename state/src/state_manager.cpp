#include "../include/state_manager.h"
#include "common/include/logger.h"
#include <fstream>
#include <iostream>
#include <sstream>

#ifdef USE_POSTGRESQL
#include <pqxx/pqxx>
#endif

StateManager::StateManager() {
    LOG("StateManager", "Constructed");
}

StateManager::~StateManager() {
    LOG("StateManager", "Destroying");
    disconnect();
}

bool StateManager::connect() {
    std::ifstream f(".env");
    if (!f.is_open()) {
        f.open("../.env");
    }
    if (f.is_open()) {
        std::string line;
        while (std::getline(f, line)) {
            if (line.find("DATABASE_URL=") == 0) {
                std::string url = line.substr(std::string("DATABASE_URL=").size());
                if (!url.empty()) {
                    LOG("StateManager", "Loaded DATABASE_URL from .env");
                    return connect(url);
                }
            }
        }
    }
    ERR("StateManager", ".env not found or DATABASE_URL missing");
    return false;
}

bool StateManager::connect(const std::string& connString) {
    conn_string_ = connString;
#ifdef USE_POSTGRESQL
    try {
        conn_ = std::make_unique<pqxx::connection>(connString);
        connected_ = conn_->is_open();
        if (connected_)
            LOG("StateManager", "Connected to PostgreSQL: " << connString);
        else
            ERR("StateManager", "PostgreSQL connection is not open");
    } catch (const std::exception& e) {
        ERR("StateManager", "PostgreSQL connect failed: " << e.what());
        connected_ = false;
    }
#else
    connected_ = true;
    LOG("StateManager", "Connected to database (stub mode, no USE_POSTGRESQL): " << connString);
#endif
    return connected_;
}

void StateManager::disconnect() {
    if (connected_) {
        connected_ = false;
#ifdef USE_POSTGRESQL
        try {
            if (conn_) {
                conn_->close();
                conn_.reset();
            }
        } catch (const std::exception& e) {
            ERR("StateManager", "Error closing connection: " << e.what());
        }
#endif
        LOG("StateManager", "Disconnected from database");
    }
}

bool StateManager::isConnected() const {
    return connected_;
}

int StateManager::createUser(const std::string& username) {
    LOG("StateManager", "Creating user: " << username);
#ifdef USE_POSTGRESQL
    if (!connected_) return -1;
    try {
        pqxx::work tx{*conn_};
        auto res = tx.exec(
            "INSERT INTO users (username) VALUES ($1) "
            "ON CONFLICT (username) DO UPDATE SET updated_at = NOW() RETURNING id",
            pqxx::params{username});
        tx.commit();
        if (!res.empty())
            return res[0][0].as<int>();
    } catch (const std::exception& e) {
        ERR("StateManager", "createUser failed: " << e.what());
    }
    return -1;
#else
    return 1;
#endif
}

UserRecord StateManager::getUser(int id) {
    LOG("StateManager", "getUser: id=" << id);
#ifdef USE_POSTGRESQL
    if (connected_) {
        try {
            pqxx::nontransaction tx{*conn_};
            auto res = tx.exec("SELECT id, username FROM users WHERE id = $1", pqxx::params{id});
            if (!res.empty())
                return {res[0][0].as<int>(), res[0][1].as<std::string>()};
        } catch (const std::exception& e) {
            ERR("StateManager", "getUser failed: " << e.what());
        }
    }
    return {id, "default"};
#else
    return {id, "default"};
#endif
}

int StateManager::saveAlgoConfig(const AlgoRecord& algo) {
    LOG("StateManager", "Saving algo config: " << algo.name << " (type=" << algo.type << ")");
#ifdef USE_POSTGRESQL
    if (!connected_) return -1;
    try {
        pqxx::work tx{*conn_};
        pqxx::result res;
        if (algo.id > 0) {
            res = tx.exec(
                "UPDATE algorithms SET user_id=$1, name=$2, type=$3, enabled=$4, updated_at=NOW() "
                "WHERE id=$5 RETURNING id",
                pqxx::params{algo.userId, algo.name, algo.type, algo.enabled, algo.id});
        } else {
            res = tx.exec(
                "INSERT INTO algorithms (user_id, name, type, enabled) VALUES ($1,$2,$3,$4) "
                "RETURNING id",
                pqxx::params{algo.userId, algo.name, algo.type, algo.enabled});
        }
        tx.commit();
        if (!res.empty())
            return res[0][0].as<int>();
    } catch (const std::exception& e) {
        ERR("StateManager", "saveAlgoConfig failed: " << e.what());
    }
    return -1;
#else
    return 1;
#endif
}

AlgoRecord StateManager::getAlgoConfig(int id) {
    LOG("StateManager", "getAlgoConfig: id=" << id);
#ifdef USE_POSTGRESQL
    if (connected_) {
        try {
            pqxx::nontransaction tx{*conn_};
            auto res = tx.exec(
                "SELECT id, user_id, name, type, enabled FROM algorithms WHERE id = $1",
                pqxx::params{id});
            if (!res.empty()) {
                return {res[0][0].as<int>(), res[0][1].as<int>(), res[0][2].as<std::string>(),
                        res[0][3].as<std::string>(), res[0][4].as<bool>()};
            }
        } catch (const std::exception& e) {
            ERR("StateManager", "getAlgoConfig failed: " << e.what());
        }
    }
    return {id, 1, "default", "unknown", false};
#else
    return {id, 1, "default", "unknown", false};
#endif
}

std::vector<AlgoRecord> StateManager::listAlgos(int userId) {
    LOG("StateManager", "listAlgos: userId=" << userId);
    std::vector<AlgoRecord> out;
#ifdef USE_POSTGRESQL
    if (connected_) {
        try {
            pqxx::nontransaction tx{*conn_};
            auto res = tx.exec(
                "SELECT id, user_id, name, type, enabled FROM algorithms WHERE user_id = $1 ORDER BY id",
                pqxx::params{userId});
            for (const auto& row : res) {
                out.push_back({row[0].as<int>(), row[1].as<int>(), row[2].as<std::string>(),
                               row[3].as<std::string>(), row[4].as<bool>()});
            }
        } catch (const std::exception& e) {
            ERR("StateManager", "listAlgos failed: " << e.what());
        }
    }
#endif
    return out;
}

int StateManager::saveTrade(const Signal& signal, int algoId) {
    LOG("StateManager", "Saving trade for " << signal.symbol
        << " side=" << signal.side << " price=" << signal.price
        << " qty=" << signal.quantity << " (algoId=" << algoId << ")");
#ifdef USE_POSTGRESQL
    if (!connected_) return -1;
    try {
        pqxx::work tx{*conn_};
        auto res = tx.exec(
            "INSERT INTO trades (algo_id, symbol, side, price, quantity, leverage, stop_loss, take_profit, status) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open') RETURNING id",
            pqxx::params{algoId, signal.symbol, signal.side, signal.price, signal.quantity,
                         signal.leverage, signal.stopLoss, signal.takeProfit});
        tx.commit();
        if (!res.empty())
            return res[0][0].as<int>();
    } catch (const std::exception& e) {
        ERR("StateManager", "saveTrade failed: " << e.what());
    }
    return -1;
#else
    return 1;
#endif
}

void StateManager::updateTradeStatus(int tradeId, const std::string& status) {
    LOG("StateManager", "Updating trade " << tradeId << " -> " << status);
#ifdef USE_POSTGRESQL
    if (!connected_) return;
    try {
        pqxx::work tx{*conn_};
        tx.exec("UPDATE trades SET status = $1, updated_at = NOW() WHERE id = $2",
                pqxx::params{status, tradeId});
        tx.commit();
    } catch (const std::exception& e) {
        ERR("StateManager", "updateTradeStatus failed: " << e.what());
    }
#endif
}

std::vector<TradeRecord> StateManager::getTrades(int algoId) {
    LOG("StateManager", "getTrades: algoId=" << algoId);
    std::vector<TradeRecord> out;
#ifdef USE_POSTGRESQL
    if (connected_) {
        try {
            pqxx::nontransaction tx{*conn_};
            auto res = tx.exec(
                "SELECT id, algo_id, symbol, side, price, quantity, status "
                "FROM trades WHERE algo_id = $1 ORDER BY id DESC LIMIT 200",
                pqxx::params{algoId});
            for (const auto& row : res) {
                out.push_back({row[0].as<int>(), row[1].as<int>(), row[2].as<std::string>(),
                               row[3].as<std::string>(), row[4].as<double>(), row[5].as<double>(),
                               row[6].as<std::string>()});
            }
        } catch (const std::exception& e) {
            ERR("StateManager", "getTrades failed: " << e.what());
        }
    }
#endif
    return out;
}
