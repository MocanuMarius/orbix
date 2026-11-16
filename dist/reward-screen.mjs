import {ARTIFACTS} from './model.mjs?v=dream-gifts-1';
import {artifactDescription} from './artifact-copy.mjs?v=dream-gifts-1';
import {resourceSymbol} from './game-symbols.mjs?v=dream-gifts-1';
import {artifactIcon} from './upgrade-icons.mjs?v=dream-gifts-1';
import {relicIdentityMarkup,relicRulesMarkup,relicRulesButton} from './ui/relic-primitives.mjs?v=dream-gifts-1';
import {actionButton} from './ui/primitives.mjs?v=dream-gifts-1';
import {acquiredRewardMarkup} from './ui/acquired-reward.mjs?v=reward-compositions-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const rewardDescription=(a,run)=>{const c=artifactDescription(a,run,{fresh:true});return [c.effect,[c.trigger,c.limit].filter(Boolean).join(' ')];};
export function rewardEarnings(run){
 const f=run?.lastFlight||{},rows=[
  ['Clear reward',f.completionBonus],['Overflow',f.pickupCondensedGlow],['Exit packing',f.exitPacking?.amount],
  ['Pact',f.pactBonus],['Seal',f.treasureWager?.reward],['Vow',f.vow?.reward],
  ['Route bonus',f.routeBonus?.amount],['Chest gifts',f.chestIncome?.amount],
  ['Kept Light',f.keptLightDividend],['Storage perk',f.storageBonus],['Tight Packing',f.cardPackingBonus],
  ['Resonance',f.resonanceStored],['Cards on clear',f.cardClearReceipt?.stored],
 ].map(([label,amount])=>({label,amount:Math.max(0,Math.floor(Number(amount)||0))})).filter(row=>row.amount);
 return {rows,total:rows.reduce((sum,row)=>sum+row.amount,0)};
}
export function rewardEarningsDetailMarkup(run){
 const {rows,total}=rewardEarnings(run),f=run?.lastFlight||{};
 const notes=[f.routeBonus?.message,f.treasureWager?.message,f.vow?.message,f.chestIncome?.message||(f.chestIncome?.sources?.length?`${f.chestIncome.sources.join(' + ')} · +${f.chestIncome.amount} Stored Sparks`:null),
  f.cardClearReceipt?.futureCapacity?`Growth Ring · +${f.cardClearReceipt.futureCapacity} maximum Sparks permanently`:null,
  f.cardClearReceipt?.cruisingSpeed?`Wind Feather · +${f.cardClearReceipt.cruisingSpeed}% cruising speed unlocked (cap +6%)`:null].filter(Boolean);
 return `<section class="reward-earnings-detail"><header><h2>Stored Sparks earned</h2><strong>${resourceSymbol('packed')} +${total}</strong></header><dl>${rows.map(row=>`<div><dt>${esc(row.label)}</dt><dd>+${row.amount}</dd></div>`).join('')}</dl>${notes.length?`<div class="reward-earnings-context">${notes.map(note=>`<p>${esc(note)}</p>`).join('')}</div>`:''}</section><button class="primary" data-action="close-sheet">Back to rewards</button>`;
}
export function flightRewardMarkup(state,{artifactArt=artifactIcon,upgradeCount=0,skillsAvailable=true,acquiredPresentation=null}={}){
 const r=state.run,reward=r.flightReward,offers=(reward?.offers||[]).filter(id=>ARTIFACTS[id]),open=!!reward&&!reward.claimed&&offers.length>0;
 if(!reward?.permanent&&!r.lastFlight?.elite&&!r.lastFlight?.boss&&!offers.length)return '';
 const earned=rewardEarnings(r).total;
 const receiptAvailable=earned>0||['routeBonus','treasureWager','vow','chestIncome','cardClearReceipt'].some(key=>r.lastFlight?.[key]);
 const title=reward?.permanent?'Choose a relic discovery':r.lastFlight?.boss?'Guardian defeated':r.lastFlight?.elite?'Elite cleared':'Passage cleared';
 const ids=open?offers:ARTIFACTS[reward?.chosen]?[reward.chosen]:[];
 if(!open&&!reward?.permanent&&ids.length===1&&['pedestal','horizontal','compact'].includes(acquiredPresentation)){
  const artifact=ARTIFACTS[ids[0]],copy=artifactDescription(artifact,r);
  return acquiredRewardMarkup({artifact,copy,run:r,title,earned,receiptAvailable,presentation:acquiredPresentation,artifactArt});
 }
 return `<section class="artifact-reward-screen accumulating-rewards ${open?'reward-open':'reward-resolved'} ${ids.length?'has-artifacts':'clear-only'}">
 <header class="artifact-reward-heading"><h1>${esc(title)}${open?'<small>Choose one</small>':''}</h1>${receiptAvailable?`<button class="reward-packed-earned" data-action="reward-earnings" aria-label="${earned} Stored Sparks earned. View breakdown.">${resourceSymbol('packed')}<b>+${earned}</b><span>Earned · Details</span></button>`:''}</header>
 ${ids.length?`<div class="artifact-pair ${ids.length===1?'artifact-pair-resolved':''}" aria-label="${open?'Choose one artifact':'Acquired artifact'}">${ids.map(id=>{
 const a=ARTIFACTS[id],copy=artifactDescription(a,r,{fresh:open});
 return `<article class="artifact-choice ${a.rarity}" data-reward-artifact="${id}">${relicIdentityMarkup(a,copy,{artifactArt,lifetime:reward.permanent?(r.testMode?'TEST preview':'Permanent discovery'):copy.lifetime})}${relicRulesMarkup(copy)}<footer class="artifact-choice-actions">${relicRulesButton(a)}${open?actionButton(`${reward.permanent?'Discover':'Take artifact'} →`,{className:'primary',action:'keep-flight-reward',id,ariaLabel:`${reward.permanent?'Discover':'Take'} ${a.name}`}):`<span class="artifact-acquired" role="status">✓ ${reward.permanent?'Unlocked for future runs':copy.type==='consumable'?'Ready · '+copy.lifetime.split(' · ')[0]:'Active this run'}</span>`}</footer></article>`;
 }).join('')}</div>`:`<div class="flight-clear-summary">${resourceSymbol('packed')}<strong>${reward?.permanent?'Collection complete':'Passage secured'}</strong><span>${reward?.permanent?'All guardian unlocks discovered.':'Open Skills to spend your Stored Sparks.'}</span></div>`}
 <footer class="artifact-reward-actions">${open?`<span class="artifact-choice-instruction">Choose one · ${reward.permanent?(r.testMode?'preview in TEST':'save to your Collection'):'works automatically'}</span>`:`${skillsAvailable&&!reward?.permanent?`<button class="secondary ${upgradeCount?'upgrade-ready':''}" data-action="skills">${resourceSymbol('packed')}<span>${upgradeCount?'Upgrade':'Plan skills'}</span></button>`:''}<button class="primary" data-action="victory-next">Continue →</button>`}</footer></section>`;
}
