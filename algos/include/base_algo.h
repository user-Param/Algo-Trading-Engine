#pragma once

#include <string>
#include "TradeSignal.h"
#include "../../feed/include/feed_manager.h"

class BaseAlgo {
public:
    virtual ~BaseAlgo() = default;

    virtual void onMarketData(const std::string& symbol, const MarketData& data) = 0;
    virtual Signal generateSignal() = 0;
    virtual std::string getId() const = 0;
    virtual void start() = 0;
    virtual void stop() = 0;
};
