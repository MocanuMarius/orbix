import {getBossPreview} from './boss.mjs?v=proximity-energy-1';
import {artifactDescriptionMarkup} from './artifact-copy.mjs?v=proximity-energy-1';
import {getArtifactInfo,CONSUMABLE_ARTIFACTS,getArtifactStackPreview} from './artifact-info.mjs?v=proximity-energy-1';
import {resourceSymbol} from './game-symbols.mjs?v=proximity-energy-1';
import {artifactIcon} from './upgrade-icons.mjs?v=proximity-energy-1';
import {encounterFamilyPreview} from './encounter-families.mjs?v=proximity-energy-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const THEME_INKS=Object.freeze({sustain:'#b9d995',precision:'#a8d5e2',tempo:'#e4c286',dream:'#cbb2e6',risk:'#e4a894'});
export function rewardThemeMarkup(source={},label='RELIC PATH'){
 const theme=source.rewardTheme||source.theme, name=source.rewardThemeLabel||source.themeLabel||theme;
 return theme?`<span class="reward-theme" style="--theme-ink:${THEME_INKS[theme]||THEME_INKS.sustain}"><i aria-hidden="true"></i><small>${esc(label)}</small> ${esc(name)}</span>`:'';
}
export function encounterIntent(node={}){
 if(node.boss){const boss=getBossPreview(node.bossId);return {name:boss.name,instruction:boss.instruction||boss.description||'Read its warning and cross the open passage.',short:'GUARDIAN'};}
 const family=encounterFamilyPreview(node);
 return family?{...family,short:({'stillwater-tunnel':'CONTROL','draft-staircase':'DRAFTS','seed-orchard':'DARK SEEDS'})[family.id]||'FLIGHT'}:null;
}
export function encounterIntentMarkup(node={}, {optionalChallenge=false}={}){
 const intent=encounterIntent(node);if(!intent)return '';
 return `<div class="encounter-intent"><b>${esc(node.biomeName&&!node.boss?`${node.biomeName} · ${intent.short}`:intent.name)}</b><span>${esc(!node.boss&&node.interactionHint||intent.instruction)}</span>${optionalChallenge&&node.challengeId&&!node.boss?`<small class="optional-challenge">Optional: ${esc(node.challenge||'Clear the challenge')}</small>`:''}</div>`;
}
export const artifactRarityLabel=a=>({boss:'LEGENDARY',rare:'RARE',common:'COMMON'})[a?.rarity]||'COMMON';
export function artifactLifetimeMarkup(a,run,{fresh=false}={}){
 const info=getArtifactInfo(a.id),remaining=fresh?info.charges:run?.artifactCharges?.[a.id]??info.charges,max=CONSUMABLE_ARTIFACTS[a.id]?.maxCharges;
 const label=info.type==='consumable'?(remaining>0?`${remaining}${!fresh&&run?.artifacts?.includes(a.id)?` / ${max}`:''} USE${remaining===1?'':'S'}`:'USED UP'):info.type==='passive'?'PASSIVE':'AUTO';
 const hint=info.type==='consumable'?'Activates automatically. Consumed when its uses run out.':'Activates automatically while owned. '+info.lifetime;
 return `<span class="relic-lifetime ${info.type}" title="${esc(hint)}">${resourceSymbol(info.type==='consumable'?'uses':'auto')}${esc(label)}</span>`;
}
export function artifactStackMarkup(stack){
 if(stack.autoForge)return `<span class="artifact-stack-preview">3 / 3 copies · extra copy → +25 ${resourceSymbol('packed')}</span>`;
 return `<span class="artifact-stack-preview" aria-label="Uses increase from ${stack.before} to ${stack.after}, maximum ${stack.max}">${resourceSymbol('uses')}<b>${stack.before} → ${stack.after}</b><small>/ ${stack.max}</small><em>+${stack.added}</em></span>${stack.wasted?`<small class="artifact-stack-waste">${stack.wasted} use${stack.wasted===1?'':'s'} lost · stack full</small>`:''}`;
}
export function artifactSummaryMarkup(a,run,{details=false,fresh=false}={}){
 const stack=null;
 return `${stack?artifactStackMarkup(stack):''}${artifactDescriptionMarkup(a,run,{fresh})}`;
}
export function artifactOfferMarkup(a,run){
 return `<article class="relic-offer ${esc(a.rarity||'common')}"><button class="reward-relic" data-action="pick-reward" data-id="${esc(a.id)}" aria-label="Preview ${esc(a.name)}">${artifactIcon(a.id)}<span class="relic-rarity">${artifactRarityLabel(a)}</span><strong>${esc(a.name)}</strong>${artifactSummaryMarkup(a,run,{fresh:true})}<span class="relic-pick">${getArtifactStackPreview(run,a.id)?'ADD USES':'PREVIEW'} →</span></button></article>`;
}
export function artifactDetailMarkup(a,{rules,synergy='',description=a.description,closeAction='close-sheet',run}={}){
 const uses=CONSUMABLE_ARTIFACTS[a.id]?(run?.artifactCharges?.[a.id]??CONSUMABLE_ARTIFACTS[a.id].charges):null;
 const flight=closeAction==='resume';
 return `<article class="artifact-inspection"><header class="relic-detail-crest ${esc(a.rarity||'common')}">${artifactIcon(a.id)}<div><small>${artifactRarityLabel(a)}</small><h2>${esc(a.name)}</h2></div></header>${artifactDescriptionMarkup(a,run)}${synergy?`<p class="artifact-combo-note">${esc(synergy)}</p>`:''}${flight?'':`<p class="artifact-salvage-note">Forge ${resourceSymbol('packed')}<b>+${Number(a.sellValue)||0}</b><small>${uses===null?'Consumes this artifact':`Consumes all ${uses} uses`} · at Rest</small></p>`}</article><button class="primary" data-action="${closeAction}">${flight?'Resume':'Back'}</button>`;
}
