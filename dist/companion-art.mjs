import { normalizeCompanionRole } from './companion-abilities.mjs?v=steady-giants-1';

const PALETTES = Object.freeze({
  collector: Object.freeze({ outer: '#658557', mid: '#8db778', core: '#b9dfa0', bright: '#efffe0' }),
  protector: Object.freeze({ outer: '#42648e', mid: '#6e99c5', core: '#adcff3', bright: '#ebf5ff' }),
  leveler: Object.freeze({ outer: '#327e82', mid: '#64b8b7', core: '#a7e8df', bright: '#e3fff0' }),
  swift: Object.freeze({ outer: '#9c713b', mid: '#d2a45d', core: '#f2d48e', bright: '#fff0c8' }),
  seer: Object.freeze({ outer: '#75509f', mid: '#a57bd1', core: '#d3b1f2', bright: '#f3eaff' }),
  kindler: Object.freeze({ outer: '#985d72', mid: '#cd8fa1', core: '#f0beca', bright: '#fff0f2' }),
});
const NAMES = Object.freeze({ collector: 'Collector', protector: 'Protector', leveler: 'Space Timer', swift: 'Runner', seer: 'Seer', kindler: 'Kindler' });

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
  return PALETTES[normalizeCompanionRole(role)] || PALETTES.collector;
}

export function companionArtSvg(role = 'collector', { className = '' } = {}) {
  const id = normalizeCompanionRole(role), art = companionSprite(id), palette = companionPalette(id);
  const inks = [null, palette.outer, palette.mid, palette.core, palette.bright];
  const classes = String(className || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 120);
  const paths=['','','','',''];
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const shade = Number(row[x]), start = x;
      while (x < row.length && Number(row[x]) === shade) x++;
      if (inks[shade]) paths[shade]+=`M${start} ${y}h${x-start}v1h-${x-start}z`;
    }
  });
  const pixels=paths.map((d,i)=>d?`<path d="${d}" fill="${inks[i]}"/>`:'').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="companion-portrait ${classes}" data-role-art="${id}" viewBox="-1 -1 15 15" width="${art.width}" height="${art.height}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" role="img" aria-label="${NAMES[id] || 'Collector'} companion"><g class="companion-orbit">${pixels}<path d="M4 3h2v1H4z" fill="${palette.bright}" opacity=".76"/></g></svg>`;
}

export function makeWispSprite(doc, band) {
  const canvas = doc.createElement('canvas'); canvas.width = canvas.height = 36;
  const c = canvas.getContext('2d'), x = 18, y = 18;
  // Fuel burns inward: charcoal gathers at the edge, never as a central dot.
  // Cache a coarse, dithered gradient per fuel band; no per-frame pixel work.
  const coreRadius=12.5*Math.sqrt(band/32),dither=[0,.5,.75,.25];
  for(let py=-13;py<13;py+=2)for(let px=-13;px<13;px+=2){
    const dx=px+1,dy=py+1,distance=Math.hypot(dx,dy);
    const cellX=(px+13)/2,cellY=(py+13)/2;
    const edge=12.7+(((cellX*7+cellY*11)%5)-2)*.17;
    if(distance>edge)continue;
    const shell=distance>edge-1.6;
    const raw=Math.min(1,Math.max(0,(coreRadius+1.8-distance)/3.8));
    const grain=dither[(cellX%2)+(cellY%2)*2];
    const light=Math.min(1,Math.floor(raw*5+grain)/5);
    const shade=shell?[188,204,193]:[Math.round(44+light*199),Math.round(52+light*191),Math.round(54+light*166)];
    if(shell&&(cellX+cellY)%3===0){shade[0]=226;shade[1]=232;shade[2]=211;}
    c.fillStyle=`rgb(${shade.join(',')})`;c.fillRect(x+px,y+py,2,2);
  }
  return canvas;
}
