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
artifacts.onFuel({kind:'light'},{fuel:24,dim:0},0);
assert.equal(artifacts.freeLift,false,'Edging does not impersonate a pickup-light artifact trigger');
console.log('Edging light: distant reveal, non-additive exposure, baseline restoration and artifact isolation passed.');
