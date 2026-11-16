import {getBiome} from './biomes.mjs?v=cards-renewal-1';
import {getBossPreview} from './boss.mjs?v=cards-renewal-1';
import {levelMapPreview} from './level-map-art.mjs?v=cards-renewal-1';
import {mapStopIconMarkup} from './map-guide.mjs?v=cards-renewal-1';
import {resourceSymbol} from './game-symbols.mjs?v=cards-renewal-1';
import {getFlightClearReward} from './checkpoint-rewards.mjs?v=cards-renewal-1';
import {availableFlightArtifacts} from './model.mjs?v=cards-renewal-1';
import {bonusIcon,boonMarkup} from './route-bonus-ui.mjs?v=cards-renewal-1';
import {contextualFlightNotice} from './contextual-events.mjs?v=cards-renewal-1';
import {ATLAS_FORECASTS,atlasGlyph} from './night-atlas.mjs?v=cards-renewal-1';
import {canDreamAt,dreamConfig} from './dream.mjs?v=cards-renewal-1';
import {sparkHabitat} from './spark-fields.mjs?v=cards-renewal-1';
import {lanternFlightCue} from './map-theme.mjs?v=cards-renewal-1';

const escapeText = value => String(value ?? '').replace(/[&<>"']/g, char =>
 ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const sparkForecast={filament:'More gentle Sparks',cluster:'More Clusters',vault:'More Caches',mineral:'More dense Caches'};

function regularReward(run,node){
 if(run.isTutorial&&node.type==='finale')return `<div class="preview-payout">${mapStopIconMarkup(node)}<strong>First Light complete</strong></div><p class="preview-clear-extra">Your practice build stays here.</p>`;
 const final=node.boss && (node.mapIndex??run.mapIndex)===2 && !run.isTutorial;
 if(final)return `<div class="preview-payout">${mapStopIconMarkup(node)}<strong>Expedition victory</strong></div>`;
 const amount=getFlightClearReward(node,run);
 const offers=availableFlightArtifacts(run,node).length;
 const artifact=offers>1?'Choose 1 of 2 artifacts':offers===1?'Gain 1 artifact':'';
 return `<div class="preview-payout">${resourceSymbol('packed')}<strong>+${amount} <span>Stored Sparks</span></strong></div>
  ${artifact?`<p class="preview-clear-extra">${artifact}</p>`:''}`;
}

function flightTerms(run,node,available){
 if(!available)return '';
 const notice=contextualFlightNotice(run,node);
 const earned=boonMarkup(Object.keys(run.passageBoons||{}).length?run.passageBoons:run.nextFlightBoon);
 if(!notice&&!earned)return '';
 return `<details class="preview-flight-terms"><summary>Active flight effects</summary>
   ${earned}${notice?`<p>${escapeText(notice)}</p>`:''}</details>`;
}

export function flightPreviewMarkup(run,node,{available=false,level,bonus=null}={}){
 const biome=getBiome(node)||getBiome(level);
 const forecast=ATLAS_FORECASTS[node.atlasForecast];
 const hazard=node.boss?getBossPreview(node.bossId).instruction:node.interactionHint||biome?.interactionHint;
 const place=biome?.name||node.biomeName||level?.name;
 const kind=node.boss?'Guardian':node.elite?'Elite flight':'Flight';
 const art=node.boss?mapStopIconMarkup(node):levelMapPreview(level||node);
 const metadata=[place,Number(node.duration)>0?`${Math.round(node.duration)} s`:''].filter(Boolean).map(escapeText).join(' · ');
 const deposits=sparkForecast[sparkHabitat(biome?.id)];
 const duration=available&&canDreamAt(run,node)?dreamConfig(run).duration:0;
 const action=available?`<button class="primary" data-action="node" data-id="${escapeText(node.id)}">${duration?`Dream · ${duration}s`:'Fly'} →</button>`
  :'<span class="preview-future">Follow the connected path</span>';
 const themeCue=lanternFlightCue(node);
 const cue=forecast?[themeCue,forecast.cue].filter(Boolean).join(' '):themeCue||hazard;
 return `<section class="flight-preview" aria-labelledby="preview-place">
  <div class="preview-reading">
   <header class="preview-place">
    <div class="preview-landmark">${art}</div>
    <div class="preview-location"><span class="preview-kind">${available?kind:'Future · '+kind}</span><h2 id="preview-place">${escapeText(node.name)}</h2><p class="preview-meta">${metadata}</p>${deposits?`<p class="preview-deposits">${resourceSymbol('energy')} ${deposits}</p>`:''}</div>
    ${cue?`<p class="preview-hazard">${forecast?`<span class="preview-weather">${atlasGlyph(forecast.id)} ${escapeText(forecast.name)}</span>`:''}${escapeText(cue)}</p>`:''}
   </header>
   <div class="preview-rewards${bonus?' has-objective':''}">
    <section class="preview-regular" aria-labelledby="preview-regular"><h3 id="preview-regular">On clear</h3>${regularReward(run,node)}</section>
    ${bonus?`<section class="preview-optional" aria-labelledby="preview-optional">
     <div class="preview-goal-title">${bonusIcon(bonus.id)}<div><h3 id="preview-optional">Optional bonus</h3><strong>${escapeText(bonus.name)}</strong></div></div>
     <p class="preview-condition">${escapeText(bonus.condition)}</p>
     <p class="preview-prize"><span aria-hidden="true">✦</span>${escapeText(bonus.reward)}</p>
    </section>`:''}
   </div>${flightTerms(run,node,available)}
  </div>
  <footer><button class="secondary" data-action="close-sheet">Back</button>${action}</footer>
 </section>`;
}
