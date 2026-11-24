const LabJournal = (()=>{
"use strict";
const reviewDays=[1,3,7,21,45];
function startOfDay(ts, addDays=0){
 const d=new Date(ts);
 d.setDate(d.getDate()+addDays);
 d.setHours(0,0,0,0);
 return d.getTime();
}
function reviewDate(r){
 if(!r.done)return null;
 if(Number.isFinite(r.nextReview)&&r.nextReview>0)return r.nextReview;
 if(r.review>=reviewDays.length)return null;
 const hasReview=r.review>0 && r.lastReview;
 const base=hasReview?r.lastReview:r.done;
 const interval=reviewDays[r.review]-(hasReview?reviewDays[r.review-1]:0);
 return startOfDay(base, Math.max(1, interval));
}
function scheduleNext(r, rating, now=Date.now()){
 const stage=r.review||0;
 if(rating==="again"){
  return {review:Math.max(0, stage-1), lastReview:now, nextReview:startOfDay(now, 1), days:1};
 }
 if(rating==="easy"){
  const days=stage<=0?5:stage===1?12:stage===2?25:45;
  return {review:Math.min(reviewDays.length, stage+2), lastReview:now, nextReview:startOfDay(now, days), days};
 }
 // "good"
 const nextStage=Math.min(reviewDays.length, stage+1);
 const days=stage===0?3:stage===1?7:stage===2?21:45;
 return {review:nextStage, lastReview:now, nextReview:startOfDay(now, days), days};
}
function mergeNote(a,b){
 if(!a)return b;if(!b)return a;
 const has=(whole,part)=>("\n\n"+whole+"\n\n").includes("\n\n"+part+"\n\n");
 if(has(a,b))return a;if(has(b,a))return b;
 const x=a.split(/\r?\n\r?\n/),y=b.split(/\r?\n\r?\n/);
 let start=0,tail=0;
 while(start<Math.min(x.length,y.length)&&x[start]===y[start])start++;
 while(start+tail<Math.min(x.length,y.length)&&x[x.length-1-tail]===y[y.length-1-tail])tail++;
 const left=x.slice(start,x.length-tail),right=y.slice(start,y.length-tail);
 const common=left.length&&right.length&&has(left.join("\n\n"),right.join("\n\n"));
 return [...x.slice(0,start),...left,...(common?[]:right),...x.slice(x.length-tail)].join("\n\n");
}
function addRuns(state,incoming){
 const signature=row=>JSON.stringify(["lab","input","variant","ms","check","date"].map(k=>row[k]));
 // A single-scene CSV and the combined capture file can contain the same timings
 // but have different modification dates. Compare complete six-row measurements
 // so a coincidentally equal GPU median cannot discard part of a new trial.
 function nightShiftGroups(rows){
  const groups=new Map();
  for(const row of rows){
   if(!String(row.lab).startsWith("Night Shift · ")||!String(row.check).endsWith("0 differing pixels vs reference"))continue;
   const key=JSON.stringify([row.lab,row.input,row.date]);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(row);
  }
  return Array.from(groups.values()).filter(group=>group.length===6&&new Set(group.map(r=>r.variant)).size===6);
 }
 const measurement=group=>JSON.stringify(group.map(r=>JSON.stringify([r.lab,r.input,r.variant,r.ms,r.check])).sort());
 const previous=new Set(nightShiftGroups(state.runs).map(measurement));
 const replay=new Set();
 for(const group of nightShiftGroups(incoming)){
  const key=measurement(group);
  if(previous.has(key))for(const row of group)replay.add(row);
  previous.add(key);
 }
 const seen=new Set(state.runs.map(signature));let added=0;
 for(const row of incoming){
  if(replay.has(row))continue;
  const id=signature(row);
  if(!seen.has(id)){state.runs.push(row);seen.add(id);added++}
 }
 return added;
}
function merge(state,incoming){
 for(const [id,v] of Object.entries(incoming.records)){
  const old=state.records[id];
  if(!old){state.records[id]=v;continue}
  const review=Math.max(old.review,v.review);
  const lastReview=Math.max(old.review===review?old.lastReview||0:0,v.review===review?v.lastReview||0:0);
  const nextReview=Math.max(old.nextReview||0,v.nextReview||0);
  state.records[id]={note:mergeNote(old.note,v.note),done:old.done&&v.done?Math.min(old.done,v.done):old.done||v.done,
   choice:old.choice??v.choice,review,lastReview,nextReview,steps:[...new Set([...(old.steps||[]),...(v.steps||[])])].sort((a,b)=>a-b)};
  if(old.drills||v.drills){
   const drills=LessonPractice.saved(id,old.drills,v.drills);
   if(Object.keys(drills).length)state.records[id].drills=drills;
  }
  if(old.publication||v.publication){
   const draft={...old.publication};
   for(const [field,value] of Object.entries(v.publication||{})){
    draft[field]=field==="title"?(draft.title||value):mergeNote(draft[field],value);
   }
   if(Object.keys(draft).length)state.records[id].publication=draft;
  }
 }
 return addRuns(state,incoming.runs);
}
// Windows PowerShell redirection commonly produces UTF-16 LE. File.text() assumes UTF-8.
function decodeFile(buffer){
 const b=new Uint8Array(buffer);
 const encoding=b[0]===255&&b[1]===254?"utf-16le":b[0]===254&&b[1]===255?"utf-16be":"utf-8";
 return new TextDecoder(encoding).decode(buffer).replace(/^\uFEFF/,"");
}
function csvRecords(text){
 const rows=[];let row=[],field="",quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){
   if(quoted && text[i+1]==='"'){field+='"';i++}else quoted=!quoted;
  }else if(!quoted && ch===","){row.push(field);field=""}
  else if(!quoted && (ch==="\n"||ch==="\r")){
   if(ch==="\r"&&text[i+1]==="\n")i++;
   row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field="";
  }else field+=ch;
 }
 if(quoted) throw Error("The CSV ends inside a quoted field.");
 row.push(field);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
function nightShiftBench(rows,columns,date){
 const settings=["device","scene","width","height","time","yaw","pitch","control","features","view","samples_per_pixel","exposure","trials"];
 const required=settings.concat(["mode","gpu_p50_ms","gpu_p95_ms","host_p50_ms","host_p95_ms","different_pixels"]);
 if(required.some(k=>!columns.includes(k)))throw Error("The Night Shift CSV is missing settings or timings. Use the full output of --bench.");
 const groups=new Map(),result=[];
 for(const r of rows){
  if(required.some(k=>!r[k]))throw Error("A Night Shift row is missing a setting or result.");
  if(!["lighting","creature","textile","soundstage"].includes(r.scene)||!["beauty","normals"].includes(r.view))throw Error("The Night Shift scene or benchmark view is unknown.");
  if(!["reference","optimized","student"].includes(r.mode))throw Error("The Night Shift mode must be reference, optimized, or student.");
  const number=(key,lo=-Infinity,hi=Infinity,integer=false)=>{
   const s=r[key],value=Number(s);
   if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)||!Number.isFinite(value)||value<lo||value>hi||(integer&&!Number.isInteger(value)))throw Error("Invalid "+key+" in the Night Shift CSV.");
   return value;
  };
  const width=number("width",1,3840,true),height=number("height",1,2160,true),trials=number("trials",1,500,true);
  const time=number("time"),yaw=number("yaw"),pitch=number("pitch"),control=number("control",0,1),features=number("features",0,7,true);
  const spp=number("samples_per_pixel",1,9,true),exposure=number("exposure",0,8);
  if(![1,4,9].includes(spp)||exposure<=0)throw Error("The Night Shift exposure or samples per pixel are outside the supported range.");
  if(number("different_pixels",0,Infinity,true)!==0)throw Error("The Night Shift image differs from the reference. Validate the kernel before importing.");
  const input=`${width}×${height} · ${r.view} · t=${time} s, yaw=${yaw} rad, pitch=${pitch} rad · control=${control}, features=${features}, ${spp} spp, exposure=${exposure} · ${r.device}`;
  // One independently complete trio per scene; interleaving the four trios is valid.
  if(!groups.has(r.scene))groups.set(r.scene,{input,trials,modes:new Set()});
  const group=groups.get(r.scene);
  if(group.input!==input||group.trials!==trials)throw Error("Night Shift settings differ inside the "+r.scene+" comparison. Use one shot and device per scene.");
  if(group.modes.has(r.mode))throw Error("The Night Shift CSV repeats a mode for "+r.scene+". Import one complete comparison per scene.");
  group.modes.add(r.mode);
  for(const [prefix,label] of [["gpu","GPU frame"],["host","host render and readback"]]){
   const median=prefix+"_p50_ms",tail=prefix+"_p95_ms";
   if(number(tail,0)<number(median,0))throw Error("A Night Shift p95 cannot be smaller than its median.");
   result.push({lab:"Night Shift · "+r.scene,input,variant:r.mode+" · "+label,ms:r[median],
    check:`${trials} trials · p95 ${r[tail]} ms · 0 differing pixels vs reference`,date});
  }
 }
 if(Array.from(groups.values()).some(g=>g.modes.size!==3))throw Error("Each Night Shift scene needs a complete reference, optimized, and student comparison.");
 return result;
}
function readBench(text,date){
 const [header,...body]=csvRecords(text.trim());
 if(!header||!body.length)throw Error("Choose the CSV output from a completed scene benchmark.");
 const columns=header.map(x=>x.trim());
 if(new Set(columns).size!==columns.length)throw Error("The CSV contains duplicate column names.");
 const lab=columns.includes("gpu_p50_ms")?"Night Shift":columns.includes("kernel_p50_ms")?"Swarm":columns.includes("step_p50_ms")?"Knit":columns.includes("pressure_p50_ms")?"Flow":null;
 if(!lab)throw Error("Use the --bench CSV from Night Shift, swarm.py, knit.py, or flow.py.");
 const rows=body.map(fields=>{
  if(fields.length!==columns.length)throw Error("A benchmark row has missing or extra fields.");
  return Object.fromEntries(columns.map((name,i)=>[name,fields[i].trim()]));
 });
 if(lab==="Night Shift")return nightShiftBench(rows,columns,date);
 const result=[];
 for(const record of rows){
  const required=k=>{if(!record[k])throw Error(`Missing ${k} in the benchmark CSV.`);return record[k]};
  const num=(k,positive=false)=>{const val=required(k);if(!Number.isFinite(Number(val))||(positive?Number(val)<=0:Number(val)<0))throw Error(`Invalid ${k} in the benchmark CSV.`);return val};
  const dev=required(lab==="Knit"?"gpu":"device"),variant=required("mode"),samples=num("samples",true);
  let input,quality,scopes;
  if(lab==="Knit"){
   input=`${num("vertices",true)} vertices, ${num("edges",true)} edges, dt=${num("dt",true)}, ${num("iterations",true)} sweeps`;
   if("cols" in record||"rows" in record)input=`${num("cols",true)}×${num("rows",true)} grid, `+input;
   if(record.tear_strain)input+=`, tear strain ${record.tear_strain}`;
   quality=`RMS strain ${num("rms_strain")}, max position delta ${num("max_position_delta")}`;
   if(record.broken_edges)quality+=`, ${record.broken_edges} broken edges`;
   scopes=[["step","GPU cloth step"]];
  }else{
   input=`${num("width",true)}×${num("height",true)}`;
   if(lab==="Flow"){
    input+=`, ${num("sweeps")} sweeps`;
    quality=`RMS divergence ${num("rms_div_before")} → ${num("rms_div_after")}, residual ${num("rms_residual")}, max operator defect ${num("max_operator_defect")}`;
    scopes=[["pressure","GPU pressure solve"]];
   }else{
    input+=`, ${num("worms",true)} worms, ${num("segments",true)} segments`;
    quality=dev==="CPU"?"Same CPU reference image":"Reference image comparison passed";
    scopes=dev==="CPU"?[["host","host render"]]:[["kernel","GPU render kernel"],["host","host render"]];
   }
  }
  for(const [prefix,label] of scopes){
   const p50=num(prefix+"_p50_ms"),p95=num(prefix+"_p95_ms");
   if(Number(p95)<Number(p50))throw Error("A benchmark p95 cannot be smaller than its median.");
   result.push({lab,input:input+" · "+dev,variant:variant+" · "+label,ms:p50,check:`${samples} samples · p95 ${p95} ms · ${quality}`,date});
  }
 }
 const modes=new Set(rows.map(r=>r.mode));
 const settings=lab==="Knit"?["gpu","vertices","edges","dt","iterations","samples","tear_strain","cols","rows"]:lab==="Flow"?["device","width","height","sweeps","samples"]:["device","width","height","worms","segments","samples"];
 if(rows.some(r=>settings.some(k=>r[k]!==rows[0][k])))throw Error("The variants have different workloads or devices. Import one complete benchmark run at a time.");
 const expected=lab==="Flow"?["baseline","fused","student"]:lab==="Knit"?["baseline","gathered","student"]:
                   rows[0].device==="CPU"?["cpu-painter"]:["baseline","tiled","student"];
 if(rows.length!==expected.length||expected.some(x=>!modes.has(x)))throw Error("The benchmark is incomplete. Import the CSV after every variant finishes successfully.");
 return result;
}
return {reviewDate,scheduleNext,merge,addRuns,decodeFile,readBench};
})();
