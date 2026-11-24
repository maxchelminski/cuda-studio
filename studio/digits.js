(() => {
  "use strict";
  const GALLERY = 1437, QUERIES = 360, FEATURES = 64;
  let cached;

  function dataset() {
    if (cached) return cached;
    const bytes = atob(globalThis.CUDA_DIGITS_PACKED);
    if (bytes.length !== (GALLERY + QUERIES) * 41) throw new Error("The digit data file is incomplete.");
    const pixels = new Uint8Array((GALLERY + QUERIES) * FEATURES);
    const labels = new Uint8Array(GALLERY + QUERIES);
    const norms = new Float64Array(labels.length);
    for (let image = 0; image < labels.length; image++) {
      let pos = image * 41, bits = 0, held = 0, sumSquares = 0;
      labels[image] = bytes.charCodeAt(pos++);
      for (let cell = 0; cell < FEATURES; cell++) {
        if (bits < 5) {
          held = (held << 8) | bytes.charCodeAt(pos++);
          bits += 8;
        }
        bits -= 5;
        const value = (held >>> bits) & 31;
        held &= (1 << bits) - 1;
        pixels[image * FEATURES + cell] = value;
        sumSquares += value * value;
      }
      norms[image] = Math.sqrt(sumSquares);
    }
    cached = {pixels, labels, norms, rows: new Array(QUERIES)};
    return cached;
  }

  function matches(data, query) {
    if (data.rows[query]) return data.rows[query];
    const image = GALLERY + query, start = image * FEATURES;
    const best = {cosine: [], dot: []};
    function consider(list, id, score) {
      if (list.length === 3 && score <= list[2].score) return;
      // Gallery IDs arrive in ascending order. Preserve the first on a tie.
      let at = list.length;
      while (at > 0 && score > list[at - 1].score) at--;
      list.splice(at, 0, {id, score});
      if (list.length > 3) list.pop();
    }
    for (let id = 0; id < GALLERY; id++) {
      let dot = 0;
      const base = id * FEATURES;
      for (let p = 0; p < FEATURES; p++) dot += data.pixels[base + p] * data.pixels[start + p];
      consider(best.dot, id, dot);
      consider(best.cosine, id, dot / (data.norms[id] * data.norms[image]));
    }
    data.rows[query] = best;
    return best;
  }

  function paint(canvas, data, image) {
    const context = canvas.getContext("2d");
    const bitmap = context.createImageData(8, 8);
    for (let p = 0; p < FEATURES; p++) {
      const t = data.pixels[image * FEATURES + p] / 16;
      bitmap.data.set([19 + 193 * t, 43 + 195 * t, 35 + 133 * t, 255], 4 * p);
    }
    context.putImageData(bitmap, 0, 0);
  }

  globalThis.mountDigits = function mountDigits(root) {
    let data;
    try { data = dataset(); } catch (error) {
      root.textContent = "Could not load the handwritten digits. Open index.html with studio/digits-data.js beside studio/digits.js.";
      return;
    }
    root.innerHTML = `
      <style>
        .digit-lab .digit-controls{display:flex;align-items:end;gap:.7rem;flex-wrap:wrap;margin:1.15rem 0}
        .digit-controls label{display:grid;gap:2px}.digit-controls input{width:6rem}
        .digit-board{padding:clamp(18px,3vw,34px);display:grid;grid-template-columns:1fr 2fr;gap:clamp(17px,4vw,50px)}
        .digit-board h2{font:500 .85rem var(--mono);color:#c6ddba;margin:0 0 1rem}
        .digit-board .digit-cell{min-width:0}.digit-board .digit-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(5px,2.5vw,24px)}
        .digit-board figure{margin:0}.digit-board canvas{width:min(100%,155px);aspect-ratio:1;border:1px solid #527263;border-radius:3px;
          image-rendering:pixelated;cursor:default;touch-action:auto;display:block}
        .digit-board figcaption{font:500 .8rem/1.55 var(--mono);margin:.5rem 0 0;color:#ccddc7}
        .digit-board figcaption strong{font-size:1rem;color:#edf3de;display:block}.digit-board .digit-index{color:#b9c9b4}
        .digit-lab .digit-summary{padding:12px 20px;color:#e7efda;border-top:1px solid #486055}
        .digit-lab .digit-panel{margin-top:16px}.digit-lab .digit-aggregate{margin-left:8px}.digit-lab .digit-native{margin-top:1.25rem}
        @media(max-width:620px){.digit-board{grid-template-columns:1fr;gap:18px}.digit-board .digit-query figure{display:flex;align-items:center;gap:12px}
          .digit-board .digit-query canvas{width:84px}.digit-lab .digit-aggregate{display:block;margin:8px 0 0}}
      </style>
      <section class="digit-lab">
        <div class="bread"><a href="#labs">Lab shelf</a> / Handwriting</div>
        <p class="kicker">Browser CPU · Matrix multiplication</p>
        <h1>The handwriting index</h1>
        <p class="lede">Find a handwritten digit’s closest match among 1,437 gallery images. Change how you score the same pixels and see which neighbor wins.</p>
        <p><strong>Week 2, Day 1.</strong> Start with cosine and select <b>Score all 360 queries</b>. Then select <b>Find a metric disagreement</b>. On that query, switch between the two similarity measures. Record the true digit, each winning label, and one stroke the query shares with a winner. Return to the lesson for the small matrix-product check.</p>
        <div class="digit-controls" role="group" aria-label="Retrieval controls">
          <label>Query (1–360)<input data-q type="number" min="1" max="360" step="1" value="1"></label>
          <button type="button" class="sub" data-back aria-label="Previous query">←</button>
          <button type="button" class="sub" data-next aria-label="Next query">→</button>
          <label>Similarity<select data-metric><option value="cosine">Cosine similarity</option><option value="dot">Raw dot product</option></select></label>
          <button type="button" class="sub" data-disagree>Find a metric disagreement</button>
        </div>
        <div class="instrument">
          <div class="digit-board">
            <div class="digit-query digit-cell"><h2>Query image</h2><figure><canvas width="8" height="8" role="img"></canvas><figcaption></figcaption></figure></div>
            <div class="digit-cell"><h2>Nearest gallery images</h2><div class="digit-cards">${Array.from({length:3}, () => '<figure><canvas width="8" height="8" role="img"></canvas><figcaption></figcaption></figure>').join("")}</div></div>
          </div>
          <div class="digit-summary" role="status" data-verdict></div>
        </div>
        <div class="panel digit-panel">
          <h2>Does the metric change recognition?</h2>
          <p data-explain></p>
          <button type="button" data-all>Score all 360 queries</button>
          <span class="digit-aggregate" role="status" aria-live="polite" data-aggregate></span>
        </div>
        <div class="digit-native">
          <details><summary>Week 7, Day 2 · Compare numerical precision on the GPU</summary><p>One matrix multiply scores all 360 queries against all 1,437 gallery images. This browser calculates in double precision and breaks ties in favor of the earliest gallery row. The <a href="#day/7/1">precision lesson</a> gives the native commands and shows how to compare FP32 and TF32 scores for the same query.</p></details>
          <p class="dim">The first 1,437 rows of the UCI test subset form the gallery. The remaining 360 supply the queries. Each 8×8 cell stores an ink count from 0 to 16. E. Alpaydin and C. Kaynak (1998), repacked under CC BY 4.0. <a href="https://doi.org/10.24432/C50P49" target="_blank" rel="noreferrer">UCI source</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">License</a></p>
        </div>
      </section>`;
    const select = selector => root.querySelector(selector);
    const q = select("[data-q]"), metric = select("[data-metric]");
    const back = select("[data-back]"), next = select("[data-next]");
    const all = select("[data-all]"), aggregate = select("[data-aggregate]");
    let query = 0;

    function render() {
      q.value = query + 1;
      back.disabled = query === 0;
      next.disabled = query === QUERIES - 1;
      const image = GALLERY + query;
      const ranked = matches(data, query)[metric.value];
      const predicted = data.labels[ranked[0].id], actual = data.labels[image];
      const figure = select(".digit-query figure");
      paint(figure.querySelector("canvas"), data, image);
      figure.querySelector("canvas").setAttribute("aria-label", `Handwritten query digit ${actual}`);
      figure.querySelector("figcaption").innerHTML = `<strong>Label ${actual}</strong><span class="digit-index">Query ${query + 1}</span>`;
      for (const [rank, card] of [...root.querySelectorAll(".digit-cards figure")].entries()) {
        const {id, score} = ranked[rank];
        paint(card.querySelector("canvas"), data, id);
        card.querySelector("canvas").setAttribute("aria-label", `Gallery neighbor ${rank + 1}, labeled ${data.labels[id]}`);
        const scoreText = metric.value === "dot" ? String(score) : score.toFixed(4);
        card.querySelector("figcaption").innerHTML = `<strong>${rank + 1}. Label ${data.labels[id]}</strong>Score ${scoreText}<br><span class="digit-index">Gallery ${id + 1}</span>`;
      }
      select("[data-verdict]").textContent = predicted === actual
        ? `Correct match. The nearest neighbor and query are both labeled ${actual}.`
        : `Miss. The nearest neighbor is labeled ${predicted}. The query is labeled ${actual}.`;
      select("[data-explain]").textContent = metric.value === "cosine"
        ? "Cosine divides the dot product by both image lengths. Doubling every intensity leaves the score unchanged. Look for a lightly written query whose winner changes when you switch to raw dot product."
        : "Raw dot product adds 64 products of pixel intensities. Dark strokes that overlap the query can lift a candidate’s score. Switch to cosine to test how much the winner depends on total stroke strength.";
    }
    q.addEventListener("change", () => {
      if (q.value.trim() !== "" && Number.isFinite(Number(q.value))) {
        query = Math.min(QUERIES - 1, Math.max(0, Math.round(Number(q.value)) - 1));
      }
      render();
    });
    back.onclick = () => { if (query > 0) query--; render(); };
    next.onclick = () => { if (query < QUERIES - 1) query++; render(); };
    metric.onchange = render;
    select("[data-disagree]").onclick = () => {
      for (let offset = 1; offset <= QUERIES; offset++) {
        const candidate = (query + offset) % QUERIES, result = matches(data, candidate);
        if (data.labels[result.dot[0].id] !== data.labels[result.cosine[0].id]) { query = candidate; break; }
      }
      render();
    };
    all.onclick = () => {
      all.disabled = true;
      let start = 0, correctCosine = 0, correctDot = 0;
      function batch() {
        if (!aggregate.isConnected) return;
        const stop = Math.min(start + 24, QUERIES);
        for (; start < stop; start++) {
          const row = matches(data, start), wanted = data.labels[GALLERY + start];
          correctCosine += Number(data.labels[row.cosine[0].id] === wanted);
          correctDot += Number(data.labels[row.dot[0].id] === wanted);
        }
        if (start < QUERIES) {
          aggregate.textContent = `Scored ${start} / ${QUERIES}`;
          requestAnimationFrame(batch);
        } else {
          aggregate.textContent = `Correct labels · cosine ${correctCosine}/360 · raw dot ${correctDot}/360`;
        }
      }
      requestAnimationFrame(batch);
    };
    render();
  };
})();
