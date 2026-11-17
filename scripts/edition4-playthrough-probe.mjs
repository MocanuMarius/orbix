// Headless playthrough of First Light Edition 4 at phone landscape sizes.
// A throwaway Chrome profile and a private static server for dist/ are used.
// A simple pilot flies every course (altitude tracking toward the next pickup on
// the real terrain's free band); lesson cards are read for READ_MS of wall time
// and closed with their own button. Every animation frame is checked for lesson
// text while simulated time advances.
//
//   node scripts/edition4-playthrough-probe.mjs [--sizes=900x405,667x300] [--read=1200]
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome,until,delay} from './browser-probe.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')||true];}));
const sizes=String(args.sizes||'900x405,667x300').split(',').map(s=>s.split('x').map(Number));
const READ_MS=Number(args.read||1200),ASSUMED_READING=4;
const root=path.resolve('dist'),out=path.resolve(args.out||'outputs/tutorial');await fs.mkdir(out,{recursive:true});
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json','.webmanifest':'application/manifest+json','.mp4':'video/mp4','.webm':'video/webm','.ogg':'audio/ogg','.wav':'audio/wav'};
const failed=[];
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname.includes('__dev-revision')){res.writeHead(204).end();return;}const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root))throw Error('outside');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{failed.push(req.url);res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;

const INSTRUMENT=`(async()=>{
 const F=await import('./flight.mjs?v=guide-clarity-1'),PC=await import('./practice-course.mjs?v=guide-clarity-1');
 const start=F.WispFlight.prototype.start;F.WispFlight.prototype.start=function(...a){window.__e=this;return start.apply(this,a)};
 const visible=n=>!!n&&n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]');
 const T=window.__timeline={events:[],violations:[],eventBanner:[],frames:0,advancing:0};
 let lastTime=null,lastCoach=null,lastEngine=null,flightNode=null,started=false,lastLift=-9,bandCache=new Map();
 const band=(e,x)=>{const k=Math.round(x/12);if(!bandCache.has(k))bandCache.set(k,PC.freeBand(e,k*12));return bandCache.get(k);};
 const coachInfo=()=>{const c=document.querySelector('.tutorial-coach');const card=c?.querySelector('.tutorial-coach-card');if(!visible(card))return null;return {id:c.dataset.step,title:card.querySelector('h2').textContent,text:card.querySelector('p').textContent};};
 const loop=()=>{
  const e=window.__e,coach=coachInfo();T.frames++;
  if(e!==lastEngine){lastEngine=e;lastTime=null;started=false;bandCache=new Map();flightNode=e?.options?.node?.id||null;}
  if(e){
   const adv=lastTime!==null&&e.time>lastTime+1e-9;if(adv)T.advancing++;
   if(adv&&!started){started=true;T.events.push({type:'flight-start',node:flightNode,t:+(lastTime).toFixed(3),wall:performance.now()});}
   // Text already visible in the previous frame while time advanced, or visible over an unpaused engine.
   if(adv&&coach&&lastCoach)T.violations.push({node:flightNode,t:e.time,coach:coach.title});
   if(adv&&coach&&!lastCoach)(T.openedOnStoppedFrame||=[]).push({node:flightNode,t:e.time,coach:coach.title,enginePausedNow:e.paused});
   if(coach&&!e.paused&&!e.tutorialAwaitingLift&&!e.finished)T.violations.push({node:flightNode,t:e.time,coach:coach.title,unpaused:true});
   const evt=document.querySelector('#flight-event');if(adv&&visible(evt)&&evt.textContent.trim())T.eventBanner.push({node:flightNode,t:e.time,text:evt.textContent.trim()});
   if((e.finished||e.completing)&&started&&!T.events.some(x=>x.type==='flight-end'&&x.node===flightNode&&x.engineId===e.__id)){e.__id??=Math.random();T.events.push({type:'flight-end',node:flightNode,engineId:e.__id,t:+e.time.toFixed(3),success:!e.dying,wall:performance.now()});}
   if(e.dying&&!e.__deathLogged){e.__deathLogged=true;T.events.push({type:'death',node:flightNode,t:+e.time.toFixed(2),cause:e.deathCause,flame:+e.flame.toFixed(1),y:+e.player.y.toFixed(0)});}
   lastTime=e.time;
   if(window.__pilot&&e.tutorialAwaitingLift&&!e.paused&&!coach&&!document.querySelector('#pause-layer')?.children.length){e.beginLiftInput();e.endLiftInput();lastLift=e.time;}
   // Pilot: track the next pickup's height inside the real free band.
   if(window.__pilot&&!e.paused&&!e.dying&&!e.completing&&!e.finished&&!e.tutorialAwaitingLift&&!coach){
    const wx=e.distance+e.player.x,speed=e.baseSpeed||154;let target=null;
    for(const p of e.layout.embers){if(p.collected||p.carried||p.stagedMiss)continue;const dx=p.x-wx;if(dx<8)continue;if(dx>speed*1.5)break;target=p;break;}
    const ahead=band(e,target?target.x:wx+speed*.7),near=band(e,wx+30);
    let ty=target?target.y:(ahead?.mid??e.height*.5);
    if(target?.skimLane&&ahead)ty+=Math.sign(ahead.mid-ty)*4;
    if(ahead)ty=Math.min(Math.max(ty,ahead.top+12),ahead.bottom-12);
    if(near)ty=Math.min(Math.max(ty,near.top+16),near.bottom-16);
    if(e.player.y>ty+4&&e.player.vy>-70&&e.time-lastLift>.26){e.beginLiftInput();e.endLiftInput();lastLift=e.time;}
   }
  }
  const key=coach?coach.id+'|'+coach.title:null;
  if(key!==lastCoach){if(coach)T.events.push({type:'lesson-open',node:e?.options?.node?.id||null,id:coach.id,title:coach.title,text:coach.text,words:coach.text.trim().split(/\\s+/).length,t:e?+e.time.toFixed(3):null,enginePaused:e?e.paused:null,awaitingLift:e?.tutorialAwaitingLift??null,screen:document.body.dataset.screen,wall:performance.now()});
   else T.events.push({type:'lesson-close',t:e?+e.time.toFixed(3):null,wall:performance.now()});lastCoach=key;}
  requestAnimationFrame(loop);
 };requestAnimationFrame(loop);return true;})()`;

const report={capturedAt:new Date().toISOString(),readingAssumedSeconds:ASSUMED_READING,sizes:{}};
if(args.merge){try{Object.assign(report.sizes,JSON.parse(await fs.readFile(path.join(out,'edition4-timeline.json'),'utf8')).sizes);}catch{}}
for(const [W,H] of sizes){
 const b=await chrome();
 const tag=`${W}x${H}`;
 try{
  await b.send('Page.addScriptToEvaluateOnNewDocument',{source:"window.__errors=[];addEventListener('error',e=>__errors.push(String(e.message||e)));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));const ce=console.error;console.error=(...a)=>{__errors.push(a.map(String).join(' '));ce.apply(console,a);};"});
  await b.send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:1,mobile:true});
  await b.visit(base+'/game.html?cards=1&display=native');
  await until(()=>b.ev("!!document.querySelector('[data-action=tutorial]')"),'home');
  await b.ev(INSTRUMENT);
  await b.ev("document.querySelector('[data-action=tutorial]').click()");
  const t0=Date.now(),shots=new Set(),courseShots=new Set();let lastAction='',guard=0,campDone=false;
  const click=sel=>b.ev(`(()=>{const n=[...document.querySelectorAll(${JSON.stringify(sel)})].find(n=>n.getClientRects().length);if(!n)return false;n.click();return true;})()`);
  const exists=sel=>b.ev(`!![...document.querySelectorAll(${JSON.stringify(sel)})].find(n=>n.getClientRects().length)`);
  // A rare headless CDP call never returns; never let one stall the drive.
  let timeouts=0;const timed=(p,ms=6000)=>{let done=false;return Promise.race([p.then(v=>{done=true;return v;}),delay(ms).then(()=>{if(!done)timeouts++;return null;})]);};
  const rawEv=b.ev;b.ev=x=>timed(rawEv(x).catch(()=>null));
  const shot=async name=>{await timed(b.shot(path.join(out,`${tag}-${name}.png`)),10000);};
  await b.ev('window.__pilot=true');
  while(Date.now()-t0<12*60*1000&&guard++<20000){
   await delay(100);
   const st=await b.ev(`(()=>{const e=window.__e,c=document.querySelector('.tutorial-coach');const vis=n=>!!n&&n.getClientRects().length>0&&!n.closest('[hidden]');
    return {coach:vis(c?.querySelector('.tutorial-coach-card'))?{id:c.dataset.step,title:c.querySelector('h2').textContent}:null,screen:document.body.dataset.screen,
     result:vis(document.querySelector('[data-action=leave-practice]')),chainSheet:vis(document.querySelector('dialog.practice-deck-sheet[open]')),
     layer:(document.querySelector('#pause-layer')?.innerHTML||'').slice(0,300),t:e?e.time:null,node:e?.options?.node?.id||null,running:e&&!e.paused&&!e.finished&&!e.tutorialAwaitingLift}})()`);
   if(!st)continue;
   if(args.debug){const k=JSON.stringify({...st,t:st.t&&Math.floor(st.t)});if(k!==lastAction){lastAction=k;console.log(((Date.now()-t0)/1000).toFixed(1),k);}}
   if(st.result){await shot('result-practice-complete');break;}
   if(st.coach){
    const name=`lesson-${st.coach.id.replace(/[^a-z0-9-]+/gi,'_')}`;
    if(!shots.has(name)){shots.add(name);await delay(250);await shot(name);await delay(READ_MS);}
    // The Crescendo lesson asks for a move: close it, then perform the move.
    await click('.tutorial-coach [data-coach=next]');continue;
   }
   if(st.chainSheet){
    if(!campDone){
     const row=await b.ev("document.querySelector('#dk-root')?.dataset.row");
     if(row&&row.split(',')[0]==='crescendo'){
      await click('.dk2-swap[data-slot="0"]');await delay(400);
      const uid=await b.ev(`(()=>{const tiles=[...document.querySelectorAll('.dk2-tilemain')];const t=tiles.find(n=>n.closest('.dk2-tile').querySelector('.dk21-slot')?.textContent.includes('3'));return t?.dataset.uid||null})()`);
      if(uid)await click(`.dk2-tilemain[data-uid="${uid}"]`);await delay(500);
      await shot('camp-chain-after-swap');
      await click('#dk2-play');await delay(4200);await shot('camp-chain-played');
      campDone=true;
     }
     await click('#dk2-done');await delay(400);continue;
    }
    await click('#dk2-done');continue;
   }
   if(await exists('.practice-chain-camp')){
    if(!courseShots.has('camp')){courseShots.add('camp');await shot('course-camp');}
    if(campDone||await exists('.practice-chain-camp [data-action=support]:not(.secondary)')){await click('.practice-chain-camp [data-action=support]');continue;}
    await click('.practice-chain-camp [data-action=practice-chain]');continue;
   }
   if(st.running&&st.t>6.5&&st.node&&!courseShots.has(st.node)){courseShots.add(st.node);await shot(`course-${st.node}`);continue;}
   if(await click('[data-action=wake-flight]'))continue;
   if(await click('.flight-resume-gate'))continue;
   if(await click('dialog[open] [data-action=node]'))continue;
   if(st.screen!=='flight'){
    if(await click('[data-action=retry]'))continue;
    const next=await b.ev(`(()=>{const n=[...document.querySelectorAll('[data-action=preview-node]')].find(n=>!n.closest('[aria-disabled=true]')&&!n.classList.contains('locked'));if(!n)return null;n.dispatchEvent(new MouseEvent('click',{bubbles:true}));return n.dataset.id})()`);
    if(next){await delay(500);continue;}
    if(await click('[data-action=node]'))continue;
    if(await click('[data-action=continue-run]'))continue;
   }
  }
  const tl=await rawEv('JSON.parse(JSON.stringify(window.__timeline))');
  const errors=await rawEv('window.__errors');
  report.sizes[tag]={...summarize(tl),errors:[...errors,...b.errors],badResponses:b.badResponses,failedRequests:[...failed],wallSeconds:(Date.now()-t0)/1000,cdpTimeouts:timeouts,raw:tl};
  failed.length=0;
  await fs.writeFile(path.join(out,'edition4-timeline.json'),JSON.stringify(report,null,1));
 }finally{b.close();}
}
function summarize(tl){
 const stops=[];let flight=null,entry=null;
 for(const ev of tl.events){
  if(ev.type==='flight-start'){flight={node:ev.node,lessons:entry&&entry.node===ev.node?[entry.lesson]:[],start:ev.t,success:null,end:null};entry=null;stops.push(flight);continue;}
  if(ev.type==='flight-end'&&flight&&flight.node===ev.node){flight.end=ev.t;flight.success=ev.success;continue;}
  if(ev.type==='lesson-open'){
   const lesson={id:ev.id.replace(/:\d+$/,''),title:ev.title,text:ev.text,words:ev.words,t:ev.t,enginePaused:ev.enginePaused,awaitingLift:ev.awaitingLift,screen:ev.screen};
   if(ev.screen==='flight'&&ev.awaitingLift){entry={node:ev.node,lesson};continue;}
   if(ev.screen==='support')ev.node='practice-camp';
   if(ev.screen==='flight'&&flight&&ev.node===flight.node&&flight.end===null)flight.lessons.push(lesson);
   else stops.push({node:ev.node||'checkpoint',checkpoint:true,lessons:[lesson]});
  }
 }
 // Retries keep their own entries; the final, successful attempt per node is the one that counts.
 const final=[],seen=new Set();
 for(let i=stops.length-1;i>=0;i--){const s=stops[i];const key=s.checkpoint?`${s.node}:${s.lessons[0].id}`:s.node;if(seen.has(key))continue;seen.add(key);final.unshift(s);}
 let total=0;const table=[];
 for(const s of final){
  if(s.checkpoint){total+=ASSUMED_READING;table.push({node:s.node,checkpoint:true,lessons:s.lessons.map(l=>({id:l.id,words:l.words,text:l.text}))});continue;}
  const duration=+(s.end-s.start).toFixed(2),inflight=s.lessons.filter(l=>!l.awaitingLift);
  const times=[0,...inflight.map(l=>l.t-s.start),duration];
  const lessons=s.lessons.map(l=>{const at=l.awaitingLift?0:+(l.t-s.start).toFixed(2);const i=inflight.indexOf(l);
   return {id:l.id,title:l.title,words:l.words,text:l.text,entry:!!l.awaitingLift,at,enginePaused:l.enginePaused,
    freeBefore:l.awaitingLift?0:+(times[i+1]-times[i]).toFixed(2),freeAfter:l.awaitingLift?+(times[1]-0).toFixed(2):+(times[i+2]-times[i+1]).toFixed(2)};});
  total+=duration+s.lessons.length*ASSUMED_READING;
  table.push({node:s.node,duration,success:s.success,stops:s.lessons.length,lessons});
 }
 const attempts=stops.filter(s=>!s.checkpoint).length,courses=final.filter(s=>!s.checkpoint).length;
 return {stops:table,flightsFlown:attempts,retries:attempts-courses,totalSecondsAssumingReading:+total.toFixed(1),
  maxStopsPerFlight:Math.max(0,...table.filter(s=>!s.checkpoint).map(s=>s.stops)),
  minFreeFlightBeforeInFlightStop:Math.min(...table.filter(s=>!s.checkpoint&&s.duration).flatMap(s=>s.lessons.filter(l=>!l.entry).map(l=>l.freeBefore))),
  deaths:tl.events.filter(x=>x.type==='death'),textWhileSimulating:tl.violations,lessonOpenedOnStoppedFrame:tl.openedOnStoppedFrame||[],eventBannerWhileSimulating:tl.eventBanner,advancingFrames:tl.advancing};
}
const camp={note:'Camp time is the scripted arrangement (Swap, Play, Done) plus two lessons at the assumed reading time.'};
for(const s of Object.values(report.sizes))s.camp=camp;
await fs.writeFile(path.join(out,'edition4-timeline.json'),JSON.stringify(report,null,1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.sizes).map(([k,v])=>[k,{total:v.totalSecondsAssumingReading,maxStopsPerFlight:v.maxStopsPerFlight,minFree:v.minFreeFlightBeforeInFlightStop,retries:v.retries,violations:v.textWhileSimulating.length,banner:v.eventBannerWhileSimulating.length,errors:v.errors,bad:v.badResponses,failed:v.failedRequests,stops:v.stops.map(s=>`${s.node}${s.duration?` ${s.duration}s`:''}: ${(s.lessons||[]).map(l=>`${l.id}@${l.at??'-'}(${l.words}w)`).join(', ')}`)}])),null,1));
server.close();
