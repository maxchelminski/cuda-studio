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
      objective: "Skip platform bays that a ray cannot reach while keeping the train, its shadows, and the reflected destination sign identical.",
      recall: "In the 2D worm swarm, a tile could skip a capsule whenever their bounding boxes did not overlap. Now think in 3D: if a glowing sign sits outside a camera pixel’s direct line of sight, how can its lettering still show up in that pixel?",
      lesson: "Follow one bright letter reflected in the wet platform paving. First, a primary ray from the camera hits a wet paving tile. The tile’s surface normal sends out a second, reflected ray, which can travel up to the illuminated destination sign. Each station bay groups several objects inside one bounding box. A ray can safely skip the entire bay if it misses that box, or if the box starts farther away than the closest surface hit already found. You must run this box test separately for every ray — a primary ray and the reflected ray bouncing off its hit point have different origins and directions, so they can pass through completely different bays.",
      file: "labs/nightshift/lighting.cuh", run: viewer("lighting"),
      steps: [
        "Launch the scene with the run command. Press Space to pause, spot the mirrored lettering in the wet paving, and toggle Reflections off and on to confirm it disappears and returns. Sketch both ray segments for one reflected letter (camera to paving, paving to sign). Switch the view to Work and alternate between mode 1 (reference) and mode 2 (optimized). Write down which part of the image visits fewer detailed bays in optimized mode, then close the viewer before benchmarking.",
        "Leave all visual effects enabled. Run the baseline benchmark below and record the `student` and `reference` GPU median times (`gpu_p50_ms`). Right now, the starter student function visits every bay without skipping any. The `optimized` row shows the target time you are aiming to understand and match.",
        "Relaunch the viewer, then open `labs/nightshift/lighting.cuh` and find `studentVisitBay`. Before editing, do a quick hand check: suppose a ray’s entry-to-exit intervals along the x, y, and z slabs of a bay box are [2, 8], [5, 9], and [3, 7]. Find the overlap interval where the ray is inside all three slabs at once. Decide whether a nearest known hit at distance 4 lets you skip the bay, then check again for distance 6. Replace the starter’s return expression in `studentVisitBay` using the existing bay-intersection helper in that file.",
        "Save `lighting.cuh`, switch to the viewer, press R to recompile, and press V to compare student Beauty against reference Beauty. Record the number of differing pixels, rotate to a second camera angle, and press V again to verify both angles match. Close the viewer, then run the fixed checks and post-edit benchmark below. Copy the printed `Notebook CSV` path ending in `lighting-after.csv` and paste it into Notebook → Record a benchmark → Import a native scene benchmark.",
        "You are done when all fixed checks pass and your notebook has: your two-ray reflection sketch, both frozen-frame pixel comparisons, and the `reference / student` GPU median ratio for the same shot. Finish by naming one rendering cost that the primary-ray Work view leaves out."
      ],
      commands: [
        practice(1, benchmark("lighting","before")),
        practice(3, check("lighting"), benchmark("lighting","after"))
      ],
      hint: "To find the overlap of the three slab intervals, take the largest of the three entry distances and the smallest of the three exit distances. The supplied helper already handles rays parallel to a slab and the small numerical tolerance near an existing hit.",
      solution: "The overlap interval is [5, 7]. A closest hit at distance 4 lies in front of the bay, so you can safely skip it. A closest hit at distance 6 means geometry inside the bay between 5 and 6 could still be closer, so you must test it. In `studentVisitBay`, use `return bayIntersects(r, z, closest);`. Frozen Beauty frames should have 0 differing pixels at both camera angles. The Work view only counts primary-ray bay visits — reflection rays, lighting, and shadow rays also contribute to total GPU frame time.",
      check: {question: "Your camera ray misses a station bay that contains a bright sign. Later, a reflected ray enters that bay at a distance closer than its nearest known hit. What should the reflected-ray traversal do?", options: ["Reuse the camera ray’s rejection and skip the bay", "Test the sign and the other detailed geometry inside that bay", "Return the color of the bay’s bounding box"], answer: 1, explanation: "The primary ray and reflected ray have different origins and directions. Because the reflected ray enters the box closer than its current nearest hit, objects inside that bay can still appear in the puddle."},
      deliverable: "Save your two-ray reflected-letter sketch, both frozen-frame pixel checks, and the full path to `lighting-after.csv`. Record the `reference / student` GPU median ratio along with which visual effects were enabled.",
      carry: [{id: "4/3", text: "Bring your Work-view prediction to Day 4 to explain what happens when more bounding boxes overlap along a ray."}],
      resources: [bvh, roughness]
    },
    {
      id: "4/creature", wi: 4, afterDay: 4, scene: "creature",
      title: "Sluice 09 · keep a moving silhouette intact", track: "Night Shift · visibility", minutes: 90,
      prerequisites: ["4/1", "4/3"],
      objective: "Cut down the number of exact ray–link intersection tests on a moving colony of 76 worms, and verify that every pixel still hits the exact same surface at two different gate openings.",
      recall: "Picture one thin worm strand along the outer silhouette of the colony. As the sluice gate opens and the strand moves, what must its bounding box enclose so that strand never gets clipped? Also think back to the 2D worm swarm: what happened to culling efficiency when capsules overlapped densely?",
      lesson: "Each of the 76 worms is built from a chain of 20 rounded links. Before rendering each frame, a preparation kernel moves the links and recomputes their bounding boxes. The reference path first skips rays that miss the entire colony or miss a whole worm. For any worm a ray can reach, four smaller group boxes each enclose five consecutive links. Missing one group box saves five exact ray–link intersection tests. Entering a group box does not guarantee a hit — the box may contain empty space — so the ray still tests the five links inside. Keep in mind that primary-ray test counts only show how much geometry the camera rays examined; a full frame also pays for the preparation kernel, shading, shadows, and reflections.",
      file: "labs/nightshift/creature.cuh", run: viewer("creature",0.25),
      steps: [
        "Launch the scene and press Space to pause with an outer worm strand clearly visible against the sluice gate. Before switching views, predict which ray will skip more link tests: one aimed through the crowded center of the colony, or one grazing an outer strand. Switch to the Work view and alternate between mode 1 (reference) and mode 2 (optimized) to test your prediction, then close the viewer.",
        "Run the link-counter script and baseline benchmark below at gate opening `0.25`. Copy the primary-ray link-test counts into your notebook. Then do a quick hand check: for one worm that a ray reaches, if the ray enters only one of its four group boxes, what is the maximum number of link tests in the ungrouped reference path versus the grouped path?",
        "Open `labs/nightshift/creature.cuh` and locate `studentVisitsGroup`. Use the supplied ray–box helper to check whether the ray can reach a five-link group box before the current `closest` hit. Save the file, relaunch the viewer, freeze a Beauty frame, and press V to check pixel agreement. Orbit to a second camera angle where a strand tip sits against the floor, press V again, and close the viewer.",
        "Run the checks and benchmarks below. Compare the `student`, `reference`, and `optimized` primary link-test counts at both gate openings (`0.25` and `0.8`). Inspect the exact-hit report to confirm that material, link ID, hit distance, surface normal, and arc all match. Then import both edited benchmarks into your course notebook using the two printed `Notebook CSV` paths (each capture is saved in its own folder).",
        "You are done when `student` matches `optimized` on primary link-test counts for both gate openings and both benchmarks report 0 differing pixels. For one gate opening, calculate `(reference tests − student tests) / reference tests` to find the percentage of link tests eliminated, and compare that savings against your measured GPU speedup. Explain why the two numbers differ — or why a slowdown happened if one did."
      ],
      commands: [
        practice(1, countLinks(0.25), benchmark("creature","before",0.25)),
        practice(3, check("creature"), countLinks(0.25), countLinks(0.8),
          benchmark("creature","narrow",0.25), benchmark("creature","wide",0.8))
      ],
      hint: "Look at `meets` in `creature.cuh`. Its last parameter caps how far along the ray a closer hit can still occur. Return true whenever the group’s bounding box intersects that valid ray interval.",
      solution: "In `studentVisitsGroup`, use `return meets(r, bounds, closest);`. On a surviving worm, the ungrouped reference may test all 20 links, whereas the grouped path pays for 4 group-box tests and at most 5 link tests if only one box is hit. Shared preparation, shadow, reflection, and shading costs still take up part of every frame. At a gate opening that lines up many strands along the camera rays, more group boxes overlap and fewer link tests can be skipped.",
      check: {question: "Shrinking the group size reduces the number of exact link tests, yet median GPU frame time goes up. Which measurement would best help explain why?", options: ["The file size of the saved frame image", "How glossy the floor looks from a different camera angle", "The number and cost of group-box tests, keeping gate opening, camera angle, and frame time fixed"], answer: 2, explanation: "Smaller groups mean more bounding-box tests and extra branching per ray. At a given gate opening, that added overhead can outweigh the link intersections you saved."},
      deliverable: "Create one table row for each gate opening (`0.25` and `0.8`). Record the primary-hit comparison, detailed link-test count, `reference` and `student` GPU median times, and the full CSV path. Save a frame capture from whichever gate opening gave the smaller speedup.",
      carry: [{id: "4/4", text: "Bring both gate openings into your FPS checkpoint: use one as your main speedup example and the other as your stress case or counterexample."}],
      resources: [bvh]
    },
    {
      id: "6/textile", wi: 6, afterDay: 4, scene: "textile",
      title: "Selvedge · pull the yarn and keep the tear", track: "Night Shift · fabric appearance", minutes: 75,
      prerequisites: ["6/2", "6/3"],
      objective: "Keep a hand-made tear anchored to a curved fabric sample as the camera orbits, then speed up surface intersection without altering a single visible stitch or the tear opening.",
      recall: "In the cloth simulation earlier this week, tearing the mesh meant breaking a constraint between vertices so they stopped pulling on each other. Here, you tear a sleeve on a rigid test form and then rotate the camera around it. In what coordinate system should the renderer store that tear so it stays in place on the fabric?",
      lesson: "First, a camera ray hits the curved fabric surface and computes two material coordinates, `u` and `v`, that pinpoint a location on the weave. Next, the yarn coverage and shading code turns `(u, v)` into individual visible stitches. Because the viewer stores a hand-made tear in `(u, v)` fabric coordinates, the opening stays locked to the same stitches as you orbit the camera. To accelerate rendering, your ray traversal can skip enclosed surface patches whose bounding boxes the ray misses or cannot reach before its closest hit. Keep the two kinds of verification clear in your notes: the cloth solver checked broken constraints and vertex positions, while this renderer checks the picked `(u, v)` location, the persistent tear opening, and the final rendered pixels.",
      file: "labs/nightshift/textile.cuh", run: viewer("textile",0.15),
      steps: [
        "Launch the intact fabric specimen at strain `0.15` and press Space to pause. Left-drag a stitch gently and release to verify that a small pull springs back. Now pull it farther until the weave tears open, and click `Save current pass` to capture the tear in Beauty view. Right-drag to orbit to a new angle, take a second capture, and verify it is the exact same opening using a nearby calibration mark. Close the viewer.",
        "Run the baseline benchmark below for the untouched `student` path. This CLI command uses a reproducible gallery tear at strain `0.53`. Record the `reference` and `student` GPU median times, and label this fixed-shot run clearly so you do not mix it up with your hand-pulled tear.",
        "Relaunch the intact specimen, pull a hand-made tear, and leave the viewer open. Open `labs/nightshift/textile.cuh`, find `studentVisit`, and use the existing ray–box helper to skip groups of surface patches the ray cannot hit closer than `closest`. Save the file and press R in the viewer while your tear is on screen. Orbit the camera, compare the Work view in modes 1 and 3, and press V to verify pixel agreement. Once you confirm the exact same tear survived the reload and orbit, close the viewer.",
        "Run the fixed checks below (which test reversible stretch, persistent tearing, orbiting, and reset) followed by the post-edit benchmark at strain `0.53`. Import the benchmark using the printed `Notebook CSV` path ending in `textile-after.csv`, and record the new GPU median times. In your notebook, keep the hand-pulled persistence test distinct from the fixed `0.53` timing shot.",
        "You are done when all interaction and pixel checks pass, your two saved images show the same tear from two angles, and you can explain the difference between what the cloth solver stores when a constraint breaks versus what this renderer stores when a stitch tears."
      ],
      commands: [
        practice(1, benchmark("textile","before",0.53)),
        practice(3, check("textile"), benchmark("textile","after",0.53))
      ],
      hint: "Find the `reaches` helper in `textile.cuh` and check its parameter order against `studentVisit`. While orbiting, pick one calibration mark visible near or through the tear so you have a reliable landmark independent of screen position.",
      solution: "In `studentVisit`, use `return reaches(box, ray, closest);`. Skipping a missed bounding box safely skips all surface patches inside it, while an exact surface hit produces the `(u, v)` coordinates used to shade the yarn and tear opening. Storing a tear in screen pixels would freeze it to the monitor as you orbit; storing it in `(u, v)` fabric coordinates keeps it attached to the weave. By contrast, breaking an edge in the dynamic cloth solver removes that edge’s rest-length constraint from the physics simulation.",
      check: {question: "A hand-made tear needs to stay in place when the camera orbits and after a live CUDA kernel reload during the same viewer session. Which state must the host save and re-upload?", options: ["The tear’s (u, v) coordinates and size on the fabric surface", "The brightest pixels from the previous rendered frame", "The screen column and row where the mouse button was pressed"], answer: 0, explanation: "Every new camera ray computes `(u, v)` fabric coordinates where it hits the surface. Storing the tear in those fabric coordinates lets every future camera angle and reloaded kernel find the same opening."},
      deliverable: "Save two camera views of the same hand-made tear and mark one stitch or calibration landmark visible in both. Record the interaction check result and the full path to `textile-after.csv`. Briefly explain what keeps the tear anchored on the rotating sleeve, and contrast that with what a broken edge meant in the cloth solver.",
      carry: [{id: "6/4", text: "Bring both kinds of damage evidence (dynamic cloth solver vs. textured fabric renderer) into the materials checkpoint and pick the right metric for each."}],
      resources: [{label: "Surface-based rendering of knitted fabrics", url: "https://diglib.eg.org/items/0be71589-7d03-4135-b6e3-359634627d99"}, roughness]
    },
    {
      id: "8/soundstage", wi: 8, afterDay: 0, scene: "soundstage",
      title: "Signal / Soundstage · visit the nearer box first", track: "Night Shift · capstone rehearsal", minutes: 90,
      prerequisites: ["4/2", "7/4"],
      objective: "Practice building a capstone-ready performance report: change BVH traversal order on a 6,036-triangle radio and validate the nearest hits against an independent double-precision CPU check.",
      recall: "Finding a closer hit lets a ray skip everything farther away. Sketch two child bounding boxes that a ray enters at distances 2 and 8. If your traversal visits the farther box (at 8) first, explain how it still produces the exact same image — and why it can end up doing more work.",
      lesson: "The radio’s bounding volume hierarchy (BVH) is a binary tree whose leaves hold at most six triangles each. At every internal node, the renderer already knows the distances where the ray enters the left and right child boxes. Because the traversal uses a last-in, first-out (LIFO) stack, near-first traversal pushes the farther child first and the nearer child second so the nearer child gets popped and tested next. If the nearer box contains a triangle hit, that hit shortens `closest` and can let the traversal skip the farther box completely. That nearest triangle supplies the `(u, v)` coordinates, surface normal, and texture values used for lighting. Notice that you can test geometric correctness directly on ray hits, independently of the final shaded image.",
      file: "labs/nightshift/soundstage.cuh", run: viewer("soundstage"),
      steps: [
        "Launch the radio scene, press Space to pause, and pick one clear detail on the speaker grille as a visual landmark. Briefly adjust the Roughness slider to watch a softbox highlight change, then reset back to the starting shot so your measurements stay consistent. Switch to the Work view, alternate between mode 1 (reference) and mode 2 (optimized), and predict which rays will gain the most from visiting the nearer box first. Close the viewer.",
        "Run the independent ray-packet check and the baseline benchmark below. Record the `reference` and `student` triangle-test totals along with their GPU median times. The ray packet checks 257 fixed rays against every triangle on the CPU, while the full-image Beauty benchmark also includes secondary rays and lighting.",
        "Trace the traversal stack on paper for a node where the right child enters at distance 2 (and holds a triangle hit at distance 5) and the left child enters at distance 8. Open `labs/nightshift/soundstage.cuh` and update `studentNearFirst` so the caller pushes the farther child first and pops the nearer child next. Save the file, relaunch the viewer, freeze the frame, and press V at two different camera angles to verify pixel agreement. Close the viewer.",
        "Run the ray-packet check, pixel checks, and both post-edit benchmarks below (front camera at yaw `0` and turned camera at yaw `0.45` radians). Import both edited CSVs using their printed `Notebook CSV` paths. For each angle, record the differing-pixel count and the `reference / student` GPU median ratio. Even if one camera angle shows little or no speedup, keep it — knowing where an optimization stops paying off is valuable evidence.",
        "Wrap up with a four-sentence capstone rehearsal in your notebook: (1) state the single change you made, (2) list the settings you held fixed, (3) cite your independent correctness evidence, and (4) describe a realistic condition where the speedup could disappear. Reuse this same four-sentence structure on Day 1 whether your capstone focuses on graphics, matrices, sparse data, or fluids."
      ],
      commands: [
        practice(1, radioPacket, benchmark("soundstage","before")),
        practice(3, check("soundstage"), radioPacket, benchmark("soundstage","front"),
          benchmark("soundstage","turned",0.5,0.45))
      ],
      hint: "Read how the caller in `soundstage.cuh` pushes children: it pushes the child stored as `right` first, then the child stored as `left`. Returning `true` from `studentNearFirst` tells the caller to swap them before pushing. Trace which child needs to end up on top of the LIFO stack.",
      solution: "In `studentNearFirst`, use `return rightEntry < leftEntry;`. When `rightEntry < leftEntry`, swapping puts the nearer box in `left`, which is pushed second and therefore popped first. A triangle hit at distance 5 then lets the ray skip the farther box entering at 8. If the nearer box turns out to hold only empty space along the ray, the farther box stays eligible when popped. On the 257-ray packet, the reference tests 4,226 triangles and the optimized traversal tests 2,646 (106 hits, 151 misses); your edit should reproduce the 2,646 count. The checker verifies exact triangle IDs and checks hit distances against double-precision CPU math within relative and absolute tolerances of 0.00001.",
      check: {question: "Both child boxes intersect the ray, and you visit the nearer box first. Inside the nearer box, the ray misses every triangle. What should happen to the farther box?", options: ["Discard it because the nearer bounding box was closer", "Keep it eligible as long as its entry distance is closer than the nearest known triangle hit", "Use the nearer box’s entry distance as the surface depth"], answer: 1, explanation: "Only a real triangle hit can tighten the nearest-hit distance. Finding empty space in the nearer box leaves the farther box eligible to be popped and tested."},
      deliverable: "For both camera angles (front and turned), save the GPU medians, frozen-frame pixel comparison, and full CSV path, plus the fixed ray-packet triangle-test totals. Identify which camera angle had the smaller speedup and point to the measurement that supports your explanation.",
      carry: [{id: "8/0", text: "Reuse this measurement table format — or the radio scene itself — when you write your capstone contract."}, {id: "8/1", text: "Use the independent 257-ray CPU packet check as a template for your own correctness oracle and edge-case test."}],
      resources: [bvh, {label: "Khronos glTF 2.0 · model and material specification", url: "https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html"}]
    }
  ];
})();
