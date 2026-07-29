#include "feed_manager.h"

#include <boost/beast/version.hpp>
#include <cctype>
#include <cstdlib>
#include <iostream>

namespace beast = boost::beast;
namespace http = beast::http;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = boost::asio::ip::tcp;

// JSON parsing helpers
static std::string json_str(const std::string& j, const std::string& k) {
    auto p = j.find("\"" + k + "\":\"");
    if (p == std::string::npos) return {};
    p += k.size() + 4;
    std::string v;
    while (p < j.size() && j[p] != '"') v += j[p++];
    return v;
}

static double json_num(const std::string& j, const std::string& k) {
    auto p = j.find("\"" + k + "\":");
    if (p == std::string::npos) return 0.0;
    p += k.size() + 3;
    while (p < j.size() && (j[p] == ' ' || j[p] == '\t')) p++;
    std::string n;
    if (j[p] == '-') { n += '-'; p++; }
    while (p < j.size() && (std::isdigit(j[p]) || j[p] == '.'))
        n += j[p++];
    return n.empty() ? 0.0 : std::stod(n);
}

FeedManager::FeedManager()
{
    LOG("FeedManager", "Constructed");
}

FeedManager::~FeedManager()
{
    LOG("FeedManager", "Destroying");
    disconnect_feed();
}

void FeedManager::set_mode(bool backtest)
{
    backtest_mode_ = backtest;
    LOG("FeedManager", (backtest ? "Mode set to BACKTEST" : "Mode set to LIVE"));
}

bool FeedManager::is_backtest() const { return backtest_mode_; }
bool FeedManager::is_connected() const { return connected_; }

void FeedManager::start_feed()
{
    LOG("FeedManager", "start_feed called (backtest=" << backtest_mode_ << ", connected=" << connected_ << ")");
    if (!connected_ && !backtest_mode_) {
        reconnect_enabled_ = true;
        connect_feed("");
    }
}

void FeedManager::stop_feed()
{
    LOG("FeedManager", "stop_feed called");
    reconnect_enabled_ = false;
    disconnect_feed();
}

void FeedManager::restart_feed()
{
    LOG("FeedManager", "restart_feed called");
    reconnect_enabled_ = true;
    disconnect_feed();
    connect_feed("");
}

void FeedManager::connect_feed(const std::string&) {
    // Prevent multiple concurrent connection attempts using atomic operations
    bool expected = false;
    if (!connecting_.compare_exchange_strong(expected, true)) {
        // Already connecting or connected
        if (connected_.load()) {
            LOG("FeedManager", "connect_feed skipped - already connected");
            return;
        }
        if (connecting_.load()) {
            LOG("FeedManager", "connect_feed skipped - already connecting");
            return;
        }
        // Should not reach here due to compare_exchange_strong, but just in case
        return;
    }

    LOG("FeedManager", "connect_feed: resolving ...");

    ws_ = std::make_unique<websocket::stream<beast::tcp_stream>>(
        net::make_strand(ioc_));
    resolver_ = std::make_unique<tcp::resolver>(net::make_strand(ioc_));

    std::string host = "16.192.155.232";
    std::string port = "80";

    resolver_->async_resolve(host, port,
        [this, host, port](beast::error_code ec, tcp::resolver::results_type results) {
            if (ec) {
                ERR("FeedManager", "resolve failed: " << ec.message());
                connecting_.store(false);
                connected_.store(false);
                schedule_reconnect();
                return;
            }
            LOG("FeedManager", "resolve OK, connecting ...");
            beast::get_lowest_layer(*ws_).expires_after(std::chrono::seconds(60)); // Increased timeout as per requirements

            beast::get_lowest_layer(*ws_).async_connect(results,
                [this, host, port](beast::error_code ec, tcp::resolver::results_type::endpoint_type) {
                    if (ec) {
                        ERR("FeedManager", "connect failed: " << ec.message());
                        connecting_.store(false);
                        connected_.store(false);
                        schedule_reconnect();
                        return;
                    }
                    LOG("FeedManager", "TCP connected, performing WS handshake ...");
                    beast::get_lowest_layer(*ws_).expires_never();
                    ws_->set_option(websocket::stream_base::timeout::suggested(
                        beast::role_type::server));
                    ws_->set_option(websocket::stream_base::decorator(
                        [](websocket::request_type& req) {
                            req.set(http::field::user_agent,
                                    std::string(BOOST_BEAST_VERSION_STRING) + " feed-manager");
                        }));

                    ws_->async_handshake(host + ":" + port, "/",
                        [this, host, port](beast::error_code ec) {
                            if (ec) {
                                ERR("FeedManager", "WS handshake failed: " << ec.message());
                                connecting_.store(false);
                                connected_.store(false);
                                schedule_reconnect();
                                return;
                            }
                            LOG("FeedManager", "WS handshake OK, sending _Live ...");

                            ws_->async_write(net::buffer(std::string("_Live")),
                                [this](beast::error_code ec, std::size_t) {
                                    if (ec) {
                                        ERR("FeedManager", "write _Live failed: " << ec.message());
                                        connecting_.store(false);
                                        connected_.store(false);
                                        schedule_reconnect();
                                        return;
                                    }
                                    LOG("FeedManager", "Sent _Live, subscribing ...");

                                    ws_->async_write(net::buffer(std::string(R"({"subscribe":"ticker_"})")),
                                        [this](beast::error_code ec, std::size_t) {
                                            if (ec) {
                                                ERR("FeedManager", "write subscribe failed: " << ec.message());
                                                connecting_.store(false);
                                                connected_.store(false);
                                                schedule_reconnect();
                                                return;
                                            }
                                            connecting_.store(false);
                                            connected_.store(true);
                                            LOG("FeedManager", "Subscribed to ticker_");
                                            do_read();
                                        });
                                });
                        });
                });
        });

    io_thread_ = std::thread([this]() {
        LOG("FeedManager", "IO thread started");
        ioc_.run();
        LOG("FeedManager", "IO thread exited");
    });
}

void FeedManager::schedule_reconnect()
{
    if (!reconnect_enabled_) {
        LOG("FeedManager", "reconnect disabled, not scheduling");
        return;
    }
    LOG("FeedManager", "scheduling reconnect in " << reconnect_delay_sec_ << "s");
    reconnect_timer_ = std::make_unique<net::steady_timer>(ioc_);
    reconnect_timer_->expires_after(std::chrono::seconds(reconnect_delay_sec_));
    reconnect_timer_->async_wait([this](beast::error_code ec) {
        if (ec) {
            ERR("FeedManager", "reconnect timer error: " << ec.message());
            return;
        }
        LOG("FeedManager", "reconnect timer fired, attempting reconnect");
        connect_feed("");
    });
}

void FeedManager::disconnect_feed()
{
    LOG("FeedManager", "disconnect_feed called");
    connected_.store(false);
    connecting_.store(false);
    if (reconnect_timer_) {
        reconnect_timer_->cancel();
    }
    if (ws_) {
        beast::error_code ec;
        ws_->async_close(websocket::close_code::normal, [](beast::error_code) {});
    }
    ws_.reset();
    resolver_.reset();
    if (io_thread_.joinable()) {
        ioc_.stop();
        io_thread_.join();
        ioc_.restart();
    }
    LOG("FeedManager", "disconnect_feed done");
}

void FeedManager::subscribe_topics(const std::vector<std::string> &symbols)
{
    LOG("FeedManager", "subscribe_topics called (" << symbols.size() << " symbols)");
    subscribed_symbols_ = symbols;
}

void FeedManager::set_market_data_callback(MarketDataCallback cb)
{
    LOG("FeedManager", "set_market_data_callback (replacing single callback)");
    callback_ = std::move(cb);
}

void FeedManager::register_observer(MarketDataCallback cb)
{
    LOG("FeedManager", "register_observer added (total observers: " << (observers_.size() + 1) << ")");
    observers_.push_back(std::move(cb));
}

void FeedManager::do_read()
{
    buffer_.consume(buffer_.size());
    ws_->async_read(buffer_,
                    beast::bind_front_handler(&FeedManager::on_read, this));
}

void FeedManager::on_read(beast::error_code ec, std::size_t)
{
    if (ec == websocket::error::closed)
    {
        LOG("FeedManager", "Connection closed by server");
        connected_.store(false);
        schedule_reconnect();
        return;
    }
    if (ec)
    {
        ERR("FeedManager", "read error: " << ec.message());
        connected_.store(false);
        schedule_reconnect();
        return;
    }

    std::string msg = beast::buffers_to_string(buffer_.data());
    handle_message(msg);
    do_read();
}

void FeedManager::handle_message(const std::string &msg)
{
    std::string topic = json_str(msg, "topic");
    if (topic != "ticker_" && topic != "ticker")
        return;

    MarketData md;
    md.symbol = json_str(msg, "symbol");
    md.price = json_num(msg, "price");
    md.bid = json_num(msg, "bid");
    md.ask = json_num(msg, "ask");

    if (md.symbol.empty())
        return;

    latest_data_[md.symbol] = md;
    LOG("FeedManager", "TICK " << md.symbol
                               << " P:" << md.price << " B:" << md.bid << " A:" << md.ask);

    if (callback_)
        callback_(md);
    for (auto &obs : observers_)
        obs(md);
}

MarketData FeedManager::get_feed(const std::string &symbol)
{
    auto it = latest_data_.find(symbol);
    if (it != latest_data_.end())
        return it->second;
    LOG("FeedManager", "get_feed: no data for " << symbol);
    return {};
}