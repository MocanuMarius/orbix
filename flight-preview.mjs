import {getBiome} from './biomes.mjs?v=rest-1';
import {getBossPreview} from './boss.mjs?v=rest-1';
import {levelMapPreview} from './level-map-art.mjs?v=rest-1';
import {mapStopIconMarkup} from './map-guide.mjs?v=rest-1';
import {resourceSymbol} from './game-symbols.mjs?v=rest-1';
import {getFlightClearReward} from './checkpoint-rewards.mjs?v=rest-1';
import {flightRewardKind,SCRIBE_OFFER_COUNT,isCardRun} from './model.mjs?v=rest-1';
import {bonusIcon,boonMarkup} from './route-bonus-ui.mjs?v=rest-1';
import {contextualFlightNotice} from './contextual-events.mjs?v=rest-1';
import {ATLAS_FORECASTS,atlasGlyph} from './night-atlas.mjs?v=rest-1';
import {canDreamAt,dreamConfig} from './dream.mjs?v=rest-1';
import {sparkHabitat} from './spark-fields.mjs?v=rest-1';
import {lanternFlightCue} from './map-theme.mjs?v=rest-1';
import {actionButton} from './ui/primitives.mjs?v=rest-1';
import {cardTermTextMarkup} from './card-terms.mjs?v=rest-1';

export const TRAVEL_GUIDE_ART=Object.freeze(['waystone','rootwood','night-atlas']);
/** One stepped sign, mirrored for the return journey. */
export function travelGuideChevron(back=false){
 return `<svg class="preview-chevron" viewBox="0 0 24 32" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><g${back?' transform="translate(24 0) scale(-1 1)"':''}><path d="M4 2h6v4h4v4h4v4h4v4h-4v4h-4v4h-4v4H4v-8h4v-4h4v-4H8v-4H4z" fill="currentColor"/></g></svg>`;
}

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
 const artifact=flightRewardKind(run,node)==='inscription'?`1 Inscription (choose 1 of ${SCRIBE_OFFER_COUNT})`:'';
 const extras=[isCardRun(run)?'1 card':'',artifact].filter(Boolean).join(' + ');
 return `<button type="button" class="preview-payout preview-resource-help" data-card-term="stored" aria-haspopup="dialog" aria-label="+${amount} Stored Sparks: help">${resourceSymbol('packed')}<strong>+${amount} <span>Stored Sparks</span></strong></button>
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

export function flightPreviewMarkup(run,node,{available=false,level,bonus=null,guideArt=null}={}){
 const biome=getBiome(node)||getBiome(level);
 const forecast=ATLAS_FORECASTS[node.atlasForecast];
 const hazard=node.boss?getBossPreview(node.bossId).instruction:node.interactionHint||biome?.interactionHint;
 const place=biome?.name||node.biomeName||level?.name;
 const kind=node.boss?'Guardian':node.elite?'Elite flight':'Flight';
 const art=node.boss?mapStopIconMarkup(node):levelMapPreview(level||node);
 const habitat=sparkHabitat(biome?.id),deposits=sparkForecast[habitat];
 const duration=available&&canDreamAt(run,node)?dreamConfig(run,node).duration:0;
 const advanceLabel=available?(duration?`Dream for ${duration} seconds at ${node.name}`:`Fly to ${node.name}`):`Unavailable: follow the connected path to ${node.name}`;
 const action=actionButton('',{className:`preview-rail preview-advance${available?'':' preview-unavailable'}`,action:available?'node':null,id:available?node.id:null,disabled:!available,ariaLabel:advanceLabel,icon:travelGuideChevron()});
 const themeCue=lanternFlightCue(node);
 const cue=forecast?[themeCue,forecast.cue].filter(Boolean).join(' '):themeCue||hazard;
 const interaction=biomeFeatures[biome?.interaction];
 const details=[place,kind,Number(node.duration)>0?`${Math.round(node.duration)} s`:''].filter(Boolean).map(escapeText).join(' · ');
 const routeDetails=`<p>${details}</p>${!available?'<p>Follow the connected path to reach this flight.</p>':''}${cue&&cue!==biome?.interactionHint?`<p>${forecast?`<span class="preview-weather">${atlasGlyph(forecast.id)} ${escapeText(forecast.name)}</span>`:''}${cardTermTextMarkup(cue,{sparkContext:'pickup'})}</p>`:''}${bonus?.hint?`<p class="preview-mark-help">${cardTermTextMarkup(bonus.hint,{sparkContext:'pickup',exclude:['uses']})}</p>`:''}`;
 const ornament=TRAVEL_GUIDE_ART.includes(guideArt)?` preview-art-${guideArt}`:' preview-atlas';
 const productionAtlas=!TRAVEL_GUIDE_ART.includes(guideArt);
 return `<section class="flight-preview${ornament}" aria-labelledby="preview-place">
  <div class="preview-reading">
   <header class="preview-place">
    ${productionAtlas?'':`<div class="preview-landmark">${art}</div>`}
    <div class="preview-location">${productionAtlas?'':`<span class="preview-kind">Travel Guide${available?'':' · Future '+kind.toLowerCase()}</span>`}<h2 id="preview-place">${escapeText(node.name)}</h2></div>
   </header>
   <div class="preview-rewards${bonus?' has-objective':''}">
    <section class="preview-regular" aria-labelledby="preview-regular"><h3 id="preview-regular">On clear</h3>${regularReward(run,node)}</section>
    ${bonus?`<section class="preview-optional" aria-labelledby="preview-optional">
     <div class="preview-goal-title">${bonusIcon(bonus.id)}<h3 id="preview-optional">Optional</h3></div>
     <p class="preview-condition">${escapeText(bonus.condition)}</p>
     <p class="preview-prize"><span>${escapeText(bonus.reward)}</span></p>
    </section>`:''}
   </div>
   ${productionAtlas?(node.boss?`<p class="preview-guardian-cue">${cardTermTextMarkup(hazard,{sparkContext:'pickup'})}</p>`:''):`<div class="preview-features" aria-label="Tap for route details">
    ${interaction?featureDisclosure(interaction,`<p>${cardTermTextMarkup(biome.interactionHint,{sparkContext:'pickup'})}</p>`,'preview-biome-feature'):''}
    ${deposits?featureDisclosure(deposits,`<p>${cardTermTextMarkup(sparkForecastDetails[habitat],{sparkContext:'pickup'})}</p>`,'preview-spark-feature'):''}
    ${featureDisclosure('Details',routeDetails,'preview-route-details')}
    <button type="button" class="preview-glossary" data-card-glossary aria-haspopup="dialog">Glossary</button>
   </div>${flightTerms(run,node,available)}`}
  </div>
  <footer>${actionButton('',{className:'preview-rail preview-back',action:'close-sheet',ariaLabel:'Back to route',icon:travelGuideChevron(true)})}${action}</footer>
 </section>`;
}
