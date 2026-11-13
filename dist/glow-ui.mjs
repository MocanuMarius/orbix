import {getGlowCapacity,GLOW_DISPLAY_SCALE} from './vitality.mjs?v=lantern-paths-1';
const clamp=v=>Math.max(0,Math.min(1,v));
// Cells and gaps share one grid: a lit cell always represents one whole Glow.
export function glowGaugeUnits(flame,maximum=100){
 const max=Math.max(1,Number(maximum)||100),value=clamp((Number(flame)||0)/max)*max*GLOW_DISPLAY_SCALE;
 return {capacity:Math.max(1,Math.round(max*GLOW_DISPLAY_SCALE)),filled:Math.floor(value+1e-7),value:Math.round(value*100)/100};
}
function unitMarkup(state){return Array.from({length:state.capacity},(_,i)=>`<span class="glow-unit${i<state.filled?' lit':''}"></span>`).join('');}
export function glowGaugeMarkup(run){
 const state=glowGaugeUnits(run.flame,getGlowCapacity(run));
 return `<div class="flame-hud glow-side-gauge glow-gauge-v3" aria-label="Flight Glow" style="--glow-units:${state.capacity}"><div id="flame-meter" role="meter" aria-label="Glow remaining" aria-valuemin="0" aria-valuemax="${state.capacity}" aria-valuenow="${state.value}" aria-valuetext="${state.value} of ${state.capacity} Glow; each segment is 1 Glow"><i id="flame-fill" aria-hidden="true">${unitMarkup(state)}</i></div></div>`;
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
  const tiles=Array.from({length:32},()=>{const tile=doc.createElement('i');tile.className='condensation-beam-pixel';host.appendChild(tile);return tile;});
  const label=doc.createElement('b');host.appendChild(label);doc.querySelector('.flight-device')?.appendChild(host);
  pool=gauge._spillPool={host,tiles,label,total:0,lastAt:0};
 }
 const now=Number(doc.defaultView?.performance?.now?.())||Date.now();
 pool.total=now-pool.lastAt<850?pool.total+gain:gain;pool.lastAt=now;pool.label.textContent=pool.total>0?`+${pool.total}`:'';
 const end=target.getBoundingClientRect();pool.label.style.left=Math.round(end.right+6)+'px';pool.label.style.top=Math.round(end.top+8)+'px';
 pool.label._rise?.cancel();pool.label._rise=pool.label.animate?.([{opacity:1,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0px)',offset:.6},{opacity:0,transform:'translateY(-8px)'}],{duration:reduce?650:1000,easing:'steps(4,end)'});
 // Fixed rectangles switch on from basin to box. No scaling, blurred glow or
 // per-frame DOM work; the same bounded 32 tiles are reused for every spill.
 for(const tile of pool.tiles){tile._rise?.cancel();tile.style.opacity='0';}
 if(reduce||raw<=0)return;
 const start=meter.getBoundingClientRect(),tip=(target.querySelector('.condensed-icon')||target).getBoundingClientRect();
 const sx=start.left+start.width*.5,sy=start.top,ex=tip.left+tip.width*.5,ey=tip.bottom;
 const steps=Math.max(1,Math.min(pool.tiles.length,Math.ceil(Math.abs(sy-ey)/4))),height=Math.max(3,Math.ceil(Math.abs(sy-ey)/steps)+1);
 for(let i=0;i<steps;i++){
  const tile=pool.tiles[i],p=(i+.5)/steps,width=i%5===0?12:8;
  tile.style.left=(Math.round((sx+(ex-sx)*p-width*.5)/2)*2)+'px';
  tile.style.top=(Math.round((sy+(ey-sy)*p-height*.5)/2)*2)+'px';
  tile.style.width=width+'px';tile.style.height=height+'px';
  tile._rise=tile.animate?.([{opacity:0},{opacity:.95,offset:.08},{opacity:.8,offset:.6},{opacity:0}],{duration:520,delay:i*11,easing:'steps(3,end)'});
 }
}
export function updateGlowGauge(gauge,s){
 if(!gauge)return;
 const draining=(s.blackHole?.rate||0)>0;if(gauge._draining!==draining){gauge._draining=draining;gauge.classList.toggle('black-hole-drain',draining);}
 const refs=gauge._glowRefs||(gauge._glowRefs={fill:gauge.querySelector('#flame-fill'),meter:gauge.querySelector('#flame-meter')});
 const state=glowGaugeUnits(s.flame,s.maxFlame),ratio=clamp((Number(s.flame)||0)/(s.maxFlame||100));
 const key=state.value+'/'+state.capacity;
 if(gauge._label!==key){gauge._label=key;refs.meter.setAttribute('aria-valuenow',state.value);refs.meter.setAttribute('aria-valuemax',state.capacity);refs.meter.setAttribute('aria-valuetext',`${state.value} of ${state.capacity} Glow; each segment is 1 Glow`);}
 if(gauge._capacity!==state.capacity){gauge._capacity=state.capacity;gauge.style.setProperty('--glow-units',state.capacity);refs.fill.innerHTML=unitMarkup(state);refs.units=Array.from(refs.fill.children);gauge._filled=state.filled;}
 if(gauge._filled!==state.filled){
  const from=Math.min(gauge._filled,state.filled),to=Math.max(gauge._filled,state.filled);
  for(let i=from;i<to;i++)refs.units[i]?.classList.toggle('lit',i<state.filled);
  gauge._filled=state.filled;
 }
 gauge.classList.toggle('low-glow',ratio<=.2);gauge.classList.toggle('full-glow',state.filled===state.capacity);
 const earned=Math.max(0,Math.floor(s.condensedGlow||0)),gain=Math.max(0,earned-(gauge._lastEarned||0));gauge._lastEarned=earned;
 const flow=s.condensationFlow;if(flow&&flow.count!==gauge._flowCount){gauge._flowCount=flow.count;if(flow.count>0)spill(gauge,gain,flow.rawAmount||0);}
}
