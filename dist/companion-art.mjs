import { normalizeCompanionRole, getCompanionAbility } from './companion-abilities.mjs';

const PALETTES = Object.freeze({
  pearl: Object.freeze({ outer: '#9daaa5', mid: '#cbd5cc', core: '#eff0df', bright: '#fffdec' }),
  amber: Object.freeze({ outer: '#a28d68', mid: '#cfbc91', core: '#f0dfb5', bright: '#fff0d0' }),
  lilac: Object.freeze({ outer: '#8f899e', mid: '#beb5ce', core: '#e4ddee', bright: '#f4eef7' }),
});

const sprite = rows => Object.freeze({ width: Math.max(...rows.map(row => row.length)),
  height: rows.length, rows: Object.freeze(rows) });

// Original four-shade bodies: transparent0, outer1, mid2, core3, bright4.
// Their fins, feet and antennae belong to the silhouettes, not badge overlays.
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
  scout: sprite([
    '00100000100',
    '00110001100',
    '00012221000',
    '00122322100',
    '01223332210',
    '12233433221',
    '12334443321',
    '12321112321',
    '12321412321',
    '12321112321',
    '01223332210',
    '00122322100',
    '00122322100',
    '00012221000',
    '00001110000',
  ]),
});

export function companionSprite(role = 'swift') {
  return SPRITES[normalizeCompanionRole(role)];
}

export function companionPalette(tint = 'pearl') {
  return PALETTES[typeof tint === 'string' && Object.hasOwn(PALETTES, tint) ? tint : 'pearl'];
}

export function companionArtSvg(role = 'swift', { tint = 'pearl', className = '' } = {}) {
  const id = normalizeCompanionRole(role), art = companionSprite(id), palette = companionPalette(tint);
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
