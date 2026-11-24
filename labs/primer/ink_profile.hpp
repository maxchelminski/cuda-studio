#pragma once
#include <vector>

// Write one count per row. A cell counts when its ink is at least cutoff.
// The caller stores the rows one after another in pixels and supplies
// space for every row in counts. Leave any extra slots in counts untouched.
inline void row_profile(const std::vector<int>& pixels, int width, int height,
                        int cutoff, std::vector<int>& counts) {
    // Write your function body here. Use .at(index) to read or write a slot.
    for (int row = 0; row < height; ++row) {
        int count = 0;
        for (int lane = 0; lane < width; ++lane) {
            if (pixels.at(row * width + lane) >= cutoff) {
                ++count;
            }
        }
        counts.at(row) = count;
    }
}
