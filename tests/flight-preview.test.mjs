import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,ARTIFACTS} from '../dist/model.mjs';
import {flightPreviewMarkup} from '../dist/flight-preview.mjs';
import {ROUTE_BONUSES} from '../dist/route-bonuses.mjs';
import {getFlightClearReward} from '../dist/checkpoint-rewards.mjs';
const visibleText=html=>html.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();

function sample(){
 const state=newState(),run=createRun(state.profile,'preview-coral',1);
 const node=run.map.flat().find(n=>n.type==='flight');
 const render=(change={},opts={})=>flightPreviewMarkup(run,{...node,...change},{available:true,level:node, ...opts});
 return {run,node,render};
}

test('preview shows earned pay and the optional condition separately, with claiming actions only on the footer',()=>{
 const {run,node,render}=sample(),html=render({},{bonus:ROUTE_BONUSES.constellation});
 assert.match(html,/id="preview-regular">On clear/);
 assert.ok(html.includes(`+${getFlightClearReward(node,run)} <span>Stored Sparks`));
 assert.match(html,/id="preview-optional">Optional challenge/);
 assert.match(html,/Rising Constellation/);
 assert.match(html,/First 3 fuel pickups restore \+2 missing Sparks/);
 assert.match(html,/Then clear →/);
 assert.doesNotMatch(html.split('<footer>')[0],/data-action=|No Rest ahead|of .* hearts/);
 assert.match(html,/data-action="close-sheet" aria-label="Back to route"><svg/);
 assert.match(html,/data-action="node"[^>]*aria-label="Fly to [^"]+"><svg/);
 assert.match(html,/data-card-term="stored"/);assert.match(html,/data-card-glossary/);
 assert.doesNotMatch(visibleText(html.split('<footer>')[1]),/Back|Fly|→/);
});

test('artifact copy follows available offers, and the last guardian previews the expedition victory',()=>{
 const {run,render}=sample();
 assert.match(render({elite:true}),/Choose 1 of 2 relics/);
 run.artifacts=Object.keys(ARTIFACTS).filter(id=>id!=='echo-bell');
 assert.match(render({elite:true}),/1 relic/);
 run.artifacts.push('echo-bell');
 assert.doesNotMatch(render({elite:true}),/relics?|Optional challenge/);
 const last=render({boss:true,mapIndex:2});
 assert.match(last,/Expedition victory/);
 assert.doesNotMatch(last,/Stored Sparks|Optional challenge|Choose 1/);
});

test('card runs promise the guaranteed card without drawing it, including the final trophy',()=>{
 const state=newState(),run=createRun(state.profile,'card-preview',1,{cards:true});
 const node=run.map.flat().find(n=>n.type==='flight'),before=JSON.stringify(run);
 assert.match(flightPreviewMarkup(run,node),/1 card/);
 assert.match(flightPreviewMarkup(run,{...node,elite:true}),/1 card \+ choose 1 of 2 relics/);
 const final=flightPreviewMarkup(run,{...node,boss:true,mapIndex:2});
 assert.match(final,/Expedition victory/);assert.match(final,/1 trophy card/);
 assert.equal(JSON.stringify(run),before);
});

test('the committed forecast gets one cue; future previews cannot start a flight',()=>{
 const {render}=sample(),html=render({atlasForecast:'bellwind',interactionHint:'Only the unmodified terrain cue'},{available:false});
 assert.match(html,/Bellwind/);
 assert.match(visibleText(html),/upper Sparks/);
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

test('Travel Guide discloses biome features, fuel mix, and duration without crowding the rewards',()=>{
 const {render}=sample(),html=render({name:'Thorn Steeple',biomeId:'thorn',duration:51},{bonus:ROUTE_BONUSES.wayfinder});
 assert.match(html,/Travel Guide/);
 assert.match(html,/<h2 id="preview-place">Thorn Steeple<\/h2>/);
 assert.match(html,/<summary>Ripe pods<\/summary>/);
 assert.match(html,/<summary>More gentle Sparks<\/summary>/);
 assert.match(html,/<summary>Details<\/summary><div class="preview-feature-copy"><p>Briar Cathedral · Flight · 51 s<\/p>/);
 assert.doesNotMatch(html.split('preview-features')[0],/51 s|Briar Cathedral/);
 assert.match(html,/Fly between all 3 gold gates, then finish/);
 assert.match(html,/Preview the opening 2.5s before takeoff for your next 3 clears/);
 assert.match(visibleText(html),/collecting a nearby Spark does not count/);
 assert.match(html,/Failed or interrupted flights keep the reward/);
});

test('three preview art choices decorate the shared guide without changing rewards or becoming the game default',()=>{
 const {render}=sample(),plain=render({},{bonus:ROUTE_BONUSES.wayfinder});
 assert.doesNotMatch(plain,/preview-art-/);
 for(const guideArt of ['waystone','rootwood','night-atlas']){
  const decorated=render({},{bonus:ROUTE_BONUSES.wayfinder,guideArt});
  assert.match(decorated,new RegExp(`preview-art-${guideArt}`));
  assert.equal(visibleText(decorated),visibleText(plain));
 }
 assert.doesNotMatch(render({},{guideArt:'bad" onclick="alert(1)'}),/onclick|preview-art-/);
 const signs=[...plain.matchAll(/class="preview-chevron"[^>]*>([\s\S]*?)<\/svg>/g)].map(match=>match[1]);
 assert.equal(signs.length,2);assert.equal(signs[0].replace(' transform="translate(24 0) scale(-1 1)"',''),signs[1]);
});
