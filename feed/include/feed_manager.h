#pragma once

#include <cstdint>
#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <thread>
#include <unordered_map>
#include <atomic>
#include <future>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio.hpp>
#include <boost/asio/ip/tcp.hpp>
#include "../../common/include/logger.h"

struct MarketData {
    std::string symbol;
    double price;
    double bid;
    double ask;
    double volume;
    int64_t timestamp;
};

class FeedManager {
public:
    FeedManager();
    ~FeedManager();

    void set_mode(bool backtest);
    bool is_backtest() const;
    bool is_connected() const;

    void start_feed();
    void stop_feed();
    void restart_feed();

    void connect_feed(const std::string& url = "");
    void disconnect_feed();
    void subscribe_topics(const std::vector<std::string>& topics);

    MarketData get_feed(const std::string& symbol);

    void set_callback(std::function<void(const MarketData&)> callback);
    void add_observer(std::function<void(const MarketData&)> observer);

private:
    void schedule_reconnect();
    void do_read();

    bool backtest_mode_ = false;
    std::atomic<bool> connected_{false};
    std::atomic<bool> connecting_{false};
    std::atomic<bool> reconnect_enabled_{false};

    boost::asio::io_context ioc_;
    std::unique_ptr<boost::beast::websocket::stream<boost::beast::tcp_stream>> ws_;
    std::unique_ptr<boost::asio::ip::tcp::resolver> resolver_;
    std::mutex connect_mutex_;

    std::unordered_map<std::string, MarketData> latest_data_;
    std::function<void(const MarketData&)> callback_;
    std::vector<std::function<void(const MarketData&)>> observers_;
    std::unique_ptr<boost::asio::steady_timer> reconnect_timer_;
    int reconnect_delay_sec_ = 5;
    boost::beast::flat_buffer buffer_;
    std::thread io_thread_;
    std::vector<std::string> subscribed_symbols_;
};