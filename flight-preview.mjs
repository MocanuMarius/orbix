import {getBiome} from './biomes.mjs?v=tow-swing-1';
import {getBossPreview} from './boss.mjs?v=tow-swing-1';
import {levelMapPreview} from './level-map-art.mjs?v=tow-swing-1';
import {mapStopIconMarkup} from './map-guide.mjs?v=tow-swing-1';
import {resourceSymbol} from './game-symbols.mjs?v=tow-swing-1';
import {getFlightClearReward} from './checkpoint-rewards.mjs?v=tow-swing-1';
import {availableFlightArtifacts,isCardRun} from './model.mjs?v=tow-swing-1';
import {bonusIcon,boonMarkup} from './route-bonus-ui.mjs?v=tow-swing-1';
import {contextualFlightNotice} from './contextual-events.mjs?v=tow-swing-1';
import {ATLAS_FORECASTS,atlasGlyph} from './night-atlas.mjs?v=tow-swing-1';
import {canDreamAt,dreamConfig} from './dream.mjs?v=tow-swing-1';
import {sparkHabitat} from './spark-fields.mjs?v=tow-swing-1';
import {lanternFlightCue} from './map-theme.mjs?v=tow-swing-1';
import {actionButton} from './ui/primitives.mjs?v=tow-swing-1';

const escapeText = value => String(value ?? '').replace(/[&<>"']/g, char =>
 ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const sparkForecast={filament:'More gentle Sparks',cluster:'More Clusters',vault:'More Caches',mineral:'More dense Caches'};
const biomeFeatures={crumble:'Loose masonry',thaw:'Hanging ice',pinecone:'Ripe cones',bubble:'Reed bubbles',spore:'Puffcaps',geyser:'Rising vents',sandfall:'Loose sandstone',tide:'Tidal vents',resonate:'Resonant crystals',draft:'Wind bells',seedpod:'Ripe pods',bell:'Spirit bells'};
const sparkForecastDetails={
 filament:'Small Sparks are more common here. They restore fuel more gently than Clusters and Caches.',
 cluster:'Clusters are more common here. They restore more fuel than small Sparks.',
 vault:'Caches are more common here. They restore more fuel than small Sparks and Clusters.',
 mineral:'Dense Caches are more common here. They restore more fuel than small Sparks and Clusters.'
};

function featureDisclosure(label,copy,className=''){
 return `<details class="preview-feature ${className}"><summary>${escapeText(label)}</summary><div class="preview-feature-copy">${copy}</div></details>`;
}

function regularReward(run,node){
 if(run.isTutorial&&node.type==='finale')return `<div class="preview-payout">${mapStopIconMarkup(node)}<strong>First Light complete</strong></div><p class="preview-clear-extra">Your practice build stays here.</p>`;
 const final=node.boss && (node.mapIndex??run.mapIndex)===2 && !run.isTutorial;
 if(final)return `<div class="preview-payout">${mapStopIconMarkup(node)}<strong>Expedition victory</strong></div>${isCardRun(run)?'<p class="preview-clear-extra">1 trophy card</p>':''}`;
 const amount=getFlightClearReward(node,run);
 const offers=availableFlightArtifacts(run,node).length;
 const artifact=offers>1?'choose 1 of 2 relics':offers===1?'1 relic':'';
 const extras=[isCardRun(run)?'1 card':'',artifact].filter(Boolean).join(' + ');
 return `<div class="preview-payout">${resourceSymbol('packed')}<strong>+${amount} <span>Stored Sparks</span></strong></div>
  ${extras?`<p class="preview-clear-extra">${escapeText(extras[0].toUpperCase()+extras.slice(1))}</p>`:''}`;
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
 const habitat=sparkHabitat(biome?.id),deposits=sparkForecast[habitat];
 const duration=available&&canDreamAt(run,node)?dreamConfig(run).duration:0;
 const action=available?actionButton(`${duration?`Dream · ${duration}s`:'Fly'} →`,{className:'primary',action:'node',id:node.id})
  :'<span class="preview-future">Follow the connected path</span>';
 const themeCue=lanternFlightCue(node);
 const cue=forecast?[themeCue,forecast.cue].filter(Boolean).join(' '):themeCue||hazard;
 const interaction=biomeFeatures[biome?.interaction];
 const details=[place,kind,Number(node.duration)>0?`${Math.round(node.duration)} s`:''].filter(Boolean).map(escapeText).join(' · ');
 const routeDetails=`<p>${details}</p>${cue&&cue!==biome?.interactionHint?`<p>${forecast?`<span class="preview-weather">${atlasGlyph(forecast.id)} ${escapeText(forecast.name)}</span>`:''}${escapeText(cue)}</p>`:''}${bonus?.hint?`<p class="preview-mark-help"><strong>${escapeText(bonus.name)}</strong> · ${escapeText(bonus.hint)}</p>`:''}`;
 return `<section class="flight-preview" aria-labelledby="preview-place">
  <div class="preview-reading">
   <header class="preview-place">
    <div class="preview-landmark">${art}</div>
    <div class="preview-location"><span class="preview-kind">Travel Guide${available?'':' · Future '+kind.toLowerCase()}</span><h2 id="preview-place">${escapeText(node.name)}</h2></div>
   </header>
   <div class="preview-rewards${bonus?' has-objective':''}">
    <section class="preview-regular" aria-labelledby="preview-regular"><h3 id="preview-regular">On clear</h3>${regularReward(run,node)}</section>
    ${bonus?`<section class="preview-optional" aria-labelledby="preview-optional">
     <div class="preview-goal-title">${bonusIcon(bonus.id)}<div><h3 id="preview-optional">Optional challenge</h3><strong>${escapeText(bonus.name)}</strong></div></div>
     <p class="preview-condition">${escapeText(bonus.condition)}</p>
     <p class="preview-prize">${bonus.id==='wayfinder'?'':'<span class="preview-claim">Then clear →</span>'}<span>${escapeText(bonus.reward)}</span></p>
    </section>`:''}
   </div>
   <div class="preview-features" aria-label="Tap for route details">
    ${interaction?featureDisclosure(interaction,`<p>${escapeText(biome.interactionHint)}</p>`,'preview-biome-feature'):''}
    ${deposits?featureDisclosure(deposits,`<p>${escapeText(sparkForecastDetails[habitat])}</p>`,'preview-spark-feature'):''}
    ${featureDisclosure('Details',routeDetails,'preview-route-details')}
   </div>${flightTerms(run,node,available)}
  </div>
  <footer>${actionButton('Back',{action:'close-sheet'})}${action}</footer>
 </section>`;
}
