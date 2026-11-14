import assert from 'node:assert/strict';
import {glowSenseCues} from '../dist/glow-sense.mjs';
import {newState, createRun, buyCheckpointSkill, getRunModifiers} from '../dist/model.mjs';

const state = newState();
state.run = createRun(state.profile,'glow-sense-probe');
state.run.condensedGlow = 160;
assert.equal(buyCheckpointSkill(state,'main-glow-sense'), false);
assert.ok(buyCheckpointSkill(state,'main-sight'));
assert.ok(buyCheckpointSkill(state,'main-glow-sense'));
assert.equal(getRunModifiers(state.run).glowSense, true);

const light = {radius:145,intensity:1,pickupReveal:0};
let packets = [];
const engine = {width:390,height:620,distance:100,time:0,player:{x:100,y:310},
  mod:{glowSense:true},getNearbyPickups:()=>packets,getLightState:()=>light};
const packet = (x, y, extra = {}) => ({kind:'light',x:x+engine.distance,y,...extra});

for (const kind of ['light','cluster','cache','dark','dusk','sight']) {
  packets = [packet(348,42,{kind})];
  const [seen] = glowSenseCues(engine);
  assert.deepEqual([seen.x,seen.y,seen.packet.kind], [348,42,kind]);
  assert.ok(seen.strength > 0 && seen.strength < .4);
}
packets = [packet(302,59),packet(321,59,{kind:'dark'}),packet(343,59)];
assert.deepEqual(glowSenseCues(engine).map(c=>c.x), [302,321,343], 'neighbours keep their individual positions');
packets = [packet(550,50),packet(388,40,{collected:true}),packet(345,40,{carried:true}),packet(103,310)];
assert.equal(glowSenseCues(engine).length,0,'offscreen, carried, collected and fully lit pickups have no overlay');
packets=[packet(350,35)];
light.pickupReveal=1;
assert.equal(glowSenseCues(engine).length,0);
light.pickupReveal=0;
engine.mod.glowSense=false;
assert.equal(glowSenseCues(engine).length,0);
console.log('Spark Sense shows dim real pickups at their map positions and respects ownership, light and viewport bounds.');
