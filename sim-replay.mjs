// Developer entry: fly exactly what the simulated pilots flew (owner request, 19 November 2026).
//   game.html?simrun=<runSeed>&stop=<1..6>[&card=<starter id>][&meter=<Sparks>][&hearts=<n>]
// Opens a throwaway card run (nothing is read from or written to the save: app.mjs treats it like a mock scene) on the SAME map, route and flight
// seed the pilots of scripts/balance/starter-sim.mjs fly, with Lift Guide mounted and nothing else, and shows the normal departure screen.
// After the flight the normal result shows, plus a small panel: Next stop / Retry / Exit. Never loaded without the `simrun` parameter.
import {newState,createRun,getChoices,selectNode,resolveSupport} from './model.mjs?v=presets-1';
import {makeSkillCard} from './skill-cards.mjs?v=presets-1';
import {prepareRouteOffer} from './route-offers.mjs?v=presets-1';

export const SIM_STOPS=6;
export const SPARK_UNITS=10/3;
/** What the pilots started each stop with (median of the first attempt at that stop over 30 runs of player-average; Sparks, hearts). */
export const SIM_START=Object.freeze([{sparks:30,hearts:3},{sparks:15,hearts:3},{sparks:30,hearts:3},{sparks:30,hearts:3},{sparks:15,hearts:3},{sparks:15,hearts:2}]);
const PENDING=['pendingChest','pendingTemporary','cardDraft','cardReward','flightReward'];

/** `cards=a,b,c` -> ['a','b','c'] (trimmed, empty entries dropped, ids unknown to makeSkillCard dropped by the caller). */
export function parseCardList(text){return String(text||'').split(',').map(s=>s.trim()).filter(Boolean);}
function freshRun(seed,card,solo=false,cards=null){
  const state=newState();state.profile.tutorialComplete=true;state.profile.clearedFlights=1;state.settings.skipTutorial=true;
  const run=state.run=createRun(state.profile,seed,1,{cards:true});
  while(run.mountedCards.length<2)run.mountedCards.push(null);
  // cards=[...]: exactly these cards, left to right, nothing else mounted (unknown ids ignored).
  if(cards&&cards.length){
    const made=[];cards.forEach((id,i)=>{try{const c=makeSkillCard(id,`rf:${i}:${id}`);if(c&&c.cardId===id)made.push(c);}catch{}});
    if(made.length){run.mountedCards.fill(null);while(run.mountedCards.length<made.length)run.mountedCards.push(null);made.forEach((c,i)=>{run.mountedCards[i]=c;});return {state,run};}
  }
  // solo=1: the named card is the ONLY card (starter cards as alternatives); otherwise Lift Guide plus the optional card.
  if(solo&&card)run.mountedCards[0]=makeSkillCard(card,`rf:0:${card}`);
  else{run.mountedCards[0]=makeSkillCard('lift-guide','rf:0:lift-guide');if(card)run.mountedCards[1]=makeSkillCard(card,`rf:1:${card}`);}
  return {state,run};
}
function passNode(run,pick){
  run.phase='map';run.step=pick.row+1;run.current=null;run.attemptActive=false;for(const k of PENDING)delete run[k];
}
/** The pilots' route: the first normal flight at each step (else an Elite flight, else a Rest, else the first choice). Same rule as scripts/balance/app-flight.mjs. */
export function simRoute(seed,stops=SIM_STOPS){
  const {run}=freshRun(seed),path=[],flights=[];let guard=0;
  while(flights.length<stops&&run.phase==='map'&&guard++<40){
    const ch=getChoices(run);if(!ch.length)break;
    const pick=ch.find(n=>n.type==='flight'&&!n.elite)||ch.find(n=>n.type==='flight')||ch.find(n=>n.kind==='camp')||ch[0];
    if(!selectNode(run,pick.id))break;
    path.push(pick.id);if(pick.type==='flight')flights.push(pick.id);
    if(pick.kind==='camp')resolveSupport(run,0);
    passNode(run,pick);
  }
  return {path,flights};
}
export function parseSimParams(params){
  const seed=params.get('simrun')||'sb0',stop=Math.max(1,Math.min(SIM_STOPS,Math.floor(Number(params.get('stop')))||1));
  const num=k=>params.has(k)&&params.get(k)!==''&&Number.isFinite(Number(params.get(k)))?Number(params.get(k)):null;
  return {seed,stop,card:params.get('card')||null,meter:num('meter'),hearts:num('hearts'),cards:parseCardList(params.get('cards')),carry:params.get('carry')==='1',solo:params.get('solo')==='1'};
}
/** A throwaway state whose run stands on the departure screen of stop N. `carry` (Next stop) applies the Rests between the two stops to the carried Meter and hearts. */
export function createSimRunState(params){
  const p=parseSimParams(params),{state,run}=freshRun(p.seed,p.card,p.solo,p.cards),route=simRoute(p.seed,SIM_STOPS),target=route.flights[p.stop-1];
  if(!target)throw Error(`Sim run ${p.seed} has no stop ${p.stop}`);
  const start=SIM_START[p.stop-1],units=s=>Math.round(s*SPARK_UNITS);
  const cap=run.flame,setVitals=()=>{run.flame=Math.max(0,Math.min(cap,units(p.meter??start.sparks)));run.lives=Math.max(1,Math.min(run.maxLives,p.hearts??start.hearts));};
  const previous=route.flights[p.stop-2];let afterPrevious=p.stop===1;
  if(p.carry&&afterPrevious)setVitals();
  for(const id of route.path){
    const pick=getChoices(run).find(n=>n.id===id);if(!pick||!selectNode(run,id))throw Error(`Sim route broke at ${id}`);
    if(id===target){
      if(!p.carry)setVitals();
      if(pick.type!=='support')prepareRouteOffer(run,pick,{profile:state.profile,width:globalThis.innerWidth||900,height:globalThis.innerHeight||405});
      return {state,params:p,nodeId:id};
    }
    if(pick.kind==='camp'&&p.carry&&afterPrevious)resolveSupport(run,0);
    passNode(run,pick);
    if(p.carry&&id===previous){afterPrevious=true;setVitals();}
  }
  throw Error('Sim route ended before the stop');
}
export const simRunUrl=(seed,stop,extra={})=>{const u=new URL(globalThis.location?.href||'http://localhost/game.html');u.search='';u.searchParams.set('simrun',seed);u.searchParams.set('stop',String(stop));for(const[k,v]of Object.entries(extra))if(v!=null&&v!=='')u.searchParams.set(k,String(v));return u.toString();};

/** The Next / Retry / Exit panel. Shown whenever the stop's flight has ended and no flight is on screen (never while playing). */
export function installSimPanel({getRun,params,nodeId}){
  const p=parseSimParams(params),el=document.createElement('div');
  el.className='sim-run-panel';el.hidden=true;
  el.style.cssText='position:fixed;left:50%;top:4px;transform:translateX(-50%);z-index:9999;display:none;gap:6px;align-items:center;padding:3px 8px;border-radius:10px;background:rgba(32,22,14,.92);color:#f3e6c8;font:600 12px system-ui,sans-serif;border:1px solid #b88a4a';
  const btn=(label,go)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='min-height:32px;padding:0 10px;border-radius:8px;border:1px solid #b88a4a;background:#5b3b1e;color:#fff4d8;font:inherit';b.addEventListener('click',go);return b;};
  const label=document.createElement('span');label.textContent=`Sim run ${p.seed}, stop ${p.stop}`;
  const extra={card:p.card,cards:p.cards.length?p.cards.join(','):null};
  const next=btn('Next stop',()=>{const r=getRun();location.href=simRunUrl(p.seed,p.stop+1,{...extra,carry:1,meter:Math.round(r.flame/SPARK_UNITS),hearts:r.lives});});
  const retry=btn('Retry',()=>{location.href=simRunUrl(p.seed,p.stop,{...extra,meter:p.meter,hearts:p.hearts});});
  const exit=btn('Exit',()=>{const u=new URL(location.href);u.search='';location.href=u.toString();});
  el.append(label,next,retry,exit);document.body.append(el);
  const update=()=>{const r=getRun(),done=r?.lastAttempt?.nodeId===nodeId,flying=document.body.dataset.screen==='flight'||document.body.classList.contains('playing');
    el.style.display=!done||flying?'none':'flex';el.hidden=!done||flying;next.disabled=!(r?.lastAttempt?.success)||p.stop>=SIM_STOPS;next.style.opacity=next.disabled?.4:1;};
  new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['data-screen','class']});
  new MutationObserver(update).observe(document.querySelector('#app'),{childList:true});
  update();return el;
}
