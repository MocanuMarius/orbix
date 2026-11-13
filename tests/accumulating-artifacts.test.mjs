import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,getChoices,selectNode,beginFlightAttempt,finishFlight,chooseFlightReward,acknowledgeVictory,advanceMap,resolveSupport,settleCheckpoint,ARTIFACTS,SKILLS,saveState,loadState,sellArtifact,getRunModifiers} from '../dist/model.mjs';
const state=seed=>{const s=newState();s.run=createRun(s.profile,seed);return s;};
function clear(s,n){assert.ok(selectNode(s.run,n.id));assert.ok(beginFlightAttempt(s.run));assert.ok(finishFlight(s.run,{success:true,flame:70,collected:12}));settleCheckpoint(s);}
test('ordinary clear pays currency without an artifact or slot purchase',()=>{
 const s=state('plain');clear(s,getChoices(s.run)[0]);assert.deepEqual(s.run.flightReward.offers,[]);assert.equal(s.run.lastFlight.completionBonus,20);assert.ok(acknowledgeVictory(s));assert.equal(Object.keys(SKILLS).some(x=>x.includes('artifact-slot')),false);
});
test('elite rewards accumulate beyond three and melting is a Rest-only permanent sacrifice',()=>{
 const s=state('elite');const n=getChoices(s.run)[0];n.elite=true;s.run.artifacts=['reed-charm','moon-glass','stone-anchor','silk-sail'];s.run.seenArtifacts=[...s.run.artifacts];clear(s,n);
 const [a,b]=s.run.flightReward.offers;assert.ok(a&&b);assert.ok(chooseFlightReward(s,a));assert.equal(s.run.artifacts.length,5);assert.ok(s.run.seenArtifacts.includes(b));assert.equal(chooseFlightReward(s,b),false);assert.equal(sellArtifact(s,a),false);s.run.restReady=true;assert.ok(sellArtifact(s,a));assert.ok(s.run.seenArtifacts.includes(a));
});
test('120 seeded campaigns have two fresh useful offers, three guardians and a final future-pool unlock',()=>{
 for(let seed=0;seed<120;seed++){
  const s=state('campaign-'+seed),r=s.run;r.companions=[['collector','protector','swift','leveler'][seed%4]];r.companionRole=r.companions[0];const seen=new Set(),guardians=[];let safety=0;
  while(r.phase!=='ended'&&safety++<30){
   const next=getChoices(r).sort((a,b)=>Number(b.elite)-Number(a.elite))[0];assert.ok(next,`${seed}: missing destination`);
   if(next.type==='support'){assert.ok(selectNode(r,next.id));assert.ok([0,1,2].some(i=>resolveSupport(r,i,s.profile)),`${seed}: ${next.id} support`);continue;}
   if(next.boss)guardians.push(next.bossId);clear(s,next);const reward=r.flightReward;
   if(next.boss||next.elite){assert.equal(reward.offers.length,2,`${seed}: ${next.id}`);for(const id of reward.offers){assert.ok(!seen.has(id));seen.add(id);}assert.ok(chooseFlightReward(s,reward.offers[0]));}
   else assert.equal(reward.offers.length,0);
   assert.ok(acknowledgeVictory(s));if(r.phase==='map-clear')assert.ok(advanceMap(r));
  }
  assert.equal(r.phase,'ended');assert.equal(new Set(guardians).size,3);assert.equal(s.profile.ownedArtifacts.length,1);assert.ok(!r.artifacts.includes(s.profile.ownedArtifacts[0]));assert.ok(createRun(s.profile,'fresh').artifacts.length===0);
 }
});
test('offer history survives reload; incompatible active runs retire but profile survives',()=>{
 const s=state('save'),n=getChoices(s.run)[0];n.elite=true;clear(s,n);let data;const store={setItem:(_,v)=>data=v,getItem:()=>data};assert.ok(saveState(s,store));let read=loadState(store);assert.deepEqual(read.run.flightReward.offers,s.run.flightReward.offers);assert.deepEqual(read.run.seenArtifacts,s.run.seenArtifacts);
 const old=JSON.parse(data);delete old.run.artifactSystem;old.profile.difficulty=3;data=JSON.stringify(old);read=loadState(store);assert.equal(read.run,null);assert.equal(read.profile.difficulty,3);assert.ok(read.updateNotice);
});
test('all accumulated modifiers remain finite and bounded; biome affinity has a real effect',()=>{
 const r=state('caps').run;r.artifacts=Object.keys(ARTIFACTS);const m=getRunModifiers(r);for(const [k,v]of Object.entries(m))if(typeof v==='number')assert.ok(Number.isFinite(v),k);assert.ok(m.flap<=1.2&&m.windSensitivity>=.55&&m.darkResistance<=.6);
 r.artifacts=['path-prism'];r.current={biomeId:'crystal'};assert.equal(getRunModifiers(r).lightRadius,169);r.current={biomeId:'marsh'};assert.equal(getRunModifiers(r).lightRadius,157);
});
