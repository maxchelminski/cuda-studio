#include "check.hpp"
#include <set>

// The base address is aligned to 32 bytes. Indices count FP32 elements.
int count_sectors(int stride, int offset) {
    std::set<int> sectors;
    for (int lane = 0; lane < 32; ++lane) {
        int index = lane; // STUDENT: model the requested offset and stride.
        sectors.insert((4 * index) / 32);
    }
    return static_cast<int>(sectors.size());
}

int main() {
    std::cout << "stride  sectors at offset 0  sectors at offset 1\n";
    for (int stride : {1, 2, 4, 8, 16}) {
        std::cout << stride << "       " << count_sectors(stride, 0)
                  << "                    " << count_sectors(stride, 1) << '\n';
    }
    bool a = check("aligned", count_sectors(1, 0), 4);
    bool b = check("shifted", count_sectors(1, 1), 5);
    bool c = check("stride eight", count_sectors(8, 0), 32);
    bool d = check("same address in every lane", count_sectors(0, 0), 1);
    return a && b && c && d ? 0 : 1;
}
