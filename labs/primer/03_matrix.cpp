#include "check.hpp"
#include <vector>

int index_of(int row, int col, int width) {
    // STUDENT: Which flat position holds (row, col)?
    int total {0};
    for (; row > 0; --row) {
        total += width;
    }
    total += col;
    return total;
}

int dot_cell(const std::vector<int>& a, const std::vector<int>& b,
             int row, int col, int inner, int out_cols) {
    int result = 0;
    for (int k = 0; k < inner; ++k) {
        result += a.at(index_of(row, k, inner)) * b.at(index_of(k, col, out_cols));
    }
    return result;
}

int main() {
    std::vector<int> a = {1, 2, 3, 4, 5, 6};  // two rows of three
    std::vector<int> b = {1, 0, 0, 1, 1, 1};  // three rows of two
    std::vector<int> A = {-1, 2};
    std::vector<int> B = {4, 0, 2, 3, -2, 5};
    bool x = check("flat index of (1,2)", index_of(1, 2, 3), 5);
    bool y = check("C(0,1)", dot_cell(a, b, 0, 1, 3, 2), 5);
    bool z = check("C(1,0)", dot_cell(a, b, 1, 0, 3, 2), 10);
    bool z2 = check("C(1,1)", dot_cell(a, b, 1, 1, 3, 2), 11);
    bool X = check("BigC(0,0)", dot_cell(A, B, 0, 0, 2, 3), 2);
    bool Y = check("BigC(0,1)", dot_cell(A, B, 0, 1, 2, 3), -4);
    bool Z = check("BigC(0,2)", dot_cell(A, B, 0, 2, 2, 3), 8);
    return x && y && z && z2 && X && Y && Z ? 0 : 1;
}
