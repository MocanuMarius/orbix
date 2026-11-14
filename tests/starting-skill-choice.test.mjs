import test from 'node:test';
import assert from 'node:assert/strict';
import {STARTING_SKILL_IDS, STARTING_GIFT_IDS, SKILLS, createRun, newState, chooseStartingSkill,
  canChooseStartingSkill, getRunModifiers, getSkillWallet, getTrainingRankCount,
  getSkillCost, getChoices, selectNode, saveState, loadState, getStartingArtifact,
  canChooseStartingGift, chooseStartingGift, chooseFlightReward, artifactFitsRun} from '../dist/model.mjs';
import {skillTreeState} from '../dist/skill-tree-state.mjs';

function newGame(testMode=false,seed='starting-gift') {
  const state=newState();
  state.run=createRun(state.profile,seed);
  state.run.testMode=testMode;
  return state;
}

test('one free starting skill starts working immediately and survives saving',()=>{
  for(const testMode of [false,true])for(const id of STARTING_SKILL_IDS) {
    const state=newGame(testMode),run=state.run;
    const wallet=run.condensedGlow,baseline=getRunModifiers(run);
    assert.ok(canChooseStartingSkill(run,id));
    assert.ok(skillTreeState({run,wallet:getSkillWallet(state),canBuy:false},SKILLS[id]).free);
    assert.ok(chooseStartingSkill(state,id));
    assert.deepEqual(run.skills,{[id]:1});
    assert.equal(run.skillPaid[id],0);
    assert.equal(run.condensedGlow,wallet);
    assert.equal(getTrainingRankCount(getSkillWallet(state)),0);
    assert.ok(STARTING_SKILL_IDS.every(next=>!chooseStartingSkill(state,next)));
    const effect=getRunModifiers(run);
    assert.equal(effect.lightRadius,baseline.lightRadius);
    assert.equal(effect.liftCostPoints,baseline.liftCostPoints);
    assert.equal(effect.proximityUnlocked,id==='proximity-awakening');
    assert.equal(effect.proximityShield,false);
    assert.equal(effect.dreamDuration,id==='main-dream'?6:0);
    if(id==='main-dream')assert.ok(getSkillCost(getSkillWallet(state),'main-dream-long')>0);
    if(id==='proximity-awakening')assert.ok(getSkillCost(getSkillWallet(state),'main-edging-attunement')>0);
    let value;
    const storage={setItem:(_,v)=>value=v,getItem:()=>value};
    saveState(state,storage);
    const loaded=loadState(storage);
    assert.equal(loaded.run.startingSkill,id);
    assert.equal(chooseStartingSkill(loaded,'main-sight'),false);
  }
});

test('the gift closes at route selection, and an existing Momentum starter stays learned',()=>{
  const state=newGame(),run=state.run;
  assert.deepEqual(STARTING_GIFT_IDS,['proximity-awakening','main-dream','rare-artifact']);
  for(const invalid of [undefined,'main-dream-deep','main-speed','protector-mastery','main-sight','main-efficiency']){
    assert.equal(chooseStartingSkill(state,invalid),false);
  }
  assert.ok(selectNode(run,getChoices(run)[0].id));
  assert.equal(chooseStartingSkill(state,'main-dream'),false);
  const retry=newGame();
  retry.run.stats.attempts=1;
  assert.equal(chooseStartingSkill(retry,'main-dream'),false);
  const existing=newGame();
  existing.run.startingSkill='main-speed';existing.run.skills['main-speed']=1;
  assert.equal(chooseStartingSkill(existing,'proximity-awakening'),false);
  assert.equal(chooseStartingGift(existing,'rare-artifact'),false);
  assert.equal(existing.run.skills['main-speed'],1);
});

test('the named rare is stable across companion selection, can activate from the first flight, and uses the only gift',()=>{
  const seen=new Set();
  for(let i=0;i<50;i++){
    const state=newGame(i%2===0,String(i)),run=state.run;
    const offered=getStartingArtifact(run),before=run.condensedGlow;
    seen.add(offered.id);
    for(const role of ['protector','leveler','swift','collector']){
      run.companionRole=role;run.companions=[role];
      assert.equal(getStartingArtifact(run).id,offered.id);
    }
    assert.equal(offered.rarity,'rare');
    assert.ok(canChooseStartingGift(run,'rare-artifact'));
    assert.equal(canChooseStartingSkill(run,'rare-artifact'),false);
    assert.ok(chooseStartingGift(state,'rare-artifact'));
    assert.equal(run.startingArtifact,offered.id);
    assert.deepEqual(run.skills,{});
    assert.equal(run.condensedGlow,before);
    assert.deepEqual(run.artifacts,[offered.id]);
    assert.deepEqual(run.seenArtifacts,[offered.id]);
    const m=getRunModifiers(run);
    assert.ok(({'echo-bell':m.workFuel,'overflow-coil':m.overflowRecharge,'echo-vessel':m.condensationBonus})[offered.id]>0);
    assert.ok(STARTING_GIFT_IDS.every(other=>!chooseStartingGift(state,other)));
    run.flightReward={offers:['moon-glass'],claimed:false};
    assert.ok(chooseFlightReward(state,'moon-glass'));
    assert.deepEqual(run.artifacts,[offered.id,'moon-glass']);
    run.artifacts.shift();
    let value;
    const storage={setItem:(_,v)=>value=v,getItem:()=>value};
    saveState(state,storage);
    const saved=loadState(storage);
    assert.equal(saved.run.startingArtifact,offered.id);
    assert.equal(getStartingArtifact(saved.run).id,offered.id);
    assert.ok(STARTING_GIFT_IDS.every(other=>!chooseStartingGift(saved,other)));
  }
  assert.deepEqual([...seen].sort(),['echo-bell','echo-vessel','overflow-coil']);
});

test('Dream-focused rewards enter the pool only after learning Dream',()=>{
  const state=newGame(),run=state.run;
  const dreamRelics=['dreamcatcher','second-dawn','dream-sovereign'];
  assert.ok(dreamRelics.every(id=>!artifactFitsRun(run,id)));
  assert.ok(chooseStartingGift(state,'main-dream'));
  assert.ok(dreamRelics.every(id=>artifactFitsRun(run,id)));
});
