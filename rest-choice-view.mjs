import {getGlowCapacity,formatGlow} from './vitality.mjs?v=clear-rewards-1';
import {livesMarkup} from './lives.mjs?v=clear-rewards-1';
import {resourceSymbol} from './game-symbols.mjs?v=clear-rewards-1';
import {choiceScene} from './choice-art.mjs?v=clear-rewards-1';
import {mapStopIconMarkup} from './map-guide.mjs?v=clear-rewards-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function restBenefitsMarkup(run,node,choices){
 const capacity=getGlowCapacity(run),fullHearts={...run,lives:run.maxLives||3};
 return `<section class="rest-choice-screen rest-simple"><aside class="rest-rail"><div class="rest-place-art">${mapStopIconMarkup(node)}</div><span class="rest-eyebrow">REST · MAP ${run.mapIndex+1}/3</span><h1>${esc(node.name)}</h1><div class="rest-vitals">${livesMarkup(run)}<span class="rest-glow" aria-label="${formatGlow(run.flame)} of ${formatGlow(capacity)} Sparks">${resourceSymbol('glow')}<b>${formatGlow(run.flame)}<small>/${formatGlow(capacity)}</small></b></span></div><details class="rest-rules"><summary>ⓘ Rest rules</summary><div>${choices.map(c=>`<p><b>${esc(c.title)}</b>${esc(c.description)}</p>`).join('')}<p>Choose once. Both refill Sparks without creating Packed Sparks. Then prepare your build or Dream the next passage.</p></div></details></aside><div class="rest-benefit-area"><div class="rest-choice-caption"><b>CHOOSE ONE</b><span class="rest-refill-note">${resourceSymbol('glow')} Both refill Sparks</span></div><div class="rest-benefit-cards" style="--rest-choice-count:2">${choices.map((c,index)=>{
 const grow=c.effect.rest==='grow',gain=Math.max(0,c.effect.glowCapacity||0),after=capacity+gain;
 return `<button class="rest-benefit" data-action="support" data-index="${index}" ${c.disabled?'disabled':''} aria-label="${esc(c.title+'. '+c.description)}">${choiceScene(grow?'refillGlow':'hearts')}<h2>${esc(c.title)}</h2>${grow?`<span class="rest-capacity-gain">${c.disabled?'✓ ✓ ✓':`<b>+${formatGlow(gain)}</b> ${resourceSymbol('glow')} MAX`}</span>`:`<span class="rest-heart-result">${livesMarkup(run)}<i aria-hidden="true">→</i>${livesMarkup(fullHearts)}</span>`}${!c.disabled?`<span class="rest-full-sparks" aria-label="Refills to ${formatGlow(after)} of ${formatGlow(after)} Sparks">${resourceSymbol('glow')}<b>${formatGlow(after)}<small>/${formatGlow(after)}</small></b></span>`:''}<span class="rest-pick-cue">${c.disabled?'CAPACITY FULL':'CHOOSE →'}</span></button>`;
 }).join('')}</div></div></section>`;
}
