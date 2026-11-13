import assert from 'node:assert/strict';
import {newState,createRun,chooseStartingSkill,buyCheckpointSkill,getRunModifiers,SKILLS} from '../dist/model.mjs';
import {WispFlight} from '../dist/flight.mjs';
const state=newState();state.run=createRun(state.profile,'dawnburst');state.run.embers=90; // Fund the effect fixture, not a starter build.
assert.ok(chooseStartingSkill(state,'main-sight'));assert.ok(buyCheckpointSkill(state,'main-dawnburst'));
assert.equal(state.run.embers,45);assert.equal(SKILLS['main-dawnburst'].maxRank,1);
assert.equal(buyCheckpointSkill(state,'main-dawnburst'),false);
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:620})};
const make=(enabled=true,companions=['collector'])=>new WispFlight({canvas,seed:'dawnburst',duration:20,flame:100,companions,modifiers:enabled?getRunModifiers(state.run):{}});
let pickupId=0;
function collect(e,kind='light',extra={}){e.collect({id:++pickupId,kind,x:e.player.x,y:e.player.y,...extra});}
const e=make();assert.equal(e.getLightState().pickupReveal,0);
collect(e);assert.equal(e.flame,100,'Full Glow still triggers the reveal');
e.time=.12;assert.equal(e.getLightState().pickupReveal,1);
e.time=1.62;assert.equal(e.getLightState().pickupReveal,1);
e.time=2.22;assert.ok(Math.abs(e.getLightState().pickupReveal-.5)<1e-8);
const half=e.getLightState().pickupReveal;collect(e,'cache',{deliveredByWisp:true});assert.equal(e.getLightState().pickupReveal,half,'Refresh never blinks dark');
e.time+=.12;assert.equal(e.getLightState().pickupReveal,1);const deadline=e.pickupRevealHoldUntil;
collect(e);assert.equal(e.getLightState().pickupReveal,1);assert.equal(e.pickupRevealHoldUntil,deadline,'Same-time pickups cannot stack duration');
e.time=deadline+1.2;assert.equal(e.getLightState().pickupReveal,0);
for(const kind of ['embers','charge','sight','dark']){const other=make();collect(other,kind);other.time=.5;assert.equal(other.getLightState().pickupReveal,0,kind);}
const generated=make();collect(generated,'light',{generated:true});generated.time=.5;assert.equal(generated.getLightState().pickupReveal,0);
const plain=make(false);collect(plain);plain.time=.5;assert.equal(plain.getLightState().pickupReveal,0);
const reduced=make();reduced.reducedMotion=true;collect(reduced);reduced.time=.12;assert.ok(reduced.getLightState().pickupReveal<.5);reduced.time=.35;assert.equal(reduced.getLightState().pickupReveal,1);
const purified=make(true,['kindler']);purified.mod.kindlerPurify=true;collect(purified,'dark');purified.time=.2;assert.equal(purified.getLightState().pickupReveal,1);
console.log(JSON.stringify({oneTimePurchase:45,holdSeconds:1.5,fadeSeconds:1.2,bodyAndCollector:true,fullTank:true,refreshNoStack:true,utilityExclusion:true,reducedMotion:true,purify:true}));
