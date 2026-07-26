#pragma once

#include <cstdint>
#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <thread>
#include <unordered_map>
#include "../../common/include/logger.h"
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/beast/ssl.hpp>
#include <boost/asio/strand.hpp>
#include <boost/asio/ssl.hpp>
#include <boost/asio/ip/tcp.hpp>

namespace beast = boost::beast;
namespace websocket = beast::websocket;
namespace net = boost::asio;
namespace ssl = boost::asio::ssl;
using tcp = boost::asio::ip::tcp;

struct MarketData {
    std::string symbol;
    double price = 0.0;
    double bid = 0.0;
    double ask = 0.0;
    uint64_t volume = 0;
    uint64_t timestamp = 0;
};

using MarketDataCallback = std::function<void(const MarketData&)>;

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

    void set_market_data_callback(MarketDataCallback cb);
    void register_observer(MarketDataCallback cb);

private:
    void on_read(beast::error_code ec, std::size_t bytes_transferred);
    void handle_message(const std::string& msg);
    void do_read();

    bool backtest_mode_ = false;
    bool connected_ = false;
    MarketDataCallback callback_;
    std::vector<MarketDataCallback> observers_;
    net::io_context ioc_;
    ssl::context ctx_{ssl::context::tlsv12_client};
    std::unique_ptr<websocket::stream<beast::ssl_stream<beast::tcp_stream>>> ws_;
    std::unique_ptr<tcp::resolver> resolver_;
    beast::flat_buffer buffer_;
    std::vector<std::string> subscribed_symbols_;
    std::thread io_thread_;
    std::unordered_map<std::string, MarketData> latest_data_;
};
