// Built-in STRESS TEST flight (owner request, 18 November 2026): one fixed, deterministic worst-case scene used by
// scripts/perf/heavy.mjs, by the Android emulator script and by the owner on the phone.
//   Open:  ?scene=stress (a plain confirm first; ?scene=stress&go=1 skips it for scripts), or Settings > Advanced > Stress test.
//   Result: a paused panel (average FPS, 1% low, lowest FPS, frames over 33/50 ms, longest frame, renderer, DPR,
//           viewport, version), window.__stressResult and one console line.
// It flies itself (autopilot below, ported from the safe-band idea in scripts/balance-current-flight.mjs used by
// scripts/course-design/pilot-courses.mjs, without its look-ahead search so the pilot costs almost nothing), cannot be
// lost (hits and deaths are ignored, the meter is kept up), and never touches the run or the save: it builds its own
// WispFlight from a local run object, writes no storage, gives no rewards and starts no tutorial.
import {WispFlight} from './flight.mjs?v=fast-5';
import {attachAutopilot} from './flight-autopilot.mjs?v=fast-5';
import {BIOME_LEVELS} from './biomes.mjs?v=fast-5';
import {getRunModifiers} from './model.mjs?v=fast-5';
import {CARD_SYSTEM,makeSkillCard} from './skill-cards.mjs?v=fast-5';
import {createFpsCounter} from './fps-counter.mjs?v=fast-5';
import {createCardRowFeedback} from './card-row-feedback.mjs?v=fast-5';

// Phases: 10 s ramp (the build on its own), 35 s peak (Flares back to back, card Pulses every 0.25 s on top of
// Rhythm, Bell and Spillway, Black Hole, Guardian), 10 s tail (injections stop).
export const STRESS_SCENE=Object.freeze({
  id:'stress-v1',seed:'stress-v1',biome:'marsh',course:3,
  ramp:10,peak:35,tail:10,warmup:1,
  // A full Chain (5 slots, the engine's maximum): Rhythm (Lifts -> Pulse), Spillway II (Overfill -> Pulse),
  // Echo III repeating Resonant Harvest (Pulse crossings), Twin Orbit (two Collectors, Deliveries).
  cards:['rhythm','spillway-ii','echo-iii','harvest-legendary','twin-orbit'],
  inscriptions:['bell','resonant','twin-mark','kindled','lodestone'],
  sparkCopies:3,flareEvery:3.5,pulseEvery:.25,liftEvery:.36,blackHoleAt:22,guardianAt:33,
});
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

/** The scene's local run and node: no save, no profile, nothing shared with the game state. */
export function stressSceneConfig(scene=STRESS_SCENE){
  const level=BIOME_LEVELS.filter(l=>l.biomeId===scene.biome)[scene.course]||BIOME_LEVELS[0];
  const run={skillSystem:CARD_SYSTEM,cardSlots:scene.cards.length,companions:['collector'],companionRole:'collector',skills:{},
    mountedCards:scene.cards.map((id,i)=>makeSkillCard(id,`stress:${i}`)),slotInscriptions:scene.inscriptions.map(id=>id?{id}:null),reserveCards:[]};
  const duration=scene.ramp+scene.peak+scene.tail+8;
  const node={...level,id:'stress-scene',levelId:level.id,type:'finale',row:6,mapIndex:1,difficulty:3,duration,nextIds:[],
    boss:true,bossId:'hollow-sun',blackHoleEncounter:'giant',stressScene:true};
  return {level,run,node,duration};
}

/** Creates the engine (no start). Works with any canvas-like object (tests pass a stub). */
export function createStressEngine(canvas,{scene=STRESS_SCENE,reducedMotion=false}={}){
  const {run,node,duration}=stressSceneConfig(scene);
  const engine=new WispFlight({canvas,seed:scene.seed,terrain:node.terrain,duration,node,flame:100,lives:3,maxLives:3,
    companions:['collector'],companionRole:'collector',skills:{},cards:[],cardPilot:true,reducedMotion,
    modifiers:{...getRunModifiers(run),cardPilot:true},onUpdate:()=>{},onFinish:()=>{},onPause:()=>{}});
  engine.setMuted?.(true);
  return engine;
}

export {safeBands} from './flight-autopilot.mjs?v=fast-5';

/** Attaches the timeline, autopilot and invulnerability to an engine. Returns {phase(), stats}. */
export function scriptStressScene(engine,scene=STRESS_SCENE){
  const e=engine,stats={flares:0,pulses:0,jumps:[]},memory={};
  // Copies of every fuel Spark: a dense field of Sparks and Clusters.
  const src=(e.layout?.embers||[]).filter(p=>!p.harmful&&['light','cluster','cache','dusk'].includes(p.kind)),add=[];
  for(const p of src)for(let i=1;i<=scene.sparkCopies;i++)add.push({...p,id:`${p.id}-stress${i}`,x:p.x+i*17,y:clamp(p.y+(i%2?-14:14),30,e.height-30),collected:false,feature:undefined,anchor:null});
  if(e.layout?.embers){e.layout.embers.push(...add);e.layout.embers.sort((a,b)=>a.x-b.x);e._pickupCount=-1;e._nearbyPacketsUntil=-1;}
  let pulseAt=0,flareAt=scene.flareEvery;
  const phase=()=>e.time<scene.ramp?'ramp':e.time<scene.ramp+scene.peak?'peak':'tail';
  const jump=x=>{if(!Number.isFinite(x))return;e.distance=e.previousDistance=Math.max(e.distance,x-e.player.x);stats.jumps.push(Math.round(x));};
  const pilot=attachAutopilot(e,{invulnerable:true,liftEvery:scene.liftEvery,keepMeter:.6,onStep(engine,dt){
    if(phase()!=='peak')return;
    pulseAt+=dt;if(pulseAt>=scene.pulseEvery){pulseAt=0;stats.pulses++;engine.luminanceWaves?.emit({x:engine.distance+engine.player.x,y:engine.player.y,radius:260,source:'card',sourceKind:'card'});}
    flareAt+=dt;if(flareAt>=scene.flareEvery){flareAt=0;stats.flares++;engine.collect({id:`stress-flare-${stats.flares}`,kind:'sight',x:engine.distance+engine.player.x+24,y:engine.player.y,phase:stats.flares,collected:false});}
    if(!memory.hole&&engine.time>=scene.blackHoleAt){memory.hole=true;const h=engine.blackHoles?.items?.find(h=>h.x>engine.distance+engine.player.x);if(h)jump(h.x-520);}
    if(!memory.boss&&engine.time>=scene.guardianAt){memory.boss=true;const b=engine.layout?.boss;jump(b&&(b.start??b.x??b.rooms?.[0]?.start)-260);}
  }});
  Object.defineProperty(stats,'lifts',{get:()=>pilot.stats.lifts,enumerable:true});
  Object.defineProperty(stats,'hitsIgnored',{get:()=>pilot.stats.hitsIgnored,enumerable:true});
  Object.defineProperty(stats,'error',{get:()=>pilot.stats.error,enumerable:true});
  return {phase,stats};
}

// ---- results --------------------------------------------------------------------------------------------------
export {summarizeFrames} from './flight-autopilot.mjs?v=fast-5';
import {summarizeFrames} from './flight-autopilot.mjs?v=fast-5';
const version=()=>{try{return new URL(import.meta.url).searchParams.get('v')||'dev';}catch{return 'dev';}};
export function stressSummaryLine(r){
  return `Wispbound stress ${r.scene} · ${r.avgFps} fps avg · 1% low ${r.low1Fps} · min ${r.minFps} · >33ms ${r.over33} · >50ms ${r.over50} · longest ${r.longestMs} ms · peak ${r.phases?.peak?.avgFps??'-'} fps · ${r.renderer} · DPR ${r.dpr} · ${r.viewport} · ${r.version}`;
}

// ---- in-page runner -------------------------------------------------------------------------------------------
const STYLE=`
.stress-host{position:fixed;inset:0;z-index:2147483000;background:#000;overflow:hidden}
.stress-host .canvas-wrap{position:absolute;inset:0}
.stress-host .canvas-wrap>canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.stress-tag{position:absolute;right:max(8px,env(safe-area-inset-right));top:max(6px,env(safe-area-inset-top));z-index:6;font:10px/1 var(--pixel,monospace);color:#dfe6c9;background:#0c1e17b8;padding:3px 5px;pointer-events:none}
.stress-panel,.stress-confirm{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:8;box-sizing:border-box;width:min(560px,calc(100vw - 24px));max-height:calc(100vh - 16px);overflow:hidden;padding:10px 14px;background:#10271df2;border:1px solid #8da37a;color:#dfe6c9;font:12px/1.3 var(--pixel,monospace)}
.stress-panel h2,.stress-confirm h2{margin:0 0 6px;font-size:14px}
.stress-panel dl{display:grid;grid-template-columns:repeat(4,auto 1fr);gap:2px 8px;margin:0 0 8px}
.stress-panel dt{opacity:.75}.stress-panel dd{margin:0;font-weight:bold}
.stress-panel .stress-wide{grid-column:2/-1;font-weight:normal;font-size:11px}
.stress-actions{display:flex;gap:8px;flex-wrap:wrap}
.stress-actions button{min-height:36px;padding:0 12px}
@media(max-height:330px){.stress-panel,.stress-confirm{padding:6px 10px;font-size:11px}.stress-panel dl{gap:1px 6px;margin-bottom:5px}.stress-actions button{min-height:32px}}`;
function el(document,tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function ensureStyle(document){if(!document.getElementById('stress-scene-style')){const s=el(document,'style');s.id='stress-scene-style';s.textContent=STYLE;document.head.append(s);}}

/** Runs the scene once in a full-screen layer. Resolves with the result object (also on window.__stressResult). */
export async function runStressScene({document=globalThis.document,host=null,scene=STRESS_SCENE}={}){
  ensureStyle(document);
  const win=document.defaultView||globalThis;
  host??=document.querySelector('.stress-host')||document.body.appendChild(el(document,'div','stress-host flight-device'));
  host.replaceChildren();host.setAttribute('aria-label','Stress test flight');
  const wrap=host.appendChild(el(document,'div','canvas-wrap')),canvas=wrap.appendChild(el(document,'canvas'));
  const tag=host.appendChild(el(document,'div','stress-tag','STRESS TEST'));tag.setAttribute('aria-hidden','true');
  const hadPlaying=document.body.classList.contains('playing');document.body.classList.add('playing','stress-running');
  win.__stressResult=null;
  const engine=createStressEngine(canvas,{scene});
  win.__stressEngine=engine; // perf scripts (scripts/perf/calls.mjs) count and compare frames of the live scene
  const fps=createFpsCounter(host,{enabled:true});
  const strip=createCardRowFeedback(host,{onInspect:()=>{}});strip.attach(engine);
  engine.onUpdate=s=>strip.update(s);
  const script=scriptStressScene(engine,scene);
  const baseRender=engine.render;engine.render=function(){fps.frame(performance.now());return baseRender.apply(this,arguments);};
  await engine.ready;
  const gaps=[],phases={ramp:[],peak:[],tail:[]};let last=0,raf=0,stopped=false,hiddenMs=0,pausedFrames=0,resumes=0;
  const total=scene.ramp+scene.peak+scene.tail;
  const result=await new Promise(resolve=>{
    const finish=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(raf);resolve();};
    engine.onFinish=finish;
    // Frames while the page is hidden (or the engine paused) are not counted.
    const frame=t=>{if(stopped)return;if(document.visibilityState==='hidden'||engine.paused){hiddenMs+=last?t-last:0;last=0;
      // The engine pauses itself when the page is hidden or the screen turns; the test resumes on its own.
      if(engine.paused&&document.visibilityState!=='hidden'){pausedFrames++;if(pausedFrames>20){pausedFrames=0;resumes++;try{engine.resume();}catch{}}}
      raf=requestAnimationFrame(frame);return;}if(last&&engine.time>=scene.warmup){const g=t-last;gaps.push(g);phases[script.phase()].push(g);}last=t;
      if(engine.time>=total||engine.finished||engine.destroyed)return finish();raf=requestAnimationFrame(frame);};
    engine.start();raf=requestAnimationFrame(frame);
  }).then(()=>{
    const view=engine.pixiView,gpuFrames=view?.lightGpu?.stats?.frames||0,renderer=engine.pixiReady&&view?(gpuFrames>0?(view.lightGpu.stats.fallbacks?'WebGL lighting (some Canvas 2D frames)':'WebGL lighting'):'Canvas 2D fallback'):'Canvas 2D (basic)';
    const r={scene:scene.id,...summarizeFrames(gaps),seconds:+(gaps.reduce((a,b)=>a+b,0)/1000).toFixed(1),hiddenMs:Math.round(hiddenMs),resumes,
      phases:Object.fromEntries(Object.entries(phases).map(([k,v])=>[k,summarizeFrames(v)])),
      renderer,dpr:+(win.devicePixelRatio||1).toFixed(3),viewport:`${win.innerWidth}x${win.innerHeight}`,
      buffer:view?.buffer?`${view.buffer.width}x${view.buffer.height}`:null,version:version(),
      load:{...script.stats,cards:(engine.cardExecution?.cards||[]).map(c=>c?.cardId||null),inscriptions:(engine.cardExecution?.inscriptions||[]).map(i=>i?.id||null),collectors:engine.collectors?.length||1,guardian:engine.layout?.boss?.id||null,blackHoles:engine.blackHoles?.items?.length||0},
      gpu:view?.lightGpu?.stats?{...view.lightGpu.stats}:null,userAgent:win.navigator?.userAgent||''};
    r.summary=stressSummaryLine(r);return r;
  });
  engine.pause?.();
  try{engine.render();}catch{}
  win.__stressResult=result;console.log('[stress]',result.summary,result);
  host.__stress={engine,fps,strip,hadPlaying};
  return result;
}
function teardown(document,host){
  const s=host?.__stress;if(s){s.fps.destroy();s.strip.destroy();s.engine.destroy();if(!s.hadPlaying)document.body.classList.remove('playing');}
  document.body.classList.remove('stress-running');host?.remove();
}
function showPanel(document,host,result,{onAgain,onClose}){
  const panel=host.appendChild(el(document,'section','stress-panel'));panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Stress test result');
  panel.append(el(document,'h2',null,'Stress test result'));
  const dl=panel.appendChild(el(document,'dl'));
  const row=(k,v,wide)=>{dl.append(el(document,'dt',null,k));const d=el(document,'dd',wide?'stress-wide':null,String(v));dl.append(d);};
  row('Average',`${result.avgFps} FPS`);row('1% low',`${result.low1Fps} FPS`);row('Lowest',`${result.minFps} FPS`);row('Longest',`${result.longestMs} ms`);
  row('Over 33 ms',result.over33);row('Over 50 ms',result.over50);row('Peak avg',`${result.phases.peak.avgFps} FPS`);row('Frames',result.frames);
  row('Renderer',`${result.renderer} · DPR ${result.dpr} · ${result.viewport} · ${result.version}`,true);
  const actions=panel.appendChild(el(document,'div','stress-actions'));
  const again=actions.appendChild(el(document,'button',null,'Run again')),copy=actions.appendChild(el(document,'button','secondary','Copy result')),close=actions.appendChild(el(document,'button','secondary','Close'));
  for(const b of [again,copy,close])b.type='button';
  again.addEventListener('click',onAgain);close.addEventListener('click',onClose);
  copy.addEventListener('click',async()=>{let ok=false;try{await document.defaultView.navigator.clipboard.writeText(result.summary);ok=true;}catch{}
    if(!ok){try{const t=el(document,'textarea');t.value=result.summary;document.body.append(t);t.select();ok=document.execCommand('copy');t.remove();}catch{}}
    copy.textContent=ok?'Copied':'Copy failed';});
  again.focus?.();
}
/** Plain confirm, then run; the result panel offers Run again / Copy result / Close. */
export function openStressScene({document=globalThis.document,confirm=true,onClose=()=>{}}={}){
  ensureStyle(document);
  for(const d of document.querySelectorAll('dialog[open]'))try{d.close();}catch{}
  const host=document.querySelector('.stress-host')||document.body.appendChild(el(document,'div','stress-host flight-device'));
  const close=()=>{teardown(document,host);onClose();};
  const start=async()=>{host.replaceChildren();const result=await runStressScene({document,host});showPanel(document,host,result,{onAgain:()=>{teardown(document,host);openStressScene({document,confirm:false,onClose});},onClose:close});};
  if(!confirm){start();return host;}
  const box=host.appendChild(el(document,'section','stress-confirm'));box.setAttribute('role','dialog');box.setAttribute('aria-label','Stress test');
  box.append(el(document,'h2',null,'Stress test'),el(document,'p',null,'Runs a 1-minute performance test. Your run is not affected.'));
  const actions=box.appendChild(el(document,'div','stress-actions')),go=actions.appendChild(el(document,'button',null,'Start')),no=actions.appendChild(el(document,'button','secondary','Cancel'));
  go.type=no.type='button';go.addEventListener('click',start);no.addEventListener('click',close);go.focus?.();
  return host;
}
/** URL entry: ?scene=stress (confirm) or ?scene=stress&go=1. Returns true when the scene was opened. */
export function openStressSceneFromUrl({document=globalThis.document,location=globalThis.location}={}){
  const q=new URLSearchParams(location?.search||'');if(q.get('scene')!=='stress')return false;
  openStressScene({document,confirm:q.get('go')!=='1',onClose:()=>{try{q.delete('scene');q.delete('go');const s=q.toString();document.defaultView.history.replaceState(null,'',location.pathname+(s?'?'+s:'')+location.hash);}catch{}}});
  return true;
}
