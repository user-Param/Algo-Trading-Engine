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

private:
    double max_quantity_ = 100000.0;
    double max_leverage_ = 100.0;
    std::vector<RiskRule> rules_;
};
