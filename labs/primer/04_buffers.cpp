#include "check.hpp"
#include <vector>

void copy_first(const float* input, float* output, int n) {
    if (n > 0) {
        output[0] = input[0];
    }
}

void scale(const float* input, float* output, int n, float factor) {
    // STUDENT: Fill exactly n output slots. Start from copy_first above.
    for (int i = 0; i < n; i++) {
        output[i] = input[i] * factor;
    }
}

int main() {
    std::vector<float> in = {2, -1, 0, 6};
    std::vector<float> out(5, 99); // final slot is a guard
    scale(in.data(), out.data(), 4, 0.5f);
    bool ok = true;
    float expected[] = {1, -0.5f, 0, 3, 99};
    for (int i = 0; i < 5; ++i) {
        ok = check("slot " + std::to_string(i), out[i], expected[i]) && ok;
    }
    scale(in.data(), out.data(), 0, 5);
    std::vector<float> short_out = {7, 8, 9, 10};
    scale(in.data(), short_out.data(), 2, 0.0f);
    ok = check("short slot 0", short_out[0], 0.0f) && ok;
    ok = check("short slot 1", short_out[1], 0.0f) && ok;
    ok = check("short slot 2", short_out[2], 9.0f) && ok;
    ok = check("short slot 3", short_out[3], 10.0f) && ok;
    float v[] = {90, 2, -1, 4, 91};
    scale(v + 1, v + 1, 3, -2.0f);
    ok = check("v slot 0", v[0], 90.0f) && ok;
    ok = check("v slot 1", v[1], -4.0f) && ok;
    ok = check("v slot 2", v[2], 2.0f) && ok;
    ok = check("v slot 3", v[3], -8.0f) && ok;
    ok = check("v slot 4", v[4], 91.0f) && ok;
    return check("empty call preserved output", out[0], 1.0f) && ok ? 0 : 1;
}
