import { resolveLevelIdentity } from './level-catalog.mjs';

const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const noise = (x, seed = 0) => {
  let n = Math.imul((x | 0) ^ seed, 1597334677);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
};
export function sceneryIdentity(engine) {
  if (engine.levelIdentity?.scene) return engine.levelIdentity;
  return resolveLevelIdentity(typeof engine.levelIdentity === 'string' ? engine.levelIdentity
    : engine.options?.node?.levelId, engine.terrain, engine.seed);
}
export function scenerySeed(value) {
  let n = 2166136261;
  for (const letter of String(value)) n = Math.imul(n ^ letter.charCodeAt(0), 16777619);
  return n >>> 0;
}

function arc(c, line, x, y, rx, ry, from, to, ink, width = 1) {
  let previous;
  const steps = Math.max(9, Math.round(Math.abs(to - from) * Math.max(rx, ry) / 4));
  for (let i = 0; i <= steps; i++) {
    const a = from + (to - from) * i / steps, point = [x + Math.cos(a) * rx, y + Math.sin(a) * ry];
    if (previous) line(c, ...previous, ...point, ink, width);
    previous = point;
  }
}

// All silhouettes here are distant scenery. They are drawn beneath the same
// darkness/light passes as the old landscape, with no extra light sources.
export function drawIdentityBackground(c, { identity, width: W, height: H, distance, palette: p }, h) {
  const { line, disc, polygon } = h, scene = identity.scene;
  c.save();
  const moonX = W * (scene === 'chasm' ? .62 : scene === 'belfry' ? .30 : .78);
  const moonY = H * (scene === 'hanging' || scene === 'glass' ? .31 : .16);
  c.globalAlpha = .64;
  disc(c, Math.round(moonX), Math.round(moonY), scene === 'chasm' ? 26 : 15, '#8e9b91');
  if (scene !== 'chasm') disc(c, Math.round(moonX + 5), Math.round(moonY - 3), 13, p.sky[0]);
  else {
    c.globalAlpha = .32;
    disc(c, Math.round(W * .28), Math.round(H * .26), 9, '#9aa5b0');
    line(c, moonX - 12, moonY + 5, moonX + 16, moonY - 7, p.middle);
  }
  c.globalAlpha = .78;
  const scroll = distance * .025;
  const polygonFill = (points, ink) => { c.fillStyle = ink; polygon(c, points); c.fill(); };
  if (scene === 'aqueduct') {
    for (let layer = 0; layer < 2; layer++) {
      const span = layer ? 185 : 240, offset = scroll * (layer ? 1.5 : .6);
      const first = Math.floor(offset / span);
      for (let site = -1; site < W / span + 1; site++) {
        const id = first + site, x = Math.round(site * span - offset % span), y = Math.round(H * (layer ? .81 : .65));
        const ink = layer ? p.middle : p.far;
        c.fillStyle = ink;
        c.fillRect(x, y, span - 19, 7); c.fillRect(x + 8, y - 4, span - 47, 4);
        for (let pier = 0; pier < 4; pier++) {
          const px = x + pier * 45;
          if ((id + pier) % 5 === 2) { c.fillRect(px, y + 6, 7, 13); continue; }
          c.fillRect(px, y + 5, 8, H - y);
          arc(c, line, px + 25, y + 27, 17, 20, Math.PI, TAU, ink, 4);
          c.fillRect(px + 41, y + 17, 7, H - y);
        }
      }
    }
  } else if (scene === 'belfry') {
    const x = Math.round(W * .38 - scroll * .22), y = Math.round(H * .84);
    polygonFill([[x - 21, y], [x - 19, y - 138], [x - 6, y - 149], [x + 2, y - 138],
      [x + 15, y - 140], [x + 21, y - 98], [x + 25, y]], p.far);
    c.fillStyle = p.middle; c.fillRect(x - 20, y - 102, 42, 4); c.fillRect(x - 18, y - 61, 41, 4);
    c.fillStyle = p.sky[1]; c.fillRect(x - 8, y - 124, 16, 23);
    arc(c, line, x, y - 123, 8, 6, Math.PI, TAU, p.middle, 2);
    line(c, x, y - 122, x, y - 113, p.middle);
    polygonFill([[x - 5, y - 112], [x - 8, y - 103], [x + 9, y - 103], [x + 5, y - 112]], p.middle);
    polygonFill([[0, H], [0, y + 7], [W, y - 1], [W, H]], p.far);
    c.globalAlpha = .34;
    for (let i = 0; i < 17; i++) {
      const xx = Math.round(noise(i, 4) * W), yy = y + 3 + i * 4;
      c.fillStyle = p.mist; c.fillRect(xx, yy, 9 + Math.round(noise(i, 7) * 27), 1);
    }
  } else if (scene === 'ossuary') {
    polygonFill([[0, 0], [W, 0], [W, H * .12], [W * .74, H * .21], [W * .5, H * .15], [W * .24, H * .25], [0, H * .19]], p.far);
    const stride = 117, offset = scroll * .65;
    for (let rib = -1; rib < 4; rib++) {
      const x = Math.round(rib * stride - offset % stride + 55), y = H * .82;
      arc(c, line, x, y, 65, H * .53, Math.PI, TAU, p.middle, 4);
      arc(c, line, x + 3, y, 57, H * .49, Math.PI, TAU, p.far, 2);
      for (let joint = 0; joint < 7; joint++) {
        const a = Math.PI + joint / 6 * Math.PI;
        c.fillStyle = p.middle; c.fillRect(Math.round(x + Math.cos(a) * 65) - 2, Math.round(y + Math.sin(a) * H * .53), 5, 4);
      }
    }
  } else if (scene === 'elder') {
    for (let tree = -1; tree < 3; tree++) {
      const x = Math.round(tree * 173 - scroll * .9 % 173 + 28), y = H * .94;
      polygonFill([[x - 28, y], [x - 13, y - 74], [x - 24, y - 170], [x - 9, y - 219],
        [x + 5, y - 183], [x + 13, y - 112], [x + 22, y - 37], [x + 49, y]], p.far);
      arc(c, line, x + 1, y - 96, 12, 26, 0, TAU, p.sky[1], 7);
      for (let branch = 0; branch < 4; branch++) {
        const sign = branch % 2 ? -1 : 1, yy = y - 85 - branch * 28;
        line(c, x, yy, x + sign * 46, yy - 23, p.far, 7 - branch);
        line(c, x + sign * 40, yy - 20, x + sign * 68, yy - 51, p.far, 3);
      }
      for (let root = -2; root <= 2; root++) line(c, x, y - 23, x + root * 20, y, p.middle, 3);
    }
  } else if (scene === 'fen') {
    const water = Math.round(H * .82);
    polygonFill([[0, H], [0, water], [W, water - 3], [W, H]], p.far);
    for (let reed = -1; reed < 26; reed++) {
      const world = Math.floor(scroll) + reed * 13, x = Math.round(reed * 13 - scroll % 13);
      const y = water + Math.round(noise(world, 3) * 22), height = 12 + noise(world, 5) * 34;
      line(c, x, y, x + noise(world, 6) * 9 - 4, y - height, p.middle);
      line(c, x, y - height * .4, x - 7, y - height * .7, p.far);
      if (reed % 3 === 0) { c.fillStyle = p.middle; c.fillRect(x - 1, Math.round(y - height), 2, 7); }
    }
    c.globalAlpha = .26;
    for (let i = 0; i < 18; i++) { c.fillStyle = p.mist; c.fillRect(Math.round(noise(i, 14) * W), water + i * 4, 12 + i % 5 * 6, 1); }
  } else if (scene === 'hanging') {
    polygonFill([[0, 0], [W, 0], [W, H * .15], [W * .8, H * .11], [W * .66, H * .24],
      [W * .4, H * .13], [W * .21, H * .21], [0, H * .1]], p.far);
    const offset = scroll * 1.3;
    for (let root = -1; root < 13; root++) {
      const id = Math.floor(offset / 27) + root, x = Math.round(root * 27 - offset % 27);
      const length = H * (.18 + noise(id, 21) * .36);
      let previous = [x, H * .08];
      for (let step = 1; step <= 8; step++) {
        const point = [x + Math.sin(step * .7 + id) * 9, H * .08 + length * step / 8];
        line(c, ...previous, ...point, p.far, step < 4 ? 4 : 2); previous = point;
      }
      if (id % 3 === 0) arc(c, line, x + 13, H * .11 + length * .55, 16, 9, 0, Math.PI, p.middle, 2);
    }
  } else if (scene === 'ridge') {
    for (let layer = 0; layer < 3; layer++) {
      const stride = 110 + layer * 29, offset = scroll * (.5 + layer * .8), points = [[-10, H]];
      for (let peak = -1; peak < W / stride + 2; peak++) {
        const id = Math.floor(offset / stride) + peak, x = peak * stride - offset % stride;
        const y = H * (.58 + layer * .1) - noise(id, 18) * 48;
        points.push([x, y + 57], [x + stride * .31, y + 25], [x + stride * .42, y - 15],
          [x + stride * .59, y + 22], [x + stride * .78, y + 11], [x + stride, y + 68]);
      }
      points.push([W + 20, H]); polygonFill(points, [p.far, p.middle, p.shade][layer]);
    }
  } else if (scene === 'chasm') {
    // A broad empty gulf replaces the normal repeating mountain horizon.
    const drift = scroll * .2;
    polygonFill([[0, H * .45], [31 - drift, H * .51], [54 - drift, H * .72], [39 - drift, H], [0, H]], p.far);
    polygonFill([[W, H * .31], [W - 24 - drift, H * .42], [W - 44 - drift, H * .76], [W - 26, H], [W, H]], p.middle);
    c.globalAlpha = .42;
    polygonFill([[W * .24, H], [W * .27, H * .90], [W * .48, H * .87], [W * .6, H * .93], [W * .64, H]], p.far);
    line(c, W * .13, H * .84, W * .36, H * .86, p.middle, 2);
    line(c, W * .66, H * .86, W * .91, H * .82, p.middle, 2);
  } else if (scene === 'glass') {
    const step = 67, offset = scroll * .9;
    for (let shard = -1; shard < 6; shard++) {
      const id = Math.floor(offset / step) + shard, x = shard * step - offset % step;
      const deep = 31 + noise(id, 22) * H * .27;
      polygonFill([[x - 18, 0], [x + 33, 0], [x + 15, deep], [x + 4, deep - 17]], p.far);
      polygonFill([[x + 4, deep - 17], [x + 15, deep], [x + 13, 0]], p.middle);
      const y = H * (.82 + noise(id, 6) * .08);
      polygonFill([[x - 10, H], [x + 8, y - 35], [x + 29, y], [x + 42, H]], p.far);
      line(c, x + 8, y - 35, x + 17, H, p.middle);
    }
  }
  c.restore();
}

// Everything in this function is clipped by the caller to the real terrain
// polygon. Relief marks never protrude into a passage or suggest a fake ledge.
export function drawIdentityMaterial(c, { identity, surface, top, palette: p, width: W, height: H,
  obstacle, hardEntry }, h) {
  const { line, polygon } = h, scene = identity.scene, sign = top ? -1 : 1;
  const seed = scenerySeed(`${identity.id}:${obstacle.id}:${top}`);
  const at = x => {
    for (let i = 1; i < surface.length; i++) {
      const a = surface[i - 1], b = surface[i];
      if (x >= a[0] && x <= b[0] && b[0] !== a[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    }
    return surface[Math.floor(surface.length / 2)][1];
  };
  const filled = (points, ink) => { c.fillStyle = ink; polygon(c, points); c.fill(); };
  // Sparse grain is shared; the larger structures below define each material.
  for (let y = 1; y < H; y += 6) for (let x = 1; x < W; x += 5) {
    const n = noise(x + y * 37, seed);
    if (n < .15) { c.fillStyle = n < .055 ? p.grain : p.shade; c.fillRect(x, y, 1, 1); }
  }
  if (scene === 'aqueduct') {
    for (let row = 0; row < H; row += 10) {
      const offset = Math.floor(noise(row, seed) * 11);
      for (let x = -offset; x < W; x += 15 + row % 3 * 3) {
        const size = 11 + Math.floor(noise(x + row, seed) * 7);
        c.fillStyle = noise(x + row, seed) > .3 ? p.face : p.stone;
        c.fillRect(x, row, size, 7); c.fillStyle = p.shade; c.fillRect(x + size, row, 1, 9);
      }
    }
    if (seed % 3 === 0 || hardEntry) {
      const x = W * (.32 + noise(seed, 2) * .36), y = at(x) + sign * 31;
      arc(c, line, x, y, 20, 17, top ? 0 : Math.PI, top ? Math.PI : TAU, p.shade, 5);
      arc(c, line, x, y, 22, 20, top ? 0 : Math.PI, top ? Math.PI : TAU, p.grain, 2);
      line(c, x - 21, y, x - 21, y + sign * 19, p.shade, 3);
      line(c, x + 21, y, x + 21, y + sign * 23, p.shade, 3);
    }
  } else if (scene === 'belfry') {
    for (let x = 0; x < W; x += 13) {
      const edge = at(x), depth = 30 + noise(x, seed) * 95;
      line(c, x, edge + sign * 6, x + 2, edge + sign * depth, p.shade, 3);
      for (let row = 15; row < depth; row += 22) { c.fillStyle = p.face; c.fillRect(x - 2, Math.round(edge + sign * row), 11, 2); }
    }
    if (seed % 4 === 0 || hardEntry) {
      const bx = W * (.25 + noise(seed, 3) * .5), by = at(bx) + sign * 27;
      line(c, bx, by - sign * 17, bx, by - sign * 5, p.grain);
      filled([[bx - 6, by - sign * 5], [bx - 11, by + sign * 12], [bx + 11, by + sign * 12], [bx + 6, by - sign * 5]], p.shade);
      arc(c, line, bx, by + sign * 12, 11, 4, 0, TAU, p.grain);
      c.fillStyle = p.grain; c.fillRect(Math.round(bx), Math.round(by + sign * 16), 2, 3);
    }
    for (let band = 35; band < 84; band += 9) line(c, 0, at(0) + sign * band, W, at(W) + sign * (band + 8), band % 2 ? p.face : p.shade);
  } else if (scene === 'ossuary') {
    for (let x = 9; x < W; x += 34) {
      const y = at(x) + sign * (12 + noise(x, seed) * 16);
      arc(c, line, x, y + sign * 19, 13, 20, top ? 0 : Math.PI, top ? Math.PI : TAU, p.grain, 3);
      arc(c, line, x, y + sign * 19, 9, 15, top ? 0 : Math.PI, top ? Math.PI : TAU, p.shade, 2);
      for (let vertebra = 0; vertebra < 7; vertebra++) {
        const yy = y + sign * (22 + vertebra * 5);
        c.fillStyle = vertebra % 2 ? p.face : p.grain; c.fillRect(x - 2, Math.round(yy), 5, 3);
      }
      if (noise(x, seed) > .5) {
        c.fillStyle = p.grain; c.fillRect(x + 12, Math.round(y + sign * 27), 7, 6);
        c.fillStyle = p.shade; c.fillRect(x + 13, Math.round(y + sign * 28), 2, 2); c.fillRect(x + 16, Math.round(y + sign * 28), 2, 2);
      }
    }
  } else if (scene === 'elder' || scene === 'hanging') {
    const spacing = scene === 'elder' ? 14 : 8;
    for (let x = -5; x < W + 5; x += spacing) {
      let previous = [x, at(x) + sign * 2];
      for (let depth = 6; depth < 115; depth += 5) {
        const bend = scene === 'elder' ? Math.sin(depth * .055 + x * .07) * 10 : Math.sin(depth * .025 + x) * 3;
        const point = [x + bend, at(x) + sign * depth];
        line(c, ...previous, ...point, p.shade, scene === 'elder' ? 3 : 2);
        line(c, previous[0] + 2, previous[1], point[0] + 2, point[1], p.face);
        previous = point;
      }
    }
    if (scene === 'elder' && seed % 2 === 0) {
      const x = W * (.3 + noise(seed, 8) * .4), y = at(x) + sign * 37;
      for (let ring = 0; ring < 4; ring++) arc(c, line, x, y, 6 + ring * 5, 11 + ring * 4, 0, TAU, ring % 2 ? p.grain : p.shade, 2);
    }
    if (scene === 'hanging') for (let x = 12; x < W; x += 31) {
      const y = at(x) + sign * 25;
      arc(c, line, x + 7, y, 10, 17, 0, Math.PI * 1.6, p.grain);
      line(c, x + 10, y + sign * 13, x + 18, y + sign * 30, p.shade, 2);
    }
  } else if (scene === 'fen') {
    for (let x = 0; x < W; x += 9) {
      const y = at(x), tilt = noise(x, seed) * 12 - 6;
      line(c, x, y + sign * 34, x + tilt, y + sign * 3, p.shade, 2);
      line(c, x, y + sign * 20, x + 8, y + sign * 12, p.grain);
      c.fillStyle = p.face; c.fillRect(x - 3, Math.round(y + sign * 6), 7, 2);
      for (let puddle = 1; puddle < 4; puddle++) {
        c.fillStyle = puddle % 2 ? '#293c35' : p.shade;
        c.fillRect(x - 4, Math.round(y + sign * (20 + puddle * 12)), 13, 3);
      }
    }
  } else if (scene === 'ridge') {
    for (let x = -10; x < W; x += 27) {
      const y = at(x), depth = 38 + noise(x, seed) * 54;
      filled([[x, y + sign * 2], [x + 26, at(x + 26) + sign * 6], [x + 12, y + sign * depth]], p.face);
      filled([[x + 26, at(x + 26) + sign * 6], [x + 33, y + sign * (depth + 9)], [x + 12, y + sign * depth]], p.shade);
      line(c, x + 3, y + sign * 5, x + 12, y + sign * depth, p.grain);
    }
  } else if (scene === 'chasm') {
    for (let x = 5; x < W; x += 23) {
      const y = at(x), shear = noise(x, seed) * 18 - 9;
      line(c, x, y + sign * 3, x + shear, y + sign * 160, p.shade, 4);
      line(c, x + 3, y + sign * 10, x + shear + 4, y + sign * 151, p.face);
    }
    for (let band = 9; band < 120; band += 13) {
      let previous = [0, at(0) + sign * band];
      for (let x = 13; x <= W; x += 13) {
        const point = [x, at(x) + sign * (band + Math.sin(x * .025 + band) * 5)];
        line(c, ...previous, ...point, band % 2 ? p.grain : p.face); previous = point;
      }
    }
  } else if (scene === 'glass') {
    for (let x = -12; x < W; x += 18) {
      const y = at(x) + sign * 3, depth = 20 + noise(x, seed) * 74, width = 8 + noise(x + 3, seed) * 13;
      const tip = [x + width * .35, y + sign * depth];
      filled([[x, y], [x + width, y + sign * 7], tip], p.face);
      filled([[x + width, y + sign * 7], [x + width + 9, y + sign * depth * .65], tip], p.shade);
      line(c, x + 1, y, ...tip, p.grain);
      if (noise(x, seed) > .6) line(c, x + width, y + sign * 7, x + width + 5, y + sign * depth * .5, '#a2b7bb');
    }
  }
  if (hardEntry) {
    // Three inlaid stitches and a worn edge glint announce a challenge. They
    // remain inside the wall, unlike a floating barrier or collectible.
    const x = surface[Math.floor(surface.length * .25)][0], y = at(x);
    for (let i = 0; i < 3; i++) line(c, x + i * 5, y + sign * 10,
      x + i * 5 + 3, y + sign * 5, '#c2ad7a');
    for (let i = 0; i < 13; i++) { const xx = x + i; c.fillStyle = p.rim; c.fillRect(Math.round(xx), Math.round(at(xx) + sign), 1, 1); }
  }
}
