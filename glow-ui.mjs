import {formatGlow,getGlowCapacity,FLAME_TUNING,glowPoints} from './vitality.mjs?v=combo-craft-1';
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
 if(!pool){const host=doc.createElement('div');host.className='condensation-motes';host.setAttribute('aria-hidden','true');const beam=doc.createElement('i');beam.className='condensation-beam';host.appendChild(beam);const label=doc.createElement('b');host.appendChild(label);doc.querySelector('.flight-device')?.appendChild(host);pool=gauge._spillPool={host,beam,label,total:0,lastAt:0};}
 const now=Number(doc.defaultView?.performance?.now?.())||Date.now();
 pool.total=now-pool.lastAt<850?pool.total+gain:gain;pool.lastAt=now;pool.label.textContent=pool.total>0?`+${pool.total}`:'';
 const end=target.getBoundingClientRect();pool.label.style.left=Math.round(end.right+12)+'px';pool.label.style.top=Math.round(end.top+8)+'px';
 pool.label._rise?.cancel();pool.label._rise=pool.label.animate?.([{opacity:1,transform:'translate(-50%,4px)'},{opacity:1,offset:.6},{opacity:0,transform:'translate(-50%,-8px)'}],{duration:reduce?650:1000});
 if(reduce||raw<=0)return;
 const start=meter.getBoundingClientRect(),tip=(target.querySelector('.condensed-icon')||target).getBoundingClientRect();
 const sx=start.left+start.width*.5,sy=start.top,ex=tip.left+tip.width*.5,ey=tip.bottom;
 const length=Math.hypot(ex-sx,ey-sy),angle=Math.atan2(ex-sx,sy-ey)*180/Math.PI;
 const beam=pool.beam;beam._rise?.cancel();beam.style.left=Math.round(sx-6)+'px';beam.style.top=Math.round(sy-length)+'px';beam.style.height=Math.round(length)+'px';
 // One continuous column grows from the full meter into the nearby reservoir.
 beam._rise=beam.animate?.([{opacity:0,transform:`rotate(${angle}deg) scaleY(.08) scaleX(.5)`},{opacity:.95,transform:`rotate(${angle}deg) scaleY(1) scaleX(1)`,offset:.24},{opacity:.72,transform:`rotate(${angle}deg) scaleY(1) scaleX(.8)`,offset:.65},{opacity:0,transform:`rotate(${angle}deg) scaleY(1) scaleX(.25)`}],{duration:800,easing:'ease-out'});
}
export function updateGlowGauge(gauge,s){
 if(!gauge)return;
 const draining=(s.blackHole?.rate||0)>0;if(gauge._draining!==draining){gauge._draining=draining;gauge.classList.toggle('black-hole-drain',draining);}
 const refs=gauge._glowRefs||(gauge._glowRefs={fill:gauge.querySelector('#flame-fill'),meter:gauge.querySelector('#flame-meter'),value:gauge.querySelector('#flame-value'),effort:gauge.querySelector('.glow-effort-preview')});
 const max=s.maxFlame||100,glow=Math.max(0,s.flame||0),ratio=clamp(glow/max),cost=Number.isFinite(s.flapCost)?Math.max(0,s.flapCost):FLAME_TUNING.flapCost;
 const key=[glowPoints(glow),glowPoints(max)].join('/');if(gauge._label!==key){gauge._label=key;refs.value.innerHTML=`${formatGlow(glow)}<small>/${formatGlow(max)}</small>`;refs.meter.setAttribute('aria-valuenow',glowPoints(glow));refs.meter.setAttribute('aria-valuemax',glowPoints(max));refs.meter.setAttribute('aria-valuetext',`${formatGlow(glow)} of ${formatGlow(max)} Glow`);}
 const fill=ratio.toFixed(4);if(gauge._fill!==fill){gauge._fill=fill;refs.fill.style.transform=`scaleY(${fill})`;gauge.classList.toggle('low-glow',ratio<=.2);gauge.classList.toggle('full-glow',ratio>=.995);}
 if(cost>0)gauge._lastCost=cost;const effort=Math.min(cost||gauge._lastCost||FLAME_TUNING.flapCost,max),step=(100*effort/max).toFixed(3)+'%';if(gauge._step!==step){gauge._step=step;gauge.style.setProperty('--lift-segment',step);}
 refs.effort.style.bottom=(100*clamp((glow-cost)/max))+'%';refs.effort.style.height=(100*Math.min(glow,cost)/max)+'%';
 const earned=Math.max(0,Math.floor(s.condensedGlow||0)),gain=Math.max(0,earned-(gauge._lastEarned||0));gauge._lastEarned=earned;
 const flow=s.condensationFlow;if(flow&&flow.count!==gauge._flowCount){gauge._flowCount=flow.count;if(flow.count>0)spill(gauge,gain,flow.rawAmount||0);}
}
