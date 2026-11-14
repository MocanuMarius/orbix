import assert from 'node:assert/strict';
import { WispFlight, circleHitsObstacle } from '../dist/flight.mjs';
import { BlackHoles, createBlackHoles, blackHoleDrainRate, BLACK_HOLE_TUNING as T, GIANT_BLACK_HOLE_TUNING as G } from '../dist/black-holes.mjs';
import { BIOME_LEVELS } from '../dist/level-catalog.mjs';
import { attachDream } from '../dist/dream.mjs';

globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
const dt = 1 / 60;
const context = new Proxy({}, { get: (o, k) => o[k] ?? (String(k).includes('Gradient')
  ? () => ({ addColorStop() {} }) : () => {}), set: (o, k, v) => (o[k] = v, true) });
function make(options = {}, height = 430) {
  const viewport = height === 430 ? { width: 956, height } : { width: 390, height };
  const canvas = { style: {}, getContext: () => context, getBoundingClientRect: () => viewport };
  const engine = new WispFlight({ canvas, seed: 'black-hole-probe', duration: 102,
    flame: 100, companions: [], ...options,node:{row:3,difficulty:options.difficulty||2,mapIndex:options.mapIndex||0,levelId:options.levelId,boss:options.boss,bossId:options.bossId,tutorialLesson:options.tutorialLesson,...options.node} });
  engine.render = () => {}; engine.viewport = viewport; return engine;
}
const close = (actual, expected, message, epsilon = 1e-8) =>
  assert.ok(Math.abs(actual - expected) <= epsilon, `${message}: ${actual} != ${expected}`);
const economy = e => [e.condensedTotal, e.condensedRemainder, e.score, e.baseEmbers,
  e.flameRestored, e.effortSpent, e.pickupOverflow, e.artifactEffects.workUntil,
  ...Object.values(e.artifactEffects.procCounts)];

// Independently verify the authored escape lane using the production collider,
// at denser intervals than placement, and at both sway extremes and its middle.
let omitted = 0, maps = 0, rooms = 0, approaches = 0, zeroDrainLanes = 0, geometryChecks = 0, campaignGiants = 0;
for (const level of BIOME_LEVELS) for (const height of [430, 620]) for (const variant of [0, 1]) {
  const e = make({ levelId: level.id, terrain: level.terrain, seed: `black-hole-${variant}`,
    lengthScale: 3, difficulty: variant ? 5 : 1, elite: !!variant, mapIndex: variant ? 8 : 0 }, height);
  const items = e.blackHoles.items;
  assert.ok(items.length<=1);if(!items.length){assert.deepEqual(createBlackHoles(e),[],'No validated quiet placement: omit rather than force a hazard');omitted++;e.destroy();continue;}
  const hole = items[0], lane = hole.bypass;
  if(hole.giant) {
    campaignGiants++;
    assert.ok(variant,'The easy, ordinary opening keeps its baseline hole');
    assert.deepEqual(e.layout.embers.filter(p=>p.feature?.startsWith('giant-bypass-')).map(p=>p.feature),
      ['giant-bypass-entry','giant-bypass-exit'],'Both sides of a Giant have existing fuel');
  }
  if (hole.placement === 'room') rooms++; else approaches++;
  assert.ok(Math.abs(lane.y - hole.y) >= T.minimumBypass, 'Body-wide escape outside the stronger drain band');
  if (Math.abs(lane.y - hole.y) >= T.influence) zeroDrainLanes++;
  for (const o of e.layout.obstacles) {
    if (o.destroyed || o.x - o.width > lane.endX + 40 || o.x + o.width * 2.5 < lane.startX - 40) continue;
    for (const sign of [-1, -.5, 0, .5, 1]) {
      const center = o.center + sign * Math.abs(o.motion || 0);
      assert.equal(circleHitsObstacle(hole.x, hole.y, hole.coreRadius, o, 0, center), false, 'Core is in air');
      for (let x = lane.startX; x <= lane.endX; x += 9) {
        assert.equal(circleHitsObstacle(x, lane.y, e.player.radius + 8, o, 0, center), false,
          `${level.id}: escape lane is body-clear through all sway`);
        geometryChecks++;
      }
    }
  }
  const reach = hole.influence + 50;
  for (const section of e.layout.sections) if (section.hard || section.authoredChallenge)
    assert.ok(hole.x + reach <= section.start || hole.x - reach >= section.end, 'No hard/challenge stack');
  for (const chain of e.layout.riskChains || [])
    assert.ok(hole.x + reach <= chain.start || hole.x - reach >= chain.end, 'No risk-chain stack');
  for (const draft of e.drafts.zones)
    assert.ok(Math.abs(hole.x - draft.x) >= reach + draft.rx, 'No draft stack');
  for (const actor of e.biomeDynamics.items)
    assert.ok(Math.abs(hole.x - actor.x) >= reach + (actor.radius || 14), 'No biome-actor stack');
  assert.deepEqual(createBlackHoles(e), items, 'Placement is seeded and does not mutate layout');
  const before = { x: hole.x, y: hole.y / e.height, lane: lane.y / e.height, id: hole.id, seed: hole.seed };
  Object.assign(e.viewport, height === 430 ? { width: 390, height: 850 } : { width: 956, height: 430 }); e.resize();
  assert.deepEqual([hole.x, hole.id, hole.seed], [before.x, before.id, before.seed], 'Resize preserves world X, seed and identity');
  if(hole.giant) close(Math.abs(hole.y-(hole.edge<0?0:e.height))/hole.coreRadius,.30,'Resize preserves the exposed fraction of the disk');
  else close(hole.y / e.height, before.y, 'Resize preserves normalized Y');
  close(lane.y / e.height, before.lane, 'Resize preserves normalized escape lane');
  for (const o of e.layout.obstacles) {
    if (o.destroyed || o.x - o.width > lane.endX + 40 || o.x + o.width * 2.5 < lane.startX - 40) continue;
    for (const sign of [-1, 0, 1]) for (let x = lane.startX; x <= lane.endX; x += 18)
      assert.equal(circleHitsObstacle(x, lane.y, e.player.radius + 8, o, 0, o.center + sign * Math.abs(o.motion || 0)), false,
        'Resized escape stays body-clear');
  }
  maps++; e.destroy();
}
assert.ok(campaignGiants>0 && campaignGiants<BIOME_LEVELS.length,'Giants are seeded and selective in actual campaigns');

function passCost(offset,speed) {
  let cost=0;
  for(let dx=-G.influence;dx<=G.influence;dx++)
    cost+=blackHoleDrainRate(Math.hypot(dx,offset),G.influence,G.coreRadius)*.3/speed;
  return cost;
}
const cautiousCost=passCost(G.minimumBypass-20,154*.8), closeCost=passCost(190,154*.8);
assert.ok(cautiousCost<3&&closeCost>15,'An imprecise far lane costs less than a Lift, a close slow crossing can consume half a fresh meter');
assert.ok(blackHoleDrainRate(120,G.influence,G.coreRadius)>3*blackHoleDrainRate(120));
const giantPasses=[];
for(const edge of [-1,1])for (const height of [430,620]) {
  const options={seed:2,terrain:'ruins',node:{levelId:'moonruins-bell-stair',row:3,difficulty:2,mapIndex:1,
    blackHoleEncounter:'giant',blackHoleEdge:edge}};
  const e=make(options,height),h=e.blackHoles.items[0];
  assert.equal(h?.giant,true);assert.equal(h.edge,edge);
  const offset=(h.y-(edge<0?0:e.height))*edge/h.coreRadius;
  close((Math.acos(offset)-offset*Math.sqrt(1-offset*offset))/Math.PI,.3119188,'The opening shows about one third of the disk',1e-6);
  assert.ok(h.bypass.startX>e.player.x,'Warning can start before field entry');
  e.distance=e.previousDistance=h.bypass.startX-e.player.x;
  e.player.y=e.previousPlayerY=h.bypass.y+18*e.scaleY;e.player.vy=0;
  e.start();
  let taps=0;
  // One decision every 150 ms. Use only the locally visible lane and vertical
  // velocity, without autosteering, damping, or shielding the actual wisp.
  for(let frame=0;frame<600&&e.alive&&!e.dying&&e.distance+e.player.x<h.bypass.endX;frame++){
    if(frame%9===0&&e.player.vy>0&&e.player.y>h.bypass.y+19*e.scaleY){e.flap();taps++;}
    e.step(dt);
  }
  assert.ok(e.alive&&!e.dying&&e.distance+e.player.x>=h.bypass.endX,'Real Lift and gravity clear the entire checked passage');
  assert.ok(taps>0&&e.flame>0);
  assert.ok(h.drained*.3<3,'Actual flight also budgets less than one Lift for the Giant');
  giantPasses.push({edge,height,taps,displayedLoss:+(h.drained*.3).toFixed(2)});e.destroy();
}

let bosses = 0;
for (const bossId of ['hollow-warden', 'moonweaver']) for (const height of [430, 620]) {
  const e = make({ boss: true, bossId, duration: 165, difficulty: 5 }, height);
  assert.equal(e.blackHoles.items.length, 1, `${bossId}: safe boss placement exists`);
  bosses++; e.destroy();
}
for (const tutorialLesson of ['glide', 'wind']) {
  const e = make({ tutorialLesson }); assert.equal(e.blackHoles.items.length, 0, 'No hazard before tutorial teaching'); e.destroy();
}
const fallback = make();
fallback.layout.sections = [{ hard: true, start: 900, end: fallback.totalDistance }];
fallback.drafts.zones = []; fallback.biomeDynamics.items = [];
assert.equal(createBlackHoles(fallback)[0]?.placement, 'approach', 'A crowded course uses its safe open approach');
fallback.layout.obstacles = [{ x: 0, width: 100000, center: 0, gap: 0, phase: 0, motion: 0,
  topShape: [[-1000, -1000], [100000, -1000], [100000, 2000], [-1000, 2000]] }];
assert.equal(createBlackHoles(fallback).length, 0, 'Fully blocked synthetic map never forces an unsafe fallback');
fallback.destroy();

assert.equal(blackHoleDrainRate(0), 400, 'Near-field cap');
assert.equal(blackHoleDrainRate(10), 400, 'Core contact is finite');
assert.equal(blackHoleDrainRate(220), 0); assert.equal(blackHoleDrainRate(1000), 0);
assert.ok(blackHoleDrainRate(219.99) < .0008, 'Smoothly reaches zero at influence edge');
for (let distance = 1; distance < 220; distance++)
  assert.ok(blackHoleDrainRate(distance) <= blackHoleDrainRate(distance - 1), 'Monotonic falloff');
for(const d of [0,10,40,85,100,135,182,210]){
 const oldRate=Math.min(160,144000*(1/(d*d+22**2)-1/(220**2+22**2)));
 close(blackHoleDrainRate(d),oldRate*2.5,'2.5× prior drain at '+d);
}
let bypassLoss=0;
for(let dx=-220;dx<=220;dx++)bypassLoss+=blackHoleDrainRate(Math.hypot(dx,T.minimumBypass-20))*.3/(154*.8);
assert.ok(bypassLoss<3,'Even a slow run 20 units off the bypass loses less than one base Lift');

function controlled(options = {}) {
  const e = make(options, 620); e.layout.obstacles = []; e.layout.embers = [];
  e.drafts.zones = []; e.biomeDynamics.items = [];
  e.challengeDirector.update = () => ({ state: null, darkness: 0 });
  e.blackHoles.items = [{ ...e.blackHoles.items[0], x: 600, y: 310,
    bypass: { startX: 330, endX: 870, y: 70 } }];
  e.start(); return e;
}
function atHole(e, offset = 0) {
  const hole = e.blackHoles.items[0];
  e.distance = hole.x - e.player.x - e.baseSpeed * dt;
  e.player.y = hole.y + offset; e.player.vy = -300 * e.scaleY * dt;
  e.step(dt);
}
const e = controlled({ condensedGlow: 90, condensedRemainder: .7,
  modifiers: { workFuel: 8, litLift: 1, overflowRecharge: .1 } });
const initialEconomy = economy(e), initialVy = e.player.vy;
e.flame = .3; atHole(e);
assert.equal(e.flame, 0); assert.equal(e.alive, true); assert.equal(e.dying, false);
assert.equal(e.player.vy, initialVy, 'Drain adds no gravity or force');
assert.equal(e.flap(), false, 'Empty Glow disables ordinary Lift');
close(e.blackHoles.state.drained, .3, 'Only available Glow is debited');
close(e.blackHoles.items[0].rate, 18, 'Renderer rate reports actual loss, not attempted cap');
assert.deepEqual(economy(e), initialEconomy, 'No CG, rewards, surplus or artifact work/income');
const sequence = e.blackHoles.items[0].drainSequence;
atHole(e); assert.equal(e.blackHoles.state.active, true, 'Persistent field at empty Glow');
assert.equal(e.blackHoles.items[0].rate, 0); assert.equal(e.blackHoles.items[0].frameDrained, 0);
assert.equal(e.blackHoles.items[0].drainSequence, sequence, 'No invented stolen-light stream at zero Glow');
e.player.y = 310; e.player.vy = 0; e.step(dt); assert.ok(e.player.vy > 0, 'Empty flight falls normally');
assert.equal(e.dying, false, 'Draining never invokes death');
e.flame = 100; atHole(e, 40);
const paused = JSON.stringify([e.flame, e.blackHoles.state, e.blackHoles.items]);
e.pause(); e.step(dt); e.blackHoles.update(dt);
assert.equal(JSON.stringify([e.flame, e.blackHoles.state, e.blackHoles.items]), paused, 'Pause advances no fuel or stream state');
e.resume(); atHole(e, 40); assert.ok(e.flame < 100);
e.beginDying(); const deadFuel = e.flame; e.step(dt);
assert.equal(e.flame, deadFuel); assert.equal(e.blackHoles.state.active, false); assert.equal(e.blackHoles.items[0].rate, 0);
const complete = controlled(); atHole(complete); complete.finish(true); const completedFuel = complete.flame;
complete.step(dt); assert.equal(complete.flame, completedFuel); assert.equal(complete.blackHoles.items[0].rate, 0);
const shield = controlled({ companions: ['protector', 'swift'] });
shield.shield.protection = 2; shield.invulnerable = true; atHole(shield);
assert.ok(shield.flame < 100, 'Shield/invulnerability does not protect Glow');
assert.equal(shield.shield.charges, shield.shield.layers, 'Black Hole contact never consumes a shield');

// Whole crossing integration: actual fuel, actual stream totals and sampling
// at 30/60/120 Hz agree. The production loop always uses its 60 Hz fixed step.
function crossing(step, verticalOffset) {
  const fixture = { seed: 1, height: 620, layout: { obstacles: [] }, totalDistance: 1000,
    player: { x: 0, y: 310 + verticalOffset }, distance: 0, time: 0,
    flame: 10000, running: true, alive: true };
  const holes = new BlackHoles(fixture);
  holes.items = [{ id: 'crossing', x: 0, y: 310, coreRadius: 16, influence: 220,
    rate: 0, potentialRate: 0, frameDrained: 0, drained: 0, drainSequence: 0 }];
  const steps = Math.ceil(600 / (154 * step)), actualStep = 600 / (154 * steps);
  for (let i = 0; i < steps; i++) {
    fixture.distance = -300 + (i + 1) * 154 * actualStep; fixture.time += actualStep; holes.update(actualStep);
  }
  close(10000 - fixture.flame, holes.drained, 'Fuel equals actual stream amount', 1e-7);
  close(holes.items[0].drained, holes.drained, 'Source accounts for all actual loss');
  return holes.drained;
}
const passes = [0, 40, 100, 135, 220].map(offset => {
  const values = [1 / 30, 1 / 60, 1 / 120].map(step => crossing(step, offset));
  assert.ok(Math.max(...values) - Math.min(...values) < .4, 'Time integration is stable to 0.12 displayed Sparks across sample rates');
  return { offset, internalGlow: Number(values[1].toFixed(3)), displayedGlow: Number((values[1] * .3).toFixed(3)) };
});
assert.equal(passes.at(-1).internalGlow, 0, 'Outside influence pass has no loss');
assert.ok(passes[0].internalGlow > passes[1].internalGlow * 1.6, 'Near pass is substantially more dangerous');

let ready;
const record = controlled({ modifiers: { dreamDuration: 6 } });
attachDream(record, { onReady: value => { ready = value; } });
for (let i = 0; i < 360; i++) atHole(record, 100);
assert.ok(ready?.valid); assert.ok(record.flame < 100, 'Dream free Lift is not hazard immunity');
const replay = controlled({ modifiers: { dreamDuration: 6 } });
attachDream(replay, { mode: 'replay', preset: ready.preset });
for (let i = 0; i < 360; i++) atHole(replay, 100);
assert.equal(replay.dream.phase, 'awakening');
assert.deepEqual(replay.blackHoles.state, record.blackHoles.state, 'Dream replay reproduces actual drain');
assert.deepEqual(replay.blackHoles.items, record.blackHoles.items); assert.equal(replay.flame, record.flame);
replay.step(dt); assert.equal(replay.flame, record.flame, 'Dream awakening stays frozen');
const distant = controlled();
for (let i = 0; i < 2000; i++) distant.blackHoles.items.push({ x: 50000 + i * 500, influence: 220,
  get y() { throw new Error('A distant Black Hole was sampled'); } });
atHole(distant); assert.ok(distant.blackHoles.rate > 0, 'Nearby culling does not read distant actors');
for (const engine of [e, complete, shield, record, replay, distant]) engine.destroy();
console.log(JSON.stringify({ maps: BIOME_LEVELS.length, placementVariants: maps, omitted, rooms, approaches, zeroDrainLanes,
  campaignGiants,giantPasses,cautiousCost,closeCost,
  bosses, geometryChecks, coreRadius: T.coreRadius, influence: T.influence, maximumRate: T.maximumRate,
  passes, currencyAndArtifactsUntouched: true, noContactDeathOrForce: true,
  pauseAndDreamDeterministic: true, resizeSafe: true, distantActorsCulled: true }));
