import test from 'node:test';
import assert from 'node:assert/strict';
import {humanProfile,planHumanLift,queueHumanLift} from '../scripts/human-flight-planner.mjs';
process.argv.push('--importOnly');
const {simulate,buildCase}=await import('../scripts/balance-current-flight.mjs');

test('planned touches retain response latency and cannot stack while one touch is pending',()=>{
 for(const style of ['human150','human250','human350']){
  const human=humanProfile(style),memory={human,lastLift:-2,pending:null,inputSamples:0,random:()=>.5};
  const view={player:{x:190,y:310,vy:100,radius:14},speed:154,height:430,terrainStep:12,terrain:[],hazards:[],
   liftImpulse:142,gravity:208,terminalFall:170};
  const plan=planHumanLift(view,null,memory);
  assert.ok(!plan.flap||plan.delay>=human.reaction);
  queueHumanLift(memory,10,{delay:human.reaction});
  assert.equal(memory.pending,10+human.reaction);
  queueHumanLift(memory,10.01,{delay:human.reaction});
  assert.equal(memory.pending,10+human.reaction);assert.equal(memory.inputSamples,1);
 }
});

test('Dream balance scenarios record and replay production inputs and pay only waking Lift costs',()=>{
 const c=buildCase({terrain:'ruins',difficulty:1,stage:0,role:'collector',style:'human250',skills:{'main-dream':1}});
 const r=simulate(c);
 assert.ok(r.rehearsals.length>=1&&r.rehearsals.length<=8);
 assert.ok(r.rehearsals.at(-1).valid);assert.equal(r.rehearsals.at(-1).seconds,8);
 assert.ok(r.flaps>0);assert.ok(r.effortSpent<r.flaps*r.flapCost);
 assert.ok(r.result);assert.equal(r.result.nightmareUsed,false);
 assert.equal(c.skills['main-dream'],1);
});


test('an optional glide cannot steal the starter fuel lane in Drifting Icebergs',async()=>{
 const M=await import('../dist/model.mjs');
 const state=M.newState();state.profile.difficulty=6;state.run=M.createRun(state.profile,'condensed-0-2',2);
 assert.ok(M.chooseStartingGift(state,'gift-cache-harvest'));
 const r=state.run,n=M.getChoices(r).find(n=>n.levelId==='frost-iceberg-field');assert.ok(n);
 assert.ok(M.selectNode(r,n.id));assert.ok(M.beginFlightAttempt(r));
 const c={run:structuredClone(r),controllerSeed:0,skills:r.skills,fleet:r.companions,terrain:n.terrain,difficulty:2,stage:n.row,role:'collector',style:'human250',seed:`${r.seed}-${n.id}`,duration:n.duration,profile:'refuge',node:n};
 const result=simulate(c);assert.equal(result.success,true);assert.ok(result.capturedFuelShare>=.6);
 assert.equal(r.lives,3);assert.equal(r.stats.flights,0,'a simulation cannot settle the source run');
 assert.ok(M.finishFlight(r,result.result));assert.equal(r.stats.flights,1);assert.equal(r.lives,3);
});

test('half-full early checkpoints retain an attainable fuel approach without raising the full-vessel budget',()=>{
 const c=buildCase({terrain:'ruins',difficulty:2,stage:1,role:'collector',style:'human250'});
 Object.assign(c,{seed:'condensed-0-2|tier:2|map:0-m0-1-0',duration:69,controllerSeed:0});
 Object.assign(c.node,{levelId:'cemetery-sepulchre-stair',biomeId:'cemetery',passage:'cavern',fuelCadence:3,
  encounterFamily:'draft-staircase',bonusId:'wild-circuit',duration:69});
 c.run={skills:{'proximity-awakening':1},companions:['collector'],flame:50,condensedRemainder:.5};
 c.skills=c.run.skills;
 const r=simulate(c);
 assert.equal(r.success,true);assert.ok(r.capturedFuelShare>=.6);
 assert.equal(r.sparkSupply.referenceReserve,30);
 assert.equal(r.sparkSupply.budgetExcess,0);assert.ok(r.sparkSupply.relocations>0);
});
