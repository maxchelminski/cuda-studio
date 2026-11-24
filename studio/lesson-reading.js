// Each index refers to the resource list on that same session. A direct link
// points to a more focused reading or to a section of an offline lab manual.
(() => {
  "use strict";
  const assigned = (index, focus, label) => ({index, focus, ...(label ? {label} : {})});
  const reading = (url, label, focus) => ({url, label, focus});
  const plan = (first, followup) => ({before:[first], after:followup ? [followup] : []});
  const numerical = (anchor, label, focus) => reading("labs/compute/README.html#" + anchor, label, focus);
  const knit = (anchor, label, focus) => reading("labs/knit/README.html#" + anchor, label, focus);
  const flow = (anchor, label, focus) => reading("labs/flow/README.html#" + anchor, label, focus);
  const swarm = (anchor, label, focus) => reading("labs/render/README.html#" + anchor, label, focus);
  const best = (anchor, label, focus) => reading("https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#" + anchor, label, focus);

  window.LESSON_READING = {
    "0/0": {before:[
      assigned(0, "Start at the first user-defined function example. Execution begins in `main`—trace where the function call jumps and which line runs when it returns. Stop once you can predict the exact order of the printed lines.", "LearnCpp 2.1 · Calling a function"),
      reading("https://www.learncpp.com/cpp-tutorial/function-return-values-value-returning-functions/", "LearnCpp 2.2 · Returning a value", "Jump to “Return values” and read the `returnFive()` example. Notice why one call prints `7` while calling `returnFive()` on a line by itself prints nothing. Stop there—in this lab, `fps` returns a number and the test harness handles printing.")
    ], after:[
      reading("https://learn.microsoft.com/en-us/cpp/ide/walkthrough-building-a-project-cpp?view=msvc-170", "Microsoft Learn · Compare two compiler messages", "Read steps 1–3 under “To fix compilation errors.” Compare how Microsoft’s example reports a missing semicolon and closing brace with the compiler error you saved from your own build—you don’t need to build their sample project.")
    ]},
    "0/1": {bridge:{
      title:"Trace three frame times",
      context:"In Session 1, `fps` took a single frame time. Here, a vector stores three frame times in order. Think of `std::vector<int>` as a resizable list of whole numbers from the C++ standard library, initialized by the values inside the braces.",
      code:"std::vector<int> frames = {12, 19, 16};\nfor (int ms : frames) {\n    if (ms > 16) {\n        std::cout << ms << ' ';\n    }\n}",
      walk:"Read `for (int ms : frames)` as “for each integer `ms` in `frames`.” On the first pass, `ms` is `12`. Because `12 > 16` is false, the loop skips the print statement and moves on. Whenever the condition is true, `std::cout << ms << ' '` prints `ms` followed by a space.",
      question:"Finish tracing the loop. What is `ms` on the second pass, and which numbers get printed? If you change `>` to `>=` (greater than or equal), which extra number appears?",
      answer:"On the second pass, `ms` is `19`, so the loop prints `19`. On the third pass, `ms` is `16`, which ties the budget and fails `>`. Switching to `>=` prints `19` and then `16`. In the lab, you’ll decide what running count to track across iterations.",
      support:reading("https://www.learncpp.com/cpp-tutorial/introduction-to-stdvector-and-list-constructors/", "LearnCpp 16.2 · How the list gets its values", "If the vector syntax looks unfamiliar, jump to “Initializing a std::vector with a list of values” and look at the four-element `primes` example. Stop once you can point out the variable name, element type, and starting values.")
    },before:[
      reading("https://www.learncpp.com/cpp-tutorial/introduction-to-if-statements/", "LearnCpp 4.10 · Decide whether a line runs", "Find “A sample program using an if statement.” Trace only the `if` condition and print line for inputs `0` and `5`, then stop before “If-else.”"),
      assigned(0, "Use Ctrl+F to jump to `for (int num : fibonacci)` (just below the opening indexed loop). The author writes `std::vector fibonacci` because C++ can deduce `int` from the starting numbers. Trace the first two values of `num` and stop at “Key insight”—the rest of the chapter is optional.", "LearnCpp 16.8 · Visit each value in a list")
    ], after:[]},
    "0/2": {bridge:{
      title:"Choose a position in yesterday’s trace",
      context:"Yesterday’s loop walked through every value in order. Matrix multiplication needs to jump straight to a specific element using its zero-based index.",
      code:"std::vector<int> frames = {12, 19, 16};\nint pos = 1;\nint chosen = frames.at(pos);\n++pos;",
      walk:"The valid indices are `0`, `1`, and `2`. Line 3 reads index `1` and copies that value into `chosen`. Line 4 increments `pos` by `1`. For any valid index, `frames[pos]` and `frames.at(pos)` return the same value, except `.at()` also checks bounds and throws an error if you go out of range.",
      question:"After the last line runs, what are the values of `chosen` and `pos`? What would a new call to `frames.at(pos)` return?",
      answer:"`chosen` is still `19`, `pos` is now `2`, and calling `frames.at(pos)` now returns `16`. Moving the index changes which element you read next without altering the earlier copy."
    },before:[
      assigned(0, "Find “Accessing array elements using the subscript operator.” Jot down the zero-based index under each of the five primes in the sum example, predict `primes[2]`, and stop once you check it.", "LearnCpp 16.2 · Find a value by its position"),
      reading("https://www.learncpp.com/cpp-tutorial/for-statements/", "LearnCpp 8.10 · Follow a loop counter", "Find the first `for` loop that prints 1 through 10 and identify its initializer, loop condition, and update step. Stop there—then check which values of `k` enter the loop body if `k` starts at `0` with condition `k < 3`.")
    ], after:[]},
    "0/3": {bridge:{
      title:"Follow one address",
      context:"Picture a variable named `light` as a labeled box holding the number `3`. A pointer is a variable that stores the memory address of that box.",
      code:"int light = 3;\nint* p = &light;\n*p = 8;",
      walk:"In `int* p`, the `*` means `p` holds the address of an `int`. In `&light`, the `&` operator grabs `light`’s address (different from `&` in a parameter list, where it declares a reference). On line 3, `*p` follows that address to `light`’s box and writes `8` inside.",
      question:"After all three lines run, what does printing `light` output, and what does `p` still point to?",
      answer:"`light` now holds `8`, and `p` still points to `light`. Writing through `*p` changed the number inside the box without changing the pointer’s address."
    },before:[
      assigned(0, "Use Ctrl+F to find `*ptr = 6;`. Draw a box for `x` with an arrow from `ptr` pointing to it. After `*ptr = 6;` runs, what number is inside `x` and where does `ptr` point? Check the printed output and stop there.", "LearnCpp 12.7 · Change a value through its address"),
      reading("https://learn.microsoft.com/en-us/cpp/standard-library/vector-class?view=msvc-170#data", "Microsoft Learn · Where a vector’s data begins", "In the `.data()` example, find `c1_ptr = c1.data()` and the write on the very next line. Notice which element of the vector changes, then stop after comparing the two output lines. In our lab, notice which parameter tells the function how many elements it is allowed to write.")
    ], after:[
      reading("https://www.learncpp.com/cpp-tutorial/pointer-arithmetic-and-subscripting/", "LearnCpp 17.9 · Start partway through a buffer", "Find the example where `ptr` is set to `&arr[3]` and check which element of `arr` is reached by `ptr[1]` before and after that shift. Stop after that example and use the same mental model on the extra buffer checks.")
    ]},
    "0/4": {bridge:{
      title:"Follow a counter that starts over",
      context:"Read the outer loop as launching two blocks (`0` and `1`), and the inner loop as stepping through two local workers inside each block. The print statement outputs `block,local`.",
      code:"for (int block = 0; block < 2; ++block) {\n    for (int local = 0; local < 2; ++local) {\n        std::cout << block << ',' << local << '\\n';\n    }\n}",
      walk:"The first printed pair is `0,0`. The inner loop finishes all its iterations for block `0` before the outer loop advances to block `1`.",
      question:"Write down the next three printed pairs. Which line resets the local worker counter back to zero for each new block?",
      answer:"The next pairs are `0,1`, `1,0`, and `1,1`. Each time the outer loop enters the inner loop, `int local = 0` runs fresh. On a CPU these workers print in serial order, while on a GPU the hardware can run them concurrently in any order."
    },before:[
        assigned(0, "Find “Nested for-loops” and the example that prints a letter followed by three numbers (`char` holds a single character and `++c` moves to the next letter). Write down the first two lines of output, note which counter resets whenever the letter changes, and stop there.", "LearnCpp 8.10 · Trace a loop inside another loop")
    ], after:[
        reading("https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/intro-to-cuda-cpp.html", "NVIDIA · Read another GPU launch", "After step 3, jump to “Triple Chevron Notation” and find `vecAdd<<<1, 256>>>`. Match those two launch numbers to the ones in our native CUDA launch, check which number you’d raise to add another block of the same size, and stop after that paragraph."),
      reading("https://www.learncpp.com/cpp-tutorial/arithmetic-operators/", "LearnCpp 6.2 · How many blocks does the array need?", "Read “Integer and floating point division.” In our simulator, suppose `visits` has 5 elements (`0..4`) and each block has 4 workers. Compare `5 / 4` against `(5 + 4 - 1) / 4` as formulas for `blocks`—which one launches enough workers to reach `visits[4]`?")
    ]},

    "1/0": plan(
      assigned(0, "Find the thread-indexing example that uses `blockIdx.x`, `blockDim.x`, and `threadIdx.x`. Notice which variable increments between neighboring threads and which one only steps at a block boundary."),
      assigned(2, "In Chapter 6 of Fregly’s book, review how threads organize into warps and blocks, then sketch the exact grid and block dimensions you tested in the lab.", "Fregly · Chapter 6, GPU thread organization")),
    "1/1": plan(
      assigned(0, "Compare the aligned consecutive-access diagram with the misaligned one. Mark the 32-byte memory segment boundaries and draw a 4-byte load straddling a boundary—you’ll use that exact picture to count sectors touched by a warp."),
      assigned(1, "Chapter 7 opens with global memory coalescing. Compare the access pattern you measured in the lab with the coalesced and strided layouts shown there.", "Fregly · Chapter 7, global memory access")),
    "1/2": plan(
      best("timing", "NVIDIA Best Practices · CPU and GPU timing", "Compare the CPU-timer and CUDA-event timing methods. Note what the CPU timer has to wait for, which GPU work sits between the two CUDA events, and which timer would capture copying a finished frame back to the host."),
      assigned(0, "Look up `cudaEventElapsedTime` and verify what time unit it returns before converting a duration into FPS.")),
    "1/3": plan(
      assigned(0, "Read the opening reduction diagrams, then sketch an 8-leaf binary tree showing which pairs add at each level. Contrast the total number of additions with the number of sequential rounds."),
      assigned(1, "Read the floating-point rounding and associativity examples so you can explain why summing the exact same floats with a different tree shape can change the trailing digits.")),
    "1/4": plan(
      assigned(0, "Read the short summaries of `memcheck`, `racecheck`, and `synccheck`, then match three classic bugs—an out-of-bounds index, a shared-memory data race, and a mismatched barrier—to the tool you’d run first."),
      assigned(1, "Inspect the tiled transpose kernel and mark which values threads exchange through shared memory and where `__syncthreads()` is required.")),

    "2/0": plan(
      assigned(0, "Read how the 8 × 8 handwritten digit images were built, noting what each pixel measures and its numeric range. You’ll flatten those 64 pixels into a single matrix row."),
      numerical("digit-retrieval", "Numeric workbench · Digit retrieval", "Review how the lab selects the highest-scoring gallery image, and make sure you can explain why checking raw dot-product scores tests something stricter than checking top-1 predicted digit labels.")),
    "2/1": plan(
      reading("https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/3484e876d81aba07911a1109f5b5e81e_MIT6_006F11_lec21.pdf#page=2", "MIT 6.006 · Parenthesization, page 2", "Look at the three rectangular matrices in Figure 1. Write out the intermediate dimensions and total scalar multiplications for `(AB)C`, then repeat for `A(BC)`, and stop once you can compare the two totals."),
      numerical("matrix-chain", "Numeric workbench · Two matrix-chain shapes", "Compare the table’s intermediate matrix sizes with your own hand calculations, and note which chain shape makes a FLOP win hardest to spot in raw milliseconds.")),
    "2/2": plan(
      assigned(0, "Find the shared-memory tiled matrix multiplication example. Pick a single element loaded from `A` and trace how many output threads reuse it before the next tile overwrites shared memory."),
      assigned(2, "In Chapter 7, revisit tiling and shared-memory bank conflicts, then decide which of those two effects your lab experiment actually measured.", "Fregly · Chapter 7, tile reuse")),
    "2/3": plan(
      assigned(0, "Read the abstract and first Roofline plot in the report. Note arithmetic intensity on the horizontal axis and throughput on the vertical axis, and predict which direction higher per-thread register reuse shifts a kernel."),
      assigned(1, "Read the profiler’s Roofline chart explanation, then use where your kernel lands on the plot to pick one memory or compute counter worth inspecting next.")),
    "2/4": plan(
      numerical("timing", "Numeric workbench · The measurement contract", "Check exactly what the native lab puts between its start and stop CUDA events. Before comparing any two benchmark rows, list their shared matrix shape, precision policy, and accuracy check."),
      assigned(0, "Look up `cublasGemmEx` and its `computeType` parameter so you know the exact arithmetic policy behind the cuBLAS benchmark row you reported.")),

    "3/0": plan(
      reading("https://docs.nvidia.com/cuda/cusparse/index.html#compressed-sparse-row-csr", "NVIDIA cuSPARSE · Compressed sparse row storage", "Use the CSR diagram to locate one row’s start and end pointers in `row_offsets`, read just the column indices between them, and check what `offsets[r + 1] - offsets[r]` equals for an empty row."),
      assigned(0, "Skim the abstract for how the karate-club social graph was collected, then trace how one friendship edge turns into entries in your adjacency matrix.")),
    "3/1": plan(
      assigned(1, "Find the scalar-CSR and vector-CSR kernels in the paper. In each one, trace how many threads work on a single row and how they split up a long row—you’ll use that to predict performance on skewed matrices."),
      assigned(0, "Check the matrix’s dimensions, stored nonzero count, and symmetry flag on its collection page, and compare those numbers with the full symmetric matrix your program actually multiplies.")),
    "3/2": plan(
      assigned(0, "Read the inclusive vs. exclusive scan examples and the stream-compaction walkthrough. Take three keep flags on scratch paper and trace where each kept element writes using the exclusive scan.")),
    "3/3": plan(
      numerical("ink-reduction", "Numeric workbench · Count real ink", "Read what the pixel values represent and how the naive atomic baseline sums them. Decide which partial sums threads can combine locally before touching the global total."),
      assigned(1, "Find the intra-block reduction step in Mark Harris’s slides and compare its memory traffic with the variant you benchmarked.")),
    "3/4": plan(
      numerical("sparse-matrix", "Numeric workbench · Sparse workloads", "Review the two sparse matrices and thread-mapping layouts in the lab. Separate one-time setup costs from per-multiply costs so you can calculate how many multiplies it takes for a setup-heavy format to pay off."),
      assigned(2, "Use the paper’s CSR performance discussion to explain one row-length distribution where your tested thread mapping struggled.")),

    "4/0": plan(
      swarm("baseline", "Swarm manual · Establish a baseline", "Read how every pixel tests every worm segment in the brute-force renderer. Identify the two counts that multiply together to give total candidate pairs, and predict what happens when you double just one of them."),
      assigned(1, "Read the opening section separating broad-phase and narrow-phase collision tests, and map those two roles onto the cheap and expensive checks in our renderer.")),
    "4/1": plan(
      swarm("conservative-cull", "Swarm manual · A safe bounding box", "Read the bounding-box section, then sketch a horizontal segment with semicircular endcaps. Mark a pixel past the right endpoint that still lies inside the cap—how far past the endpoint must the bounding box extend?"),
      assigned(1, "Read the floating-point rounding notes to understand why a pixel sitting right on a capsule’s edge can flip if distances are rounded slightly differently.")),
    "4/2": plan(
      assigned(0, "Read the broad/narrow phase overview and the spatial-subdivision example. Note the asymmetry: a slightly loose bounding box only adds extra work, whereas a box that rejects a real hit corrupts the image."),
      swarm("shared-tile", "Swarm manual · Shared candidates", "Trace a segment ID from the moment a tile adds it to shared memory until the last pixel finishes testing it, and match each transition to the `__syncthreads()` barriers in your kernel.")),
    "4/lighting": plan(
      assigned(0, "Look at the first BVH diagram, trace a primary ray that misses a parent box, and list the child tests it skips. Now trace a reflection ray bouncing off a wet floor in a new direction—which box checks have to run fresh?"),
      assigned(1, "Look at how surface roughness widens reflected light, and connect that to how clearly the neon lettering appears in the puddle.")),
    "4/3": plan(
      assigned(0, "Read the opening comparison of brute force vs. spatial subdivision, then sketch a worst-case scene where every object piles into the same region. Estimate what fraction of candidates survive culling."),
      swarm("worst-case", "Swarm manual · An unfavorable scene", "Compare the manual’s hostile layouts with the one you built, and note which scene variable your first benchmark accidentally held constant.")),
    "4/creature": plan(
      assigned(0, "Look at the parent and child boxes in the first figure and write down the guarantee every parent box must satisfy about its children. What breaks if you keep using an old parent box after the worms move?")),
    "4/4": plan(
      numerical("timing", "Numeric workbench · Draw a timing boundary", "Read the timing section as a model for stating exactly what a stopwatch includes. Draw two separate timelines: one for the GPU render kernel alone, and one for the full end-to-end frame time a user waits for."),
      assigned(0, "Find the CUDA timeline view in the profiler guide and spot where memory copies or host waits can stretch total frame time well beyond kernel time.")),

    "5/0": plan(
      assigned(0, "Find the Jacobi solver section in GPU Gems Chapter 38. Circle the four neighbor pressures used to update one cell, and sketch how data flows from the old grid into the new grid."),
      flow("stencil-trace", "Ink Tunnel · Trace the stencil by hand", "Walk through the small stencil example in the manual to see how many cells a single pressure impulse travels in one Jacobi sweep.")),
    "5/1": plan(
      flow("fused-sweeps", "Ink Tunnel · Reuse a stencil across sweeps", "Read how two back-to-back pressure sweeps work, then trace one tile-edge output backward through both sweeps to count how wide the input halo must be."),
      assigned(1, "Look up the shared-memory and global-memory profiler metrics, and pick the specific counter that would confirm whether your shared-memory change actually cut global reads.")),
    "5/2": plan(
      assigned(0, "Find where the paper defines the residual `r = b − Ax` in the steepest-descent section. Explain what `r = 0` means for a candidate solution `x`, and why tiny changes between iterations don’t guarantee a tiny residual."),
      numerical("pressure-target", "Numeric workbench · Stop at a physical target", "Use the pressure worksheet to compare two iterative solvers stopped at the exact same residual threshold.")),
    "5/3": plan(
      assigned(0, "Find the pressure-projection step in Chapter 38 and trace its three stages: compute velocity divergence, solve for pressure, and subtract the pressure gradient. Decide which field you should recompute afterward to check that projection worked.")),
    "5/4": {before:[
      flow("vortex-refinement", "Ink Tunnel · Vortex refinement", "Read how the grid-refinement test compares coarse and fine grids at the same physical time. Identify the analytic solution you’re comparing against and the discretization error that refining the grid should shrink."),
      assigned(1, "Read the first paragraph under “The result.” Note the spatial dimension and the external forcing term used in the paper so you can compare them directly against your 2D unforced vortex run.")
    ], after:[]},

    "6/0": plan(
      assigned(0, "Open the PDF to Figure 2 and the distance-constraint example beside it. Sketch which way two stretched endpoints move, then redraw the arrows when one endpoint is pinned in place.")),
    "6/1": plan(
      assigned(0, "Read the constraint-projection loop and trace two adjacent constraints sharing one particle. Pinpoint the exact step where the second constraint could read a position already overwritten by the first."),
      assigned(1, "Check what kinds of memory `racecheck` monitors before running it, and separate which of your writes touch shared memory vs. global memory.")),
    "6/2": plan(
      knit("local-gather", "Knit manual · Gather from incident edges", "Compare scanning every edge in the mesh against having each vertex gather only from its attached edges. Sketch an interior vertex and a corner vertex to see which neighbor slots drop out at the boundary."),
      assigned(1, "Revisit the CSR sparse-row examples and compare how a row’s column-index list mirrors a vertex’s incident-edge list.")),
    "6/3": plan(
      knit("tear-strain", "Knit manual · The tensile tear rule", "Check the exact strain formula in the tearing exercise, then predict how a stretched edge and a compressed edge of the same fabric behave at the tensile tear threshold."),
      assigned(0, "Compare the intact distance constraint in Figure 2 with what happens in your simulation once an edge exceeds the fracture threshold and breaks.")),
    "6/textile": plan(
      reading("labs/nightshift/manual.html#textile", "Selvedge field manual · Pull and rotate", "Read how to grab and pull the fabric and inspect the tear after orbiting the camera. Design a quick check that proves the tear is anchored to the fabric rather than stuck to the screen."),
      assigned(0, "Read the knitting paper’s abstract and separate what creates yarn-level visual detail from the interactive tearing mechanics in our lab.")),
    "6/4": plan(
      knit("physical-error", "Knit manual · Speed and physical error", "Review the accuracy metrics and test controls, then choose one matched test setup and one position or strain error metric that would catch a faster solver behaving like a stretchier fabric."),
      assigned(0, "Revisit how constraint stiffness depends on iteration count, and connect your sweep count directly to how stiff or stretchy your cloth swatch behaved.")),

    "7/0": plan(
      assigned(1, "Look at the Roofline plot in the report and note which ceiling caps a kernel that does very few FLOPs per byte. List which benchmark numbers from your own GPU go on the horizontal and vertical axes."),
      assigned(2, "Find the Roofline chart in the Nsight Compute guide and identify what profiler evidence confirms a kernel is memory-bandwidth bound.")),
    "7/1": plan(
      assigned(1, "Read the dot-product notes on rounding, fused multiply-add (FMA), and summation order, and spot where two algebraically identical formulas can return different floats."),
      assigned(2, "In Chapter 9, read the reduced-precision section, then use your smallest top-1 vs. runner-up score margin to state how much numerical error your digit retriever can safely tolerate.", "Fregly · Chapter 9, reduced precision")),
    "7/2": plan(
      reading("https://raw.githubusercontent.com/NVIDIA/cutlass/v4.2.1/examples/79_blackwell_geforce_gemm/79b_blackwell_geforce_nvfp4_nvfp4_gemm.cu", "NVIDIA CUTLASS 79b · Read the example source", "Read the top header comment, then search for `ElementA` and `ElementAccumulator`. Identify the input data types, block scale factors, and accumulator type before looking at any performance numbers."),
      reading("labs/blackwell/README.html#reconstruction", "Blackwell lab · Reconstruction error", "Connect one block scale factor in the CUTLASS example to the reconstruction error you measured when dequantizing a group of values.")),
    "7/3": plan(
      reading("labs/pipeline/README.html#slot-lifetime", "Pipeline manual · Follow one buffer slot", "Read the buffer-slot lifecycle walkthrough and trace the host copy, GPU transfer, and kernel compute using one slot. Pinpoint the very last step that must finish before that slot can be reused."),
      assigned(1, "Find the CUDA timeline view in the Nsight Systems guide and see what genuine copy/compute overlap looks like for two consecutive chunks.")),
    "7/4": plan(
      numerical("digit-retrieval", "Numeric workbench · Compare two precision policies", "Review which numerical error checks and label-agreement checks the digit experiment logs. Decide what proof a strict numerical client vs. a top-1 label client each needs before adopting a faster precision mode."),
      assigned(1, "Check `cublasGemmEx` and its `computeType` argument so you can tie the exact flag in your code to the precision policy you recommend.")),

    "8/soundstage": plan(
      assigned(0, "Find the ray-traversal loop that shrinks `tMax` whenever it finds a closer hit. Sketch two child bounding boxes and explain exactly when checking the nearer child first lets you skip the farther one."),
      assigned(1, "Look up glTF’s metallic-roughness material parameters and name one material setting you must keep identical when comparing two geometry-traversal kernels.")),
    "8/0": plan(
      best("assess-parallelize-optimize-deploy", "NVIDIA Best Practices · Assess the workload", "Read the Assess stage of NVIDIA’s APOD workflow, then write down who your capstone serves, what input they run, and what unit of speedup they would actually care about."),
      assigned(1, "Open one baseline/optimized pair in the book’s companion repo and check which input parameters stay locked across both versions.")),
    "8/1": plan(
      best("reference-comparison", "NVIDIA Best Practices · Reference comparison", "Read how a trusted reference output verifies an optimization. Pick an input small enough to check by hand, and name one specific bug your test must be able to catch."),
      assigned(0, "Look up the Compute Sanitizer tool that fits your kernel, and note one bug class it catches automatically plus one silent numerical mistake that still requires your own reference check.")),
    "8/2": plan(
      assigned(0, "Read the Nsight Compute section on metric collection and kernel replay. Pick one hardware metric to test your bottleneck hypothesis, and keep a separate unprofiled run for the timing numbers you report."),
      assigned(1, "Open the Nsight Systems CPU/GPU timeline guide and use it to verify whether speeding up your target kernel will meaningfully cut total end-to-end runtime.")),
    "8/3": plan(
      best("effective-bandwidth-calculation", "NVIDIA Best Practices · Effective bandwidth", "Read how effective bandwidth pairs bytes moved with elapsed time. Apply that same discipline to your capstone by choosing one concrete work counter and a test case where that counter should change without breaking correctness."),
      assigned(1, "Revisit the profiler metric you tracked earlier and write down which way you expect it to move on your held-out input before running it.")),
    "8/4": plan(
      numerical("benchmark-diary", "Numeric workbench · Benchmark diary", "Read the reporting checklist and sketch a clean summary table for your final report showing the input, your code change, the exact timing scope, and the correctness check."),
      assigned(0, "Check a comparable benchmark in the book’s companion repo and list the exact command and input details a stranger would need to reproduce your results."))
  };
})();
