import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,newState,previewAtlasMap,canChooseForecast,advanceMap,saveState,loadState,getChoices,selectNode,beginFlightAttempt,finishFlight} from '../dist/model.mjs';
import {atlasBranches,forecastCheckpointMarkup} from '../dist/night-atlas.mjs';
import {landscapeRouteView} from '../dist/landscape-map.mjs';

function checkpoint(wins,seed='forest') {
 const state=newState();
 state.profile.stats.wins=wins;
 const run=state.run=createRun(state.profile,seed,1);
 run.phase='map-clear'; run.step=run.map.length;
 return state;
}
function reload(state) {
 let value;
 const storage={getItem:()=>value,setItem:(_,saved)=>value=saved};
 assert.ok(saveState(state,storage));
 return loadState(storage);
}
test('the first real expedition stays clear, TEST exposes the experiment, and unclaimed guardian loot blocks the forecast',()=>{
 const run=checkpoint(0).run;
 assert.equal(previewAtlasMap(run),null);
 assert.equal(advanceMap(run,'bellwind'),false);
 run.testMode=true;
 assert.equal(canChooseForecast(run),true);
 run.victoryPending=true;
 assert.equal(canChooseForecast(run),false);
 run.victoryPending=false; run.isTutorial=true;
 assert.equal(canChooseForecast(run),false);
 const normal=checkpoint(1).run;
 assert.ok(advanceMap(normal,'clear'));
 assert.ok(normal.map.flat().every(node=>!node.atlasForecast));
});
test('forecast previews match the entered map and preserve a connected ordinary route on every recipe',()=>{
 const witnessed=new Set();
 for(let seed=0;seed<72;seed++){
  for(const forecast of ['bellwind','hollow-moon']){
   const state=checkpoint(1,'atlas-'+seed),run=state.run;
   const preview=previewAtlasMap(run);
   const sites=atlasBranches(preview,forecast);
   assert.equal(sites.length,3);
   assert.equal(sites.at(-1).boss,true);
   assert.equal(sites[0].row,0);
   assert.notEqual(sites[0].id,atlasBranches(preview,forecast==='bellwind'?'hollow-moon':'bellwind')[0].id);
   const expected=sites.map(site=>site.id);
   const html=forecastCheckpointMarkup(preview);
   for(const site of sites)assert.ok(html.includes(site.name));
   assert.ok(advanceMap(run,forecast));
   assert.deepEqual(run.map.flat().filter(n=>n.atlasForecast===forecast).map(n=>n.id),expected);
   assert.equal(advanceMap(run,forecast),false);
   const idMap=new Map(run.map.flat().map(n=>[n.id,n]));
   const safePath=n=>n.boss||!n.elite&&!n.atlasForecast&&n.nextIds.some(id=>safePath(idMap.get(id)));
   assert.ok(run.map[0].some(safePath));
   witnessed.add(sites[0].recipeId);
  }
 }
 assert.equal(witnessed.size,6);
});
test('forecast survives a real failed attempt and reload, then expires at the second guardian',()=>{
 const state=checkpoint(1,'resilient'),before=state.run.condensedGlow;
 advanceMap(state.run,'hollow-moon');
 const saved=reload(state),run=saved.run;
 const site=getChoices(run).find(n=>n.atlasForecast);
 assert.ok(site && landscapeRouteView(run).markup.includes('Hollow Moon'));
 assert.ok(selectNode(run,site.id)); assert.ok(beginFlightAttempt(run));
 assert.ok(finishFlight(run,{success:false}));
 assert.equal(run.lives,2);
 assert.equal(getChoices(run).find(n=>n.id===site.id).atlasForecast,'hollow-moon');
 assert.equal(run.condensedGlow,before);
 run.phase='map-clear';run.step=run.map.length;
 assert.equal(canChooseForecast(run),false);
 assert.ok(advanceMap(run));
 assert.equal(run.mapHistory.at(-1).atlasForecast,'hollow-moon');
 assert.equal(run.atlasForecast,undefined);
 assert.ok(run.map.flat().every(n=>!n.atlasForecast));
});
