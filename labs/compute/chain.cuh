#pragma once

inline void run_chain(const Digits& digits, int images, int hidden, int outputs) {
    constexpr int pixels = 64;
    // Two fixed synthetic linear maps. A toolkit-independent seed keeps inputs comparable.
    GemmInput maps = random_gemm(pixels, outputs, hidden);
    std::vector<float> images_host(size_t(images) * pixels);
    for (size_t i = 0; i < images_host.size(); ++i) images_host[i] = digits.pixels[i] / 16.0f;
    Buffer<float> a(images_host), b(maps.a), c(maps.b);
    Buffer<float> result(size_t(images) * outputs);
    std::vector<double> folded(size_t(pixels) * outputs, 0);
    for (int p = 0; p < pixels; ++p)
        for (int k = 0; k < hidden; ++k)
            for (int j = 0; j < outputs; ++j)
                folded[p * outputs + j] += double(maps.a[p * hidden + k]) * maps.b[k * outputs + j];
    std::vector<double> reference(result.size, 0);
    for (int i = 0; i < images; ++i)
        for (int p = 0; p < pixels; ++p)
            for (int j = 0; j < outputs; ++j)
                reference[i * outputs + j] += double(images_host[i * pixels + p]) * folded[p * outputs + j];

    Blas blas;
    std::cout << images << " UCI digit rows x 64 pixels x " << hidden << " hidden x " << outputs << " output columns\n";
    auto benchmark = [&](const char* name, size_t scratch_size, double work, auto run) {
        Buffer<float> scratch(scratch_size);
        const Timing ms = measure_ms([&] { CHECK(cudaMemsetAsync(result.ptr, 0xff, result.size * sizeof(float))); },
                                   [&] { run(scratch.ptr); });
        std::cout << name << "  temporary=" << scratch_size * sizeof(float)
                  << " bytes  nominal FLOPs=" << std::fixed << std::setprecision(0) << work << std::defaultfloat << "\n";
        report(name, ms, work, "GFLOP/s");
        const auto host = result.read();
        ErrorStats errors;
        for (size_t i = 0; i < host.size(); ++i) errors.add(host[i], reference[i]);
        errors.verify(name, 2e-5);
    };
    benchmark("(AB)C", size_t(images) * hidden, 2.0 * images * hidden * (pixels + outputs), [&](float* scratch) {
        blas.multiply(a.ptr, b.ptr, scratch, images, hidden, pixels);
        blas.multiply(scratch, c.ptr, result.ptr, images, outputs, hidden);
    });
    benchmark("A(BC)", size_t(pixels) * outputs, 2.0 * pixels * outputs * (hidden + images), [&](float* scratch) {
        blas.multiply(b.ptr, c.ptr, scratch, pixels, outputs, hidden);
        blas.multiply(a.ptr, scratch, result.ptr, images, outputs, pixels);
    });
}
