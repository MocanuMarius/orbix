import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { WispFlightView } from '../dist/wisp-renderer.mjs';
import { buildFlightLayout } from '../dist/flight.mjs';
import { getModifiers } from '../dist/model.mjs';

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

// A Canvas API recorder checks rendering behavior without a browser or GPU.
// Raster lighting is tested against the actual RGBA fog pixels the view writes.
function surface(document) {
  const canvas = {
    width: 0, height: 0, style: {}, dataset: {}, ownerDocument: document,
    setAttribute() {},
    getBoundingClientRect: () => document.bounds,
    remove() {
      if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
      this.parentElement = null;
    },
  };
  const stack = [];
  const state = {
    globalAlpha: 1, globalCompositeOperation: 'source-over', fillStyle: '#000', commands: [],
    createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
    fillRect(...args) { this.commands.push(['rect', this.fillStyle, this.globalAlpha, ...args]); },
    drawImage(source, ...args) { this.commands.push(['image', source.width, source.height, this.globalAlpha, ...args]); },
    save() { stack.push([this.globalAlpha, this.globalCompositeOperation, this.fillStyle]); },
    restore() { [this.globalAlpha, this.globalCompositeOperation, this.fillStyle] = stack.pop(); },
  };
  const context = new Proxy(state, {
    get: (target, key) => target[key] ?? (() => {}),
    set: (target, key, value) => (target[key] = value, true),
  });
  canvas.getContext = () => context;
  canvas.context = context;
  return canvas;
}

function fixture({ lightRank = 0, immutable = true, duration = 45 } = {}) {
  const document = { bounds: { width: 390, height: 620 }, createElement() { return surface(document); } };
  const parent = { children: [], appendChild(child) { this.children.push(child); child.parentElement = this; } };
  const canvas = surface(document);
  canvas.parentElement = parent;
  canvas.style.opacity = '.4';
  const data = {
    width: 390, height: 620, terrain: 'canopy',
    layout: freeze(buildFlightLayout({ terrain: 'canopy', seed: 'pixel-renderer-qa', height: 620, duration })),
    player: freeze({ x: 98, y: 310, vy: -40 }),
    distance: 500, renderDistance: 500, time: 3, visualTime: 3, renderPlayerY: 310,
    options: freeze({ element: 'ice' }), mod: freeze(getModifiers([], { 'wisp-light': lightRank })),
    wisp: freeze({ phase: 'cooldown', history: [{ x: 565, y: 330, time: 2.9 }] }),
    flame: 35, trail: freeze([{ worldX: 575, y: 316, time: 2.9, boost: false }]),
    particles: freeze([{ x: 70, y: 315, life: .4, maxLife: .6, type: 'spark' }]),
    pickupEffects: freeze([{ x: 98, y: 310, restored: 22, life: .5 }]),
    baseSpeed: 154, lastFlapTime: 2.95, boostTime: .3, shield: 1, reducedMotion: true,
    paused: true, running: true,
  };
  const carrier = freeze({ x: 69, y: 329, homeX: 69, homeY: 329, radius: 100,
    phase: 'cooldown', recovery: .5, carrying: false });
  const engine = { ...data, canvas, getWispState: () => carrier,
    gustState: () => ({ active: true, warning: false, direction: 1 }),
    getExitPortal: () => ({ x: 350, y: 310, progress: .5 }) };
  if (immutable) freeze(data), Object.freeze(engine);
  const snapshot = () => JSON.stringify(Object.fromEntries(Object.entries(engine).filter(([key]) => key !== 'canvas')));
  return { engine, document, parent, canvas, snapshot };
}

const digest = commands => createHash('sha256').update(JSON.stringify(commands)).digest('hex');

test('pixel rendering preserves frozen gameplay and exact terrain through repeated paused redraws', async () => {
  const f = fixture(), view = new WispFlightView(f.engine), before = f.snapshot();
  try {
    assert.equal(await view.init(), true, view.error?.stack);
    assert.equal(view.canvas.dataset.element, 'ice');
    assert.equal(view.buffer.width, 195);
    assert.equal(view.buffer.height, 310);
    assert.ok(view.terrainCache.size > 0, 'real visible terrain polygons are rendered');
    assert.equal(f.canvas.style.opacity, '0');
    view.bufferContext.commands.length = 0;
    view.render(f.engine);
    const commands = digest(view.bufferContext.commands), fog = view.fogPixels.data.slice();
    view.bufferContext.commands.length = 0;
    view.render(f.engine);
    assert.equal(digest(view.bufferContext.commands), commands, 'paused time freezes character, particles and terrain');
    assert.deepEqual(view.fogPixels.data, fog, 'a repaint does not advance the light field');
    assert.equal(f.snapshot(), before, 'rendering never alters gameplay, fuel, pickups or collision geometry');
  } finally { view.destroy(); }
});

test('Inner Glow reveals more terrain while unlit hazards retain visible contrast', async () => {
  const base = fixture(), upgraded = fixture({ lightRank: 3 });
  const a = new WispFlightView(base.engine), b = new WispFlightView(upgraded.engine);
  try {
    assert.equal(await a.init(), true);
    assert.equal(await b.init(), true);
    assert.equal(base.engine.mod.lightRadius, 175);
    assert.equal(upgraded.engine.mod.lightRadius, 280);
    const normal = a.fogPixels.data, brighter = b.fogPixels.data;
    let revealed = 0;
    for (let i = 3; i < normal.length; i += 4) {
      assert.ok(normal[i] < 205 && brighter[i] < 205, 'the darkness layer never hides all underlying scenery');
      assert.ok(brighter[i] <= normal[i], 'a light upgrade cannot darken any terrain pixel');
      if (brighter[i] < normal[i]) revealed++;
    }
    assert.ok(revealed > normal.length / 4 * .15, 'the permanent light upgrade visibly expands the revealed area');
    const corner = ((a.buffer.height - 4) * a.buffer.width + a.buffer.width - 4) * 4 + 3;
    assert.ok(normal[corner] > 100 && normal[corner] < 205, 'distant scenery stays dim but readable');
  } finally { a.destroy(); b.destroy(); }
});

test('resizing and traversing a full route keep terrain memory bounded and cleanup restores input canvas', async () => {
  const f = fixture({ immutable: false, duration: 75 }), view = new WispFlightView(f.engine);
  assert.equal(await view.init(), true);
  try {
    const allChunks = f.engine.layout.obstacles.reduce((n, obstacle) => n + Number(Boolean(obstacle.topShape)) + Number(Boolean(obstacle.bottomShape)), 0);
    assert.ok(allChunks > 24, 'the route exceeds the allowed resident chunk budget');
    for (const obstacle of f.engine.layout.obstacles) {
      f.engine.renderDistance = obstacle.x - 150;
      view.render(f.engine);
      assert.ok(view.terrainCache.size <= 24, 'completed route sections are evicted rather than retained forever');
    }
    f.document.bounds = { width: 320, height: 640 };
    f.engine.height = 780;
    view.resize();
    assert.equal(view.buffer.width, 195);
    assert.equal(view.buffer.height / view.buffer.width, f.engine.height / f.engine.width);
    assert.equal(view.canvas.style.width, '320px');
    assert.equal(view.canvas.style.height, '640px');
    assert.equal(view.context.imageSmoothingEnabled, false);
    assert.equal(f.parent.children.length, 1, 'resize preserves a single rendering overlay');
    const cached = [...view.terrainCache.values()].map(item => item.canvas);
    view.destroy();
    view.destroy();
    assert.equal(f.canvas.style.opacity, '.4', 'the interactive original canvas is restored');
    assert.equal(f.parent.children.length, 0);
    assert.equal(view.ready, false);
    assert.equal(view.terrainCache.size, 0);
    assert.equal(view.fogPixels, null);
    assert.ok(cached.every(canvas => canvas.width <= 1 && canvas.height <= 1));
    assert.equal(view.buffer.width, 1);
    assert.equal(view.fog.width, 1);
    assert.doesNotThrow(() => view.render(f.engine), 'a late repaint after cleanup is harmless');
  } finally { view.destroy(); }
});
