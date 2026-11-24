# First launch

[Open the interactive worksheet to check a prediction or read its explanation.](README.html)

**Week 1, Day 1.** Find which thread writes each output, run the five shapes, and restore the passing kernel after testing your two boundary predictions in the lesson. Return to the pixel-grid drawing there. The sanitizer item at the end of this manual is a preview for Day 5.

Open `first_kernel.cu` in a text editor. From the course root, run the check below. It uses the same in-memory CUDA compiler as the swarm lab and compiles your saved kernel on every run. The two functions at the top of the file execute on the GPU. The lines inside `main()` show how the full toolkit version allocates, uploads, launches, downloads and checks.

```powershell
python -B labs/launch/check_now.py
```

Both kernels initially pass all five shapes. The starter launches many threads and lets one thread add every pair. Your first change gives each valid thread its own output. With the Windows toolkit installed, the Setup page's native build also compiles and executes the C++ host. After an edit, rebuild before rerunning `.\build\first_kernel.exe`.

1. Follow one input from a host vector through allocation, upload, launch, download, and comparison. Circle the first operation after the kernel launch that requires its output to be ready on the host. In the C++ listing, find that device-to-host copy and the error check for the launch itself. [Check or explain](README.html#check-launch-copy).
2. Sketch the worker IDs in the last block for 257 values and 256 workers per block. How many store a result? [Check or explain](README.html#check-launch-last).
3. Replace the body of `add_student` with the guarded one-output-per-thread calculation from the final on-ramp exercise. Recompile. All five shapes must pass.
4. For a negative control, temporarily change the student's guard to `i < n - 1`. Predict the first missing output, run the same check, and explain the NaN it reports or detects. Restore the correct guard and run once more. On paper, explain the distinct error that floor division in the grid size would cause at n=257. [Check or explain](README.html#check-launch-guard).
5. Inspect a launch with Compute Sanitizer using `compute-sanitizer --tool memcheck .\build\first_kernel.exe`. Use the event-timed GEMM or render lab for your first performance report.

<details><summary>Worked kernel body</summary>

```cpp
int i = blockIdx.x * blockDim.x + threadIdx.x;
if (i < n) {
    out[i] = a[i] + b[i];
}
```

The launch sends 512 workers for n=257. Only worker 256 in the second block writes. The output buffer starts filled with NaNs so an omitted write cannot pass by accident.

</details>
