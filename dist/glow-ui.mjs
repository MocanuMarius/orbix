import {getGlowCapacity,GLOW_DISPLAY_SCALE} from './vitality.mjs?v=tutorial-context-1';
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
function spill(gauge,gain,raw){
 const doc=gauge.ownerDocument,target=doc.querySelector('.flight-condensed-counter');if(!target)return;
 const reduce=doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const flash=[{opacity:1},{opacity:.64,offset:.4},{opacity:1}];
 target._condensedPulse?.cancel();target._condensedPulse=target.animate?.(flash,{duration:reduce?180:420,easing:'steps(2,end)'});
 const meter=gauge._glowRefs.meter;meter._spillPulse?.cancel();meter._spillPulse=meter.animate?.(flash,{duration:reduce?160:360,easing:'steps(2,end)'});
 let pool=gauge._spillPool;
 if(!pool){
  const host=doc.createElement('div');host.className='condensation-motes';host.setAttribute('aria-hidden','true');
  const tiles=Array.from({length:2},()=>{const tile=doc.createElement('i');tile.className='condensation-particle';host.appendChild(tile);return tile;});
  const label=doc.createElement('b');host.appendChild(label);doc.querySelector('.flight-device')?.appendChild(host);
  pool=gauge._spillPool={host,tiles,label,total:0,lastAt:0};
 }
 const now=Number(doc.defaultView?.performance?.now?.())||Date.now();
 pool.total=now-pool.lastAt<850?pool.total+gain:gain;pool.lastAt=now;pool.label.textContent=pool.total>0?`+${pool.total}`:'';
 const end=target.getBoundingClientRect();pool.label.style.left=Math.round(end.right+6)+'px';pool.label.style.top=Math.round(end.top+8)+'px';
 pool.label._rise?.cancel();pool.label._rise=pool.label.animate?.([{opacity:1,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0px)',offset:.6},{opacity:0,transform:'translateY(-8px)'}],{duration:reduce?650:1000,easing:'steps(4,end)'});
 // Reuse exactly two small motes: no beam, afterimage or connecting trace.
 for(const tile of pool.tiles){tile._rise?.cancel();tile.style.opacity='0';}
 if(reduce||raw<=0)return;
 const tip=(target.querySelector('.condensed-icon')||target).getBoundingClientRect();
 for(let i=0;i<2;i++){
  const tile=pool.tiles[i],dx=i?4:-4;
  tile.style.left=(Math.round((tip.left+tip.width*.5+dx)/2)*2)+'px';
  tile.style.top=(Math.round((tip.bottom+18+i*6)/2)*2)+'px';
  tile.style.width='4px';tile.style.height='4px';
  tile._rise=tile.animate?.([{opacity:0,transform:'translateY(0)'},{opacity:1,transform:'translateY(-6px)',offset:.2},{opacity:1,transform:'translateY(-22px)',offset:.8},{opacity:0,transform:'translateY(-26px)'}],{duration:340,delay:i*65,easing:'steps(6,end)'});
 }

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
 const earned=Math.max(0,Math.floor(s.condensedGlow||0)),gain=Math.max(0,earned-(gauge._lastEarned||0));gauge._lastEarned=earned;
 const flow=s.condensationFlow;if(flow&&flow.count!==gauge._flowCount){gauge._flowCount=flow.count;if(flow.count>0)spill(gauge,gain,flow.rawAmount||0);}
}
