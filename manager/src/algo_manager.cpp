#include "../include/algo_manager.h"
#include "common/include/logger.h"
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
    }
}
