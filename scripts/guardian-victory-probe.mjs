import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {guardianProgressMarkup,guardianRitualMarkup} from '../dist/campaign-ui.mjs';
for(let map=0;map<3;map++){
 const s=M.newState();s.run=M.createRun(s.profile,'victory-check');const r=s.run;
 r.mapIndex=map;r.current=r.map.flat().find(n=>n.type==='finale');r.phase='briefing';r.step=r.map.length-1;
 assert.ok(M.beginFlightAttempt(r));assert.ok(M.finishFlight(r,{success:true,flame:60,collected:3,condensedGlow:0}));
 assert.match(guardianProgressMarkup(r),new RegExp((map+1)+' of 3'));
 assert.equal((guardianRitualMarkup(r).match(/class="ritual-orb /g)||[]).length,3);
 if(map===2){assert.equal(r.phase,'ended');assert.equal(r.success,true);assert.equal(r.flightReward,null);assert.equal(r.victoryPending,false);M.settleCheckpoint(s);assert.ok(M.bankRun(s));assert.equal(s.profile.ownedArtifacts.length,0);assert.equal(r.mapIndex,2);assert.equal(r.difficulty,1);const fresh=M.createRun(s.profile,'new');assert.equal(fresh.artifacts.length,0);assert.equal(Object.keys(fresh.skills).length,0);}
 else{assert.equal(r.phase,'map-clear');assert.equal(r.victoryPending,true);assert.equal(r.flightReward.permanent,false);}
}
console.log('Three guardian stages; final victory ends run; no artifact or build carryover; static markers verified.');
