"use strict";
globalThis.PRIMER = {
  title: "C++ from scratch",
  focus: "Five focused sessions take you from writing your first C++ function to simulating how a grid of parallel GPU threads works. Every exercise compiles out of the box and prints clear PASS/TRY checks.",
  days: []
};

(() => {
  const files = ["01_frames.cpp", "02_loop.cpp", "03_matrix.cpp", "04_buffers.cpp", "05_threads.cpp"];
  function day(title, minutes, objective, recall, lesson, code, steps, hint, solution, question, options, answer, explanation, deliverable, reading) {
    const num = PRIMER.days.length + 1;
    PRIMER.days.push({
      title, minutes, track: "C++ on-ramp", objective, recall, lesson,
      code: {language: "C++", text: code},
      steps, hint, solution,
      check: {question, options, answer, explanation},
      deliverable,
      resources: [{label: "LearnCpp · " + reading[0], url: reading[1]}],
      file: "labs/primer/" + files[num - 1],
      run: "powershell -ExecutionPolicy Bypass -File .\\labs\\primer\\run.ps1 " + num
    });
  }

  day(
    "Turn a frame time into FPS",
    70,
    "Edit, compile, and run your first C++ function, then learn how to read both test output and a real compiler error.",
    "If a game runs at 50 frames per second (FPS), how many milliseconds does one frame take on average?",
    "A .cpp file is plain source text. A compiler translates it into an executable program, and Windows starts running that program at main(). Curly braces { } group lines of code together, and a semicolon ; ends each statement.\n\nIn float fps(float milliseconds), the first float is the return type (what the function sends back), and float milliseconds is the input parameter. Adding f to a number like 1000.0f makes it a 32-bit single-precision float.\n\nOpen Course PowerShell.cmd in G:\\CUDA-Studio and run the build command from Guided Exercise. The starter compiles right away and prints TRY on two tests because fps() still returns its input unchanged. Open 01_frames.cpp with Edit-CourseFile.ps1, edit fps(), save with Ctrl+S, and rerun the same PowerShell command. PASS means your output matched the expected value; TRY means the program ran but returned the wrong number; a compiler error stops before any tests run.",
    "float seconds_to_ms(float seconds) {\n    return seconds * 1000.0f;\n}\n// Calling seconds_to_ms(0.25f) returns 250.0f.",
    [
      "Predict the FPS for 20 ms and 8 ms frames on paper, then run the starter in Course PowerShell to see the initial TRY lines.",
      "Implement fps() in 01_frames.cpp, rerun until both tests print PASS, then change the 20 ms test to 25 ms with the matching expected FPS.",
      "Deliberately remove a semicolon to inspect a real compiler error, restore it, and verify both tests pass again."
    ],
    "One second has 1,000 milliseconds. Think about how many frames of length `milliseconds` fit into 1,000 ms.",
    "`return seconds_to_ms(1.0f) / milliseconds;` gives 50 FPS for 20 ms, 125 FPS for 8 ms, and 40 FPS for 25 ms (assuming a positive frame time).",
    "If each frame takes 12.5 ms, what is the frame rate in FPS?",
    ["12.5", "80", "125"],
    1,
    "1,000 ms ÷ 12.5 ms per frame = 80 frames per second.",
    "Save your passing 25 ms test line (`got 40, expected 40`) and one compiler error line (file, line number, and message) from the missing-semicolon test.",
    ["functions and return values", "https://www.learncpp.com/cpp-tutorial/introduction-to-functions/"]
  );

  day(
    "Count slow frames in a trace",
    90,
    "Loop over a std::vector of frame times, keep a running counter, and test strict (>) vs. inclusive (>=) thresholds.",
    "Why can a single very long frame make a game feel stuttery even when the average FPS looks high?",
    "std::vector<int> stores an ordered list of integers, like {10, 16, 25, 17}. A range-based for loop visits each value in order. Declaring int count = 0; before the loop gives you a counter that persists across every iteration.\n\nIn the function signature const std::vector<int>& samples, the & avoids making a copy of the vector, and const guarantees your function only reads it without modifying it.",
    "int total(const std::vector<int>& samples) {\n    int sum = 0;\n    for (int sample : samples) {\n        sum += sample;\n    }\n    return sum;\n}",
    [
      "Trace total() by hand on {10, 16, 25, 17} and on an empty list, then run Exercise 2 to confirm.",
      "Implement count_over() so it counts how many frames are strictly greater than budget, and rerun until all three starter tests pass.",
      "Add a fourth test for {16, 17, 16, 18} at budget 16, temporarily swap > to >= to see which tests catch the bug, then restore >."
    ],
    "Put an `if (sample > budget)` check inside the loop and increment your counter with `++count;`.",
    "`int count = 0; for (int sample : samples) { if (sample > budget) { ++count; } } return count;`",
    "What should count_over() return when given an empty list {}?",
    ["0", "1", "Whatever the previous call returned"],
    0,
    "The local counter starts at 0, the loop runs zero times, and the function returns 0.",
    "Write down what count_over({16, 17, 16, 18}, 16) returned with `>` vs. `>=`, and confirm the empty list returned 0.",
    ["range-based loops", "https://www.learncpp.com/cpp-tutorial/range-based-for-loops-for-each/"]
  );

  day(
    "Put a matrix in one line of memory",
    100,
    "Map 2D matrix coordinates (row, col) to 1D row-major array indices and trace how matrix multiplication walks through memory.",
    "In a 2 × 3 matrix stored row-by-row in a flat array, how many array positions separate column 1 of row 0 from column 1 of row 1?",
    "C++ arrays and vectors start at index 0. To store a 2D matrix in one flat std::vector (row-major order), lay out all of row 0 first, then row 1 right after it, and so on. To reach (row, col), skip `row` complete rows and step right by `col`.\n\nUsing a.at(i) reads index i while checking that i is in bounds. Inside matrix multiplication, increasing k by 1 steps across a row of A (stride 1) but jumps down a column of B (stride = width of B).",
    "// A = [1 2 3; 4 5 6]   B = [1 0; 0 1; 1 1]\n// C(1,0) = 4*1 + 5*0 + 6*1 = 10\nfor (int k = 0; k < inner; ++k) {\n    result += a.at(index_of(row, k, inner)) * b.at(index_of(k, col, out_cols));\n}",
    [
      "Compute the 2 × 2 product C = A × B on paper and label the flat 0-based indices of A.",
      "Fix index_of() in 03_matrix.cpp, add a test for C(1,1), and trace the exact flat indices read for C(1,0).",
      "Open the Matrix tile explorer, run one phase advance on C[0,0] to preview how GPUs group outputs, then return here."
    ],
    "Each full row contains `width` elements, where `width` is the number of columns in that specific matrix.",
    "`return row * width + col;` The product is [[4, 5], [10, 11]]. For C(1,0), A reads indices 3, 4, 5 and B reads indices 0, 2, 4.",
    "In a row-major matrix with 7 columns, which 0-based flat index holds row 2, column 3?",
    ["9", "17", "23"],
    1,
    "Skip 2 full rows of 7 elements (2 × 7 = 14), then move 3 columns over: 14 + 3 = 17.",
    "Save your 2 × 2 matrix result [[4, 5], [10, 11]] and the three pairs of flat indices (and values) read to compute C(1,0).",
    ["vectors and indexing", "https://www.learncpp.com/cpp-tutorial/introduction-to-stdvector-and-list-constructors/"]
  );

  day(
    "Pass a buffer to a function",
    100,
    "Read from an input pointer, write scaled results through an output pointer, and use guard values to catch out-of-bounds writes.",
    "If a std::vector has 4 elements, what are its valid indices, and what happens if you call .at(4)?",
    "A pointer stores the memory address of an element. Given a pointer to the start of a contiguous buffer (such as vec.data()), `input[i]` reads the element at offset i. `const float* input` allows reading only; `float* output` allows writing.\n\nA raw pointer does not know how long the buffer is, so the caller passes the length `n` separately. Always keep the owning std::vector alive and unresized while a pointer into it is being used.",
    "void copy_first(const float* input, float* output, int n) {\n    if (n > 0) { output[0] = input[0]; }\n}\n// Passes raw pointers to the vectors' storage along with length n = 4:\nscale(in.data(), out.data(), 4, 0.5f);",
    [
      "Trace copy_first() for n = 0 and n = 1, then predict all 5 slots of `out` in Exercise 4 before running it.",
      "Replace the placeholder in scale() with a for loop that scales exactly `n` elements, and verify the guard at slot 4 stays 99.",
      "Add the `short_out` test in main() to scale 2 elements by 0.0f and check all 4 slots (both outputs and both guards)."
    ],
    "Use a standard counted loop: `for (int i = 0; i < n; ++i)` and assign `output[i] = input[i] * factor;`.",
    "`for (int i = 0; i < n; ++i) { output[i] = input[i] * factor; }` Valid indices are 0 through n − 1; a nonzero guard right after slot n − 1 catches off-by-one writes.",
    "When passing a raw pointer to a function like scale(), what extra information MUST the caller also pass?",
    ["The source file size", "How many elements (`n`) the function is allowed to read/write", "The GPU clock speed"],
    1,
    "A raw pointer only gives a starting address — without `n`, the function has no way to know where to stop.",
    "Save the four passing `short slot` test lines and a short note explaining why initializing `short_out` with nonzero numbers catches both skipped writes and extra writes.",
    ["pointers", "https://www.learncpp.com/cpp-tutorial/introduction-to-pointers/"]
  );

  day(
    "Turn a loop into a grid",
    110,
    "Compute each worker's global array index across blocks, guard extra workers in a partial last block, and connect that pattern to a real CUDA kernel.",
    "In a flat array where each row has 8 elements, how many elements come before row 2 (counting rows from 0)?",
    "This CPU simulator mimics how CUDA launches threads. Threads are organized into equal-sized blocks: `block` is which block you're in, and `lane` is your position inside that block. Even if an array doesn't divide evenly by `block_size`, CUDA launches a full final block — so the leftover threads at the end must check `if (index < n)` and skip writing.\n\nUnlike a sequential CPU loop, real GPU threads can run in any order simultaneously. Giving each array index exactly one owning thread keeps the result deterministic and race-free.",
    "// Example: 4 workers per block, array length n = 5\n// Block 1 workers:\n// lane     0     1     2     3\n// index    4     5     6     7\n// n = 5  write skip  skip  skip",
    [
      "Fix `index` inside `simulate_launch()` in 05_threads.cpp so every worker gets its unique global index across all blocks.",
      "Add test lengths 0 and 9 in main(), predict started / wrote / skipped worker counts, and verify with PowerShell.",
      "Inspect the real CUDA kernel in first_kernel.cu, check the n = 257 output, and finish the handwritten digit row-profile exercise."
    ],
    "Look at lane 0 of block 0, block 1, and block 2: they start at 0, `block_size`, and `2 * block_size`. Now add `lane`.",
    "`int index = block * block_size + lane;` With 4 workers per block and n = 5, block 0 writes indices 0–3, block 1 lane 0 writes index 4, and lanes 1–3 (indices 5, 6, 7) skip.",
    "You have an array of 65 elements and launch blocks of 32 workers — just enough full blocks to cover all 65 elements. How many workers start up but skip writing because their index is out of bounds?",
    ["1", "31", "32"],
    1,
    "You need ceil(65 / 32) = 3 blocks, which launches 96 workers. Workers 0–64 write (65 writes), and the remaining 96 − 65 = 31 workers skip.",
    "Save your block/worker counts for n = 9 and n = 0, the n = 257 GPU test line, a short note on why two threads incrementing the same slot can lose an update, and your passing digit row-profile run.",
    ["C++ loops", "https://www.learncpp.com/cpp-tutorial/for-statements/"]
  );
})();
