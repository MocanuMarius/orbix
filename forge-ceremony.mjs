import {cardFace} from './card-ui.mjs?v=inscribe-1';
import {resourceSymbol} from './game-symbols.mjs?v=inscribe-1';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

/** Phases in order, with their length in ms. Full motion is about 1.2 s; reduced motion is one short cross-fade. */
export const FORGE_CEREMONY_PHASES=Object.freeze([['gather',450],['strike',250],['reveal',500]]);
export const FORGE_CEREMONY_REDUCED=Object.freeze([['fade',260]]);
export const forgeCeremonyPlan=reduced=>reduced?FORGE_CEREMONY_REDUCED:FORGE_CEREMONY_PHASES;
export const forgeCeremonyLength=reduced=>forgeCeremonyPlan(reduced).reduce((sum,[,ms])=>sum+ms,0);

/**
 * The ceremony state machine, separate from the DOM. idle -> phases... -> done.
 * skip() jumps straight to done; it is safe to call at any time, any number of times, and onDone fires once.
 */
export function createForgeCeremony({reduced=false,onPhase=()=>{},onDone=()=>{},setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}={}){
 const plan=forgeCeremonyPlan(reduced);let phase='idle',index=-1,timer=null;
 const finish=()=>{if(phase==='done')return;clearTimer(timer);timer=null;phase='done';onPhase('done');onDone();};
 const step=()=>{
  if(phase==='done')return;
  index++;
  if(index>=plan.length)return finish();
  phase=plan[index][0];onPhase(phase);
  timer=setTimer(step,plan[index][1]);
 };
 return {get phase(){return phase;},start(){if(phase==='idle')step();},skip:finish,cancel(){clearTimer(timer);timer=null;phase='done';}};
}

const EMBERS=[[-86,-70],[-58,-96],[-24,-110],[12,-104],[46,-92],[80,-66],[-100,-24],[100,-30],[-70,-44],[64,-52],[-36,-72],[30,-80]];
/** The forged card is the real card; the sources are the two Stored Sparks that paid for it. */
export function forgeCeremonyMarkup(card,{price=0,reduced=false}={}){
 const chip=side=>`<span class="forge-chip forge-chip-${side}" aria-hidden="true">${resourceSymbol('packed')}</span>`;
 const embers=EMBERS.map(([x,y],i)=>`<i style="--x:${x}px;--y:${y}px;--d:${(i%4)*18}ms"></i>`).join('');
 return `<section class="forge-ceremony ${reduced?'forge-reduced':''}" data-phase="${reduced?'fade':'gather'}"><div class="forge-ceremony-stage" role="button" tabindex="0" data-action="forge-ceremony-skip" aria-label="Forging ${esc(card.name||'a card')}. Tap to skip."><span class="forge-anvil-line" aria-hidden="true"></span><span class="forge-mystery" aria-hidden="true"><strong>?</strong></span>${chip('left')}${chip('right')}<span class="forge-embers" aria-hidden="true">${embers}</span><span class="forge-face card-forge-card">${cardFace(card)}</span></div><p class="forge-caption" role="status">Forged: ${esc(card.name||'Card')} · ${price>0?`−${Math.floor(price)} Stored Sparks`:'free from the chest'}</p></section>`;
}

/** Mounts the ceremony in `root`, drives it with timers, and calls onDone exactly once. Returns a handle with skip(). */
export function runForgeCeremony(root,card,{price=0,reduced=false,onDone=()=>{},setTimer,clearTimer}={}){
 root.innerHTML=forgeCeremonyMarkup(card,{price,reduced});
 const el=root.querySelector('.forge-ceremony');
 const machine=createForgeCeremony({reduced,setTimer,clearTimer,onPhase:phase=>{if(el&&phase!=='done')el.dataset.phase=phase;},onDone:()=>{el?.remove();onDone();}});
 const skipButton=root.querySelector('[data-action="forge-ceremony-skip"]');
 skipButton?.addEventListener('click',event=>{event.stopPropagation();machine.skip();},{once:true});
 skipButton?.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();machine.skip();}});
 skipButton?.focus?.({preventScroll:true});
 machine.start();
 return machine;
}
