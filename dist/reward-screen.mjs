import {ARTIFACTS} from './model.mjs?v=collector-orbit-1';
import {artifactRarityLabel} from './replay-ui.mjs?v=collector-orbit-1';
import {artifactDescription,effectMarkup} from './artifact-copy.mjs?v=collector-orbit-1';
import {resourceSymbol} from './game-symbols.mjs?v=collector-orbit-1';
import {artifactIcon} from './upgrade-icons.mjs?v=collector-orbit-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const rewardDescription=(a,run)=>{const c=artifactDescription(a,run,{fresh:true});return [c.effect,[c.trigger,c.limit].filter(Boolean).join(' ')];};
export function flightRewardMarkup(state,{artifactArt=artifactIcon,upgradeCount=0,skillsAvailable=true}={}){
 const r=state.run,reward=r.flightReward,offers=(reward?.offers||[]).filter(id=>ARTIFACTS[id]),open=!!reward&&!reward.claimed&&offers.length>0;
 const clear=Number(r.lastFlight?.completionBonus)||0,overflow=Number(r.lastFlight?.pickupCondensedGlow)||0,earned=clear+overflow;
 const title=reward?.permanent?'Guardian defeated':r.lastFlight?.boss?'Guardian defeated':r.lastFlight?.elite?'Elite cleared':'Passage cleared';
 const ids=open?offers:ARTIFACTS[reward?.chosen]?[reward.chosen]:[];
 return `<section class="artifact-reward-screen accumulating-rewards ${open?'reward-open':'reward-resolved'} ${ids.length?'has-artifacts':'clear-only'}">
 <header class="artifact-reward-heading"><h1>${esc(title)}</h1>${earned?`<span class="reward-packed-earned" aria-label="${earned} Packed Sparks earned: ${clear} for clearing, ${overflow} from overflow">${resourceSymbol('packed')}<b>+${earned}</b><span class="reward-earnings-notes">${clear?`<i>${overflow?`${clear} clear`:'Clear reward'}</i>`:''}${overflow?`<i>${overflow} overflow</i>`:''}</span></span>`:''}</header>
 ${ids.length?`<div class="artifact-pair ${ids.length===1?'artifact-pair-resolved':''}" aria-label="${open?'Choose one artifact':'Acquired artifact'}">${ids.map(id=>{
 const a=ARTIFACTS[id],copy=artifactDescription(a,r,{fresh:open});
 return `<article class="artifact-choice ${a.rarity}" data-reward-artifact="${id}"><div class="artifact-choice-art">${artifactArt(id)}<span>${artifactRarityLabel(a)}</span></div><div class="artifact-choice-copy"><h2>${esc(a.name)}</h2><span class="artifact-choice-lifetime">${esc(reward.permanent?'Unlock for future boss rewards':copy.lifetime)}</span>${copy.trigger?`<p class="artifact-choice-trigger">${esc(copy.trigger)}</p>`:''}<p class="artifact-choice-effect">${effectMarkup(copy.effect)}</p>${copy.limit?`<p class="artifact-choice-limit">${esc(copy.limit)}</p>`:''}</div>${open?`<button class="primary" data-action="keep-flight-reward" data-id="${id}" aria-label="${reward.permanent?'Unlock':'Take'} ${esc(a.name)}">${reward.permanent?'Unlock':'Take artifact'} →</button>`:`<span class="artifact-acquired" role="status">✓ ${reward.permanent?'Unlocked for future runs':'Active for this run'}</span>`}</article>`;
 }).join('')}</div>`:`<div class="flight-clear-summary">${resourceSymbol('packed')}<strong>${reward?.permanent?'Collection complete':'Passage secured'}</strong><span>${reward?.permanent?'All guardian unlocks discovered.':'Spend your Packed Sparks or save for your next choice.'}</span></div>`}
 <footer class="artifact-reward-actions">${open?`<span class="artifact-choice-instruction">Choose one · ${reward.permanent?'future reward unlock':'works automatically'}</span>`:`${skillsAvailable&&!reward?.permanent?`<button class="secondary ${upgradeCount?'upgrade-ready':''}" data-action="skills">${resourceSymbol('packed')}<span>${upgradeCount?'Upgrade':'Skills'}</span></button>`:''}<button class="primary" data-action="victory-next">Continue →</button>`}</footer></section>`;
}
