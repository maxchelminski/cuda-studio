#pragma once
#include <numeric>
#include <optional>
#include <random>
#include <set>
#include "verification.hpp"

struct GemmInput {
    int m, n, k;
    std::vector<float> a, b;
    std::vector<int> query_labels, gallery_labels;
};

inline GemmInput random_gemm(int m, int n, int k) {
    const size_t mk = size_t(m) * k, kn = size_t(k) * n, mn = size_t(m) * n;
    if (mk + kn + mn > 64000000) throw std::runtime_error("Use a shape below 64M total A/B/C entries");
    GemmInput input{m, n, k, std::vector<float>(mk), std::vector<float>(kn), {}, {}};
    std::mt19937 engine(5070);
    auto next = [&] { return static_cast<float>(engine() >> 8) * (2.0f / 16777216.0f) - 1.0f; };
    std::generate(input.a.begin(), input.a.end(), next);
    std::generate(input.b.begin(), input.b.end(), next);
    return input;
}

inline GemmInput digits_gemm(const Digits& digits, int count) {
    const int n = count * 4 / 5, m = count - n, k = 64;
    GemmInput input{m, n, k, std::vector<float>(m * k), std::vector<float>(k * n), {}, {}};
    for (int image = 0; image < count; ++image) {
        double norm2 = 0;
        for (int p = 0; p < k; ++p) {
            const unsigned ink = digits.pixels[image * k + p];
            norm2 += ink * ink;
        }
        if (norm2 == 0) throw std::runtime_error("Unexpected empty image");
        const double inv_norm = 1.0 / std::sqrt(norm2);
        for (int p = 0; p < k; ++p) {
            const float v = static_cast<float>(digits.pixels[image * k + p] * inv_norm);
            if (image < n) input.b[p * n + image] = v;
            else input.a[(image - n) * k + p] = v;
        }
        if (image < n) input.gallery_labels.push_back(digits.labels[image]);
        else input.query_labels.push_back(digits.labels[image]);
    }
    return input;
}

struct Blas {
    cublasHandle_t handle;
    Blas() { CHECK(cublasCreate(&handle)); }
    ~Blas() { cublasDestroy(handle); }
    void multiply(const float* a, const float* b, float* c, int m, int n, int k,
                  cublasComputeType_t compute = CUBLAS_COMPUTE_32F_PEDANTIC) const {
        const float one = 1, zero = 0;
        // Row-major C = A B maps to column-major C^T = B^T A^T.
        CHECK(cublasGemmEx(handle, CUBLAS_OP_N, CUBLAS_OP_N, n, m, k,
              &one, b, CUDA_R_32F, n, a, CUDA_R_32F, k, &zero, c, CUDA_R_32F, n, compute, CUBLAS_GEMM_DEFAULT));
    }
};

inline void run_gemm(const GemmInput& data) {
    const int m = data.m, n = data.n, k = data.k;
    const size_t count = size_t(m) * n;
    const double flops = 2.0 * m * n * k;
    Buffer<float> a(data.a), b(data.b), c(count);
    const dim3 block(16, 16), grid(divide_up(n, 16), divide_up(m, 16));
    std::vector<size_t> indices;
    std::optional<ProductProbes> probes;
    if (count * k <= 4000000) {
        indices.resize(count);
        std::iota(indices.begin(), indices.end(), size_t(0));
    } else {
        std::set<size_t> sampled = {0, size_t(n - 1), count - n, count - 1};
        std::mt19937 sampler(19);
        for (int i = 0; i < 1024; ++i) sampled.insert(sampler() % count);
        indices.assign(sampled.begin(), sampled.end());
        probes.emplace(data.a, data.b, m, n, k);
    }
    std::vector<double> expected;
    for (size_t i : indices) {
        double sum = 0;
        for (int t = 0; t < k; ++t)
            sum += double(data.a[(i / n) * k + t]) * data.b[size_t(t) * n + i % n];
        expected.push_back(sum);
    }
    std::cout << "Row-major C[" << m << ',' << n << "] = A[" << m << ',' << k
              << "] B[" << k << ',' << n << "]; FP64 dot checks " << indices.size() << "/" << count << "\n";
    Blas blas;
    auto benchmark = [&](const char* name, auto launch, double tolerance) {
        auto poison_output = [&] { CHECK(cudaMemsetAsync(c.ptr, 0xff, count * sizeof(float))); };
        const Timing ms = measure_ms(poison_output, launch);
        report(name, ms, flops, "GFLOP/s");
        const auto host = c.read();
        if (!std::all_of(host.begin(), host.end(), [](float v) { return std::isfinite(v); }))
            throw std::runtime_error(std::string(name) + " left nonfinite output");
        ErrorStats errors;
        size_t j = 0;
        for (size_t i : indices) errors.add(host[i], expected[j++]);
        errors.verify(name, tolerance);
        if (probes) probes->verify(name, host, tolerance);
        if (!data.query_labels.empty()) {
            int correct = 0;
            for (int row = 0; row < m; ++row) {
                auto first = host.begin() + row * n;
                auto nearest = std::max_element(first, first + n) - first;
                correct += data.gallery_labels[nearest] == data.query_labels[row];
            }
            std::cout << "  nearest-image label agreement " << correct << "/" << m << "\n";
        }
    };
    benchmark("naive", [&] { baseline::gemm<<<grid, block>>>(a.ptr, b.ptr, c.ptr, m, n, k); }, 2e-5);
    benchmark("student", [&] { student_gemm<<<grid, block>>>(a.ptr, b.ptr, c.ptr, m, n, k); }, 2e-5);
    benchmark("tile16", [&] { solution::gemm<16><<<grid, block>>>(a.ptr, b.ptr, c.ptr, m, n, k); }, 2e-5);
    benchmark("cuBLAS FP32", [&] { blas.multiply(a.ptr, b.ptr, c.ptr, m, n, k); }, 2e-5);
    benchmark("cuBLAS TF32 allowed", [&] { blas.multiply(a.ptr, b.ptr, c.ptr, m, n, k, CUBLAS_COMPUTE_32F_FAST_TF32); }, 3e-3);
}
