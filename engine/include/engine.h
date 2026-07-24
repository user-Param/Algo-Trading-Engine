#pragma once

#include <string>
#include "../../feed/include/feed_manager.h"
#include "../../manager/include/algo_manager.h"
#include "../../risk/include/riskManager.h"
#include "../../sor/include/smart_order_router.h"
#include "../../state/include/state_manager.h"
#include "../../backtest/include/backtest_manager.h"

class Engine {
public:
    Engine();
    ~Engine();

    void start();
    void stop();
    void restart();
    bool isRunning() const;

    FeedManager& getFeedManager();
    AlgoManager& getAlgoManager();
    RiskManager& getRiskManager();
    SOR& getSOR();
    StateManager& getStateManager();
    BacktestManager& getBacktestManager();

private:
    bool running_ = false;
    FeedManager feed_manager_;
    AlgoManager algo_manager_;
    RiskManager risk_manager_;
    SOR sor_;
    StateManager state_manager_;
    BacktestManager backtest_manager_;
};
