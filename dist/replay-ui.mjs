import {glowText,getGlowCapacity,formatGlow} from './vitality.mjs?v=clear-paths-2';
import {getArtifactInfo,CONSUMABLE_ARTIFACTS,EVOLVING_ARTIFACTS,getArtifactStackPreview} from './artifact-info.mjs?v=clear-paths-2';
import {resourceSymbol} from './game-symbols.mjs?v=clear-paths-2';
import {artifactIcon} from './upgrade-icons.mjs?v=clear-paths-2';
import {encounterFamilyPreview} from './encounter-families.mjs?v=clear-paths-2';
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
export const artifactRarityLabel=a=>({boss:'LEGENDARY',rare:'RARE',common:'COMMON'})[a?.rarity]||'COMMON';
export function artifactLifetimeMarkup(a,run,{fresh=false}={}){
 const info=getArtifactInfo(a.id),remaining=fresh?info.charges:run?.artifactCharges?.[a.id]??info.charges,max=CONSUMABLE_ARTIFACTS[a.id]?.maxCharges;
 const label=info.type==='consumable'?(remaining>0?`${remaining}${!fresh&&run?.artifacts?.includes(a.id)?` / ${max}`:''} USE${remaining===1?'':'S'}`:'USED UP'):info.type==='passive'?'PASSIVE':'AUTO';
 const hint=info.type==='consumable'?'Activates automatically. Consumed when its uses run out.':'Activates automatically while mounted. '+info.lifetime;
 return `<span class="relic-lifetime ${info.type}" title="${esc(hint)}">${resourceSymbol(info.type==='consumable'?'uses':'auto')}${esc(label)}</span>`;
}
export function artifactStackMarkup(stack){
 if(stack.autoForge)return `<span class="artifact-stack-preview">3 / 3 copies · extra copy → +25 ${resourceSymbol('packed')}</span>`;
 return `<span class="artifact-stack-preview" aria-label="Uses increase from ${stack.before} to ${stack.after}, maximum ${stack.max}">${resourceSymbol('uses')}<b>${stack.before} → ${stack.after}</b><small>/ ${stack.max}</small><em>+${stack.added}</em></span>${stack.wasted?`<small class="artifact-stack-waste">${stack.wasted} use${stack.wasted===1?'':'s'} lost · stack full</small>`:''}`;
}
function artifactEffectMarkup(a,run){
 const stat=(value,kind,label)=>`<span class="relic-stat">${esc(value)} ${resourceSymbol(kind)}${label?` <small>${esc(label)}</small>`:''}</span>`;
 const compact={
  'wayward-seed':()=>stat('+1','glow','every 3 body pickups'),
  'hearth-bloom':()=>stat('+3','glow','every 3 body pickups'),
  'lantern-bloom':()=>stat('1.5s','clock','reveal · every 3 body pickups'),
  'glow-wick':()=>stat('+'+formatGlow(10),'glow','per pickup'),
  'flash-stone':()=>stat('1.5s','clock','reveal on pickup'),
  'quiet-cinder':()=>stat('−1','glow','Lift cost'),
  'ember-lens':()=>`${resourceSymbol('up')} Light reach`,
  'silver-feather':()=>stat('+6%','up','Lift strength'),
  'glass-lantern':()=>stat('+'+formatGlow(a.modifiers.cacheFuelBonus),'glow','per pickup')+stat('+1','glow','Lift cost'),
  'moss-heart':()=>stat('+'+formatGlow(3),'glow','Kindled Touch'),
  'wayfinder-seed':()=>stat('+15%','up','Collector reach'),
  'iron-petal':()=>stat('−12%','clock','Protector recovery'),
  'storm-knot':()=>stat('−10%','clock','Runner recovery')+'<small>More wind resistance</small>',
  'hollow-bell':()=>stat('+0.25s','clock','Levitate'),
  'dawn-thread':()=>stat('+1s','clock','Echo Luminance'),
  'echo-vessel':()=>stat('+10%','packed','overflow yield'),
 };
 return compact[a.id]?compact[a.id]():esc(glowText(getArtifactInfo(a.id).effect||a.description,getGlowCapacity(run||{})));
}
export function artifactSummaryMarkup(a,run,{details=false,fresh=false}={}){
 const info=getArtifactInfo(a.id),convert=text=>esc(glowText(text||'',getGlowCapacity(run||{}))),stack=fresh&&getArtifactStackPreview(run,a.id);
 const trigger=EVOLVING_ARTIFACTS.includes(a.id)?`<p class="relic-trigger">Collector breaks chain · 5× / flight</p>${a.id==='wayward-seed'?`<small class="relic-evolution-preview">MAP 1 → +3 ${resourceSymbol('glow')} OR 1.5s reveal</small>`:''}`:info.type==='passive'||['glow-wick','flash-stone'].includes(a.id)?'':`<p class="relic-trigger"><b>WHEN</b> ${convert(info.trigger.replace(/^Collect a natural Sparks pickup\.$/,'Pick up Sparks.'))}</p>`;
 return `${stack?artifactStackMarkup(stack):artifactLifetimeMarkup(a,run,{fresh})}<p class="relic-effect">${artifactEffectMarkup(a,run)}</p>${trigger}${details?`<details class="relic-more"><summary>How it works</summary><p>${convert(info.trigger)}</p><p>${convert(info.lifetime)}</p><p>${convert(info.limit)}</p></details>`:''}`;
}
export function artifactOfferMarkup(a,run){
 return `<article class="relic-offer ${esc(a.rarity||'common')}"><button class="reward-relic" data-action="pick-reward" data-id="${esc(a.id)}" aria-label="Preview ${esc(a.name)}">${artifactIcon(a.id)}<span class="relic-rarity">${artifactRarityLabel(a)}</span><strong>${esc(a.name)}</strong>${artifactSummaryMarkup(a,run,{fresh:true})}<span class="relic-pick">${getArtifactStackPreview(run,a.id)?'ADD USES':'PREVIEW'} →</span></button></article>`;
}
export function artifactDetailMarkup(a,{rules,synergy='',description=a.description,closeAction='close-sheet',run}={}){
 const uses=CONSUMABLE_ARTIFACTS[a.id]?(run?.artifactCharges?.[a.id]??CONSUMABLE_ARTIFACTS[a.id].charges):null;
 const flight=closeAction==='resume',info=getArtifactInfo(a.id),convert=text=>esc(glowText(text||'',getGlowCapacity(run||{})));
 return `<div class="relic-detail-crest ${esc(a.rarity||'common')}">${artifactIcon(a.id)}<div><small>${artifactRarityLabel(a)}</small><h2>${esc(a.name)}</h2></div></div>${artifactSummaryMarkup(a,run,{details:!flight})}${flight?`<p class="relic-flight-rule">${convert(info.trigger)}</p>${info.limit?`<details class="relic-more"><summary>Limits & stacking</summary><p>${convert(info.limit)}</p></details>`:''}`:''}${synergy?`<p class="relic-trigger">${esc(synergy)}</p>`:''}${flight?'':`<p class="relic-forge-summary">FORGE ${resourceSymbol('packed')} +${Number(a.sellValue)||0}<small>${uses===null?'Consumes artifact':`Consumes all ${uses} uses`} · Rest / event</small></p>`}<button class="primary" data-action="${closeAction}">${flight?'Resume flight':'Back'}</button>`;
}
