import {livesMarkup} from './lives.mjs?v=a1-balance-1';
import {formatGlow,getGlowCapacity} from './vitality.mjs?v=a1-balance-1';
import {resourceSymbol} from './game-symbols.mjs?v=a1-balance-1';

export const FLIGHT_LOAD_SECONDS=5;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tips=[
 ['Luminance','Your light reveals the terrain. Luminance skills extend its reach.'],
 ['Energy','Tap anywhere on the flight scene to Lift. Each Lift spends Energy.'],
 ['Hearts','One collision costs one heart. You return to the route to try again.'],
 ['Packed Sparks','Clear a flight for 20 Packed Sparks. Full-meter pickups add a bonus for skills.'],
 ['Edging Pulse','Skim close to solid terrain to charge a pulse that reveals the scene.'],
 ['Artifacts','Equipped artifacts work automatically. Tap an artifact to pause and inspect it.'],
];
export function flightTip(run){return tips[(Number(run?.stats?.flights)||0)%tips.length];}
export function flightEntryMarkup(run,node,{artifactArt=()=>'',dream=false}={}){
 const [term,tip]=flightTip(run),artifacts=(run.artifacts||[]).filter(Boolean);
 return `<section class="flight-entry" role="status" aria-label="Preparing flight" style="--entry-seconds:${FLIGHT_LOAD_SECONDS}s"><div class="entry-content"><span class="entry-eyebrow">${dream?'DREAM REHEARSAL':run.isTutorial?'PRACTICE':`MAP ${run.mapIndex+1} / 3`}</span><h1>${esc(node.name)}</h1><div class="entry-resources">${livesMarkup(run)}<span class="entry-sparks" aria-label="${formatGlow(run.flame)} of ${formatGlow(getGlowCapacity(run))} Energy">${resourceSymbol('glow')}<b>${formatGlow(run.flame)} / ${formatGlow(getGlowCapacity(run))}</b></span></div>${artifacts.length?`<div class="entry-artifacts" aria-label="Equipped artifacts">${artifacts.map(id=>artifactArt(id)).join('')}</div>`:''}<p class="entry-tip"><b>${esc(term)}</b>${esc(tip)}</p><div class="entry-loading" aria-label="Loading scene"><i></i></div><span class="entry-safe-note">Starts paused · tap to begin</span></div></section>`;
}
export function resumeGateMarkup(){return `<button class="flight-resume-gate" data-action="wake-flight" aria-label="Begin flight without lifting"><span class="resume-gate-content"><strong>Tap to begin</strong></span></button>`;}

/** Wait for both preparation and the splash. Cancellation never starts a stale scene. */
export async function waitForFlightEntry(ready,startedAt,{now=()=>performance.now(),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 await ready;
 await wait(Math.max(0,FLIGHT_LOAD_SECONDS*1000-(now()-startedAt)));
}
