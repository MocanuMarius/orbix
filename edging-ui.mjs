import { GLOW_DISPLAY_SCALE } from './vitality.mjs?v=guardian-scenery-1';
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
const explanation='Proximity (unlocked skill): skim near solid terrain for 2 seconds total. Brief gaps keep your progress for 1.25 seconds, then it fades slowly. A full meter automatically reveals the scene.';
const regenExplanation='Regenerative Falling: skim near solid terrain to restore 1 Energy instead of revealing the scene. Eight recoveries per flight; missing fuel only. Two seconds to reset. No Packed Sparks is created.';

/** A passive flight indicator; it never adds a third action or spends Energy. */
export function edgingPulseMarkup(){
 return `<div class="edging-pulse-gauge" data-pulse-state="idle" aria-live="off" title="${explanation}" hidden><div class="edging-pulse-meter" role="meter" aria-label="Edging Pulse" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0% charged"><i class="edging-pulse-fill" aria-hidden="true"></i><i class="edging-pulse-ticks" aria-hidden="true"></i></div></div>`;
}

/** Cache nodes and changed values. Active fill shows time left, not stored charge. */
export function updateEdgingPulse(gauge,snapshot){
 if(!gauge)return;
 const pulse=snapshot?.edgingPulse;if(!pulse)return;
 const refs=gauge._edgingRefs||(gauge._edgingRefs={meter:gauge.querySelector('.edging-pulse-meter'),fill:gauge.querySelector('.edging-pulse-fill')});
 const charge=clamp(pulse.charge),active=!!pulse.active,remaining=Math.max(0,Number(pulse.remaining)||0),duration=Math.max(.001,Number(pulse.duration)||5);
 const regenerative=pulse.mode==='regen',spent=regenerative&&!!pulse.exhausted,feedback=regenerative&&!!pulse.regenFeedback;
 if(gauge._edgingKind!==pulse.mode){
  gauge._edgingKind=pulse.mode;gauge.dataset.edgingMode=regenerative?'regen':'pulse';
  gauge.title=regenerative?regenExplanation:explanation;
  refs.meter.setAttribute('aria-label',regenerative?'Regenerative Falling':'Edging Pulse');
 }
 gauge.hidden=!(charge>0&&!active&&!pulse.recovering&&!feedback);
 const recovering=!active&&!!pulse.recovering,ratio=spent||feedback||active||recovering?0:charge;
 const mode=feedback?'regenerated':spent?'spent':active?'active':recovering?'recovering':pulse.nearEdge?'charging':pulse.holding?'holding':charge>0?'fading':'idle';
 if(gauge._edgingMode!==mode){gauge._edgingMode=mode;gauge.dataset.pulseState=mode;}
 const fill=Math.round(ratio*12);if(gauge._edgingFill!==fill){gauge._edgingFill=fill;refs.fill.style.transform='none';refs.fill.style.height=`${fill?fill*5-1:0}px`;}
 const percent=Math.round(ratio*100),seconds=Math.ceil(remaining),recovered=Number(pulse.regenGain)||0;
 const gainLabel=recovered>=1/GLOW_DISPLAY_SCALE-1e-9?'+1':recovered>0?'TOPUP':'FULL';
 const progressText=`${percent}% charged${pulse.nearEdge?', close to an edge':pulse.holding?', progress held between edges':charge>0?', fading slowly in open space':''}`;
 const regenStatus=spent?'All eight recoveries spent for this flight':`${pulse.grantsRemaining} recoveries left this flight`;
 const valueText=feedback?`${gainLabel==='+1'?'Restored 1 Sparks':gainLabel==='TOPUP'?'Sparks topped up':'Sparks already full'}. ${regenStatus}`
  :spent?regenStatus:active?`Revealing, ${seconds} ${seconds===1?'second':'seconds'} remaining`
  :`${recovering?'Resetting':progressText}${regenerative?`. ${regenStatus}`:''}`;
 if(gauge._edgingPercent!==percent){gauge._edgingPercent=percent;refs.meter.setAttribute('aria-valuenow',String(percent));}
 if(gauge._edgingValueText!==valueText){gauge._edgingValueText=valueText;refs.meter.setAttribute('aria-valuetext',valueText);}
}
