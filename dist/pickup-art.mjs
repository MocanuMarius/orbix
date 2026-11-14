import { pickupKind, getPickupSpec, pickupDisposition, pickupShellRadius } from './pickups.mjs?v=night-atlas-1';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const plasmaPeriod = 1.2, plasmaFrames = 24;
const fields = [
  null,
  {base:'#293432',glass:'#afbca2',rim:'#e2d9af',glow:'#d2bd83',arc:'#e8d797',core:'#ffedbf'},
  {base:'#2c4742',glass:'#a7d3b6',rim:'#c5ebc6',glow:'#6ec0aa',arc:'#a2edcf',core:'#edffde'},
  {base:'#665037',glass:'#e9b357',rim:'#ffdf8a',glow:'#e7a74c',arc:'#ffda77',core:'#fff4ca'},
];

// Wide dark sectors distinguish the sparse globe; the cache occupies the
// whole shell with branching discharges, including in a still illustration.
function paintPlasma(tier, phase, radius, rect, disc, ring) {
  const ink=fields[tier],clock=TAU*phase;
  const count=[0,2,4,6][tier]+(tier>1&&Math.sin(clock+.7)>.42?1:0);
  disc(0,0,radius,ink.base,.88);
  ring(radius-.5,ink.rim,.85,1.2);
  const rotation=clock+Math.sin(clock*2)*.14;
  // Rasterize each filament as a continuous glowing, irregular filament.
  // The first band remains mostly glass even at the brightest frame.
  function arcLine(ax,ay,bx,by,step,hot) {
    const n=Math.max(1,Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay))));
    for(let i=0;i<=n;i++){
      const u=i/n,x=Math.round(ax+(bx-ax)*u),y=Math.round(ay+(by-ay)*u);
      if(tier>1||step>1)rect(x-1,y-1,3,3,ink.glow,tier===3?.27:.18);
      rect(x,y,hot&&tier===3?2:1,1,hot?ink.core:ink.arc,.97);
    }
  }
  for(let i=0;i<count;i++){
    const angle=rotation+i*TAU/count+(tier===1?i*.34:Math.sin(i*4.2+clock*2)*.12);
    const sweep=Math.sin(clock*3+i*2.41),wave=Math.cos(clock*4+i*2.7);
    const mid=angle+.23*sweep,outer=angle-.15*wave;
    const x1=Math.cos(mid)*radius*.35,y1=Math.sin(mid)*radius*.35;
    const x2=Math.cos(outer)*radius*.65,y2=Math.sin(outer)*radius*.65;
    const x3=Math.cos(angle)*radius*.92,y3=Math.sin(angle)*radius*.92;
    arcLine(0,0,x1,y1,0,true);arcLine(x1,y1,x2,y2,1,tier>1);
    arcLine(x2,y2,x3,y3,2,wave>.0);
    rect(Math.round(x3)-1,Math.round(y3),tier===3?3:2,1,ink.core,.95);
    if(tier===3||(tier===2&&(i%2===0||sweep>.65))){
      const fork=angle+(i%2?-.34:.34),r=radius*(tier===3?.90:.78);
      arcLine(x1,y1,Math.cos(fork)*r,Math.sin(fork)*r,3,tier===3&&wave>.4);
    }
  }
  disc(0,0,tier===3?3:2,ink.arc,.94);
  rect(-1,-1,tier===3?4:3,2,ink.core,1);
  rect(-Math.round(radius*.53),-Math.round(radius*.74),3,1,ink.glass,.83);
}

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
  const ring = (radius,color,alpha,thickness=1.2) => {
    const outer=radius+thickness/2,inner=Math.max(0,radius-thickness/2);
    for(let y=-Math.floor(outer);y<=Math.floor(outer);y++){
      const edge=Math.floor(Math.sqrt(Math.max(0,outer*outer-y*y)));
      const inset=Math.abs(y)>=inner?0:Math.ceil(Math.sqrt(Math.max(0,inner*inner-y*y)));
      if(!inset)rect(-edge,y,edge*2+1,1,color,alpha);
      else if(edge>=inset){rect(-edge,y,edge-inset+1,1,color,alpha);rect(inset,y,edge-inset+1,1,color,alpha)}
    }
  };
  const spec=getPickupSpec(kind),contact=spec.contactRadius,warning=pickupDisposition(kind)==='warning';
  if(spec.plasma){
    const phase=reducedMotion?0:((time/plasmaPeriod)%1+1)%1;
    paintPlasma(spec.plasma,phase,pickupShellRadius(kind),rect,disc,ring);
    return pixels;
  }
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
const plasmaCycle=[plasmaPeriod,plasmaFrames];
const cycles={light:plasmaCycle,cluster:plasmaCycle,cache:plasmaCycle,charge:[Math.PI*2/22,12],sight:[1/.48,24],dark:[Math.PI*2,32]};
function cachedSprite(doc,id,frame,tiny,reducedMotion,bodyOnly) {
  let cache=atlases.get(doc);
  if(!cache){cache=new Map();atlases.set(doc,cache);}
  const key=id+':'+frame+':'+tiny+':'+reducedMotion+':'+bodyOnly;
  if(cache.has(key))return cache.get(key);
  const [period,frames]=cycles[id]||[1,1];
  const sprite=doc.createElement('canvas');
  sprite.width=sprite.height=72;
  const c=sprite.getContext('2d');
  for(const p of packetPixels(id,{time:frame/frames*period,reducedMotion,tiny,bodyOnly})){
    c.globalAlpha=p.alpha;c.fillStyle=p.color;c.fillRect(36+p.x,36+p.y,p.width,p.height);
  }
  cache.set(key,sprite);
  return sprite;
}
const warmups=new WeakMap();
export function prepareFuelSprites(doc,reducedMotion=false) {
  const frames=reducedMotion?1:plasmaFrames;
  const key=reducedMotion?'quiet':'moving';
  let pending=warmups.get(doc);if(!pending){pending={};warmups.set(doc,pending);}
  if(!pending[key])pending[key]=(async()=>{
    for(let frame=0;frame<frames;frame++){
      for(const kind of ['light','cluster','cache'])cachedSprite(doc,kind,frame,false,reducedMotion,false);
      if(frame%3===2&&frame<frames-1)await new Promise(resolve=>setTimeout(resolve,0));
    }
  })();
  return pending[key];
}
export function drawPickup(context,x,y,{kind='light',time=0,reducedMotion=false,tiny=false,bodyOnly=false,alpha=1,scale=1}={}){
  const id=pickupKind(kind),size=Math.max(.1,Number(scale)||1),doc=context.canvas?.ownerDocument;
  const [period,frames]=cycles[id]||[1,1],frame=reducedMotion?0:Math.floor(((time%period+period)%period)/period*frames);
  const plasma=Boolean(getPickupSpec(id).plasma);
  const sprite=doc&&cachedSprite(doc,id,frame,plasma?false:tiny,reducedMotion,plasma?false:bodyOnly);
  context.save();const inherited=context.globalAlpha*clamp(Number(alpha)||0,0,1);
  if(sprite){
    const drawSize=size*(plasma&&tiny?.62:1);
    context.globalAlpha=inherited;context.imageSmoothingEnabled=false;
    context.drawImage(sprite,Math.round(x-36*drawSize),Math.round(y-36*drawSize),Math.round(72*drawSize),Math.round(72*drawSize));
  }
  else for(const p of packetPixels(id,{time,reducedMotion,tiny,bodyOnly})){context.globalAlpha=inherited*p.alpha;context.fillStyle=p.color;context.fillRect(Math.round(x+p.x*size),Math.round(y+p.y*size),Math.max(1,Math.round(p.width*size)),Math.max(1,Math.round(p.height*size)))}
  context.restore();
}

const guideBodies=new Map();
export function pickupArtSvg(kind = 'light', { className = '' } = {}) {
  const id = pickupKind(kind), name = getPickupSpec(id).name;
  const classes = String(className || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 120);
  if(!guideBodies.has(id)){
    guideBodies.set(id,packetPixels(id,{reducedMotion:true}).map(pixel =>
      `<rect x="${pixel.x}" y="${pixel.y}" width="${pixel.width}" height="${pixel.height}" fill="${pixel.color}" opacity="${pixel.alpha}"/>`).join(''));
  }
  const viewBox=getPickupSpec(id).plasma?'-22 -22 44 44':'-36 -36 72 72';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${classes}" viewBox="${viewBox}" width="36" height="36" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" role="img" aria-label="${name}">${guideBodies.get(id)}</svg>`;
}
