#pragma once

#include <string>
#include <vector>
#include "../../algos/include/TradeSignal.h"

struct UserRecord {
    int id = 0;
    std::string username;
};

struct AlgoRecord {
    int id = 0;
    int userId = 0;
    std::string name;
    std::string type;
    bool enabled = false;
};

struct TradeRecord {
    int id = 0;
    int algoId = 0;
    std::string symbol;
    std::string side;
    double price = 0.0;
    double quantity = 0.0;
    std::string status;
};

class StateManager {
public:
    StateManager();
    ~StateManager();

    bool connect(const std::string& connString);
    void disconnect();
    bool isConnected() const;

    int createUser(const std::string& username);
    UserRecord getUser(int id);

    int saveAlgoConfig(const AlgoRecord& algo);
    AlgoRecord getAlgoConfig(int id);
    std::vector<AlgoRecord> listAlgos(int userId);

    int saveTrade(const Signal& signal, int algoId);
    void updateTradeStatus(int tradeId, const std::string& status);
    std::vector<TradeRecord> getTrades(int algoId);

private:
    bool connected_ = false;
    std::string conn_string_;
};
