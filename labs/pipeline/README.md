# Stream handwritten digit queries through the GPU

[Open the interactive worksheet to check a prediction or read its explanation.](README.html)

**Week 7, day 4 · 60–90 minutes.** A search service receives a batch of handwritten digits. For each query it returns a similarity score against every gallery digit. Your job is to shorten the time until the last answer is back in ordinary host memory. You can change the schedule while keeping the scoring rule and the result order fixed.

## Establish your baseline

Read the prediction below before you run these commands. From the course root, use 64-bit Python plus the NVIDIA driver and NVRTC used by the scene labs. On the RTX 5070, use the Toolkit 12.8 or newer NVRTC as described in the course setup. Check the GPU and PTX target printed at startup.

```powershell
python -B labs/pipeline/pipeline.py --check
python -B labs/pipeline/pipeline.py --queries 360 --chunk 64 --trials 9
```

The first 1,437 digits form the gallery and the next 360 supply queries. Each digit has 64 ink counts in the range 0–16. For a pair of digits, multiply corresponding pixel intensities and sum the products. The largest possible score is 64 × 16 × 16 = 16,384, so integer results must agree exactly. A larger score means that the two digits have ink in some of the same places. A dark digit can produce a large raw score even when another digit looks more similar. The matrix lab explores this distinction through normalization. [Dataset provenance](../compute/data/SOURCES.md)

**Predict before running.** The batch has 360 query images. Each kernel launch scores one chunk of up to 64 queries. How many launches run, and how many queries are in the last one? Each query uploads 64 one-byte pixel values and downloads one four-byte score for each of 1,437 gallery images. Work out the bytes in each direction for one query and the total number of scores in the full batch. [Check or explain](README.html#check-pipe-count).

<details><summary>Check the launch count and transfers</summary><p>Five full chunks hold 320 queries. The sixth holds the remaining 40. Each query uploads 64 bytes and downloads 1,437 × 4 = 5,748 bytes. The entire batch returns 360 × 1,437 = 517,320 scores.</p></details>

## Follow one slot

Open `pipeline.py`. A slot owns one stream, an input and output buffer on the GPU, and a pair of page-locked host buffers. The gallery stays on the GPU. Read `Slot.submit`, `Slot.retire`, and `run` in that order.

1. Pack the next query rows into the slot's pinned input buffer. Enqueue its upload, the `score_digits` kernel, and its score download in that order on the same stream.
2. Record the completion event after the download. When the CPU next wants this slot, wait for its event, then copy the completed scores into their final rows. Reusing the input buffer too early could overwrite a query before the GPU reads it. Reading the output too early could return data from an earlier chunk.
3. With a single slot, chunk 1 must wait for chunk 0. With two slots, the host can issue chunk 1 on the other stream while chunk 0 is still outstanding. After all submissions, drain every pending slot, including a partially filled last chunk.

Trace seven query rows numbered 0 through 6, with at most three rows per chunk. Use slots A and B in alternation, starting with A. For each chunk, write its row numbers and slot. Circle the first chunk that reuses a slot. What has to finish before that slot can be overwritten? When submissions stop, which chunks still need a final check for completion? [Check or explain](README.html#check-pipe-reuse).

<details><summary>Compare your three chunks</summary><p>Chunk 0 sends rows 0–2 through A. Chunk 1 sends rows 3–5 through B. Chunk 2 sends row 6 through A. Before reusing A the CPU waits for chunk 0’s download and saves its scores to rows 0–2. Finally it waits for and saves the outstanding results for chunks 1 and 2. Each result goes to the row numbers of its original chunk, whichever slot is drained first.</p></details>

## Make your edit

In `labs/pipeline/schedule.py`, the supplied `student_slot` always returns slot 0. Edit its return expression so that chunks visit each available slot once in order, starting at 0, before returning to slot 0. Your expression must work for any positive number of slots. First predict the six returned slot numbers for chunk indices 0 through 5 when two slots are available. [Check or explain](README.html#check-pipe-slots).

<details><summary>Get a hint for the return expression</summary><p>Look at the remainders you get when you divide consecutive chunk indices by the number of available slots. When does the first remainder repeat?</p></details>

```powershell
python -B labs/pipeline/pipeline.py --check
python -B labs/pipeline/pipeline.py --queries 360 --chunk 64 --trials 9
```

The check includes a single underfilled chunk, a two-chunk run with a one-row tail, a three-chunk run with first-slot reuse, and the full gallery search. Check your predicted sequence against the printed slot selections. The runner fills the device output with an impossible score before each check kernel and compares every score to an independent CPU dot product. It reports the first wrong query and gallery index if a check fails. Both a safe serial schedule and a safe alternating one should give exactly the same scores.

## Find your chunk size

```powershell
foreach ($size in 8, 32, 64, 128, 360) {
    python -B labs/pipeline/pipeline.py --queries 360 --chunk $size --trials 15
}
```

For each chunk size, record the serial, two-stream and student p50 wall time, p95 wall time and pinned bytes in use. Report the ratio of serial p50 to student p50. Reproduce the best candidate with a fresh run. The driver preallocates one slot for a serial-only run and two for a comparison. Count one *active* slot in the serial case. At size 64 each slot reserves 371,968 pinned host bytes and the same number of temporary device bytes. Account for the shared gallery and assembled host result separately. With a chunk of 360, what opportunity does the second slot have? With a chunk of 8, what fixed costs do you pay more often? [Check or explain](README.html#check-pipe-size).

The host stopwatch starts before packing the first chunk. It includes Python submission, copies from ordinary to pinned memory, both transfer directions, GPU scoring, waits, result assembly, and the final drain. It excludes JIT compilation, allocation, the initial gallery upload, CPU reference calculation and output validation. Each mode gets an untimed checked warm-up. Trial order rotates between modes. The table reports median and nearest-rank p95 across full batches. With nine trials, p95 is the slowest trial. Close other GPU-heavy programs or record competing work in your notes.

## Read the GPU timeline

A shorter wall time is evidence of faster completion for this workload. Overlap requires two time intervals on the GPU to intersect. A quick return from an asynchronous API only tells you when the host regained control. To inspect the mechanism, collect separate runs in Nsight Systems from the course root. This block finds the installed CLI on PATH or in its usual Windows directory and resolves the Python executable path for the profiler.

```powershell
$profiler = (Get-Command nsys.exe -ErrorAction SilentlyContinue).Source
if (!$profiler) {
    $profiler = (Get-ChildItem "$env:ProgramFiles/NVIDIA Corporation/Nsight Systems */target-windows-x64/nsys.exe" |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}
$interpreter = (Get-Command python.exe).Source
New-Item -ItemType Directory -Force .\build\pipeline-traces | Out-Null
$run = Get-Date -Format yyyyMMdd-HHmmss
foreach ($mode in 'serial', 'two-stream') {
    & $profiler profile --trace=cuda --sample=none --cpuctxsw=none -o ".\build\pipeline-traces\$run-$mode" $interpreter -B labs/pipeline/pipeline.py --mode $mode --queries 360 --chunk 32 --trials 3
}
```

Open the resulting reports in Nsight Systems. Expand the CUDA GPU rows near repeated `score_digits` launches. In the serial run, locate an HtoD copy, its kernel, and its DtoH copy. In the two-stream run, zoom until the beginning and end of individual operations are visible. Look for a copy on one stream that intersects a kernel on the other. Write down their stream IDs and intersecting time interval. If they never intersect, describe what you see. Short activities, host submission gaps, transfer engines and other GPU work can limit overlap. Some Windows profiler versions require an elevated shell to collect the DxgKrnl provider. If capture is unavailable, label your evidence as wall timing only. [CUDA Best Practices Guide](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#asynchronous-and-overlapping-transfers-with-computation) · [Nsight Systems User Guide](https://docs.nvidia.com/nsight-systems/UserGuide/index.html)

**Tomorrow’s closed-book refresher.** Sketch two streams for three chunks. Mark the earliest moment when the CPU could safely overwrite A’s input and the earliest moment when it could read A’s output. Which of those moments does this implementation wait for when it reuses the whole slot? Explain what work another stream could overlap if the batch held only one chunk. [Check or explain](README.html#check-pipe-events).

<details><summary>Check the timeline</summary><p>A’s input is safe to overwrite when its upload finishes. Its output is safe to read when its download finishes. This lab recycles both buffers together using the event it records after the download. One chunk supplies only one chain of dependent operations, leaving no second chunk to overlap.</p></details>
