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

#include "engine/include/engine.h"
#include "algos/include/TradeSignal.h"
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

static std::shared_ptr<EngineContext> global_engine;

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

static std::string handle_api_request(const std::string& target, const std::string& body) {
    if (target == "/api/engine/start") {
        global_engine->engine.start();
        global_engine->initialised = true;
        return R"({"status":"ok","message":"Engine started"})";
    }
    if (target == "/api/engine/stop") {
        global_engine->engine.stop();
        return R"({"status":"ok","message":"Engine stopped"})";
    }
    if (target == "/api/engine/status") {
        return global_engine->engine.isRunning()
            ? R"({"status":"ok","running":true})"
            : R"({"status":"ok","running":false})";
    }
    if (target == "/api/algos/list") {
        auto algos = global_engine->engine.getAlgoManager().listAlgos();
        std::string json = R"({"status":"ok","algos":[)";
        for (size_t i = 0; i < algos.size(); ++i) {
            if (i > 0) json += ",";
            json += "\"" + algos[i] + "\"";
        }
        json += R"(]})";
        return json;
    }
    if (target == "/api/feeds/connect") {
        global_engine->engine.getFeedManager().connect_feed("ws://market-data:8765");
        return R"({"status":"ok","message":"Feed connecting"})";
    }
    if (target == "/api/backtest/start") {
        global_engine->engine.getBacktestManager().start_backtest("BTC/USD", 10000.0);
        return R"({"status":"ok","message":"Backtest started"})";
    }
    if (target == "/api/backtest/stop") {
        global_engine->engine.getBacktestManager().stop_backtest();
        return R"({"status":"ok","message":"Backtest stopped"})";
    }
    return "";
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
        res.keep_alive(req.keep_alive());
        res.body() = json;
        res.prepare_payload();
        return res;
    };

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

        if (msg == "status") {
            response = global_engine->engine.isRunning() ? "running" : "stopped";
            LOG("WSEngine", "Status: " << response);
        } else if (msg.find("subscribe ") == 0) {
            std::string symbol = msg.substr(10);
            global_engine->engine.getFeedManager().subscribe_topics({symbol});
            response = "subscribed to " + symbol;
            LOG("WSEngine", "Subscribe: " << symbol);
        } else if (msg == "start") {
            global_engine->engine.start();
            response = "engine started";
            LOG("WSEngine", "Start command processed");
        } else if (msg == "stop") {
            global_engine->engine.stop();
            response = "engine stopped";
            LOG("WSEngine", "Stop command processed");
        } else {
            response = "unknown command";
            LOG("WSEngine", "Unknown command: " << msg);
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
