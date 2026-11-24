#include "check.hpp"

// A function takes named input and returns one value to its caller.
float seconds_to_ms(float seconds) {
    return seconds * 1000.0f;
}

float fps(float milliseconds) {
    // STUDENT: Replace this placeholder using seconds_to_ms(1.0f).
    return seconds_to_ms(1.0f) / milliseconds;
}

int main() {
    std::cout << "One quarter second is " << seconds_to_ms(0.25f) << " milliseconds.\n";
    bool first = check("25 ms frame", fps(25.0f), 40.0f);
    bool second = check("8 ms frame", fps(8.0f), 125.0f);
    return first && second ? 0 : 1;
}
