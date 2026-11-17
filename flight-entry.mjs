import {resourceSymbol} from './game-symbols.mjs?v=reskin-4';
import {prepareFuelSprites} from './pickup-art.mjs?v=reskin-4';
import {selectFlightLoadingTip,renderFlightLoadingTip} from './flight-loading-tips.mjs?v=reskin-4';

export function preloadFlightEntry(reducedMotion=false){
 if(typeof window==='undefined')return Promise.resolve();
 const quiet=reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 return Promise.all([import('./wisp-renderer.mjs?v=reskin-4'),prepareFuelSprites(document,quiet)]);
}

export function flightEntryMarkup(run,node,{dream=false,showTips=true}={}){
 const tip=selectFlightLoadingTip({run,node,dream,showTips});
 return `<section class="flight-entry" aria-label="Preparing flight"><div class="entry-content"><header class="entry-heading"><span class="entry-loading-wisp" aria-hidden="true">${resourceSymbol('glow')}</span><strong data-entry-status role="status">${dream?'Preparing Dream':'Preparing passage'}</strong></header>${renderFlightLoadingTip(tip)}<div class="entry-loading" aria-label="Loading scene"><i></i></div><span class="entry-safe-note" data-entry-note>Starts paused · take your time</span><footer class="entry-actions"><button class="entry-cancel" data-action="cancel-flight-entry" data-dream="${dream}">Back</button><button class="primary entry-depart" data-action="wake-flight" disabled>Preparing…</button></footer></div></section>`;
}

// Keep the same lesson visible after readiness. A pointer pressed during loading
// cannot become the departure click just because its button became enabled.
export function prepareFlightDeparture(element){
 const button=element.querySelector('.entry-depart');
 let pointer=null;
 element.dataset.ready='true';
 element.setAttribute('aria-label','Flight ready');
 element.querySelector('[data-entry-status]').textContent='Ready to depart';
 element.querySelector('[data-entry-note]').textContent='Tap again in flight to Lift.';
 button.textContent='Tap to depart';button.disabled=false;
 button.addEventListener('pointerdown',event=>{
  pointer=event.isPrimary!==false&&(event.button===undefined||event.button===0)?event.pointerId:null;
 });
 button.addEventListener('pointercancel',()=>{pointer=null;});
 return event=>{
  if(!event)return false;
  if(event.type==='keydown')return !event.repeat&&['Space','ArrowUp'].includes(event.code);
  if(event.type!=='click')return false;
  if(event.detail===0)return true; // Keyboard and assistive technology activation.
  const accepted=pointer!==null&&(event.pointerId===undefined||event.pointerId===pointer);
  pointer=null;return accepted;
 };
}
export function resumeGateMarkup(){return `<button class="flight-resume-gate" data-action="wake-flight" aria-label="Begin flight without lifting"><span class="resume-gate-content"><strong>Tap to begin</strong></span></button>`;}

/** Renderer readiness is the only loading gate. No extra timed screen. */
export async function waitForFlightEntry(ready){
 return await ready;
}
