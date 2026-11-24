// Each scene is scheduled after a core day. Existing core-day IDs remain the notebook keys.
(() => {
  "use strict";
  const folder = "build/nightshift-results";
  const lab = "python -B labs/nightshift/nightshift.py";
  const checked = (command) => `${command}\nif ($LASTEXITCODE -ne 0) { throw 'Check failed. Inspect the first mismatch before benchmarking.' }`;
  const check = (scene) => checked(`${lab} --scene ${scene} --check`);
  const countLinks = (gate) => checked(`python -B labs/nightshift/creature_counts.py --width 640 --height 360 --time 2 --control ${gate}`);
  const radioPacket = checked("python -B labs/nightshift/radio_checks.py");
  function practice(step, ...parts) {
    const statements = parts.join("\n").split("\n").map(line => "    " + line).join("\n");
    return {step, text: "& {\n" + statements + "\n}"};
  }
  const fixedShot = "--width 640 --height 360 --time 2 --features 7";
  const viewer = (scene, control = 0.5, samples = 4) => `${lab} --scene ${scene} ${fixedShot} --samples ${samples} --control ${control}`;
  function benchmark(scene, name, control = 0.5, yaw = 0) {
    return `New-Item -ItemType Directory -Force ${folder} | Out-Null\n` +
      `$timingRows = ${viewer(scene, control, 1)} --yaw ${yaw} --bench --trials 9\n` +
      "if ($LASTEXITCODE -ne 0) { throw 'Benchmark failed. See the CUDA output above.' }\n" +
      `$runFolder = New-Item -ItemType Directory -Path (Join-Path '${folder}' ([guid]::NewGuid().ToString('N')))\n` +
      `$csv = Join-Path $runFolder.FullName '${scene}-${name}.csv'\n` +
      "$timingRows | Out-File -Encoding utf8 -NoClobber -ErrorAction Stop $csv\n" +
      "Write-Output \"Notebook CSV: $csv\"\n" +
      "Import-Csv -LiteralPath $csv | Format-Table mode,gpu_p50_ms,gpu_p95_ms,host_p50_ms,different_pixels";
  }
  const bvh = {label: "Physically Based Rendering · bounding volume hierarchies", url: "https://www.pbr-book.org/4ed/Primitives_and_Intersection_Acceleration/Bounding_Volume_Hierarchies"};
  const roughness = {label: "Physically Based Rendering · microfacet roughness", url: "https://www.pbr-book.org/4ed/Reflection_Models/Roughness_Using_Microfacet_Theory"};

  window.STUDIO_LESSONS = [
    {
      id: "4/lighting", wi: 4, afterDay: 3, scene: "lighting",
      title: "After the last train · keep the sign in the puddle", track: "Night Shift · ray tracing", minutes: 75,
      prerequisites: ["1/2", "4/2"],
      objective: "Skip platform bays that a ray cannot reach while preserving the train, its shadows and the reflected destination sign.",
      recall: "The 2D swarm's tile could drop a capsule when their bounds were disjoint. If a sign is outside a camera pixel’s direct line of sight, how could its lettering still reach that pixel?",
      lesson: "Trace one bright letter in the wet paving. A ray from the camera hits a tile. The tile’s surface normal sets the direction of a second ray, which may find an illuminated sign. A station bay contains several objects inside an enclosing box. The ray can skip the whole bay when it misses that box, or when the box lies beyond the closest surface already found. Apply the test independently to each ray. A primary ray and a reflected ray starting at its hit point can visit different bays.",
      file: "labs/nightshift/lighting.cuh", run: viewer("lighting"),
      steps: [
        "Launch the scene. Press Space, find the mirrored lettering and toggle Reflections off and on. Draw both ray segments for one letter. Switch to Work and alternate 1 and 2. Write down which image region should visit fewer detailed bays. Close the viewer before timing.",
        "Keep all effects on. Run the baseline benchmark below and record the student and reference GPU medians. The unchanged student function accepts every bay. The optimized row gives you a target to investigate.",
        "Relaunch the scene and find studentVisitBay in lighting.cuh. Suppose the axis intervals for a ray crossing a bay are [2,8], [5,9] and [3,7]. Work out their common interval. Decide which nearest-hit distances of 4 and 6 allow rejection. Replace the starter’s return expression using the existing bay intersection helper.",
        "Save the file, press R, then V and read the number of differing pixels. Compare again after changing the camera angle. Close the viewer. Run the fixed checks and the edited benchmark. Copy the printed Notebook CSV path ending in lighting-after.csv. Paste the full path into the file picker in Notebook → Record a benchmark → Import a native scene benchmark.",
        "Finish when the fixed checks pass and your notebook contains the two-segment sketch, the pixel comparison, and a reference/student GPU median ratio for the same shot. Name one cost the primary-ray Work view leaves out."
      ],
      commands: [
        practice(1, benchmark("lighting","before")),
        practice(3, check("lighting"), benchmark("lighting","after"))
      ],
      hint: "Take the greatest of the three entries and the least of the three exits. The helper also accounts for a ray parallel to a slab and the tolerance near a known hit.",
      solution: "The common interval is [5,7]. A closest hit at 4 hides the bay. A closest hit at 6 means that geometry between 5 and 6 might win. Use return bayIntersects(r, z, closest); in studentVisitBay. Frozen beauty frames should agree at both camera angles. Work counts primary-ray bay visits. Reflection rays, lighting and shadow tests also contribute to GPU time.",
      check: {question: "Your camera ray misses a bay containing a bright sign. Later a reflected ray enters that bay before its nearest known hit. What should the reflected-ray traversal do?", options: ["Reuse the camera ray’s rejection", "Test the sign and the other detailed geometry in that bay", "Return the color of the bounding box"], answer: 1, explanation: "The two rays have different origins and directions. Entering the box before the current hit makes its contents possible contributors to the puddle."},
      deliverable: "Save the reflected-letter sketch, the two frozen-frame checks and the printed full path to lighting-after.csv. Record the GPU median ratio and the effects that were enabled.",
      carry: [{id: "4/3", text: "Use your work-view prediction to explain what happens as more candidate bounds overlap."}],
      resources: [bvh, roughness]
    },
    {
      id: "4/creature", wi: 4, afterDay: 4, scene: "creature",
      title: "Sluice 09 · keep a moving silhouette intact", track: "Night Shift · visibility", minutes: 90,
      prerequisites: ["4/1", "4/3"],
      objective: "Reduce actual ray–link tests for a moving mass of 76 worms and verify the same winning surface at two gate openings.",
      recall: "Pick one thin strand at the outline of the colony. What must a moving bound enclose to preserve that strand as the gate opens? Recall how dense overlap affected the flat swarm.",
      lesson: "Each worm is a chain of 20 rounded links. The preparation kernel moves the links and updates their boxes. The reference first rejects rays that miss the colony or an entire worm. For a surviving worm, four smaller boxes each enclose five consecutive links. One missed box can save five exact intersection tests. A box that the ray enters may contain empty space, so the enclosed links still need to be tested. Primary-ray counts show how much geometry was examined. A completed frame also pays for preparation, shading, shadows and reflections.",
      file: "labs/nightshift/creature.cuh", run: viewer("creature",0.25),
      steps: [
        "Launch the scene and pause with an outer strand visible against the gate. Predict which is likely to save more tests per ray, looking through a crowded center or grazing an outer strand. Compare reference and optimized Work views. Close the viewer.",
        "Run the counter and baseline benchmark at gate control 0.25. Copy the primary link counts into your notebook. For one surviving worm whose ray reaches exactly one group, predict the maximum number of link tests in the reference and grouped paths.",
        "Open creature.cuh and locate studentVisitsGroup. Use the supplied test for a ray reaching the five-link box before the closest hit. Save, relaunch the viewer and use V on a frozen Beauty frame. Check a second camera angle that places a strand tip against the floor, then close the window.",
        "Run the checks below. Compare the student, reference and optimized primary counts at both gate openings. Inspect the exact-hit report for material, link ID, distance, normal and arc. Use the two printed Notebook CSV paths to import the edited captures into the course notebook. Each capture has its own folder.",
        "Finish when student and optimized give the same primary counts for both views and both benchmarks report zero differing pixels. For one view calculate (reference tests − student tests) / reference tests, then compare the percentage saved with the measured GPU speedup. Explain the gap or the slowdown you measured."
      ],
      commands: [
        practice(1, countLinks(0.25), benchmark("creature","before",0.25)),
        practice(3, check("creature"), countLinks(0.25), countLinks(0.8),
          benchmark("creature","narrow",0.25), benchmark("creature","wide",0.8))
      ],
      hint: "Inspect meets in creature.cuh. Its last argument limits how far along the ray a closer hit can still occur. Keep a group when its box could touch that interval.",
      solution: "Use return meets(r, bounds, closest); in studentVisitsGroup. The ungrouped ray may test 20 links. The grouped ray pays for four boxes and at most five links if only one box survives. The shared preparation and shading costs still consume frame time. A gate opening that aligns several strands along a ray can produce more overlapping boxes and fewer opportunities to reject links.",
      check: {question: "Shrinking the group size reduces link tests yet increases median GPU time. Which measurement would help explain the result?", options: ["The file size of the captured frame", "How glossy the floor looks on a different camera", "The number and cost of group-box tests, with gate, camera and time fixed"], answer: 2, explanation: "Smaller groups add box tests and change branching. Those costs can outweigh the saved link intersections at a particular gate opening."},
      deliverable: "Make one row for each gate setting. Save the primary-hit comparison, number of detailed link tests, reference and student GPU medians, and the CSV path. Keep a frame from the setting with the smaller speedup.",
      carry: [{id: "4/4", text: "Use one gate setting as evidence in your FPS checkpoint and the other as its counterexample or stress case."}],
      resources: [bvh]
    },
    {
      id: "6/textile", wi: 6, afterDay: 4, scene: "textile",
      title: "Selvedge · pull the yarn and keep the tear", track: "Night Shift · fabric appearance", minutes: 75,
      prerequisites: ["6/2", "6/3"],
      objective: "Track a tear on a curved fabric sample as the camera moves, then accelerate surface intersection without changing the visible stitches or opening.",
      recall: "In the cloth solver, breaking a constraint changed which vertices could pull on each other. Here you can rotate a rigid test form after tearing its sleeve. Where could the renderer store the location of that opening?",
      lesson: "The camera ray first hits a curved surface. The hit supplies two material coordinates, u and v, locating one point on the weave. Yarn coverage and shading turn that coordinate into a visible stitch. The viewer records a hand-made split in these coordinates so it stays attached as you move. The expensive ray search can reject enclosed surface sections before computing the visible hit. Keep both tests meaningful: the week’s cloth solver checked broken constraints and vertex positions, while this renderer checks the picked location, visible opening and rendered pixels.",
      file: "labs/nightshift/textile.cuh", run: viewer("textile",0.15),
      steps: [
        "Open an intact specimen at strain 0.15 and press Space. Left-drag a stitch a little and release. Pull it farther until a split appears. Use Save current pass to capture it in Beauty. Right-drag to orbit, take a second capture and identify the same opening using a nearby calibration mark. Close the viewer.",
        "Benchmark the untouched student at the fixed gallery-style tear setting below. This fresh CLI run uses a reproducible strain of 0.53. Record the reference and student GPU medians and label this run separately from your hand-made opening.",
        "Relaunch the intact specimen, make a hand-made tear and leave it in the viewer. In textile.cuh find studentVisit and use the existing ray–box helper to decide which groups of surface sections to visit. Save and press R while the tear is visible. Orbit, compare Work in 1 and 3, and press V. Close the viewer after checking the same opening survived.",
        "Run the fixed checks, including the reversible stretch, persistent split, orbit and reset, then benchmark the same 0.53 strain setting. Use the printed Notebook CSV path ending in textile-after.csv to import the capture and report the GPU medians. In your notebook distinguish the hand-pull that demonstrated persistence from the fixed shot used for timing.",
        "Finish when the interaction and pixel checks pass, your two images identify the same tear after an orbit, and you can explain what the original solver and the material renderer each store when a strand breaks."
      ],
      commands: [
        practice(1, benchmark("textile","before",0.53)),
        practice(3, check("textile"), benchmark("textile","after",0.53))
      ],
      hint: "Find reaches and compare its argument order with studentVisit. Watch one calibration mark through the tear as you orbit. The mark gives you a visual landmark independent of the cursor.",
      solution: "Use return reaches(box, ray, closest); in studentVisit. A missed enclosing box safely excludes its surface sections. An exact surface hit supplies the coordinates used to look up yarn and the split. A mark stored at a screen pixel would appear fixed on the display as you orbit. A UV mark follows the fabric surface. In the earlier dynamic solver, breaking an edge stops the solver from enforcing that edge’s rest length.",
      check: {question: "The tear should persist when the camera moves and after a successful CUDA reload in the same viewer session. Which state should the host preserve and upload again?", options: ["The split’s coordinates and extent on the fabric surface", "The last frame’s bright pixels", "The column and row of the mouse press on the desktop"], answer: 0, explanation: "Each new camera ray recovers material coordinates at its surface hit. Restoring the split in that coordinate system lets later frames find it from different angles."},
      deliverable: "Keep two views of the same tear and mark a stitch you can find in both. Copy the interaction check and the path to textile-after.csv. Explain what keeps the visible tear in place when the sleeve rotates and what a broken edge meant in the cloth solver.",
      carry: [{id: "6/4", text: "Take the two kinds of damage evidence into the materials checkpoint and choose a suitable measurement for each."}],
      resources: [{label: "Surface-based rendering of knitted fabrics", url: "https://diglib.eg.org/items/0be71589-7d03-4135-b6e3-359634627d99"}, roughness]
    },
    {
      id: "8/soundstage", wi: 8, afterDay: 0, scene: "soundstage",
      title: "Signal / Soundstage · visit the nearer box first", track: "Night Shift · capstone rehearsal", minutes: 90,
      prerequisites: ["4/2", "7/4"],
      objective: "Build a capstone-sized piece of evidence by changing traversal order on a 6,036-triangle radio and validating the nearest hit against independent CPU calculations.",
      recall: "A nearer hit can shorten the search interval. Sketch two boxes entered at distances 2 and 8. If you visit the farther box first, how could you still produce exactly the same image and do more work?",
      lesson: "The radio’s bounding volume hierarchy is a binary tree. A leaf holds at most six triangles. At each internal node the renderer knows where the ray enters both child boxes. Its stack is last in, first out. A near-first traversal pushes the farther child first, then the nearer child. Finding a real triangle shortens the distance limit for later nodes. The same nearest surface supplies the material coordinates, surface normal and texture values for the lighting calculation. You can validate the geometric work separately from the finished display pixels.",
      file: "labs/nightshift/soundstage.cuh", run: viewer("soundstage"),
      steps: [
        "Pause the radio and choose one distinctive feature on the speaker grille. Briefly vary Roughness and watch a softbox highlight. Return to the initial shot for comparison. Visit Work in modes 1 and 2 and predict which rays will benefit from changing visit order. Close the viewer.",
        "Run the independent packet check and the initial benchmark. Write down the reference and student triangle-test totals and GPU median times. The packet contains 257 fixed rays tested against every triangle by the CPU. The full-image beauty timing includes other rays and lighting work.",
        "Trace the stack on paper with the right child entering at 2 and the left at 8. The right child contains a triangle at 5. In soundstage.cuh change studentNearFirst so the caller pushes children in the order you need. Save, relaunch, freeze and use V on two camera angles. Close the viewer.",
        "Run the packet and pixel checks again. Benchmark the original camera and a second yaw of 0.45 radians. Import both edited CSVs using their printed Notebook CSV paths. For each angle report the zero-pixel comparison and the reference/student GPU median ratio. An angle with little gain is useful evidence.",
        "Finish with a four-sentence capstone rehearsal. State your one edit, the quantities held fixed, the independent correctness evidence and a plausible condition under which the gain might disappear. Keep this format for Day 1 whether you choose graphics, matrices, sparse data or fluids."
      ],
      commands: [
        practice(1, radioPacket, benchmark("soundstage","before")),
        practice(3, check("soundstage"), radioPacket, benchmark("soundstage","front"),
          benchmark("soundstage","turned",0.5,0.45))
      ],
      hint: "The source pushes the child stored as right, then the child stored as left. The boolean returned by your function requests a swap before those pushes. Trace which value should be popped first.",
      solution: "Use return rightEntry < leftEntry; in studentNearFirst. With these distances the swap puts the nearer box on top of the stack. A triangle hit at 5 lets the traversal skip a box entered at 8. If the near box contains empty space along the ray, the far box stays eligible. On the bundled packet the reference tests 4,226 triangles and the optimized traversal tests 2,646, with 106 hits and 151 misses. A matching edit should recover the optimized count. The checker requires exact triangle IDs and compares hit distances against the CPU’s double-precision calculation with relative and absolute tolerances of 0.00001.",
      check: {question: "Both boxes intersect the ray. The nearer box contains no triangle hit. What should happen to the farther box?", options: ["Discard it because a bounding box was closer", "Keep it eligible while its entry lies within the closest known triangle distance", "Return the nearer box’s entry as the surface depth"], answer: 1, explanation: "Only an actual surface hit can shorten the nearest-hit distance. Empty space in the first box leaves the farther child available for traversal."},
      deliverable: "For each camera angle, save the GPU medians, frozen-frame comparison and CSV path. Keep the triangle-test counts for the fixed ray packet. Name the angle with the smaller speedup and say which observation supports your explanation.",
      carry: [{id: "8/0", text: "Reuse the measurement format or the scene itself when you choose your capstone contract."}, {id: "8/1", text: "Use the independent packet check as a model for your own oracle and adversarial case."}],
      resources: [bvh, {label: "Khronos glTF 2.0 · model and material specification", url: "https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html"}]
    }
  ];
})();
