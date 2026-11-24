const AlgebraBench = (()=> {
"use strict";
const label=index=>String.fromCharCode(65+index);
function chainPlan(dimensions){
 const count=dimensions.length-1;
 const table=Array.from({length:count},()=>Array(count));
 for(let i=0;i<count;i++)table[i][i]={cost:0,order:label(i),candidates:[]};
 for(let span=2;span<=count;span++){
  for(let i=0;i+span<=count;i++){
   const j=i+span-1,candidates=[];
   for(let k=i;k<j;k++){
    const left=table[i][k],right=table[k+1][j];
    const multiply=dimensions[i]*dimensions[k+1]*dimensions[j+1];
    candidates.push({split:k,left:left.cost,right:right.cost,multiply,cost:left.cost+right.cost+multiply,order:`(${left.order}·${right.order})`});
   }
   const best=candidates.reduce((a,b)=>a.cost<=b.cost?a:b);
   table[i][j]={cost:best.cost,order:best.order,candidates};
  }
 }
 return table;
}
function chainView({root,esc,link,crumb,h},panel){
 const presets=[
 ["Digit projection","1797,64,512,10"],["Reversed winner","8,64,16,512"],["Six-matrix challenge","30,35,15,5,10,20,25"]];
 root.innerHTML=crumb("#labs","Lab shelf","Browser experiment")+h("Dynamic programming","Choose a multiply order","The dimensions determine the amount of arithmetic. Predict where to split the chain, then inspect the alternatives for every subproblem.")+
 `<section class="panel section"><div class="controls">${presets.map(([name,value])=>`<button class="sub" data-dims="${value}">${name}</button>`).join("")}</div><form id="chain-shape"><label for="chain-dims">Dimensions in order</label><div class="controls"><input id="chain-dims" value="${presets[0][1]}" aria-describedby="dim-help"><button>Apply dimensions</button></div><p id="dim-help" class="small dim">Enter 3–9 positive integer dimensions, each at most 10,000. For A of shape 4×3 and B of shape 3×7, enter 4,3,7.</p><p id="shape-error" class="bad" role="alert"></p></form><p id="chain-input"></p><div class="controls"><label>Inspect subchain <select id="subchain"></select></label><label>Predict the last multiplication <select id="guess"></select></label><button id="reveal">Test my split</button><button class="sub" type="button" id="explain-split">Read why a split is cheapest</button></div><div id="chain-result" aria-live="polite"></div></section>
 <div class="section grid two">${panel("Work a smaller interval",`<p>For a split after matrix k, add the cheapest cost for its left side, the cheapest cost for its right side, and the cost of their final product. A single input matrix costs zero. Use the subchain selector to check the values you put into the two smaller cells of the dynamic-programming table.</p>`)}${panel("Week 2, Day 2 · From a prediction to a timing",`<p>The table counts scalar multiplications. The native benchmark counts two FLOPs per multiply-add. Once you have checked the split and its subchains, return to the lesson tab. Finish your paper check, then use the two commands in “Measure the same choice on your GPU.” The Digit projection and Reversed winner presets match those two runs.</p><p>${link("#day/2/1","Open the matrix-chain lesson")}</p>`)}</div>`;
 const get=id=>root.querySelector("#"+id);
 let dims,table;
 function evaluate(readOnly=false){
  const [i,j]=get("subchain").value.split(",").map(Number),node=table[i][j];
  const guess=get("guess").value;
  const chosen=guess!=="" && node.candidates.find(c=>c.split===Number(guess));
  if(!readOnly&&!chosen){get("chain-result").textContent="Choose a split, or read the cost comparison without making a guess.";return;}
  const best=node.candidates.filter(c=>c.cost===node.cost);
  const result=readOnly?"Compare the total in each row.":chosen.cost===node.cost?"Your split attains the minimum.":`Your split costs ${(chosen.cost-node.cost).toLocaleString()} extra scalar multiplications.`;
  get("chain-result").innerHTML=`<p><b>${result}</b> Minimum ${node.cost.toLocaleString()} using <code>${esc(node.order)}</code>.${best.length>1?` ${best.length} final splits tie.`:""}</p><div class="tablewrap"><table><thead><tr><th>Final split</th><th>Left cost</th><th>Right cost</th><th>Final multiply</th><th>Total multiplications</th></tr></thead><tbody>${node.candidates.map(c=>`<tr><td>${label(c.split)} | ${label(c.split+1)}</td><td>${c.left.toLocaleString()}</td><td>${c.right.toLocaleString()}</td><td>${dims[i]}×${dims[c.split+1]}×${dims[j+1]} = ${c.multiply.toLocaleString()}</td><td>${c.cost.toLocaleString()}${c.cost===node.cost?" ✓":""}</td></tr>`).join("")}</tbody></table></div>`;
 }
 function interval(){
  const [i,j]=get("subchain").value.split(",").map(Number);
  get("guess").innerHTML='<option value="">Choose a split</option>'+Array.from({length:j-i},(_,k)=>`<option value="${k+i}">After ${label(k+i)}</option>`).join("");
  get("chain-result").textContent="Choose a split, then test it.";
 }
 function apply(){
  const raw=get("chain-dims").value.trim();
  const tokens=raw.split(/[\s,×x]+/);
  if(tokens.length<3||tokens.length>9||tokens.some(x=>!/^[0-9]+$/.test(x)||Number(x)<1||Number(x)>10000)){
   get("shape-error").textContent="Use 3–9 integer dimensions between 1 and 10,000. The last valid chain is still displayed.";return;
  }
  get("shape-error").textContent="";dims=tokens.map(Number);table=chainPlan(dims);
  const count=dims.length-1;const options=[];
  for(let span=count;span>1;span--)for(let i=0;i+span<=count;i++){const j=i+span-1;options.push(`<option value="${i},${j}">${label(i)}…${label(j)}</option>`)}
  get("subchain").innerHTML=options.join("");
  get("chain-input").textContent=dims.slice(0,-1).map((v,i)=>`${label(i)} ${v}×${dims[i+1]}`).join("   ·   ");
  interval();
 }
 get("chain-shape").onsubmit=e=>{e.preventDefault();apply()};get("subchain").onchange=interval;get("reveal").onclick=()=>evaluate();get("explain-split").onclick=()=>evaluate(true);
 get("guess").onchange=()=>{get("chain-result").textContent="Test the new split to compare its cost."};
 for(const b of root.querySelectorAll("[data-dims]"))b.onclick=()=>{get("chain-dims").value=b.dataset.dims;apply()};
 apply();
}
function partialProduct(rows,inner,cols,tile,br,bc,phase){
 const A=Array.from({length:rows*inner},(_,i)=>(i*3+Math.floor(i/inner)+1)%7-3);
 const B=Array.from({length:inner*cols},(_,i)=>(i*5+Math.floor(i/cols)*2+3)%9-4);
 const C=Array(rows*cols).fill(null),r0=br*tile,c0=bc*tile,k0=phase*tile;
 const r1=Math.min(r0+tile,rows),c1=Math.min(c0+tile,cols),k1=Math.min(k0+tile,inner);
 for(let i=r0;i<r1;i++)for(let j=c0;j<c1;j++){
  let value=0;
  for(let k=0;k<k1;k++)value+=A[i*inner+k]*B[k*cols+j];
  C[i*cols+j]=value;
 }
 const height=r1-r0,width=c1-c0,depth=k1-k0;
 return {A,B,C,r0,r1,c0,c1,k0,k1,cooperative:(height+width)*depth,naive:2*height*width*depth,products:height*width*depth};
}
function tileView({root,h,crumb,link},panel){
 root.innerHTML=crumb("#labs","Lab shelf","Browser experiment")+h("Matrix multiplication","Inside a tile","An output tile is a group of neighboring cells in C. Two cells in the same row use the same row of A. Computing them together lets the GPU reuse those inputs.")+
 `<section class="panel section">
   <p><strong>C++ Session 3.</strong> Keep the defaults and follow the outlined cell C[0,0]. Its dot product has four terms. The explorer shows two at a time. Predict the last two pairs of inputs, then click <strong>Next phase</strong> once.</p>
   <div id="tile-next-guess"></div><div class="controls"><label>Shape (M × K × N) <select id="shape"><option value="4,4,4">4 × 4 × 4</option><option value="3,5,7">3 × 5 × 7</option><option value="8,8,8">8 × 8 × 8</option><option value="1,7,3">1 × 7 × 3</option></select></label><label>Tile width <select id="tile"><option>2</option><option>4</option></select></label><label>Output tile <select id="block"></select></label><label>Trace cell <select id="cell"></select></label><button id="back" class="sub">← Back</button><button id="step">Next phase →</button></div>
   <div class="matrixGrid" id="matrices"></div>
   <p class="small dim">The shaded cells in C form your output tile. The outlined numbers in A and B are the inputs for the selected cell in this phase. A dot in C marks a cell outside this tile.</p>
   <p id="phase" class="meta"></p><p id="trace" aria-live="polite"></p>
   <p id="trace-finish" hidden><strong>Here for C++ Session 3?</strong> Your trace is complete. Check that the first sum plus the last two products gives the value outlined in C. Switch back to your lesson tab, mark step 3 done, and continue to “Try it on new inputs.”</p>
 </section>
 <details class="panel section"><summary>Week 2, Day 3 · Input loads and edge tiles</summary>
   <p>In ${link("#day/2/2","A tile earns its keep")} you’ll write the CUDA kernel and time it on your GPU. The browser counts below describe the tile and phase currently selected.</p>
   <p id="traffic"></p>
   <div class="grid two">${panel("Predict an edge tile",`<p>Choose 3 × 5 × 7 and tile width 4. At output tile (0,1), predict how many inputs the final phase needs. Advance one phase and compare your prediction with the counts above. Which rows, columns and inner terms fall outside the matrices?</p>${LabPredictions.render(["matrix-edge"],"tile-edge")}`)}${panel("Measure on your GPU",`<p>The explorer counts the input values the kernel asks for. Zero-filled slots need no global load, although threads can still multiply padded values. Caches can serve repeated loads, so this count alone can’t tell you the speedup. Follow the ${link("labs/compute/README.html#tiled-gemm","native tiled GEMM exercise")} to compare GPU times.</p>`)}</div>
 </details>
 <details class="panel section"><summary>Week 2, Day 4 · Trace two output columns</summary><p>On the 4 × 4 × 4 shape with tile width 2, start at phase 1 of the top-left tile. Compare Trace cell (0, 0) with (0, 1). Which two entries of A stay outlined? Which column of B changes? Carry those two running sums back to the lesson to sketch what one worker must store.</p>${LabPredictions.render(["matrix-columns"],"tile-columns")}</details>`;
 const q=id=>root.querySelector("#"+id);
 let m,n,k,t,phase=0;
 function selectBlock(){
  phase=0;const [br,bc]=q("block").value.split(",").map(Number);const opts=[];
  for(let r=br*t;r<Math.min(m,(br+1)*t);r++)for(let c=bc*t;c<Math.min(n,(bc+1)*t);c++)opts.push(`<option value="${r},${c}">(${r}, ${c})</option>`);
  q("cell").innerHTML=opts.join("");draw();
 }
 function configure(){
  [m,k,n]=q("shape").value.split(",").map(Number);t=Number(q("tile").value);
  const opts=[];for(let i=0;i<Math.ceil(m/t);i++)for(let j=0;j<Math.ceil(n/t);j++)opts.push(`<option value="${i},${j}">(${i}, ${j})</option>`);
  q("block").innerHTML=opts.join("");selectBlock();
 }
 function draw(){
  const [br,bc]=q("block").value.split(",").map(Number);
  const [row,col]=q("cell").value.split(",").map(Number);
  const s=partialProduct(m,k,n,t,br,bc,phase),phases=Math.ceil(k/t);
  q("matrices").innerHTML=[[`A · ${m}×${k}`,s.A,k],[`B · ${k}×${n}`,s.B,n],[`C partial · ${m}×${n}`,s.C,n]].map(([name,values,width],j)=>`<div><h3>${name}</h3><div class="matrix" style="grid-template-columns:repeat(${width},1fr)">${values.map((v,i)=>{const x=i%width,y=Math.floor(i/width);
   const lit=j===0?y>=s.r0&&y<s.r1&&x>=s.k0&&x<s.k1:j===1?x>=s.c0&&x<s.c1&&y>=s.k0&&y<s.k1:v!==null;
   const traced=lit&&(j===0?y===row:j===1?x===col:y===row&&x===col);
   return `<b class="${lit?(j===2?"active":"lit"):""}${traced?" traced":""}">${v??"·"}</b>`}).join("")}</div></div>`).join("");
  const terms=[];let increment=0;
  for(let p=s.k0;p<s.k1;p++){const a=s.A[row*k+p],b=s.B[p*n+col];terms.push(`(${a} × ${b})`);increment+=a*b}
  const peek=q("tile-next-guess");
  if(phase+1<phases){
   const next=partialProduct(m,k,n,t,br,bc,phase+1);
   const pairs=[];
   for(let p=next.k0;p<next.k1;p++) pairs.push(s.A[row*k+p],s.B[p*n+col]);
   const worked=[];
   for(let p=0;p<pairs.length;p+=2) worked.push(pairs[p]+" × "+pairs[p+1]);
   const prompt="For C["+row+","+col+"] in phase "+(phase+2)+", enter the A value then B value for each pair in order.";
   const explain="Follow row "+row+" of A and column "+col+" of B. The next inner indices run from "+next.k0+" to "+(next.k1-1)+". The products are "+worked.join(" and ")+". Adding them to the current sum "+s.C[row*n+col]+" gives "+next.C[row*n+col]+".";
   peek.innerHTML='<details class="prediction-group"><summary>Check the next pairs or read the trace</summary>'+CoursePrediction.view("tile-next-pairs",{type:"list",prompt,answer:pairs,explain})+'</details>';
  }else peek.innerHTML="";
  const result=s.C[row*n+col];q("phase").textContent=`Phase ${phase+1} of ${phases} · K indices ${s.k0}–${s.k1-1}`;
  q("trace").textContent=`C[${row},${col}] started this phase at ${result-increment}. Add ${terms.join(" + ")} = ${increment}. Running sum: ${result}.`;
  const onSessionThreeExample=m===4&&k===4&&n===4&&t===2&&row===0&&col===0;
  q("trace-finish").hidden=!(onSessionThreeExample&&phase===phases-1);
  q("traffic").textContent=`For this tile and phase: ${s.cooperative} cooperative input loads, ${s.naive} input loads in a one-thread-per-cell loop, and ${s.products} useful multiply-adds. Of ${2*t*t} shared input slots, ${2*t*t-s.cooperative} take a zero fill.`;
  q("step").disabled=phase+1===phases;q("back").disabled=phase===0;
 }
 q("shape").onchange=q("tile").onchange=configure;q("block").onchange=selectBlock;q("cell").onchange=draw;
 q("back").onclick=()=>{phase--;draw()};q("step").onclick=()=>{phase++;draw()};configure();
}
return {chainPlan,chainView,partialProduct,tileView};
})();
