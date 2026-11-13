import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {getGlowCapacity,getRestGlowBonus,REST_GLOW_TUNING} from '../dist/vitality.mjs';

const store={value:null,getItem(){return this.value},setItem(key,value){this.value=value}};
const enterRest=state=>{
 const r=state.run,node=r.map.flat().find(n=>n.kind==='camp');assert.ok(node,'Every fixture map has a Rest');
 let child=node;const path=[];
 for(let row=node.row-1;row>=0;row--){const parent=r.map[row].find(n=>n.nextIds.includes(child.id));assert.ok(parent);path.unshift(parent.id);child=parent;}
 r.path=path;r.step=node.row;r.phase='map';r.current=null;r.victoryPending=false;r.flightReward=null;
 assert.ok(M.selectNode(r,node.id));return node;
};
const fixture=seed=>{const s=M.newState();s.run=M.createRun(s.profile,seed);s.run.skills={'main-efficiency':1};s.run.startingSkill='main-efficiency';s.run.flame=60;s.run.lives=1;enterRest(s);return s;};
const claim=(s,id)=>{const index=M.getSupportChoices(s.run,s.profile).findIndex(c=>c.id===id);assert.ok(index>=0,id+' offered');assert.ok(M.resolveSupport(s.run,index,s.profile));};
const reload=s=>{assert.ok(M.saveState(s,store));return M.loadState(store);};

let grown=fixture('rest-grown'),r=grown.run;const currency=r.condensedGlow,restNode=r.current;
const offer=M.getSupportChoices(r,grown.profile).find(c=>c.id==='rest-recover');
assert.equal(offer.effect.glowCapacity,10);assert.match(offer.description,/3 maximum Sparks/);
claim(grown,'rest-recover');assert.equal(r.restGlowCapacity,10);assert.equal(getGlowCapacity(r),110);
assert.equal(r.flame,110);assert.equal(r.lives,1);assert.equal(r.condensedGlow,currency);assert.equal(r.condensedEarned,0);
assert.equal(r.restReady,true);assert.equal(r.restVisits.length,1);assert.equal(M.resolveSupport(r,0,grown.profile),false,'A benefit resolves once');
const phase=r.phase,current=r.current;r.phase='support';r.current=restNode;
assert.equal(M.resolveSupport(r,0,grown.profile),false,'Reopening a completed Rest cannot farm growth');r.phase=phase;r.current=current;
grown=reload(grown);r=grown.run;assert.equal(r.restGlowCapacity,10);assert.equal(r.flame,110);

const next=M.getChoices(r)[0];assert.ok(next&&next.type!=='support');assert.ok(M.selectNode(r,next.id));assert.ok(M.beginFlightAttempt(r));
assert.equal(r.attemptEntry.restGlowCapacity,10);r.flame=1;
grown=reload(grown);r=grown.run;assert.equal(r.phase,'briefing');assert.equal(r.flame,110);assert.equal(getGlowCapacity(r),110);
assert.ok(M.beginFlightAttempt(r));assert.ok(M.finishFlight(r,{success:false,flame:0}));
assert.equal(r.restGlowCapacity,10);assert.equal(r.flame,110);assert.equal(r.condensedGlow,currency);assert.equal(r.restVisits.length,1);

const capped=fixture('rest-cap');
for(let i=0;i<3;i++){
 if(i){capped.run.phase='map-clear';assert.ok(M.advanceMap(capped.run));enterRest(capped);}
 claim(capped,'rest-recover');assert.equal(getRestGlowBonus(capped.run),(i+1)*10);
}
assert.equal(getGlowCapacity(capped.run),130);assert.equal(capped.run.flame,130);
// New distinct Rest identity is sufficient to inspect the already-capped rules.
const cappedRest=capped.run.map.flat().find(n=>n.kind==='camp');capped.run.phase='support';capped.run.current={...cappedRest,id:'cap-extra-rest'};
let choices=M.getSupportChoices(capped.run,capped.profile);
assert.ok(!choices.some(c=>c.id==='rest-recover'),'Full and fully grown has no wasteful refill');
assert.ok(choices.some(c=>c.id==='rest-condense'),'Capped Rest always remains actionable');
capped.run.flame=70;choices=M.getSupportChoices(capped.run,capped.profile);
assert.equal(choices.find(c=>c.id==='rest-recover').effect.glowCapacity,0);
claim(capped,'rest-recover');assert.equal(capped.run.flame,130);assert.equal(capped.run.restGlowCapacity,30);
capped.run.skills['main-reservoir']=1;capped.run.skills['main-vast-vessel']=1;
assert.equal(getGlowCapacity(capped.run),170);assert.equal(M.getRunModifiers(capped.run).maxGlow,170);

const cash=fixture('rest-condense');cash.run.condensedGlow=200;cash.run.condensedRemainder=.75;
cash.run.skills['main-afterglow']=1;cash.run.skills['afterglow-anchor']=2;
const originalGlow=cash.run.flame,originalHearts=cash.run.lives;
claim(cash,'rest-condense');assert.equal(cash.run.condensedGlow,225);assert.equal(cash.run.condensedEarned,25);
assert.equal(cash.run.securedCondensedGlow,25);assert.equal(cash.run.pendingCondensedGlow,0);
assert.equal(cash.run.flame,originalGlow);assert.equal(cash.run.lives,originalHearts);assert.equal(cash.run.condensedRemainder,.75);
assert.equal(M.settleCheckpoint(cash),0,'Direct currency is never queued again');
const paid=reload(cash);assert.equal(paid.run.condensedGlow,225);assert.equal(M.resolveSupport(paid.run,0,paid.profile),false);
assert.equal(paid.run.lastRest.boon,'condense');assert.equal(paid.run.lastCheckpointReward.amount,25);

const hearts=fixture('rest-hearts');hearts.run.skills['main-spare-spark']=1;hearts.run.maxLives=4;
claim(hearts,'rest-rekindle');assert.equal(hearts.run.lives,4);assert.equal(hearts.run.flame,60);assert.equal(getGlowCapacity(hearts.run),100);

const growThenUpgrade=fixture('rest-upgrade');growThenUpgrade.run.condensedGlow=1000;
claim(growThenUpgrade,'rest-recover');assert.ok(M.buyCheckpointSkill(growThenUpgrade,'main-reservoir'));
assert.equal(getGlowCapacity(growThenUpgrade.run),130);assert.equal(growThenUpgrade.run.flame,130,'Recover still fills capacity bought at this Rest');
const cashThenUpgrade=fixture('rest-upgrade-cash');cashThenUpgrade.run.condensedGlow=1000;
claim(cashThenUpgrade,'rest-condense');assert.ok(M.buyCheckpointSkill(cashThenUpgrade,'main-reservoir'));
assert.equal(getGlowCapacity(cashThenUpgrade.run),120);assert.equal(cashThenUpgrade.run.flame,60,'Condense never refills newly bought capacity');

for(const [raw,expected]of [[-10,0],[17,10],[999,30],['bad',0]]){
 const s=fixture('rest-clean-'+raw);s.run.restGlowCapacity=raw;s.run.flame=500;
 const loaded=reload(s);assert.equal(loaded.run.restGlowCapacity,expected);assert.equal(loaded.run.flame,100+expected);
}
const practice=fixture('practice-rest');practice.run.isTutorial=true;practice.run.practiceCondensedGlow=100;
const savedCurrency=practice.run.condensedGlow;claim(practice,'rest-condense');
assert.equal(practice.run.practiceCondensedGlow,125);assert.equal(practice.run.condensedGlow,savedCurrency);assert.equal(practice.run.securedCondensedGlow,0);

const opening=fixture('quote-opening'),mid=fixture('quote-mid');
mid.run.skills={'main-efficiency':1,'main-sight':1,'main-dream':1,'main-spare-spark':1};
const quotes=[opening,mid].map(s=>({rankCount:Object.keys(s.run.skills).length,
 reservoir:M.getSkillPrice(M.getSkillWallet(s),'main-reservoir'),restAward:REST_GLOW_TUNING.condenseReward}));
console.log(JSON.stringify({restGrowth:'3 Glow × 3 blessings',maxWithSkills:51,oneChoiceOnly:true,
 directCurrency:25,noOverflowMultiplier:true,persistRetry:true,capFallback:true,practiceIsolation:true,quotes}));

for(let map=0;map<3;map++){const s=fixture("stage-"+map);s.run.mapIndex=map;const before=s.run.condensedGlow;claim(s,"rest-condense");assert.equal(s.run.condensedGlow-before,25*(map+1));}

const recharge=fixture('rest-recharge');recharge.run.artifacts=['glow-wick','flash-stone'];recharge.run.artifactCharges={'glow-wick':5,'flash-stone':5};
const beforeRecharge={glow:recharge.run.flame,hearts:recharge.run.lives,wallet:recharge.run.condensedGlow};
claim(recharge,'rest-recharge');assert.deepEqual(recharge.run.artifactCharges,{'glow-wick':8,'flash-stone':6});
assert.deepEqual({glow:recharge.run.flame,hearts:recharge.run.lives,wallet:recharge.run.condensedGlow},beforeRecharge);
assert.equal(M.resolveSupport(recharge.run,0,recharge.profile),false);
const rechargeSaved=reload(recharge);assert.deepEqual(rechargeSaved.run.artifactCharges,{'glow-wick':8,'flash-stone':6});
const unmounted=fixture('rest-unmounted');unmounted.run.artifacts=['quiet-cinder'];unmounted.run.artifactCharges={'glow-wick':2};
assert.ok(!M.getSupportChoices(unmounted.run,unmounted.profile).some(x=>x.id==='rest-recharge'));
