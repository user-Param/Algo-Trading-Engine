cmake_minimum_required(VERSION 3.14)
project(AlgoTradingEngine CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Boost CONFIG QUIET)
if(NOT Boost_FOUND)
    find_package(Boost QUIET)
endif()

find_package(OpenSSL REQUIRED)
find_package(PostgreSQL QUIET)
find_package(libpqxx QUIET)
if(NOT libpqxx_FOUND)
    find_path(PQXX_INCLUDE_DIR pqxx/pqxx)
    find_library(PQXX_LIBRARY NAMES pqxx libpqxx)
    if(PQXX_INCLUDE_DIR AND PQXX_LIBRARY)
        set(libpqxx_FOUND TRUE)
        set(PQXX_INCLUDE_DIRS ${PQXX_INCLUDE_DIR})
        set(PQXX_LIBRARIES ${PQXX_LIBRARY})
    endif()
endif()

add_executable(algo_engine
    main.cpp
    engine/src/engine.cpp
    feed/src/feed_manager.cpp
    manager/src/algo_manager.cpp
    risk/src/riskManager.cpp
    sor/src/smart_order_router.cpp
    state/src/state_manager.cpp
    backtest/src/backtest_manager.cpp
    algos/src/test_algo1.cpp
)

target_include_directories(algo_engine PRIVATE
    ${CMAKE_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/algos/include
    ${CMAKE_SOURCE_DIR}/engine/include
    ${CMAKE_SOURCE_DIR}/feed/include
    ${CMAKE_SOURCE_DIR}/manager/include
    ${CMAKE_SOURCE_DIR}/risk/include
    ${CMAKE_SOURCE_DIR}/sor/include
    ${CMAKE_SOURCE_DIR}/state/include
    ${CMAKE_SOURCE_DIR}/backtest/include
)

if(Boost_FOUND)
    target_link_libraries(algo_engine PRIVATE Boost::headers)
    target_compile_definitions(algo_engine PRIVATE BOOST_ASIO_NO_DEPRECATED)
    message(STATUS "Boost found: ${Boost_DIR}")
else()
    message(WARNING "Boost not found - build may fail")
endif()

if(PostgreSQL_FOUND AND libpqxx_FOUND)
    target_include_directories(algo_engine PRIVATE ${PQXX_INCLUDE_DIRS})
    target_link_libraries(algo_engine PRIVATE PostgreSQL::PostgreSQL ${PQXX_LIBRARIES})
    target_compile_definitions(algo_engine PRIVATE USE_POSTGRESQL)
    message(STATUS "PostgreSQL + libpqxx found - USE_POSTGRESQL enabled")
endif()
