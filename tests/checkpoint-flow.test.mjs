import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {FLIGHT_CLEAR_REWARD,getFlightClearReward} from '../dist/checkpoint-rewards.mjs';
import {getGlowCapacity,getLifeCapacity,getRestGlowBonus} from '../dist/vitality.mjs';
import {restBenefitsMarkup} from '../dist/rest-choice-view.mjs';
import {flightRewardMarkup} from '../dist/reward-screen.mjs';

const fixture=seed=>{const state=M.newState();state.run=M.createRun(state.profile,seed);return state;};
const reload=state=>{let data;const store={getItem:()=>data,setItem:(_,value)=>{data=value;}};assert.ok(M.saveState(state,store));return M.loadState(store);};
const start=state=>{assert.ok(M.selectNode(state.run,M.getChoices(state.run)[0].id));assert.ok(M.beginFlightAttempt(state.run));};
function enterRest(state){
 const r=state.run,node=r.map.flat().find(n=>n.kind==='camp');assert.ok(node);
 let child=node;const path=[];
 for(let row=node.row-1;row>=0;row--){const parent=r.map[row].find(n=>n.nextIds.includes(child.id));assert.ok(parent);path.unshift(parent.id);child=parent;}
 Object.assign(r,{path,step:node.row,phase:'map',current:null,victoryPending:false,flightReward:null});
 assert.ok(M.selectNode(r,node.id));return node;
}
const restFixture=seed=>{const state=fixture(seed);Object.assign(state.run,{flame:60,lives:1,skills:{'main-efficiency':1},startingSkill:'main-efficiency'});enterRest(state);return state;};
const claim=(s,id)=>{const index=M.getSupportChoices(s.run,s.profile).findIndex(c=>c.id===id);assert.ok(index>=0);return M.resolveSupport(s.run,index,s.profile);};

test('each clear secures a fixed reward plus overflow once, including after reload',()=>{
 for(const overflow of [0,17]){
  let s=fixture(`clear-${overflow}`);const initial=s.run.condensedGlow;start(s);
  s.run.skills['main-afterglow']=1;s.run.skills['afterglow-anchor']=2;
  assert.ok(M.finishFlight(s.run,{success:true,flame:60,condensedGlow:overflow,completionBonus:9999}));
  assert.equal(s.run.lastFlight.completionBonus,20);assert.equal(s.run.pendingCondensedGlow,20+overflow);
  assert.equal(M.finishFlight(s.run,{success:true,condensedGlow:9999}),false);
  s=reload(s);assert.equal(s.run.pendingCondensedGlow,0,'loading settles the completed checkpoint');
  assert.equal(M.settleCheckpoint(s),0);assert.equal(s.run.condensedGlow,initial+20+overflow);
  assert.equal(s.run.lastFlight.securedCondensedGlow,20+overflow);assert.equal(s.run.condensedEarned,20+overflow);
  assert.equal(M.settleCheckpoint(reload(s)),0);
  const html=flightRewardMarkup(s,{artifactArt:()=>'<svg></svg>'});
  assert.match(html,new RegExp(`${20+overflow} Packed Sparks earned: 20 for clearing, ${overflow} from overflow`));
 }
 assert.equal(FLIGHT_CLEAR_REWARD,20);assert.equal(getFlightClearReward({type:'flight',elite:true}),20);
 assert.equal(getFlightClearReward({type:'finale',boss:false}),20);
 assert.equal(getFlightClearReward({type:'finale',boss:true}),0);
});

test('failed attempts earn nothing; a successful retry earns one clear reward',()=>{
 const s=fixture('failed-clear'),initial=s.run.condensedGlow;start(s);
 assert.ok(M.finishFlight(s.run,{success:false,condensedGlow:400}));assert.equal(M.settleCheckpoint(s),0);
 assert.equal(s.run.condensedGlow,initial);assert.equal(s.run.lives,2);
 s.run.deathPending=false;start(s);assert.ok(M.finishFlight(s.run,{success:true,flame:40}));
 assert.equal(M.settleCheckpoint(s),20);assert.equal(s.run.condensedGlow,initial+20);
});

test('practice rewards stay in practice; final guardian awards the permanent relic instead',()=>{
 const practice=M.newState();M.startTutorial(practice);const profile=structuredClone(practice.profile),wallet=practice.run.practiceCondensedGlow;start(practice);
 assert.ok(M.finishFlight(practice.run,{success:true,flame:70,condensedGlow:7}));
 assert.equal(practice.run.practiceCondensedGlow,wallet+27);assert.equal(practice.run.condensedGlow,0);
 assert.equal(M.settleCheckpoint(practice),0);assert.deepEqual(practice.profile,profile);
 const boss=fixture('last-guardian');start(boss);Object.assign(boss.run.current,{type:'finale',boss:true});
 assert.ok(M.finishFlight(boss.run,{success:true,flame:60}));assert.equal(M.settleCheckpoint(boss),0);
 assert.equal(boss.run.lastFlight.completionBonus,0);assert.equal(boss.run.flightReward.permanent,true);
 assert.equal(M.getFlightRewardMeltValue(boss.run.flightReward),0);
});

test('Rest always offers Recover or Grow; both fill fuel but only Recover restores hearts',()=>{
 for(const id of ['rest-recover','rest-grow']){
  const s=restFixture(id),r=s.run,wallet=r.condensedGlow;
  r.skills['main-spare-spark']=1;r.maxLives=4;r.artifacts=['glow-wick'];r.artifactCharges={'glow-wick':1};
  const choices=M.getSupportChoices(r,s.profile);
  assert.deepEqual(choices.map(c=>c.id),['rest-recover','rest-grow']);
  assert.match(choices[1].description,/Gain 3 maximum Sparks/);
  assert.ok(claim(s,id));assert.equal(r.flame,getGlowCapacity(r));
  assert.equal(r.lives,id==='rest-recover'?4:1);assert.equal(getGlowCapacity(r),id==='rest-grow'?110:100);
  assert.equal(r.condensedGlow,wallet);assert.equal(r.pendingCondensedGlow,0);assert.equal(r.condensedEarned,0);
  assert.equal(r.artifactCharges['glow-wick'],1,'charges are preserved, not converted into passives');
  assert.equal(r.restReady,true);assert.equal(r.lifeRestClaimed,id==='rest-recover');
 }
});

test('Rest growth persists across retry/reload, caps at three, and cannot be farmed',()=>{
 let s=restFixture('persistent-rest');const node=s.run.current;
 assert.ok(claim(s,'rest-grow'));assert.equal(M.resolveSupport(s.run,1,s.profile),false);
 s.run.phase='support';s.run.current=node;assert.equal(claim(s,'rest-grow'),false);
 s=reload(s);assert.equal(getRestGlowBonus(s.run),10);assert.equal(s.run.flame,110);
 s.run.phase='map';s.run.current=null;start(s);s=reload(s);
 assert.equal(s.run.flame,110);assert.ok(M.beginFlightAttempt(s.run));
 assert.ok(M.finishFlight(s.run,{success:false,flame:0}));assert.equal(s.run.flame,110);assert.equal(getRestGlowBonus(s.run),10);
 const capped=restFixture('capped-rest');
 for(let i=0;i<3;i++){
  if(i){capped.run.phase='map-clear';assert.ok(M.advanceMap(capped.run));enterRest(capped);}
  assert.ok(claim(capped,'rest-grow'));assert.equal(getRestGlowBonus(capped.run),(i+1)*10);
 }
 const r=capped.run;Object.assign(r,{phase:'support',current:{...r.map.flat().find(n=>n.kind==='camp'),id:'extra-rest'},lives:getLifeCapacity(r)});
 const choices=M.getSupportChoices(r,capped.profile);assert.equal(choices.length,2);assert.equal(choices[1].disabled,true);
 assert.equal(claim(capped,'rest-grow'),false);assert.equal(r.flame,130);assert.ok(claim(capped,'rest-recover'));
 assert.equal(r.restReady,true,'a full, capped run can still prepare and leave Rest');
});

test('capacity skills bought during either Rest preparation fill the new capacity',()=>{
 for(const id of ['rest-recover','rest-grow']){
  const s=restFixture(`upgrade-${id}`);s.run.condensedGlow=1000;
  assert.ok(claim(s,id));assert.ok(M.buyCheckpointSkill(s,'main-reservoir'));
  assert.equal(s.run.flame,getGlowCapacity(s.run));
  assert.ok(M.buyCheckpointSkill(s,'main-spare-spark'));
  assert.equal(s.run.lives,id==='rest-recover'?4:1);
 }
});

test('Rest markup states both refills and shows disabled capacity without a third benefit',()=>{
 const s=restFixture('rest-markup');s.run.skills['main-spare-spark']=1;s.run.maxLives=4;
 let html=restBenefitsMarkup(s.run,s.run.current,M.getSupportChoices(s.run,s.profile));
 assert.equal((html.match(/data-action="support"/g)||[]).length,2);assert.match(html,/Both refill Sparks/);
 assert.match(html,/Refills to 30 of 30 Sparks/);assert.match(html,/Refills to 33 of 33 Sparks/);
 assert.doesNotMatch(html,/Condense|Recharge|Rekindle/);
 s.run.restGlowCapacity=30;html=restBenefitsMarkup(s.run,s.run.current,M.getSupportChoices(s.run,s.profile));
 assert.match(html,/disabled aria-label="Grow/);assert.match(html,/CAPACITY FULL/);
});
