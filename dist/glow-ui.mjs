import {getGlowCapacity,GLOW_DISPLAY_SCALE} from './vitality.mjs?v=guardian-scenery-1';
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
function spill(gauge,gain,raw,remainder=0){
 const doc=gauge.ownerDocument,target=doc.querySelector('.flight-condensed-counter');if(!target||raw<=0)return;
 const reduce=doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let pool=gauge._spillPool;
 if(!pool){
  const host=doc.createElement('div');host.className='condensation-motes';host.setAttribute('aria-hidden','true');
  const box=doc.createElement('span');box.className='packing-box';box.innerHTML='<i></i><em></em>';host.appendChild(box);
  const tiles=Array.from({length:2},()=>{const tile=doc.createElement('i');tile.className='condensation-particle';host.appendChild(tile);return tile;});
  const label=doc.createElement('b');host.appendChild(label);doc.querySelector('.flight-device')?.appendChild(host);
  pool=gauge._spillPool={host,box,tiles,label,total:0,lastAt:0};
 }
 const now=doc.defaultView.performance.now();pool.total=now-pool.lastAt<1200?pool.total+gain:gain;pool.lastAt=now;
 const bounds=pool.host.getBoundingClientRect(),sx=bounds.width/(pool.host.clientWidth||bounds.width),sy=bounds.height/(pool.host.clientHeight||bounds.height);
 const meter=gauge._glowRefs.meter.getBoundingClientRect(),tip=(target.querySelector('.condensed-icon')||target).getBoundingClientRect();
 const x=(meter.right-bounds.left)/sx+8,y=Math.max(52,(meter.top-bounds.top)/sy-22);
 const dx=(tip.left+tip.width/2-bounds.left)/sx-x-10,dy=(tip.top+tip.height/2-bounds.top)/sy-y-10;
 const box=pool.box;box.style.left=x+'px';box.style.top=y+'px';box.style.setProperty('--packing-fill',Math.max(.12,gain>0?1:remainder));
 box._pack?.cancel();box._pack=box.animate?.(reduce?[{opacity:1},{opacity:0}]:[
  {opacity:0,transform:'scale(1.4,.7)'},{opacity:1,transform:'scale(1.25,.8)',offset:.12},
  {opacity:1,transform:'scale(1,1)',offset:.38},
  {opacity:1,transform:'scale(.85,1.15)',offset:.46},
  {opacity:gain>0?1:.3,transform:gain>0?'translate('+dx+'px,'+dy+'px) scale(.75)':'scale(1)',offset:.88},
  {opacity:0,transform:gain>0?'translate('+dx+'px,'+dy+'px) scale(.3)':'scale(1)'}],{duration:reduce?350:1100,easing:'steps(12,end)'});
 for(let i=0;i<2;i++){
  const tile=pool.tiles[i];tile._rise?.cancel();tile.style.left=(x-5)+'px';tile.style.top=(y+i*14)+'px';
  if(!reduce)tile._rise=tile.animate?.([{opacity:0,transform:'translate(-7px,0)'},{opacity:1,offset:.25},{opacity:0,transform:'translate(13px,'+(i?-5:5)+'px) scale(.3)'}],{duration:400,easing:'steps(6,end)'});
 }
 pool.label._rise?.cancel();pool.label.textContent=pool.total>0?'+'+pool.total:'';
 pool.label.style.left=((target.getBoundingClientRect().right-bounds.left)/sx+7)+'px';pool.label.style.top=((tip.top-bounds.top)/sy)+'px';
 if(pool.total>0)pool.label._rise=pool.label.animate?.([{opacity:1},{opacity:1,offset:.7},{opacity:0}],{delay:reduce?0:960,duration:700});
 target._condensedPulse?.cancel();
 if(gain>0)target._condensedPulse=target.animate?.([{opacity:1},{opacity:.55},{opacity:1}],{delay:reduce?0:960,duration:240,easing:'steps(2,end)'});
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
 const flow=s.condensationFlow;if(flow&&flow.count!==gauge._flowCount){gauge._flowCount=flow.count;if(flow.count>0)spill(gauge,gain,flow.rawAmount||0,s.condensedRemainder||0);}
}
