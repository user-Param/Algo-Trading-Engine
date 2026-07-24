#include "../include/state_manager.h"
#include <iostream>

StateManager::StateManager() {}

StateManager::~StateManager() {
    disconnect();
}

bool StateManager::connect(const std::string& connString) {
    conn_string_ = connString;
    connected_ = true;
    std::cout << "StateManager: Connected to database" << std::endl;
    return true;
}

void StateManager::disconnect() {
    if (connected_) {
        connected_ = false;
        std::cout << "StateManager: Disconnected from database" << std::endl;
    }
}

bool StateManager::isConnected() const {
    return connected_;
}

int StateManager::createUser(const std::string& username) {
    std::cout << "StateManager: Creating user " << username << std::endl;
    return 1;
}

UserRecord StateManager::getUser(int id) {
    return {id, "default"};
}

int StateManager::saveAlgoConfig(const AlgoRecord& algo) {
    std::cout << "StateManager: Saving algo config " << algo.name << std::endl;
    return 1;
}

AlgoRecord StateManager::getAlgoConfig(int id) {
    return {id, 1, "default", "unknown", false};
}

std::vector<AlgoRecord> StateManager::listAlgos(int userId) {
    return {};
}

int StateManager::saveTrade(const Signal& signal, int algoId) {
    std::cout << "StateManager: Saving trade for " << signal.symbol
              << " (algo: " << algoId << ")" << std::endl;
    return 1;
}

void StateManager::updateTradeStatus(int tradeId, const std::string& status) {
    std::cout << "StateManager: Updating trade " << tradeId
              << " to status " << status << std::endl;
}

std::vector<TradeRecord> StateManager::getTrades(int algoId) {
    return {};
}
