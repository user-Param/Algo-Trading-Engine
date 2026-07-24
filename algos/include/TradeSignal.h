#pragma once

#include <string>
#include <cstdint>

struct Signal {
    std::string symbol;
    std::string side;
    double price = 0.0;
    double quantity = 0.0;
    double leverage = 1.0;
    double stopLoss = 0.0;
    double takeProfit = 0.0;
    std::string algoId;
    uint64_t timestamp = 0;
};
