const Portfolio = (() => {
  "use strict";
  const projectRoute = id => "#publication/" + id;
  const predictions = {"2/4":"pub-matrix","4/4":"pub-colony","8/4":"pub-capstone"};
  const example = "labs/publication-example/index.html";

  function draft(id, input) {
    const brief = window.PUBLICATION_BRIEFS[id];
    if (!brief || !input || typeof input !== "object") return {};
    const pairs = ["title", ...brief.fields.map(field => field.key)]
      .filter(key => typeof input[key] === "string" && input[key].trim())
      .map(key => [key, input[key]]);
    return Object.fromEntries(pairs);
  }

  function checkpoint(d, {esc, link}) {
    const brief = window.PUBLICATION_BRIEFS[d.id];
    if (!brief) return "";
    return `<section class="panel tint"><p class="kicker">Optional portfolio milestone · ${brief.minutes} min</p>
      <h2>${esc(brief.title)}</h2><p>${esc(brief.pitch)}</p>
      <p>${link(projectRoute(d.id), "Build this case study →")}</p></section>`;
  }

  function listing({rec, byId, link, esc}) {
    return `<section class="section panel"><h2>Portfolio milestones</h2>
      <p>Turn a checkpoint into a short public case study. Open a draft here or from the checkpoint itself.</p>
      <ul class="links">${Object.entries(window.PUBLICATION_BRIEFS).map(([id, brief]) => {
        const d = byId.get(id);
        const count = Object.keys(draft(id, rec(d).publication)).length;
        return `<li>Week ${d.wi} · ${link(projectRoute(id), brief.title)} <small class="dim">${esc(count ? "· draft started" : "· " + brief.minutes + " min")}</small></li>`;
      }).join("")}</ul></section>`;
  }

  function open(d, {root, h, crumb, esc, pre, link, get, set, download}) {
    const brief = window.PUBLICATION_BRIEFS[d.id];
    const fields = [{key:"title", label:"Your title", prompt:"Name the result you can defend."}, ...brief.fields];
    const values = get();
    const items = entries => entries.map(item => "<li>" + esc(item) + "</li>").join("");
    root.innerHTML = crumb("#day/" + d.id, "Week " + d.wi + " checkpoint", "Portfolio") +
      h("Optional case study · " + brief.minutes + " min", brief.title, brief.pitch) +
      `<div class="layout section portfolio"><div class="stack">
        <section class="panel"><h2>Run the study</h2><ol class="steps">${items(brief.steps)}</ol>${LabPredictions.render([predictions[d.id]],"project-"+d.id)}
        ${(brief.commands || []).map(command => `<details class="study-command"><summary>${esc(command.label)}</summary>${pre(command.code)}</details>`).join("")}</section>
        <section class="panel"><h2>Write your case study</h2><p>Write for someone who has never opened Fieldwork. Use your own measurements and link your evidence by its filename.</p>
        ${fields.map(({key,label,prompt}) => `<div class="study-field"><label for="pub-${esc(key)}">${esc(label)}</label>
          <p class="small dim" id="hint-${esc(key)}">${esc(prompt)}</p>
          ${key === "title"
            ? `<input id="pub-title" data-pubfield="title" aria-describedby="hint-title" value="${esc(values.title || "")}">`
            : `<textarea id="pub-${esc(key)}" data-pubfield="${esc(key)}" aria-describedby="hint-${esc(key)}">${esc(values[key] || "")}</textarea>`}</div>`).join("")}
        <button id="download-study">Download case study (.md)</button>
        <p class="small dim">Drafts save in this browser and travel with your notebook backup. The Markdown download contains the title and answers you enter here. Save it as README.md alongside the evidence files below before you share the folder.</p></section>
      </div><aside class="stack"><section class="panel tint"><h2>What to share</h2><ul class="study-list">${items(brief.files)}</ul></section>
        <section class="panel"><h2>Before you share</h2><ul class="study-list">${items(brief.checks)}</ul></section>
        <section class="panel"><h2>Read a finished example</h2><p>See how a course-authored study uses real digit pairs to explain a surprising retrieval result. Its source and reproduction command are included.</p>${link(example, "Inspect the digit search study ↗")}</section></aside></div>
        <p class="section">${link("#day/" + d.id, "← Back to " + d.title)}</p>`;
    for (const field of root.querySelectorAll("[data-pubfield]")) {
      field.oninput = () => set(field.dataset.pubfield, field.value);
    }
    root.querySelector("#download-study").onclick = () => {
      const current = get();
      download(window.PublicationExport.markdown(brief, current),
        window.PublicationExport.filename(brief, current), "text/markdown;charset=utf-8");
    };
  }
  return {draft, checkpoint, listing, open};
})();
