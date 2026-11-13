import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {MAP_STOP_TYPES} from '../dist/map-guide.mjs';
const state=seed=>{const s=M.newState();s.run=M.createRun(s.profile,seed);return s;};
const finish=(s,flame=70,afterglow=0)=>{const r=s.run;assert.ok(M.beginFlightAttempt(r));assert.ok(M.finishFlight(r,{success:true,flame,afterglow,collected:12,embers:0}));M.settleCheckpoint(s);};
const claim=s=>{assert.ok(M.chooseFlightReward(s,'embers'));assert.ok(M.acknowledgeVictory(s));};
assert.equal(Object.keys(MAP_STOP_TYPES).length,5);
let maps=0,rests=0,branches=0;
for(let i=0;i<30;i++){
 const s=state('graph-'+i),r=s.run;
 for(let map=0;map<3;map++){
  const by=new Map(r.map.flat().map(n=>[n.id,n]));
  function walk(n,lastElite=false){assert.ok(!(lastElite&&n.elite));const next=n.nextIds.map(id=>by.get(id)).filter(x=>!((n.type==='support'?lastElite:n.elite)&&x.elite));if(n.row===6)return;assert.ok(next.length);for(const child of next)walk(child,n.type==='support'?lastElite:n.elite);}
  for(const n of r.map[0])walk(n);
  for(const n of r.map.flat()){if(n.kind==='camp'){rests++;assert.equal(n.nextIds.length,1);assert.notEqual(by.get(n.nextIds[0]).type,'support');}if(n.nextIds.length>1)branches++;}
  maps++;r.phase='map-clear';r.step=7;if(map<2)assert.ok(M.advanceMap(r));
 }
}
const s=state('recovery');M.chooseStartingSkill(s,'main-efficiency');assert.ok(M.buyCheckpointSkill(s,'main-afterglow'));assert.ok(M.selectNode(s.run,M.getChoices(s.run)[0].id));finish(s,70);assert.equal(s.run.flame,100);assert.equal(s.run.afterglow,20);assert.equal(s.run.lastFlight.recovery.amount,50);assert.ok(M.getAvailableUpgrades(s).length);assert.equal(M.selectNode(s.run,M.getChoices(s.run)[0].id),false,'Pending reward cannot be skipped');assert.equal(M.acknowledgeVictory(s),false);const offered=s.run.flightReward.offers[0];assert.ok(M.chooseFlightReward(s,offered));assert.equal(M.chooseFlightReward(s,'embers'),false);assert.ok(M.acknowledgeVictory(s));assert.ok(s.run.artifacts.includes(offered));
const treasure=s.run.map[1].find(n=>n.kind==='treasure');s.run.current=treasure;s.run.phase='support';assert.ok(M.resolveSupport(s.run,0,s.profile));assert.equal(s.run.flightReward.source,'treasure');s.run.artifacts=['ember-lens','quiet-cinder','silver-feather'];const replacement=s.run.flightReward.offers.find(x=>!s.run.artifacts.includes(x));assert.ok(replacement);assert.equal(M.chooseFlightReward(s,replacement),false);assert.ok(M.chooseFlightReward(s,replacement,1));assert.equal(s.run.artifacts[1],replacement);assert.equal(s.profile.ownedArtifacts.length,0);
for(let idx=0;idx<12;idx++)for(let option=0;option<3;option++){
 const x=state('event-'+idx),r=x.run;r.skills={'main-efficiency':1,'main-recovery':1};r.startingSkill='main-efficiency';r.embers=100;r.flame=80;r.lives=2;r.current={...r.map[1][1],kind:'event',eventIndex:idx};r.phase='support';const choices=M.getSupportChoices(r,x.profile);if(option>=choices.length)continue;assert.ok(M.resolveSupport(r,option,x.profile),`event ${idx} option ${option}`);M.settleCheckpoint(x);assert.ok(Number.isFinite(r.flame)&&r.flame>=0&&r.flame<=100);assert.ok(r.embers>=0);assert.equal(M.resolveSupport(r,option,x.profile),false);
}
const final=state('full-campaign');M.chooseStartingSkill(final,'main-efficiency');let flights=0;
while(!final.run.banked){const r=final.run;if(r.phase==='map'){const choices=M.getChoices(r);assert.ok(choices.length);assert.ok(M.selectNode(r,choices.find(n=>!n.elite)?.id||choices[0].id));}else if(r.phase==='support'){assert.ok(M.resolveSupport(r,0,final.profile));M.settleCheckpoint(final);if(r.flightReward&&!r.flightReward.claimed)assert.ok(M.chooseFlightReward(final,'embers'));}else if(r.phase==='briefing'){finish(final,45);flights++;assert.equal(M.bankRun(final),false);claim(final);}else if(r.phase==='map-clear')assert.ok(M.advanceMap(r));else if(r.phase==='ended')assert.ok(M.bankRun(final));else throw new Error(r.phase);assert.ok(flights<30);}
console.log(JSON.stringify({maps,rests,branches,events:12,fullCampaignFlights:flights,recovery:'70 + 50 -> 100 + 20 Afterglow',rewards:'one-time choice/replacement, no profile inventory',status:'passed'}));
