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
      assigned(0, "Start at the first user-defined function example. The program starts in `main`. Trace where the call takes you and which line runs when you come back. Stop when you can predict the order of the printed messages.", "LearnCpp 2.1 · Calling a function"),
      reading("https://www.learncpp.com/cpp-tutorial/function-return-values-value-returning-functions/", "LearnCpp 2.2 · Returning a value", "Jump to “Return values” and read the `returnFive()` example. Why does one call print 7, while the call on a line by itself prints nothing? Stop there. In the lab, `fps` will return a number and the test will print it.")
    ], after:[
      reading("https://learn.microsoft.com/en-us/cpp/ide/walkthrough-building-a-project-cpp?view=msvc-170", "Microsoft Learn · Compare two compiler messages", "Read steps 1–3 under “To fix compilation errors.” Compare the missing punctuation and the closing brace in Microsoft’s message with the one you saved. You can do this comparison on the page using the program you already built.")
    ]},
    "0/1": {bridge:{
      title:"Trace three frame times",
      context:"In Session 1, `fps` received one measurement. Here a vector stores three measurements in order. Read `std::vector<int>` as “a list of whole numbers from the C++ standard library.” The braces after `frames =` give its starting values.",
      code:"std::vector<int> frames = {12, 19, 16};\nfor (int ms : frames) {\n    if (ms > 16) {\n        std::cout << ms << ' ';\n    }\n}",
      walk:"Read `for (int ms : frames)` as “for each whole number ms in frames.” On the first pass, `ms` is 12. The comparison `12 > 16` is false, so execution skips the print line and moves to the next frame. When the comparison is true, `std::cout << ms << ' '` prints the number and a space.",
      question:"Finish the trace. What value does `ms` hold on the second pass? Which numbers appear on screen? If the comparison changes to `>=` (greater than or equal), which extra value appears?",
      answer:"The second pass uses 19, so it prints 19. The third uses 16, which is exactly the budget and fails the strict test. With `>=`, the output is 19 followed by 16. In the lab you’ll decide what to remember as the loop runs.",
      support:reading("https://www.learncpp.com/cpp-tutorial/introduction-to-stdvector-and-list-constructors/", "LearnCpp 16.2 · How the list gets its values", "If the declaration is unfamiliar, find “Initializing a std::vector with a list of values.” Look at the four integers in the primes example. Stop when you can point to its name, the element type and the initial values.")
    },before:[
      reading("https://www.learncpp.com/cpp-tutorial/introduction-to-if-statements/", "LearnCpp 4.10 · Decide whether a line runs", "Find “A sample program using an if statement.” The input line stores a number in x. Follow only the test and the print that follows it for inputs 0 and 5. Stop before “If-else.”"),
      assigned(0, "Use Ctrl+F to find `for (int num : fibonacci)`. Start at that example, below the opening indexed loop. The book writes `std::vector fibonacci` because C++ can infer the element type from its initial numbers. Trace the first two values of num and stop at “Key insight.” The rest of the chapter is optional.", "LearnCpp 16.8 · Visit each value in a list")
    ], after:[]},
    "0/2": {bridge:{
      title:"Choose a position in yesterday’s trace",
      context:"Yesterday the loop gave you the next value each time. A matrix calculation needs to choose a particular value. An index is its position, counting from zero.",
      code:"std::vector<int> frames = {12, 19, 16};\nint pos = 1;\nint chosen = frames.at(pos);\n++pos;",
      walk:"The positions are 0, 1 and 2. The third line reads position 1 and stores a copy in chosen. The last line moves pos forward by one. For a valid position, the book’s `frames[pos]` reads the same value as the starter’s `frames.at(pos)`. The latter also checks the bounds.",
      question:"After the last line, what are chosen and pos? Which value would a fresh call to frames.at(pos) give you?",
      answer:"chosen still holds 19, pos is 2, and a new read gives 16. Updating a position changes which slot you will read next. It leaves the earlier copy alone."
    },before:[
      assigned(0, "Find “Accessing array elements using the subscript operator.” Write the positions under the five primes in the sum example and predict `primes[2]`. Stop after checking that example.", "LearnCpp 16.2 · Find a value by its position"),
      reading("https://www.learncpp.com/cpp-tutorial/for-statements/", "LearnCpp 8.10 · Follow a loop counter", "Find the first loop that prints 1 through 10. Identify the starting value, the test before each pass, and the update after each pass. Stop there. In the matrix loop, which values of `k` reach the body if `k` starts at 0 and must stay below 3?")
    ], after:[]},
    "0/3": {bridge:{
      title:"Follow one address",
      context:"Picture a named box called light holding the number 3. A pointer is a variable that can hold the address of a box.",
      code:"int light = 3;\nint* p = &light;\n*p = 8;",
      walk:"In the declaration, `int*` says p can point to an integer. In the expression `&light`, the ampersand takes the address of light. You previously saw `&` in a parameter declaration, where it made a reference to an existing object. On the last line, `*p` follows the address to the box and the assignment writes there.",
      question:"After all three lines, what would printing light show? Where would an arrow from p still end?",
      answer:"light now holds 8. The arrow from p still ends at light. The assignment changed the contents of the box at that address."
    },before:[
      assigned(0, "Use Ctrl+F to find `*ptr = 6;`. In that example, draw a box for `x` and an arrow from `ptr` to the box. After the assignment, what number is in the box and where does the arrow point? Check the printed output and stop.", "LearnCpp 12.7 · Change a value through its address"),
      reading("https://learn.microsoft.com/en-us/cpp/standard-library/vector-class?view=msvc-170#data", "Microsoft Learn · Where a vector’s data begins", "In the data member’s example, find `c1_ptr = c1.data()` and the write on the next line. Which of the vector’s two values changes? Stop after comparing the two output lines. In the lab, which argument tells the function how many values it may change?")
    ], after:[
      reading("https://www.learncpp.com/cpp-tutorial/pointer-arithmetic-and-subscripting/", "LearnCpp 17.9 · Start partway through a buffer", "Find the example where `ptr` moves to `&arr[3]`. Identify the array position reached by `ptr[1]` before and after that move. Stop after the example and use the same reasoning on the extra buffer checks.")
    ]},
    "0/4": {bridge:{
      title:"Follow a counter that starts over",
      context:"Read the outer loop as two blocks numbered 0 and 1. In each block, the inner loop counts two local workers. The print line shows the block number followed by the local worker number.",
      code:"for (int block = 0; block < 2; ++block) {\n    for (int local = 0; local < 2; ++local) {\n        std::cout << block << ',' << local << '\\n';\n    }\n}",
      walk:"The first printed pair is 0,0. Finish the inner loop for that block before you advance the outer counter.",
      question:"Write the next three pairs. Which line makes the local numbers start at zero again?",
      answer:"The next pairs are 0,1 then 1,0 then 1,1. Each time execution reaches the inner loop from the outer body, `int local = 0` runs again. This serial trace lists the workers. A GPU can schedule those workers in a different order."
    },before:[
        assigned(0, "Find “Nested for-loops” and the example that prints a letter followed by three numbers. Here `char` holds one letter, and `++c` advances it to the next letter. Write the first two lines of output. Which counter starts over when the letter changes? Stop after that example.", "LearnCpp 8.10 · Trace a loop inside another loop")
    ], after:[
        reading("https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/intro-to-cuda-cpp.html", "NVIDIA · Read another GPU launch", "After step 3, jump to “Triple Chevron Notation” and find `vecAdd<<<1, 256>>>`. Locate the two numbers you saw in the native launch. Which number would you change to launch another block of the same width? Stop after the paragraph explaining those two numbers."),
      reading("https://www.learncpp.com/cpp-tutorial/arithmetic-operators/", "LearnCpp 6.2 · How many blocks does the array need?", "Read “Integer and floating point division.” In the simulator, `visits` has five slots, numbered 0 through 4. Each worker can visit one slot. Workers start in groups of four called blocks. Try `5 / 4` and `(5 + 4 - 1) / 4` as two ways of setting `blocks` before the loops start. Which calculation starts enough workers to visit `visits[4]`?")
    ]},

    "1/0": plan(
      assigned(0, "Find the indexing example using blockIdx.x, blockDim.x, and threadIdx.x. Identify which number changes between neighboring threads and which advances only at a block boundary."),
      assigned(2, "In Chapter 6 of Fregly’s book, revisit how threads are grouped into warps and blocks. Sketch the launch shape you actually tested.", "Fregly · Chapter 6, GPU thread organization")),
    "1/1": plan(
      assigned(0, "Compare the consecutive and misaligned address diagrams. Draw the boundaries of a 32-byte memory segment and locate a four-byte load on each side. You will use this picture to count how many segments a warp touches."),
      assigned(1, "Chapter 7 opens with coalescing. Compare your measured access pattern to the two arrangements described there.", "Fregly · Chapter 7, global memory access")),
    "1/2": plan(
      best("timing", "NVIDIA Best Practices · CPU and GPU timing", "Read the two timing approaches. Mark what the CPU timer waits for and which operations lie between the two GPU events. Decide which interval could include transferring a finished frame to the host."),
      assigned(0, "Look up cudaEventElapsedTime. Check the time unit before converting a duration to FPS.")),
    "1/3": plan(
      assigned(0, "Read the introductory reduction diagrams. Draw a tree with eight leaves and label which pairs combine at each level. Compare the number of additions with the number of dependent rounds."),
      assigned(1, "Find the examples on rounding and operation order. Explain why summing floating-point leaves with a different tree can change the last digits.")),
    "1/4": plan(
      assigned(0, "Read the tool descriptions for memcheck, racecheck and synccheck. Match an out-of-bounds index, an unsafe shared-memory access and an invalid barrier to the tool you would try first."),
      assigned(1, "Inspect the tiled transpose kernel. Mark which data each thread shares with neighbors and where the block must wait.")),

    "2/0": plan(
      assigned(0, "Read how the digit images were constructed. Identify what one 8 × 8 cell measures and the allowed range of its value. You will turn the 64 cells into one row of a matrix."),
      numerical("digit-retrieval", "Numeric workbench · Digit retrieval", "Revisit how the lab chooses the highest-scoring gallery image. Explain why an individual score and a correct predicted label answer different questions.")),
    "2/1": plan(
      reading("https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/3484e876d81aba07911a1109f5b5e81e_MIT6_006F11_lec21.pdf#page=2", "MIT 6.006 · Parenthesization, page 2", "Use the three rectangular matrices in Figure 1. Write the dimensions produced by (AB) before counting its scalar multiplications. Repeat with (BC). Stop once you can compare the two orders."),
      numerical("matrix-chain", "Numeric workbench · Two matrix-chain shapes", "Compare the table’s temporary sizes with your own. Which shape makes a FLOP advantage hardest to see in milliseconds?")),
    "2/2": plan(
      assigned(0, "Find the matrix multiplication that loads a tile into shared memory. Pick one loaded entry of A and trace how more than one output thread can use it before the tile is replaced."),
      assigned(2, "In Chapter 7, revisit the sections about tiling and shared-memory bank conflicts. Which effect did your experiment actually measure?", "Fregly · Chapter 7, tile reuse")),
    "2/3": plan(
      assigned(0, "Read the abstract and the first Roofline diagram in the report. Locate work per byte on the horizontal axis and throughput on the vertical axis. Predict which direction more per-thread data reuse could move a point."),
      assigned(1, "Find the Roofline chart explanation. Use your kernel’s position to choose one memory or execution measurement worth inspecting.")),
    "2/4": plan(
      numerical("timing", "Numeric workbench · The measurement contract", "Read which work the native lab includes between its CUDA events. Before comparing two rows, write down the common shape, precision and accuracy check."),
      assigned(0, "Look up cublasGemmEx and find its compute-type argument. Identify the policy behind the cuBLAS row you reported.")),

    "3/0": plan(
      reading("https://docs.nvidia.com/cuda/cusparse/index.html#compressed-sparse-row-csr", "NVIDIA cuSPARSE · Compressed sparse row storage", "Use the CSR example to find one row’s start and end offsets. Read only the column indices between them. Predict the offset difference for an empty row."),
      assigned(0, "Read the abstract for the origin of the karate-club ties. Connect one graph edge to the adjacency entries used in your calculation.")),
    "3/1": plan(
      assigned(1, "Open the paper and find its scalar and vector CSR kernels. In each, trace who owns a row and how many workers can help with a long row. Carry those two mappings into your prediction."),
      assigned(0, "Read the matrix dimensions, nonzero count and symmetry on the collection record. Compare these with the expanded matrix your program actually visits.")),
    "3/2": plan(
      assigned(0, "Start with the inclusive and exclusive scan examples and the stream-compaction application. For three flags, work out where each surviving item writes using the exclusive result.")),
    "3/3": plan(
      numerical("ink-reduction", "Numeric workbench · Count real ink", "Read the description of the values being counted and the baseline atomic update. Decide which intermediate sums two workers could combine before either updates the shared total."),
      assigned(1, "Find the step in Harris’s reduction that combines values inside one block. Compare its data movement with the variant you timed.")),
    "3/4": plan(
      numerical("sparse-matrix", "Numeric workbench · Sparse workloads", "Review the two supplied matrices and the worker mappings. List which costs recur on every multiply and which could be paid once. Your crossover depends on how often the multiply runs."),
      assigned(2, "Use the paper’s CSR discussion to interpret one row distribution where your tested mapping struggled.")),

    "4/0": plan(
      swarm("baseline", "Swarm manual · Establish a baseline", "Start with the description of pixels testing worm segments. Choose two counts that control the number of candidate pairs. Predict what happens when you double only one count."),
      assigned(1, "Read the opening distinction between broad and narrow collision phases. Identify the analogous cheap and expensive tests in the renderer.")),
    "4/1": plan(
      swarm("conservative-cull", "Swarm manual · A safe bounding box", "Read the bounding box paragraph. Draw a horizontal segment with a round cap on each end. Mark a pixel beyond the right endpoint that still touches the cap. How far beyond that endpoint must the box extend?"),
      assigned(1, "Read the explanation of floating-point rounding. Use it to interpret a pixel whose distance lies close to the coverage threshold.")),
    "4/2": plan(
      assigned(0, "Read the opening explanation of broad and narrow phases, then the spatial-subdivision example. Explain why a loose bound may admit extra work, and why rejecting a real hit would change the image."),
      swarm("shared-tile", "Swarm manual · Shared candidates", "Trace the lifetime of a segment ID in the tile’s list and compare it with the barriers in your edited kernel.")),
    "4/lighting": plan(
      assigned(0, "Study the first hierarchy drawing. Follow one ray that misses a parent box and list the child tests it can skip. Now imagine a reflected ray leaving the floor in another direction. Which decisions must you make again?"),
      assigned(1, "Examine how roughness changes the spread of reflected light. Relate it to the lettering you could see in the puddle.")),
    "4/3": plan(
      assigned(0, "Read the opening comparison of brute force and spatial subdivision. Sketch the case where all objects share the same region. Estimate how many candidates survive the cheap test."),
      swarm("worst-case", "Swarm manual · An unfavorable scene", "Compare the suggested distributions with your own. Identify a scene property that your first benchmark kept constant.")),
    "4/creature": plan(
      assigned(0, "Look at the parent and child boxes in the first figure. Identify the promise a parent box must keep about every point in its children. What would go wrong if you reused that box after the worms moved?")),
    "4/4": plan(
      numerical("timing", "Numeric workbench · Draw a timing boundary", "Read the measurement contract as an example of how to name what is inside an interval. Draw separate boundaries for the GPU render and the time a person waits for an entire frame."),
      assigned(0, "Find the CUDA timeline view in the guide. Locate where copies or waiting could make a whole frame take longer than a kernel.")),

    "5/0": plan(
      assigned(0, "Find the Jacobi iteration in GPU Gems Chapter 38. Circle the four pressure neighbors used to update one cell. Sketch what is read from the old grid and what is written to the new one."),
      flow("stencil-trace", "Ink Tunnel · Trace the stencil by hand", "Use the tiny stencil in the manual to check how far information can travel after one sweep.")),
    "5/1": plan(
      flow("fused-sweeps", "Ink Tunnel · Reuse a stencil across sweeps", "Read the description of the two pressure updates. Trace one output backwards through both. Count how far its input neighborhood extends beyond the output tile."),
      assigned(1, "Find the shared-memory and global-memory measurements. Decide which one could confirm your proposed source of savings.")),
    "5/2": plan(
      assigned(0, "Find the introduction of the residual r = b − Ax in the steepest-descent discussion. For a proposed solution x, say what a zero residual means. Compare that condition with merely having small changes between iterations."),
      numerical("pressure-target", "Numeric workbench · Stop at a physical target", "Use the pressure worksheet to compare two methods at the same residual threshold.")),
    "5/3": plan(
      assigned(0, "Find the pressure projection in Chapter 38. Follow its sequence of divergence, pressure solve and pressure-gradient subtraction. Describe which quantity you would recompute afterward to judge the correction.")),
    "5/4": {before:[
      flow("vortex-refinement", "Ink Tunnel · Vortex refinement", "Read how the refinement experiment compares two grids at the same physical time. Name the known quantity you will compare to and the error that refining the grid is meant to reduce."),
      assigned(1, "Read the first paragraph under “The result.” Write down the role of the external force and the dimension of the flow. Keep those two conditions beside your 2D vortex result for the final comparison.")
    ], after:[]},

    "6/0": plan(
      assigned(0, "In the PDF, find Figure 2 and the distance-constraint example beside it. Draw where two stretched endpoints should move. Predict how that drawing changes when one endpoint is pinned.")),
    "6/1": plan(
      assigned(0, "Read the constraint-projection algorithm and trace two constraints that share a particle. Locate the moment one correction could observe a position changed by the other."),
      assigned(1, "Look up racecheck’s scope. Before using its result, identify which of your proposed writes live in shared memory and which live in global memory.")),
    "6/2": plan(
      knit("local-gather", "Knit manual · Gather from incident edges", "Compare a vertex scanning every edge with a vertex following only the edges attached to it. Sketch one interior vertex and one corner. Which neighbor slots cease to exist at the corner?"),
      assigned(1, "Return to the sparse row examples. Compare the purpose of a row’s column indices with the purpose of a vertex’s incident-edge list.")),
    "6/3": plan(
      knit("tear-strain", "Knit manual · The tensile tear rule", "Find the definition of strain in the tearing exercise. Predict how a stretched and a compressed link of the same material should behave at the tensile threshold."),
      assigned(0, "Compare the standard distance constraint in Figure 2 with the additional event in your run when the link breaks.")),
    "6/textile": plan(
      reading("labs/nightshift/manual.html#textile", "Selvedge field manual · Pull and rotate", "Read how the pull is selected and how to inspect the damage after rotating the view. Name a test that can distinguish a tear fixed to the fabric from one fixed to the screen."),
      assigned(0, "Read the knitting paper’s abstract. Identify which details give yarn its appearance and which behavior in your exercise belongs to the interaction model.")),
    "6/4": plan(
      knit("physical-error", "Knit manual · Speed and physical error", "Review the quality measurements and controls. Pick one matched condition and one error or strain measurement that would expose a faster but visibly different material."),
      assigned(0, "Revisit how stiffness and repeated constraint updates interact. Relate the number of sweeps to what you observed on the swatch.")),

    "7/0": plan(
      assigned(1, "Study the Roofline plot in the report. Identify which ceiling limits an operation that does little arithmetic per byte. Write down which measurements from your own GPU belong on the plot’s axes."),
      assigned(2, "Find the Roofline chart in the profiler guide. Identify what evidence would support calling your kernel bandwidth-limited.")),
    "7/1": plan(
      assigned(1, "Read the dot-product examples on rounding, fused multiply-add and summation order. Locate a place where two mathematically equivalent computations can return different values."),
      assigned(2, "In Chapter 9, find the discussion of reduced precision. Use your smallest winning score margin to describe the error your own application can tolerate.", "Fregly · Chapter 9, reduced precision")),
    "7/2": plan(
      reading("https://raw.githubusercontent.com/NVIDIA/cutlass/v4.2.1/examples/79_blackwell_geforce_gemm/79b_blackwell_geforce_nvfp4_nvfp4_gemm.cu", "NVIDIA CUTLASS 79b · Read the example source", "Read the introductory comment, then search for ElementA and ElementAccumulator. Locate the input representations, scale factors and accumulator type before considering any timing result."),
      reading("labs/blackwell/README.html#reconstruction", "Blackwell lab · Reconstruction error", "Relate one quantization scale in the source to the measured error when the lab reconstructs a block of values.")),
    "7/3": plan(
      reading("labs/pipeline/README.html#slot-lifetime", "Pipeline manual · Follow one buffer slot", "Read the slot-lifetime walkthrough. Mark the host copy, GPU copy and kernel work that use one slot. Identify the last operation that must finish before that slot can be reused."),
      assigned(1, "Find the CUDA timeline in the profiler guide. Decide what actual overlap would look like for two adjacent chunks.")),
    "7/4": plan(
      numerical("digit-retrieval", "Numeric workbench · Compare two precision policies", "Read which score and label checks the digit experiment records. Decide which measurements a strict numerical client and a nearest-label client each need before accepting the faster path."),
      assigned(1, "Find cublasGemmEx and its compute-type argument. Connect your recorded argument to the precision policy you approve.")),

    "8/soundstage": plan(
      assigned(0, "Find the ray traversal that shortens tMax when it finds a closer primitive. Draw two child boxes and explain exactly when visiting the near child first lets you skip the far one."),
      assigned(1, "Find glTF’s metallic-roughness material description. Name a material setting you would hold fixed across two geometry traversal measurements.")),
    "8/0": plan(
      best("assess-parallelize-optimize-deploy", "NVIDIA Best Practices · Assess the workload", "Read the assessment stage of NVIDIA’s optimization cycle. Write down who needs your result, the input they use, and the unit in which they would notice an improvement."),
      assigned(1, "Inspect one baseline/optimized pair in the book companion. Identify which inputs the two versions share.")),
    "8/1": plan(
      best("reference-comparison", "NVIDIA Best Practices · Reference comparison", "Read how a known-good result can be used to test a change. Choose an input small enough to check independently, then name a mistake your comparison must catch."),
      assigned(0, "Look up the sanitizer relevant to your code. List one class of error it can detect alongside one numerical mistake that needs your own oracle.")),
    "8/2": plan(
      assigned(0, "Find the section on metric collection and replay. Decide which metric tests your bottleneck hypothesis and which unprofiled run will supply the timing you report."),
      assigned(1, "Find the CPU/GPU timeline view. Use it to check whether optimizing the kernel could change the total time for this workload.")),
    "8/3": plan(
      best("effective-bandwidth-calculation", "NVIDIA Best Practices · Effective bandwidth", "Read how bytes and time define an effective rate. Apply that habit to your capstone. Choose a quantity of work to count and a case in which the count should change under the same correctness test."),
      assigned(1, "Return to the profiler metric you used. Predict its direction on the held-out input before you inspect the result.")),
    "8/4": plan(
      numerical("benchmark-diary", "Numeric workbench · Benchmark diary", "Read the short reporting checklist. Sketch a table for the final report that will let a reader identify the input, your change, the timing boundary and the correctness evidence."),
      assigned(0, "Inspect a comparable example in the book’s companion repository. Identify which command and input details a stranger would need to rerun yours."))
  };
})();
