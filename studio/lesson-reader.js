const LessonReader = (function() {
  "use strict";
  const guides = {...window.PRIMER_GUIDES, ...window.LESSON_GUIDES_EARLY, ...window.LESSON_GUIDES_LATE};
  const stageNames = {learn: "Learn", practice: "Guided Exercise", finish: "Check & Save"};
  const sectionKey = id => "fieldwork.section." + location.pathname + "." + id;

  function lastSection(id) {
    try {
      const stage = window.sessionStorage.getItem(sectionKey(id));
      return Object.hasOwn(stageNames, stage) ? stage : "learn";
    } catch { return "learn"; }
  }

  const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[ch]));
  const inline = value => escape(value).replace(/`([^`\n]+)`/g, "<code>$1</code>");
  const paragraphs = lines => (lines || []).map(line => `<p>${inline(line)}</p>`).join("");
  const predictions = (day, slot, instance = "", open = false) => CoursePrediction.group(day.id, slot, instance, open);

  function snippet(value, label, copy = false, output = false) {
    return `<div class="lesson-snippet${output ? " expected" : ""}"><div class="snippet-label"><span>${escape(label)}</span>${copy ? '<button type="button" class="copy-snippet" data-clip="code">Copy</button>' : ""}</div><pre tabindex="0"><code>${escape(value)}</code></pre></div>`;
  }

  // Interactive 4-item, 3-workers-per-block simulator in Session 5.
  const traceLength = 4, traceWidth = 3, traceBlocks = Math.ceil(traceLength / traceWidth);
  const traceWorkers = traceBlocks * traceWidth;

  function workerFrame(started) {
    return Array.from({length: traceBlocks}, (_, block) => {
      const lanes = Array.from({length: traceWidth}, (_, lane) => {
        const index = block * traceWidth + lane, visited = index < started;
        const state = visited ? (index < traceLength ? "wrote" : "skipped") : "waiting";
        return `<li class="${state}"><span>Lane ${lane}</span><strong>${visited ? `Index ${index} · ${state}` : "Waiting"}</strong></li>`;
      }).join("");
      return `<div><b>Block ${block}</b><ul>${lanes}</ul></div>`;
    }).join("");
  }

  function workerStatus(started) {
    const writes = Math.min(started, traceLength);
    const index = started - 1;
    const event = !started ? "Click Next worker to step through the launch one thread at a time." : index < traceLength
      ? `Global index ${index} passes (${index} &lt; ${traceLength}), so this worker writes to array slot ${index}.`
      : `Global index ${index} fails (${index} &lt; ${traceLength} is false), so this worker skips writing.`;
    return `<p class="trace-counts">Started: <b>${started}</b> · Wrote: <b>${writes}</b> · Skipped: <b>${started - writes}</b></p><p>${event}</p>`;
  }

  function workerTrace() {
    return `<figure class="worker-trace"><figcaption>Interactive trace: 4 array slots, 3 workers per block</figcaption><p>Click <strong>Next worker</strong> to step through both blocks. Watch what happens when Block 1 starts at lane 0, and then at lane 1.</p><div class="trace-blocks" id="worker-frame">${workerFrame(0)}</div><div id="worker-status" role="status" aria-atomic="true">${workerStatus(0)}</div><div class="trace-controls"><button type="button" id="worker-next">Next worker</button><button type="button" class="sub" id="worker-reset" disabled>Reset</button></div></figure>`;
  }

  function instruction(part, checks = "") {
    return paragraphs(part.body) +
      (part.code ? snippet(part.code, part.language || "Code", true) : "") +
      (part.visual === "worker-trace" ? workerTrace() : "") +
      checks +
      (part.hint ? `<details class="lesson-reveal"><summary>Hint for this step</summary><p>${inline(part.hint)}</p></details>` : "") +
      (part.worked ? `<details class="lesson-reveal"><summary>${inline(part.worked.title)}</summary>${paragraphs(part.worked.body)}${part.worked.code ? snippet(part.worked.code, part.worked.language || "C++", true) : ""}</details>` : "") +
      (part.command ? snippet(part.command, part.commandLabel || "PowerShell command", true) : "") +
      (part.expected ? (part.expected.includes("\n")
        ? snippet(part.expected, "Expected output", false, true)
        : `<div class="expected-note"><strong>What to look for</strong><p>${inline(part.expected)}</p></div>`) : "");
  }

  function collectCode(parts, field) {
    return parts.flatMap(part => [part[field], ...(part.actions || []).map(action => action[field])]).filter(Boolean);
  }

  function rehearsal(task) {
    if (!task) return "";
    return `<div class="primer-rehearsal"><h3>Try predicting it first</h3><p>${inline(task.prompt)}</p>
      <details><summary>Hint</summary><p>${inline(task.hint)}</p></details>
      <details><summary>Show worked answer</summary><p>${inline(task.answer)}</p></details></div>`;
  }

  function inkExample(task) {
    const pixels = Array.from(task.digit, symbol => parseInt(symbol, 17));
    const image = Array.from({length: 8}, (_, row) => {
      const cells = pixels.slice(row * 8, row * 8 + 8).map(value => `<i style="opacity:${value / 16}"></i>`).join("");
      return `<div class="${row === 2 ? "ink-selected-row" : ""}">${cells}</div>`;
    }).join("");
    const row = pixels.slice(16, 24), dark = row.filter(value => value >= task.testCutoff);
    return `<figure class="ink-worked-row"><div class="ink-miniature" aria-hidden="true">${image}</div>
      <figcaption><strong>Example: counting dark pixels in Row 2 of a real handwritten 0</strong>
      <p>The orange box highlights row 2 (counting from 0). Its 8 pixel values are <code>[${row.join(", ")}]</code>. With a cutoff of ${task.testCutoff}, the values ${dark.slice(0, -1).join(", ")} and ${dark.at(-1)} are &ge; ${task.testCutoff}, so there are <strong>${dark.length}</strong> dark pixels. Your function stores <strong>${dark.length}</strong> in <code>counts.at(2)</code>.</p></figcaption></figure>`;
  }

  function inkWorksheet(task) {
    const rows = task.testRows.map((pixels, row) => {
      const start = row * pixels.length;
      return `<tr><th scope="row">Row ${row}<small>Flat indices ${start}–${start + pixels.length - 1}</small></th>
        <td><code>[${pixels.join(", ")}]</code></td>
        <td><label for="ink-guess-${row}"><code>counts.at(${row})</code></label>
        <input id="ink-guess-${row}" name="row${row}" type="number" min="0" max="${pixels.length}" step="1" inputmode="numeric" autocomplete="off"></td></tr>`;
    }).join("");
    return `<h3>Step A · Work out the test output by hand</h3>
      <p>Here is a tiny 2-row &times; 4-column test image. For each row, count how many numbers are <strong>${task.testCutoff} or higher</strong>. Enter the two row counts below so you know exactly what your C++ function should output.</p>
      <details class="ink-row-guide"><summary>Show how to count these two rows</summary><p>Row 0 is <code>[0, 8, 7, 12]</code>. Skip 0, count 8, skip 7, count 12 &rarr; <strong>2</strong> dark pixels, stored in <code>counts.at(0)</code>.</p><p>Row 1 is <code>[11, 2, 0, 3]</code>. Count 11, skip 2, 0, and 3 &rarr; <strong>1</strong> dark pixel, stored in <code>counts.at(1)</code>.</p></details>
      <form id="ink-guesses" novalidate><table class="ink-rows"><thead><tr><th scope="col">Row</th><th scope="col">Pixel values</th><th scope="col">Dark count (&ge; ${task.testCutoff})</th></tr></thead><tbody>${rows}</tbody></table>
      <button type="submit">Check my counts</button><p id="ink-guess-status" role="status" aria-live="polite"></p></form>`;
  }

  function bindInkWorksheet(root, task) {
    const form = root.querySelector("#ink-guesses"), status = root.querySelector("#ink-guess-status");
    form.oninput = () => { status.textContent = ""; };
    form.onsubmit = event => {
      event.preventDefault();
      for (const [row, pixels] of task.testRows.entries()) {
        const field = form.elements.namedItem("row" + row);
        const count = field.valueAsNumber;
        if (!Number.isInteger(count) || count < 0 || count > pixels.length) {
          status.textContent = `For Row ${row}, enter a whole number from 0 to ${pixels.length}.`;
          field.focus();
          return;
        }
        if (count !== pixels.filter(value => value >= task.testCutoff).length) {
          status.textContent = `Double-check Row ${row}: count every pixel that is ${task.testCutoff} or higher.`;
          field.focus();
          return;
        }
      }
      status.textContent = "Spot on! Row 0 has 2 dark pixels and Row 1 has 1. Now write the C++ loop below to compute this for any image size.";
    };
  }

  function checkpoint(task) {
    if (!task) return "";
    return `<section class="primer-checkpoint"><h2 id="ink-checkpoint" tabindex="-1">${inline(task.title)}</h2><p>${inline(task.introduction)}</p>
      ${inkExample(task)}${inkWorksheet(task)}
      ${task.actions.map(part => `<div class="sub-action"><h3>${inline(part.title)}</h3>${instruction(part)}</div>`).join("")}
      <details class="lesson-reveal"><summary>Bonus test: what if you used &gt; instead of &gt;=?</summary><p>Predict which test will fail if a pixel must be strictly above the cutoff instead of at-or-above it. Try changing <code>&gt;=</code> to <code>&gt;</code>, rerun, then change it back and save your results.</p>${CoursePrediction.group('0/4', 'ink.cutoff', '', true)}</details>
      <details class="lesson-reveal"><summary>Compare with a working solution</summary>${snippet(task.solution, "C++ · inside row_profile")}<p>${inline(task.explain)}</p></details>
      <details class="lesson-reveal"><summary>How this maps to GPU threads</summary><p>Instead of one outer loop running row 0 and then row 1, imagine assigning one GPU <strong>thread</strong> to each row. Thread 0 scans the 4 pixels in row 0 and writes its count to <code>counts[0]</code>. Thread 1 scans row 1 and writes to <code>counts[1]</code> at the exact same time.</p><p>What if the GPU launches a 3rd thread (row 2) when the image only has 2 rows? Check below.</p>${CoursePrediction.group('0/4', 'ink.gpu', '', true)}</details>
      <p class="small"><a href="#day/0/1">Review counting</a> · <a href="#day/0/2">Review flat indices</a> · <a href="#day/0/3">Review buffer bounds</a> · <a href="labs/compute/data/SOURCES.html">Digit data source</a></p></section>`;
  }

  function frames(ms) {
    const count = 100 / ms;
    return `<div class="figure-readout"><strong>${1000 / ms}</strong> frames per second</div>
      <div class="frame-strip" aria-hidden="true">${'<i></i>'.repeat(count)}</div>
      <div class="frame-axis" aria-hidden="true"><span>0 ms</span><span>100 ms</span></div>
      <p>${count} frames fit in a 100 ms window when each frame takes ${ms} ms.</p>`;
  }

  const seven = "001eggf100be8db000f60e3000515d10000dgg90002gf910000b9000003g2000";
  const rowValues = row => Array.from(seven.slice(row * 8, row * 8 + 8), ch => parseInt(ch, 17));
  function digitReadout(row) {
    return `Row ${row} · flat indices ${8 * row}–${8 * row + 7}<br><b>${rowValues(row).join("  ")}</b>`;
  }

  function visual(d) {
    if (d.id === "0/0") return `<figure class="frame-figure"><figcaption>Interactive: frame time vs. FPS</figcaption>
      <div class="frame-switch" role="group" aria-label="Choose a frame time">${[10, 50].map(ms => `<button type="button" data-frame="${ms}" aria-pressed="${ms === 10}">${ms} ms</button>`).join("")}</div>
      <div id="frame-result" aria-live="polite">${frames(10)}</div></figure>`;
    if (d.id === "0/2") return `<figure class="memory-figure"><figcaption>How a 2D matrix sits in 1D memory</figcaption><div class="memory-block" aria-label="Two rows of three values"><div><small>Row 0</small><b>1</b><b>2</b><b>3</b></div><div><small>Row 1</small><b>4</b><b>5</b><b>6</b></div></div><div class="memory-flat">${[1, 2, 3, 4, 5, 6].map((n, i) => `<div><b>${n}</b><small>${i}</small></div>`).join("")}</div><p>Row 0 comes first, then Row 1 right after it. The small numbers underneath are the flat 0-based array indices.</p></figure>`;
    if (d.id === "2/0") return `<figure class="digit-figure"><figcaption>Inspect a real handwritten 7 (8 &times; 8)</figcaption><p>Click any row to see its 8 ink intensities (0–16) and flat array positions.</p><div class="digit-patch">${Array.from({length: 8}, (_, row) => `<button type="button" aria-label="Inspect row ${row}" aria-pressed="${row === 3}" data-digitrow="${row}">${rowValues(row).map(ink => `<i style="opacity:${ink / 16}"></i>`).join("")}</button>`).join("")}</div><p id="digit-row" aria-live="polite">${digitReadout(3)}</p><small>Query 6 · <a href="labs/compute/data/SOURCES.html">UCI handwritten digits dataset</a></small></figure>`;
    const preview = {
      "4/0": ["labs/render/swarm-preview.jpg", "A rendered worm swarm", "Each curved worm is made of short capsule segments. Today you'll measure how segment tests drive frame time.", "#swarm"],
      "5/3": ["labs/flow/ink-preview.jpg", "Dye moving through the simulated flow", "Colored dye shows where the velocity field moves; the divergence metric tells you how well pressure projection fixed it.", "#flow"],
      "6/0": ["labs/knit/cloth-preview.png", "A simulated knit swatch", "Every pair of neighboring vertices shares a distance constraint that the solver works to restore.", "#knit"]
    }[d.id];
    if (!preview) return "";
    return `<figure class="scene-figure"><a href="${preview[3]}"><img src="${preview[0]}" alt="${preview[1]}"></a><figcaption>${preview[2]}</figcaption></figure>`;
  }

  function turnsExample() {
    return `<p>Start with a smaller example: 3 workers (A, B, C) taking turns on a 7-slot array (indices 0–6). After C, wrap back to A:</p><table class="worker-turns"><caption>Round-robin assignment (3 workers, 7 slots)</caption><tbody><tr><th scope="row">Array index</th><td>0</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr><tr><th scope="row">Worker</th><td>A</td><td>B</td><td>C</td><td>A</td><td>B</td><td>C</td><td>A</td></tr></tbody></table><p>Reading across for Worker A gives indices <strong>0, 3, and 6</strong> (jumping by 3 each time, which is the total number of workers).</p>`;
  }

  function optionalChallenge(d, copyCommand = false) {
    const challenge = window.LESSON_CHALLENGES?.[d.id];
    if (!challenge) return "";
    const answer = `<details><summary>Show worked answer</summary><p>${inline(challenge.check)}</p></details>`;
    return `<details class="transfer-challenge"><summary>Optional challenge · push it further</summary>
      ${d.id === "0/4" ? turnsExample() : ""}<p>${inline(challenge.prompt)}</p><details><summary>Hint</summary><p>${inline(challenge.hint)}</p></details>${answer}${predictions(d, "challenge", copyCommand ? "lesson" : "review")}
      ${challenge.command ? snippet(challenge.command, "Test your saved C++ in Course PowerShell", copyCommand) : ""}
      </details>`;
  }

  function workbenchItem([url, label]) {
    const source = /\.(?:cpp|cuh?|hpp|py|ps1|sh)$/i.test(url);
    const action = source ? label.replace(/^Edit /, "Inspect ") : label;
    return `<li><a href="${escape(url)}" target="_blank" rel="noopener">${escape(action)} ↗</a></li>`;
  }

  function practice(d, r, guide) {
    const commands = collectCode(guide.practice, "command");
    const examples = collectCode(guide.practice, "code").concat(guide.sections.map(s => s.code).filter(Boolean));
    const isPrimer = d.wi === 0;
    const launch = d.run && !isPrimer && !commands.some(c => c.includes(d.run)) ? snippet(d.run, d.scene ? "Launch the viewer in Course PowerShell" : "Run in Course PowerShell", true) : "";
    const listing = d.code && !isPrimer && !examples.includes(d.code.text) ? `<details class="ref-listing"><summary>Reference code (${escape(d.code.language)}) · open after trying</summary>${snippet(d.code.text, d.code.language, true)}</details>` : "";
    const steps = guide.practice.map((part, i) => {
      const extra = (d.commands || []).filter(block => block.step === i && !commands.includes(block.text));
      return `<li class="practice-item"><div class="task-heading"><span class="step-number" aria-hidden="true">${i + 1}</span><h3>${inline(part.title)}</h3></div>
        ${instruction(part, part.actions?.length ? (part.visual === "worker-trace" ? predictions(d, "trace") : "") : predictions(d, "practice." + i))}${(part.actions || []).map(action => `<div class="sub-action"><h4>${inline(action.title)}</h4>${instruction(action)}</div>`).join("")}${part.actions?.length ? predictions(d, "practice." + i) : ""}
        ${extra.map(block => snippet(block.text, "PowerShell commands", true)).join("")}
        <label class="step-check"><input type="checkbox" data-step="${i}" ${(r.steps || []).includes(i) ? "checked" : ""}> <span>Mark step ${i + 1} complete</span></label></li>`;
    }).join("");
    return `<h2 class="stage-heading" tabindex="-1">Guided exercise</h2>${guide.checkpoint ? `<p>This session wraps up with a hands-on C++ exercise on a real handwritten digit image. <button type="button" class="text-action" data-go="checkpoint">Jump to the digit exercise &darr;</button></p>` : ""}${!isPrimer ? `<details class="shell-help"><summary>Where do I run these commands?</summary><p>Open <code>G:\\CUDA-Studio</code> in File Explorer and double-click <code>Course PowerShell.cmd</code>. Wait for the prompt ending in <code>&gt;</code>, paste a command, and press Enter.</p></details>` : ""}
      <div class="practice-brief"><p><strong>Goal</strong> ${inline(d.objective)}</p><p><strong>What to save</strong> ${inline(d.deliverable)}</p></div>
      ${predictions(d, "general")}${launch}<ol class="practice-sequence">${steps}</ol>
      <details class="lesson-reveal"><summary>Stuck? Open the hint</summary><p>${inline(d.hint)}</p></details>
      <details class="lesson-reveal"><summary>Compare with the worked answer</summary><p>${inline(d.solution)}</p></details>${listing}
      ${LessonPractice.transfer(d, inline, snippet)}
      ${checkpoint(guide.checkpoint)}
      ${optionalChallenge(d, true)}
      <button type="button" class="stage-next" data-go="finish">Continue to Check &amp; Save &rarr;</button>`;
  }

  function view(d, r, ui) {
    const guide = guides[d.id];
    const selected = lastSection(d.id);
    const stepCount = (r.steps || []).length;
    const totalSteps = d.steps.length;
    const tabEntries = [
      ["learn", "1", stageNames.learn],
      ["practice", "2", `${stageNames.practice} (${stepCount}/${totalSteps})`],
      ["finish", "3", stageNames.finish]
    ];
    const tabs = tabEntries.map(([key, num, label]) =>
      `<button type="button" role="tab" id="tab-${key}" aria-controls="part-${key}" aria-selected="${key === selected}" tabindex="${key === selected ? 0 : -1}" data-stage="${key}"><span class="tab-step" aria-hidden="true">${num}</span><span>${label}</span></button>`
    ).join("");

    const sections = guide.sections.map((section, i) => {
      const terms = section.terms ? `<dl class="code-terms">${section.terms.map(({term, meaning}) => `<div><dt><code>${escape(term)}</code></dt><dd>${inline(meaning)}</dd></div>`).join("")}</dl>` : "";
      return `<section class="concept-section"><h2>${inline(section.title)}</h2>${section.code ? snippet(section.code, section.language || "Example") : ""}${paragraphs(section.body)}${terms}${rehearsal(section.rehearsal)}${predictions(d, "learn." + i)}</section>`;
    });

    const tools = [...ui.links, ...(d.file && !ui.links.some(([url]) => url === d.file) ? [[d.file, "View source · " + d.file.split("/").pop()]] : [])];
    const related = `<div class="reader-tools"><h3>Workbench</h3>${guide.workbench ? `<p>${inline(guide.workbench)}</p>` : ""}<p class="workbench-help">Files open in a new tab for quick reading. To edit code, run the lesson's <code>Edit-CourseFile.ps1</code> command in PowerShell.</p><ul class="links">${tools.map(workbenchItem).join("")}</ul>${LessonPractice.after(d, inline, escape, ui.resources)}</div>`;

    const oldExplanation = d.wi ? `<details class="lesson-reveal"><summary>Additional background notes</summary>${paragraphs(d.lesson.split(/\n\s*\n/))}</details>` : "";
    const reminder = d.id === "0/0" ? "" : `<details class="lesson-reveal"><summary>Quick warm-up recall question</summary><p>${inline(d.recall)}</p>${predictions(d, "recall", "reader")}<details><summary>Show answer</summary><p>${inline(LESSON_RECALL_ANSWERS[d.id])}</p></details></details>`;
    const followup = LessonPractice.followupChecks(d);
    const visualContent = visual(d) || ui.studio;
    const visualBlock = visualContent ? `<div class="lesson-visual">${visualContent}</div>` : "";
    const nextExercise = '<button type="button" class="stage-next" data-go="practice">Start the Guided Exercise &rarr;</button>';

    // Clean, uninterrupted single main column + sticky sidebar (no broken 4-cell illustrated grid).
    const learnMain = [
      ui.recall,
      guide.orientation ? `<p class="primer-orientation">${inline(guide.orientation)}</p>` : "",
      LessonPractice.before(d, inline, escape),
      sections[0] || "",
      visualBlock,
      sections.slice(1).join(""),
      followup,
      oldExplanation,
      reminder,
      nextExercise
    ].join("");

    const pct = totalSteps ? Math.round((100 * stepCount) / totalSteps) : 0;

    return `${ui.crumb}
      <div class="reader-heading">
        <p class="reader-meta"><span class="meta-pill">${escape(d.track)}</span><span>${d.id === "0/0" ? "Self-paced intro" : d.minutes + " min"}</span>${r.done ? '<span class="done-pill">✓ Completed</span>' : ""}</p>
        <h1>${escape(d.title)}</h1>
        <p class="reader-intro">${inline(guide.intro)}</p>
      </div>
      <div class="reader-tabs" role="tablist" aria-label="Lesson stages">${tabs}</div>
      <section id="part-learn" role="tabpanel" aria-labelledby="tab-learn" ${selected === "learn" ? "" : "hidden"}>
        <div class="reading-grid">
          <div class="lesson-text">${learnMain}</div>
          <aside class="lesson-aside">${related}</aside>
        </div>
      </section>
      <section id="part-practice" role="tabpanel" aria-labelledby="tab-practice" ${selected === "practice" ? "" : "hidden"}>
        <div class="reading-grid">
          <div class="lesson-text">${practice(d, r, guide)}</div>
          <aside class="lesson-aside">
            <div class="exercise-progress">
              <h3>Exercise progress</h3>
              <p id="step-status">${stepCount} of ${totalSteps} steps complete</p>
              <div class="progresstrack"><i id="step-bar" style="width:${pct}%"></i></div>
              <button type="button" class="sub" data-go="notes">Jump to lesson notes</button>
            </div>
            <details class="shell-help"><summary>Switch code editor</summary><p>Edit commands open VS Code by default. To use Notepad++ in this PowerShell window instead, run:</p>${snippet("$env:CUDA_COURSE_EDITOR = 'Notepad++'", "Course PowerShell", true)}</details>
            ${related}
          </aside>
        </div>
      </section>
      <section id="part-finish" role="tabpanel" aria-labelledby="tab-finish" ${selected === "finish" ? "" : "hidden"}>
        <div class="reading-grid">
          <div class="lesson-text">
            <section class="concept-section">
              <h2>Knowledge check</h2>
              <p>${inline(d.check.question)}</p>
              <div class="quiz">${d.check.options.map((s, i) => `<button type="button" class="${r.choice === i ? (i === d.check.answer ? "right" : "wrong") : ""}" data-choice="${i}" aria-pressed="${r.choice === i}">${escape(s)}</button>`).join("")}</div>
              <div class="feedback" role="status">${r.choice == null ? "" : r.choice === d.check.answer ? "Correct! " + escape(d.check.explanation) : "Not quite — try another option or check the explanation below."}</div>
            </section>
            <details class="lesson-reveal"><summary>Show answer &amp; explanation</summary><p><strong>${inline(d.check.options[d.check.answer])}.</strong> ${inline(d.check.explanation)}</p></details>
            ${LessonPractice.drills(d, r, inline, escape)}
            ${predictions(d, "finish")}
            <section class="lesson-save">
              <h2>Save your lesson notes</h2>
              <p>${inline(d.deliverable)}</p>
              <details class="evidence-guide"><summary>Checklist: what good notes look like</summary><ul>${LESSON_EVIDENCE[d.id].map(line => `<li>${inline(line)}</li>`).join("")}</ul></details>
              <label for="note">Your notes, measurements, or outputs</label>
              <textarea id="note" placeholder="Record your predictions, test outputs, timings, or questions...">${escape(r.note)}</textarea>
              <p class="small dim" id="saved">${ui.storageFailed ? "Browser storage unavailable — export from Notebook." : "Auto-saved in this browser as you type."}</p>
              ${d.id === "0/0" ? LessonDiagnostic.view() : ""}
              <button type="button" id="complete" class="${r.done ? "sub" : ""}">${r.done ? "✓ Completed · click to reopen" : "Mark session complete"}</button>
            </section>
            ${ui.portfolio}${ui.handoff}
          </div>
          <aside class="lesson-aside">
            <div class="exercise-progress">
              <h3>Need to check something?</h3>
              <p>Your progress and notes stay saved when you switch tabs.</p>
              <button type="button" class="sub" data-go="practice">&larr; Back to Guided Exercise</button>
            </div>
            ${related}
          </aside>
        </div>
      </section>
      ${ui.sequence}`;
  }

  function bind(root, notice, d, persist) {
    LessonPractice.bind(root, d, persist, inline);
    if (d.id === "0/0") LessonDiagnostic.bind(root);
    const tabs = Array.from(root.querySelectorAll("[data-stage]"));

    function switchTo(key, focusTab = false) {
      const target = key === "notes" ? "finish" : key === "checkpoint" ? "practice" : key;
      try { window.sessionStorage.setItem(sectionKey(d.id), target); } catch {}
      for (const tab of tabs) {
        const active = tab.dataset.stage === target;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        root.querySelector("#part-" + tab.dataset.stage).hidden = !active;
      }
      const tab = tabs.find(el => el.dataset.stage === target);
      if (key === "notes") { root.querySelector("#note").focus(); return; }
      if (key === "checkpoint") {
        const heading = root.querySelector("#ink-checkpoint");
        heading.focus({preventScroll: true});
        heading.scrollIntoView({block: "start"});
        return;
      }
      if (focusTab) tab.focus({preventScroll: true});
      root.querySelector(".reader-tabs").scrollIntoView({block: "start", behavior: "instant"});
    }

    tabs.forEach((tab, i) => {
      tab.onclick = () => switchTo(tab.dataset.stage, true);
      tab.onkeydown = event => {
        const destination = {ArrowLeft: (i + tabs.length - 1) % tabs.length, ArrowRight: (i + 1) % tabs.length, Home: 0, End: tabs.length - 1}[event.key];
        if (destination === undefined) return;
        event.preventDefault();
        switchTo(tabs[destination].dataset.stage, true);
      };
    });

    for (const btn of root.querySelectorAll("[data-go]")) btn.onclick = () => switchTo(btn.dataset.go, true);

    if (d.id === "0/4") {
      bindInkWorksheet(root, guides[d.id].checkpoint);
      let started = 0;
      const nextWorker = root.querySelector("#worker-next"), reset = root.querySelector("#worker-reset");
      function show(count) {
        started = count;
        root.querySelector("#worker-frame").innerHTML = workerFrame(started);
        root.querySelector("#worker-status").innerHTML = workerStatus(started);
        nextWorker.disabled = started === traceWorkers;
        reset.disabled = started === 0;
      }
      nextWorker.onclick = () => show(Math.min(started + 1, traceWorkers));
      reset.onclick = () => show(0);
    }

    for (const btn of root.querySelectorAll("[data-frame]")) btn.onclick = () => {
      root.querySelector("#frame-result").innerHTML = frames(Number(btn.dataset.frame));
      root.querySelectorAll("[data-frame]").forEach(other => other.setAttribute("aria-pressed", String(other === btn)));
    };

    for (const btn of root.querySelectorAll("[data-digitrow]")) btn.onclick = () => {
      root.querySelector("#digit-row").innerHTML = digitReadout(Number(btn.dataset.digitrow));
      root.querySelectorAll("[data-digitrow]").forEach(other => other.setAttribute("aria-pressed", String(other === btn)));
    };

    for (const btn of root.querySelectorAll("[data-clip]")) btn.onclick = async () => {
      const code = btn.closest(".lesson-snippet").querySelector("pre code");
      try {
        await navigator.clipboard.writeText(code.textContent);
      } catch {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        if (!document.execCommand("copy")) { notice("Text selected — press Ctrl+C to copy."); return; }
        selection.removeAllRanges();
      }
      const prev = btn.textContent;
      btn.textContent = "Copied ✓";
      setTimeout(() => { btn.textContent = prev; }, 1600);
      notice("Copied to clipboard.");
    };
  }

  return {view, bind, optionalChallenge};
})();
