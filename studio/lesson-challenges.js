window.LESSON_CHALLENGES = {
  "0/0": {
    "prompt": "In `01_frames.cpp`, add a small helper function `float frame_ms(float rate)` next to `fps` that converts FPS back into milliseconds per frame. Call `fps(frame_ms(80.0f))`, predict both the intermediate `frame_ms` value and the final `fps` result, add a `check` line for each, and rerun exercise 1.",
    "hint": "Use `1000.0f` milliseconds per second and assume a positive rate. Model your function signature and return statement on the worked `seconds_to_ms` example. Add the new checks before `main` returns and include them in its final pass/fail expression.",
    "check": "At 80 FPS, one frame takes `12.5` ms, and passing `12.5` into `fps` returns `80`. Both numbers have exact binary `float` representations."
  },
  "0/1": {
    "prompt": "You’ve already counted late frames—now sum up how late they are. In `02_loop.cpp`, write `int total_lateness(const std::vector<int>& samples, int budget)` to return the total milliseconds past the budget across all late frames. In `main`, add a check calling `total_lateness` on `[14, 16, 19, 22]` with a `16 ms` budget, predicting each frame’s excess first. Save, rerun exercise 2, then run the challenge command below to test both saved functions on more cases.",
    "hint": "Initialize a running sum to `0`. Whenever a frame exceeds `budget`, add `ms - budget` (just the excess, not the whole frame time). Include the new check in `main`’s final pass/fail return.",
    "check": "`total_lateness` should return `9` ms (`0 + 0 + 3 + 6`). Seeing `got 9, expected 9` is a pass. The command also checks `count_over` on the same input, which returns `2` late frames (`19` and `22` ms)—both checks should pass.",
    "command": "powershell -ExecutionPolicy Bypass -File .\\labs\\primer\\run.ps1 -Study lateness"
  },
  "0/2": {
    "prompt": "In `03_matrix.cpp`, add a tiny non-square matrix multiply to `main`: let `A` be the 1×2 row `[−1, 2]`, and let `B` be the 2×3 matrix with rows `[4, 0, 2]` and `[3, −2, 5]`. Predict all three output entries by hand, add three `check` calls using `dot_cell`, and rerun exercise 3.",
    "hint": "Store `B` flat one full row at a time (`{4, 0, 2, 3, -2, 5}`). Pass `2` for `inner`, `3` for `out_cols`, and `0` for `row` in all three calls, and include all three checks in `main`’s return condition.",
    "check": "The three output entries are `2`, `−4`, and `8`. If your code accidentally used a row stride of 2 for `B`, it would pull the wrong entries for `B`’s second row."
  },
  "0/3": {
    "prompt": "In `04_buffers.cpp`, right before `main` returns, test scaling a buffer in place. Start with `float v[] = {90, 2, -1, 4, 91};` and call `scale(v + 1, v + 1, 3, -2.0f)` so both input and output pointers start at `v[1]`. Predict all five entries of `v`, then add checks to verify them.",
    "hint": "Both pointers point to index 1, so each loop iteration reads `v[1 + i]`, multiplies by `-2.0f`, and writes right back to that same slot without touching the neighbors.",
    "check": "The array finishes as `[90, −4, 2, −8, 91]`. The three middle entries hold the scaled products, while the two outer guard values (`90` and `91`) stay untouched."
  },
  "0/4": {
    "prompt": "Suppose an array has 19 slots (`0..18`) and you deal them out round-robin to 8 workers: worker 0 gets slot 0, worker 1 gets slot 1, …, worker 7 gets slot 7, then worker 0 gets slot 8, and so on. Which slots go to worker 2? Now list the slots for worker 0 and worker 7.",
    "hint": "Start at the worker’s own ID. After taking one slot, all 7 other workers take a turn before this worker goes again—so how much does the index jump each step?",
    "check": "Worker 2 gets slots `2, 10, 18`; worker 0 gets `0, 8, 16`; worker 7 gets `7, 15`. As a loop, start at `i = worker_id`, increment by `8` each pass, and stop when `i >= 19`. This pattern is called a grid-stride loop."
  },
  "1/0": {
    "prompt": "In the CPU coverage study, add `{9, 2}` (width 9, height 2) to the shape list in `main`. Predict how many `4 × 2` blocks launch and how many threads fall out of bounds, calculate the block coordinates and local thread coordinates of pixel `(8, 1)`, and rerun `-Study coverage`.",
    "hint": "With `4 × 2` blocks, divide pixel coordinates by block dimensions (integer division) to get block coordinates, and take the remainder (`%`) to get local thread coordinates.",
    "check": "Three blocks launch `24` threads to cover `18` pixels, leaving `6` out-of-bounds threads. Pixel `(8, 1)` sits at flat index `17`, handled by block `(2, 0)` and local thread `(0, 1)`."
  },
  "1/1": {
    "prompt": "Design a single warp load (32 lanes, numbered `0..31`) on an aligned `float` array where every consecutive pair of lanes (`0 & 1`, `2 & 3`, etc.) reads the same float, starting at array index `7`. Write the formula from `lane` to array index, then count how many distinct floats are loaded and how many 32-byte sectors the warp touches.",
    "hint": "Integer division `lane / 2` groups lanes in pairs. On an aligned float array, 8 consecutive floats fit inside each 32-byte sector (`0..7`, `8..15`, `16..23`).",
    "check": "The index formula is `7 + lane / 2`. The 32 lanes read `16` distinct floats (`indices 7..22`), touching `3` sectors: sector 0 (index 7), sector 1 (`8..15`), and sector 2 (`16..22`)."
  },
  "1/2": {
    "prompt": "A 12-frame capture shows an identical `3 ms` GPU kernel time on every frame, while the displayed host frame times are eleven `6 ms` frames and one `34 ms` frame. Write a two-line summary reporting the median frame time and overall throughput (FPS), and state how much of the `34 ms` spike a GPU-only kernel speedup could touch.",
    "hint": "Sum all 12 displayed frame times to get total elapsed seconds before computing FPS. For the median of 12 sorted values, take the middle values.",
    "check": "Median frame time is `6 ms`, and total elapsed time is `100 ms`, giving `120 FPS`. The GPU kernel is only `3 ms` of that `34 ms` hitch, so GPU kernel timing alone cannot explain the other `31 ms`."
  },
  "1/3": {
    "prompt": "Adapt the binary reduction tree to compute the maximum of `[−4, −9, −2, −8, −5]`. Sketch each round by hand (or try it in a scratch copy of `balanced`), then check what happens if you pad the input up to 8 elements using `0`.",
    "hint": "Either pass an unpaired element straight up to the next round, or pad with a value smaller than any legal input (such as `-INFINITY` or `INT_MIN`). Each internal node keeps the larger of its two inputs.",
    "check": "Without zero padding, round 1 produces `−4, −2, −5`, round 2 produces `−2, −5`, and round 3 returns `−2`. Padding with `0` breaks the max reduction and returns a wrong answer of `0`."
  },
  "1/4": {
    "prompt": "Find a non-square shape where the starter’s buggy transpose writes every output inside the allocated buffer yet still corrupts the result. Trace the buggy index formula on a 3-row, 2-column input `[1, 2, 3, 4, 5, 6]` and tally how many writes hit each destination index `0..5`.",
    "hint": "Step through the 6 source entries in row-major order and evaluate the starter’s destination formula for each. Watch for one index getting written twice while another stays untouched.",
    "check": "The buggy destinations are `0, 2, 1, 3, 2, 4`: index `2` is written twice and index `5` is never written at all. A bounds-only checker (`memcheck`) misses this completely. The true transpose is `[1, 3, 5, 2, 4, 6]`."
  },
  "2/0": {
    "prompt": "Score two queries (`[1, 0]` and `[0, 1]`) against three gallery rows numbered `0..2`: `[2, 0]`, `[4, 0]`, and `[0, 3]`. Use cosine similarity and break exact ties by picking the lower gallery row index. Write the `2 × 3` score matrix and pick the winning gallery row for each query.",
    "hint": "Scaling a vector by a positive constant keeps its direction unchanged, so `[2, 0]` and `[4, 0]` have the same cosine similarity with `[1, 0]`.",
    "check": "The cosine score rows are `[1, 1, 0]` and `[0, 0, 1]`, giving winners row `0` and row `2`. Notice that an exact score tie can flip the predicted digit label depending on tie-breaking if the two tied rows have different labels."
  },
  "2/1": {
    "prompt": "Enter dimensions `2, 3, 6, 3` in the matrix-chain explorer (representing matrices of shape `2×3`, `3×6`, and `6×3`). For both `(AB)C` and `A(BC)`, compute the scalar multiplications and the number of elements in the intermediate matrix. Does minimizing multiplies break the tie? Decide which order you’d pick and why, then check the explorer.",
    "hint": "Write down the intermediate shape for each order, add the multiplies for both steps, and count how many floats the intermediate matrix has to store.",
    "check": "Both orders cost `72` scalar multiplications, while `AB` has `12` intermediate entries and `BC` has only `9`. Smaller intermediate storage breaks the arithmetic tie, though you’d still need real timings to claim one runs faster."
  },
  "2/2": {
    "prompt": "Consider a `17 × 3` output matrix with `K = 18` using `16 × 16` tiles. Focus only on the bottom output block and the final `K` chunk. Which valid entries of `A` and `B` does that block load from global memory, how many real entries is that, and how many valid `C` elements does it store at the end?",
    "hint": "The bottom block spans rows `16..31` and columns `0..15`, while the final `K` chunk spans `k = 16..31`. Intersect those ranges with the actual matrix dimensions (`17 × 18` and `18 × 3`).",
    "check": "The final chunk loads `2` real entries from `A` (row `16`, `k = 16, 17`) and `6` real entries from `B` (`k = 16, 17` across columns `0, 1, 2`), and the block writes `3` valid outputs (`row 16, cols 0..2`). All 256 threads in the block must still hit every `__syncthreads()` barrier."
  },
  "2/3": {
    "prompt": "For an output width `N = 49`, suppose you launch two `16`-thread-wide blocks along `x` where each thread computes `2` columns (so each block owns `32` columns). Sketch how many times each column `0..48` gets computed if the kernel mistakenly spaces block starts `16` columns apart instead of `32`. Then write the corrected starting-column formula on paper.",
    "hint": "With a 16-column stride, block 0 starts at column `0` and block 1 starts at column `16`, even though each block covers 32 columns. Base both the block stride and grid width on the full 32 columns owned per block.",
    "check": "The buggy launch covers columns `0..31` and `16..47`: columns `16..31` are computed twice and column `48` is skipped completely. Spacing block starts by `32` gives starts `0` and `32`, covering `0..48` exactly once (with a `col < 49` bounds guard)."
  },
  "2/4": {
    "prompt": "Build a minimal `2 × 2` test that catches a row-major vs. column-major swap in a GEMM library call. For `A = [[1, 2], [0, 1]]` and `B = [[3, 4], [0, 2]]`, compute both `AB` and `BA`. What flat 4-float array must a row-major output buffer contain for `AB`?",
    "hint": "Check the upper-right entry of `AB` vs. `BA`. Remember that row-major `C` looks like column-major `Cᵀ` to cuBLAS, so swapping `A` and `B` accidentally computes `BA`.",
    "check": "`AB = [[3, 8], [0, 2]]` and `BA = [[3, 10], [0, 2]]`, so the flat row-major output buffer for `AB` must be `[3, 8, 0, 2]`. Checking only dimensions or diagonal entries would miss a swapped product."
  },
  "3/0": {
    "prompt": "Encode a 3-node directed weighted graph with edges `0 → 2` (weight `5`) and `2 → 0` (weight `−2`) in CSR format (`row_offsets`, `columns`, `values`). Multiply that CSR matrix by `x = [4, 8, 3]`, then explain what multiplying by `x = [1, 1, 1]` computes on this graph.",
    "hint": "Row 1 has no outgoing edges, so it is empty. Place each directed edge only in its source vertex’s row and keep its sign.",
    "check": "`row_offsets = [0, 1, 1, 2]`, `columns = [2, 0]`, `values = [5, −2]`. Multiplying by `[4, 8, 3]` yields `[15, 0, −8]`. Multiplying by `[1, 1, 1]` returns each vertex’s sum of outgoing edge weights: `[5, 0, −2]`."
  },
  "3/1": {
    "prompt": "Take a single sparse row with `10` nonzeros and compare two cooperative group sizes: `width = 8` threads vs. `width = 32` threads. Count the useful lane-iterations and total launched lane-iterations in the multiply loop for each width, then give one reason lane utilization alone might not predict which runs faster.",
    "hint": "A group of size `width` takes `ceil(10 / width)` loop rounds. Count the multiply loop separately from the final warp-shuffle reduction.",
    "check": "Both do `10` useful products. Width 8 takes 2 rounds (`16` lane-slots, `62.5%` active), while width 32 takes 1 round (`32` lane-slots, `31.25%` active). Even with higher utilization, width 8 needs an extra loop iteration, and memory coalescing plus shuffle cost also affect wall-clock time."
  },
  "3/2": {
    "prompt": "Use the same exclusive-scan idea to design a stable two-way partition on paper. Given letters `[A, B, C, D, E]` and boolean flags `[0, 1, 0, 1, 1]`, place all `0` (false) items first and all `1` (true) items second, keeping original order inside each group. Write the destination index formula for both cases.",
    "hint": "Let `p` be the exclusive scan of the flags at index `i` (the number of earlier `1`s), and let `z` be the total count of `0`s in the whole array. Among the `i` elements before index `i`, exactly `i − p` of them are `0`s.",
    "check": "A `0` item at index `i` writes to `i − p`, and a `1` item writes to `z + p`. Here `z = 2`, the input indices map to destinations `[0, 2, 1, 3, 4]`, and the partitioned output is `[A, C, B, D, E]`."
  },
  "3/3": {
    "prompt": "Design two tiny 1D test arrays to catch bugs in an integer reduction that uses `256`-thread blocks. First, build a `257`-element array of `256` zeros followed by a single `7`, and predict the sum from a correct grid vs. a grid that rounded its block count down. Second, construct an array that exposes accidentally double-counting the final partial block.",
    "hint": "Put nonzero values only in the tail beyond index `255` so any dropped or double-counted tail stands out immediately.",
    "check": "On the `257`-element test, the true sum is `7`, while a 1-block rounded-down grid returns `0`. For double counting, use `258` elements with `3` in the last two slots and `0` everywhere else: the true sum is `6`, whereas summing the tail twice returns `12`."
  },
  "3/4": {
    "prompt": "Compare two sparse formats with different conversion costs: Format A takes `1 ms` to convert and `0.8 ms` per SpMV call; Format B takes `4 ms` to convert and `0.2 ms` per SpMV call. Reading the matrix from disk takes `7 ms` for both. First, find the smallest number of SpMV calls where Format B beats Format A if you read and convert once. Second, repeat if every call has to reread and reconvert from scratch.",
    "hint": "Write total time as `setup + calls × per_call` for each policy. Only work done once can be amortized across repeated calls.",
    "check": "With one-time setup, both formats tie at `5` calls (`12 ms` each: `7 + 1 + 4` vs. `7 + 4 + 1`), so Format B wins starting at call `6`. If you reread and reconvert every time, each call costs `8.8 ms` for A vs. `11.2 ms` for B, so A stays faster for every call count."
  },
  "4/0": {
    "prompt": "A `64 × 32` frame contains `3` worms with `24` segments each. Suppose you reshape the image to `32 × 64` (halving the width and doubling the height). How does the brute-force pixel–segment test count change, and why might the GPU runtime still differ?",
    "hint": "Count total pixels first—total brute-force pairs is just `pixels × segments`.",
    "check": "Both frames have `2,048` pixels and `72` segments, so both run `147,456` brute-force pairs. GPU time can still change because changing the aspect ratio changes how many worms cover each pixel and how tiles map onto the scene."
  },
  "4/1": {
    "prompt": "A vertical capsule runs from `(2, 2)` to `(2, 6)` with radius `1`. Find the closest point on the centerline segment for pixel centers `(2, 0.9)` and `(2, 1)`, and determine whether each hits or misses. Then swap the two endpoints (`(2, 6)` to `(2, 2)`) and verify both results stay identical.",
    "hint": "For points past either end of the segment, clamping `t` to `[0, 1]` snaps the closest point onto that endpoint, so you just compare squared distance to `radius²`.",
    "check": "Both pixels snap to endpoint `(2, 2)`. Their squared distances are `1.21` and `1.0`, so `(2, 0.9)` misses and `(2, 1)` hits right on the rim. Swapping endpoints leaves both results unchanged."
  },
  "4/2": {
    "prompt": "In a `17 × 19` image, look at the `16 × 16` thread block whose top-left corner sits at pixel `(16, 16)`. Which local thread coordinates `(tx, ty)` are allowed to write an output pixel, and which threads may skip the `__syncthreads()` barrier that guards each shared-memory candidate batch?",
    "hint": "Add `(16, 16)` to `(tx, ty)` and check `x < 17` and `y < 19`. Remember what happens in CUDA if only some threads in a block reach `__syncthreads()`.",
    "check": "Only 3 threads write pixels: local `(0, 0)`, `(0, 1)`, and `(0, 2)` (pixels `(16, 16)`, `(16, 17)`, and `(16, 18)`). Zero threads may skip the barrier—all `256` threads in the block must reach `__syncthreads()`."
  },
  "4/lighting": {
    "prompt": "A reflection ray crosses a bay’s three axis slabs over intervals `[1, 8]`, `[4, 10]`, and `[3, 5]`. Should the renderer test objects inside this bay if the ray’s closest hit so far is at distance `6`? What if the closest hit so far is at distance `3`? Explain why reusing the primary camera ray’s cull decision would fail.",
    "hint": "Intersect the three slab intervals first (`[max(mins), min(maxes)]`), then compare the box entry distance against the reflection ray’s current closest hit.",
    "check": "The reflection ray is inside the bay over `[4, 5]`. With a closest hit at `6`, the bay can still hold a closer object (`4 < 6`), so you must test it. With a closest hit at `3`, the bay starts farther away (`4 > 3`), so you can skip it. A camera ray has a completely different origin and direction, so its slab intervals don’t apply to the reflection ray."
  },
  "4/3": {
    "prompt": "A 1-row image is `17` pixels wide, split into two `16`-pixel tiles. Tile 0 (pixels `0..15`) keeps `3` candidate segments after culling, while Tile 1 (just pixel `16`) keeps `12` candidates. If every active pixel tests every candidate in its tile, how many exact pixel–segment tests run in total, and how many tests would you overpredict if you treated both tiles as full 16-pixel tiles?",
    "hint": "Multiply each tile’s candidate count by the number of real in-bounds pixels in that tile, not by 16.",
    "check": "Actual exact tests: `16 × 3 + 1 × 12 = 60`. Treating both tiles as full predicts `16 × 3 + 16 × 12 = 240`—an overprediction of `180` tests (bounding-box checks are counted separately)."
  },
  "4/creature": {
    "prompt": "A moving 5-link strand group has an old x-interval `[4, 10]` (already padded by link radius). On the next frame, all 5 links shift `+3` in x. Show whether keeping the stale bounding box can safely cull a ray traveling parallel to the y-axis at `x = 12`.",
    "hint": "Compute the group’s true new x-interval after the `+3` shift. A bounding box can only cull a ray if none of the links at the current frame can touch that ray.",
    "check": "After moving `+3`, the group spans `[7, 13]`, so a link can now hit the ray at `x = 12`. The stale box `[4, 10]` misses `x = 12` and falsely culls a real hit. Always refit (or conservatively expand) bounds before tracing."
  },
  "4/4": {
    "prompt": "Compare two 20-frame timing logs in milliseconds: Renderer A has nineteen `7 ms` frames and one `35 ms` spike; Renderer B has twenty steady `8 ms` frames. Which wins on median, nearest-rank p95, worst frame (max), and average FPS? What numbers would you show to back up a “smoother frame pacing” claim?",
    "hint": "With 20 sorted frames, nearest-rank p95 is entry `ceil(0.95 × 20) = 19` and worst frame is entry `20`. Compute FPS from `20 frames / total seconds`.",
    "check": "A wins median and p95 (`7 ms` vs. `8 ms`). B wins worst frame (`8 ms` vs. `35 ms`) and average throughput (`125 FPS` vs. `~119 FPS`, since A totals `168 ms` vs. B’s `160 ms`). Always report worst-frame max and raw traces alongside percentiles so a single hitch can’t hide."
  },
  "5/0": {
    "prompt": "Start with pressure `0` everywhere and pinned zero boundaries on a `5 × 5` grid. Place a single nonzero source of `−8` at the interior cell immediately to the left of center. Using the Jacobi rule `p_new = (sum(neighbors) + source) / 4`, find the pressure at both the source cell and the center cell after sweep 1 and after sweep 2.",
    "hint": "Every cell reads the four neighbors from the previous sweep plus its own constant `source` value (the source stays `−8` on every sweep).",
    "check": "After sweep 1, the source cell is `−2` and the center cell is `0`. After sweep 2, the source cell stays `−2` (its neighbors were still `0` after sweep 1) and the center cell becomes `(−2 + 0 + 0 + 0 + 0) / 4 = −0.5`, while boundary cells stay `0`."
  },
  "5/1": {
    "prompt": "An interior `8 × 4` output tile has all its neighbors in bounds. For a single 5-point Jacobi sweep, how many distinct old-pressure cells are actually read? Compare that against allocating a `10 × 6` rectangular shared-memory block and identify which slots go unused.",
    "hint": "Count the `8 × 4` interior plus the 1-cell strips on all four sides (top, bottom, left, right), leaving the four corners out.",
    "check": "The 5-point stencil actually reads `32 + 2×8 + 2×4 = 56` cells. A `10 × 6` shared-memory rectangle reserves `60` slots, so the `4` corner slots are never read."
  },
  "5/2": {
    "prompt": "Your target relative residual is `0.05`. Three runs report `(sweeps, residual, total ms)` as `(10, 0.08, 0.4)`, `(14, 0.049, 0.7)`, and `(20, 0.03, 1.1)`. Which measured run meets the target in the least time, and what extra sweep counts should you test before claiming it is the smallest passing sweep count?",
    "hint": "Look at the untested gap between the failing run (`10`) and the passing run (`14`).",
    "check": "`14` sweeps (`0.7 ms`) is the fastest passing run measured so far. To check whether the solver actually crossed `0.05` earlier in that gap, test `11, 12, and 13` sweeps (and inspect earlier sweeps if you want to prove it’s the first crossing overall), timing each passing run directly."
  },
  "5/3": {
    "prompt": "Three closed 1D unit-width cells have face velocities `[0, 3, 1, 0]` from left outer wall to right outer wall. Compute each cell’s divergence (`right − left`) and sum all three divergences. Then add `7` to every cell’s pressure—how does that change the pressure-gradient velocity update?",
    "hint": "Cell 0 uses faces `0` and `3`, cell 1 uses `3` and `1`, and cell 2 uses `1` and `0`.",
    "check": "The cell divergences are `+3`, `−2`, and `−1`, summing to `0` because every interior face velocity cancels between its two neighboring cells. Adding a constant `7` to every pressure leaves all pressure differences `(p_right − p_left)` identical, so the velocity correction doesn’t change at all."
  },
  "5/4": {
    "prompt": "Run `python -B labs/flow/vortex_refinement.py --sizes 24 48 --nu 0.2 --time 0.5`. Before looking at the first output line, predict the exact analytic amplitude ratio and energy ratio, and explain why they match the earlier run that used a different viscosity (`ν = 0.1`, `t = 1.0`).",
    "hint": "Both analytic decay formulas depend on the product `νt` inside the exponent. Numerical RMS errors depend on grid spacing and time step separately.",
    "check": "Both runs have the same product `νt = 0.1`, so the analytic amplitude ratio is `exp(−0.2) ≈ 0.81873` and the analytic energy ratio is `exp(−0.4) ≈ 0.67032`—matching the script’s printed header."
  },
  "6/0": {
    "prompt": "A compressed cloth edge has endpoints at `x = 0` and `x = 1`, rest length `2`, and equal inverse masses. Compute the new endpoint positions after one full undamped distance correction. Then recompute the positions if the right endpoint (`x = 1`) is pinned.",
    "hint": "The edge is compressed (`d − L = 1 − 2 = −1`), so free endpoints push apart symmetrically around their midpoint (`0.5`).",
    "check": "When both endpoints are free, they push apart to `x = −0.5` and `x = 1.5`. When the right endpoint is pinned at `1`, the left endpoint absorbs the full correction and moves to `x = −1`. Both restore length `2`."
  },
  "6/1": {
    "prompt": "Consider a 5-vertex chain with edges `(0, 1)`, `(1, 2)`, `(2, 3)`, and `(3, 4)`. Split these edges into two conflict-free batches for safe in-place updates and state where you must synchronize. Then add a fifth edge `(0, 2)` and check whether two batches still work.",
    "hint": "Two edges can run in the same in-place batch only if they share no vertices.",
    "check": "One valid 2-batch schedule is `{(0, 1), (2, 3)}` followed by `{(1, 2), (3, 4)}`, launching one kernel per batch on the same stream so batch 1 finishes before batch 2 starts. Adding `(0, 2)` creates a triangle `(0, 1, 2)` where three edges meet at vertex 2, forcing at least `3` batches (with `(0, 2)` in batch 3)."
  },
  "6/2": {
    "prompt": "A cloth mesh reserves `8` fixed slots per vertex to store 32-bit incident edge IDs. On an intact `5 × 4` vertex grid with horizontal, vertical, and both diagonal edges in every cell, count the total number of edges, filled slots, and empty sentinel slots. How many bytes does the neighbor table occupy?",
    "hint": "Count horizontal edges (`4 × 4`), vertical edges (`5 × 3`), and cell diagonals (`2 × 4 × 3`) separately. Every edge fills 1 slot at each of its 2 endpoints.",
    "check": "There are `16` horizontal, `15` vertical, and `24` diagonal edges (`55` total). Out of `20 × 8 = 160` slots, `110` hold edge IDs and `50` hold sentinels. At 4 bytes per 32-bit ID, the table takes `160 × 4 = 640` bytes."
  },
  "6/3": {
    "prompt": "An edge with rest length `8` reaches lengths `9`, `10`, `10.5`, and `8` over four consecutive steps. Using a strict `25%` fracture rule (`strain > 0.25`), mark whether the edge is active or broken after each step.",
    "hint": "Always divide `(length − 8)` by the original rest length `8`. Remember that once an edge breaks, it never heals.",
    "check": "At `9` (`12.5%`) and `10` (`25%`, tied with the threshold), the edge stays active. At `10.5` (`31.25%`), it breaks. At step 4 (`8`), it remains broken even though the endpoints moved back together."
  },
  "6/textile": {
    "prompt": "An artist marks a cloth tear at material coordinate `(0.4, 0.6)`, which initially appears at screen pixel `(250, 110)`. If you orbit the camera around the swatch, which coordinate pair still locates that tear? How would you verify visually that the tear stays locked to the fabric instead of sliding across it?",
    "hint": "Pick a visible landmark on the fabric right next to the tear—like an adjacent stitch or weave mark—and compare both camera views.",
    "check": "Material coordinate `(0.4, 0.6)` still locates the tear, while its screen pixel changes (or moves out of view). Confirming that the exact same neighboring stitch borders the opening in both camera angles proves the tear is anchored to the cloth."
  },
  "6/4": {
    "prompt": "Compare two 4-vertex cloth outputs: both have identical active-edge flags and identical positions on 3 vertices (including both pinned vertices), while 1 free vertex differs by `(0, 0, 0.04)`. Compute the RMS position error, max position error, max pin drift, and count of differing edge flags. Which vertex should you debug first, and which numbers point you there?",
    "hint": "RMS averages the squared errors across all `4` vertices (`(0² + 0² + 0² + 0.04²) / 4`) before taking the square root.",
    "check": "RMS position error is `0.02`, max position error is `0.04`, max pin drift is `0`, and differing edge flags is `0`. Because the pins and edge flags match, inspect that single mismatched free vertex—checking its incident edges and the first sweep where it diverges."
  },
  "7/0": {
    "prompt": "Audit a bandwidth claim: a vector-add kernel processes `1,000,000` FP32 elements in `0.06 ms`, and a teammate reports `67 GB/s` by counting only the output array. Reproduce their `67 GB/s`, compute the full useful bandwidth under our lab’s read+write convention, and state what measurement you’d need to claim actual DRAM bandwidth.",
    "hint": "Vector add reads two FP32 inputs (`A` and `B`) and writes one FP32 output (`C`) per element. Convert `0.06 ms` to `0.00006 s` before dividing.",
    "check": "Counting only the `4 MB` output gives `4 MB / 0.00006 s ≈ 66.7 GB/s`. Counting two reads plus one write (`12 MB` total) gives `200 GB/s`. To claim physical DRAM bandwidth rather than algorithmic useful bandwidth, you need a hardware DRAM-byte counter from Nsight Compute."
  },
  "7/1": {
    "prompt": "For three queries whose true digit labels are `[2, 3, 3]`, Policy A predicts `[2, 3, 7]` and Policy B predicts `[2, 7, 3]`. Would Policy B pass a requirement demanding identical predictions to Policy A? Justify your answer using both overall accuracy and per-query agreement.",
    "hint": "Compare each policy against the ground-truth labels first, then compare Policy A and Policy B directly at each query index.",
    "check": "Both policies score `2/3` correct against ground truth, yet they disagree on `2` of the `3` queries (`indices 1 and 2`). Policy B fails an identical-prediction requirement—and you can run this exact per-query diff across all 360 queries in your rankings log."
  },
  "7/2": {
    "prompt": "Using the lab’s idealized per-group scaling (`max_level = 6`), quantize and reconstruct a 16-element group where every entry is `3`. Now change 15 of those entries to `0` (leaving one `3`) and repeat. What values survive accurately, and does the stored byte count for payload or scales change?",
    "hint": "With peak magnitude `3` and max quantized level `6`, the group scale is `3 / 6 = 0.5`, and `0` is an exact quantized level.",
    "check": "The scale stays `0.5` in both cases, so every `3` reconstructs exactly (`6 × 0.5`) and every `0` reconstructs exactly. Both groups still take `8` payload bytes (`16 × 4 bits`) plus `1` scale byte—sparsity saves zero bytes in a fixed dense block layout."
  },
  "7/3": {
    "prompt": "Sketch a 2-slot ping-pong pipeline (`Slot A` and `Slot B`) processing `13` queries in chunks of `5` (rows `0..4`, `5..9`, and `10..12`). Suppose the host drains `Slot A` before `Slot B` at the end. Which output rows belong to each final drain, and what breaks if the host simply appends results in drain order instead of using each chunk’s starting row?",
    "hint": "Chunk 0 (`0..4`) uses `Slot A` and finishes before Chunk 2 (`10..12`) reuses `Slot A`, while Chunk 1 (`5..9`) sits in `Slot B`.",
    "check": "Rows `0..4` finish first. At shutdown, `Slot A` holds rows `10..12` and `Slot B` holds rows `5..9`. Appending in drain order writes rows `[0..4, 10..12, 5..9]`, scrambling valid scores into the wrong query rows. Always tag each slot with its chunk’s starting offset."
  },
  "7/4": {
    "prompt": "Make separate recommendations for two clients. Policy A takes `2.1 ms`, has max error `0.0001`, and flips `1` digit label. Policy B takes `1.7 ms`, has max error `0.002`, and flips `0` labels. Client 1 requires max error `≤ 0.001`; Client 2 requires `0` label flips. Which policy passes for each client, and what proof must accompany each recommendation?",
    "hint": "Filter out policies that violate a client’s correctness rule before comparing speed.",
    "check": "Recommend Policy A for Client 1 (with its max error, reference scope, and timing) because Policy B exceeds `0.001`. Recommend Policy B for Client 2 (with its per-query label match and timing) because Policy A flips a label—noting clearly that zero flips on this test set does not bound numerical error on unseen inputs."
  },
  "8/soundstage": {
    "prompt": "Construct a concrete two-box ray scenario where visiting the nearer box first fails to prune the farther box. Specify both box entry distances, the nearest actual triangle hit distance, and why the farther box still has to be tested.",
    "hint": "Intersecting a bounding box only means the ray passes through its volume—it doesn’t guarantee the ray actually hits a triangle inside.",
    "check": "For example: Box 1 starts at distance `2` and Box 2 starts at distance `6`. The ray misses every triangle inside Box 1, then hits a triangle at distance `7` inside Box 2. Because Box 1 produced no hit (`tMax` stayed `∞`), you still had to test Box 2."
  },
  "8/0": {
    "prompt": "Take your draft capstone proposal and write one concrete stopping condition that would make you reject your new kernel and keep the baseline—even if the new kernel is faster on your main benchmark.",
    "hint": "Tie it to a real requirement for your user: a broken correctness check, excessive memory use, or a slower tail latency.",
    "check": "A strong stopping condition names a fixed input, a measurable metric, a hard cutoff, and the decision—for example: “Even if median render time improves, reject the candidate if any pixel in the reflected sign differs at the locked camera.”"
  },
  "8/1": {
    "prompt": "Pick an output in your capstone where a stub or do-nothing implementation could accidentally pass an easy test (for example, an unstretched cloth edge has zero displacement). Build the smallest second input that catches that bug, compute the expected answer for both inputs by hand, and run both tests.",
    "hint": "Pick a single scalar, displacement, or ID you can work out by hand, then change one input value so the output is forced to change.",
    "check": "Save both inputs and your hand-computed expected outputs. Your broken stub should pass input 1 and fail input 2, while your real implementation passes both."
  },
  "8/2": {
    "prompt": "Pick one benchmark result from your capstone and propose a second code change that keeps the exact same number of arithmetic ops or intersection tests yet could still change runtime. State what you would hold constant and which extra measurement would explain any speed change.",
    "hint": "Think about memory access order, coalescing, register pressure, or launch configuration. Keep the workload identical and rerun both correctness and timing checks.",
    "check": "State the invariant work count (e.g., exact same FLOPs or triangle tests), the secondary mechanism (e.g., memory coalescing or occupancy), the specific profiler metric that tests it, and an outcome that would rule out your hypothesis."
  },
  "8/3": {
    "prompt": "Three matched `(baseline ms, candidate ms)` timing pairs are `(10, 5)`, `(4, 8)`, and `(9, 10)`. Compute (1) the median of the three paired speedups, and (2) the ratio of the separate baseline and candidate medians. Which number belongs in your paired-results table, and what breaks if you sort the two timing columns independently?",
    "hint": "For paired speedup, divide `baseline / candidate` inside each row before taking the median. Then compute `median(baseline) / median(candidate)` separately to compare.",
    "check": "The three paired speedups are `2.0×`, `0.5×`, and `0.9×`, giving a median paired speedup of `0.9×` (slower). Taking separate medians gives `9 / 8 = 1.125×` (faster)—they disagree on which version even won! Sorting columns independently destroys run pairing, so always keep matched pairs together."
  },
  "8/4": {
    "prompt": "Read only the opening paragraph and reproduction commands of your final report. Write down what an outside reader can verify in five minutes, which exact file they need, and the very first printed output that would tell them their run disagreed with yours.",
    "hint": "Point them to your smallest test case first, and mention a GPU requirement only if that first quick check actually needs one.",
    "check": "Your report should give a small input, one exact command to run from the course root, the expected number/ID/tolerance, and the first field where a mismatch shows up. Run your own steps once from the course root before marking this complete."
  }
};
