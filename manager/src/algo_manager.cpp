#include "../include/algo_manager.h"
#include <iostream>

AlgoManager::AlgoManager() {}

AlgoManager::~AlgoManager() {}

void AlgoManager::setFeedManager(FeedManager* fm) {
    feed_manager_ = fm;
}

void AlgoManager::registerAlgo(std::unique_ptr<BaseAlgo> algo) {
    std::string id = algo->getId();
    algos_[id] = std::move(algo);
    std::cout << "AlgoManager: Registered algo " << id << std::endl;
}

void AlgoManager::startAlgo(const std::string& algoId) {
    auto it = algos_.find(algoId);
    if (it != algos_.end()) {
        it->second->start();
        std::cout << "AlgoManager: Started algo " << algoId << std::endl;
    } else {
        std::cerr << "AlgoManager: Algo " << algoId << " not found" << std::endl;
    }
}

void AlgoManager::stopAlgo(const std::string& algoId) {
    auto it = algos_.find(algoId);
    if (it != algos_.end()) {
        it->second->stop();
        std::cout << "AlgoManager: Stopped algo " << algoId << std::endl;
    }
}

void AlgoManager::restartAlgo(const std::string& algoId) {
    stopAlgo(algoId);
    startAlgo(algoId);
}

void AlgoManager::terminateAlgo(const std::string& algoId) {
    algos_.erase(algoId);
    std::cout << "AlgoManager: Terminated algo " << algoId << std::endl;
}

void AlgoManager::sleepAlgo(const std::string& algoId) {
    auto it = algos_.find(algoId);
    if (it != algos_.end()) {
        it->second->stop();
        std::cout << "AlgoManager: Slept algo " << algoId << std::endl;
    }
}

std::vector<std::string> AlgoManager::listAlgos() const {
    std::vector<std::string> ids;
    for (const auto& pair : algos_) {
        ids.push_back(pair.first);
    }
    return ids;
}

void AlgoManager::onMarketData(const std::string& symbol, const MarketData& data) {
    for (auto& pair : algos_) {
        pair.second->onMarketData(symbol, data);
    }
}
