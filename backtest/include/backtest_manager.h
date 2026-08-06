#pragma once

#include <atomic>
#include <cstdint>
#include <functional>
#include <string>
#include <thread>
#include <vector>
#include "../../algos/include/TradeSignal.h"
#include "../../feed/include/feed_manager.h"

struct BacktestingResult {
    std::string symbol;
    std::string startDate;
    std::string endDate;
    double startCapital = 0.0;
    double endCapital = 0.0;
    double winRate = 0.0;
    int totalTrades = 0;
    int winningTrades = 0;
    int losingTrades = 0;
    double avgFee = 0.0;
    double profitFactor = 0.0;
    double riskToReward = 0.0;
    double avgWin = 0.0;
    double avgLoss = 0.0;
    int buyTrades = 0;
    int sellTrades = 0;
};

class BacktestManager {
public:
    BacktestManager();
    ~BacktestManager();

    void start_backtest(const std::string& symbol, double capital);
    void stop_backtest();
    bool is_running() const;

    BacktestingResult get_results() const;

    void set_market_data_handler(std::function<void(const MarketData&)> handler);

    double get_progress() const;

private:
    std::vector<MarketData> load_historical_data(const std::string& symbol) const;
    std::vector<MarketData> generate_synthetic_data(const std::string& symbol, size_t count) const;
    void finalize_results();

    std::atomic<bool> backtesting_{false};
    std::atomic<bool> stop_requested_{false};
    std::thread replay_thread_;
    std::function<void(const MarketData&)> handler_;
    BacktestingResult results_;
    mutable std::vector<MarketData> history_;
    std::atomic<size_t> replay_index_{0};
    size_t total_ticks_ = 0;
    int replay_delay_ms_ = 50;
    double progress_ = 0.0;
};
