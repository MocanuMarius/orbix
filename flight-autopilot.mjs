// Runtime autopilot for test flights (stress scene, ?autopilot=1 dev flag). Never on for players.
// The safe-band idea comes from scripts/balance-current-flight.mjs (used by scripts/course-design/pilot-courses.mjs):
// rock is sliced at a point ahead of the wisp, the open vertical bands are kept, and the wisp is steered to the band
// holding the next Spark. Without that script's look-ahead search, so the pilot costs almost nothing per step
// (bands are recomputed at 10 Hz). It moves the wisp directly; Lifts are still sent at an even pace so Rhythm and
// Lift cards fire. Optional invulnerability ignores hits and deaths and keeps the meter up.
import {obstaclePolygons} from './flight.mjs?v=spring-1';

const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function subtract(blocked,height){blocked.sort((a,b)=>a[0]-b[0]);let low=29;const bands=[];
  for(const [a,b] of blocked){if(b<low)continue;if(a>low)bands.push([low,Math.min(a,height-30)]);low=Math.max(low,b);if(low>=height-30)break;}
  if(low<height-30)bands.push([low,height-30]);return bands.filter(([a,b])=>b-a>2);}
/** Open vertical bands at world x (conservative: rock widened by the radius). */
export function safeBands(polygons,x,height,radius=14){
  const blocked=[];
  for(const poly of polygons)for(const sx of [x-radius,x,x+radius]){const cuts=[];
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[j],b=poly[i];if((a[0]>sx)!==(b[0]>sx))cuts.push(a[1]+(b[1]-a[1])*(sx-a[0])/(b[0]-a[0]));}
    cuts.sort((a,b)=>a-b);for(let i=0;i+1<cuts.length;i+=2)blocked.push([cuts[i]-radius,cuts[i+1]+radius]);}
  return subtract(blocked,height);
}
/** One steering update (call after each simulation step). */
export function steer(e,memory){
  const world=e.distance+e.player.x;
  if(memory.bandsAt===undefined||e.time-memory.bandsAt>=.1||e.time<memory.bandsAt){
    memory.bandsAt=e.time;const ahead=world+60,polys=[];
    for(const o of e.getNearbyObstacles?.()||[]){if(o.destroyed||o.x-o.width*.8>ahead+30||o.x+o.width*2.5<ahead-30)continue;polys.push(...obstaclePolygons(o,e.time));}
    memory.bands=safeBands(polys,ahead,e.height);
    let target=null,best=Infinity;
    for(const p of e.getNearbyPickups?.()||[]){if(p.collected||p.harmful||p.x<world+8||p.x>world+240)continue;if(p.x-world<best){best=p.x-world;target=p.y;}}
    memory.target=target;
  }
  const bands=memory.bands?.length?memory.bands:[[40,e.height-40]];
  const want=memory.target??e.player.y;let band=bands[0],gap=Infinity;
  for(const b of bands){const d=want<b[0]?b[0]-want:want>b[1]?want-b[1]:0;if(d<gap){gap=d;band=b;}}
  const pad=Math.min(16,(band[1]-band[0])/2),y=clamp(want,band[0]+pad,band[1]-pad);
  e.player.y+=(y-e.player.y)*.14;e.player.vy*=.5;
}
/** Wraps engine.step. Returns {stats, detach()}. */
export function attachAutopilot(engine,{invulnerable=true,liftEvery=.36,keepMeter=.6,onStep=null}={}){
  const e=engine,stats={lifts:0,hitsIgnored:0},memory={};let liftAt=0,beat=0;
  const step=e.step,hit=e.hit,dying=e.beginDying;
  if(invulnerable){e.hit=()=>{stats.hitsIgnored++;};e.beginDying=()=>{};}
  e.step=function(dt){
    const r=step.call(this,dt);
    if(!this.running||this.finished||this.paused)return r;
    try{
      steer(this,memory);
      if(invulnerable&&keepMeter)this.flame=Math.max(this.flame,(this.maxFlame||100)*keepMeter);
      if(liftEvery>0){liftAt+=dt;if(liftAt>=liftEvery){liftAt=0;beat=(beat+1)%4;if(beat&&!this.tutorialAwaitingLift){try{if(this.beginLiftInput?.()){this.endLiftInput?.();stats.lifts++;}}catch{}}}}
      onStep?.(this,dt);
    }catch(error){stats.error=String(error?.message||error);}
    return r;
  };
  return {stats,memory,detach(){e.step=step;e.hit=hit;e.beginDying=dying;}};
}
/** Dev flag: ?autopilot=1 in the page URL. */
export function autopilotWanted(location=globalThis.location){try{return new URLSearchParams(location?.search||'').get('autopilot')==='1';}catch{return false;}}
/** Frame statistics from rAF gaps (ms). */
export function summarizeFrames(gaps){
  const n=gaps.length;if(!n)return {frames:0,avgFps:0,low1Fps:0,minFps:0,over33:0,over50:0,longestMs:0,p50Ms:0,p95Ms:0,p99Ms:0};
  let sum=0,longest=0,over33=0,over50=0;for(const g of gaps){sum+=g;if(g>longest)longest=g;if(g>33.4)over33++;if(g>50)over50++;}
  const sorted=Float64Array.from(gaps).sort(),worst=sorted.slice(Math.max(0,n-Math.ceil(n/100)));let w=0;for(const g of worst)w+=g;
  return {frames:n,avgFps:+(1000*n/sum).toFixed(1),low1Fps:+(1000*worst.length/w).toFixed(1),minFps:+(1000/longest).toFixed(1),over33,over50,longestMs:Math.round(longest),p50Ms:+sorted[Math.floor(n*.5)].toFixed(1),p95Ms:+sorted[Math.min(n-1,Math.floor(n*.95))].toFixed(1),p99Ms:+sorted[Math.min(n-1,Math.floor(n*.99))].toFixed(1)};
}
/** Dev flag entry (app.mjs, ?autopilot=1): fly this flight by itself and record its frames. */
export function attachDevAutopilot(engine,win=globalThis){const pilot=attachAutopilot(engine);recordFlightFrames(engine,{win});return pilot;}
/** Records rAF frame gaps of one flight; pushes a summary to window.__autopilotFlights when it ends. */
export function recordFlightFrames(engine,{win=globalThis,summarize=summarizeFrames}={}){
  const gaps=[];let last=0,raf=0,done=false;
  const frame=t=>{if(done)return;if(engine.running&&!engine.paused&&!engine.tutorialAwaitingLift){if(last)gaps.push(t-last);last=t;}else last=0;
    if(engine.finished||engine.destroyed){done=true;const list=win.__autopilotFlights??=[];list.push({level:engine.levelIdentity?.id||engine.terrain,seconds:+(engine.time||0).toFixed(1),...summarize(gaps)});return;}
    raf=win.requestAnimationFrame(frame);};
  raf=win.requestAnimationFrame(frame);
  return ()=>{done=true;win.cancelAnimationFrame(raf);};
}
