#include "check.hpp"
#include <numeric>
#include <vector>

int destination_index(int x, int y, int rows, int cols) {
    return x * cols + y; // STUDENT: use the width of the transposed matrix.
}

bool test_shape(int rows, int cols, const std::vector<int>& expected) {
    std::vector<int> src(rows * cols);
    std::iota(src.begin(), src.end(), 1); // fills consecutive values starting at 1
    std::vector<int> dst(src.size(), -1);
    for (int y = 0; y < rows; ++y) {
        for (int x = 0; x < cols; ++x) {
            int target = destination_index(x, y, rows, cols);
            if (target < 0 || target >= rows * cols) {
                std::cout << "TRY " << rows << 'x' << cols << " at x=" << x
                          << ", y=" << y << ": target " << target
                          << " is outside [0," << dst.size() << ")\n";
                return false;
            }
            dst.at(target) = src.at(y * cols + x);
        }
    }
    return check(std::to_string(rows) + "x" + std::to_string(cols) +
                 " output matches the hand transpose", dst == expected, true);
}

int main() {
    bool a = test_shape(2, 2, {1, 3, 2, 4});
    bool b = test_shape(2, 3, {1, 4, 2, 5, 3, 6});
    bool c = test_shape(1, 4, {1, 2, 3, 4});
    bool d = test_shape(4, 1, {1, 2, 3, 4});
    return a && b && c && d ? 0 : 1;
}
