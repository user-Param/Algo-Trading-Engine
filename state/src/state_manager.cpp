#include "../include/state_manager.h"
#include "common/include/logger.h"
#include <fstream>
#include <iostream>
#include <sstream>

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
    connected_ = true;
    LOG("StateManager", "Connected to database: " << connString);
    return true;
}

void StateManager::disconnect() {
    if (connected_) {
        connected_ = false;
        LOG("StateManager", "Disconnected from database");
    }
}

bool StateManager::isConnected() const {
    return connected_;
}

int StateManager::createUser(const std::string& username) {
    LOG("StateManager", "Creating user: " << username);
    return 1;
}

UserRecord StateManager::getUser(int id) {
    LOG("StateManager", "getUser: id=" << id);
    return {id, "default"};
}

int StateManager::saveAlgoConfig(const AlgoRecord& algo) {
    LOG("StateManager", "Saving algo config: " << algo.name << " (type=" << algo.type << ")");
    return 1;
}

AlgoRecord StateManager::getAlgoConfig(int id) {
    LOG("StateManager", "getAlgoConfig: id=" << id);
    return {id, 1, "default", "unknown", false};
}

std::vector<AlgoRecord> StateManager::listAlgos(int userId) {
    LOG("StateManager", "listAlgos: userId=" << userId);
    return {};
}

int StateManager::saveTrade(const Signal& signal, int algoId) {
    LOG("StateManager", "Saving trade for " << signal.symbol
        << " side=" << signal.side << " price=" << signal.price
        << " qty=" << signal.quantity << " (algoId=" << algoId << ")");
    return 1;
}

void StateManager::updateTradeStatus(int tradeId, const std::string& status) {
    LOG("StateManager", "Updating trade " << tradeId << " -> " << status);
}

std::vector<TradeRecord> StateManager::getTrades(int algoId) {
    LOG("StateManager", "getTrades: algoId=" << algoId);
    return {};
}
