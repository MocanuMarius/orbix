import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,ARTIFACTS} from '../dist/model.mjs';
import {flightPreviewMarkup} from '../dist/flight-preview.mjs';
import {ROUTE_BONUSES} from '../dist/route-bonuses.mjs';

function sample(){
 const state=newState(),run=createRun(state.profile,'preview-coral',1);
 const node=run.map.flat().find(n=>n.type==='flight');
 const render=(change={},opts={})=>flightPreviewMarkup(run,{...node,...change},{available:true,level:node, ...opts});
 return {run,node,render};
}

test('preview shows earned pay and the optional condition separately, with claiming actions only on the footer',()=>{
 const {render}=sample(),html=render({},{bonus:ROUTE_BONUSES.constellation});
 assert.match(html,/id="preview-regular">On clear/);
 assert.match(html,/\+20 <span>Stored Sparks/);
 assert.match(html,/id="preview-optional">Optional bonus/);
 assert.match(html,/Rising Constellation/);
 assert.match(html,/First three fuel Sparks/);
 assert.doesNotMatch(html.split('<footer>')[0],/<button|data-action=|No Rest ahead|of .* hearts/);
 assert.match(html,/>Back<\/button>/);
 assert.match(html,/>Fly →<\/button>/);
});

test('artifact copy follows available offers, and the last guardian previews the expedition victory',()=>{
 const {run,render}=sample();
 assert.match(render({elite:true}),/Choose 1 of 2 artifacts/);
 run.seenArtifacts=Object.keys(ARTIFACTS).filter(id=>id!=='echo-bell');
 assert.match(render({elite:true}),/Gain 1 artifact/);
 run.seenArtifacts.push('echo-bell');
 assert.doesNotMatch(render({elite:true}),/artifacts?|Optional bonus/);
 const last=render({boss:true,mapIndex:2});
 assert.match(last,/Expedition victory/);
 assert.doesNotMatch(last,/Stored Sparks|Optional bonus|Choose 1/);
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
  assert.match(html,/data-action="node"[^>]*>Dream · 6s →/);
  assert.doesNotMatch(html,/data-action="dream"|>Fly →/);
  assert.doesNotMatch(render(type,{available:false}),/data-action="node"|Dream ·/);
 }
 run.phase='briefing';run.current=node;
 assert.match(render(),/Dream · 6s/);
 run.attemptActive=true;
 assert.doesNotMatch(render(),/Dream ·/);
});
