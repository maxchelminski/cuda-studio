(() => {
  "use strict";

  const run = number => "powershell -ExecutionPolicy Bypass -File .\\labs\\primer\\run.ps1 " + number;
  const edit = filename => ".\\Edit-CourseFile.ps1 .\\labs\\primer\\" + filename;

  window.PRIMER_GUIDES = {
    "0/0": {
      workbench: "Start by running Exercise 1. If PowerShell prints TRY or PASS, your C++ compiler is already working — you only need Setup if it reports a missing compiler.",
      intro: "Every real-time game or renderer draws one frame after another. If you know how many milliseconds a single frame takes, you can immediately compute the frame rate in frames per second (FPS). Today you'll edit, compile, and test your first C++ function.",
      orientation: "Basic division is the only math you need today. In the quick reading, pay attention to `main()` (where every C++ program starts) and how calling a function sends an input in and gets a return value back.",
      sections: [
        {
          title: "How frame time converts to FPS",
          body: [
            "Suppose each frame takes 10 milliseconds (ms). One second has 1,000 ms, so in one second the renderer can finish 1,000 ÷ 10 = 100 frames — that's 100 FPS.",
            "It works in reverse too: at 100 FPS, each frame has a time budget of 1,000 ÷ 100 = 10 ms. If a frame takes twice as long (20 ms), the frame rate drops in half (50 FPS)."
          ]
        },
        {
          title: "Anatomy of a small C++ function",
          body: [
            "A function is a reusable named calculation. This one takes a duration in seconds and returns the same duration in milliseconds by multiplying by 1,000.",
            "Calling `seconds_to_ms(0.25f)` returns `250.0f`. The trailing `f` tells C++ to store the constant as a 32-bit `float`."
          ],
          terms: [
            {term: "float", meaning: "The return type: a number that can hold a fractional part (like 12.5)."},
            {term: "seconds_to_ms", meaning: "The function's name — what you type when you call it."},
            {term: "float seconds", meaning: "The input parameter. Inside the function, `seconds` holds whatever value the caller passed in."},
            {term: "return seconds * 1000.0f;", meaning: "Sends the result back to the caller. Semicolons end statements, and curly braces `{ }` enclose the function body."}
          ],
          language: "C++",
          code: "float seconds_to_ms(float seconds) {\n    return seconds * 1000.0f;\n}"
        },
        {
          title: "Tracing a value from a function into a test",
          language: "C++ · example inside main()",
          code: "float elapsed_ms = seconds_to_ms(0.5f);\nfloat frame_ms = elapsed_ms / 8.0f;\nbool passed = check(\"eight equal frames\", frame_ms, 62.5f);",
          body: [
            "Suppose 8 equal frames took half a second total. Look at the first line from right to left: `seconds_to_ms(0.5f)` returns `500.0f`, which is stored in the new variable `elapsed_ms`. On the next line, dividing by `8.0f` gives `62.5f` ms per frame.",
            "The third line calls this course's `check` helper with three arguments: a text label, the value your code actually computed (`frame_ms`), and the expected answer (`62.5f`). When they match, it prints `PASS eight equal frames | got 62.5, expected 62.5` and returns `true` (stored in the `bool` variable `passed`)."
          ],
          rehearsal: {
            prompt: "Trace what happens if you change only the first line to `seconds_to_ms(1.0f)`, leaving the division by 8 and expected value `62.5f` unchanged. Will `check` print PASS or TRY, what two numbers (`got` and `expected`) will it print, and what value goes into `passed`? Also: would that test line print at all if a missing semicolon broke compilation?",
            hint: "Start with 1.0 second = 1,000 ms, divide by 8, and compare with the hard-coded expected value 62.5.",
            answer: "It prints `TRY  eight equal frames | got 125, expected 62.5` and stores `false` in `passed`. A `TRY` line means the program compiled and ran, but got the wrong number. A missing semicolon stops the compiler before any test can run."
          }
        },
        {
          title: "Your workflow for every C++ session",
          body: [
            "Keep this browser tab open for the lesson and notes. You'll run build/test commands in **Course PowerShell** and edit `.cpp` source files in **VS Code** (or Notepad++ if you prefer).",
            "Click **Start the Guided Exercise** below to open Course PowerShell and run your first starter program."
          ]
        }
      ],
      practice: [
        {
          title: "Predict two FPS values and run the starter",
          body: ["Before running any code, calculate on paper (or in your notes) the FPS for a 20 ms frame and for an 8 ms frame."],
          actions: [
            {
              title: "Open Course PowerShell",
              body: ["Press `Win + E` to open File Explorer, go to `G:\\CUDA-Studio`, and double-click `Course PowerShell.cmd` (if Windows hides file extensions, it appears as `Course PowerShell`).", "Wait until you see a prompt like `PS G:\\CUDA-Studio>` — that's where you'll paste commands."]
            },
            {
              title: "Compile and run Exercise 1",
              body: ["Copy the command below, paste it into Course PowerShell, and press Enter. The `1` at the end selects Exercise 1."],
              command: run(1),
              expected: "One quarter second is 250 milliseconds.\nTRY  20 ms frame | got 20, expected 50\nTRY  8 ms frame | got 8, expected 125"
            },
            {
              title: "Read the output",
              body: ["`got` is what the starter's `fps()` function actually returned, and `expected` is the right answer. Both lines say `TRY` right now because the starter placeholder simply returns `milliseconds` unchanged instead of converting it to FPS."]
            }
          ]
        },
        {
          title: "Fix fps() and add a 25 ms test",
          body: [],
          actions: [
            {
              title: "Open 01_frames.cpp in your editor",
              body: ["Run this command in Course PowerShell to open `01_frames.cpp` in VS Code (add `-Editor Notepad++` if you want Notepad++). Find the `// STUDENT` comment inside `fps()`."],
              command: edit("01_frames.cpp")
            },
            {
              title: "Implement the FPS formula",
              body: ["Replace `return milliseconds;` so `fps()` divides the number of milliseconds in 1 second (`seconds_to_ms(1.0f)`) by `milliseconds`. Save with `Ctrl+S`.", "Back in Course PowerShell, rerun Exercise 1. Both original checks should now print `PASS`."],
              command: run(1)
            },
            {
              title: "Update the first test to 25 ms",
              body: ["In `main()`, find `bool first = check(...);`. Change the label from `\"20 ms frame\"` to `\"25 ms frame\"`, change `fps(20.0f)` to `fps(25.0f)`, and replace `50.0f` with the FPS you calculated for 25 ms (written as a float, e.g., `40.0f`).", "Save and rerun. Copy the passing 25 ms output line into your notes under Check & Save."]
            }
          ]
        },
        {
          title: "Trigger a compiler error and fix it",
          body: ["Delete the semicolon at the end of your `return` line inside `fps()`, save, and rerun Exercise 1. Because the syntax is broken, the compiler stops before running any tests."],
          command: run(1),
          actions: [
            {
              title: "Read the compiler diagnostic",
              body: ["Look for the line in PowerShell containing both `01_frames.cpp` and `error`. Depending on which compiler runs, it looks like one of these:"],
              language: "GCC (top) or Microsoft C++ (bottom)",
              code: "01_frames.cpp:10:46: error: expected ';' before '}' token\n01_frames.cpp(11,1): error C2143: syntax error: missing ';' before '}'"
            },
            {
              title: "Save and verify your diagnostic",
              body: ["`10:46` means line 10, column 46; `(11,1)` means line 11, column 1. Compilers often report a missing semicolon on the *next* line (the closing `}`), because that's where they finally realize the previous statement never ended.", "Copy your actual error line into your notes on the Check & Save tab and use the built-in diagnostic checker there to verify you captured the file, line, and message."]
            },
            {
              title: "Put the semicolon back and verify",
              body: ["Restore the semicolon, save, and rerun Exercise 1 so both the 25 ms and 8 ms tests print `PASS`. In your notes, write one sentence explaining why running an older `.exe` after a failed compile would mislead you."]
            }
          ]
        }
      ]
    },

    "0/1": {
      workbench: "Use the source link to read 02_loop.cpp in the browser, and run the Edit command in PowerShell to modify it. Use the extra-checks command under Try it on new inputs once your main tests pass.",
      intro: "Average FPS can look smooth even while a game stutters. Given a list of frame times, you'll write a loop that counts how many frames went over a time budget — your first algorithm that keeps state as it scans through data.",
      orientation: "In Session 1, `fps()` took one number and returned one number. Here your function receives a whole `std::vector<int>` of frame times. Trace the first two items by hand before editing.",
      sections: [
        {
          title: "Frame traces and std::vector",
          body: [
            "A frame trace is simply a list of frame durations in order. With a 16 ms budget, the trace `[12, 20, 16]` has **1** late frame: 20 ms is strictly over budget, while 16 ms is right on time.",
            "In C++, `std::vector<int>` holds a list of integers. Writing the parameter as `const std::vector<int>& samples` lets the function read the caller's list directly without copying it (`&`) and prevents accidental edits (`const`)."
          ]
        },
        {
          title: "Keeping a running total in a loop",
          body: [
            "This loop sums all frame times. `int sum = 0;` creates a variable *outside* the loop so its value carries over from one iteration to the next. `for (int sample : samples)` visits each element in order, and `sum += sample;` adds it to `sum`.",
            "On `[12, 20, 16]`, `sum` goes `0 → 12 → 32 → 48`. For your exercise, you'll use the same pattern — except instead of summing durations, you'll count how many frames exceed the budget."
          ],
          language: "C++",
          code: "int sum = 0;\nfor (int sample : samples) {\n    sum += sample;\n}\nreturn sum;"
        },
        {
          title: "Using an if statement inside a loop",
          language: "C++ · finding the longest frame",
          code: "int longest(const std::vector<int>& samples) {\n    int best = 0;\n    for (int sample : samples) {\n        if (sample > best) {\n            best = sample;\n        }\n    }\n    return best;\n}",
          body: [
            "Here `longest()` tracks the largest frame time seen so far (assuming non-negative frame times). On each pass, `if (sample > best)` checks whether the current frame beats `best`; if so, it updates `best`.",
            "Tracing `[6, 3, 11]`: 6 > 0 (update to 6), 3 > 6 is false (stay 6), 11 > 6 (update to 11), and after the loop finishes it returns `11`. On an empty list `{}`, the loop body never runs and it returns `0`."
          ],
          rehearsal: {
            prompt: "Trace `longest` on `[4, 4, 9, 6]`. Write down `best` after each of the 4 passes and note which passes run `best = sample;`. Now repeat with `>=` instead of `>`. Does the returned answer change?",
            hint: "Watch pass 2 (the second 4). With `>=`, `4 >= 4` is true so the assignment runs again, even though `best` already holds 4.",
            answer: "In both versions, `best` after each pass is `4, 4, 9, 9` and the return value is `9`. With `>` the assignment runs on passes 1 and 3; with `>=` it runs on passes 1, 2, and 3. In your counting exercise (`++count`), a tie *does* change the final count!"
          }
        },
        {
          title: "Understanding the three starter tests in main()",
          language: "C++ · starter checks in 02_loop.cpp",
          code: "bool a = check(\"strictly over 16\", count_over(frames, 16), 2);\nbool b = check(\"exact tie\", count_over({16}, 16), 0);\nbool c = check(\"empty trace\", count_over({}, 16), 0);",
          body: [
            "Look at why `main()` already has three separate calls to `count_over`: check `a` tests a mixed list `frames = {10, 16, 25, 17}` where 25 and 17 are strictly over 16 (expected: 2); check `b` passes a tiny 1-element list `{16}` specifically to make sure an exact tie returns 0; and check `c` passes an empty list `{}`.",
            "Finally, `return a && b && c ? 0 : 1;` returns exit code `0` (success) to PowerShell only if every single check passed."
          ]
        }
      ],
      practice: [
        {
          title: "Trace the starter's total() and run Exercise 2",
          body: ["Before running PowerShell, write down the running total of `{10, 16, 25, 17}` after each element, and predict what `total({})` returns. Then run Exercise 2."],
          command: run(2),
          expected: "Total frame time: 68 ms\nTRY  strictly over 16 | got 0, expected 2\nPASS exact tie | got 0, expected 0\nPASS empty trace | got 0, expected 0"
        },
        {
          title: "Implement count_over()",
          body: ["Open `02_loop.cpp` using the command below. Inside `count_over`, replace `return 0;` with a loop that initializes an integer counter to 0 before the loop, increments it (`++count;`) whenever `sample > budget`, and returns it after the loop."],
          command: edit("02_loop.cpp"),
          actions: [{
            title: "Save and rerun Exercise 2",
            body: ["Save with `Ctrl+S` and rerun in PowerShell. All three checks should now say `PASS`. Notice that `exact tie` and `empty trace` already said `PASS` on the broken placeholder `return 0;` — only `strictly over 16` caught that the function wasn't implemented yet!"],
            command: run(2)
          }]
        },
        {
          title: "Add a multi-tie test and test > vs. >=",
          body: [
            "Now add a fourth test `bool d` right after `bool c` in `main()` to test a trace with *two* exact ties: `count_over({16, 17, 16, 18}, 16)`. Work out the strict expected count yourself, give the check a clear label, and update the final return line to `return a && b && c && d ? 0 : 1;`.",
            "Save and run to verify all four checks pass. Then temporarily change `>` to `>=` inside `count_over()` (leaving the expected values unchanged) and rerun. Predict which checks will turn into `TRY` — you'll see both `exact tie` (`b`) and your new two-tie check (`d`) catch the off-by-one boundary error. Restore `>`, save, and rerun so all four pass."
          ],
          command: run(2)
        }
      ]
    },

    "0/2": {
      workbench: "Use the Matrix tile explorer only in Step 3: keep the default 4×4 matrices, click Next phase once to verify C[0,0], and come back here. The tiling speedup benchmarks happen in Week 2, Day 3.",
      intro: "On paper a matrix has rows and columns, but in computer memory (and on a GPU) it lives in one flat 1D array. Today you'll write the index formula that maps `(row, col)` to a flat array position and trace how matrix multiplication walks through memory.",
      orientation: "In Session 2, a range-for loop visited every item in order. Matrix multiplication needs random access to specific rows and columns, so you'll use an indexed `for` loop and compute flat addresses directly.",
      sections: [
        {
          title: "Flattening a 2D matrix into 1D memory (row-major order)",
          body: [
            "In row-major order, all elements of row 0 come first, followed immediately by row 1, then row 2, and so on (all numbered from 0).",
            "Look at a matrix with 4 columns (`width = 4`): row 0 uses indices 0–3, and row 1 starts at index 4. So `(row 1, col 2)` sits at index `1 × 4 + 2 = 6`. Notice that `width` is always the number of columns of the *specific* matrix you're indexing into."
          ],
          language: "2 × 4 matrix in row-major memory",
          code: "             col 0   col 1   col 2   col 3\nrow 0 index     0       1       2       3\nrow 1 index     4       5       6       7"
        },
        {
          title: "Step 1: compute the flat index. Step 2: read the value.",
          language: "C++",
          code: "std::vector<int> pixels = {8, 3, 6, 4};  // 2 rows × 2 cols\nint first = 2;\nint total = 0;\nfor (int k = 0; k < 2; ++k) {\n    total += pixels.at(first + k);\n}",
          body: [
            "Read the `for` header in three parts: `int k = 0` runs once at the start; `k < 2` is checked before every iteration; `++k` runs at the end of each iteration. So the loop runs with `k = 0` and `k = 1`.",
            "For `k = 0`, `first + k` is index 2 (`pixels.at(2) == 6`). For `k = 1`, it's index 3 (`pixels.at(3) == 4`), giving `total = 10`. In `03_matrix.cpp`, `a.at(index_of(row, k, inner))` works the same way: `index_of` computes the flat index, and `.at()` fetches the number stored there."
          ],
          rehearsal: {
            prompt: "Suppose a 2 × 3 image has row 0 = `[5, 8, 1]` and row 1 = `[7, 2, 9]`, flattened into `[5, 8, 1, 7, 2, 9]`. You want to sum the first two pixels of row 1 (which are 7 and 2). If you mistakenly set `first = 2` in the loop above, which two flat indices does it read, what sum do you get, and what should `first` actually be?",
            hint: "Write indices 0..5 under `[5, 8, 1, 7, 2, 9]` and see where row 1 actually begins.",
            answer: "With `first = 2`, the loop reads indices 2 and 3 (values 1 and 7), giving `8` — no crash because both indices are in bounds, just the wrong data! Row 1 actually starts at index `3`, which reads 7 and 2 for a sum of `9`."
          }
        },
        {
          title: "How dot products step through A and B differently",
          body: [
            "To compute one cell `C(row, col)`, you hold `row` of A and `col` of B fixed while `k` runs from `0` to `inner - 1`, adding `A(row, k) * B(k, col)`.",
            "Pay attention to memory strides: as `k` increases by 1, `A(row, k)` moves to the very next element in memory (stride 1), whereas `B(k, col)` jumps down an entire row of B (stride = width of B). That stride difference is huge later in CUDA!"
          ]
        }
      ],
      practice: [
        {
          title: "Compute the 2 × 2 product on paper first",
          body: ["Copy A and B below onto paper, number their rows and columns from 0, and write the flat 0-based indices (0–5) beside each entry of A and B. Then multiply A × B by hand so you have all four entries of C ready to check against your program."],
          language: "Starter matrices in 03_matrix.cpp",
          code: "A (2 rows × 3 cols)        B (3 rows × 2 cols)\n1  2  3                    1  0\n4  5  6                    0  1\n                           1  1"
        },
        {
          title: "Fix index_of() and verify C(1,1) and C(1,0)",
          body: ["Run Exercise 3 once first. The starter's `index_of(1, 2, 3)` asks for row 1, col 2 in a 3-column matrix, and prints `got 2, expected 5` because the starter ignores `row` and only returns `col`."],
          command: run(3),
          actions: [
            {
              title: "Fix index_of() in 03_matrix.cpp",
              body: ["Open `03_matrix.cpp` and replace the return expression in `index_of(int row, int col, int width)` using `row`, `width`, and `col`. Save with `Ctrl+S`."],
              command: edit("03_matrix.cpp")
            },
            {
              title: "Rerun and add a check for C(1,1)",
              body: ["Run Exercise 3 to confirm the three starter checks pass. Then in `main()`, duplicate the `bool z = check(...)` line for a fourth variable (e.g., `bool w`), change the label to `\"C(1,1)\"`, change column `0` to `1` in `dot_cell(a, b, 1, 1, 3, 2)`, plug in your hand-computed value for C(1,1), and add `&& w` to the final `return` line. Save and rerun so all four lines print `PASS`."],
              command: run(3)
            },
            {
              title: "Trace all 6 flat reads for C(1,0)",
              body: ["For `k = 0`, `dot_cell` reads A[3] (= 4) and B[0] (= 1). Write down the exact flat indices and values read from A and B for `k = 1` and `k = 2`, confirm their three products sum to 10, and keep that trace in your notes."]
            }
          ]
        },
        {
          title: "Quick preview in the Matrix tile explorer",
          body: [
            "Open **Matrix tile explorer** from the Workbench sidebar (it opens in a new tab). Keep the default 4 × 4 matrices, tile width 2, Output tile `(0, 0)`, and Trace cell `(0, 0)`. (Don't worry about the Week 2 tiling speedup section yet — you're just tracing one dot product split into two halves.)",
            "Look at the first two highlighted pairs for `C[0,0]` and its partial sum. Predict which two entries in row 0 of A and column 0 of B will light up next, then click **Next phase** once and verify the final sum for `C[0,0]`. Switch back here and mark step 3 complete."
          ]
        }
      ]
    },

    "0/3": {
      workbench: "The starter's `scale()` calls `copy_first()`, which only copies index 0. In Step 2 you'll replace that with a loop that scales exactly `n` elements without touching the guard slot.",
      intro: "GPU kernels don't receive `std::vector` objects — they receive raw memory addresses (pointers) plus a length `n`. Today you'll write a function that scales `n` floats through raw pointers and use guard values to verify it stops at the exact right boundary.",
      orientation: "In Session 3 you indexed inside a `std::vector` with `.at()`. Today your function receives a raw pointer (`float*`) to the first slot of an array, which does *no* automatic bounds checking — so stopping at `n` is 100% up to your loop.",
      sections: [
        {
          title: "Pointers, buffers, and length n",
          body: [
            "A **buffer** is a contiguous block of memory slots. When a `std::vector<float>` owns the memory, calling `in.data()` returns a pointer (`float*`) holding the address of slot 0.",
            "Inside `scale(const float* input, float* output, int n, float factor)`, `input[i]` reads element `i`, and `output[i]` writes element `i`. Because a raw pointer has no `.size()`, the caller passes `n` to tell your function how many elements (indices `0` through `n - 1`) it is allowed to touch."
          ]
        },
        {
          title: "Writing through a pointer modifies the caller's array",
          language: "C++",
          code: "std::vector<float> light = {8, 4, 2, 1};\nfloat* pair = light.data() + 1;\nfloat saved = pair[0];\npair[0] = pair[1];\npair[1] = saved;",
          body: [
            "`light.data()` points at slot 0 (`8`). Adding `1` advances the pointer to slot 1 (`4`). That means `pair[0]` is the exact same memory location as `light[1]`, and `pair[1]` is `light[2]`.",
            "Swapping through `pair` directly changes `light` into `{8, 2, 4, 1}`. Remember: `pair[i]` has no bounds checking, which is why bugs that write past `n` can silently corrupt neighboring data."
          ],
          rehearsal: {
            prompt: "Start with `light = {40, 30, 20, 10, 0}` and set `float* pair = light.data() + 2;`. After running the 3 swap lines above, what are all 5 values in `light`? What if the last line had a bug and said `pair[1] = pair[0];` instead of `pair[1] = saved;`?",
            hint: "`light.data() + 2` points at index 2 (the value 20). Write out all 5 array values after each assignment.",
            answer: "The correct swap turns slots 2 and 3 into 10 and 20, giving `[40, 30, 10, 20, 0]`. With the bug `pair[1] = pair[0];`, slot 2 already became 10 on the previous line, so you overwrite slot 3 with 10 too, giving `[40, 30, 10, 10, 0]` and losing the 20."
          }
        },
        {
          title: "What the starter's copy_first() helper does",
          body: [
            "A `void` function doesn't return a value; instead, it writes its results into the caller's `output` buffer. The starter's `copy_first` only copies slot 0 (if `n > 0`) and leaves every other slot untouched."
          ],
          language: "C++",
          code: "void copy_first(const float* input, float* output, int n) {\n    if (n > 0) {\n        output[0] = input[0];\n    }\n}"
        },
        {
          title: "How guard values (sentinels) catch off-by-one writes",
          language: "Example: copying n = 1 value into a 3-slot output buffer",
          code: "Output index                 0    1    2\nBefore the call             90   91   92\nCorrect (1 write, n=1)       7   91   92\nBug (1 extra write)          7    8   92",
          body: [
            "Suppose `output` has 3 slots pre-filled with `[90, 91, 92]`, and you ask a function to write only `n = 1` value (`7`) at index 0. Slot 1 (`91`) is a **guard value** (also called a sentinel) — a known number placed right past the end of the requested write range.",
            "If an off-by-one loop accidentally writes an extra element into index 1, `output[1]` changes from `91` to `8`, and your test immediately catches the out-of-bounds write. If you had pre-filled `output` with zeros and were testing a write of zero, you might never notice a missed write OR an extra zero write!"
          ]
        }
      ],
      practice: [
        {
          title: "Predict copy_first() and the starter run",
          body: [
            "On paper, trace `copy_first` with `input = [7, 8]` and `output = [90, 91]` for `n = 0`, then again from `[90, 91]` for `n = 1`.",
            "Next, look at the starter test in `04_buffers.cpp`: `in = [2, -1, 0, 6]`, `out` has 5 slots all initialized to `99`, and we want to scale the 4 inputs by `0.5` into slots 0–3 while leaving slot 4 as `99`. Predict all 5 slots of `out`, then run Exercise 4."
          ],
          command: run(4)
        },
        {
          title: "Implement scale() for n elements",
          body: ["Open `04_buffers.cpp`. Inside `scale()`, replace the call to `copy_first(...)` with a `for` loop (`i` from `0` while `i < n`) that sets `output[i] = input[i] * factor;`."],
          command: edit("04_buffers.cpp"),
          actions: [{
            title: "Save and rerun Exercise 4",
            body: ["Save and run Exercise 4. Slots 0–3 verify the math, slot 4 verifies your loop didn't write past `n = 4`, and the final `n = 0` call verifies that calling `scale` with length 0 leaves `out[0]` untouched."],
            command: run(4)
          }]
        },
        {
          title: "Add the short_out test (4 explicit check lines)",
          body: [
            "Now add a second test in `main()` to verify scaling by `0.0f` on a 4-slot buffer where only the first 2 slots should change. Find `scale(in.data(), out.data(), 0, 5);` near the bottom of `main()` and paste these two lines right below it (above the final `return check(...)`):"
          ],
          language: "Add these 2 lines in main() of 04_buffers.cpp",
          code: "std::vector<float> short_out = {7, 8, 9, 10};\nscale(in.data(), short_out.data(), 2, 0.0f);",
          actions: [
            {
              title: "Predict all 4 slots of short_out",
              body: ["`n = 2` tells `scale()` to write only indices 0 and 1 (multiplying `2` and `-1` by `0.0f`). Indices 2 and 3 are guards that start at `9` and `10` and must NOT change. Write down your 4 expected values for `short_out[0..3]`."]
            },
            {
              title: "Write 4 separate check lines (one per slot)",
              body: [
                "Right below your new `scale(...)` call, add **four** separate `ok = check(...) && ok;` lines — one each for `short_out[0]`, `short_out[1]`, `short_out[2]`, and `short_out[3]`. (You don't need a loop here, and reuse the existing `bool ok` variable already declared earlier in `main()` — don't declare a second `ok2`.)",
                "Here is the first line; copy it 3 more times for slots 1, 2, and 3, updating the label, index, and expected value on each line (leaving the original `return check(...)` at the very bottom):"
              ],
              language: "Line 1 of 4",
              code: 'ok = check("short slot 0", short_out[0], 0.0f) && ok;',
              worked: {
                title: "See all 4 check lines together",
                code: 'ok = check("short slot 0", short_out[0], 0.0f) && ok;\nok = check("short slot 1", short_out[1], 0.0f) && ok;\nok = check("short slot 2", short_out[2], 9.0f) && ok;\nok = check("short slot 3", short_out[3], 10.0f) && ok;'
              }
            },
            {
              title: "Save, run, and check the output",
              body: [
                "Save and run Exercise 4. You should see all four `PASS short slot` lines (note: `-1 * 0.0f` prints `-0`, which equals `0` in floating point).",
                "In your notes, explain why starting `short_out` at `{7, 8, 9, 10}` instead of `{0, 0, 0, 0}` catches *both* a function that forgot to write slots 0–1 *and* a function that accidentally overwrote slots 2–3."
              ],
              command: run(4),
              expected: "PASS short slot 0 | got 0, expected 0\nPASS short slot 1 | got -0, expected 0\nPASS short slot 2 | got 9, expected 9\nPASS short slot 3 | got 10, expected 10"
            }
          ]
        }
      ]
    },

    "0/4": {
      workbench: "In Steps 1–2 you'll edit the CPU thread simulator (`05_threads.cpp`). In Step 3 you'll read a real CUDA kernel (`first_kernel.cu`). At the end, you'll write a short C++ function on real handwritten digit data (`ink_profile.hpp`).",
      checkpoint: {
        title: "Final C++ checkpoint: profile a handwritten digit",
        introduction: "Before moving into CUDA next week, put loops, conditionals, and flat 2D indexing together in one clean C++ function. A handwritten digit is stored as a flat list of pixel brightness values (`0` = blank paper, `16` = darkest ink). Your job is to write `row_profile()`, which counts how many pixels in each row are **at least `cutoff`** (`>= cutoff`) and writes each row's count into `counts.at(row)`.",
        digit: "005d910000dfaf5003f20b8004c008800580098004b01c7002e5ac00006da000",
        testRows: [[0, 8, 7, 12], [11, 2, 0, 3]],
        testCutoff: 8,
        actions: [
          {
            title: "Step B · Implement row_profile() in C++",
            body: [
              "Open `labs/primer/ink_profile.hpp` with the command below and replace the `// STUDENT` comment inside `row_profile(...)`. You are given `pixels` (a flat row-major vector of length `width * height`), `width` (pixels per row), `height` (number of rows), `cutoff` (minimum ink value to count), and `counts` (already sized to hold `height` answers).",
              "Write an outer loop over `row` (`0` to `height - 1`) and an inner loop over `col` (`0` to `width - 1`). For each row, start a fresh counter at `0`, look up the pixel at `pixels.at(row * width + col)`, add 1 if it is `>= cutoff`, and store the finished count in `counts.at(row)`."
            ],
            command: ".\\Edit-CourseFile.ps1 .\\labs\\primer\\ink_profile.hpp",
            commandLabel: "Open ink_profile.hpp in your editor",
            hint: "Remember Session 3's flat index formula (`row * width + col`) and Session 2's counter pattern. Reset your row counter to 0 at the start of every row so counts don't bleed from one row into the next."
          },
          {
            title: "Step C · Run the automated tests",
            body: [
              "Save `ink_profile.hpp` and run the test command below. Check that `non-square image` prints your hand-worked counts `[2, 1]`, and that all 5 test cases (including the real 8 × 8 UCI handwritten zero and guard check) print `PASS`."
            ],
            command: "powershell -ExecutionPolicy Bypass -File .\\labs\\primer\\run.ps1 -Study ink",
            commandLabel: "Compile and test ink_profile.hpp"
          }
        ],
        solution: "for (int row = 0; row < height; ++row) {\n    int dark = 0;\n    for (int col = 0; col < width; ++col) {\n        if (pixels.at(row * width + col) >= cutoff) {\n            ++dark;\n        }\n    }\n    counts.at(row) = dark;\n}",
        explain: "For the 2 × 4 test image, row 0 (flat indices 0–3) has 2 values ≥ 8 (`8` and `12`), and row 1 (flat indices 4–7) has 1 value ≥ 8 (`11`). Resetting `dark = 0` inside the outer loop keeps every row independent, and edge cases like `width == 0` or `height == 0` work cleanly without touching out-of-bounds slots."
      },
      intro: "So far, a single loop has walked through array positions one by one. A GPU works differently: it launches hundreds or thousands of independent workers (threads) grouped into equal-sized blocks, and each worker computes which single array index it owns. Today you'll build a tiny C++ simulator of that grid and inspect your first real CUDA kernel.",
      orientation: "Keep two terms clearly separate today: an **array index** (or **slot**) is a position in `visits` (0, 1, 2, …), and the **number stored at that index** counts how many workers visited it. If every valid index ends up holding `1`, your grid covered the array cleanly with zero overlaps and zero misses.",
      sections: [
        {
          title: "How a thread finds its global array index",
          body: [
            "CUDA launches threads in **blocks** of equal size. Every thread knows two numbers: which block it's in (`block`, called `blockIdx.x` in CUDA) and its local position inside that block (`lane`, called `threadIdx.x` in CUDA).",
            "Look at this example with 3 workers per block (`block_size = 3`): Block 0 handles global indices `0, 1, 2`, so Block 1 starts at global index `3` (`3, 4, 5`). Your C++ starter uses 4 workers per block, and the formula works for *any* `block_size`."
          ],
          language: "3 workers per block (block_size = 3)",
          code: "block          0  0  0     1  1  1\nlane           0  1  2     0  1  2\nglobal index   0  1  2     3  4  5"
        },
        {
          title: "Why the simulator checks that every slot was visited ONCE",
          language: "C++",
          code: "std::vector<int> visits(3, 0);  // 3 slots, all starting at 0\nfor (int sweep = 0; sweep < 2; ++sweep) {\n    for (int cell = 0; cell < 3; ++cell) {\n        visits.at(cell) += 1;\n    }\n}",
          body: [
            "Nested loops run the entire inner loop once for every pass of the outer loop. Here `sweep = 0` turns `visits` into `[1, 1, 1]`, and `sweep = 1` adds 1 again to get `[2, 2, 2]`.",
            "In `05_threads.cpp`, `simulate_launch(visits, block_size)` receives `std::vector<int>& visits` (mutable reference, so changes stick). If two workers accidentally compute the *same* `index`, that slot gets `2` while another slot stays `0` — which is why `main()` checks that every single slot finishes with **exactly 1** visit."
          ],
          rehearsal: {
            prompt: "Suppose `visits` has 4 slots starting at `[0, 0, 0, 0]`, and two sweeps each increment only indices 0 and 1. That's 4 total writes across 4 slots — what values end up in `visits`, and how many slots were visited *exactly once*?",
            hint: "Sweep 1 makes `[1, 1, 0, 0]`. Now run sweep 2 on the same array.",
            answer: "After sweep 2, `visits` is `[2, 2, 0, 0]`, so **0** slots were visited exactly once. Total writes alone can't detect collisions — checking that every slot equals 1 catches both duplicate writes and skipped slots."
          }
        },
        {
          title: "Started vs. wrote vs. skipped (handling a partial last block)",
          body: [
            "Suppose your array has `n = 5` elements and `block_size = 4`. One block only gives 4 workers (indices 0–3), missing index 4! So before launching, the simulator computes the number of blocks with ceiling division: `blocks = (n + block_size - 1) / block_size` = `(5 + 4 - 1) / 4 = 8 / 4 = 2` blocks.",
            "Those 2 blocks launch `2 × 4 = 8` workers total (**started = 8**). Each worker computes its `index` and checks `if (index < n)`:",
            "• Workers with index `0, 1, 2, 3, 4` pass the check and execute `visits.at(index) += 1;` (**wrote = 5**).\n• Workers with index `5, 6, 7` fail `index < 5` and do nothing (**skipped = 3**).\nAlways check your math: `wrote + skipped == started`.",
            "One more real-GPU detail: our CPU simulator runs workers one after another, but real GPU threads run **at the same time**. If two threads try to do `counter += 1` at the same memory slot simultaneously, both can read `0`, both compute `1`, and both write `1` — losing one increment. That bug is called a **data race**."
          ]
        }
      ],
      practice: [
        {
          title: "Compute each worker's global index in 05_threads.cpp",
          body: ["Open `05_threads.cpp` and find `int index = lane;` inside `simulate_launch`. Right now, every block reuses indices `0, 1, 2, 3` — so Block 1 overwrites Block 0's slots! Replace `lane` with an expression using `block`, `block_size`, and `lane` so every worker gets its unique 0-based global index across all blocks."],
          command: edit("05_threads.cpp"),
          actions: [
            {
              title: "Double-check your formula on paper",
              body: ["Draw 2 blocks of 4 workers (lanes 0–3 in each). Block 0 should get global indices `0, 1, 2, 3`, and Block 1 should get `4, 5, 6, 7`. Verify your expression gives `0` for `(block=0, lane=0)` and `4` for `(block=1, lane=0)` — and still works if `block_size` changes to 6 or 8."]
            },
            {
              title: "Check which workers pass the bounds guard for n = 5",
              body: ["In your 2-block drawing, circle every worker whose global index is `< 5` (they write) and cross out the rest (they skip). Save `05_threads.cpp` before moving to Step 2."]
            }
          ]
        },
        {
          title: "Predict started / wrote / skipped counts and run Exercise 5",
          body: ["First, click through the interactive 4-slot / 3-workers-per-block trace below so you can see started, wrote, and skipped in action."],
          visual: "worker-trace",
          actions: [
            {
              title: "Add test lengths 0 and 9 in main()",
              body: [
                "In `05_threads.cpp`, `main()` loops over a list of array lengths and calls `simulate_launch(visits, 4)` (4 workers per block) on each one. Add `0` and `9` to that test list and save.",
                "Before running, predict the three worker counts for **n = 9** (with 4 workers per block): how many blocks launch, how many total workers start (`blocks × 4`), how many write (`index < 9`), and how many skip (`index >= 9`)? Do the same for **n = 0**."
              ]
            },
            {
              title: "Run Exercise 5 in PowerShell",
              body: ["Run the command below. For each test length `n`, `got` prints how many array slots ended up with **exactly 1 visit** — it should match your `wrote` count (and `n`) on every single line!"],
              command: run(5)
            }
          ]
        },
        {
          title: "Read a real CUDA kernel and record 3 short notes",
          body: ["Now see how this exact block/lane pattern looks in real CUDA C++. In `first_kernel.cu`, a GPU kernel adds two arrays element-by-element (`c[i] = a[i] + b[i]`). You're just reading it today — you'll edit it in Week 1."],
          actions: [
            {
              title: "Inspect add_student in first_kernel.cu",
              body: ["Open `labs/launch/first_kernel.cu`. In `main()`, find `add_student<<<..., 256>>>` — the second number (`256`) is the number of threads per block. Now scroll up to the definition of `add_student` and read its `if` statement: which single thread is actually doing all the additions in this starter?"],
              command: ".\\Edit-CourseFile.ps1 .\\labs\\launch\\first_kernel.cu"
            },
            {
              title: "Check the n = 257 output",
              body: ["Run `.\\build\\first_kernel.exe` (or `Build-Native.ps1` if you haven't built it yet) and look for `PASS serial and student, n=257`. Why is `n = 257` such an important test when `blockDim.x = 256`? Because 257 elements spill 1 element into Block 1! Also notice what `PASS` does *not* prove: it confirms the sums are right, even though the starter's `add_student` is secretly using only 1 thread!"],
              command: "powershell -ExecutionPolicy Bypass -File .\\Build-Native.ps1",
              commandLabel: "Build & run native first_kernel (if not already built)",
              expected: "PASS serial and student, n=257"
            },
            {
              title: "Jot down 3 brief takeaways in Check & Save",
              body: [
                "Open your lesson notes on the **Check & Save** tab and write a few sentences covering these three concrete points:",
                "1. **How your formula covers the whole array:** Why does `block * block_size + lane` visit every slot `0..n-1` exactly once without colliding, and what happens to the extra threads when `n` isn't a multiple of `block_size`?",
                "2. **What the n = 257 GPU test checked:** Paste the `PASS ... n=257` line and explain why testing 257 elements catches multi-block bugs that testing 256 elements alone would miss.",
                "3. **Lost updates (data race):** Suppose two GPU threads both run `counter += 1` at the same time when `counter` starts at `0`, and both read `0` before either writes back. What value does each thread write, and how does the final result compare to two sequential increments?"
              ]
            }
          ]
        }
      ]
    }
  };
})();
