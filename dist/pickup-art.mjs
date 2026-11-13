import { pickupKind, getPickupSpec } from './pickups.mjs';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// Shared low-resolution paint operations: the game and the field guide use
// the same bodies, shading, silhouettes and halo colors, with no gem frames.
function packetPixels(kind, { time = 0, reducedMotion = false, tiny = false } = {}) {
  const pixels = [], shrink = tiny ? .62 : 1;
  const rect = (x, y, width, height, color, alpha = 1) => pixels.push({
    x: x * shrink, y: y * shrink, width: width * shrink, height: height * shrink, color, alpha,
  });
  const oval = (x, y, rx, ry, color, alpha = 1) => {
    const rows = Math.max(1, Math.ceil(ry));
    for (let row = -rows; row <= rows; row++) {
      const fraction = row / Math.max(.1, ry);
      if (Math.abs(fraction) > 1) continue;
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - fraction * fraction)));
      rect(Math.round(x) - half, Math.round(y) + row, half * 2 + 1, 1, color, alpha);
    }
  };
  const disc = (x, y, radius, color, alpha = 1) => oval(x, y, radius, radius, color, alpha);
  const halo = (radius, color, alpha) => {
    for (let layer = 3; layer > 0; layer--) disc(0, 0, radius * layer / 3, color, alpha / 3);
  };
  const ring = (radius, color, alpha) => {
    const limit = Math.ceil(radius + .5);
    for (let y = -limit; y <= limit; y++) {
      let start = null;
      for (let x = -limit; x <= limit + 1; x++) {
        const distance = Math.hypot(x, y), ink = x <= limit && distance >= radius - .6 && distance <= radius + .6;
        if (ink && start === null) start = x;
        if (!ink && start !== null) { rect(start, y, x - start, 1, color, alpha); start = null; }
      }
    }
  };
  const t = reducedMotion ? 0 : time;
  if (kind === 'dark') {
    // Dark body, readable accretion rim, a few inward-spiralling pixel sparks.
    // Fixed tiny particle count; no live geometry or additional lighting pass.
    halo(12, '#735580', .11);
    disc(0, 0, 7, '#786187', .85);
    disc(0, 0, 6, '#302538');
    disc(0, 0, 5, '#020306'); disc(0, 0, 3, '#000000');
    for(let i=0;i<4;i++){
      const phase=(t*.45+i/4)%1, radius=12-phase*5;
      const angle=t*1.8+i*TAU/4+phase*1.2;
      rect(Math.round(Math.cos(angle)*radius),Math.round(Math.sin(angle)*radius),1,1,'#b296bc',.45+phase*.4);
    }
    rect(-5,-4,3,1,'#c1a5cc',.9);rect(4,3,2,1,'#a18aaf',.7);
  } else if (kind === 'dusk') {
    halo(9, '#a56c87', .12);
    disc(0, 0, 5, '#795968', .72); disc(0, 0, 4, '#d798ad', .85);
    disc(0, 0, 2.7, '#24202d'); disc(0, 0, 1.3, '#080b14');
    rect(-3, -3, 3, 1, '#edbdc7', .9); rect(-4, -2, 1, 3, '#c98caa', .7);
    rect(1, 3, 2, 1, '#93667c', .8);
  } else if (kind === 'cache') {
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * 1.8) * .1;
    halo(12 * breath, '#d1a866', .18);
    disc(0, 0, 6 * breath, '#ae8750', .7); disc(0, 0, 5 * breath, '#edc67e', .92);
    oval(-1, -1, 3.5 * breath, 4 * breath, '#ffe6a8');
    disc(-2, -2, 2, '#fff4cf'); rect(0, -3, 2, 2, '#fff8e5', .9);
    rect(2, 2, 2, 1, '#d6a557', .75);
  } else if (kind === 'embers') {
    halo(8, '#c89956', .08);
    for (const [x, y] of [[-3, 1], [2, 2], [0, -3]]) {
      oval(x, y, 2, 2.5, '#9d713f', .85); oval(x, y - 1, 1, 2, '#e4ad62');
      rect(x - 1, y - 2, 1, 1, '#ffe3a4', .95);
    }
  } else if (kind === 'charge') {
    // A little hooked discharge rather than a pointed crystal or diamond.
    const flicker = reducedMotion ? 1 : .91 + Math.sin(t * 22) * .09;
    halo(8, '#68b9ca', .12 * flicker);
    rect(-1, -4, 2, 8, '#80d4dc', flicker); rect(-3, -1, 6, 2, '#80d4dc', .9 * flicker);
    rect(1, -4, 2, 1, '#a4e8e7', flicker); rect(-3, 3, 2, 1, '#80d4dc', flicker);
    rect(-1, -1, 2, 3, '#e2ffed', flicker);
    rect(-4, -3, 1, 2, '#80d4dc', .5); rect(4, 1, 1, 2, '#80d4dc', .5);
  } else if (kind === 'sight') {
    const phase = reducedMotion ? .4 : (t * .48) % 1;
    halo(9, '#aa85c9', .1);
    ring(7 + phase * 5, '#c5a5ed', .32 * (1 - phase));
    const second = (phase + .5) % 1;
    ring(7 + second * 5, '#aa8cd6', .22 * (1 - second));
    disc(0, 0, 4, '#795d9c', .8); disc(0, 0, 3, '#c5a5ed', .95);
    disc(-1, -1, 1.7, '#f0dfff');
    rect(-4, 0, 2, 2, '#b48bdb', .8); rect(2, -1, 2, 2, '#c5a5ed', .9);
  } else {
    halo(7, '#cabb99', .1);
    disc(0, 0, 3, '#bfaf8d', .65); disc(0, 0, 2, '#f5e6bc', .95);
    rect(-1, -2, 2, 2, '#fff8dd'); rect(1, 0, 1, 1, '#fffdec');
  }
  return pixels;
}

export function drawPickup(context, x, y, { kind = 'light', time = 0,
  reducedMotion = false, tiny = false, alpha = 1, scale = 1 } = {}) {
  const id = pickupKind(kind), size = Math.max(.1, Number(scale) || 1);
  context.save();
  const inheritedAlpha = context.globalAlpha * clamp(Number(alpha) || 0, 0, 1);
  for (const pixel of packetPixels(id, { time, reducedMotion, tiny })) {
    context.globalAlpha = inheritedAlpha * pixel.alpha;
    context.fillStyle = pixel.color;
    const left = Math.round(x + pixel.x * size), top = Math.round(y + pixel.y * size);
    context.fillRect(left, top, Math.max(1, Math.round(x + (pixel.x + pixel.width) * size) - left),
      Math.max(1, Math.round(y + (pixel.y + pixel.height) * size) - top));
  }
  context.restore();
}

export function pickupArtSvg(kind = 'light', { className = '' } = {}) {
  const id = pickupKind(kind), name = getPickupSpec(id).name;
  const classes = String(className || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 120);
  const pixels = packetPixels(id, { reducedMotion: true }).map(pixel =>
    `<rect x="${pixel.x}" y="${pixel.y}" width="${pixel.width}" height="${pixel.height}" fill="${pixel.color}" opacity="${pixel.alpha}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${classes}" viewBox="-18 -18 36 36" width="36" height="36" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" role="img" aria-label="${name}">${pixels}</svg>`;
}
