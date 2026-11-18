import test from 'node:test';
import assert from 'node:assert/strict';
import {cueTiming,liftHeight,classifyLift,effectiveSkill,liftPenalty,pressTime,gaussian,playerProfile,PLAYER_PROFILES,LIFT_PHYSICS} from '../scripts/player-pilot.mjs';
import {humanProfile,planPlayerLift,queueHumanLift,applyRecall} from '../scripts/human-flight-planner.mjs';

test('the arrow cue is centred where fall speed equals the Lift launch speed and is 0.2 s wide',()=>{
 assert.ok(Math.abs(cueTiming({vy:205}).until)<1e-9);
 assert.equal(cueTiming({vy:205}).open,true);
 assert.equal(cueTiming({vy:-205}).until.toFixed(3),(410/300).toFixed(3)); // 1.367 s after a Lift
 assert.equal(cueTiming({vy:205-30.5}).open,false); // 0.1 s early is the window edge, a bit more is 'soon'
 assert.equal(cueTiming({vy:205-29}).open,true);
 assert.equal(cueTiming({vy:240}).late,true); // already past the window
 assert.equal(cueTiming({vy:-205}).visible,false);
});

test('a Lift gains most height per Lift at the apex and nothing net after 1.367 s; spam is worse per Spark',()=>{
 assert.ok(Math.abs(liftHeight(1.3667))<1);
 assert.ok(liftHeight(.68)>69&&liftHeight(.68)<=70.1);
 assert.ok(liftHeight(.1)/3<liftHeight(.68)/3/3);
 assert.ok(liftHeight(.1)<liftHeight(.3)&&liftHeight(.3)<liftHeight(.68));
});

test('classifyLift flags spam under 0.75 s and on-cue presses',()=>{
 assert.deepEqual(classifyLift({vy:205,since:1.37}),{onCue:true,spam75:false,spam50:false,falling:true});
 const spam=classifyLift({vy:-100,since:.3});
 assert.equal(spam.spam75,true);assert.equal(spam.spam50,true);assert.equal(spam.onCue,false);
 assert.equal(classifyLift({vy:-10,since:Infinity}).spam75,false);
});

test('skill profiles are ordered and share the old human limits',()=>{
 const {reaction:rb}=PLAYER_PROFILES['player-beginner'],{reaction:ra}=PLAYER_PROFILES['player-average'],{reaction:rg}=PLAYER_PROFILES['player-good'];
 assert.deepEqual([rb,ra,rg],[.35,.25,.15]);
 for(const [s,old] of [['player-beginner','human350'],['player-average','human250'],['player-good','human150']]){
  const p=humanProfile(s),o=humanProfile(old);
  assert.equal(p.player,true);assert.equal(p.reaction,o.reaction);assert.equal(p.horizon,o.horizon);assert.equal(p.jitter,o.jitter);
  assert.equal(o.player,undefined); // the old pilots are untouched
 }
 assert.ok(PLAYER_PROFILES['player-good'].cueSigma<PLAYER_PROFILES['player-average'].cueSigma);
 assert.ok(PLAYER_PROFILES['player-average'].cueSigma<PLAYER_PROFILES['player-beginner'].cueSigma);
 assert.ok(PLAYER_PROFILES['player-beginner'].waste>PLAYER_PROFILES['player-good'].waste);
 assert.equal(playerProfile('human150'),null);
});

test('retrying a stop shrinks errors, the last heart lowers risk tolerance, no arrow widens timing error',()=>{
 const p=PLAYER_PROFILES['player-average'];
 const base=effectiveSkill(p),retry=effectiveSkill(p,{retry:true}),heart=effectiveSkill(p,{lastHeart:true}),blind=effectiveSkill(p,{guide:false});
 assert.ok(retry.sigma<base.sigma&&retry.slip<base.slip&&retry.waste<base.waste);
 assert.ok(heart.riskTol<base.riskTol&&heart.greed<base.greed);
 assert.ok(blind.sigma>base.sigma);
});

test('a Lift away from the cue costs more and an empty Meter makes every Lift cost more',()=>{
 const at=(fuelFrac,pressAt)=>liftPenalty({fuelFrac,pressAt,cueAt:.8,sigma:.05});
 assert.ok(at(1,.8)<at(1,.3)&&at(1,.3)<=at(1,.1)+1e-9);
 assert.ok(at(.1,.8)>at(1,.8)*2);
});

test('pressTime respects the reaction floor and centres on the intended moment',()=>{
 let s=1;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647;};
 const ts=Array.from({length:4000},()=>pressTime({now:10,intended:10.5,reactionFloor:.1,sigma:.05,random:rnd,slip:0}));
 assert.ok(ts.every(t=>t>=10.1));
 const mean=ts.reduce((a,b)=>a+b,0)/ts.length;assert.ok(Math.abs(mean-10.5)<.01);
 const late=Array.from({length:4000},()=>pressTime({now:10,intended:10.5,reactionFloor:.1,sigma:.0,random:rnd,slip:.5}));
 assert.ok(late.some(t=>t>10.6)&&late.some(t=>Math.abs(t-10.5)<1e-9));
 const g=Array.from({length:4000},()=>gaussian(rnd)),sd=Math.sqrt(g.reduce((a,x)=>a+x*x,0)/g.length);assert.ok(sd>.9&&sd<1.1);
});

const view=(over={})=>({player:{x:190,y:310,vy:0,radius:14},speed:154,height:620,scaleY:1,terrainStep:12,terrain:[],hazards:[],sparks:[],
 liftImpulse:205,gravity:300,terminalFall:245,energy:80,maxEnergy:100,...over});
const mem=(style,over={})=>({human:humanProfile(style),lastLift:-2,pending:null,inputSamples:0,random:()=>.5,retry:false,lastHeart:false,guide:true,echoAt:null,noticed:new Map(),...over});

test('at mid height in open sky the Lift is planned near the cue, not at once; near the floor it comes sooner; it is queued only when about due',()=>{
 const glide=planPlayerLift(view(),null,mem('player-good'));
 assert.ok(glide.flap&&glide.delay>=.4,'a rising-then-falling Wisp waits for the cue (about .68 s ahead), no spam');
 const low=view({player:{x:190,y:560,vy:200,radius:14}});
 const plan=planPlayerLift(low,null,mem('player-good'));
 assert.equal(plan.flap,true);assert.ok(plan.delay<glide.delay);
 const m=mem('player-good');queueHumanLift(m,5,{...plan,delay:2});assert.equal(m.pending,null); // far in the future: look again later
 queueHumanLift(m,5,{...plan,delay:.1});assert.ok(m.pending>=5+m.human.reaction*.5);
 const before=m.pending;queueHumanLift(m,5.05,{...plan,delay:.1});assert.equal(m.pending,before); // one touch at a time
});

test('a nervous pilot sometimes adds an insurance tap shortly after a Lift; a good one rarely does',()=>{
 let tapped=0;
 for(let i=0;i<200;i++){
  let s=i+1;const random=()=>{s=(s*16807)%2147483647;return s/2147483647;};
  const m=mem('player-beginner',{random});
  queueHumanLift(m,5,{flap:true,delay:.05,glideCost:100,bestCost:0,sk:effectiveSkill(m.human,{guide:true})});
  if(m.echoAt!=null)tapped++;
 }
 assert.ok(tapped>0&&tapped<80);
});

test('a retried stop recalls Sparks seen earlier, a first attempt does not',()=>{
 const store={seen:new Map()};
 const e={distance:1000,layout:{embers:[{id:'a',collected:false}]}};
 const v1=view({sparks:[{id:'a',x:300,y:200,radius:20,mass:1}]});
 applyRecall(v1,mem('player-good',{store}),e);
 assert.equal(store.seen.size,1);
 const later={distance:1000-200,layout:e.layout}; // a new attempt, Spark is out of sight but remembered
 const v2=view({sparks:[]});applyRecall(v2,mem('player-good',{store,retry:false}),later);assert.equal(v2.sparks.length,0);
 const v3=view({sparks:[]});applyRecall(v3,mem('player-good',{store,retry:true}),later);
 assert.equal(v3.sparks.length,1);assert.equal(v3.sparks[0].recalled,true);
 e.layout.embers[0].collected=true;const v4=view({sparks:[]});applyRecall(v4,mem('player-good',{store,retry:true}),later);assert.equal(v4.sparks.length,0);
});
