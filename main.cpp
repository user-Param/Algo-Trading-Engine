#include <signal.h>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/beast/version.hpp>
#include <boost/asio/bind_executor.hpp>
#include <boost/asio/dispatch.hpp>
#include <boost/asio/strand.hpp>
#include <boost/optional.hpp>
#include <algorithm>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <memory>
#include <queue>
#include <string>
#include <thread>
#include <vector>
#include <sstream>
#include <cmath>
#include <map>
#include <ctime>

#include "engine/include/engine.h"
#include "algos/include/TradeSignal.h"
#include "backtest/include/backtest_manager.h"
#include "common/include/logger.h"

namespace beast = boost::beast;
namespace http = beast::http;
namespace websocket = beast::websocket;
namespace net = boost::asio;
using tcp = boost::asio::ip::tcp;

struct EngineContext {
    Engine engine;
    bool initialised = false;
};

struct PositionEntry {
    std::string symbol;
    double quantity;
    double avg_price;
    double current_price;
    double pnl;
    double unrealized_pnl_pct;
};
static std::vector<PositionEntry> position_store;

static std::shared_ptr<EngineContext> global_engine;

// In-memory algo tracking
struct AlgoDetail {
    std::string name;
    std::string type;
    int userId;
    std::string status;
};
static std::map<std::string, AlgoDetail> algo_details_;

// In-memory trade store
struct TradeEntry {
    int id;
    std::string algoId;
    std::string symbol;
    std::string side;
    double price;
    double quantity;
    std::string status;
    std::string created_at;
    std::string updated_at;
};
static std::vector<TradeEntry> trade_store;
static int next_trade_id = 1;

static std::time_t backtest_start_time_ = 0;
static std::vector<std::string> subscribed_symbols_;

static void handle_signal(int sig) {
    LOG("Server", "Received signal " << sig << ", shutting down");
    if (global_engine) global_engine->engine.stop();
}

beast::string_view
mime_type(beast::string_view path)
{
    using beast::iequals;
    auto const ext = [&path]
    {
        auto const pos = path.rfind(".");
        if(pos == beast::string_view::npos)
            return beast::string_view{};
        return path.substr(pos);
    }();
    if(iequals(ext, ".htm"))  return "text/html";
    if(iequals(ext, ".html")) return "text/html";
    if(iequals(ext, ".php"))  return "text/html";
    if(iequals(ext, ".css"))  return "text/css";
    if(iequals(ext, ".txt"))  return "text/plain";
    if(iequals(ext, ".js"))   return "application/javascript";
    if(iequals(ext, ".json")) return "application/json";
    if(iequals(ext, ".xml"))  return "application/xml";
    if(iequals(ext, ".swf"))  return "application/x-shockwave-flash";
    if(iequals(ext, ".flv"))  return "video/x-flv";
    if(iequals(ext, ".png"))  return "image/png";
    if(iequals(ext, ".jpe"))  return "image/jpeg";
    if(iequals(ext, ".jpeg")) return "image/jpeg";
    if(iequals(ext, ".jpg"))  return "image/jpeg";
    if(iequals(ext, ".gif"))  return "image/gif";
    if(iequals(ext, ".bmp"))  return "image/bmp";
    if(iequals(ext, ".ico"))  return "image/vnd.microsoft.icon";
    if(iequals(ext, ".tiff")) return "image/tiff";
    if(iequals(ext, ".tif"))  return "image/tif";
    if(iequals(ext, ".svg"))  return "image/svg+xml";
    if(iequals(ext, ".svgz")) return "image/svg+xml";
    return "application/text";
}

std::string
path_cat(
    beast::string_view base,
    beast::string_view path)
{
    if(base.empty())
        return std::string(path);
    std::string result(base);
    char constexpr path_separator = '/';
    if(result.back() == path_separator)
        result.resize(result.size() - 1);
    result.append(path.data(), path.size());
    return result;
}

// JSON helper functions
static std::string json_escape(const std::string& s) {
    std::string out;
    for (char c : s) {
        if (c == '"') out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else out += c;
    }
    return out;
}

static std::string extract_json_string(const std::string& json, const std::string& key) {
    auto p = json.find("\"" + key + "\":");
    if (p == std::string::npos) return {};
    p += key.size() + 3;
    while (p < json.size() && (json[p] == ' ' || json[p] == '\t')) p++;
    if (p >= json.size() || json[p] != '"') return {};
    p++;
    std::string v;
    while (p < json.size() && json[p] != '"') v += json[p++];
    return v;
}

static double extract_json_number(const std::string& json, const std::string& key) {
    auto p = json.find("\"" + key + "\":");
    if (p == std::string::npos) return 0.0;
    p += key.size() + 3;
    while (p < json.size() && (json[p] == ' ' || json[p] == '\t')) p++;
    std::string n;
    if (p < json.size() && json[p] == '-') { n += '-'; p++; }
    while (p < json.size() && (std::isdigit(json[p]) || json[p] == '.'))
        n += json[p++];
    return n.empty() ? 0.0 : std::stod(n);
}

static std::string get_query_param(const std::string& target, const std::string& key) {
    auto qpos = target.find('?');
    if (qpos == std::string::npos) return {};
    std::string qs = target.substr(qpos + 1);
    std::string search = key + "=";
    auto p = qs.find(search);
    if (p == std::string::npos) return {};
    p += search.size();
    std::string v;
    while (p < qs.size() && qs[p] != '&') v += qs[p++];
    return v;
}

static std::string path_part(const std::string& target) {
    auto qpos = target.find('?');
    return (qpos == std::string::npos) ? target : target.substr(0, qpos);
}

static std::string build_trade_list_json(const std::vector<TradeEntry>& trades, int total, int page, int limit) {
    std::ostringstream oss;
    oss << R"({"status":"ok","trades":[)";
    for (size_t i = 0; i < trades.size(); ++i) {
        if (i > 0) oss << ",";
        const auto& t = trades[i];
        oss << R"({"id":)" << t.id
            << R"(,"algoId":")" << json_escape(t.algoId) << R"(")"
            << R"(,"symbol":")" << json_escape(t.symbol) << R"(")"
            << R"(,"side":")" << json_escape(t.side) << R"(")"
            << R"(,"price":)" << t.price
            << R"(,"quantity":)" << t.quantity
            << R"(,"status":")" << json_escape(t.status) << R"(")"
            << R"(,"created_at":")" << json_escape(t.created_at) << R"(")"
            << R"(,"updated_at":")" << json_escape(t.updated_at) << R"("})";
    }
    oss << R"(],"total":)" << total
        << R"(,"page":)" << page
        << R"(,"limit":)" << limit
        << R"(})";
    return oss.str();
}

static std::string handle_api_request(const std::string& target, const std::string& body) {
    try {
        std::string path = path_part(target);

        // === Existing Endpoints ===
        if (path == "/api/engine/start") {
            global_engine->engine.start();
            global_engine->initialised = true;
            return R"({"status":"ok","message":"Engine started"})";
        }
        if (path == "/api/engine/stop") {
            global_engine->engine.stop();
            return R"({"status":"ok","message":"Engine stopped"})";
        }
        if (path == "/api/engine/status") {
            return global_engine->engine.isRunning()
                ? R"({"status":"ok","running":true})"
                : R"({"status":"ok","running":false})";
        }
        if (path == "/api/algos/list") {
            auto algos = global_engine->engine.getAlgoManager().listAlgos();
            std::string json = R"({"status":"ok","algos":[)";
            for (size_t i = 0; i < algos.size(); ++i) {
                if (i > 0) json += ",";
                json += "\"" + algos[i] + "\"";
            }
            json += R"(]})";
            return json;
        }
        if (path == "/api/feeds/connect") {
            global_engine->engine.getFeedManager().connect_feed("ws://market-data:8765");
            return R"({"status":"ok","message":"Feed connecting"})";
        }
        if (path == "/api/backtest/start") {
            global_engine->engine.getBacktestManager().start_backtest("BTC/USD", 10000.0);
            backtest_start_time_ = std::time(nullptr);
            return R"({"status":"ok","message":"Backtest started"})";
        }
        if (path == "/api/backtest/stop") {
            global_engine->engine.getBacktestManager().stop_backtest();
            return R"({"status":"ok","message":"Backtest stopped"})";
        }

        // === 1. Algorithm Management ===
        if (path == "/api/algos/start") {
            std::string algoId = extract_json_string(body, "algoId");
            if (algoId.empty()) return R"({"status":"error","message":"Missing algoId"})";
            global_engine->engine.getAlgoManager().startAlgo(algoId);
            auto it = algo_details_.find(algoId);
            if (it != algo_details_.end()) it->second.status = "running";
            return R"({"status":"ok","message":"Algo started"})";
        }
        if (path == "/api/algos/stop") {
            std::string algoId = extract_json_string(body, "algoId");
            if (algoId.empty()) return R"({"status":"error","message":"Missing algoId"})";
            global_engine->engine.getAlgoManager().stopAlgo(algoId);
            auto it = algo_details_.find(algoId);
            if (it != algo_details_.end()) it->second.status = "stopped";
            return R"({"status":"ok","message":"Algo stopped"})";
        }
        if (path == "/api/algos/register") {
            std::string name = extract_json_string(body, "name");
            std::string type = extract_json_string(body, "type");
            double userId = extract_json_number(body, "userId");
            if (name.empty() || type.empty())
                return R"({"status":"error","message":"Missing name or type"})";
            auto algo = global_engine->engine.getAlgoManager().createAlgo(type);
            if (!algo)
                return R"({"status":"error","message":"Unknown algo type: )" + type + R"("})";
            std::string id = algo->getId();
            global_engine->engine.getAlgoManager().registerAlgo(std::move(algo));
            algo_details_[id] = {name, type, static_cast<int>(userId), "stopped"};
            return R"({"status":"ok","message":"Algo registered","algoId":")" + id + R"("})";
        }
        if (path.find("/api/algos/details/") == 0) {
            std::string id = path.substr(19);
            auto it = algo_details_.find(id);
            if (it == algo_details_.end())
                return R"({"status":"error","message":"Algo not found"})";
            std::ostringstream oss;
            oss << R"({"status":"ok")"
                << R"(,"algoId":")" << json_escape(id) << R"(")"
                << R"(,"name":")" << json_escape(it->second.name) << R"(")"
                << R"(,"type":")" << json_escape(it->second.type) << R"(")"
                << R"(,"userId":)" << it->second.userId
                << R"(,"status":")" << json_escape(it->second.status) << R"(")"
                << R"(})";
            return oss.str();
        }

        // === 2. Feed Management ===
        if (path == "/api/feeds/status") {
            bool connected = global_engine->engine.getFeedManager().is_connected();
            std::string json = R"({"status":"ok","connected":)" + std::string(connected ? "true" : "false") + R"(,"symbols":[)";
            for (size_t i = 0; i < subscribed_symbols_.size(); ++i) {
                if (i > 0) json += ",";
                json += "\"" + subscribed_symbols_[i] + "\"";
            }
            json += R"(]})";
            return json;
        }
        if (path == "/api/feeds/disconnect") {
            global_engine->engine.getFeedManager().disconnect_feed();
            return R"({"status":"ok","message":"Feed disconnected"})";
        }
        if (path.find("/api/feed/latest/") == 0) {
            std::string symbol = path.substr(16);
            MarketData md = global_engine->engine.getFeedManager().get_feed(symbol);
            if (md.symbol.empty()) {
                return R"({"status":"error","message":"No data for symbol"})";
            }
            std::ostringstream oss;
            oss << R"({"status":"ok")"
                << R"(,"symbol":")" << json_escape(md.symbol) << R"(")"
                << R"(,"price":)" << md.price
                << R"(,"bid":)" << md.bid
                << R"(,"ask":)" << md.ask
                << R"(,"timestamp":)" << md.timestamp
                << R"(})";
            return oss.str();
        }

        // === 3. Performance & Monitoring ===
        if (path == "/api/engine/metrics") {
            std::ostringstream oss;
            oss << R"({"status":"ok")"
                << R"(,"mode":"live")"
                << R"(,"total_signals":1250)"
                << R"(,"accepted_signals":1150)"
                << R"(,"rejected_signals":100)"
                << R"(,"total_trades":150)"
                << R"(,"winning_trades":98)"
                << R"(,"losing_trades":52)"
                << R"(,"win_rate":65.33)"
                << R"(,"total_pnl":24500.50)"
                << R"(})";
            return oss.str();
        }
        if (path == "/api/risk/metrics") {
            std::ostringstream oss;
            oss << R"({"status":"ok")"
                << R"(,"max_quantity":100000)"
                << R"(,"max_leverage":100)"
                << R"(,"total_exposure":15000.00)"
                << R"(,"daily_pnl":1250.00)"
                << R"(,"weekly_pnl":8400.00)"
                << R"(,"monthly_pnl":24500.00)"
                << R"(,"open_positions":3)"
                << R"(})";
            return oss.str();
        }
        if (path == "/api/health") {
            bool engine_running = global_engine->engine.isRunning();
            bool feed_connected = global_engine->engine.getFeedManager().is_connected();
            bool db_connected = global_engine->engine.getStateManager().isConnected();
            std::ostringstream oss;
            oss << R"({"status":"ok")"
                << R"(,"engine":)" << (engine_running ? "true" : "false")
                << R"(,"feed":)" << (feed_connected ? "true" : "false")
                << R"(,"database":)" << (db_connected ? "true" : "false")
                << R"(})";
            return oss.str();
        }

        // === 4. Trade History ===
        if (path.find("/api/trades/algo/") == 0) {
            std::string algoId = path.substr(17);
            int limit = 20, page = 1;
            std::string ls = get_query_param(target, "limit");
            if (!ls.empty()) limit = std::stoi(ls);
            std::string ps = get_query_param(target, "page");
            if (!ps.empty()) page = std::stoi(ps);
            std::vector<TradeEntry> filtered;
            for (const auto& t : trade_store)
                if (t.algoId == algoId) filtered.push_back(t);
            int total = static_cast<int>(trade_store.size());
            int start = (page - 1) * limit;
            if (start < 0) start = 0;
            int end = std::min(start + limit, static_cast<int>(filtered.size()));
            std::vector<TradeEntry> page_trades;
            for (int i = start; i < end; ++i) page_trades.push_back(filtered[i]);
            return build_trade_list_json(page_trades, total, page, limit);
        }
        if (path.find("/api/trades/status/") == 0) {
            std::string status = path.substr(18);
            int limit = 20, page = 1;
            std::string ls = get_query_param(target, "limit");
            if (!ls.empty()) limit = std::stoi(ls);
            std::string ps = get_query_param(target, "page");
            if (!ps.empty()) page = std::stoi(ps);
            std::vector<TradeEntry> filtered;
            for (const auto& t : trade_store)
                if (t.status == status) filtered.push_back(t);
            int total = static_cast<int>(trade_store.size());
            int start = (page - 1) * limit;
            if (start < 0) start = 0;
            int end = std::min(start + limit, static_cast<int>(filtered.size()));
            std::vector<TradeEntry> page_trades;
            for (int i = start; i < end; ++i) page_trades.push_back(filtered[i]);
            return build_trade_list_json(page_trades, total, page, limit);
        }
        if (path == "/api/trades") {
            int limit = 20, page = 1;
            std::string ls = get_query_param(target, "limit");
            if (!ls.empty()) limit = std::stoi(ls);
            std::string ps = get_query_param(target, "page");
            if (!ps.empty()) page = std::stoi(ps);
            int total = static_cast<int>(trade_store.size());
            int start = (page - 1) * limit;
            if (start < 0) start = 0;
            int end = std::min(start + limit, total);
            std::vector<TradeEntry> page_trades;
            for (int i = start; i < end; ++i) page_trades.push_back(trade_store[i]);
            return build_trade_list_json(page_trades, total, page, limit);
        }
        if (path == "/api/orders") {
    // Parse JSON body (simplified – use a proper JSON library in production)
    std::string symbol = extract_json_string(body, "symbol");
    std::string side = extract_json_string(body, "side");
    double price = extract_json_number(body, "price");
    double quantity = extract_json_number(body, "quantity");
    double leverage = extract_json_number(body, "leverage");
    if (leverage == 0) leverage = 1.0;
    double stopLoss = extract_json_number(body, "stopLoss");
    double takeProfit = extract_json_number(body, "takeProfit");

    // Validate required fields
    if (symbol.empty() || side.empty() || price <= 0 || quantity <= 0) {
        return R"({"status":"error","message":"Missing required fields"})";
    }

    // Create Signal
    Signal sig;
    sig.symbol = symbol;
    sig.side = side;
    sig.price = price;
    sig.quantity = quantity;
    sig.leverage = leverage;
    sig.stopLoss = stopLoss;
    sig.takeProfit = takeProfit;
    sig.algoId = "terminal";
    sig.timestamp = std::time(nullptr);

    // Validate via RiskManager
    auto result = global_engine->engine.getRiskManager().validateSignal(sig);
    if (!result.passed) {
        return R"({"status":"error","message":")" + result.reason + R"("})";
    }

    // Send to SOR (will store and simulate execution)
    global_engine->engine.getSOR().send_order(sig.price, sig.quantity, static_cast<int>(sig.leverage), sig.side);

    // Return success (SOR will assign an ID and store)
    // We could return the trade ID, but for simplicity we just return ok
    return R"({"status":"ok","message":"Order placed"})";
}

if (path == "/api/signals/manual") {
    std::string symbol = extract_json_string(body, "symbol");
    std::string side = extract_json_string(body, "side");
    double price = extract_json_number(body, "price");
    double quantity = extract_json_number(body, "quantity");
    double leverage = extract_json_number(body, "leverage");
    if (leverage <= 0) leverage = 1.0;
    double stopLoss = extract_json_number(body, "stopLoss");
    double takeProfit = extract_json_number(body, "takeProfit");

    if (symbol.empty() || side.empty() || price <= 0 || quantity <= 0) {
        return R"({"status":"error","message":"Missing required fields"})";
    }

    if (!global_engine->engine.isRunning()) {
        return R"({"status":"error","message":"Engine is not running"})";
    }

    Signal sig;
    sig.symbol = symbol;
    sig.side = side;
    sig.price = price;
    sig.quantity = quantity;
    sig.leverage = leverage;
    sig.stopLoss = stopLoss;
    sig.takeProfit = takeProfit;
    sig.algoId = "manual";
    sig.timestamp = static_cast<uint64_t>(std::time(nullptr));

    RiskCheckResult result = global_engine->engine.getRiskManager().validateSignal(sig);
    if (!result.passed) {
        return R"({"status":"error","message":")" + json_escape(result.reason) + R"("})";
    }

    // Send to SOR
    global_engine->engine.getSOR().send_order(sig.price, sig.quantity, static_cast<int>(sig.leverage), sig.side);
    std::ostringstream oss;
    oss << R"({"algoId":")" << sig.algoId << R"(","symbol":")" << sig.symbol
        << R"(","side":")" << sig.side << R"(","price":)" << sig.price
        << R"(,"quantity":)" << sig.quantity << R"(,"leverage":)" << sig.leverage
        << R"(})";
    global_engine->engine.getSOR().send_signal(oss.str());

    // Record trade
    TradeEntry trade;
    trade.id = next_trade_id++;
    trade.algoId = sig.algoId;
    trade.symbol = sig.symbol;
    trade.side = sig.side;
    trade.price = sig.price;
    trade.quantity = sig.quantity;
    trade.status = "filled";   // ← FIXED: was "filled" || "pending"
    trade.created_at = std::to_string(std::time(nullptr));
    trade.updated_at = trade.created_at;
    trade_store.push_back(trade);

    // --- Create a new independent position for this trade (no netting) ---
    PositionEntry pos;
    pos.symbol = sig.symbol;
    pos.quantity = (sig.side == "buy") ? sig.quantity : -sig.quantity;
    pos.avg_price = sig.price;
    pos.current_price = sig.price;
    pos.pnl = 0;
    pos.unrealized_pnl_pct = 0;
    position_store.push_back(pos);

    return R"({"status":"ok","message":"Signal sent","tradeId":)" + std::to_string(trade.id) + R"(})";
}

        if (path == "/api/positions") {
    std::ostringstream oss;
    oss << R"({"status":"ok","positions":[)";
    bool first = true;
    for (const auto& pos : position_store) {
        if (!first) oss << ",";
        first = false;

        // Get latest price from feed
        MarketData md = global_engine->engine.getFeedManager().get_feed(pos.symbol);
        double current_price = (md.price > 0) ? md.price : pos.current_price;

        double pnl = (current_price - pos.avg_price) * pos.quantity;
        double pnl_pct = pos.avg_price != 0 ? ((current_price - pos.avg_price) / pos.avg_price) * 100.0 : 0.0;

        oss << R"({"symbol":")" << json_escape(pos.symbol) << R"(")"
            << R"(,"quantity":)" << pos.quantity
            << R"(,"avg_price":)" << pos.avg_price
            << R"(,"current_price":)" << current_price
            << R"(,"pnl":)" << pnl
            << R"(,"unrealized_pnl_pct":)" << pnl_pct
            << R"(})";
    }
    oss << R"(]})";
    return oss.str();
}

        // === 5. Backtest Management (Enhanced) ===
        if (path == "/api/backtest/status") {
            bool running = global_engine->engine.getBacktestManager().is_running();
            BacktestingResult res = global_engine->engine.getBacktestManager().get_results();
            double elapsed = 0.0;
            if (running && backtest_start_time_ > 0)
                elapsed = std::difftime(std::time(nullptr), backtest_start_time_);
            double progress = running ? std::min(100.0, (elapsed / 60.0) * 100.0) : 0.0;
            double current_capital = res.endCapital > 0 ? res.endCapital : res.startCapital;
            std::ostringstream oss;
            oss << R"({"status":"ok")"
                << R"(,"running":)" << (running ? "true" : "false")
                << R"(,"symbol":")" << json_escape(res.symbol) << R"(")"
                << R"(,"progress":)" << progress
                << R"(,"start_capital":)" << res.startCapital
                << R"(,"current_capital":)" << current_capital
                << R"(,"elapsed_seconds":)" << elapsed
                << R"(})";
            return oss.str();
        }
        if (path == "/api/backtest/results") {
            BacktestingResult res = global_engine->engine.getBacktestManager().get_results();
            std::ostringstream oss;
            oss << R"({"status":"ok")"
                << R"(,"symbol":")" << json_escape(res.symbol) << R"(")"
                << R"(,"startDate":")" << json_escape(res.startDate) << R"(")"
                << R"(,"endDate":")" << json_escape(res.endDate) << R"(")"
                << R"(,"startCapital":)" << res.startCapital
                << R"(,"endCapital":)" << res.endCapital
                << R"(,"winRate":)" << res.winRate
                << R"(,"totalTrades":)" << res.totalTrades
                << R"(,"winningTrades":)" << res.winningTrades
                << R"(,"losingTrades":)" << res.losingTrades
                << R"(,"profitFactor":)" << res.profitFactor
                << R"(,"avgWin":)" << res.avgWin
                << R"(,"avgLoss":)" << res.avgLoss
                << R"(})";
            return oss.str();
        }

        return "";
    } catch (const std::exception& e) {
        return R"({"status":"error","message":")" + json_escape(e.what()) + R"("})";
    }
}

template <class Body>
void set_cors(http::response<Body>& res)
{
    res.set(http::field::access_control_allow_origin, "*");
    res.set(http::field::access_control_allow_methods, "GET,POST,OPTIONS");
    res.set(http::field::access_control_allow_headers, "Content-Type");
}

template <class Body, class Allocator>
http::message_generator
handle_request(
    beast::string_view doc_root,
    http::request<Body, http::basic_fields<Allocator>>&& req)
{
    auto const bad_request =
    [&req](beast::string_view why)
    {
        http::response<http::string_body> res{http::status::bad_request, req.version()};
        res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
        res.set(http::field::content_type, "text/html");
        set_cors(res);
        res.keep_alive(req.keep_alive());
        res.body() = std::string(why);
        res.prepare_payload();
        return res;
    };

    auto const not_found =
    [&req](beast::string_view target)
    {
        http::response<http::string_body> res{http::status::not_found, req.version()};
        res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
        res.set(http::field::content_type, "text/html");
        set_cors(res);
        res.keep_alive(req.keep_alive());
        res.body() = "The resource '" + std::string(target) + "' was not found.";
        res.prepare_payload();
        return res;
    };

    auto const server_error =
    [&req](beast::string_view what)
    {
        http::response<http::string_body> res{http::status::internal_server_error, req.version()};
        res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
        res.set(http::field::content_type, "text/html");
        set_cors(res);
        res.keep_alive(req.keep_alive());
        res.body() = "An error occurred: '" + std::string(what) + "'";
        res.prepare_payload();
        return res;
    };

    auto const json_response =
    [&req](const std::string& json)
    {
        http::response<http::string_body> res{http::status::ok, req.version()};
        res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
        res.set(http::field::content_type, "application/json");
        set_cors(res);
        res.keep_alive(req.keep_alive());
        res.body() = json;
        res.prepare_payload();
        return res;
    };

    // Answer CORS preflight requests
    if (req.method() == http::verb::options) {
        http::response<http::empty_body> res{http::status::ok, req.version()};
        res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
        set_cors(res);
        res.content_length(0);
        res.keep_alive(req.keep_alive());
        res.prepare_payload();
        return res;
    }

    std::string target_str(req.target());
    if (target_str.find("/api/") == 0) {
        std::string body = req.body();
        std::string json = handle_api_request(target_str, body);
        if (!json.empty()) {
            return json_response(json);
        }
        return not_found(req.target());
    }

    if( req.method() != http::verb::get &&
        req.method() != http::verb::head)
        return bad_request("Unknown HTTP-method");

    if( req.target().empty() ||
        req.target()[0] != '/' ||
        req.target().find("..") != beast::string_view::npos)
        return bad_request("Illegal request-target");

    std::string path = path_cat(doc_root, req.target());
    if(req.target().back() == '/')
        path.append("index.html");

    beast::error_code ec;
    http::file_body::value_type body;
    body.open(path.c_str(), beast::file_mode::scan, ec);

    if(ec == beast::errc::no_such_file_or_directory)
        return not_found(req.target());

    if(ec)
        return server_error(ec.message());

    auto const size = body.size();

    if(req.method() == http::verb::head)
    {
        http::response<http::empty_body> res{http::status::ok, req.version()};
        res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
        res.set(http::field::content_type, mime_type(path));
        set_cors(res);
        res.content_length(size);
        res.keep_alive(req.keep_alive());
        return res;
    }

    http::response<http::file_body> res{
        std::piecewise_construct,
        std::make_tuple(std::move(body)),
        std::make_tuple(http::status::ok, req.version())};
    res.set(http::field::server, BOOST_BEAST_VERSION_STRING);
    res.set(http::field::content_type, mime_type(path));
    set_cors(res);
    res.content_length(size);
    res.keep_alive(req.keep_alive());
    return res;
}

void
fail(beast::error_code ec, char const* what)
{
    std::cerr << what << ": " << ec.message() << "\n";
}

class engine_websocket_session : public std::enable_shared_from_this<engine_websocket_session>
{
    websocket::stream<beast::tcp_stream> ws_;
    beast::flat_buffer buffer_;

public:
    explicit
    engine_websocket_session(tcp::socket&& socket)
        : ws_(std::move(socket))
    {
    }

    template<class Body, class Allocator>
    void
    do_accept(http::request<Body, http::basic_fields<Allocator>> req)
    {
        ws_.set_option(
            websocket::stream_base::timeout::suggested(
                beast::role_type::server));

        ws_.set_option(websocket::stream_base::decorator(
            [](websocket::response_type& res)
            {
                res.set(http::field::server,
                    std::string(BOOST_BEAST_VERSION_STRING) +
                        " engine-server");
            }));

        ws_.async_accept(
            req,
            beast::bind_front_handler(
                &engine_websocket_session::on_accept,
                shared_from_this()));
    }

private:
    void
    on_accept(beast::error_code ec)
    {
        if(ec)
            return fail(ec, "accept");
        do_read();
    }

    void
    do_read()
    {
        ws_.async_read(
            buffer_,
            beast::bind_front_handler(
                &engine_websocket_session::on_read,
                shared_from_this()));
    }

    void
    on_read(
        beast::error_code ec,
        std::size_t bytes_transferred)
    {
        boost::ignore_unused(bytes_transferred);

        if(ec == websocket::error::closed)
            return;

        if(ec)
            return fail(ec, "read");

        std::string msg = beast::buffers_to_string(buffer_.data());
        LOG("WSEngine", "Received: " << msg);
        std::string response;

        std::string type = extract_json_string(msg, "type");
        if (!type.empty()) {
            // --- JSON protocol (dashboard) ---
            if (type == "subscribe") {
                std::string topic = extract_json_string(msg, "topic");
                if (topic.empty()) {
                    response = R"({"type":"error","message":"missing topic"})";
                } else {
                    global_engine->engine.getFeedManager().subscribe_topics({topic});
                    subscribed_symbols_.push_back(topic);
                    response = R"({"type":"subscribed","topic":")" + json_escape(topic) + R"("})";
                    LOG("WSEngine", "Subscribe: " << topic);
                }
            } else if (type == "status") {
                response = std::string(R"({"type":"status","data":{"status":")") +
                            (global_engine->engine.isRunning() ? "running" : "stopped") + R"("}})";
                LOG("WSEngine", "Status: " << response);
            } else if (type == "start") {
                global_engine->engine.start();
                response = R"({"type":"started","message":"engine started"})";
                LOG("WSEngine", "Start command processed");
            } else if (type == "stop") {
                global_engine->engine.stop();
                response = R"({"type":"stopped","message":"engine stopped"})";
                LOG("WSEngine", "Stop command processed");
            } else {
                response = R"({"type":"error","message":"unknown command type"})";
                LOG("WSEngine", "Unknown command type: " << type);
            }
        } else {
            // --- Plain-text protocol (test scripts) ---
            if (msg == "status") {
                response = std::string(R"({"type":"status","data":{"status":")") +
                            (global_engine->engine.isRunning() ? "running" : "stopped") + R"("}})";
                LOG("WSEngine", "Status: " << response);
            } else if (msg.find("subscribe ") == 0) {
                std::string symbol = msg.substr(10);
                global_engine->engine.getFeedManager().subscribe_topics({symbol});
                subscribed_symbols_.push_back(symbol);
                response = R"({"type":"subscribed","topic":")" + json_escape(symbol) + R"("})";
                LOG("WSEngine", "Subscribe: " << symbol);
            } else if (msg == "start") {
                global_engine->engine.start();
                response = R"({"type":"started","message":"engine started"})";
                LOG("WSEngine", "Start command processed");
            } else if (msg == "stop") {
                global_engine->engine.stop();
                response = R"({"type":"stopped","message":"engine stopped"})";
                LOG("WSEngine", "Stop command processed");
            } else {
                response = R"({"type":"error","message":"unknown command"})";
                LOG("WSEngine", "Unknown command: " << msg);
            }
        }

        ws_.text(true);
        ws_.async_write(
            net::buffer(response),
            beast::bind_front_handler(
                &engine_websocket_session::on_write,
                shared_from_this()));
    }

    void
    on_write(
        beast::error_code ec,
        std::size_t bytes_transferred)
    {
        boost::ignore_unused(bytes_transferred);
        if(ec)
            return fail(ec, "write");
        buffer_.consume(buffer_.size());
        do_read();
    }
};

class websocket_session : public std::enable_shared_from_this<websocket_session>
{
    websocket::stream<beast::tcp_stream> ws_;
    beast::flat_buffer buffer_;

public:
    explicit
    websocket_session(tcp::socket&& socket)
        : ws_(std::move(socket))
    {
    }

    template<class Body, class Allocator>
    void
    do_accept(http::request<Body, http::basic_fields<Allocator>> req)
    {
        ws_.set_option(
            websocket::stream_base::timeout::suggested(
                beast::role_type::server));

        ws_.set_option(websocket::stream_base::decorator(
            [](websocket::response_type& res)
            {
                res.set(http::field::server,
                    std::string(BOOST_BEAST_VERSION_STRING) +
                        " advanced-server");
            }));

        ws_.async_accept(
            req,
            beast::bind_front_handler(
                &websocket_session::on_accept,
                shared_from_this()));
    }

private:
    void
    on_accept(beast::error_code ec)
    {
        if(ec)
            return fail(ec, "accept");
        do_read();
    }

    void
    do_read()
    {
        ws_.async_read(
            buffer_,
            beast::bind_front_handler(
                &websocket_session::on_read,
                shared_from_this()));
    }

    void
    on_read(
        beast::error_code ec,
        std::size_t bytes_transferred)
    {
        boost::ignore_unused(bytes_transferred);

        if(ec == websocket::error::closed)
            return;

        if(ec)
            return fail(ec, "read");

        ws_.text(ws_.got_text());
        ws_.async_write(
            buffer_.data(),
            beast::bind_front_handler(
                &websocket_session::on_write,
                shared_from_this()));
    }

    void
    on_write(
        beast::error_code ec,
        std::size_t bytes_transferred)
    {
        boost::ignore_unused(bytes_transferred);

        if(ec)
            return fail(ec, "write");

        buffer_.consume(buffer_.size());
        do_read();
    }
};

class http_session : public std::enable_shared_from_this<http_session>
{
    beast::tcp_stream stream_;
    beast::flat_buffer buffer_;
    std::shared_ptr<std::string const> doc_root_;

    static constexpr std::size_t queue_limit = 8;
    std::queue<http::message_generator> response_queue_;

    boost::optional<http::request_parser<http::string_body>> parser_;

public:
    http_session(
        tcp::socket&& socket,
        std::shared_ptr<std::string const> const& doc_root)
        : stream_(std::move(socket))
        , doc_root_(doc_root)
    {
        static_assert(queue_limit > 0,
                      "queue limit must be positive");
    }

    void
    run()
    {
        net::dispatch(
            stream_.get_executor(),
            beast::bind_front_handler(
                &http_session::do_read,
                this->shared_from_this()));
    }

private:
    void
    do_read()
    {
        parser_.emplace();
        parser_->body_limit(10000);
        stream_.expires_after(std::chrono::seconds(30));

        http::async_read(
            stream_,
            buffer_,
            *parser_,
            beast::bind_front_handler(
                &http_session::on_read,
                shared_from_this()));
    }

    void
    on_read(beast::error_code ec, std::size_t bytes_transferred)
    {
        boost::ignore_unused(bytes_transferred);

        if(ec == http::error::end_of_stream)
            return do_close();

        if(ec)
            return fail(ec, "read");

        if(websocket::is_upgrade(parser_->get()))
        {
            std::string target(parser_->get().target());
            if (target.find("/engine") != std::string::npos) {
                std::make_shared<engine_websocket_session>(
                    stream_.release_socket())->do_accept(parser_->release());
            } else {
                std::make_shared<websocket_session>(
                    stream_.release_socket())->do_accept(parser_->release());
            }
            return;
        }

        queue_write(handle_request(*doc_root_, parser_->release()));

        if (response_queue_.size() < queue_limit)
            do_read();
    }

    void
    queue_write(http::message_generator response)
    {
        response_queue_.push(std::move(response));

        if (response_queue_.size() == 1)
            do_write();
    }

    void
    do_write()
    {
        if(! response_queue_.empty())
        {
            bool keep_alive = response_queue_.front().keep_alive();

            beast::async_write(
                stream_,
                std::move(response_queue_.front()),
                beast::bind_front_handler(
                    &http_session::on_write,
                    shared_from_this(),
                    keep_alive));
        }
    }

    void
    on_write(
        bool keep_alive,
        beast::error_code ec,
        std::size_t bytes_transferred)
    {
        boost::ignore_unused(bytes_transferred);

        if(ec)
            return fail(ec, "write");

        if(! keep_alive)
        {
            return do_close();
        }

        if(response_queue_.size() == queue_limit)
            do_read();

        response_queue_.pop();

        do_write();
    }

    void
    do_close()
    {
        beast::error_code ec;
        stream_.socket().shutdown(tcp::socket::shutdown_send, ec);
    }
};

class listener : public std::enable_shared_from_this<listener>
{
    net::io_context& ioc_;
    tcp::acceptor acceptor_;
    std::shared_ptr<std::string const> doc_root_;

public:
    listener(
        net::io_context& ioc,
        tcp::endpoint endpoint,
        std::shared_ptr<std::string const> const& doc_root)
        : ioc_(ioc)
        , acceptor_(net::make_strand(ioc))
        , doc_root_(doc_root)
    {
        beast::error_code ec;

        acceptor_.open(endpoint.protocol(), ec);
        if(ec)
        {
            fail(ec, "open");
            return;
        }

        acceptor_.set_option(net::socket_base::reuse_address(true), ec);
        if(ec)
        {
            fail(ec, "set_option");
            return;
        }

        acceptor_.bind(endpoint, ec);
        if(ec)
        {
            fail(ec, "bind");
            return;
        }

        acceptor_.listen(
            net::socket_base::max_listen_connections, ec);
        if(ec)
        {
            fail(ec, "listen");
            return;
        }
    }

    void
    run()
    {
        std::cout << "Listening on: " << acceptor_.local_endpoint() << std::endl;
        net::dispatch(
            acceptor_.get_executor(),
            beast::bind_front_handler(
                &listener::do_accept,
                this->shared_from_this()));
    }

private:
    void
    do_accept()
    {
        acceptor_.async_accept(
            net::make_strand(ioc_),
            beast::bind_front_handler(
                &listener::on_accept,
                shared_from_this()));
    }

    void
    on_accept(beast::error_code ec, tcp::socket socket)
    {
        if(ec)
        {
            if (ec == net::error::operation_aborted || ec == beast::errc::bad_file_descriptor || ec == beast::errc::invalid_argument) {
                LOG("Server", "Acceptor closed, stopping accept loop");
                return;
            }
            fail(ec, "accept");
        }
        else
        {
            LOG("Server", "New HTTP connection from " << socket.remote_endpoint());
            std::make_shared<http_session>(
                std::move(socket),
                doc_root_)->run();
        }

        do_accept();
    }
};

int main(int argc, char* argv[])
{
    if (argc != 5)
    {
        std::cerr <<
            "Usage: advanced-server <address> <port> <doc_root> <threads>\n" <<
            "Example:\n" <<
            "    advanced-server 0.0.0.0 8080 . 1\n";
        return EXIT_FAILURE;
    }

    global_engine = std::make_shared<EngineContext>();
    LOG("Server", "EngineContext created");

    LOG("Server", "Listening on " << argv[1] << ":" << argv[2]);

    auto const address = net::ip::make_address(argv[1]);
    auto const port = static_cast<unsigned short>(std::atoi(argv[2]));
    auto const doc_root = std::make_shared<std::string>(argv[3]);
    auto const threads = std::max<int>(1, std::atoi(argv[4]));

    net::io_context ioc{threads};

    std::make_shared<listener>(
        ioc,
        tcp::endpoint{address, port},
        doc_root)->run();

    struct sigaction sa;
    sa.sa_handler = handle_signal;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    sigaction(SIGINT, &sa, nullptr);
    sigaction(SIGTERM, &sa, nullptr);

    std::vector<std::thread> v;
    v.reserve(threads - 1);
    for(auto i = threads - 1; i > 0; --i)
        v.emplace_back(
        [&ioc]
        {
            ioc.run();
        });
    ioc.run();

    for(auto& t : v)
        t.join();

    return EXIT_SUCCESS;
}
