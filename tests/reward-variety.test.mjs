import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {STARTING_GIFTS} from '../dist/starting-gifts.mjs';
import {CHEST_REWARDS,chestRewardPair} from '../dist/chest-rewards.mjs';
import {getFlightClearReward} from '../dist/checkpoint-rewards.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';

const game=seed=>{const s=M.newState();s.run=M.createRun(s.profile,seed);return s;};
// Retired (artifacts removed, docs/inscriptions.md): starting-gift and chest relics are artifacts, no longer awarded.
test.skip('20 starting gifts offer exactly two stable choices, and every gift can be received once',()=>{
 assert.equal(STARTING_GIFTS.length,20);assert.equal(new Set(STARTING_GIFTS.map(g=>g.id)).size,20);
 const seen=new Set();
 for(let i=0;i<250;i++){
  const s=game('gift-variety-'+i),r=s.run,offers=M.getStartingGiftOffers(r),wallet=r.condensedGlow;
  assert.equal(offers.length,2);assert.notEqual(offers[0].id,offers[1].id);
  const ids=offers.map(g=>g.id);r.difficulty=5;
  assert.deepEqual(M.getStartingGiftOffers(r).map(g=>g.id),ids);
  assert.equal(M.chooseStartingGift(s,STARTING_GIFTS.find(g=>!ids.includes(g.id)).id),false);
  for(const offer of offers)seen.add(offer.id);
  const gift=offers[i%2];assert.ok(M.chooseStartingGift(s,gift.id));
  assert.equal(r.condensedGlow,wallet);assert.equal(r.startingGiftId,gift.id);
  if(gift.skillId){assert.equal(r.skills[gift.skillId],1);assert.equal(r.skillPaid[gift.skillId],0);}
  for(const id of gift.artifactIds)assert.ok(r.artifacts.includes(id));
  assert.equal(r.flame,getGlowCapacity(r));
  assert.ok(offers.every(g=>!M.chooseStartingGift(s,g.id)));
  let data;const storage={getItem:()=>data,setItem:(_,v)=>data=v};M.saveState(s,storage);
  const loaded=M.loadState(storage);assert.equal(loaded.run.startingGiftId,gift.id);
  assert.ok(offers.every(g=>!M.chooseStartingGift(loaded,g.id)));
 }
 assert.equal(seen.size,20);
});

// Retired (artifacts removed, docs/inscriptions.md): starting-gift and chest relics are artifacts, no longer awarded.
test.skip('chest catalogue has 30 working finds and cycles unseen offers before repeating',()=>{
 assert.equal(CHEST_REWARDS.length,30);assert.equal(new Set(CHEST_REWARDS.map(g=>g.id)).size,30);
 for(const reward of CHEST_REWARDS){
  if(reward.skillId)assert.ok(M.SKILLS[reward.skillId],reward.id);
  for(const id of reward.artifactIds)assert.ok(M.ARTIFACTS[id],reward.id);
 }
 const r={skills:{},artifacts:[],lives:1,chestRewardHistory:[]};
 const conditions={validSkill:()=>true,validArtifact:()=>true,maxLives:3,growthAvailable:true};
 for(let i=0;i<15;i++){
  const offers=chestRewardPair(r,'catalogue:'+i,conditions);assert.equal(offers.length,2);
  for(const offer of offers){assert.ok(!r.chestRewardHistory.includes(offer.effect.chestRewardId));r.chestRewardHistory.push(offer.effect.chestRewardId);}
 }
 assert.equal(new Set(r.chestRewardHistory).size,30);
});

// Retired (artifacts removed, docs/inscriptions.md): starting-gift and chest relics are artifacts, no longer awarded.
test.skip('each chest effect resolves through real support flow and persists in the run',()=>{
 const applied=new Set();
 for(let i=0;i<300&&applied.size<30;i++){
  for(const pick of [0,1]){
   const s=game('chest-variety-'+i),r=s.run;r.lives=2;
   const flight={...r.map[0][0],row:1,nextIds:[]};
   const chest={id:'test-chest',treasureKind:'vessel',type:'support',kind:'treasure',row:0,nextIds:[flight.id]};
   r.map=[[chest],[flight]];
   const preview=M.getTreasureChoices(r,chest);assert.equal(preview.length,2);
   const offer=preview[pick],effect=offer.effect,capacity=getGlowCapacity(r),currency=r.condensedGlow;
   assert.ok(M.selectNode(r,chest.id));assert.deepEqual(M.getSupportChoices(r),preview);
   assert.ok(M.resolveSupport(r,pick));M.settleCheckpoint(s);
   assert.equal(M.resolveSupport(r,pick),false);
   if(effect.chestSkill)assert.equal(r.skills[effect.chestSkill],1);
   for(const id of effect.chestArtifacts)assert.ok(r.artifacts.includes(id));
   if(effect.lives)assert.equal(r.lives,3);
   if(effect.packedReward)assert.equal(r.condensedGlow,currency+effect.packedReward);
   if(effect.treasureGift)assert.ok(getGlowCapacity(r)>capacity);
   assert.ok(r.flame<=getGlowCapacity(r));
   assert.ok(preview.every(o=>r.chestRewardHistory.includes(o.effect.chestRewardId)));
   applied.add(effect.chestRewardId);
  }
 }
 assert.equal(applied.size,30);
});

test('chests exclude owned finds, full hearts, capped growth and incompatible relics',()=>{
 const s=game('chest-exclusions'),r=s.run;
 r.skills=Object.fromEntries(CHEST_REWARDS.filter(g=>g.skillId).map(g=>[g.skillId,1]));
 r.artifacts=Object.keys(M.ARTIFACTS);r.treasureGifts={vessel:2};r.lives=3;
 const offers=M.getTreasureChoices(r,r.map.flat().find(n=>n.kind==='treasure'));
 assert.equal(offers.length,1);assert.equal(offers[0].effect.chestRewardId,'purse');
});

test('clear income varies by length and danger; Trail Dividend adds ten without paying supports or the finale',()=>{
 for(const [lengthBand,base]of [['short',15],['standard',20],['endurance',25]]){
  const node={type:'flight',lengthBand};
  assert.equal(getFlightClearReward(node),base);
  assert.equal(getFlightClearReward({...node,elite:true}),base+5);
  assert.equal(getFlightClearReward(node,{skills:{'main-clear-dividend':1}}),base+10);
 }
 assert.equal(getFlightClearReward({type:'support'}),0);
 assert.equal(getFlightClearReward({type:'finale',boss:true,mapIndex:2},{skills:{'main-clear-dividend':1}}),0);
 assert.ok(M.SKILLS['main-clear-dividend']);
});
