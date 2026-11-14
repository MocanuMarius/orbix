import {getGlowCapacity,GLOW_DISPLAY_SCALE} from './vitality.mjs?v=pine-spark-2';
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
export const PACKING_TIMING=Object.freeze({travel:350,packing:1000,total:1700});
function spill(gauge,gain,raw,remainder=0){
 const doc=gauge.ownerDocument,target=doc.querySelector('.flight-condensed-counter');if(!target||raw<=0)return;
 const reduce=doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let pool=gauge._spillPool;
 if(!pool){
  const host=doc.createElement('div');host.className='condensation-motes';host.setAttribute('aria-hidden','true');
  const box=doc.createElement('span');box.className='packing-box';box.innerHTML='<i></i><span class="packing-left"></span><span class="packing-right"></span>';host.appendChild(box);
  const tiles=Array.from({length:2},()=>{const tile=doc.createElement('i');tile.className='condensation-particle';host.appendChild(tile);return tile;});
  const label=doc.createElement('b');host.appendChild(label);doc.querySelector('.flight-device')?.appendChild(host);
  pool=gauge._spillPool={host,box,tiles,label,busy:false,pending:null};
 }
 if(pool.busy){const p=pool.pending??={gain:0,raw:0,remainder};p.gain+=gain;p.raw+=raw;p.remainder=remainder;return;}
 if(!pool.host.isConnected)return;pool.busy=true;
 const bounds=pool.host.getBoundingClientRect(),sx=bounds.width/(pool.host.clientWidth||bounds.width),sy=bounds.height/(pool.host.clientHeight||bounds.height);
 const meter=gauge._glowRefs.meter.getBoundingClientRect(),tip=(target.querySelector('.condensed-icon')||target).getBoundingClientRect();
 const x=(meter.left+meter.width/2-bounds.left)/sx,start=(meter.top-bounds.top)/sy-3,end=(tip.top+tip.height/2-bounds.top)/sy,mid=(start+end)/2;
 const first=350/1700,second=1350/1700,ease='cubic-bezier(.22,.75,.3,1)',at=y=>'translateY('+y+'px)';
 const animations=[];
 for(const [i,tile]of pool.tiles.entries()){
  tile.style.left=(x-4)+'px';tile.style.top='0px';
  if(!reduce)animations.push(tile.animate([
   {opacity:i?.3:1,transform:at(start),offset:0,easing:ease},
   {opacity:i?.3:1,transform:at(mid),offset:first},
   {opacity:0,transform:at(mid),offset:first+.08},
   {opacity:0,transform:at(mid),offset:second-.001},
   {opacity:i?.3:1,transform:at(mid),offset:second,easing:ease},
   {opacity:0,transform:at(end),offset:1}
  ],{duration:1700,delay:i*24,fill:'none'}));
 }
 const box=pool.box;box.style.left=(x-10)+'px';box.style.top=(mid-10)+'px';box.style.setProperty('--packing-fill',Math.max(.2,gain>0?1:remainder));
 const pack=box.animate(reduce?[{opacity:1},{opacity:0}]:[
  {opacity:0,offset:0},{opacity:0,offset:first},{opacity:1,offset:first+.08},
  {opacity:1,offset:second},{opacity:0,offset:second+.06},{opacity:0,offset:1}
 ],{duration:reduce?350:1700});animations.push(pack);
 if(!reduce)for(const [i,lid]of [...box.querySelectorAll('span')].entries())animations.push(lid.animate([
  {transform:'rotate('+(i?110:-110)+'deg)'},{transform:'rotate(0deg)'}
 ],{delay:i?800:500,duration:250,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'}));
 pool.label.style.left=((target.getBoundingClientRect().right-bounds.left)/sx+7)+'px';pool.label.style.top=((tip.top-bounds.top)/sy)+'px';

 pack.finished.catch(()=>{}).then(()=>{
  for(const animation of animations)if(animation.playState==='finished')animation.cancel();
  if(gain>0&&pool.host.isConnected){pool.label.textContent='+'+gain;pool.label._rise?.cancel();pool.label._rise=pool.label.animate([{opacity:1},{opacity:1,offset:.7},{opacity:0}],{duration:600});target.animate([{opacity:1},{opacity:.55},{opacity:1}],{duration:240});}
  pool.busy=false;const next=pool.pending;pool.pending=null;if(next&&pool.host.isConnected)spill(gauge,next.gain,next.raw,next.remainder);
 });
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
