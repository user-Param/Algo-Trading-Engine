#pragma once

#include <string>
#include <cstdint>
#include "../../algos/include/TradeSignal.h"

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

private:
    bool backtesting_ = false;
    BacktestingResult results_;
};
