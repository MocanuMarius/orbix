// v1.0-level scenery (frost, pinewood): off by default, deterministic when on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { WispFlightView } from '../dist/wisp-renderer.mjs';
import { buildFlightLayout } from '../dist/flight.mjs';
import { getRunModifiers } from '../dist/model.mjs';
import { sceneryTwoStats, sceneryVersion, createLevelSceneryTwo, SCENERY_TWO_PALETTES } from '../dist/level-scenery-two.mjs?v=guide-clarity-1'; // same instance the renderer imports

// Canvas recorder (same approach as pixel-renderer.test.mjs): every canvas keeps
// its own command list so baked chunks can be compared without a browser.
function surface(document) {
  const canvas = {
    width: 0, height: 0, style: {}, dataset: {}, ownerDocument: document,
    setAttribute() {}, getBoundingClientRect: () => document.bounds,
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; },
  };
  const stack = [];
  const state = {
    globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: '#000', commands: [],
    createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
    getImageData: (x, y, width, height) => ({ width, height, data: new Uint8ClampedArray(Math.max(1, width * height) * 4) }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: source => ({ pattern: source.width + 'x' + source.height }),
    fillRect(...args) { this.commands.push(['rect', this.fillStyle, this.globalAlpha, ...args]); },
    drawImage(source, ...args) { this.commands.push(['image', source.width, source.height, this.globalAlpha, ...args]); },
    save() { stack.push([this.globalAlpha, this.globalCompositeOperation, this.fillStyle]); },
    restore() { [this.globalAlpha, this.globalCompositeOperation, this.fillStyle] = stack.pop(); },
  };
  const context = new Proxy(state, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => (target[key] = value, true) });
  canvas.getContext = () => context;
  canvas.context = context;
  return canvas;
}

function fixture(levelId, terrain, options = {}) {
  // Art images fail to load here, so the renderer falls back as it does offline.
  const image = () => ({ set src(_) { queueMicrotask(() => this.onerror?.()); } });
  const document = { bounds: { width: 390, height: 620 }, createElement(tag) { return tag === 'img' ? image() : surface(document); } };
  const parent = { children: [], appendChild(child) { this.children.push(child); child.parentElement = this; } };
  const canvas = surface(document);
  canvas.parentElement = parent;
  const engine = {
    width: 390, height: 620, terrain, seed: 17,
    layout: buildFlightLayout({ terrain, seed: 'level-scenery-two', height: 620, duration: 45 }),
    player: { x: 98, y: 310, vy: 0 }, distance: 900, renderDistance: 900, time: 3, visualTime: 3, renderPlayerY: 310,
    options: { node: { levelId }, ...options }, mod: getRunModifiers({ companions: ['collector'], skills: {} }),
    wisp: { phase: 'ready', history: [] }, flame: 60, trail: [], particles: [], pickupEffects: [],
    baseSpeed: 154, lastFlapTime: 0, boostTime: 0, shield: 0, reducedMotion: true, paused: true, running: true,
    canvas, getWispState: () => ({ x: 69, y: 329, homeX: 69, homeY: 329, radius: 100, phase: 'ready', recovery: 1, carrying: false }),
  };
  return { engine, document };
}
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const snapshot = () => ({ ...sceneryTwoStats, materialMs: 0, growthMs: 0 });
function bakedArt(view) {
  return [...view.terrainCache.entries()].map(([key, item]) => [key, item.canvas.width, item.canvas.height, item.canvas.context.commands,
    item.growth ? [item.growth.dx, item.growth.dy, item.growth.canvas.width, item.growth.canvas.height, item.growth.canvas.context.commands] : null]);
}

test('v1.0-level is off unless asked for, and the flag-off path never reaches decoration code', async () => {
  assert.equal(sceneryVersion({ options: {} }), 1, 'no URL flag in Node, no option: off');
  assert.equal(sceneryVersion({ options: { scenery: 2 } }), 2);
  assert.equal(sceneryVersion({ options: { scenery: 1 } }), 1);
  assert.equal(createLevelSceneryTwo({ options: { scenery: 2 } }, { biomeId: 'marsh' }), null, 'only frost and pinewood are dressed');
  const before = snapshot();
  for (const [levelId, terrain] of [['frost-glacier-gate', 'storm'], ['pinewood-timber-run', 'canopy']]) {
    const f = fixture(levelId, terrain), view = new WispFlightView(f.engine);
    try {
      assert.equal(await view.init(), true, view.error?.stack);
      assert.equal(view.scenery, null);
      for (let i = 0; i < 3; i++) { f.engine.renderDistance = 600 + i * 400; view.render(f.engine); }
      assert.ok(view.terrainCache.size > 0, 'terrain still bakes');
      assert.ok([...view.terrainCache.keys()].every(key => !key.endsWith(':s2')), 'flag-off cache keys are the original keys');
      assert.ok([...view.terrainCache.values()].every(item => item.growth === undefined), 'no growth layer is attached');
    } finally { view.destroy(); }
  }
  assert.deepEqual(snapshot(), before, 'no scenery object, background, material, growth or particle call');
});

test('v1.0-level decoration is deterministic for a course and stays out of gameplay data', async () => {
  for (const [levelId, terrain, biome] of [['frost-frozen-falls', 'storm', 'frost'], ['pinewood-fallen-giant', 'canopy', 'pinewood']]) {
    const runs = [];
    for (let run = 0; run < 2; run++) {
      const f = fixture(levelId, terrain, { scenery: 2 }), view = new WispFlightView(f.engine);
      const layout = JSON.stringify(f.engine.layout);
      try {
        const start = snapshot();
        assert.equal(await view.init(), true, view.error?.stack);
        assert.equal(view.scenery?.biome, biome);
        for (let i = 0; i < 4; i++) { f.engine.renderDistance = 500 + i * 350; view.render(f.engine); }
        const now = snapshot();
        assert.ok(now.materials > start.materials && now.growth > start.growth && now.backgrounds > start.backgrounds && now.particles + now.skippedParticles > start.particles + start.skippedParticles, JSON.stringify({ start, now }));
        assert.ok([...view.terrainCache.keys()].every(key => key.endsWith(':s2')));
        assert.ok([...view.terrainCache.values()].some(item => item.growth), 'some exposed surface carries growth');
        assert.equal(JSON.stringify(f.engine.layout), layout, 'collision polygons, pickups and hazards are untouched');
        runs.push(digest(bakedArt(view)));
      } finally { view.destroy(); }
    }
    assert.equal(runs[0], runs[1], `${biome}: the same course always bakes the same ground and growth`);
  }
});

test('v1.0-level palettes are small and hold only flat hex colours', () => {
  for (const [biome, palette] of Object.entries(SCENERY_TWO_PALETTES)) {
    const colours = new Set(JSON.stringify(palette).match(/#[0-9a-f]{6}/gi));
    assert.ok(colours.size <= 64, `${biome} uses a limited palette (${colours.size})`);
    assert.doesNotMatch(JSON.stringify(palette), /rgba|gradient/i);
  }
});
