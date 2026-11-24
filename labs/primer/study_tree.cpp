#include "check.hpp"
#include <vector>

// T is the type of each element. This one algorithm can run in float or double.
template<class T>
T balanced(std::vector<T> level) {
    if (level.empty()) return T{0};
    while (level.size() > 1) {
        std::vector<T> next;
        for (std::size_t i = 0; i < level.size(); i += 2) {
            T pair = level[i];
            if (i + 1 < level.size()) {
                pair = level[i + 1]; // STUDENT: combine the two children.
            }
            next.push_back(pair);
        }
        level.swap(next);
    }
    return level[0];
}

template<class T>
T serial(const std::vector<T>& values) {
    T total = 0;
    for (T x : values) total += x;
    return total;
}

int main() {
    const std::vector<float> cancellation = {100000000, 1, -100000000, 1};
    const std::vector<double> wider(cancellation.begin(), cancellation.end());
    bool a = check("empty", balanced(std::vector<float>{}), 0);
    bool b = check("five leaves", balanced(std::vector<int>{3, 1, 4, 1, 5}), 14);
    bool c = check("eight leaves", balanced(std::vector<int>{3, 1, 4, 1, 5, 9, 2, 6}), 31);
    bool d = check("serial binary32 cancellation", serial(cancellation), 1);
    bool e = check("balanced binary32 cancellation", balanced(cancellation), 0);
    bool f = check("serial binary64 cancellation", serial(wider), 2);
    bool g = check("balanced binary64 cancellation", balanced(wider), 2);
    return a && b && c && d && e && f && g ? 0 : 1;
}
