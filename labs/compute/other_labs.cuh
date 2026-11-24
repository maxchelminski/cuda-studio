#pragma once

inline void run_spmv(const CSR& matrix, int copies) {
    const auto& a = matrix;
    const size_t x_count = size_t(a.cols) * copies, y_count = size_t(a.rows) * copies;
    if (x_count + y_count > 32000000 || a.value.size() * double(copies) > 1e9)
        throw std::runtime_error("Choose fewer RHS copies for this matrix");
    std::vector<float> input(x_count);
    // The first all-ones RHS makes unweighted graph output equal node degree.
    for (size_t i = 0; i < x_count; ++i)
        input[i] = i < size_t(a.cols) ? 1.0f : float(int((i * 31 + i / a.cols) % 127) - 63) / 63.0f;
    std::vector<double> reference(y_count), allowance(y_count);
    std::vector<int> lengths(a.rows);
    for (int row = 0; row < a.rows; ++row) {
        lengths[row] = a.offsets[row + 1] - a.offsets[row];
        for (int batch = 0; batch < copies; ++batch) {
            double sum = 0, magnitude = 0;
            for (int p = a.offsets[row]; p < a.offsets[row + 1]; ++p) {
                const double product = double(a.value[p]) * input[batch * a.cols + a.column[p]];
                sum += product;
                magnitude += std::abs(product);
            }
            reference[batch * a.rows + row] = sum;
            allowance[batch * a.rows + row] = row_allowance(lengths[row], magnitude);
        }
    }
    std::sort(lengths.begin(), lengths.end());
    std::cout << "CSR " << a.rows << " x " << a.cols << ", nnz " << a.value.size()
              << ", row nnz min/median/max " << lengths.front() << '/'
              << (lengths[(a.rows - 1) / 2] + lengths[a.rows / 2]) * 0.5
              << '/' << lengths.back() << ", RHS copies " << copies << "\n"
              << "First RHS is all ones; y[0]=" << reference.front() << "\n";
    Buffer<int> offsets(a.offsets), cols(a.column);
    Buffer<float> values(a.value), x(input), y(y_count);
    constexpr int width = 128;
    const int thread_grid = divide_up(static_cast<int>(y_count), width);
    const int warp_grid = divide_up(static_cast<int>(y_count), width / 32);
    auto benchmark = [&](const char* name, auto launch) {
        const Timing ms = measure_ms([&] { CHECK(cudaMemsetAsync(y.ptr, 0xff, y_count * sizeof(float))); }, launch);
        report(name, ms, double(copies) * a.value.size(), "Gnonzeros/s");
        const auto host = y.read();
        ErrorStats errors;
        size_t worst = 0;
        double worst_ratio = 0;
        for (size_t i = 0; i < y_count; ++i) {
            errors.add(host[i], reference[i]);
            const double ratio = std::abs(double(host[i]) - reference[i]) / allowance[i];
            if (ratio > worst_ratio) { worst_ratio = ratio; worst = i; }
        }
        std::cout << "  worst row error / local allowance " << worst_ratio
                  << " at RHS " << (worst / a.rows) << ", row " << (worst % a.rows)
                  << " (zero-based); actual " << host[worst] << ", FP64 " << reference[worst] << "\n";
        if (worst_ratio > 1) throw std::runtime_error(std::string(name) + " failed row-local SpMV check");
        errors.verify(name, 3e-5);
    };
    benchmark("scalar CSR", [&] { baseline::spmv<<<thread_grid, width>>>(offsets.ptr, cols.ptr, values.ptr, x.ptr, y.ptr, a.rows, a.cols, copies); });
    benchmark("student", [&] { student_spmv<<<thread_grid, width>>>(offsets.ptr, cols.ptr, values.ptr, x.ptr, y.ptr, a.rows, a.cols, copies); });
    benchmark("warp per row", [&] { solution::spmv_warp<<<warp_grid, width>>>(offsets.ptr, cols.ptr, values.ptr, x.ptr, y.ptr, a.rows, a.cols, copies); });
}

inline void run_reduce(const Digits& digits, int count) {
    std::vector<unsigned> pixels(count);
    unsigned long long reference = 0;
    for (int i = 0; i < count; ++i) {
        pixels[i] = digits.pixels[i % digits.pixels.size()];
        reference += pixels[i];
    }
    Buffer<unsigned> values(pixels);
    Buffer<unsigned long long> total(1);
    constexpr int width = 256;
    const int grid = divide_up(count, width);
    std::cout << count << " image cells; " << digits.pixels.size()
              << " unique positions before input repeats. Exact ink sum " << reference << "\n";
    auto benchmark = [&](const char* name, auto launch) {
        const Timing ms = measure_ms([&] { total.clear(); }, launch);
        report(name, ms, pixels.size() * sizeof(unsigned), "GB/s input");
        if (total.read()[0] != reference) throw std::runtime_error(std::string(name) + " produced an incorrect sum");
    };
    benchmark("atomic per input", [&] { baseline::reduce<<<grid, width>>>(values.ptr, count, total.ptr); });
    benchmark("student", [&] { student_reduce<<<grid, width>>>(values.ptr, count, total.ptr); });
    benchmark("block tree", [&] { solution::reduce_tree<width><<<grid, width>>>(values.ptr, count, total.ptr); });
}

inline void write_pressure(const std::string& path, const std::vector<float>& values, int w, int h) {
    std::ofstream out(path, std::ios::binary);
    if (!out) throw std::runtime_error("Cannot write " + path);
    float peak = 0;
    for (float v : values) peak = std::max(peak, std::abs(v));
    out << "P5\n" << w << ' ' << h << "\n255\n";
    for (float v : values) {
        const auto shade = static_cast<unsigned char>(std::lround(127.5f * (v / std::max(peak, 1e-20f) + 1)));
        out.write(reinterpret_cast<const char*>(&shade), 1);
    }
    out.close();
    if (!out) throw std::runtime_error("Could not finish writing " + path);
    std::cout << "Saved " << path << "; grayscale [-peak, +peak], peak=" << peak << "\n";
}

inline void run_poisson(int w, int h, int sweeps, const std::string& path) {
    if (w < 5 || h < 5 || double(w) * h * sweeps > 1e9)
        throw std::runtime_error("Use at least 5x5 cells and at most one billion cell-sweeps");
    const auto source = make_dipole(w, h);
    const auto reference = reference_pressure(source, w, h, sweeps);
    Buffer<float> rhs(source), first(source.size()), second(source.size());
    const dim3 block(16, 16), grid(divide_up(w, 16), divide_up(h, 16));
    std::cout << "Pressure dipole " << w << " x " << h << ", " << sweeps << " Jacobi sweeps; initial relative residual 1\n";
    auto benchmark = [&](const char* name, auto step) {
        auto prepare = [&] {
            first.clear();
            CHECK(cudaMemsetAsync(second.ptr, 0xff, second.size * sizeof(float)));
        };
        auto run = [&] {
            float* src = first.ptr;
            float* dst = second.ptr;
            for (int i = 0; i < sweeps; ++i) {
                step(src, dst);
                std::swap(src, dst);
            }
        };
        const Timing ms = measure_ms(prepare, run);
        report(name, ms, double(w - 2) * (h - 2) * sweeps, "Ginterior cell-updates/s");
        const auto pressure = (sweeps % 2 ? second : first).read();
        ErrorStats errors, residual;
        for (size_t i = 0; i < pressure.size(); ++i) errors.add(pressure[i], reference[i]);
        errors.verify(name, 2e-5);
        for (int y = 1; y < h - 1; ++y) for (int x = 1; x < w - 1; ++x) {
            const int i = y * w + x;
            const double lap = 4.0 * pressure[i] - pressure[i - 1] - pressure[i + 1] - pressure[i - w] - pressure[i + w];
            residual.add(lap, source[i]);
        }
        std::cout << "  solver ||b-Ap||/||b|| " << residual.relative_l2() << "\n";
        return pressure;
    };
    benchmark("global Jacobi", [&](auto src, auto dst) { baseline::poisson<<<grid, block>>>(src, rhs.ptr, dst, w, h); });
    auto student = benchmark("student", [&](auto src, auto dst) { student_poisson<<<grid, block>>>(src, rhs.ptr, dst, w, h); });
    benchmark("shared halo", [&](auto src, auto dst) { solution::poisson_shared<16><<<grid, block>>>(src, rhs.ptr, dst, w, h); });
    if (!path.empty()) write_pressure(path, student, w, h);
}
