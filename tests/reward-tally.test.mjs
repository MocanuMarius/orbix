import test from 'node:test';
import assert from 'node:assert/strict';
import {planTally,tallyStateAt,tallyLayout,TALLY_LIMITS} from '../dist/reward-tally.mjs';
import {createTallySound} from '../dist/reward-tally-sound.mjs';

const rows=n=>Array.from({length:n},(_,i)=>({amount:(i+1)*3}));
test('layout: one column up to 4 rows, two above, dense from 9',()=>{
 assert.deepEqual(tallyLayout(3),{columns:1,rowsPerColumn:3,dense:false});
 assert.deepEqual(tallyLayout(4),{columns:1,rowsPerColumn:4,dense:false});
 assert.deepEqual(tallyLayout(5),{columns:2,rowsPerColumn:3,dense:false});
 assert.deepEqual(tallyLayout(15),{columns:2,rowsPerColumn:8,dense:true});
});
test('sources reveal top to bottom, faster with many, and the whole tally stays about 2 seconds',()=>{
 for(const n of [1,3,8,15]){
  const plan=planTally({rows:rows(n),wallet:100,walletFrom:40});
  assert.ok(plan.gap<=TALLY_LIMITS.maxGap&&plan.gap>=TALLY_LIMITS.minGap);
  assert.deepEqual(plan.steps.map(s=>s.index),[...Array(n).keys()]);
  assert.ok(plan.steps.every((s,i)=>i===0||s.at>plan.steps[i-1].at),'strictly top to bottom');
  assert.ok(plan.duration<=2600,`n=${n} lasts ${plan.duration}`);
 }
 assert.ok(planTally({rows:rows(15)}).gap<planTally({rows:rows(3)}).gap);
 assert.equal(planTally({rows:rows(3)}).gap,TALLY_LIMITS.maxGap);
});
test('the total only grows, the last frame equals the receipt, and the balance rolls from old to new',()=>{
 const plan=planTally({rows:rows(6),wallet:118,walletFrom:47});
 let prev=-1,prevWallet=47;
 for(let t=0;t<=plan.endAt+50;t+=7){
  const s=tallyStateAt(plan,t);
  assert.ok(s.total>=prev&&s.total<=plan.total);assert.ok(s.wallet>=prevWallet&&s.wallet<=118);
  assert.ok(s.rows.every((v,i)=>v===null||(v>=0&&v<=plan.amounts[i])));
  prev=s.total;prevWallet=s.wallet;
 }
 const end=tallyStateAt(plan,plan.endAt);
 assert.equal(end.total,63);assert.equal(end.wallet,118);assert.equal(end.banked,true);assert.deepEqual(end.rows,plan.amounts);
 assert.equal(tallyStateAt(plan,0).wallet,47);assert.equal(tallyStateAt(plan,0).banked,false);
 assert.equal(tallyStateAt(plan,plan.walletAt-1).wallet,47,'balance waits for the total to land');
});
test('skip and reduced motion give the final numbers at once; the receipt total wins over its rows',()=>{
 const plan=planTally({rows:rows(4),wallet:50,walletFrom:20});
 const s=tallyStateAt(plan,10,{skipped:true});
 assert.equal(s.done,true);assert.equal(s.total,30);assert.equal(s.wallet,50);assert.deepEqual(s.rows,[3,6,9,12]);
 const reduced=planTally({rows:rows(4),wallet:50,walletFrom:20,reducedMotion:true});
 assert.equal(tallyStateAt(reduced,0).done,true);assert.equal(tallyStateAt(reduced,0).total,30);
 const capped=planTally({rows:[{amount:5}],total:9,wallet:9});
 assert.equal(tallyStateAt(capped,capped.endAt).total,9);
 assert.equal(tallyStateAt(planTally({rows:[],wallet:7}),0).total,0);
});
test('never negative or fractional, whatever the input',()=>{
 const plan=planTally({rows:[{amount:-4},{amount:2.9},{amount:'x'}],wallet:-5,walletFrom:-9});
 assert.deepEqual(plan.amounts,[0,2,0]);assert.equal(plan.wallet,0);assert.equal(plan.walletFrom,0);
 for(let t=0;t<2000;t+=50){const s=tallyStateAt(plan,t);assert.ok(Number.isInteger(s.total)&&s.total>=0);}
});
test('sound is code-made, silent at level 0 and never throws without audio',()=>{
 const made=[];
 class Ctx{constructor(){this.currentTime=0;this.state='running';this.destination={};}
  createOscillator(){const o={frequency:{},connect(){},start(){},stop(){}};made.push(o);return o;}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}
  close(){}}
 let level=0;const sound=createTallySound({getGain:()=>level,AudioContextClass:Ctx});
 sound.tick(0,3);sound.chime();assert.equal(made.length,0);
 level=1;sound.tick(0,3);assert.equal(made.length,1);sound.chime();assert.ok(made.length>=4,'a richer chime than a tick');
 sound.dispose();sound.tick(0,3);assert.ok(made.length<=5+0);
 assert.doesNotThrow(()=>createTallySound({AudioContextClass:null}).tick());
});
