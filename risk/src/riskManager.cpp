#include "../include/riskManager.h"
#include <iostream>

RiskManager::RiskManager() {}

RiskManager::~RiskManager() {}

void RiskManager::setMaxQuantity(double maxQty) {
    max_quantity_ = maxQty;
}

void RiskManager::setMaxLeverage(double maxLev) {
    max_leverage_ = maxLev;
}

RiskCheckResult RiskManager::validateSignal(const Signal& signal) const {
    if (signal.quantity <= 0) {
        return {false, "Quantity must be greater than 0"};
    }
    if (signal.quantity > max_quantity_) {
        return {false, "Quantity exceeds max threshold"};
    }
    if (signal.leverage <= 0 || signal.leverage > max_leverage_) {
        return {false, "Leverage out of valid range"};
    }
    if (signal.symbol.empty()) {
        return {false, "Symbol is required"};
    }
    if (signal.side != "buy" && signal.side != "sell") {
        return {false, "Side must be 'buy' or 'sell'"};
    }
    if (signal.price <= 0) {
        return {false, "Price must be greater than 0"};
    }
    return {true, ""};
}
