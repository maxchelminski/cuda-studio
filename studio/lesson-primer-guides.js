(() => {
  "use strict";

  const run = number => "powershell -ExecutionPolicy Bypass -File .\\labs\\primer\\run.ps1 " + number;
  const edit = filename => ".\\Edit-CourseFile.ps1 .\\labs\\primer\\" + filename;

  window.PRIMER_GUIDES = {
    "0/0": {
      workbench: "Start with the FPS exercise in this lesson. If its first run prints TRY or PASS, your C++ compiler is working. Use Setup only if the runner reports a missing compiler.",
      intro: "A game draws a picture, then draws the next one. Each picture is a frame. If you know how long one frame takes, you can predict how many the game could draw in a second. Today you’ll teach a small C++ program to do that conversion and check its answer.",
      orientation: "Ordinary division is all the background you need today. In the readings, look for `main`, where the program starts. A function call asks another part of the program to do a job.",
      sections: [
        {
          title: "How many frames fit in a second?",
          body: [
            "Suppose every frame takes 10 milliseconds (ms). In the first 10 ms the game draws one frame. In 100 ms it draws ten. A second contains 1,000 ms, so in a second it draws 100 frames. We call that 100 frames per second, or FPS.",
            "Try the relationship in reverse. At 100 FPS, each frame has 1,000 ÷ 100 = 10 ms. If drawing a frame takes twice as long, only half as many fit in a second."
          ]
        },
        {
          title: "Read a working C++ function",
          body: [
            "A function is a named calculation. This one takes a time in seconds and returns the same time in milliseconds. It multiplies the input by 1,000.",
            "Read `seconds_to_ms(0.25f)` as “convert a quarter of a second to milliseconds.” The result is 250. The `f` marks a number written as a float."
          ],
          terms: [
            {term:"float", meaning:"The type of the answer. A float can represent numbers with a fractional part."},
            {term:"seconds_to_ms", meaning:"The name you use when you call this calculation."},
            {term:"float seconds", meaning:"The input. Inside the function, the name `seconds` stands for the value you supplied."},
            {term:"return seconds * 1000.0f;", meaning:"Give back the input multiplied by 1,000. The semicolon ends the instruction, and the surrounding braces enclose the function’s instructions."}
          ],
          language: "C++",
          code: "float seconds_to_ms(float seconds) {\n    return seconds * 1000.0f;\n}"
        },
        {
          title: "Follow a number from a function into a test",
          language: "C++ · example inside main",
          code: "float elapsed_ms = seconds_to_ms(0.5f);\nfloat frame_ms = elapsed_ms / 8.0f;\nbool passed = check(\"eight equal frames\", frame_ms, 62.5f);",
          body: [
            "Suppose eight frames each took the same time and together took half a second. Start on the right of the first `=`. The call returns 500. The line creates a variable named `elapsed_ms` and stores that value in it. On the next line, `/` means divide. Dividing 500 ms by eight frames gives 62.5 ms per frame, which becomes the value of `frame_ms`.",
            "The last line uses the course’s `check` function. The quoted text labels the test, `frame_ms` supplies the observed value, and `62.5f` supplies the expected value we worked out on paper. The check prints `PASS eight equal frames | got 62.5, expected 62.5`. It also gives back `true`, which is stored in `passed`. Its type, `bool`, holds either `true` or `false`."
          ],
          rehearsal: {
            prompt: "On paper, change only the first call above to `seconds_to_ms(1.0f)`. Keep eight frames and the expected value 62.5. Predict the test label (PASS or TRY), the two numbers it will print, and the value stored in `passed`. Could the program print that test line if a missing semicolon stopped this build?",
            hint: "Begin with the milliseconds in one second. Carry that number into the division. The expected value is written directly into the last line.",
            answer: "The check prints `TRY  eight equal frames | got 125, expected 62.5` and returns `false`. A TRY line means this build reached a running test. If a missing semicolon stops the build, the course reports the compiler’s error and skips the run."
          }
        },
        {
          title: "Where you’ll read, type and edit",
          body: [
            "Keep this browser page open for the instructions and your notes.",
            "You’ll type commands in a PowerShell window and edit C++ text in VS Code or Notepad++. The text file ends in `.cpp`. A compiler translates that file into a program Windows can run.",
            "Select the Guided exercise tab, or the Start the guided exercise button below. Its first step opens PowerShell and gives you the exact command that compiles and runs your file."
          ]
        }
      ],
      practice: [
        {
          title: "Predict two answers and run the supplied program",
          body: ["Assume each frame takes the same time. In your lesson notes or on paper, write your predicted FPS for a 20 ms frame and an 8 ms frame. Include the division you used."],
          actions: [
            {
              title: "Open the course terminal",
              body: ["Press the Windows key and E together to open File Explorer. Click its address bar, type `G:\\CUDA-Studio` and press Enter. Double-click `Course PowerShell.cmd`. If Windows hides extensions, its name is `Course PowerShell` and its type is Windows Command Script.", "A terminal window opens. After it finishes loading, look for a line like `PS G:\\CUDA-Studio>` with a cursor. This is the prompt. It tells you where commands will run."]
            },
            {
              title: "Run the first exercise",
              body: ["Copy the whole line below. Click beside the prompt in the PowerShell window, paste the line (Ctrl+V, or right-click), and press Enter. The final `1` selects the first exercise."],
              command: run(1),
              expected: "One quarter second is 250 milliseconds.\nTRY  20 ms frame | got 20, expected 50\nTRY  8 ms frame | got 8, expected 125"
            },
            {
              title: "Read one check aloud",
              body: ["`got` is the number the function actually returned. `expected` is the answer built into the test. The first check says the program returned 20 FPS for a 20 ms frame. Compare both expected numbers with the predictions you wrote. On the supplied first run, both lines begin with `TRY` because the function still returns its input."]
            }
          ]
        },
        {
          title: "Make the function calculate FPS",
          body: [],
          actions: [
            {
              title: "Open the source file in your editor",
              body: ["Paste this line at the same PowerShell prompt and press Enter. The course opens `01_frames.cpp` in VS Code by default. For Notepad++, append `-Editor Notepad++` to the command. Look for the comment beginning `// STUDENT` inside `fps`. Text after `//` is a note for the reader."],
              command: edit("01_frames.cpp")
            },
            {
              title: "Change what the function returns",
              body: ["The line `return milliseconds;` explains both `TRY` results. Replace only the expression between `return` and the semicolon. Use `seconds_to_ms(1.0f)` for the milliseconds available in one second, the C++ division sign `/`, and the input named `milliseconds`. Press Ctrl+S in your editor.", "Switch to PowerShell. Paste the command below again and press Enter. Both original checks should now begin with `PASS`. If one says `TRY`, compare `got` with `expected` and check the order of the division."],
              command: run(1)
            },
            {
              title: "Give the program a new question",
              body: ["In your editor, find `bool first = check(…);` inside `main`. The program begins its work in `main`. Read the three pieces inside `check(…)` from left to right. First comes a label in quotes, then the function call being tested, then the answer it should give.", "Change the label to `25 ms frame` and change the input in `fps(20.0f)` to `25.0f`. Work out the new expected FPS yourself, then replace `50.0f` with your answer written as a float. Save and run the same build command. Keep the passing 25 ms result for your notes."]
            }
          ]
        },
        {
          title: "Recognize a compiler error and recover",
          body: ["Inside `fps`, remove the semicolon at the end of your `return` line. Save and run the command below. The compiler stops before the FPS tests. Its error message tells you what it was trying to read."],
          command: run(1),
          actions: [
            {
              title: "Find the line worth keeping",
              body: ["In PowerShell, look for the line containing both `01_frames.cpp` and `error`. GCC and Microsoft’s compiler can describe the same mistake in different ways. Here is one example from each."],
              language: "GCC (top) and Microsoft C++ (bottom)",
              code: "01_frames.cpp:10:46: error: expected ';' before '}' token\n01_frames.cpp(11,1): error C2143: syntax error: missing ';' before '}'"
            },
            {
              title: "Connect the message to your edit",
              body: ["Read `10:46` as line 10, column 46. Read `(11,1)` as line 11, column 1. GCC can mark the end of the return expression. Microsoft’s compiler can mark the closing brace on the next line. Both noticed an unfinished statement. Your line numbers may change as you edit.", "Copy your own error line into the lesson notes under Check & save. A full file path is fine. A single line is enough, and you can keep the source excerpt, caret and your own explanation with it. Select Check my compiler message to check what you saved."]
            },
            {title: "Restore a working program", body: ["Put the semicolon back at the end of the return line inside `fps`. Save and run the same build command again. Both the 25 ms and 8 ms tests should pass. Keep their output with the diagnostic and add one sentence explaining what running an older executable would tell you about your latest edit."]}
          ]
        }
      ]
    },
    "0/1": {
      workbench: "The source link lets you read the same file that the editor command opens. For the three new input lists, use the extra-checks command under “Try it on new inputs.”",
      intro: "A short pause can spoil an otherwise smooth sequence of frames. Given a list of frame times, count how often a game spends longer than its budget. This is the first algorithm in the course that must remember something as it moves through its input.",
      orientation: "Last time, one duration went into `fps` and one number came back. Today a function receives a whole list. As you read, follow the first two items by hand before you edit anything.",
      sections: [
        {
          title: "A trace is an ordered list of measurements",
          body: [
            "A frame-time trace records one time for each successive frame. With a 16 ms budget, the trace 12, 20, 16 has one late frame. The 20 ms frame exceeded its budget. The 16 ms frame used exactly its allowance.",
            "In C++, `std::vector<int>` holds a sequence of whole numbers. A function parameter written `const std::vector<int>& samples` lets the function read the existing vector. The `&` avoids copying it and `const` prevents edits through this name."
          ]
        },
        {
          title: "Follow one accumulator through a loop",
          body: [
            "The example adds frame durations. `int sum = 0` gives the running total a starting value. The line starting with `for` means “for each sample in samples.” On each pass, `sample` names the next number and `sum += sample` adds it to the total.",
            "For 12, 20, 16 the running total goes from 0 to 12 to 32 to 48. The variable survives each pass because it was declared before the loop. Your exercise uses this pattern to count late frames. Consider when that counter should increase and by how much."
          ],
          language: "C++",
          code: "int sum = 0;\nfor (int sample : samples) {\n    sum += sample;\n}\nreturn sum;"
        },
        {
          title: "Let a comparison decide whether to update a value",
          language: "C++ · find the longest frame",
          code: "int longest(const std::vector<int>& samples) {\n    int best = 0;\n    for (int sample : samples) {\n        if (sample > best) {\n            best = sample;\n        }\n    }\n    return best;\n}",
          body: [
            "Assume the frame times are whole numbers at least zero. The opening line gives this function a name, `longest`. Each time it is called, `best` starts at zero. Inside the loop, `sample > best` asks a yes-or-no question. When the answer is yes, `best = sample` replaces the stored value. When it is no, execution skips that assignment and moves on to the next sample.",
            "Trace [6, 3, 11] ms with a pencil. Six beats zero, so write 6. Three fails the comparison, so keep 6. Eleven beats six, so write 11. The closing brace of the loop comes before `return best;`, which is why all three frames can contribute before the function gives back 11. With an empty list, this version returns its starting value of zero."
          ],
          rehearsal: {
            prompt: "Trace `longest` on [4, 4, 9, 6]. Write the value of `best` after each frame and put a tick each time `best = sample` runs. Now change `>` to `>=`, meaning “greater than or equal to,” and repeat. Can someone who sees only the final answer tell which comparison you used?",
            hint: "Pay attention to the second 4. Writing 4 into a variable that already holds 4 still executes an assignment.",
            answer: "Both traces end each pass with 4, 4, 9, 9. With `>`, the assignment runs on the first and third passes. With `>=`, it runs on the first three passes. Both return 9. In the lab, the action inside the condition adds one to a counter, so a tie can change the returned answer."
          }
        },
        {
          title: "Read one test from the inside out",
          language: "C++ · from main in the starter",
          code: "bool b = check(\"exact tie\", count_over({16}, 16), 0);",
          body: [
            "Start inside `count_over({16}, 16)`. The braces supply a fresh list with one frame lasting 16 ms. The second 16 sets this call’s budget. Is that one frame strictly over 16 ms? No, so the expected count is 0.",
            "Now read the surrounding `check`. The quoted words give the test a name. The function call supplies the actual count, and the final 0 supplies the expected count. When the two numbers agree, `check` prints PASS and returns `true`. That yes-or-no result goes into `b`.",
            "The starter already includes three checks. Only `a` passes the named list `frames` (10, 16, 25, 17). The 25 and the 17 qualify there. Check `b` supplies its own one-frame list to isolate equality. Check `c` supplies `{}`, an empty list, to see what happens when the loop gets zero turns.",
            "The last line, `return a && b && c ? 0 : 1;`, reads “if a, b and c all passed, report success (0) to PowerShell. Otherwise report failure (1).”"
          ]
        }
      ],
      practice: [
        {
          title: "Trace the supplied total",
          body: ["Open Course PowerShell from `G:\\CUDA-Studio`. Write the running total after each value of `{10, 16, 25, 17}` on paper. What would the function return for an empty list? Now run exercise 2 and compare its total with your last number."],
          command: run(2),
          expected: "Total frame time: 68 ms\nTRY  strictly over 16 | got 0, expected 2\nPASS exact tie | got 0, expected 0\nPASS empty trace | got 0, expected 0"
        },
        {
          title: "Count only frames over budget",
          body: ["Open your file using the command below. Locate `count_over` and replace its placeholder `return 0;`. Keep a whole-number count outside the loop. Inside, use `if (condition) { … }` to decide whether the current sample exceeds the budget. `++count;` adds one. Return the count after the loop."],
          command: edit("02_loop.cpp"),
          actions: [{title:"Test the code you saved",body:["Press Ctrl+S. Switch back to PowerShell and rerun exercise 2. Look for three PASS lines. The tie and the empty trace also passed before your edit. Which input actually exposed the placeholder?"],command:run(2)}]
        },
        {
          title: "Make a test distinguish two similar rules",
          body: ["Design a case that makes a boundary mistake visible twice. Before the final `return` in `main`, copy the exact-tie check into a fourth variable named `d`. Give it a descriptive label and call `count_over({16, 17, 16, 18}, 16)`. Underline the qualifying frames and use their count as the expected value. Add `&& d` to the return condition so this test also affects the exit code.", "Save and run. Then change only `>` in your function to `>=`. Keep the expected values fixed. Predict which rows will say TRY. The one tie in `b` isolates the mistake. The two ties in `d` let you see exactly how much it changes a mixed result. Restore `>`, save and rerun. Record an everyday threshold whose meaning changes at equality."],
          command: run(2)
        }
      ]
    },
    "0/2": {
      workbench: "Use the explorer for the last guided step. Keep the default matrices, advance once, and return after checking the final sum for C[0,0]. The input-load and hardware section belongs to Week 2, Day 3.",
      intro: "On paper you can point to row 1, column 2. In the C++ starter each matrix occupies one long vector. Today you’ll write the function that turns those two coordinates into a slot number. The supplied multiplication will use your function for every number it reads.",
      orientation: "In the frame trace, the loop gave you each value in turn. Matrix multiplication needs particular values from two different rows or columns. You’ll tell C++ which slots to read and use a hand calculation to check that it reached the intended cells.",
      sections: [
        {
          title: "Give each cell a flat address",
          body: [
            "A matrix drawn on paper has rows and columns. A vector in memory has a single sequence of slots numbered from zero. In row-major order, all the entries of row zero come first, then all the entries of row one.",
            "Imagine two rows of width four. Row zero uses slots 0 through 3. Row one starts at slot 4, so row one, column two is in slot 6. To reach a cell, first skip the complete rows above it, then advance by the cell’s column number. A width belongs to the particular matrix you are reading."
          ],
          language: "Memory diagram",
          code: "             col 0   col 1   col 2   col 3\nrow 0 slots     0       1       2       3\nrow 1 slots     4       5       6       7"
        },
        {
          title: "Trace the slot first, then the value",
          language: "C++",
          code: "std::vector<int> pixels = {8, 3, 6, 4};  // two rows, two pixels per row\nint first = 2;\nint total = 0;\nfor (int k = 0; k < 2; ++k) {\n    total += pixels.at(first + k);\n}",
          body: [
            "Read the loop header in three pieces. `int k = 0` sets the starting position once. `k < 2` decides whether to enter the body on each pass. `++k` adds one after the body runs. The passes therefore use k = 0 and k = 1.",
            "On the first pass, `first + k` gives slot 2, `pixels.at(2)` fetches 6, and the total becomes 6. On the next pass the slot is 3, the value is 4, and the total becomes 10. In the starter, read `a.at(index_of(row, k, inner))` in the same order. The inner function calculates a slot. The outer call fetches the number stored there."
          ],
          rehearsal: {
            prompt: "A new image has rows [5, 8, 1] and [7, 2, 9]. You want the first two pixels of the second row. If you run the example loop with `first = 2`, which slots will it read and what will it add up to? What should `first` be?",
            hint: "Number the six slots from 0 to 5. Put a mark where the second row begins, then trace both passes of the loop.",
            answer: "With `first = 2`, the loop reads slots 2 and 3, which hold 1 and 7, and leaves `total` equal to 8. Both slots exist, so `.at()` accepts them. Starting at slot 3 reads 7 and 2 from the intended row and gives 9. A hand-labeled row catches the mistake."
          }
        },
        {
          title: "A dot product walks two different paths",
          body: [
            "For one output cell C(row, col), hold the row of A and the column of B fixed. Let k run over the shared dimension. Each term multiplies A(row, k) by B(k, col). As k advances, the next A value sits beside the last one. Reaching the next B value takes a whole row of B.",
            "In the supplied code, `for (int k = 0; k < inner; ++k)` starts k at zero, repeats while k is smaller than the shared dimension, and advances k after each term. `a.at(i)` reads the value in flat slot i and checks the bounds. A legal slot can still contain the wrong matrix entry."
          ]
        }
      ],
      practice: [
        {
          title: "Build a four-cell reference on paper",
          body: ["Draw A, B and an empty 2 × 2 result C. Number the rows and columns from zero. Beside the values in A, write the slot numbers 0 through 5 in row order. Start again at 0 for B because it has its own vector. For example, A’s first value is 1 and its slot number is 0.", "Multiply on paper to fill C. Keep those four values handy. When PowerShell prints a check named C(1,0), you’ll compare it with the value in the second row, first column of your paper result."],
          language: "Input matrices",
          code: "A (2 rows × 3 columns)     B (3 rows × 2 columns)\n1  2  3                    1  0\n4  5  6                    0  1\n                           1  1"
        },
        {
          title: "Repair indexing and check an extra output",
          body: ["Run the starter once in Course PowerShell. Its first check calls `index_of(1, 2, 3)`, asking where row 1, column 2 lives when each row has three entries. An untouched starter prints `got 2, expected 5`. Both numbers on this line are slot numbers. The next two lines, labeled C(0,1) and C(1,0), report values of the matrix product."],
          command: run(3),
          actions: [
            {title:"Fix the slot calculation",body:["Open the file below. For this edit, work in `index_of`. The starter returns just the column, even when you ask for a later row. Use your slot labels to write an expression involving row, width and col. Save with Ctrl+S."],command:edit("03_matrix.cpp")},
            {title:"Test the bottom-right cell",body:["Run the command below. Once the three supplied checks pass, add a fourth for C(1,1). In main, copy the line beginning `bool z` above the final return and give the new variable its own name. The four numbers at the end of `dot_cell(a, b, 1, 0, 3, 2)` mean row, column, shared dimension and width of B, in that order. Change the column and the quoted label. Use the value from your paper result as the last argument to `check`. Include the new boolean in the final `&&` expression, save, and rerun the same command. You should now see four PASS lines."],command:run(3)},
            {title:"Trace the six reads for C(1,0)",body:["For k = 0, the program reads A slot 3 (value 4) and B slot 0 (value 1). That term contributes 4 × 1. For k = 1 and k = 2, record each slot and the value read from it. Add the three products and compare with the C(1,0) line in PowerShell. Keep that trace with your paper result."]}
          ]
        },
        {
          title: "Follow one cell through two phases",
          body: [
            "Your C++ loop adds one product at a time. The Matrix tile explorer in the Workbench shows the same arithmetic with a fresh pair of 4 × 4 matrices. It groups four neighboring outputs into a square called a tile. Why group them? C[0,0] and C[0,1] both use row 0 of A. When the GPU computes those neighbors together, it can load a piece of that row once and use it twice.",
            "Open the explorer in its new tab. Keep tile width 2, Output tile (0, 0) and Trace cell (0, 0). The outlines show the first two pairs of inputs for C[0,0]. Read its running sum. Before you click Next phase, point to the two entries in row 0 of A and the two in column 0 of B that you expect to use next.",
            "Click Next phase once. Check the new outlines and add those two products to your first sum. Does your answer match the displayed C[0,0]? That finishes the explorer for Session 3. Switch back to this lesson tab, mark step 3 done, and continue to “Try it on new inputs.” Week 2, Day 3 is when you’ll use CUDA to test how much the reuse helps."
          ]
        }
      ]
    },
    "0/3": {
      workbench: "The starter’s `scale` calls `copy_first`. Follow the one value it copies. Use the editor command in step 2 to replace that call with a loop, then test which slots changed.",
      intro: "A graphics program often gives a function a stretch of memory to fill. Today you’ll change four values through an address and use a fifth value as evidence that the function stopped in the right place.",
      orientation: "In the matrix exercise, you used a slot number to read an element. Now a function receives the address of its first usable slot. A write through that address changes a value the caller can inspect after the function finishes.",
      sections: [
        {
          title: "Pass a starting address and a length",
          body: [
            "A buffer is a sequence of memory slots used together. Here a vector owns the slots. Calling `in.data()` gives the address of the first input slot. A pointer is a variable that can hold such an address. In `const float* input`, the elements are floating-point numbers and the function may read them through this pointer. With `float* output` the function can write them.",
            "`input[0]` reads the first number and `output[1]` names the second output slot. The address alone does not tell you how many elements this call is allowed to touch. The caller passes that number separately as `n`. The vector must keep its storage alive while the function uses it."
          ]
        },
        {
          title: "Follow a write back to the caller’s buffer",
          language: "C++",
          code: "std::vector<float> light = {8, 4, 2, 1};\nfloat* pair = light.data() + 1;\nfloat saved = pair[0];\npair[0] = pair[1];\npair[1] = saved;",
          body: [
            "Draw the four values and point an arrow at the 4. `light.data()` points at the first element. Adding one moves the arrow forward by one whole element. `pair[0]` is now the 4 in slot 1 of `light`, and `pair[1]` is the 2 in slot 2. These names reach the same underlying slots as `light[1]` and `light[2]`.",
            "`saved` keeps a copy of 4. The first assignment makes the vector [8, 2, 2, 1]. The second makes it [8, 2, 4, 1]. A pointer subscript such as `pair[i]` performs no bounds check. In the lab the caller provides `n` so the function can stop at the agreed end of the buffer."
          ],
          rehearsal: {
            prompt: "Start with [40, 30, 20, 10, 0] and set `pair` to `light.data() + 2`. Use the same three lines to swap the pair. What are the five final values? If the last line were `pair[1] = pair[0];` instead, what would you get?",
            hint: "Circle the slot that `pair[0]` reaches. Write the full vector after the first assignment, then read the right side of the second assignment from that intermediate vector.",
            answer: "The pair begins at slot 2. Saving the 20 first gives [40, 30, 10, 20, 0]. After the first write, `pair[0]` already holds 10. Copying it again would leave [40, 30, 10, 10, 0]. Slots 0, 1 and 4 stay unchanged in both versions."
          }
        },
        {
          title: "See what changes after one write",
          body: [
            "The supplied helper copies one value only if the caller supplied at least one element. A function with return type `void` returns no value to its caller. This one changes the caller’s output array through a pointer. The assignment reads the right side first and stores that number in the slot on the left.",
            "A write is an assignment that stores a value. If the input is [7, 8] and n is 1, the assignment `output[0] = input[0]` writes 7 into the first output slot. Other slots should keep whatever was in them before the call."
          ],
          language: "C++",
          code: "void copy_first(const float* input, float* output, int n) {\n    if (n > 0) {\n        output[0] = input[0];\n    }\n}"
        },
        {
          title: "How can a test catch one write too many?",
          language: "Copy one value starting at slot 0",
          code: "Output slot                  0    1    2\nBefore the call             90   91   92\nAfter copying one value      7   91   92\nIf it also copies the 8      7    8   92",
          body: [
            "The caller has three output slots but asks for just one copy, starting at slot 0. If the function also puts 8 in slot 1, that second assignment is an extra write. Slot 1 exists. It simply belongs to a part of the array this call was supposed to leave alone.",
            "Here the test puts 91 in slot 1 before the call and checks it afterward. That known starting number is a guard value (sometimes called a sentinel). Seeing 8 where you expected 91 tells you the function changed slot 1. The number 92 in slot 2 can also serve as a guard, but it stays 92 in both rows, so checking it alone would miss this particular mistake."
          ]
        }
      ],
      practice: [
        {
          title: "Predict writes and untouched slots",
          body: ["First try two paper calls to `copy_first`. For each call, start over with input [7, 8] and output [90, 91]. What stays in the output when n is 0? What changes when n is 1?", "Now use the arrays in the actual starter. The input is [2, −1, 0, 6] and the five output slots all start at 99. Predict the contents after scaling four inputs by 0.5. Run the command below. Each line labeled `slot` compares the value stored there with your target. Slot 4 should pass even with the placeholder, because that slot should keep its original 99."],
          command: run(4)
        },
        {
          title: "Write exactly n scaled values",
          body: ["Open the file with the command below. Inside `scale`, replace the call to `copy_first` with a loop. Start i at zero, continue while `i < n`, and increase i after each pass. In each iteration read the input at i, multiply by `factor`, and store the result at the same index of the output."],
          command: edit("04_buffers.cpp"),
          actions:[{title:"Check the writes and the stopping point",body:["Save and run exercise 4 again. Slots 0–3 test the arithmetic. Slot 4 tests whether you stopped after four writes. Then main calls scale again on the same output with n = 0. The printed empty-call check inspects slot 0: it should still hold the result of the first call. Which mistake could pass the four arithmetic checks and still fail the guard?"],command:run(4)}]
        },
        {
          title: "Write two values and check all four slots",
          body: ["In `04_buffers.cpp`, you’ve finished writing `scale`. Now you’re writing a test in `main`. Add two lines to run a new example and four more to check what it did.", "Find `scale(in.data(), out.data(), 0, 5);` near the bottom of `main`. Insert the two lines below immediately after it, above the line beginning `return check(`. If you already added this pair, continue with the four checks."],
          language:"First two lines to add in main",
          code:"std::vector<float> short_out = {7, 8, 9, 10};\nscale(in.data(), short_out.data(), 2, 0.0f);",
          actions:[
            {
              title:"Predict what will be in short_out",
              body:["The `2` tells `scale` to write slots 0 and 1. It multiplies the first two inputs, 2 and −1, by the factor `0.0f`. Slots 2 and 3 start at 9 and 10. Write down what you expect to find in each of the four slots after the call.", "Keep the original five-slot loop above your new test. It already checks that `out[4]` stayed 99. The new vector, `short_out`, ends at index 3. Its guards are `short_out[2]` and `short_out[3]`."]
            },
            {
              title:"Add four check lines immediately below the new scale call",
              body:["Here is the first line. Inside `check`, the quoted text names the test in PowerShell, `short_out[0]` reads the actual value, and `0.0f` is the value you predicted. Use the `ok` declared earlier in `main` as `bool ok = true;`. Each line runs its check and combines the result with the earlier ones. A failure leaves `ok` false all the way to the final `return`.", "Copy this line into `main` and make three more copies directly below it. On those three lines change the slot number in both the label and the brackets to 1, 2 and 3 respectively. Change the last argument of each `check` to your prediction for that slot. The original `return check(...)` goes immediately after the fourth line."],
              language:"First of the four checks",
              code:'ok = check("short slot 0", short_out[0], 0.0f) && ok;',
              worked:{
                title:"See all four check lines together",
                code:'ok = check("short slot 0", short_out[0], 0.0f) && ok;\nok = check("short slot 1", short_out[1], 0.0f) && ok;\nok = check("short slot 2", short_out[2], 9.0f) && ok;\nok = check("short slot 3", short_out[3], 10.0f) && ok;'
              }
            },
            {
              title:"Run your test and read the four new lines",
              body:["Save the file and run the command below in Course PowerShell. Look between the original `slot 4` line and `empty call preserved output`. You should see four lines labeled `short slot`. Slot 1 can print `got -0, expected 0`. Multiplying −1 by zero can produce negative floating-point zero, which compares equal to zero.", "If the first two slots still contain 7 and 8, the writes that should have produced zero didn’t happen. If slot 2 or 3 changes, the function wrote past the requested two values. In your notes, explain which of those mistakes you could miss if all four slots had started at zero."],
              command:run(4),
              expected:"PASS short slot 0 | got 0, expected 0\nPASS short slot 1 | got -0, expected 0\nPASS short slot 2 | got 9, expected 9\nPASS short slot 3 | got 10, expected 10"
            }
          ]
        }
      ]
    },
    "0/4": {
      workbench: "Edit the C++ simulator for steps 1 and 2. In step 3 you’ll read two lines of CUDA and check the output of an existing GPU program. Your first GPU code edit comes in Week 1.",
      checkpoint: {
        title: "Profile a handwritten digit",
        introduction: "A handwritten digit is a grid of numbers. Higher values mean more ink. Your C++ function measures the stroke one row at a time by counting how many pixels reach the cutoff. It writes one count per row into `counts`.",
        // First zero in labs/compute/data/digits.txt. Each character encodes one value from 0 to 16.
        digit: "005d910000dfaf5003f20b8004c008800580098004b01c7002e5ac00006da000",
        testRows: [[0, 8, 7, 12], [11, 2, 0, 3]],
        testCutoff: 8,
        actions: [
          {title: "Write the same count in C++", body: ["Open the file with the command below. In `row_profile`, replace the comment between the braces. The test gives you `pixels`, the number of pixels per row (`width`), the number of rows (`height`), and the `cutoff`. It also creates `counts` with room for your answers.", "Think back to counting slow frames in Session 2. This time, count a pixel if its value is at least `cutoff`. Read the value with `pixels.at(index)`. When you finish a row, write its tally into `counts.at(row)`. Start a fresh tally for the next row."], command: ".\\Edit-CourseFile.ps1 .\\labs\\primer\\ink_profile.hpp", commandLabel:"Open the file from Course PowerShell", hint:"If the flat list is the sticking point, use Session 3’s matrix idea. How many entries come before the row you want? Add the column’s position within that row to reach one pixel. With zero columns the row has zero qualifying pixels. With zero rows there’s nothing to write."},
          {title: "Run the tests and read your row counts", body: ["Save your edit and run the command below. Read the line labeled `non-square image` first. On a pass, the two numbers after `row counts` should match your two table entries. If it reports a wrong count, the message names the first row that disagreed. A result of `-99` means that output still holds the test’s starting value.", "Finish when all five cases say `PASS`. The line `UCI handwritten 0` shows one count for each of the real digit’s eight rows. `guard intact` means the extra slot after the last answer kept its original value."], command: "powershell -ExecutionPolicy Bypass -File .\\labs\\primer\\run.ps1 -Study ink", commandLabel:"Build and test in Course PowerShell"}
        ],
        solution: "for (int row = 0; row < height; ++row) {\n    int dark = 0;\n    for (int col = 0; col < width; ++col) {\n        if (pixels.at(row * width + col) >= cutoff) {\n            ++dark;\n        }\n    }\n    counts.at(row) = dark;\n}",
        explain: "For the first image the counts are 2 and 1. The second row starts at flat slot 4. A fresh tally makes each output describe its own row. A width of zero skips the inner loop and stores zero. A height of zero skips every write."
      },
      intro: "So far your loops have visited array positions in order. Imagine giving each position to a different worker. How would a worker find its position, and what should it do if the array ends halfway through a block? Try that idea in a C++ simulator first. Then inspect a GPU program and ask what a passing result tells you about how its threads shared the work.",
      orientation: "In the simulator, a slot is a position in the array. The number stored there counts visits to that position. For example, if slot 2 holds 5, the third position has been visited five times. When a worker visits it again, the slot is still 2 and the count becomes 6.",
      sections: [
        {
          title: "A worker knows its group and position",
          body: [
            "CUDA groups threads into blocks. The starter uses the name `lane` for a thread’s position inside its block. In this one-dimensional CUDA launch that position is called `threadIdx.x`. Later you’ll also encounter a warp, a group of 32 threads with its own lane numbers.",
            "For this example, use three threads per block. Read down any column in the diagram. Block 0 takes indices 0, 1 and 2. Block 1 therefore starts at index 3. Its lane 0 gets index 3, and its lane 1 gets index 4. The C++ exercise below uses four threads per block. The calculation is the same for either width."
          ],
          language:"Three threads per block",
          code:"block           0  0  0     1  1  1\nlane            0  1  2     0  1  2\nglobal slot     0  1  2     3  4  5"
        },
        {
          title: "What do two nested loops actually count?",
          language: "C++",
          code: "std::vector<int> hits(3, 0);  // three counters, all starting at zero\nfor (int sweep = 0; sweep < 2; ++sweep) {\n    for (int cell = 0; cell < 3; ++cell) {\n        hits.at(cell) += 1;\n    }\n}",
          body: [
            "The braces place the entire `cell` loop inside the `sweep` loop. With `sweep` equal to 0, `cell` runs through 0, 1 and 2. Each `+= 1` adds one visit to the selected counter. The counters finish this sweep at [1, 1, 1].",
            "On sweep 1 the inner loop starts `cell` at zero again. The vector was created outside both loops, so its counts carry over. It finishes at [2, 2, 2]. In the lab, `simulate_launch` receives `std::vector<int>& visits`. The `&` lets it update the caller’s vector. After the call, `main` counts how many entries equal one."
          ],
          rehearsal: {
            prompt: "Change the example to four counters starting at zero. Each of two sweeps visits only cells 0 and 1. There are four writes for four counters. What counts do you expect to see, and how many cells were visited exactly once?",
            hint: "Draw four boxes. Add one tally in each destination box for the first sweep, then add the second sweep’s tallies to the same drawing.",
            answer: "The first sweep leaves [1, 1, 0, 0]. The second leaves [2, 2, 0, 0]. Zero cells were visited exactly once. Counting four writes hides both duplicated visits and both missing cells. This is why the simulator counts the slots that received exactly one visit."
          }
        },
        {
          title:"Count what happens to each worker",
          body:[
            "Before the loops start, the simulator decides how many blocks to run. `n` is the number of slots in `visits`. `block_size` is the number of workers in each block. The expression `(n + block_size - 1) / block_size` counts the blocks needed, including a final block if even one slot is left over.",
            "Each pass through the inner `lane` loop represents one worker starting. All the workers in the last block start, even when only one array slot still needs a visit.",
            "Follow one worker as far as `if (index < n)`. If the test is true, it executes `visits.at(index) += 1;`. Count that worker under “wrote.” If the test is false, the worker has already started, but it reaches the end of the loop body without touching the array. Count it under “skipped.” Every worker that starts belongs in exactly one of those two groups.",
            "The simulator runs the workers one by one. GPU threads can overlap in time. Think about what it takes to increment a counter: a thread reads the old number, adds one, then stores its result. If two threads share a counter, the second thread might read the old number before the first has stored its update. That conflict is called a race. You’ll reason about it on paper in step 3."
          ]
        }
      ],
      practice:[
        {
          title:"Compute the global index for each worker",
          body:["Open `05_threads.cpp` with the command below. In `simulate_launch`, find the line beginning `int index =`. The starter uses `lane` on the right. That gives the worker’s position within its own block. Change the right-hand side so `index` gives the worker’s position across all blocks, counting from zero. If you’ve already edited this line, use the drawing below to check your expression."],
          command:edit("05_threads.cpp"),
          actions:[
            {title:"Work out the expression",body:["Draw two rows of four workers, one row per block. Label the lanes 0 through 3 in each row. Now give each worker a global index. Compare lane 0 in the two rows. Does your expression give each of those workers the number you wrote for it? Use the variables in the simulator so your expression also works when the block size changes."]},
            {title:"Check which workers reach the array",body:["Suppose `visits` has five elements. Circle the workers in your drawing whose index passes the existing `if (index < n)` check. A worker can have a global index even when there is no array element at that index. Save your edit and run the command in step 2."]}
          ]
        },
        {
          title:"Predict the worker counts, then check the array",
          body:["Start in `main`. Each number in the list gives the length of a separate test. When the loop picks 9, `std::vector<int> visits(n, 0)` creates nine counters, all zero. Then `simulate_launch(visits, 4)` starts the simulation for that array with four workers per block. The next test gets a fresh array.", "Inside `simulate_launch`, count one worker as “started” each time the inner loop begins a pass. Did that worker reach `visits.at(index) += 1;`? Count it under “wrote.” Did its `index < n` test fail? Count it under “skipped.” Try counting along in this smaller example first."],
          visual:"worker-trace",
          actions:[
            {title:"Try the same reasoning with your own input",body:["Back in `05_threads.cpp`, `simulate_launch(visits, 4)` sets the block size to four. In `main`, add 0 and 9 to the existing list of test lengths if you haven’t already. Save the file.", "For nine items, draw enough rows of four boxes to give every item a worker. Keep all four boxes in the last row. Number the boxes starting at zero. Tick each box whose index is smaller than nine and cross out the others. Write down three counts: all the boxes (started), ticks (wrote), and crosses (skipped). Repeat for zero items. How many times would the outer loop enter its body?"]},
            {title:"Read what PowerShell actually counted",body:["Run the command below. In `main`, the last loop counts how many array elements ended with exactly one visit. That number is printed as `got`. On a correct run it should match your “wrote” tally. The program doesn’t print the other two tallies. Check those against your drawing: wrote plus skipped must equal started. If you have already run the program, you can use its existing output for this comparison."],command:run(5)}
          ]
        },
        {
          title:"Read one GPU launch and explain what its test checked",
          body:["The simulator on your CPU counted visits. The GPU program has a different job: for each position in two arrays, add the pair of numbers and store the sum. A native build compiles that program into `build/first_kernel.exe` and runs it. If you already built it, use the result you have."],
          actions:[
            {title:"Find the block size and the worker doing the sums",body:["Open the CUDA file with the editor command below. In `main`, search for `add_student<<<`. That line asks the GPU to run a function, called a kernel. The second number inside `<<< >>>` is 256, the number of threads in each block. Now find the definition of `add_student` near the top. In the supplied version, `blockIdx.x` is the block number and `threadIdx.x` is the thread number inside it. Read the `if` and its loop. Which thread actually does the sums in this starter? Today this file is for reading; Week 1 gives you the edit."],command:".\\Edit-CourseFile.ps1 .\\labs\\launch\\first_kernel.cu"},
            {title:"Find the result for 257 items",body:["Look for `PASS serial and student, n=257` in your native build output. The test runs each kernel and compares every returned value with the sum computed on the CPU. With 256 threads per block, 257 items just cross a block boundary. A PASS tells you the sums matched. It gives no count of how many different threads did useful work.", "Already built it but lost the output? Run `.\\build\\first_kernel.exe` in Course PowerShell. For a first native build, use the command below. If you already used the Python checker, its equivalent line is `PASS n=257: serial and student match every element`; either result is sufficient here."],command:"powershell -ExecutionPolicy Bypass -File .\\Build-Native.ps1",commandLabel:"First native build only",expected:"PASS serial and student, n=257"},
            {title:"Put three observations in your lesson notes",body:["Choose Open lesson notes on this page, or go to Check & save and scroll to Save your lesson notes. Write a few sentences there. You can refer back to your drawing and PowerShell output.", "1. Pick two neighboring blocks in your simulator drawing. Where do the second block’s indices begin relative to the first block’s indices? Explain why your rule visits every real array element once and what the last few workers do when their index falls outside the array. That is what “coverage” means here.", "2. Paste your GPU check line for 257 items. Say what the test compared and why this length checks something that 256 items alone would miss.", "3. Imagine two GPU threads trying to add one to the same counter. Each reads the old value, adds one and stores its result. Suppose both read 0 before either thread stores anything. Write the number each thread would store. How would the final counter compare with two increments done one after the other?"]}
          ]
        }
      ]
    }
  };
})();
