#include "check.hpp"
#include <vector>

int total(const std::vector<int>& samples) {
    int sum = 0;
    for (int sample : samples) {
        sum += sample;
    }
    return sum;
}

int count_over(const std::vector<int>& samples, int budget) {
    // STUDENT: Count frames strictly over budget. Keep the input unchanged.
    int count = 0;
    for (int sample : samples) {
        if (sample > budget)
            count += 1;
    }
    return count;
}

int total_lateness(const std::vector<int>& samples, int budget) {
    int late_sum = 0;
    for (int sample : samples) {
        if (sample > budget)
            late_sum += (sample - budget);
    }
    return late_sum;
}

int main() {
    std::vector<int> frames = {10, 16, 25, 17};
    std::cout << "Total frame time: " << total(frames) << " ms\n";
    bool a = check("strictly over 16", count_over(frames, 16), 2);
    bool b = check("exact tie", count_over({16}, 16), 0);
    bool c = check("empty trace", count_over({}, 16), 0);
    bool d = check("sample over 16", count_over({16,17,16,18}, 16), 2);
    bool e = check("total lateness for sample", total_lateness({14, 16, 19, 22}, 16), 9);
    return a && b && c && d && e ? 0 : 1;
}
