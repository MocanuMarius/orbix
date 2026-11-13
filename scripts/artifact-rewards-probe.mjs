import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {CONSUMABLE_ARTIFACTS,EVOLVING_ARTIFACTS,getArtifactInfo,getArtifactStackPreview} from '../dist/artifact-info.mjs';
import {artifactSummaryMarkup,artifactOfferMarkup,artifactDetailMarkup} from '../dist/replay-ui.mjs';

const fresh=seed=>{const s=M.newState();s.run=M.createRun(s.profile,seed);return s;};
const enter=s=>{const n=M.getChoices(s.run).find(n=>n.type==='flight'&&!n.elite);assert.ok(n);assert.ok(M.selectNode(s.run,n.id));assert.ok(M.beginFlightAttempt(s.run));};
const storage={data:'',setItem(k,v){this.data=v;},getItem(){return this.data;}};
const focused=process.argv.includes('--focused');
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

const stacked=fresh('stacked-copies');M.setTestOverride(stacked,true);
for(const [i,id]of ['glow-wick','flash-stone','quiet-cinder'].entries())assert.ok(M.equipArtifact(stacked,id,i));
const earn=(state,id)=>{state.run.flightReward={offers:[id],claimed:false};return M.chooseFlightReward(state,id);};
stacked.run.artifactCharges['glow-wick']=2;const originalSlots=[...stacked.run.artifacts];
assert.deepEqual(getArtifactStackPreview(stacked.run,'glow-wick'),{slot:0,before:2,after:5,added:3,wasted:0,perCopy:3,max:9});
assert.ok(earn(stacked,'glow-wick'));assert.equal(stacked.run.artifactCharges['glow-wick'],5);
assert.deepEqual(stacked.run.artifacts,originalSlots,'A duplicate adds uses in its own slot even when all slots are full');
assert.equal(M.getRunModifiers(stacked.run).artifactIds.filter(id=>id==='glow-wick').length,1);
assert.equal(M.getRunModifiers(stacked.run).artifactCharges['glow-wick'],5);
assert.ok(M.equipArtifact(stacked,'glow-wick',2));assert.equal(stacked.run.artifactCharges['glow-wick'],5);
M.saveState(stacked,storage);const loadedStack=M.loadState(storage);
assert.equal(loadedStack.run.artifactCharges['glow-wick'],5,'Save/load does not clamp a stack to one base copy');
enter(loadedStack);M.finishFlight(loadedStack.run,{success:false,artifactCharges:{'glow-wick':1,'flash-stone':0}});
assert.equal(loadedStack.run.artifactCharges['glow-wick'],5,'Retry restores the entry stack, without granting a copy');
enter(loadedStack);M.finishFlight(loadedStack.run,{success:true,flame:60,artifactCharges:{'glow-wick':4,'flash-stone':1}});
assert.equal(loadedStack.run.artifactCharges['glow-wick'],4,'A completed flight keeps actual remaining stack uses');
assert.ok(earn(loadedStack,'glow-wick'));assert.equal(loadedStack.run.artifactCharges['glow-wick'],7);
assert.ok(earn(loadedStack,'glow-wick'));assert.equal(loadedStack.run.artifactCharges['glow-wick'],9);
assert.equal(loadedStack.run.flightReward.stack.wasted,1,'Cap preview reports exactly how many newly earned uses do not fit');
assert.equal(earn(loadedStack,'glow-wick'),false,'A full stack rejects duplicate claims');
loadedStack.run.artifactCharges['flash-stone']=5;assert.ok(earn(loadedStack,'flash-stone'));
assert.equal(loadedStack.run.artifactCharges['flash-stone'],6);assert.equal(loadedStack.run.flightReward.stack.wasted,1);
assert.equal(earn(loadedStack,'flash-stone'),false);

const spentTest=fresh('test-no-refill');M.setTestOverride(spentTest,true);M.equipArtifact(spentTest,'glow-wick');
spentTest.run.artifactCharges['glow-wick']=0;M.equipArtifact(spentTest,null);
assert.equal(M.equipArtifact(spentTest,'glow-wick'),false,'TEST mounting cannot replenish an exhausted artifact');
M.setTestOverride(spentTest,false);M.setTestOverride(spentTest,true);
assert.equal(M.equipArtifact(spentTest,'glow-wick'),false,'Toggling TEST cannot replenish an exhausted artifact');
assert.ok(earn(spentTest,'glow-wick'));assert.equal(spentTest.run.artifactCharges['glow-wick'],3,'A genuinely earned copy after depletion is valid');

const forged=fresh('forge-stack');assert.ok(earn(forged,'glow-wick'));assert.ok(earn(forged,'glow-wick'));assert.ok(earn(forged,'glow-wick'));
assert.equal(forged.run.artifactCharges['glow-wick'],9);forged.run.restReady=true;
const wallet=forged.run.condensedGlow,payout=M.getArtifactSalvageValue('glow-wick');
assert.ok(M.sellArtifact(forged,'glow-wick'));assert.equal(forged.run.condensedGlow,wallet+payout,'Nine uses still forge for one fixed payout');
assert.equal(forged.run.artifacts.includes('glow-wick'),false);assert.equal(forged.run.artifactCharges['glow-wick'],undefined);
assert.equal(M.sellArtifact(forged,'glow-wick'),false);assert.equal(forged.run.condensedGlow,wallet+payout);

const found=new Set();
for(let i=0;i<48;i++)for(const atCap of [false,true]){
 const t=fresh('stack-offers-'+i);t.run.stats.flights=1;t.run.artifacts=['glow-wick','flash-stone'];
 t.run.artifactCharges={'glow-wick':atCap?9:1,'flash-stone':atCap?6:1};
 enter(t);M.finishFlight(t.run,{success:true,flame:60});
 for(const id of t.run.flightReward.offers){if(atCap)assert.ok(!Object.hasOwn(CONSUMABLE_ARTIFACTS,id),'Full stacks never appear in reward offers');else if(Object.hasOwn(CONSUMABLE_ARTIFACTS,id))found.add(id);}
}
assert.deepEqual([...found].sort(),['flash-stone','glow-wick'],'Both partly used mounted commons can be offered again');

const seedRun=fresh('defining-seed');enter(seedRun);M.finishFlight(seedRun.run,{success:true,flame:60});
assert.ok(seedRun.run.flightReward.offers.includes('wayward-seed'),'First flight offers a defining artifact');
assert.equal(seedRun.run.flightReward.offers.length,2);assert.ok(M.chooseFlightReward(seedRun,'wayward-seed'));assert.ok(M.acknowledgeVictory(seedRun));
seedRun.run.current=seedRun.run.map.at(-1)[0];seedRun.run.step=seedRun.run.map.length-1;seedRun.run.phase='briefing';
assert.ok(M.beginFlightAttempt(seedRun.run));assert.ok(M.finishFlight(seedRun.run,{success:true,flame:60}));
assert.equal(seedRun.run.flightReward.evolution,true);assert.deepEqual(seedRun.run.flightReward.offers,['hearth-bloom','lantern-bloom']);
const normalReward=structuredClone(seedRun.run.flightReward.followup);assert.equal(normalReward.offers.length,2);
M.saveState(seedRun,storage);const beforeEvolution=storage.data;
for(const form of ['hearth-bloom','lantern-bloom']){
 storage.data=beforeEvolution;const e=M.loadState(storage);
 assert.ok(M.chooseFlightReward(e,form));assert.equal(M.chooseFlightReward(e,form),false,'Evolution is a single claim');
 assert.equal(e.run.artifacts[0],form);assert.equal(e.run.artifacts.filter(id=>EVOLVING_ARTIFACTS.includes(id)).length,1);
 M.saveState(e,storage);const loaded=M.loadState(storage);
 assert.equal(loaded.run.seedEvolution.id,form);assert.equal(loaded.run.flightReward.claimed,true,'Reload does not reset the evolution choice');
 assert.ok(M.acknowledgeVictory(loaded));assert.deepEqual(loaded.run.flightReward,normalReward,'Evolution preserves the entire ordinary Map 1 reward');
 assert.equal(M.acknowledgeVictory(loaded),false,'Normal reward still must be chosen');assert.equal(M.advanceMap(loaded.run),false);
 assert.ok(M.chooseFlightReward(loaded,normalReward.offers[0]));assert.ok(M.acknowledgeVictory(loaded));assert.ok(M.advanceMap(loaded.run));
 enter(loaded);M.finishFlight(loaded.run,{success:false});assert.ok(loaded.run.artifacts.includes(form),'Retry preserves the chosen evolution');
 enter(loaded);M.finishFlight(loaded.run,{success:true,flame:60});
 assert.ok(loaded.run.flightReward.offers.every(id=>!EVOLVING_ARTIFACTS.includes(id)),'The seed family is not farmable through ordinary reward rolls');
}
const testFamily=fresh('test-seed-family');M.setTestOverride(testFamily,true);
assert.ok(M.equipArtifact(testFamily,'wayward-seed',0));assert.ok(M.equipArtifact(testFamily,'hearth-bloom',1));assert.ok(M.equipArtifact(testFamily,'lantern-bloom',2));
assert.deepEqual(testFamily.run.artifacts,[null,null,'lantern-bloom'],'Even TEST equips at most one seed form');
const stackHtml=artifactOfferMarkup(M.ARTIFACTS['glow-wick'],{artifacts:['glow-wick'],artifactCharges:{'glow-wick':8}});
assert.match(stackHtml,/8 → 9/);assert.match(stackHtml,/2 uses lost/);
assert.match(artifactSummaryMarkup(M.ARTIFACTS['wayward-seed'],seedRun.run),/MAP 1/);
assert.match(artifactDetailMarkup(M.ARTIFACTS['glow-wick'],{run:{artifacts:['glow-wick'],artifactCharges:{'glow-wick':9}}}),/Consumes all 9 uses/);

const report={};
for(const challengeComplete of focused?[]:[false,true]){
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
for(const type of focused?[]:['elite','finale','boss'])for(let i=0;i<40;i++){
 const t=fresh('reward-tier-'+i),r=t.run;enter(t);
 r.current.elite=type==='elite';r.current.type=type==='elite'?'flight':'finale';r.current.boss=type==='boss';
 M.finishFlight(r,{success:true,flame:60});
 const tiers=r.flightReward.offers.map(id=>M.ARTIFACTS[id].rarity);
 if(type==='elite')assert.ok(tiers.includes('rare'));
 else assert.ok(tiers.length===2&&tiers.every(tier=>tier===(type==='boss'?'boss':'rare')));
}
console.log('Artifact rewards/lifetimes: bounded stacks, exact cap waste, offer eligibility, fixed forge payout, TEST refill prevention, charge persistence and failure/reload rollback passed.');
console.log(JSON.stringify(report));
