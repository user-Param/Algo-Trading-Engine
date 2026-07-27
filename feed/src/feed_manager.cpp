#include "feed_manager.h"

#include <boost/beast/websocket/ssl.hpp>
#include <boost/beast/version.hpp>
#include <cctype>
#include <cstdlib>
#include <iostream>

namespace beast = boost::beast;
namespace http = beast::http;
namespace websocket = beast::websocket;
namespace net = boost::asio;
namespace ssl = boost::asio::ssl;
using tcp = boost::asio::ip::tcp;

FeedManager::FeedManager() : ctx_(ssl::context::tlsv12_client) {
    LOG("FeedManager", "Constructed");
}

FeedManager::~FeedManager() {
    LOG("FeedManager", "Destroying");
    disconnect_feed();
}

void FeedManager::set_mode(bool backtest) {
    backtest_mode_ = backtest;
    LOG("FeedManager", (backtest ? "Mode set to BACKTEST" : "Mode set to LIVE"));
}

bool FeedManager::is_backtest() const { return backtest_mode_; }
bool FeedManager::is_connected() const { return connected_; }

void FeedManager::start_feed() {
    LOG("FeedManager", "start_feed called (backtest=" << backtest_mode_ << ", connected=" << connected_ << ")");
    if (!connected_ && !backtest_mode_)
        connect_feed("");
}

void FeedManager::stop_feed() {
    LOG("FeedManager", "stop_feed called");
    disconnect_feed();
}

void FeedManager::restart_feed() {
    LOG("FeedManager", "restart_feed called");
    stop_feed();
    start_feed();
}

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

void FeedManager::connect_feed(const std::string&) {
    if (connected_) {
        LOG("FeedManager", "connect_feed skipped - already connected");
        return;
    }

    LOG("FeedManager", "connect_feed: resolving ...");

    ctx_.set_verify_mode(ssl::verify_peer);
    ctx_.set_default_verify_paths();

    ws_ = std::make_unique<websocket::stream<beast::ssl_stream<beast::tcp_stream>>>(
        net::make_strand(ioc_), ctx_);
    resolver_ = std::make_unique<tcp::resolver>(net::make_strand(ioc_));

    std::string host = "16.192.155.232";
    std::string port = "80";

    if (!SSL_set_tlsext_host_name(ws_->next_layer().native_handle(), host.c_str())) {
        ERR("FeedManager", "SNI failed");
        return;
    }
    ws_->next_layer().set_verify_callback(ssl::host_name_verification(host));
    ws_->text(true);

    resolver_->async_resolve(host, port,
        [this, host, port](beast::error_code ec, tcp::resolver::results_type results)
        {
            if (ec) {
                ERR("FeedManager", "resolve failed: " << ec.message());
                return;
            }
            LOG("FeedManager", "resolve OK, connecting ...");
            beast::get_lowest_layer(*ws_).expires_after(std::chrono::seconds(30));
            beast::get_lowest_layer(*ws_).async_connect(results,
                [this, host, port](beast::error_code ec, tcp::resolver::results_type::endpoint_type)
                {
                    if (ec) {
                        ERR("FeedManager", "connect failed: " << ec.message());
                        return;
                    }
                    LOG("FeedManager", "TCP connected, SSL handshake ...");
                    beast::get_lowest_layer(*ws_).expires_after(std::chrono::seconds(30));
                    ws_->next_layer().async_handshake(ssl::stream_base::client,
                        [this, host, port](beast::error_code ec)
                        {
                            if (ec) {
                                ERR("FeedManager", "SSL handshake failed: " << ec.message());
                                return;
                            }
                            LOG("FeedManager", "SSL handshake OK, WS handshake ...");
                            beast::get_lowest_layer(*ws_).expires_never();
                            ws_->set_option(websocket::stream_base::timeout::suggested(
                                beast::role_type::client));
                            ws_->set_option(websocket::stream_base::decorator(
                                [](websocket::request_type& req)
                                {
                                    req.set(http::field::user_agent,
                                        std::string(BOOST_BEAST_VERSION_STRING) + " feed-manager");
                                }));
                            ws_->async_handshake(host + ":" + port, "/",
                                [this, host, port](beast::error_code ec)
                                {
                                    if (ec) {
                                        ERR("FeedManager", "WS handshake failed: " << ec.message());
                                        return;
                                    }
                                    connected_ = true;
                                    LOG("FeedManager", "Connected to " << host << ":" << port);
                                    ws_->async_write(net::buffer(std::string("_Live")),
                                        [this](beast::error_code ec, std::size_t)
                                        {
                                            if (ec) {
                                                ERR("FeedManager", "write _Live failed: " << ec.message());
                                                return;
                                            }
                                            LOG("FeedManager", "Sent _Live, subscribing ...");
                                            ws_->async_write(net::buffer(std::string(R"({"subscribe":"ticker_"})")),
                                                [this](beast::error_code ec, std::size_t)
                                                {
                                                    if (ec) {
                                                        ERR("FeedManager", "write subscribe failed: " << ec.message());
                                                        return;
                                                    }
                                                    LOG("FeedManager", "Subscribed to ticker_");
                                                    do_read();
                                                });
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

void FeedManager::disconnect_feed() {
    LOG("FeedManager", "disconnect_feed called");
    connected_ = false;
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

void FeedManager::subscribe_topics(const std::vector<std::string>& symbols) {
    LOG("FeedManager", "subscribe_topics called (" << symbols.size() << " symbols)");
    subscribed_symbols_ = symbols;
}

void FeedManager::set_market_data_callback(MarketDataCallback cb) {
    LOG("FeedManager", "set_market_data_callback (replacing single callback)");
    callback_ = std::move(cb);
}

void FeedManager::register_observer(MarketDataCallback cb) {
    LOG("FeedManager", "register_observer added (total observers: " << (observers_.size() + 1) << ")");
    observers_.push_back(std::move(cb));
}

void FeedManager::do_read() {
    buffer_.consume(buffer_.size());
    ws_->async_read(buffer_,
        beast::bind_front_handler(&FeedManager::on_read, this));
}

void FeedManager::on_read(beast::error_code ec, std::size_t) {
    if (ec == websocket::error::closed) {
        LOG("FeedManager", "Connection closed by server");
        connected_ = false;
        return;
    }
    if (ec) {
        ERR("FeedManager", "read error: " << ec.message());
        connected_ = false;
        return;
    }

    std::string msg = beast::buffers_to_string(buffer_.data());
    handle_message(msg);
    do_read();
}

void FeedManager::handle_message(const std::string& msg) {
    std::string topic = json_str(msg, "topic");
    if (topic != "ticker_" && topic != "ticker") return;

    MarketData md;
    md.symbol = json_str(msg, "symbol");
    md.price = json_num(msg, "price");
    md.bid = json_num(msg, "bid");
    md.ask = json_num(msg, "ask");

    if (md.symbol.empty()) return;

    latest_data_[md.symbol] = md;
    LOG("FeedManager", "TICK " << md.symbol
        << " P:" << md.price << " B:" << md.bid << " A:" << md.ask);

    if (callback_) callback_(md);
    for (auto& obs : observers_) obs(md);
}

MarketData FeedManager::get_feed(const std::string& symbol) {
    auto it = latest_data_.find(symbol);
    if (it != latest_data_.end()) return it->second;
    LOG("FeedManager", "get_feed: no data for " << symbol);
    return {};
}
