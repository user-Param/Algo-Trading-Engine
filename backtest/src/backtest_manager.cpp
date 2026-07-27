#include "../include/backtest_manager.h"
#include "common/include/logger.h"
#include <iostream>

BacktestManager::BacktestManager() {
    LOG("BacktestManager", "Constructed");
}

BacktestManager::~BacktestManager() {
    LOG("BacktestManager", "Destroying");
    stop_backtest();
}

void BacktestManager::start_backtest(const std::string& symbol, double capital) {
    backtesting_ = true;
    results_ = BacktestingResult{};
    results_.symbol = symbol;
    results_.startCapital = capital;
    try {
        LOG("BacktestManager", "Starting backtest for " << symbol
            << " with capital $" << capital);
    } catch (const std::exception& e) {
        ERR("BacktestManager", "Error starting backtest: " << e.what());
    }
}

void BacktestManager::stop_backtest() {
    if (backtesting_) {
        backtesting_ = false;
        results_.endCapital = results_.startCapital;
        LOG("BacktestManager", "Backtest stopped. Result: $" << results_.endCapital);
    } else {
        LOG("BacktestManager", "stop_backtest called but not running");
    }
}

bool BacktestManager::is_running() const {
    LOG("BacktestManager", "is_running: " << (backtesting_ ? "yes" : "no"));
    return backtesting_;
}

BacktestingResult BacktestManager::get_results() const {
    LOG("BacktestManager", "get_results: symbol=" << results_.symbol
        << " start=$" << results_.startCapital
        << " end=$" << results_.endCapital);
    return results_;
}
