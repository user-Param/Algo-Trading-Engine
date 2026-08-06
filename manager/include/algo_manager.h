#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include <functional>
#include "../../algos/include/base_algo.h"
#include "../../feed/include/feed_manager.h"
#include "../../risk/include/riskManager.h"
#include "../../sor/include/smart_order_router.h"

using AlgoFactory = std::function<std::unique_ptr<BaseAlgo>()>;
using TradeCallback = std::function<void(const Signal&)>;

class AlgoManager {
public:
    AlgoManager();
    ~AlgoManager();

    void setFeedManager(FeedManager* fm);
    void setRiskManager(RiskManager* rm);
    void setSOR(SOR* sor);
    void setTradeCallback(TradeCallback cb);

    void registerAlgoType(const std::string& type, AlgoFactory factory);
    std::unique_ptr<BaseAlgo> createAlgo(const std::string& type);
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
    std::unordered_map<std::string, AlgoFactory> factories_;
    FeedManager* feed_manager_ = nullptr;
    RiskManager* risk_manager_ = nullptr;
    SOR* sor_ = nullptr;
    TradeCallback trade_callback_;
};
