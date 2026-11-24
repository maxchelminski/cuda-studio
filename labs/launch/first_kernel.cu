#ifndef __CUDACC_RTC__
#include <cuda_runtime.h>
#include <cstdio>
#include <cstdlib>
#include <vector>
#endif

extern "C" __global__ void add_serial(const float* a, const float* b, float* out, int n) {
    for (int i = 0; i < n; ++i) {
        out[i] = a[i] + b[i];
    }
}

extern "C" __global__ void add_student(const float* a, const float* b, float* out, int n) {
    // The blocks already cover the input. Give each thread one output.
    // Keep the working serial baseline while you replace this body.
    if (blockIdx.x == 0 && threadIdx.x == 0) {
        for (int i = 0; i < n; ++i) {
            out[i] = a[i] + b[i];
        }
    }
}

// The toolkit compiles this C++ host program. check_now.py supplies the host
// calls when NVRTC compiles the same two device functions in memory.
#ifndef __CUDACC_RTC__
static void require(cudaError_t result, const char* operation) {
    if (result != cudaSuccess) {
        std::fprintf(stderr, "%s: %s\n", operation, cudaGetErrorString(result));
        std::exit(2);
    }
}

int main() {
    for (int n : {1, 255, 256, 257, 4099}) {
        std::vector<float> a(n), b(n), result(n);
        for (int i = 0; i < n; ++i) {
            a[i] = float(i % 13 - 6);
            b[i] = float(i % 7);
        }
        size_t bytes = n * sizeof(float);
        float *da, *db, *dc;
        require(cudaMalloc(&da, bytes), "allocate A");
        require(cudaMalloc(&db, bytes), "allocate B");
        require(cudaMalloc(&dc, bytes), "allocate output");
        require(cudaMemcpy(da, a.data(), bytes, cudaMemcpyHostToDevice), "upload A");
        require(cudaMemcpy(db, b.data(), bytes, cudaMemcpyHostToDevice), "upload B");
        for (int variant = 0; variant < 2; ++variant) {
            require(cudaMemset(dc, 0xff, bytes), "fill output with NaNs");
            if (variant == 0) add_serial<<<1, 1>>>(da, db, dc, n);
            else add_student<<<(n + 255) / 256, 256>>>(da, db, dc, n);
            require(cudaGetLastError(), "launch");
            require(cudaMemcpy(result.data(), dc, bytes, cudaMemcpyDeviceToHost), "read output");
            for (int i = 0; i < n; ++i) {
                if (result[i] != a[i] + b[i]) {
                    std::fprintf(stderr, "Mismatch in variant %d at i=%d, n=%d\n", variant, i, n);
                    return 1;
                }
            }
        }
        require(cudaFree(da), "free A");
        require(cudaFree(db), "free B");
        require(cudaFree(dc), "free output");
        std::printf("PASS serial and student, n=%d\n", n);
    }
}
#endif

