#pragma once
// The working comparisons are visible when you want a hint.
namespace baseline {
__global__ void gemm(const float* a, const float* b, float* c, int m, int n, int k) {
    const int col = blockIdx.x * blockDim.x + threadIdx.x;
    const int row = blockIdx.y * blockDim.y + threadIdx.y;
    if (row < m && col < n) {
        float s = 0;
        for (int t = 0; t < k; ++t) s += a[row * k + t] * b[t * n + col];
        c[row * n + col] = s;
    }
}
__global__ void spmv(const int* offsets, const int* col, const float* values, const float* x,
                     float* y, int rows, int cols, int copies) {
    const int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= rows * copies) return;
    const int row = i % rows;
    float value = 0;
    for (int p = offsets[row]; p < offsets[row + 1]; ++p)
        value += values[p] * x[(i / rows) * cols + col[p]];
    y[i] = value;
}
__global__ void reduce(const unsigned* values, int count, unsigned long long* total) {
    const int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < count) atomicAdd(total, static_cast<unsigned long long>(values[i]));
}
__global__ void poisson(const float* src, const float* rhs, float* dst, int w, int h) {
    const int x = blockIdx.x * blockDim.x + threadIdx.x;
    const int y = blockIdx.y * blockDim.y + threadIdx.y;
    if (x >= w || y >= h) return;
    const int i = y * w + x;
    dst[i] = (x == 0 || y == 0 || x == w - 1 || y == h - 1) ? 0.0f
        : 0.25f * (src[i - 1] + src[i + 1] + src[i - w] + src[i + w] + rhs[i]);
}
}

namespace solution {
template<int Tile>
__global__ void gemm(const float* a, const float* b, float* c, int m, int n, int k) {
    __shared__ float a_tile[Tile][Tile], b_tile[Tile][Tile];
    const int tx = threadIdx.x, ty = threadIdx.y;
    const int col = blockIdx.x * Tile + tx, row = blockIdx.y * Tile + ty;
    float sum = 0;
    for (int base = 0; base < k; base += Tile) {
        a_tile[ty][tx] = row < m && base + tx < k ? a[row * k + base + tx] : 0.0f;
        b_tile[ty][tx] = base + ty < k && col < n ? b[(base + ty) * n + col] : 0.0f;
        __syncthreads();
        #pragma unroll
        for (int t = 0; t < Tile; ++t) sum += a_tile[ty][t] * b_tile[t][tx];
        __syncthreads();
    }
    if (row < m && col < n) c[row * n + col] = sum;
}

__global__ void spmv_warp(const int* offsets, const int* col, const float* values, const float* x,
                          float* y, int rows, int cols, int copies) {
    // Block width is a multiple of 32. The bounds decision is uniform in a warp.
    const int i = (blockIdx.x * blockDim.x + threadIdx.x) / 32;
    const int lane = threadIdx.x % 32;
    if (i >= rows * copies) return;
    const int row = i % rows, base = (i / rows) * cols;
    float sum = 0;
    for (int p = offsets[row] + lane; p < offsets[row + 1]; p += 32)
        sum += values[p] * x[base + col[p]];
    for (int delta = 16; delta; delta /= 2)
        sum += __shfl_down_sync(0xffffffffu, sum, delta);
    if (lane == 0) y[i] = sum;
}

template<int Width>
__global__ void reduce_tree(const unsigned* values, int count, unsigned long long* total) {
    __shared__ unsigned long long partial[Width];
    const int lane = threadIdx.x;
    const int i = blockIdx.x * Width + lane;
    partial[lane] = i < count ? values[i] : 0;
    __syncthreads();
    for (int stride = Width / 2; stride > 0; stride /= 2) {
        if (lane < stride) partial[lane] += partial[lane + stride];
        __syncthreads();
    }
    if (lane == 0) atomicAdd(total, partial[0]);
}

template<int Tile>
__global__ void poisson_shared(const float* src, const float* rhs, float* dst, int w, int h) {
    // A one-cell halo supplies the four neighbors at block boundaries.
    constexpr int apron = Tile + 2;
    __shared__ float tile[apron][apron];
    const int tx = threadIdx.x, ty = threadIdx.y;
    const int bx = blockIdx.x * Tile, by = blockIdx.y * Tile;
    for (int j = ty * Tile + tx; j < apron * apron; j += Tile * Tile) {
        const int xx = bx + j % apron - 1, yy = by + j / apron - 1;
        tile[j / apron][j % apron] = (xx >= 0 && xx < w && yy >= 0 && yy < h) ? src[yy * w + xx] : 0;
    }
    __syncthreads();
    const int x = bx + tx, y = by + ty;
    if (x >= w || y >= h) return;
    const int i = y * w + x;
    dst[i] = (x == 0 || y == 0 || x == w - 1 || y == h - 1) ? 0.0f
        : 0.25f * (tile[ty + 1][tx] + tile[ty + 1][tx + 2] + tile[ty][tx + 1] + tile[ty + 2][tx + 1] + rhs[i]);
}
}
