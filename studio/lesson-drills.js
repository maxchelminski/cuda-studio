(() => {
  "use strict";

  // Each numeric prompt has a single exact result. The display supplies its unit.
  const number = (prompt, answer, unit, explanation) => ({prompt, answer:String(answer), unit, explanation});
  const choose = (prompt, options, answer, explanation, choiceHints) => ({prompt, options, answer, explanation, choiceHints});

  // Paired with each session's opening recall prompt, also used on its first review.
  window.LESSON_RECALL_ANSWERS = {
    "0/0": "20 ms per frame on average. One second is 1,000 ms. Divide 1,000 ms by 50 frames to get 20 ms for each frame.",
    "0/1": "One long frame leaves the old picture on screen while the player waits for the next one. That pause can feel like a hitch even when many short frames keep the average FPS high.",
    "0/2": "Column 1 is in flat slot 1 of row 0 and slot 4 of row 1. Moving down one row advances by the row width, so the difference is 3 elements.",
    "0/3": "The valid indices are 0, 1, 2 and 3. Calling .at(4) asks for a fifth element. The bounds check throws std::out_of_range.",
    "0/4": "Sixteen entries come first. Row 0 takes slots 0 through 7 and row 1 takes slots 8 through 15, so row 2 begins at slot 16.",
    "1/0": "Row 1, column 2 is 1 × 4 + 2 = 6 elements from the start. A pointer to the first element identifies slot 0. Adding 6 to that pointer reaches the desired element.",
    "1/1": "For a 2D launch, x = blockIdx.x × blockDim.x + threadIdx.x, and y follows the same formula with .y. The row-major slot is y × width + x. Neighboring lanes should advance x so their loads reach consecutive columns.",
    "1/2": "Guard the store with i < 197, where i is the global thread index. Threads 0 through 196 may write. The remaining 59 skip the store.",
    "1/3": "Work counts all additions. Span counts additions on the longest dependent path. In ((a + b) + c) + d each addition needs the last result, so all three lie on one path. Pairing (a + b) with (c + d) keeps three additions and shortens the path to two.",
    "1/4": "A grid is the set of blocks in one launch. A warp is a group of 32 threads scheduled together. A sector is a 32-byte region in the memory-access model used here. A block barrier waits for participating threads and makes their prior shared writes visible across the block. A CUDA event marks a point in a stream and a timed pair can measure elapsed GPU time.",
    "2/0": "Every output of a transpose copies one uniquely determined input. One output of a product combines several input pairs, so their products must be summed. One thread can own that sum, or several threads can coordinate a reduction.",
    "2/1": "An M × K matrix times a K × N matrix produces M × N output cells, one dot product per cell. Each dot product has K pairs of inputs.",
    "2/2": "Classical tiling keeps the conventional 2MNK FLOPs. Several output cells use the same input tile, which reduces repeated input loads. Changing the parentheses of a chain of matrices can change the arithmetic count.",
    "2/3": "The first barrier waits for every input tile value to be loaded before a neighbor reads it. The second keeps fast threads from overwriting a tile that another thread is still using. Two 16 × 16 arrays of 4-byte floats use 2 × 16 × 16 × 4 = 2,048 bytes per block.",
    "2/4": "Number the matrices from 1, with matrix i shaped pᵢ₋₁ × pᵢ. The cost of one matrix is zero. For i < j, minimize cost(i,k) + cost(k+1,j) + pᵢ₋₁ × pₖ × pⱼ over i ≤ k < j. The split changes arithmetic work. For a full T-wide GEMM phase, computing T² outputs independently requests 2T³ input values. Cooperative loading requests 2T², a T-fold reduction in input loads for the same products.",
    "3/0": "Dense storage takes N² values. CSR needs 2N values, 2N column indices and N+1 row offsets, so its storage grows linearly here. In row-major dense GEMM, row × width + column gives an address directly and adjacent columns occupy consecutive slots.",
    "3/1": "The mean hides the spread of row lengths, especially a few high-degree vertices. When each lane scans one row, lanes that finish early go idle during the remaining iterations of the longest row in their warp.",
    "3/2": "The sum is 3, so reserve three output slots. Each retained input also needs the number of kept inputs before it. The exclusive scan is [0,1,1,2]. Inputs 0, 2 and 3 use their scan entries to write to output slots 0, 1 and 2.",
    "3/3": "Pair adjacent values in [3,1,4,1,5,9,2,6] to get [4,5,14,8], then [9,22], then 31. All three levels fit inside one block. With two blocks of four inputs, each block can form its partial sum locally. In the CUDA lab one lane per block adds that partial sum to the same global total with atomicAdd.",
    "3/4": "For row r, sum values[j] × x[columns[j]] from offsets[r] up to, but excluding, offsets[r+1]. For retained input i, the destination is the sum of keep flags at indices below i. For your Week 1 question, identify the experiment or counter that would settle it.",
    "4/0": "17.5 ms per frame if the stages are serial and the rest stays fixed. The other work takes 15 ms. The shading kernel now takes 2.5 ms. Add them to get the new frame time.",
    "4/1": "A pixel center outside a box enclosing the entire shape, including its radius, cannot hit it. A center inside the box might still miss. For a capsule, compare its squared distance from the nearest point on the segment with the radius squared.",
    "4/2": "Threads must finish loading shared inputs before anyone reads them, and finish reading before the next tile overwrites them. Neighboring pixels can reuse the same batch of candidate segments, including their endpoints and radii.",
    "4/3": "A warp assigned to a short sparse row has little work for most of its lanes. Tile pruning also has overhead. In a crowded tile almost every segment can survive the bounds check, so collecting candidates saves few exact tests.",
    "4/4": "The broad phase rejects segments whose expanded boxes miss the tile. For the exact test, set v = b − a and clamp t = ((p − a) · v)/(v · v) to [0,1]. Compare the squared distance from p to a + tv with the squared radius. A zero-length segment uses endpoint a. If multiple segments hit, this renderer puts the largest original segment ID in front.",
    "4/lighting": "A ray can hit a wet surface and reflect toward the sign. Dropping the sign just because the primary ray misses it can erase its lettering from the reflection.",
    "4/creature": "The bound must enclose the strand’s entire displaced shape, including its thickness, at the gate position being rendered. A too-tight box can clip the silhouette. Overlapping boxes admit more candidates and save fewer detailed tests.",
    "5/0": "For an interior cell at flat index i in a grid of width W, its neighbors are i−1, i+1, i−W and i+W. Check the row and column at boundaries before applying the offsets so a horizontal step follows the intended boundary rule.",
    "5/1": "One full T-wide phase loads T² floats from A and T² from B. Each participates in T output products. In a five-point stencil an input influences only a fixed neighborhood, even when the output tile grows, and neighboring tiles also need halo cells.",
    "5/2": "SpMV produces Ax, one weighted dot product per row. With the club graph’s unweighted adjacency matrix and x all ones, each row sums to that vertex’s degree. To test a proposed solution x, compute b − Ax. Zero means it satisfies every equation. With rounded arithmetic, compare the residual norm with your tolerance.",
    "5/3": "The standalone Poisson lab fixes the outer ring at zero pressure. Ink Tunnel wraps neighbors periodically. The pressure gradient and the velocity-divergence operator must treat the same faces consistently for projection to cancel the modeled imbalance.",
    "5/4": "Smooth dye can hide remaining velocity divergence. A coarse grid can also erase a small vortex while the picture still looks plausible. Grid spacing sets the spatial detail represented, the time step sets how far time advances per update, and the residual measures how closely a candidate solves the discrete equations.",
    "6/0": "Pressure projection subtracts a pressure gradient from velocity to reduce divergence. For a stretched edge between equal free masses, move both endpoints toward each other along the edge, splitting the correction equally. A compressed edge needs the reverse move.",
    "6/1": "Every Jacobi sweep needs the previous pressure values from neighboring cells. Read from the old buffer and write the new one. The earlier pixel kernel gave each thread exclusive ownership of one output pixel so its final write had no competing writer.",
    "6/2": "Grid coordinates imply neighbors in a regular pressure stencil. A cloth grid can likewise supply potential neighbors, but a tear can remove their connection. Store a shared active flag per original edge so both endpoints agree about which connections survive.",
    "6/3": "The length error d − L has units of length. Dividing by the positive rest length L gives fractional strain. An extra 1 cm stretches a 10 cm edge by 10% and a 100 cm edge by 1%, which matters when applying the same tear threshold.",
    "6/4": "Use the four axial offsets (±1,0), (0,±1) and all four diagonals (±1,±1). In the gathered Jacobi update each thread reads the old neighbor positions and owns one new vertex. Diffusion likewise reads the old grid, writes the new one, then swaps buffers. Regular local dependencies make the neighbors predictable and separate old inputs from newly written outputs.",
    "6/textile": "One option is to record the cut in the sleeve’s material coordinates. Mapping each surface hit back to those coordinates lets the same stitch stay cut when the sleeve rotates.",
    "7/0": "A full 16-wide phase performs 2 × 16³ FLOPs using 2 × 16² × 4 input bytes. That gives 4 FLOPs per input byte. The estimate leaves out writing C to memory, and describes ideal tile loads rather than measured memory traffic.",
    "7/1": "Floating-point addition rounds intermediate results. Grouping the same terms differently can therefore change the sum. For retrieval, count queries whose selected gallery image has the query’s true digit label and divide by the number of queries for accuracy.",
    "7/2": "Near 1 the TF32 spacing is 2⁻¹⁰, so 1 + 2⁻¹² rounds back to 1. The stress dot product then gives zero where the exact result is 2⁻¹². A shared scale can fit a group’s range, but one large outlier can set such a coarse step that smaller values round together.",
    "7/3": "A kernel launch returns to the CPU while the GPU can still be working. A CPU timer stopped just after launch measures submission. The swarm’s host_p50_ms includes the render call through readback, so that timer also waits for the pixels. CUDA events around the kernel give its device time after the end event completes. In the pipeline lab, pinned-buffer async copies can return before a transfer completes.",
    "7/4": "The ridge intensity is compute throughput divided by memory bandwidth, in FLOPs per byte. The operand types and layout must be supported by the selected Tensor Core kernel. For 1,024 packed 4-bit values with one byte of scale per 16, the payload is 512 bytes plus 64 scale bytes, or 576 bytes before padding.",
    "8/soundstage": "Visiting the box at distance 8 first can cause detailed intersection tests there. A closer hit in the box at 2 still replaces the far hit. Visiting the near box first can prune the far box once its entry exceeds the nearest hit distance found.",
    "8/0": "Use your own timing, workload and comparison. For example, a dense swarm might show little gain from culling. High candidate survival and extra setup cost are two plausible causes. Record which one your counts distinguished and which still needs testing.",
    "8/1": "One example is the 2 × 3 transpose test. A square has the same input and output row width, so using the input width for output indexing can pass. The 2 × 3 input produces three rows of width 2 and exposes the wrong stride. A displaced cloth patch can similarly expose a missing constraint that exerts zero force at rest.",
    "8/2": "Use the stage and units from your baseline. For example, if pixel–segment tests dominate a sparse frame, effective culling should reduce the number of those tests per frame. Check that count and the time for the same rendering stage on matched frames.",
    "8/3": "Use an input your own model predicts will be difficult. For example, if every segment overlaps every tile, a culling kernel pays for candidate construction and still performs the exact tests. Compare its setup cost and surviving-candidate count with the baseline.",
    "8/4": "For dense GEMM, reuse input tiles. Every output must still match its reference dot product. An unguarded last tile can fail on a ragged shape. For sparse multiplication, split long rows across lanes while preserving each row sum. A one-entry row leaves most lanes idle. For rendering, cull disjoint bounds while preserving each pixel’s winning hit ID. If nearly all bounds overlap, building the candidate list can cost more than it saves."
  };

  window.LESSON_DRILLS = {
    "0/0": [
      number("A renderer takes 16 ms for every frame. How many frames can it finish per second at that rate?", 62.5, "FPS", "One second contains 1,000 ms. Divide 1,000 by 16. The fraction describes a rate averaged over many seconds."),
      number("Two frames take 5 ms and 45 ms. This pair repeats. What FPS would an observer measure across many pairs?", 40, "FPS", "Every 50 ms the observer sees two frames. Twenty pairs fit into 1,000 ms, giving 40 frames. Averaging the two individual FPS values would overweight the short frame.")
    ],
    "0/1": [
      number("A trace contains 9, 22, 18, 18, 24 and 6 ms. The budget is 18 ms. How many frames are strictly over budget?", 2, "frames", "Only 22 and 24 exceed 18. The two ties use the entire budget."),
      choose("Your counter is reset to zero inside the loop, just before each comparison. With a 10 ms budget, which test exposes the bug?", ["Trace [3, 8], expected 0", "Trace [8, 12], expected 1", "Trace [12, 8], expected 1"], 2, "The slow frame comes first. Resetting the counter on the second iteration erases it, so the faulty code returns zero.")
    ],
    "0/2": [
      number("A row-major matrix has four columns. Its flat values are [2, 7, 1, 5, 4, 8, 3, 6]. Which value is at row 1, column 2, using zero-based indices?", 3, "value", "Skip four values for row 0, then two more columns. Flat index 6 holds the value 3."),
      number("A row of A is [3, −2, 4]. The selected column of B is [1, 5, 2]. What value belongs in their output cell?", 1, "value", "Pair the entries by their inner index and add the three products. The result is 3 − 10 + 8 = 1.")
    ],
    "0/3": [
      number("The output array starts as [90, 91, 92, 93]. Multiply each of the two inputs [4, −2] by 3. Store the results in order, starting at output[1]. What value ends up in output[2]?", -6, "value", "The first product, 4 × 3 = 12, goes in output[1]. The second, −2 × 3 = −6, goes in output[2]. The array ends as [90, 12, −6, 93]."),
      choose(
        "Start a new example with output = [40, 50, 60, 70]. A loop starts at output[0] and should set two slots to zero (n = 2). By mistake it keeps going and sets a third consecutive slot to zero. Which slot does it change by mistake?",
        ["output[1]", "output[2]", "output[3]"], 1,
        "Two writes should give [0, 0, 60, 70]. Three writes give [0, 0, 0, 70]. Compare the two arrays at index 2. The test expected the guard value 60 there and found 0. Index 3 still holds 70 in both arrays.",
        {0: "Slot 1 receives the second zero. Which index does the loop visit on its next pass?", 2: "Slot 3 should also keep its value. Starting at slot 0, the loop would need four writes to reach slot 3. Count where the third write lands."}
      )
    ],
    "0/4": [
      number("A fresh visits vector has 19 slots. The simulator starts enough whole blocks of six workers to cover it. How many workers reach the index check and skip the write because their index lies outside the vector?", 5, "workers", "The launch needs four blocks, giving 24 workers. The final five indices are outside the 19-item input."),
      number("A worker increments visits[14] in a 19-slot vector. The simulator assigns six consecutive slots to each block, starting with slot 0 in block 0. What is this worker’s lane number within its block, counting from zero?", 2, "lane", "Blocks 0 and 1 cover the first 12 items. Item 14 belongs to block 2, two positions past its start.")
    ],
    "1/0": [
      number("A row-major 13 × 7 image uses width 13. Which flat pixel index should the worker at x = 11, y = 5 write?", 76, "index", "Five full rows occupy 65 entries. Adding column 11 gives 76."),
      number("A 13-column, 7-row image uses blocks 8 threads wide and 4 threads tall. Launch enough whole blocks to cover it. How many threads have coordinates outside the image?", 37, "threads", "Two blocks across and two down launch 128 threads. The image has 91 pixels, leaving 37 threads outside its bounds.")
    ],
    "1/1": [
      number("In the 32-byte sector model, 16 active lanes load adjacent four-byte floats starting at byte address 28. How many sectors contain at least one requested byte?", 3, "sectors", "The request spans bytes 28 through 91. These intersect sectors 0–31, 32–63 and 64–95."),
      number("Eight lanes read four bytes each at byte addresses 0, 32, 64, …, 224. If the model fetches each touched 32-byte sector once, what percentage of fetched bytes were requested?", 12.5, "%", "The lanes request 32 bytes in total. Eight sectors supply 256 bytes, so useful bytes account for 32/256 = 12.5%.")
    ],
    "1/2": [
      number("Serial frame work spends 2 ms preparing, 9 ms rendering and 3 ms copying. If only rendering becomes three times as fast, what is the new frame time?", 8, "ms", "Rendering falls to 3 ms. The three serial parts now add up to 2 + 3 + 3 = 8 ms."),
      choose("You need the duration of a kernel on its stream. Which timing sequence brackets its work?", ["Start event → kernel → stop event on that stream → wait for the stop → read elapsed time", "CPU stopwatch → launch → stop CPU stopwatch immediately", "Record both CUDA events → launch the kernel → wait"], 0, "Same-stream events execute in order. Waiting for the stop makes the interval available after the kernel completes.")
    ],
    "1/3": [
      number("Thirty-two inputs are summed in a balanced binary tree, pairing all remaining values at each level. How many additions occur across every level combined?", 31, "additions", "The levels perform 16 + 8 + 4 + 2 + 1 additions. Each addition reduces the number of surviving values by one."),
      number("A block of eight threads reduces three valid inputs [6, −2, 9]. The other five inputs are padded with the additive identity. What sum should the block return?", 13, "sum", "Each unused lane contributes zero. The three live values sum to 6 − 2 + 9 = 13.")
    ],
    "1/4": [
      number("Input A has 3 rows and 5 columns. Its transpose has 5 rows and 3 columns. To transpose A[1,4], which flat row-major output index should receive it?", 13, "index", "A[1,4] becomes output[4,1]. The output row width is 3, so the flat position is 4 × 3 + 1."),
      choose("A copy kernel launches blocks of 32 threads. A 32-element input passes. With 33 elements, only the last output still holds its starting value. What should you examine first?", ["Floating-point associativity", "Whether the launch rounds the number of blocks down", "Whether neighboring loads share a cache line"], 1, "A launch rounded down can omit the final partial block. The surviving sentinel means this output position was never filled with the expected value.")
    ],
    "2/0": [
      number("A tiny ink query is [2, 1, 0]. Gallery entry G is [1, 3, 4]. What raw dot score does G receive?", 5, "score", "Their three products are 2, 3 and 0. Summing gives 5."),
      choose("For query [1, 0], candidate A is [3, 4] and B is [1, 0]. Which candidate wins after cosine normalization?", ["A, because 3 is the larger raw score", "B, because its direction matches the query", "The two tie after normalization"], 1, "A has length 5, so its cosine score is 3/5. B has length 1 and cosine score 1.")
    ],
    "2/1": [
      number("A, B and C have shapes 6×2, 2×9 and 9×3. How many scalar multiplications does (AB)C require in total?", 270, "multiplications", "AB costs 6 × 2 × 9 = 108. The 6×9 temporary times C costs 6 × 9 × 3 = 162. Together they cost 270."),
      number("For the same 6×2, 2×9 and 9×3 inputs, how many scalar multiplications does A(BC) require?", 90, "multiplications", "BC costs 2 × 9 × 3 = 54 and produces a 2×3 temporary. Multiplying A by that costs another 6 × 2 × 3 = 36.")
    ],
    "2/2": [
      number("An 8×8 output tile has one thread per output. During one full K phase, the block loads 64 floats from A and 64 from B into shared memory. How many global input bytes are those loads?", 512, "bytes", "The block loads 128 FP32 values. Each occupies four bytes, making 512 bytes of requested input."),
      number("A dot product has 21 terms. A kernel processes eight inner indices per phase. In the last phase, how many of the eight index positions fall past the final term and need zero padding?", 3, "positions", "Two full phases cover 16 terms. Five real terms remain, so three padded terms contribute zero.")
    ],
    "2/3": [
      number("One thread accumulates a 2×3 patch of outputs. At a single K index it loads two A values and three B values. How many multiply-adds can it issue from those five values?", 6, "multiply-adds", "Each A value pairs with each B value. The two by three combinations update six separate accumulators."),
      choose("A larger per-thread patch slows your kernel. Which paired result would support register spilling as an explanation?", ["A larger output matrix and different input precision", "Identical answers on the same shape", "Spill loads and stores rise, and reducing the patch brings them back down on the same shape"], 2, "Spilling moves register values through local memory. A reversible change in spill traffic ties the symptom to the patch size.")
    ],
    "2/4": [
      number("Your unchanged baseline takes 7.5 ms and the candidate takes 3 ms on the same input and precision. What speedup should you report?", 2.5, "×", "Divide baseline time by candidate time. Here 7.5 / 3 = 2.5."),
      choose("A kernel matches the winning digit labels for all queries. Which additional test most directly checks the numerical matrix result?", ["Compare score entries with a high-precision reference and report the error and coverage", "Count output labels a second time", "Increase the timer repetition count"], 0, "Many score perturbations leave the largest entry unchanged. Comparing matrix values can expose those errors.")
    ],
    "3/0": [
      number("CSR row offsets are [0, 1, 1, 4, 5]. How many stored entries belong to zero-based row 2?", 3, "entries", "Row 2 starts at position 1 and ends before position 4. Its length is 4 − 1."),
      number("One sparse row stores values [−2, 5] at columns [3, 0]. For x = [4, 7, 0, 6], what output does this row produce?", 8, "value", "Multiply each stored value by x at its column. −2 × 6 + 5 × 4 gives 8.")
    ],
    "3/1": [
      number("Four lanes own rows of lengths [1, 9, 2, 4]. In a simple lockstep loop where each lane can process one entry per round, how many nonzero-entry operations occur in total?", 16, "operations", "Sum the row lengths. This gives useful work across all lanes, regardless of how long shorter lanes wait."),
      number("Four lanes process rows of lengths 1, 9, 2 and 4 together for nine rounds. Count one idle slot each time a lane has already finished its row but another lane is still working. How many idle slots are there in total?", 20, "idle lane-rounds", "The group has 4 × 9 = 36 slots. Its 16 useful operations leave 20 idle slots.")
    ],
    "3/2": [
      number("An exclusive scan over keep flags [0, 1, 1, 0, 1, 1] supplies compacted zero-based destinations. Which destination belongs to the item at input index 4?", 2, "index", "Two kept items precede index 4, at indices 1 and 2. The item at 4 therefore writes destination 2."),
      number("Three consecutive blocks keep 4, 0 and 7 items. What global index receives local kept item 2 (zero-based) in the third block?", 6, "index", "The third block begins after 4 + 0 prior items. Adding local index 2 gives global index 6.")
    ],
    "3/3": [
      number("A two-pass ink reduction splits 1,001 values into nonoverlapping chunks of 128. Each chunk writes one partial sum. How many partial sums does the second pass read?", 8, "partial sums", "Seven full chunks cover 896 values, and one last chunk contains 105. All eight chunks contribute a partial sum."),
      choose("Two variants return different totals for nonnegative integer ink counts. The accumulator can hold their full sum. What should you test first?", ["Whether a different summation order explains it", "Coverage of every input and ownership of updates", "Whether displaying more decimal places helps"], 1, "With sufficient integer range, regrouping additions preserves the sum. A dropped value, duplicate work or racing update can change it.")
    ],
    "3/4": [
      number("Method A is ready immediately and takes 1.2 ms per call. Method B needs 3 ms of setup once, then 0.7 ms per call. How many calls must you make before B’s total time is strictly less than A’s?", 7, "calls", "B saves 0.5 ms per call and repays its setup at six calls. The first strictly faster run has seven."),
      choose("A row layout wins on the club graph and loses on a roof matrix. Which next comparison helps test whether row-length skew caused it?", ["Raise precision for the first matrix only", "Time parsing only for the second matrix", "Compare synthetic matrices with fixed dimensions and nonzero count but different row-length distributions"], 2, "This controls the matrix size and amount of arithmetic while changing how unevenly work is distributed.")
    ],
    "4/0": [
      number("A brute-force renderer checks 18 capsules at each pixel of a 20×12 image, with one sample per pixel. How many pixel–capsule tests are performed?", 4320, "tests", "There are 240 pixels. Eighteen tests at each pixel give 4,320 tests."),
      number("A renderer tests the same set of capsules at every pixel. You halve both image dimensions. Divide the original number of tests by the new number. What factor do you get?", 4, "×", "The two factors of one half multiply. The new image has one quarter of the pixels and one quarter of the tests.")
    ],
    "4/1": [
      number("The capsule centerline goes from (1,1) to (5,1). For pixel center (3,4), what is the squared distance to the nearest point on the segment?", 9, "squared units", "The nearest point is (3,1). The displacement is (0,3), whose squared length is 9."),
      choose("An animation collapses both ends of a capsule onto (2,3). Which geometric fallback keeps its distance test well-defined?", ["Project using an arbitrarily tiny denominator and an unlimited t", "Compute distance to the single endpoint", "Accept all pixels in the tile"], 1, "A segment of length zero represents one point. Distances to that point provide the sphere or disk test for the given radius.")
    ],
    "4/2": [
      number("A tile contains 64 active pixels. Its shared candidate list reduces 25 capsules to 7. How many detailed pixel–capsule tests does that remove, before counting list-construction work?", 1152, "tests", "Each pixel skips 18 candidates, so 64 × 18 = 1,152 detailed tests disappear."),
      choose("A capsule grazes a tile boundary. Your broad phase is uncertain whether the last pixel could be hit. Which action preserves exact coverage?", ["Keep the candidate and run the detailed test", "Remove it because the overlap is small", "Use its box color as the pixel"], 0, "The narrow-phase distance test can reject an extra candidate. A shape omitted upstream has no chance to produce its correct hit.")
    ],
    "4/3": [
      number("Four equal-size tiles each have 12 possible candidates. Their surviving lists contain 2, 3, 12 and 7 candidates. What percentage of the 48 tile–candidate pairs survives?", 50, "%", "The four list lengths sum to 24. Dividing 24 by 48 gives one half."),
      choose("A camera move puts nearly all bounds on top of the same tiles. At equal quality and resolution, which mechanism could make the tiled method slower than brute force here?", ["The tiled method suddenly has fewer pixels", "The view changes the GPU clock by definition", "It builds lists while rejecting very few expensive tests"], 2, "A list with nearly every candidate leaves the detailed work almost unchanged, while constructing and synchronizing it still takes time.")
    ],
    "4/4": [
      number("Sorted frame times in ms are [5, 5, 5, 6, 6, 6, 7, 7, 8, 19]. Using nearest-rank p90 (rank ceil(0.90 × 10), starting at 1), what is p90?", 8, "ms", "The ninth sorted value is 8 ms. The worst frame is 19 ms, so state the percentile convention when interpreting a short trace."),
      choose("Which side-by-side clip and timing pair lets a viewer judge an exact rendering optimization?", ["Two favorite camera shots, each with different features", "Identical shot, time and settings, plus a pixel comparison and repeated scoped timings", "A faster clip alone with a larger FPS label"], 1, "Matching the workload lets viewers attribute the timing change to the algorithm. The pixel comparison measures what happened to image agreement.")
    ],
    "4/lighting": [
      number("A ray enters axis slabs over intervals [1,8], [4,6] and [3,7]. At what distance does it first enter the common box?", 4, "ray units", "The common interval begins at the largest entry, 4, and ends at the smallest exit, 6."),
      choose("The primary ray already found a wall at distance 3. A box on that same ray begins at 5. How should a later shadow ray from a different origin treat the box?", ["Discard it using the primary distance 3", "Reuse the primary interval [5,∞)", "Test against the shadow ray with that ray’s own distance limit"], 2, "Slab intervals and nearest-hit distances are expressed relative to one ray. Changing the origin or direction changes the test.")
    ],
    "4/creature": [
      number("A surviving strand has 30 links in six groups of five. Two group boxes survive a ray test. At most how many individual links are tested inside those two groups?", 10, "links", "Each passing group contains five links. The two surviving groups give ten possible detailed tests."),
      choose("The gate moves, and a few strands vanish only in the optimized frame. Which diagnostic most directly tests for stale group bounds?", ["Check whether the updated group boxes enclose the current links before tracing", "Lower the image resolution", "Compare only the mean frame time"], 0, "An old box can miss the ray even when a current link crosses it. Checking containment tests the assumption that makes box rejection valid.")
    ],
    "5/0": [
      number("For the equation 4p − sum(neighbors) = source, an interior cell has old neighbor values 1, 0, 3 and 4, and source 2. What new p does one Jacobi sweep assign there?", 2.5, "pressure units", "Solving for the new center gives (1 + 0 + 3 + 4 + 2) / 4 = 2.5."),
      number("In a width-11 row-major grid, an interior cell has flat index 48. What is the flat index of the neighbor one row below it?", 59, "index", "Moving down one row with the column unchanged adds the width. The result is 48 + 11 = 59.")
    ],
    "5/1": [
      number("A block copies an entire 10 × 10 rectangle, including all four corners, to update an 8 × 8 interior. How many staged cells are outside the interior?", 36, "cells", "There are 100 staged cells and 64 output cells. The difference is 36; it includes four corners."),
      choose("Two local Jacobi sweeps must match two global sweeps at the tile edge. Which starting data can influence that edge after the second sweep?", ["Only the original center", "Original values up to two neighbor steps away", "Only values that were inside the output tile"], 1, "Each sweep expands the input dependence by one stencil step. A second update needs valid first-sweep neighbors on both sides of the edge.")
    ],
    "5/2": [
      number("At one interior cell, A p = 4p − sum(neighbors). The current p is 3, the neighbors sum to 7, and b is 4. What is the signed residual b − A p?", -1, "units", "A p is 12 − 7 = 5. The chosen residual convention gives 4 − 5 = −1."),
      number("Starting from the same residual, A reaches the target after 90 sweeps at 0.2 ms each. B reaches it after 60 sweeps at 0.25 ms each. How many milliseconds does B save in sweep time?", 3, "ms", "A needs 18 ms and B needs 15 ms. Time to this shared target falls by 3 ms.")
    ],
    "5/3": [
      number("For one 1D cell take divergence as right face velocity minus left face velocity, with unit spacing. Left is 3 and right is 8. After projection left is 5 and right is 5. By how much did absolute divergence decrease?", 5, "units", "Absolute divergence went from |8 − 3| = 5 to |5 − 5| = 0."),
      choose("In a periodic pressure solve, add 12 to every pressure entry. Which quantity stays the same under this shift?", ["Mean pressure", "Sum of all pressure entries", "The pressure difference across each face"], 2, "Subtracting two neighbors cancels their common offset. The resulting pressure-gradient correction is identical.")
    ],
    "5/4": [
      number("At the same physical final time, one grid has error 0.024 and a refined grid has error 0.006 in the same norm. By what factor did the error fall?", 4, "×", "Divide coarse-grid error by fine-grid error. A fourfold reduction is one observation; further refinements can test its trend."),
      choose("A reference vortex is evaluated at t = 0.8. The fine-grid simulation ends at t = 0.9. What should you change before comparing spatial errors?", ["Advance both to the same physical time, shortening the last step if necessary", "Compare the prettier frames", "Normalize both fields by their final maxima"], 0, "Vortex amplitude changes with time. Matching the final physical time removes a temporal mismatch from the spatial comparison.")
    ],
    "6/0": [
      number("Two free endpoints are 14 units apart and their rest length is 10. With equal inverse masses and a full undamped correction, how far should each endpoint move toward the other?", 2, "units", "The total excess is 4. Equal inverse masses share the correction evenly."),
      number("A full correction must shorten a stitch by 6 units. Its endpoints have inverse masses 1 and 2. How far does the endpoint with inverse mass 2 move?", 4, "units", "Its share is 2 / (1 + 2) of 6, which is 4. The other endpoint contributes the remaining 2.")
    ],
    "6/1": [
      choose("At the start of a Jacobi sweep, both neighboring constraints need the same vertex position. Which arrangement makes each proposal use the same snapshot?", ["Write proposed positions into the same array immediately", "Read the old array throughout the sweep and write each vertex’s result once into the new array", "Let the last incident edge overwrite the vertex"], 1, "Each proposal sees the same old positions. Separate ownership of the output keeps update order from changing which values were read."),
      number("A toy vertex gather averages three proposed coordinates 2, 8 and 11 with equal weights. What coordinate does it write for the next sweep?", 7, "units", "Their sum is 21. Equal weighting across three proposals gives 7.")
    ],
    "6/2": [
      number("A rectangular 4×3 vertex grid connects horizontal neighbors, vertical neighbors and both diagonals of every square. How many distinct undirected edges are there?", 29, "edges", "There are 3 × 3 = 9 horizontal and 4 × 2 = 8 vertical edges. Six squares contribute two diagonals each, giving 9 + 8 + 12 = 29."),
      number("In an undirected cloth mesh, 27 edges remain active. If both endpoints of every active edge are free and each gathers that edge once, how many active-edge contributions are evaluated per sweep?", 54, "contributions", "Every active edge appears once in each endpoint’s gather. There are 2 × 27 contributions.")
    ],
    "6/3": [
      number("A stitch is 12 mm long at rest and 15 mm when measured. Using (length − rest) / rest, what is its tensile strain as a percentage?", 25, "%", "The extension is 3 mm. Dividing by the 12 mm rest length gives 0.25, or 25%."),
      choose("A stitch tears when tensile strain is strictly greater than 0.25. Which case should tear?", ["Rest 8, current 6", "Rest 8, current 10", "Rest 8, current 11"], 2, "The strains are −0.25, 0.25 and 0.375. The middle case reaches the threshold exactly. Only the last goes beyond it.")
    ],
    "6/4": [
      number("Two solvers each advance 12 fixed steps. Their measured totals are 36 ms and 24 ms at matched accuracy. What is the speedup of the second solver?", 1.5, "×", "Both runs cover the same simulated time. Dividing 36 by 24 gives 1.5."),
      choose("Two swatches have the same number of torn edges but visually different holes. Which comparison can distinguish the tear patterns?", ["Total vertex count", "The active/inactive bit for each matching edge ID", "Average FPS while the camera rotates"], 1, "Equal counts can hide a tear in a different place. Compare the identity of each edge and then the resulting geometry.")
    ],
    "6/textile": [
      choose("A cut is tracked only by screen coordinates (220, 90). After a camera rotation, which saved state would keep the cut attached to the fabric?", ["The material-space location and extent of the cut", "The previous image resolution", "The GPU time of the click"], 0, "A fabric location follows the surface as it moves in the image. A screen coordinate refers to the camera view."),
      choose("You think the tear disappears when you release the mouse. Which experiment isolates release from camera movement?", ["Release while moving the camera and changing material", "Reload all defaults before checking", "Hold the camera fixed, render immediately before and after release, then rotate in a separate test"], 2, "The first pair of frames changes only the button state. A separate rotation can then test whether the cut remains attached to the surface.")
    ],
    "7/0": [
      number("A hypothetical kernel has arithmetic intensity 3 FLOP per byte. Its measured sustained bandwidth roof is 400 GB/s (decimal). What is the bandwidth-limited ceiling?", 1200, "GFLOP/s", "3 FLOP/byte × 400 billion bytes/s gives 1,200 billion FLOP/s, before any lower compute roof."),
      number("A hypothetical device sustains 8,000 GFLOP/s of compute and 500 GB/s from memory. At what arithmetic intensity do those two roofs meet?", 16, "FLOP/byte", "At the intersection, bandwidth × intensity equals the compute ceiling. Divide 8,000 by 500.")
    ],
    "7/1": [
      number("One image scores 1.25 and the runner-up scores 1.125. Either score can rise or fall by up to 0.03125. What is the smallest possible difference between these two scores after rounding?", 0.0625, "score units", "Their original gap is 0.125. The first may fall by 0.03125 while the second rises by 0.03125, leaving 0.0625."),
      choose("A reduced-precision multiply gives the same total count of correct digit labels as FP32. Which comparison tests whether the two policies agree on each query?", ["Compare only their aggregate percentages", "Compare the two winning labels at every matching query ID", "Compare the maximum matrix dimensions"], 1, "A gain on one query can cancel a loss on another. Pairing labels by query exposes those swaps.")
    ],
    "7/2": [
      number("A toy block-scaled layout packs 32 four-bit values and adds two one-byte scales. Ignoring headers and padding, how many bytes does the block occupy?", 18, "bytes", "The values occupy 32 × 4 / 8 = 16 bytes. Adding two scale bytes gives 18."),
      choose("One block shares a scale chosen from its largest magnitude. A new value is much larger than all its neighbors. What can happen to the small neighbors?", ["They all become exactly representable", "Their order must flip", "Several can round to the same representable level"], 2, "The scale must cover a wider range. With a fixed number of low-precision levels, distinct small values can collapse to the same representation.")
    ],
    "7/3": [
      number("Queries 0 through 149 are streamed in chunks of 32. How many actual queries belong to the final chunk?", 22, "queries", "Four complete chunks consume 128 of the 150 queries. The final chunk contains 22."),
      choose("A ping-pong pipeline reuses a pinned host output slot. Its previous asynchronous device-to-host copy has finished, but the CPU is still checking the old scores. When is the slot free?", ["After the CPU also finishes reading that output", "As soon as the CUDA event for the copy fires", "Immediately after the next kernel is enqueued"], 0, "The CPU still owns the data it is checking. Reusing the slot early can overwrite scores during that check.")
    ],
    "7/4": [
      choose("A fast path must have maximum absolute error ≤ 0.004. A takes 2.4 ms at 0.003, B takes 1.1 ms at 0.006, and C takes 1.8 ms at 0.004. Which is the fastest admissible result?", ["A", "B", "C"], 2, "A and C satisfy the inclusive error bound. C has the shorter measured time."),
      number("A dispatch check costs 0.3 ms per call. For one input, the baseline costs 2 ms and the selected fast kernel costs 1.8 ms. What is the selected path’s total per-call time?", 2.1, "ms", "Add dispatch overhead to execution time. At 2.1 ms this selected path loses its kernel-only advantage on the given input.")
    ],
    "8/soundstage": [
      choose("In a last-in, first-out traversal, the ray enters the left child at 6 and the right child at 2. Which push order visits the nearer child next?", ["Push right, then left", "Push left, then right", "Either push order always visits right first"], 1, "The child pushed last is visited first. Pushing right last processes the box entered at 2 next."),
      number("Three pending boxes begin at ray distances 2, 7 and 12. A tested triangle establishes a hit at 5. Assuming these boxes already passed their other tests, how many can now be rejected solely by entry distance?", 2, "boxes", "The boxes entered at 7 and 12 start beyond the known hit. The box entered at 2 may still hide a nearer triangle.")
    ],
    "8/0": [
      choose("A capstone user needs interactive response: p95 host frame time ≤ 16 ms with exact reference pixels. Which measurement pair tests that contract directly?", ["GPU median plus triangle count", "Host p95 over the declared frames plus an exact pixel comparison", "A screenshot and the fastest single frame"], 1, "The contract specifies a host-tail measurement and image equality. Collect both on the named workload."),
      number("A candidate reduces a stage from 8 ms to 2 ms. The other serial stages total 12 ms. How many milliseconds does the full workload now take?", 14, "ms", "The updated stage and the unchanged stages add to 2 + 12 = 14. The baseline was 20 ms.")
    ],
    "8/1": [
      number("Your independent reference produces [2, 8, 5, 3]. The candidate produces [2, 5, 8, 3]. Compare values at matching positions. What is the largest absolute difference?", 3, "units", "The second and third positions differ by 3. Both ends match, so the maximum discrepancy is 3."),
      choose("Your candidate and reference use the same suspect indexing helper. How would you make a tiny adversarial test more independent?", ["Increase the number of identical random tests", "Record both kernel times", "Hand-compute a rectangular example and compare every labeled output location"], 2, "A hand-labeled example supplies expected values without sharing the helper that could make both implementations fail in the same way.")
    ],
    "8/2": [
      number("The baseline tests 900 candidates per ray and the edited version tests 225. What percentage of candidate tests did the edit remove?", 75, "%", "The difference is 675 tests. Dividing 675 by the original 900 yields 75%."),
      choose("A diagnostic counter confirms fewer visits, yet the production run is slower. What would best distinguish a costly pruning stage from a mistake in the visit measurement?", ["Measure matched production timings, then inspect the pruning stage separately while checking candidate counts on the same input", "Report only the bigger percentage improvement", "Drop the correctness comparison"], 0, "The production measurement captures the actual regression. The separate stage and work measurements test whether rejection overhead outweighed the visits saved.")
    ],
    "8/3": [
      number("Total modeled times in microseconds are A(n) = 4n and B(n) = 30 + 2n. At which integer n are the modeled times equal?", 15, "items", "Solve 4n = 30 + 2n. At n = 15 both methods take 60 microseconds."),
      choose("You chose a dispatch threshold using a set of timing runs. Which next experiment provides fresh evidence about the choice?", ["Tune repeatedly on the same runs until the rule looks stable", "Measure held-out inputs just below and above the threshold under the same quality contract", "Remove the inputs where the choice disagreed with the prediction"], 1, "Near-threshold cases make the decision sensitive to the proposed boundary. Holding them out separates evaluation from selecting it.")
    ],
    "8/4": [
      number("For three matched runs, the baseline/candidate ratios are 1.4, 0.9 and 1.2. What is their median paired speedup?", 1.2, "×", "Sort the ratios to get 0.9, 1.2 and 1.4. The middle value is 1.2; one paired run was slower."),
      choose("A reader can reproduce your timing but cannot tell whether the edited output is right. Which addition makes the report more informative?", ["A second title for the chart", "Another decimal place in the mean", "A small input, its independently computed expected result, and the actual comparison"], 2, "That combination lets a reader verify a concrete correctness claim and connect it to a particular run.")
    ]
  };

  const transfer = (lesson, title, prompt, checks, explanation) => ({
    title, prompt, checks, explanation,
    command:"powershell -ExecutionPolicy Bypass -File .\\labs\\primer\\run.ps1 " + lesson + " -ExtraChecks"
  });
  window.LESSON_TRANSFER = {
    "0/0": transfer(1, "Test your FPS function on fractional times",
      "Predict the three answers first, then run the command in Course PowerShell. It compiles your saved fps function and calls it on three new positive frame times.",
      ["6.25 ms per frame", "32 ms per frame", "125 ms per frame"],
      "Your results should be 160, 31.25 and 8 FPS. A result of 31 instead of 31.25 points toward integer division or an integer return value. The final line says All extra checks passed when all three agree."),
    "0/1": transfer(2, "Test the same rule on three different lists",
      "The extra-check command runs a separate test program. It uses your saved count_over function and supplies the three calls below in order. Your a–d checks run with the regular command. For each new call, circle the frames strictly above its own budget, then compare your count with the program’s got and expected numbers.",
      ["Call 1 · [7, 12, 7, 8, 3] ms, budget 7 ms. Which frames qualify? What would counting equality change?", "Call 2 · [22, 21, 22] ms, budget 20 ms. If a duration repeats, how many frames does it represent?", "Call 3 · [4, 6, 5] ms, budget 8 ms. What should the function return immediately after the previous call counted several frames?"],
      "Call 1 counts 12 and 8, giving 2. There also happen to be two ties. Counting both 7s as late would give 4. Call 2 counts all three frames, including each occurrence of 22, giving 3. Call 3 counts zero. A nonzero result on that last call is a reason to check whether the counter carried over. All three PASS lines mean your function agreed with the hand counts on these inputs."),
    "0/2": transfer(3, "Check a rectangular product with signed values",
      "The command calls your saved functions on new inputs supplied by the course. Leave the matrices in your main as they are. The first check asks for a slot number. The next two ask for entries of a product.",
      ["For the index check alone, picture three rows of four slots. Which slot holds row 2, column 1? Number the first slot zero.", "For both product checks, A has rows [2, −1] and [3, 4]. B has rows [1, 2, 0, −2] and [5, −1, 3, 4]. Compute C(0,3) using the first row of A and the last column of B.", "Using the same A and B, compute C(1,1). Compare each product line’s got value with the entry you worked out."],
      "The independent index check gives slot 9. For the product, C(0,3) is 2 × (−2) + (−1) × 4 = −8. C(1,1) is 3 × 2 + 4 × (−1) = 2. Seeing 9 and −8 on consecutive PASS lines is consistent: the first is a position and the second is a value."),
    "0/3": transfer(4, "Start the buffer in the middle",
      "Predict all six output slots. The input is [7, −3, 6, 2, 0] and the output begins [90, 91, 92, 93, 94, 95]. The call starts at index 1 of each array, scales three inputs by −0.5 and writes from output index 1.",
      ["Write the expected values for original output slots 0 through 5. The slot numbers printed by the test refer to that original output array.", "The test program then calls scale with zero elements on the same arrays. Predict the value it will read from output[0]. Both calls are supplied by this command."],
      "The six values should be [90, 1.5, −3, −1, 94, 95]. Each successful slot check reports the observed and expected value."),
    "0/4": transfer(5, "Change the simulated block width",
      "This command uses your saved simulate_launch with six workers per block. For each length below, draw the blocks you expect the outer loop to enter. Next to the drawing, write how many different array slots should finish with a count of one. Compare that second number with the terminal line for the same length.",
      ["Input lengths 0 and 3", "Input length 6", "Input length 13"],
      "For lengths 0, 3, 6 and 13, the block counts are 0, 1, 1 and 3. The terminal’s expected slot counts are 0, 3, 6 and 13. For the last case three blocks start 18 workers, so five must skip the write.")
  };
})();
