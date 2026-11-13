import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {ROUTE_RECIPES,nodeEconomy,REWARD_THEMES} from '../dist/route-recipes.mjs';
import {getRouteForecast} from '../dist/route-forecast.mjs';
const recipes=new Set(),bosses=new Set(),restRows=new Set(),themes=new Set(),supportPatterns=new Set();
const totals=[];let maps=0,rewards=0,eliteRewards=0,ordinaryPaths=0;
const make=seed=>{const state=M.newState();state.run=M.createRun(state.profile,seed);return state;};
function victory(state,node){const r=state.run;r.phase='briefing';r.current=node;r.step=node.row;r.attemptActive=false;assert.ok(M.beginFlightAttempt(r));assert.ok(M.finishFlight(r,{success:true,flame:50,collected:0,embers:0}));M.settleCheckpoint(state);return r.flightReward;}
for(let seed=0;seed<120;seed++){
 const state=make('recipe-'+seed),repeat=make('recipe-'+seed);assert.deepEqual(state.run.map,repeat.run.map);
 const r=state.run;
 for(let map=0;map<3;map++){
  maps++;const all=r.map.flat(),byId=new Map(all.map(n=>[n.id,n]));recipes.add(all[0].recipeId);
  supportPatterns.add(r.map.map(row=>row.map(n=>n.type==='support'?n.kind:'F').join(',')).join('|'));
  function walk(n,lastElite=false,ordinary=true){
   assert.ok(!(lastElite&&n.elite));
   const elite=n.type==='support'?lastElite:n.elite;
   if(n.row===6){if(ordinary&&!n.elite)ordinaryPaths++;return;}
   const next=n.nextIds.map(id=>byId.get(id)).filter(child=>!(elite&&child.elite));assert.ok(next.length,'Every reachable history reaches finale');
   assert.ok(next.some(child=>!child.elite),'Ordinary exit from every node');
   for(const child of next)walk(child,elite,ordinary&&!n.elite);
  }
  for(const start of r.map[0])walk(start);
  for(const n of all){
   assert.ok(n.nextIds.length<=2);assert.ok(n.nextIds.every(id=>byId.get(id)?.row===n.row+1));
   if(n.row)assert.ok(r.map[n.row-1].some(p=>p.nextIds.includes(n.id)),'No orphan displayed nodes');
   if(n.kind==='camp'){restRows.add(n.row);assert.equal(n.nextIds.length,1);const next=byId.get(n.nextIds[0]);assert.notEqual(next.type,'support');assert.equal(next.elite,false);}
   if(n.boss)bosses.add(n.bossId);
   if(n.type!=='support'&&n.type!=='finale')assert.ok(['stillwater-tunnel','draft-staircase','seed-orchard'].includes(n.encounterFamily));
   themes.add(n.rewardTheme);assert.ok(REWARD_THEMES[n.rewardTheme]);assert.match(n.rewardPreview,/Embers|Recover|Boon|Permanent/);
   const forecast=getRouteForecast(r,n);assert.equal(forecast.rewardTheme,n.rewardTheme);assert.ok(Number.isFinite(forecast.minFlights));
   const e=nodeEconomy(n);if(n.boss)assert.equal(e.cash,null);else assert.ok(e.cash>=18&&e.cash<=36);assert.ok(e.clear<=48);
  }
  // Observe all flight rewards, independent of a chosen route, with a realistic
  // partial build. Every offered new relic must remain a real alternative to cash.
  for(const n of all.filter(n=>n.type!=='support')){
   const sample=make('offers-'+seed+'-'+map+'-'+n.id);sample.run.mapIndex=map;sample.run.seed=r.seed;sample.run.map=r.map;sample.run.artifacts=['quiet-cinder'];sample.run.skills={'main-efficiency':1};
   const reward=victory(sample,n);assert.equal(reward.offers.length,2);assert.equal(new Set(reward.offers).size,2);if(!reward.permanent)assert.ok(reward.offers.every(id=>id!=='quiet-cinder'));
   assert.ok(M.ARTIFACTS[reward.offers[0]].tags.includes(n.rewardTheme));
   if(!reward.permanent)assert.ok(reward.offers.every(id=>M.ARTIFACTS[id].sellValue<reward.emberAlternative));
   if(n.boss)assert.ok(reward.offers.every(id=>M.ARTIFACTS[id].rarity==='boss'));else{assert.ok(reward.offers.every(id=>M.ARTIFACTS[id].rarity!=='boss'));if(n.type==='finale')assert.ok(reward.offers.every(id=>M.ARTIFACTS[id].rarity==='rare'));if(n.elite||n.type==='finale'){assert.equal(M.ARTIFACTS[reward.offers[1]].rarity,'rare');eliteRewards++;}}
   const wallet=sample.run.embers;if(reward.permanent){assert.equal(reward.emberAlternative,null);assert.equal(M.chooseFlightReward(sample,'embers'),false);assert.ok(M.chooseFlightReward(sample,reward.offers[0]));assert.deepEqual(sample.profile.ownedArtifacts,[reward.offers[0]]);}else{assert.ok(M.chooseFlightReward(sample,'embers'));assert.equal(sample.run.embers,wallet+reward.emberAlternative);}assert.equal(M.chooseFlightReward(sample,'embers'),false);
   rewards++;
  }
  r.phase='map-clear';r.step=7;r.victoryPending=false;if(map<2)assert.ok(M.advanceMap(r));
 }
}
assert.equal(recipes.size,ROUTE_RECIPES.length);assert.equal(bosses.size,2);assert.ok(restRows.size>=4);assert.equal(themes.size,5);assert.ok(supportPatterns.size>=10);
// Comparison runs collect cash every victory with no pickup income. Spend nothing
// so totals expose the offered budget, not bot skill or a claimed human win rate.
for(let seed=0;seed<30;seed++){
 const state=make('budget-'+seed),r=state.run;let flights=0;
 while(!r.banked){
  if(r.phase==='map'){const choices=M.getChoices(r),node=choices.find(n=>n.kind==='camp')||choices.find(n=>!n.elite)||choices[0];assert.ok(M.selectNode(r,node.id));}
  else if(r.phase==='support'){const c=M.getSupportChoices(r,state.profile);const index=Math.max(0,c.findIndex(x=>x.effect.embers>0&&!x.effect.flame&&!x.effect.burden));assert.ok(M.resolveSupport(r,index,state.profile));M.settleCheckpoint(state);if(r.flightReward&&!r.flightReward.claimed)M.chooseFlightReward(state,'embers');}
  else if(r.phase==='briefing'){victory(state,r.current);flights++;M.chooseFlightReward(state,r.flightReward.permanent?r.flightReward.offers[0]:'embers');M.acknowledgeVictory(state);}
  else if(r.phase==='map-clear')assert.ok(M.advanceMap(r));else if(r.phase==='ended')assert.ok(M.bankRun(state));else throw new Error(r.phase);
  assert.ok(flights<=21);
 }
 totals.push({embers:r.embers,flights});assert.ok(r.embers>=400&&r.embers<=1200);
}
console.log(JSON.stringify({maps,recipes:[...recipes],supportPatterns:supportPatterns.size,restRows:[...restRows].sort(),bosses:[...bosses],rewards,eliteRewards,ordinaryPaths,budgetCashOnly:{min:Math.min(...totals.map(t=>t.embers)),max:Math.max(...totals.map(t=>t.embers)),flightRange:[Math.min(...totals.map(t=>t.flights)),Math.max(...totals.map(t=>t.flights))]},status:'passed'}));
