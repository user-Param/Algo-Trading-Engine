#pragma once

#include <string>
#include <vector>
#include <functional>
#include "../../algos/include/TradeSignal.h"

struct RiskCheckResult {
    bool passed;
    std::string reason;
};

using RiskRule = std::function<RiskCheckResult(const Signal&)>;

class RiskManager {
public:
    RiskManager();
    ~RiskManager();

    RiskCheckResult validateSignal(const Signal& signal) const;

    void setMaxQuantity(double maxQty);
    void setMaxLeverage(double maxLev);
    void addRule(RiskRule rule);

    void recordTrade(const Signal& signal);
    double getTotalExposure() const;
    double getDailyPnl() const;
    double getWeeklyPnl() const;
    double getMonthlyPnl() const;
    int getOpenPositions() const;

private:
    double max_quantity_ = 100000.0;
    double max_leverage_ = 100.0;
    std::vector<RiskRule> rules_;
    double total_exposure_ = 0.0;
    double daily_pnl_ = 0.0;
    double weekly_pnl_ = 0.0;
    double monthly_pnl_ = 0.0;
    int open_positions_ = 0;
};
