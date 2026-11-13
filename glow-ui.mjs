import {formatGlow,getGlowCapacity,FLAME_TUNING,glowPoints} from './vitality.mjs?v=condensed-glow-1';
const clamp=v=>Math.max(0,Math.min(1,v));
export function glowGaugeMarkup(run){
 const max=getGlowCapacity(run);
 return `<div class="flame-hud glow-side-gauge glow-gauge-v3" aria-label="Flight Glow"><span class="glow-overflow-lip" aria-hidden="true"></span><span class="glow-caption">GLOW</span><div id="flame-meter" role="meter" aria-label="Glow remaining" aria-valuemin="0" aria-valuemax="${glowPoints(max)}" aria-valuenow="${glowPoints(run.flame)}" aria-valuetext="${formatGlow(run.flame)} of ${formatGlow(max)} Glow"><i id="flame-fill" style="transform:scaleY(${clamp(run.flame/max)})"></i><i class="glow-effort-preview" aria-hidden="true"></i><i class="glow-effort-ticks" aria-hidden="true"></i></div><b id="flame-value">${formatGlow(run.flame)}<small>/${formatGlow(max)}</small></b></div>`;
}
function spill(gauge,gain,raw){
 const doc=gauge.ownerDocument,target=doc.querySelector('.flight-condensed-counter');if(!target)return;
 const reduce=doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const flash=[{transform:'scale(1)',opacity:1},{transform:reduce?'scale(1)':'scale(1.08)',opacity:.76,offset:.35},{transform:'scale(1)',opacity:1}];
 target._condensedPulse?.cancel();target._condensedPulse=target.animate?.(flash,{duration:reduce?180:480});
 const meter=gauge._glowRefs.meter;meter._spillPulse?.cancel();meter._spillPulse=meter.animate?.(flash,{duration:reduce?160:420});
 let pool=gauge._spillPool;
 if(!pool){const host=doc.createElement('div');host.className='condensation-motes';host.setAttribute('aria-hidden','true');const dots=[];for(let i=0;i<4;i++){const dot=doc.createElement('i');host.appendChild(dot);dots.push(dot);}const label=doc.createElement('b');host.appendChild(label);doc.querySelector('.flight-device')?.appendChild(host);pool=gauge._spillPool={host,dots,label,total:0,lastAt:0};}
 const now=Number(doc.defaultView?.performance?.now?.())||Date.now();
 pool.total=now-pool.lastAt<850?pool.total+gain:gain;pool.lastAt=now;pool.label.textContent=pool.total>0?`+${pool.total}`:'';
 const end=target.getBoundingClientRect();pool.label.style.left=Math.round(end.left+end.width*.5)+'px';pool.label.style.top=Math.round(end.bottom+3)+'px';
 pool.label._rise?.cancel();pool.label._rise=pool.label.animate?.([{opacity:1,transform:'translate(-50%,4px)'},{opacity:1,offset:.6},{opacity:0,transform:'translate(-50%,-8px)'}],{duration:reduce?650:1000});
 if(reduce||raw<=0)return;
 const start=meter.getBoundingClientRect(),sx=start.left+start.width*.5,sy=start.top,ex=end.left+end.width*.5,ey=end.top+end.height*.4;
 for(let i=0;i<pool.dots.length;i++){const dot=pool.dots[i];dot._flight?.cancel();dot.style.left=Math.round(sx)+'px';dot.style.top=Math.round(sy)+'px';const dx=ex-sx,dy=ey-sy;dot._flight=dot.animate?.([{opacity:0,transform:'translate3d(0,0,0) scale(.7)'},{opacity:1,transform:`translate3d(${(i-1.5)*7}px,-14px,0) scale(1.1)`,offset:.12},{opacity:.9,transform:`translate3d(${dx*.4+(i-1.5)*8}px,${dy*.65-26}px,0)`,offset:.58},{opacity:0,transform:`translate3d(${dx}px,${dy}px,0) scale(.4)`}],{duration:650+i*45,easing:'cubic-bezier(.2,.6,.55,1)'});}
}
export function updateGlowGauge(gauge,s){
 if(!gauge)return;
 const refs=gauge._glowRefs||(gauge._glowRefs={fill:gauge.querySelector('#flame-fill'),meter:gauge.querySelector('#flame-meter'),value:gauge.querySelector('#flame-value'),effort:gauge.querySelector('.glow-effort-preview')});
 const max=s.maxFlame||100,glow=Math.max(0,s.flame||0),ratio=clamp(glow/max),cost=Number.isFinite(s.flapCost)?Math.max(0,s.flapCost):FLAME_TUNING.flapCost;
 const key=[glowPoints(glow),glowPoints(max)].join('/');if(gauge._label!==key){gauge._label=key;refs.value.innerHTML=`${formatGlow(glow)}<small>/${formatGlow(max)}</small>`;refs.meter.setAttribute('aria-valuenow',glowPoints(glow));refs.meter.setAttribute('aria-valuemax',glowPoints(max));refs.meter.setAttribute('aria-valuetext',`${formatGlow(glow)} of ${formatGlow(max)} Glow`);}
 const fill=ratio.toFixed(4);if(gauge._fill!==fill){gauge._fill=fill;refs.fill.style.transform=`scaleY(${fill})`;gauge.classList.toggle('low-glow',ratio<=.2);gauge.classList.toggle('full-glow',ratio>=.995);}
 if(cost>0)gauge._lastCost=cost;const effort=Math.min(cost||gauge._lastCost||FLAME_TUNING.flapCost,max),step=(100*effort/max).toFixed(3)+'%';if(gauge._step!==step){gauge._step=step;gauge.style.setProperty('--lift-segment',step);}
 refs.effort.style.bottom=(100*clamp((glow-cost)/max))+'%';refs.effort.style.height=(100*Math.min(glow,cost)/max)+'%';
 const earned=Math.max(0,Math.floor(s.condensedGlow||0)),gain=Math.max(0,earned-(gauge._lastEarned||0));gauge._lastEarned=earned;
 const flow=s.condensationFlow;if(flow&&flow.count!==gauge._flowCount){gauge._flowCount=flow.count;if(flow.count>0)spill(gauge,gain,flow.rawAmount||0);}
}
