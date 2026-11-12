const TAU = Math.PI * 2;
const WIDTH = 195;
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
const ELEMENTS = {
  fire: { edge: '#623d2d', outer: '#b36b39', mid: '#dfa65b', core: '#f2d79a', bright: '#fff0c8', trail: '#98603b' },
  ice: { edge: '#344e58', outer: '#638f9b', mid: '#a0c7c8', core: '#deebe2', bright: '#f4f2d8', trail: '#527a88' },
};
const SPIRIT_PIXELS = {
  fire: ['00000010000', '00000121000', '00001221000', '00012221000', '00122322100', '01233433210', '12344444321', '12344444321', '01234443210', '00123332100', '00012221000', '00001110000'],
  ice: ['00000100000', '00001210000', '00012321000', '00123332100', '01233433210', '12334443321', '01234443210', '12334443321', '01233433210', '00123332100', '00012321000', '00001210000', '00000100000'],
};
const GLYPHS = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
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
    const moonX = Math.round(W * .77), moonY = Math.round(H * .15), moonR = Math.round(Math.min(18, H * .065));
    c.globalAlpha = .30; pixelDisc(c, moonX, moonY, moonR + 3, '#626e64');
    c.globalAlpha = 1; pixelDisc(c, moonX, moonY, moonR, '#a5afa0');
    pixelDisc(c, moonX + 6, moonY - 4, moonR - 2, palette.sky[0]);
    for (let layer = 0; layer < 3; layer++) {
      c.fillStyle = [palette.far, palette.middle, palette.near][layer];
      const points = [[0, H], [0, H * .8]], scroll = distance * this.scale * (.035 + layer * .045);
      for (let x = -4; x <= W + 4; x += 4) {
        const world = x + scroll;
        let ridge = Math.sin(world * .022 + layer * 1.4) * .55 + Math.sin(world * .049 + layer * 4.2) * .24 + Math.cos(world * .011) * .22;
        if (e.terrain === 'ruins') ridge = Math.round(ridge * 5) / 5;
        if (e.terrain === 'storm') ridge = Math.abs(ridge) * 1.3 - .25;
        points.push([x, Math.round(H * (.67 + layer * .09) + ridge * H * (.095 - layer * .015))]);
      }
      points.push([W, H]); path(c, points); c.fill();
    }
    if (e.terrain === 'canopy') this.drawDeadForest(t, distance, palette);
    else this.drawDistantRuins(distance, palette, e.terrain === 'storm');
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
    for (let layer = 0; layer < 4; layer++) {
      const y = Math.round(H * (.52 + layer * .125));
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
    const key = `${obstacle.id}:${top ? 'top' : 'floor'}:${this.buffer.height}:${e.terrain}`;
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
    const seed = Number(obstacle.id) || 0;
    for (let y = 0; y < canvas.height; y += 8) {
      c.fillStyle = (Math.floor(y / 8) + seed) % 3 === 0 ? palette.shade : palette.face;
      for (let x = 0; x < canvas.width; x += 12) c.fillRect(x, y + Math.floor(hash(Math.floor(x / 12), Math.floor(y / 8), seed) * 3), 12, 2);
    }
    for (let y = 1; y < canvas.height; y += 4) for (let x = 1; x < canvas.width; x += 4) {
      const n = hash(x, y, seed + 11);
      if (n < .23) { c.fillStyle = n < .10 ? palette.grain : palette.shade; c.fillRect(x + (y % 3), y, n < .05 ? 2 : 1, 1); }
    }
    const surface = shape.slice(2).reverse().map(([x, y]) => [Math.round(x * s + ox), Math.round(y * s + oy)]);
    const inward = top ? -1 : 1;
    for (let i = 1; i < surface.length; i++) {
      const a = surface[i - 1], b = surface[i];
      pixelLine(c, a[0], a[1] + inward * 2, b[0], b[1] + inward * 2, palette.face, 2);
      pixelLine(c, a[0], a[1], b[0], b[1], palette.rim);
    }
    for (let i = 3; i < surface.length - 2; i += 7) {
      const [x, y] = surface[i];
      if (e.terrain === 'canopy') {
        for (let step = 0; step < 10; step++) {
          const xx = x + Math.round(Math.sin(step * .5 + i) * 3);
          c.fillStyle = palette.shade; c.fillRect(xx, y + inward * (4 + step * 2), 2, 3);
          if (step < 3) { c.fillStyle = palette.grain; c.fillRect(xx - 2, y + inward * step, 3, 1); }
        }
      } else {
        pixelLine(c, x, y + inward * 6, x + (i % 2 ? 4 : -3), y + inward * 20, palette.shade);
        if (e.terrain === 'ruins') { c.fillStyle = palette.shade; c.fillRect(x - 4, y + inward * 9, 6, 2); }
        else { pixelLine(c, x - 3, y + inward, x + 3, y + inward, '#a7b8b5'); }
      }
    }
    if (obstacle.soft) {
      // Fire Wake's convertible brambles stay inside the real silhouette but
      // carry a distinct dry-vine weave and a few dormant amber thorn tips.
      for (let i = 5; i < surface.length - 3; i += 9) {
        const [x, y] = surface[i];
        pixelLine(c, x - 3, y + inward * 4, x + 3, y + inward * 17, '#785e42', 2);
        pixelLine(c, x + 2, y + inward * 8, x + 7, y + inward * 5, '#785e42');
        pixelLine(c, x, y + inward * 12, x - 5, y + inward * 10, '#785e42');
        c.fillStyle = '#be9356'; c.fillRect(x + 6, y + inward * 5, 1, 1);
      }
    }
    this.drawTerrainStory(c, surface, top, palette, obstacle, e.terrain, canvas.width);
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

  drawCollectibles(e, t, distance, element) {
    const c = this.bufferContext, s = this.scale;
    for (const ember of e.layout.embers) {
      if (ember.collected || ember.carried) continue;
      const x = Math.round((ember.x - distance) * s), y = Math.round(ember.y * s);
      if (x < -13 || x > WIDTH + 13) continue;
      const rich = ember.value === 3;
      // A small pool of light belongs to this cache, not to the entire screen.
      // It is still shaded by the fog pass, so scouting and carrier light matter.
      this.glow(x, y, rich ? 11 : 5, element.outer, rich ? .19 : .10);
      if (ember.pocket) {
        const side = ember.pocketSide === 'ceiling' ? -1 : 1;
        c.globalAlpha = rich ? .30 : .18;
        c.fillStyle = element.outer;
        c.fillRect(x - (rich ? 3 : 1), y + side * (rich ? 9 : 6), rich ? 7 : 3, 1);
        c.globalAlpha = 1;
      }
      if (rich) {
        // One enclosure and one joined base read as one valuable object. The
        // three attached facets cannot be mistaken for a trail of three hits.
        const pulse = e.reducedMotion ? .43 : .39 + Math.sin(t * 2.3 + ember.phase) * .075;
        c.globalAlpha = pulse;
        pixelLine(c, x, y - 8, x + 7, y, element.mid);
        pixelLine(c, x + 7, y, x, y + 8, element.mid);
        pixelLine(c, x, y + 8, x - 7, y, element.mid);
        pixelLine(c, x - 7, y, x, y - 8, element.mid);
        c.globalAlpha = .74;
        c.fillStyle = element.core;
        c.fillRect(x - 1, y - 8, 3, 1); c.fillRect(x - 1, y + 8, 3, 1);
        c.fillRect(x - 7, y - 1, 1, 3); c.fillRect(x + 7, y - 1, 1, 3);
        c.globalAlpha = 1;
        c.fillStyle = element.edge;
        c.fillRect(x - 4, y - 1, 9, 6);
        c.fillRect(x - 2, y - 5, 5, 9);
        c.fillRect(x - 5, y, 3, 4); c.fillRect(x + 3, y - 2, 3, 6);
        c.fillStyle = element.mid;
        c.fillRect(x - 1, y - 4, 3, 8);
        c.fillRect(x - 4, y + 1, 2, 3); c.fillRect(x + 3, y - 1, 2, 5);
        c.fillRect(x - 3, y + 3, 7, 1);
        c.fillStyle = element.core;
        c.fillRect(x, y - 4, 1, 7);
        c.fillRect(x - 3, y + 1, 1, 2); c.fillRect(x + 3, y - 1, 1, 3);
        c.fillStyle = element.bright;
        c.fillRect(x, y - 5, 1, 2); c.fillRect(x - 1, y - 2, 2, 2);
        c.fillRect(x + 3, y - 2, 1, 1);
      } else {
        // Ordinary fuel keeps a quiet, single-facet silhouette.
        c.fillStyle = element.edge;
        c.fillRect(x - 1, y - 3, 3, 6); c.fillRect(x - 2, y - 1, 5, 2);
        c.fillStyle = element.mid;
        c.fillRect(x, y - 2, 1, 5); c.fillRect(x - 1, y - 1, 3, 2);
        c.fillStyle = element.core;
        c.fillRect(x, y - 2, 1, 3);
        c.fillStyle = element.bright;
        c.fillRect(x, y - 2, 1, 1);
      }
    }
    c.globalAlpha = 1;
  }

  drawBurstEffects(e, element) {
    const c = this.bufferContext, s = this.scale;
    for (const p of (e.particles || []).slice(-90)) {
      c.globalAlpha = clamp(p.life / p.maxLife, 0, 1) * .7;
      c.fillStyle = p.type === 'spark' ? element.core : element.outer;
      c.fillRect(Math.round(p.x * s), Math.round(p.y * s), p.type === 'spark' ? 2 : 1, 1);
    }
    c.globalAlpha = 1;
  }

  lightFog(e, state, playerX, playerY) {
    const c = this.bufferContext, W = this.buffer.width, H = this.buffer.height, s = this.scale;
    this.lightRadius = Math.max(40, Number(e.mod?.lightRadius) || 175);
    const radius = this.lightRadius * s, radius2 = radius * radius;
    const carrierX = state.x * s, carrierY = state.y * s;
    const carrierRadius2 = (state.phase === 'cooldown' ? 13 + state.recovery * 7 : 26) ** 2;
    const pixels = this.fogPixels.data, dither = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const distance2 = (x - playerX) ** 2 + (y - playerY) ** 2;
      const carrier2 = (x - carrierX) ** 2 + (y - carrierY) ** 2;
      const playerShade = clamp((distance2 / radius2 - .10) / .90, 0, 1);
      const carrierShade = clamp((carrier2 / carrierRadius2 - .08) / .92, 0, 1);
      const shade = Math.min(playerShade, carrierShade);
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

  drawSpirit(x, y, element, t, { small = false, boost = false, tap = 0, fuel = 1, reduced = false, intensity = 1 } = {}) {
    const c = this.bufferContext;
    c.save();
    const flicker = reduced ? 0 : Math.sin(t * (boost ? 22 : 12));
    this.glow(x, y, small ? 10 : boost ? 32 : 27, element.outer, (small ? .12 : .22) * intensity);
    if (small) {
      c.globalAlpha *= intensity;
      c.fillStyle = element.edge; c.fillRect(x - 2, y - 2, 5, 5);
      c.fillStyle = element.outer; c.fillRect(x - 1, y - 4, 3, 7);
      c.fillStyle = element.mid; c.fillRect(x - 2, y, 5, 2);
      c.fillStyle = element.core; c.fillRect(x, y - 2, 2, 4);
      c.fillStyle = element.bright; c.fillRect(x, y - 1, 2, 2);
      if (element === ELEMENTS.ice) { c.fillStyle = element.mid; c.fillRect(x - 3, y, 1, 1); c.fillRect(x + 3, y, 1, 1); }
      c.restore(); return;
    }
    // Twice the sprite size, with a round halo instead of a directional tail.
    c.translate(x, y); c.scale(2, 2); x = 0; y = 0;
    c.globalAlpha = clamp(.58 + fuel * .42, .58, 1);
    const rows = SPIRIT_PIXELS[element === ELEMENTS.ice ? 'ice' : 'fire'];
    const inks = [null, element.edge, element.outer, element.mid, element.core];
    const sway = Math.round(flicker + tap * 1.5);
    for (let yy = 0; yy < rows.length; yy++) for (let xx = 0; xx < rows[yy].length; xx++) {
      const value = Number(rows[yy][xx]);
      if (!value) continue;
      c.fillStyle = inks[value];
      c.fillRect(x + xx - 5 + (yy < 4 ? sway : 0), y + yy - 6 - (yy < 4 ? Math.round(tap * 2) : 0), 1, 1);
    }
    c.fillStyle = element.bright; c.fillRect(x, y - 1, 1, 3);
    if (element === ELEMENTS.ice) {
      c.fillStyle = element.mid; c.fillRect(x - 6, y, 1, 1); c.fillRect(x + 6, y, 1, 1);
      c.fillStyle = element.bright; c.fillRect(x, y + 6, 1, 1);
    }
    c.globalAlpha = 1;
    if (tap > .05) {
      c.globalAlpha = tap * .7;
      for (let i = 0; i < 9; i++) {
        const angle = i / 9 * TAU, r = 7 + (1 - tap) * 4;
        c.fillStyle = element.mid; c.fillRect(Math.round(x + Math.cos(angle) * r), Math.round(y + Math.sin(angle) * r), 1, 1);
      }
      c.globalAlpha = 1;
    }
    c.restore();
  }

  drawCarrier(e, t, distance, state, element) {
    const c = this.bufferContext, s = this.scale;
    const x = Math.round(state.x * s), y = Math.round(state.y * s);
    const homeX = state.homeX * s, homeY = state.homeY * s;
    const cooling = state.phase === 'cooldown';
    const radius = state.radius * s, dots = Math.round(TAU * radius / 4);
    c.globalAlpha = cooling ? .07 + state.recovery * .12 : state.phase === 'ready' ? .46 : .25;
    for (let dot = 0; dot < dots; dot++) {
      const angle = dot / dots * TAU;
      c.fillStyle = element.core;
      c.fillRect(Math.round(homeX + Math.cos(angle) * radius), Math.round(homeY + Math.sin(angle) * radius), 1, 1);
    }
    c.globalAlpha = 1;
    this.drawSpirit(x, y, element, t, { small: true, reduced: e.reducedMotion,
      intensity: cooling ? .25 + state.recovery * .45 : 1 });
    if (cooling) {
      for (let i = 0; i < 10; i++) {
        const angle = i / 10 * TAU;
        c.fillStyle = i / 10 < state.recovery ? element.mid : '#3a4747';
        c.fillRect(Math.round(x + Math.cos(angle) * 6), Math.round(y + Math.sin(angle) * 6), 1, 1);
      }
    }
    if (state.carrying) {
      c.fillStyle = '#a18b51'; c.fillRect(x + 3, y + 3, 3, 3);
      c.fillStyle = '#e2cd8c'; c.fillRect(x + 4, y + 3, 1, 2);
    }
  }

  drawWind(e, t, lightState) {
    const gust = e.gustState?.();
    if (!gust?.active && !gust?.warning) return;
    const c = this.bufferContext, H = this.buffer.height, s = this.scale;
    const px = e.player.x * s, py = yOf(e) * s;
    const radius = Math.max(27, (this.lightRadius || Number(e.mod?.lightRadius) || 175) * s);
    const carrier = lightState || e.getWispState?.(yOf(e), t);
    const carrierX = (carrier?.x ?? e.player.x) * s, carrierY = (carrier?.y ?? yOf(e)) * s;
    const carrierRadius = carrier?.phase === 'cooldown' ? 17 : 25;
    const direction = gust.direction < 0 ? -1 : 1;
    const intensity = clamp(Number(gust.intensity) || .6, .35, 1.3);
    const warningProgress = clamp(Number(gust.warningProgress) || 0, 0, 1);
    const power = gust.active ? clamp(Number(gust.strength) || 0, 0, 1) : .08 + warningProgress * .18;
    const warning = gust.warning && !gust.active;
    const ink = warning ? '#bcb59c' : '#aac5c2';
    c.save();
    // This pass sits above fog, but its mask is restricted to light that is
    // already present. A gust must not expose remote terrain or hidden caches.
    c.beginPath(); c.arc(px, py, radius * .92, 0, TAU);
    if (carrier) { c.moveTo(carrierX + carrierRadius, carrierY); c.arc(carrierX, carrierY, carrierRadius, 0, TAU); }
    c.clip();
    if (!e.reducedMotion) {
      const count = warning ? 12 : Math.round(14 + intensity * 11);
      const span = H + 34, speed = warning ? 12 + warningProgress * 11 : 42 + intensity * 34;
      const distance = distanceOf(e);
      for (let i = 0; i < count; i++) {
        const x = Math.round(px - radius + (((i * 31 - distance * .025) % (radius * 2)) + radius * 2) % (radius * 2));
        const y = Math.round((((i * 53 + t * speed * direction) % span) + span) % span - 17);
        const playerDistance = ((x - px) ** 2 + (y - py) ** 2) / (radius * radius);
        const carrierDistance = ((x - carrierX) ** 2 + (y - carrierY) ** 2) / (carrierRadius * carrierRadius);
        const visibility = Math.max(clamp((1 - playerDistance) * 1.7, 0, 1), carrier ? clamp((1 - carrierDistance) * .75, 0, .75) : 0);
        if (visibility <= .025) continue;
        const length = Math.round(warning ? 3 + warningProgress * 3 : 5 + intensity * 4 + power * 4 + i % 3);
        const curl = Math.round(Math.sin(t * 1.5 + i * 1.7) * (warning ? 1 : 2));
        c.globalAlpha = visibility * (warning ? .12 + warningProgress * .20 : .19 + power * .31);
        pixelLine(c, x + curl, y - direction * length, x, y, ink);
        if (!warning && power > .3) {
          c.globalAlpha = visibility * (.20 + power * .32);
          c.fillStyle = '#dde3d7'; c.fillRect(x, y, 1, 2);
        }
      }
    }
    // Compact arrowheads communicate upward versus downward force before the
    // pulse arrives, including a static readable mode for reduced motion.
    const arrowX = Math.round(px + radius * .73);
    const arrowY = Math.round(clamp(py + direction * radius * .25, 16, H - 16));
    const arrows = warning ? (warningProgress > .58 ? 2 : 1) : intensity > .95 ? 3 : 2;
    c.globalAlpha = warning ? .32 + warningProgress * .37 : .50 + power * .35;
    for (let i = 0; i < arrows; i++) {
      const y = arrowY + direction * i * 6;
      pixelLine(c, arrowX - 3, y - direction * 2, arrowX, y + direction, warning ? '#d0c5a7' : '#dce5d9');
      pixelLine(c, arrowX, y + direction, arrowX + 3, y - direction * 2, warning ? '#d0c5a7' : '#dce5d9');
    }
    c.restore();
  }

  drawPortal(e, t) {
    const portal = e.getExitPortal?.();
    if (!portal) return;
    const c = this.bufferContext, x = Math.round(portal.x * this.scale), y = Math.round(portal.y * this.scale);
    this.glow(x, y, 22, '#a9b9a0', .12);
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * TAU;
      c.fillStyle = i % 4 === Math.floor(t * 6) % 4 ? '#e3e6c4' : '#879d8e';
      c.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(y + Math.sin(a) * 17), 1, 2);
    }
    c.fillStyle = '#69736a'; c.fillRect(x - 10, y + 17, 20, 2);
  }

  render(e = this.engine) {
    if (!this.ready || this.destroyed || !this.context) return;
    const c = this.bufferContext, t = timeOf(e), distance = distanceOf(e), s = this.scale;
    const palette = PALETTES[e.terrain] || PALETTES.ruins;
    const chosen = e.options?.element === 'ice' ? 'ice' : 'fire';
    const element = ELEMENTS[chosen], companion = ELEMENTS[chosen === 'fire' ? 'ice' : 'fire'];
    this.canvas.dataset.element = chosen;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    this.drawSky(e, t, distance, palette);
    c.globalAlpha = .34; c.fillStyle = '#03080b'; c.fillRect(0, 0, this.buffer.width, this.buffer.height); c.globalAlpha = 1;
    this.drawTerrain(e, t, distance, palette);
    this.drawCollectibles(e, t, distance, element);
    this.drawBurstEffects(e, element);
    this.drawMist(e, t, distance, palette);
    const state = e.getWispState?.(yOf(e), t) || { x: e.player.x - 29, y: yOf(e) + 19, homeX: e.player.x - 29, homeY: yOf(e) + 19, radius: 100, phase: 'ready', recovery: 1, carrying: false };
    const playerX = Math.round(e.player.x * s), playerY = Math.round(yOf(e) * s);
    this.lightFog(e, state, playerX, playerY);
    this.drawWind(e, t, state);
    this.drawCarrier(e, t, distance, state, companion);
    const tapAge = t - (e.lastFlapTime ?? -1000), tap = tapAge >= 0 && tapAge < .16 ? 1 - tapAge / .16 : 0;
    const speed = (Number(e.baseSpeed) || 154) / 154;
    const boosted = e.boostTime > 0;
    this.drawSpirit(playerX, playerY, element, t * speed, { boost: boosted, tap, fuel: clamp((e.flame ?? 100) / 100, 0, 1), reduced: e.reducedMotion });
    if (e.shield > 0 || e.invincible > 0 || e.exitProtection > 0) {
      c.globalAlpha = e.shield > 0 ? .7 : .45;
      for (let i = 0; i < 18; i++) {
        const angle = i / 18 * TAU + (e.reducedMotion ? 0 : t * .3);
        c.fillStyle = '#bac8ad'; c.fillRect(Math.round(playerX + Math.cos(angle) * 9), Math.round(playerY + Math.sin(angle) * 9), 1, 1);
      }
      c.globalAlpha = 1;
    }
    for (const effect of e.pickupEffects || []) {
      const progress = 1 - clamp(effect.life / .72, 0, 1);
      c.globalAlpha = 1 - progress;
      pixelText(c, `+${effect.restored || effect.value || 1}`, Math.round(effect.x * s + 3), Math.round(effect.y * s - 9 - progress * 8), element.core);
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
