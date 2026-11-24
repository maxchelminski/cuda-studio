#include "check.hpp"
#include <limits>
#include <vector>

using Costs = std::vector<std::vector<long long>>;
using Splits = std::vector<std::vector<int>>;

// p describes the shapes. Factor i has p[i] rows and p[i+1] columns.
long long join_cost(const std::vector<long long>& p, int i, int k, int j) {
    return p[i] * p[k + 1]; // STUDENT: include the output column count.
}

std::string order(const Splits& split, int i, int j) {
    if (i == j) return std::string(1, static_cast<char>('A' + i));
    int k = split[i][j];
    return "(" + order(split, i, k) + order(split, k + 1, j) + ")";
}

long long solve(const std::vector<long long>& p) {
    int n = static_cast<int>(p.size()) - 1;
    Costs best(n, std::vector<long long>(n, 0));
    Splits split(n, std::vector<int>(n, 0));
    for (int length = 2; length <= n; ++length) {
        for (int i = 0; i + length <= n; ++i) {
            int j = i + length - 1;
            best[i][j] = std::numeric_limits<long long>::max();
            for (int k = i; k < j; ++k) {
                long long cost = best[i][k] + best[k + 1][j] + join_cost(p, i, k, j);
                if (cost < best[i][j]) {
                    best[i][j] = cost;
                    split[i][j] = k;
                }
            }
        }
    }
    std::cout << order(split, 0, n - 1) << " needs " << best[0][n - 1]
              << " scalar multiplications\n";
    return best[0][n - 1];
}

int main() {
    bool a = check("one factor", solve({10, 50}), 0);
    bool b = check("three factors", solve({10, 100, 5, 50}), 7500);
    bool c = check("six factors", solve({30, 35, 15, 5, 10, 20, 25}), 15125);
    bool d = check("64-bit cost", solve({2000, 2000, 2000}), 8000000000LL);
    return a && b && c && d ? 0 : 1;
}
