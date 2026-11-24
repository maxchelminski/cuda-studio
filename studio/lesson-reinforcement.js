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
    const example = bridge ? `<section class="reading-bridge"><h2>${escape(bridge.title)}</h2>
      <p>${inline(bridge.context)}</p><div class="bridge-grid"><pre aria-label="C++ example"><code>${escape(bridge.code)}</code></pre>
      <div><p>${inline(bridge.walk)}</p><p>${inline(bridge.question)}</p>
      ${CoursePrediction.group(d.id,"bridge")}<details><summary>Check your trace</summary><p>${inline(bridge.answer)}</p></details></div></div>
      ${bridge.support ? `<details class="bridge-support"><summary>Optional reading on the vector declaration</summary>${readingList([bridge.support], inline, escape)}</details>` : ""}</section>` : "";
    const picks = references(d, reading.before);
    return example + `<section class="before-reading" aria-label="Suggested prerequisite reading"><h2>Read before the exercise</h2>${readingList(picks, inline, escape)}${CoursePrediction.group(d.id,"reading")}</section>`;
  }
  function after(d, inline, escape, list) {
    const reading = LESSON_READING[d.id];
    const picks = references(d, reading.after);
    const used = new Set(references(d, [...reading.before, ...reading.after]).map(item => item.url));
    const others = d.resources.filter(item => !used.has(item.url));
    return (picks.length ? "<h4>After practice · optional</h4>" + readingList(picks, inline, escape) : "") + CoursePrediction.group(d.id,"workbench") +
      (others.length ? '<details class="other-reading"><summary>More references</summary>' + list(others) + "</details>" : "");
  }
  function transfer(d, inline, snippet) {
    const task = LESSON_TRANSFER[d.id];
    if (!task) return "";
    return `<section class="transfer-task"><h2>Try it on new inputs</h2><h3>${inline(task.title)}</h3>
      <p>${inline(task.prompt)}</p><ul>${task.checks.map(s => "<li>" + inline(s) + "</li>").join("")}</ul>
      ${CoursePrediction.group(d.id,"transfer")}${snippet(task.command, "Run the extra checks in Course PowerShell", true)}
      <details class="lesson-reveal"><summary>Explain these results</summary><p>${inline(task.explanation)}</p></details></section>`;
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
    if (correct(q, value)) return "Correct. " + q.explanation;
    return "Try again. " + (q.choiceHints?.[value] || "You can revise your answer or open the reasoning below.");
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
        <button type="submit" class="sub">Check answer</button>
        <p id="drill-feedback-${i}" class="drill-feedback" role="status">${attempted ? inline(feedback(q, value)) : ""}</p>
        <details><summary>Show the reasoning</summary><p>${inline(q.explanation)}</p></details></form>`;
    }).join("");
    return `<section class="concept-section extra-drills"><h2>Practice with new inputs</h2><p>Choose Show the reasoning to read a worked answer, or enter your own. Checking an answer in this section saves it in your notebook.</p>${items}</section>`;
  }
  function bind(root, d, persist, inline) {
    for (const form of root.querySelectorAll("[data-drill]")) {
      form.onsubmit = event => {
        event.preventDefault();
        const i = Number(form.dataset.drill), q = LESSON_DRILLS[d.id][i];
        const input = form.elements.namedItem("drill-" + i), value = input.value.trim().replace(/^−/, "-");
        const status = root.querySelector("#drill-feedback-" + i);
        if (!valid(q, value)) {
          status.textContent = q.options ? "Choose an answer first." : "Enter a number. Leave units out of the answer box.";
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
    return `<p class="small dim">Practice with new inputs · ${passed} of ${questions.length} correct</p>`;
  }
  return {before, after, transfer, saved, correct, drills, bind, progress};
})();
