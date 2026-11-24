const LessonReader = (function(){
  "use strict";
  const guides = {...window.PRIMER_GUIDES, ...window.LESSON_GUIDES_EARLY, ...window.LESSON_GUIDES_LATE};
  const stageNames = {learn:"Learn the idea", practice:"Guided exercise", finish:"Check & save"};
  const sectionKey = id => "fieldwork.section." + location.pathname + "." + id;
  function lastSection(id){
    try {
      const stage=window.sessionStorage.getItem(sectionKey(id));
      return Object.hasOwn(stageNames,stage)?stage:"learn";
    } catch {return "learn"}
  }
  const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const inline = value => escape(value).replace(/`([^`\n]+)`/g,"<code>$1</code>");
  const paragraphs = lines => (lines || []).map(line=>`<p>${inline(line)}</p>`).join("");
  const predictions = (day,slot,instance="",open=false)=>CoursePrediction.group(day.id,slot,instance,open);
  function snippet(value,label,copy=false,output=false){
    return `<div class="lesson-snippet${output?" expected":""}"><div class="snippet-label"><span>${escape(label)}</span>${copy?'<button type="button" class="copy-snippet" data-clip="code">Copy</button>':""}</div><pre tabindex="0"><code>${escape(value)}</code></pre></div>`;
  }
  // This worked example uses different dimensions from the learner's predictions.
  const traceLength=4, traceWidth=3, traceBlocks=Math.ceil(traceLength/traceWidth);
  const traceWorkers=traceBlocks*traceWidth;
  function workerFrame(started){
    return Array.from({length:traceBlocks},(_,block)=>{
      const lanes=Array.from({length:traceWidth},(_,lane)=>{
        const index=block*traceWidth+lane, visited=index<started;
        const state=visited?(index<traceLength?"wrote":"skipped"):"waiting";
        return `<li class="${state}"><span>Lane ${lane}</span><strong>${visited?`Index ${index} · ${state}`:"Waiting"}</strong></li>`;
      }).join("");
      return `<div><b>Block ${block}</b><ul>${lanes}</ul></div>`;
    }).join("");
  }
  function workerStatus(started){
    const writes=Math.min(started,traceLength);
    const index=started-1;
    const event=!started?"No worker has entered the inner loop yet.":index<traceLength
      ?`Index ${index} passes the test ${index} &lt; ${traceLength}. This worker adds one visit to slot ${index}.`
      :`Index ${index} fails the test ${index} &lt; ${traceLength}. This worker skips the assignment.`;
    return `<p class="trace-counts">Started <b>${started}</b> · Wrote <b>${writes}</b> · Skipped <b>${started-writes}</b></p><p>${event}</p>`;
  }
  function workerTrace(){
    return `<figure class="worker-trace"><figcaption>Trace four items with three workers per block</figcaption><p>Each click runs one pass through the lane loop. Predict what will happen on the first click in block 1, then on the next click.</p><div class="trace-blocks" id="worker-frame">${workerFrame(0)}</div><div id="worker-status" role="status" aria-atomic="true">${workerStatus(0)}</div><div class="trace-controls"><button type="button" id="worker-next">Next worker</button><button type="button" class="sub" id="worker-reset" disabled>Start over</button></div></figure>`;
  }
  function instruction(part,checks=""){
    return paragraphs(part.body) +
      (part.code ? snippet(part.code,part.language || "Code",true) : "") +
      (part.visual==="worker-trace" ? workerTrace() : "") +
      checks +
      (part.hint ? `<details class="lesson-reveal"><summary>Get a hint for this step</summary><p>${inline(part.hint)}</p></details>` : "") +
      (part.worked ? `<details class="lesson-reveal"><summary>${inline(part.worked.title)}</summary>${paragraphs(part.worked.body)}${part.worked.code?snippet(part.worked.code,part.worked.language||"C++",true):""}</details>` : "") +
      (part.command ? snippet(part.command,part.commandLabel || "PowerShell command",true) : "") +
      (part.expected ? (part.expected.includes("\n")
        ? snippet(part.expected,"What you should see",false,true)
        : `<div class="expected-note"><strong>What to look for</strong><p>${inline(part.expected)}</p></div>`) : "");
  }
  function collectCode(parts,field){
    return parts.flatMap(part=>[part[field],...(part.actions||[]).map(action=>action[field])]).filter(Boolean);
  }
  function rehearsal(task){
    if(!task)return "";
    return `<div class="primer-rehearsal"><h3>Predict the next run</h3><p>${inline(task.prompt)}</p>
      <details><summary>Get a hint</summary><p>${inline(task.hint)}</p></details>
      <details><summary>Compare your trace</summary><p>${inline(task.answer)}</p></details></div>`;
  }
  function inkExample(task){
    const pixels=Array.from(task.digit,symbol=>parseInt(symbol,17));
    const image=Array.from({length:8},(_,row)=>{
      const cells=pixels.slice(row*8,row*8+8).map(value=>`<i style="opacity:${value/16}"></i>`).join("");
      return `<div class="${row===2?"ink-selected-row":""}">${cells}</div>`;
    }).join("");
    const row=pixels.slice(16,24), dark=row.filter(value=>value>=task.testCutoff);
    return `<figure class="ink-worked-row"><div class="ink-miniature" aria-hidden="true">${image}</div>
      <figcaption><strong>One row of a real handwritten zero</strong>
      <p>The outlined row is row 2, counting from zero. Its pixels are <code>[${row.join(", ")}]</code>. At a cutoff of ${task.testCutoff}, the pixels with values ${dark.slice(0,-1).join(", ")} and ${dark.at(-1)} each count once. The function should write <strong>${dark.length}</strong> into <code>counts.at(2)</code>.</p></figcaption></figure>`;
  }
  function inkWorksheet(task){
    const rows=task.testRows.map((pixels,row)=>{
      const start=row*pixels.length;
      return `<tr><th scope="row">Row ${row}<small>Slots ${start}–${start+pixels.length-1}</small></th>
        <td><code>[${pixels.join(", ")}]</code></td>
        <td><label for="ink-guess-${row}"><code>counts.at(${row})</code></label>
        <input id="ink-guess-${row}" name="row${row}" type="number" min="0" max="${pixels.length}" step="1" inputmode="numeric" autocomplete="off"></td></tr>`;
    }).join("");
    return `<h3>Predict the output of the first C++ test</h3>
      <p>Read each row from left to right. Count one for every value that is ${task.testCutoff} or higher. The two answers go into <code>counts</code> in row order. You can read the walkthrough first or try the empty boxes.</p>
      <details class="ink-row-guide"><summary>Read how to count these two rows</summary><p>In row 0, pass over 0, count 8, pass over 7, and count 12. You counted twice. Write 2 in <code>counts.at(0)</code>.</p><p>Start again at zero for row 1. Count 11. The values 2, 0 and 3 are all below 8, so the count stays at 1. Write 1 in <code>counts.at(1)</code>. The small image now has one result for each row.</p></details>
      <form id="ink-guesses" novalidate><table class="ink-rows"><thead><tr><th scope="col">Read from</th><th scope="col">Pixel values</th><th scope="col">Write to</th></tr></thead><tbody>${rows}</tbody></table>
      <button class="sub" type="submit">Check my counts</button><p id="ink-guess-status" role="status" aria-live="polite"></p></form>`;
  }
  function bindInkWorksheet(root,task){
    const form=root.querySelector("#ink-guesses"), status=root.querySelector("#ink-guess-status");
    form.oninput=()=>{status.textContent=""};
    form.onsubmit=event=>{
      event.preventDefault();
      for(const [row,pixels] of task.testRows.entries()){
        const field=form.elements.namedItem("row"+row);
        const count=field.valueAsNumber;
        if (!Number.isInteger(count)||count<0||count>pixels.length) {
          status.textContent=`For row ${row}, enter a whole number from 0 to ${pixels.length}, one count for this row.`;
          field.focus();
          return;
        }
        if (count!==pixels.filter(value=>value>=task.testCutoff).length) {
          status.textContent=`Take another look at row ${row}. Give each pixel one tally if its value is ${task.testCutoff} or higher. How many tallies do you have in that row?`;
          field.focus();
          return;
        }
      }
      status.textContent="Both counts match the first test. Your function should produce those values from the input for itself.";
    };
  }
  function checkpoint(task){
    if(!task)return "";
    return `<section class="primer-checkpoint"><h2 id="ink-checkpoint" tabindex="-1">${inline(task.title)}</h2><p>${inline(task.introduction)}</p>
      ${inkExample(task)}${inkWorksheet(task)}
      ${task.actions.map(part=>`<div class="sub-action"><h3>${inline(part.title)}</h3>${instruction(part)}</div>`).join("")}
      <details class="lesson-reveal"><summary>After five passes · test a pixel exactly at the cutoff</summary><p>Predict which test would change if a pixel had to be strictly above the cutoff. Try that change, rerun the tests, then restore the inclusive comparison and rerun. Save one failing row and the restored handwritten-zero result in your lesson notes.</p>${CoursePrediction.group('0/4','ink.cutoff','',true)}</details>
      <details class="lesson-reveal"><summary>Compare with a working function body</summary>${snippet(task.solution,"C++ · inside row_profile")}<p>${inline(task.explain)}</p></details>
      <details class="lesson-reveal"><summary>Connect this to GPU threads</summary><p>Keep the same two rows and the same counting rule. Imagine giving each row to a separate worker. On the GPU, that worker is called a <strong>thread</strong>. The worker for row 0 reads the four pixels in the top row, counts the dark ones and puts one number in <code>counts[0]</code>.</p><p>Now follow the worker assigned row 1. Then consider a worker that gets a row number past the bottom of the image.</p>${CoursePrediction.group('0/4','ink.gpu','',true)}</details>
      <p class="small"><a href="#day/0/1">Review counting</a> · <a href="#day/0/2">Review flat indices</a> · <a href="#day/0/3">Review output bounds</a> · <a href="labs/compute/data/SOURCES.html">Digit data source</a></p></section>`;
  }
  function frames(ms){
    const count=100/ms;
    return `<div class="figure-readout"><strong>${1000/ms}</strong> frames per second</div>
      <div class="frame-strip" aria-hidden="true">${'<i></i>'.repeat(count)}</div>
      <div class="frame-axis" aria-hidden="true"><span>0 ms</span><span>100 ms</span></div>
      <p>${count} frames fit in this slice of a second when each takes ${ms} ms.</p>`;
  }
  // Zero-based row 1442 of the bundled UCI digit file, query 6 in the explorer.
  const seven="001eggf100be8db000f60e3000515d10000dgg90002gf910000b9000003g2000";
  const rowValues=row=>Array.from(seven.slice(row*8,row*8+8),ch=>parseInt(ch,17));
  function digitReadout(row){
    return `Row ${row} · vector positions ${8*row}–${8*row+7}<br><b>${rowValues(row).join("　")}</b>`;
  }
  function visual(d){
    if(d.id==="0/0")return `<figure class="frame-figure"><figcaption>How long does one frame take?</figcaption>
      <div class="frame-switch" role="group" aria-label="Choose a frame time">${[10,50].map(ms=>`<button type="button" data-frame="${ms}" aria-pressed="${ms===10}">${ms} ms</button>`).join("")}</div>
      <div id="frame-result" aria-live="polite">${frames(10)}</div></figure>`;
    if(d.id==="0/2")return `<figure class="memory-figure"><figcaption>A matrix in memory</figcaption><div class="memory-block" aria-label="Two rows of three values"><div><small>Row 0</small><b>1</b><b>2</b><b>3</b></div><div><small>Row 1</small><b>4</b><b>5</b><b>6</b></div></div><div class="memory-flat">${[1,2,3,4,5,6].map((n,i)=>`<div><b>${n}</b><small>${i}</small></div>`).join("")}</div><p>The values keep their order. The numbers underneath are their positions in one flat array, starting at zero.</p></figure>`;
    if(d.id==="2/0")return `<figure class="digit-figure"><figcaption>One handwritten 7, row by row</figcaption><p>Select a row to read its eight ink counts.</p><div class="digit-patch">${Array.from({length:8},(_,row)=>`<button type="button" aria-label="Inspect row ${row}" aria-pressed="${row===3}" data-digitrow="${row}">${rowValues(row).map(ink=>`<i style="opacity:${ink/16}"></i>`).join("")}</button>`).join("")}</div><p id="digit-row" aria-live="polite">${digitReadout(3)}</p><small>Query 6 · <a href="labs/compute/data/SOURCES.html">UCI digit data</a></small></figure>`;
    const preview={
      "4/0":["labs/render/swarm-preview.jpg","A rendered worm swarm","Each curved strand is built from short segments. Test how the number of segments reaching each pixel affects the frame time.","#swarm"],
      "5/3":["labs/flow/ink-preview.jpg","Dye moving through the simulated flow","The dye makes the motion visible. Use the divergence measurement to check what the pressure solve changed.","#flow"],
      "6/0":["labs/knit/cloth-preview.png","A simulated knit swatch","Pick two neighbors in the swatch. Their distance is one of the constraints the solver tries to restore.","#knit"]
    }[d.id];
    if(!preview)return "";
    return `<figure class="scene-figure"><a href="${preview[3]}"><img src="${preview[0]}" alt="${preview[1]}"></a><figcaption>${preview[2]}</figcaption></figure>`;
  }
  function turnsExample(){
    return `<p>Start with three workers named A, B and C. Give each successive place in a list to the next worker. After C, start again at A.</p><table class="worker-turns"><caption>A smaller example</caption><tbody><tr><th scope="row">Place in the list</th><td>0</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr><tr><th scope="row">Worker</th><td>A</td><td>B</td><td>C</td><td>A</td><td>B</td><td>C</td><td>A</td></tr></tbody></table><p>Read down a column to see who gets that place. Read across for A and you find places 0, 3 and 6. Each place in a list is called a <strong>slot</strong>. Only its position matters in this exercise.</p>`;
  }
  function optionalChallenge(d,copyCommand=false){
    const challenge=window.LESSON_CHALLENGES?.[d.id];
    if(!challenge)return "";
    const answer=`<details><summary>Show the reference answer</summary><p>${inline(challenge.check)}</p></details>`;
    return `<details class="transfer-challenge"><summary>Optional challenge · apply it again</summary>
      ${d.id==="0/4"?turnsExample():""}<p>${inline(challenge.prompt)}</p><details><summary>Get a starting hint</summary><p>${inline(challenge.hint)}</p></details>${answer}${predictions(d,"challenge",copyCommand?"lesson":"review")}
      ${challenge.command?snippet(challenge.command,"Test your saved C++ in Course PowerShell",copyCommand):""}
      </details>`;
  }
  function workbenchItem([url,label]){
    const source=/\.(?:cpp|cuh?|hpp|py|ps1|sh)$/i.test(url);
    const action=source?label.replace(/^Edit /,"Inspect "):label;
    return `<li><a href="${escape(url)}" target="_blank" rel="noopener">${escape(action)} ↗</a></li>`;
  }
  function practice(d,r,guide){
    const commands=collectCode(guide.practice,"command");
    const examples=collectCode(guide.practice,"code").concat(guide.sections.map(s=>s.code).filter(Boolean));
    const isPrimer=d.wi===0;
    const launch=d.run&&!isPrimer&&!commands.some(c=>c.includes(d.run))?snippet(d.run,d.scene?"Open the viewer in Course PowerShell":"Run in Course PowerShell",true):"";
    const listing=d.code&&!isPrimer&&!examples.includes(d.code.text)?`<details class="ref-listing"><summary>After your attempt · reference code (${escape(d.code.language)})</summary>${snippet(d.code.text,d.code.language,true)}</details>`:"";
    const steps=guide.practice.map((part,i)=>{
      const extra=(d.commands||[]).filter(block=>block.step===i&&!commands.includes(block.text));
      return `<li class="practice-item"><div class="task-heading"><span class="step-number" aria-hidden="true">${i+1}</span><h3>${inline(part.title)}</h3></div>
        ${instruction(part,part.actions?.length ? (part.visual==="worker-trace"?predictions(d,"trace"):"") : predictions(d,"practice."+i))}${(part.actions||[]).map(action=>`<div class="sub-action"><h4>${inline(action.title)}</h4>${instruction(action)}</div>`).join("")}${part.actions?.length?predictions(d,"practice."+i):""}
        ${extra.map(block=>snippet(block.text,"PowerShell commands",true)).join("")}
        <label class="step-check"><input type="checkbox" data-step="${i}" ${(r.steps||[]).includes(i)?"checked":""}> <span>Mark step ${i+1} done</span></label></li>`;
    }).join("");
    return `<h2 class="stage-heading" tabindex="-1">Guided exercise</h2>${guide.checkpoint?`<p>This session ends with a C++ exercise on a real digit image. <button type="button" class="text-action" data-go="checkpoint">Jump to the digit exercise</button></p>`:""}${!isPrimer?`<details class="shell-help"><summary>Where do I type a PowerShell command?</summary><p>Open File Explorer. Go to <code>G:\\CUDA-Studio</code> and double-click <code>Course PowerShell.cmd</code>. Wait for a prompt ending in <code>&gt;</code>. Copy a command into that window and press Enter. Keep this lesson open in your browser.</p></details>`:""}
      <div class="practice-brief"><p><strong>What you’ll practice</strong> ${inline(d.objective)}</p><p><strong>What to keep</strong> ${inline(d.deliverable)}</p></div>
      ${predictions(d,"general")}${launch}<ol class="practice-sequence">${steps}</ol>
      <details class="lesson-reveal"><summary>Get a hint</summary><p>${inline(d.hint)}</p></details>
      <details class="lesson-reveal"><summary>Compare with a worked answer</summary><p>${inline(d.solution)}</p></details>${listing}
      ${LessonPractice.transfer(d,inline,snippet)}
      ${checkpoint(guide.checkpoint)}
      ${optionalChallenge(d,true)}
      <button type="button" class="stage-next" data-go="finish">Continue to check &amp; save →</button>`;
  }
  function view(d,r,ui){
    const guide=guides[d.id];
    const selected=lastSection(d.id);
    const tabs=Object.entries(stageNames).map(([key,label])=>`<button type="button" role="tab" id="tab-${key}" aria-controls="part-${key}" aria-selected="${key===selected}" tabindex="${key===selected?0:-1}" data-stage="${key}">${label}</button>`).join("");
    const sections=guide.sections.map((section,i)=>{
      const terms=section.terms?`<dl class="code-terms">${section.terms.map(({term,meaning})=>`<div><dt><code>${escape(term)}</code></dt><dd>${inline(meaning)}</dd></div>`).join("")}</dl>`:"";
      return `<section class="concept-section"><h2>${inline(section.title)}</h2>${section.code?snippet(section.code,section.language||"Example"):""}${paragraphs(section.body)}${terms}${rehearsal(section.rehearsal)}${predictions(d,"learn."+i)}</section>`;
    });
    const tools=[...ui.links, ...(d.file&&!ui.links.some(([url])=>url===d.file)?[[d.file,"View source · "+d.file.split("/").pop()]]:[])];
    const related=`<div class="reader-tools"><h3>Workbench</h3>${guide.workbench?`<p>${inline(guide.workbench)}</p>`:""}<p class="workbench-help">Links open in another tab.${tools.some(([url])=>/\.(?:cpp|cuh?|hpp|py|ps1|sh)$/i.test(url))?" Use the lesson’s editor command to change a source file.":""}</p><ul class="links">${tools.map(workbenchItem).join("")}</ul>${LessonPractice.after(d,inline,escape,ui.resources)}</div>`;
    const oldExplanation=d.wi?`<details class="lesson-reveal"><summary>More on this idea</summary>${paragraphs(d.lesson.split(/\n\s*\n/))}</details>`:"";
    const reminder=d.id==="0/0"?"":`<details class="lesson-reveal"><summary>Try a recall question</summary><p>${inline(d.recall)}</p>${predictions(d,"recall","reader")}<details><summary>Compare your answer</summary><p>${inline(LESSON_RECALL_ANSWERS[d.id])}</p></details></details>`;
    const visualContent=visual(d) || ui.studio;
    const nextExercise='<button type="button" class="stage-next" data-go="practice">Start the guided exercise →</button>';
    const afterReading=oldExplanation+reminder+nextExercise;
    const reading=visualContent
      ? `<div class="reading-grid illustrated"><div class="lesson-text first-concept">${sections[0]}</div><div class="lesson-visual">${visualContent}</div><div class="lesson-text more-concepts">${sections.slice(1).join("")}${afterReading}</div><aside class="lesson-aside">${related}</aside></div>`
      : `<div class="reading-grid"><div class="lesson-text">${sections.join("")}${afterReading}</div><aside class="lesson-aside">${related}</aside></div>`;
    return `${ui.crumb}<div class="reader-heading"><p class="reader-meta">${escape(d.track)} <span>·</span> ${d.id==="0/0"?"Self-paced introduction":d.minutes+" min study budget"}</p><h1>${escape(d.title)}</h1><p class="reader-intro">${inline(guide.intro)}</p></div>
      ${guide.orientation?`<p class="primer-orientation">${inline(guide.orientation)}</p>`:""}${LessonPractice.before(d,inline,escape)}${ui.recall}
      <div class="reader-tabs" role="tablist" aria-label="Lesson sections">${tabs}</div>
      <section id="part-learn" role="tabpanel" aria-labelledby="tab-learn" ${selected==="learn"?"":"hidden"}>${reading}</section>
      <section id="part-practice" role="tabpanel" aria-labelledby="tab-practice" ${selected==="practice"?"":"hidden"}><div class="reading-grid"><div class="lesson-text">${practice(d,r,guide)}</div><aside class="lesson-aside"><div class="exercise-progress"><h3>Your progress</h3><p id="step-status">${(r.steps||[]).length} of ${d.steps.length} practice steps recorded</p><p>Record a step after you try it. You can save predictions and results as you work.</p><button type="button" class="sub" data-go="notes">Open lesson notes</button></div><details class="shell-help"><summary>Choose your code editor</summary><p>Course edit commands open VS Code here. To use Notepad++ for subsequent edits in this Course PowerShell window, run this once.</p>${snippet("$env:CUDA_COURSE_EDITOR = 'Notepad++'","Course PowerShell",true)}</details>${related}</aside></div></section>
      <section id="part-finish" role="tabpanel" aria-labelledby="tab-finish" ${selected==="finish"?"":"hidden"}><div class="reading-grid"><div class="lesson-text">
        <section class="concept-section"><h2>Check your understanding</h2><p>${inline(d.check.question)}</p><div class="quiz">${d.check.options.map((s,i)=>`<button class="${r.choice===i?(i===d.check.answer?"right":"wrong"):""}" data-choice="${i}" aria-pressed="${r.choice===i}">${escape(s)}</button>`).join("")}</div><div class="feedback" role="status">${r.choice==null?"":r.choice===d.check.answer?"Correct. "+escape(d.check.explanation):"Try again. Revisit the example or open the hint in the exercise."}</div></section>
        <details class="lesson-reveal"><summary>Read the answer to the knowledge check</summary><p>${inline(d.check.options[d.check.answer])}. ${inline(d.check.explanation)}</p></details>${LessonPractice.drills(d,r,inline,escape)}${predictions(d,"finish")}
        <section class="lesson-save"><h2>Save your lesson notes</h2><p>${inline(d.deliverable)}</p><details class="evidence-guide"><summary>After your attempt · compare your evidence</summary><ul>${LESSON_EVIDENCE[d.id].map(line=>`<li>${inline(line)}</li>`).join("")}</ul></details><label for="note">Your predictions, results or files</label><textarea id="note" placeholder="What did you predict? What happened when you tried it?">${escape(r.note)}</textarea><p class="small dim" id="saved">${ui.storageFailed?"Export this session from Notebook.":"Saved in this browser as you type."}</p>${d.id==="0/0"?LessonDiagnostic.view():""}<button id="complete" class="${r.done?"sub":""}">${r.done?"✓ Completed · reopen":"Mark session complete"}</button></section>
        ${ui.portfolio}${ui.handoff}</div><aside class="lesson-aside"><div class="exercise-progress"><h3>Continue working</h3><p>Your checklist and notes stay with this lesson when you switch sections.</p><button type="button" class="sub" data-go="practice">Back to the exercise</button></div>${related}</aside></div>${ui.sequence}</section>`;
  }
  function bind(root,notice,d,persist){
    LessonPractice.bind(root,d,persist,inline);
    if(d.id==="0/0")LessonDiagnostic.bind(root);
    const tabs=Array.from(root.querySelectorAll("[data-stage]"));
    function switchTo(key,focusTab=false){
      const target=key==="notes"?"finish":key==="checkpoint"?"practice":key;
      try {window.sessionStorage.setItem(sectionKey(d.id),target)} catch {}
      for(const tab of tabs){
        const active=tab.dataset.stage===target;
        tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;
        root.querySelector("#part-"+tab.dataset.stage).hidden=!active;
      }
      const tab=tabs.find(el=>el.dataset.stage===target);
      if(key==="notes"){root.querySelector("#note").focus();return}
      if(key==="checkpoint"){const heading=root.querySelector("#ink-checkpoint");heading.focus({preventScroll:true});heading.scrollIntoView({block:"start"});return}
      if(focusTab)tab.focus({preventScroll:true});
      root.querySelector(".reader-tabs").scrollIntoView({block:"start",behavior:"instant"});
    }
    tabs.forEach((tab,i)=>{
      tab.onclick=()=>switchTo(tab.dataset.stage,true);
      tab.onkeydown=event=>{
        const destination={ArrowLeft:(i+tabs.length-1)%tabs.length,ArrowRight:(i+1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
        if(destination===undefined)return;
        event.preventDefault();switchTo(tabs[destination].dataset.stage,true);
      };
    });
    for(const btn of root.querySelectorAll("[data-go]"))btn.onclick=()=>switchTo(btn.dataset.go,true);
    if(d.id==="0/4"){
      bindInkWorksheet(root,guides[d.id].checkpoint);
      let started=0;
      const nextWorker=root.querySelector("#worker-next"),reset=root.querySelector("#worker-reset");
      function show(count){
        started=count;
        root.querySelector("#worker-frame").innerHTML=workerFrame(started);
        root.querySelector("#worker-status").innerHTML=workerStatus(started);
        nextWorker.disabled=started===traceWorkers;
        reset.disabled=started===0;
      }
      nextWorker.onclick=()=>show(Math.min(started+1,traceWorkers));
      reset.onclick=()=>show(0);
    }
    for(const btn of root.querySelectorAll("[data-frame]"))btn.onclick=()=>{
      root.querySelector("#frame-result").innerHTML=frames(Number(btn.dataset.frame));
      root.querySelectorAll("[data-frame]").forEach(other=>other.setAttribute("aria-pressed",String(other===btn)));
    };
    for(const btn of root.querySelectorAll("[data-digitrow]"))btn.onclick=()=>{
      root.querySelector("#digit-row").innerHTML=digitReadout(Number(btn.dataset.digitrow));
      root.querySelectorAll("[data-digitrow]").forEach(other=>other.setAttribute("aria-pressed",String(other===btn)));
    };
    for(const btn of root.querySelectorAll("[data-clip]"))btn.onclick=async()=>{
      const code=btn.closest(".lesson-snippet").querySelector("pre code");
      try{
        await navigator.clipboard.writeText(code.textContent);
      }catch{
        const selection=window.getSelection();
        const range=document.createRange();range.selectNodeContents(code);selection.removeAllRanges();selection.addRange(range);
        if(!document.execCommand("copy")){notice("Text selected. Press Ctrl+C to copy it.");return}
        selection.removeAllRanges();
      }
      notice("Copied to clipboard.");
    };
  }
  return {view,bind,optionalChallenge};
})();
