#include "../include/smart_order_router.h"
#include "common/include/logger.h"
#include <iostream>

SOR::SOR() : connected_(false) {
    LOG("SOR", "Constructed");
}

SOR::~SOR() {
    LOG("SOR", "Destroying");
    disconnect_route();
}

void SOR::connect_route(const std::string& url) {
    try {
        route_url_ = url;
        connected_ = true;
        LOG("SOR", "Connected to route: " << url);
    } catch (const std::exception& e) {
        ERR("SOR", "Failed to connect: " << e.what());
    }
}

void SOR::disconnect_route() {
    connected_ = false;
    LOG("SOR", "Disconnected from route");
}

bool SOR::is_connected() const {
    return connected_;
}

void SOR::send_order(uint64_t price, uint64_t quantity, int leverage, const std::string& side) {
    try {
        LOG("SOR", "Order sent - " << side << " " << quantity << " @ " << price
            << " (leverage: " << leverage << "x)");
    } catch (const std::exception& e) {
        ERR("SOR", "Failed to send order: " << e.what());
    }
}

void SOR::send_signal(const std::string& signal_json) {
    try {
        LOG("SOR", "Publishing signal: " << signal_json);
    } catch (const std::exception& e) {
        ERR("SOR", "Failed to publish signal: " << e.what());
    }
}
