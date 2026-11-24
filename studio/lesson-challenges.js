window.LESSON_CHALLENGES = {
  "0/0": {
    "prompt": "Add a small function `float frame_ms(float rate)` beside `fps` in 01_frames.cpp. Call it inside `fps(frame_ms(80.0f))` and predict both the intermediate value and the final value. Add a `check` line for each, then rerun exercise 1.",
    "hint": "Use 1,000 milliseconds per second and a positive rate. Follow the worked `seconds_to_ms` function for the declaration and return statement. Put the new checks before the final return in main and include their results in its success condition.",
    "check": "For 80 FPS, one frame takes 12.5 ms. Passing 12.5 to `fps` returns 80. Both results are exactly representable as float."
  },
  "0/1": {
    "prompt": "You’ve counted late frames. Now measure the time they cost. In `02_loop.cpp`, write `int total_lateness(const std::vector<int>& samples, int budget)` and return the total milliseconds beyond the budget. In `main`, add a check that calls your new function on [14, 16, 19, 22] with a 16 ms budget. Predict the excess for each frame and use their sum as the expected value. Save, rerun exercise 2, then use the challenge command below to test the saved functions on the same input and on additional cases.",
    "hint": "Start a sum at zero. In the branch where a frame exceeds budget, add only its excess. Include your new check in main’s final success condition.",
    "check": "The expected return value for `total_lateness` is 9 ms. The four frames contribute 0, 0, 3 and 6 ms. A terminal line for total lateness saying `got 9, expected 9` is a pass. The command also checks a different quantity on those same frames: `count_over` returns 2 late frames (19 and 22 ms). Both results are correct.",
    "command": "powershell -ExecutionPolicy Bypass -File .\\labs\\primer\\run.ps1 -Study lateness"
  },
  "0/2": {
    "prompt": "Add a tiny non-square multiplication to main in 03_matrix.cpp. A is the row [−1, 2]. B has rows [4, 0, 2] and [3, −2, 5]. Write three checks using `dot_cell`. Predict the result before running exercise 3.",
    "hint": "Flatten B one full row at a time. Pass 2 for `inner` and 3 for `out_cols`. Use row 0 for all calls. Include all three check results in main’s final success condition.",
    "check": "The three results are 2, −4 and 8. A stride of two in B would fetch the wrong cells for its second row."
  },
  "0/3": {
    "prompt": "In main in 04_buffers.cpp, just before its final return, try scaling the same buffer in place. Start with `float v[] = {90, 2, -1, 4, 91};` and call `scale(v + 1, v + 1, 3, -2.0f)`. Predict all five slots and check them after the call.",
    "hint": "Both pointers start at slot 1. Each iteration reads and then replaces only that same slot.",
    "check": "The result is [90, −4, 2, −8, 91]. The three middle slots hold the expected products. The two outer slots still hold their starting values, 90 and 91."
  },
  "0/4": {
    "prompt": "A list has 19 slots, numbered 0 through 18. Assign them to eight workers in a repeating order. Worker 0 gets slot 0, worker 1 gets slot 1, and so on through worker 7. Start again with worker 0 for the next slot. Which slots belong to worker 2? Then try workers 0 and 7.",
    "hint": "Start at slot 2. Before worker 2 gets another slot, every other worker gets a turn. How far along the list will that put worker 2?",
    "check": "Worker 2 gets slots 2, 10 and 18. Worker 0 gets 0, 8 and 16. Worker 7 gets 7 and 15. To turn the pattern into a loop, start at the worker’s own number, advance by eight slots each time, and stop before slot 19. Each round assigns one successive slot to each worker until the list ends."
  },
  "1/0": {
    "prompt": "In the CPU coverage study add `{9, 2}` to the shape list in main. Predict the number of blocks and inactive threads. Find the block and local coordinates of pixel (8, 1), then rerun `-Study coverage`.",
    "hint": "Use the file’s 4 × 2 blocks. Integer division and remainder reverse the block/local calculation.",
    "check": "Three blocks launch 24 threads for 18 pixels, leaving six inactive. Pixel (8, 1) is flat index 17, owned by block (2, 0), local thread (0, 1)."
  },
  "1/1": {
    "prompt": "Design a single warp load in which every two neighboring lanes request the same float. Begin at aligned-array element 7. Write the lane-to-element formula, then count distinct elements and touched sectors.",
    "hint": "Use integer division by two. Eight aligned consecutive floats share a 32-byte sector.",
    "check": "The index is 7 + lane / 2. The 32 lanes request 16 distinct elements, indices 7 through 22, spanning sectors 0, 1 and 2. This predicts requests for this instruction."
  },
  "1/2": {
    "prompt": "A trace has identical GPU kernel times of 3 ms for all 12 frames. Eleven displayed frames take 6 ms each and one takes 34 ms. Write a two-line performance report giving typical frame time and observed throughput. Mark which time interval a GPU-only optimization could change.",
    "hint": "Add the twelve displayed durations before dividing the number of frames by the elapsed seconds. A median uses the middle observations.",
    "check": "The median displayed frame is 6 ms. The whole sequence takes 100 ms and sustains 120 FPS. The kernel accounts for 3 ms of the 34 ms frame. Its timing alone cannot identify the reason for the spike."
  },
  "1/3": {
    "prompt": "Adapt the merge idea to compute the maximum of [−4, −9, −2, −8, −5] in a tree. Sketch rounds or use a scratch copy of `balanced`. Test what happens if you pad to eight with zeros.",
    "hint": "Carry a lone child forward, or choose a padding value no greater than any legal input. Every internal node chooses the larger of its two children.",
    "check": "The first three survivors are −4, −2 and −5, then −2 and −5, then −2. Zero padding gives a spurious answer of 0."
  },
  "1/4": {
    "prompt": "Make a shape that reveals a bad transpose even when every destination remains inside the allocation. Use the starter’s wrong formula on a 3-row, 2-column input and build the visit counts for destination slots 0 through 5.",
    "hint": "Enumerate source positions in row-major order. A collision and an untouched slot can coexist with every write in bounds.",
    "check": "Targets are 0, 2, 1, 3, 2, 4. Slot 2 is written twice and slot 5 is untouched. A bounds-only checker misses both. The correct transpose is [1, 3, 5, 2, 4, 6]."
  },
  "2/0": {
    "prompt": "Use two queries, [1, 0] and [0, 1], against three gallery rows, [2, 0], [4, 0] and [0, 3], numbered from zero. If two gallery rows tie for the highest cosine score, choose the lower row number. Write the two-by-three score table and select a winner for each query.",
    "hint": "Positive multiples point in the same direction. The explorer breaks ties in favor of the earliest row.",
    "check": "The score rows are [1, 1, 0] and [0, 0, 1]. The winners are rows 0 and 2. A tie can preserve every score and still affect the predicted label if the tied images carry different labels."
  },
  "2/1": {
    "prompt": "Enter 2,3,6,3 in the chain explorer. For each parenthesization, count scalar multiplications and the number of elements in the intermediate matrix. Does minimizing multiplication count select the same order as minimizing intermediate size? Resolve any tie, explain the basis for your choice, then check the explorer.",
    "hint": "Compute both temporary shapes and include the cost of the final multiply. Count float cells rather than bytes first.",
    "check": "Both orders cost 72 scalar multiplications. AB has 12 cells and BC has 9. Smaller storage breaks an arithmetic tie here. A measured timing is still needed to make a speed claim."
  },
  "2/2": {
    "prompt": "For a 17 × 3 result with K = 18 and 16 × 16 tiles, focus only on the bottom output block and the final K chunk. Which A and B entries can its workers load from global memory? Count them and predict its valid stores.",
    "hint": "This block covers rows 16–31, columns 0–15, and the final chunk covers inner indices 16–31. Intersect each interval with the matrix extents.",
    "check": "The final chunk loads two real A elements (row 16, k = 16,17) and six real B elements (two k rows times three columns). The block eventually stores three outputs. All 256 threads must still reach each barrier."
  },
  "2/3": {
    "prompt": "At N = 49 launch exactly two 16-thread-wide blocks along x. Each thread computes two columns. Draw a tally of how many times each output column is visited if the blocks start 16 columns apart but each owns 32 columns. Then correct the launch on paper.",
    "hint": "With two blocks initially, the wrong start formula gives starts 0 and 16. Derive both the start spacing and block count from the actual columns owned per block.",
    "check": "The two incorrect intervals cover 0–31 and 16–47. Columns 16–31 are duplicated and 48 is missing. Starts 0 and 32 with two blocks cover 0–48 once after guarding invalid columns."
  },
  "2/4": {
    "prompt": "Supply a minimal library-layout test where element order matters. For A = [[1, 2], [0, 1]] and B = [[3, 4], [0, 2]], write AB and BA. Which linear arrangement of four floats must the row-major output buffer contain?",
    "hint": "Trace the upper-right cell in each product. Relate C in row-major storage to the library’s column-major view of C transposed.",
    "check": "AB is [[3, 8], [0, 2]] and BA is [[3, 10], [0, 2]]. The expected row-major buffer is [3, 8, 0, 2]. Matching dimensions and the diagonal alone would miss a swapped product."
  },
  "3/0": {
    "prompt": "Encode the directed weighted edges 0→2 with weight 5 and 2→0 with weight −2 on three nodes as CSR. Multiply by [4, 8, 3]. Then explain what an all-ones input would measure on this graph.",
    "hint": "The middle row is empty. Put each edge into only its source row and keep its sign.",
    "check": "Offsets are [0,1,1,2], columns [2,0], values [5,−2]. The requested product is [15,0,−8]. An all-ones input gives outgoing weight sums [5,0,−2]."
  },
  "3/1": {
    "prompt": "On a row with 10 entries, model widths 8 and 32. Count useful lane-iterations and launched lane-iterations across the row’s multiplication loop for each. Explain one reason the utilization estimate could fail to predict elapsed time.",
    "hint": "Each group takes ceil(10 / width) rounds. Count the multiplication work separately from the shuffle reduction.",
    "check": "Both do 10 useful products. Width 8 offers 16 slots across two rounds (62.5%); width 32 offers 32 slots in one round (31.25%). The smaller group needs an extra loop round and the shuffle and memory costs also matter."
  },
  "3/2": {
    "prompt": "Design a stable two-bin partition on paper using the same exclusive prefixes. For letters A to E and flags [0,1,0,1,1], place the false items first and the true items second, preserving order within each bin. Give a destination rule for both cases.",
    "hint": "Let `p` count earlier true items and `z` be the total number of false items. Among the first i items, i − p are false.",
    "check": "For a false item use i − p, for a true item use z + p. The input indices map to [0,2,1,3,4] and the final order is A,C,B,D,E."
  },
  "3/3": {
    "prompt": "Debug an integer reduction that discards its partial final block. Construct a one-dimensional test with 256 zeros followed by one ink value of 7. Predict the reported totals for a correct grid and for a grid rounded down. Give a second input exposing accidental double counting of that tail.",
    "hint": "Use the lab’s 256-thread blocks and add a nonzero value only where coverage or ownership differs.",
    "check": "The correct total is 7; a one-block launch gives 0. For a second test, use 258 values with the final two both equal to 3 and everything else zero. The correct total is 6; summing that entire tail twice gives 12."
  },
  "3/4": {
    "prompt": "Two formats have different fixed conversion costs. A costs 1 ms to prepare and 0.8 ms per call. B costs 4 ms and 0.2 ms per call. A shared file parse adds 7 ms. Derive the first profitable call count for B, then change the workload so every call rereads and reconverts its input.",
    "hint": "Write both totals under each reuse policy. Only preparation that survives to the next call can be amortized.",
    "check": "With one preparation, the curves tie at five calls (12 ms each), and B wins at six. With fresh preparation per call, each call costs 8.8 ms for A and 11.2 ms for B. A stays faster for every positive call count."
  },
  "4/0": {
    "prompt": "A 64 × 32 shot contains three worms, each built from 24 links. The director doubles only the height and halves the width. Predict what changes in the exhaustive candidate count, then name a reason GPU time could still change.",
    "hint": "Count pixels first. A work count says how many pairs reach the candidate routine.",
    "check": "Both frames have 2,048 pixels and 72 links, giving 147,456 pairs in either orientation. The new aspect ratio can change coverage and how many candidates survive later tests."
  },
  "4/1": {
    "prompt": "A vertical capsule goes from (2,2) to (2,6) with radius 1. Derive the closest point for (2,0.9) and (2,1). Predict their classifications. Swap the endpoints and check both again.",
    "hint": "For a point beyond an endpoint, compare the squared distance to the nearest endpoint with the squared radius.",
    "check": "Both closest points are (2,2). Squared distances are 1.21 and 1, so the first sample misses and the rim sample hits. Reversing the endpoints preserves both results."
  },
  "4/2": {
    "prompt": "A 16 × 16 pixel block starts at (16,16) in a 17 × 19 image. Identify the thread coordinates allowed to store a pixel. Decide which threads may skip the barrier that protects a new candidate batch.",
    "hint": "Convert local lane coordinates to image coordinates. A valid row can still have fifteen columns outside the image.",
    "check": "Three lanes store pixels, at local (0,0), (0,1) and (0,2). All 256 threads participate in the barrier in this cooperative kernel."
  },
  "4/lighting": {
    "prompt": "A reflection ray intersects three bay slabs over distances [1,8], [4,10] and [3,5]. Work out what happens for a current closest hit at 6, then at 3. Where would reusing the camera ray’s earlier decision go wrong?",
    "hint": "For each ray, intersect its three intervals first. Compare the entry with the distance to beat on that ray.",
    "check": "The reflection ray can enter the bay over [4,5]. At 6 an object in the bay could win. At 3 the bay cannot contribute a closer hit. A different ray origin or direction has different slab intervals."
  },
  "4/3": {
    "prompt": "A one-row image has 17 pixels. Its first 16-pixel tile keeps 3 candidate segments. The final tile contains just pixel 16 and keeps 12 candidates. Each real pixel tests every segment in its tile’s list. Count the detailed tests and calculate how many tests you would wrongly predict by treating both tiles as full.",
    "hint": "Multiply each list length by the real pixels in its own tile.",
    "check": "The true count is 16 × 3 + 1 × 12 = 60. Charging both as full tiles predicts 240. Bounding-box classifications are a separate cost."
  },
  "4/creature": {
    "prompt": "A moving five-link group has predicted x bounds [4,10], including link radii. All five links translate +3 in x in the new frame. Test whether keeping the old box can safely cull a ray that travels parallel to the y-axis at x = 12.",
    "hint": "List the old and current x intervals. A box rejection must rule out every enclosed link at the frame being rendered.",
    "check": "The new bounds are [7,13]. The old box rejects x = 12 while a current link could be hit there. Recompute or expand a conservative motion bound before culling."
  },
  "4/4": {
    "prompt": "Two 20-frame logs in ms contain A = nineteen 7s and one 35, B = twenty 8s. Which wins on median, nearest-rank p95, worst frame and total-time throughput? Decide which evidence you would show beside a smoothness claim.",
    "hint": "Write down the 19th and 20th sorted durations before dividing frame count by elapsed time.",
    "check": "A wins median and p95, both 7 vs 8 ms. B wins worst frame, 8 vs 35 ms, and throughput, 125 vs about 119 FPS. The single hitch is visible in the maximum and raw samples."
  },
  "5/0": {
    "prompt": "Start with zero boundary values and zero pressure everywhere on a 5 × 5 grid. Put the only nonzero source, −8, one interior cell to the left of center. Under the lesson’s update rule, what are the source pressure and center pressure after one and two Jacobi sweeps?",
    "hint": "Each new cell reads four old neighbors and its own source. The forcing stays in place.",
    "check": "After sweep one the source is −2 and the center is 0. After sweep two the source stays −2 and the center becomes −0.5. The boundary stays zero."
  },
  "5/1": {
    "prompt": "An interior rectangular tile with all halo sites in bounds produces 8 × 4 outputs. Before benchmarking, count the distinct old-pressure positions for a one-sweep five-point footprint. Compare with a rectangular shared allocation and identify the unused positions.",
    "hint": "Draw one halo strip on each side. Count the corners separately.",
    "check": "32 + 2 × 8 + 2 × 4 = 56 positions. The 10 × 6 rectangle has 60 slots, including four unused corners."
  },
  "5/2": {
    "prompt": "At a target relative residual of 0.05, three runs give (sweeps, residual, total ms) = (10, 0.08, 0.4), (14, 0.049, 0.7), (20, 0.03, 1.1). Which of the measured runs meets the target in the least total time? What additional sweep counts would you test before calling that the first passing count?",
    "hint": "Distinguish the counts tested from the counts between them.",
    "check": "Fourteen sweeps is the cheapest passing run among these measurements. Test 11 through 13 to look for an earlier passing count in that interval. To claim the first crossing from the start, inspect the earlier history too. Time each passing configuration before claiming it is the fastest."
  },
  "5/3": {
    "prompt": "Three closed unit-width cells have face velocities [0,3,1,0]. Find their divergences and their sum. Add seven units of pressure everywhere. What changes in a pressure-gradient correction?",
    "hint": "Use right-face velocity minus left-face velocity for each cell.",
    "check": "The divergences are +3, −2 and −1. They sum to zero because interior flux cancels. A uniform pressure shift changes no face gradient and therefore no corrected velocity."
  },
  "5/4": {
    "prompt": "Run python -B labs/flow/vortex_refinement.py --sizes 24 48 --nu 0.2 --time 0.5. Predict the analytic amplitude and energy ratios before you inspect the first output line. Explain why they match the original test with a different viscosity.",
    "hint": "Check the product νt in each exponential. RMS discretization errors are separate measurements.",
    "check": "Both runs have νt = 0.1. The analytic amplitude ratio is exp(−0.2) ≈ 0.81873 and the energy ratio exp(−0.4) ≈ 0.67032. The requested run prints both."
  },
  "6/0": {
    "prompt": "A compressed stitch has endpoints x = 0 and 1, rest length 2, and equal inverse masses. Derive one full isolated correction. Predict the positions again if the right endpoint is pinned.",
    "hint": "The extension d − L is negative. Keep the midpoint fixed in the equal-mass case.",
    "check": "The free pair moves apart to −0.5 and 1.5. With the right endpoint pinned at 1 the left moves to −1. Both results restore distance 2."
  },
  "6/1": {
    "prompt": "A chain has edges (0,1), (1,2), (2,3), (3,4). Schedule two batches of in-place edge updates and identify the synchronization point. Then insert edge (0,2) and test your schedule.",
    "hint": "Within one batch, compare endpoint IDs pairwise.",
    "check": "One schedule is {(0,1),(2,3)} followed by {(1,2),(3,4)}. On the GPU, launch one kernel per batch in the same stream to order updates across the mesh. Adding (0,2) makes three edges meet at vertex 2, so at least three batches are required. The new edge can occupy the third batch by itself."
  },
  "6/2": {
    "prompt": "A mesh stores 8 slots per vertex as 32-bit edge IDs. On a 5 × 4 intact grid with both diagonals in every cell, find the number of edges, filled slots and sentinel slots. How many bytes are reserved for the neighbor table?",
    "hint": "Count horizontal and vertical edges separately, then two diagonals per cell. Each edge appears at both endpoints.",
    "check": "There are 16 horizontal, 15 vertical and 24 diagonal edges, or 55 total. Of 160 slots, 110 hold IDs and 50 are sentinels. The reserved table uses 640 bytes."
  },
  "6/3": {
    "prompt": "A stitch of rest length 8 evolves through lengths 9, 10, 10.5 and 8 over four steps. Use a strict 25% fracture threshold and mark the edge active or broken after each step.",
    "hint": "Compute the ratio to the same rest length every time. A broken edge stays broken.",
    "check": "It stays active at lengths 9 and 10, breaks at 10.5, and remains broken when the endpoints later return to length 8."
  },
  "6/textile": {
    "prompt": "An artist marks a split at material coordinate (0.4, 0.6), initially displayed at pixel (250,110). Orbit the specimen and predict which coordinates can locate that split after the camera moves. Explain how you would distinguish sliding damage from a correct orbit.",
    "hint": "Look for a neighboring stitch or calibration mark in both captures.",
    "check": "The two material coordinates still identify the split; its screen coordinates can change or be hidden. Check that the same nearby stitch remains at the opening across both views."
  },
  "6/4": {
    "prompt": "A four-vertex mesh has one free vertex displaced by (0,0,0.04) and three unchanged vertices, including both pins. Both implementations have the same active flags. Calculate RMS position error, maximum position error, maximum pin drift and differing flags. Which vertex would you inspect first, and which comparison results led you to it?",
    "hint": "Average squared displacement over all four vertex IDs before taking the square root.",
    "check": "RMS position error is 0.02, maximum position error is 0.04, pin drift is zero and the flags agree. Investigate the discrepant free vertex’s inputs and first changed sweep."
  },
  "7/0": {
    "prompt": "Audit a bandwidth claim. A vector add processed one million FP32 elements in 0.06 ms. Your colleague reports 67 GB/s, counting only the output. Reconstruct their number, calculate useful bandwidth under the lab’s convention, and name the evidence needed to claim DRAM traffic.",
    "hint": "Write a line for each input read and for the output write. Convert milliseconds to seconds before dividing.",
    "check": "The output is 4 MB, giving about 66.7 GB/s. Both inputs plus the output total 12 MB, giving 200 GB/s. A DRAM-byte counter at the relevant memory boundary can distinguish physical traffic from these useful bytes."
  },
  "7/1": {
    "prompt": "Two policy logs give predicted labels [2, 3, 7] and [2, 7, 3]. The true labels are [2, 3, 3]. Decide whether you would approve a policy that requires identical predictions. Defend the decision with two different counts.",
    "hint": "Line up the rows by query ID. Score each policy against truth, then compare the policies with each other.",
    "check": "Both policies get two labels right out of three, yet two of three predictions changed. The identical-prediction contract fails. The same technique applies to all 360 queries in your rankings log."
  },
  "7/2": {
    "prompt": "With the lab’s idealized per-group scale, reconstruct sixteen identical values of 3. Then replace fifteen of them with zeros and repeat. Explain which information survives and whether the stored payload or scale byte count changed.",
    "hint": "With a highest level of 6, the scale for a peak of 3 is 0.5. Zero is also an available level.",
    "check": "The scale stays 0.5. The threes reconstruct as 6 × 0.5 and every zero reconstructs exactly. Both groups use eight payload bytes and one scale byte. A sparse group alone saves no bytes in this fixed layout."
  },
  "7/3": {
    "prompt": "Draw a two-slot schedule for 13 queries in chunks of five. Suppose the program drains slot A before B. Label the output rows each final drain must fill, and predict the symptom if results are merely appended in drain order.",
    "hint": "Slot A is retired once before the last chunk reuses it. Keep the original starting row beside each pending slot.",
    "check": "Rows 0–4 are retired before A’s reuse. The final A drain owns rows 10–12, and the B drain owns 5–9. Appending their contents in that order scrambles otherwise correct score rows. The destination offset must come from the submitted chunk."
  },
  "7/4": {
    "prompt": "Give two clients separate recommendations. Policy A takes 2.1 ms with max error 0.0001 and changes one digit label. B takes 1.7 ms with error 0.002 and changes none. Client one requires error ≤ 0.001. Client two requires every label to agree. Which evidence should accompany each choice?",
    "hint": "Apply each client’s rule to every variant before looking at elapsed time.",
    "check": "A is admissible for client one; report its error, reference scope and timing. B is admissible for client two; report its matched per-query labels and timing. Client two’s result supplies no guarantee about its maximum numerical error on a new input."
  },
  "8/soundstage": {
    "prompt": "Design a two-box ray that can gain nothing from visiting the nearer box first. Give the two entry distances, the nearest actual hit, and the reason the other box must stay eligible.",
    "hint": "Entering a bounding volume only promises that it could contain a hit. The nearer box can be empty along this ray.",
    "check": "One witness is entries 2 and 6, no triangle hit along the ray in the first box, and a triangle hit at 7 in the second. Until the hit at 7, no finite nearer surface justifies discarding the second box."
  },
  "8/0": {
    "prompt": "Take your draft claim and write one possible observation that would make you keep the old implementation, even if the new kernel is faster on the usual input.",
    "hint": "Choose a genuine requirement of the same user. A failed correctness gate, unacceptable memory use or a slower required tail metric can reverse the decision.",
    "check": "The sentence names a fixed input, a measurable quantity, the threshold, and the consequence. For example, a faster renderer still loses if it changes a required reflected sign pixel at a locked camera."
  },
  "8/1": {
    "prompt": "Choose an observable in your project where a constant or do-nothing implementation can accidentally pass a plausible first test. For example, a resting stitch can have zero displacement. Construct the smallest second input that exposes the defect, predict both outputs and run both tests.",
    "hint": "Choose a scalar, a position change, or a single ID that your oracle can compute independently. Change one input feature that should alter it.",
    "check": "Save both inputs and an independently derived output for each. Your paired tests should accept the candidate on the first input, reject it on the second, and pass both with the restored implementation."
  },
  "8/2": {
    "prompt": "Choose one result from your project. Propose a second edit that keeps the same number of arithmetic operations or intersection tests but could still change the runtime. Name what you would hold fixed and which other measurement would help explain a timing difference.",
    "hint": "The same arithmetic can fetch different addresses or use a different launch shape. Match the workload and repeat both correctness and timing checks.",
    "check": "Name the quantity held fixed, the second mechanism, the appropriate diagnostic, and a possible observation that would contradict your explanation. A speedup by itself cannot distinguish the explanations."
  },
  "8/3": {
    "prompt": "Three baseline/candidate timing pairs in milliseconds are (10,5), (4,8) and (9,10). Compute the median paired speedup and the ratio of the separate medians. Which belongs in the paired-results column? What information disappears if you sort the two timing columns independently?",
    "hint": "Divide within each row before sorting the ratios. Then sort each time column separately for the comparison.",
    "check": "With baseline time divided by candidate time, the paired speedups are 2, 0.5 and 0.9. Their median is 0.9. The separate medians give 9/8 = 1.125. The two summaries even disagree about which variant wins. Preserve each pair with its run order so another reader can recover the comparison you measured."
  },
  "8/4": {
    "prompt": "Read only the first paragraph of your report and the reproduction commands. Write down what one independent reader could verify in five minutes, what file they would need, and the first output that would tell them the replay disagreed.",
    "hint": "Use the tiny witness. State the device requirement only if that first check actually needs it.",
    "check": "The report identifies a small input, an exact command, an expected numerical value, ID or tolerance, and where the first difference appears. Try those directions once from the course root before considering this check complete."
  }
};
