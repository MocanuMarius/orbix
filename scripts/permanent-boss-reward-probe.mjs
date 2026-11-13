import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
const ids=Object.keys(M.ARTIFACTS).filter(id=>M.ARTIFACTS[id].rarity==='boss');
function win(owned=[],test=false){const s=M.newState();s.profile.ownedArtifacts=[...owned];s.run=M.createRun(s.profile,'permanent-boss');const r=s.run;
 for(let i=0;i<2;i++){r.phase='map-clear';r.step=7;assert.ok(M.advanceMap(r));}
 r.testMode=test;r.phase='briefing';r.current=r.map[6][0];r.step=6;r.path=[r.current.id];
 assert.ok(M.beginFlightAttempt(r));assert.ok(M.finishFlight(r,{success:true,flame:60}));M.settleCheckpoint(s);return s;
}
let s=win();assert.equal(s.profile.difficulty,2);assert.equal(s.profile.ownedArtifacts.length,0,'No independent random grant before choosing');
assert.equal(s.run.flightReward.permanent,true);assert.ok(s.run.flightReward.offers.every(id=>M.ARTIFACTS[id].rarity==='boss'));assert.equal(s.run.flightReward.emberAlternative,null);assert.equal(M.chooseFlightReward(s,'embers'),false);assert.equal(M.bankRun(s),false);
const offers=[...s.run.flightReward.offers],storage={data:'',setItem(k,v){this.data=v},getItem(){return this.data}};M.saveState(s,storage);s=M.loadState(storage);
assert.deepEqual(s.run.flightReward.offers,offers);assert.equal(s.profile.ownedArtifacts.length,0);assert.equal(s.run.banked,false);
s.run.artifacts=['quiet-cinder','moss-heart','iron-petal'];assert.ok(M.chooseFlightReward(s,offers[0]),'Permanent choice needs no run slot');
assert.deepEqual(s.profile.ownedArtifacts,[offers[0]]);assert.equal(s.run.lastFlight.artifactDrop.id,offers[0]);assert.equal(M.chooseFlightReward(s,offers[1]),false);
M.saveState(s,storage);s=M.loadState(storage);assert.deepEqual(s.profile.ownedArtifacts,[offers[0]]);assert.ok(M.acknowledgeVictory(s));assert.ok(M.bankRun(s));assert.equal(M.bankRun(s),false);
const last=ids.at(-1),one=win(ids.filter(id=>id!==last));assert.deepEqual(one.run.flightReward.offers,[last]);assert.ok(M.chooseFlightReward(one,last));assert.equal(one.profile.ownedArtifacts.length,ids.length);
const complete=win(ids);assert.equal(complete.run.flightReward.collectionComplete,true);assert.equal(complete.run.flightReward.claimed,true);assert.deepEqual(complete.run.flightReward.offers,[]);assert.equal(complete.run.lastFlight.artifactDrop.message,'Collection complete');assert.ok(M.acknowledgeVictory(complete));assert.ok(M.bankRun(complete));
const test=win([],true);assert.ok(M.chooseFlightReward(test,test.run.flightReward.offers[0]));assert.equal(test.profile.ownedArtifacts.length,0);assert.equal(test.profile.difficulty,1);assert.equal(test.run.lastFlight.artifactDrop.test,true);
console.log('Permanent boss choice, reload before/after selection, full run slots, final missing relic, complete collection and TEST isolation passed.');
