import { sceneryIdentity, drawIdentityBackground, drawIdentityMaterial } from './level-scenery.mjs';
import { getCompanionAbility, normalizeCompanionRole } from './companion-abilities.mjs';
import { companionSprite, companionPalette } from './companion-art.mjs';

const TAU = Math.PI * 2;
const WIDTH = 260;
const ART_SCALE = WIDTH / 195;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const hash = (x, y = 0, seed = 0) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
};
const timeOf = e => e.visualTime ?? e.time ?? 0;
const distanceOf = e => e.renderDistance ?? e.distance ?? 0;
const yOf = e => e.renderPlayerY ?? e.player.y;
const PALETTES = {
  ruins: { sky: ['#101719', '#192426', '#293434'], far: '#263131', middle: '#34403c', near: '#40483f', stone: '#363a35', shade: '#242c2b', face: '#4c4e42', grain: '#626150', rim: '#929078', mist: '#777e70' },
  canopy: { sky: ['#0c1515', '#172321', '#26342b'], far: '#203029', middle: '#2b3b30', near: '#3c4836', stone: '#2c342a', shade: '#1d2823', face: '#414b35', grain: '#5b6145', rim: '#82866a', mist: '#78826a' },
  storm: { sky: ['#111821', '#202b34', '#344147'], far: '#2c3940', middle: '#3d4a4d', near: '#4b5758', stone: '#343f44', shade: '#232f35', face: '#4d5b5d', grain: '#6a7878', rim: '#a2afaa', mist: '#879a9b' },
};
const MATERIALS = {
  aqueduct: { stone: '#36382f', face: '#4a4638', grain: '#746c51', rim: '#9d9272' },
  belfry: { stone: '#363c38', face: '#4e554c', shade: '#202e2c', grain: '#747b63', rim: '#9ca38b' },
  ossuary: { stone: '#393c36', face: '#51564a', grain: '#92977d', rim: '#b0b99a' },
  elder: { stone: '#30332a', face: '#514a34', grain: '#75714d', rim: '#929571' },
  fen: { stone: '#26342d', face: '#3a5141', grain: '#656f45', rim: '#90a074' },
  hanging: { stone: '#26352f', face: '#415849', grain: '#61836a', rim: '#91b89e' },
  ridge: { stone: '#363f45', face: '#526169', grain: '#6f7d83', rim: '#a4b4b6' },
  chasm: { stone: '#2f343f', face: '#454f60', grain: '#69768c', rim: '#9da9bc' },
  glass: { stone: '#303f4a', face: '#4a6673', grain: '#7999a7', rim: '#b6ced0' },
};
const MAIN_LIGHT = { outer: '#9daaa0', mid: '#ccd6c6', core: '#f0f1d8', bright: '#ffffec' };
const GLYPHS = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
  G: ['111', '100', '101', '101', '111'], L: ['100', '100', '100', '100', '111'],
  O: ['111', '101', '101', '101', '111'], W: ['101', '101', '101', '111', '101'],
  F: ['111', '100', '110', '100', '100'], U: ['101', '101', '101', '101', '111'],
};

function pixelText(c, value, x, y, ink) {
  c.fillStyle = ink;
  for (const letter of String(value)) {
    const rows = GLYPHS[letter];
    if (rows) for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 3; xx++) if (rows[yy][xx] === '1') c.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
    x += 4;
  }
}

function pixelLine(c, x0, y0, x1, y1, ink, size = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  c.fillStyle = ink;
  for (let guard = 0; guard < 4096; guard++) {
    c.fillRect(x0, y0, size, size);
    if (x0 === x1 && y0 === y1) break;
    const next = error * 2;
    if (next >= dy) { error += dy; x0 += sx; }
    if (next <= dx) { error += dx; y0 += sy; }
  }
}

function pixelDisc(c, x, y, radius, ink) {
  c.fillStyle = ink;
  for (let row = -radius; row <= radius; row++) {
    const half = Math.floor(Math.sqrt(Math.max(0, radius * radius - row * row)));
    c.fillRect(Math.round(x - half), Math.round(y + row), half * 2 + 1, 1);
  }
}

function path(c, points, offsetX = 0, offsetY = 0, scale = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => {
    const px = Math.round(x * scale + offsetX), py = Math.round(y * scale + offsetY);
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  });
  c.closePath();
}

function hexMix(a, b, amount) {
  const aa = parseInt(a.slice(1), 16), bb = parseInt(b.slice(1), 16);
  const r = Math.round((aa >> 16) * (1 - amount) + (bb >> 16) * amount);
  const g = Math.round((aa >> 8 & 255) * (1 - amount) + (bb >> 8 & 255) * amount);
  const blue = Math.round((aa & 255) * (1 - amount) + (bb & 255) * amount);
  return `rgb(${r},${g},${blue})`;
}

export class WispFlightView {
  constructor(engine) {
    this.engine = engine;
    this.ready = false;
    this.destroyed = false;
    this.canvas = null;
    this.buffer = null;
    this.terrainCache = new Map();
    this.originalOpacity = engine.canvas.style?.opacity || '';
  }

  async init() {
    const e = this.engine;
    const document = e.canvas.ownerDocument || globalThis.document;
    if (!document || !e.canvas.parentElement || this.destroyed || e.destroyed) return false;
    try {
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'pixel-flight-canvas';
      this.canvas.dataset.renderer = 'canvas-pixel';
      this.canvas.dataset.pixelWidth = String(WIDTH);
      this.canvas.setAttribute('aria-hidden', 'true');
      Object.assign(this.canvas.style, { position: 'absolute', inset: '0', pointerEvents: 'none', imageRendering: 'pixelated' });
      this.context = this.canvas.getContext('2d', { alpha: false });
      this.buffer = document.createElement('canvas');
      this.bufferContext = this.buffer.getContext('2d', { alpha: false });
      this.fog = document.createElement('canvas');
      this.fogContext = this.fog.getContext('2d');
      if (!this.context || !this.bufferContext || !this.fogContext) throw Error('Canvas 2D is unavailable.');
      this.document = document;
      e.canvas.parentElement.appendChild(this.canvas);
      this.resize();
      this.ready = true;
      // Opacity preserves the original canvas's pointer input below this view.
      if (e.canvas.style) e.canvas.style.opacity = '0';
      this.render(e);
      return true;
    } catch (error) {
      this.error = error;
      this.destroy();
      return false;
    }
  }

  resize() {
    if (this.destroyed || !this.canvas || !this.buffer) return;
    const e = this.engine, bounds = e.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, bounds.width || 390), cssHeight = Math.max(1, bounds.height || 620);
    const ratio = clamp(globalThis.devicePixelRatio || 1, 1, 2);
    this.canvas.width = Math.round(cssWidth * ratio);
    this.canvas.height = Math.round(cssHeight * ratio);
    this.canvas.style.width = `${cssWidth}px`; this.canvas.style.height = `${cssHeight}px`;
    this.buffer.width = WIDTH;
    this.buffer.height = Math.max(1, Math.round((e.height || 620) / (e.width || 390) * WIDTH));
    this.scale = WIDTH / (e.width || 390);
    this.fog.width = this.buffer.width; this.fog.height = this.buffer.height;
    this.fogPixels = this.fogContext.createImageData(this.fog.width, this.fog.height);
    this.context.imageSmoothingEnabled = false;
    this.bufferContext.imageSmoothingEnabled = false;
    this.terrainCache.clear();
    if (this.ready) this.render(e);
  }

  drawSky(e, t, distance, palette) {
    const c = this.bufferContext, W = this.buffer.width, H = this.buffer.height;
    for (let row = 0; row < H; row += 4) {
      const fraction = row / H * 2;
      c.fillStyle = hexMix(palette.sky[Math.min(1, Math.floor(fraction))], palette.sky[Math.min(2, Math.floor(fraction) + 1)], fraction % 1);
      c.fillRect(0, row, W, 4);
    }
    for (let i = 0; i < 54; i++) {
      const x = Math.floor(hash(i, 4, 12) * W), y = Math.floor(hash(i, 7, 15) * H * .65);
      c.globalAlpha = .20 + (e.reducedMotion ? .10 : Math.floor((Math.sin(t * .7 + i) + 1) * 2) * .08);
      c.fillStyle = '#a9b1a0'; c.fillRect(x, y, 1, 1);
      if (i % 17 === 0) c.fillRect(x - 1, y + 1, 3, 1);
    }
    c.globalAlpha = 1;
    drawIdentityBackground(c, { identity: sceneryIdentity(e), width: W, height: H, distance, palette },
      { line: pixelLine, disc: pixelDisc, polygon: path });
    // Low, broken cloud and mist strips keep the world atmospheric without blurred assets.
    c.globalAlpha = .12;
    for (let i = 0; i < 13; i++) {
      const width = 20 + Math.floor(hash(i, 6) * 50);
      const x = ((hash(i, 3) * (W + width) - distance * .018) % (W + width) + W + width) % (W + width) - width;
      const y = Math.floor(H * (.24 + hash(i, 8) * .62));
      c.fillStyle = palette.mist; c.fillRect(Math.round(x), y, width, i % 3 === 0 ? 2 : 1);
    }
    c.globalAlpha = 1;
  }

  drawDeadForest(t, distance, palette) {
    const c = this.bufferContext, H = this.buffer.height;
    for (let layer = 0; layer < 2; layer++) {
      const spacing = layer ? 49 : 37, scroll = distance * (layer ? .085 : .043), first = Math.floor(scroll / spacing);
      for (let i = -1; i < WIDTH / spacing + 2; i++) {
        const id = first + i, lean = hash(id, 9) * 12 - 6;
        const x = Math.round(i * spacing - scroll % spacing), base = Math.round(H * (layer ? .98 : .88));
        const height = 29 + hash(id, 2) * (layer ? 61 : 44), ink = layer ? palette.shade : palette.far;
        c.globalAlpha = .62;
        pixelLine(c, x, base, x + lean * .4, base - height * .52, ink, layer ? 3 : 2);
        pixelLine(c, x + lean * .4, base - height * .52, x + lean, base - height, ink, 2);
        for (let root = -1; root <= 1; root++) pixelLine(c, x, base - 4, x + root * 9, base + 2, ink);
        for (let branch = 0; branch < 5; branch++) {
          const y = base - height * (.34 + branch * .125), side = branch % 2 ? -1 : 1;
          const bx = x + lean * .5 + side * (7 + hash(id + branch, 12) * 13);
          pixelLine(c, x + lean * .5, y + 5, bx, y - 7, ink, branch < 2 ? 2 : 1);
          pixelLine(c, bx, y - 7, bx + side * 3, y - 17, ink);
          if (branch % 2 === 0) pixelLine(c, bx - side * 3, y - 5, bx + side * 7, y - 8, ink);
        }
        if (id % 4 === 1) {
          pixelLine(c, x + 10, base - height * .6, x + 10, base - height * .6 + 8, palette.near);
          c.fillStyle = palette.middle; c.fillRect(x + 8, Math.round(base - height * .6 + 8), 4, 5);
          c.fillStyle = '#72735b'; c.fillRect(x + 9, Math.round(base - height * .6 + 9), 1, 2);
        }
      }
    }
    c.globalAlpha = 1;
  }

  drawDistantRuins(distance, palette, frozen = false) {
    const c = this.bufferContext, H = this.buffer.height;
    const scroll = distance * .029;
    for (let site = -1; site < 3; site++) {
      const id = Math.floor(scroll / 170) + site;
      const x = Math.round(site * 170 + 44 - scroll % 170), y = Math.round(H * (.77 + hash(id, 8) * .08));
      c.globalAlpha = .72; c.fillStyle = palette.far;
      c.fillRect(x, y - 27, 8, 38); c.fillRect(x + 31, y - 35, 9, 46);
      c.fillRect(x + 6, y - 22, 27, 5); c.fillRect(x + 11, y - 28, 19, 6);
      c.fillRect(x + 2, y - 31, 5, 4); c.fillRect(x + 32, y - 39, 6, 4);
      c.fillRect(x - 5, y + 8, 51, 4); c.fillRect(x + 42, y - 7, 17, 19);
      c.fillStyle = palette.sky[1];
      c.fillRect(x + 3, y - 20, 2, 7); c.fillRect(x + 34, y - 26, 3, 9);
      c.fillRect(x + 14, y - 28, 4, 3); c.fillRect(x + 45, y - 7, 4, 3);
      c.fillStyle = palette.middle; c.fillRect(x - 3, y + 10, 56, 1);
      if (frozen) {
        c.fillStyle = '#6e8286'; c.fillRect(x + 1, y - 28, 7, 1); c.fillRect(x + 31, y - 36, 10, 1); c.fillRect(x + 35, y - 35, 1, 5);
      } else {
        pixelLine(c, x + 49, y, x + 47, y - 19, palette.far); pixelLine(c, x + 47, y - 13, x + 54, y - 22, palette.far);
      }
    }
    c.globalAlpha = 1;
  }

  drawMist(e, t, distance, palette) {
    const c = this.bufferContext, H = this.buffer.height;
    const scene = sceneryIdentity(e).scene;
    const [start, spacing, layers] = ({ belfry: [.76, .05, 4], fen: [.72, .06, 4],
      hanging: [.18, .20, 3], glass: [.36, .37, 2], chasm: [.79, .10, 2],
      elder: [.57, .12, 4], ridge: [.33, .22, 3] })[scene] || [.57, .14, 3];
    for (let layer = 0; layer < layers; layer++) {
      const y = Math.round(H * (start + layer * spacing));
      const shift = (distance * (.012 + layer * .007) + (e.reducedMotion ? 0 : t * 1.4)) % 80;
      c.globalAlpha = .055 + layer * .012; c.fillStyle = palette.mist;
      for (let patch = -1; patch < 4; patch++) {
        const x = Math.round(patch * 80 - shift);
        c.fillRect(x, y, 61, 1); c.fillRect(x + 7, y + 1, 46, 2); c.fillRect(x + 18, y + 3, 28, 1);
      }
    }
    c.globalAlpha = 1;
  }

  drawTerrainStory(c, surface, top, palette, obstacle, terrain, canvasWidth) {
    const inward = top ? -1 : 1;
    const crest = surface.reduce((best, p) => inward * p[1] < inward * best[1] ? p : best, surface[0]);
    const at = x => {
      for (let i = 1; i < surface.length; i++) {
        const a = surface[i - 1], b = surface[i];
        if (x >= a[0] && x <= b[0] && b[0] !== a[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
      return crest[1];
    };
    const cx = Math.round(clamp(crest[0] + (obstacle.id % 2 ? -7 : 7), 20, canvasWidth - 20));
    const cy = Math.round(at(cx));
    if (terrain === 'ruins') {
      // Buried masonry is filled relief in solid stone, never a false opening.
      for (let row = 0; row < 5; row++) for (let brick = -3; brick <= 3; brick++) {
        const xx = cx + brick * 7 + row % 2 * 3, yy = cy + inward * (5 + row * 5);
        c.fillStyle = row % 2 ? palette.face : palette.grain; c.fillRect(xx, yy, 6, 3);
        c.fillStyle = palette.shade; c.fillRect(xx + 1, yy + 3, 5, 1);
      }
      if (!top && obstacle.id % 3 !== 2) {
        const y = cy + 7;
        c.fillStyle = palette.face; c.fillRect(cx - 9, y + 6, 18, 18);
        for (const [xx, yy] of [[-12, 10], [-11, 6], [-8, 3], [-4, 1], [0, 0], [4, 1], [8, 3], [11, 6], [12, 10]]) {
          c.fillStyle = palette.shade; c.fillRect(cx + xx - 2, y + yy, 5, 4);
          c.fillStyle = palette.grain; c.fillRect(cx + xx - 1, y + yy, 4, 2);
        }
        c.fillStyle = palette.grain; c.fillRect(cx - 14, y + 11, 3, 14); c.fillRect(cx + 12, y + 11, 3, 14);
        c.fillStyle = palette.shade; c.fillRect(cx - 9, y + 13, 18, 1); c.fillRect(cx - 9, y + 19, 18, 1);
        c.fillRect(cx, y + 8, 1, 17); c.fillRect(cx - 5, y + 14, 1, 5); c.fillRect(cx + 5, y + 20, 1, 5);
        c.fillStyle = '#8c8669'; c.fillRect(cx - 1, y + 10, 3, 1); c.fillRect(cx, y + 9, 1, 4);
      } else for (let step = 0; step < 5; step++) {
        c.fillStyle = palette.grain; c.fillRect(cx - 13 + step * 5, cy + inward * (8 + step * 4), 8, 2);
        c.fillStyle = palette.shade; c.fillRect(cx - 13 + step * 5, cy + inward * (10 + step * 4), 7, 1);
      }
      c.fillStyle = palette.shade; c.fillRect(cx - 18, cy + inward * 23, 8, 2); c.fillRect(cx + 14, cy + inward * 16, 6, 3);
    } else if (terrain === 'canopy') {
      for (let root = 0; root < 4; root++) {
        const start = cx + (root - 1.5) * 11, y = at(start);
        let previousX = start, previousY = y + inward * 2;
        for (let segment = 1; segment <= 9; segment++) {
          const xx = start + Math.sin(segment * .42 + root * 1.3) * (4 + segment * .6), yy = y + inward * segment * 5;
          pixelLine(c, previousX, previousY, xx, yy, palette.shade, segment < 4 ? 4 : 2);
          pixelLine(c, previousX + 1, previousY, xx + 1, yy, '#586047');
          if (segment === 4 || segment === 7) pixelLine(c, xx, yy, xx + (root % 2 ? -9 : 9), yy + inward * 9, palette.shade, 2);
          previousX = xx; previousY = yy;
        }
      }
      c.fillStyle = '#737956';
      for (let i = 0; i < 9; i++) c.fillRect(cx - 20 + i * 5, Math.round(at(cx - 20 + i * 5)) + inward, 3, 1);
    } else {
      for (let vein = 0; vein < 3; vein++) {
        const xx = cx - 17 + vein * 17, yy = at(xx);
        for (let step = 0; step < 7; step++) {
          const x = xx + Math.round(Math.sin(step * .7 + vein) * 2), y = yy + inward * (4 + step * 4);
          c.fillStyle = step % 2 ? '#657d82' : '#789095'; c.fillRect(x, y, vein === 1 ? 3 : 2, 4);
          c.fillStyle = '#a2b5b3'; c.fillRect(x, y, 1, 2);
        }
      }
      if (!top) {
        c.fillStyle = palette.shade; c.fillRect(cx - 2, cy + 6, 6, 19);
        c.fillStyle = palette.grain; c.fillRect(cx - 1, cy + 6, 3, 17);
        c.fillStyle = palette.rim; c.fillRect(cx, cy + 9, 1, 5); c.fillRect(cx - 1, cy + 10, 3, 1);
      }
    }
  }

  terrainImage(e, obstacle, shape, top, palette) {
    const identity = sceneryIdentity(e);
    const key = `${identity.id}:${obstacle.sectionId || ''}:${obstacle.id}:${top ? 'top' : 'floor'}:${this.buffer.height}`;
    const cached = this.terrainCache.get(key);
    if (cached) return cached;
    const s = this.scale, minX = Math.min(...shape.map(p => p[0])), minY = Math.min(...shape.map(p => p[1]));
    const maxX = Math.max(...shape.map(p => p[0])), maxY = Math.max(...shape.map(p => p[1]));
    const canvas = this.document.createElement('canvas');
    canvas.width = Math.ceil((maxX - minX) * s) + 4; canvas.height = Math.ceil((maxY - minY) * s) + 4;
    const c = canvas.getContext('2d'), ox = 2 - minX * s, oy = 2 - minY * s;
    c.imageSmoothingEnabled = false;
    path(c, shape, ox, oy, s); c.fillStyle = palette.stone; c.fill();
    c.save(); c.clip();
    const surface = shape.slice(2).reverse().map(([x, y]) => [Math.round(x * s + ox), Math.round(y * s + oy)]);
    const section = e.layout.sections?.find(item => item.id === obstacle.sectionId);
    const hardEntry = Boolean(section?.hard && e.layout.obstacles.find(item => item.sectionId === section.id) === obstacle);
    drawIdentityMaterial(c, { identity, surface, top, palette, width: canvas.width,
      height: canvas.height, obstacle, hardEntry }, { line: pixelLine, polygon: path });
    const inward = top ? -1 : 1;
    for (let i = 1; i < surface.length; i++) {
      const a = surface[i - 1], b = surface[i];
      pixelLine(c, a[0], a[1] + inward * 2, b[0], b[1] + inward * 2, palette.face, 2);
      pixelLine(c, a[0], a[1], b[0], b[1], palette.rim);
    }
    if (obstacle.soft) {
      // Shatter Wake's convertible brambles stay inside the real silhouette but
      // carry a distinct dry-vine weave and a few dormant amber thorn tips.
      for (let i = 5; i < surface.length - 3; i += 9) {
        const [x, y] = surface[i];
        pixelLine(c, x - 3, y + inward * 4, x + 3, y + inward * 17, '#785e42', 2);
        pixelLine(c, x + 2, y + inward * 8, x + 7, y + inward * 5, '#785e42');
        pixelLine(c, x, y + inward * 12, x - 5, y + inward * 10, '#785e42');
        c.fillStyle = '#be9356'; c.fillRect(x + 6, y + inward * 5, 1, 1);
      }
    }
    c.restore();
    const item = { canvas, x: minX, y: minY, pad: 2 };
    this.terrainCache.set(key, item);
    while (this.terrainCache.size > 14) this.terrainCache.delete(this.terrainCache.keys().next().value);
    return item;
  }

  drawTerrain(e, t, distance, palette) {
    const c = this.bufferContext, s = this.scale;
    for (const obstacle of e.layout.obstacles) {
      if (obstacle.destroyed || obstacle.x + obstacle.width * 2.5 < distance - 10 || obstacle.x - obstacle.width > distance + e.width + 10) continue;
      // These are the simulation's exact local collider polygons and animated
      // center; cached art avoids allocating transformed vertex arrays per frame.
      const center = obstacle.center + Math.sin(t * .9 + obstacle.phase) * obstacle.motion;
      for (const top of [true, false]) {
        const shape = top ? obstacle.topShape : obstacle.bottomShape;
        if (!shape?.length) continue;
        const item = this.terrainImage(e, obstacle, shape, top, palette);
        c.drawImage(item.canvas, Math.round((obstacle.x - distance + item.x) * s) - item.pad,
          Math.round((center + (top ? -1 : 1) * obstacle.gap / 2 + item.y) * s) - item.pad);
      }
    }
  }

  drawCollectibles(e, t, distance) {
    const s = this.scale;
    for (const ember of e.layout.embers) {
      if (ember.collected || ember.carried) continue;
      const x = Math.round((ember.x - distance) * s), y = Math.round(ember.y * s);
      if (x < -13 || x > WIDTH + 13) continue;
      this.drawPacket(x, y, { dark: ember.kind === 'dark' || ember.harmful === true,
        rich: ember.value === 3, tiny: ember.generated === true });
    }
  }

  drawPacket(x, y, { dark = false, rich = false, tiny = false, alpha = 1 } = {}) {
    const c = this.bufferContext, r = tiny ? 1 : rich ? 4 : 2;
    c.save();
    if (dark) {
      // An occluding halo and a broken ash edge distinguish this from a light
      // packet. There is no emissive crystal, bright outline or elemental mark.
      c.globalAlpha = alpha * .32; pixelDisc(c, x, y, 10, '#010205');
      c.globalAlpha = alpha * .7; pixelDisc(c, x, y, 5, '#333a3e');
      c.globalAlpha = alpha; pixelDisc(c, x, y, 4, '#020306');
      pixelDisc(c, x, y, 2, '#000000');
      c.globalAlpha = alpha * .35;
      c.fillStyle = '#6c7172'; c.fillRect(x - 4, y - 1, 1, 2); c.fillRect(x + 2, y + 4, 2, 1);
    } else {
      this.glow(x, y, tiny ? 4 : rich ? 12 : 7, '#cabb99', (tiny ? .08 : rich ? .17 : .11) * alpha);
      c.globalAlpha = alpha * .5; pixelDisc(c, x, y, r + 1, '#bfaf8d');
      c.globalAlpha = alpha * .9; pixelDisc(c, x, y, r, '#e4d9b8');
      pixelDisc(c, x - (rich ? 2 : 1), y + 1, tiny ? 1 : 2, '#e4d9b8');
      c.globalAlpha = alpha; pixelDisc(c, x, y - 1, Math.max(1, r - 1), '#fff1cd');
      c.fillStyle = '#fffdec'; c.fillRect(x - 1, y - 1, rich ? 3 : 2, 2);
    }
    c.restore();
  }

  drawBurstEffects(e, tint) {
    const c = this.bufferContext, s = this.scale;
    for (const p of (e.particles || []).slice(-90)) {
      c.globalAlpha = clamp(p.life / p.maxLife, 0, 1) * .7;
      c.fillStyle = p.type === 'spark' ? tint.core : tint.outer;
      c.fillRect(Math.round(p.x * s), Math.round(p.y * s), p.type === 'spark' ? 2 : 1, 1);
    }
    c.globalAlpha = 1;
  }

  lightFog(e, state, playerX, playerY) {
    const c = this.bufferContext, W = this.buffer.width, H = this.buffer.height, s = this.scale;
    const light = e.getLightState?.() || e.light || {};
    this.currentLightState = light;
    const baseRadius = Number(light.baseRadius) || Number(e.mod?.lightRadius) || 175;
    this.lightRadius = Math.max(24, Number(light.radius) || baseRadius);
    this.lightIntensity = clamp(Number.isFinite(light.intensity) ? light.intensity : 1, .25, 1);
    const dimScale = clamp(this.lightRadius / baseRadius, .6, 1);
    this.lightDimScale = dimScale;
    const radius = this.lightRadius * s, radius2 = radius * radius;
    const carrierX = state.x * s, carrierY = state.y * s;
    const carrierRadius2 = ((state.phase === 'cooldown' ? 13 + state.recovery * 7 : 26) * ART_SCALE * dimScale) ** 2;
    const pixels = this.fogPixels.data, dither = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const distance2 = (x - playerX) ** 2 + (y - playerY) ** 2;
      const carrier2 = (x - carrierX) ** 2 + (y - carrierY) ** 2;
      const playerShade = clamp((distance2 / radius2 - .10) / .90, 0, 1);
      const carrierShade = clamp((carrier2 / carrierRadius2 - .08) / .92, 0, 1);
      const shade = 1 - Math.max(1 - playerShade, 1 - carrierShade) * this.lightIntensity;
      const grain = (dither[(y & 3) * 4 + (x & 3)] / 15 - .5) * .035;
      const alpha = clamp(Math.round((.025 + shade * .93 + grain) * 24) / 24, 0, .96);
      const index = (y * W + x) * 4;
      pixels[index] = 2; pixels[index + 1] = 5; pixels[index + 2] = 8; pixels[index + 3] = Math.round(alpha * 255);
    }
    this.fogContext.putImageData(this.fogPixels, 0, 0);
    c.drawImage(this.fog, 0, 0);
  }

  glow(x, y, radius, ink, strength = .12) {
    const c = this.bufferContext;
    c.save(); c.globalCompositeOperation = 'screen';
    for (let ring = 4; ring > 0; ring--) {
      c.globalAlpha = strength / 4;
      pixelDisc(c, x, y, Math.round(radius * ring / 4), ink);
    }
    c.restore();
  }

  drawSpirit(x, y, tint, t, { small = false, boost = false, tap = 0, fuel = 1, reduced = false, intensity = 1 } = {}) {
    const c = this.bufferContext;
    c.save();
    const breath = reduced ? 0 : Math.sin(t * 2.3) * .28;
    const radius = small ? 4 : 13 + breath + tap * .4;
    const power = clamp(intensity, .18, 1) * (small ? 1 : .72 + fuel * .28);
    this.glow(x, y, Math.round((small ? 10 : boost ? 28 : 23) * ART_SCALE), tint.outer, (small ? .12 : .22) * power);
    const disc = (cx, cy, r, ink) => {
      if (small) { pixelDisc(c, cx, cy, r, ink); return; }
      // Rasterize a true circle into the pixel scene rather than a stepped
      // polygon whose bright corners can read as a diamond.
      c.fillStyle = ink; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
    };
    // Nested translucent round cores form a soft light, with no pointed flame,
    // crystal body, elemental glyph, or persistent particle tail.
    c.globalAlpha = power * .22; disc(x, y, radius + 1, tint.outer);
    c.globalAlpha = power * .44; disc(x, y, radius, tint.mid);
    c.globalAlpha = power * .72; disc(x, y, Math.max(2, radius - 2), tint.core);
    c.globalAlpha = power * .9; disc(x, y, Math.max(1, radius - (small ? 3 : 5)), tint.core);
    c.globalAlpha = Math.max(.35, power) * .94;
    disc(x - (small ? 0 : 2), y - (small ? 1 : 2), small ? 1 : 4, tint.bright);
    if (!small && tap > .05) {
      c.globalAlpha = tap * power * .24;
      disc(x, y, radius + 2, tint.core);
    }
    c.restore();
  }

  drawCarrierSpirit(x, y, role, tint, intensity = 1) {
    const c = this.bufferContext, art = companionSprite(role);
    const power = clamp(intensity, .18, 1);
    const inks = [null, tint.outer, tint.mid, tint.core, tint.bright];
    c.save();
    this.glow(x, y, Math.round(10 * ART_SCALE), tint.outer, .12 * power);
    c.globalAlpha = power;
    const left = Math.floor(art.width / 2), top = Math.floor(art.height / 2);
    art.rows.forEach((row, yy) => {
      for (let xx = 0; xx < row.length;) {
        const shade = Number(row[xx]), start = xx;
        while (xx < row.length && Number(row[xx]) === shade) xx++;
        if (inks[shade]) {
          c.fillStyle = inks[shade];
          c.fillRect(x + start - left, y + yy - top, xx - start, 1);
        }
      }
    });
    c.restore();
  }

  drawCarrier(e, t, distance, state, tint) {
    const c = this.bufferContext, s = this.scale;
    const x = Math.round(state.x * s), y = Math.round(state.y * s);
    const homeX = state.homeX * s, homeY = state.homeY * s;
    const cooling = state.phase === 'cooldown';
    const radius = state.radius * s, dots = Math.round(TAU * radius / 4);
    c.globalAlpha = (cooling ? .07 + state.recovery * .12 : state.phase === 'ready' ? .46 : .25) * (this.lightIntensity || 1);
    for (let dot = 0; dot < dots; dot++) {
      const angle = dot / dots * TAU;
      c.fillStyle = tint.core;
      c.fillRect(Math.round(homeX + Math.cos(angle) * radius), Math.round(homeY + Math.sin(angle) * radius), 1, 1);
    }
    c.globalAlpha = 1;
    this.drawCarrierSpirit(x, y, e.companionRole || e.options?.companionRole, tint,
      (cooling ? .25 + state.recovery * .45 : 1) * (this.lightIntensity || 1));
    if (cooling) {
      for (let i = 0; i < 10; i++) {
        const angle = i / 10 * TAU;
        c.fillStyle = i / 10 < state.recovery ? tint.mid : '#3a4747';
        c.fillRect(Math.round(x + Math.cos(angle) * 9), Math.round(y + Math.sin(angle) * 9), 1, 1);
      }
    }
    if (state.carrying) {
      this.drawPacket(x + 8, y + 6, { tiny: true, dark: state.cargoKind === 'dark' });
    }
  }

  drawCompanionAbility(e, t, playerX, playerY, carrier, ability) {
    if (!ability.active) return;
    const c = this.bufferContext, role = normalizeCompanionRole(ability.role || ability.id);
    const duration = Math.max(.1, Number(ability.duration) || 1);
    const progress = clamp(1 - (Number(ability.remaining) || 0) / duration, 0, 1);
    const light = this.lightIntensity || 1;
    c.save();
    if (role === 'swift') {
      if (!e.reducedMotion) for (let i = 0; i < 4; i++) {
        const shift = (progress * 4 + i * .21) % 1;
        const x = playerX - 19 - i * 5 - shift * 3;
        const y = playerY + (i % 2 ? -1 : 1) * (4 + i);
        c.globalAlpha = light * (.22 + (1 - shift) * .32);
        pixelLine(c, x, y, x + 4 + i % 2 * 2, y - 1, '#f2d48e');
      }
    } else if (role === 'anchor') {
      // Horizontal level marks, never a circular guard or immunity cue.
      c.globalAlpha = light * .68;
      for (const side of [-1, 1]) {
        pixelLine(c, playerX + side * 16, playerY, playerX + side * 22, playerY, '#a7e8df');
        pixelLine(c, playerX + side * 22, playerY - 2, playerX + side * 22, playerY + 2, '#64b8b7');
      }
      const x = carrier.x * this.scale, y = carrier.y * this.scale;
      pixelLine(c, x - 5, y + 10, x + 5, y + 10, '#a7e8df');
      c.fillStyle = '#64b8b7'; c.fillRect(Math.round(x - 5), Math.round(y + 9), 1, 2);
      c.fillRect(Math.round(x + 5), Math.round(y + 9), 1, 2);
    } else if (role === 'gravity') {
      const field = e.getGravityState?.() || e.gravityField;
      if (field?.active && field.radius > 0) {
        const s = this.scale, distance = distanceOf(e);
        const lightRadius = Math.max(1, this.lightRadius * s);
        const carrierX = carrier.x * s, carrierY = carrier.y * s;
        const carrierLightRadius = (carrier.phase === 'cooldown' ? 13 + carrier.recovery * 7 : 26)
          * ART_SCALE * (this.lightDimScale || 1);
        let visible = 0;
        // Only mark packets that really moved. Short curved strokes sit beside
        // their measured velocity; no field ring or additional illumination.
        for (const packet of e.layout.embers) {
          if (visible >= 4) break;
          if (packet.collected || packet.carried || packet.harmful || packet.kind === 'dark'
            || !Number.isFinite(packet.gravityPulledAt) || e.time - packet.gravityPulledAt > .18
            || Math.hypot(packet.x - field.worldX, packet.y - field.y) > field.radius) continue;
          const x = (packet.x - distance) * s, y = packet.y * s;
          if (x < 0 || x > WIDTH || y < 0 || y > this.buffer.height) continue;
          const nearPlayer = clamp(1 - ((x - playerX) ** 2 + (y - playerY) ** 2) / lightRadius ** 2, 0, 1);
          const nearCarrier = clamp(1 - ((x - carrierX) ** 2 + (y - carrierY) ** 2) / carrierLightRadius ** 2, 0, 1) * .75;
          const visibility = Math.max(nearPlayer, nearCarrier) * light;
          if (visibility < .06) continue;
          const vx = Number(packet.gravityVx) || 0, vy = Number(packet.gravityVy) || 0;
          const speed = Math.hypot(vx, vy);
          if (speed < .1) continue;
          c.globalAlpha = visibility * (.18 + .2 * clamp(packet.gravityPullStrength || 0, 0, 1));
          if (e.reducedMotion) {
            c.fillStyle = '#a57bd1'; c.fillRect(Math.round(x - 4), Math.round(y), 1, 2);
          } else {
            const dx = vx / speed, dy = vy / speed, length = clamp(speed * .14 * s, 1, 4);
            const endX = x - dx * 3, endY = y - dy * 3;
            const midX = endX - dx * length * .5 - dy, midY = endY - dy * length * .5 + dx;
            pixelLine(c, endX - dx * length, endY - dy * length, midX, midY, '#a57bd1');
            pixelLine(c, midX, midY, endX, endY, '#d3b1f2');
          }
          visible++;
        }
      }
    }
    c.restore();
  }

  drawAbsorptions(e, t, playerX, playerY) {
    const c = this.bufferContext, s = this.scale;
    for (const effect of e.absorptionEffects || []) {
      const duration = Math.max(.1, Number(effect.duration) || .8);
      const age = Number.isFinite(effect.bornAt) ? t - effect.bornAt : duration - effect.life;
      const progress = clamp(age / duration, 0, 1);
      if (age < 0 || progress >= 1) continue;
      const dark = effect.kind === 'dark';
      const start = Math.max(0, Number(effect.startRadius) || 0);
      const orbit = clamp(Math.max(38, start), 34, 44);
      const initialAngle = Number(effect.initialAngle) || 0;
      const radiusAt = p => {
        if (e.reducedMotion) return start * (1 - p) ** 2;
        if (p < .20) return start + (orbit - start) * (1 - (1 - p / .20) ** 3);
        if (p < .48) return orbit;
        return orbit * (1 - clamp((p - .48) / .42, 0, 1) ** 3);
      };
      const angleAt = p => initialAngle + (e.reducedMotion ? 0 : TAU * (.35 * p + 3.4 * p ** 3));
      const pointAt = p => {
        const radius = radiusAt(p) * s, angle = angleAt(p);
        return [playerX + Math.cos(angle) * radius, playerY + Math.sin(angle) * radius];
      };
      // These short ghosts belong only to the retrieved packet's .8s orbit.
      // They follow the current player; they never leave a main-character trail.
      const ghosts = e.reducedMotion ? 0 : 3;
      for (let i = ghosts; i >= 0; i--) {
        const sample = progress - i * .025;
        if (sample < 0) continue;
        const [x, y] = pointAt(sample);
        this.drawPacket(Math.round(x), Math.round(y), { dark, tiny: !dark,
          alpha: (i ? .16 * (1 - i / 4) : 1) * clamp((1 - progress) * 3, 0, 1) });
      }
      if (progress > .84) {
        const impact = (progress - .84) / .16;
        const pulse = Math.sin(impact * Math.PI) * (e.reducedMotion ? .5 : 1);
        c.save();
        if (dark) {
          c.globalAlpha = pulse * .20; pixelDisc(c, playerX, playerY, Math.round(10 + impact * 12), '#010205');
          c.globalAlpha = pulse * .76; pixelDisc(c, playerX, playerY, Math.round(4 + pulse * 3), '#000000');
        } else {
          this.glow(playerX, playerY, Math.round(10 + pulse * 11), '#e8e3c5', pulse * .17);
          c.globalAlpha = pulse * .6; pixelDisc(c, playerX, playerY, Math.round(3 + pulse * 5), '#ffffe9');
        }
        c.restore();
      }
    }
  }

  drawWind(e, t, lightState) {
    const puffs = e.getDraftPuffs?.(t) || [];
    if (!puffs.length) return;
    const c = this.bufferContext, H = this.buffer.height, s = this.scale;
    const px = e.player.x * s, py = yOf(e) * s;
    const radius = Math.max(27, (this.lightRadius || Number(e.mod?.lightRadius) || 175) * s);
    const carrier = lightState || e.getWispState?.(yOf(e), t);
    const carrierX = (carrier?.x ?? e.player.x) * s, carrierY = (carrier?.y ?? yOf(e)) * s;
    const carrierRadius = (carrier?.phase === 'cooldown' ? 13 + carrier.recovery * 7 : 26) * ART_SCALE * (this.lightDimScale || 1);
    const visibility = (x, y) => {
      const playerDistance = ((x - px) ** 2 + (y - py) ** 2) / (radius * radius);
      const carrierDistance = ((x - carrierX) ** 2 + (y - carrierY) ** 2) / (carrierRadius * carrierRadius);
      const lit = Math.max(clamp((1 - playerDistance) * 1.5, 0, 1),
        carrier ? clamp((1 - carrierDistance) * .75, 0, .75) : 0) * (this.lightIntensity || 1);
      // A faint local mist hint can be scouted. This pass never clears fog or
      // changes the light on the terrain underneath it.
      return .12 + lit * .88;
    };
    for (const puff of puffs) {
      if (![puff.x, puff.y, puff.rx, puff.ry].every(Number.isFinite)) continue;
      const x = (puff.x - distanceOf(e)) * s, y = puff.y * s;
      const rx = puff.rx * s, ry = puff.ry * s;
      if (rx <= 0 || ry <= 0 || x + rx < -2 || x - rx > WIDTH + 2 || y + ry < 0 || y - ry > H) continue;
      const progress = clamp(Number(puff.progress) || 0, 0, 1);
      const power = clamp(Number(puff.strength) || 0, 0, 1);
      const opacity = clamp(Number.isFinite(puff.opacity) ? puff.opacity : 1, 0, 1);
      const warning = puff.phase === 'warning' || puff.phase === 'gather';
      const fading = puff.phase === 'fade' || puff.phase === 'fading';
      if (!opacity || puff.phase === 'idle' || puff.phase === 'spent') continue;
      const direction = puff.direction < 0 ? -1 : 1;
      const expansion = e.reducedMotion ? .94 : warning ? .66 + progress * .28 : .87 + progress * .10;
      const drift = e.reducedMotion ? 0 : (progress - .5) * ry * .14 * direction;
      const fade = fading ? 1 - progress : 1;
      const baseAlpha = opacity * fade * (warning ? .12 + progress * .10 : .20 + power * .20);
      const ink = warning ? '#adb6a3' : '#b1c8c1';
      c.save();
      // Exactly the physical field bounds, used only as a clip. There is no
      // drawn ellipse/range ring, solid AOE panel or whole-screen weather.
      c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.clip();
      const segment = (a, b, alpha = 1) => {
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const edge = clamp((1 - ((mx - x) / rx) ** 2 - ((my - y) / ry) ** 2) / .48, 0, 1);
        c.globalAlpha = baseAlpha * edge * visibility(mx, my) * alpha;
        if (c.globalAlpha > .008) pixelLine(c, ...a, ...b, ink);
      };
      const curls = [[-.50, -.24], [.10, -.54], [.48, -.08], [-.20, .40], [.35, .48], [0, -.77], [-.05, .77]];
      for (let i = 0; i < curls.length; i++) {
        const [u, v] = curls[i], cx = x + u * rx * expansion, cy = y + v * ry * expansion + drift;
        const turn = e.reducedMotion ? i * .7 : i * .7 + progress * direction * .65;
        const coilX = rx * (i < 5 ? .27 : .20) * expansion;
        const coilY = ry * (i < 5 ? .16 : .10) * expansion;
        let previous;
        for (let step = 0; step <= 12; step++) {
          const angle = turn + step / 12 * Math.PI * 1.35;
          const taper = 1 - step / 12 * .42;
          const point = [cx + Math.cos(angle) * coilX * taper, cy + Math.sin(angle) * coilY * taper];
          if (previous) segment(previous, point, i < 5 ? 1 : .6);
          previous = point;
        }
      }
      const arrowX = x + rx * .15, arrowY = y - direction * ry * .12;
      const arrows = !warning && power > .55 ? 2 : 1;
      for (let i = 0; i < arrows; i++) {
        const yy = arrowY + direction * i * 6;
        c.globalAlpha = opacity * fade * visibility(arrowX, yy) * (warning ? .27 : .46);
        pixelLine(c, arrowX - 3, yy - direction * 2, arrowX, yy + direction, ink);
        pixelLine(c, arrowX, yy + direction, arrowX + 3, yy - direction * 2, ink);
      }
      c.restore();
    }
  }

  drawPortal(e, t) {
    const refuge = e.getExitLandmark?.() || e.getExitPortal?.();
    if (!refuge) return;
    const c = this.bufferContext, x = Math.round(refuge.x * this.scale), y = Math.round(refuge.y * this.scale);
    c.save();
    this.glow(x, y, 16, '#b6bea5', .11);
    if (e.terrain === 'canopy') {
      // A little woven light under a living root roof, rather than a gateway.
      pixelLine(c, x - 13, y + 21, x - 10, y + 4, '#384b3a', 3);
      pixelLine(c, x - 10, y + 4, x - 9, y - 8, '#536345', 2);
      pixelLine(c, x + 14, y + 22, x + 10, y - 6, '#384b3a', 3);
      path(c, [[x - 15, y - 5], [x - 8, y - 15], [x + 4, y - 13],
        [x + 15, y - 5], [x + 6, y - 7], [x - 4, y - 4]]);
      c.fillStyle = '#4b6045'; c.fill();
      pixelLine(c, x - 8, y - 12, x + 9, y - 7, '#778466');
      pixelLine(c, x, y - 10, x, y - 3, '#6d7959');
      c.fillStyle = '#66775b'; c.fillRect(x - 4, y - 2, 9, 11); c.fillRect(x - 3, y - 4, 7, 14);
      c.fillStyle = '#b9c2a0'; c.fillRect(x - 2, y - 1, 5, 8);
      c.fillStyle = '#526347'; c.fillRect(x - 3, y + 2, 7, 1); c.fillRect(x - 3, y + 6, 7, 1);
      pixelLine(c, x - 13, y + 20, x - 20, y + 24, '#44563b', 2);
      pixelLine(c, x + 12, y + 20, x + 20, y + 23, '#44563b', 2);
    } else if (e.terrain === 'storm') {
      // Uneven cairn stones carry a hooded waylight in the mountain pass.
      for (const [dx, dy, width, height] of [[-13, 22, 26, 4], [-10, 18, 22, 4], [-7, 13, 16, 5]]) {
        c.fillStyle = '#444f50'; c.fillRect(x + dx, y + dy, width, height);
        c.fillStyle = '#79837b'; c.fillRect(x + dx + 2, y + dy, width - 5, 1);
      }
      c.fillStyle = '#404c4c'; c.fillRect(x - 7, y - 6, 15, 19);
      c.fillStyle = '#8d9888'; c.fillRect(x - 7, y - 7, 15, 2); c.fillRect(x - 9, y - 5, 19, 2);
      c.fillStyle = '#222e2f'; c.fillRect(x - 5, y - 3, 11, 13);
      c.fillStyle = '#c9d0af'; c.fillRect(x - 3, y - 1, 7, 8);
      c.fillStyle = '#65736b'; c.fillRect(x - 5, y + 8, 11, 2); c.fillRect(x, y - 2, 1, 11);
    } else {
      // Crooked old timber and a tarnished bracket support the refuge lantern.
      c.fillStyle = '#434c3d'; c.fillRect(x - 10, y + 23, 25, 4); c.fillRect(x - 6, y + 20, 19, 3);
      c.fillStyle = '#73775d'; c.fillRect(x - 7, y + 23, 12, 1);
      pixelLine(c, x + 11, y + 22, x + 13, y - 19, '#4b4835', 3);
      pixelLine(c, x + 12, y - 19, x - 3, y - 25, '#645e45', 3);
      pixelLine(c, x + 12, y - 8, x + 4, y - 21, '#4b4835', 2);
      pixelLine(c, x + 14, y + 19, x + 15, y - 18, '#8b8160');
      pixelLine(c, x - 2, y - 23, x - 1, y - 7, '#8d8b6c');
      c.fillStyle = '#545b43'; c.fillRect(x - 6, y - 6, 11, 16);
      c.fillStyle = '#929779'; c.fillRect(x - 7, y - 6, 13, 2); c.fillRect(x - 6, y + 9, 11, 2);
      c.fillStyle = '#bfc6a0'; c.fillRect(x - 4, y - 2, 7, 9);
      c.fillStyle = '#535d46'; c.fillRect(x - 1, y - 3, 1, 13);
    }
    c.globalAlpha = .9; c.fillStyle = '#eef0cf'; c.fillRect(x - 1, y, 2, 4);
    // Two quiet flecks suggest warm air; no orbit, rune or encircling effect.
    c.globalAlpha = .2; c.fillStyle = '#aeb99b';
    const drift = e.reducedMotion ? 0 : Math.round(Math.sin(t * .9) * 1.5);
    c.fillRect(x - 8, y + 4 + drift, 1, 1); c.fillRect(x + 7, y - 7 - drift, 1, 1);
    c.restore();
  }

  render(e = this.engine) {
    if (!this.ready || this.destroyed || !this.context) return;
    const c = this.bufferContext, t = timeOf(e), distance = distanceOf(e), s = this.scale;
    const identity = sceneryIdentity(e);
    const palette = { ...(PALETTES[e.terrain] || PALETTES.ruins), ...(MATERIALS[identity.scene] || {}) };
    this.canvas.dataset.levelIdentity = identity.id;
    const role = normalizeCompanionRole(e.companionRole || e.options?.companionRole);
    const companion = companionPalette(role);
    const config = getCompanionAbility(role);
    const ability = e.getAbilityState?.() || { role, active: role === 'swift' ? e.boostTime > 0 : e.abilityTime > 0,
      remaining: role === 'swift' ? e.boostTime : e.abilityTime, duration: config.duration };
    this.canvas.dataset.player = 'light';
    this.canvas.dataset.companionRole = role;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    this.drawSky(e, t, distance, palette);
    c.globalAlpha = .34; c.fillStyle = '#03080b'; c.fillRect(0, 0, this.buffer.width, this.buffer.height); c.globalAlpha = 1;
    this.drawTerrain(e, t, distance, palette);
    this.drawCollectibles(e, t, distance);
    this.drawBurstEffects(e, MAIN_LIGHT);
    this.drawMist(e, t, distance, palette);
    const state = e.getWispState?.(yOf(e), t) || { x: e.player.x - 29, y: yOf(e) + 19, homeX: e.player.x - 29, homeY: yOf(e) + 19, radius: 100, phase: 'ready', recovery: 1, carrying: false };
    const playerX = Math.round(e.player.x * s), playerY = Math.round(yOf(e) * s);
    this.lightFog(e, state, playerX, playerY);
    this.drawWind(e, t, state);
    this.drawCarrier(e, t, distance, state, companion);
    const tapAge = t - (e.lastFlapTime ?? -1000), tap = tapAge >= 0 && tapAge < .16 ? 1 - tapAge / .16 : 0;
    const boosted = role === 'swift' && ability.active;
    this.drawSpirit(playerX, playerY, MAIN_LIGHT, t, { boost: boosted, tap,
      fuel: clamp((e.flame ?? 100) / 100, 0, 1), reduced: e.reducedMotion, intensity: this.lightIntensity });
    this.drawCompanionAbility(e, t, playerX, playerY, state, ability);
    this.drawAbsorptions(e, t, playerX, playerY);
    for (const effect of e.pickupEffects || []) {
      if (effect.kind === 'dark' || effect.harmful) continue;
      const progress = 1 - clamp(effect.life / .72, 0, 1);
      c.globalAlpha = 1 - progress;
      const label = effect.restored > 0 ? `+${effect.restored} GLOW` : 'FULL';
      const labelX = clamp(Math.round(effect.x * s - label.length * 2), 2, WIDTH - label.length * 4 - 2);
      pixelText(c, label, labelX, Math.round(effect.y * s - 28 - progress * 10), '#f2d79a');
    }
    c.globalAlpha = 1;
    this.drawPortal(e, t);
    if (e.flash > 0) { c.globalAlpha = Math.min(.2, e.flash * 1.3); c.fillStyle = '#dbc2a1'; c.fillRect(0, 0, WIDTH, this.buffer.height); c.globalAlpha = 1; }
    this.context.imageSmoothingEnabled = false;
    this.context.drawImage(this.buffer, 0, 0, this.canvas.width, this.canvas.height);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.ready = false;
    if (this.engine.canvas.style) this.engine.canvas.style.opacity = this.originalOpacity;
    this.canvas?.remove();
    for (const item of this.terrainCache.values()) { item.canvas.width = 1; item.canvas.height = 1; }
    this.terrainCache.clear();
    if (this.buffer) { this.buffer.width = 1; this.buffer.height = 1; }
    if (this.fog) { this.fog.width = 1; this.fog.height = 1; }
    this.fogPixels = null; this.context = null; this.bufferContext = null; this.fogContext = null;
  }
}
