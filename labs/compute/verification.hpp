#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <iostream>
#include <limits>
#include <random>
#include <stdexcept>
#include <string>
#include <vector>

// Three sign vectors let a large GEMM exercise every output in O(MN+MK+KN)
// work per vector. References are prepared once, in double, outside GPU timing.
class ProductProbes {
    static constexpr int trials = 3;
    using Triple = std::array<double, trials>;
    std::vector<Triple> signs, projected;
public:
    ProductProbes(const std::vector<float>& a, const std::vector<float>& b,
                  int m, int n, int k) : signs(n), projected(m) {
        std::mt19937 generator(6811);
        for (auto& column : signs)
            for (double& sign : column) sign = (generator() & 1u) ? 1.0 : -1.0;
        std::vector<Triple> bv(k, Triple{});
        for (int t = 0; t < k; ++t)
            for (int j = 0; j < n; ++j)
                for (int p = 0; p < trials; ++p)
                    bv[t][p] += double(b[size_t(t) * n + j]) * signs[j][p];
        for (int i = 0; i < m; ++i) {
            projected[i].fill(0.0);
            for (int t = 0; t < k; ++t)
                for (int p = 0; p < trials; ++p)
                    projected[i][p] += double(a[size_t(i) * k + t]) * bv[t][p];
        }
    }

    void verify(const char* name, const std::vector<float>& c, double tolerance) const {
        const size_t n = signs.size();
        double worst = 0;
        size_t worst_row = 0;
        for (size_t i = 0; i < projected.size(); ++i) {
            Triple cv{};
            double squares = 0;
            for (size_t j = 0; j < n; ++j) {
                const double v = c[i * n + j];
                squares += v * v;
                for (int p = 0; p < trials; ++p) cv[p] += v * signs[j][p];
            }
            // Row norm supplies a stable reference scale if a signed projection cancels.
            const double norm = std::sqrt(squares);
            for (int p = 0; p < trials; ++p) {
                const double scale = std::max({norm, std::abs(projected[i][p]), 1e-30});
                const double ratio = std::abs(cv[p] - projected[i][p]) / scale;
                if (!std::isfinite(ratio)) throw std::runtime_error("Nonfinite GEMM probe");
                if (ratio > worst) { worst = ratio; worst_row = i; }
            }
        }
        std::cout << "  3 full-output sign probes: worst row-scaled error " << worst
                  << " at row " << worst_row << " (limit " << 8 * tolerance << ")\n";
        if (worst > 8 * tolerance)
            throw std::runtime_error(std::string(name) + " failed C*r versus A*(B*r)");
    }
};

// Sum of absolute products supplies a local scale even when a row sum cancels.
// The five extra stages cover the warp shuffle tree. The floor permits tiny FP32
// results to flush to zero. This teaching tolerance is used in addition to global L2.
inline double row_allowance(int entries, double sum_abs_products) {
    return (entries + 5.0) * std::numeric_limits<float>::epsilon() * sum_abs_products
           + (entries + 1.0) * std::numeric_limits<float>::min();
}
