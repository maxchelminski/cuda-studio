// A cloth vertex owns exactly one output position in each Jacobi sweep.
struct Point { float x, y, z; };
struct Edge { int a, b; float rest; };

// Each edge owns one persistent mask byte. Test predicted positions before
// projection so a solver sweep cannot hide the extension that caused a tear.
extern "C" __global__ void tear_stretched(const Point* positions, const Edge* edges,
                                         unsigned char* active, int edgeCount, float strainLimit) {
    int k = blockIdx.x * blockDim.x + threadIdx.x;
    if (k >= edgeCount || !active[k]) return;
    Edge e = edges[k];
    Point a = positions[e.a], b = positions[e.b];
    float dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    float maxLength = e.rest * (1.f + strainLimit);
    if (dx * dx + dy * dy + dz * dz > maxLength * maxLength) active[k] = 0;
}

extern "C" __global__ void predict(const Point* now, const Point* prev, Point* next,
                                    const unsigned char* pinned, int n, float dt, float time) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n) return;
    Point p = now[i], q = prev[i];
    if (pinned[i]) { next[i] = p; return; }
    float wind = 0.95f * sinf(2.f * time + 8.f * p.x + 3.f * p.y);
    next[i] = {p.x + 0.975f * (p.x - q.x) + dt * dt * (0.50f * wind),
               p.y + 0.975f * (p.y - q.y) + dt * dt * 0.65f,
               p.z + 0.975f * (p.z - q.z) + dt * dt * wind};
}

__device__ void contribution(int i, Edge edge, const Point* in, const unsigned char* pinned,
                             Point& sum, int& degree) {
    int other = edge.a == i ? edge.b : edge.a;
    Point p = in[i], q = in[other];
    float dx = p.x - q.x, dy = p.y - q.y, dz = p.z - q.z;
    float length = sqrtf(dx * dx + dy * dy + dz * dz);
    if (length < 1e-8f) return;
    float weight = pinned[other] ? 1.f : 0.5f;
    float factor = weight * (edge.rest - length) / length;
    sum.x += factor * dx; sum.y += factor * dy; sum.z += factor * dz;
    ++degree;
}

__device__ Point corrected(Point p, Point sum, int degree) {
    float weight = degree ? 0.96f / degree : 0.f;
    p.x += sum.x * weight; p.y += sum.y * weight; p.z += sum.z * weight;
    // A frictionless floor arrests disconnected fragments.
    p.y = fminf(p.y, 0.98f);
    return p;
}

#define SOLVE_ARGS const Point* in, Point* out, const Edge* edges, const int* incident, \
                   const unsigned char* active, const unsigned char* pinned, int vertices, int edgeCount

extern "C" __global__ void baseline(SOLVE_ARGS) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= vertices) return;
    if (pinned[i]) { out[i] = in[i]; return; }
    Point sum = {0, 0, 0}; int degree = 0;
    for (int k = 0; k < edgeCount; ++k) {
        Edge e = edges[k];
        if (active[k] && (e.a == i || e.b == i))
            contribution(i, e, in, pinned, sum, degree);
    }
    out[i] = corrected(in[i], sum, degree);
}

extern "C" __global__ void gathered(SOLVE_ARGS) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= vertices) return;
    if (pinned[i]) { out[i] = in[i]; return; }
    Point sum = {0, 0, 0}; int degree = 0;
    for (int slot = 0; slot < 8; ++slot) {
        int k = incident[i * 8 + slot];
        if (k >= 0 && active[k])
            contribution(i, edges[k], in, pinned, sum, degree);
    }
    out[i] = corrected(in[i], sum, degree);
}
