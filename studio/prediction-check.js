// One checker works in the offline lesson reader, standalone lab manuals and explorers.
window.CoursePrediction = (() => {
  "use strict";
  const cards = new Map();
  const bound = new WeakSet();
  const escape = text => String(text ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const inline = text => escape(text).replace(/\x60([^\x60\n]+)\x60/g, "<code>$1</code>");
  const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  function parseValue(raw) {
    const parts=raw.split("/");
    if(parts.length>2 || !parts.every(x=>numeric.test(x) && Number.isFinite(Number(x))))return NaN;
    return parts.length===1?Number(parts[0]):Number(parts[0])/Number(parts[1]);
  }

  function result(card) {
    if (card.type === "rubric" || card.type === "observation") return "";
    const answer = Array.isArray(card.answer) ? card.answer.join(", ") : card.answer;
    return '<p><strong>' + inline(String(answer)) + (card.unit ? " " + inline(card.unit) : "") + '</strong></p>';
  }
  function view(id, card) {
    cards.set(id, card);
    const exact = !["rubric","observation"].includes(card.type);
    let controls;
    if (card.type === "choice") {
      controls = '<fieldset><legend class="prediction-sr">Choose an answer</legend>' + card.options.map((option,index) =>
        '<label class="prediction-option"><input type="radio" name="guess" value="' + index + '"> <span>' + inline(option) + '</span></label>'
      ).join("") + '</fieldset>';
    } else if (card.type === "observation" && card.directions) {
      controls = '<label class="prediction-field">Before the run · how will the second result compare with the first?<select name="guess"><option value="">Choose a direction</option><option value="lower">Lower</option><option value="same">About the same</option><option value="higher">Higher</option></select></label>' +
        [['first','First measured result'],['second','Second measured result'],['margin','Optional margin for treating a difference as noise, in the same units']].map(([name,label])=>
          '<label class="prediction-field">'+label+'<input name="'+name+'" type="text" inputmode="decimal" autocomplete="off"></label>').join('');
    } else if (exact) {
      const label = card.label || (card.type === "list" ? "Numbers in order, separated by commas" : "Your number");
      controls = '<label class="prediction-field">' + inline(label) + (card.unit ? ' (' + inline(card.unit) + ')' : '') +
        '<input name="guess" type="text" ' + (card.type === "number" ? 'inputmode="decimal" ' : '') +
        'autocomplete="off" spellcheck="false" maxlength="1024"></label>';
    } else {
      const measured = card.type === "observation";
      controls = '<label class="prediction-field">' + (measured ? 'Before the run · what do you expect?' : 'Your reasoning') +
        '<textarea name="guess" rows="2"></textarea></label>' + (measured ?
        '<label class="prediction-field">After the run · what did you observe?<textarea name="actual" rows="2"></textarea></label>' : '');
    }
    const caption = exact ? "Check my answer" : card.type === "observation" ? "Compare with my run" : "Compare my reasoning";
    const reason = card.type === "observation" ? "How to interpret the result" : card.type === "rubric" ? "Read a worked explanation" : "Read the answer and why";
    return '<form class="prediction-card" data-prediction="' + escape(id) + '" novalidate><p class="prediction-prompt"><strong>' +
      inline(card.prompt) + '</strong></p>' + controls + '<button type="submit" class="sub">' + caption +
      '</button><p class="prediction-status" role="status"></p><details class="prediction-reason"><summary>' + reason + '</summary>' +
      result(card) + '<p>' + inline(card.explain) + '</p></details>' +
      (!exact && !card.directions ? '<div class="prediction-self" hidden><button type="button" class="sub" data-assess="match">My ' +
        (card.type === "observation" ? 'run supports my prediction' : 'reasoning covers this') +
        '</button><button type="button" class="sub" data-assess="revise">I would revise my answer</button></div>' : '') + '</form>';
  }
  function entries(day,slot) {
    return [window.PREDICTIONS_PRIMER,window.PREDICTIONS_EARLY,window.PREDICTIONS_LATE]
      .flatMap(source => source?.[day]?.[slot] || []);
  }
  function group(day, slot, instance="", open=false) {
    const checks = entries(day,slot);
    if (!checks.length) return "";
    const caption = checks.length === 1 ? "Check this prediction or read the explanation" : "Check these predictions or read the explanations";
    return '<details class="prediction-group"' + (open ? ' open' : '') + '><summary>' + caption + '</summary>' +
      checks.map((card,i)=>view([day,slot,i,instance].join(":"),card)).join("") + '</details>';
  }

  function evaluate(card,raw) {
    const input = raw.trim().replace(/[−–]/g,"-").replace(/\s*\/\s*/g,"/");
    if (!input) return {message:card.type==="choice" ? "Choose one answer, or open the explanation below." : "Enter your prediction, or open the explanation below."};
    if (card.type==="choice") {
      const index=Number(input);
      return {correct:Number.isInteger(index) && card.options[index]===card.answer};
    }
    let values;
    if (card.type==="list") {
      const unwrapped = input.replace(/^\s*[\[(]\s*|\s*[\])]\s*$/g,"");
      if (!unwrapped || /^(empty|none)$/i.test(unwrapped)) values=[];
      else {
        if (/^\s*[,;]|[,;]\s*$|[,;]\s*[,;]/.test(unwrapped)) return {message:"Enter a number in each position, separated by commas."};
        values=unwrapped.split(/[\s,;]+/);
      }
    } else {
      let value = input;
      if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(value)) value=value.replace(/,/g,"");
      values=[value];
    }
    const numbers=values.map(parseValue);
    if (numbers.some(v=>!Number.isFinite(v))) return {message:"Use numbers such as 0.5 or 1/2. Leave units out of the field."};
    const expected=Array.isArray(card.answer)?card.answer:[card.answer];
    if(values.length!==expected.length) return {message:"This question expects " + expected.length + (expected.length===1 ? " number." : " numbers in order. Use commas between answers and write 1000 for one thousand.")};
    const mismatch=expected.findIndex((target,index)=>Math.abs(numbers[index]-target) > (card.tolerance ?? 0) + Math.abs(target)*Number.EPSILON*4);
    if(mismatch>=0 && card.type==="list") return {correct:false,message:"Recheck entry " + (mismatch+1) + " in your list." + (mismatch ? " The earlier entries match." : "") + " You can also open the explanation."};
    return {correct:mismatch===-1};
  }
  function bind(root) {
    if (!root?.addEventListener || bound.has(root)) return;
    bound.add(root);
    root.addEventListener("input",event=>{
      const form=event.target.closest?.("form[data-prediction]");
      if (!form) return;
      form.querySelector(".prediction-status").textContent="";
      const self=form.querySelector(".prediction-self");
      if(self)self.hidden=true;
    });
    root.addEventListener("submit",event=>{
      const form=event.target;
      if (!form.matches("form[data-prediction]")) return;
      event.preventDefault();
      const card=cards.get(form.dataset.prediction);
      if(!card)return;
      const field=form.elements.namedItem("guess"), raw=field.value;
      const status=form.querySelector(".prediction-status");
      if (card.type==="observation" && card.directions) {
        const amounts=["first","second","margin"].map(name=>form.elements.namedItem(name).value.trim().replace(/−/g,"-"));
        if(!raw||!amounts.slice(0,2).every(v=>numeric.test(v)&&Number.isFinite(Number(v)))||(amounts[2]&&(!numeric.test(amounts[2])||!Number.isFinite(Number(amounts[2]))||Number(amounts[2])<0))) {
          status.textContent="Choose a direction and enter both measurements in the same units. The optional noise margin must be zero or positive.";return;
        }
        const [first,second,margin]=amounts.map(Number);
        const direction=Math.abs(second-first)<=margin+Math.max(Math.abs(first),Math.abs(second))*Number.EPSILON*2?"same":second<first?"lower":"higher";
        status.textContent="Your second result was "+(direction==="same"?"within the stated margin":direction)+". "+(raw===direction?"That matches your forecast.":"That differs from your forecast.")+" Open the interpretation to examine why.";
        return;
      }
      if (card.type==="observation" || card.type==="rubric") {
        const actual=form.elements.namedItem("actual");
        if (!raw.trim() || (actual && !actual.value.trim())) {
          status.textContent=!raw.trim() ? "Write your idea first, or open the explanation to read along." : "Enter what you observed in your run, or open the interpretation below.";
          (!raw.trim()?field:actual).focus();return;
        }
        form.querySelector(".prediction-reason").open=true;
        form.querySelector(".prediction-self").hidden=false;
        status.textContent=actual ? "Compare your observation with your prediction using the criteria below." : "Compare your reasoning with the worked explanation. Which conclusion fits?";
        return;
      }
      const result=evaluate(card,raw);
      status.textContent=result.message || (result.correct ? "Correct. Open the explanation to see why." : "That answer differs. You can try again or read the explanation.");
    });
    root.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-assess]");
      const form=button?.closest("form[data-prediction]");
      if (!form)return;
      form.querySelector(".prediction-status").textContent=button.dataset.assess==="match" ? "Self-check complete. You judged your evidence consistent." : "You identified a revision. Edit your answer and compare again.";
    });
  }
  bind(document);
  return {view, group, entries, bind, evaluate};
})();
