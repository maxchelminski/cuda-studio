#include "check.hpp"
#include <algorithm>
#include <utility>
#include <vector>

int blocks_to_cover(int pixels, int block_width) {
    return pixels / block_width; // STUDENT: include the last partial block.
}

bool trace(int width, int height) {
    const int block_cols = 4, block_rows = 2;
    int grid_cols = blocks_to_cover(width, block_cols);
    int grid_rows = blocks_to_cover(height, block_rows);
    std::vector<int> visits(width * height, 0);
    int skipped = 0;
    for (int by = 0; by < grid_rows; ++by) {
        for (int bx = 0; bx < grid_cols; ++bx) {
            for (int ty = 0; ty < block_rows; ++ty) {
                for (int tx = 0; tx < block_cols; ++tx) {
                    int x = bx * block_cols + tx;
                    int y = by * block_rows + ty;
                    if (x < width && y < height) {
                        ++visits.at(y * width + x);
                    } else {
                        ++skipped;
                    }
                }
            }
        }
    }
    std::cout << width << " x " << height << ": " << grid_cols << " x "
              << grid_rows << " blocks, " << skipped << " inactive threads\n";
    for (int i = 0; i < width * height; ++i) {
        if (visits[i] != 1) {
            std::cout << "First coverage mismatch at (" << i % width << ", "
                      << i / width << "): " << visits[i] << " visits\n";
            break;
        }
    }
    return check("pixels written exactly once",
                 std::count(visits.begin(), visits.end(), 1), width * height);
}

int main() {
    bool ok = true;
    for (auto shape : {std::pair{4, 2}, {5, 3}, {1, 1}, {17, 9}}) {
        ok = trace(shape.first, shape.second) && ok;
    }
    return ok ? 0 : 1;
}
