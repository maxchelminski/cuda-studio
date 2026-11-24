"use strict";
const StudioExperiments = (() => {
  function cloth(canvas, config = {}) {
    const ctx = canvas.getContext("2d");
    const W=720,H=390, cols=49, rows=25, step=10.1;
    canvas.width=W; canvas.height=H;
    let points=[], edges=[], held=-1, down=false, running=true, raf=0, last=0, accumulator=0, tick=0, torn=0, candidates=0, found=0, indexMs=0, queryMs=0;
    const hero=!!config.hero, reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    let paused=reduced, mode="pull", method="grid";
    const spatialIndices = new Map();
    let measured=false, rebuilt=false;
    function reset() {
      points=[];edges=[];torn=0;held=-1;down=false;tick=0;accumulator=0;candidates=0;found=0;queryMs=0;indexMs=0;measured=false;rebuilt=false;spatialIndices.clear();
      for(let j=0;j<rows;j++) for(let i=0;i<cols;i++) {
        const a=i/(cols-1), b=j/(rows-1);
        const x=95+i*step+46*b+12*Math.sin(a*8+b*3)*b;
        const y=62+25*Math.sin(a*6.5)+j*step*.87+22*a+14*Math.sin(6*a+2*b)*b;
        points.push({x,y,px:x,py:y,pin:j===0 && (i%8===0 || i===cols-1),i,j});
        const n=j*cols+i;
        if(i) edges.push({a:n-1,b:n,rest:step,live:true,weft:true});
        if(j) edges.push({a:n-cols,b:n,rest:step,live:true,weft:false});
      }
      draw(); stats();
    }
    function simulate() {
      tick++;spatialIndices.clear();
      for(const p of points) if(!p.pin && points[held]!==p) {
        const x=p.x,y=p.y;
        p.x+=(p.x-p.px)*.982+.055*Math.sin(tick*.032+p.j*.13+p.i*.07);
        p.y+=(p.y-p.py)*.982+.075;p.px=x;p.py=y;
      }
      for(let pass=0;pass<5;pass++) for(const e of edges) if(e.live) {
        const p=points[e.a],q=points[e.b],dx=q.x-p.x,dy=q.y-p.y,dist=Math.hypot(dx,dy)||.001;
        const wp= p.pin || e.a===held ? 0 : 1, wq=q.pin || e.b===held ? 0 : 1;
        const d=(dist-e.rest)/(dist*(wp+wq||1));
        p.x+=wp*d*dx;p.y+=wp*d*dy;q.x-=wq*d*dx;q.y-=wq*d*dy;
      }
      for(const p of points) if(!p.pin){p.y=Math.min(H-10,p.y);p.x=Math.max(4,Math.min(W-4,p.x));}
    }
    function draw() {
      const bg=ctx.createLinearGradient(0,0,W,H); bg.addColorStop(0,"#102821");bg.addColorStop(.55,"#1c342b");bg.addColorStop(1,"#0c1e19");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#78948144";for(let x=12;x<W;x+=24) for(let y=12;y<H;y+=24) ctx.fillRect(x,y,1.3,1.3);
      ctx.lineCap="round";ctx.lineJoin="round";
      for(const e of edges) if(e.live){
        const a=points[e.a],b=points[e.b],k=.5+.5*Math.sin(a.i*.17+a.j*.12+Math.sin(a.j*.22)), strain=Math.min(1,Math.max(0,(Math.hypot(a.x-b.x,a.y-b.y)/e.rest-1)*3));
        const hue=e.weft?71:129,sat=e.weft?36:21,light=(e.weft?39:29)+k*(e.weft?32:30);
        const dx=b.x-a.x,dy=b.y-a.y, s=((a.i+a.j)%2?1:-1)*(e.weft?1.75:2.25);
        ctx.strokeStyle=strain>.38?"hsl("+Math.round(50-30*strain)+" 58% 65%)":"hsl("+hue+" "+sat+"% "+light+"%)";
        ctx.lineWidth=e.weft?2.9:2.4;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2-dy/step*s,(a.y+b.y)/2+dx/step*s,b.x,b.y);ctx.stroke();
      }
      for(const p of points) if(p.pin){ctx.beginPath();ctx.arc(p.x,p.y,3.3,0,2*Math.PI);ctx.fillStyle="#edf5ce";ctx.fill()}
    }
    function stats() {config.onStats?.({torn,candidates,found,indexMs,queryMs,measured,rebuilt,points:points.length,edges:edges.length});}
    function frame(t) {
      if(!running)return;
      if(!paused){
        accumulator+=Math.min(42,t-(last||t));
        while(accumulator>=1000/30){simulate();accumulator-=1000/30}
        if(t-(frame.lastDraw||0)>30){draw();frame.lastDraw=t}
      }
      last=t;raf=requestAnimationFrame(frame);
    }
    function query(x,y,r,action,strategy){
      const list=action==="cut"?edges:points, isEdge=action==="cut", size=32;
      const at=(i)=>{const v=list[i];return isEdge?[(points[v.a].x+points[v.b].x)/2,(points[v.a].y+points[v.b].y)/2]:[v.x,v.y]};
      const key=(bx,by)=>bx+","+by;
      let bins=spatialIndices.get(action),build=0,built=false;
      if(strategy==="grid"&&!bins){const start=performance.now();bins=new Map();built=true;for(let i=0;i<list.length;i++){if(isEdge&&!list[i].live)continue;const [px,py]=at(i),k=key(Math.floor(px/size),Math.floor(py/size));if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i)}build=performance.now()-start;spatialIndices.set(action,bins)}
      const qstart=performance.now(), hits=[];let count=0;
      function test(i){if(isEdge&&!list[i].live)return;count++;const [px,py]=at(i),d=(x-px)**2+(y-py)**2;if(d<=r*r)hits.push([d,i])}
      if(strategy==="grid"){for(let by=Math.floor((y-r)/size);by<=Math.floor((y+r)/size);by++)for(let bx=Math.floor((x-r)/size);bx<=Math.floor((x+r)/size);bx++)for(const i of bins.get(key(bx,by))||[])test(i)}
      else{for(let i=0;i<list.length;i++)test(i)}
      hits.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);return {hits,count,build,built,time:performance.now()-qstart};
    }
    function pick(x,y){const q=query(x,y,mode==="cut"?12:24,mode,method);candidates=q.count;found=q.hits.length;indexMs=q.build;queryMs=q.time;measured=true;rebuilt=q.built;
      if(mode==="cut"){for(const [,i] of q.hits){edges[i].live=false;torn++}if(q.hits.length)spatialIndices.delete("cut")}else{held=q.hits.find(([,i])=>!points[i].pin)?.[1]??-1}stats()}
    function eventXY(e){const rect=canvas.getBoundingClientRect();return [(e.clientX-rect.left)*W/rect.width,(e.clientY-rect.top)*H/rect.height]}
    if(!hero){
      canvas.onpointerdown=e=>{if(!e.isPrimary||e.button!==0)return;canvas.setPointerCapture(e.pointerId);down=true;pick(...eventXY(e));draw()};
      canvas.onpointermove=e=>{if(!down)return;const [x,y]=eventXY(e);if(mode==="cut")pick(x,y);else if(held>=0){Object.assign(points[held],{x,y,px:x,py:y});spatialIndices.clear()}draw()};
      canvas.onpointerup=canvas.onpointercancel=()=>{down=false;held=-1};
    }
    reset();raf=requestAnimationFrame(frame);
    return {isPaused:()=>paused,destroy(){running=false;cancelAnimationFrame(raf)}, reset, toggle(){paused=!paused;return paused},
      setMode(s){mode=s;held=-1},setMethod(s){method=s},cutCenter(){const p=points[(rows>>1)*cols+(cols>>1)];const prev=mode;mode="cut";pick(p.x,p.y);mode=prev;draw()},
      compare(){let ok=0,scan=0,bins=0,tests=0;for(const action of ["cut","pull"])for(let i=0;i<35;i++){const x=80+(i*71)%565,y=40+(i*37)%295;const a=query(x,y,16,action,"scan"),b=query(x,y,16,action,"grid");scan+=a.count;bins+=b.count;tests++;if(JSON.stringify(a.hits)===JSON.stringify(b.hits))ok++}return {ok,scan,bins,tests}}};
  }
  return {cloth};
})();
