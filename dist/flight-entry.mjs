import {resourceSymbol} from './game-symbols.mjs?v=spark-floor-1';
import {prepareFuelSprites} from './pickup-art.mjs?v=spark-floor-1';

export function preloadFlightEntry(reducedMotion=false){
 if(typeof window==='undefined')return Promise.resolve();
 const quiet=reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 return Promise.all([import('./wisp-renderer.mjs?v=spark-floor-1'),prepareFuelSprites(document,quiet)]);
}

export function flightEntryMarkup(run,node,{dream=false}={}){
 return `<section class="flight-entry" role="status" aria-label="Preparing flight"><div class="entry-content"><span class="entry-loading-wisp" aria-hidden="true">${resourceSymbol('glow')}</span><strong>${dream?'Preparing Dream':'Preparing passage'}</strong><div class="entry-loading" aria-label="Loading scene"><i></i></div><span class="entry-safe-note">Starts paused</span><button class="entry-cancel" data-action="cancel-flight-entry" data-dream="${dream}">Back</button></div></section>`;
}
export function resumeGateMarkup(){return `<button class="flight-resume-gate" data-action="wake-flight" aria-label="Begin flight without lifting"><span class="resume-gate-content"><strong>Tap to begin</strong></span></button>`;}

/** Renderer readiness is the only loading gate. No extra timed screen. */
export async function waitForFlightEntry(ready){
 await ready;
}
