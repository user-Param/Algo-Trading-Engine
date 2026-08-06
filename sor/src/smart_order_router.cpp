#include "../include/smart_order_router.h"
#include <iostream>

SOR::SOR() : connected_(false) {}

SOR::~SOR() {
    disconnect_route();
}

void SOR::connect_route(const std::string& url) {
    try {
        route_url_ = url;
        connected_ = true;
        std::cout << "SOR: Connected to route " << url << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "SOR: Failed to connect: " << e.what() << std::endl;
    }
}

void SOR::disconnect_route() {
    connected_ = false;
    std::cout << "SOR: Disconnected from route" << std::endl;
}

bool SOR::is_connected() const {
    return connected_;
}

void SOR::send_order(double price, double quantity, int leverage, const std::string& side) {
    try {
        std::cout << "SOR: Order sent - " << side << " " << quantity << " @ " << price
                  << " (leverage: " << leverage << "x)" << std::endl;
    } catch (const std::exception& e) {
        std::cout << "SOR: Failed to send order: " << e.what() << std::endl;
    }
}

void SOR::send_signal(const std::string& signal_json) {
    try {
        std::cout << "SOR: Publishing signal: " << signal_json << std::endl;
    } catch (const std::exception& e) {
        std::cout << "SOR: Failed to publish signal: " << e.what() << std::endl;
    }
}