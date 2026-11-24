window.PUBLICATION_BRIEFS = {
  '2/4': {
    title: 'Does tiling pay for a handwritten digit search?',
    minutes: 35,
    pitch: 'A reader draws an 8×8 digit. Finding its closest match in a gallery takes only 64 multiply-adds per candidate. Would you still load a tile into shared memory? Use your Week 2 kernel to find out, then test how well your answer travels to a longer dot product.',
    steps: [
      'Start with your checkpoint prediction. Sketch how one thread block reads A and B before and after your change to student_gemm in labs/compute/learner.cuh. Mark one reused value and one edge tile. Rebuild the native compute lab after editing.',
      'Run the real 360-query, 1,437-image gallery search. Run seeded random matrices with exactly the same M, N and K. Choose a longer dot product for the third run and change only K. The example uses 256. Predict whether the extra arithmetic will help pay for loading each tile and explain why your chosen K is informative.',
      'Make one row per input. Report the naive, student and cuBLAS FP32 median GPU milliseconds, the range across the nine student timings and the naive/student ratio. Use the tile16 row to identify which work the shipped example already does. Describe what you implemented or tested yourself.',
      'Read the FP64 checks and the real queries’ nearest-image label agreement. Explain whether the timings support your prediction. If the timing ranges overlap substantially, rerun and say which conclusion the evidence can support.'
    ],
    commands: [{
      label: 'Run from Course PowerShell after rebuilding your edit',
      code: String.raw`& .\Course-Environment.ps1 -RuntimeOnly
$lab = '.\build\compute\Release\compute_lab.exe'
& $lab digits 1797
& $lab gemm 360 1437 64
& $lab gemm 360 1437 256`
    }, {
      label:'Package the source that produced your measurements',
      code:'python -B labs/publication-example/pack_sources.py 2'
    }],
    files: [
      'README.md — your exported case study, including the three workload rows and a diagram or short code excerpt showing your change.',
      'runs.txt — the exact commands and their full console output, including nine samples per method and numerical checks.',
      'digits-sources-….zip — attach the new ZIP printed by the packaging command. It includes your current learner.cuh, build sources, credited digit inputs and REPRODUCE.md for a reader starting on their own machine.'
    ],
    checks: [
      'Give M, N and K in that order for each input. Compute speedup only between implementations on the same input at the same precision. The cuBLAS row labeled TF32 allowed is a separate precision experiment.',
      'Describe CUDA-event time as the multiply on inputs already on the device. Report the printed FP64 check coverage. Nearest-image label agreement counts real queries whose retrieved neighbor has the query’s label. Random matrices have no digit labels.',
      'Record your GPU, toolkit, build command and edit. Credit E. Alpaydin and C. Kaynak, Optical Recognition of Handwritten Digits (CC BY 4.0, DOI 10.24432/C50P49). The bundled data source record documents the conversion and checksum.'
    ],
    fields: [
      {key:'retrieval', label:'The prediction', prompt:'What is a dot product measuring after normalization? Where did you expect tiling to pay off, and why?'},
      {key:'tile', label:'My kernel change', prompt:'Show the changed indexing or data movement in your own words. Trace one value through a tile and one partial tile at an edge.'},
      {key:'shapes', label:'Measurements by input', prompt:'Paste three labeled rows with dimensions, comparable median GPU times, spread and speedup. Which comparison isolates a change in K?'},
      {key:'scores', label:'Numerical and retrieval checks', prompt:'What checks actually ran? Give error, coverage and label agreement where applicable. What could the label agreement alone miss?'},
      {key:'verdict', label:'What the experiment settled', prompt:'Where did your prediction hold or fail? Name a competing explanation or a shape where you would test the conclusion next.'},
      {key:'rerun', label:'Reproduce and credit', prompt:'Give the GPU, toolkit, build/run commands, source of your edited code and a link to the digit dataset with its author credit and license. Point to your raw timings.'}
    ]
  },
  '4/4': {
    title: 'What does the shutter hide?',
    minutes: 40,
    pitch: 'In Sluice 09 the same colony squeezes under a moving shutter. Can a reader see where your traversal skips work, and can that saving predict how long the finished frame takes? Turn your Week 4 rendering checkpoint into a three-panel field report.',
    steps: [
      'Use your studentVisitsGroup edit in labs/nightshift/creature.cuh. Draw a ray that misses a group of links and another that meets its box. Explain when it is safe to skip a group even if its box is hit. Mark the traversal decision you changed.',
      'Compare gate controls 0.25 and 0.8. The lower shutter compresses strands while the worm count stays fixed. Before timing, choose which opening you expect to be a harder case and why. Keep camera, time, dimensions, sampling and features fixed across each comparison.',
      'At each opening collect the primary-ray link counts and the beauty benchmark. For reference and student report mean and maximum links tested per pixel, median and p95 GPU time, and the exact-hit and beauty checks. Does the less favorable case cost more link tests, more frame time, or both?',
      'For one opening export a beauty frame and two work views, reference and student. Put them side by side or stack them at the same size. Choose one patch where your edit helps and a second where its benefit fades, if present. Explain each using the geometry in the beauty frame. The work view encodes primary-ray link tests on a logarithmic color scale. Reflections and shadows contribute to beauty timing beyond those counts.'
    ],
    commands: [
      {
        label:'Measure both openings from Course PowerShell',
        code:String.raw`& .\Course-Environment.ps1 -RuntimeOnly
$scene = '.\labs\nightshift\nightshift.py'
$counter = '.\labs\nightshift\creature_counts.py'
$shot = @('--width','640','--height','360','--time','2','--yaw','0','--pitch','0')
foreach ($gate in '0.25','0.8') {
  python -B $counter @shot --control $gate
  if ($LASTEXITCODE) { throw 'Hit check failed.' }
  python -B $scene @shot --scene creature --control $gate --features 7 --samples 1 --view beauty --bench --trials 9
  if ($LASTEXITCODE) { throw 'Beauty comparison failed.' }
}`
      },
      {
        label:'Capture three PNGs in a fresh folder under build (choose either measured opening)',
        code:String.raw`& .\Course-Environment.ps1 -RuntimeOnly
$gate = '0.25'
$scene = '.\labs\nightshift\nightshift.py'
$shot = @('--scene','creature','--width','640','--height','360','--time','2','--yaw','0','--pitch','0','--control',$gate,'--features','7','--samples','1')
$dest = New-Item -ItemType Directory -Path (Join-Path 'build' ('sluice-' + [guid]::NewGuid().ToString('N')))
foreach ($panel in 'student-beauty','reference-work','student-work') {
  $mode, $view = $panel.Split('-')
  python -B $scene @shot --mode $mode --view $view --save (Join-Path $dest.FullName ($panel + '.png'))
  if ($LASTEXITCODE) { throw 'Frame export failed.' }
}
$dest.FullName`
      },
      {
        label:'Package the traversal and scene used for these captures',
        code:'python -B labs/publication-example/pack_sources.py 4'
      }
    ],
    files: [
      'README.md — the illustrated report, your traversal change and a two-opening timing table.',
      'student-beauty.png, reference-work.png and student-work.png — three labeled captures of one identical shot.',
      'runs.txt — the commands, both hit-counter reports and both beauty benchmark outputs, plus the gate setting used for the images.',
      'sluice-sources-….zip — attach the new ZIP printed by the packaging command. It includes your current traversal, the headless renderer, the credited concrete texture and REPRODUCE.md for replaying the shot.'
    ],
    checks: [
      'State the real scene change and your own edit. Use each opening’s matching reference. Preserve exact primary-hit checks and the benchmark’s differing-pixel count for each measured shot.',
      'The GPU timer covers creature preparation and rendering. The host timer also includes synchronized readback. Name the timer used for every ratio and keep primary-ray counts in their own column.',
      'Credit Sluice 09 as the starter scene and describe which parts of the traversal you authored. Credit the Painted Concrete material by Dimitrios Savva and Dario Barresi, available under CC0 from Poly Haven. Its source link is in the Night Shift manual.'
    ],
    fields: [
      {key:'gate', label:'Prediction under compression', prompt:'Which gate opening did you expect to make traversal harder? Describe the geometry and the ray you had in mind.'},
      {key:'groups', label:'My traversal change', prompt:'Give your rejection rule with a short snippet or diagram. What makes rejection safe for the current closest hit?'},
      {key:'panels', label:'Three views of one shot', prompt:'Embed or link the three local PNGs with relative paths. In a caption give the gate setting, decode the colors and point out one region where work changes.'},
      {key:'cost', label:'From link counts to frame time', prompt:'Group reference and student measurements by opening. Give mean/max primary link tests, GPU p50/p95, units and exact-hit/beauty results. Which observation surprised you?'},
      {key:'bounds', label:'Where the shortcut stops helping', prompt:'Explain one source of work the primary counter misses, and how that limits what you can claim about frame time.'},
      {key:'capture', label:'Reproduce the shot and credit its sources', prompt:'Include the camera and scene parameters, trials, hardware, toolkit, edit, commands and asset credit. Link the raw output.'}
    ]
  },
  '8/4': {
    title: 'The case that could overturn my optimization',
    minutes: 40,
    pitch: 'A stranger should be able to challenge your strongest capstone result. Give them the input most likely to break it, the check that would catch a wrong answer, and a short route from a fresh run to a verdict. A matrix, graph, simulation or rendered frame can all tell this story.',
    steps: [
      'Use your capstone contract and the limit you documented. State a decision for a specific user or workload, your one algorithmic change and its expected mechanism. Name a workload where you expect the baseline to catch up or the answer to degrade.',
      'Package the checkpoint’s held-out input or its deterministic recipe. Give both a representative case and a stress case with the same accuracy contract. For example, vary graph degree skew at fixed vertices and edges, or change a ray distribution at fixed resolution. Explain why that change pressures your algorithm.',
      'Use your Week 8 deliberately detected defect to show the check can fail. Give the smallest witnessed failing input you found, the discrepancy it exposes and the expected answer or tolerance. Then show the corrected version passing and measure only the valid version against its baseline.',
      'Rerun the baseline and corrected variant for both cases from the instructions you intend to share. Show absolute times, repeat-to-repeat spread, a workload-specific quality or error measure and one interpretable work metric. If the predicted crossover never occurs, report the tested range.'
    ],
    files: [
      'README.md — the decision, your contribution, a compact evidence table, its limit and instructions for rerunning the experiment.',
      'reproduce.ps1 or reproduce.md — exact commands, input recipe or download and checksum, software versions and how to apply your source change. Include the small edited source where redistribution is permitted.',
      'runs.txt — raw measurements and check output for both cases, with timing scope, units, repetition count and workload labels.',
      'witness.txt — a minimal input or deterministic generator parameters, expected answer and the recorded failure that the corrected version passes.'
    ],
    checks: [
      'A reader can run a small case and see an expected result. Specify the hardware needed for the timing claim and any data or dependencies they need to obtain. Replace machine-specific paths with project-relative ones.',
      'Use identical inputs and timing boundaries within each pair. For approximate algorithms, choose the same quality target before measuring and report each method’s achieved quality. Give evidence for any claimed crossover.',
      'Distinguish your code and measurements from library or starter code. Include source links and terms for outside inputs and assets. If an input cannot be shared, supply a redistributable witness or generator and identify which result it reproduces.'
    ],
    fields: [
      {key:'decision', label:'The decision and my contribution', prompt:'Who would use this result? What was the baseline, what did you change and why should that change affect the bottleneck?'},
      {key:'stress', label:'Two workloads and a prediction', prompt:'Identify your representative case and a held-out stress case. What did you vary, hold fixed and expect before seeing the second result?'},
      {key:'witness', label:'A check that catches a real mistake', prompt:'Give the small input, oracle or invariant, expected output or threshold, observed defect and corrected result. Why would a weaker check have missed it?'},
      {key:'evidence', label:'What the runs show', prompt:'Give both workloads, baseline and corrected time with units and spread, work counts, quality and timing scope. Link the raw results.'},
      {key:'limit', label:'The boundary of the claim', prompt:'Where would you choose the baseline, or which possibility is still unresolved? Put a numerical range on the conditions you actually tested.'},
      {key:'replay', label:'Independent reproduction and credits', prompt:'Link the minimal replay instructions and your code change. Give input provenance, source terms, versions, device and one check a reader can verify on the first run.'}
    ]
  }
};
