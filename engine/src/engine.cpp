#include "../include/engine.h"
#include "common/include/logger.h"
#include <iostream>

Engine::Engine() {
    LOG("Engine", "Constructed");
    algo_manager_.setFeedManager(&feed_manager_);
    state_manager_.connect();
}

Engine::~Engine() {
    LOG("Engine", "Destroying");
    stop();
    LOG("Engine", "Destroyed");
}

void Engine::start() {
    LOG("Engine", "start() called");
    running_ = true;
    feed_manager_.start_feed();
    LOG("Engine", "Started");
}

void Engine::stop() {
    LOG("Engine", "stop() called");
    running_ = false;
    feed_manager_.stop_feed();
    LOG("Engine", "Stopped");
}

void Engine::restart() {
    LOG("Engine", "restart() called");
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
