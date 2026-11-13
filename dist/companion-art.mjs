import { normalizeCompanionRole, getCompanionAbility } from './companion-abilities.mjs';

const PALETTES = Object.freeze({
  collector: Object.freeze({ outer: '#658557', mid: '#8db778', core: '#b9dfa0', bright: '#efffe0' }),
  swift: Object.freeze({ outer: '#9c713b', mid: '#d2a45d', core: '#f2d48e', bright: '#fff0c8' }),
  anchor: Object.freeze({ outer: '#327e82', mid: '#64b8b7', core: '#a7e8df', bright: '#e3fff0' }),
  gravity: Object.freeze({ outer: '#75509f', mid: '#a57bd1', core: '#d3b1f2', bright: '#f3eaff' }),
});

// Every companion is the same simple circular light, distinguished only by
// palette. Four concentric pixel shades and a small off-center light core.
const ORB = Object.freeze({ width: 13, height: 13,
  rows: Object.freeze(Array.from({ length: 13 }, (_, y) => Array.from({ length: 13 }, (_, x) => {
    const radius = (x - 6) ** 2 + (y - 6) ** 2;
    if (radius > 36) return '0';
    if ((x - 5) ** 2 + (y - 5) ** 2 <= 4) return '4';
    return radius <= 14 ? '3' : radius <= 26 ? '2' : '1';
  }).join(''))) });

export function companionSprite(role = 'collector') {
  return ORB;
}

export function companionPalette(role = 'collector') {
  return PALETTES[normalizeCompanionRole(role)];
}

export function companionArtSvg(role = 'collector', { className = '' } = {}) {
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
