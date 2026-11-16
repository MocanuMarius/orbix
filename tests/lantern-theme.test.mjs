import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,advanceMap,loadState,saveState,SAVE_KEY,startTutorial} from '../dist/model.mjs';
import {lanternEntryLesson} from '../dist/onboarding.mjs';
import {lanternFlightCue,LANTERN_THEME} from '../dist/map-theme.mjs';
import {createLanternMapInspectorState} from '../dist/lantern-map-inspector.mjs';
import {flightPreviewMarkup} from '../dist/flight-preview.mjs';
import {gameDocumentUrl} from '../dist/display-layout.mjs';

test('the guardian sets the theme for every stop on its chapter and only that chapter',()=>{
 const counts={themed:0,ordinary:0};
 for(const seed of [1,5,9,'ember','circles','moths']){
  const run=createRun(newState().profile,seed,1);
  for(let mapIndex=0;mapIndex<3;mapIndex++){
   const nodes=run.map.flat(),guardian=nodes.find(node=>node.boss);
   assert.ok(guardian);
   const themed=guardian.bossId==='hollow-sun';
   counts[themed?'themed':'ordinary']++;
   assert.ok(nodes.every(node=>node.mapTheme===(themed?LANTERN_THEME:null)));
   if(mapIndex<2){run.phase='map-clear';assert.equal(advanceMap(run),true);}
  }
 }
 assert.ok(counts.themed&&counts.ordinary);
});

test('loading an older run restores the theme on the route, selected flight, and suspended run',()=>{
 const state=createLanternMapInspectorState();
 const flight=state.run.map[0][0];
 state.run.current={...flight};
 state.run.phase='briefing';
 state.run.path=[flight.id];
 for(const node of [...state.run.map.flat(),state.run.current])delete node.mapTheme;
 const memory=new Map(),storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
 assert.equal(saveState(state,storage),true);
 assert.ok(memory.get(SAVE_KEY));
 const loaded=loadState(storage);
 assert.equal(loaded.run.current.mapTheme,LANTERN_THEME);
 assert.equal(loaded.run.current.id,flight.id);
 assert.ok(loaded.run.map.flat().every(node=>node.mapTheme===LANTERN_THEME));
 assert.equal(startTutorial(state),true);
 saveState(state,storage);
 const practice=loadState(storage);
 assert.equal(practice.run.isTutorial,true);
 assert.equal(practice.suspendedRun.current.mapTheme,LANTERN_THEME);
 assert.equal(practice.suspendedRun.seed,loaded.run.seed);
});

test('the phone sandbox opens a real map, with Dream and forecast cues and one opt-out lantern lesson',()=>{
 const state=createLanternMapInspectorState(),r=state.run;
 assert.equal(r.phase,'map');
 assert.equal(r.map.flat().find(n=>n.boss).bossId,'hollow-sun');
 assert.equal(gameDocumentUrl('https://example.test/orbix/?mock=lantern-map').search,'?mock=lantern-map');
 const nodes=r.map.flat(),first=r.map[0][0];
 for(const node of [first,nodes.find(n=>n.elite),nodes.find(n=>n.boss)]){
  assert.ok(node);
  r.current=node;
  assert.equal(lanternEntryLesson({},state.profile,r)?.topic,'lanterns');
  assert.ok(lanternFlightCue(node));
 }
 r.current=first;
 r.skills['main-dream']=1;
 const html=flightPreviewMarkup(r,{...first,atlasForecast:'bellwind'},{available:true});
 assert.match(html,/lanterns on the roof and floor/i);
 assert.match(html,/upper Sparks/);
 assert.match(html,/Dream · 8s/);
 assert.equal(lanternEntryLesson({skipTutorial:true},state.profile,r),null);
 state.profile.onboarding.seen.push('lanterns');
 assert.equal(lanternEntryLesson({},state.profile,r),null);
 assert.equal(createLanternMapInspectorState().profile.onboarding.seen.includes('lanterns'),false);
 r.current=nodes.find(n=>n.type==='support');
 assert.equal(lanternEntryLesson({},newState().profile,r),null);
 assert.equal(lanternFlightCue(r.current),'');
});
