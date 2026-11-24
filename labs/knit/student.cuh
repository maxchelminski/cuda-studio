// Save this file and press R in the cloth viewport to compile and select Student.
extern "C" __global__ void student(SOLVE_ARGS) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= vertices) return;
    if (pinned[i]) { out[i] = in[i]; return; }
    Point sum = {0, 0, 0}; int degree = 0;
    for (int k = 0; k < edgeCount; ++k) {
        // Use the incident table to visit only this vertex's constraints.
        // Its rows have eight edge IDs in ascending order; unused entries are -1.
        Edge e = edges[k];
        if (active[k] && (e.a == i || e.b == i))
            contribution(i, e, in, pinned, sum, degree);
    }
    out[i] = corrected(in[i], sum, degree);
}
