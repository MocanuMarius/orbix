// v1.2-level ground, boulders and growth (all twelve biomes): on by default,
// ?scenery=1 / {scenery:1} switches it off, deterministic, biome-true, and no
// background code path remains.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { WispFlightView } from '../dist/wisp-renderer.mjs';
import { buildFlightLayout } from '../dist/flight.mjs';
import { getRunModifiers } from '../dist/model.mjs';
import { BIOMES, BIOME_LEVELS } from '../dist/biomes.mjs';
import * as sceneryModule from '../dist/level-scenery-two.mjs?v=guide-clarity-1'; // same instance the renderer imports
import { readFileSync } from 'node:fs';
const { sceneryTwoStats, sceneryVersion, createLevelSceneryTwo, SCENERY_TWO_PALETTES, SCENERY_TWO_BIOMES, SCENERY_TWO_LOOKS, SCENERY_FIT, SCENERY_FIT_LAWS, SCENERY_TWO_ON } = sceneryModule;

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
const imagesFrom = view => view.bufferContext.commands.filter(command => command[0] === 'image');
function bakedArt(view) {
  return [...view.terrainCache.entries()].map(([key, item]) => [key, item.canvas.width, item.canvas.height, item.canvas.context.commands,
    item.growth ? [item.growth.dx, item.growth.dy, item.growth.canvas.width, item.growth.canvas.height, item.growth.canvas.context.commands] : null]);
}
const ALL = BIOMES.map(b => [BIOME_LEVELS.find(level => level.biomeId === b.id).id, b.terrain, b.id]);
// Biomes whose finished look ships on by default; the others keep the original look.
const COURSES = ALL.filter(([, , biome]) => SCENERY_TWO_ON.includes(biome));

test('v1.2-level ground is on by default for the finished biomes, and {scenery:1} switches it off', async () => {
  assert.deepEqual([...SCENERY_TWO_BIOMES].sort(), BIOMES.map(b => b.id).sort(), 'every biome has a look');
  assert.ok(SCENERY_TWO_ON.includes('frost') && SCENERY_TWO_ON.includes('pinewood'), 'the approved biomes stay on');
  for (const [levelId, terrain, biome] of ALL.filter(([, , b]) => !SCENERY_TWO_ON.includes(b)).slice(0, 3)) {
    const f = fixture(levelId, terrain), view = new WispFlightView(f.engine);
    try { assert.equal(await view.init(), true, view.error?.stack); assert.equal(view.scenery, null, `${biome} keeps the original look until finished`); } finally { view.destroy(); }
  }
  assert.equal(sceneryVersion({ options: {} }), 2, 'no URL flag in Node, no option: on');
  assert.equal(sceneryVersion({ options: { scenery: 2 } }), 2);
  assert.equal(sceneryVersion({ options: { scenery: 1 } }), 1);
  assert.equal(sceneryVersion({ options: { scenery: '1' } }), 1, 'the URL form of the off switch');
  assert.equal(createLevelSceneryTwo({ options: {} }, { biomeId: 'legacy-scene' }), null, 'legacy scenes keep their own look');
  for (const [levelId, terrain, biome] of COURSES) {
    const f = fixture(levelId, terrain), view = new WispFlightView(f.engine);
    try {
      assert.equal(await view.init(), true, view.error?.stack);
      assert.equal(view.scenery?.biome, biome, `${biome} is dressed without any flag`);
    } finally { view.destroy(); }
  }
  const before = snapshot();
  for (const [levelId, terrain] of COURSES) {
    const f = fixture(levelId, terrain, { scenery: 1 }), view = new WispFlightView(f.engine);
    try {
      assert.equal(await view.init(), true, view.error?.stack);
      assert.equal(view.scenery, null);
      for (let i = 0; i < 3; i++) { f.engine.renderDistance = 600 + i * 400; view.render(f.engine); }
      assert.ok(view.terrainCache.size > 0, 'terrain still bakes');
      assert.ok([...view.terrainCache.keys()].every(key => !key.endsWith(':s2')), 'off-switch cache keys are the original keys');
      assert.ok([...view.terrainCache.values()].every(item => item.growth === undefined), 'no growth layer is attached');
    } finally { view.destroy(); }
  }
  assert.deepEqual(snapshot(), before, 'the off switch never reaches material or growth code');
});

test('v1.2-level off switch renders exactly what the renderer drew before (ecology and terrain unchanged)', async () => {
  // With the switch off the frame is the original one: same draw calls as a
  // renderer that never had the scenery module (scenery forced to null).
  for (const [levelId, terrain] of ALL.slice(0, 4)) {
    const frames = [];
    for (const mode of ['off', 'none']) {
      const f = fixture(levelId, terrain, mode === 'off' ? { scenery: 1 } : {}), view = new WispFlightView(f.engine);
      try {
        assert.equal(await view.init(), true, view.error?.stack);
        if (mode === 'none') { view.scenery?.destroy(); view.scenery = null; }
        view.bufferContext.commands.length = 0; view.render(f.engine);
        frames.push(digest(view.bufferContext.commands));
      } finally { view.destroy(); }
    }
    assert.equal(frames[0], frames[1], levelId);
  }
});

test('v1.2-level has no background path: sky, backdrop, tableaux and weather are the original ones', async () => {
  const source = readFileSync(new URL('../dist/level-scenery-two.mjs', import.meta.url), 'utf8').replace(/\/\/.*$/gm, ''); // code only
  assert.doesNotMatch(source, /aurora|bakeFrostLayers|bakeForestLayers|drawSky|drawBackdrop|drawParticles|hidesCourseArt|moonShade|ridges/);
  assert.deepEqual(Object.keys(sceneryTwoStats).sort(), ['created', 'growth', 'growthMs', 'materialMs', 'materials']);
  for (const palette of Object.values(SCENERY_TWO_PALETTES)) for (const key of ['sky', 'aurora', 'far', 'mid', 'ridges', 'trunk', 'shaft', 'moon', 'particle']) assert.equal(palette[key], undefined, key);
  // Same course with the ground on and off: the frame draws the same images
  // in front of the terrain stage, i.e. the backdrop pipeline is shared.
  for (const [levelId, terrain] of [['frost-frozen-falls', 'storm'], ['desert-dune-trough', 'ruins'], ['crystal-prism-teeth', 'storm']]) {
    const backdrops = [];
    for (const scenery of [1, 2]) {
      const f = fixture(levelId, terrain, { scenery }), view = new WispFlightView(f.engine);
      try {
        assert.equal(await view.init(), true, view.error?.stack);
        view.bufferContext.commands.length = 0; view.render(f.engine);
        backdrops.push(imagesFrom(view).slice(0, 3).map(command => command.slice(1, 3).join('x')));
        assert.equal(typeof view.scenery?.drawSky, 'undefined');
      } finally { view.destroy(); }
    }
    assert.deepEqual(backdrops[0], backdrops[1], `${levelId}: sky and background strips are the same images with the ground on or off`);
  }
});

test('v1.2-level decoration is deterministic for a course and stays out of gameplay data', async () => {
  for (const [levelId, terrain, biome] of COURSES) {
    const runs = [];
    for (let run = 0; run < 2; run++) {
      const f = fixture(levelId, terrain), view = new WispFlightView(f.engine);
      const layout = JSON.stringify(f.engine.layout);
      try {
        const start = snapshot();
        assert.equal(await view.init(), true, view.error?.stack);
        assert.equal(view.scenery?.biome, biome);
        for (let i = 0; i < 4; i++) { f.engine.renderDistance = 500 + i * 350; view.render(f.engine); }
        const now = snapshot();
        assert.ok(now.materials > start.materials && now.growth > start.growth, JSON.stringify({ start, now }));
        assert.ok([...view.terrainCache.keys()].every(key => key.endsWith(':s2')));
        if (SCENERY_TWO_LOOKS[biome].growth.floor.length) assert.ok([...view.terrainCache.values()].some(item => item.growth), `${biome}: some exposed surface carries growth`);
        assert.equal(JSON.stringify(f.engine.layout), layout, 'collision polygons, pickups and hazards are untouched');
        runs.push(digest(bakedArt(view)));
      } finally { view.destroy(); }
    }
    assert.equal(runs[0], runs[1], `${biome}: the same course always bakes the same ground and growth`);
  }
});

test('v1.2-level biome fit: every biome draws only element kinds from its allowed list', () => {
  const L = SCENERY_FIT_LAWS;
  for (const biome of SCENERY_TWO_BIOMES) {
    const look = SCENERY_TWO_LOOKS[biome], fit = SCENERY_FIT[biome];
    assert.ok(look && fit, biome);
    const growth = [...look.growth.floor, ...look.growth.roof].map(rule => rule.kind);
    const ground = [look.boulders?.kind, ...(look.embeds || []).map(e => e.kind), look.cracks?.kind, look.cracks?.crevasse ? 'crevasse' : null].filter(Boolean);
    for (const kind of growth) assert.ok(fit.growth.includes(kind), `${biome}: growth '${kind}' is not allowed`);
    for (const kind of ground) assert.ok(fit.ground.includes(kind), `${biome}: ground feature '${kind}' is not allowed`);
    assert.equal(look.lip.kind, fit.lip, `${biome}: lip`);
    const all = [...fit.growth, ...fit.ground, fit.lip];
    if (L.noPlants.includes(biome)) for (const kind of all) assert.ok(!L.plants.includes(kind), `${biome}: nothing plant-like ('${kind}')`);
    if (L.noGrass.includes(biome)) for (const kind of all) assert.ok(!L.grass.includes(kind), `${biome}: no grass ('${kind}')`);
    for (const [owner, kinds] of Object.entries(L.only)) if (owner !== biome) for (const kind of kinds) assert.ok(!all.includes(kind), `'${kind}' belongs only to ${owner}, not ${biome}`);
  }
  // Ice sheets carry no plant at all, and the ice-only kinds stay in frost.
  assert.deepEqual(SCENERY_FIT.frost.growth.filter(kind => L.plants.includes(kind)), []);
  assert.ok(!Object.values(SCENERY_TWO_PALETTES.frost).some(value => typeof value === 'object' && ('shrub' in value)) && !('shrub' in SCENERY_TWO_PALETTES.frost), 'no frozen shrubs');
});

test('v1.2-level palettes are small and hold only flat hex colours', () => {
  for (const [biome, palette] of Object.entries(SCENERY_TWO_PALETTES)) {
    const colours = new Set(JSON.stringify(palette).match(/#[0-9a-f]{6}/gi));
    assert.ok(colours.size <= 64, `${biome} uses a limited palette (${colours.size})`);
    assert.doesNotMatch(JSON.stringify(palette), /rgba|gradient/i);
  }
  assert.deepEqual(Object.keys(SCENERY_TWO_PALETTES).sort(), [...SCENERY_TWO_BIOMES].sort());
});

test('v1.2-level baked colours all come from the biome palette', async () => {
  for (const [levelId, terrain, biome] of COURSES) {
    const allowed = new Set(JSON.stringify(SCENERY_TWO_PALETTES[biome]).match(/#[0-9a-f]{6}/gi).map(v => v.toLowerCase()));
    const f = fixture(levelId, terrain), view = new WispFlightView(f.engine);
    try {
      assert.equal(await view.init(), true, view.error?.stack);
      for (let i = 0; i < 3; i++) { f.engine.renderDistance = 500 + i * 400; view.render(f.engine); }
      const sprites = Object.values(view.scenery.sprites || {}).flat(2).map(item => item.canvas.context.commands);
      const growth = [...view.terrainCache.values()].map(item => item.growth?.canvas.context.commands || []);
      for (const command of [...sprites, ...growth].flat()) if (command[0] === 'rect') assert.ok(allowed.has(String(command[1]).toLowerCase()), `${biome}: ${command[1]}`);
    } finally { view.destroy(); }
  }
});

test('v1.1 rock law: a larger light radius never shines deeper into rock than the baseline', async () => {
  const { materialLightAt, SOLID_LIGHT_REFERENCE } = await import('../dist/terrain-light.mjs');
  const { lightAttenuation } = await import('../dist/light-attenuation.mjs');
  const rock = [[[0, -500], [400, -500], [400, 500], [0, 500]]], source = { x: -10, y: 0 };
  // At or below the baseline radius nothing changed.
  assert.equal(materialLightAt(rock, source, { x: 20, y: 0 }, SOLID_LIGHT_REFERENCE), lightAttenuation(((10 + 4.5 * 20) / 145) ** 2));
  for (const radius of [290, 406, 1200]) {
    // The rock part of the light distance, counted in baseline radii, is the same at any radius.
    const deep = materialLightAt(rock, source, { x: 60, y: 0 }, radius);
    assert.ok(Math.abs(deep - lightAttenuation((70 / radius + 3.5 * 60 / 145) ** 2)) < 1e-9, `radius ${radius}`);
    assert.ok(materialLightAt(rock, source, { x: 300, y: 0 }, radius) === 0, `radius ${radius}: no light through 300 units of rock`);
  }
});
