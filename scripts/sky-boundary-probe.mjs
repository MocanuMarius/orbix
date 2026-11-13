import assert from 'node:assert/strict';
import { WispFlight, buildFlightLayout, circleHitsObstacle } from '../dist/flight.mjs';

globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
const dt = 1 / 60;
const context = new Proxy({}, { get: (o, k) => o[k] ?? (String(k).includes('Gradient')
  ? () => ({ addColorStop() {} }) : () => {}), set: (o, k, v) => (o[k] = v, true) });
const canvas = { style: {}, getContext: () => context, getBoundingClientRect: () => ({ width: 390, height: 620 }) };
const floor = () => ({ id: 'floor', x: 0, width: 10000, center: 300, gap: 0, phase: 0, motion: 0,
  bottomShape: [[-1000, 0], [10000, 0], [10000, 1000], [-1000, 1000]] });
function make(extra = {}) {
  const engine = new WispFlight({ canvas, seed: 'edging-pulse', duration: 102, flame: 100,
    companions: [], ...extra });
  engine.render = () => {}; engine.layout.obstacles = [floor()]; engine.layout.embers = [];
  engine.drafts.zones = []; engine.biomeDynamics.items = [];
  engine.challengeDirector.update = () => ({ state: null, darkness: 0 });
  engine.start(); return engine;
}
function frame(engine, y = 270) {
  // A controlled collision-free flight, cancelling only gravity so every
  // production step, lifecycle gate and pulse update still runs normally.
  engine.player.y = y; engine.player.vy = -300 * engine.scaleY * dt;
  engine.step(dt);
}
function frames(engine, count, y = 270) { for (let i = 0; i < count; i++) frame(engine, y); }
const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-8, `${message}: ${a} != ${b}`);
const pulse = engine => engine.getState().edgingPulse;


for(const side of ['top','bottom']){
 const sky=make();sky.layout.obstacles=[];
 const r=sky.player.radius;
 frame(sky,side==='top'?-r+1:sky.height+r-1);
 assert.equal(sky.dying,false,`${side}: partially visible body survives`);
 assert.equal(pulse(sky).charge,0,`${side}: sky does not charge`);
 frame(sky,side==='top'?-r-1:sky.height+r+1);
 assert.ok(sky.dying,`${side}: fully outside ends attempt`);
 sky.destroy();
}
const terrain=make();frames(terrain,60);assert.ok(pulse(terrain).charge>0,'Solid terrain still charges');frame(terrain,300);assert.ok(terrain.dying,'Solid terrain still kills on contact');terrain.destroy();
console.log('Open sky and solid terrain checks passed');
