"use strict";
const StudioGuides = (() => {
const here = "Set-Location 'G:\\CUDA-Studio'";
function worksheet(lab, section, label) {
 return [`labs/${lab}/README.html#${section}`, label];
}
const dailyLinks = [
 [ // C++ on-ramp
  [["labs/primer/01_frames.cpp","Convert milliseconds to FPS in the C++ starter"],["#setup","If the starter cannot run, check the portable C++ compiler"]],
  [["labs/primer/02_loop.cpp","Count frames above the time budget"]],
  [["labs/primer/03_matrix.cpp","Inspect the matrix starter"],["#matrix","Matrix tile explorer"]],
  [["labs/primer/04_buffers.cpp","Pass a buffer and its length to a function"]],
  [["labs/primer/05_threads.cpp","Simulate a grid of threads on the CPU"]]
 ],
 [ // Launches and measurement
  [["labs/primer/study_coverage.cpp","Trace all pixel writes in the CPU starter"],["labs/launch/README.html","Run the first CUDA launch checks"]],
  [["labs/primer/study_sectors.cpp","Count the memory sectors touched by a warp"]],
  [worksheet("render","baseline","Measure a frame from the kernel through readback")],
  [["labs/primer/study_tree.cpp","Trace a reduction with five leaves"],["labs/compute/solutions.cuh","Follow one block’s partial sum through reduce_tree"]],
  [["labs/primer/study_transpose.cpp","Reproduce the rectangular transpose failure"],["labs/launch/first_kernel.cu","Trace the final partially occupied block"]]
 ],
 [ // Dense matrices
  [["#digits","Find a query whose cosine and raw-dot matches differ"],worksheet("compute","small-gemm","Read the numerical check for the small GEMM")],
  [["#chain","Trace the cheapest split for your dimensions"],worksheet("compute","matrix-chain","Measure both associations on the digit matrix")],
  [["#matrix","Step through the partial K tile"],worksheet("compute","tiled-gemm","Implement and test the shared-memory tile")],
  [["#matrix","Trace adjacent output columns before assigning them to one thread"],["labs/compute/learner.cuh","Edit the output ownership in student_gemm"]],
  [worksheet("compute","compare-fp32","Compare custom GEMM with the cuBLAS reference"),worksheet("compute","timing","Check which work the CUDA events include")]
 ],
 [ // Sparse data and reductions
  [worksheet("compute","sparse-matrix","Recover the club graph’s degrees from its CSR rows"),["labs/compute/data/SOURCES.html","Check the graph’s origin and symmetry convention"]],
  [worksheet("compute","sparse-matrix","Compare scalar and warp mappings on the roof matrix"),["labs/compute/solutions.cuh","Trace the warp reduction in spmv_warp"]],
  [["labs/primer/study_compact.cpp","Fix the scan that assigns each surviving edge its slot"]],
  [worksheet("compute","ink-reduction","Count real ink with atomic and block reductions")],
  [worksheet("compute","sparse-matrix","Time both row mappings at 1, 16 and 256 copies")]
 ],
 [ // Rendering
  [worksheet("render","baseline","Freeze a frame and inspect candidate counts")],
  [["labs/render/scene.py","Trace projection and the CPU capsule hit test"],worksheet("render","conservative-cull","Compare the hit test with a cheaper bounds test")],
  [worksheet("render","shared-tile","Build a conservative candidate list for a tile")],
  [worksheet("render","worst-case","Construct a crowded frame and measure the failure case")],
  [worksheet("render","baseline","Collect matched baseline and candidate timings"),worksheet("render","worst-case","Capture the sparse and crowded comparison frames")]
 ],
 [ // Pressure and flow
  [worksheet("compute","pressure-target","Trace the first Jacobi sweep with a zero border")],
  [["labs/compute/solutions.cuh","Find each halo load in poisson_shared"],worksheet("compute","pressure-target","Check halo reads on a partial boundary tile")],
  [worksheet("compute","pressure-target","Compare solve time at the same relative residual")],
  [worksheet("flow","projection","Measure divergence before and after pressure projection")],
  [worksheet("flow","vortex-refinement","Compare the periodic vortex with its known solution"),["labs/flow/vortex_refinement.py","Trace one grid cell through the CPU refinement experiment"]]
 ],
 [ // Cloth
  [["#cloth","Pull the browser swatch near a pin and in the free interior"],worksheet("knit","material-state","Inspect the pinned edge and strain in the native swatch")],
  [worksheet("knit","local-gather","Trace the reads and single output of a Jacobi vertex"),["labs/knit/physics.py","Compare the scalar reference_sweep with your three-particle trace"]],
  [["labs/knit/student.cuh","Edit the student constraint gather"],worksheet("knit","local-gather","Validate the eight incident slots and time the edit")],
  [["#cloth","Compare the brush searches on one paused patch"],worksheet("knit","tear-strain","Test the strict strain threshold and persistent damage"),["labs/knit/physics.py","Locate the brush cut and strain calculations in Mesh"]],
  [worksheet("knit","physical-error","Compare solver cost and strain at equal simulated time")]
 ],
 [ // Blackwell performance engineering
  [["labs/launch/first_kernel.cu","Adapt the vector-add kernel for the measured bandwidth ceiling"],worksheet("compute","fp32-ceiling","Measure a cuBLAS GEMM compute ceiling")],
  [worksheet("compute","digit-retrieval","Measure FP32 and TF32 score error and nearest-image changes")],
  [worksheet("blackwell","cutlass-79b","Open the pinned 79b implementation and inspect its verification"),worksheet("blackwell","reconstruction","Measure four-bit reconstruction error on the real digits")],
  [worksheet("pipeline","edit-schedule","Alternate two slots and run the exact-score checks"),worksheet("pipeline","timeline","Check whether the GPU timeline shows overlap")],
  [worksheet("compute","digit-retrieval","Test the ranking constraint for the fast path"),worksheet("compute","timing","Match timing boundaries for the precision decision")]
 ],
 [ // Capstone
  [["#labs","Choose the workload for your capstone"],["#notes","Review earlier experiments before setting your acceptance rule"]],
  [["#day/8/0","Find the rule your output must satisfy and the inputs you chose to test it"],["labs/compute/verification.hpp","See a worked example of an independent matrix-product check"]],
  [["#day/8/1","Rerun your independent check on the input you designed to expose a mistake"],["#notes","Record the predicted counter and the before-and-after measurements"]],
  [["#day/8/0","Recover the held-out case and acceptance rule"],["#notes","Retrieve the baseline timings for your paired comparison"]],
  [["#notes","Gather your evidence for the report and check the recall queue"]]
 ]
];
function related(wi, di) {
 return dailyLinks[wi]?.[di] || [];
}
function view(page,ui) {
 const {root,h,crumb,esc,pre,card,resources,link}=ui;
 const panel=(name,body)=>'<section class="panel"><h2>'+esc(name)+'</h2>'+body+'</section>';
 const refs=items=>resources(items.map(([label,url])=>({label,url})));
 const gpu="Native CUDA";
 if(page==="labs") {
 const rows=[
 ["labs/nightshift/index.html",gpu+" · interactive gallery","Night Shift","Change the reflections on a wet platform, squeeze a colony through a sluice, pull a knitted sleeve, or relight a textured radio.","Explore four scenes"],
 ["#swarm",gpu+" · rendering","Abyssal Swarm","Cull invisible segments from a moving swarm. Compare the framebuffer, GPU milliseconds and live FPS.","Launch guide"],
 ["#knit",gpu+" · physics","Tearable knit","Pull and tear a 3D cloth. Optimize its solver, then inspect strain and interaction cost.","Launch guide"],
 ["#flow",gpu+" · fluids","Dye tank","Inject dye and momentum into a periodic grid. Watch pressure projection reduce the divergence.","Launch guide"],
 ["labs/pipeline/README.html",gpu+" · streams","Overlap a digit search","Reuse pinned buffers, fence the last query chunk, and compare one stream with two on the same images.","Open lab manual"],
 ["#compute",gpu+" · linear algebra","Numeric workbench","Multiply matrices, retrieve images, traverse a roof stiffness matrix, and solve a pressure field.","Choose a workload"],
 ["#matrix","Browser · worked trace","Matrix tile explorer","Carry one output tile through every phase of a small matrix product.","Trace the product"],
 ["#chain","Browser · algorithm design","Choose a multiply order","Compare every legal split of a matrix chain and trace the cheapest order for your dimensions.","Trace the recurrence"],
 ["#digits","Browser · real data","Handwritten digit retrieval","Select a query and see which scanned digits its vector retrieves.","Inspect matches"],
 ["#cloth","Browser · physics","Fabric brush","Drag or cut a live mesh. Test two ways of finding the material under the cursor.","Run the experiment"]];
 root.innerHTML=h("Experiment library","Lab shelf","Use the browser explorers to form a prediction. The native labs let you edit CUDA kernels and measure the GPU.")+'<div class="grid section">'+rows.map(x=>card(...x)).join("")+'</div>';return;
 }
 if(page==="digits"){globalThis.mountDigits(root);return;}
 if(page==="chain")return AlgebraBench.chainView(ui,panel);
 if(page==="matrix")return AlgebraBench.tileView(ui,panel);
 if(page==="cloth")return browserBench(page,ui,panel);
 if(page==="setup")return setupPage(ui,panel,refs);
 if(page==="flow"){
 const run="python -B labs/flow/flow.py";
 root.innerHTML=crumb("#labs","Lab shelf",gpu)+h("Fluid simulation / real-time CUDA","Dye tank","Drag to stir a 2D periodic fluid. Compare pressure solvers at the same number of sweeps, then test how changing the error target moves the frame budget.")+'<div class="labgrid section"><div class="stack"><figure class="instrument" style="margin:0"><img src="labs/flow/ink-preview.jpg" style="width:100%;display:block" alt="A dyed fluid carried through a two-dimensional CUDA velocity field"><figcaption class="figbar"><b>Native dye field</b><span>Pressure projection</span></figcaption></figure>'+panel("Your first experiment",'<ol class="steps"><li>Inject dye and momentum with a drag. Press D to cycle between dye and divergence before and after projection. Compare the RMS values.</li><li>Use the bracket keys to vary the pressure sweep count. Record both frame time and residual. Then compare the reference and fused variants at the same fixed input using the benchmark.</li><li>Edit labs/flow/student.cuh, reload with R, and run the manufactured-field checks. Explain how a tile halo lets a block take two Jacobi sweeps with fewer global transfers.</li></ol>'+LabPredictions.render(['flow-halo'],'dye-tank'))+'</div><aside class="stack">'+panel("Run locally",'<p>Double-click <b>Start Flow.cmd</b> or use PowerShell.</p>'+pre(here+"\n"+run+" --check\n"+run+"\n"+run+" --bench"))+panel("Bench materials",'<ul class="links"><li>'+link("labs/flow/README.html","Full experiment and controls")+'</li><li>'+link("labs/flow/student.cuh","Student pressure kernel")+'</li><li>'+link("#compute","Related numerical pressure lab")+'</li><li>'+link("#notes","Record measurements")+'</li></ul>')+'</aside></div>';return;
 }
 if(page==="swarm"||page==="knit"){
 const worm=page==="swarm",lab=worm?"render":"knit",script=worm?"swarm.py":"knit.py",launch="python -B labs/"+lab+"/"+script;
 const first=worm?
 ["Open the scene in baseline mode. Press Space to freeze the geometry. Read both window FPS and GPU kernel time.","Press 2 for tiled rendering and 3 for your student kernel. Press D to cycle through the image, segment IDs, and candidate counts. Predict which tiles should be cheapest.","Edit labs/render/student.cuh. Try a conservative bounding-box rejection before the precise segment test. Press R to reload and V to validate the frozen image. Then run the fixed-scene benchmark."]:
 ["Right-drag a vertex to stretch the mesh. Press D to see strain. Left-drag to cut, or press T to enable tensile failure and pull until a stitch breaks.","Compare the all-edge scan and adjacency gather on the same mesh, timestep and sweep count. The incidence list changes how a vertex finds the edges it needs.","Edit labs/knit/student.cuh. Reload with R and compare against the reference. Keep the number of solver sweeps fixed while testing an equivalent optimization."];
 const intro=worm?"Render the same creatures three ways. Find out how much of a frame goes into looking for geometry that cannot cover the pixel.":"Pull a patch of cloth, release it, and cut the mesh. How much work does one vertex need to do to enforce its surviving constraints?";
 const evidence=worm?"On this machine’s RTX 3070, 56 worms at 768×448 took 2.248 ms in the baseline and 0.040 ms in the tiled kernel. Median host time including packing, upload, and readback moved from 3.624 to 1.278 ms.":"On this machine’s RTX 3070, six Jacobi sweeps on 952 vertices with 3,624 constraints took 2.389 ms scanning all edges and 0.043 ms gathering adjacent edges. The final positions matched in this test.";
 root.innerHTML=crumb("#labs","Lab shelf",gpu)+h(worm?"Rendering / real-time CUDA":"Physics / real-time CUDA",worm?"Abyssal Swarm":"Tearable knit",intro)+'<div class="labgrid section"><div class="stack"><figure class="instrument" style="margin:0"><img style="width:100%;display:block" alt="'+(worm?'A rendered cluster of overlapping segmented worms':'A simulated cloth patch with severed links')+'" src="labs/'+lab+'/'+(worm?"swarm-preview.jpg":"cloth-preview.png")+'"><figcaption class="figbar"><b>Native lab output</b><span>'+(worm?"Procedural capsules":"Distance constraints")+'</span></figcaption></figure>'+panel("Your first comparison",'<ol class="steps">'+first.map(s=>'<li>'+s+'</li>').join("")+'</ol>'+LabPredictions.render(worm?['swarm-cheap']:['cloth-degree'],worm?'swarm-first':'knit-first'))+'</div><aside class="stack">'+panel("Run locally",'<p>Double-click <b>'+(worm?"Start Swarm.cmd":"Start Knit.cmd")+'</b> in the course folder. Or use PowerShell.</p>'+pre(here+"\n"+launch+(worm?" --mode baseline":""))+'<p class="meta">Validate and measure</p>'+pre(launch+" --check\n"+launch+" --bench"))+panel("A measured starting point",'<p>'+evidence+' These are medians of 41 samples after five warmups. Repeat on the RTX 5070.</p>')+panel("Bench materials",'<ul class="links"><li>'+link("labs/"+lab+"/README.html","Full experiment and controls")+'</li><li>'+link("labs/"+lab+"/student.cuh","Student kernel source")+'</li><li>'+link("#notes","Record measurements")+'</li></ul>')+'</aside></div>';return;
 }
 if(page==="compute"){
 const rows=[
 ["& $lab chain 1797 512 10","How much work disappears when you change the parentheses? Try 8, 16, 512 to reverse the preferred order."],
 ["& $lab gemm 73 129 35","Does a shared-memory tile produce the right result on three partial dimensions? Scale to 1024³, 2048³, then 4096³."],
 ["& $lab digits 1797","Do cosine nearest-neighbor labels change when cuBLAS may use TF32? Which query has the smallest margin?"],
 ["& $lab reduce 115008","How many global atomics are necessary to count all the ink in 1,797 scans?"],
 ["& $lab spmv labs/compute/data/bcsstk14.mtx 16","Which mapping works on the arena roof? Compare karate.mtx with both original and repeated blocks."],
 ["& $lab poisson 257 193 80 build/pressure.pgm","Does a faster iteration reach the same residual? Compare at fixed sweep count and then fixed residual."]];
 const labChecks=[['chain-first','chain-second'],['numeric-edge'],['numeric-precision'],['numeric-reduce'],['csr-lanes','numeric-shape'],['numeric-pressure']];
 const table='<div class="tablewrap"><table><tr><th>Command</th><th>Question to answer</th></tr>'+rows.map(([c,t],i)=>'<tr><td><code>'+esc(c)+'</code></td><td>'+esc(t)+LabPredictions.render(labChecks[i],'numeric-'+i)+'</td></tr>').join("")+'</table></div>';
 root.innerHTML=crumb("#labs","Lab shelf",gpu)+h("Real data / numerical methods","Numeric workbench","Change the algorithm, memory access pattern, or precision. Every workload has a baseline and a numerical check.")+'<div class="layout section"><div class="stack">'+panel("Run on the current machine",'<p>Open Course PowerShell to compile the supplied kernels in memory on the RTX 5070. The native executable adds custom shapes and precision comparisons against cuBLAS.</p>'+pre(here+"\npython -B labs/compute/practice_now.py chain\npython -B labs/compute/practice_now.py digits\npython -B labs/compute/practice_now.py roof"))+panel("Experiments for the RTX 5070",'<p>Rebuild after editing native code using '+link("#setup","Setup & reading")+'. In PowerShell from the course folder set the executable path.</p>'+pre("$lab = '.\\build\\compute\\Release\\compute_lab.exe'")+table)+'</div><aside class="stack">'+panel("Where to edit",'<ul class="links"><li>'+link("labs/compute/learner.cuh","Student CUDA kernels")+'</li><li>'+link("labs/compute/README.html","Six guided worksheets and worked checks")+'</li><li>'+link("labs/compute/data/SOURCES.html","Dataset records and checksums")+'</li><li>'+link("#chain","Predict the cheapest multiply order")+'</li><li>'+link("#matrix","Work one tile by hand")+'</li><li>'+link("#digits","Inspect a digit match")+'</li></ul>')+panel("One comparison",'<p>Write your predicted winner before changing code. Save the shape, arithmetic type, variant, median GPU time, and correctness result to your '+link("#notes","notebook")+'. Try to find the shape at which the winner changes.</p>'+LabPredictions.render(['numeric-shape'],'numeric-overview'))+'</aside></div>';
 }
}
return {related,view};
})();

