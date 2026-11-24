(() => {
"use strict";
const root = document.querySelector("main");
const weeks = [PRIMER, ...COURSE_WEEKS];

// Keep existing day IDs intact as notebook keys and bookmarks. Sequence studios between them.
const days = weeks.flatMap((w, wi) => {
  const studios = STUDIO_LESSONS.filter(s => s.wi === wi);
  const week = studios.filter(s => s.afterDay === 0);
  w.days.forEach((d, di) => {
    week.push({...d, wi, di, id: `${wi}/${di}`});
    week.push(...studios.filter(s => s.afterDay === di + 1));
  });
  return week;
});

const byId = new Map(days.map(d => [d.id, d]));
const esc = s => String(s ?? "").replace(/[&<>"']/g, x => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[x]));
const key = "fieldwork.cuda.1", empty = () => ({version: 1, records: {}, runs: []});

function fromData(value) {
  if (!value || value.version !== 1 || typeof value.records !== "object" || !value.records || Array.isArray(value.records) || !Array.isArray(value.runs)) {
    throw Error("Choose an exported Fieldwork JSON notebook.");
  }
  const records = {};
  for (const d of days) {
    const r = value.records[d.id];
    if (!r || typeof r !== "object") continue;
    const index = r.choice, timestamp = t => Number.isFinite(t) && t > 0 && t < 8e15 ? t : 0;
    const steps = Array.isArray(r.steps) ? [...new Set(r.steps.filter(i => Number.isInteger(i) && i >= 0 && i < d.steps.length))] : [];
    records[d.id] = {
      note: String(r.note ?? ""),
      done: timestamp(r.done),
      choice: Number.isInteger(index) && index >= 0 && index < d.check.options.length ? index : null,
      review: Number.isInteger(r.review) ? Math.max(0, Math.min(5, r.review)) : 0,
      lastReview: timestamp(r.lastReview),
      nextReview: timestamp(r.nextReview),
      steps
    };
    const publication = Portfolio.draft(d.id, r.publication);
    const drills = LessonPractice.saved(d.id, r.drills);
    if (Object.keys(drills).length) records[d.id].drills = drills;
    if (Object.keys(publication).length) records[d.id].publication = publication;
  }
  const runs = value.runs
    .filter(v => v && typeof v === "object")
    .map(v => Object.fromEntries(["lab", "input", "variant", "ms", "check", "date"].map(k => [k, String(v[k] ?? "")])));
  return {version: 1, records, runs};
}

let state = empty(), storageFailed = false, lastStored = null, readFailed = false, unreadableCopy = null;
const reviewRolls = new Map();

function storageStatus(failed) {
  storageFailed = failed;
  document.querySelector("#storage-warning").hidden = !failed;
}

function readChanges() {
  if (storageFailed) return;
  let raw = null;
  try {
    raw = localStorage.getItem(key);
    if (raw !== lastStored) {
      state = raw === null ? empty() : fromData(JSON.parse(raw));
      lastStored = raw;
    }
  } catch {
    readFailed = true;
    unreadableCopy = raw;
    storageStatus(true);
  }
}
readChanges();

let teardown = null, previous = "", timer = 0;
function notice(txt) {
  const n = document.querySelector("#notice");
  n.textContent = txt;
  clearTimeout(timer);
  timer = setTimeout(() => n.textContent = "", 4800);
}

function save() {
  if (readFailed) return;
  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(key, raw);
    lastStored = raw;
    storageStatus(false);
  } catch { storageStatus(true); }
}

function downloadFile(text, filename, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const recoveryKey = key + ".unreadable";
function previousCopies() {
  const copies = JSON.parse(localStorage.getItem(recoveryKey) || "[]");
  if (!Array.isArray(copies) || !copies.every(value => typeof value === "string")) {
    throw Error("The recovery archive could not be read.");
  }
  return copies;
}

function restoreOnImport() {
  if (!readFailed || unreadableCopy === null) return;
  if (localStorage.getItem(key) !== unreadableCopy) {
    throw Error("The saved notebook changed in another tab. Export this session and reload before importing.");
  }
  const copies = previousCopies();
  if (!copies.includes(unreadableCopy)) {
    copies.push(unreadableCopy);
    localStorage.setItem(recoveryKey, JSON.stringify(copies));
  }
  readFailed = false;
}

const rec = d => state.records[d.id] || {note: "", done: 0, choice: null, review: 0, lastReview: 0, nextReview: 0, steps: []};
function change(d, patch) { readChanges(); state.records[d.id] = {...rec(d), ...patch}; save(); }
const shortTitle = d => d.scene ? "Night Shift studio" : (d.wi ? "Day " : "Session ") + (d.di + 1);
const title = d => (d.wi ? "Week " + d.wi : "C++ on-ramp") + " · " + shortTitle(d);
const route = d => `#day/${d.id}`;
const next = () => days.find(d => !rec(d).done) || days[days.length - 1];
const done = () => days.filter(d => rec(d).done).length;
function due(d) { const t = LabJournal.reviewDate(rec(d)); return t !== null && Date.now() >= t; }
const dueList = () => days.filter(due);
const link = (href, label) => `<a href="${esc(href)}">${esc(label)}</a>`;
const resources = items => `<ul class="links">${items.map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.label)} ↗</a></li>`).join("")}</ul>`;
const card = (href, k, t, desc, action) => `<a class="card" href="${esc(href)}"><span class="eyebrow">${esc(k)}</span><h3>${esc(t)}</h3><p>${esc(desc)}</p><span class="next">${esc(action)} ↗</span></a>`;
const pre = t => `<pre tabindex="0"><code>${esc(t)}</code></pre>`;
const crumb = (href, label, rest) => `<div class="bread">${link(href, label)} &nbsp;/&nbsp; ${esc(rest)}</div>`;
const h = (k, t, desc) => `<p class="kicker">${esc(k)}</p><h1>${esc(t)}</h1><p class="lede">${esc(desc)}</p>`;

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60), remaining = minutes % 60;
  return [hours && `${hours} h`, remaining && `${remaining} min`].filter(Boolean).join(" ");
}

function courseRow(d) {
  const completed = Boolean(rec(d).done), started = (rec(d).steps || []).length;
  const status = completed ? "✓ Complete" : started ? `${started}/${d.steps.length} steps` : "";
  return `<a class="daylink ${d.scene ? "studio-row" : ""} ${completed ? "is-done" : ""}" href="${route(d)}"><b class="meta">${esc(shortTitle(d))}</b><span>${esc(d.title)}${window.PUBLICATION_BRIEFS[d.id] ? ' <em class="portfolio-marker">Portfolio milestone</em>' : ""}</span><small>${status ? esc(status) + " · " : ""}${d.id === "0/0" ? "Self-paced" : d.minutes + " min"} &rarr;</small></a>`;
}

function overview() {
  const d = next(), count = done(), dueCount = dueList().length;
  root.innerHTML = `<div class="hero"><div><p class="kicker">Interactive CUDA course</p><h1>Algorithms <br><em>in motion.</em></h1><p class="lede">Turn matrix math, swarms, fluids, and tearable fabric into real GPU programs. Edit the CUDA kernel, inspect the live frame, and measure what your optimization actually bought.</p><div class="row"><a class="btn" href="${route(d)}">${count === days.length ? "Revisit the capstone" : count || Object.keys(state.records).length ? "Resume learning" : "Start the C++ on-ramp"} &rarr;</a><a class="btn sub" href="#course">Course map</a></div><p class="meta">5 C++ on-ramp sessions &nbsp;·&nbsp; 40 CUDA days &nbsp;·&nbsp; 4 Night Shift graphics studios &nbsp;·&nbsp; Verified on RTX 5070</p></div><figure class="hero-figure" style="margin:0"><a href="labs/nightshift/index.html"><span class="figtop">NIGHT SHIFT · CUDA RAY TRACING</span><img src="labs/nightshift/media/lighting-beauty.jpg" style="width:100%;display:block;aspect-ratio:1.72;object-fit:cover" alt="A late train and illuminated platform signs reflected in wet paving"><span class="figbar"><b>Night Shift</b><span>Explore four live CUDA scenes ↗</span></span></a></figure></div>
  <section class="section"><div class="section-head"><h2>Interactive labs</h2><a href="#labs">All labs &amp; explorers ↗</a></div><div class="grid">${card("#matrix", "Linear algebra", "Inside a matrix tile", "Step through a tiled matrix multiply and watch how threads reuse shared input values.", "Open explorer")}${card("#cloth", "Interactive physics", "Pull a knitted swatch", "Stretch or tear a mesh, then compare brute-force and spatial-grid search costs.", "Open experiment")}${card("#digits", "Real datasets", "Search handwritten digits", "Turn cosine similarity into a matrix product and inspect real retrieval accuracy.", "Inspect the gallery")}</div></section>
  <section class="section grid two"><div class="panel tint"><p class="kicker">Your progress</p><h3>${count} of ${days.length} sessions complete</h3><div class="progresstrack"><i style="width:${100 * count / days.length}%"></i></div><p class="small" style="margin:10px 0 0">${count === days.length ? "Course complete" : "Up next:"} &nbsp; ${link(route(d), title(d) + " · " + d.title)}</p></div><div class="panel"><p class="kicker">Dynamic review</p><h3>${dueCount ? `${dueCount} ${dueCount === 1 ? "review" : "reviews"} due today` : "Spaced review queue"}</h3><p class="small">${dueCount ? link("#notes", "Open your review queue →") : "Fresh parametric questions unlock the day after you finish a session, paced by how easy or hard they feel."}</p></div></section>`;
}

function course() {
  const d = next(), count = done();
  const rawWeek = location.hash.split("/")[1];
  const openWeek = /^[0-8]$/.test(rawWeek || "") ? Number(rawWeek) : d.wi;
  root.innerHTML = h("Syllabus", "Course map", "Work through the sessions in order from top to bottom. Time estimates are flexible study budgets—move on whenever you understand the concept, your checks pass, and you've saved your notes.") +
  `<section class="panel tint map-resume"><div><p class="kicker">${count === days.length ? "Course complete" : "Up next"}</p><h2>${esc(d.title)}</h2><p class="small">${esc(title(d))} · ${d.id === "0/0" ? "Self-paced" : d.minutes + " min"}</p></div><a class="btn" href="${route(d)}">${count === days.length ? "Revisit the capstone" : count || Object.keys(state.records).length ? "Continue learning" : "Begin the on-ramp"} &rarr;</a></section>
  <p class="small dim" style="margin-top:.85rem">${days.length} sessions · ~${formatTime(days.reduce((n, item) => n + item.minutes, 0))} total · ${count} completed · <a href="Teaching%20audit.html">Curriculum overview</a></p><div class="section">${weeks.map((w, wi) => {
    const part = days.filter(item => item.wi === wi), path = WEEK_PATH[wi];
    const weekDone = part.filter(item => rec(item).done).length;
    return `<details class="week" ${wi === openWeek ? "open" : ""}><summary><span class="meta">${wi ? "Week " + wi : "On-ramp"}</span><span class="week-title">${esc(w.title)}</span><span class="week-count">${weekDone}/${part.length} done</span></summary><p>${esc(w.focus)}</p>
    <dl class="week-path"><dt>Prerequisite</dt><dd>${esc(path.bring)}</dd><dt>By the end</dt><dd>${esc(path.finish)}</dd><dt>Used next in</dt><dd>${esc(path.reuse)}</dd></dl>
    ${part.map(courseRow).join("")}</details>`;
  }).join("")}</div>`;
}

function studioIntro(d) {
  if (!d.scene) return "";
  const base = "labs/nightshift/", gallery = base + "index.html#" + d.scene;
  const prep = d.prerequisites.map(id => {
    const item = byId.get(id);
    return `<li>${link(route(item), title(item) + " · " + item.title)}${rec(item).done ? " <small>✓ Completed</small>" : ""}</li>`;
  }).join("");
  return `<section class="panel studio-intro"><a href="${gallery}" aria-label="Inspect the ${esc(d.title)} scene"><img src="${base}media/${esc(d.scene)}-beauty.jpg" alt="" width="480" height="270"></a><div><h2>Scene preview</h2><p>Inspect the reference capture in the browser first, then launch the native CUDA viewer to edit the kernel and time your speedup.</p><div class="row">${link(gallery, "Open scene gallery ↗")}${link(base + "manual.html#" + d.scene, "Open scene manual ↗")}</div><h3>Builds on</h3><ul class="links">${prep}</ul></div></section>`;
}

function handoff(d) {
  const items = d.carry || SESSION_BRIDGES[d.id] || [];
  if (!items.length) return "";
  const earlier = items.every(item => days.indexOf(byId.get(item.id)) < days.indexOf(d));
  return `<section class="panel handoff"><h2>${earlier ? "Connecting earlier sessions" : "Where you'll use this next"}</h2>${earlier ? "" : "<p>Finish this session first—these links show where today's concepts come back later.</p>"}<ul>${items.map(item => {
    const target = byId.get(item.id);
    return `<li>${esc(item.text)} ${link(route(target), title(target) + " · " + target.title + " →")}</li>`;
  }).join("")}</ul></section>`;
}

function weekRecall(d) {
  if (!d.wi || days.find(item => item.wi === d.wi).id !== d.id) return "";
  const entries = WEEK_RECALL[d.wi].map(id => {
    const earlier = byId.get(id), note = rec(earlier).note.trim();
    const sample = note.length > 420 ? note.slice(0, 420) + "…" : note;
    return `<li><a href="${route(earlier)}" target="_blank" rel="noopener">${esc(earlier.title)} ↗</a>${sample ? `<blockquote>${esc(sample)}</blockquote>` : ""}</li>`;
  });
  return `<details class="bring-forward"><summary>Quick recap from earlier weeks</summary><p>${esc(WEEK_PATH[d.wi].bring)}</p><ul>${entries.join("")}</ul></details>`;
}

function dayView(d) {
  const r = rec(d), index = days.indexOf(d);
  const links = d.scene
    ? [["#notes", "Record or import benchmarks"], ["#setup", "Check CUDA workstation"], ["labs/nightshift/manual.html#measure", "Benchmarking guide"]]
    : StudioGuides.related(d.wi, d.di);
  const sequence = `<nav class="section row lesson-nav" aria-label="Session navigation">${index ? `<a class="btn sub" href="${route(days[index - 1])}">&larr; ${esc(days[index - 1].title)}</a>` : ""}<span class="spacer"></span>${index + 1 < days.length ? `<a class="btn" href="${route(days[index + 1])}">Next: ${esc(days[index + 1].title)} &rarr;</a>` : `<a class="btn" href="#notes">Open notebook &rarr;</a>`}</nav>`;
  const body = LessonReader.view(d, r, {
    crumb: crumb("#course/" + d.wi, "Course map", title(d)),
    storageFailed, link, links, resources,
    studio: studioIntro(d),
    portfolio: Portfolio.checkpoint(d, {esc, link}),
    handoff: handoff(d),
    recall: weekRecall(d),
    sequence
  });
  root.innerHTML = `<article class="lesson reader">${body}</article>`;

  LessonReader.bind(root, notice, d, (i, value) => {
    readChanges();
    change(d, {drills: {...rec(d).drills, [i]: value}});
  });

  for (const box of root.querySelectorAll("[data-step]")) {
    box.onchange = () => {
      readChanges();
      const steps = new Set(rec(d).steps || []), i = Number(box.dataset.step);
      if (box.checked) steps.add(i); else steps.delete(i);
      change(d, {steps: [...steps].sort((a, b) => a - b)});
      root.querySelector("#step-status").textContent = `${steps.size} of ${d.steps.length} steps complete`;
      const bar = root.querySelector("#step-bar");
      if (bar) bar.style.width = `${d.steps.length ? Math.round((100 * steps.size) / d.steps.length) : 0}%`;
      const pTab = root.querySelector("#tab-practice span:last-child");
      if (pTab) pTab.textContent = `Guided Exercise (${steps.size}/${d.steps.length})`;
    };
  }

  root.querySelector("#note").oninput = e => {
    change(d, {note: e.target.value});
    root.querySelector("#saved").textContent = storageFailed ? "Export from Notebook to save your notes." : "Saved in this browser.";
  };

  for (const b of root.querySelectorAll("[data-choice]")) {
    b.onclick = () => {
      const i = Number(b.dataset.choice);
      change(d, {choice: i});
      root.querySelectorAll("[data-choice]").forEach(btn => {
        btn.className = "";
        btn.setAttribute("aria-pressed", String(btn === b));
      });
      const ok = i === d.check.answer;
      b.className = ok ? "right" : "wrong";
      root.querySelector(".feedback").textContent = ok ? "Correct! " + d.check.explanation : "Not quite — try another option or open the explanation below.";
    };
  }

  root.querySelector("#complete").onclick = e => {
    readChanges();
    const complete = !rec(d).done;
    change(d, {done: complete ? Date.now() : 0, review: 0, lastReview: 0, nextReview: 0});
    e.target.className = complete ? "sub" : "";
    e.target.textContent = complete ? "✓ Completed · click to reopen" : "Mark session complete";
    notice(complete ? "Marked complete! Your first dynamic review unlocks tomorrow." : "Session reopened.");
  };
}

function reviewDateLabel(t, now) {
  const date = new Date(t);
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startTomorrow = new Date(startToday); startTomorrow.setDate(startTomorrow.getDate() + 1);
  if (t >= startToday.getTime() && t < startTomorrow.getTime()) return "today";
  const startDayAfter = new Date(startTomorrow); startDayAfter.setDate(startDayAfter.getDate() + 1);
  if (t >= startTomorrow.getTime() && t < startDayAfter.getTime()) return "tomorrow";
  return date.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    ...(date.getFullYear() !== new Date(now).getFullYear() ? {year: "numeric"} : {})
  });
}

function renderReviewQuestion(d, card, stage, roll) {
  const badge = card.source === "gemini"
    ? `<span class="review-badge ai">Gemini AI · ${esc(card.model || "")}</span>`
    : `<span class="review-badge">Dynamic question #${roll + 1}</span>`;
  return `<div class="review-toolbar">
      ${badge}
      <div class="row">
        <button type="button" class="sub" data-roll="${esc(d.id)}">New question</button>
        ${ReviewEngine.getSettings().apiKey ? `<button type="button" class="sub" data-gemini="${esc(d.id)}">Ask Gemini AI</button>` : ""}
      </div>
    </div>
    ${CoursePrediction.view(`review-${d.id}-${stage}-${roll}-${card.source || "local"}`, card)}`;
}

function reviewCard(d, date, now) {
  const r = rec(d);
  const stage = r.review || 0;
  const roll = reviewRolls.get(d.id) || 0;
  const card = ReviewEngine.generateLocal(d, stage, roll);
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const dueText = date >= startToday.getTime() ? "Due today" : "Due since " + reviewDateLabel(date, now);
  const goodDays = stage === 0 ? 3 : stage === 1 ? 7 : stage === 2 ? 21 : 45;
  const easyDays = stage <= 0 ? 5 : stage === 1 ? 12 : stage === 2 ? 25 : 45;

  return `<details class="review-card" data-review-card="${esc(d.id)}" open>
    <summary>
      <span><strong>${esc(title(d))}</strong> · ${esc(d.title)}</span>
      <span class="small dim">Review #${stage + 1} · ${esc(dueText)}</span>
    </summary>
    <div class="review-card-body">
      <div class="review-question-slot" data-slot="${esc(d.id)}">${renderReviewQuestion(d, card, stage, roll)}</div>
      ${d.id === "8/4" ? `<p class="small">Also check your saved capstone notes and try the self-test question you wrote for this review.</p>` : ""}
      ${stage === 2 ? LessonReader.optionalChallenge(d) : ""}
      <div class="review-rate-row">
        <span class="small dim">How did that feel?</span>
        <button type="button" class="rate-again" data-rate="again" data-id="${esc(d.id)}">Again (tomorrow)</button>
        <button type="button" data-rate="good" data-id="${esc(d.id)}">Good (+${goodDays}d)</button>
        <button type="button" class="rate-easy" data-rate="easy" data-id="${esc(d.id)}">Easy (+${easyDays}d)</button>
        <span class="spacer"></span>
        ${link(route(d), "Reopen lesson →")}
      </div>
    </div>
  </details>`;
}

function recallQueue() {
  const now = Date.now();
  const startTomorrow = new Date(now);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  startTomorrow.setHours(0, 0, 0, 0);

  const scheduled = days
    .map(d => ({d, t: LabJournal.reviewDate(rec(d))}))
    .filter(item => item.t !== null)
    .sort((a, b) => a.t - b.t);
  const ready = scheduled.filter(item => item.t <= now);
  const upcoming = scheduled.find(item => item.t >= startTomorrow.getTime());
  const settings = ReviewEngine.getSettings();

  const message = ready.length
    ? `${ready.length} ${ready.length === 1 ? "session is" : "sessions are"} due. Each review generates a fresh variation—click New question anytime for another angle, then rate how it felt to schedule the next interval.`
    : scheduled.length
      ? "You're all caught up on reviews for today."
      : "Your first dynamic review unlocks the day after you mark a session complete.";

  return `<section class="panel tint" aria-labelledby="recall-heading">
    <div class="review-head">
      <div>
        <h2 id="recall-heading">Dynamic review queue</h2>
        <p>${message}</p>
      </div>
    </div>
    ${ready.map(item => reviewCard(item.d, item.t, now)).join("")}
    ${upcoming ? `<p class="review-upcoming"><strong>Next scheduled review:</strong> ${esc(reviewDateLabel(upcoming.t, now))} · ${esc(title(upcoming.d))} · ${esc(upcoming.d.title)}</p>` : ""}
    <details class="review-settings">
      <summary>Review settings · Optional Gemini API ${settings.apiKey ? "(connected)" : "(not set)"}</summary>
      <p class="small dim" style="margin-top:.5rem">Local parametric questions always work offline with zero rate limits. Optionally add a free Gemini API key here to unlock an <strong>Ask Gemini AI</strong> button on every review card. Your key stays in this browser only and is never included in notebook JSON exports. If Gemini is busy or rate-limited, it falls back cleanly to a fresh local question.</p>
      <form id="gemini-form">
        <div class="review-settings-grid">
          <label>Gemini API key <input type="password" name="apiKey" autocomplete="off" placeholder="AIza..." value="${esc(settings.apiKey)}"></label>
          <label>Model <input type="text" name="model" placeholder="gemini-2.5-flash" value="${esc(settings.model)}"></label>
        </div>
        <div class="row">
          <button type="submit">Save settings</button>
          ${settings.apiKey ? '<button type="button" class="sub" id="gemini-clear">Remove key</button>' : ""}
        </div>
      </form>
    </details>
  </section>`;
}

function notebook() {
  readChanges();
  let copies = [];
  try { copies = previousCopies(); } catch {}
  if (unreadableCopy !== null && !copies.includes(unreadableCopy)) copies.push(unreadableCopy);
  const entries = days.filter(d => rec(d).note || rec(d).done || rec(d).steps?.length || rec(d).choice != null || Object.keys(rec(d).drills || {}).length);

  root.innerHTML = h("Learning record", "Lab notebook", "Track dynamic spaced reviews, saved measurements, and your lesson notes. Everything saves in this browser—export a JSON backup whenever you want a portable copy.") +
  `<div class="controls"><button type="button" id="export">Export notebook</button><label class="file">Import or merge notebook &nbsp;<input type="file" id="import" accept=".json,application/json"></label></div>${copies.length ? `<section class="panel"><h2>Notebook recovery</h2><p>${readFailed ? "Download the unreadable original for recovery. Import a valid notebook to resume saving here." : "These originals were preserved when a valid notebook was imported."}</p>${copies.map((_, i) => `<button type="button" class="sub" data-copy="${i}">Download backup ${i + 1}</button>`).join(" ")}</section>` : ""}
  ${recallQueue()}
  <section class="section panel"><h2>Record a benchmark</h2><details class="bench-import"><summary>Import a native scene benchmark CSV</summary><p>Import a completed Night Shift, Swarm, Knit, or Flow benchmark CSV, or try the <a href="labs/nightshift/media/benchmark.csv" download>sample four-scene benchmark</a>.</p>${pre(["& {", "    $rows = @(python -B labs/nightshift/nightshift.py --scene lighting --bench --trials 9)", "    if ($LASTEXITCODE -ne 0) { throw 'Benchmark failed. Check the CUDA output above.' }", "    $out = 'lighting-' + (Get-Date -Format 'yyyyMMdd-HHmmssfff') + '.csv'", "    $rows | Out-File -Encoding utf8 -NoClobber -ErrorAction Stop $out", "    Get-Item -LiteralPath $out", "}"].join("\n"))}<label>Benchmark CSV <input id="bench-file" type="file" accept=".csv,text/csv"></label></details><form id="runform"><div class="grid two">${[["lab", "Lab", "Swarm"], ["input", "Workload and hardware", "768×448, 56 worms, RTX 5070"], ["variant", "Kernel or variant", "Student · tile 16"], ["ms", "Median milliseconds", "0.42"], ["check", "Correctness and timing scope", "IDs match · CUDA events · 41 samples"]].map(([n, l, p]) => `<label>${l}<input required style="display:block;width:100%" name="${n}" ${n === "ms" ? 'type="number" min="0.000001" step="any"' : ""} placeholder="${p}"></label>`).join("")}</div><button style="margin-top:14px">Save measurement</button></form>
  ${state.runs.length ? `<div class="tablewrap"><table><thead><tr><th>Lab / workload</th><th>Variant</th><th>Median ms</th><th>Check</th></tr></thead><tbody>${state.runs.slice().reverse().map(v => `<tr><td><b>${esc(v.lab)}</b><br>${esc(v.input)}</td><td>${esc(v.variant)}</td><td>${esc(v.ms)}</td><td>${esc(v.check)}</td></tr>`).join("")}</tbody></table></div>` : ""}</section>
  ${Portfolio.listing({rec, byId, link, esc})}
  <section class="section"><h2>Lesson notes</h2><div class="stack">${entries.length ? entries.map(d => `<div class="panel"><span class="meta">${esc(title(d))}</span><h3>${link(route(d), d.title)}</h3><p class="read">${esc(rec(d).note || (rec(d).done ? "Completed (no written note yet)." : rec(d).steps?.length ? rec(d).steps.length + " practice steps checked off." : rec(d).choice != null ? "Knowledge check answered." : ""))}</p>${LessonPractice.progress(d, rec(d))}</div>`).join("") : "<p class=\"dim\">Your lesson notes will show up here as you work through the course.</p>"}</div></section>`;

  root.querySelector("#export").onclick = () => { readChanges(); downloadFile(JSON.stringify(state, null, 2), "fieldwork-notebook.json"); };
  for (const b of root.querySelectorAll("[data-copy]")) b.onclick = () => downloadFile(copies[Number(b.dataset.copy)], "fieldwork-original-" + (Number(b.dataset.copy) + 1) + ".json");

  root.querySelector("#import").onchange = async e => {
    try {
      const file = e.target.files[0]; if (!file) return;
      const incoming = fromData(JSON.parse(LabJournal.decodeFile(await file.arrayBuffer())));
      readChanges(); restoreOnImport(); LabJournal.merge(state, incoming); save(); notebook();
      notice(storageFailed ? "Notebook merged in this tab. Export to keep it." : "Notebook merged.");
    } catch (err) { notice(err.message); e.target.value = ""; }
  };

  root.querySelector("#bench-file").onchange = async e => {
    try {
      const file = e.target.files[0]; if (!file) return;
      const rows = LabJournal.readBench(LabJournal.decodeFile(await file.arrayBuffer()), new Date(file.lastModified).toISOString());
      readChanges(); const added = LabJournal.addRuns(state, rows); save(); notebook();
      notice(added ? `Imported ${added} timing rows.` : "Those measurements are already in your notebook.");
    } catch (err) { notice(err.message); e.target.value = ""; }
  };

  root.querySelector("#runform").onsubmit = e => {
    e.preventDefault();
    const row = Object.fromEntries(new FormData(e.target));
    readChanges(); state.runs.push({...row, date: new Date().toISOString()}); save(); notebook();
    notice(storageFailed ? "Measurement added to this tab. Export to keep it." : "Measurement saved.");
  };

  // Gemini settings form
  const gForm = root.querySelector("#gemini-form");
  if (gForm) {
    gForm.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(gForm);
      ReviewEngine.saveSettings({apiKey: fd.get("apiKey"), model: fd.get("model")});
      notebook();
      notice(String(fd.get("apiKey") || "").trim() ? "Gemini review settings saved locally." : "Review settings saved (local generator only).");
    };
  }
  const gClear = root.querySelector("#gemini-clear");
  if (gClear) {
    gClear.onclick = () => {
      ReviewEngine.saveSettings({apiKey: "", model: "gemini-2.5-flash"});
      notebook();
      notice("Gemini API key removed.");
    };
  }

  // Bind review actions (New question, Ask Gemini AI, and confidence rating buttons)
  function bindSlotActions(container) {
    for (const btn of container.querySelectorAll("[data-roll]")) {
      btn.onclick = () => {
        const id = btn.dataset.roll, d = byId.get(id);
        const nextRoll = (reviewRolls.get(id) || 0) + 1;
        reviewRolls.set(id, nextRoll);
        const slot = root.querySelector(`[data-slot="${CSS.escape(id)}"]`);
        const stage = rec(d).review || 0;
        const fresh = ReviewEngine.generateLocal(d, stage, nextRoll);
        slot.innerHTML = renderReviewQuestion(d, fresh, stage, nextRoll);
        bindSlotActions(slot);
      };
    }
    for (const btn of container.querySelectorAll("[data-gemini]")) {
      btn.onclick = async () => {
        const id = btn.dataset.gemini, d = byId.get(id);
        const slot = root.querySelector(`[data-slot="${CSS.escape(id)}"]`);
        const stage = rec(d).review || 0;
        const nextRoll = (reviewRolls.get(id) || 0) + 1;
        reviewRolls.set(id, nextRoll);
        btn.disabled = true;
        btn.textContent = "Generating…";
        try {
          const aiCard = await ReviewEngine.generateGemini(d);
          slot.innerHTML = renderReviewQuestion(d, aiCard, stage, nextRoll);
          bindSlotActions(slot);
          notice("Fresh Gemini question ready.");
        } catch (err) {
          const fallback = ReviewEngine.generateLocal(d, stage, nextRoll);
          slot.innerHTML = renderReviewQuestion(d, fallback, stage, nextRoll);
          bindSlotActions(slot);
          notice(`${err.message || "Gemini unavailable"} — loaded a fresh local question instead.`);
        }
      };
    }
  }
  bindSlotActions(root);

  for (const b of root.querySelectorAll("[data-rate]")) {
    b.onclick = () => {
      const id = b.dataset.id, rating = b.dataset.rate, d = byId.get(id);
      readChanges();
      const now = Date.now();
      const sched = LabJournal.scheduleNext(rec(d), rating, now);
      change(d, {review: sched.review, lastReview: sched.lastReview, nextReview: sched.nextReview});
      reviewRolls.delete(id);
      notebook();
      notice(`Scheduled “${d.title}” for ${reviewDateLabel(sched.nextReview, now)} (+${sched.days} day${sched.days === 1 ? "" : "s"}).`);
    };
  }
}

function publicationPage(d) {
  const get = () => { readChanges(); return rec(d).publication || {}; };
  const set = (field, value) => { const publication = Portfolio.draft(d.id, {...get(), [field]: value}); change(d, {publication}); };
  Portfolio.open(d, {root, h, crumb, esc, pre, link, get, set, download: downloadFile});
}

function render() {
  readChanges(); teardown?.(); teardown = null;
  const addr = (location.hash.slice(1) || "studio"), p = addr.split("/")[0];
  const section = (p === "day" || p === "publication") ? "course" : (["matrix", "chain", "cloth", "compute", "swarm", "knit", "digits", "flow"].includes(p) ? "labs" : p);
  document.querySelectorAll("nav a").forEach(a => {
    if (a.hash === "#" + section) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (p === "studio") overview();
  else if (p === "course") course();
  else if (p === "notes") notebook();
  else if (p === "publication" && byId.has(addr.slice(12)) && window.PUBLICATION_BRIEFS[addr.slice(12)]) publicationPage(byId.get(addr.slice(12)));
  else if (p === "day" && byId.has(addr.slice(4))) dayView(byId.get(addr.slice(4)));
  else if (["labs", "matrix", "chain", "cloth", "compute", "swarm", "knit", "digits", "flow", "setup"].includes(p)) {
    teardown = StudioGuides.view(p, {root, esc, pre, card, link, crumb, h, resources, notice}) || null;
  } else {
    root.innerHTML = h("Navigation", "Page unavailable", "Pick a session from the course map.") + link("#course", "Open the course map");
  }
  document.title = (root.querySelector("h1")?.textContent || "Studio") + " · Fieldwork";
  if (previous && previous !== addr) {
    window.scrollTo({top: 0, left: 0, behavior: "instant"});
    root.focus({preventScroll: true});
  }
  previous = addr;
}

document.querySelector(".skip").onclick = e => { e.preventDefault(); root.focus(); root.scrollIntoView(); };
window.addEventListener("hashchange", render);
render();
})();
