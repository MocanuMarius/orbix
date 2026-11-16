import {ARTIFACTS} from './model.mjs?v=collector-reel-1';
import {artifactRarityLabel} from './replay-ui.mjs?v=collector-reel-1';
import {artifactDescription,effectMarkup} from './artifact-copy.mjs?v=collector-reel-1';
import {resourceSymbol} from './game-symbols.mjs?v=collector-reel-1';
import {artifactIcon} from './upgrade-icons.mjs?v=collector-reel-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const rewardDescription=(a,run)=>{const c=artifactDescription(a,run,{fresh:true});return [c.effect,[c.trigger,c.limit].filter(Boolean).join(' ')];};
export function flightRewardMarkup(state,{artifactArt=artifactIcon,upgradeCount=0,skillsAvailable=true}={}){
 const r=state.run,reward=r.flightReward,offers=(reward?.offers||[]).filter(id=>ARTIFACTS[id]),open=!!reward&&!reward.claimed&&offers.length>0;
 if(!reward?.permanent&&!r.lastFlight?.elite&&!r.lastFlight?.boss&&!offers.length)return '';
 const wager=r.lastFlight?.treasureWager;
 const clear=Number(r.lastFlight?.completionBonus)||0,overflow=Number(r.lastFlight?.pickupCondensedGlow)||0;
 const bonus=r.lastFlight?.routeBonus,vow=r.lastFlight?.vow;
 const chestIncome=r.lastFlight?.chestIncome;
 const dividend=Number(r.lastFlight?.keptLightDividend)||0;
 const storageBonus=Number(r.lastFlight?.storageBonus)||0,packingBonus=Number(r.lastFlight?.cardPackingBonus)||0;
 const exit=Number(r.lastFlight?.exitPacking?.amount)||0,pact=Number(r.lastFlight?.pactBonus)||0;
 const earned=clear+overflow+exit+pact+storageBonus+packingBonus+(wager?.reward||0)+(vow?.reward||0)+(bonus?.amount||0)+(chestIncome?.amount||0)+dividend;
 const title=reward?.permanent?'Choose a relic discovery':r.lastFlight?.boss?'Guardian defeated':r.lastFlight?.elite?'Elite cleared':'Passage cleared';
 const ids=open?offers:ARTIFACTS[reward?.chosen]?[reward.chosen]:[];
 return `<section class="artifact-reward-screen accumulating-rewards ${open?'reward-open':'reward-resolved'} ${ids.length?'has-artifacts':'clear-only'}">
 <header class="artifact-reward-heading"><h1>${esc(title)}</h1>${bonus?`<span class="treasure-wager-receipt" data-met="true">${esc(bonus.message)}</span>`: ''}${wager?`<span class="treasure-wager-receipt" data-met="${wager.completed}" role="status">${esc(wager.message)}</span>`: ''}${earned?`<span class="reward-packed-earned" aria-label="${earned} Stored Sparks earned: ${clear} for clearing, ${overflow} from overflow, ${exit} from remaining Sparks, ${pact} from the pact, ${wager?.reward||0} from the seal${chestIncome?.amount?', '+chestIncome.amount+' from chest gifts':''}${bonus?.amount?', '+bonus.amount+' from the route bonus':''}${vow?.reward?', '+vow.reward+' from the vow':''}${storageBonus?', '+storageBonus+' from a Storage perk':''}${dividend?', '+dividend+' from Kept Light':''}${packingBonus?', '+packingBonus+' from Tight Packing':''}">${resourceSymbol('packed')}<b>+${earned}</b><span class="reward-earnings-notes">${packingBonus?`<i>Tight Packing +${packingBonus}</i>`: ''}${storageBonus?`<i>Storage +${storageBonus}</i>`: ''}${dividend?`<i>Kept Light +${dividend}</i>`:''}${chestIncome?`<i>${esc(chestIncome.sources.join(' + '))} +${chestIncome.amount}</i>`:''}${clear?`<i>${overflow?`${clear} clear`:'Clear reward'}</i>`:''}${exit?`<i>${exit} exit packing</i>`:''}${pact?`<i>${pact} pact</i>`:''}${overflow?`<i>${overflow} overflow</i>`:''}</span></span>`:''}</header>
 ${ids.length?`<div class="artifact-pair ${ids.length===1?'artifact-pair-resolved':''}" aria-label="${open?'Choose one artifact':'Acquired artifact'}">${ids.map(id=>{
 const a=ARTIFACTS[id],copy=artifactDescription(a,r,{fresh:open});
 return `<article class="artifact-choice ${a.rarity}" data-reward-artifact="${id}"><div class="artifact-choice-art">${artifactArt(id)}<span>${artifactRarityLabel(a)}</span></div><div class="artifact-choice-copy"><h2>${esc(a.name)}</h2><span class="artifact-choice-lifetime">${esc(reward.permanent?(r.testMode?'TEST preview':'Permanent discovery'):copy.lifetime)}</span>${copy.trigger?`<p class="artifact-choice-trigger">${esc(copy.trigger)}</p>`:''}<p class="artifact-choice-effect">${effectMarkup(copy.effect)}</p>${copy.limit?`<p class="artifact-choice-limit">${esc(copy.limit)}</p>`:''}</div>${open?`<button class="primary" data-action="keep-flight-reward" data-id="${id}" aria-label="${reward.permanent?'Discover':'Take'} ${esc(a.name)}">${reward.permanent?'Discover':'Take artifact'} →</button>`:`<span class="artifact-acquired" role="status">✓ ${reward.permanent?'Unlocked for future runs':'Active permanently'}</span>`}</article>`;
 }).join('')}</div>`:`<div class="flight-clear-summary">${resourceSymbol('packed')}<strong>${reward?.permanent?'Collection complete':'Passage secured'}</strong><span>${reward?.permanent?'All guardian unlocks discovered.':'Open Skills to spend your Stored Sparks.'}</span></div>`}
 <footer class="artifact-reward-actions">${open?`<span class="artifact-choice-instruction">Choose one · ${reward.permanent?(r.testMode?'preview in TEST':'save to your Collection'):'works automatically'}</span>`:`${skillsAvailable&&!reward?.permanent?`<button class="secondary ${upgradeCount?'upgrade-ready':''}" data-action="skills">${resourceSymbol('packed')}<span>${upgradeCount?'Upgrade':'Plan skills'}</span></button>`:''}<button class="primary" data-action="victory-next">Continue →</button>`}</footer></section>`;
}
