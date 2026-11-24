#include "check.hpp"
#include <vector>

void simulate_launch(std::vector<int>& visits, int block_size) {
    int n = static_cast<int>(visits.size());
    int blocks = (n + block_size - 1) / block_size;
    for (int block = 0; block < blocks; ++block) {
        for (int lane = 0; lane < block_size; ++lane) {
            int index = block * block_size + lane; // STUDENT: map the pair (block, lane) to a unique slot
            if (index < n) {
                visits.at(index) += 1;
            }
        }
    }
}

int main() {
    bool ok = true;
    for (int n : {1, 5, 8, 17, 0, 9}) {
        std::vector<int> visits(n, 0);
        simulate_launch(visits, 4);
        int once = 0;
        for (int count : visits) {
            if (count == 1) ++once;
        }
        ok = check("visited exactly once, n=" + std::to_string(n), once, n) && ok;
    }
    return ok ? 0 : 1;
}
