#pragma once

#include <cstdint>
#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/strand.hpp>

namespace beast = boost::beast;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = boost::asio::ip::tcp;

struct MarketData {
    std::string symbol;
    double price = 0.0;
    double bid = 0.0;
    double ask = 0.0;
    uint64_t volume = 0;
    uint64_t timestamp = 0;
};

class FeedManager {
public:
    FeedManager();
    ~FeedManager();

    void set_mode(bool backtest);
    bool is_backtest() const;

    void start_feed();
    void stop_feed();
    void restart_feed();

    void connect_feed(const std::string& url);
    void disconnect_feed();
    bool is_connected() const;

    void subscribe_topics(const std::vector<std::string>& symbols);
    MarketData get_feed(const std::string& symbol);

private:
    bool backtest_mode_ = false;
    bool connected_ = false;
    std::unique_ptr<websocket::stream<beast::tcp_stream>> ws_;
    std::vector<std::string> subscribed_symbols_;
    net::io_context ioc_;
};
