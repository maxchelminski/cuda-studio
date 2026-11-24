// Compile the saved exercise with a separate entry point for these optional checks.
#include <cmath>
#include <exception>
#include <iostream>
#include <string>
#include <vector>

#define main primer_original_main
#if PRIMER_EXERCISE == 1
#include "01_frames.cpp"
#elif PRIMER_EXERCISE == 2
#include "02_loop.cpp"
#elif PRIMER_EXERCISE == 3
#include "03_matrix.cpp"
#elif PRIMER_EXERCISE == 4
#include "04_buffers.cpp"
#elif PRIMER_EXERCISE == 5
#include "05_threads.cpp"
#else
#error Choose an exercise from 1 through 5 with run.ps1.
#endif
#undef main

static int failures = 0;

static void expect(const std::string& label, double actual, double expected) {
    const bool ok = std::abs(actual - expected) <= 0.00001;
    std::cout << (ok ? "PASS " : "TRY  ") << label << " | got " << actual
              << ", expected " << expected << '\n';
    if (!ok) ++failures;
}

#if PRIMER_EXERCISE == 2
static void check_frame_count(int call, const std::vector<int>& frames, int budget, int expected) {
    std::cout << "Call " << call << " | frame times [";
    for (std::size_t i = 0; i < frames.size(); ++i) {
        if (i > 0) std::cout << ", ";
        std::cout << frames[i];
    }
    std::cout << "] ms | budget " << budget << " ms\n";
    expect("frames strictly over budget", count_over(frames, budget), expected);
}
#endif

static void run_extra_checks() {
#if PRIMER_EXERCISE == 1
    expect("6.25 ms per frame", fps(6.25f), 160.0);
    expect("32 ms per frame", fps(32.0f), 31.25);
    expect("125 ms per frame", fps(125.0f), 8.0);
#elif PRIMER_EXERCISE == 2
    check_frame_count(1, {7, 12, 7, 8, 3}, 7, 2);
    check_frame_count(2, {22, 21, 22}, 20, 3);
    check_frame_count(3, {4, 6, 5}, 8, 0);
#elif PRIMER_EXERCISE == 3
    expect("index_of(row=2, col=1, width=4) | flat slot", index_of(2, 1, 4), 9);
    const std::vector<int> a = {2, -1, 3, 4};                   // 2 by 2
    const std::vector<int> b = {1, 2, 0, -2, 5, -1, 3, 4};      // 2 by 4
    expect("C(0,3) of a 2 by 4 product | cell value", dot_cell(a, b, 0, 3, 2, 4), -8);
    expect("C(1,1) of a 2 by 4 product | cell value", dot_cell(a, b, 1, 1, 2, 4), 2);
#elif PRIMER_EXERCISE == 4
    const float input[] = {7, -3, 6, 2, 0};
    float output[] = {90, 91, 92, 93, 94, 95};
    scale(input + 1, output + 1, 3, -0.5f);
    const float wanted[] = {90, 1.5f, -3, -1, 94, 95};
    for (int i = 0; i < 6; ++i) {
        expect("original output[" + std::to_string(i) + "] after scaling three elements", output[i], wanted[i]);
    }
    scale(input, output, 0, 3.0f);
    expect("original output[0] after a second call with n=0", output[0], 90);
#elif PRIMER_EXERCISE == 5
    for (int size : {0, 3, 6, 13}) {
        const int width = 6;
        std::vector<int> visits(size, 0);
        simulate_launch(visits, width);
        int covered_once = 0;
        for (int count : visits) {
            if (count == 1) ++covered_once;
        }
        expect("input length " + std::to_string(size) + ", block size 6 | slots visited exactly once", covered_once, size);
    }
#endif
}

int main() {
    std::cout << "Checking your saved exercise " << PRIMER_EXERCISE << " on new inputs.\n";
    try {
        run_extra_checks();
    } catch (const std::exception& error) {
        std::cout << "TRY  A case stopped before comparison: " << error.what() << '\n';
        return 1;
    }
    std::cout << (failures ? "Revise your function and run again." : "All extra checks passed.") << '\n';
    return failures ? 1 : 0;
}
