# Fieldwork · CUDA Studio

Open **index.html** or double-click **Start Course.cmd**. Start with **Turn a frame time into FPS**. The course has 49 tracked sessions across a five-session C++ on-ramp and eight CUDA weeks. The 40 core days and four Night Shift studios share one sequence, with about 155 hours of work including the on-ramp. Treat weeks as units you can spread across your own study days. Every session includes a prediction or recall prompt, guided practice, a hint, a worked answer, a knowledge check, and something to keep.

## First session

1. Double-click **index.html** and choose **Start the C++ on-ramp**. Open the LearnCpp selection under **Read before the exercise**. Back in the lesson, try both frame times in the diagram. Choose **Guided exercise** for directions to open **Course PowerShell.cmd** and run your first command.
2. Run `powershell -ExecutionPolicy Bypass -File .\labs\primer\run.ps1 1`. A working starter prints two TRY results.
3. In Course PowerShell, run `.\Edit-CourseFile.ps1 .\labs\primer\01_frames.cpp` to open the source in VS Code. To use Notepad++ for every edit in this PowerShell window, first enter `$env:CUDA_COURSE_EDITOR = 'Notepad++'`. Edit the return expression in `fps`, save with Ctrl+S and run the build command again. On a 20 ms frame the answer is 50 FPS. Try the 25 ms case in the [Session 1 prediction checker](index.html#day/0/0), or open its explanation, then run the edited test.
4. After the missing-semicolon exercise, open **Check & save**. Record a passing test and the compiler line with the filename, location and error message. Use the diagnostic checker to interpret that line. Try the two short questions under **Practice with new inputs** and mark the session complete when ready. The next lesson is linked below.

Each C++ session assigns two short excerpts. In Sessions 2–5, start with the C++ example above the reading links and try **Check your trace**. The reading prompts point to the particular examples you need and tell you where to stop. In **Learn the idea**, trace a worked example, predict a fresh case and open **Compare your trace**. Under **Guided exercise**, edit a starter, then use **Try it on new inputs** to run additional checks. The times on the course map are budgets for reading, coding, checking and troubleshooting.

Session 5 finishes with **Profile a handwritten digit**. Write a function that counts dark cells in each row of an image. The checks use small cases you can do by hand and a real handwritten zero from the bundled UCI dataset. The exercise points you back to the relevant lesson when a count or a buffer guard disagrees.

The browser lessons, exercises, and bundled datasets work offline. Source readings open the authors’ websites. Open the course from the same path and browser to keep progress. Export the notebook as JSON to back it up or move it to another browser. When saving through a browser download dialog, choose your G: course folder.

## Follow the course

The [lesson-by-lesson teaching audit](Teaching%20audit.html) shows what each session assumes, what you will do, and how to check the result. Each guided exercise ends with an optional new case, a starting hint and a worked check. The case appears again in the notebook on the third scheduled review. Returning to a lesson in the same tab reopens the section you last used.

Open the [course map](index.html#course) and use **Next** at the bottom of each session. When you come back, the studio home resumes at the first unfinished session. Each expanded week names the evidence to bring, its finish criteria and where you will reuse the result. Mark the session complete after recording your evidence. Its retrieval question joins the same spaced-review queue as the other lessons.

Three checkpoints have optional portfolio milestones. Use your own code, raw measurements and checks to write a [digit-search kernel study](index.html#publication/2/4), an [illustrated swarm-rendering study](index.html#publication/4/4), or a [capstone with a held-out stress test](index.html#publication/8/4). Each worksheet helps you export a Markdown report, choose evidence to attach and explain how someone else can repeat the experiment. You can reopen drafts from the notebook. For a short finished example with its input, failure cases and reproduction script, read [Why does the same 1 keep winning?](labs/publication-example/index.html).

| When you reach this point | Your tracked studio session | Take forward |
|---|---|---|
| After Week 4, Day 3 on tile culling | [After the last train](index.html#day/4/lighting) | A reflected sign, a checked frame and a matched timing |
| After Week 4, Day 4 on overlapping geometry | [Sluice 09](index.html#day/4/creature) | Candidate counts and timing for the Week 4 checkpoint |
| After Week 6, Day 4 on tear detection | [Selvedge](index.html#day/6/textile) | A release-and-rotate test to compare with the solver’s broken-edge record |
| At the start of Week 8, before choosing a capstone | [Signal / Soundstage](index.html#day/8/soundstage) | An independent nearest-hit check and a comparison contract you can adapt to another workload |

The [Night Shift gallery](labs/nightshift/index.html) lets you inspect each frame or play a capture. Each scene links back to its lesson. Double-click **Start Night Shift.cmd** to render and edit live. The [field manual](labs/nightshift/manual.html) has the extended worksheets.

## Workbench

| Lab | What you change | What you check |
|---|---|---|
| Abyssal Swarm | Which capsules reach the expensive pixel test | Coverage IDs, rendered colors, GPU time, and FPS |
| Tension Study | Which constraints each cloth vertex visits on each Jacobi sweep | Pinned and grabbed vertices, torn edges, strain, and final positions |
| Ink Tunnel | Global pressure sweeps versus two sweeps fused in a tile | Discrete divergence, pressure residual, seams, dye, and timing |
| Dense computation | Matrix-chain association, cooperative GEMM tiles, and precision | FLOPs, intermediate size, sampled or full FP64 reference, and digit retrieval labels |
| Sparse computation | Which worker owns each row, and how workers reduce ink counts | CSR output on a social graph and roof stiffness matrix, and exact integer sums |
| Chunked digit search | Which of two pinned input/output buffers and streams owns each query chunk | Every raw dot score against the CPU, the last partial chunk, total wall time, and a timeline of transfers |
| Blackwell special topic | Block-scaled low-precision GEMM on the GeForce SM120 target | Scale overhead, quantization error, reference check, and on-device evidence |

Run a native scene from this folder with `python -B labs/render/swarm.py`, `python -B labs/knit/knit.py`, or `python -B labs/flow/flow.py`. Each supports `--check` and `--bench`. The browser includes CPU digit retrieval, a fabric brush, a tile explorer with rectangular edge cases, and a matrix-chain explorer that lets you predict a split and inspect its arithmetic cost.

## Workstation

The portable C++ compiler for the CPU lessons lives in `G:\CUDA-Studio\tools\w64devkit`. On the RTX 5070, **Course PowerShell.cmd** activates the G: CUDA 12.8.1 toolkit, Visual Studio 2022 x64 Build Tools, and profilers for this shell. The four native scene launchers also select the toolkit NVRTC. The existing Anaconda environment can run the numerical shortcut with `python -B labs/compute/practice_now.py all`. PyTorch 2.7.1+cu118 may print its own architecture warning. The shortcut prints which NVRTC compiles the editable CUDA.

For the RTX 5070, follow **Setup & reading** in the course. The native executable build uses a compatible MSVC toolset, CUDA Toolkit 12.8 or later, and CMake. From **Course PowerShell.cmd** run `powershell -ExecutionPolicy Bypass -File .\Build-Native.ps1`. It detects the installed course card, targets SM 120 on the 5070 or SM 86 on the 3070, and runs the first-launch and compute validation suites. Use `powershell -ExecutionPolicy Bypass -File .\Check-Setup.ps1 -VerifyLabs` from the course folder to check the installed labs after a hardware or toolkit change. Executables, temporary build files, and local GPU compiler caches used by the script go under `build`. The NVIDIA driver, Microsoft installer service and Windows SDK use Windows-managed locations.

To keep a native scene run in the notebook, save its CSV output with `python -B labs/render/swarm.py --bench --frames 41 | Out-File -Encoding utf8 swarm.csv`. Open **Notebook → Import a native scene benchmark** and choose the file. Kernel, host, and pressure timings keep their own scopes.

The first verified benchmark measurements in the studio come from the RTX 3070. Repeating them on the RTX 5070 is an exercise. Record the GPU, driver, workload, timing boundary, precision, sample count, and correctness alongside the result.
