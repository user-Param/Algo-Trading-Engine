#include "../include/riskManager.h"
#include "common/include/logger.h"
#include <iostream>

RiskManager::RiskManager() {
    LOG("RiskManager", "Constructed");
}

RiskManager::~RiskManager() {
    LOG("RiskManager", "Destroying");
}

void RiskManager::setMaxQuantity(double maxQty) {
    LOG("RiskManager", "setMaxQuantity: " << maxQty);
    max_quantity_ = maxQty;
}

void RiskManager::setMaxLeverage(double maxLev) {
    LOG("RiskManager", "setMaxLeverage: " << maxLev);
    max_leverage_ = maxLev;
}

void RiskManager::addRule(RiskRule rule) {
    rules_.push_back(std::move(rule));
    LOG("RiskManager", "addRule: total rules = " << rules_.size());
}

RiskCheckResult RiskManager::validateSignal(const Signal& signal) const {
    LOG("RiskManager", "validateSignal: " << signal.symbol << " " << signal.side
        << " qty=" << signal.quantity << " price=" << signal.price);

    for (const auto& rule : rules_) {
        RiskCheckResult r = rule(signal);
        if (!r.passed) {
            LOG("RiskManager", "Rule rejected: " << r.reason);
            return r;
        }
    }

    if (signal.quantity <= 0) {
        LOG("RiskManager", "REJECTED: quantity <= 0");
        return {false, "Quantity must be greater than 0"};
    }
    if (signal.quantity > max_quantity_) {
        LOG("RiskManager", "REJECTED: quantity exceeds max");
        return {false, "Quantity exceeds max threshold"};
    }
    if (signal.leverage <= 0 || signal.leverage > max_leverage_) {
        LOG("RiskManager", "REJECTED: leverage out of range");
        return {false, "Leverage out of valid range"};
    }
    if (signal.symbol.empty()) {
        LOG("RiskManager", "REJECTED: empty symbol");
        return {false, "Symbol is required"};
    }
    if (signal.side != "buy" && signal.side != "sell") {
        LOG("RiskManager", "REJECTED: invalid side");
        return {false, "Side must be 'buy' or 'sell'"};
    }
    if (signal.price <= 0) {
        LOG("RiskManager", "REJECTED: price <= 0");
        return {false, "Price must be greater than 0"};
    }

    LOG("RiskManager", "PASSED for " << signal.symbol);
    return {true, ""};
}

void RiskManager::recordTrade(const Signal& signal) {
    double notional = signal.price * signal.quantity;
    total_exposure_ += notional;
    open_positions_++;
    LOG("RiskManager", "recordTrade: " << signal.symbol << " notional=" << notional
        << " exposure=" << total_exposure_ << " positions=" << open_positions_);
}

double RiskManager::getTotalExposure() const { return total_exposure_; }
double RiskManager::getDailyPnl() const { return daily_pnl_; }
double RiskManager::getWeeklyPnl() const { return weekly_pnl_; }
double RiskManager::getMonthlyPnl() const { return monthly_pnl_; }
int RiskManager::getOpenPositions() const { return open_positions_; }
