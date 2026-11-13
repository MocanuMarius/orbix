import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {getRunModifiers,SKILLS,ARTIFACTS,getSupportChoices} from '../dist/model.mjs';
import {glowGaugeUnits} from '../dist/glow-ui.mjs';
import {getGlowCapacity,glowText,formatGlow} from '../dist/vitality.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';
import {lightAttenuation,LIGHT_EXTENT} from '../dist/light-field.mjs';
import {createRestInspectorState} from '../dist/rest-inspector.mjs';
import {artifactDetailMarkup} from '../dist/replay-ui.mjs';

globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas=()=>({style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})});
const engines=[];
const make=(skills={},artifacts=[])=>{const run={skills,artifacts,difficulty:1},modifiers=getRunModifiers(run),e=new WispFlight({canvas:canvas(),terrain:'ruins',seed:'whole-sparks',flame:100,modifiers,artifacts});e.render=()=>{};engines.push(e);return e;};
for(const [skills,cost,cells] of [[{},3,10],[{'main-efficiency':1},2,15],[{'main-efficiency':1,'main-lift':1},1,30]]){
 const e=make(skills);assert.equal(formatGlow(e.flapCost),String(cost));e.start();assert.equal(e.flap(),true);
 assert.equal(formatGlow(e.flame),String(30-cost));const meter=glowGaugeUnits(e.flame,e.maxFlame,e.flapCost);
 assert.equal(meter.capacity,cells);assert.equal(meter.filled,cells-1);assert.equal(meter.partial,0);
 for(let i=1;i<cells;i++)assert.equal(e.flap(),true,`Lift ${i+1} remains affordable`);assert.equal(formatGlow(e.flame),'0');assert.equal(e.flap(),false);
}
for(const [kind,value]of [['light',6],['cluster',12],['cache',18],['dusk',12]]){
 const e=make();e.flame=0;e.collect({id:kind,kind,x:100,y:200});assert.equal(formatGlow(e.flame),String(value));assert.equal(formatGlow(getPickupSpec(kind).fuel),String(value));
}
assert.equal(formatGlow(make({},['glass-lantern']).flapCost),'4');
assert.equal(formatGlow(make({},['quiet-cinder']).flapCost),'2');
assert.equal(formatGlow(make({'main-efficiency':1,'main-lift':1},['quiet-cinder']).flapCost),'1');
const free=make();free.artifactEffects.freeLift=true;const snapshot=free.getState();
assert.equal(snapshot.flapCost,0);assert.equal(glowGaugeUnits(snapshot.flame,snapshot.maxFlame,snapshot.paidFlapCost).capacity,10);
const expanded={skills:{'main-light-step':1,'main-thrifty-rise':1,'main-low-lift':1}};
assert.equal(getGlowCapacity(expanded),130);assert.equal(getRunModifiers(expanded).maxGlow,130);
const fullSkills={...expanded.skills,'main-reservoir':1,'main-vast-vessel':1};const vessel=make(fullSkills);assert.equal(vessel.maxFlame,170);assert.equal(vessel.maxFlame,getGlowCapacity({skills:fullSkills}));
assert.equal(glowGaugeUnits(95,100,10).partial,.5);assert.equal(glowGaugeUnits(60,100,10/3).partial,0);
for(const id of ['main-efficiency','main-lift'])assert.match(glowText(SKILLS[id].description),/one less Spark/);
let previous=1;for(let d=0;d<=3;d+=.01){const a=lightAttenuation(d*d);assert.ok(a<=previous+1e-9);previous=a;}
assert.ok(lightAttenuation(4)>.04&&lightAttenuation(4)<.08);assert.equal(lightAttenuation(9),0);assert.equal(LIGHT_EXTENT,3);
const fixture=createRestInspectorState(),fresh=createRestInspectorState();fixture.run.flame=0;assert.equal(fresh.run.flame,60);
for(const map of [0,1,2])for(let eventIndex=0;eventIndex<12;eventIndex++){
 const s=createRestInspectorState();s.run.mapIndex=map;s.run.current={...s.run.current,kind:'event',eventIndex};
 for(const c of getSupportChoices(s.run,s.profile))if(c.effect.pickupGlow)assert.equal(c.effect.pickupGlow%20,0,c.id+' uses 6-Spark blocks');
}
const detail=artifactDetailMarkup(ARTIFACTS['glow-wick'],{run:fresh.run,closeAction:'resume'});
assert.ok(detail.includes('Resume flight'));assert.ok(!detail.includes('relic-forge-summary'));
for(const e of engines)e.destroy();
console.log(JSON.stringify({liftCosts:[3,2,1],baselineSegments:10,pickups:[6,12,18],freeLiftSegmentStability:true,lightAtTwoRadii:lightAttenuation(4),blackAtThreeRadii:true,mockIsolation:true,eventFuelBlocks:6}));
