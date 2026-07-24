#include "../include/backtest_manager.h"
#include <iostream>

BacktestManager::BacktestManager() {}

BacktestManager::~BacktestManager() {
    stop_backtest();
}

void BacktestManager::start_backtest(const std::string& symbol, double capital) {
    backtesting_ = true;
    results_ = BacktestingResult{};
    results_.symbol = symbol;
    results_.startCapital = capital;
    try {
        std::cout << "BacktestManager: Starting backtest for " << symbol
                  << " with capital " << capital << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "BacktestManager: Error starting backtest: " << e.what() << std::endl;
    }
}

void BacktestManager::stop_backtest() {
    if (backtesting_) {
        backtesting_ = false;
        results_.endCapital = results_.startCapital;
        std::cout << "BacktestManager: Stopping backtest" << std::endl;
    } else {
        std::cout << "BacktestManager: Backtest is not running" << std::endl;
    }
}

bool BacktestManager::is_running() const {
    return backtesting_;
}

BacktestingResult BacktestManager::get_results() const {
    return results_;
}
