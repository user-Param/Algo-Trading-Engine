#pragma once

#include <ctime>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>

inline std::string now_str() {
    std::time_t t = std::time(nullptr);
    std::tm tm;
    localtime_r(&t, &tm);
    std::ostringstream os;
    os << std::put_time(&tm, "%H:%M:%S");
    return os.str();
}

#define LOG(comp, msg)    std::cout << "[" << now_str() << "] [" << comp << "] " << msg << std::endl
#define ERR(comp, msg)    std::cerr << "[" << now_str() << "] [ERROR] [" << comp << "] " << msg << std::endl
