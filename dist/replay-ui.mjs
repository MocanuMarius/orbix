import {formatGlow} from './vitality.mjs?v=condensed-glow-1';
import {artifactIcon} from './upgrade-icons.mjs?v=condensed-glow-1';
import {encounterFamilyPreview} from './encounter-families.mjs?v=condensed-glow-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const THEME_INKS=Object.freeze({sustain:'#b9d995',precision:'#a8d5e2',tempo:'#e4c286',dream:'#cbb2e6',risk:'#e4a894'});
export function rewardThemeMarkup(source={},label='RELIC PATH'){
 const theme=source.rewardTheme||source.theme, name=source.rewardThemeLabel||source.themeLabel||theme;
 return theme?`<span class="reward-theme" style="--theme-ink:${THEME_INKS[theme]||THEME_INKS.sustain}"><i aria-hidden="true"></i><small>${esc(label)}</small> ${esc(name)}</span>`:'';
}
export function encounterIntent(node={}){
 if(node.boss)return {name:node.bossId==='moonweaver'?'Moonweaver':'Hollow Warden',instruction:node.bossId==='moonweaver'?'Read the opening between the shifting veils.':'Read the hands; cross their open passages.',short:'BOSS'};
 const family=encounterFamilyPreview(node);
 return family?{...family,short:({'stillwater-tunnel':'CONTROL','draft-staircase':'DRAFTS','seed-orchard':'DARK SEEDS'})[family.id]||'FLIGHT'}:null;
}
export function encounterIntentMarkup(node={}, {optionalChallenge=false}={}){
 const intent=encounterIntent(node);if(!intent)return '';
 return `<div class="encounter-intent"><b>${esc(node.biomeName&&!node.boss?`${node.biomeName} · ${intent.short}`:intent.name)}</b><span>${esc(!node.boss&&node.interactionHint||intent.instruction)}</span>${optionalChallenge&&node.challengeId&&!node.boss?`<small class="optional-challenge">Optional: ${esc(node.challenge||'Clear the challenge')} · Better relic odds</small>`:''}</div>`;
}
export const artifactRarityLabel=a=>({boss:'BOSS RELIC',rare:'RARE RELIC',common:'COMMON RELIC'})[a?.rarity]||'COMMON RELIC';
export function artifactOfferMarkup(a,run,{synergy='',description=a.description}={}){
 const bossSummary={'sunheart-engine':'Richer fuel. Excess fuel recharges companions and reveals the route.','dream-sovereign':'Empowered Dreams, wider sight, and free Lift from fuel in extra light.','hollow-covenant':'Cheaper Lift. Companion work and near-missed Dark Seeds restore fuel.'};
 const offerDescription=bossSummary[a.id]||description;
 return `<article class="relic-offer ${esc(a.rarity||'common')}"><button class="relic-info" data-action="inspect-artifact" data-id="${esc(a.id)}" aria-label="How ${esc(a.name)} works">?</button><button class="reward-relic" data-action="pick-reward" data-id="${esc(a.id)}">${artifactIcon(a.id)}<span class="relic-rarity">${artifactRarityLabel(a)}</span><strong>${esc(a.name)}</strong><small>${esc(offerDescription)}</small>${synergy?`<em>${esc(synergy)}</em>`:''}</button></article>`;
}
export function artifactDetailMarkup(a,{rules,synergy='',description=a.description,closeAction='close-sheet'}={}){
 return `<div class="relic-detail-crest ${esc(a.rarity||'common')}">${artifactIcon(a.id)}<div><small>${artifactRarityLabel(a)}</small><h2>${esc(a.name)}</h2></div></div><div class="relic-detail-rules">${rules?.trigger?`<p><b>WHEN</b><span>${esc(rules.trigger)}</span></p>`:''}<p><b>EFFECT</b><span>${esc(rules?.effect||description)}</span></p>${rules?.limits?`<p><b>LIMIT</b><span>${esc(rules.limits)}</span></p>`:''}${synergy?`<p class="relic-link"><b>YOUR BUILD</b><span>${esc(synergy)}</span></p>`:''}<p><b>TRADE</b><span>Dissolve into ${formatGlow(Number(a.sellValue)||0)} Glow at events or rests. Full-meter surplus becomes Condensed Glow.</span></p></div><button class="primary" data-action="${closeAction}">Back</button>`;
}
