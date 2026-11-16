import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,ARTIFACTS} from '../dist/model.mjs';
import {flightPreviewMarkup} from '../dist/flight-preview.mjs';
import {ROUTE_BONUSES} from '../dist/route-bonuses.mjs';
import {getFlightClearReward} from '../dist/checkpoint-rewards.mjs';

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
 assert.doesNotMatch(html.split('<footer>')[0],/<button|data-action=|No Rest ahead|of .* hearts/);
 assert.match(html,/>Back<\/button>/);
 assert.match(html,/>Fly →<\/button>/);
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
 assert.match(html,/upper Sparks/);
 assert.doesNotMatch(html,/Only the unmodified terrain cue|data-action="node"/);
});

test('learned Dream replaces Fly on each reachable flight and stays hidden from future nodes',()=>{
 const {run,node,render}=sample();
 assert.match(render(),/>Fly →/);
 run.skills['main-dream']=1;
 for(const type of [{elite:false,boss:false},{elite:true},{boss:true}]){
  const html=render(type);
  assert.match(html,/data-action="node"[^>]*>Dream · 8s →/);
  assert.doesNotMatch(html,/data-action="dream"|>Fly →/);
  assert.doesNotMatch(render(type,{available:false}),/data-action="node"|Dream ·/);
 }
 run.phase='briefing';run.current=node;
 assert.match(render(),/Dream · 8s/);
 run.attemptActive=true;
 assert.doesNotMatch(render(),/Dream ·/);
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
 assert.match(html,/collecting a nearby Spark does not count/);
 assert.match(html,/Failed or interrupted flights keep the reward/);
});
