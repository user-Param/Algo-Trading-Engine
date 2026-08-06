#pragma once
#include "base_algo.h"
#include <memory>
#include <string>

class TestAlgo1 : public BaseAlgo {
public:
    explicit TestAlgo1(const std::string& id);
    void onMarketData(const std::string& symbol, const MarketData& data) override;
    Signal generateSignal() override;
    std::string getId() const override;
    void start() override;
    void stop() override;
    bool isRunning() const override;

private:
    std::string id_;
    bool running_ = false;
};

std::unique_ptr<BaseAlgo> createTestAlgo1();