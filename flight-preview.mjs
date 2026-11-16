import {getBiome} from './biomes.mjs?v=storm-guide-1';
import {getBossPreview} from './boss.mjs?v=storm-guide-1';
import {levelMapPreview} from './level-map-art.mjs?v=storm-guide-1';
import {mapStopIconMarkup} from './map-guide.mjs?v=storm-guide-1';
import {resourceSymbol} from './game-symbols.mjs?v=storm-guide-1';
import {getFlightClearReward} from './checkpoint-rewards.mjs?v=storm-guide-1';
import {availableFlightArtifacts,isCardRun} from './model.mjs?v=storm-guide-1';
import {bonusIcon,boonMarkup} from './route-bonus-ui.mjs?v=storm-guide-1';
import {contextualFlightNotice} from './contextual-events.mjs?v=storm-guide-1';
import {ATLAS_FORECASTS,atlasGlyph} from './night-atlas.mjs?v=storm-guide-1';
import {canDreamAt,dreamConfig} from './dream.mjs?v=storm-guide-1';
import {sparkHabitat} from './spark-fields.mjs?v=storm-guide-1';
import {lanternFlightCue} from './map-theme.mjs?v=storm-guide-1';
import {actionButton} from './ui/primitives.mjs?v=storm-guide-1';
import {cardTermTextMarkup} from './card-terms.mjs?v=storm-guide-1';

export const TRAVEL_GUIDE_ART=Object.freeze(['waystone','rootwood','night-atlas']);
const guideCrests=Object.freeze({
 waystone:`<path fill="#101d18" d="M6 6h36v24H6z"/><path fill="#849077" d="M8 4h30v4h4v20h-4v4H8V4z"/><path fill="#34483a" d="M12 8h24v20H12z"/><path fill="#c8b779" d="M22 6h6v4h4v4h4v8h-4v4h-4v4h-6v-4h-4v-4h-4v-8h4v-4h4z"/><path fill="#526447" d="M22 12h6v4h4v4h-4v4h-6v-4h-4v-4h4z"/><path fill="#ece0ac" d="M22 14h6v6h-6zM10 6h2v20h-2z"/>`,
 rootwood:`<path fill="#30271b" d="M18 6h12v4h6v18h-6v4H18v-4h-6V10h6z"/><path fill="#947348" d="M20 8h8v4h6v12h-6v6h-8v-6h-6V12h6z"/><path fill="#d4bd7a" d="M22 8h4v16h-4zM16 16h16v4H16z"/><path fill="#587d45" d="M4 8h8v8h4v12h8v6H12v-4H8V20H4zm32 0h8v12h-4v10h-4v4H24v-6h8V16h4z"/><path fill="#9fbe73" d="M2 6h8v4h4v6H6v-4H2zm34 0h10v8h-4v4h-6zM8 24h8v4h4v4h-8v-4H8zm22 4h8v-4h4v4h-4v4h-8z"/>`,
 'night-atlas':`<path fill="#263650" d="M14 2h20v4h6v6h4v12h-4v6h-6v4H14v-4H8v-6H4V12h4V6h6z"/><path fill="#8594bd" d="M14 4h20v2h6v8h2v8h-2v8h-8v2H16v-2H8v-8H6v-8h2V6h6z"/><path fill="#192b3c" d="M16 8h16v4h6v12h-6v4H16v-4h-6V12h6z"/><path fill="#d4bd83" d="M22 0h4v10h4v4h10v8H30v4h-4v10h-4V26h-4v-4H8v-8h10v-4h4z"/><path fill="#fff0bd" d="M22 12h4v4h4v4h-4v4h-4v-4h-4v-4h4z"/><path fill="#c3d5e4" d="M2 2h4v4H2zm40 0h4v4h-4zM2 30h4v4H2zm40 0h4v4h-4z"/>`,
});
function guideCrest(art){return TRAVEL_GUIDE_ART.includes(art)?`<svg class="preview-crest" viewBox="0 0 48 36" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${guideCrests[art]}</svg>`:'';}
function guideBandOrnament(art){
 if(!TRAVEL_GUIDE_ART.includes(art))return '';
 const drawing=art==='waystone'?'<path fill="#69785d" d="M6 0h24v24h-6V6H6z"/><path fill="#c7b77e" d="M12 4h14v14h-4V8H12z"/><path fill="#314831" d="M16 10h4v4h-4z"/>'
  :art==='rootwood'?'<path fill="#947044" d="M26 0h4v20h-8v6H10v4H0v-4h10v-4h10v-6h6z"/><path fill="#83a45b" d="M16 0h10v8H16zm6 12h8v10h-8zM8 16h10v8H8z"/><path fill="#bed18a" d="M18 0h6v2h-6zm6 12h4v2h-4z"/>'
  :'<path fill="none" stroke="#889dbc" stroke-width="1" d="M4 7h8v10h12v10"/><path fill="#d9c38d" d="M10 2h4v3h3v4h-3v3h-4V9H7V5h3zM21 14h6v6h-6zM22 25h4v4h-4z"/><path fill="#fff0c5" d="M10 5h4v4h-4z"/>';
 return `<svg class="preview-band-ornament" viewBox="0 0 30 30" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${drawing}</svg>`;
}
/** One stepped sign, mirrored for the return journey. */
export function travelGuideChevron(back=false){
 return `<svg class="preview-chevron" viewBox="0 0 24 32" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><g${back?' transform="translate(24 0) scale(-1 1)"':''}><path d="M4 2h6v4h4v4h4v4h4v4h-4v4h-4v4h-4v4H4v-8h4v-4h4v-4H8v-4H4z" fill="currentColor"/><path d="M4 2h6v2H6v6H4zm6 4h4v2h-4zm4 4h4v2h-4zm4 4h4v2h-4z" fill="#fff4cf" opacity=".45"/></g></svg>`;
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
 const offers=availableFlightArtifacts(run,node).length;
 const artifact=offers>1?'choose 1 of 2 relics':offers===1?'1 relic':'';
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
 const routeDetails=`<p>${details}</p>${!available?'<p>Follow the connected path to reach this flight.</p>':''}${cue&&cue!==biome?.interactionHint?`<p>${forecast?`<span class="preview-weather">${atlasGlyph(forecast.id)} ${escapeText(forecast.name)}</span>`:''}${cardTermTextMarkup(cue,{sparkContext:'pickup'})}</p>`:''}${bonus?.hint?`<p class="preview-mark-help"><strong>${escapeText(bonus.name)}</strong> · ${cardTermTextMarkup(bonus.hint,{sparkContext:'pickup',exclude:['uses']})}</p>`:''}`;
 const ornament=TRAVEL_GUIDE_ART.includes(guideArt)?` preview-art-${guideArt}`:'';
 return `<section class="flight-preview${ornament}" aria-labelledby="preview-place">
  <div class="preview-reading">
   <header class="preview-place">
    <div class="preview-landmark">${art}</div>
    <div class="preview-location"><span class="preview-kind">Travel Guide${available?'':' · Future '+kind.toLowerCase()}</span><h2 id="preview-place">${escapeText(node.name)}</h2></div>
    ${guideCrest(guideArt)}
   </header>
   <div class="preview-rewards${bonus?' has-objective':''}">
    <section class="preview-regular" aria-labelledby="preview-regular">${guideBandOrnament(guideArt)}<h3 id="preview-regular">On clear</h3>${regularReward(run,node)}</section>
    ${bonus?`<section class="preview-optional" aria-labelledby="preview-optional">
     ${guideBandOrnament(guideArt)}
     <div class="preview-goal-title">${bonusIcon(bonus.id)}<div><h3 id="preview-optional">Optional challenge</h3><strong>${escapeText(bonus.name)}</strong></div></div>
     <p class="preview-condition">${escapeText(bonus.condition)}</p>
     <p class="preview-prize">${bonus.id==='wayfinder'?'':'<span class="preview-claim">Then clear →</span>'}<span>${escapeText(bonus.reward)}</span></p>
    </section>`:''}
   </div>
   <div class="preview-features" aria-label="Tap for route details">
    ${interaction?featureDisclosure(interaction,`<p>${cardTermTextMarkup(biome.interactionHint,{sparkContext:'pickup'})}</p>`,'preview-biome-feature'):''}
    ${deposits?featureDisclosure(deposits,`<p>${cardTermTextMarkup(sparkForecastDetails[habitat],{sparkContext:'pickup'})}</p>`,'preview-spark-feature'):''}
    ${featureDisclosure('Details',routeDetails,'preview-route-details')}
    <button type="button" class="preview-glossary" data-card-glossary aria-haspopup="dialog">Glossary</button>
   </div>${flightTerms(run,node,available)}
  </div>
  <footer>${actionButton('',{className:'preview-rail preview-back',action:'close-sheet',ariaLabel:'Back to route',icon:travelGuideChevron(true)})}${action}</footer>
 </section>`;
}
