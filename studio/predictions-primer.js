// Interactive prediction & check cards for the C++ on-ramp (Sessions 1–5).
(() => {
  const num = (prompt, answer, explain) => ({type: "number", prompt, answer, explain});
  const list = (prompt, answer, explain) => ({type: "list", prompt, answer, explain});
  const choice = (prompt, options, correct, explain) => ({type: "choice", prompt, options, answer: options[correct], explain});
  const reason = (prompt, explain) => ({type: "rubric", prompt, explain});

  window.PREDICTIONS_PRIMER = {
    "0/0": {
      reading: [
        choice("In LearnCpp's first function-call example, in what order do the messages print?", ["Everything in main() first, then the helper function", "main()'s opening message, then the helper function's message, then main()'s closing message"], 1, "Calling a function jumps execution into that function. When it finishes, execution returns to the next line in main()."),
        choice("In the returnFive() example, why does `std::cout << returnFive() + 2` print 7 while a bare `returnFive();` line prints nothing?", ["return statements automatically print to the screen", "returnFive() only hands back the value 5; you have to pass it to std::cout to print anything"], 1, "Returning a value sends it back to the caller — it doesn't display it unless the caller prints it.")
      ],
      recall: [num("At 50 frames per second (FPS), how many milliseconds does one frame take on average?", 20, "One second is 1,000 ms, so 1,000 ÷ 50 = 20 ms per frame.")],
      "learn.2": [
        list("If 8 equal frames take 1.0 second total (1,000 ms) while the test still expects 62.5 ms, what are the `got` and `expected` values printed by check() (in that order)?", [125, 62.5], "1,000 ÷ 8 = 125 ms (`got`), while the hard-coded `expected` value is still 62.5."),
        choice("What happens when `got` (125) doesn't match `expected` (62.5)?", ["Prints PASS and returns true", "Prints TRY and returns false", "Fails to compile"], 1, "A value mismatch happens at runtime (`TRY` + `false`). Syntax mistakes like a missing semicolon stop the compiler before the program runs.")
      ],
      "practice.0": [list("What FPS do you get for a 20 ms frame, and for an 8 ms frame? (Enter both numbers, separated by a comma.)", [50, 125], "1,000 ÷ 20 = 50 FPS, and 1,000 ÷ 8 = 125 FPS.")],
      "practice.1": [num("What expected FPS should you put into your new 25 ms test?", 40, "1,000 ÷ 25 = 40 FPS.")],
      "practice.2": [choice("If your latest edit failed to compile, can running the old .exe verify your new code?", ["Yes", "No"], 1, "The old executable still contains code from the previous successful build — none of your new edits are in it.")],
      transfer: [list("Compute the FPS for frame times of 6.25 ms, 32 ms, and 125 ms (in that order).", [160, 31.25, 8], "Divide 1,000 by each frame time: 1000/6.25 = 160, 1000/32 = 31.25, and 1000/125 = 8.")],
      challenge: [list("Starting at 80 FPS, what frame time (in ms) does `frame_ms(80.0f)` return, and what FPS does `fps(frame_ms(80.0f))` return?", [12.5, 80], "1,000 ÷ 80 = 12.5 ms, and converting back with 1,000 ÷ 12.5 recovers 80 FPS.")]
    },

    "0/1": {
      bridge: [list("For `frames = {12, 19, 16}`, enter three numbers in order: (1) the value of `ms` on the 2nd iteration, (2) the number printed when using `ms > 16`, and (3) the extra number printed if you change it to `ms >= 16`.", [19, 19, 16], "Iteration 2 sees 19 (the only number > 16). Changing to `>=` also prints the exact tie, 16.")],
      reading: [
        choice("In LearnCpp's `if (x == 0)` example, which input makes the line inside the `if` run?", ["Only 0", "Only 5", "Both 0 and 5"], 0, "`==` tests equality: 0 == 0 is true, while 5 == 0 is false."),
        list("In LearnCpp's range-for example over the Fibonacci vector, what are the first two values assigned to `num`?", [0, 1], "A range-for loop visits elements in order starting from index 0, so it gets 0 then 1.")
      ],
      recall: [choice("How does a single very long frame feel while playing a game?", ["A visible stutter/freeze while the previous picture stays on screen", "A permanently higher frame rate"], 0, "The screen can't update until that slow frame finishes, creating a noticeable hitch even if other frames are fast.")],
      "learn.2": [
        list("Tracing `longest` on `[4, 4, 9, 6]`, what is the value of `best` after each of the 4 passes?", [4, 4, 9, 9], "Pass 1 sets best = 4, pass 2 stays 4, pass 3 updates to 9, pass 4 stays 9."),
        list("Numbering the passes 1, 2, 3, 4: on which passes does `sample > best` execute `best = sample`?", [1, 3], "Only pass 1 (4 > 0) and pass 3 (9 > 4) are strictly greater."),
        list("With `sample >= best`, on which passes does `best = sample` execute?", [1, 2, 3], "Pass 2 (4 >= 4) also triggers the assignment, though the final answer is still 9.")
      ],
      "practice.0": [
        list("For `{10, 16, 25, 17}`, enter the running sum after each of the 4 elements.", [10, 26, 51, 68], "0+10 = 10, 10+16 = 26, 26+25 = 51, 51+17 = 68."),
        num("What does `total({})` return for an empty list?", 0, "The loop runs zero times and returns the initial `sum` of 0.")
      ],
      "practice.1": [choice("Which of the three starter tests actually catches the broken `return 0;` placeholder?", ["frames = {10, 16, 25, 17}, budget 16", "{16}, budget 16", "Empty list {}, budget 16"], 0, "The placeholder returns 0, which accidentally matches both the exact-tie test and empty-list test — only the mixed list expects 2.")],
      "practice.2": [
        list("For `{16, 17, 16, 18}` with a 16 ms budget, enter the count using `>` first, then the count using `>=`.", [2, 4], "Strictly over 16 counts 17 and 18 (2 frames). Inclusive `>= 16` also counts both 16s (4 frames)."),
        choice("If you change `>` to `>=` in `count_over()` while keeping the expected answers fixed, which checks fail (`TRY`)?", ["Only the empty trace", "The mixed list, the single exact-tie test, and your new two-tie test", "Only your new two-tie test"], 1, "Every test containing a 16 ms tie increases its count under `>=`; only the empty list still returns 0.")
      ],
      transfer: [
        list("In the extra checks, enter the strict over-budget count (`>`) for Calls 1, 2, and 3 (in order).", [2, 3, 0], "Call 1 counts 12 and 8 (2); Call 2 counts 22, 22, and 21 (3); Call 3 starts with a fresh counter and finds none over 8 (0)."),
        num("If Call 1 used `>=` instead of `>`, how many frames would it count?", 4, "Both 7 ms exact ties would be counted alongside 12 and 8.")
      ],
      challenge: [
        list("With a 16 ms budget, how many milliseconds over budget is each frame in `[14, 16, 19, 22]`?", [0, 0, 3, 6], "14 and 16 are on time (0 ms late), 19 is 3 ms late, and 22 is 6 ms late."),
        num("What total lateness (in ms) should `total_lateness({14, 16, 19, 22}, 16)` return?", 9, "0 + 0 + 3 + 6 = 9 ms of total lateness.")
      ]
    },

    "0/2": {
      bridge: [list("After `int pos = 1; int chosen = frames.at(pos); ++pos;` on `{12, 19, 16}`, enter three numbers in order: `chosen`, `pos`, and what a new `frames.at(pos)` returns.", [19, 2, 16], "`chosen` holds the copy 19; `pos` increments to 2; reading `frames.at(2)` returns 16.")],
      reading: [
        num("In the 5-element vector `primes = {2, 3, 5, 7, 11}`, what value is `primes[2]`?", 5, "Indices start at 0, so index 2 is the third element: 5."),
        list("In `for (int k = 0; k < 3; ++k)`, which values of `k` enter the loop body?", [0, 1, 2], "The loop stops as soon as `k` reaches 3 because `3 < 3` is false.")
      ],
      recall: [num("In a 2 × 3 row-major matrix, how many flat array positions separate column 1 of row 0 from column 1 of row 1?", 3, "Column 1 sits at index 1 in row 0 and index 4 in row 1; moving down one row advances by the row width (3).")],
      "learn.1": [list("On flattened `[5, 8, 1, 7, 2, 9]` (two rows of 3), if the 2-step loop starts at `first = 2`, enter: the two indices it reads, their sum, and the correct starting index for row 1 (4 numbers total).", [2, 3, 8, 3], "Starting at 2 reads index 2 (1) and index 3 (7), summing to 8. Row 1 actually starts at index 3.")],
      "practice.0": [list("Enter the four entries of the starter product C = A × B in row-major order: C(0,0), C(0,1), C(1,0), C(1,1).", [4, 5, 10, 11], "Row 0: 1×1+2×0+3×1 = 4, and 1×0+2×1+3×1 = 5. Row 1: 4×1+5×0+6×1 = 10, and 4×0+5×1+6×1 = 11.")],
      "practice.1": [
        num("In a row-major matrix with width 3, what flat index holds row 1, column 2?", 5, "1 × 3 + 2 = 5."),
        list("For C(1,0), enter the flat indices read from A and B at k = 1, followed by A and B at k = 2 (4 numbers total).", [4, 2, 5, 4], "Row 1 of A is indices 3, 4, 5. Col 0 of B (width 2) is indices 0, 2, 4."),
        list("What are the 4 values stored at those four indices (in the same order)?", [5, 0, 6, 1], "A[4]=5, B[2]=0, A[5]=6, B[4]=1. Together with k=0 (4×1=4), the dot product is 4 + 0 + 6 = 10.")
      ],
      "practice.2": [
        list("In the Matrix tile explorer (default 4×4 matrices), enter the A and B values for the 3rd pair and then the 4th pair of C[0,0] (4 numbers total).", [-3, -2, 0, 2], "Phase 2 multiplies A[0,2]×B[2,0] = (-3)×(-2) and A[0,3]×B[3,0] = 0×2."),
        num("What is the final value of C[0,0] after both phases?", 11, "Phase 1 gives 5, and Phase 2 adds 6 + 0 = 6, for 11.")
      ],
      transfer: [list("Enter 3 numbers in order: the flat index of (2, 1) at width 4, C(0,3), and C(1,1) for the extra matrix test.", [9, -8, 2], "Index = 2×4+1 = 9; C(0,3) = 2×(-2)+(-1)×4 = -8; C(1,1) = 3×2+4×(-1) = 2.")],
      challenge: [list("Multiplying row `[-1, 2]` by B (`[[4, 0, 2], [3, -2, 5]]`), what are the 3 output values?", [2, -4, 8], "Col 0: -4+6 = 2; Col 1: 0-4 = -4; Col 2: -2+10 = 8.")]
    },

    "0/3": {
      bridge: [choice("After `int light = 3; int* p = &light; *p = 8;`, what happened?", ["`light` now holds 8, and `p` still points to `light`", "`p` now points to a brand-new variable named 8"], 0, "`*p = 8;` follows the address stored in `p` and overwrites the value inside `light`.")],
      reading: [
        num("In LearnCpp's `*ptr = 6;` example, what value is in `x` afterward?", 6, "`ptr` holds the address of `x`, so assigning through `*ptr` modifies `x` directly."),
        choice("When a pointer points to element 0 of a vector, which element does writing to offset 0 (`ptr[0]`) change?", ["The first element (index 0)", "The second element (index 1)"], 0, "Offset 0 is the starting address itself; `n` tells the function how many consecutive elements starting there it may touch.")
      ],
      workbench: [list("If `ptr` starts at `&arr[0]` and is later moved to `&arr[3]`, which index of `arr` does `ptr[1]` access before and after the move?", [1, 4], "`ptr[1]` is always 1 element past where `ptr` currently points: 0+1 = 1, then 3+1 = 4.")],
      recall: [list("List every valid 0-based index of a vector of length 4.", [0, 1, 2, 3], "Length 4 means indices 0, 1, 2, and 3. Accessing `.at(4)` throws `std::out_of_range`.")],
      "learn.1": [
        list("Starting from `[40, 30, 20, 10, 0]` with `pair = light.data() + 2`, what are all 5 values after swapping `pair[0]` and `pair[1]`?", [40, 30, 10, 20, 0], "Slots 2 and 3 swap from 20, 10 to 10, 20; the other slots stay unchanged."),
        list("If the final line had a bug (`pair[1] = pair[0];` instead of `pair[1] = saved;`), what are the 5 values?", [40, 30, 10, 10, 0], "Because `pair[0]` was already overwritten with 10, copying `pair[0]` loses the original 20.")
      ],
      "practice.0": [
        list("Starting each time from `input = [7, 8]` and `output = [90, 91]`, enter the 2 output values after `copy_first` with n = 0, followed by the 2 output values with n = 1 (4 numbers total).", [90, 91, 7, 91], "With n = 0 nothing changes ([90, 91]). With n = 1 only slot 0 receives 7 ([7, 91])."),
        list("Scaling `[2, -1, 0, 6]` by `0.5` into a 5-slot output buffer pre-filled with `99`s, what should all 5 output slots contain?", [1, -0.5, 0, 3, 99], "Slots 0–3 receive the four scaled values; slot 4 stays 99 because it is outside `n = 4`.")
      ],
      "practice.1": [choice("Suppose slots 0–3 have the exact right scaled numbers, but the guard at slot 4 changed from 99 to something else. What bug caused that?", ["The loop ran one iteration too far (e.g., `i <= n` instead of `i < n`)", "The loop started at `i = 1`", "The multiplication factor was wrong"], 0, "Running one extra iteration overwrites index `n` (the guard slot) even though indices 0..n-1 were right.")],
      "practice.2": [
        list("After scaling the first 2 values of `[2, -1, 0, 6]` by `0.0f` into `short_out = {7, 8, 9, 10}`, what should all 4 slots of `short_out` hold?", [0, 0, 9, 10], "Slots 0 and 1 become 0 (or -0, which equals 0), while guards at slots 2 and 3 stay 9 and 10."),
        reason("Why did we initialize `short_out` with `{7, 8, 9, 10}` instead of `{0, 0, 0, 0}`?", "If slots 0–1 already started at 0, a broken function that never wrote anything would still pass. And keeping nonzero guards (9 and 10) at slots 2–3 immediately catches any extra write past `n = 2`.")
      ],
      transfer: [
        list("Enter all 6 output slots after scaling 3 inputs by `-0.5` starting at `output[1]`.", [90, 1.5, -3, -1, 94, 95], "Slots 1, 2, 3 receive the three scaled results; slots 0, 4, and 5 keep their starting values."),
        num("What is `output[0]` after the follow-up `n = 0` call?", 90, "A zero-length call writes zero elements, so `output[0]` remains 90.")
      ],
      challenge: [list("After in-place scaling `scale(v + 1, v + 1, 3, -2.0f)` on `{90, 2, -1, 4, 91}`, what are all 5 values?", [90, -4, 2, -8, 91], "Slots 1, 2, and 3 are each read and replaced in place; the outer guards 90 and 91 are untouched.")]
    },

    "0/4": {
      bridge: [list("In the 2×2 nested loop, the first printed `(block, local)` pair is `0, 0`. Enter the remaining 3 pairs as 6 numbers in order.", [0, 1, 1, 0, 1, 1], "Block 0 finishes local = 1 before Block 1 resets local to 0 and runs 0, then 1.")],
      reading: [choice("In LearnCpp's nested loop example, what are the first two lines printed?", ["a012 then b012", "a0 then b1", "a012 then b345"], 0, "For each outer letter, the inner loop resets to 0 and prints 0, 1, 2.")],
      workbench: [
        choice("In `vecAdd<<<1, 256>>>`, which of the two numbers do you change to launch 2 blocks of 256 threads?", ["The first number (block count)", "The second number (threads per block)"], 0, "The syntax is `<<<numBlocks, threadsPerBlock>>>`, so changing the first number to 2 launches two 256-thread blocks."),
        list("We have 5 array elements (`n = 5`), each handled by 1 worker, and workers come in blocks of 4 (`block_size = 4`). Before any worker runs, how many blocks does C++ integer division `5 / 4` request, and how many does `(5 + 4 - 1) / 4` request? (Enter both numbers in order.)", [1, 2], "Integer division `5 / 4` drops the remainder and gives `1` block (only 4 workers — missing index 4!). `(5 + 4 - 1) / 4 = 8 / 4 = 2` blocks."),
        choice("With 4 workers per block, Block 0 covers indices 0, 1, 2, and 3. How many blocks total do you need so that a worker reaches the 5th element (`visits[4]`)?", ["1 block", "2 blocks"], 1, "You need 2 blocks (8 workers): Block 1 lane 0 gets global index 4 and visits `visits[4]`, while lanes 1–3 (indices 5, 6, 7) fail `index < 5` and skip.")
      ],
      recall: [num("In a flat array where each row has 8 elements, how many elements come before row 2 (counting rows from 0)?", 16, "Row 0 uses indices 0–7 and row 1 uses indices 8–15, so 16 elements come before row 2.")],
      "learn.1": [
        list("An array of 4 slots starts at `[0, 0, 0, 0]`. Two sweeps each add 1 to indices 0 and 1. What are the 4 counts afterward?", [2, 2, 0, 0], "Indices 0 and 1 each get incremented twice; indices 2 and 3 are never touched."),
        num("How many of those 4 slots were visited exactly once?", 0, "Every slot ended with either 2 or 0 — none ended with 1.")
      ],
      "practice.0": [
        list("With 4 workers per block, what global index does lane 0 get in Block 0, and what global index does lane 0 get in Block 1?", [0, 4], "Block 0 uses indices 0–3, so Block 1 starts at global index 4."),
        list("For an array of 5 elements (`n = 5`), list every global worker index that passes `index < 5` and writes to the array.", [0, 1, 2, 3, 4], "Valid indices are 0 through 4; workers with index 5, 6, or 7 skip.")
      ],
      trace: [choice("In the 4-slot, 3-workers-per-block interactive trace, what do the first two workers in Block 1 (lanes 0 and 1) do?", ["Both write", "Lane 0 writes (index 3), and lane 1 skips (index 4)", "Both skip"], 1, "Block 1 lane 0 gets index 3 (< 4, so it writes), while lane 1 gets index 4 (not < 4, so it skips).")],
      "practice.1": [
        list("With array length `n = 9` and `block_size = 4`, enter the three worker counts in order: started, wrote, skipped.", [12, 9, 3], "ceil(9 / 4) = 3 blocks → 3 × 4 = 12 workers start; indices 0–8 write (9); indices 9–11 skip (3)."),
        list("Repeat the three counts (started, wrote, skipped) for `n = 0`.", [0, 0, 0], "(0 + 4 - 1) / 4 = 3 / 4 = 0 blocks, so 0 workers start, 0 write, and 0 skip.")
      ],
      "practice.2": [
        choice("In the starter version of `add_student` inside `first_kernel.cu`, which threads actually perform the additions?", ["Every thread with `i < n`", "Only thread 0 in block 0", "All 256 threads in block 0"], 1, "The starter has `if (blockIdx.x == 0 && threadIdx.x == 0)` and runs a sequential loop on that single thread!"),
        reason("What does `PASS serial and student, n=257` prove, and why is 257 a better test than 256?", "It proves all 257 output sums match the CPU reference, and because `blockDim.x = 256`, `n = 257` forces a second block (testing multi-block indexing). However, PASS only checks the output values — it can't tell whether 1 thread or 257 threads did the work."),
        list("Two threads both read `counter == 0` before either writes back `0 + 1`. Enter 4 numbers: what Thread A writes, what Thread B writes, the final counter value, and what the final value WOULD have been if they ran one after the other.", [1, 1, 1, 2], "Both compute 0 + 1 = 1 and overwrite the same slot with 1 (losing an increment). Running sequentially gives 0 → 1 → 2.")
      ],
      transfer: [
        list("With 6 workers per block, how many blocks launch for array lengths 0, 3, 6, and 13?", [0, 1, 1, 3], "Use ceiling division: ceil(0/6)=0, ceil(3/6)=1, ceil(6/6)=1, ceil(13/6)=3."),
        list("For those same lengths (0, 3, 6, 13), how many array slots should end with exactly 1 visit?", [0, 3, 6, 13], "Every valid element gets exactly 1 visit; for length 13, 18 workers launch and the last 5 skip.")
      ],
      "ink.cutoff": [list("For pixel row `[7, 8, 9]` with `cutoff = 8`, enter the count using `>= 8` first, then the count using `> 8`.", [2, 1], "With `>= 8`, both 8 and 9 count (2). With `> 8`, only 9 counts (1).")],
      "ink.gpu": [
        num("If one GPU thread is assigned to count dark pixels in Row 1, which index of `counts` should it write its answer to?", 1, "Row 0 writes to `counts[0]`, Row 1 writes to `counts[1]`, and in general row `r` writes to `counts[r]`."),
        choice("Suppose the image has 2 rows (0 and 1), and a 3rd GPU thread gets `row = 2`. What should it do?", ["Recount row 1", "Return immediately without reading pixels or writing to `counts`", "Write 0 into `counts[2]`"], 1, "Row 2 doesn't exist — checking `if (row >= height) return;` prevents out-of-bounds reads and writes.")
      ],
      challenge: [
        list("With 8 workers taking turns over 19 array slots (indices 0–18), which indices does Worker 2 visit (in order)?", [2, 10, 18], "Start at 2 and add 8 each round: 2, 10, 18 (the next would be 26, past index 18)."),
        list("Which indices does Worker 0 visit?", [0, 8, 16], "Start at 0 and step by 8: 0, 8, 16."),
        list("Which indices does Worker 7 visit?", [7, 15], "Start at 7 and step by 8: 7, 15 (7 + 16 = 23 is out of bounds)."),
        reason("In one sentence, how would you write a grid-stride `for` loop for any worker `tid` with `num_workers = 8` and `n = 19`?", "Start `i = tid`, continue while `i < n`, and advance by `i += num_workers` (`for (int i = tid; i < n; i += num_workers)`). That grid-stride loop is a classic CUDA idiom!")
      ]
    }
  };
})();
