// Edit this kernel and press R in the viewport to compile it and switch to Student.
// The starter is a working exhaustive renderer. The walkthrough is in README.md.
extern "C" __global__ void student(const Segment* segments, int count, unsigned char* out,
                                   int w, int h, int view) {
    int x = blockIdx.x * blockDim.x + threadIdx.x;
    int y = blockIdx.y * blockDim.y + threadIdx.y;
    if (x >= w || y >= h) return;
    Hit hit = {-1, 0, 0};
    int tested = 0;
    for (int i = 0; i < count; ++i) {
        // Exercise 1: reject a segment if x+0.5, y+0.5 lies outside its expanded AABB.
        // Exercise 2: prove which traversal order permits an early exit after a hit.
        // Exercise 3: make a whole block share its candidate list.
        ++tested;
        testSegment(segments[i], i, x + 0.5f, y + 0.5f, hit);
    }
    writePixel(out, w, h, x, y, segments, hit, tested, count, view);
}
