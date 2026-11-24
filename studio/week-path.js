"use strict";

// Indexed like the course map. Week 0 is the C++ on-ramp.
window.WEEK_PATH = [
  {
    bring: "Open Course PowerShell with your text editor beside it. The starter project already compiles—run it once and note both FPS numbers before changing a single line.",
    finish: "Rebuild a modified C++ function, write a test that catches a broken output, and trace which worker handles the last element of a partially filled block.",
    reuse: "In Week 1, you will turn that worker index and bounds check into a CUDA kernel and verify its results after copying them back from the GPU."
  },
  {
    bring: "Keep your Week 0 grid sketch and last-element check nearby, and remember where a function writes its output when it takes a pointer.",
    finish: "Find the first wrong destination index in the starter CPU transpose, pass all five repaired matrix shapes, and log a baseline timing with your GPU model, input size, and timing boundaries.",
    reuse: "You will use those same edge-case checks and timing habits in Week 2 when a matrix doesn't fill its last tile."
  },
  {
    bring: "Keep your row-major matrix sketch and Week 1 timing record handy. You will want to trace which memory addresses adjacent threads read.",
    finish: "Find an input where changing matrix multiplication order cuts multiplications, pass two ragged shapes in tiled GEMM, and record precision, median runtime, and error for a fair comparison.",
    reuse: "In Week 3, you will see what changes when most matrix entries are zero and each row's nonzeros jump to scattered columns."
  },
  {
    bring: "Keep your dense matrix product in mind as a reference: for a sparse row, you multiply each stored nonzero value by the vector entry at its column index and sum the results.",
    finish: "Reconstruct a graph row from its CSR offsets, verify its matrix-vector product, and compare two thread-to-row assignments on the club graph and roof matrix. Work through the checkpoint's setup-cost crossover, then explain what your real kernel timings can and cannot prove when both mappings share one setup.",
    reuse: "Bring that setup-cost question into Week 4, where building a list of geometry candidates also costs time before a pixel can use it."
  },
  {
    bring: "Keep your Week 1 GPU-vs-host timing diagram and your Week 3 uneven-work example handy, and picture a pixel where two sections of a worm overlap.",
    finish: "Save a verified station frame, a verified sluice frame, and your sparse/dense swarm checkpoint results. Use the Work view to show which candidate tests disappeared and your timings to show what that actually saved.",
    reuse: "Carry that fixed-input testing habit into Week 5, where a fluid frame can look smooth and plausible even when its pressure error is still too high."
  },
  {
    bring: "Recall how you checked a single matrix row in Week 3 and held geometry fixed for timings in Week 4. Before diving in, sketch an interior grid cell and its four neighbors.",
    finish: "Trace two Jacobi pressure sweeps by hand, compare solver runtimes at a fixed residual target, and verify a decaying vortex on two grids against its exact analytic formula.",
    reuse: "In Week 6, you will hold the time step and sweep count fixed while comparing cloth solvers—then vary those settings on purpose to measure how much the fabric stretches."
  },
  {
    bring: "Keep your Week 5 iteration counts and error numbers nearby. Start by sketching two cloth vertices linked by a single stitch, with one vertex pinned in place.",
    finish: "Test your cloth solver on both intact and torn meshes, checking pinned-vertex drift and which edge IDs broke. In Selvedge, pull a tear, release the mouse, and orbit the camera to prove the split stays anchored to the sleeve.",
    reuse: "Carry that same discipline into Week 7: decide upfront which output differences are acceptable before comparing faster hardware paths or lower precision."
  },
  {
    bring: "Have one GPU timing (with device and precision noted) plus an output check from the digit, pressure, or cloth lab ready—you will need both to judge whether a faster path is worth it.",
    finish: "Defend a precision choice across two matrix workloads using measured runtimes and errors. On the chunked digit pipeline, verify the final partial chunk and document exactly what your host wall-clock timer includes.",
    reuse: "Start Week 8 with the Soundstage radio: apply your acceptance rule to a ray-tracing optimization by verifying the nearest hit triangle before comparing render times."
  },
  {
    bring: "Bring your Week 7 precision decision table and one earlier lab experiment you want to push further. The opening Soundstage session gives you a worked example of checking a faster search against an independent reference.",
    finish: "Deliver a reproducible capstone with a clear acceptance rule, a verification test proven to catch a planted bug, a held-out test case, repeated before-and-after timings, and an honest limit—then revise your weakest section using the rubric.",
    reuse: "During your spaced reviews, rerun your capstone on a fresh input and try to predict when the original baseline would beat your optimization."
  }
];

// Earlier exercises that supply a concrete result for the opening of each CUDA week.
window.WEEK_RECALL = [
  [], ["0/4","0/3"], ["0/2","1/2"], ["2/0","2/4"], ["1/2","3/4"],
  ["3/0","4/4"], ["5/2","5/4"], ["2/4","6/4"], ["7/4"]
];

// Keys are the original bookmarked day IDs; links point to the corresponding tracked studio session.
window.SESSION_BRIDGES = {
  "4/2": [
    {id:"4/lighting",text:"Bring the tile bounding test you just worked on into the station scene, and freeze a shot where the sign appears both above the platform and reflected in the puddle."}
  ],
  "4/3": [
    {id:"4/creature",text:"Bring your dense-case prediction into Sluice 09 and see which five-link groups a ray can safely skip when the worms overlap."}
  ],
  "4/4": [
    {id:"4/lighting",text:"Use the station's reflected sign as a second example of why a visibility test has to handle secondary rays, not just the camera's first hit."},
    {id:"4/creature",text:"Use the Sluice 09 work counts to check whether cutting primitive tests actually predicts how much GPU time you save."}
  ],
  "6/3": [
    {id:"6/textile",text:"After logging the cloth solver's fracture history, predict what happens to a split on Selvedge's sleeve once you release the mouse and orbit the camera."}
  ],
  "6/4": [
    {id:"6/textile",text:"Contrast what the cloth solver's active-edge flags prove about a broken stitch with what Selvedge's orbit test proves about where a surface tear lives."}
  ],
  "7/4": [
    {id:"8/soundstage",text:"Bring your timing boundaries and acceptance rule into Soundstage and test whether visiting the closer bounding box first finds the exact same triangle faster."}
  ],
  "8/0": [
    {id:"8/soundstage",text:"Use the radio's nearest-hit contract as a template for specifying what must stay identical in your own matrix, sparse, fluid, or graphics capstone."}
  ],
  "8/1": [
    {id:"8/soundstage",text:"Use the radio's double-precision brute-force checker as a model when picking an independent reference for your capstone."}
  ],
  "8/4": [
    {id:"8/soundstage",text:"Look back at how the radio separates triangle-test counts from full-frame render time, then make the same distinction between work counts and wall/GPU time in your capstone report."}
  ]
};
