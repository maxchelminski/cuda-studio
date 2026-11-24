// Shared interactive prediction & explanation checker for lessons, reviews, and lab manuals.
window.CoursePrediction = (() => {
  "use strict";
  const cards = new Map();
  const bound = new WeakSet();
  const escape = text => String(text ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const inline = text => escape(text).replace(/\x60([^\x60\n]+)\x60/g, "<code>$1</code>");
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

  function parseValue(raw) {
    const parts = raw.split("/");
    if (parts.length > 2 || !parts.every(x => numeric.test(x) && Number.isFinite(Number(x)))) return NaN;
    return parts.length === 1 ? Number(parts[0]) : Number(parts[0]) / Number(parts[1]);
  }

  function result(card) {
    if (card.type === "rubric" || card.type === "observation") return "";
    const answer = Array.isArray(card.answer) ? card.answer.join(", ") : card.answer;
    return '<p><strong>Answer: ' + inline(String(answer)) + (card.unit ? " " + inline(card.unit) : "") + '</strong></p>';
  }

  function view(id, card) {
    cards.set(id, card);
    const exact = !["rubric", "observation"].includes(card.type);
    let controls;
    if (card.type === "choice") {
      controls = '<fieldset><legend class="prediction-sr">Choose an answer</legend>' + card.options.map((option, index) =>
        '<label class="prediction-option"><input type="radio" name="guess" value="' + index + '"> <span>' + inline(option) + '</span></label>'
      ).join("") + '</fieldset>';
    } else if (card.type === "observation" && card.directions) {
      controls = '<label class="prediction-field">Before running: how do you expect the second result to compare to the first?<select name="guess"><option value="">Choose a direction</option><option value="lower">Lower</option><option value="same">About the same</option><option value="higher">Higher</option></select></label>' +
        [['first', 'First measured value'], ['second', 'Second measured value'], ['margin', 'Optional noise tolerance (same units)']].map(([name, label]) =>
          '<label class="prediction-field">' + label + '<input name="' + name + '" type="text" inputmode="decimal" autocomplete="off"></label>').join('');
    } else if (exact) {
      const label = card.label || (card.type === "list" ? "Enter the numbers in order, separated by commas" : "Your answer");
      controls = '<label class="prediction-field">' + inline(label) + (card.unit ? ' (' + inline(card.unit) + ')' : '') +
        '<input name="guess" type="text" ' + (card.type === "number" ? 'inputmode="decimal" ' : '') +
        'autocomplete="off" spellcheck="false" maxlength="1024"></label>';
    } else {
      const measured = card.type === "observation";
      controls = '<label class="prediction-field">' + (measured ? 'Before running: what do you expect?' : 'Jot down your reasoning (optional)') +
        '<textarea name="guess" rows="2"></textarea></label>' + (measured ?
        '<label class="prediction-field">After running: what did you see?<textarea name="actual" rows="2"></textarea></label>' : '');
    }
    const caption = exact ? "Check answer" : card.type === "observation" ? "Compare with run" : "Compare reasoning";
    const reason = card.type === "observation" ? "How to read the result" : card.type === "rubric" ? "Show worked explanation" : "Show answer & explanation";
    return '<form class="prediction-card" data-prediction="' + escape(id) + '" novalidate>' +
      '<p class="prediction-prompt"><strong>' + inline(card.prompt) + '</strong></p>' +
      controls +
      '<div class="prediction-actions">' +
        '<button type="submit">' + caption + '</button>' +
        '<button type="button" class="sub" data-toggle-reason>' + reason + '</button>' +
      '</div>' +
      '<p class="prediction-status" role="status"></p>' +
      '<details class="prediction-reason"><summary>' + reason + '</summary>' +
      result(card) + '<p>' + inline(card.explain) + '</p></details>' +
      (!exact && !card.directions ? '<div class="prediction-self" hidden><button type="button" class="sub" data-assess="match">My ' +
        (card.type === "observation" ? 'run matches my prediction' : 'reasoning matches') +
        '</button><button type="button" class="sub" data-assess="revise">I need to revise this</button></div>' : '') +
      '</form>';
  }

  function entries(day, slot) {
    return [window.PREDICTIONS_PRIMER, window.PREDICTIONS_EARLY, window.PREDICTIONS_LATE]
      .flatMap(source => source?.[day]?.[slot] || []);
  }

  function group(day, slot, instance = "", open = false) {
    const checks = entries(day, slot);
    if (!checks.length) return "";
    const countLabel = checks.length === 1 ? "Quick check · 1 question" : `Quick check · ${checks.length} questions`;
    return '<details class="prediction-group"' + (open ? ' open' : '') + '><summary>' + countLabel + '</summary>' +
      checks.map((card, i) => view([day, slot, i, instance].join(":"), card)).join("") + '</details>';
  }

  function evaluate(card, raw) {
    const input = raw.trim().replace(/[−–]/g, "-").replace(/\s*\/\s*/g, "/");
    if (!input) return {message: card.type === "choice" ? "Pick an option first, or click Show answer & explanation." : "Type an answer first, or click Show answer & explanation."};
    if (card.type === "choice") {
      const index = Number(input);
      return {correct: Number.isInteger(index) && card.options[index] === card.answer};
    }
    let values;
    if (card.type === "list") {
      const unwrapped = input.replace(/^\s*[\[(]\s*|\s*[\])]\s*$/g, "");
      if (!unwrapped || /^(empty|none)$/i.test(unwrapped)) values = [];
      else {
        if (/^\s*[,;]|[,;]\s*$|[,;]\s*[,;]/.test(unwrapped)) return {message: "Enter each number separated by commas (for example: 4, 8, 12)."};
        values = unwrapped.split(/[\s,;]+/);
      }
    } else {
      let value = input;
      if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(value)) value = value.replace(/,/g, "");
      values = [value];
    }
    const numbers = values.map(parseValue);
    if (numbers.some(v => !Number.isFinite(v))) return {message: "Enter plain numbers like 0.5 or 1/2 (leave units out)."};
    const expected = Array.isArray(card.answer) ? card.answer : [card.answer];
    if (values.length !== expected.length) return {message: "Expected " + expected.length + (expected.length === 1 ? " number." : " numbers in order, separated by commas (write 1000 without commas for one thousand).")};
    const mismatch = expected.findIndex((target, index) => Math.abs(numbers[index] - target) > (card.tolerance ?? 0) + Math.abs(target) * Number.EPSILON * 4);
    if (mismatch >= 0 && card.type === "list") return {correct: false, message: "Check value #" + (mismatch + 1) + " in your list." + (mismatch ? " The earlier ones are right." : "") + " You can try again or open the explanation."};
    return {correct: mismatch === -1};
  }

  function bind(root) {
    if (!root?.addEventListener || bound.has(root)) return;
    bound.add(root);
    root.addEventListener("input", event => {
      const form = event.target.closest?.("form[data-prediction]");
      if (!form) return;
      const status = form.querySelector(".prediction-status");
      status.textContent = "";
      status.classList.remove("is-ok", "is-wrong");
      const self = form.querySelector(".prediction-self");
      if (self) self.hidden = true;
    });
    root.addEventListener("submit", event => {
      const form = event.target;
      if (!form.matches("form[data-prediction]")) return;
      event.preventDefault();
      const card = cards.get(form.dataset.prediction);
      if (!card) return;
      const field = form.elements.namedItem("guess"), raw = field.value;
      const status = form.querySelector(".prediction-status");
      status.classList.remove("is-ok", "is-wrong");

      if (card.type === "observation" && card.directions) {
        const amounts = ["first", "second", "margin"].map(name => form.elements.namedItem(name).value.trim().replace(/−/g, "-"));
        if (!raw || !amounts.slice(0, 2).every(v => numeric.test(v) && Number.isFinite(Number(v))) || (amounts[2] && (!numeric.test(amounts[2]) || !Number.isFinite(Number(amounts[2])) || Number(amounts[2]) < 0))) {
          status.textContent = "Pick a direction and enter both measurements in the same units.";
          status.classList.add("is-wrong");
          return;
        }
        const [first, second, margin] = amounts.map(Number);
        const direction = Math.abs(second - first) <= margin + Math.max(Math.abs(first), Math.abs(second)) * Number.EPSILON * 2 ? "same" : second < first ? "lower" : "higher";
        const matched = raw === direction;
        status.textContent = "Your second result was " + (direction === "same" ? "within your tolerance margin" : direction) + ". " + (matched ? "That matches your prediction." : "That differs from your prediction.") + " Open the explanation below to dig into why.";
        status.classList.add(matched ? "is-ok" : "is-wrong");
        return;
      }

      if (card.type === "observation" || card.type === "rubric") {
        const actual = form.elements.namedItem("actual");
        if (!raw.trim() || (actual && !actual.value.trim())) {
          status.textContent = !raw.trim() ? "Write a quick thought first, or click Show worked explanation to read along." : "Enter what you observed in your run, or open the explanation below.";
          (!raw.trim() ? field : actual).focus();
          return;
        }
        form.querySelector(".prediction-reason").open = true;
        form.querySelector(".prediction-self").hidden = false;
        status.textContent = actual ? "Compare your run against the guide below." : "Compare your notes with the worked explanation below.";
        return;
      }

      const res = evaluate(card, raw);
      if (res.message) {
        status.textContent = res.message;
        status.classList.add("is-wrong");
      } else if (res.correct) {
        status.textContent = "Correct! Open the explanation below to confirm the reasoning.";
        status.classList.add("is-ok");
      } else {
        status.textContent = "Not quite — give it another try or click Show answer & explanation.";
        status.classList.add("is-wrong");
      }
    });

    root.addEventListener("click", event => {
      const toggle = event.target.closest?.("[data-toggle-reason]");
      if (toggle) {
        const form = toggle.closest("form[data-prediction]");
        const details = form?.querySelector(".prediction-reason");
        if (details) details.open = !details.open;
        return;
      }
      const button = event.target.closest?.("[data-assess]");
      const form = button?.closest("form[data-prediction]");
      if (!form) return;
      const status = form.querySelector(".prediction-status");
      status.classList.remove("is-ok", "is-wrong");
      if (button.dataset.assess === "match") {
        status.textContent = "Great — self-check recorded.";
        status.classList.add("is-ok");
      } else {
        status.textContent = "No problem — edit your answer above and compare again when ready.";
      }
    });
  }

  bind(document);
  return {view, group, entries, bind, evaluate};
})();
