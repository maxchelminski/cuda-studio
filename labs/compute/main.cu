#include "common.cuh"
#include "inputs.hpp"
#include "learner.cuh"
#include "solutions.cuh"
#include "gemm.cuh"
#include "chain.cuh"
#include "other_labs.cuh"

static const char* usage = R"(Usage
  compute_lab gemm [M N K]                     default 512 512 512
  compute_lab digits [images]                  default 1797 (5..1797)
  compute_lab chain [images hidden outputs]    default 1797 512 10
  compute_lab spmv [matrix.mtx] [copies]       default bundled karate graph, 64 RHS vectors
  compute_lab reduce [cells]                   default 115008 (all digit pixels)
  compute_lab poisson [W H sweeps [out.pgm]]   default 257 193 40
Each run warms up each variant, measures nine event intervals, then checks the output.
)";

inline int integer_arg(const char* text, int upper) {
    const std::string s(text);
    size_t end;
    long long value = std::stoll(s, &end);
    if (end != s.size() || value < 1 || value > upper)
        throw std::runtime_error("Expected an integer from 1 to " + std::to_string(upper));
    return static_cast<int>(value);
}

int main(int argc, char** argv) {
    try {
        if (argc == 1 || std::string(argv[1]) == "--help") { std::cout << usage; return 0; }
        const std::string cmd = argv[1], dir = LAB_DATA_DIR;
        cudaDeviceProp gpu{};
        CHECK(cudaGetDeviceProperties(&gpu, 0));
        int runtime, driver;
        CHECK(cudaRuntimeGetVersion(&runtime));
        CHECK(cudaDriverGetVersion(&driver));
        std::cout << gpu.name << "  sm_" << gpu.major << gpu.minor << "  runtime " << runtime
                  << "  driver API " << driver << "  median of 9 CUDA event measurements\n";
        auto arg = [&](int pos, int fallback, int max) { return argc > pos ? integer_arg(argv[pos], max) : fallback; };
        if (cmd == "gemm" && (argc == 2 || argc == 5)) {
            run_gemm(random_gemm(arg(2, 512, 16384), arg(3, 512, 16384), arg(4, 512, 16384)));
        } else if (cmd == "digits" && argc <= 3) {
            const int count = arg(2, 1797, 1797);
            if (count < 5) throw std::runtime_error("Use at least 5 images");
            run_gemm(digits_gemm(read_digits(dir + "/digits.txt"), count));
        } else if (cmd == "spmv" && argc <= 4) {
            run_spmv(read_matrix(argc > 2 ? argv[2] : dir + "/karate.mtx"), arg(3, 64, 1000000));
        } else if (cmd == "chain" && (argc == 2 || argc == 5)) {
            run_chain(read_digits(dir + "/digits.txt"), arg(2, 1797, 1797), arg(3, 512, 2048), arg(4, 10, 1024));
        } else if (cmd == "reduce" && argc <= 3) {
            run_reduce(read_digits(dir + "/digits.txt"), arg(2, 115008, 64000000));
        } else if (cmd == "poisson" && (argc == 2 || argc == 5 || argc == 6)) {
            run_poisson(arg(2, 257, 4096), arg(3, 193, 4096), arg(4, 40, 4096), argc == 6 ? argv[5] : "");
        } else {
            std::cerr << usage;
            return 2;
        }
        std::cout << "PASS\n" << std::flush;
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "Error: " << error.what() << "\n";
        return 1;
    }
}
