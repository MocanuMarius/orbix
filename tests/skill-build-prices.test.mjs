import assert from 'node:assert/strict';
import test from 'node:test';
import * as M from '../dist/model.mjs';
import {CONDENSED_TUNING} from '../dist/condensed-glow.mjs';

test('prerequisite investment reduces only its own descendant premium',()=>{
 const wallet={skills:{'main-speed':1,'main-drift-sense':1,'main-drift-sense-2':1,'main-sight':1},startingSkill:'main-dream'};
 const previousPrice=id=>Math.ceil(M.SKILLS[id].cost*(1+CONDENSED_TUNING.trainingGrowth*M.getTrainingRankCount(wallet)**CONDENSED_TUNING.trainingExponent)/5)*5;
 assert.ok(M.getSkillPrice(wallet,'main-drift-sense-3')<previousPrice('main-drift-sense-3'));
 assert.ok(M.getSkillPrice(wallet,'main-drift-sense-3')>=M.SKILLS['main-drift-sense-3'].cost);
 assert.equal(M.getSkillPrice(wallet,'collector-attunement'),previousPrice('collector-attunement'));
 assert.equal(M.getTrainingRankCount({skills:{'main-dream':1},startingSkill:'main-dream'}),0);
});
test('pricing a path still requires every prerequisite and the currency actually quoted',()=>{
 const s=M.newState();s.run=M.createRun(s.profile,'focused-economy');s.run.condensedGlow=500;
 assert.ok(M.chooseStartingSkill(s,'main-dream'));
 assert.equal(M.buyCheckpointSkill(s,'main-glide-regen-2'),false);
 for(const id of ['main-efficiency','main-sight','main-glide-regen','main-glide-regen-2']){
  const quote=M.getSkillPrice(M.getSkillWallet(s),id),before=s.run.condensedGlow;
  assert.ok(M.buyCheckpointSkill(s,id));assert.equal(s.run.condensedGlow,before-quote);assert.equal(s.run.skillPaid[id],quote);
 }
});
