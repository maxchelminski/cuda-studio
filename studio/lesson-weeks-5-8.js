// Explanations and guided practice for fluids, fabric, Blackwell and the capstone.
(() => {
  "use strict";
  const section = (title, ...body) => ({title, body});
  const trace = (title, lines, ...body) => ({title, body, language:"Worked trace", code:lines.join("\n")});
  const step = (title, text, command, expected, comparison) => ({
    title, body:Array.isArray(text) ? text : [text], command, expected,
    ...(comparison ? {worked:{title:"Compare after your attempt", body:[comparison]}} : {})
  });
  const guide = (intro, sections, practice, workbench) => ({intro, sections, practice, workbench});
  const lab = ".\\build\\compute\\Release\\compute_lab.exe";
  const flow = "python -B labs/flow/flow.py";
  const knit = "python -B labs/knit/knit.py";
  const vortex = "python -B labs/flow/vortex_refinement.py";
  const pipeline = "python -B labs/pipeline/pipeline.py";
  const scales = "python -B labs/blackwell/probe_scales.py";

  window.LESSON_GUIDES_LATE = {
    "5/0": guide(
      "Drag the brush in Ink Tunnel and it gives the fluid a push. Some cells can then have more flow leaving than entering. The solver uses pressure to reduce that imbalance, and the corrected velocity carries the colored dye. Today you will trace two pressure updates on a grid small enough to check by hand.",
      [
        trace("Find a cell’s neighbors from its address", [
          "Old pressure grid · width 5",
          "            7  north",
          "            |",
          "west  11 — 12 — 13  east",
          "            |",
          "           17  south",
          "",
          "new[12] uses old cells 7,11,13,17"
        ],
          "Number the cells of a five-column grid from left to right, starting at zero. The middle cell has address 12. Its west and east neighbors are 11 and 13. Moving a whole row gives 7 and 17. This fixed pattern of offsets is a stencil.",
          "A sparse matrix could store those column numbers for every interior cell. Here the row width already tells each thread which four addresses to read."),
        section("Give every cell the same snapshot",
          "For the positive five-point operator, the equation at one interior cell reads “four times its pressure, minus its neighbors’ pressures, equals the source.” If the old neighbors sum to 2 and the source is 6, the new pressure there is (2 + 6) / 4 = 2.",
          "During a Jacobi sweep, every thread reads the old pressure array and writes one entry in the new array. Only after the sweep do the arrays exchange roles. This limits how far information from a new source can travel in one sweep.")
      ], [
        step("Trace two sweeps on paper", ["Draw the initial pressure grid and two blank 5 × 5 grids labeled sweep 1 and sweep 2. All initial pressures are zero. The source is 4 at the center and zero everywhere else, and it stays the same for both sweeps. Keep each outer ring at zero.",
            "Apply the update from Learn the idea at each interior cell, reading pressures only from the preceding grid. Beside each finished grid, write its center, north, east, south and west values in that order. Step 3 prints the same five cells."]),
        step("Run the installed pressure solver", "Here `poisson 65 49 20` means a 65-column, 49-row grid evolved for 20 Jacobi sweeps. It contains two sources of opposite sign. The paper grid has just one positive source. In `labs/compute/other_labs.cuh`, follow `run_poisson` to `make_dipole` and compare the source locations and the treatment of the outer ring. The next Python worksheet uses your 5 × 5 drawing for an exact numerical check.", lab+" poisson 65 49 20", "The heading identifies a pressure dipole. Each variant reports its agreement with a CPU reference and its remaining equation residual."),
        {title:"Check two pressure sweeps against your drawing", body:["This small Python program runs on the CPU. Its expected grids were worked out in advance, so it can catch mistakes without borrowing answers from the GPU."], actions:[
          step("Run the starter", "Use the same Course PowerShell window. Look for a case that passes even though the update still writes zero. Compare the reported center value with your first drawing.", "python -B labs/flow/pressure_oracle.py", "Look for a PASS or TRY beside each case. A TRY identifies a coordinate and prints the value that the starter produced there alongside the expected value."),
          step("Finish one cell update", "In `jacobi_sweep`, find the STUDENT line `new[i] = 0.0`. The loop has already added the four old neighbors into `neighbors`. Use that sum and the source at this cell, `rhs[i]`, to solve the five-point equation for the new center pressure. Save with Ctrl+S.", ".\\Edit-CourseFile.ps1 .\\labs\\flow\\pressure_oracle.py"),
          step("Test a second sweep and a different source", "Rerun the check. It compares every cell and prints five values from each center-source sweep. Match those values to the center, north, east, south and west cells in your drawings. A rectangular case with a negative source checks the sign and the stride between rows. Save one observed value from each sweep.", "python -B labs/flow/pressure_oracle.py", "Look for PASS on every case. Compare the two five-value printouts with your paper grids. If an entry differs, revisit its four neighbors on the preceding grid.", "For source 4, the first five values are [1, 0, 0, 0, 0]. The second five are [1, 0.25, 0.25, 0.25, 0.25]. The center reads its old neighbors on each sweep."),
          step("Export and view the GPU dipole", "Run these lines in Course PowerShell. The native solver writes the 65 × 49 pressure field as an image. The final line opens a magnified copy with Python’s Tk viewer. Record the printed pressure range and label the two lobes and the zero level. Close the image to return to PowerShell.", "$picture = Join-Path 'build' ('pressure-' + [guid]::NewGuid() + '.pgm')\n"+lab+' poisson 65 49 20 $picture\n'+"python -c \"import sys, tkinter as tk; window=tk.Tk(); picture=tk.PhotoImage(file=sys.argv[1]).zoom(4,4); tk.Label(window,image=picture).pack(); window.mainloop()\" $picture", "The program prints the image path and pressure range. The light and dark regions correspond to opposite signs.")
        ]},
        step("Connect pressure to moving ink", ["Imagine storing one sparse-matrix row per interior cell of a 256 × 256 grid. Each row lists the center and four neighbors. Calculate how many column IDs the interior rows alone would store. Say whether your count includes any outer-ring equations.",
            "Then drag through the dye in Ink Tunnel and press D to change the displayed field. In labs/flow/flow.cu follow right_hand_side, project and advect_dye. Pick a left-edge cell. Sketch where the viewer finds its west neighbor and how the fixed outer ring in your paper example treats that location."], flow)
      ], "The pressure worksheet opens on a whole solver project. Use the first update to check your four neighbors and the zero border. Return here for the two paper sweeps and the CPU check. Day 2 introduces the halo, and Day 3 measures time to a residual target."),
    "5/1": guide(
      "When adjacent threads update pressure, they ask for many of the same cells. A block can load a patch once into shared memory. Before changing the kernel, count the extra cells that patch has to include.",
      [
        trace("Draw the patch outside the patch", [
          ". H H H H .     I  output cell",
          "H I I I I H     H  halo pressure",
          "H I I I I H     .  unused corner",
          "H I I I I H",
          "H I I I I H     16 outputs",
          ". H H H H .     16 halo cells"
        ],
          "A 4 × 4 block produces 16 outputs. Its four edges each need four old pressures just beyond the block, adding 16 values. A 6 × 6 rectangle holds all 32 needed positions and four unused corners. That border is the halo.",
          "Loading the rectangle and synchronizing costs time. Count input pressure reads separately from source reads and output writes. A count of requested loads does not measure the traffic that reaches DRAM."),
        section("Follow a second update across a seam",
          "For an output at the left edge, sweep two reads the first-sweep cell immediately to its left. That first-sweep cell needed an old value two positions left of the output. A two-sweep kernel therefore needs older data beyond a one-cell halo.",
          "Try an odd grid width. The last block still needs every participating thread at the shared-memory barrier even when some threads have no final output to store.")
      ], [
        step("Make a halo-cost table", ["For each output-tile width T = 8, 16 and 32, draw one interior tile. Assume each output uses the old pressure at its center and four immediate neighbors. Count the output cells, the distinct old-pressure cells they use together, and the slots in the smallest rectangular patch that holds them. Explain any difference between the last two counts.",
            "Count only pressure values in this table. The standalone Jacobi update separately reads a forcing value and uses four neighboring pressures."]),
        step("Find the actual loads", ["In labs/compute/solutions.cuh, locate poisson_shared. For tile width 16, follow the thread with local coordinates (0,0) through its first two passes of the load loop. For each pass write the destination in the shared patch and the old grid coordinate it tries to read.",
            "Use the top-left block to decide whether each read takes a value from the grid or supplies zero. Mark where all threads wait before consuming the patch. Later you will edit Ink Tunnel’s kernel, which wraps its coordinates at the grid edges."], ".\\Edit-CourseFile.ps1 .\\labs\\compute\\solutions.cuh"),
        step("Test incomplete blocks", "Run both grid sizes with the same sweep count and source-generation rule. Record the global Jacobi and shared halo medians and their CPU comparisons. The source field is regenerated for each size.", lab+" poisson 33 19 20\n"+lab+" poisson 257 129 20", "The two shapes include partial blocks. Each variant must pass the reference check."),
        step("Stage one pressure sweep in shared memory", ["In labs/flow/student.cuh, change how student obtains the old pressures for one sweep of a 16 × 16 output tile. Keep STUDENT_SPAN at 1 and preserve the periodic boundary rule and the existing numerical update. Use your halo drawing to decide the shared-array dimensions and which values each lane will load.",
            "Before coding, trace a worker whose output falls beyond a partially covered grid edge. Explain what shared data a valid neighbor might still need from that worker.",
            "Save, run the checks, then compare the student and baseline pressure_p50_ms at the same sweep count. The last two runs also exercise the supplied fused implementation. In solver.py find what it does when seven sweeps are requested."], ".\\Edit-CourseFile.ps1 .\\labs\\flow\\student.cuh\n.\\Edit-CourseFile.ps1 .\\labs\\flow\\flow.cu\n"+flow+" --check\n"+flow+" --bench --sweeps 7\n"+flow+" --bench --sweeps 8", "The checks exercise 0, 1, 2, 7 and 34 sweeps, including partial tiles. The original student code already passes them. Sketch or quote the load you replaced, show which outputs reuse it, and record the GPU pressure times for your edit. A measured slowdown is a valid result.")
      ], "In the stand-alone solver, follow `poisson_shared` through one halo load and one barrier. Then return here for the two partial-block runs. Your own edit goes in Ink Tunnel’s `student.cuh` and computes one sweep. The supplied two-sweep version is your comparison."),
    "5/2": guide(
      "A solver can finish a fast sweep while leaving most of the pressure equation unsatisfied. Today you will price the solution by the time needed to reach an accuracy target.",
      [
        section("Put the guess back into the equation",
          "A residual is the work left over when you substitute a guess into the equation. Take a scalar equation 4p = 6. At p = 1 the residual is 6 − 4 = 2, whereas the distance to the exact p = 1.5 is 0.5. Those are different quantities with different units.",
          "For a grid, compute b − Ap at each cell, combine those entries with a Euclidean norm and divide by the norm of the nonzero source b. A relative residual of 0.1 says the remaining equation mismatch has one tenth the norm of the source."),
        section("Read a time-to-target experiment",
          "Imagine measured residuals of 0.12 at 16 sweeps and 0.08 at 32, with a target of 0.10. The measurements bracket a crossing. Try intervening counts and verify the one immediately before the crossing. A 32-sweep time already includes all 32 sweeps.")
      ], [
        step("Separate the two errors by hand", "Use A = [[2,−1],[−1,2]], b = [1,0] and the guess p = [0.5,0]. In one column compute Ap, subtract it from b, then find the length of that difference vector. In a second column solve Ax = b for x, subtract p from x and find that length. Use the Euclidean length in both columns. Which column can you compute on a new problem when you have only A, b and the guess?"),
        step("Record a sweep history", "For each sweep count below record the final relative residual and whole-solve median in milliseconds for each variant. Use these samples to choose one target within the observed range.", "foreach ($n in 1,4,16,64,256) { "+lab+" poisson 65 49 $n }", "The line labeled solver ||b-Ap||/||b|| is the remaining residual. The printed error against the CPU compares two implementations after the same number of sweeps."),
        step("Find the first count that passes", ["Pick two measured sweep counts whose residuals fall on opposite sides of your target. Keep the source and grid fixed. Try each integer count between them until you find one at or below the target.",
            "Save two neighboring rows showing a miss and a pass, along with the solve time for each variant at the passing count. Describe this as the first crossing within the interval you checked. A claim about all counts needs evidence from earlier counts too."]),
        step("Change the grid and label the boundary", ["Use at least one sweep count that you already measured on the 65 × 49 grid and repeat it on a 130 × 98 grid. The command below uses 64 sweeps. Record what happens to the residual and solve time. Unit grid spacing means the new grid also changes the domain and source locations.",
            "Separately, compare the baseline rows of the two Ink Tunnel runs. Record rms_div_before and rms_div_after at 7 and 8 sweeps. These runs use the same number of simulation steps and periodic edges."], lab+" poisson 130 98 64\n"+flow+" --bench --frames 5 --sweeps 7\n"+flow+" --bench --frames 5 --sweeps 8")
      ], "Use the pressure worksheet for the residual definition. Bring the threshold and timings for the two existing solvers back to your sweep history. Its red-black Gauss–Seidel implementation is an optional new project."),
    "5/3": guide(
      "A velocity field can carry more fluid out of a cell than comes in. Pressure projection adjusts the face velocities. The same pressure difference must repair the flow budget on both sides of a shared face.",
      [
        section("Balance two neighboring flow budgets",
          "Picture two boxes with a closed wall at either end. The shared face carries one unit to the right. With divergence defined as outflow on the right minus inflow on the left, the budgets are +1 in the first box and −1 in the second.",
          "Subtract a pressure gradient of +1 on that face and its velocity becomes zero. Adding five to both pressures leaves their difference unchanged. Fixing a mean pressure gives one representative among equivalent solutions."),
        section("Make the pressure check predict the velocity check",
          "Let D compute the cell divergence from faces, and G compute a pressure difference at each face. After correction, D(u* − Gp) equals Du* − DGp. This identity gives an independent diagnostic when the same indexing and boundaries are used throughout.",
          "A fluid crossing the right edge of a periodic domain re-enters at the left edge. An index error there can spoil the identity even if the central cells look correct.")
      ], [
        step("Label the shared face", "Draw two cells side by side and write 0, 2 and 0 on the left wall, shared face and right wall. Positive means flow to the right. For each cell subtract the velocity at its left face from the velocity at its right face. Label the two resulting numbers as its divergence before projection."),
        step("Solve for a pressure difference", "Call the cell pressures pL and pR. Use unit spacing. Correct the shared-face velocity by subtracting (pR − pL) from it. Find the two pressures that make the corrected velocity zero and satisfy pL + pR = 0. Write the corrected divergence in each cell. Now add 10 to both pressures and repeat the shared-face calculation. What changed?"),
        step("Wrap eight cells into a ring", "Paste this block into Course PowerShell. u[i] is the face on the right of cell i. For cell 0, identify both faces used by div[0], including the one Python names u[-1]. Save the two peak values it prints. Predict which peak will change if you replace range(80) with range(8), then rerun and compare. The lines starting and ending the block send it to Python.", [
          "@'", "u = [2.0] + [0.0] * 7", "n = len(u)", "div = [u[i] - u[i-1] for i in range(n)]", "p = [0.0] * n",
          "for sweep in range(80):", "    j = [(p[i-1] + p[(i+1) % n] - div[i]) / 2 for i in range(n)]",
          "    p = [(old + 2*new) / 3 for old, new in zip(p, j)]",
          "v = [u[i] - (p[(i+1) % n] - p[i]) for i in range(n)]",
          "print('Peak divergence before:', max(abs(x) for x in div))",
          "print('Peak divergence after: ', max(abs(v[i] - v[i-1]) for i in range(n)))", "'@ | python -B -"
        ].join("\n"), "The initial peak is 2. The corrected field has a much smaller peak; inspect both values before changing the sweep count."),
        step("Watch the projected field", ["Drag through the ink, release, then press Space. Wait for `FROZEN` in the status line and copy the pair labeled `RMS divergence`. The left value is before pressure correction and the right value is after.",
            "Press ] once to add two sweeps and copy the new pair for the same frozen input. D changes the field displayed.",
            "The ring script reported the largest absolute divergence in any cell, while the viewer averages squared divergence over the grid and takes its square root. Explain the change within each experiment."], flow+" --check\n"+flow)
      ], "Use the projection section to identify the two divergence readings in Ink Tunnel. Once you have the before/after pair at each of two sweep settings on one frozen field, return to your eight-cell comparison. The vortex experiment is Day 5."),
    "5/4": guide(
      "Here you know exactly how a smooth vortex component should decay. Use that known answer to decide whether a finer simulation becomes more accurate at the same physical time.",
      [
        section("Read a velocity at one point",
          "On the periodic square of side 2π, use u(x,y) = sin(x) cos(y) and v(x,y) = −cos(x) sin(y). At (3π/2, 0), the horizontal component is (−1) × 1 and the vertical component is zero. The arrow points left. In the divergence, ∂u/∂x and ∂v/∂y cancel. For each component, both second spatial derivatives are the negative of that component. Diffusion with viscosity ν therefore multiplies its amplitude by exp(−2νt).",
          "A velocity amplitude reduced to one half gives one quarter of the initial kinetic energy. That square matters when you label the vertical axis."),
        section("Refine the same physical experiment",
          "The script evolves the first velocity component under diffusion and compares it with its known field at t = 1. Doubling the grid width halves the spacing. At fixed νΔt/h² this also quarters the nominal time step.",
          "If RMS errors on two such grids were 0.004 and 0.001, their ratio would be 4 and the observed order would be log₂(4) = 2. Use the errors in your own run for the report.")
      ], [
        step("Predict the field at three points", ["On a square from 0 to 2π in each direction, mark (0,0), (π/2,0) and (0,π/2). For each point evaluate u and v at time zero using the formulas above. Draw an arrow or mark a zero vector.",
            "Use symmetry to sketch the direction of rotation in each region. Show the derivatives that give the divergence and the sum of the second spatial derivatives of each component. Keep the sketch for comparison with the decay calculation."]),
        step("Predict the decay, then run the simulation", "For ν = 0.1 and t = 1, calculate the fraction of the starting amplitude that should remain, then the fraction of the starting energy. Check your two numbers here before running the script. Its first output line prints the analytic ratios. In diffuse, identify the four periodic neighbors. In experiment, find the shortened final step that stops both grids at the same time.", vortex, "Read the analytic ratios above the table. Each row below records a simulation and its RMS error against the known field."),
        step("Vary space and time separately", "With N = 32, predict how the RMS error will change when α falls from 0.2 to 0.1, then run the command. Compare the two 32-wide cases. Next compare the 32- and 64-wide rows within one run. Which pair held the spatial spacing fixed?", vortex+" --sizes 16 32 64 --alpha 0.1"),
        step("Read the research claim on its own terms", "Open the linked research article and read the abstract of its paper. Make two notebook entries. For the paper, name the dimension, the forcing assumptions and the mathematical result claimed. For your script, name the dimension, the equation it steps forward and the error you actually measured. Finish with one claim your table supports and one research question that this run cannot settle.")
      ], "In the vortex section, follow one periodic neighbor lookup and the shortened final time step in the CPU script. Return here with the two grids’ errors. The abstract supplies the assumptions for your last comparison."),
    "6/0": guide(
      "Treat a small piece of cloth as points joined by stitches. Start with just two points. If they end up too far apart, how much should each move to bring the stitch back to its resting length?",
      [
        section("Share a length correction",
          "Suppose a stitch rests at length 3 and now measures 5. Two units of length must come out of it. With equal masses, move each endpoint one unit toward the other along the line of the stitch. A compressed stitch has the opposite sign and needs to push the endpoints apart."),
        section("Use inverse mass as permission to move",
          "Inverse mass is one divided by mass. If the inverse masses are 3 and 1, the first endpoint takes three quarters of the correction and the other takes one quarter. A pinned endpoint has inverse mass zero.",
          "A vertex in the knit belongs to several stitches at once. The native solver gathers their proposed corrections, averages them and relaxes the result. Your two-point example is an exact check on one constraint.")
      ], [
        step("Work three versions of one stitch", "Let endpoint a start at x = 0 and b at x = 3. The rest length is 2. In three rows use the inverse-mass pairs (1,1), (0,1) and (1,0.5). A zero inverse mass pins a point. Draw the two endpoint movements in each row and compute their new x positions. The CPU worksheet below reports a and b in that order, with y = 0 throughout these three cases."),
        step("Try a pull near a support", ["Open the browser swatch from the Workbench. Leave Brush on Pull. The pale dots along the top are pins. Drag a point just below one of them sideways, release, and press Reset mesh.",
            "Drag a point near the center about the same distance. Which nearby stitches stretch in each case? Save one observation per pull. Return to this lesson for the native swatch in the next step. You’ll come back for the cutting brush on Day 4."]),
        step("Locate the state on the GPU path", ["Launch the native swatch, press D to see fractional stretch, and right-drag a free vertex. Close the viewer before the CPU worksheet.",
            "Open labs/knit/physics.py and find Mesh.__init__. For one horizontal edge and one diagonal edge, record the endpoints and how the code sets their resting distance. In labs/knit/cloth.cu, find where contribution uses that resting distance and where corrected writes a new position. Explain why a long diagonal and a shorter horizontal stitch can both look unstretched."], knit),
        {title:"Check one stitch before combining many", body:["Run the isolated two-point calculation on the CPU. It compares the returned endpoint positions with answers worked out separately, including your equal-mass and pinned drawings."], actions:[
          step("See which inputs expose the starter", "Run the command in Course PowerShell. Read the cases for two pins, coincident endpoints, a resting stitch and a stretched stitch. Which cases could pass even if both endpoints stayed where they started?", "python -B labs/knit/edge_oracle.py", "Some cases pass immediately. An overstretched free stitch reports a mismatch."),
          step("Give the correction a size and a share", "Open project_edge in labs/knit/edge_oracle.py. Change the two STUDENT expressions, stretch and share_a. The supplied code already knows the unit direction from a to b and applies the two endpoint shares. Use your three paper cases to decide what the signed length correction should be and what fraction belongs to endpoint a. Your choices must also move compressed endpoints in the right directions and keep a pinned endpoint fixed. Save with Ctrl+S.", ".\\Edit-CourseFile.ps1 .\\labs\\knit\\edge_oracle.py"),
          step("Compare positions with the hand calculation", "Rerun the checks. For the stretched case, verify both changed positions and the final distance. Read the guard for coincident points and explain why choosing a direction would require more information. Save the eight check results. Choose one compressed or diagonal case and explain its motion in your notes.", "python -B labs/knit/edge_oracle.py", "All eight cases should pass. For the three cases from your drawing, compare the program’s a and b coordinates with your own and check their separation. A passing test on a pinned pair alone would also be possible with the untouched starter.", "For rest length 2 and endpoints at 0 and 3, equal masses finish at 0.5 and 2.5. If the left point is pinned, the endpoints finish at 0 and 2. With inverse masses 1 and 0.5 the positions are 2/3 and 8/3.")
        ]}
      ], "Use the browser swatch for two pulls, one beside a pin and one in the interior. Return after you’ve compared the stretch. The native swatch comes next in step 3. Cutting and comparing brush searches come on Day 4."),
    "6/1": guide(
      "Two threads fixing two different stitches can both try to move the same vertex. You will trace the collision on a chain, then compare two ways of assigning responsibility for each write.",
      [
        trace("Follow two proposed writes", [
          "rest length = 2 for both edges",
          "old x             0     3     5",
          "left-edge move  +0.5  −0.5     ·",
          "right-edge move    ·    0     0",
          "",
          "If the left edge writes first:",
          "right edge now sees 5 − 2.5 = 2.5"
        ],
          "Consider equally weighted points at x = [0, 3, 5], with both rest lengths 2. The left edge would move the middle point left by 0.5. The right edge initially asks for no movement. If the left move happens first, the right edge now sees a separation of 2.5 and requests a correction. The state a thread reads changes the problem it solves."),
        section("Choose an owner or a schedule",
          "In a Jacobi gather, the thread owning the middle vertex reads a frozen array of old positions. It gathers contributions from incident active edges and writes a single new position. The next sweep exchanges input and output buffers.",
          "With edge coloring, edges of one color have disjoint endpoints and can update in place together. Colors run in sequence. Two methods can both avoid a race while producing different trajectories, so check positions and strain after equal numbers of sweeps.")
      ], [
        step("Trace one simultaneous and one sequential update", "For this trace all three points are free and equally massive. Start from x = [0, 2, 4] with both rest lengths 1. Using the original positions, write the two opposite corrections from each edge. Add the two proposed moves at the middle point. Now restart from [0, 2, 4], apply the left correction immediately and calculate the right correction using the new positions. Compare the middle point’s final x in the two traces."),
        step("Trace a center vertex in the baseline", "In labs/knit/cloth.cu, find baseline. Choose one free center vertex. Write down which array contains its neighbors’ old positions, where its own updated position is stored, and what changes when the same thread owns a pin. Trace one attached edge through contribution and then corrected. In the viewer, pull a point below a fixed support and watch both points. Close the viewer and add one observation consistent with the pin branch.", ".\\Edit-CourseFile.ps1 .\\labs\\knit\\cloth.cu\n"+knit),
        step("Check and compare from the same starting state", ["The first command compares each kernel with the scalar calculation after six sweeps. The second compares the supplied paths on a 3 × 3 mesh after one sweep. Copy `max_pin_drift`, the largest distance a pinned vertex moved from its starting position.",
            "In the third command there are five warm-up steps and nine timed steps per mode. From the student row copy `max_position_delta` (largest final distance from baseline at a matching vertex) and `rms_strain` (fractional stretch or compression of surviving edges, combined by RMS)."], knit+" --check\npython -B labs/knit/compare_patch.py --gpu --case intact\n"+knit+" --bench --frames 9", "In the intact patch, max_pin_drift should be zero. In the benchmark, record the per-mode positional difference and strain at the final step."),
        step("Find a conflict the coloring missed", ["Draw a 3 × 3 patch and number its vertices row by row, starting at 0. Include both diagonals in each square. Color an edge blue if the smaller of its two endpoint IDs is even and orange otherwise.",
            "Start with edge 0–4. Can you find a different edge of the same color that touches 0 or 4? Report both endpoint pairs, the shared vertex, and which stored position two threads would try to change at the same time. This one example tests whether a color can run in parallel."])
      ], "The local-gather worksheet also contains tomorrow’s edit. Today, follow the old positions and single new position for one vertex. Use `reference_sweep` to check your drawing, then return to the intact-patch comparison."),
    "6/2": guide(
      "The baseline tests every edge just to find the few constraints attached to one vertex. A knit’s regular layout gives each vertex a short list of edge IDs. You will change where the solver looks while preserving which stitches pull.",
      [
        trace("Read one row of the incident table", [
          "slot       0    1    2    3 … 7",
          "edge ID    2    3    7      −1",
          "active?   yes   no  yes      ·",
          "action    use skip  use   skip",
          "",
          "Both endpoints read active[3]."
        ],
          "Suppose a corner’s row contains edge IDs 2, 3, 7 followed by five −1 entries. Slot 1 refers to edge 3. If edge 3 is cut, both endpoints consult active[3] and skip it. A −1 slot means there was never an edge at that position.",
          "Check the sentinel before using it as an array index. Keep the original ascending edge order so your change preserves how floating-point additions are grouped."),
        section("Predict scaling before chasing milliseconds",
          "On a 3 × 3 patch, six horizontal, six vertical and eight diagonal links give 20 undirected edges. The exhaustive traversal considers 9 × 20 = 180 vertex/edge pairs per sweep before accounting for pins and early exits. Eight slots per vertex cap that count at 72.",
          "That is a count of candidate checks. Predicting, tearing, integrating and displaying the swatch have other costs. Measure the fixed simulation step separately.")
      ], [
        step("Draw the shared edge IDs", ["Number the nine vertices row by row from 0 to 8. Include horizontal, vertical and both diagonal connections between neighboring vertices. List the neighbors of vertex 0 (corner), 1 (top edge) and 4 (center).",
            "Then run the command. Each output row starts with a vertex ID. Each following pair gives an edge ID and the two vertex IDs that edge joins. Find the edge joining 0 and 4 in both rows and explain why it has the same ID."], "@'\nimport sys\nsys.path.insert(0, 'labs/knit')\nfrom physics import Mesh\nmesh = Mesh(3, 3)\nfor vertex in (0, 1, 4):\n    print(vertex, [(edge, mesh.edges[edge][:2]) for edge in mesh.incident[vertex]])\n'@ | python -B -", "Compare your three hand-drawn neighbor lists with the printed endpoint pairs. Circle the same diagonal in the two rows that share it.", "Vertices 0, 1 and 4 have 3, 5 and 8 neighbors respectively. The shared diagonal carries the same original edge ID from either endpoint."),
        step("Give one thread eight lookups", ["In the student function in labs/knit/student.cuh, change how the thread for vertex i finds its attached edges. Give it at most eight candidates even on a large mesh. Use the table from your drawing. Decide how to recognize an unused slot and a cut edge, and how to find the edge ID that both endpoints share.",
            "Keep the existing pin behavior, contribution calculation, accumulation order and final position update. Save, then press R in the viewer to compile and select your edit."], ".\\Edit-CourseFile.ps1 .\\labs\\knit\\student.cuh\n"+knit, "R recompiles the saved CUDA and selects the student implementation."),
        step("Check cuts and boundary vertices", "Close the viewer. The first command tests your saved student kernel. The two `compare_patch.py` commands examine the supplied baseline and gathered kernels on smaller meshes. They start with the same displaced center vertex. In `cut`, both kernels skip the edge from vertex 4 to vertex 8. Compare baseline with gathered within each run for correctness. Then compare strain across intact and cut to see what the cut did to the material.", knit+" --check\npython -B labs/knit/compare_patch.py --gpu --case intact\npython -B labs/knit/compare_patch.py --gpu --case cut", "Both fixtures should report an empty list of mismatched vertices and edge IDs. The ordinary knit check also exercises your student implementation."),
        step("Measure how the neighbor search scales", "Before running, estimate how many candidate edge checks one sweep of each search would attempt on each mesh. State whether your estimate counts pinned vertices and unused slots. Then compare the baseline and student rows within each run. Save the mesh dimensions, vertices, edges, step_p50_ms and max_position_delta. Does the timing change as much as your estimate of work? Use the whole-step timing to explain why those changes might differ.", knit+" --bench --cols 16 --rows 20 --frames 9\n"+knit+" --bench --cols 32 --rows 40 --frames 9")
      ], "Use the local-gather section for today’s eight-slot edit. Finish the comparison on the two mesh sizes in the exercise. You’ll change when edges break on Day 4 and compare the resulting edge IDs on Day 5."),
    "6/3": guide(
      "A knit can change shape because a thread moved a vertex or because a stitch actually broke. You will distinguish these two events, then change a fracture threshold while keeping the comparison repeatable.",
      [
        section("Turn distance into a material decision",
          "A stitch growing from 10 to 12 has extended by 2 units, or 20 percent of its rest length. A 20-unit stitch growing by the same 2 units has extended by 10 percent. Strain is dimensionless, so one threshold can apply to different rest lengths.",
          "With a strict greater-than rule, equality leaves the edge intact. Compression shortens the edge. The tensile fracture test considers overstretch, while the display can color the magnitude of deformation."),
        section("Find the instant the two simulations separate",
          "The native step predicts positions, checks whether stretched edges break, then runs constraint sweeps using the surviving edges. A break changes the constraints available on the next sweep. Two configurations that cross the threshold on different steps can separate from then on.",
          "Match the initial state, time step, number of solver sweeps and step count before attributing a change to the choice of CUDA kernel.")
      ], [
        step("Decide which stitch breaks", "Use two stitches. Stitch A grows from resting length 2 to length 2.5. Stitch B grows from resting length 4 to length 4.5. For each one, record the change in length, that change as a fraction of its own resting length, and your decision under a strict 20% tensile threshold. Then predict what happens to a third stitch whose fractional increase is exactly 0.20."),
        step("Cut a paused patch", ["Open the native viewer, press Space and left-drag once to cut. Record the cuts count, then resume and press D to see strain redistribute. Find Mesh.cut and Mesh.strain in physics.py and close the viewer.",
            "Now open the browser’s Fabric brush from the Workbench. Pause the swatch if it is moving, press Cut center once, then Compare both searches. It tries both search methods on the same brush positions. Record whether they find identical hits and how many candidates each tests. Return to this lesson for the tension-driven tear."], knit),
        step("Exercise a controlled tear", "Open checks() in knit.py and find the 2 × 2 tensile fixture. Predict the fate of an edge exactly at threshold, a compressed edge and an overstretched edge. Run the check, then launch the viewer. Press T, right-drag a free point and release it. Close the viewer before timing.", ".\\Edit-CourseFile.ps1 .\\labs\\knit\\knit.py\n"+knit+" --check\n"+knit),
        step("Compare histories at matching steps", ["Each command starts a fresh mesh and takes five warm-up steps. For 1, 5 and 9 timed frames, record the baseline row at total steps 6, 10 and 14. At each step put the 1% and 60% thresholds side by side. Compare broken_edges (all breaks so far) and rms_strain (strain on edges still intact).",
            "If the break totals first differ between two samples, try the frame counts in that interval. If they already differ at step 6, write “by step 6.” If they agree throughout, report the last step checked."], "foreach ($strain in 0.01,0.60) { foreach ($frames in 1,5,9) { "+knit+" --bench --frames $frames --tear-strain $strain } }")
      ], "Use the browser brush to compare two ways to find an edge under the cursor. Use the native knit for the separate experiment on breaks caused by tension. Return with the first sampled step where the two thresholds give different break totals."),
    "6/textile": guide(
      "A tear made with your mouse ought to stay on the same stitch when you rotate the form. In Selvedge you will follow that point from the screen into the material, then shorten the search for the visible surface.",
      [
        section("Remember a place on the fabric",
          "A screen coordinate identifies a pixel in this view. The camera ray through that pixel first finds the curved form. At the hit, u and v identify the location along the weave. After an orbit, a different pixel can see that same u,v pair.",
          "Find a printed calibration mark near your split. If the split stays beside the mark from two camera angles after release, you have visible evidence that the tear is attached to the material."),
        section("Use different evidence for an edit and a gesture",
          "The student traversal initially visits every group of curved sections. If a group’s enclosing box is missed, its detailed intersections cannot beat the current hit. Try the edit while a tear is visible and check whether the same stitch is still exposed.",
          "A hand pull tests interaction over time. The fixed command-line strain gives every benchmark run the same shot. Keep both records and label which evidence supports each claim.")
      ], [
        step("Follow one tear through an orbit", "Launch the specimen at strain 0.15 and press Space. Left-drag a stitch a little, release, then pull farther until it splits. Click Save current pass in Beauty and choose a filename. Note a nearby calibration mark. Right-drag to orbit, save under a second filename and use the mark to identify the same split. Close the viewer before timing.", "python -B labs/nightshift/nightshift.py --scene textile --width 640 --height 360 --time 2 --features 7 --samples 4 --control 0.15"),
        step("Time a reproducible starting shot", "Run the fixed strain-0.53 benchmark below on the untouched student kernel. Save the reference and student GPU medians and the shot settings. Label your images as a hand-made tear and these timings as the fixed shot."),
        step("Reject unreachable groups", ["In labs/nightshift/textile.cuh, find studentVisit. It currently returns true for every group, so the ray always reaches the detailed section tests. Replace that decision. A false result skips every strand in the group. It is safe only when you can rule out a closer hit anywhere in that group. Use the box, the ray and the distance of the closest hit so far to decide when skipping is safe.",
            "Save your edit. Relaunch the viewer using step 1, make a split and press R to reload with the split in view. Compare Work in modes 1 and 3, then orbit and press V. Close the viewer before benchmarking."], ".\\Edit-CourseFile.ps1 .\\labs\\nightshift\\textile.cuh"),
        step("Check interaction and pixels, then measure", "Run the checks below. The `PASS textile pick` line covers stretch, persistence, orbit, reload and reset. The CSV times a separate fixed shot at strain 0.53. Import the full `Notebook CSV` path ending in `textile-after.csv`. To measure your edit, compare the `student` row’s `gpu_p50_ms` before and after at those fixed settings. Use your two hand-pulled views to show that a tear stayed attached to the same stitch."),
        step("Explain what was torn", "Put the two photos of your split side by side and point to the same stitch relative to its nearby calibration mark. Then contrast what the knit solver records when an edge breaks with what this renderer remembers after your mouse pull. Give one fixed-shot GPU timing pair and the pixel check for that same shot. Which observation actually supports the claim that the cut followed the fabric as you rotated the form?")
      ], "The benchmarking protocol covers four scenes. Look up the GPU and host timing definitions there, then use this lesson’s Selvedge commands for the fixed shot. The two views of your hand-pulled tear come from the live textile viewer."),
    "6/4": guide(
      "Two simulations can finish with similar pictures even though one ignored a stitch. You will build a comparison that can expose a missing constraint and show whether your faster traversal preserves the simulated material.",
      [
        section("Give each failure a measurement",
          "Compare positions vertex by vertex. If exactly one of four vertices moves 0.02 units relative to the reference, the RMS position difference is 0.01. If that vertex is a pin, maximum pinned drift is 0.02. The two measures answer different questions.",
          "Also compare the active flag for each edge ID. Two runs can both report three breaks yet disagree on which three edges broke. Find the first differing step before looking at the final frame."),
        section("Make a missing edge do observable work",
          "A missing stitch already at rest contributes no correction. Stretch a tiny patch along the omitted diagonal, step the correct and modified versions once from identical positions, then compare the two endpoints. That fixture can reveal a defect a long resting benchmark misses.")
      ], [
        step("Time two materials under matched conditions", "Run the default intact material and a low tear threshold. For each setting compare modes using the same resolution, fixed steps and sweep count. Keep the viewer’s frame time in a separate row from the benchmark’s whole-step GPU time.", knit+" --bench --frames 9\n"+knit+" --bench --frames 9 --tear-strain 0.01"),
        step("Calculate three comparison metrics", ["Assume reference and candidate both have three vertices. One free vertex differs by (0, 0.03, 0) and the other two positions match, including the pin. For an RMS position difference, square each vertex’s distance, average over all three vertices, then take a square root. Compute that value and the largest movement of any pin.",
            "Separately compare the active-edge flags [1,0,1] and [1,1,0] slot by slot. How many original edge IDs disagree? Write your three answers before opening the 3 × 3 fixture, which uses different data."], ".\\Edit-CourseFile.ps1 .\\labs\\knit\\compare_patch.py\npython -B labs/knit/compare_patch.py --gpu --case intact", "The fixture prints rms_position_delta, max_pin_drift and differing edge IDs. Identify which result corresponds to each of your three hand calculations.", "The three-vertex example gives an RMS distance of 0.03 / √3 and zero pin drift. Two flag positions differ even though each mask contains one zero."),
        step("Show that the comparison fails when it should", "These three runs test the checker itself. In `omit`, the candidate drops one edge lookup at vertex 4. In `swap`, the two meshes each have one cut, but the cuts fall on different edges. For these cases, `PASS expected comparison` means the checker detected the planted discrepancy. Record the vertex or edge IDs it names. In `intact`, the same PASS label means the meshes agree. Each run starts from fresh meshes.", "foreach ($case in 'omit','swap','intact') { python -B labs/knit/compare_patch.py --gpu --case $case }", "Save the lines labeled vertices above 1e-6 and differing edge IDs from each run. A seeded error earns PASS when the checker reports the expected difference. The intact run earns PASS when the two results agree."),
        step("Explain the optimization to a graphics programmer", "Write a short paragraph each for the cloth solver and the worm renderer. For each one, name a unit of work the new code avoids, how you checked that the output stayed correct, and a measured input where the advantage was small or disappeared. Give the input and timing interval for that last claim. If you did not observe a slowdown, label any proposed losing input as a prediction.")
      ], "Use the physical-error section to identify the measured time interval and the edges included in RMS strain. Then return to the intact, omitted-edge and swapped-cut fixtures. The manual’s timestep and compliance experiments are optional follow-ups."),
    "7/0": guide(
      "A GPU can finish arithmetic only as quickly as its data arrives. You will estimate both rates on your own card, then use those measurements to choose where an optimization effort is likely to pay off.",
      [
        section("Price a vector addition in bytes",
          "For C[i] = A[i] + B[i] with FP32 numbers, a thread reads two four-byte values and writes one. That buys one add for 12 useful bytes. At a hypothetical 300 GB/s, this pattern has a bandwidth-based ceiling of 300/12 = 25 billion adds per second.",
          "Caches can serve reads without a trip to DRAM. Label the bytes you counted as useful algorithm bytes. A hardware traffic counter would answer a different question."),
        section("Find where a workload changes roofs",
          "Arithmetic intensity is useful FLOPs per byte at the chosen memory boundary. Multiply intensity by bandwidth to get a bandwidth-limited rate. The lower of that rate and the compute ceiling is the roof. Dividing the compute ceiling by the bandwidth yields the intensity where the two meet.")
      ], [
        step("Identify the device and available memory", "Run both commands in Course PowerShell. Record the card, compute capability, driver, free memory and compiler version. On this course machine the 5070’s capability 12.0 corresponds to the compile target sm_120. Keep this Course PowerShell window open. Later commands reuse the scratch-folder variables that you create here.", "nvidia-smi --query-gpu=name,compute_cap,driver_version,memory.free --format=csv\nnvcc --version"),
        {title:"Measure your parallel vector add",body:["Rerun the five small correctness cases. In add_student confirm that each thread handles its own guarded index. If it still delegates the whole vector to one thread, revisit Week 1 Day 1 before timing the much larger input. Both versions can pass the small numerical checks."],actions:[
          {title:"Check and open the copy",command:"python -B labs/launch/check_now.py\n$benchDir = New-Item -ItemType Directory -Path (Join-Path 'build' ('bandwidth-' + [guid]::NewGuid()))\n$source = Join-Path $benchDir.FullName 'bandwidth.cu'\nCopy-Item -LiteralPath 'labs/launch/first_kernel.cu' -Destination $source\n.\\Edit-CourseFile.ps1 $source"},
          {title:"Increase the working set",body:["In the scratch copy’s main, set the input list to {1 << 24} if 192 MiB of device buffers fits comfortably, or {1 << 22} for 48 MiB. In the variant loop, start at 1 to run only the parallel variant.",
            "Issue one warm-up launch outside the measurement. Decide where the CUDA events belong and when the host can read the elapsed time. Time a batch of 20 launches, report average milliseconds per launch and useful GB/s, then keep the original readback and element check.",
            "For a supplied timing harness, open the example below. Replace only the single else line that launches add_student and save. Record n and the effect that cache residency could have on repeated launches."],worked:{title:"Compare or use the supplied timing block",language:"CUDA C++ · replacement for the parallel else branch",code:[
            "else {",
            "    const int trials = 20;",
            "    cudaEvent_t begin, end;",
            '    require(cudaEventCreate(&begin), "create begin");',
            '    require(cudaEventCreate(&end), "create end");',
            "    add_student<<<(n + 255) / 256, 256>>>(da, db, dc, n);",
            '    require(cudaEventRecord(begin), "record begin");',
            "    for (int trial = 0; trial < trials; ++trial)",
            "        add_student<<<(n + 255) / 256, 256>>>(da, db, dc, n);",
            '    require(cudaEventRecord(end), "record end");',
            '    require(cudaEventSynchronize(end), "finish batch");',
            "    float ms = 0;",
            '    require(cudaEventElapsedTime(&ms, begin, end), "read time");',
            '    std::printf("Parallel add: %.5f ms/launch, %.3f useful GB/s\\n",',
            "                ms / trials, 12.0 * n * trials / (ms * 1e6));",
            '    require(cudaEventDestroy(begin), "destroy begin");',
            '    require(cudaEventDestroy(end), "destroy end");',
            "}"
          ].join("\n")}},
          {title:"Compile and verify",command:"$program = Join-Path $benchDir.FullName 'bandwidth.exe'\nnvcc -std=c++17 -O2 -arch=sm_120 $source -o $program\nif ($LASTEXITCODE -eq 0) { & $program }",expected:"Record average milliseconds and useful GB/s only after the element check passes. The inherited final PASS message still mentions serial, but only variant 1 ran in the scratch copy."}
        ]},
        step("Measure an FP32 compute reference", "Find the cuBLAS FP32 timing row for the 1024 × 1024 product. Count two FLOPs per multiply-add, then divide 2 × 1024³ by the median time in seconds. Divide by one billion and compare your answer with the printed GFLOP/s. For the ridge point, divide that GFLOP/s rate by your vector add’s useful GB/s. The billions cancel, leaving FLOPs per useful byte.", lab+" gemm 1024 1024 1024"),
        step("Place the kernels on the right axes", ["Make one row for tile16 GEMM and one for one sweep of the global Jacobi kernel. For each, write your count of FP32 operations and the input and output bytes you are assuming. For the pressure row, count an interior update separately from a boundary store.",
            "Compute FLOPs per byte, the predicted roof in GFLOP/s and the measured rate from your timings. Which resource limits your model on each workload?",
            "Add a separate row for the unsigned-integer ink reduction in input GB/s and integer additions per input byte. Use hardware counters only if you intend to claim actual DRAM traffic."], lab+" poisson 257 193 1\n"+lab+" reduce 115008")
      ], "Use the vector-add source for the scratch bandwidth benchmark and the 1024³ GEMM for its cuBLAS FP32 row. Once you have useful GB/s and FP32 GFLOP/s, return to the Roofline calculation. The tiled-kernel edit in the GEMM manual belongs to Week 2."),
    "7/1": guide(
      "Digit retrieval cares about which neighbor wins. One small numerical error can matter on a close race, while a much larger change can leave a clear winner alone. Today you will measure both the arithmetic and the decision.",
      [
        section("Lose a distinction before accumulation",
          "Near 1, a number format with ten stored fraction bits has adjacent values 1 and 1 + 2⁻¹⁰. A value three quarters of the way between those two rounds up to the higher one. Multiplying those rounded inputs and summing in a wider accumulator cannot recover the missing difference.",
          "On this machine the native lab names two cuBLAS policies, FP32 and TF32 allowed. The second permits a faster reduced-precision multiply. Check the chosen kernel or profiler counters before claiming that one was selected."),
        trace("Know how far a winner can move", [
          "           score   worst shift",
          "winner     0.900 − 0.001 = 0.899",
          "runner-up  0.897 + 0.001 = 0.898",
          "                           ─────",
          "smallest remaining lead    0.001"
        ],
          "Imagine the highest two similarity scores are 0.900 and 0.897. Their gap is 0.003. If every score in the row shifts by at most 0.001, even the worst opposite-direction shifts cannot close the gap. A larger error bound would leave the outcome unresolved.",
          "Give an absolute bound near zero, where dividing by a tiny reference can exaggerate a small absolute difference. Also compare gallery IDs and their class labels. Two neighbors can depict the same digit.")
      ], [
        step("Read the two precision rows for each workload", "Each command runs several methods on the same input. For cuBLAS FP32 and cuBLAS TF32 allowed, copy the median time in ms and the errors labeled rel_L2 and max_abs. In the digit run, nearest-image label agreement counts predictions that match the true digit. Two methods could score 343/360 yet miss different queries. You will check individual predictions below. Find cublasGemmEx in labs/compute/gemm.cuh and inspect the compute type for each policy.", lab+" digits 1797\n"+lab+" gemm 1024 1024 1024"),
        step("Check a dot product that subtracts nearly equal inputs", "Use the row A = [1, 1 + 2⁻¹²] and the column B = [−1, 1]ᵀ. Calculate their dot product with the original values, then with both A values rounded to the nearest ten-fraction-bit grid point near 1. Predict which value changes. Run the CPU command to check the two results and record the absolute difference. The CPU rounding experiment is independent of which cuBLAS kernel the GPU selected.", 'python -c "x=1+2**-12; q=round(x*1024)/1024; print(x-1, q-1)"'),
        {title:"Compare the winning image for each query",body:["Use a scratch copy so the timing executable you normally run keeps its original output. The extra readout runs after GPU timing. An image ID identifies a particular handwritten sample, while its label is the digit written on it. Two neighboring images can have different IDs and both carry label 6. Keep the same Course PowerShell window open through the build and capture."],actions:[
          {title:"Create and open a separate project copy",command:"$precisionDir = New-Item -ItemType Directory -Path (Join-Path 'build' ('precision-' + [guid]::NewGuid()))\nCopy-Item -LiteralPath labs/compute -Destination $precisionDir.FullName -Recurse\n.\\Edit-CourseFile.ps1 (Join-Path $precisionDir.FullName 'compute/gemm.cuh')"},
          {title:"Print the winning class and score gap",body:["In the loop over query rows, find the line that sets nearest. Immediately after it, add one output line per row giving the method name, row number, winning image ID, its digit label and the score gap. Define the gap as the largest score in this row minus the second largest, including ties.",
            "For the parser use this field order: METHOD query=ROW image=ID label=DIGIT gap=GAP. Replace the capitalized words with values from that row. You can use that block directly for the measurement. Save before rebuilding."],worked:{title:"Show the readout in the log format",language:"C++",code:[
            "float best[2] = {};",
            "std::partial_sort_copy(first, first + n, best, best + 2,",
            "                       [](float a, float b) { return a > b; });",
            'std::cout << name << " query=" << row << " image=" << nearest',
            '          << " label=" << data.gallery_labels[nearest]',
            '          << " gap=" << best[0] - best[1] << "\\n";'
          ].join("\n")}},
          {title:"Build and search all queries",command:"$src = Join-Path $precisionDir.FullName 'compute'\n$out = Join-Path $precisionDir.FullName 'release'\n$nvcc = (Get-Command nvcc.exe).Source\n$cl = (Get-Command cl.exe).Source\ncmake -S $src -B $out -G Ninja \"-DCMAKE_CUDA_COMPILER=$nvcc\" \"-DCMAKE_CXX_COMPILER=$cl\" \"-DCUDAToolkit_ROOT=$env:CUDA_PATH\" -DCMAKE_CUDA_ARCHITECTURES=120 -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF\nif ($LASTEXITCODE) { throw 'Configuration failed.' }\ncmake --build $out --parallel\nif ($LASTEXITCODE) { throw 'Build failed.' }\n$log = Join-Path $precisionDir.FullName ('rankings-' + [guid]::NewGuid() + '.txt')\npython -B labs/compute/compare_rankings.py $log --capture (Join-Path $out 'compute_lab.exe')",expected:"Look for 360 matched query IDs, separate counts for changed winning images and changed predicted labels, and the five smallest reference gaps. Keep the printed log path for Day 5. A zero change count is a valid result."}
        ]},
        step("Decide what loss you can accept", "Write the largest absolute error, relative error and number of changed digit labels you would accept for this comparison. Apply those limits to your two precision rows and say which policies pass. Find the check for nonfinite outputs in gemm.cuh. If you have profiler evidence identifying a tensor instruction or active pipeline, record it. Otherwise describe the run as “TF32 allowed,” which is the policy the program requested.")
      ], "Use the digit worksheet to identify the gallery, the queries and the two cuBLAS rows. Then add the per-query readout in a scratch project following step 3. The worksheet’s 100,000-image streaming design is an optional extension."),
    "7/2": guide(
      "A four-bit value has very few levels. NVFP4 shares a scale among neighboring values so those levels can cover different ranges. You will test the consequences for real digit data, then read how the 5070’s hardware kernel represents the inputs and outputs.",
      [
        section("One scale moves every level",
          "For a teaching block with largest magnitude 12, choose a real-valued scale of 12/6 = 2. Scaled levels 0.5, 1 and 1.5 then reconstruct as 1, 2 and 3. If a new outlier makes the scale 10, those same levels reconstruct as 5, 10 and 15. Smaller signals can disappear."),
        section("Count payload, scale and error separately",
          "Thirty-two four-bit values occupy 16 bytes. Two groups of 16 values add two one-byte scales, making 18 bytes before padding. The lab’s CPU probe accepts different group lengths for sensitivity tests. Group 16 matches the input grouping used by example 79b.",
          "Use two references for two questions. A multiplication of already quantized operands can verify the GPU kernel. Comparing with original unquantized data measures information lost in conversion.")
      ], [
        step("Decode the example’s type names", "Open the pinned 79b source under Read before the exercise. Search for ElementA, ElementAccumulator, ElementD, ElementSFD and ArchTag. Record input layout, alignment, accumulator, output payload and output scale separately. Find can_implement and a validated matrix shape in the Blackwell worksheet."),
        step("Quantize a block by hand", ["For the hand calculation use levels 0, 0.5, 1, 1.5, 2, 3, 4 and 6 and their negatives. Set one real-valued scale for the group so its largest magnitude can be reconstructed using level 6.",
            "For [−3, 1, 6], record the scale, the nearest level for each scaled entry and the reconstructed values. For an all-zero group, choose a safe output without dividing by zero. Check your rows against the teaching quantizer in the optional reference listing."]),
        step("Separate the outlier", ["Apply the same hand calculation to [0.5, 1, 1.5, 2] and to [0.5, 1, 1.5, 64]. On a tie between two levels choose the smaller signed level, as in the teaching listing. Record the absolute reconstruction error for each of the first three entries.",
            "Repeat with 64 as a separate group and the first three together. Which errors change? Count how many scales you now need. Name one format or alignment rule from the real CUDA example that the hand calculation leaves out."]),
        {title:"Test the format and the hardware separately",body:["Calculate payload bytes for 1,024 values with one 8-bit scale per 16 values. Check how the real digit reconstruction behaves, then optionally run the installed SM120 example. If Linux is unavailable, finish the two CPU runs and the source annotation. Record GPU timing as unmeasured for your run."],actions:[
          {title:"Measure reconstruction and retrieval",command:scales+" --group 16 --query 1\n"+scales+" --group 32 --query 1",expected:"The byte totals and image reconstruction relative L2 cover all 1,797 images. The line beginning Query 1 gives the error in that one digit’s similarity scores. On Gallery winners, record both the one-based image ID and the digit label. Compare these same fields after doubling the group size."},
          {title:"Optional · validate the device example",body:["Run this from Windows Course PowerShell with the installed CUDA-Ubuntu environment. Wait for the reference disposition before interpreting the average timing. Record the shapes and precision policy."],command:"wsl -d CUDA-Ubuntu -u learner -- bash -lc 'cd /mnt/g/CUDA-Studio && bash labs/blackwell/run-79b.sh'",expected:"The host reference should report Disposition: Passed. It checks the quantized output payload. The worksheet describes an additional output-scale comparison you could implement."}
        ]}
      ], "For the CPU comparison use query 1 at group sizes 16 and 32, as shown in step 4. Read the official example’s types and validation separately. Running 79b on the GPU is optional. The Linux installation instructions in the manual are for a fresh machine."),
    "7/3": guide(
      "The next batch of queries can begin its trip to the GPU while another batch is being scored. To do this safely you need to know when a scratch buffer’s previous results have actually made it back to the CPU.",
      [
        section("Follow one query through one slot",
          "A slot reserves page-locked host memory, device memory and a CUDA stream. That stream orders the input copy, the score kernel, and the output copy. A completion event goes after all three. Once the event completes, the host can consume the previous scores and refill that slot."),
        trace("Budget the last partial batch", [
          "10 queries · room for 4 per slot",
          "batch   slot   query indices",
          "  0      A     0 1 2 3",
          "  1      B     4 5 6 7",
          "  2      A     8 9",
          "",
          "Reuse A after batch 0 readback."
        ],
          "If 10 queries arrive in batches of four, the batches contain 4, 4 and 2 queries. Each slot still reserves room for four, but its last submission must copy only the useful rows. Record the global starting query index so that results return to the correct rows.",
          "Using two streams permits overlap. A GPU timeline tells you whether copies and kernels overlapped on a particular run. The wall clock tells you whether the user got the whole batch back sooner.")
      ], [
        step("Build a three-stage timeline", ["Draw three lanes on paper for upload, GPU compute and download. Each chunk spends 2, 5 and 1 ms in that order. First draw four chunks with no overlap.",
            "Start over with one independent resource per stage and enough buffers. A chunk can begin a stage when its preceding stage has finished and that resource is free. On each drawing record when the fourth chunk finishes.",
            "Now suppose the program has only two buffers. Mark the earliest time when batch 2 can start reusing batch 0’s buffer. Include the time needed to get batch 0’s results back."]),
        step("Check all scores and count bytes", "Find the block that starts Queries: 360. After five chunks of 64, how many queries go into the last chunk? Check your prediction against last chunk. For one full slot, count 64 input bytes and 1,437 four-byte output scores per query. Compare your total with Per reserved slot. That many bytes are reserved on the host and again on the device. The device also holds the gallery.", pipeline+" --check"),
        {title:"Give the second slot work",body:["Trace Slot.submit and Slot.retire in pipeline.py. Find the event that protects readback. In schedule.py predict the first six slot numbers from the current student_slot."],actions:[
          {title:"Open the host and scheduler",command:".\\Edit-CourseFile.ps1 .\\labs\\pipeline\\pipeline.py\n.\\Edit-CourseFile.ps1 .\\labs\\pipeline\\schedule.py"},
          {title:"Check your edit",body:["Edit only student_slot in labs/pipeline/schedule.py. The inputs are the zero-based chunk number and the number of available slots. Return a valid slot ID such that successive chunks use every slot once before starting again with slot 0. Work out a rule that also makes sense with one slot. Save the file and run the check."],command:pipeline+" --check",expected:"Under Queries: 360, compare the student’s first six slot selections with the two-stream reference. The score comparison is a separate check. A program can pass every score and still leave a slot idle. Keep both the printed selections and the Exact CPU match result before timing."}
        ]},
        step("Measure the full round trip", "For each chunk size, record wall p50 ms and wall p95 ms for the serial, two-stream and student rows. Compare modes within one chunk size. For evidence of actual overlap, use the commands in the Workbench’s timeline worksheet. In a captured report, name a copy, a kernel and their stream IDs, and say whether their time intervals intersect. With wall times alone, report which mode finished sooner and label the overlap as unmeasured.", "foreach ($chunk in 16,64,128) { "+pipeline+" --chunk $chunk }")
      ], "Use the scheduler worksheet while editing `student_slot`. Open the timeline section after the score check and chunk timings. A trace lets you report an observed overlap or idle gap. If you only drew the schedule, report it as a prediction."),
    "7/4": guide(
      "The strictest computation and the quickest computation can both be sensible choices. You will turn the week’s measurements into a decision for two users whose precision requirements differ.",
      [
        section("Apply the requirements before ranking",
          "Suppose a user accepts maximum absolute error up to 0.002. A measured error of 0.003 disqualifies a candidate even if that row had the lowest latency. A separate user can specify identical predicted labels on this dataset instead. Write the requirement in terms you can test."),
        section("Find a dominated choice",
          "Consider illustrative pairs (milliseconds, error) of (2.0,0.001), (2.4,0.001) and (1.7,0.002). The second is dominated by the first. The remaining two exchange accuracy for speed. Their status can change on another shape or under a tighter error budget.",
          "When the timing variation covers the difference between two policies, show the spread and qualify the ranking. A Pareto frontier computed from a single lucky trial describes very little.")
      ], [
        step("Collect two workload families", "Start one table for digits and a second for the synthetic matrix. In each, copy cuBLAS FP32 as the reference policy, your student kernel, the supplied tile16 kernel and cuBLAS TF32 allowed. Keep the printed names beside their timings and errors. A separate FP4 study can enter this table if it uses the same workload and you can account for its input conversion and output computation.", lab+" digits 1797\n"+lab+" gemm 1024 1024 1024"),
        step("Filter by the stated contract", ["Write limits for numerical error, changed predictions, memory and timing scope. Paste the full rankings log path printed on Day 2 into the prompt below, without quotes. Compare all predicted labels against FP32, including its incorrect predictions. If the candidate changed since Day 2, rebuild and capture the edited project first.",
            "On synthetic data use numerical checks. For large shapes, record how many FP64 dots were sampled, the largest error among those dots and the result of the three full-output sign probes. Retain failed rows and give the reason."], "$log = Read-Host 'Full path to the Day 2 rankings log'\npython -B labs/compute/compare_rankings.py $log --candidate student\npython -B labs/compute/compare_rankings.py $log --candidate tile16\npython -B labs/compute/compare_rankings.py $log"),
        step("Mark the frontier", "Work within one workload and one user’s acceptance limits at a time. For two rows that pass, compare both error and elapsed time. Mark a row as dominated if another is at least as good on both measures and better on at least one. Beside each dominated row, name the row that beats it. For close timings, collect another run before claiming either is faster."),
        step("Choose for two readers", ["For someone who requires strict FP32, name the policy you would use, the shape you timed and the conditions under which the timing can be reproduced. For someone who values retrieval speed, state the allowed label changes and how many you observed across all matched query IDs.",
            "Give a choice for each user and one new input or result that could change it. If no measured choice meets a user’s limits, say which check ruled each out."])
      ], "Use the two manual sections to look up which queries were checked and what the timer includes. Your evidence is the saved Day 2 rankings log and today’s matched timings. Bring the surviving rows back here for the frontier."),
    "8/soundstage": guide(
      "The radio in this scene contains 6,036 triangles. Finding the nearest triangle is enough to identify the surface a camera ray sees. Which triangle groups should the ray visit first, and how can you prove that changing the order kept the same surface?",
      [
        trace("Shorten a search with a real hit", [
          "ray origin                      →",
          "entry 3      hit 7      entry 9",
          "   |-----------●-----------|",
          " near box               far box",
          "",
          "after hit: closest = 7",
          "far entry 9 > 7  →  skip far box"
        ],
          "A bounding volume hierarchy encloses groups of triangles in boxes. Suppose a ray enters one child box at distance 3 and the other at 9. If the first child contains a triangle at 7, any triangle in the second box is too far to be the nearest hit. If the ray misses every triangle in that first box, the second box still matters.",
          "The stack holds boxes that still need a visit. If you put A on the stack and then B, you take B off first. When you take a box off, compare its entry distance to your closest confirmed triangle hit. An entry distance tells you how early a triangle in that box could be hit."),
        section("Check geometry separately from the final picture",
          "The packet checker shoots 257 fixed rays and compares nearest-triangle IDs and hit distances with an exhaustive CPU calculation. Its triangle-test count explains which geometric work changed.",
          "The beauty pass also includes texture lookups, lighting and additional rays. Fix the camera for each comparison, then repeat at a second angle. The packet’s work reduction and the full frame’s speedup answer different questions.")
      ], [
        step("Inspect a highlight and the work view", "Launch the radio scene and pause it. Choose a detail on the grille, vary Roughness, then restore the original shot. Compare Work in modes 1 and 2. Mark a region where you predict traversal order will help. Close the viewer before timing.", "python -B labs/nightshift/nightshift.py --scene soundstage --width 640 --height 360 --time 2 --features 7 --samples 4 --control 0.5"),
        step("Record the untouched traversal", "Use the commands below before editing. From the ray-packet output copy the triangle-test totals on the PASS reference and PASS student lines. From the benchmark CSV copy gpu_p50_ms for those same two modes at the same camera settings. Give the packet counts and the full-frame times their own column headings so a reader can tell which workload each number describes."),
        step("Trace the stack, then edit", ["Draw two child boxes. The ray enters the right one at distance 2 and hits a triangle there at 5. It enters the left one at 8 and finds no triangle there. Start with no hit. Try putting left on the stack first, then try right first. For each order, write the pop sequence and mark any box you can skip before examining its triangles.",
            "Open soundstage.cuh and find studentNearFirst. Its return value tells trace whether to swap the two children before it pushes right and then left. Choose the condition that makes the nearer child come off first.",
            "Save and relaunch the scene with the first command. Freeze it and press V to compare the image at two camera angles, then close the viewer."], ".\\Edit-CourseFile.ps1 .\\labs\\nightshift\\soundstage.cuh"),
        step("Repeat at a second camera angle", "Run the checks and benchmark both yaw values below. Import the front and turned CSVs into the Notebook. In each CSV, compare reference and student at the same yaw. Divide the reference gpu_p50_ms by the student gpu_p50_ms. A ratio above 1 means the edited traversal finished sooner. The different_pixels column should be zero at both angles. Which angle gives the weaker timing result?"),
        step("Draft a four-sentence defense", "Write four sentences about your radio run. State which child your edit visits first. Give the fixed ray count and a camera setting. Cite the independent nearest-hit comparison and how the triangle-test count changed. Finish with a scene or ray direction where visiting one box first would offer little benefit, and explain why.")
      ], "Use the benchmarking protocol to identify the timing interval for the full frame. Use the radio commands here for the 257-ray packet and two camera angles. When you have those comparisons, return for the four-sentence defense."),
    "8/0": guide(
      "Pick one question you would genuinely like answered on your 5070. By the end of today, a reader should be able to tell what you plan to change, what must stay correct and what observation would make you keep the old implementation.",
      [
        section("Turn a topic into a decision",
          "“Make cloth faster” leaves the finish line open. Try a specific decision such as whether eight local edge slots can replace a full search on a torn patch. Keep the solver’s integration order, step count and material fixed. Measure time for a whole GPU simulation step and compare the active flags and final positions.",
          "You can use the same pattern for pressure, digit retrieval, sparse matrices or ray tracing. Choose one input family, one algorithmic change and one primary timing boundary."),
        section("Set aside a test you can lose",
          "Choose a common input, a boundary input and an adversarial input. For a tiled matrix multiply those might be a square, dimensions one larger than a tile, and a skinny product. Pick a fourth shape now, record it, and leave its results unseen until Day 4.",
          "Write down a quality gate before timing. For a full-precision numerical test, specify a reference and tolerances. For an exact rendering change, require a zero-pixel difference in each fixed shot.")
      ], [
        step("Choose an earlier lab you can already run", "Open one completed session and rerun its baseline. If you choose rendering, physics or sparse computation, use the command from that lab. The matrix-chain route below takes 96 digit images (each with 64 pixels), 64 hidden units and 12 output columns. Read (AB)C and A(BC) as two ways to compute the same output for those images. Save the baseline command, its output and the single change you want to investigate.", lab+" chain 96 64 12"),
        step("Define a pass and a failure", "Write “I will accept this change if …” followed by a measured speed requirement and an explicit correctness rule. Name the computed quantity, the reference, any tolerated difference and when you will compare them."),
        step("Freeze four inputs", ["Give four inputs short names. Choose one you expect to see often, one that touches a boundary in the code and one that is especially hard for your proposed change. You may use these three while developing. Choose a fourth input, record its exact settings now and save its first run for Day 4.",
            "For each, save the dimensions or scene settings and seed or input file. Record your GPU, software versions, timer start and stop points, warm-up and repeat count once if all four share them."]),
        step("Write the one-paragraph proposal", ["Name the person who needs the result, the work your current code repeats, and the one change you want to try. Pick something countable, such as triangle tests or scalar multiplications. Predict what your change will do to that count. State what result would lead you to keep the baseline.",
            "For the matrix-chain option, your question is whether a rule that picks (AB)C or A(BC) for each incoming batch can beat always using (AB)C. Write down how much disk space to reserve for evidence."])
      ], "The Lab shelf is a menu for choosing one project. Pick a workload whose baseline you’ve run, retrieve its command and earlier result, and return here to set the acceptance rule. The matrix chain is a worked project choice."),
    "8/1": guide(
      "A check earns your trust when you have seen it reject the kind of mistake you care about. Today you will build a tiny known answer, break a scratch version on purpose, and keep the smallest input that exposes the defect.",
      [
        section("Give each output a known meaning",
          "Take rows [1,2] and [3,4] and the column [2,−1]. Their product is [0,2]. A faulty store could return [2,0], preserving the checksum of 2. Checking the two output positions independently detects the swapped rows immediately.",
          "An oracle computes an expected answer independently. A second type of check transforms an input in a way that predicts the new answer. For example, scaling both the source and the expected solution by the same factor respects a linear pressure equation."),
        section("Choose a defect your test can actually see",
          "A final-row guard that skips the last row hides easily behind a large aggregate score. A tiny rectangular input with a nonzero expected last row makes the omission visible. Record the first differing coordinate and value. Use the equivalent geometric witness for a visual result.")
      ], [
        step("Choose a reference and two invariants", "Choose an independent way to compute expected outputs for a small input. Then design two checks that predict how the output should behave when you change the input. Write each as a before-and-after pair that someone could run. For example, a change to the order of independent rays may change their output order while preserving each ray’s hit. Pick checks that make sense for your own operation."),
        step("Compute a tiny answer without the candidate", "Draw a case small enough to solve by hand. Write its full input and your predicted output before running your CPU reference. For a matrix-chain project use A = [2, −1], B = [[1,2],[3,1]] and C = [4,5]ᵀ. Work out (AB)C and A(BC), including each intermediate. Feed those same arrays into your own CPU reference and compare. The native digit benchmark uses a different dataset and checks it against FP64 results.", undefined, undefined, "AB = [−1, 3], so (AB)C = −4 + 15 = 11. BC = [14, 17]ᵀ, so A(BC) = 28 − 17 = 11. If the two answers differ, first compare the entries of AB and BC to find the operation to revisit."),
        step("Make the check fail on purpose", "In a scratch copy of the candidate, omit one term or edge that your tiny input exercises. Keep the reference and expected output fixed. For the matrix example you can omit the last term of the final (AB) × C dot product. Predict what that broken program will return. Save the first mismatch, restore the term, and run the identical input again."),
        step("Write the acceptance rule", "Reject nonfinite values. Give an absolute tolerance around zero and a relative or normwise tolerance at larger magnitudes. For discrete topology or primitive IDs use exact comparison where appropriate. Keep the tiny input and its expected output together.")
      ], "Open your Day 1 notes for the promised correctness rule and cases. The verification source shows one way to check a matrix product. Come back here to construct the tiny known answer for your own workload."),
    "8/2": guide(
      "You now have a baseline you can trust. Make one change whose mechanism you can count. The goal is to explain why time moved, including the case where the timing barely changes.",
      [
        section("Predict a quantity between the code and the time",
          "Imagine four rays testing 12 candidate shapes apiece. In your proposed change, each ray checks a box for every candidate, then tests only the three surviving shapes in detail. How many detailed shape tests would the four rays perform before and after the edit? How many box tests would the edit add?",
          "For other projects substitute a mechanism you can observe. Count temporary elements in a matrix chain, active edge lookups in a cloth sweep or unused lanes across sparse rows."),
        section("Keep the counter out of the timed path",
          "A diagnostic that increments a shared counter on every test adds work and can change ordering or contention. Collect counts on one run and production time on another with the same workload. Use the same instrumentation policy for both variants.")
      ], [
        step("Capture one baseline mechanism", "Pick the counter your proposal predicts. On one fixed input capture its value and save the command. For dense algebra a hand count of FLOPs and intermediate bytes is valid when you label the assumptions. For rendering use a separate work pass."),
        step("Implement one change", ["Sketch the new operation and where each result goes. Estimate the work, then edit the student function for your lab or make a scratch copy.",
            "For the matrix route, the native program already times both associations. Your contribution is a host function that chooses an association from the input dimensions. For A of shape I × 64, B of shape 64 × H and C of shape H × O, derive the two intermediate shapes and count scalar multiplications.",
            "Test your reasoning on I = 4, H = 2, O = 3. Report each intermediate’s FP32 bytes and each method’s nominal FLOPs, counting two FLOPs per multiply-accumulate. Save the rule and its choices for your four shapes before seeing the held-out timing."], undefined, undefined, "For the 4 × 64 input with H = 2 and O = 3, AB is 4 × 2. The left association uses 512 + 24 = 536 multiplications and stores 8 intermediate floats. BC is 64 × 3. The right uses 384 + 768 = 1,152 multiplications and stores 192 intermediate floats. These work counts help explain a choice. Timing the native kernels tests how well that prediction holds."),
        step("Run yesterday’s test suite", "Run your Day 2 hand-calculated input and the two input transformations you chose. Then run the common and difficult development inputs from Day 1. For each, check the new output against the same reference and tolerance. If one fails, record the first differing row, vertex, ray or time step before changing the code again. Reserve the fourth input for Day 4."),
        step("Compare mechanism and elapsed time", "Rerun the original diagnostic and then time matched uninstrumented variants. Keep raw times, work counts and any slowdown. If candidate work fell while elapsed time stayed flat, name another stage that could account for it and how you would distinguish it.")
      ], "Reopen Day 2 for the tiny case and the expected mismatch you saved. Run those checks on your changed implementation, then add today’s comparison to your notebook."),
    "8/3": guide(
      "Today you make it difficult for a lucky run to become your conclusion. Pair timings taken under similar conditions, then open the input that played no part in choosing your optimization.",
      [
        section("Pair like with like",
          "In one illustrative pair a baseline takes 3.0 ms and a candidate takes 2.0 ms. Its baseline/candidate ratio is 1.5×. In the next pair the times are 2.4 and 2.5 ms, giving 0.96×. Both ratios belong in the report. Preserve the raw timings to show their scale."),
        section("Separate timing noise from a changed workload",
          "Alternate the two implementations on one fixed input, then summarize the paired ratios for that input. Moving to a new camera angle or a new matrix shape starts a new group. A held-out failure can expose a limit of the algorithm even when repeat-to-repeat variability is tiny.")
      ], [
        step("Collect matched pairs", "Collect at least five baseline/candidate pairs per input with the same warm-up and timed interval. Reverse the order in a second series if practical. For the matrix-chain option, run the command below once per development shape, substituting its three dimensions. Each new folder contains five raw logs and pairs.csv. One pair comes from one invocation, with nine CUDA event intervals for each association. This executable always runs left first. Record that limitation.", "python -B labs/compute/chain_pairs.py 96 64 12 --pairs 5"),
        step("Compute the paired speedups", ["For each pair record the baseline time, candidate time and baseline/candidate ratio. For the matrix route, use left_ms as the always-left baseline. If your rule chooses left, the estimated speedup is 1×. If it chooses right, use left_over_right. A value of 0.8× means the selected path took longer.",
            "Summarize the median and range of these ratios for each input and give its quality result. These ratios estimate the GPU-kernel speedup of your choice. An end-to-end timing would also include making the choice."]),
        step("Open the held-out input", "Find the fourth input you recorded on Day 1. State which method your saved rule selects and your predicted outcome. Run the same five-pair comparison on that input, leaving the rule fixed. Does it meet your original accuracy and speed requirements? Give the check result and the range of paired speedups even if the prediction was wrong."),
        step("Reproduce in a fresh run", "Open a fresh Course PowerShell in the course root and follow your own instructions for one case. Record the input, exact command or commands, observed correctness check and new timing beside the range you reported for that input. If the timing falls outside that range, keep the new observation and investigate the settings. List the logs and scene or input files a reader would need to repeat it.")
      ], "Retrieve the shape or scene you held back on Day 1, together with the acceptance rule you wrote before tuning. Return here with those settings for the held-out run."),
    "8/4": guide(
      "Imagine a reader choosing between your kernel and the baseline next month. Give them enough evidence to make that choice on a new input, and enough instructions to challenge yours on the original one.",
      [
        section("Build the claim around a decision",
          "Start with one sentence naming the hardware, workload, algorithmic change, timing boundary and quality gate. A three-line table can then carry most of the argument. For each case give baseline and candidate milliseconds, a work count, a numerical or visual check and the range of paired speedups.",
          "A changed runtime is an observation. Explaining it requires showing what work changed. A smaller candidate set, fewer multiplies or a smaller temporary makes that part of the argument inspectable."),
        section("Include evidence that could change a reader’s mind",
          "For graphics, show one identical view under the two valid implementations and a work view that exposes the difference. For algebra, pair a hand-checkable calculation with the measured large case. Include the smallest previously failing input and the condition where your conclusion is least certain.")
      ], [
        step("Assemble a report or recording", "Choose a two-page report or a five-minute recording. Lead with the measured outcome. Show the baseline, your changed lines, the work argument, correctness evidence, repeated times and a limitation. Give the exact command and expected output for one small case. For the optional portfolio version, go to Check & save and select Build this case study. The worksheet lets you export the report and lists the evidence files to attach."),
        step("Score the evidence and revise", ["Give your report one score for each of five questions. Can a reader rerun the small example? Can they see the test reject a real mistake? Can they count how your change altered the work? Can they inspect repeated timings on the same input? Can they tell how your rule did on the held-out case?",
            "Give 0 if the report omits the item, 1 if it describes it, or 2 if it includes the command, failing case, calculation or measurements that let the reader check the claim. Pick the lowest score and add the missing evidence."]),
        step("Defend it with the report closed", "Answer aloud in your own words. Which operation did your change reduce, and on which input? What measurement tells you where time was spent afterward, or what would you still need to measure? What new input could make the original method preferable? Name one source you adapted and one decision you made yourself. Reopen the report and locate the result that supports each factual claim."),
        step("Write four questions for your future self", "Save four questions under Check & save, labeled +1, +3, +7 and +21 days. Give each a specific input: a tile whose intensity you can rederive, a new matrix chain, a short CSR graph and a fresh capstone condition. When this lesson appears in Notebook → Recall queue, select Reopen to read your saved question. Try it from memory, then record the first step you needed to look up.")
      ], "Use the Notebook to gather the commands, timings, checks and capture paths you already recorded. Return here to assemble the report. The portfolio worksheet under Check & save is for the optional public version.")
  };
})();
