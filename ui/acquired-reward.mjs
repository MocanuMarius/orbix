import {artifactLimitSummary,effectMarkup} from '../artifact-copy.mjs?v=burn-1';
import {resourceSymbol} from '../game-symbols.mjs?v=burn-1';
import {artifactRarityLabel} from '../replay-ui.mjs?v=burn-1';
import {ROUTE_BONUSES} from '../route-bonuses.mjs?v=burn-1';
import {bonusIcon} from '../route-bonus-ui.mjs?v=burn-1';
import {routeBonusReceiptText} from '../route-bonus-copy.mjs?v=burn-1';
import {reliquaryNicheMarkup} from './reliquary-art.mjs?v=burn-1';
import {relicRulesButton} from './relic-primitives.mjs?v=burn-1';
import {actionButton,escapeHtml as esc} from './primitives.mjs?v=burn-1';

// Claimed relics share this production layout with the comparison recipes.
function horizonMarkup(){
 return `<svg class="acquired-horizon" viewBox="0 0 240 160" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
 <path fill="#09171a" d="M0 0h240v160H0z"/><path fill="#23352f" d="M0 107h15V91h17V70h15V58h22V39h16v68h18V92h22V64h12V47h18V31h13v76h18V84h20V59h18v48h16v53H0z"/>
 <path fill="#3d4940" d="M31 89h5V72h13V61h19v3H51v11H39v17h-8zM138 61h3V49h15V34h10v3h-7v15h-15v12h-6zM206 83h4V62h12v3h-8v21h-8z"/>
 <path fill="#172a26" d="M0 121h17v-9h23v7h18v-12h26v14h25v-7h22v11h35v-17h28v11h22v-9h24v50H0z"/>
 <path fill="#605947" d="M31 141h47v-5h81v5h53v3H31z"/><path fill="#9a8461" d="M77 136h83v2H77zM46 141h30v2H46zM164 141h26v2h-26z"/>
 <path fill="#c6c992" opacity=".55" d="M24 44h2v2h-2zM55 20h2v2h-2zM99 14h2v2h-2zM191 23h2v2h-2zM219 42h2v2h-2zM172 69h2v2h-2z"/>
 <path fill="#8da68a" opacity=".5" d="M10 145h8v2h-8zM219 133h7v2h-7zM16 130h4v2h-4zM194 151h13v2h-13z"/>
 </svg>`;
}

export function acquiredRewardMarkup({artifact,copy,run,title,earned,receiptAvailable,presentation,artifactArt,skillsAvailable,deckAvailable,upgradeCount=0}){
 const receipt=run.lastFlight?.routeBonus,bonus=ROUTE_BONUSES[receipt?.id];
 const detail=routeBonusReceiptText(receipt);
 const boon=bonus&&detail?`<aside class="acquired-boon">${bonusIcon(bonus.id)}<span>${esc(detail)}</span><b aria-label="Optional challenge completed">✓</b></aside>`:'';
 const buildAvailable=deckAvailable||skillsAvailable;
 const longCopy=copy.effect.length>65||copy.trigger?.length>60||copy.limit?.length>80;
 return `<section class="acquired-reward acquired-${presentation} wb-reskin wb-ground wb-inline wb-framed ${boon?'acquired-has-boon':'acquired-no-boon'} ${buildAvailable?'acquired-has-build':'acquired-no-build'} ${longCopy?'acquired-long-copy':''}" data-acquired-presentation="${presentation}">
 <header class="acquired-clear wbf-head"><div class="wbf-titles"><h1 class="wb-title">${esc(title)}</h1></div>${receiptAvailable?actionButton(`+${earned}`,{labelMarkup:`${resourceSymbol('packed')}<b>+${earned}</b>`,className:'wb-sign wb-sign-standard acquired-earnings',action:'reward-earnings',ariaLabel:`${earned} Stored Sparks earned. View breakdown.`}):''}</header>
 <article class="acquired-hero ${artifact.rarity}" data-reward-artifact="${artifact.id}" aria-label="Acquired relic">
 <div class="acquired-art">${horizonMarkup()}${reliquaryNicheMarkup()}${artifactArt(artifact.id)}</div>
 <div class="acquired-copy"><header class="acquired-identity"><p>${esc(artifactRarityLabel(artifact))} relic acquired</p><h2>${esc(artifact.name)}</h2></header>
 <div class="acquired-rules">${copy.trigger?`<p class="acquired-trigger">${esc(copy.trigger)}</p>`:''}<p class="acquired-effect">${effectMarkup(copy.effect)}</p>${copy.limit?`<p class="acquired-limit">${esc(artifactLimitSummary(copy))}</p>`:''}</div></div>
 </article>
 ${boon}
 <footer class="acquired-actions">${buildAvailable?actionButton(deckAvailable?'Deck':upgradeCount?'Upgrade':'Skills',{className:`wb-sign wb-sign-standard ${!deckAvailable&&upgradeCount?'upgrade-ready':''}`,action:deckAvailable?'cards':'skills'}):''}${relicRulesButton(artifact,{sign:true})}${actionButton('Continue',{className:'wb-sign wb-sign-primary',action:'victory-next'})}</footer>
 </section>`;
}
