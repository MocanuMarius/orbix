// Large-scale geological relief under the photographic material. Coordinates
// belong to the landform, so strata, fractures and weathering never slide.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function surfaceHeight(profile, x) {
  if (x <= profile[0][0]) return profile[0][1];
  if (x >= profile.at(-1)[0]) return profile.at(-1)[1];
  let lo = 0, hi = profile.length - 1;
  while (hi - lo > 1) { const mid = (hi + lo) >> 1; if (profile[mid][0] < x) lo = mid; else hi = mid; }
  const a = profile[lo], b = profile[hi];
  return mix(a[1], b[1], clamp((x - a[0]) / (b[0] - a[0] || 1), 0, 1));
}

export function makeLandformField({ points, top = false, terrain = 'ruins', seed = 0, scale = 1 }) {
  const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0]));
  const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
  const profile = points.slice(2).sort((a, b) => a[0] - b[0]);
  const span = maxX - minX;
  const fieldScale = Math.max(.5, scale);
  const phase = seed * 2.399963;
  // Successive erosion gullies descend from the same crest, splitting broad
  // buttresses into coherent faces instead of unrelated triangular patches.
  const ridges = Array.from({ length: 5 }, (_, i) => ({
    x: minX + span * (.10 + i * .20) + Math.sin(phase + i * 3) * span * .025,
    lean: Math.sin(phase + i * 2.1) * .17,
    width: span * (.080 + (i % 2) * .025),
  }));
  const depthAt = (x, y) => (top ? surfaceHeight(profile, x) - y : y - surfaceHeight(profile, x)) / fieldScale;
  const heightAt = (x, y) => {
    const depth = Math.max(0, depthAt(x, y));
    const lip = 1 - Math.exp(-depth / (terrain === 'canopy' ? 14 : 20));
    let buttress = 0;
    for (const ridge of ridges) {
      const drift = ridge.lean * depth * fieldScale + Math.sin(depth * .009 + phase) * 4 * fieldScale;
      const u = (x - ridge.x - drift) / ridge.width;
      buttress += Math.exp(-u * u * 1.8);
    }
    const strata = Math.sin((y / fieldScale + x * .17 / fieldScale) * .050 + phase
      + Math.sin(x / fieldScale * .012) * .9);
    const strataFine = Math.sin((y / fieldScale + x * .16 / fieldScale) * .126 + phase) * .7;
    const mass = terrain === 'canopy' ? 19 + buttress * 23 : 14 + buttress * 32;
    return clamp((mass + strata * 3.4 + strataFine) * lip, 0, 88);
  };
  return { minX, minY, maxX, maxY, profile, heightAt, depthAt, phase, fieldScale };
}

export function bakeLandform({ points, top = false, terrain = 'ruins', seed = 0, scale = 1, maxSize = 256, clipY }) {
  const field = makeLandformField({ points, top, terrain, seed, scale });
  const { minX, maxX, heightAt, depthAt, phase, fieldScale } = field;
  const minY = Math.max(field.minY, clipY?.[0] ?? field.minY);
  const maxY = Math.max(minY + 1, Math.min(field.maxY, clipY?.[1] ?? field.maxY));
  const sizeX = maxX - minX, sizeY = maxY - minY;
  const texel = Math.max(3, Math.max(sizeX, sizeY) / maxSize);
  const width = Math.max(2, Math.ceil(sizeX / texel)), height = Math.max(2, Math.ceil(sizeY / texel));
  const form = new Uint8ClampedArray(width * height * 4), weather = new Uint8ClampedArray(form.length);
  const dx = sizeX / width, dy = sizeY / height;
  // Evaluate expensive erosion relief once per texel, then take differences
  // from this shared grid. The fine photographic normal retains small detail.
  const stride = width + 8, grid = new Float32Array(stride * (height + 8));
  for (let iy = -4; iy < height + 4; iy++) for (let ix = -4; ix < width + 4; ix++) {
    grid[(iy + 4) * stride + ix + 4] = heightAt(minX + (ix + .5) * dx, minY + (iy + .5) * dy);
  }
  const upwardSlopes = Array.from({ length: width }, (_, ix) => {
    const x = minX + (ix + .5) * dx;
    return top ? 0 : clamp(1 - Math.abs(surfaceHeight(field.profile, x + 3) - surfaceHeight(field.profile, x - 3)) / 10, .05, 1);
  });
  for (let iy = 0; iy < height; iy++) for (let ix = 0; ix < width; ix++) {
    const x = minX + (ix + .5) * dx, y = minY + (iy + .5) * dy;
    const g = (iy + 4) * stride + ix + 4;
    const depth = depthAt(x, y), z = grid[g];
    const gx = (grid[g + 1] - grid[g - 1]) / (2 * dx);
    const gy = (grid[g + stride] - grid[g - stride]) / (2 * dy);
    const inverse = 1 / Math.hypot(gx, gy, 1);
    const average = (grid[g + 3] + grid[g - 3] + grid[g + stride * 3] + grid[g - stride * 3]) / 4;
    const crevice = clamp((average - z) / 5, 0, 1);
    const ao = clamp(1 - crevice * .34 - Math.exp(-Math.max(0, depth) / 6) * .12, .52, 1);
    const p = (iy * width + ix) * 4;
    form[p] = Math.round((-.5 * gx * inverse + .5) * 255);
    form[p + 1] = Math.round((-.5 * gy * inverse + .5) * 255);
    form[p + 2] = Math.round(z / 96 * 255);
    form[p + 3] = Math.round(ao * 255);
    // Weathering belongs to slope exposure and bedding: a snow dusting on
    // upward alpine edges, lichen on old terraces, moss on root crowns.
    const wave = Math.sin(x * .041 / fieldScale + phase) * .5 + Math.sin(x * .117 / fieldScale) * .18;
    const edge = (1 - smooth(3 + wave * 4, terrain === 'storm' ? 15 : 29, depth)) * smooth(-1, 2, depth);
    const upward = upwardSlopes[ix];
    const bedding = Math.sin((y / fieldScale + x * .17 / fieldScale) * .050 + phase + Math.sin(x / fieldScale * .012) * .9);
    const seam = Math.pow(clamp((bedding + .82) / .12, 0, 1), .5) - Math.pow(clamp((bedding + .70) / .12, 0, 1), .5);
    let color, alpha;
    if (terrain === 'storm') { color = [178, 194, 202]; alpha = edge * upward * .54; }
    else if (terrain === 'canopy') { color = [75, 100, 45]; alpha = edge * upward * .62; }
    else { color = [117, 110, 63]; alpha = edge * upward * .25; }
    if (seam > alpha) { color = [30, 28, 28]; alpha = seam * .32; }
    if (crevice * .26 > alpha) { color = [28, 25, 26]; alpha = crevice * .26; }
    weather[p] = color[0]; weather[p + 1] = color[1]; weather[p + 2] = color[2];
    weather[p + 3] = Math.round(clamp(alpha, 0, .7) * 255);
  }
  return { form, weather, width, height, minX, minY, sizeX, sizeY };
}
