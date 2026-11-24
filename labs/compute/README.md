# Numeric workbench

[Open the interactive worksheet to check a prediction or read its explanation.](README.html)

If you arrived here from a lesson, use the section and step numbers it names, then return to the lesson for the remaining work. Each section can also be used on its own. All three datasets ship with the lab.

## Run an experiment

From the course root on the original Windows machine, the existing CUDA build of PyTorch can compile the kernels with NVRTC. Edit `labs/compute/learner.cuh`, save, and run the command again. Choose `gemm`, `digits`, `reduce`, `spmv`, `roof`, `poisson`, `chain`, or `all`. The shortcut prints real CUDA event timings for fixed test cases. The chain exercise calls cuBLAS through PyTorch and runs before the standalone toolkit is installed.

```powershell
python -B labs/compute/practice_now.py reduce
python -B labs/compute/practice_now.py chain
```

For the installed RTX 5070, open **Course PowerShell.cmd** in the course folder. The build script finds the course toolkit on G:, compiles for the installed GPU and runs the numerical checks. It also links the course runtime libraries beside the executable so you can run the built lab from an ordinary terminal. [NVIDIA compute capabilities](https://developer.nvidia.com/cuda/gpus) · [Windows installation guide](https://docs.nvidia.com/cuda/cuda-installation-guide-microsoft-windows/)

```powershell
powershell -ExecutionPolicy Bypass -File .\Build-Native.ps1
$build = '.\build\compute'
$lab = Join-Path $build 'Release\compute_lab.exe'
& $lab --help
& $lab gemm 19 33 7
```

In later sessions set `$build` and `$lab` again from the course root. After a kernel edit, repeat the build command and run your experiment. The program reads its two datasets of measurements and its graph directly from the source data directory. If you move the source folder, configure a fresh build directory. All commands below assume the course root and the `$lab` variable above.

<h3 id="small-gemm">Read the small product check</h3>

Week 2, Day 1 uses a 17-row, 9-column output with five terms per dot product. Before running `& .\build\compute\Release\compute_lab.exe gemm 17 9 5`, work out how many score entries a complete check should visit. Compare that number with `FP64 dot checks` and record the fraction. Even a score that loses the nearest-neighbor search belongs in this check. Return to the lesson. [Check or explain](README.html#check-dot-checks).

<h3 id="compare-fp32">Read a custom GEMM beside cuBLAS</h3>

In Week 2, Day 5, collect the naive, student, tile16 and cuBLAS FP32 rows for the same input. Record each median in milliseconds and its relative L2 error, along with the header’s FP64 check coverage. Keep the TF32-allowed row labeled separately. Return to the lesson for its two square shapes and the digit search.

<h3 id="fp32-ceiling">Measure the FP32 compute ceiling</h3>

For Week 7, Day 1, run the 1024 × 1024 × 1024 GEMM from the guided exercise. Use the reported nominal FLOP count or derive it using two FLOPs per multiply-add. From the cuBLAS FP32 median in milliseconds, compute the achieved rate in FLOP/s. Record your units and return to the Roofline calculation. [Check or explain](README.html#check-dense-rate).

## The measurement contract

Each native variant receives the same inputs and uses the default CUDA stream. One warmup precedes nine timed trials. The median, minimum, and maximum cover work submitted between two CUDA events. Allocation, initialization, host transfers, CPU reference construction, and correctness checks happen outside that interval. The native Poisson interval includes all sweeps. The chain interval includes both multiplies. Tiny trials can be dominated by launch and timing granularity. Large repeated matrices may be cache-resident. Save the shape, GPU, driver API/runtime versions, precision, median, numerical error, and any profiler evidence with each claim. If two sample ranges overlap, vary the run order and repeat your measurement before drawing a performance conclusion. [CUDA Best Practices Guide](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/)

`learner.cuh` has four correct starter kernels. Independent baselines and worked kernels live in `solutions.cuh`. The launch geometry for your variant lives in `gemm.cuh` or `other_labs.cuh`. When changing the mapping from one thread per row to one warp per row, update that grid size too. The shortcut has corresponding fixed launch sizes in `practice_now.py`. Use the native executable for custom geometry, long benchmarks, library comparisons, and profiling.

## 1. Spend fewer multiplies before touching a kernel

Week 2, Day 2. Use the two shapes below to check your operation counts and temporary sizes. Your lesson supplies both native timing commands. Caching a map across 200 batches is a separate experiment.

An image bank contains an `I × 64` matrix of ink measurements. Two fixed synthetic linear maps have shapes `64 × H` and `H × O`. You need all `I × O` output values. Both associations use cuBLAS with FP32 arithmetic. Only the intermediate changes.

**Before installing the toolkit**, use `python -B labs/compute/practice_now.py chain` to run both worksheet shapes on a supported CUDA PyTorch installation. Each trial times two `torch.mm` calls with preallocated intermediate and output tensors, with TF32 disabled. One warm-up precedes nine CUDA event samples. The shortcut compares every output against a CPU FP64 product outside the measured interval. The host submits both calls, so small cases can include Python dispatch gaps.

One RTX 3070 run with PyTorch 2.7.1+cu118 produced the following medians. Predict the faster order before revealing the table, then compare your timings and numerical errors. [Check or explain](README.html#check-chain-clock).

<details><summary>RTX 3070 measurements</summary>

| Images × hidden × outputs | Order | Nominal FLOPs | Temporary bytes | GPU median (ms) | Relative L2 error |
|---|---|---:|---:|---:|---:|
| 1797 × 512 × 10 | (AB)C | 136,169,472 | 3,680,256 | 0.0430 | 2.22e−7 |
| 1797 × 512 × 10 | A(BC) | 2,955,520 | 2,560 | 0.0154 | 1.79e−7 |
| 8 × 16 × 512 | (AB)C | 147,456 | 512 | 0.0082 | 9.78e−8 |
| 8 × 16 × 512 | A(BC) | 1,572,864 | 131,072 | 0.0092 | 1.06e−7 |

</details>

1. Draw the dimensions of both intermediate matrices for `I=1797, H=512, O=10`. Count nominal FLOPs using two per multiply-add. Decide which way to evaluate the chain. [Check or explain](README.html#check-chain-first).
2. Run `& $lab chain 1797 512 10`. Compare your estimates to the printed temporary size, work, timing, and FP64 reference error.
3. For the second shape, `I=8, H=16, O=512`, predict which order uses fewer FLOPs and which uses the smaller temporary. Then run `& $lab chain 8 16 512`. Compare your two predicted orderings with the printed counts and compare the ratio of the FLOP counts with the ratio of the median times. Where do those ratios differ most? [Check or explain](README.html#check-chain-second).
4. In `chain.cuh`, locate where the two maps are composed. Suppose those maps stay fixed for 200 arriving image batches. Write the equation for total time with a cached map. Identify which multiplication you would move outside a processing loop, then measure the two phases separately. [Check or explain](README.html#check-chain-cache).

For an additional challenge, construct a three-matrix shape where the order with the smaller temporary uses more FLOPs. Write down the dimensions and show both comparisons. [Check or explain](README.html#check-chain-shape).

<details><summary>Check the arithmetic for the first shape</summary>

For 1,797 images, the left association uses 136,169,472 nominal FLOPs and a 3,680,256-byte temporary. The right uses 2,955,520 FLOPs and a 2,560-byte temporary. The arithmetic ratio is about 46 to 1. The table above gives one measured time ratio. Launch costs and GPU utilization depend on the shapes. Reassociation also requires both maps to be linear when applied in sequence. Inserting a nonlinear activation between them would change this problem.

</details>

## 2. Reuse one tile across a block

Week 2, Day 3. Use this section for the two shared tiles, the barriers and the edge guards. Test the two rectangular inputs in your lesson. The two-output register change belongs to Day 4. The larger scaling runs below are optional.

1. Run `& $lab gemm 19 33 7` and `& $lab gemm 1024 1024 1024`. For a single output cell, write the two array indices loaded at inner-loop step `t`. Sketch its neighbor to the right and the one below it. Which input can each neighbor share with the first output? [Check or explain](README.html#check-tile-share).
2. Open `student_gemm` in `labs/compute/learner.cuh`. Keep one output per thread in a 16 × 16 block. Design a way for the block to fetch each needed A and B value once per 16-wide slice of the inner dimension, then reuse those values from shared memory. Decide which thread loads each value and when it is safe to read or replace it. Your kernel must still produce the same output when a dimension is smaller than, or unevenly divisible by, 16.
3. Rebuild and run the two rectangular tests from the lesson. For further edge checks use `& $lab gemm 1 1 257` and `& $lab gemm 73 129 35`. Explain what a thread at the partial right edge does when its own output is outside the matrix. Check that every thread in its block can reach every block barrier. Record the numerical check before comparing median GPU times. [Check or explain](README.html#check-tile-edge).
4. Double one dimension at a time. Then try 2048³ and 4096³ when the smaller runs pass comfortably. A 4096³ run stores three 64 MiB matrices on the GPU and performs about 137 billion nominal FLOPs per multiply. On the display GPU start with the short cases.

Count the explicitly loaded FP32 values and nominal FLOPs for one full 16 × 16 output tile across 16 inner terms. Exclude output stores. Convert the inputs to bytes and give the ratio in FLOPs per byte. For an access-order extension, label the 32 lanes of a warp in the 16 × 16 block and investigate which B addresses they request. [NVIDIA shared-memory GEMM discussion](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/#shared-memory-in-matrix-multiplication-c-ab) [Check or explain](README.html#check-tile-traffic).

<details><summary>Get a hint about edge tiles</summary>

Draw separately the A values a block needs, the B values it needs, and the output cells it will store. A thread at the edge can still be needed for a cooperative load. Decide what value an unavailable input should contribute to a dot product.

</details>

<details><summary>Check the input-load calculation</summary>

For this full inner tile the block loads 256 values from A and 256 from B. Those 512 floats occupy 2,048 bytes. The 256 outputs each accumulate 16 products, for 8,192 nominal FLOPs, or 4 FLOPs per input byte. Caches, sector transactions and output stores can change the traffic measured at the DRAM interface.

</details>

**Verification experiment.** Small native products check every output with an FP64 dot product. For large products the runner takes reproducible FP64 dot samples and tests three signed projections over every output. For a vector `r` with entries ±1, check `C r ≈ A (B r)`. Each side uses matrix–vector multiplies, so all three probes together still take quadratic work on square inputs. The three vectors use a fixed seed. Roundoff and cancellation make this a numerical diagnostic. Open `verification.hpp` to inspect the row-scaled tolerance.

On a 512³ case, introduce a finite error of +10 in just one interior cell of the student output. Predict which check can find it, run the case, then undo the edit and rerun. On a 2×2 paper example, construct two wrong columns whose contributions cancel for `r=[1,1]` but become visible for `r=[1,−1]`. Explain why independent projections add information. [MIT · verifying a matrix product](https://courses.csail.mit.edu/6.856/17/Notes/n11-fingerprint.html) [Check or explain](README.html#check-matrix-check).

## 3. Compare FP32 and TF32-allowed digit retrieval

For Week 2, Day 1, read the first item to identify the gallery, queries and score matrix. Then return to the digit explorer and the small score check. Week 7, Day 2 uses the precision comparison and the top-two score gap.

1. Run `& $lab digits 1797`. The gallery takes the first 1,437 images. The other 360 are queries. Each 64-feature image is normalized to unit length. One rectangular GEMM gives every query/gallery cosine similarity. The gallery has no query self-match. This fixed split is for numerical experiments using a subset of the UCI data.
2. For the FP32 and TF32-allowed cuBLAS rows, record each median, relative L2 error, maximum absolute error, and number of correct nearest-image labels. Did the score errors change? Did the number of correct labels change? Equal counts alone cannot tell you whether both methods chose the same winning image for every query. [Check or explain](README.html#check-numeric-precision).
3. In `gemm.cuh`, collect the largest and second-largest score in each row. Predict which winners are sensitive to rounding. Record the smallest gap and whether a winner actually flips. Increase K using the synthetic GEMM command to investigate another shape. [Check or explain](README.html#check-digit-margin).
4. Use Nsight Compute on a larger GEMM to check which instructions run in each library mode. The TF32 flag permits Tensor Core execution. Kernel choice depends on shape and library. Record a profiler observation before claiming Tensor Core utilization. [cuBLAS compute types](https://docs.nvidia.com/cuda/cublas/#cublascomputetype-t) · [Nsight Compute](https://docs.nvidia.com/nsight-compute/)

Explain how a small gap between the two highest scores could let rounding change a predicted digit. For a larger design exercise, make a memory budget for 100,000 queries and 100,000 gallery vectors. Show how many temporary scores and candidate neighbors your design stores while retaining the top k per query. [Check or explain](README.html#check-digit-budget).

<details><summary>Compare with the digit reference</summary>

For the bundled split, a CPU FP64 calculation yields 343 correct digit labels among the 360 queries. The scores being compared are cosine similarities. Numerical correctness and recognition accuracy answer different questions.

</details>

## 4. Count real ink with fewer atomics

In Week 3, Day 4, compare the integer total and the number of global updates. Your lesson lists the inputs for the tail-block check. The shuffle and byte-storage variants below are optional follow-ups.

1. Run `& $lab reduce 115008`. Each of the 1,797 images contributes 64 cells, and each cell counts black pixels in a 4 × 4 patch. Record the `Exact ink sum` printed by the CPU reference. Larger runs repeat these same cell measurements.
2. Edit `student_reduce` in `labs/compute/learner.cuh`. The starter updates the same global total once for every input cell. Make the 256 threads in each block combine their cell values and contribute just one update per block. Decide how to exchange partial sums and which thread contributes the combined sum. The last block may contain fewer than 256 cells. The integer total must match the CPU reference exactly. [Check or explain](README.html#check-ink-combine).
3. Before running length 257, predict how many global atomic updates the starter and your design would issue at the source level. Test lengths 1, 255, 256, 257, 261, 115008, and 4194304. Record whether the exact sums pass and compare median times and logical input GB/s at the largest size. A claim about actual hardware requests needs profiler or generated-code evidence. [Check or explain](README.html#check-ink-atomics).
4. As an optional extension, let the final warp exchange its partial sums with shuffle instructions. Explain which lanes take part and why the values in positions past the end of the data cannot alter the total. [Check or explain](README.html#check-ink-warp).

For a second extension, begin with four bytes per input cell and compare a one-byte input representation. Record the storage change, logical GB/s and time for each implementation. To investigate a limit, identify which part you can time or profile separately.

<details><summary>Check the full dataset and the 257-cell prediction</summary>

The 115,008 cells sum to 561,718. At length 257 the starter issues 257 source-level atomic updates. With one update per block of 256 threads, the first block and the partial final block each contribute once.

</details>

**Test the boundary check.** Before editing a working kernel, compare the reference sums for lengths 256, 257 and 261. If a bug dropped every cell in an incomplete final block, which lengths would expose it? Temporarily introduce that mistake in `student_reduce`, rebuild, run the three lengths and compare each outcome with your prediction. Restore the working version, rebuild and rerun before timing. [Check or explain](README.html#check-ink-tail).

<details><summary>Explain the boundary results after testing</summary>

The first 256 cells sum to 1,218. The next five values are `[0,0,0,1,11]`. At 257, dropping the last block still gives the correct sum by coincidence. At 261 the correct sum is 1,230, so the same mistake now fails.

</details>

## 5. Assign work to an irregular sparse matrix

Week 3 visits this worksheet three times. On Day 1, finish item 1 with the club graph. On Day 2, use items 2 and 3 for the roof matrix and repeated inputs. Day 5 returns to pricing the shared setup. Item 4 describes an optional four-lane mapping.

1. Open `labs/compute/data/karate.mtx`. Vertex IDs in the file start at 1, and each friendship is listed once. Count the entries where 1 occurs at either end. In the expanded CSR matrix on the GPU, that person is row 0. Predict its first two row offsets and the value of `y[0]` when every input is one. Run `& $lab spmv labs/compute/data/karate.mtx 1` and compare the printed `y[0]` with your count. [Check or explain](README.html#check-csr-first).
2. Run `& $lab spmv labs/compute/data/bcsstk14.mtx 1`. An applied displacement vector multiplied by this structural stiffness matrix produces generalized forces. Contrast its row-length distribution with the friendship graph. The lab's all-ones vector is an arithmetic probe.
3. With 32 lanes assigned to one row, short rows leave some lanes with no matrix element to read. Use the printed row-length ranges to predict which matrix will show more of this idle work. On both files rerun the command with its final argument set to 1, 16 and 256. Compare scalar and warp-per-row median times for each setting. Each copy adds one independent input vector while reusing the same matrix. [Check or explain](README.html#check-csr-lanes).
4. Optional after the eight-lane lesson exercise. In `student_spmv`, assign a group of four lanes to each output row instead. Decide how the four lanes divide the row, combine their partial sums and select a single writer. Derive a matching student grid for the 128-thread block in `run_spmv` in `other_labs.cuh`. Include the last partial group of rows and multiple input vectors in your correctness checks. Compare the scalar, student and full-warp medians on both datasets. [Check or explain](README.html#check-csr-four).

Use the roof matrix dimensions and expanded `nnz` from the command output to calculate what fraction of a dense array would hold zeros. Also inspect the row with the largest reported error relative to its tolerance. Large stiffness coefficients can cancel inside a row. [Original NIST matrix record](https://math.nist.gov/MatrixMarket/data/Harwell-Boeing/bcsstruc2/bcsstk14.html) · [Matrix Market coordinate format](https://math.nist.gov/MatrixMarket/formats.html) [Check or explain](README.html#check-csr-density).

<details><summary>Compare your counts with the bundled files</summary>

For the club graph, vertex 1 has degree 16. The first two CSR offsets are 0 and 16. There are 34 rows and 156 expanded entries. Row lengths have minimum 1, median 3 and maximum 17. For the roof matrix there are 1,806 rows and 63,454 expanded entries, with row lengths of 1, 37 and 48 at the same three summary points.

</details>

The checker also compares each output to an independent FP64 dot product with an allowance scaled to that row's sum of absolute products, FP32 precision, and number of additions. It reports the row and RHS with the largest error as a fraction of this allowance. A value above one fails. Inspecting one row at a time keeps large stiffness coefficients in other rows from concealing a wrong small output.

## 6. Make a pressure solve reach a physical target

Week 5, Day 1 uses the first update and the zero border. Day 2 follows the halo loads in item 3. Day 3 compares time to a common residual in item 4. Use the shapes, commands and stopping condition in the lesson you have open.

1. Begin with pressure zero at every cell, including the fixed boundary. At an interior cell with source value `b`, the equation for unit spacing is `4p - west - east - north - south = b`. Using only pressures from the starting grid, derive the first Jacobi update at that cell as an expression in `b`. What happens at a positive source and at a negative one? Run `& $lab poisson 65 49 1` and find the fixed-sweep numerical check. [Check or explain](README.html#check-jacobi-zero).
2. Run 5, 20, 80, and 320 sweeps with the same grid. Record time and the relative residual `||b - Ap||₂ / ||b||₂`. The separate FP64 check measures whether your implementation matches **the requested number of Jacobi updates**. A correct implementation can still have a large residual.
3. Edit `student_poisson` so a block reuses pressure values in shared memory. A halo is the strip of neighboring cells outside the block’s output tile that the stencil reads. Sketch the tile and its halo. Decide which threads fetch each value, including at a partial image edge, and when they may begin calculating outputs. Rebuild and compare against the fixed-sweep reference on a non-square grid with both odd and even sweep counts. [Check or explain](README.html#check-jacobi-edge).
4. Choose a common residual target, then compare two approaches on **time to target**. For a deeper extension, implement red-black Gauss–Seidel as two global launches per sweep. Use the residual for comparisons between methods and keep the fixed-sweep FP64 Jacobi checker for the equivalent Jacobi kernels. [Check or explain](README.html#check-numeric-pressure).

```powershell
& $lab poisson 257 193 80 "$build\pressure.pgm"
```

The optional PGM is an 8-bit image of the **student kernel's signed pressure**. Mid-gray means zero. Each exported field scales to its own peak, printed in the console. Quantitative comparisons need residuals and a fixed color scale. This experiment isolates the pressure equation used inside projection-based fluid solvers. [GPU Gems, Fast Fluid Dynamics Simulation on the GPU](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu)

## Benchmark diary

Both runners print the nine CUDA event intervals in acquisition order on the `samples_ms` line. Save the raw values with the variant name and workload. Sort a copy and check that the fifth value agrees with the reported median to its displayed precision. This command saves the full native run in your G build folder.

```powershell
& $lab chain 1797 512 10 | Tee-Object "$build\chain-first-run.txt"
```

| Shape / data | Hypothesis | Edit | Baseline ms | Student ms | Error or exact sum | Counter or explanation |
|---|---|---|---:|---:|---|---|
| | | | | | | |

At the next session, reproduce the edge case that caught your last mistake. At the end of the week, run an unfamiliar shape and predict the winner in writing. Your explanation should account for one result where the more elaborate implementation loses. [Check or explain](README.html#check-new-shape).
