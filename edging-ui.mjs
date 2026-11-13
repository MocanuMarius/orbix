const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const explanation='Edging Pulse: skim near solid terrain or the top and bottom edges for 2 seconds total. Brief gaps keep your progress for 1.25 seconds, then it fades slowly. A full meter automatically reveals the scene.';

/** A passive flight indicator; it never adds a third action or spends Glow. */
export function edgingPulseMarkup(){
 return `<div class="edging-pulse-gauge" data-pulse-state="idle" aria-live="off" title="${explanation}" hidden><span class="edging-pulse-caption" aria-hidden="true">PULSE</span><div class="edging-pulse-meter" role="meter" tabindex="0" aria-label="Edging Pulse" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0% charged"><i class="edging-pulse-fill" aria-hidden="true"></i><i class="edging-pulse-ticks" aria-hidden="true"></i></div><span class="edging-pulse-value" aria-hidden="true">0%</span></div>`;
}

/** Cache nodes and changed values. Active fill shows time left, not stored charge. */
export function updateEdgingPulse(gauge,snapshot){
 if(!gauge)return;
 const pulse=snapshot?.edgingPulse;if(!pulse)return;
 const refs=gauge._edgingRefs||(gauge._edgingRefs={meter:gauge.querySelector('.edging-pulse-meter'),fill:gauge.querySelector('.edging-pulse-fill'),value:gauge.querySelector('.edging-pulse-value')});
 const charge=clamp(pulse.charge),active=!!pulse.active,remaining=Math.max(0,Number(pulse.remaining)||0),duration=Math.max(.001,Number(pulse.duration)||5);
 if(!gauge._edgingSeen){
  if(!pulse.nearEdge&&!active&&!pulse.recovering&&charge===0&&!(pulse.triggerCount>0))return;
  gauge._edgingSeen=true;gauge.hidden=false;
 }
 const recovering=!active&&!!pulse.recovering,ratio=active?clamp(remaining/duration):recovering?0:charge;
 const mode=active?'active':recovering?'recovering':pulse.nearEdge?'charging':pulse.holding?'holding':charge>0?'fading':'idle';
 if(gauge._edgingMode!==mode){gauge._edgingMode=mode;gauge.dataset.pulseState=mode;}
 const fill=ratio.toFixed(3);if(gauge._edgingFill!==fill){gauge._edgingFill=fill;refs.fill.style.transform=`scaleY(${fill})`;}
 const percent=Math.round(ratio*100),seconds=Math.ceil(remaining),label=active?`${seconds}s`:recovering?'RESET':`${percent}%`;
 if(gauge._edgingLabel!==label){gauge._edgingLabel=label;refs.value.textContent=label;}
 const valueText=active?`Revealing, ${seconds} ${seconds===1?'second':'seconds'} remaining`:recovering?'Resetting':`${percent}% charged${pulse.nearEdge?', close to an edge':pulse.holding?', progress held between edges':charge>0?', fading slowly in open space':''}`;
 if(gauge._edgingPercent!==percent){gauge._edgingPercent=percent;refs.meter.setAttribute('aria-valuenow',String(percent));}
 if(gauge._edgingValueText!==valueText){gauge._edgingValueText=valueText;refs.meter.setAttribute('aria-valuetext',valueText);}
}
