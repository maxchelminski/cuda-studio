const LessonPractice = (() => {
  "use strict";
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

  function references(d, entries) {
    return entries.map(entry => ({...(d.resources[entry.index] || {}), ...entry}));
  }

  function readingList(items, inline, escape) {
    return '<ul class="reading-picks">' + items.map(item =>
      `<li><a href="${escape(item.url)}" target="_blank" rel="noreferrer">${escape(item.label)} ↗</a><p>${inline(item.focus)}</p></li>`
    ).join("") + "</ul>";
  }

  function before(d, inline, escape) {
    const reading = LESSON_READING[d.id];
    const bridge = reading.bridge;
    const example = bridge ? `<section class="reading-bridge"><h2>Warm-up: ${escape(bridge.title)}</h2>
      <p>${inline(bridge.context)}</p><div class="bridge-grid"><pre aria-label="C++ example"><code>${escape(bridge.code)}</code></pre>
      <div><p>${inline(bridge.walk)}</p><p>${inline(bridge.question)}</p>
      ${CoursePrediction.group(d.id, "bridge")}<details><summary>Check your trace</summary><p>${inline(bridge.answer)}</p></details></div></div>
      ${bridge.support ? `<details class="bridge-support"><summary>Need a refresher on std::vector syntax?</summary>${readingList([bridge.support], inline, escape)}</details>` : ""}</section>` : "";
    const picks = references(d, reading.before);
    return example + `<section class="before-reading" aria-label="Recommended reading before starting"><h2>Read first (optional quick prep)</h2>${readingList(picks, inline, escape)}${CoursePrediction.group(d.id, "reading")}</section>`;
  }

  // Workbench sidebar only holds reference links — never forms or prediction widgets.
  function after(d, inline, escape, list) {
    const reading = LESSON_READING[d.id];
    const picks = references(d, reading.after);
    const used = new Set(references(d, [...reading.before, ...reading.after]).map(item => item.url));
    const others = d.resources.filter(item => !used.has(item.url));
    return (picks.length ? "<h4>Further reading</h4>" + readingList(picks, inline, escape) : "") +
      (others.length ? '<details class="other-reading"><summary>More references</summary>' + list(others) + "</details>" : "");
  }

  // Any post-reading check belonging to the main flow sits in the main column, not the narrow sidebar.
  function followupChecks(d) {
    return CoursePrediction.group(d.id, "workbench");
  }

  function transfer(d, inline, snippet) {
    const task = LESSON_TRANSFER[d.id];
    if (!task) return "";
    return `<section class="transfer-task"><h2>Try it on new inputs</h2><h3>${inline(task.title)}</h3>
      <p>${inline(task.prompt)}</p><ul>${task.checks.map(s => "<li>" + inline(s) + "</li>").join("")}</ul>
      ${CoursePrediction.group(d.id, "transfer")}${snippet(task.command, "Run extra checks in Course PowerShell", true)}
      <details class="lesson-reveal"><summary>Why these cases work</summary><p>${inline(task.explanation)}</p></details></section>`;
  }

  function valid(q, value) {
    if (typeof value !== "string" || !value.length || value.length > 64) return false;
    if (q.options) return q.options.some((_, i) => String(i) === value);
    return decimal.test(value) && Number.isFinite(Number(value));
  }

  function correct(q, value) {
    return valid(q, value) && Number(value) === Number(q.answer);
  }

  function saved(id, local, incoming) {
    const result = {};
    LESSON_DRILLS[id].forEach((q, i) => {
      const a = local?.[i], b = incoming?.[i];
      if (valid(q, a) && (!correct(q, b) || correct(q, a))) result[i] = a;
      else if (valid(q, b)) result[i] = b;
    });
    return result;
  }

  function feedback(q, value) {
    if (correct(q, value)) return "Correct! " + q.explanation;
    return "Not quite. " + (q.choiceHints?.[value] || "Give it another try or open the explanation below.");
  }

  function drills(d, record, inline, escape) {
    const questions = LESSON_DRILLS[d.id];
    const items = questions.map((q, i) => {
      const value = record.drills?.[i], attempted = valid(q, value);
      const prompt = q.options
        ? `<fieldset><legend>${inline(q.prompt)}</legend>${q.options.map((option, j) =>
            `<label class="drill-option"><input type="radio" name="drill-${i}" value="${j}" required ${value === String(j) ? "checked" : ""}><span>${inline(option)}</span></label>`).join("")}</fieldset>`
        : `<label for="drill-${i}">${inline(q.prompt)}${q.unit ? ` <span class="drill-unit">(${escape(q.unit)})</span>` : ""}</label>
          <input id="drill-${i}" name="drill-${i}" type="text" inputmode="decimal" autocomplete="off" maxlength="64" required value="${escape(value)}">`;
      return `<form class="drill-item" data-drill="${i}">${prompt}
        <div class="drill-actions">
          <button type="submit">Check answer</button>
          <button type="button" class="sub" data-drill-explain>Show explanation</button>
        </div>
        <p id="drill-feedback-${i}" class="drill-feedback" role="status">${attempted ? inline(feedback(q, value)) : ""}</p>
        <details class="drill-reason"><summary>Worked explanation</summary><p>${inline(q.explanation)}</p></details></form>`;
    }).join("");
    return `<section class="concept-section extra-drills"><h2>Practice problems</h2><p class="dim">Test yourself with fresh numbers. Your answers save automatically to your notebook.</p>${items}</section>`;
  }

  function bind(root, d, persist, inline) {
    for (const form of root.querySelectorAll("[data-drill]")) {
      const btn = form.querySelector("[data-drill-explain]");
      if (btn) {
        btn.onclick = () => {
          const details = form.querySelector(".drill-reason");
          if (details) details.open = !details.open;
        };
      }
      form.onsubmit = event => {
        event.preventDefault();
        const i = Number(form.dataset.drill), q = LESSON_DRILLS[d.id][i];
        const input = form.elements.namedItem("drill-" + i), value = input.value.trim().replace(/^−/, "-");
        const status = root.querySelector("#drill-feedback-" + i);
        if (!valid(q, value)) {
          status.textContent = q.options ? "Pick an option first." : "Enter a plain number (leave out units).";
          if (!q.options) input.focus();
          return;
        }
        persist(i, value);
        status.innerHTML = inline(feedback(q, value));
      };
    }
  }

  function progress(d, record) {
    if (!Object.keys(record.drills || {}).length) return "";
    const questions = LESSON_DRILLS[d.id];
    const passed = questions.filter((q, i) => correct(q, record.drills[i])).length;
    return `<p class="small dim">Practice problems · ${passed} of ${questions.length} correct</p>`;
  }

  return {before, after, followupChecks, transfer, saved, correct, drills, bind, progress};
})();
