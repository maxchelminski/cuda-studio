#pragma once
#include <cuda_runtime.h>
#include <cublas_v2.h>
#include <algorithm>
#include <array>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

inline void checked(cudaError_t status, const char* expression) {
    if (status != cudaSuccess)
        throw std::runtime_error(std::string(expression) + ": " + cudaGetErrorString(status));
}
inline void checked(cublasStatus_t status, const char* expression) {
    if (status != CUBLAS_STATUS_SUCCESS)
        throw std::runtime_error(std::string(expression) + ": cuBLAS status " + std::to_string(int(status)));
}
#define CHECK(call) checked((call), #call)

inline int divide_up(int count, int width) { return (count - 1) / width + 1; }

template<class T> struct Buffer {
    T* ptr = nullptr;
    size_t size;
    explicit Buffer(size_t n) : size(n) {
        // A structurally empty matrix still has valid device pointers.
        CHECK(cudaMalloc(reinterpret_cast<void**>(&ptr), std::max(n, size_t(1)) * sizeof(T)));
    }
    explicit Buffer(const std::vector<T>& host) : Buffer(host.size()) {
        if (size) CHECK(cudaMemcpy(ptr, host.data(), size * sizeof(T), cudaMemcpyHostToDevice));
    }
    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;
    ~Buffer() { cudaFree(ptr); }
    std::vector<T> read() const {
        std::vector<T> result(size);
        if (size) CHECK(cudaMemcpy(result.data(), ptr, size * sizeof(T), cudaMemcpyDeviceToHost));
        return result;
    }
    void clear() { CHECK(cudaMemsetAsync(ptr, 0, size * sizeof(T))); }
};

struct Event {
    cudaEvent_t value;
    Event() { CHECK(cudaEventCreate(&value)); }
    ~Event() { cudaEventDestroy(value); }
    Event(const Event&) = delete;
    Event& operator=(const Event&) = delete;
};

// All operations (including library calls) use the same default stream.
// Prepare may reset output/state; its work completes before the start event.
struct Timing {
    float minimum, median, maximum;
    std::array<float, 9> samples;
};

template<class Prepare, class Run>
Timing measure_ms(Prepare prepare, Run run) {
    Event begin, end;
    prepare();
    run();
    CHECK(cudaGetLastError());
    CHECK(cudaDeviceSynchronize());
    std::array<float, 9> samples{};
    for (float& sample : samples) {
        prepare();
        CHECK(cudaEventRecord(begin.value));
        run();
        CHECK(cudaGetLastError());
        CHECK(cudaEventRecord(end.value));
        CHECK(cudaEventSynchronize(end.value));
        CHECK(cudaEventElapsedTime(&sample, begin.value, end.value));
    }
    auto sorted = samples;
    std::sort(sorted.begin(), sorted.end());
    return {sorted.front(), sorted[sorted.size() / 2], sorted.back(), samples};
}

struct ErrorStats {
    double differences = 0, reference = 0, max_abs = 0;
    bool finite = true;
    void add(double actual, double expected) {
        if (!std::isfinite(actual) || !std::isfinite(expected)) {
            finite = false;
            return;
        }
        const double d = actual - expected;
        differences += d * d;
        reference += expected * expected;
        max_abs = std::max(max_abs, std::abs(d));
    }
    double relative_l2() const {
        return reference == 0 ? std::sqrt(differences) : std::sqrt(differences / reference);
    }
    void verify(const std::string& name, double tolerance) const {
        std::cout << "  " << name << ": rel_L2=" << std::scientific << relative_l2()
                  << " max_abs=" << max_abs << std::defaultfloat << "\n";
        if (!finite || !(relative_l2() <= tolerance))
            throw std::runtime_error(name + " exceeded its numerical tolerance");
    }
};

inline void report(const char* name, const Timing& timing, double units, const char* rate_unit) {
    std::cout << std::setw(20) << std::left << name << std::right << std::fixed
              << std::setprecision(4) << timing.median << " ms (min " << timing.minimum
              << ", max " << timing.maximum << ")  ";
    if (timing.median > 0)
        std::cout << std::setprecision(3) << units / (timing.median * 1e6) << ' ' << rate_unit;
    else
        std::cout << "interval below timer resolution";
    std::cout << std::defaultfloat << std::setprecision(8) << "\n  samples_ms in run order:";
    for (float ms : timing.samples) std::cout << ' ' << ms;
    std::cout << '\n';
}
