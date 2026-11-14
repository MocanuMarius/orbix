import {getGlowCapacity,GLOW_DISPLAY_SCALE} from './vitality.mjs?v=moonwell-menu-1';
const clamp=v=>Math.max(0,Math.min(1,v));
// A cell represents one paid Lift, even during a temporary free-Lift effect.
export function glowGaugeUnits(flame,maximum=100,liftCost=10){
 const max=Math.max(1,Number(maximum)||100),unit=Math.max(1,Number(liftCost)||10),amount=clamp((Number(flame)||0)/max)*max,lifts=amount/unit;
 const filled=Math.floor(lifts+1e-7),fraction=Math.max(0,lifts-filled);
 return {capacity:Math.ceil(max/unit-1e-7),filled,partial:Math.floor((fraction+1e-7)*4)/4,value:Math.round(amount*GLOW_DISPLAY_SCALE*100)/100,maxValue:Math.round(max*GLOW_DISPLAY_SCALE),unitCost:Math.round(unit*GLOW_DISPLAY_SCALE)};
}
function unitMarkup(state){return Array.from({length:state.capacity},(_,i)=>`<span class="glow-unit${i<state.filled?' lit':''}"></span>`).join('');}
export function glowGaugeMarkup(run){
 const state=glowGaugeUnits(run.flame,getGlowCapacity(run));
 return `<div class="flame-hud glow-side-gauge glow-gauge-v3" aria-label="Energy meter" style="--glow-units:${state.capacity}"><div id="flame-meter" role="meter" aria-label="Energy remaining" aria-valuemin="0" aria-valuemax="${state.maxValue}" aria-valuenow="${state.value}" aria-valuetext="${state.value} of ${state.maxValue} Energy; each segment is ${state.unitCost} Energy, one Lift"><i id="flame-fill" aria-hidden="true">${unitMarkup(state)}</i></div></div>`;
}
export const PACKING_TIMING = Object.freeze({ travel: 350, packing: 1000, total: 1700 });

// One bright core stays visible as the two flaps fold over the case.
// The blue front window matches the wallet symbol at the top of the rail.
const packingSprite = `<svg class="packing-case" viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges">
  <g class="packing-housing">
    <path fill="#172137" d="M2 8h28v20h-2v2H4v-2H2z"/>
    <path fill="#976a44" d="M3 8h26v19h-2v2H5v-2H3z"/>
    <path fill="#e1be80" d="M3 8h3v16H3zm3 16h20v3H6z"/>
    <path fill="#304565" d="M6 9h20v15H6z"/>
    <path fill="#577995" d="M9 11h14v11H9z"/>
    <path fill="#141e30" d="M10 12h12v9H10z"/>
    <g class="packing-left"><path fill="#825937" d="M2 5h14v5H2z"/><path fill="#e2b77c" d="M2 5h14v3H2z"/><path fill="#fff1b8" d="M3 5h10v1H3z"/></g>
    <g class="packing-right"><path fill="#825937" d="M16 5h14v5H16z"/><path fill="#bb8c54" d="M16 5h14v3H16z"/><path fill="#f4d49a" d="M18 5h11v1H18z"/></g>
  </g>
  <path fill="#9dc88e" d="M12 10h8v2h2v8h-2v2h-8v-2h-2v-8h2z"/>
  <path fill="#eaf7bf" d="M13 11h6v2h2v6h-2v2h-6v-2h-2v-6h2z"/>
  <path fill="#fffee6" d="M14 12h4v7h-4z"/>
</svg>`;

function createPackingRail(gauge) {
 const device = gauge.closest('.flight-device');
 const counter = device?.querySelector('.flight-condensed-counter');
 if (!counter) return null;
 const host = gauge.ownerDocument.createElement('div');
 host.className = 'packing-rail';
 host.setAttribute('aria-hidden','true');
 host.innerHTML = `<i class="packing-trail"></i><div class="packing-cargo">${packingSprite}</div><b class="packing-gain"></b>`;
 device.appendChild(host);
 return {
  host, counter, wallet:counter.querySelector('#flight-condensed'), icon:counter.querySelector('.condensed-icon'),
  cargo:host.querySelector('.packing-cargo'), housing:host.querySelector('.packing-housing'),
  trail:host.querySelector('.packing-trail'), left:host.querySelector('.packing-left'),
  right:host.querySelector('.packing-right'), gain:host.querySelector('.packing-gain'),
  busy:false, pending:null
 };
}

function playPacking(rail, meter, batch) {
 if (rail.busy) {
  // Multiple pickups in one journey become the next parcel, with one deposit.
  batch.gain += rail.pending?.gain || 0;
  rail.pending = batch;
  return;
 }
 rail.busy = true;
 const bounds = rail.host.getBoundingClientRect();
 const sx = bounds.width / Math.max(1,rail.host.clientWidth) || 1;
 const sy = bounds.height / Math.max(1,rail.host.clientHeight) || 1;
 const source = meter.getBoundingClientRect();
 const icon = (rail.icon || rail.counter).getBoundingClientRect();
 const startX = (source.left + source.width/2 - bounds.left) / sx;
 const startY = (source.top - bounds.top) / sy - 3;
 const endX = (icon.left + icon.width/2 - bounds.left) / sx;
 const endY = (icon.top + icon.height/2 - bounds.top) / sy;
 const midX = (startX+endX)/2, midY = (startY+endY)/2;
 const pose = (x,y,scale=1) => `translate(${x}px,${y}px) scale(${scale})`;
 const {travel, packing, total} = PACKING_TIMING;
 const arrive = travel / total, leave = (travel + packing) / total;
 const travelEase = 'cubic-bezier(.46,.03,.22,1)';
 const frames = [
  {offset:0,transform:pose(startX,startY,.85),opacity:1,easing:travelEase},
  {offset:arrive,transform:pose(midX,midY)},
  {offset:leave,transform:pose(midX,midY),easing:travelEase},
  {offset:1,transform:pose(endX,endY,.74),opacity:1}
 ];
 const reduce = rail.host.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches;
 rail.host.hidden = false;
 const moving = rail.cargo.animate(reduce ? [{transform:pose(endX,endY),opacity:0},{transform:pose(endX,endY),opacity:1}] : frames, {duration:reduce?200:total,fill:'both'});
 const pieces = [moving];
 if (!reduce) {
  // A single dim echo, offset by a few milliseconds, is the whole trail.
  const trail = frames.map((frame,i)=>({...frame,opacity:[.24,0,0,.24][i]}));
  trail.splice(3,0,{offset:leave+.006,transform:pose(midX,midY),opacity:.24,easing:travelEase});
  pieces.push(rail.trail.animate(trail,{duration:total,delay:20}));
  pieces.push(rail.housing.animate([
   {opacity:0,transform:'scale(.6)',offset:0},
   {opacity:0,transform:'scale(.6)',offset:arrive},
   {opacity:1,transform:'scale(1)',offset:arrive+.08},
   {opacity:1,transform:'scale(1)',offset:1}
  ],{duration:total}));
  for (const [lid,angle,delay] of [[rail.left,-106,travel+170],[rail.right,106,travel+530]]) {
   pieces.push(lid.animate([{transform:`rotate(${angle}deg)`},{transform:'rotate(0deg)'}],
    {delay,duration:280,easing:'ease-in-out',fill:'both'}));
  }
 }
 moving.finished.then(()=>{
  for (const piece of pieces) piece.cancel();
  if (!rail.host.isConnected) return;
  rail.host.hidden = true;
  if (rail.wallet) rail.wallet.textContent = String(batch.total);
  if (batch.gain > 0) {
   rail.gain.textContent = '+'+batch.gain;
   rail.gain.style.left = (endX+17)+'px';
   rail.gain.style.top = (endY+13)+'px';
   rail.host.hidden = false;
   rail.flash?.cancel();
   rail.flash = rail.gain.animate([{opacity:1},{opacity:1,offset:.65},{opacity:0}],{duration:520});
   rail.icon?.animate([{filter:'brightness(1.8)'},{filter:'brightness(1)'}],{duration:230});
  }
  rail.busy = false;
  const next = rail.pending;
  rail.pending = null;
  if (next) playPacking(rail,meter,next);
 }).catch(()=>{});
}

function updatePacking(gauge,s) {
 const rail = gauge._packingRail ||= createPackingRail(gauge);
 if (!rail) return;
 const earned = Math.max(0,Math.floor(s.condensedGlow || 0));
 const total = Math.floor(s.condensedTotal ?? earned);
 const gain = Math.max(0,earned-(gauge._lastEarned || 0));
 gauge._lastEarned = earned;
 const flow = s.condensationFlow;
 if (flow && flow.count !== gauge._flowCount) {
  gauge._flowCount = flow.count;
  if (flow.count > 0 && flow.rawAmount > 0) {
   playPacking(rail,gauge._glowRefs.meter,{gain,total});
   return;
  }
 }
 // Simulation credits immediately. Only the visible balance waits for arrival.
 if (!rail.busy && rail.wallet && rail.wallet.textContent !== String(total)) rail.wallet.textContent = String(total);
}

export function updateGlowGauge(gauge,s){
 if(!gauge)return;
 const draining=(s.blackHole?.rate||0)>0;if(gauge._draining!==draining){gauge._draining=draining;gauge.classList.toggle('black-hole-drain',draining);}
 const refs=gauge._glowRefs||(gauge._glowRefs={fill:gauge.querySelector('#flame-fill'),meter:gauge.querySelector('#flame-meter')});
 const state=glowGaugeUnits(s.flame,s.maxFlame,s.paidFlapCost||s.flapCost||10),ratio=clamp((Number(s.flame)||0)/(s.maxFlame||100));
 const key=state.value+'/'+state.capacity+'/'+state.unitCost;
 if(gauge._label!==key){gauge._label=key;refs.meter.setAttribute('aria-valuenow',state.value);refs.meter.setAttribute('aria-valuemax',state.maxValue);refs.meter.setAttribute('aria-valuetext',`${state.value} of ${state.maxValue} Energy; each segment is ${state.unitCost} Energy, one Lift`);}
 if(gauge._capacity!==state.capacity){gauge._capacity=state.capacity;gauge.style.setProperty('--glow-units',state.capacity);refs.fill.innerHTML=unitMarkup(state);refs.units=Array.from(refs.fill.children);gauge._filled=state.filled;}
 if(gauge._filled!==state.filled){
  const from=Math.min(gauge._filled,state.filled),to=Math.max(gauge._filled,state.filled);
  for(let i=from;i<to;i++)refs.units[i]?.classList.toggle('lit',i<state.filled);
  gauge._filled=state.filled;
 }
 const partial=refs.units?.[state.filled];if(gauge._partial&&gauge._partial!==partial)gauge._partial.classList.remove('partial');if(partial){partial.classList.toggle('partial',state.partial>0);partial.style.setProperty('--unit-fill',(state.partial*100)+'%');}gauge._partial=partial;
 gauge.classList.toggle('low-glow',ratio<=.2);gauge.classList.toggle('full-glow',state.filled===state.capacity);
 updatePacking(gauge,s);
}
