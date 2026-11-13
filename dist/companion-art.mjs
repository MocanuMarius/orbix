import { normalizeCompanionRole, getCompanionAbility } from './companion-abilities.mjs';

const PALETTES = Object.freeze({
  swift: Object.freeze({ outer: '#9c713b', mid: '#d2a45d', core: '#f2d48e', bright: '#fff0c8' }),
  anchor: Object.freeze({ outer: '#327e82', mid: '#64b8b7', core: '#a7e8df', bright: '#e3fff0' }),
  gravity: Object.freeze({ outer: '#75509f', mid: '#a57bd1', core: '#d3b1f2', bright: '#f3eaff' }),
});

const sprite = rows => Object.freeze({ width: Math.max(...rows.map(row => row.length)),
  height: rows.length, rows: Object.freeze(rows) });

// Original four-shade bodies: transparent0, outer1, mid2, core3, bright4.
// Their fins, feet and curling arms belong to the silhouettes, not badge overlays.
const gravitySprite = () => {
  const size = 15, center = 7, pixels = Array.from({ length: size }, () => Array(size).fill(0));
  const disc = (cx, cy, radius, shade) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) pixels[y][x] = Math.max(pixels[y][x], shade);
    }
  };
  // Three curled lobes leave clear notches around a bright central seed.
  for (let shade = 1; shade <= 2; shade++) for (let arm = 0; arm < 3; arm++) {
    for (let step = 0; step <= 12; step++) {
      const t = step / 12, radius = 1.8 + t * 3.2, angle = -Math.PI / 2 + arm * Math.PI * 2 / 3 + t * .9;
      disc(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius, shade === 1 ? 1.9 : .9, shade);
    }
  }
  disc(center, center, 2.6, 3);
  disc(center, center, 1.2, 4);
  return sprite(pixels.map(row => row.join('')));
};
const SPRITES = Object.freeze({
  swift: sprite([
    '000000001000000',
    '000000012100000',
    '100000123210000',
    '121001223321000',
    '123212233432100',
    '012332334443210',
    '001233444443321',
    '012332334443210',
    '123212233432100',
    '121001223321000',
    '100000123210000',
    '000000012100000',
    '000000001000000',
  ]),
  anchor: sprite([
    '0000011100000',
    '0000122210000',
    '0001223221000',
    '0012233322100',
    '0122334332210',
    '1223344433221',
    '1233444443321',
    '1233444443321',
    '1233344433321',
    '0123333333210',
    '0011222221100',
    '0012100012100',
    '0001000001000',
  ]),
  gravity: gravitySprite(),
});

export function companionSprite(role = 'swift') {
  return SPRITES[normalizeCompanionRole(role)];
}

export function companionPalette(role = 'swift') {
  return PALETTES[normalizeCompanionRole(role)];
}

export function companionArtSvg(role = 'swift', { className = '' } = {}) {
  const id = normalizeCompanionRole(role), art = companionSprite(id), palette = companionPalette(id);
  const inks = [null, palette.outer, palette.mid, palette.core, palette.bright];
  const classes = String(className || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 120);
  const pixels = [];
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const shade = Number(row[x]), start = x;
      while (x < row.length && Number(row[x]) === shade) x++;
      if (inks[shade]) pixels.push(`<rect x="${start}" y="${y}" width="${x - start}" height="1" fill="${inks[shade]}"/>`);
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${classes}" viewBox="0 0 ${art.width} ${art.height}" width="${art.width}" height="${art.height}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" role="img" aria-label="${getCompanionAbility(id).name} companion">${pixels.join('')}</svg>`;
}
