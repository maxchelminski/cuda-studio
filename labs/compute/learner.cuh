#pragma once

// Start here. Each kernel works on day one. Change one at a time and rebuild.
// The independent baselines, answer kernels, and CPU checkers stay available.

__global__ void student_gemm(const float* a, const float* b, float* c, int m, int n, int k) {
    const int col = blockIdx.x * blockDim.x + threadIdx.x;
    const int row = blockIdx.y * blockDim.y + threadIdx.y;
    if (row >= m || col >= n) return;
    float sum = 0;
    for (int t = 0; t < k; ++t) sum += a[row * k + t] * b[t * n + col];
    c[row * n + col] = sum;
}

// A copy is another input vector transformed by the same sparse matrix.
__global__ void student_spmv(const int* offsets, const int* col, const float* values,
                             const float* x, float* y, int rows, int cols, int copies) {
    const int index = blockIdx.x * blockDim.x + threadIdx.x;
    if (index >= rows * copies) return;
    const int row = index % rows;
    const int base = (index / rows) * cols;
    float sum = 0;
    for (int p = offsets[row]; p < offsets[row + 1]; ++p)
        sum += values[p] * x[base + col[p]];
    y[index] = sum;
}

__global__ void student_reduce(const unsigned* values, int count, unsigned long long* total) {
    const int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < count) atomicAdd(total, static_cast<unsigned long long>(values[i]));
}

__global__ void student_poisson(const float* current, const float* rhs, float* next, int w, int h) {
    const int x = blockIdx.x * blockDim.x + threadIdx.x;
    const int y = blockIdx.y * blockDim.y + threadIdx.y;
    if (x >= w || y >= h) return;
    const int i = y * w + x;
    if (x == 0 || y == 0 || x + 1 == w || y + 1 == h) { next[i] = 0; return; }
    next[i] = 0.25f * (current[i - 1] + current[i + 1] + current[i - w] + current[i + w] + rhs[i]);
}
