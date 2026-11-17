import {drawWispBody} from './companion-art.mjs?v=guide-clarity-1';
import {sparkImageArt} from './spark-symbol.mjs?v=guide-clarity-1';

export const FLIGHT_LOADING_TIP_IDS=Object.freeze(['balanced-lift','lift-guide','rhythm-wave']);
const STORAGE_KEY='emberwing.flight-loading-tips.v1';
let memory={last:'',seen:{}};
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const equipped=(run,id)=>(run?.mountedCards||[]).some(card=>(card?.cardId||card?.id)===id);
function storageDefault(){try{return globalThis.localStorage;}catch{return null;}}
function history(storage){
 let saved=memory;try{saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'null')||memory;}catch{}
 return {last:FLIGHT_LOADING_TIP_IDS.includes(saved?.last)?saved.last:'',seen:Object.fromEntries(FLIGHT_LOADING_TIP_IDS.map(id=>[id,Math.max(0,Math.min(1000000,Math.floor(Number(saved?.seen?.[id])||0)))]))};
}

/** Explicit IDs are also used by the design lab; selection happens once per departure. */
export function flightLoadingTipById(id,run){
 if(id==='lift-guide')return {id,title:'Listen for the higher note',context:equipped(run,'lift-guide')?'Lift Guide equipped':'With Lift Guide equipped',
  text:'Follow the amber chevron or, with music on, listen for two notes. Lift on the higher one.',
  note:'This keeps a level path in still air. Lift sooner to clear rock.'};
 if(id==='rhythm-wave')return {id,title:'Three even Lifts send a Pulse',context:equipped(run,'rhythm')?'Rhythm equipped':'With Rhythm equipped',
  text:'Three successful, evenly spaced Lifts send a Pulse. Choose a pace that fits the passage.',
  note:equipped(run,'harvest-common')||equipped(run,'harvest-rare')||equipped(run,'harvest-legendary')?'Your Resonant Harvest adds Sparks when the Pulse crosses an uncollected Spark. Pick it up afterward.':'With Resonant Harvest equipped too, crossing an uncollected Spark adds Sparks. Pick it up afterward.'};
 return {id:'balanced-lift',title:'Lift, rise, then glide',context:'Flying efficiently',
  text:'In still air, let your wisp fall back to its takeoff height before lifting again. This keeps a level path and saves Sparks.',
  note:'Leave room to rise. Lift sooner to clear rock.'};
}

/** Least-seen tips rotate across visits; equipped cards break ties, never force a repeat. */
export function selectFlightLoadingTip({run,showTips=true,storage=storageDefault()}={}){
 if(showTips===false)return null;
 const state=history(storage),priority=id=>id==='balanced-lift'?1:equipped(run,id==='lift-guide'?'lift-guide':'rhythm')?2:0;
 const candidates=FLIGHT_LOADING_TIP_IDS.filter(id=>id!==state.last);
 candidates.sort((a,b)=>state.seen[a]-state.seen[b]||priority(b)-priority(a)||FLIGHT_LOADING_TIP_IDS.indexOf(a)-FLIGHT_LOADING_TIP_IDS.indexOf(b));
 const id=candidates[0];state.last=id;state.seen[id]++;memory=state;
 try{storage?.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
 return flightLoadingTipById(id,run);
}

// Read the actual flight body's source pixels instead of inventing a second wisp.
let wispPixels='';
function wisp(){
 if(!wispPixels){const paths=new Map(),pen={fillStyle:'',fillRect(x,y,w,h){paths.set(this.fillStyle,(paths.get(this.fillStyle)||'')+`M${x} ${y}h${w}v${h}h-${w}z`);}};drawWispBody(pen,32);wispPixels=[...paths].map(([fill,d])=>`<path fill="${fill}" d="${d}"/>`).join('');}
 return `<g class="entry-tip-wisp"><circle r="20" fill="#f3edc5" opacity=".07"/>${wispPixels}</g>`;
}
const terrain='<path fill="#253c32" d="M0 0h240v12h-24v5h-30v-6h-36v7h-32v-5H80v8H44v-7H18v6H0zM0 130v-15h22v-5h32v6h35v-7h33v6h33v-7h35v6h28v-5h22v21z"/><path fill="#41543b" d="M0 18h18v-6h26v7h36v-8h38v5h32v-7h36v6h30v-5h24v3h-22v5h-34v-6h-32v7h-36v-5H82v8H42v-7H20v6H0zM0 113h20v-5h36v6h31v-7h37v6h29v-7h39v6h24v-5h24v3h-22v5h-28v-6h-35v6h-33v-6H89v7H54v-6H22v5H0z"/>';
function illustration(id){
 const rhythm=id==='rhythm-wave';
 const path='<path class="entry-tip-arc" d="M24 78Q76 -14 128 78Q180 -14 232 78"/><path class="entry-tip-level" d="M16 78h220"/>';
 const notes=id==='lift-guide'?'<g class="entry-tip-note-low" transform="translate(104 40)"><path d="M0 0v-13h3v13M0-13l9-3v3l-9 3"/><ellipse cx="-3" cy="1" rx="4" ry="3"/></g><g class="entry-tip-note-high" transform="translate(135 29)"><path d="M0 0v-13h3v13M0-13l9-3v3l-9 3"/><ellipse cx="-3" cy="1" rx="4" ry="3"/></g><path class="entry-tip-chevron" d="M140 61l7-7 7 7"/>':'';
 const motion=rhythm?`<g transform="translate(42 70)">${wisp()}<g class="entry-tip-wave"><circle r="18"/><circle r="23" opacity=".35"/></g></g><g class="entry-tip-wave-spark">${sparkImageArt('light',160,51,38)}</g><g class="entry-tip-beats">${[0,1,2].map((i)=>`<g class="entry-tip-beat entry-tip-beat-${i+1}" transform="translate(${76+i*42} 101)"><rect x="-10" y="-9" width="20" height="18"/><text text-anchor="middle" y="5">${i+1}</text></g>`).join('')}</g>`:`${path}<circle class="entry-tip-tap entry-tip-tap-first" cx="24" cy="78" r="18"/><circle class="entry-tip-tap entry-tip-tap-second" cx="128" cy="78" r="18"/><g class="entry-tip-flying">${wisp()}</g>${notes}`;
 return `<svg class="entry-tip-illustration entry-tip-illustration-${id}" viewBox="0 0 240 130" aria-hidden="true" shape-rendering="crispEdges"><rect width="240" height="130" fill="#101f1b"/><path fill="#1d3028" d="M28 20h8v82h-8zm43 0h5v90h-5zm94-4h7v95h-7zm42 0h5v98h-5z"/>${terrain}${motion}</svg>`;
}

export function renderFlightLoadingTip(tip){
 if(!tip)return '';
 return `<article class="entry-tip" data-flight-loading-tip="${esc(tip.id)}">${illustration(tip.id)}<div class="entry-tip-copy"><small class="entry-tip-context">${esc(tip.context)}</small><h2>${esc(tip.title)}</h2><p>${esc(tip.text)}</p><p class="entry-tip-note">${esc(tip.note)}</p></div></article>`;
}
