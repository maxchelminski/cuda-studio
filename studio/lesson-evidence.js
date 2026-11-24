// Notes in the learner's own words can satisfy these checks.
window.LESSON_EVIDENCE = {
  "0/0": [
    "Save one actual compiler diagnostic from the missing-semicolon build. Include the source filename, reported line number and message. The compiler may point to the following line, where it discovered the problem.",
    "After restoring the semicolon, rebuild and copy the 25 ms test’s PASS line. It should say got 40, expected 40. The 8 ms test should still pass with 125 FPS."
  ],
  "0/1": [
    "Describe what happens to a frame exactly at your budget. For the trace [16, 17, 16, 18] and a 16 ms budget, write down which frames the strict and inclusive rules count.",
    "Compare your hand count with both runs. The strict rule counts 2, the inclusive rule counts 4, and the strict rule counts 0 on an empty trace."
  ],
  "0/2": [
    "Write your four output entries in two rows. For C(1,0), draw the three pairs of flat input positions read by the loop and label each pair with its values.",
    "The paired positions in A and B are (3,0), (4,2) and (5,4). Their products add to 10. Check the other entries against the hand product [[4,5],[10,11]]."
  ],
  "0/3": [
    "In the first test, output[i] receives each product. The five slots of out should finish as [1, −0.5, 0, 3, 99]. The 99 shows the loop stopped before slot 4.",
    "Paste the four short slot lines from your second test. If slot 0 still held 7 afterward, what did the loop skip? If slot 2 held 0 instead of 9, what did the loop change that it should have left alone?"
  ],
  "0/4": [
    "In your nine-item drawing, does every real slot have exactly one tick? Can you point to the workers that start and skip the write? For each test length, check that your “wrote” and “skipped” counts add up to your “started” count.",
    "Keep the 257-item PASS line from the GPU checker you ran. Both kernels were checked against the expected sums, including the last element. Does your explanation say what makes that last element an interesting test?",
    "In the two-thread example, the counter starts at zero. Compare what each thread read, what each tried to store, and what you would expect after two increments performed one after the other."
  ],
  "1/0": [
    "On the 5 × 3 sketch, identify pixel (4,2), its block, its local thread, and its flat output index. Explain why another block finishing first cannot change that pixel.",
    "With 4 × 2 blocks, (4,2) is local (0,0) in block (1,1), at index 14. Your CPU coverage assertion should find 15 slots written once across 32 launched threads.",
    "In separate GPU runs, temporarily skip the workers responsible for elements 255 and 256. Record each missing index. Remove the temporary early return, keep the ordinary bounds check, and rerun. Save a passing line."
  ],
  "1/1": [
    "Keep sector counts for each stride and offset. For the 16 × 16 GEMM block, annotate which A and B addresses lanes 0, 15, 16 and 31 request at the same inner-loop step.",
    "At an aligned base, map each float index to floor(index/8). The 32 lanes touch 4 distinct sectors at stride 1, 5 after an offset of one, and 32 at aligned stride 8."
  ],
  "1/2": [
    "Keep the device, build, scene settings and five batch results. Mark the start and end of kernel_p50_ms and host_p50_ms on your timeline. Give live viewport FPS its own entry.",
    "Recalculate the example from elapsed time. Five frames totaling 50 ms give 100 FPS across the batch. Check which parts of the live frame your two benchmark intervals include."
  ],
  "1/3": [
    "Draw successive sums for the eight inputs and the padded five-input case. Record the order of the float additions in the serial and balanced cancellation example.",
    "The eight-leaf sum is 31 after seven additions over three levels. Padding [3,1,4,1,5] with three zeros must preserve its sum of 14. Compare both integer traces to your program."
  ],
  "1/4": [
    "Keep the original rectangular failure with x, y and destination index, the five repaired shape results, and a Week 1 baseline row with enough settings to rerun it.",
    "For the original 2 × 3 input, (2,0) attempts index 6 in a six-element output. After repair the flat result must be [1,4,2,5,3,6]. Verify your added 3 × 2 case independently."
  ],
  "2/0": [
    "Save the four hand-computed entries, the query and both winning gallery labels for one metric disagreement, and the shapes of your query, gallery and score arrays.",
    "Your toy product should be [[4,6],[1,7]]. In the digit split, a 360 × 64 query array times the transposed 1,437 × 64 gallery produces 360 × 1,437 scores."
  ],
  "2/1": [
    "Keep the chosen split, multiplication count and temporary size for each order. Include a measured case where you checked whether the cheaper order actually finished sooner.",
    "For 100 × 5, 5 × 100, 100 × 5, the left-first order uses 100,000 scalar multiplies and a 10,000-entry temporary. The right-first order uses 5,000 and 25."
  ],
  "2/2": [
    "Save the rebuilt student GEMM’s checks for shapes (17,19,5) and (31,33,35) in M,N,K order. Record student and reference median times at square sizes 256, 512 and 1024.",
    "Record the output-check counts, 323/323 and 1,023/1,023, and hand-trace the final valid store on each shape. Explain why lanes outside the output still participate in tile loading and both barriers."
  ],
  "2/3": [
    "For the same input, record both variants’ times, block counts, and registers per thread if measured. Mark which thread owns each of the two output columns.",
    "Test widths 31, 32 and 33 against the CPU result. At width 33 a second 32-column tile must produce column 32. Column 33 is outside the output."
  ],
  "2/4": [
    "Give each method its own row with M,N,K, precision policy, median ms, GFLOP/s and numerical error. Record the CPU check for both rectangular shapes with M and N exchanged.",
    "Recompute one throughput from 2MNK and seconds. A 512-cubed GEMM in an illustrative 1 ms gives about 268.44 GFLOP/s. Apply the same unit conversion to your own result."
  ],
  "3/0": [
    "Keep your three toy CSR arrays. On the club graph record minimum, median and maximum degree, their total, and separate byte counts for offsets, columns and values.",
    "The toy row offsets are [0,1,1,3,3] and the product is [4,0,13,0]. On the real graph the final offset and the degree sum must both equal twice the 78 stored ties."
  ],
  "3/1": [
    "Diagram one 65-entry row and record scalar and warp-per-row kernel times at 1, 16 and 256 right-hand sides on both matrices. Include each matrix’s row-length summary.",
    "A 32-lane warp uses 32, 32 and 1 active lanes in its three rounds on that row. Verify the row-local numerical check on each matrix before comparing its timing rows."
  ],
  "3/2": [
    "Show local exclusive prefixes, block totals, and the added block offsets for one mixed input. Save the compacted original indices in order beside your serial filter’s output.",
    "Compare element by element on empty, all-zero and all-one flags. Those cases must yield [], [], and every original index in order. The graph’s column > row filter keeps 78 ties."
  ],
  "3/3": [
    "Plot or tabulate length, time and variant. Label the extra cells at larger N as repetitions of the digit gallery. Bound the sum using the largest possible cell value, 16.",
    "One complete pass has 115,008 cells and sums to 561,718. A tenfold repetition should sum to 5,617,180. Check that both GPU reductions match the integer reference."
  ],
  "3/4": [
    "Name the matrix source, mapping, right-hand-side count, per-call time, setup scope and row-local accuracy result. Give the tested range in which your mapping choice holds.",
    "Recalculate both totals as S + R × per-call time at fixed input and RHS count. With common setup S, repeating the same call cannot reverse which mapping is faster."
  ],
  "4/0": [
    "Trace one pixel center to its winning segment ID and color. Save all four resolution/population combinations and identify which measured stage limits one of those scenes.",
    "Count baseline candidates as width × height × worms × 24. Doubling both image dimensions gives four times as many candidates. Compare this predicted count with your kernel times."
  ],
  "4/1": [
    "Keep the seven horizontal, vertical and zero-length capsule results. Annotate an overlapping sample and a single-hit sample with their covering IDs and winners. Name one quantity to precompute and its storage cost.",
    "For a horizontal segment from (0,0) to (4,0) with radius 1, (5,0) is on the included rim and (6,0) is outside. For an overlap, verify the largest covering original ID wins."
  ],
  "4/2": [
    "Record the reloaded student kernel, frozen shot and two densities. For each density give the mode and candidate count or GPU time, with image dimensions held fixed.",
    "Compare the student’s frozen ID and color buffers with the exhaustive renderer, including a partial edge tile. Both counts of differing pixels should be zero even if the Work view changes."
  ],
  "4/lighting": [
    "Sketch the eye-to-puddle and puddle-to-sign ray segments. Save lighting-after.csv, the enabled effects, and the reference/student GPU median ratio from the same shot.",
    "Record the frozen Beauty comparisons at both camera angles. Each should report zero differing pixels. Calculate the ratio from the GPU medians of the two modes in your saved CSV."
  ],
  "4/3": [
    "Tabulate tile size and survivor counts for sparse and crowded scenes, including a least- and most-crowded tile. Describe your hostile overlapping-box scene and predicted best tile size.",
    "In the accept-all case every tile sees every segment. Multiply survivors by each tile’s actual pixel count and sum. The total must equal pixels × segments even for partial edge tiles."
  ],
  "4/creature": [
    "Keep a row for each gate setting, 0.25 and 0.8, with primary link counts, GPU medians and the saved CSV path. Identify the view with the smaller measured gain.",
    "For each setting compare the student and optimized primary counts and exact-hit fields. They should agree, and the Beauty comparison should report zero differing pixels."
  ],
  "4/4": [
    "Keep raw frame times from the matched scenes, kernel and host median/p95, a frozen pixel comparison and the settings used for both modes. Label live FPS separately.",
    "Sort the 101 host samples for one mode. The median is entry 51 and nearest-rank p95 is entry 96, counting from one. Recompute throughput as 101,000 divided by the sum in ms."
  ],
  "5/0": [
    "Keep both 5 × 5 sweep drawings and the CPU comparison. Label the positive and negative lobes, zero level and scale on the separate native dipole pressure image.",
    "For the positive operator with center source 4 and zero boundary, sweep one puts 1 at the center. Sweep two leaves that 1 there and puts 0.25 at each of its four neighbors."
  ],
  "5/1": [
    "For widths 8, 16 and 32, distinguish useful positions, shared slots and outputs. Keep global/shared results on both native grids. For your periodic student kernel, record the shared-memory change, check result and a matched baseline/student timing.",
    "For a 16 × 16 interior tile the one-cell footprint has 320 pressure positions and the 18 × 18 rectangle has 324 slots. Compare CPU agreement at identical sweep counts before interpreting time."
  ],
  "5/2": [
    "For each method, tabulate sweep count, final relative residual and whole-solve median. Name the target and record the first passing count you verified, or your final tested residual.",
    "Check the reported ||b−Ap||/||b|| against the target at the proposed passing count and the preceding count. The whole-solve median already includes every sweep in that run."
  ],
  "5/3": [
    "Show the two-cell corrected face velocity, the before/after divergence on eight periodic cells, and the native dye measurements at two pressure-sweep settings with equal step counts.",
    "With closed outer faces and shared velocity 2, the initial cell divergences are +2 and −2. A pressure difference of +2 removes both. Add 10 to both pressures and check again."
  ],
  "5/4": [
    "For both grids give spacing, time step, final physical time, RMS error and observed order. In the research comparison identify the paper’s dimension, forcing and claim alongside your experiment’s equation.",
    "At ν = 0.1 and t = 1, the analytic amplitude ratio is exp(−0.2) and the energy ratio is exp(−0.4). Check both, then recompute refinement order from log₂(error₃₂/error₆₄)."
  ],
  "6/0": [
    "Save the eight isolated-edge results, including compression, a diagonal, two pins and coincident endpoints. Label one matching mesh edge with endpoints, pin flags and rest length.",
    "For the full isolated correction with equal masses at x = 0 and 3 and rest length 2, the new positions are 0.5 and 2.5. Pin the left endpoint and the right must move to 2."
  ],
  "6/1": [
    "Show both updates of [0,2,4] with rest lengths 1. Label the positions used to compute the second edge correction, the thread owning the middle output and the measured pin drift.",
    "Check that the simultaneous correction on each edge reads the same old center position. In the native fixture compare each pinned position to its start after the same sweep count."
  ],
  "6/2": [
    "List incident IDs for a corner, side and interior vertex. Keep the student and reference step medians, mesh sizes and positional differences for both benchmark meshes.",
    "On an intact 3 × 3 patch with both diagonals the neighbor counts are 3, 5 and 8. Disable one interior edge ID. Both endpoints should skip it and still agree with the all-edge reference."
  ],
  "6/3": [
    "Keep the fracture fixture and two histories labeled with threshold, simulation step, broken_edges and rms_strain. Identify the earliest measured divergence and state how precisely the sampling locates it.",
    "In the tensile fixture, equality at the threshold and compression both leave the edge active. Excess stretch breaks it. With five warm-up steps, runs of 1, 5 and 9 frames finish at steps 6, 10 and 14."
  ],
  "6/textile": [
    "Save two views of the same hand-made opening with a nearby stitch or calibration mark circled. Keep the interaction-check result and textile-after.csv from the fixed strain-0.53 shot.",
    "On orbit and release the opening should stay on that material location. Reset should clear it. Verify the fixed-shot pixel check and describe how the solver separately stores a disabled edge."
  ],
  "6/4": [
    "Keep timings for the intact and damaged benchmarks. Separately record RMS position difference, maximum pin drift and mismatched edge IDs from the matched one-sweep patch fixtures. Explain the work avoided by the gather.",
    "Compare the omit, swap and restored intact fixtures. Record the first differing vertex for the missing lookup, and compare active flags by original edge ID even when the number of breaks agrees."
  ],
  "7/0": [
    "Record device, input sizes, timing boundaries and cache assumptions. Keep the measured vector-add useful GB/s, cuBLAS FP32 FLOP/s, and the resulting ridge point in FLOP/byte.",
    "For each valid vector element count two four-byte reads and one four-byte write. Recompute 12N/time and 2MNK/time in seconds. Divide the latter by bytes/s to check the ridge point."
  ],
  "7/1": [
    "For both workloads record the two policies, times, relative L2 and largest absolute error over the FP64 dots checked. Keep the sample count and full-output probe result. For digits, also save the full rankings log, the number of changed labels and one small-gap query’s winner IDs, labels and gap.",
    "In the cancellation witness the exact product is 2⁻¹². Explicit rounding to ten fraction bits near 1 gives 0. Apply your stated error and label-change limits to the measured digit results."
  ],
  "7/2": [
    "Annotate 79b’s input values/scales, accumulator and output types. For group sizes 16 and 32 keep value bytes, scale bytes, reconstruction error and the winning gallery label for the same query.",
    "Reconstruct the all-zero and outlier blocks by hand. Every all-zero block must remain zero. Compare errors for the same three small inputs before and after moving 64 into its own group."
  ],
  "7/3": [
    "Itemize gallery bytes and per-slot pinned host/device bytes. Save exact-match results and serial, two-stream and student times at chunks 16, 64 and 128. Label your timeline as traced or predicted.",
    "With 360 queries, chunks of 64 leave a final chunk of 40. Verify the integer score rows, including that tail, against the reference and check that slot reuse waits for its previous readback."
  ],
  "7/4": [
    "For both workloads give precision, time, error, memory and benchmark settings. For digits also compare every predicted label. Mark the admissible nondominated rows and explain how timing variation affects each decision.",
    "Recheck every claimed winner against its client’s acceptance rules. A feasible row is dominated if another is no worse on both time and error and strictly better on at least one."
  ],
  "8/soundstage": [
    "Save the triangle-test totals for the 257-ray packet, both edited CSV paths and the GPU median ratios at yaw 0 and 0.45. Identify the camera where the gain was weakest.",
    "Verify the packet’s nearest hit against brute force and the frozen Beauty comparisons for both angles. With first hit at 5, a second box beginning at 8 should be pruned."
  ],
  "8/0": [
    "Name the baseline, proposed change, quality threshold, timing boundary and condition for retaining the baseline. Give three named development inputs and one separately identified held-out input.",
    "Rerun the unmodified baseline on a named development input using the stored command, seed and build settings. Confirm that your predeclared acceptance rule can produce a definite pass or fail."
  ],
  "8/1": [
    "Save a tiny input and hand-calculated answer, your independent reference, and two invariants. Log the deliberate defect’s first mismatched index or ID with expected and observed values.",
    "Run the same tiny case twice. The broken copy must violate the named invariant, and the restored code must pass. Keep the input and tolerance identical in both runs."
  ],
  "8/2": [
    "Show the one code change, its predicted effect on a specific work count, before/after counts and comparable unprofiled times. Save the tiny, typical and adversarial correctness results.",
    "Recheck the tiny case against Day 2’s independent answer. On the same larger input compare the predicted counter with its measured change and explain any difference from the timing change."
  ],
  "8/3": [
    "Keep at least five raw baseline/candidate pairs per case, their median and range of paired ratios, the held-out accuracy result and a limitation or case where the gain weakened.",
    "Recalculate each ratio from its own pair as baseline ms divided by candidate ms. Apply the original acceptance threshold to the untouched held-out input before reporting its speedup."
  ],
  "8/4": [
    "Save the report or recording with reproduction steps, one failed or weak case and the quality gate. Give five rubric scores from 0 to 2 and write one question for each review, labeled +1, +3, +7 and +21 days.",
    "Follow the report’s own steps from the course root on the named small input. Confirm the expected answer, then reconstruct a reported speedup from its raw pair and check the five scores sum to your grade out of 10."
  ]
};
