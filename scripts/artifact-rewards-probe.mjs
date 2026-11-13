import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {CONSUMABLE_ARTIFACTS,getArtifactInfo} from '../dist/artifact-info.mjs';

const fresh=seed=>{const s=M.newState();s.run=M.createRun(s.profile,seed);return s;};
const enter=s=>{const n=M.getChoices(s.run).find(n=>n.type==='flight'&&!n.elite);assert.ok(n);assert.ok(M.selectNode(s.run,n.id));assert.ok(M.beginFlightAttempt(s.run));};
const storage={data:'',setItem(k,v){this.data=v;},getItem(){return this.data;}};
for(const id of Object.keys(M.ARTIFACTS))assert.ok(getArtifactInfo(id).effect&&getArtifactInfo(id).lifetime,id+' needs plain-language effect and lifetime');
assert.deepEqual(Object.keys(CONSUMABLE_ARTIFACTS),['glow-wick','flash-stone']);

let s=fresh('limited-relics');M.setTestOverride(s,true);
assert.ok(M.equipArtifact(s,'glow-wick',0));assert.ok(M.equipArtifact(s,'flash-stone',1));
assert.deepEqual(M.getRunModifiers(s.run).artifactCharges,{'glow-wick':3,'flash-stone':2});
s.run.artifactCharges['glow-wick']=2;
assert.ok(M.equipArtifact(s,'glow-wick',2));assert.equal(s.run.artifactCharges['glow-wick'],2,'Moving a relic cannot refill its uses');
assert.equal(s.run.artifacts.filter(id=>id==='glow-wick').length,1);
enter(s);assert.ok(M.finishFlight(s.run,{success:false,artifactCharges:{'glow-wick':0,'flash-stone':0}}));
assert.deepEqual(M.getArtifactCharges(s.run),{'flash-stone':2,'glow-wick':2},'Failed flight restores all attempted charges');
enter(s);assert.ok(M.finishFlight(s.run,{success:true,flame:60,artifactCharges:{'glow-wick':0,'flash-stone':1}}));
assert.equal(s.run.artifacts.includes('glow-wick'),false,'Exhausted relic frees its slot');
assert.equal(s.run.artifactCharges['flash-stone'],1);
assert.deepEqual(s.run.lastFlight.consumedArtifacts,['glow-wick']);
assert.equal(s.profile.ownedArtifacts.length,0,'Consumables never join the permanent collection');
s.profile.seenArtifactLessons=['quiet-cinder','unknown'];
M.saveState(s,storage);s=M.loadState(storage);
assert.equal(s.run.artifactCharges['flash-stone'],1);assert.equal(s.run.artifactCharges['glow-wick'],0);
assert.deepEqual(s.profile.seenArtifactLessons,['quiet-cinder']);
s.run.flightReward.offers=['glow-wick'];assert.ok(M.chooseFlightReward(s,'glow-wick'));
assert.equal(s.run.artifactCharges['glow-wick'],3,'A newly awarded copy starts fresh');

const interrupted=fresh('limited-interrupt');M.setTestOverride(interrupted,true);M.equipArtifact(interrupted,'glow-wick');
interrupted.run.artifactCharges['glow-wick']=1;enter(interrupted);
interrupted.run.artifactCharges['glow-wick']=0;M.saveState(interrupted,storage);
const resumed=M.loadState(storage);assert.equal(resumed.run.artifactCharges['glow-wick'],1);assert.ok(resumed.run.artifacts.includes('glow-wick'));
assert.equal(resumed.run.attemptActive,false);

const stored=fresh('unmounted-count');M.setTestOverride(stored,true);M.equipArtifact(stored,'glow-wick');
stored.run.artifactCharges['glow-wick']=1;M.equipArtifact(stored,null);
enter(stored);M.finishFlight(stored.run,{success:false});
assert.equal(stored.run.artifactCharges['glow-wick'],1,'Retry rollback also preserves an unmounted TEST relic count');
stored.run.lastAttempt=null;assert.ok(M.equipArtifact(stored,'glow-wick'));
assert.equal(stored.run.artifactCharges['glow-wick'],1,'Re-equipping after rollback cannot refill partial charges');

const report={};
for(const challengeComplete of [false,true]){
 let offersWithRare=0;const total=1000;
 for(let i=0;i<total;i++){
  const t=fresh('rarity-audit-'+i);enter(t);M.finishFlight(t.run,{success:true,flame:60,challengeComplete});
  const tiers=t.run.flightReward.offers.map(id=>M.ARTIFACTS[id].rarity);
  assert.equal(tiers.length,2);assert.ok(tiers.every(tier=>tier!=='boss'));assert.ok(tiers.filter(tier=>tier==='rare').length<=1);
  if(tiers.includes('rare'))offersWithRare++;
 }
 const rate=offersWithRare/total,target=challengeComplete?.25:.15;
 assert.ok(Math.abs(rate-target)<.035,`${rate} should track rarity roll ${target}`);
 report[challengeComplete?'challenge':'ordinary']={total,offersWithRare,rate};
}
for(const type of ['elite','finale','boss'])for(let i=0;i<40;i++){
 const t=fresh('reward-tier-'+i),r=t.run;enter(t);
 r.current.elite=type==='elite';r.current.type=type==='elite'?'flight':'finale';r.current.boss=type==='boss';
 M.finishFlight(r,{success:true,flame:60});
 const tiers=r.flightReward.offers.map(id=>M.ARTIFACTS[id].rarity);
 if(type==='elite')assert.ok(tiers.includes('rare'));
 else assert.ok(tiers.length===2&&tiers.every(tier=>tier===(type==='boss'?'boss':'rare')));
}
console.log('Artifact rewards/lifetimes: charge persistence, failure/reload rollback, slot release, fresh copies, lesson persistence and rarity-first selection passed.');
console.log(JSON.stringify(report));
