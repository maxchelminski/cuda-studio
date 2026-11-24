"use strict";

// Indexed like the course map. Week 0 is the C++ on-ramp.
window.WEEK_PATH = [
  {
    bring: "Open Course PowerShell and keep a text editor beside it. The first starter already compiles. Run it once and read the two FPS results before changing a line.",
    finish: "Rebuild a changed C++ function, show a test that catches a wrong answer, and trace which worker owns the last element of a partly filled block.",
    reuse: "In Week 1, turn that worker’s index and guard into a CUDA kernel and check the output after a real device-to-host copy."
  },
  {
    bring: "Bring your on-ramp drawing of a grid and your last-element test. Recall where a function that receives a pointer writes its result.",
    finish: "Identify the first incorrect destination in the original CPU transpose, pass all five repaired shapes, and record a baseline with the GPU, input size and timing boundary.",
    reuse: "Use the same edge-case and timing habits in Week 2 when a matrix ends partway through a tile."
  },
  {
    bring: "Bring your row-major matrix diagram and Week 1 timing record. Be ready to identify the addresses that adjacent threads read.",
    finish: "Show one input where changing matrix order saves multiplications and two ragged shapes where tiled GEMM passes. Record precision, median time and error for a fair comparison.",
    reuse: "In Week 3, compare what changes when a row has only a handful of nonzero entries and those entries point to scattered columns."
  },
  {
    bring: "Use your dense matrix product as a reference. For one sparse row, multiply each stored value by the vector entry at its column and add the products.",
    finish: "Reconstruct a graph row from its stored offsets, verify its product, then compare two work assignments on the club graph and roof matrix. Solve the checkpoint’s illustrative setup-cost crossover, then explain what the real kernel timings can establish when both mappings share one setup.",
    reuse: "Carry that setup-cost question into Week 4. A list of geometry candidates also costs time to build before a pixel can use it."
  },
  {
    bring: "Bring your Week 1 GPU-versus-host timing diagram and your Week 3 example of uneven work. Think of a pixel where two pieces of a worm overlap.",
    finish: "Keep a matching station frame, a verified sluice frame, and the original swarm’s sparse/dense checkpoint results. Use the work view to explain which candidates disappeared and the timings to show what the change bought.",
    reuse: "Take the fixed-input comparison into Week 5, where a fluid image can look plausible even when its pressure residual is too large."
  },
  {
    bring: "Recall how you verified one matrix row in Week 3 and how you kept geometry fixed for a timing comparison in Week 4. Sketch the four neighbors of one interior grid point.",
    finish: "Trace two pressure sweeps, compare solver time at a stated residual target, and check the vortex on two grids against its analytic decay.",
    reuse: "In Week 6, keep timestep and sweep count fixed while comparing cloth solvers. Then vary those settings deliberately and measure how much the fabric stretches."
  },
  {
    bring: "Bring your Week 5 iteration and error measurements. Sketch a pair of cloth vertices joined by one stitch and mark the vertex that stays pinned.",
    finish: "Test the cloth solver on an intact and a torn mesh, measuring pinned drift and changed active edges. In Selvedge, release a tear and rotate the view to verify its location on the sleeve.",
    reuse: "Use the same habit in Week 7: declare which changes to the output you will accept before comparing faster hardware or lower precision."
  },
  {
    bring: "Bring one GPU timing with its device and precision, plus an output check from the digit, pressure or cloth lab. You will need both to evaluate a faster path.",
    finish: "Defend a precision choice for two matrix workloads using measured time and error. On the chunked digit search, verify the last partial chunk and identify the boundaries of your host timing.",
    reuse: "Open Week 8 with the Soundstage radio. Apply your acceptance rule to a different optimization by checking the selected triangle before comparing render times."
  },
  {
    bring: "Bring your Week 7 decision table and one earlier experiment you would like to defend. The opening Soundstage session supplies a worked example of comparing a fast search with an independent reference.",
    finish: "Deliver a reproducible capstone with a fixed contract, a deliberately detected defect, a held-out case, before-and-after timings and a documented limit. Use the rubric to revise the weakest part.",
    reuse: "During the spaced reviews, rerun the capstone on a fresh input and try to predict when the original baseline would win."
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
    {id:"4/lighting",text:"Take the bounding test you just used for a tile to the station and freeze a shot where the sign is visible both above the platform and in the puddle."}
  ],
  "4/3": [
    {id:"4/creature",text:"Take your dense-case prediction into Sluice 09 and test which five-link groups a ray can safely skip as the worms overlap."}
  ],
  "4/4": [
    {id:"4/lighting",text:"Use the station’s reflected sign as a second example of why a correct visibility test must account for rays beyond the camera’s first hit."},
    {id:"4/creature",text:"Use the sluice work count to explain whether the change in primitive tests predicts the change in elapsed GPU time."}
  ],
  "6/3": [
    {id:"6/textile",text:"After recording the cloth solver’s fracture history, predict what will happen to a split on Selvedge’s sleeve when you release the fabric and rotate the camera."}
  ],
  "6/4": [
    {id:"6/textile",text:"Compare what your solver’s active-edge count proves about a broken stitch with what Selvedge’s orbit test proves about where a surface tear is stored."}
  ],
  "7/4": [
    {id:"8/soundstage",text:"Carry your timing boundary and acceptance rule into Soundstage and test whether a different search order reaches the same triangle sooner."}
  ],
  "8/0": [
    {id:"8/soundstage",text:"Use the radio’s nearest-hit contract as a model for specifying what must agree in your chosen matrix, sparse, fluid or graphics project."}
  ],
  "8/1": [
    {id:"8/soundstage",text:"Use the radio’s double-precision brute-force check as an example when choosing an independent reference for your own project."}
  ],
  "8/4": [
    {id:"8/soundstage",text:"Review how the radio separates a count of triangle tests from full-frame time, then make the same distinction between work and elapsed time in your capstone report."}
  ]
};
