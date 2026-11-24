// Run the learner's saved functions with a separate entry point for the optional challenge.
#define main primer_original_main
#include "02_loop.cpp"
#undef main

int main() {
    const std::vector<int> frames = {14, 16, 19, 22};
    const int budget = 16;
    std::cout << "Frame times (ms):";
    for (int frame : frames) std::cout << ' ' << frame;
    std::cout << " | budget: " << budget << " ms\n";

    const bool lateness = check("total_lateness (milliseconds over budget)",
                                total_lateness(frames, budget), 9);
    const bool count = check("count_over (number of late frames)",
                             count_over(frames, budget), 2);
    const bool within_budget = check("total_lateness({12, 16, 16}, 16) in ms",
                                     total_lateness({12, 16, 16}, 16), 0);
    const bool empty = check("total_lateness({}, 16) in ms", total_lateness({}, 16), 0);
    const bool new_budget = check("total_lateness({8, 10, 11, 12}, 10) in ms",
                                  total_lateness({8, 10, 11, 12}, 10), 3);
    return lateness && count && within_budget && empty && new_budget ? 0 : 1;
}
