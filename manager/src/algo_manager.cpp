#include "../include/algo_manager.h"
#include "common/include/logger.h"
#include <ctime>
#include <iostream>

AlgoManager::AlgoManager() {
    LOG("AlgoManager", "Constructed");
}

AlgoManager::~AlgoManager() {
    LOG("AlgoManager", "Destroying (" << algos_.size() << " algos remaining)");
}

void AlgoManager::setFeedManager(FeedManager* fm) {
    feed_manager_ = fm;
    LOG("AlgoManager", "FeedManager set");
}

void AlgoManager::setRiskManager(RiskManager* rm) {
    risk_manager_ = rm;
    LOG("AlgoManager", "RiskManager set");
}

void AlgoManager::setSOR(SOR* sor) {
    sor_ = sor;
    LOG("AlgoManager", "SOR set");
}

void AlgoManager::setTradeCallback(TradeCallback cb) {
    trade_callback_ = std::move(cb);
    LOG("AlgoManager", "Trade callback set");
}

void AlgoManager::registerAlgoType(const std::string& type, AlgoFactory factory) {
    factories_[type] = std::move(factory);
    LOG("AlgoManager", "Registered algo type: " << type);
}

std::unique_ptr<BaseAlgo> AlgoManager::createAlgo(const std::string& type) {
    auto it = factories_.find(type);
    if (it == factories_.end()) {
        ERR("AlgoManager", "Unknown algo type: " << type);
        return nullptr;
    }
    LOG("AlgoManager", "Creating algo of type: " << type);
    return it->second();
}

void AlgoManager::registerAlgo(std::unique_ptr<BaseAlgo> algo) {
    std::string id = algo->getId();
    algos_[id] = std::move(algo);
    LOG("AlgoManager", "Registered algo instance: " << id << " (total: " << algos_.size() << ")");
}

void AlgoManager::startAlgo(const std::string& algoId) {
    auto it = algos_.find(algoId);
    if (it != algos_.end()) {
        it->second->start();
        LOG("AlgoManager", "Started algo: " << algoId);
    } else {
        ERR("AlgoManager", "startAlgo: " << algoId << " not found");
    }
}

void AlgoManager::stopAlgo(const std::string& algoId) {
    auto it = algos_.find(algoId);
    if (it != algos_.end()) {
        it->second->stop();
        LOG("AlgoManager", "Stopped algo: " << algoId);
    } else {
        ERR("AlgoManager", "stopAlgo: " << algoId << " not found");
    }
}

void AlgoManager::restartAlgo(const std::string& algoId) {
    LOG("AlgoManager", "Restarting algo: " << algoId);
    stopAlgo(algoId);
    startAlgo(algoId);
}

void AlgoManager::terminateAlgo(const std::string& algoId) {
    algos_.erase(algoId);
    LOG("AlgoManager", "Terminated algo: " << algoId << " (remaining: " << algos_.size() << ")");
}

void AlgoManager::sleepAlgo(const std::string& algoId) {
    auto it = algos_.find(algoId);
    if (it != algos_.end()) {
        it->second->stop();
        LOG("AlgoManager", "Slept algo: " << algoId);
    } else {
        ERR("AlgoManager", "sleepAlgo: " << algoId << " not found");
    }
}

std::vector<std::string> AlgoManager::listAlgos() const {
    std::vector<std::string> ids;
    for (const auto& pair : algos_) {
        ids.push_back(pair.first);
    }
    LOG("AlgoManager", "listAlgos: " << ids.size() << " algos");
    return ids;
}

void AlgoManager::onMarketData(const std::string& symbol, const MarketData& data) {
    for (auto& pair : algos_) {
        pair.second->onMarketData(symbol, data);

        if (!pair.second->isRunning())
            continue;

        Signal sig = pair.second->generateSignal();
        sig.timestamp = static_cast<uint64_t>(data.timestamp > 0 ? data.timestamp : std::time(nullptr));

        RiskCheckResult result{true, ""};
        if (risk_manager_)
            result = risk_manager_->validateSignal(sig);

        if (!result.passed) {
            LOG("AlgoManager", "Signal from " << sig.algoId << " rejected: " << result.reason);
            continue;
        }

        if (sor_) {
            sor_->send_order(sig.price, sig.quantity,
                             static_cast<int>(sig.leverage), sig.side);
            sor_->send_signal(R"({"algoId":")" + sig.algoId +
                              R"(","symbol":")" + sig.symbol +
                              R"(","side":")" + sig.side +
                              R"(","price":)" + std::to_string(sig.price) +
                              R"(,"quantity":)" + std::to_string(sig.quantity) +
                              R"(,"leverage":)" + std::to_string(sig.leverage) + R"(})");
        }

        if (trade_callback_)
            trade_callback_(sig);
    }
}
