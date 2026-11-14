import { pickupKind, getPickupSpec, pickupDisposition, pickupShellRadius } from './pickups.mjs?v=flash-prism-1';
import {sparkImageArt,sparkSymbolArt} from './spark-symbol.mjs?v=flash-prism-1';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const FLASH_ANIMATION = Object.freeze({size:48, frames:48, period:2.4});
export const FLASH_BURST_DURATION = .85;
export const FUEL_ANIMATION = Object.freeze({size:44, frames:120, period:4.8});
const fields = [
  null,
  {base:'#584424', glass:'#ffe3a4', rim:'#ffbd57', glow:'#ffa928', arc:'#ffbf49', core:'#ffe6a0'},
  {base:'#204f35', glass:'#d0f8c8', rim:'#79e692', glow:'#4cda78', arc:'#8cf5a0', core:'#ddffe1'},
  {base:'#525a65', glass:'#edf2fb', rim:'#f6f9ff', glow:'#d8e3f1', arc:'#f2f6ff', core:'#ffffff'},
];

// Each channel strikes, hangs in place briefly, goes out and reappears at a
// different contact on the shell. Its timing is independent of its neighbors.
function dischargeTracks(tier) {
  let seed = 15493 + 4787 * tier;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const tracks = [], channels = [0, 8, 14, 15][tier];
  for (let i=0; i<channels; i++) {
    const offset = random(), events = [];
    const count = 7 + Math.floor(random()*5);
    let total = 0;
    for (let n=0; n<count; n++) {
      const weight = .45 + random() * 1.1;
      events.push({start:total, duration:weight*([0,.65,.65,.55][tier] + random()*.24),
        angle:TAU*(i+.48+(random()-.5)*1.28)/channels,
        bendA:(random()-.5)*.96, bendB:(random()-.5)*.7,
        jitter:random()*TAU, rooted:random()>.23,
        fork:(random()>.49-.10*tier ? 1 : 0)*(random()>.5 ? 1 : -1)*(.29+random()*.47),
        forkTime:.08+random()*.36, rimLength:.83+random()*.12});
      total += weight;
    }
    for (const e of events) { e.start /= total; e.duration /= total; }
    tracks.push({offset,events});
  }
  return tracks;
}
const discharges=[null,dischargeTracks(1),dischargeTracks(2),dischargeTracks(3)];

function paintPlasma(tier, phase, radius, rect, disc, ring) {
  const ink=fields[tier];
  if (tier===3) {
    disc(0,0,radius+5,ink.glow,.19);
    disc(0,0,radius+4,ink.glow,.29);
    disc(0,0,radius+3,ink.arc,.35);
    disc(0,0,radius+2,ink.arc,.48);
    disc(0,0,radius+1,ink.core,.40);
  } else {
    disc(0,0,radius+tier,ink.glow,tier===1?.10:.28);
  }
  disc(0,0,radius,ink.base,.96);
  disc(0,0,radius*.75,ink.glow,.11+tier*.025);
  ring(radius-.45,ink.rim,tier===1?.90:.83,tier===1?1.4:1.2);
  function line(ax,ay,bx,by,energy,hot,branch=false) {
    const length=Math.max(1,Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay))));
    for(let n=0;n<=length;n++){
      const x=Math.round(ax+(bx-ax)*n/length),y=Math.round(ay+(by-ay)*n/length);
      rect(x-1,y-1,3,3,ink.glow,energy*(branch?.17:.28));
      rect(x,y,hot && !branch ? 2 : 1,1,hot ? ink.core : ink.arc,energy);
    }
  }
  let charge=0;
  for(const track of discharges[tier]){
    const t=(phase+track.offset)%1;
    const e=track.events.find(event=>t>=event.start && t<event.start+event.duration);
    if(!e)continue;
    const life=(t-e.start)/e.duration;
    const attack=Math.min(1,(life+.025)/.13),fade=Math.min(1,(1-life)/.28);
    const energy=attack*fade,reach=e.rooted?1:.26+.74*Math.min(1,life/.22);
    const twitch=Math.sin(e.jitter+life*10)*Math.sin(life*Math.PI);
    const a=e.angle+e.bendA+.17*twitch,b=e.angle+e.bendB-.12*twitch;
    const near=radius*.33*reach,far=radius*.63*reach,edge=radius*e.rimLength*reach;
    const ax=Math.cos(a)*near,ay=Math.sin(a)*near,bx=Math.cos(b)*far,by=Math.sin(b)*far;
    const tipX=Math.cos(e.angle)*edge,tipY=Math.sin(e.angle)*edge;
    line(0,0,ax,ay,energy,true);line(ax,ay,bx,by,energy,life<.69);
    line(bx,by,tipX,tipY,energy,life<.4);
    if(e.fork && life>e.forkTime && life<.92){
      const fork=e.angle+e.fork,arm=radius*(.75+.16*Math.sin(Math.PI*life));
      line(bx,by,Math.cos(fork)*arm,Math.sin(fork)*arm,energy,false,true);
    }
    if(reach>.92){
      const x=Math.round(tipX),y=Math.round(tipY);
      rect(x-2,y-1,5,3,ink.glow,energy*.46);
      rect(x-1,y,3,1,ink.core,energy);
      if(tier===3 && e.fork && life>.15 && life<.80){
        const flare=Math.sin(Math.PI*(life-.15)/.65)*energy;
        const nx=Math.cos(e.angle),ny=Math.sin(e.angle);
        const rx=Math.round(nx*radius),ry=Math.round(ny*radius);
        disc(rx,ry,3.2,ink.arc,flare*.43);
        line(x,y,rx+nx*3,ry+ny*3,flare,true,true);
        rect(rx-1,ry-1,3,2,ink.core,flare);
      }
    }
    charge+=energy;
  }
  const core=tier===3?4:3.4;
  disc(0,0,core+2,ink.glow,Math.min(.60,.25+charge*.035));
  disc(0,0,core,ink.arc,.96);
  rect(-2,-1,5,3,ink.core);rect(-1,-2,3,5,ink.core);rect(-2,-2,4,4,ink.core);
  rect(-Math.round(radius*.54),-Math.round(radius*.74),3,1,ink.glass,.81);
}

// Fill a facet one pixel row at a time, both on the flight atlas and in the icon bake.
function triangleRows(rect, ax, ay, bx, by, cx, cy, color, alpha=1) {
  if (ay>by) { [ax,bx]=[bx,ax]; [ay,by]=[by,ay]; }
  if (by>cy) { [bx,cx]=[cx,bx]; [by,cy]=[cy,by]; }
  if (ay>by) { [ax,bx]=[bx,ax]; [ay,by]=[by,ay]; }
  for (let y=Math.ceil(ay-.5); y<cy-.5; y++) {
    const scan=y+.5;
    const edge=ax+(cx-ax)*(scan-ay)/(cy-ay);
    const fold=scan<by ? ax+(bx-ax)*(scan-ay)/(by-ay) : bx+(cx-bx)*(scan-by)/(cy-by);
    const left=Math.ceil(Math.min(edge,fold)-.5),right=Math.ceil(Math.max(edge,fold)-.5);
    if (right>left) rect(left,y,right-left,1,color,alpha);
  }
}

function paintFlashPrism(rect,time,reducedMotion,bodyOnly) {
  const phase=reducedMotion?.37:(time/FLASH_ANIMATION.period)%1;
  const light=(1+Math.cos(TAU*(phase-.08)))/2;
  const face=(...args)=>triangleRows(rect,...args);
  // Violet light follows the prism edges and collects at its three corners.
  if (!bodyOnly) {
    face(0,-23,-23,17,23,17,'#aa79ff',.13+.06*light);
    face(0,-21,-21,15,21,15,'#cb9eff',.28+.12*light);
  }
  face(0,-19,-19,13,19,13,'#d8c7ff');
  face(0,-17,-16,11,16,11,'#523672');
  // The off-center junction gives the three faces different catches of light.
  face(0,-16,-15,10,-3,3,'#bb96ee');
  face(0,-16,-3,3,15,10,'#7953ad');
  face(0,-16,-3,3,15,10,'#cb9ff4',.08+.42*light);
  face(-3,3,-15,10,15,10,'#45296d');
  face(0,-15,-7,4,-3,2,'#e4ccff');
  face(-3,2,13,9,3,6,'#ab79d2');
  face(-2,-6,-7,4,1,2,'#ffefdd',.65+.30*light);
  face(-3,5,-11,9,4,7,'#d9b2e9',.75);
  const sweep=-13+Math.round(phase*24);
  const leftEdge=-Math.round((sweep+18)*.58);
  rect(leftEdge,sweep,3,1,'#fff4e9',.96);
  rect(leftEdge+1,sweep-1,2,1,'#fff4e9',.76);
  // A narrow reflection crosses the right facet just before it lights the foot.
  const catchLight=Math.sin(Math.PI*phase)**3;
  const cut=Math.max(-13,Math.min(7,sweep));
  const span=(cut+16)/26;
  const inner=Math.round(-3*Math.min(1,(cut+16)/19)),outer=Math.round(span*15);
  rect(inner,cut,Math.max(1,outer-inner),1,'#ffe6ff',catchLight*.9);
  rect(inner+1,cut+1,Math.max(1,outer-inner),1,'#d5a4f4',catchLight*.7);
  const corners=[[0,-18],[-18,12],[18,12]];
  for (let i=0;i<corners.length;i++) {
    const [x,y]=corners[i];
    const glint=Math.max(0,Math.cos(TAU*(phase-i/3)))**6;
    const radius=1+Math.round(glint*2);
    rect(x-radius,y,2*radius+1,1,'#f8eaff',.65+.35*glint);
    rect(x,y-radius,1,2*radius+1,'#fffbea',.65+.35*glint);
  }
}

// A broken rim and its three departing facets share the idle prism's colors.
export function drawFlashBurst(ctx,x,y,elapsed,scale=1,reducedMotion=false) {
  if (elapsed<0 || elapsed>=FLASH_BURST_DURATION) return;
  const age=elapsed/FLASH_BURST_DURATION;
  const fade=1-age;
  const travel=1-fade**3;
  const size=(reducedMotion ? 16 : 11+37*travel)*scale;
  ctx.save();
  const inherited=ctx.globalAlpha;
  const rect=(left,top,width,height,color,alpha=1)=>{
    ctx.globalAlpha=inherited*alpha;
    ctx.fillStyle=color;
    ctx.fillRect(left,top,width,height);
  };
  const facet=(ax,ay,bx,by,cx,cy,color,alpha)=>
    triangleRows(rect,x+ax,y+ay,x+bx,y+by,x+cx,y+cy,color,alpha);
  const flash=Math.max(0,1-age*2.5);
  facet(0,-size,-size*.9,size*.64,size*.9,size*.64,'#c3a3ff',reducedMotion?fade*fade*.38:flash*.78);
  if (!reducedMotion && age<.66) {
    const corners=[[0,-size],[-size*.9,size*.64],[size*.9,size*.64]];
    const shear=.10+age*.74;
    const alpha=Math.max(0,1-age/.66);
    for (let i=0;i<3;i++) {
      const from=corners[i],to=corners[(i+1)%3];
      const dx=to[0]-from[0],dy=to[1]-from[1];
      const step=1.6*scale/Math.max(1,Math.hypot(dx,dy));
      for (const side of [0,1]) {
        const tail=side? .52+shear*.34 : shear;
        const head=side? 1-shear*.4 : .48-shear*.65;
        const ax=from[0]+tail*dx,ay=from[1]+tail*dy;
        const bx=from[0]+head*dx,by=from[1]+head*dy;
        facet(ax,ay,bx,by,ax+dy*step,ay-dx*step,'#dcbeff',alpha);
      }
    }
  }
  const rays=reducedMotion?3:15;
  for (let i=0;i<rays;i++) {
    const angle=-Math.PI/2+TAU*i/rays;
    const corner=i%5===0;
    const radius=(reducedMotion?14:(corner?79:43+(i*13)%23)*travel+5)*scale;
    const dx=Math.cos(angle),dy=Math.sin(angle);
    const nx=dx*radius,ny=dy*radius;
    const width=Math.max(1,(corner?4.5:2.2)*scale*(.5+fade));
    const length=(corner?16:8)*scale*fade;
    facet(nx,ny,nx-dx*length-dy*width,ny-dy*length+dx*width,
      nx-dx*length+dy*width,ny-dy*length-dx*width,
      corner?'#fff6e8':i%2?'#e4c2ff':'#b397ff',fade*(corner?1:.85));
  }
  if (flash>0) {
    const extent=Math.round((reducedMotion?8:20)*scale*flash),cx=Math.round(x),cy=Math.round(y);
    rect(cx-extent,cy,extent*2+1,1,'#fff6ea',flash);
    rect(cx,cy-extent,1,extent*2+1,'#fff6ea',flash);
  }
  ctx.restore();
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
    const phase=reducedMotion?0:((time/FUEL_ANIMATION.period)%1+1)%1;
    paintPlasma(spec.plasma,phase,pickupShellRadius(kind),rect,disc,ring);
    return pixels;
  }
  if(kind==='sight'){
    paintFlashPrism(rect,time,reducedMotion,bodyOnly);
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
    const tide = reducedMotion ? 0 : Math.sin(t*TAU/3.2);
    halo(9, '#a56c87', .12+tide*.045);
    disc(0, 0, 5, '#795968', .72); disc(0, 0, 4, '#d798ad', .85);
    disc(0, 0, 2.7, '#24202d'); disc(0, 0, 1.3, '#080b14');
    rect(-3, -3, 3, 1, '#edbdc7', .9); rect(-4, -2, 1, 3, '#c98caa', .7);
    rect(1, 3, 2, 1, '#93667c', .8);
    rect(Math.round(-3+tide*2),-4,2,1,'#ffdad7',.80);
  } else {
    halo(7, '#cabb99', .1);
    disc(0, 0, 3, '#bfaf8d', .65); disc(0, 0, 2, '#f5e6bc', .95);
    rect(-1, -2, 2, 2, '#fff8dd'); rect(1, 0, 1, 1, '#fffdec');
  }
  return pixels;
}

const atlases = new WeakMap();
const plasmaCycle=[FUEL_ANIMATION.period,FUEL_ANIMATION.frames];
const cycles={light:plasmaCycle,cluster:plasmaCycle,cache:plasmaCycle,sight:[FLASH_ANIMATION.period,FLASH_ANIMATION.frames],dark:[Math.PI*2,32],dusk:[3.2,16]};
// The offline menu assets are generated from this exact paint pass.
export function drawFuelFrame(context,x,y,kind,frame,reducedMotion=false){
  const time=frame/FUEL_ANIMATION.frames*FUEL_ANIMATION.period;
  for(const p of packetPixels(kind,{time,reducedMotion})){
    context.globalAlpha=p.alpha;context.fillStyle=p.color;
    context.fillRect(x+p.x,y+p.y,p.width,p.height);
  }
}
function cachedSprite(doc,id,frame,tiny,reducedMotion,bodyOnly) {
  let cache=atlases.get(doc);
  if(!cache){cache=new Map();atlases.set(doc,cache);}
  const key=id+':'+frame+':'+tiny+':'+reducedMotion+':'+bodyOnly;
  if(cache.has(key))return cache.get(key);
  const [period,frames]=cycles[id]||[1,1];
  const sprite=doc.createElement('canvas'),fuel=Boolean(getPickupSpec(id).plasma);
  const side=fuel?FUEL_ANIMATION.size:72;
  sprite.width=sprite.height=side;
  const c=sprite.getContext('2d');
  if(fuel)drawFuelFrame(c,side/2,side/2,id,frame,reducedMotion);
  else for(const p of packetPixels(id,{time:frame/frames*period,reducedMotion,tiny,bodyOnly})){
    c.globalAlpha=p.alpha;c.fillStyle=p.color;c.fillRect(side/2+p.x,side/2+p.y,p.width,p.height);
  }
  cache.set(key,sprite);
  return sprite;
}
const warmups=new WeakMap();
export function prepareFuelSprites(doc,reducedMotion=false) {
  const frames=reducedMotion?1:FUEL_ANIMATION.frames;
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
export function drawPickup(context,x,y,{kind='light',time=0,phase=0,reducedMotion=false,tiny=false,bodyOnly=false,alpha=1,scale=1}={}){
  const id=pickupKind(kind),size=Math.max(.1,Number(scale)||1),doc=context.canvas?.ownerDocument;
  const [period,frames]=cycles[id]||[1,1];
  const clock=time+phase*period/TAU;
  const frame=reducedMotion?0:Math.floor(((clock%period+period)%period)/period*frames);
  const plasma=Boolean(getPickupSpec(id).plasma);
  const sprite=doc&&cachedSprite(doc,id,frame,plasma?false:tiny,reducedMotion,plasma?false:bodyOnly);
  context.save();const inherited=context.globalAlpha*clamp(Number(alpha)||0,0,1);
  if(sprite){
    const drawSize=size*(plasma&&tiny?.62:1);
    context.globalAlpha=inherited;context.imageSmoothingEnabled=false;
    const width=sprite.width*drawSize;
    context.drawImage(sprite,Math.round(x-width/2),Math.round(y-width/2),Math.round(width),Math.round(width));
  }
  else for(const p of packetPixels(id,{time:plasma?frame/frames*period:clock,reducedMotion,tiny,bodyOnly})){context.globalAlpha=inherited*p.alpha;context.fillStyle=p.color;context.fillRect(Math.round(x+p.x*size),Math.round(y+p.y*size),Math.max(1,Math.round(p.width*size)),Math.max(1,Math.round(p.height*size)))}
  context.restore();
}

export function drawSparkSymbol(context,x,y,{size=16,time=0,reducedMotion=false}={}){
  drawPickup(context,x,y,{kind:'light',time,reducedMotion,scale:size/FUEL_ANIMATION.size});
}

export function pickupArtSvg(kind = 'light', { className = '' } = {}) {
  const id = pickupKind(kind), name = getPickupSpec(id).name;
  const classes = String(className || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 120);
  const tier=getPickupSpec(id).plasma;
  if(tier)return `<svg xmlns="http://www.w3.org/2000/svg" class="${classes}" viewBox="0 0 44 44" width="36" height="36" role="img" aria-label="${name}" shape-rendering="crispEdges">${sparkSymbolArt(0,0,44,tier)}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${classes}" viewBox="0 0 48 48" width="36" height="36" role="img" aria-label="${name}" shape-rendering="crispEdges">${sparkImageArt(id,0,0,48)}</svg>`;
}
