// Abyssal Swarm. NVRTC supplies the CUDA built-ins; no toolkit headers are needed.
struct Segment {
    float ax, ay, bx, by, radius, arc;
    int material;
};

struct Hit {
    int id;
    float radial, along;
};

// The largest segment index is in front. Traversal order is irrelevant.
__device__ void testSegment(const Segment& s, int id, float x, float y, Hit& hit) {
    if (id <= hit.id) return;
    float dx = s.bx - s.ax, dy = s.by - s.ay;
    float px = x - s.ax, py = y - s.ay;
    float length2 = dx * dx + dy * dy;
    float t = fminf(1.f, fmaxf(0.f, (px * dx + py * dy) / fmaxf(0.000001f, length2)));
    float sx = px - t * dx, sy = py - t * dy;
    float distance2 = sx * sx + sy * sy;
    if (distance2 <= s.radius * s.radius) {
        hit.id = id;
        float side = dx * sy - dy * sx;
        hit.radial = copysignf(sqrtf(distance2) / s.radius, side);
        hit.along = s.arc + t;
    }
}

__device__ bool overlaps(const Segment& s, float left, float top, float right, float bottom) {
    return fminf(s.ax, s.bx) - s.radius <= right && fmaxf(s.ax, s.bx) + s.radius >= left
        && fminf(s.ay, s.by) - s.radius <= bottom && fmaxf(s.ay, s.by) + s.radius >= top;
}

__device__ unsigned char byteValue(float value) {
    return (unsigned char)fminf(255.f, fmaxf(value, 0.f));
}

__device__ void writePixel(unsigned char* out, int w, int h, int x, int y,
                           const Segment* segments, Hit hit, int tested, int count, int view) {
    int at = 3 * (y * w + x);
    if (view == 1) { // RGB encodes exact (winner + 1); background = 0.
        unsigned id = hit.id + 1;
        out[at] = id & 255; out[at + 1] = (id >> 8) & 255; out[at + 2] = (id >> 16) & 255;
        return;
    }
    if (view == 2) {
        float cost = sqrtf(tested / (float)max(1, count));
        out[at] = byteValue(246 * cost); out[at + 1] = byteValue(158 * cost + 20);
        out[at + 2] = byteValue(84 - 48 * cost);
        return;
    }
    float r, g, b;
    if (hit.id < 0) {
        float u = (x + 0.5f) / w - 0.5f, v = (y + 0.5f) / h - 0.45f;
        unsigned hash = ((unsigned)x * 73856093u) ^ ((unsigned)y * 19349663u);
        float grit = (hash & 255u) / 255.f;
        float glow = fmaxf(0.f, 1.f - 2.6f * (u * u + v * v));
        r = 8 + 7 * glow + 4 * grit; g = 14 + 19 * glow + 5 * grit; b = 20 + 24 * glow + 7 * grit;
        if ((hash & 8191u) == 27u) { r += 55; g += 61; b += 60; }
    } else {
        Segment s = segments[hit.id];
        float n = hit.radial;
        float dome = sqrtf(fmaxf(0.f, 1.f - n * n));
        float ridge = 0.85f + 0.15f * cosf(7.1f * hit.along);
        float diffuse = (0.24f + 0.7f * dome - 0.16f * n) * ridge;
        float shine = fmaxf(0.f, 1.f - 3.4f * fabsf(n + 0.38f));
        shine = shine * shine * 55.f;
        float red = 215, green = 124, blue = 104;
        if (s.material == 1) { red = 223; green = 176; blue = 124; }
        if (s.material == 2) { red = 151; green = 108; blue = 137; }
        if (s.material == 3) { red = 104; green = 165; blue = 156; }
        r = red * diffuse + shine; g = green * diffuse + shine; b = blue * diffuse + shine;
    }
    out[at] = byteValue(r); out[at + 1] = byteValue(g); out[at + 2] = byteValue(b);
}

extern "C" __global__ void baseline(const Segment* segments, int count, unsigned char* out,
                                    int w, int h, int view) {
    int x = blockIdx.x * blockDim.x + threadIdx.x, y = blockIdx.y * blockDim.y + threadIdx.y;
    if (x >= w || y >= h) return;
    Hit hit = {-1, 0, 0};
    for (int i = 0; i < count; ++i)
        testSegment(segments[i], i, x + 0.5f, y + 0.5f, hit);
    writePixel(out, w, h, x, y, segments, hit, count, count, view);
}

// Worked reference. Try building your own version in student.cuh first.
extern "C" __global__ void tiled(const Segment* segments, int count, unsigned char* out,
                                 int w, int h, int view) {
    constexpr int batch = 128; // launch contract: at least this many threads per block
    __shared__ int numCandidates;
    __shared__ int indices[batch];
    __shared__ Segment candidates[batch];
    int lane = threadIdx.y * blockDim.x + threadIdx.x;
    int left = blockIdx.x * blockDim.x, top = blockIdx.y * blockDim.y;
    int x = left + threadIdx.x, y = top + threadIdx.y;
    bool activePixel = x < w && y < h;
    int tested = 0;
    Hit hit = {-1, 0, 0};
    for (int base = 0; base < count; base += batch) {
        if (lane == 0) numCandidates = 0;
        __syncthreads();
        int id = base + lane;
        if (lane < batch && id < count) {
            Segment s = segments[id];
            if (overlaps(s, left + 0.5f, top + 0.5f,
                         left + blockDim.x - 0.5f, top + blockDim.y - 0.5f)) {
                int slot = atomicAdd(&numCandidates, 1);
                indices[slot] = id;
                candidates[slot] = s;
            }
        }
        __syncthreads();
        if (activePixel) {
            tested += numCandidates;
            for (int j = 0; j < numCandidates; ++j)
                testSegment(candidates[j], indices[j], x + 0.5f, y + 0.5f, hit);
        }
        __syncthreads();
    }
    if (activePixel) writePixel(out, w, h, x, y, segments, hit, tested, count, view);
}
