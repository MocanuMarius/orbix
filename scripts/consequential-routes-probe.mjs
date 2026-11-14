import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {ROUTE_TOPOLOGY_VERSION} from '../dist/route-recipes.mjs';
import {getRouteForecast} from '../dist/route-forecast.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const make=(seed,tier=1)=>M.createRun({...M.newState().profile,difficulty:6},seed,tier);
const byId=r=>new Map(r.map.flat().map(n=>[n.id,n]));
function stateAfter(r,path){const n=clone(r);n.path=path;n.step=byId(n).get(path.at(-1)).row+1;n.phase='map';n.current=null;return n;}
function allPaths(r,target){const by=byId(r),out=[];function walk(n,path=[],elite=false){if(elite&&n.elite)return;const nextPath=[...path,n.id];if(n.id===target){out.push(nextPath);return;}for(const id of n.nextIds)walk(by.get(id),nextPath,n.type==='support'?elite:n.elite===true);}for(const n of r.map[0])walk(n);return out;}
let maps=0,blockedSelections=0,restRetries=0,supportExclusions=0;
const recipes=new Set();
for(let seed=0;seed<48;seed++){
 const r=make('committed-'+seed,1+seed%6);
 for(let map=0;map<3;map++){
  maps++;recipes.add(r.map[0][0].recipeId);const by=byId(r);
  assert.equal(M.getChoices(r).length,3,'Three opening routes, not three edges from every encounter');
  for(const node of by.values()){
   assert.equal(node.routeTopology,ROUTE_TOPOLOGY_VERSION);
   assert.ok(node.nextIds.length<=2,'At most two outgoing destinations');
   if(node.row)assert.ok(r.map[node.row-1].some(n=>n.nextIds.includes(node.id)),'All displayed stops have an incoming route');
   if(node.kind==='camp'){assert.equal(node.nextIds.length,1);assert.equal(by.get(node.nextIds[0]).type,'flight');assert.equal(by.get(node.nextIds[0]).elite,false);}
  }
  for(const start of r.map[0]){
   const committed=stateAfter(r,[start.id]),view=M.getRouteMapState(committed),reach=new Set(view.reachableIds);
   assert.equal(view.currentId,start.id);assert.deepEqual(view.completedIds,[start.id]);assert.deepEqual(view.availableIds,M.getChoices(committed).map(n=>n.id));
   assert.ok(r.map[3].filter(n=>reach.has(n.id)).length<=2,'Opening choice still excludes a corridor three stops later');
   assert.ok(reach.has(r.map[6][0].id),'Every committed branch reaches the finale');
   supportExclusions+=r.map.flat().filter(n=>n.row>=2&&n.type==='support'&&!reach.has(n.id)).length;
   for(const node of r.map[committed.step].filter(n=>!view.availableIds.includes(n.id))){const before=JSON.stringify(committed);assert.equal(M.selectNode(committed,node.id),false);assert.equal(JSON.stringify(committed),before);blockedSelections++;}
   const chosen=M.getChoices(committed)[0];assert.ok(M.selectNode(committed,chosen.id));const preview=M.getRouteMapState(committed);assert.equal(preview.selectedId,chosen.id);assert.deepEqual(preview.availableIds,[]);assert.ok(preview.reachableIds.includes(chosen.id));
  }
  for(const camp of r.map.flat().filter(n=>n.kind==='camp')){
   const path=allPaths(r,camp.id)[0];assert.ok(path);
   const retry=stateAfter(r,path),next=M.getChoices(retry)[0];assert.ok(M.selectNode(retry,next.id));assert.ok(M.beginFlightAttempt(retry));assert.ok(M.finishFlight(retry,{success:false,flame:0}));
   assert.deepEqual(M.getChoices(retry).map(n=>n.id),[next.id]);assert.deepEqual(M.getRouteMapState(retry).availableIds,[next.id]);assert.equal(M.getRouteMapState(retry).currentId,camp.id);assert.ok(!M.getRouteMapState(retry).completedIds.includes(next.id));restRetries++;
  }
  r.phase='map-clear';r.step=7;if(map<2)assert.ok(M.advanceMap(r));
 }
}
assert.equal(recipes.size,6);assert.ok(supportExclusions>maps);assert.ok(restRetries>0);
// A concrete Rest/Treasure decision remains exclusive for two more stops.
const fixture=make('route-audit-one');assert.equal(fixture.map[0][0].recipeId,'long-crossing');
const treasurePath=stateAfter(fixture,['m0-0-1','m0-1-2']),elitePath=stateAfter(fixture,['m0-0-1','m0-1-1']);
assert.ok(M.getRouteMapState(treasurePath).reachableIds.includes('m0-2-2'));
assert.ok(!M.getRouteMapState(treasurePath).reachableIds.includes('m0-4-1'),'Taking Treasure cuts off the later Rest');
assert.ok(M.getRouteMapState(elitePath).reachableIds.includes('m0-4-1'));
assert.ok(!M.getRouteMapState(elitePath).reachableIds.includes('m0-2-2'),'The Rest corridor cannot also take Treasure');
assert.equal(getRouteForecast(treasurePath,byId(treasurePath).get('m0-2-2')).restReachable,false);
// History-aware visibility matches the model across elite -> support -> elite.
const history=make('history');history.map=[
 [{id:'e0',row:0,type:'flight',elite:true,nextIds:['event']}],
 [{id:'event',row:1,type:'support',kind:'event',elite:false,nextIds:['e2','safe2']}],
 [{id:'e2',row:2,type:'flight',elite:true,nextIds:[]},{id:'safe2',row:2,type:'flight',elite:false,nextIds:[]}],
];history.path=['e0'];history.step=1;history.phase='map';history.current=null;
const visible=M.getRouteMapState(history);assert.ok(visible.reachableIds.includes('event'));assert.ok(visible.reachableIds.includes('safe2'));assert.ok(!visible.reachableIds.includes('e2'));assert.ok(!visible.reachableEdges.some(([,to])=>to==='e2'));
// Saved current campaigns are preserved, not silently rerouted by a new version.
const s=M.newState();s.run=stateAfter(fixture,['m0-0-1']);const storage={data:'',setItem(k,v){this.data=v},getItem(){return this.data}};M.saveState(s,storage);const loaded=M.loadState(storage);assert.deepEqual(loaded.run.map,s.run.map);assert.deepEqual(M.getRouteMapState(loaded.run),M.getRouteMapState(s.run));
// Old saves may retain a post-death detour. Preserve an already committed alternate path.
const legacyCamp=fixture.map.flat().find(n=>n.kind==='camp'&&fixture.map[n.row+1].filter(v=>v.type==='flight').length>1);
const legacy=stateAfter(fixture,allPaths(fixture,legacyCamp.id)[0]);
const origin=byId(legacy).get(legacyCamp.id),authored=origin.nextIds[0];
const alternate=legacy.map[origin.row+1].find(n=>n.id!==authored&&n.type==='flight');
origin.nextIds.push(alternate.id);origin.retryNextIds=[alternate.id];legacy.deathDetour={fromId:origin.id};
const oldSave=M.newState();oldSave.run=legacy;
storage.data=JSON.stringify(oldSave);
const repaired=M.loadState(storage).run;
assert.deepEqual(M.getChoices(repaired).map(n=>n.id),[authored]);assert.ok(!byId(repaired).get(origin.id).retryNextIds);assert.ok(!repaired.deathDetour);
legacy.current=alternate;legacy.path.push(alternate.id);legacy.phase='briefing';storage.data=JSON.stringify(oldSave);
assert.deepEqual(byId(M.loadState(storage).run).get(origin.id).nextIds,[alternate.id]);
const practiceState=M.newState();assert.ok(M.startTutorial(practiceState));const practice=practiceState.run;assert.ok(practice.map.flat().filter(n=>n.kind==='camp').every(n=>n.nextIds.length===1&&byId(practice).get(n.nextIds[0])?.type!=='support'));
oldSave.suspendedRun=legacy;oldSave.run=practice;storage.data=JSON.stringify(oldSave);
assert.deepEqual(byId(M.loadState(storage).suspendedRun).get(origin.id).nextIds,[alternate.id]);
console.log(JSON.stringify({maps,recipes:[...recipes],blockedSelections,restRetries,supportExclusions,fixture:{seed:'route-audit-one',choice:['m0-1-1','m0-1-2'],treasure:'m0-2-2',excludedLaterRest:'m0-4-1'},status:'passed'}));
