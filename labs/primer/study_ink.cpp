#include "ink_profile.hpp"
#include <exception>
#include <fstream>
#include <iostream>
#include <string>

// Course-provided checks. Edit row_profile in ink_profile.hpp.
bool check_case(const std::string& name, const std::vector<int>& pixels, int width,
                int height, int cutoff, const std::vector<int>& expected) {
    const int untouched = -99;
    std::vector<int> counts(height + 1, untouched);
    try {
        row_profile(pixels, width, height, cutoff, counts);
    } catch (const std::exception& error) {
        std::cout << "TRY  " << name << " | " << error.what()
                  << "\nCheck each row, column and flat index against its bound.\n";
        return false;
    }
    if (counts.size() != expected.size() + 1) {
        std::cout << "TRY  " << name << " | write into the existing output slots. Its size changed.\n";
        return false;
    }
    if (counts.back() != untouched) {
        std::cout << "TRY  " << name << " | the guard after the last row changed. Check the row limit.\n";
        return false;
    }
    for (int row = 0; row < height; ++row) {
        if (counts.at(row) != expected.at(row)) {
            std::cout << "TRY  " << name << " | row " << row << " got " << counts.at(row)
                      << ", expected " << expected.at(row) << "\n";
            if (counts.at(row) == untouched) std::cout << "This row still has its starting value.\n";
            return false;
        }
    }
    std::cout << "PASS " << name << " | row counts";
    for (int row = 0; row < height; ++row) std::cout << ' ' << counts.at(row);
    std::cout << " | guard intact\n";
    return true;
}

int main() {
    bool ok = check_case("non-square image", {0, 8, 7, 12, 11, 2, 0, 3}, 4, 2, 8, {2, 1});
    ok = check_case("equal to the cutoff", {7, 8, 9}, 3, 1, 8, {2}) && ok;
    ok = check_case("zero rows", {}, 3, 0, 8, {}) && ok;
    ok = check_case("zero columns", {}, 0, 2, 8, {0, 0}) && ok;

    std::ifstream data("labs/compute/data/digits.txt");
    int label = -1;
    std::string encoded;
    if (!(data >> label >> encoded) || label != 0 || encoded.size() != 64) {
        std::cerr << "Could not read the first 8 x 8 digit from labs/compute/data/digits.txt. "
                     "Run the study using the lesson command.\n";
        return 2;
    }
    const std::string alphabet = "0123456789abcdefg";
    std::vector<int> pixels;
    for (char symbol : encoded) {
        auto value = alphabet.find(symbol);
        if (value == std::string::npos) {
            std::cerr << "Unexpected ink value in digits.txt.\n";
            return 2;
        }
        pixels.push_back(static_cast<int>(value));
    }
    ok = check_case("UCI handwritten 0", pixels, 8, 8, 8, {2, 4, 3, 3, 3, 2, 3, 2}) && ok;
    return ok ? 0 : 1;
}
