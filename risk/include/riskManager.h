#pragma once

#include <string>
#include "../../algos/include/TradeSignal.h"

struct RiskCheckResult {
    bool passed;
    std::string reason;
};

class RiskManager {
public:
    RiskManager();
    ~RiskManager();

    RiskCheckResult validateSignal(const Signal& signal) const;

    void setMaxQuantity(double maxQty);
    void setMaxLeverage(double maxLev);

private:
    double max_quantity_ = 100000.0;
    double max_leverage_ = 100.0;
};
