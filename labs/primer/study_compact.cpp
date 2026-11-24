#include "check.hpp"
#include "../compute/inputs.hpp"

std::vector<int> exclusive_scan(const std::vector<int>& flags) {
    std::vector<int> prefix;
    int running = 0;
    for (int flag : flags) {
        running += flag; // STUDENT: turn this inclusive scan into an exclusive one.
        prefix.push_back(running);
    }
    return prefix;
}

bool verify(const std::vector<int>& flags, const std::string& label) {
    std::vector<int> expected; // independent serial filter
    for (int i = 0; i < static_cast<int>(flags.size()); ++i) {
        if (flags[i]) expected.push_back(i);
    }
    auto prefix = exclusive_scan(flags);
    if (prefix.size() != flags.size()) {
        std::cout << "TRY " << label << ": expected one prefix per flag\n";
        return false;
    }
    const int length = flags.empty() ? 0 : prefix.back() + flags.back();
    if (length < 0 || length > static_cast<int>(flags.size())) {
        std::cout << "TRY " << label << ": impossible output length " << length << '\n';
        return false;
    }
    std::vector<int> output(length, -1);
    for (int i = 0; i < static_cast<int>(flags.size()); ++i) {
        if (flags[i]) {
            int slot = prefix[i];
            if (slot < 0 || slot >= length) {
                std::cout << "TRY " << label << ": invalid compacted slot " << slot << '\n';
                return false;
            }
            output[slot] = i;
        }
    }
    std::cout << label << ": " << length << " output slots, "
              << expected.size() << " retained inputs\n";
    return check("retained input indices and order", output == expected, true);
}

int main() {
    bool a = verify({1, 0, 1, 1, 0, 0, 1}, "letters A through G");
    bool b = verify({}, "empty");
    bool c = verify({0, 0, 0}, "all zero");
    bool d = verify({1, 1, 1}, "all one");
    CSR graph = read_matrix("labs/compute/data/karate.mtx");
    std::vector<int> flags;
    for (int row = 0; row < graph.rows; ++row) {
        for (int p = graph.offsets[row]; p < graph.offsets[row + 1]; ++p) {
            flags.push_back(graph.column[p] > row);
        }
    }
    bool e = verify(flags, "upper half of the karate adjacency matrix");
    return a && b && c && d && e ? 0 : 1;
}
