#include "../include/base_algo.h"
#include <iostream>

class TestAlgo1 : public BaseAlgo {
public:
    explicit TestAlgo1(const std::string& id) : id_(id), running_(false) {}

    void onMarketData(const std::string& symbol, const MarketData& data) override {
        if (running_) {
            std::cout << "TestAlgo1 [" << id_ << "]: Market data for " << symbol
                      << " - bid: " << data.bid << " ask: " << data.ask << std::endl;
        }
    }

    Signal generateSignal() override {
        Signal sig;
        sig.symbol = "BTC/USD";
        sig.side = "buy";
        sig.price = 50000.0;
        sig.quantity = 1.0;
        sig.leverage = 1.0;
        sig.stopLoss = 48000.0;
        sig.takeProfit = 52000.0;
        sig.algoId = id_;
        sig.timestamp = 0;
        return sig;
    }

    std::string getId() const override {
        return id_;
    }

    void start() override {
        running_ = true;
        std::cout << "TestAlgo1 [" << id_ << "]: Started" << std::endl;
    }

    void stop() override {
        running_ = false;
        std::cout << "TestAlgo1 [" << id_ << "]: Stopped" << std::endl;
    }

private:
    std::string id_;
    bool running_;
};
