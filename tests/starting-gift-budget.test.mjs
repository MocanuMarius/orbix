import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {STARTING_GIFTS,STARTING_SKILL_COST_LIMIT} from '../dist/starting-gifts.mjs';

const fresh=()=>{const s=M.newState();s.run=M.createRun(s.profile,'small-opening');return s;};

test('opening keeps twenty gifts with only affordable independent skill roots and single relics',()=>{
 const s=fresh(),skills=STARTING_GIFTS.filter(g=>g.skillId);
 assert.equal(STARTING_GIFTS.length,20);assert.equal(skills.length,5);
 for(const gift of skills){
  assert.ok(M.SKILLS[gift.skillId].cost<=STARTING_SKILL_COST_LIMIT,gift.id);
  assert.deepEqual([M.SKILLS[gift.skillId].requires].flat().filter(Boolean),[],gift.id);
  assert.ok(M.isStartingGiftEligible(s.run,gift));
 }
 for(const gift of STARTING_GIFTS.filter(g=>!g.skillId))assert.equal(gift.artifactIds.length,1,gift.id);
 assert.ok(!STARTING_GIFTS.some(g=>g.artifactIds.includes('quiet-cinder')||g.artifactIds.includes('echo-vessel')));
});

test('runtime guard rejects expensive skills and prerequisite shortcuts even if added to content',()=>{
 const s=fresh();
 for(const id of ['main-dream','main-glide-regen','main-reservoir','main-resonant-bounty','main-dream-deep']){
  assert.equal(M.isStartingGiftEligible(s.run,{skillId:id,artifactIds:[]}),false,id);
  assert.equal(M.chooseStartingGift(s,id),false,id);
 }
 assert.equal(M.isStartingGiftEligible(s.run,{skillId:'collector-fetch-large',artifactIds:[]}),false);
 s.run.skills['collector-attunement']=1;
 assert.equal(M.isStartingGiftEligible(s.run,{skillId:'collector-fetch-large',artifactIds:[]}),true);
 s.run.skills['main-resonant-harvest']=1;s.run.skills['main-resonant-purification']=1;
 assert.equal(M.isStartingGiftEligible(s.run,{skillId:'main-resonant-bounty',artifactIds:[]}),false,'price ceiling still applies after prerequisites');
});
