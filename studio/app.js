(()=> {
"use strict";
const root=document.querySelector("main");
const weeks=[PRIMER,...COURSE_WEEKS];
// Existing day IDs are notebook keys and bookmarks. Sequence studios between them.
const days=weeks.flatMap((w,wi)=>{
 const studios=STUDIO_LESSONS.filter(s=>s.wi===wi);
 const week=studios.filter(s=>s.afterDay===0);
 w.days.forEach((d,di)=>{
   week.push({...d,wi,di,id:`${wi}/${di}`});
   week.push(...studios.filter(s=>s.afterDay===di+1));
 });
 return week;
});
const byId=new Map(days.map(d=>[d.id,d]));
const esc=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const key="fieldwork.cuda.1", empty=()=>({version:1,records:{},runs:[]});
function fromData(value){
 if(!value||value.version!==1||typeof value.records!=="object"||!value.records||Array.isArray(value.records)||!Array.isArray(value.runs))throw Error("Choose an exported Fieldwork JSON notebook.");
 const records={};for(const d of days){const r=value.records[d.id];if(!r||typeof r!=="object")continue;
 const index=r.choice, timestamp=t=>Number.isFinite(t)&&t>0&&t<8e15?t:0;
 const steps=Array.isArray(r.steps)?[...new Set(r.steps.filter(i=>Number.isInteger(i)&&i>=0&&i<d.steps.length))]:[];
 records[d.id]={note:String(r.note??""),done:timestamp(r.done),choice:Number.isInteger(index)&&index>=0&&index<d.check.options.length?index:null,review:Number.isInteger(r.review)?Math.max(0,Math.min(4,r.review)):0,lastReview:timestamp(r.lastReview),steps};
 const publication=Portfolio.draft(d.id,r.publication);
 const drills=LessonPractice.saved(d.id,r.drills);
 if(Object.keys(drills).length)records[d.id].drills=drills;
 if(Object.keys(publication).length)records[d.id].publication=publication;
 }
 const runs=value.runs.filter(v=>v&&typeof v==="object").map(v=>Object.fromEntries(["lab","input","variant","ms","check","date"].map(k=>[k,String(v[k]??"")])));return {version:1,records,runs};
}
let state=empty(),storageFailed=false,lastStored=null,readFailed=false,unreadableCopy=null;
function storageStatus(failed){
 storageFailed=failed;
 document.querySelector("#storage-warning").hidden=!failed;
}
function readChanges(){
 if(storageFailed)return;
 let raw=null;
 try{
  raw=localStorage.getItem(key);
  if(raw!==lastStored){state=raw===null?empty():fromData(JSON.parse(raw));lastStored=raw}
 }catch{
  readFailed=true;
  unreadableCopy=raw;
  storageStatus(true);
 }
}
readChanges();
let teardown=null,previous="",timer=0;
function notice(txt){const n=document.querySelector("#notice");n.textContent=txt;clearTimeout(timer);timer=setTimeout(()=>n.textContent="",4800)}
function save(){
 if(readFailed)return;
 try{
  const raw=JSON.stringify(state);
  localStorage.setItem(key,raw);
  lastStored=raw;
  storageStatus(false);
 }catch{storageStatus(true)}
}
function downloadFile(text,filename,type="application/json"){
 const url=URL.createObjectURL(new Blob([text],{type}));
 const a=document.createElement("a");a.href=url;a.download=filename;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const recoveryKey=key+".unreadable";
function previousCopies(){
 const copies=JSON.parse(localStorage.getItem(recoveryKey)||"[]");
 if(!Array.isArray(copies)||!copies.every(value=>typeof value==="string"))throw Error("The recovery archive could not be read.");
 return copies;
}
function restoreOnImport(){
 if(!readFailed||unreadableCopy===null)return;
 if(localStorage.getItem(key)!==unreadableCopy)throw Error("The saved notebook changed in another tab. Export this session and reload before importing.");
 const copies=previousCopies();
 if(!copies.includes(unreadableCopy)){
  copies.push(unreadableCopy);
  localStorage.setItem(recoveryKey,JSON.stringify(copies));
 }
 readFailed=false;
}
const rec=d=>state.records[d.id]||{note:"",done:0,choice:null,review:0,lastReview:0,steps:[]};
function change(d,patch){readChanges();state.records[d.id]={...rec(d),...patch};save()}
const shortTitle=d=>d.scene?"Night Shift studio":(d.wi?"Day ":"Session ")+(d.di+1);
const title=d=>(d.wi?"Week "+d.wi:"C++ on-ramp")+" · "+shortTitle(d);
const route=d=>`#day/${d.id}`;
const next=()=>days.find(d=>!rec(d).done)||days[days.length-1];
const done=()=>days.filter(d=>rec(d).done).length;
function due(d){const t=LabJournal.reviewDate(rec(d));return t!==null&&Date.now()>=t}
const dueList=()=>days.filter(due);
const link=(href,title)=>`<a href="${esc(href)}">${esc(title)}</a>`;
const resources=items=>`<ul class="links">${items.map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noreferrer">${esc(r.label)} ↗</a></li>`).join("")}</ul>`;
const card=(href,k,t,desc,action)=>`<a class="card" href="${esc(href)}"><span class="eyebrow">${esc(k)}</span><h3>${esc(t)}</h3><p>${esc(desc)}</p><span class="next">${esc(action)} ↗</span></a>`;
const pre=t=>`<pre tabindex="0"><code>${esc(t)}</code></pre>`;
const crumb=(href,label,rest)=>`<div class="bread">${link(href,label)} &nbsp;/&nbsp; ${esc(rest)}</div>`;
const h=(k,t,desc)=>`<p class="kicker">${esc(k)}</p><h1>${esc(t)}</h1><p class="lede">${esc(desc)}</p>`;
function formatTime(minutes){
 const hours=Math.floor(minutes/60),remaining=minutes%60;
 return [hours&&`${hours} h`,remaining&&`${remaining} min`].filter(Boolean).join(" ");
}
function courseRow(d){
 const completed=Boolean(rec(d).done),started=(rec(d).steps||[]).length;
 const status=completed?"Complete":started?`${started}/${d.steps.length} steps`:"";
 return `<a class="daylink ${d.scene?"studio-row":""}" href="${route(d)}"><b class="meta">${esc(shortTitle(d))}</b><span>${esc(d.title)}${window.PUBLICATION_BRIEFS[d.id]?' <em class="portfolio-marker">Portfolio milestone</em>':""}</span><small>${status?esc(status)+" · ":""}${d.id==="0/0"?"Self-paced":d.minutes+" min"} →</small></a>`;
}
function overview(){
 const d=next(),count=done(), dueCount=dueList().length;
 root.innerHTML=`<div class="hero"><div><p class="kicker">Interactive CUDA course</p><h1>Algorithms <br><em>in motion.</em></h1><p class="lede">Turn matrix math, swarms, and fabric into working GPU programs. Change the code, inspect the frame, and measure what the change bought you.</p><div class="row"><a class="btn" href="${route(d)}">${count===days.length?"Revisit the capstone":count||Object.keys(state.records).length?"Resume learning":"Start the C++ on-ramp"} →</a><a class="btn sub" href="#course">Course map</a></div><p class="meta">5 C++ sessions &nbsp;·&nbsp; 40 core days &nbsp;·&nbsp; 4 guided graphics studios &nbsp;·&nbsp; GeForce RTX 5070</p></div><figure class="hero-figure" style="margin:0"><a href="labs/nightshift/index.html"><span class="figtop">RENDERED ON RTX 3070</span><img src="labs/nightshift/media/lighting-beauty.jpg" style="width:100%;display:block;aspect-ratio:1.72;object-fit:cover" alt="A late train and illuminated platform signs reflected in wet paving"><span class="figbar"><b>Night Shift</b><span>Explore four CUDA scenes ↗</span></span></a></figure></div>
 <section class="section"><div class="section-head"><h2>On the bench</h2><a href="#labs">All experiments ↗</a></div><div class="grid">${card("#matrix","Linear algebra","Inside a matrix tile","Step through a product and watch which input values get reused.","Open explorer")}${card("#cloth","Interactive physics","Pull a knitted swatch","Cut or stretch a mesh, then inspect the search cost of the brush.","Open experiment")}${card("#digits","Real datasets","Search handwritten digits","Turn cosine similarity into a matrix product and inspect its retrieval accuracy.","Inspect the gallery")}</div></section>
 <section class="section grid two"><div class="panel tint"><p class="kicker">Your progress</p><h3>${count} of ${days.length} sessions complete</h3><div class="progresstrack"><i style="width:${100*count/days.length}%"></i></div><p class="small" style="margin:10px 0 0">${count===days.length?"Course complete":"Next up"} &nbsp; ${link(route(d),d.title)}</p></div><div class="panel"><p class="kicker">Retrieval practice</p><h3>${dueCount?`${dueCount} reviews ready`:"Spaced review"}</h3><p class="small">${dueCount?link("#notes","Open your review queue"):"Review on days 1, 3, 7, and 21. If you come back late, the next interval starts when you review."}</p></div></section>`;
}
function course(){
 const d=next(),count=done();
 const rawWeek=location.hash.split("/")[1];
 const openWeek=/^[0-8]$/.test(rawWeek||"")?Number(rawWeek):d.wi;
 root.innerHTML=h("Syllabus","Course map","Follow the sessions from top to bottom. Time budgets include reading, editing, checking results and investigating surprises. You can move on as soon as you understand the result and have saved your evidence. Each of the four Night Shift studios counts as a session.")+
 `<section class="panel tint map-resume"><div><p class="kicker">${count===days.length?"Course complete":"Your next session"}</p><h2>${esc(d.title)}</h2><p class="small">${esc(title(d))} · ${d.id==="0/0"?"Self-paced":d.minutes+" min"}</p></div><a class="btn" href="${route(d)}">${count===days.length?"Revisit the capstone":count||Object.keys(state.records).length?"Continue learning":"Begin the on-ramp"} →</a></section>
 <p class="small dim">${days.length} sessions · ${formatTime(days.reduce((n,item)=>n+item.minutes,0))} planned · ${count} completed</p><p><a href="Teaching%20audit.html">See what each lesson teaches and how to check your work</a></p><div class="section">${weeks.map((w,wi)=>{
   const part=days.filter(item=>item.wi===wi),path=WEEK_PATH[wi];
   return `<details class="week" ${wi===openWeek?"open":""}><summary><span class="meta">${wi?"Week "+wi:"On-ramp"}</span> <span>${esc(w.title)}</span></summary><p>${esc(w.focus)}</p>
   <dl class="week-path"><dt>Bring forward</dt><dd>${esc(path.bring)}</dd><dt>Finish with</dt><dd>${esc(path.finish)}</dd><dt>Use it next</dt><dd>${esc(path.reuse)}</dd></dl>
   ${part.map(courseRow).join("")}</details>`;
 }).join("")}</div>`;
}
function studioIntro(d){
 if(!d.scene)return "";
 const base="labs/nightshift/",gallery=base+"index.html#"+d.scene;
 const prep=d.prerequisites.map(id=>{
   const item=byId.get(id);
   return `<li>${link(route(item),title(item)+" · "+item.title)}${rec(item).done?" <small>✓ Completed</small>":""}</li>`;
 }).join("");
 return `<section class="panel studio-intro"><a href="${gallery}" aria-label="Inspect the ${esc(d.title)} scene"><img src="${base}media/${esc(d.scene)}-beauty.jpg" alt="" width="480" height="270"></a><div><h2>Before you edit</h2><p>Open the captured frame and make your prediction. The native viewer is where you change CUDA and take your own measurement.</p><div class="row">${link(gallery,"Inspect the scene ↗")}${link(base+"manual.html#"+d.scene,"Open the worksheet ↗")}</div><h3>Builds on</h3><ul class="links">${prep}</ul></div></section>`;
}
function handoff(d){
 const items=d.carry||SESSION_BRIDGES[d.id]||[];
 if(!items.length)return "";
 const earlier=items.every(item=>days.indexOf(byId.get(item.id))<days.indexOf(d));
 return `<section class="panel handoff"><h2>${earlier?"Use evidence from earlier sessions":"Where you’ll use this later"}</h2>${earlier?"":"<p>Finish this session first. These links show where your results will be useful later in the course.</p>"}<ul>${items.map(item=>{
   const target=byId.get(item.id);
   return `<li>${esc(item.text)} ${link(route(target),title(target)+" · "+target.title+" →")}</li>`;
 }).join("")}</ul></section>`;
}
function weekRecall(d){
 if(!d.wi||days.find(item=>item.wi===d.wi).id!==d.id)return "";
 const entries=WEEK_RECALL[d.wi].map(id=>{
   const earlier=byId.get(id),note=rec(earlier).note.trim();
   const sample=note.length>420?note.slice(0,420)+"…":note;
   return `<li><a href="${route(earlier)}" target="_blank" rel="noopener">${esc(earlier.title)} ↗</a>${sample?`<blockquote>${esc(sample)}</blockquote>`:""}</li>`;
 });
 return `<details class="bring-forward"><summary>Bring your earlier work into Week ${d.wi}</summary><p>${esc(WEEK_PATH[d.wi].bring)}</p><ul>${entries.join("")}</ul></details>`;
}
function dayView(d){
 const r=rec(d),index=days.indexOf(d);
 const links=d.scene?[["#notes","Record or import measurements"],["#setup","Check the CUDA workstation"],["labs/nightshift/manual.html#measure","Benchmarking protocol"]]:StudioGuides.related(d.wi,d.di);
 const sequence=`<nav class="section row lesson-nav" aria-label="Session sequence">${index?`<a class="btn sub" href="${route(days[index-1])}">← ${esc(days[index-1].title)}</a>`:""}<span class="spacer"></span>${index+1<days.length?`<a class="btn" href="${route(days[index+1])}">Next · ${esc(days[index+1].title)} →</a>`:`<a class="btn" href="#notes">Open notebook →</a>`}</nav>`;
 const body=LessonReader.view(d,r,{crumb:crumb("#course/"+d.wi,"Course map",title(d)),storageFailed,link,links,resources,
   studio:studioIntro(d),portfolio:Portfolio.checkpoint(d,{esc,link}),handoff:handoff(d),recall:weekRecall(d),sequence});
 root.innerHTML=`<article class="lesson reader">${body}</article>`;
 LessonReader.bind(root,notice,d,(i,value)=>{
   readChanges();
   change(d,{drills:{...rec(d).drills,[i]:value}});
 });
 for(const box of root.querySelectorAll("[data-step]"))box.onchange=()=>{
   readChanges();
   const steps=new Set(rec(d).steps||[]),i=Number(box.dataset.step);
   if(box.checked)steps.add(i);else steps.delete(i);
   change(d,{steps:[...steps].sort((a,b)=>a-b)});
   root.querySelector("#step-status").textContent=`${steps.size} of ${d.steps.length} practice steps recorded`;
 };
 root.querySelector("#note").oninput=e=>{change(d,{note:e.target.value});root.querySelector("#saved").textContent=storageFailed?"Export from Notebook to keep this session.":"Saved in this browser."};
 for(const b of root.querySelectorAll("[data-choice]"))b.onclick=()=>{const i=Number(b.dataset.choice);change(d,{choice:i});root.querySelectorAll("[data-choice]").forEach(btn=>{btn.className="";btn.setAttribute("aria-pressed",String(btn===b))});const ok=i===d.check.answer;b.className=ok?"right":"wrong";root.querySelector(".feedback").textContent=ok?"Correct. "+d.check.explanation:"Try again. Revisit the worked example or open the hint."};
 root.querySelector("#complete").onclick=e=>{readChanges();const complete=!rec(d).done;change(d,{done:complete?Date.now():0,review:0,lastReview:0});e.target.className=complete?"sub":"";e.target.textContent=complete?"✓ Completed · reopen":"Mark session complete";notice(complete?"Completed. Your first review opens tomorrow.":"Session reopened.")};
}
function reviewDateLabel(t, now){
 const date=new Date(t);
 return date.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",...(date.getFullYear()!==new Date(now).getFullYear()?{year:"numeric"}:{})});
}
function reviewCard(d, date, now){
 const stage=rec(d).review;
 let checks;
 if(stage===0){
  checks=CoursePrediction.entries(d.id,"recall");
  if(!checks.length) checks=[{type:"rubric",prompt:d.recall,explain:LESSON_RECALL_ANSWERS[d.id]}];
 }else if(stage===1){
  checks=[{type:"choice",prompt:d.check.question,options:d.check.options,answer:d.check.options[d.check.answer],explain:d.check.explanation}];
 }else{
  const drill=LESSON_DRILLS[d.id][stage-2];
  checks=[drill.options
   ? {type:"choice",prompt:drill.prompt,options:drill.options,answer:drill.options[drill.answer],explain:drill.explanation}
   : {type:"number",prompt:drill.prompt,answer:Number(drill.answer),unit:drill.unit,explain:drill.explanation}];
 }
 const isToday=new Date(date).toDateString()===new Date(now).toDateString();
 return `<details class="review-card"><summary>${esc(title(d))} · ${esc(d.title)}</summary>
   <p class="small dim">Review ${stage+1} of 4 · ${isToday?"Due today":"Due since "+esc(reviewDateLabel(date,now))}</p>
   ${checks.map((check,i)=>CoursePrediction.view("review-"+d.id+"-"+stage+(i?"-"+i:""),check)).join("")}
   ${stage===0&&checks.every(check=>check.prompt!==d.recall)?`<details class="recall-original"><summary>Read the full lesson question and explanation</summary><p>${esc(d.recall)}</p><p>${esc(LESSON_RECALL_ANSWERS[d.id])}</p></details>`:""}
   ${d.id==="8/4"?`<p>Reopen your lesson notes and try the question you saved for day +${[1,3,7,21][stage]}.</p>`:""}
   ${stage===2?LessonReader.optionalChallenge(d):""}
   <div class="row"><button data-review="${d.id}">Record review</button>${link(route(d),"Reopen "+d.title+" →")}</div></details>`;
}
function recallQueue(){
 const now=Date.now();
 const scheduled=days.map(d=>({d,t:LabJournal.reviewDate(rec(d))})).filter(item=>item.t!==null).sort((a,b)=>a.t-b.t);
 const ready=scheduled.filter(item=>item.t<=now);
 const upcoming=scheduled.find(item=>item.t>now);
 const message=ready.length?`${ready.length} ${ready.length===1?"session is":"sessions are"} ready. Open a session to try its question or read the explanation. Select Record review when you finish.`:scheduled.length?"You’re caught up for today.":days.some(d=>rec(d).done)?"You’ve finished all four reviews for every session you’ve completed.":"Your first review opens the day after you complete a session.";
 return `<section class="panel tint" aria-labelledby="recall-heading"><h2 id="recall-heading">Recall queue</h2><p>${message}</p>
  ${ready.map(item=>reviewCard(item.d,item.t,now)).join("")}
  ${upcoming?`<p class="review-upcoming"><strong>Next scheduled after today</strong><br>${esc(reviewDateLabel(upcoming.t,now))} · ${esc(title(upcoming.d))} · ${esc(upcoming.d.title)}</p>`:""}</section>`;
}
function notebook(){
 readChanges();
 let copies=[];
 try{copies=previousCopies()}catch{}
 if(unreadableCopy!==null&&!copies.includes(unreadableCopy))copies.push(unreadableCopy);
 const entries=days.filter(d=>rec(d).note||rec(d).done||rec(d).steps?.length||rec(d).choice!=null||Object.keys(rec(d).drills||{}).length);
 root.innerHTML=h("Learning record","Lab notebook","Save measurements with their workload and correctness check. Browser storage is tied to the browser and course location. A JSON export travels with you.")+
 `<div class="controls"><button id="export">Export notebook</button><label class="file">Import or merge notebook &nbsp;<input type="file" id="import" accept=".json,application/json"></label></div>${copies.length?`<section class="panel"><h2>Notebook recovery</h2><p>${readFailed?"Download the unreadable original for recovery. Import a valid notebook to resume saving here. Export notebook keeps the current tab’s work.":"These originals were preserved when a valid notebook was imported."}</p>${copies.map((_,i)=>`<button class="sub" data-copy="${i}">Download unreadable copy ${i+1}</button>`).join(" ")}</section>`:""}
 ${recallQueue()}
 <section class="section panel"><h2>Record a benchmark</h2><details class="bench-import"><summary>Import a native scene benchmark</summary><p>Import a successful Night Shift, swarm, knit, or flow benchmark. Each entry retains the workload, device, median, p95, and correctness result. Night Shift keeps the camera and material settings and records GPU and host times separately. Choose your own CSV or the <a href="labs/nightshift/media/benchmark.csv" download>four-scene RTX 3070 benchmark</a>.</p>${pre(["& {","    $rows = @(python -B labs/nightshift/nightshift.py --scene lighting --bench --trials 9)","    if ($LASTEXITCODE -ne 0) { throw 'Benchmark failed. Check the CUDA output above.' }","    $out = 'lighting-' + (Get-Date -Format 'yyyyMMdd-HHmmssfff') + '.csv'","    $rows | Out-File -Encoding utf8 -NoClobber -ErrorAction Stop $out","    Get-Item -LiteralPath $out","}"].join("\n"))}<label>Benchmark CSV <input id="bench-file" type="file" accept=".csv,text/csv"></label></details><form id="runform"><div class="grid two">${[["lab","Lab","Swarm"],["input","Workload and hardware","768×448, 56 worms, RTX 5070"],["variant","Kernel or variant","Student · tile 16"],["ms","Median milliseconds","0.42"],["check","Correctness and timing scope","IDs match · CUDA events · 41 samples"]].map(([n,l,p])=>`<label>${l}<input required style="display:block;width:100%" name="${n}" ${n==="ms"?'type="number" min="0.000001" step="any"':""} placeholder="${p}"></label>`).join("")}</div><button style="margin-top:14px">Save measurement</button></form>
 ${state.runs.length?`<div class="tablewrap"><table><thead><tr><th>Lab / workload</th><th>Variant</th><th>Median ms</th><th>Check</th></tr></thead><tbody>${state.runs.slice().reverse().map(v=>`<tr><td><b>${esc(v.lab)}</b><br>${esc(v.input)}</td><td>${esc(v.variant)}</td><td>${esc(v.ms)}</td><td>${esc(v.check)}</td></tr>`).join("")}</tbody></table></div>`:""}</section>
 ${Portfolio.listing({rec,byId,link,esc})}
 <section class="section"><h2>Lesson entries</h2><div class="stack">${entries.length?entries.map(d=>`<div class="panel"><span class="meta">${esc(title(d))}</span><h3>${link(route(d),d.title)}</h3><p class="read">${esc(rec(d).note||(rec(d).done?"Completed without a written entry.":rec(d).steps?.length?rec(d).steps.length+" practice steps recorded.":rec(d).choice!=null?"Quiz response saved.":""))}</p>${LessonPractice.progress(d,rec(d))}</div>`).join(""):"<p>Your first lesson note will appear here.</p>"}</div></section>`;
 root.querySelector("#export").onclick=()=>{readChanges();downloadFile(JSON.stringify(state,null,2),"fieldwork-notebook.json")};
 for(const b of root.querySelectorAll("[data-copy]"))b.onclick=()=>downloadFile(copies[Number(b.dataset.copy)],"fieldwork-original-"+(Number(b.dataset.copy)+1)+".json");
 root.querySelector("#import").onchange=async e=>{
   try{
     const file=e.target.files[0];if(!file)return;
     const incoming=fromData(JSON.parse(LabJournal.decodeFile(await file.arrayBuffer())));
     readChanges();restoreOnImport();LabJournal.merge(state,incoming);save();notebook();notice(storageFailed?"Notebook merged in this tab. Export it to keep your work.":"Notebook merged.");
   }catch(err){notice(err.message);e.target.value=""}
 };
 root.querySelector("#bench-file").onchange=async e=>{
   try{
     const file=e.target.files[0];if(!file)return;
     const rows=LabJournal.readBench(LabJournal.decodeFile(await file.arrayBuffer()),new Date(file.lastModified).toISOString());
     readChanges();const added=LabJournal.addRuns(state,rows);save();notebook();
     notice(added?`Imported ${added} timing rows.`:"These measurements are already in the notebook.");
   }catch(err){notice(err.message);e.target.value=""}
 };
 root.querySelector("#runform").onsubmit=e=>{e.preventDefault();const row=Object.fromEntries(new FormData(e.target));readChanges();state.runs.push({...row,date:new Date().toISOString()});save();notebook();notice(storageFailed?"Measurement added to this tab. Export your notebook to keep it.":"Measurement saved.")};
 for(const b of root.querySelectorAll("[data-review]")){
   const d=byId.get(b.dataset.review);
   const shownStage=rec(d).review;
   b.onclick=()=>{
     readChanges();
     if(!due(d)||rec(d).review!==shownStage){notebook();return}
     const now=Date.now();
     change(d,{review:shownStage+1,lastReview:now});
     const nextDate=LabJournal.reviewDate(rec(d));
     notebook();
     notice(`Review recorded for “${d.title}”. ${nextDate===null?"All four reviews complete.":"This session returns "+reviewDateLabel(nextDate,now)+"."}`);
   };
 }
}
function publicationPage(d){
 const get=()=>{readChanges();return rec(d).publication||{}};
 const set=(field,value)=>{const publication=Portfolio.draft(d.id,{...get(),[field]:value});change(d,{publication})};
 Portfolio.open(d,{root,h,crumb,esc,pre,link,get,set,download:downloadFile});
}
function render(){
 readChanges();teardown?.();teardown=null;
 const addr=(location.hash.slice(1)||"studio"),p=addr.split("/")[0];
 const section=(p==="day"||p==="publication")?"course":(["matrix","chain","cloth","compute","swarm","knit","digits","flow"].includes(p)?"labs":p);
 document.querySelectorAll("nav a").forEach(a=>{if(a.hash==="#"+section)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
 if(p==="studio")overview();else if(p==="course")course();else if(p==="notes")notebook();else if(p==="publication"&&byId.has(addr.slice(12))&&window.PUBLICATION_BRIEFS[addr.slice(12)])publicationPage(byId.get(addr.slice(12)));else if(p==="day"&&byId.has(addr.slice(4)))dayView(byId.get(addr.slice(4)));else if(["labs","matrix","chain","cloth","compute","swarm","knit","digits","flow","setup"].includes(p)){teardown=StudioGuides.view(p,{root,esc,pre,card,link,crumb,h,resources,notice})||null}else{root.innerHTML=h("Navigation","Page unavailable","Use the course map to choose a session.")+link("#course","Open the course map");}
 document.title=(root.querySelector("h1")?.textContent||"Studio")+" · Fieldwork";if(previous&&previous!==addr){window.scrollTo({top:0,left:0,behavior:"instant"});root.focus({preventScroll:true})}previous=addr;
}
document.querySelector(".skip").onclick=e=>{e.preventDefault();root.focus();root.scrollIntoView()};
window.addEventListener("hashchange",render);render();
})();
