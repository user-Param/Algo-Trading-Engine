#include "../include/engine.h"
#include <iostream>

Engine::Engine() {
    algo_manager_.setFeedManager(&feed_manager_);
}

Engine::~Engine() {
    stop();
}

void Engine::start() {
    running_ = true;
    feed_manager_.start_feed();
    std::cout << "Engine: Started" << std::endl;
}

void Engine::stop() {
    running_ = false;
    feed_manager_.stop_feed();
    std::cout << "Engine: Stopped" << std::endl;
}

void Engine::restart() {
    stop();
    start();
}

bool Engine::isRunning() const {
    return running_;
}

FeedManager& Engine::getFeedManager() {
    return feed_manager_;
}

AlgoManager& Engine::getAlgoManager() {
    return algo_manager_;
}

RiskManager& Engine::getRiskManager() {
    return risk_manager_;
}

SOR& Engine::getSOR() {
    return sor_;
}

StateManager& Engine::getStateManager() {
    return state_manager_;
}

BacktestManager& Engine::getBacktestManager() {
    return backtest_manager_;
}
