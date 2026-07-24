#pragma once

#include <cstdint>
#include <string>

class SOR {
public:
    SOR();
    ~SOR();

    void connect_route(const std::string& url);
    void disconnect_route();
    bool is_connected() const;

    void send_order(uint64_t price, uint64_t quantity, int leverage, const std::string& side);
    void send_signal(const std::string& signal_json);

private:
    bool connected_ = false;
    std::string route_url_;
};
