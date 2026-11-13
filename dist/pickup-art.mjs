import { pickupKind, getPickupSpec, pickupDisposition } from './pickups.mjs?v=boon-glow-1';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// Shared low-resolution paint operations: the game and the field guide use
// the same bodies, shading, silhouettes and halo colors, with no gem frames.
function packetPixels(kind, { time = 0, reducedMotion = false, tiny = false, bodyOnly = false } = {}) {
  const pixels = []; let shrink = tiny ? .62 : 1;
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
  const ring = (radius,color,alpha) => {
    const outer=radius+.6,inner=Math.max(0,radius-.6);
    for(let y=-Math.floor(outer);y<=Math.floor(outer);y++){
      const edge=Math.floor(Math.sqrt(Math.max(0,outer*outer-y*y)));
      const inset=Math.abs(y)>=inner?0:Math.ceil(Math.sqrt(Math.max(0,inner*inner-y*y)));
      if(!inset)rect(-edge,y,edge*2+1,1,color,alpha);
      else if(edge>=inset){rect(-edge,y,edge-inset+1,1,color,alpha);rect(inset,y,edge-inset+1,1,color,alpha)}
    }
  };
  const contact = getPickupSpec(kind).contactRadius, warning = pickupDisposition(kind)==='warning';
  // Fill the space between the item and its contact ring with stepped pixel
  // radiance. These static layers are baked into the existing sprite atlas.
  // The body is painted afterwards, preserving silhouettes and dark cores.
  if(!bodyOnly){
    halo(contact, warning ? '#d34e43' : '#d9ebbd', .09);
    const field=contact-1.7;
    disc(0,0,field,warning?'#c9554c':'#cbdcb7',warning?.15:.17);
    for(const fraction of [.86,.72,.58,.44])
      disc(0,0,field*fraction,warning?'#ed8971':'#f4edc9',warning?.055:.075);
    oval(-field*.12,-field*.18,field*.58,field*.48,warning?'#f9a58a':'#fff4d9',.065);
    ring(contact - 1, warning ? '#f58b79' : '#e4f2ca', warning ? .78 : .54);
  }
  shrink *= 1.2;
  const t = reducedMotion ? 0 : time;
  if (kind === 'dark') {
    // Dark body, readable accretion rim, a few inward-spiralling pixel sparks.
    // Fixed tiny particle count; no live geometry or additional lighting pass.
    halo(12, '#a63832', .11);
    disc(0, 0, 7, '#b94f47', .85);
    disc(0, 0, 6, '#302538');
    disc(0, 0, 5, '#020306'); disc(0, 0, 3, '#000000');
    for(let i=0;i<4;i++){
      const phase=(t*.45+i/4)%1, radius=12-phase*5;
      const angle=t*1.8+i*TAU/4+phase*1.2;
      rect(Math.round(Math.cos(angle)*radius),Math.round(Math.sin(angle)*radius),1,1,'#f28b78',.45+phase*.4);
    }
    rect(-5,-4,3,1,'#ffc0a0',.9);rect(4,3,2,1,'#c76c60',.7);
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
    rect(2, 2, 2, 1, '#d6a557', .75); for(const [x,y,w,h] of [[-1,-9,2,2],[-1,8,2,2],[-9,-1,2,2],[8,-1,2,2]])rect(x,y,w,h,'#ffe6a8',.9);
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
    oval(0, 0, 6, 3, '#795d9c', .8); oval(0, 0, 5, 2, '#c5a5ed', .95);
    disc(-1, -1, 1.7, '#f0dfff');
    rect(-4, 0, 2, 2, '#b48bdb', .8); rect(2, -1, 2, 2, '#c5a5ed', .9);
  } else {
    halo(7, '#cabb99', .1);
    disc(0, 0, 3, '#bfaf8d', .65); disc(0, 0, 2, '#f5e6bc', .95);
    rect(-1, -2, 2, 2, '#fff8dd'); rect(1, 0, 1, 1, '#fffdec');
  }
  return pixels;
}

const atlases = new WeakMap();
const cycles={cache:[Math.PI*2/1.8,24],charge:[Math.PI*2/22,12],sight:[1/.48,24],dark:[Math.PI*2,32]};
export function drawPickup(context,x,y,{kind='light',time=0,reducedMotion=false,tiny=false,bodyOnly=false,alpha=1,scale=1}={}){
  const id=pickupKind(kind),size=Math.max(.1,Number(scale)||1),doc=context.canvas?.ownerDocument;
  const [period,frames]=cycles[id]||[1,1],frame=reducedMotion?0:Math.floor(((time%period+period)%period)/period*frames);
  let sprite;
  if(doc){let cache=atlases.get(doc);if(!cache){cache=new Map();atlases.set(doc,cache)}const key=id+':'+frame+':'+tiny+':'+reducedMotion+':'+bodyOnly;sprite=cache.get(key);
    if(!sprite){sprite=doc.createElement('canvas');sprite.width=sprite.height=72;const c=sprite.getContext('2d',{willReadFrequently:true});
      for(const p of packetPixels(id,{time:frame/frames*period,reducedMotion,tiny,bodyOnly})){c.globalAlpha=p.alpha;c.fillStyle=p.color;c.fillRect(36+p.x,36+p.y,p.width,p.height)}cache.set(key,sprite);
    }
  }
  context.save();const inherited=context.globalAlpha*clamp(Number(alpha)||0,0,1);
  if(sprite){context.globalAlpha=inherited;context.imageSmoothingEnabled=false;context.drawImage(sprite,Math.round(x-36*size),Math.round(y-36*size),Math.round(72*size),Math.round(72*size))}
  else for(const p of packetPixels(id,{time,reducedMotion,tiny,bodyOnly})){context.globalAlpha=inherited*p.alpha;context.fillStyle=p.color;context.fillRect(Math.round(x+p.x*size),Math.round(y+p.y*size),Math.max(1,Math.round(p.width*size)),Math.max(1,Math.round(p.height*size)))}
  context.restore();
}

export function pickupArtSvg(kind = 'light', { className = '' } = {}) {
  const id = pickupKind(kind), name = getPickupSpec(id).name;
  const classes = String(className || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 120);
  const pixels = packetPixels(id, { reducedMotion: true }).map(pixel =>
    `<rect x="${pixel.x}" y="${pixel.y}" width="${pixel.width}" height="${pixel.height}" fill="${pixel.color}" opacity="${pixel.alpha}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${classes}" viewBox="-36 -36 72 72" width="36" height="36" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" role="img" aria-label="${name}">${pixels}</svg>`;
}
