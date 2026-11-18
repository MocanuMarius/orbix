import {prepareFuelSprites} from './pickup-art.mjs?v=nozoom-1';
import {selectFlightLoadingTip,renderFlightLoadingTip} from './flight-loading-tips.mjs?v=nozoom-1';

export function preloadFlightEntry(reducedMotion=false){
 if(typeof window==='undefined')return Promise.resolve();
 const quiet=reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 return Promise.all([import('./wisp-renderer.mjs?v=nozoom-1'),prepareFuelSprites(document,quiet)]);
}

// The approved "Field note" page (v1.0-depart-A). Back and the depart plaque have one fixed size in both states
// ("Preparing…" and "Tap to depart"), so readiness changes only their text. The status line is for screen readers.
export function flightEntryMarkup(run,node,{dream=false,showTips=true,profile=null,storage,rand}={}){
 const selection=selectFlightLoadingTip({run,node,dream,profile,showTips,storage,rand});
 return `<section class="flight-entry" aria-label="Preparing flight"><div class="entry-leaf"><span class="entry-sr" data-entry-status role="status">${dream?'Preparing Dream':'Preparing passage'}</span>${renderFlightLoadingTip(selection,node?.name||'')}<div class="entry-rule" aria-hidden="true"><i></i></div><footer class="entry-foot"><button type="button" class="entry-cancel" data-action="cancel-flight-entry" data-dream="${dream}"><b>Back</b></button><button type="button" class="primary entry-depart" data-action="wake-flight" disabled><b>Preparing…</b></button></footer></div></section>`;
}

// Keep the same page visible after readiness. A pointer pressed during loading
// cannot become the departure click just because its button became enabled.
export function prepareFlightDeparture(element){
 const button=element.querySelector('.entry-depart'),label=button.querySelector?.('b')||button;
 let pointer=null;
 element.dataset.ready='true';
 element.setAttribute('aria-label','Flight ready');
 element.querySelector('[data-entry-status]').textContent='Ready to depart';
 label.textContent='Tap to depart';button.disabled=false;
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
