# Fieldwork · CUDA Studio

Open **index.html** (or double-click **Start Course.cmd**) to launch the course in your browser.

Fieldwork is a 49-session interactive CUDA course built for your RTX 5070: a 5-session C++ on-ramp, 40 core CUDA days, and 4 Night Shift real-time graphics studios (~155 hours total). Every session is split into three clean tabs — **1. Learn**, **2. Guided Exercise**, and **3. Check & Save** — with interactive prediction checks, worked explanations, hands-on C++/CUDA coding labs, and a dynamic spaced-repetition review queue.

## Getting started

1. Double-click **index.html** and click **Start the C++ on-ramp** (or **Resume learning** to pick up where you left off).
2. Read the quick prep & concepts on the **Learn** tab, then switch to **Guided Exercise**.
3. Open **Course PowerShell.cmd** in `G:\CUDA-Studio` and run the lesson's build/test command (for Session 1: `powershell -ExecutionPolicy Bypass -File .\labs\primer\run.ps1 1`).
4. Open the exercise file in VS Code with `.\Edit-CourseFile.ps1 .\labs\primer\01_frames.cpp` (or set `$env:CUDA_COURSE_EDITOR = 'Notepad++'` to use Notepad++ in that terminal). Edit, save (`Ctrl+S`), and rerun the build command until all checks print `PASS`.
5. Finish on **Check & Save**: try the knowledge check and practice problems, record your notes/measurements, and click **Mark session complete**.

All lessons, interactive explorers, and datasets work offline. Keep opening `index.html` from the same folder and browser to preserve your progress, and use **Notebook → Export notebook** periodically to save a JSON backup.

## Dynamic spaced reviews

Completed sessions enter the **Dynamic review queue** inside **Notebook** starting the next day. Instead of repeating the exact same static question every day, the built-in parametric generator creates fresh numbers, dimensions, memory layouts, and scenarios each time (and you can click **New question** anytime for another variation). Rate each review **Again**, **Good**, or **Easy** to adjust when it comes back.

If you'd like AI-generated conceptual follow-ups as well, open **Notebook → Review settings · Optional Gemini API** and paste a free Gemini API key (stored only in your browser, never exported in notebook JSON). If the free tier rate-limits or is offline, it automatically falls back to a fresh local question.

## Version control

`G:\CUDA-Studio` is initialized as a local Git repository (ignoring `tools/`, `build/`, and `blackwell/`). Run `git log --oneline` in Course PowerShell to see snapshots or revert any course file cleanly.

## Tracked Night Shift graphics studios

| Scheduled point | Studio session | Focus |
|---|---|---|
| After Week 4, Day 3 | [After the last train](index.html#day/4/lighting) | Ray–box bay culling with puddle reflections |
| After Week 4, Day 4 | [Sluice 09](index.html#day/4/creature) | Hierarchical 5-link culling on a 76-worm colony |
| After Week 6, Day 4 | [Selvedge](index.html#day/6/textile) | UV-anchored fabric tears and ray–patch culling |
| Start of Week 8 | [Signal / Soundstage](index.html#day/8/soundstage) | Near-first BVH traversal and independent ray-packet verification |

Double-click **Start Night Shift.cmd** to run the live interactive scenes, or browse captures in the [Night Shift gallery](labs/nightshift/index.html).

## Native CUDA labs & workstation commands

| Lab | Launcher / command | What you optimize |
|---|---|---|
| Abyssal Swarm | `Start Swarm.cmd` / `python -B labs/render/swarm.py` | Tiled capsule culling & shared-memory candidate lists |
| Tension Study (Knit) | `Start Knit.cmd` / `python -B labs/knit/knit.py` | Gathered Jacobi cloth constraints & tearing |
| Ink Tunnel (Flow) | `Start Flow.cmd` / `python -B labs/flow/flow.py` | Shared-memory halo & two-sweep fused Poisson solver |
| Numeric workbench | `.\build\compute\Release\compute_lab.exe` | Matrix chains, tiled GEMM, CSR SpMV, block reductions, Poisson |
| Chunked digit pipeline | `python -B labs/pipeline/pipeline.py` | Double-buffered pinned transfers & dual-stream overlap |
| Blackwell special topic | `labs/blackwell/` | Block-scaled FP4/FP8 quantization & CUTLASS SM 120 |

- Rebuild native C++/CUDA suites from Course PowerShell: `powershell -ExecutionPolicy Bypass -File .\Build-Native.ps1`
- Re-verify installed toolchains & labs: `powershell -ExecutionPolicy Bypass -File .\Check-Setup.ps1 -VerifyLabs`
- Three portfolio milestones (Weeks 2, 4, and 8) let you export a reproducible Markdown write-up directly from the Notebook.
