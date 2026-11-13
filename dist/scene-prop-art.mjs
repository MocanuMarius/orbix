import {getBiome} from './biomes.mjs?v=guardian-paths-1';
import {biomePalette} from './biome-art.mjs?v=guardian-paths-1';
// Original pixel materials painted inside the simulation's solid prop parts.
// Animation belongs to the parent transform; these local surfaces stay cached.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const noise = (x, y, seed) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
};
const seedOf = value => {
  let seed = 2166136261;
  for (const c of String(value)) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  return seed >>> 0;
};
function line(c, x0, y0, x1, y1, color, size = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  c.fillStyle = color;
  for (let i = 0; i < 2048; i++) {
    c.fillRect(x0, y0, size, size);
    if (x0 === x1 && y0 === y1) break;
    const next = error * 2;
    if (next >= dy) { error += dy; x0 += sx; }
    if (next <= dx) { error += dx; y0 += sy; }
  }
}
function outline(c, points) {
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath();
}
const MATERIAL = {
  bark: ['#292d25', '#494837', '#66644a', '#33382b'],
  wood: ['#2c3029', '#55513d', '#797154', '#373d2e'],
  foliage: ['#26372d', '#3e5140', '#627052', '#304436'],
  stone: ['#363d37', '#50564a', '#737865', '#292f2b'],
  roof: ['#29343a', '#465158', '#69746e', '#1f2b2e'],
  plaster: ['#41483c', '#646b54', '#85896b', '#343c32'],
  ice: ['#344d60','#638591','#bedce0','#90b7c4'],
  crystal: ['#39344f','#7b6b96','#c4b8de','#a799c2'],
  basalt: ['#302a33','#55505c','#a08b97','#785044'],
  chalk: ['#3f4d52','#6a7b7b','#b9cac5','#899e9d'],
  sandstone: ['#594536','#927556','#c8ae81','#ad936d'],
  coral: ['#554247','#956f76','#c6a3a0','#b58c8c'],
  succulent: ['#38483a','#637957','#a3b088','#83946e'],
};

function mineral(c,b,ink,seed,material){
  if(material==='coral'){
    for(let row=0,y=b.y+1;y<b.y+b.h;y+=6,row++)for(let x=b.x+row%2*3;x<b.x+b.w;x+=7){
      c.fillStyle=ink[0];c.fillRect(x,y,2,2);c.fillStyle=ink[2];c.fillRect(x-1,y-1,3,1);
    }
  }else if(material==='sandstone'||material==='chalk'){
    for(let y=b.y+3;y<b.y+b.h;y+=6){line(c,b.x,y,b.x+b.w,y+2,ink[0]);line(c,b.x+2,y+1,b.x+b.w*.7,y+2,ink[2]);}
  }else{
    const cx=b.x+b.w*.42;
    c.fillStyle=ink[3];outline(c,[[b.x,b.y],[cx,b.y+b.h*.08],[cx+3,b.y+b.h],[b.x,b.y+b.h*.88]]);c.fill();
    line(c,cx,b.y+1,cx+3,b.y+b.h-1,ink[2]);
    if(material==='ice')for(let i=0;i<3;i++){const y=b.y+b.h*(.23+i*.24);line(c,b.x+3,y,cx,y+5,ink[0]);line(c,cx,y+5,cx-3,y+12,ink[0]);}
    if(material==='basalt')for(let y=b.y+9;y<b.y+b.h;y+=14){line(c,b.x,y,b.x+b.w,y+2,ink[0]);if(noise(y,1,seed)>.6)line(c,b.x+1,y,b.x+1,y+7,ink[3]);}
  }
  for(let i=0;i<b.w*b.h/55;i++){c.fillStyle=i%3?ink[0]:ink[2];c.fillRect(Math.floor(b.x+noise(i,9,seed)*b.w),Math.floor(b.y+noise(i,10,seed)*b.h),1,1);}
}

function bark(c, b, ink, seed, horizontal) {
  const count = Math.ceil((horizontal ? b.h : b.w) / 4);
  for (let n = 0; n <= count; n++) {
    const offset = n * 4 + Math.floor(noise(n, 0, seed) * 3);
    let px = horizontal ? b.x : b.x + offset, py = horizontal ? b.y + offset : b.y;
    for (let s = 1; s <= 8; s++) {
      const x = horizontal ? b.x + b.w * s / 8 : b.x + offset + Math.sin(s * .8 + n) * 2;
      const y = horizontal ? b.y + offset + Math.sin(s * .7 + n) : b.y + b.h * s / 8;
      line(c, px, py, x, y, n % 3 ? ink[0] : ink[2]); px = x; py = y;
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = b.x + noise(i, 3, seed) * b.w, y = b.y + noise(i, 4, seed) * b.h;
    line(c, x - 2, y, x, y - 3, ink[0]); line(c, x, y - 3, x + 2, y, ink[0]);
    line(c, x + 2, y, x, y + 4, ink[2]);
  }
  // Lichen grows as matte, broken patches, never as luminous collectible dots.
  for (let i = 0; i < b.w * b.h / 140; i++) {
    c.fillStyle = i % 3 ? ink[3] : '#646b49';
    c.fillRect(Math.floor(b.x + noise(i, 8, seed) * b.w), Math.floor(b.y + noise(i, 9, seed) * b.h), 3 + i % 3, 1);
  }
}

function foliage(c, b, ink, seed, hanging, pine) {
  const rowStep = hanging ? 6 : pine ? 5 : 7;
  for (let y = b.y - 3, row = 0; y < b.y + b.h; y += rowStep, row++) {
    for (let x = b.x - 4, col = 0; x < b.x + b.w; x += 8, col++) {
      const r = noise(col, row, seed), xx = Math.round(x + r * 4), yy = Math.round(y + r * 3);
      c.fillStyle = ink[(row + col) % 3 === 0 ? 2 : (r > .4 ? 1 : 3)];
      c.fillRect(xx, yy, 5 + Math.floor(r * 4), 2);
      c.fillRect(xx + 2, yy - 1, 3 + Math.floor(r * 3), 1);
      if (pine) {
        line(c, xx + 2, yy, xx - 2, yy + 3, ink[0]);
        line(c, xx + 2, yy, xx + 7, yy + 3, ink[3]);
      } else if (hanging) {
        const length = 6 + Math.floor(r * 14);
        line(c, xx + 3, yy + 1, xx + 2, yy + length, ink[3]);
        line(c, xx + 5, yy + 3, xx + 4, yy + length - 2, ink[2]);
      } else {
        c.fillStyle = ink[0]; c.fillRect(xx + 1, yy + 3, 6, 1);
      }
    }
  }
}

function masonry(c, b, ink, seed, plaster) {
  if (plaster) {
    for (let i = 0; i < b.w * b.h / 24; i++) {
      c.fillStyle = i % 3 ? ink[0] : ink[2];
      const x = b.x + Math.floor(noise(i, 5, seed) * b.w), y = b.y + Math.floor(noise(i, 6, seed) * b.h);
      c.fillRect(x, y, 2 + i % 4, 1);
    }
  } else {
    for (let row = 0, y = b.y + 3; y < b.y + b.h; row++, y += 7) {
      line(c, b.x, y, b.x + b.w, y, ink[0]);
      for (let x = b.x - row % 2 * 8; x < b.x + b.w; x += 13 + Math.floor(noise(row, x, seed) * 6)) {
        line(c, x, y, x, y + 6, ink[0]);
        line(c, x + 2, y + 1, x + 8, y + 1, ink[2]);
      }
    }
  }
  for (let i = 0; i < 3; i++) {
    const x = b.x + noise(i, 11, seed) * b.w, y = b.y + noise(i, 12, seed) * b.h;
    line(c, x, y, x - 3, y + 5, ink[0]); line(c, x - 3, y + 5, x + 1, y + 9, ink[0]);
  }
}

function roof(c, b, ink, seed, thatched) {
  if (thatched) { bark(c, b, ink, seed, false); return; }
  for (let row = 0, y = b.y; y < b.y + b.h; y += 5, row++) {
    for (let x = b.x - row % 2 * 4; x < b.x + b.w; x += 9) {
      const shift = noise(row, x, seed) > .75 ? 1 : 0;
      c.fillStyle = (row + x) % 3 ? ink[1] : ink[0]; c.fillRect(x, y + shift, 8, 4);
      c.fillStyle = ink[2]; c.fillRect(x + 1, y + shift, 6, 1);
      c.fillStyle = ink[0]; c.fillRect(x, y + 4, 9, 1);
    }
  }
}

function boardedFacade(c, b, seed) {
  // A fully boarded door/window reads as solid architecture rather than a gap.
  if (b.w < 19 || b.h < 15) return;
  const dw = clamp(Math.round(b.w * .19), 8, 14), dh = clamp(Math.round(b.h * .54), 12, 24);
  const x = Math.round(b.x + b.w * (.47 + noise(3, 5, seed) * .14)), y = Math.round(b.y + b.h - dh - 1);
  c.fillStyle = '#272e27'; c.fillRect(x - 2, y - 1, dw + 4, dh + 2);
  c.fillStyle = '#655f47'; c.fillRect(x, y, dw, dh);
  for (let xx = 2; xx < dw; xx += 3) line(c, x + xx, y + 1, x + xx, y + dh, '#3b3f30');
  line(c, x, y + dh * .2, x + dw - 1, y + dh * .7, '#8a7e5a', 2);
  line(c, x, y + dh * .8, x + dw - 1, y + dh * .35, '#4c4d37', 2);
  if (b.w > 33) {
    const wx = Math.round(b.x + b.w * .13), wy = Math.round(b.y + b.h * .33);
    c.fillStyle = '#282f29'; c.fillRect(wx, wy, 9, 9);
    c.fillStyle = '#79765a'; c.fillRect(wx, wy + 2, 9, 2); c.fillRect(wx, wy + 6, 9, 2);
    line(c, wx + 1, wy, wx + 7, wy + 8, '#4a503c', 2);
  }
}

export function createScenePropArt(document, prop, { scale = 1, terrain = 'ruins', identity = '' } = {}) {
  const parts = (prop.parts || []).filter(part => part.polygon?.length >= 3);
  if (!parts.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const part of parts) for (const [x, y] of part.polygon) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const canvas = document.createElement('canvas'), pad = 2;
  canvas.width = Math.max(1, Math.ceil((maxX - minX) * scale) + pad * 2);
  canvas.height = Math.max(1, Math.ceil((maxY - minY) * scale) + pad * 2);
  const c = canvas.getContext('2d', { willReadFrequently: true });
  if (!c) return null;
  c.imageSmoothingEnabled = false;
  const ox = pad - minX * scale, oy = pad - minY * scale;
  const seed = seedOf(`${identity}:${prop.id}:${prop.kind}`), kind = String(prop.kind || '');
  const biome=getBiome(identity),palette=biomePalette({biomeId:biome?.id});
  const hanging = /willow|root|hanging|vine/.test(kind), pine = /pine|conifer/.test(kind);
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index], material = part.material || 'stone';
    const points = part.polygon.map(([x, y]) => [Math.round(x * scale + ox), Math.round(y * scale + oy)]);
    const left = Math.min(...points.map(p => p[0])), top = Math.min(...points.map(p => p[1]));
    const b = { x: left, y: top, w: Math.max(...points.map(p => p[0])) - left, h: Math.max(...points.map(p => p[1])) - top };
    const ink = [...(MATERIAL[material] || MATERIAL.stone)];
    if(biome&&['stone','roof','plaster'].includes(material)){
      ink[0]=palette.shade;ink[1]=palette.face;ink[2]=palette.grain;ink[3]=palette.stone;
    }
    if(biome?.id==='fungal'&&material==='roof'){ink[0]='#3a2d49';ink[1]='#75617f';ink[2]='#bda2bd';ink[3]='#5b4d66';}
    if (terrain === 'storm' && material === 'foliage') { ink[1] = '#3d514b'; ink[2] = '#6b7a68'; }
    if (terrain === 'ruins' && material === 'roof') { ink[1] = '#605c49'; ink[2] = '#80785b'; }
    if (hanging && material === 'foliage') { ink[1] = '#405847'; ink[2] = '#667956'; }
    const partSeed = seed + index * 977;
    c.save(); outline(c, points); c.fillStyle = ink[1]; c.fill(); c.clip();
    // Broad face shading supports the mass before fine texture is applied.
    c.fillStyle = ink[0]; c.fillRect(b.x + Math.floor(b.w * .65), b.y, Math.ceil(b.w * .35) + 1, b.h + 1);
    if (material === 'bark' || material === 'wood' || material === 'succulent') bark(c, b, ink, partSeed,
      material === 'wood' && (b.w > b.h * 1.8 || /log|beam/.test(kind)));
    else if (material === 'foliage') foliage(c, b, ink, partSeed, hanging, pine);
    else if (material === 'roof') roof(c, b, ink, partSeed, /thatch|cocoon/.test(kind));
    else if (['ice','crystal','basalt','chalk','sandstone','coral'].includes(material))mineral(c,b,ink,partSeed,material);
    else masonry(c, b, ink, partSeed, material === 'plaster');
    if ((material === 'stone' || material === 'plaster') && /cottage|shelter|house|hut/.test(kind)) boardedFacade(c, b, partSeed);
    // The rim is clipped inward to the same solid polygon, including concavity.
    outline(c, points); c.strokeStyle = '#131e1c'; c.lineWidth = 4; c.stroke();
    outline(c, points); c.strokeStyle = palette.rim||(terrain==='storm'?'#b0c2bd':'#a4b29a'); c.lineWidth = 1.5; c.stroke();
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], p = points[i];
      if (p[1] <= a[1] && Math.abs(p[0] - a[0]) > 2) line(c, a[0], a[1] + 1, p[0], p[1] + 1, ink[2]);
    }
    c.restore();
  }
  return { canvas, x: minX, y: minY, pad, prop, scale };
}
