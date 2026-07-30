#include "../include/test_algo1.h"
#include <iostream>

TestAlgo1::TestAlgo1(const std::string& id) : id_(id), running_(false) {}

void TestAlgo1::onMarketData(const std::string& symbol, const MarketData& data) {
    if (running_) {
        std::cout << "TestAlgo1 [" << id_ << "]: Market data for " << symbol
                  << " - bid: " << data.bid << " ask: " << data.ask << std::endl;
    }
}

Signal TestAlgo1::generateSignal() {
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

std::string TestAlgo1::getId() const {
    return id_;
}

void TestAlgo1::start() {
    running_ = true;
    std::cout << "TestAlgo1 [" << id_ << "]: Started" << std::endl;
}

void TestAlgo1::stop() {
    running_ = false;
    std::cout << "TestAlgo1 [" << id_ << "]: Stopped" << std::endl;
}

static int test_algo_counter = 0;

std::unique_ptr<BaseAlgo> createTestAlgo1() {
    return std::make_unique<TestAlgo1>("testalgo" + std::to_string(++test_algo_counter));
}
