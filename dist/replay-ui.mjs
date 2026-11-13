import {glowText,getGlowCapacity} from './vitality.mjs?v=artifact-clarity-1';
import {getArtifactInfo} from './artifact-info.mjs?v=artifact-clarity-1';
import {artifactIcon} from './upgrade-icons.mjs?v=artifact-clarity-1';
import {encounterFamilyPreview} from './encounter-families.mjs?v=artifact-clarity-1';
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
export const artifactRarityLabel=a=>({boss:'BOSS',rare:'RARE',common:'COMMON'})[a?.rarity]||'COMMON';
export function artifactLifetimeMarkup(a,run,{fresh=false}={}){
 const info=getArtifactInfo(a.id),remaining=fresh?info.charges:run?.artifactCharges?.[a.id]??info.charges;
 const label=info.type==='consumable'?(remaining>0?`${remaining} USE${remaining===1?'':'S'} · THEN CONSUMED`:'USED UP · SLOT OPENS ON CLEAR'):info.type==='passive'?'PASSIVE · WHILE MOUNTED':'REUSABLE · EACH FLIGHT';
 return `<span class="relic-lifetime ${info.type}">${esc(label)}</span>`;
}
export function artifactSummaryMarkup(a,run,{details=false,fresh=false}={}){
 const info=getArtifactInfo(a.id),convert=text=>esc(glowText(text||'',getGlowCapacity(run||{})));
 return `${artifactLifetimeMarkup(a,run,{fresh})}<p class="relic-effect">${convert(info.effect||a.description)}</p><p class="relic-trigger"><b>WHEN</b> ${convert(info.trigger)}</p>${details?`<details class="relic-more"><summary>Limits & combinations</summary><p>${convert(info.limit)}</p></details>`:''}`;
}
export function artifactOfferMarkup(a,run){
 return `<article class="relic-offer ${esc(a.rarity||'common')}"><button class="reward-relic" data-action="pick-reward" data-id="${esc(a.id)}" aria-label="Preview ${esc(a.name)}">${artifactIcon(a.id)}<span class="relic-rarity">${artifactRarityLabel(a)}</span><strong>${esc(a.name)}</strong>${artifactSummaryMarkup(a,run,{fresh:true})}<span class="relic-pick">PREVIEW →</span></button></article>`;
}
export function artifactDetailMarkup(a,{rules,synergy='',description=a.description,closeAction='close-sheet',run}={}){
 const info=getArtifactInfo(a.id),convert=text=>esc(glowText(text||'',getGlowCapacity(run||{})));
 return `<div class="relic-detail-crest ${esc(a.rarity||'common')}">${artifactIcon(a.id)}<div><small>${artifactRarityLabel(a)}</small><h2>${esc(a.name)}</h2></div></div>${artifactLifetimeMarkup(a,run)}<div class="relic-detail-rules"><p><b>WHEN</b><span>${convert(info.trigger)}</span></p><p><b>EFFECT</b><span>${convert(info.effect||description)}</span></p><p><b>LASTS</b><span>${convert(info.lifetime)}</span></p><details class="relic-more"><summary>Limits & combinations</summary><p>${convert(info.limit||rules?.limits)}</p>${synergy?`<p>${esc(synergy)}</p>`:''}</details><p><b>FORGE</b><span>Consume it at Rest or an event for ${Number(a.sellValue)||0} Packed Light. Spend that on run skills.</span></p></div><button class="primary" data-action="${closeAction}">Back</button>`;
}
