import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,getChoices,selectNode,beginFlightAttempt,finishFlight} from '../dist/model.mjs';
import {flightPreviewMarkup} from '../dist/flight-preview.mjs';
import {ROUTE_BONUSES} from '../dist/route-bonuses.mjs';
import {getFlightClearReward} from '../dist/checkpoint-rewards.mjs';
const visibleText=html=>html.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();

function sample(cardRun){
 const cards=cardRun===true,state=newState(),run=createRun(state.profile,'preview-coral',1,cards?{cards:true}:{});
 const node=run.map.flat().find(n=>n.type==='flight');
 const render=(change={},opts={})=>flightPreviewMarkup(run,{...node,...change},{available:true,level:node, ...opts});
 return {run,node,render};
}

test('preview shows earned pay and the optional condition separately, with claiming actions only on the footer',()=>{
 const {run,node,render}=sample(),html=render({},{bonus:ROUTE_BONUSES.constellation});
 assert.match(html,/id="preview-regular">On clear/);
 assert.ok(html.includes(`+${getFlightClearReward(node,run)} <span>Stored Sparks`));
 assert.match(html,/id="preview-optional">Optional/);
 assert.doesNotMatch(html,/Rising Constellation/);
 assert.match(html,/Optional<\/h3><\/div>\s*<p class="preview-condition">Collect the gold marks/);
 assert.match(html,/Temporary Inscription: Risen Star — the first 3 fuel pickups each flight restore \+2 missing Sparks\. 3 flights\./);
 assert.doesNotMatch(html,/Then clear →|preview-claim/);
 assert.doesNotMatch(html.split('<footer>')[0],/data-action=|No Rest ahead|of .* hearts/);
 assert.match(html,/data-action="close-sheet" aria-label="Back to route"><svg/);
 assert.match(html,/data-action="node"[^>]*aria-label="Fly to [^"]+"><svg/);
 assert.match(html,/data-card-term="stored"/);assert.doesNotMatch(html,/data-card-glossary|Route details|preview-landmark/);
 assert.doesNotMatch(visibleText(html.split('<footer>')[1]),/Back|Fly|→/);
});

test('Elite and Boss stops promise the Scribe, ordinary stops promise nothing extra, and the last guardian previews the expedition victory',()=>{
 const {run,render}=sample(true);
 assert.doesNotMatch(render({elite:true}),/Inscription/);
 assert.match(render({boss:true,mapIndex:0}),/1 Inscription \(choose 1 of 3\)/);
 assert.match(render({boss:true,mapIndex:1}),/1 Inscription \(choose 1 of 3\)/);
 assert.doesNotMatch(render({elite:true}),/relic|artifact/i);
 assert.doesNotMatch(render({}),/Inscription|relic/i);
 const last=render({boss:true,mapIndex:2});
 assert.match(last,/Expedition victory/);
 assert.doesNotMatch(last,/Stored Sparks|Optional|Choose 1|Inscription/);
});

test('the reward line of every stop type agrees with what finishFlight really awards',()=>{
 for(const cards of [true,false]){
  for(const type of ['regular','elite','boss']){
   const s=newState(),run=createRun(s.profile,`agree-${cards}-${type}`,1,cards?{cards:true}:{});
   const node=getChoices(run)[0];
   if(type==='elite')node.elite=true;
   if(type==='boss'){node.boss=true;node.elite=false;}
   const text=visibleText(flightPreviewMarkup(run,node,{available:true,level:node}));
   assert.ok(selectNode(run,node.id)&&beginFlightAttempt(run)&&finishFlight(run,{success:true,flame:70,collected:12}),type);
   const awards=run.flightReward?.kind==='inscription';
   assert.equal(/1 Inscription \(choose 1 of 3\)/.test(text),awards,`${type} cards=${cards}: ${text}`);
   if(awards)assert.equal(run.flightReward.offers.length,3);
   assert.doesNotMatch(text,/relic|artifact/i,type);
  }
 }
});

test('card runs promise the guaranteed card without drawing it, including the final trophy',()=>{
 const state=newState(),run=createRun(state.profile,'card-preview',1,{cards:true});
 const node=run.map.flat().find(n=>n.type==='flight'),before=JSON.stringify(run);
 assert.match(flightPreviewMarkup(run,node),/1 card/);
 assert.match(flightPreviewMarkup(run,{...node,boss:true,mapIndex:0}),/1 card \+ 1 Inscription \(choose 1 of 3\)/);
 assert.doesNotMatch(flightPreviewMarkup(run,{...node,elite:true}),/Inscription/);
 const final=flightPreviewMarkup(run,{...node,boss:true,mapIndex:2});
 assert.match(final,/Expedition victory/);assert.match(final,/1 trophy card/);
 assert.equal(JSON.stringify(run),before);
});

test('future Atlas previews stay concise and cannot start a flight',()=>{
 const {render}=sample(),html=render({atlasForecast:'bellwind',interactionHint:'Only the unmodified terrain cue'},{available:false});
 assert.doesNotMatch(html,/preview-weather|preview-features/);
 assert.doesNotMatch(html,/Only the unmodified terrain cue|data-action="node"/);
 assert.match(html,/class="preview-rail preview-advance preview-unavailable"[^>]*aria-label="Unavailable: [^"]+" disabled/);
});

test('learned Dream replaces Fly on each reachable flight and stays hidden from future nodes',()=>{
 const {run,node,render}=sample();
 assert.match(render(),/aria-label="Fly to /);
 run.skills['main-dream']=1;
 for(const type of [{elite:false,boss:false},{elite:true},{boss:true}]){
  const html=render(type);
  assert.match(html,/data-action="node"[^>]*aria-label="Dream for 8 seconds at /);
  assert.doesNotMatch(html,/data-action="dream"|aria-label="Fly to /);
  assert.doesNotMatch(render(type,{available:false}),/data-action="node"|Dream for/);
 }
 run.phase='briefing';run.current=node;
 assert.match(render(),/Dream for 8 seconds/);
 run.attemptActive=true;
 assert.doesNotMatch(render(),/Dream for/);
});

test('approved Atlas keeps only its title and accurate side-by-side outcomes',()=>{
 const {render}=sample(),html=render({name:'Thorn Steeple',biomeId:'thorn',duration:51},{bonus:ROUTE_BONUSES.wayfinder});
 assert.match(html,/preview-atlas/);
 assert.match(html,/<h2 id="preview-place">Thorn Steeple<\/h2>/);
 assert.doesNotMatch(html,/Travel Guide|Route details|preview-landmark|preview-features|51 s|Briar Cathedral/);
 assert.match(html,/Fly between all 3 gold gates, then finish/);
 assert.match(html,/Temporary Inscription: Wayglass — preview the opening 2\.5 seconds before takeoff\. 3 flights\./);
});

test('three preview art choices decorate the shared guide without changing rewards or becoming the game default',()=>{
 const {render}=sample(),plain=render({},{bonus:ROUTE_BONUSES.wayfinder});
 assert.doesNotMatch(plain,/preview-art-/);
 for(const guideArt of ['waystone','rootwood','night-atlas']){
  const decorated=render({},{bonus:ROUTE_BONUSES.wayfinder,guideArt});
  assert.match(decorated,new RegExp(`preview-art-${guideArt}`));
  assert.match(decorated,/Travel Guide/);assert.match(decorated,/preview-route-details/);
  for(const marker of ['On clear','Optional','preview-condition','preview-prize'])assert.ok(decorated.includes(marker)&&plain.includes(marker));
 }
 assert.doesNotMatch(render({},{guideArt:'bad" onclick="alert(1)'}),/onclick|preview-art-/);
 const signs=[...plain.matchAll(/class="preview-chevron"[^>]*>([\s\S]*?)<\/svg>/g)].map(match=>match[1]);
 assert.equal(signs.length,2);assert.equal(signs[0].replace(' transform="translate(24 0) scale(-1 1)"',''),signs[1]);
});
