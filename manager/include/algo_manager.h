#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include "../../algos/include/base_algo.h"
#include "../../feed/include/feed_manager.h"

class AlgoManager {
public:
    AlgoManager();
    ~AlgoManager();

    void setFeedManager(FeedManager* fm);

    void registerAlgo(std::unique_ptr<BaseAlgo> algo);
    void startAlgo(const std::string& algoId);
    void stopAlgo(const std::string& algoId);
    void restartAlgo(const std::string& algoId);
    void terminateAlgo(const std::string& algoId);
    void sleepAlgo(const std::string& algoId);
    std::vector<std::string> listAlgos() const;

    void onMarketData(const std::string& symbol, const MarketData& data);

private:
    std::unordered_map<std::string, std::unique_ptr<BaseAlgo>> algos_;
    FeedManager* feed_manager_ = nullptr;
};
