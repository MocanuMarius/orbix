import assert from 'node:assert/strict';
import {lightVisibility,sceneRevealStrength} from '../dist/light-field.mjs';
import {ArtifactEffects} from '../dist/artifact-effects.mjs';

const e={player:{x:100,y:200},time:5,mod:{litLift:1},fleet:[],
 pickupRevealHoldUntil:0,pickupRevealStrength:0,sightUntil:0,mainSeerUntil:0,
 edgingPulse:{strength:.9,active:true},burst(){},quickenCompanionRecovery(){return 0;}};
const light={radius:100,intensity:1};
assert.equal(lightVisibility(e,light,800,20),0,'Distant geometry is dark at baseline');
assert.equal(lightVisibility(e,{...light,edgingReveal:.8},800,20),.8,'Pulse illuminates distant scene geometry');
assert.equal(sceneRevealStrength({pickupReveal:.7,edgingReveal:.8}),.8,'Independent reveals do not add exposure');
assert.equal(sceneRevealStrength({edgingReveal:4}),1,'Scene exposure stays bounded');
assert.equal(sceneRevealStrength({edgingReveal:NaN,pickupReveal:-1}),0);
assert.equal(lightVisibility(e,{...light,edgingReveal:0},800,20),0,'Fade restores circular darkness');
assert.equal(lightVisibility(e,light,100,200),lightVisibility(e,{...light,edgingReveal:0},100,200));
const artifacts=new ArtifactEffects(e);e.artifactEffects=artifacts;
assert.equal(artifacts.freeLift,false,'Edging light alone never grants a free Lift');
const natural={kind:'light'},fuel={fuel:24,dim:0};
for(const [packet,spec] of [[{...natural,generated:true},fuel],[{...natural,harmful:true},fuel],[natural,{fuel:24,dim:1}],[natural,{fuel:0,dim:0}]]){
 artifacts.onFuel(packet,spec,0);
 assert.equal(artifacts.freeLift,false,'Generated, harmful and non-fuel pickups cannot trigger Sunspool');
}
artifacts.onFuel(natural,fuel,0);
assert.equal(artifacts.freeLift,true,'Natural fuel in Edging light intentionally grants a free Lift');
assert.equal(artifacts.liftGrants,1);
artifacts.onFuel(natural,fuel,0);
assert.equal(artifacts.liftGrants,1,'Only one free Lift can be stored');
assert.equal(artifacts.consumeLift(),true);
artifacts.onFuel(natural,fuel,0);
assert.equal(artifacts.freeLift,false,'Spending the Lift does not bypass the four-second recovery');
for(let grant=2;grant<=4;grant++){
 e.time+=4;artifacts.onFuel(natural,fuel,0);
 assert.equal(artifacts.freeLift,true);assert.equal(artifacts.liftGrants,grant);
 assert.equal(artifacts.consumeLift(),true);
}
e.time+=4;artifacts.onFuel(natural,fuel,0);
assert.equal(artifacts.freeLift,false,'Edging synergy cannot exceed four grants per flight');
assert.equal(artifacts.liftGrants,4);assert.equal(artifacts.procCounts.sunspool,4);
console.log('Edging light: distant reveal, non-additive exposure, baseline restoration and bounded natural-fuel Sunspool synergy passed.');
