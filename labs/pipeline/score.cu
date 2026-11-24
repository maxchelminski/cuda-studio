// Each lane scores one gallery image against one query, comparing all 64 pixels.
extern "C" __global__ void score_digits(const unsigned char* gallery,
                                        const unsigned char* queries,
                                        unsigned int* scores,
                                        int gallery_count, int query_count) {
    const int index = blockIdx.x * blockDim.x + threadIdx.x;
    if (index >= gallery_count * query_count) return;

    const int query = index / gallery_count;
    const int image = index % gallery_count;
    unsigned int score = 0;
    for (int pixel = 0; pixel < 64; ++pixel) {
        score += queries[query * 64 + pixel] * gallery[pixel * gallery_count + image];
    }
    scores[index] = score;
}
