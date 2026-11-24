// Notes in the learner's own words can satisfy these checks.
window.LESSON_EVIDENCE = {
  "0/0": [
    "Copy the real compiler error message from your missing-semicolon build into your notes, including the filename, line number, and text (note that the compiler often flags the line right after the missing semicolon).",
    "After putting the semicolon back and rebuilding, save the `PASS` line for the 25 ms test (`got 40, expected 40`) and confirm the 8 ms test still passes at `125` FPS."
  ],
  "0/1": [
    "Write down how a frame that lands right on your budget behaves, and list which frames in `[16, 17, 16, 18]` (16 ms budget) get counted under the strict (`>`) rule vs. the inclusive (`>=`) rule.",
    "Check your hand counts against both runs: strict counts `2`, inclusive counts `4`, and strict returns `0` on an empty trace."
  ],
  "0/2": [
    "Write out your `2 × 2` output matrix `C`. For `C(1, 0)`, list the three pairs of flat indices your loop reads from `A` and `B` along with the numbers stored there.",
    "Verify those flat index pairs in `A` and `B` are `(3, 0)`, `(4, 2)`, and `(5, 4)`, whose products sum to `10`, and confirm the full hand product is `[[4, 5], [10, 11]]`."
  ],
  "0/3": [
    "For the first test, verify that the five entries of `out` finish as `[1, −0.5, 0, 3, 99]`—the untouched `99` at index 4 confirms the loop stopped in time.",
    "Paste the four slot lines from your second test into your notes, and answer both quick checks: if `output[0]` still held `7`, what did the loop skip? If `output[2]` held `0` instead of `9`, what did the loop overwrite by mistake?"
  ],
  "0/4": [
    "Check your 9-element sketch: does every real element (`0..8`) get visited exactly once, and can you point out which launched workers skipped writing? For each test length, verify that `wrote + skipped = started`.",
    "Save the 257-element `PASS` line from your GPU checker (confirming both kernels matched on every element, including index 256) and jot down one sentence on why index 256 is the critical boundary test.",
    "For the two-thread race example starting at `0`, note what value each thread read, what value each tried to write back, and what the final value should be if the two increments ran cleanly one after the other."
  ],
  "1/0": [
    "On your `5 × 3` pixel sketch, label pixel `(4, 2)` with its block coordinates, local thread coordinates, and flat 1D output index, and write one sentence explaining why another block finishing first cannot overwrite that pixel.",
    "Double-check the numbers: with `4 × 2` blocks, pixel `(4, 2)` is local thread `(0, 0)` in block `(1, 1)` at flat index `14`, and your CPU coverage check should report all `15` pixels written once out of `32` launched threads.",
    "In two separate GPU test runs, temporarily skip the threads handling elements `255` and `256` and record which index fails each time. Then remove the temporary early return, keep the normal bounds check, rerun, and save a clean `PASS` line."
  ],
  "1/1": [
    "Record the touched 32-byte sector count for each stride and offset you tested. For the `16 × 16` GEMM block, write down which `A` and `B` addresses lanes `0, 15, 16, and 31` request at the same inner-loop step.",
    "Verify your sector math on an aligned float array (`sector = floor(index / 8)`): 32 lanes touch `4` sectors at stride 1, `5` sectors when shifted by 1 float, and `32` sectors at stride 8."
  ],
  "1/2": [
    "Write down your GPU model, build mode, scene settings, and five batch runs. Sketch a short timeline showing where `kernel_p50_ms` and `host_p50_ms` start and stop, and log live viewport FPS on its own separate line.",
    "Check the FPS math on a batch: five frames taking `50 ms` total equals `100 FPS`. Note which parts of a full displayed frame are included inside `host_p50_ms` vs. `kernel_p50_ms`."
  ],
  "1/3": [
    "Sketch each level of partial sums for the 8-element array and the zero-padded 5-element array, and write down the exact addition order for the serial vs. balanced floating-point cancellation test.",
    "Verify the integer totals against your program: the 8-element tree sums to `31` in 7 additions across 3 levels, and padding `[3, 1, 4, 1, 5]` with three zeros keeps the sum at `14`."
  ],
  "1/4": [
    "Record three things: the original buggy rectangular failure (with `x`, `y`, and bad destination index), your `PASS` results on all five repaired shapes, and one Week 1 baseline timing row with all settings needed to rerun it.",
    "Verify the math: on the buggy `2 × 3` input, `(2, 0)` writes out of bounds to index `6` in a 6-element buffer; after fixing it, the flat output must be `[1, 4, 2, 5, 3, 6]`. Check your added `3 × 2` test by hand too."
  ],
  "2/0": [
    "Write down your four hand-computed matrix entries, one query where raw dot product and cosine similarity pick different gallery winners (including both winning labels), and the dimensions of your query, gallery, and score arrays.",
    "Check your numbers: the tiny product should equal `[[4, 6], [1, 7]]`, and on the digit dataset multiplying the `360 × 64` query matrix by the transposed `1,437 × 64` gallery yields a `360 × 1,437` score matrix."
  ],
  "2/1": [
    "For each parenthesization order, record the split point, total scalar multiplications, and intermediate matrix size, plus one timed run checking whether the lower-FLOP order actually ran faster.",
    "Verify the `100 × 5`, `5 × 100`, `100 × 5` example: `(AB)C` takes `100,000` multiplies with a `10,000`-element intermediate matrix, while `A(BC)` takes only `5,000` multiplies and a `25`-element intermediate matrix."
  ],
  "2/2": [
    "Save your rebuilt student GEMM’s pass/fail checks on shapes `(M, N, K) = (17, 19, 5)` and `(31, 33, 35)`, along with student vs. reference median times at square sizes `256`, `512`, and `1024`.",
    "Confirm all `323/323` and `1,023/1,023` outputs matched, trace the last valid output write by hand on each shape, and note in one sentence why out-of-bounds threads must still help load tiles and hit both `__syncthreads()` barriers."
  ],
  "2/3": [
    "On the exact same matrix input, log both variants’ runtimes, grid block counts, and registers per thread (if profiled), and note which thread computes each of the two output columns.",
    "Check widths `31`, `32`, and `33` against the CPU reference: at width `33`, confirm the second 32-column tile writes column `32` and safely skips column `33`."
  ],
  "2/4": [
    "Put every GEMM method on its own table row with `M, N, K`, precision policy, median ms, GFLOP/s, and numerical error, plus the CPU check on both non-square shapes (with `M` and `N` swapped).",
    "Double-check one GFLOP/s calculation from `2MNK / seconds` (for reference, a `512³` GEMM in `1 ms` is `~268.44 GFLOP/s`) and verify your unit conversion on your own timing."
  ],
  "3/0": [
    "Write down your three tiny CSR arrays (`row_offsets`, `columns`, `values`), and for the karate-club graph record min/median/max vertex degree, total degree sum, and separate byte sizes for `row_offsets`, `columns`, and `values`.",
    "Check your answers: the tiny CSR has `row_offsets = [0, 1, 1, 3, 3]` and product `[4, 0, 13, 0]`; on the karate-club graph, the last row offset and the degree sum must both equal `156` (`2 × 78` undirected ties)."
  ],
  "3/1": [
    "Sketch how a 32-lane warp steps through a 65-entry row, and record scalar-CSR vs. warp-per-row kernel times at `1`, `16`, and `256` right-hand sides on both matrices alongside each matrix’s row-length stats.",
    "Confirm a 32-lane warp runs `32`, `32`, and `1` active lanes across its three rounds on a 65-entry row, and verify the row-by-row accuracy check passed on each matrix before comparing timings."
  ],
  "3/2": [
    "For one mixed keep-flag input, write down the per-block exclusive scans, block totals, added block offsets, and the final compacted original indices next to your serial CPU filter output.",
    "Verify all three edge cases element by element—empty (`[]`), all-zero (`[]`), and all-one (every original index in order)—and confirm filtering the karate-club graph for `col > row` keeps exactly `78` edges."
  ],
  "3/3": [
    "Tabulate or plot array length `N`, runtime, and reduction variant, clearly noting that larger `N` repeats the digit gallery, and compute an upper bound on the sum using the maximum pixel value (`16`).",
    "Check the exact integer totals: one gallery pass (`115,008` pixels) sums to `561,718`, so a 10× repeat must sum to `5,617,180`. Confirm both GPU reductions match the CPU integer sum exactly."
  ],
  "3/4": [
    "Record the matrix source, thread mapping, right-hand-side count, per-call time, setup cost scope, and row-by-row accuracy check, and state the exact workload range where your chosen mapping wins.",
    "Verify total time using `S + R × per_call` at fixed matrix and RHS count—notice that when two mappings share the same setup cost `S`, running more multiplies `R` can never flip which mapping is faster."
  ],
  "4/0": [
    "Trace one pixel center by hand to its winning segment ID and color, log all four resolution/worm-count benchmark combinations, and note which stage dominates runtime in one of those scenes.",
    "Check the brute-force test formula (`width × height × worms × 24`): doubling both width and height quadruples candidate tests. Compare that `4×` work jump against how your actual kernel times scaled."
  ],
  "4/1": [
    "Record your test results for all seven horizontal, vertical, and zero-length capsule cases. For one overlapping pixel and one single-hit pixel, list every covering segment ID and the winner, then note one value you could precompute per segment and how many bytes it takes.",
    "Check the boundary cases: for a horizontal segment from `(0, 0)` to `(4, 0)` with radius `1`, pixel `(5, 0)` hits right on the rim while `(6, 0)` misses. Where two segments overlap, confirm the largest original segment ID wins."
  ],
  "4/2": [
    "Record your reloaded student kernel results on the frozen camera shot at two worm densities, listing the mode and candidate count or GPU time for each while keeping image resolution identical.",
    "Check the frozen ID and color buffers against the brute-force reference—including a partial edge tile—and confirm `0` differing pixels in both buffers (even if the debug Work heatmap changes)."
  ],
  "4/lighting": [
    "Sketch both ray segments (`camera → puddle` and `puddle → neon sign`), and save `lighting-after.csv`, the enabled effects list, and the reference-to-student GPU median speedup from the exact same shot.",
    "Confirm both frozen Beauty diffs report `0` differing pixels across both camera angles, and double-check your speedup ratio directly from the two GPU medians in `lighting-after.csv`."
  ],
  "4/3": [
    "Build a table of tile sizes and surviving candidate counts for sparse and crowded scenes (noting both the quietest and busiest tiles), then describe your worst-case overlapping-box scene and which tile size you expect to win.",
    "Check the accept-all sanity math: multiply each tile’s survivor count by its actual in-bounds pixel count and sum across tiles—the total must equal `total_pixels × total_segments`, even with partial edge tiles."
  ],
  "4/creature": [
    "Log one table row for each gate position (`0.25` and `0.8`) with primary link-test counts, GPU median times, and the saved CSV path, and note which camera angle showed the smaller speedup.",
    "For both gate positions, verify that your student kernel matches the optimized kernel’s primary test counts and exact-hit fields, and that the Beauty diff shows `0` differing pixels."
  ],
  "4/4": [
    "Save the raw frame-time logs for the matched scenes, kernel and host median/p95 numbers, a frozen pixel-diff result, and the locked settings for both modes (listing live viewport FPS separately).",
    "Double-check the percentile math on one mode’s 101 sorted host samples: the median is sample `51` and nearest-rank p95 is sample `96` (counting from 1). Check average FPS as `101,000 / sum_of_ms`."
  ],
  "5/0": [
    "Save both `5 × 5` hand-traced Jacobi sweeps and your CPU match check, plus an annotated copy of the native dipole pressure image labeling the positive lobe, negative lobe, zero contour, and scale.",
    "Check the dipole numbers: with center source `4` and zero boundary, sweep 1 sets the center to `1`, and sweep 2 keeps the center at `1` while setting all four direct neighbors to `0.25`."
  ],
  "5/1": [
    "For tile widths `8`, `16`, and `32`, write down useful stencil cells vs. shared-memory slots vs. output cells. Log global vs. shared timings on both native grids, and for your periodic student kernel save the code change, correctness check, and matched baseline/student timing.",
    "Check the `16 × 16` tile math: the 5-point stencil reads `320` distinct cells while an `18 × 18` shared block allocates `324` slots. Confirm CPU agreement at the exact same sweep count before reading into timing differences."
  ],
  "5/2": [
    "For each solver, log sweep count, final relative residual, and total solve median time, clearly naming your residual target and either the first passing sweep count you verified or the lowest residual you reached.",
    "Verify `||b − Ap|| / ||b||` against your target at both the passing sweep count and one sweep earlier, remembering that the whole-solve median already covers every sweep in that run."
  ],
  "5/3": [
    "Write down your 2-cell corrected face velocity, the before/after divergences on the 8 periodic cells, and the native dye metrics at two pressure-sweep counts with identical simulation step counts.",
    "Check the 2-cell hand math: with closed outer walls and shared velocity `2`, initial divergences are `+2` and `−2`, and a pressure step of `+2` cancels both. Confirm that adding `+10` to both pressures produces the exact same corrected velocity."
  ],
  "5/4": [
    "For both grids, record grid spacing, time step, final physical time, RMS error, and observed convergence order. In your research-paper note, put the paper’s dimension, forcing term, and main claim side by side with your 2D experiment’s equation.",
    "Verify the analytic decay ratios at `ν = 0.1, t = 1` (`amplitude = exp(−0.2)`, `energy = exp(−0.4)`) and check your refinement order from `log₂(error_32 / error_64)`."
  ],
  "6/0": [
    "Save all eight isolated-edge test results (including compression, diagonal, double-pinned, and zero-length endpoints), and annotate one matching cloth mesh edge with its two vertex IDs, pin flags, and rest length.",
    "Check the equal-mass hand math: for vertices at `x = 0` and `x = 3` with rest length `2`, one full correction moves them to `0.5` and `2.5`; pinning the left vertex at `0` moves the right vertex all the way to `2`."
  ],
  "6/1": [
    "Write out both updates of the 3-vertex chain `[0, 2, 4]` (rest lengths `1`), explicitly noting which positions feed the second edge, which thread writes the middle vertex, and your measured pin drift.",
    "Confirm both simultaneous edge corrections read the exact same pre-sweep center position, and check that every pinned vertex in the native fixture stays at its starting coordinates after the run."
  ],
  "6/2": [
    "List the incident edge IDs for one corner, one side, and one interior vertex, and save student vs. reference step medians, mesh dimensions, and max position differences for both benchmark meshes.",
    "Check the `3 × 3` diagonal-grid neighbor counts: `3` at a corner, `5` on an edge, and `8` in the interior. Disable one interior edge ID and confirm both endpoints skip it while still matching the all-edge reference."
  ],
  "6/3": [
    "Save the fracture unit-test output plus two simulation logs labeled with tear threshold, step number, `broken_edges`, and `rms_strain`. Note the earliest step where the two runs diverge and how finely your sampling interval pins it down.",
    "Confirm the tear rules: exact equality at the threshold and compression both stay intact, while stretch strictly over the threshold breaks. With 5 warm-up steps, runs of `1`, `5`, and `9` frames end at steps `6`, `10`, and `14`."
  ],
  "6/textile": [
    "Save two screenshots of the same hand-pulled tear from different camera angles with a nearby stitch or mark circled, along with the interaction check result and `textile-after.csv` from the locked strain-`0.53` shot.",
    "Confirm the tear stays pinned to that exact fabric spot on mouse release and camera orbit, disappears cleanly on reset, passes the locked-shot pixel check, and write one line explaining how the solver flags a disabled edge."
  ],
  "6/4": [
    "Record step timings on both intact and damaged benchmarks, plus RMS position error, max pin drift, and mismatched edge IDs from the matched 1-sweep patch tests, and explain in a sentence what work the vertex gather skips.",
    "Compare the omit, swap, and restored intact test cases: log the first mismatched vertex when an edge lookup is omitted, and verify active flags by edge ID even when two runs have the same total count of broken edges."
  ],
  "7/0": [
    "Write down your GPU model, input sizes, exact timing scope, and cache assumptions, along with measured vector-add useful bandwidth (`GB/s`), cuBLAS FP32 throughput (`FLOP/s`), and your computed ridge point (`FLOP/byte`).",
    "Verify the math: vector add moves `12` bytes per element (`2` reads + `1` write), so recompute `12N / seconds` and `2MNK / seconds`, then divide compute throughput by memory bandwidth to check the ridge point."
  ],
  "7/1": [
    "For both workloads, log both precision policies, runtimes, relative L2 error, and max absolute error against FP64, along with sample count and the full-output check. For digits, also save the full rankings log, count of flipped labels, and one narrow-margin query’s winner IDs, labels, and score gap.",
    "Check the cancellation example by hand: exact dot product is `2⁻¹²`, while rounding to 10 mantissa bits near `1` returns `0`. Apply your stated error and label-flip limits to decide whether the faster digit run passes."
  ],
  "7/2": [
    "Label CUTLASS 79b’s input value type, scale-factor type, accumulator type, and output type. For group sizes `16` and `32`, record payload bytes, scale bytes, reconstruction error, and the winning gallery label on the same query.",
    "Reconstruct the all-zero block and outlier block by hand: confirm an all-zero block stays exact `0`, and compare reconstruction error on the three small values before vs. after moving the `64` outlier into a separate group."
  ],
  "7/3": [
    "Break down memory usage into gallery bytes plus per-slot pinned host and device buffer bytes. Save exact-match results and serial, two-stream, and student timings at chunk sizes `16`, `64`, and `128`, clearly marking whether your timeline is profiler-traced or sketched.",
    "Check the tail chunk math: `360` queries in chunks of `64` leave a final chunk of `40` queries. Confirm all integer score rows (including that 40-row tail) match the reference and that no slot is reused before its readback finishes."
  ],
  "7/4": [
    "For both workloads, build one table listing precision policy, runtime, error, memory use, and benchmark settings (plus per-query label matches for digits). Highlight the Pareto-optimal (nondominated) passing rows and note whether timing jitter could swap any close call.",
    "Double-check every winning choice against its client’s rules: a passing option is dominated if another passing option is at least as good on both time and error and strictly better on at least one."
  ],
  "8/soundstage": [
    "Save total triangle tests for the 257-ray packet, both edited CSV paths, and the GPU median speedup ratios at `yaw = 0` and `yaw = 0.45`, pointing out which camera angle gained less.",
    "Confirm the packet’s closest hits match brute force and that frozen Beauty diffs show `0` differing pixels at both angles. Verify the pruning rule: once a hit is found at distance `5`, a queued box starting at distance `8` is skipped."
  ],
  "8/0": [
    "Write down your baseline, planned optimization, correctness threshold, exact timing scope, and the condition that would make you keep the baseline, plus three named development inputs and one separate held-out input.",
    "Rerun the untouched baseline on one named development input using your exact saved command, seed, and build flags, and confirm your acceptance rule cleanly evaluates to pass or fail."
  ],
  "8/1": [
    "Save one tiny input with its hand-worked answer, your independent reference check, and two correctness invariants, plus the first mismatched index or ID (expected vs. observed) triggered by your deliberate bug.",
    "Run that exact tiny test twice with identical inputs and tolerance: confirm the deliberately broken version fails your invariant and the restored version passes."
  ],
  "8/2": [
    "Document the single code change, which work counter you predicted it would move, the before/after counter values, and matched unprofiled runtimes, plus correctness results on your tiny, typical, and worst-case inputs.",
    "Recheck your tiny case against Day 2’s hand answer, then compare the work counter’s actual change against the wall-clock speedup on the larger input and explain any gap between the two."
  ],
  "8/3": [
    "Record at least five paired `(baseline, candidate)` timing runs per input, the median and min–max range of paired speedups, the correctness result on your held-out input, and one case where the speedup shrank or reversed.",
    "Verify every speedup row by dividing its own paired `baseline ms / candidate ms`, and check that the untouched held-out input passes your original correctness threshold before reporting its speedup."
  ],
  "8/4": [
    "Save your final report or walkthrough video containing reproduction commands, your correctness gate, and at least one weak or failed case. Score yourself `0–2` on each of the five rubric items and write four follow-up review questions labeled `+1`, `+3`, `+7`, and `+21` days.",
    "Run your own reproduction steps fresh from the course root on your tiny input: verify the expected answer, recompute one reported speedup from its raw timing pair, and confirm your five rubric scores add up to your total out of `10`."
  ]
};
