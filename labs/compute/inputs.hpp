#pragma once
#include <algorithm>
#include <cctype>
#include <cmath>
#include <fstream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <tuple>
#include <vector>

inline std::string next_data_line(std::istream& input) {
    std::string line;
    while (std::getline(input, line)) {
        const auto first = line.find_first_not_of(" \t\r");
        if (first != std::string::npos && line[first] != '%') return line.substr(first);
    }
    throw std::runtime_error("Unexpected end of Matrix Market file");
}

struct CSR {
    int rows, cols;
    std::vector<int> offsets, column;
    std::vector<float> value;
};

inline CSR read_matrix(const std::string& path) {
    std::ifstream in(path);
    if (!in) throw std::runtime_error("Cannot read " + path);
    std::string line, banner, object, layout, field, symmetry;
    std::getline(in, line);
    std::transform(line.begin(), line.end(), line.begin(),
                   [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    std::istringstream(line) >> banner >> object >> layout >> field >> symmetry;
    if (banner != "%%matrixmarket" || object != "matrix" || layout != "coordinate" ||
        (field != "real" && field != "integer" && field != "pattern") ||
        (symmetry != "general" && symmetry != "symmetric"))
        throw std::runtime_error("Expected Matrix Market coordinate real/integer/pattern, general/symmetric");
    CSR a{};
    int stored = 0;
    if (!(std::istringstream(next_data_line(in)) >> a.rows >> a.cols >> stored) ||
        a.rows < 1 || a.cols < 1 || stored < 0 || a.rows > 10000000 || a.cols > 10000000 || stored > 8000000)
        throw std::runtime_error("Invalid dimensions or matrix exceeds this lab's in-memory limits");
    if (symmetry == "symmetric" && a.rows != a.cols) throw std::runtime_error("Nonsquare symmetric matrix");
    std::vector<std::tuple<int, int, float>> entries;
    entries.reserve(size_t(stored) * (symmetry == "symmetric" ? 2 : 1));
    for (int i = 0; i < stored; ++i) {
        std::string data_line = next_data_line(in);
        // Some scientific exporters use Fortran's D exponent in a real field.
        if (field == "real")
            for (char& ch : data_line) if (ch == 'D' || ch == 'd') ch = 'e';
        std::istringstream record(data_line);
        int r, c;
        float v = 1.0f;
        if (!(record >> r >> c)) throw std::runtime_error("Missing matrix coordinates");
        if (field == "integer") {
            long long value;
            if (!(record >> value)) throw std::runtime_error("Invalid integer matrix value");
            v = static_cast<float>(value);
        } else if (field == "real" && !(record >> v)) {
            throw std::runtime_error("Invalid real matrix value");
        }
        if (r < 1 || r > a.rows || c < 1 || c > a.cols || !std::isfinite(v))
            throw std::runtime_error("Invalid matrix entry " + std::to_string(i + 1));
        std::string extra;
        if (record >> extra)
            throw std::runtime_error("Invalid field in matrix entry " + std::to_string(i + 1));
        entries.emplace_back(r - 1, c - 1, v);
        if (symmetry == "symmetric" && r != c) entries.emplace_back(c - 1, r - 1, v);
    }
    while (std::getline(in, line)) {
        const auto first = line.find_first_not_of(" \t\r");
        if (first != std::string::npos && line[first] != '%')
            throw std::runtime_error("Matrix file has more entries than its declared count");
    }
    std::sort(entries.begin(), entries.end());
    a.offsets.assign(a.rows + 1, 0);
    for (const auto& [r, c, v] : entries) {
        ++a.offsets[r + 1];
        a.column.push_back(c);
        a.value.push_back(v);
    }
    for (int i = 0; i < a.rows; ++i) a.offsets[i + 1] += a.offsets[i];
    return a;
}

struct Digits {
    std::vector<unsigned> pixels;
    std::vector<int> labels;
};

inline Digits read_digits(const std::string& path) {
    std::ifstream in(path);
    if (!in) throw std::runtime_error("Cannot read " + path);
    Digits digits;
    const std::string alphabet = "0123456789abcdefg";
    std::string line;
    while (std::getline(in, line)) {
        std::istringstream record(line);
        int label;
        std::string pixels;
        if (!(record >> label >> pixels) || label < 0 || label > 9 || pixels.size() != 64)
            throw std::runtime_error("Invalid digit record");
        digits.labels.push_back(label);
        for (char pixel : pixels) {
            const auto pos = alphabet.find(pixel);
            if (pos == std::string::npos) throw std::runtime_error("Invalid pixel value");
            digits.pixels.push_back(static_cast<unsigned>(pos));
        }
    }
    if (digits.labels.size() != 1797) throw std::runtime_error("Expected 1797 digit images");
    return digits;
}

inline std::vector<float> make_dipole(int w, int h) {
    std::vector<float> rhs(size_t(w) * h, 0);
    const double sigma = std::max(1.25, std::min(w, h) * 0.045);
    for (int y = 1; y + 1 < h; ++y) {
        for (int x = 1; x + 1 < w; ++x) {
            auto gaussian = [&](double center) {
                const double dx = x - center * (w - 1), dy = y - 0.5 * (h - 1);
                return std::exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
            };
            rhs[y * w + x] = static_cast<float>(gaussian(0.32) - gaussian(0.68));
        }
    }
    return rhs;
}

inline std::vector<double> reference_pressure(const std::vector<float>& rhs, int w, int h, int sweeps) {
    std::vector<double> current(rhs.size()), next(rhs.size());
    for (int step = 0; step < sweeps; ++step) {
        for (int y = 1; y < h - 1; ++y) {
            for (int x = 1; x < w - 1; ++x) {
                const int i = y * w + x;
                next[i] = 0.25 * (current[i - 1] + current[i + 1] + current[i - w] + current[i + w] + rhs[i]);
            }
        }
        std::swap(current, next);
    }
    return current;
}
