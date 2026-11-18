import { normalizeCompanionRole } from './companion-abilities.mjs?v=detail-1';

const PALETTES = Object.freeze({
  collector: Object.freeze({ outer: '#658557', mid: '#8db778', core: '#b9dfa0', bright: '#efffe0' }),
  protector: Object.freeze({ outer: '#42648e', mid: '#6e99c5', core: '#adcff3', bright: '#ebf5ff' }),
  leveler: Object.freeze({ outer: '#327e82', mid: '#64b8b7', core: '#a7e8df', bright: '#e3fff0' }),
  swift: Object.freeze({ outer: '#9c713b', mid: '#d2a45d', core: '#f2d48e', bright: '#fff0c8' }),
  seer: Object.freeze({ outer: '#75509f', mid: '#a57bd1', core: '#d3b1f2', bright: '#f3eaff' }),
  kindler: Object.freeze({ outer: '#985d72', mid: '#cd8fa1', core: '#f0beca', bright: '#fff0f2' }),
});
const NAMES = Object.freeze({ collector: 'Collector', protector: 'Protector', leveler: 'Space Timer', swift: 'Runner', seer: 'Seer', kindler: 'Kindler' });

// One fine source pixel per contour step. Menu and flight use this same art;
// destination sizes remain unchanged, so detail never enlarges the companion.
const ORB = Object.freeze({ width: 25, height: 25,
  rows: Object.freeze(Array.from({ length: 25 }, (_, y) => Array.from({ length: 25 }, (_, x) => {
    const radius = (x - 12) ** 2 + (y - 12) ** 2;
    if (radius > 144) return '0';
    if ((x - 10) ** 2 + (y - 10) ** 2 <= 16) return '4';
    return radius <= 56 ? '3' : radius <= 104 ? '2' : '1';
  }).join(''))) });

// The reviewed two-ink mint sprite is the shared production default. An explicit
// query can still show the previous shaded sprite or the soft-edge comparison.
// Selection is independent of saved runs, so existing expeditions update too.
const COLLECTOR_ART_QUERY = typeof location === 'undefined' ? '' : new URLSearchParams(location.search).get('collectorArt');
export function collectorArtVariant(value = COLLECTOR_ART_QUERY) {
  return value === 'current' || value === 'flat3' ? value : 'flat2';
}
const flatSpans = [9,6,6,4,4,2,2,2,1,1,0,0,0,0,0,1,1,2,2,2,4,4,6,6,9];
function flatCollectorArt(soft = false) {
  const occupied = (x,y) => x >= 0 && x < 25 && y >= 0 && y < 25 &&
    (soft ? (x-12)**2+(y-12)**2 <= 151 : x >= flatSpans[y] && x < 25-flatSpans[y]);
  const rows = Array.from({length:25},(_,y)=>Array.from({length:25},(_,x)=>{
    if(!occupied(x,y))return '0';
    const edge=!occupied(x-1,y)||!occupied(x+1,y)||!occupied(x,y-1)||!occupied(x,y+1);
    const rim=!occupied(x-2,y)||!occupied(x+2,y)||!occupied(x,y-2)||!occupied(x,y+2);
    // A two-source-pixel contour survives the small flight raster. The softer
    // candidate uses one transition ink at that edge; its face stays uniform.
    if(soft?edge:rim)return '1';
    if(soft&&(rim||!occupied(x-1,y-1)||!occupied(x+1,y-1)||!occupied(x-1,y+1)||!occupied(x+1,y+1)))return '2';
    return soft?'3':'2';
  }).join(''));
  return Object.freeze({width:25,height:25,rows:Object.freeze(rows)});
}
const COLLECTOR_ART = Object.freeze({flat2:flatCollectorArt(),flat3:flatCollectorArt(true)});
const COLLECTOR_PALETTES = Object.freeze({
  flat2:Object.freeze({outer:'#426b61',mid:'#b4dcc0',core:'#b4dcc0',bright:'#b4dcc0'}),
  flat3:Object.freeze({outer:'#4c746a',mid:'#89b69e',core:'#bbdcc0',bright:'#bbdcc0'}),
});

export function companionSprite(role = 'collector', {collectorArt} = {}) {
  return normalizeCompanionRole(role)==='collector' && COLLECTOR_ART[collectorArtVariant(collectorArt)] || ORB;
}

export function companionPalette(role = 'collector', {collectorArt} = {}) {
  if(normalizeCompanionRole(role)==='collector' && COLLECTOR_PALETTES[collectorArtVariant(collectorArt)])return COLLECTOR_PALETTES[collectorArtVariant(collectorArt)];
  return PALETTES[normalizeCompanionRole(role)] || PALETTES.collector;
}

export function makeCompanionSprite(doc,role='collector',options={}){
  const canvas=doc.createElement('canvas'),tint=companionPalette(role,options),art=companionSprite(role,options);
  canvas.width=art.width;canvas.height=art.height;
  const c=canvas.getContext('2d'),inks=[null,tint.outer,tint.mid,tint.core,tint.bright];
  art.rows.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(inks[Number(row[x])]){c.fillStyle=inks[Number(row[x])];c.fillRect(x,y,1,1);}});
  return canvas;
}

export function companionArtSvg(role = 'collector', { className = '',collectorArt } = {}) {
  const id = normalizeCompanionRole(role), art = companionSprite(id,{collectorArt}), palette = companionPalette(id,{collectorArt});
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
  return `<svg xmlns="http://www.w3.org/2000/svg" class="companion-portrait ${classes}" data-role-art="${id}" data-collector-art="${id==='collector'?collectorArtVariant(collectorArt):'current'}" viewBox="-2 -2 29 29" width="${art.width}" height="${art.height}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" role="img" aria-label="${NAMES[id] || 'Collector'} companion"><g class="companion-orbit">${pixels}</g></svg>`;
}

export const WISP_ART=Object.freeze({radius:12.7,size:36,shades:8,
  worldRadius:12.7*.85/(240/390),worldDiameter:2*12.7*.85/(240/390)});
const wispBands=new Map();
// Cache at most 33 fuel bands. Renderers share the contour, shell and shading,
// including fallback mode. No random edge noise or per-frame material work.
export function drawWispBody(c,band,x=0,y=0,radius=WISP_ART.radius){
  band=Math.max(0,Math.min(32,Math.round(band)));
  let cells=wispBands.get(band);
  if(!cells){
    cells=[];const coreRadius=12.5*Math.sqrt(band/32);
    const palette=Array.from({length:9},(_,i)=>`rgb(${44+Math.round(i/8*199)},${52+Math.round(i/8*191)},${54+Math.round(i/8*166)})`);
    for(let py=-13;py<13;py++)for(let px=-13;px<13;px++){
      const distance=Math.hypot(px+.5,py+.5);if(distance>WISP_ART.radius)continue;
      const shell=distance>11.55;
      const raw=Math.min(1,Math.max(0,(coreRadius+1.8-distance)/3.8));
      // Small value changes on the transition only, never a checkerboard face.
      const grain=raw>0&&raw<1?(((px+13)*7+(py+13)*11)%5-2)*.035:0;
      const light=Math.max(0,Math.min(8,Math.round((raw+grain)*8)));
      cells.push({x:px,y:py,ink:shell?((px+py+26)%7===0?'#e2e8d3':'#bccdc1'):palette[light]});
    }
    wispBands.set(band,cells);
  }
  const scale=radius/WISP_ART.radius;
  for(const cell of cells){c.fillStyle=cell.ink;c.fillRect(x+cell.x*scale,y+cell.y*scale,scale,scale);}
}
export function makeWispSprite(doc, band) {
  const canvas = doc.createElement('canvas'); canvas.width = canvas.height = WISP_ART.size;
  drawWispBody(canvas.getContext('2d'),band,WISP_ART.size/2,WISP_ART.size/2);
  return canvas;
}
