#include "../compute/inputs.hpp"
#include <array>
#include <chrono>
#include <iomanip>
#include <iostream>

// Use the very same file reader and CSR constructor as the GPU benchmark.
void measure_setup(const std::string& path, int expected_rows, int expected_entries) {
    using Clock = std::chrono::steady_clock;
    std::array<double, 7> samples{};
    for (int pass = -1; pass < static_cast<int>(samples.size()); ++pass) {
        const auto start = Clock::now();
        CSR matrix = read_matrix(path);
        const auto end = Clock::now();
        if (matrix.rows != expected_rows || matrix.offsets.back() != expected_entries)
            throw std::runtime_error("Unexpected matrix shape or nonzero count in " + path);
        if (pass >= 0)
            samples[pass] = std::chrono::duration<double, std::milli>(end - start).count();
    }
    std::sort(samples.begin(), samples.end());
    std::cout << path << " | rows " << expected_rows << " | expanded nnz " << expected_entries
              << " | parse + CSR median " << samples[3] << " ms | range "
              << samples.front() << " to " << samples.back() << " ms\n";
}

int main() {
    try {
        std::cout << std::fixed << std::setprecision(4)
                  << "One warm-up, seven timed reads per file. Host file reading, parsing and CSR construction only.\n";
        measure_setup("labs/compute/data/karate.mtx", 34, 156);
        measure_setup("labs/compute/data/bcsstk14.mtx", 1806, 63454);
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
