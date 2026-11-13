import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
const bosses=Object.keys(M.ARTIFACTS).filter(id=>M.ARTIFACTS[id].rarity==='boss');
assert.equal(bosses.length,3);
for(const [difficulty,base]of [[1,3],[2,2],[3,2],[4,1],[5,1],[6,1]]){
 const s=M.newState();s.profile.difficulty=6;s.profile.ownedArtifacts=Object.keys(M.ARTIFACTS);s.run=M.createRun(s.profile,'capacity-'+difficulty,difficulty);const r=s.run;r.embers=2000;
 assert.equal(M.getArtifactCapacity(r),base);M.setTestOverride(s,true);assert.equal(M.getArtifactCapacity(r),base,'TEST grants no sockets');M.setTestOverride(s,false);r.testMode=false;
 assert.equal(M.equipArtifact(s,'quiet-cinder',base),false);assert.ok(M.equipArtifact(s,'quiet-cinder',base-1));
 let cost=0;for(let i=1;i<=3;i++){const id='main-artifact-slot-'+i;assert.equal(M.getNextArtifactSlotSkill(r),id);const price=M.getSkillCost(M.getSkillWallet(s),id);assert.equal(price,140*2**(i-1));assert.ok(M.buyCheckpointSkill(s,id));cost+=price;assert.equal(M.getArtifactCapacity(r),base+i);}
 assert.equal(cost,980);assert.equal(M.getNextArtifactSlotSkill(r),null);
 const capacity=M.getArtifactCapacity(r);assert.ok(M.equipArtifact(s,'sunheart-engine',capacity-1));assert.equal(M.equipArtifact(s,'dream-sovereign',capacity),false);
 assert.ok(M.equipArtifact(s,'sunheart-engine',0));assert.equal(r.artifacts.filter(id=>id==='sunheart-engine').length,1);
 const mod=M.getRunModifiers(r);assert.deepEqual(mod.artifactEngineSources['overflow-coil'],['sunheart-engine']);assert.deepEqual(mod.artifactEngineSources['dawn-loom'],['sunheart-engine']);
 // A duplicate and an out-of-capacity stale entry cannot apply effects twice.
 r.artifacts=Array(capacity+1).fill('sunheart-engine');assert.equal(M.getRunModifiers(r).cacheFuelBonus,8);
 const storage={data:'',setItem(k,v){this.data=v},getItem(){return this.data}};M.saveState(s,storage);const loaded=M.loadState(storage);assert.equal(loaded.run.artifacts.length,capacity);assert.equal(loaded.run.artifacts.filter(Boolean).length,1);
}
console.log('Artifact capacity at all six Ascensions, paid sockets, TEST isolation, duplicate prevention and save cleanup passed.');
