#include "../include/feed_manager.h"
#include <iostream>

FeedManager::FeedManager() : ioc_() {}

FeedManager::~FeedManager() {
    stop_feed();
}

void FeedManager::set_mode(bool backtest) {
    backtest_mode_ = backtest;
}

bool FeedManager::is_backtest() const {
    return backtest_mode_;
}

void FeedManager::start_feed() {
    std::cout << "FeedManager: Starting feed" << std::endl;
    if (backtest_mode_) {
        std::cout << "FeedManager: Running in backtest mode" << std::endl;
    }
}

void FeedManager::stop_feed() {
    std::cout << "FeedManager: Stopping feed" << std::endl;
    if (ws_) {
        beast::error_code ec;
        ws_->close(websocket::close_code::normal, ec);
        ws_.reset();
    }
    connected_ = false;
}

void FeedManager::restart_feed() {
    stop_feed();
    start_feed();
}

void FeedManager::connect_feed(const std::string& url) {
    std::cout << "FeedManager: Connecting to " << url << std::endl;
    connected_ = true;
}

void FeedManager::disconnect_feed() {
    std::cout << "FeedManager: Disconnecting feed" << std::endl;
    stop_feed();
}

bool FeedManager::is_connected() const {
    return connected_;
}

void FeedManager::subscribe_topics(const std::vector<std::string>& symbols) {
    subscribed_symbols_ = symbols;
    std::cout << "FeedManager: Subscribing to topics: ";
    for (const auto& s : symbols) {
        std::cout << s << " ";
    }
    std::cout << std::endl;
}

MarketData FeedManager::get_feed(const std::string& symbol) {
    MarketData data;
    data.symbol = symbol;
    return data;
}
