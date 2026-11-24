#pragma once
#include <iostream>
#include <string>

// Course-provided test helper. Every check prints the observed and expected value.
template <class T, class U>
bool check(const std::string& label, T actual, U expected) {
    bool passed = actual == expected;
    std::cout << (passed ? "PASS " : "TRY  ") << label
              << " | got " << actual << ", expected " << expected << '\n';
    return passed;
}
