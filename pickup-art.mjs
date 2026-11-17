import { pickupKind, getPickupSpec, pickupDisposition, PLASMA_SHELL_RADIUS, SPARK_ART_SCALE } from './pickups.mjs?v=biomes-1';
import {sparkImageArt,sparkSymbolArt,DUSK_MOTIF_PIXELS} from './spark-symbol.mjs?v=biomes-1';
import {drawPickupHandlingCue,pickupRingSvg} from './pickup-handling-cue.mjs?v=biomes-1';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const FLASH_ANIMATION = Object.freeze({size:48, frames:48, period:2.4});
export const FUEL_ANIMATION = Object.freeze({size:44, frames:120, period:4.8});
const fields = [
  null,
  {base:'#494943', glass:'#fffaf0', rim:'#ece6d4', glow:'#d8ccb2', arc:'#fbefd9', core:'#fffdf6'},
  {base:'#414c48', glass:'#f1fff7', rim:'#e0eee4', glow:'#c1d7c8', arc:'#eaf9ee', core:'#fafffc'},
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

function paintPlasma(tier, phase, radius, rect, disc, ring, bodyOnly) {
  const ink=fields[tier];
  if (bodyOnly) {
    // The shell stays at the pickup site. Only the illuminated plasma is carried.
    disc(0,0,radius*.92,ink.glow,.19);
    disc(0,0,radius*.72,ink.arc,.17);
  } else if (tier===3) {
    ring(radius+4,ink.glow,.08,2);
    ring(radius+3,ink.glow,.13,2);
    ring(radius+2,ink.arc,.18,2);
    ring(radius+1,ink.arc,.25,1.5);
  } else {
    ring(radius+tier,ink.glow,tier===1?.10:.20,2);
  }
  if (!bodyOnly) {
    disc(0,0,radius,ink.base,.46);
    disc(0,0,radius*.75,ink.glow,.045+tier*.01);
    ring(radius-.45,ink.rim,tier===1?.90:.83,tier===1?1.4:1.2);
  }
  function line(ax,ay,bx,by,energy,hot,branch=false) {
    const length=Math.max(1,Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay))));
    for(let n=0;n<=length;n++){
      const x=Math.round(ax+(bx-ax)*n/length),y=Math.round(ay+(by-ay)*n/length);
      rect(x-1,y-1,3,3,ink.glow,energy*(branch?.17:.28));
      rect(x,y,hot && !branch ? 2 : 1,1,hot ? ink.core : ink.arc,energy);
    }
  }
  // A larger volume has more discharges, not larger source pixels. Every
  // shell and channel is painted on the same projected one-pixel grid.
  const extra=radius>35?richTracks.slice(discharges[3].length):[];
  let charge=0;
  for(const track of [...discharges[tier],...extra]){
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
    const segments=Math.max(3,Math.min(28,Math.ceil(radius/3)));
    let lastX=0,lastY=0;
    for(let j=1;j<=segments;j++){
      const f=j/segments,bend=(1-f)*(e.bendA*(1-f)+e.bendB*f);
      const kink=(Math.sin(e.jitter+j*1.93+twitch*.9)*.043+Math.sin(j*.73+life*3)*.055)*Math.sin(Math.PI*f);
      const a=e.angle+bend+kink,rr=radius*e.rimLength*reach*f;
      const x=Math.cos(a)*rr,y=Math.sin(a)*rr;
      line(lastX,lastY,x,y,energy,life<.69);lastX=x;lastY=y;
    }
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
  if(!bodyOnly&&radius>12)for(let i=0;i<Math.min(58,Math.floor(radius*.65));i++){
    const [x,y,depth]=inclusions[i];
    rect(Math.round(x*radius),Math.round(y*radius),1,1,ink.glass,.13+depth*.20);
  }
  const core=2.7+Math.sqrt(radius)*.16;
  disc(0,0,core+2,ink.glow,Math.min(.60,.25+charge*.035));
  disc(0,0,core,ink.arc,.96);
  rect(-2,-1,5,3,ink.core);rect(-1,-2,3,5,ink.core);rect(-2,-2,4,4,ink.core);
  if (!bodyOnly) rect(-Math.round(radius*.54),-Math.round(radius*.74),3,1,ink.glass,.81);
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
  const phase = reducedMotion ? .25 : time / FLASH_ANIMATION.period;
  const breath = .5 + .5 * Math.sin(TAU * phase);
  // Only light and transparency describe this pickup. The solid centre stays
  // white; the broader, dimmer copies of the triangle feather the silhouette.
  const face = (radius,alpha) => triangleRows(rect,0,-radius,-radius,radius*.70,
    radius,radius*.70,'#ffffff',alpha);
  if (!bodyOnly) {
    face(23,.06+.06*breath);
    face(21,.11+.09*breath);
    face(19,.22+.11*breath);
  }
  face(17,.74+.10*breath);
  face(15,1);
  // Light escapes at the tips at different times in the slow pulse.
  for (let i=0;i<3;i++) {
    const glint = Math.max(0,Math.cos(TAU*(phase-i/3)))**4;
    const x = i===0 ? 0 : i===1 ? -15 : 15;
    const y = i===0 ? -16 : 10;
    rect(x-1,y-1,3,3,'#ffffff',.55+.44*glint);
    if (glint>.1) {
      rect(x-3,y,7,1,'#ffffff',glint*.72);
      rect(x,y-3,1,7,'#ffffff',glint*.72);
    }
  }
}

// Shared low-resolution paint operations: the game and the field guide use
// the same bodies, shading, silhouettes and halo colors, with no gem frames.
function packetPixels(kind, { time = 0, reducedMotion = false, tiny = false, bodyOnly = false, rasterScale = 1 } = {}, paint=null) {
  const pixels = [];
  const emit=(x,y,width,height,color,alpha)=>{
    if(paint)paint(x,y,width,height,color,alpha);
    else pixels.push({x,y,width,height,color,alpha});
  };
  let shrink = (tiny ? .62 : 1) * (kind === 'sight' ? 1 : SPARK_ART_SCALE);
  const rect = (x, y, width, height, color, alpha = 1) => {
    if (kind === 'sight') {
      emit(x*shrink,y*shrink,width*shrink,height*shrink,color,alpha);
      return;
    }
    const left = Math.round(x * shrink), top = Math.round(y * shrink);
    const w = Math.round((x + width) * shrink) - left;
    const h = Math.round((y + height) * shrink) - top;
    if (w > 0 && h > 0) emit(left,top,w,h,color,alpha);
  };
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
    shrink=1;
    const phase=reducedMotion?0:((time/FUEL_ANIMATION.period)%1+1)%1;
    paintPlasma(spec.plasma,phase,PLASMA_SHELL_RADIUS*SPARK_ART_SCALE*rasterScale,rect,disc,ring,bodyOnly);
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
    halo(12, '#a56c87', .12+tide*.045);
    for(const [x,y,width,height,color] of DUSK_MOTIF_PIXELS)rect(x-10,y-10,width,height,color);
    if(tide>.35)rect(-7,-6,2,1,'#ffe0df',tide*.7);
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
function frameAt(clock, period, frames, reducedMotion) {
  return reducedMotion ? 0 : Math.floor(((clock % period + period) % period) / period * frames);
}
// The offline menu assets are generated from this exact paint pass.
export function drawFuelFrame(context,x,y,kind,frame,reducedMotion=false,bodyOnly=false,rasterScale=1){
  const time=frame/FUEL_ANIMATION.frames*FUEL_ANIMATION.period;
  packetPixels(kind,{time,reducedMotion,bodyOnly,rasterScale},(px,py,width,height,color,alpha)=>{
    context.globalAlpha=alpha;context.fillStyle=color;
    context.fillRect(x+px,y+py,width,height);
  });
}
// This controls source detail only. Body size, collision size and fuel remain
// untouched. Nearest-neighbor presentation keeps a comparable grain at every
// size instead of magnifying the medium sprite or supersampling the giant.
export function sparkRasterMetrics(scale=1){
  const density=Math.max(.5,Math.min(16,Math.round((Number(scale)||1)*4)/4));
  const radius=PLASMA_SHELL_RADIUS*SPARK_ART_SCALE*density;
  return {density,radius,side:density===1?FUEL_ANIMATION.size:2*Math.ceil(radius+7)};
}
const adaptiveFuelAtlases=new WeakMap();
function adaptiveFuelSprite(doc,id,frame,bodyOnly,scale,reducedMotion){
  const {density,side}=sparkRasterMetrics(scale);
  let cache=adaptiveFuelAtlases.get(doc);
  if(!cache){cache={small:new Map(),large:[],next:0};adaptiveFuelAtlases.set(doc,cache);}
  const key=[id,frame,bodyOnly,density,reducedMotion].join(':');
  if(cache.small.has(key))return cache.small.get(key);
  for(const slot of cache.large)if(slot.key===key)return slot.canvas;
  let sprite;
  if(side<=64){
    sprite=doc.createElement('canvas');
    cache.small.set(key,sprite);
    if(cache.small.size>256)cache.small.delete(cache.small.keys().next().value);
  }else{
    let slot;
    if(cache.large.length<8){slot={canvas:doc.createElement('canvas')};cache.large.push(slot);}
    else{slot=cache.large[cache.next];cache.next=(cache.next+1)%cache.large.length;}
    slot.key=key;sprite=slot.canvas;
  }
  if(sprite.width!==side||sprite.height!==side)sprite.width=sprite.height=side;
  const c=sprite.getContext('2d');c.clearRect(0,0,side,side);
  drawFuelFrame(c,side/2,side/2,id,frame,reducedMotion,bodyOnly,density);
  sprite.sparkTexelScale=density;
  return sprite;
}
// The cropped surfaces below are sized for the projected field sprite. Keep
// their coordinate system in shell radii so the plasma, cargo and absorption
// sample the same material even as their raster resolution changes.
const largeAtlases=new WeakMap();
const richTracks=[...discharges[3],...discharges[3].map(track=>({
  offset:(track.offset+.373)%1,
  events:track.events.map(event=>({...event,angle:event.angle+2.47,jitter:event.jitter+.91}))
}))];
// Fixed inclusions in the glass stay attached to it as the plasma changes
// frames. Keep their diameter near one final raster pixel at either mass.
const inclusions=Array.from({length:58},(_,i)=>{
  const angle=i*2.39996323, depth=(i*.61803399+.23)%1;
  const radial=.31+.65*Math.sqrt(depth);
  return [Math.cos(angle)*radial,Math.sin(angle)*radial,(i*.427+.37)%1];
});

function largeSparkArt(ctx,id,phase,bodyOnly,mass,radius,pen) {
  const dark=!getPickupSpec(id).plasma,giant=mass===10;
  const glow=dark?'#e67b79':'#b5d8e8',bright=dark?'#ffb7a9':'#effaff';
  const ring=(r,start,end,color,alpha,width)=>{
    ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.strokeStyle=color;
    ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.stroke();
  };
  const disc=(x,y,r,color,alpha)=>{
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=color;
    ctx.globalAlpha=alpha;ctx.fill();
  };
  ctx.translate(ctx.canvas.width/2,ctx.canvas.height/2);
  ctx.scale(radius,radius);
  ctx.lineCap='round';ctx.lineJoin='round';

  // The interior has depth but transmits the silhouette of a passage behind it.
  // A narrow reflected crescent illuminates the glass rather than filling it.
  if(!bodyOnly){
    const glass=ctx.createRadialGradient(-.13,-.16,.07,0,0,1.11);
    glass.addColorStop(0,dark?'rgba(42,23,41,.52)':'rgba(54,67,78,.43)');
    glass.addColorStop(.71,dark?'rgba(57,29,40,.37)':'rgba(65,79,94,.27)');
    glass.addColorStop(.94,dark?'rgba(104,45,53,.43)':'rgba(116,141,155,.32)');
    glass.addColorStop(.99,dark?'rgba(205,88,82,.58)':'rgba(180,210,222,.54)');
    glass.addColorStop(1,'rgba(0,0,0,0)');
    disc(0,0,1.11,glass,1);
    ring(1,0,TAU,glow,.29,pen*3.1);
    ring(1,0,TAU,bright,.81,pen);
    ring(.974,3.66,4.79,bright,.58,pen*.72);
    ring(.956,3.87,4.37,bright,.33,pen*.66);
    ring(.985,.54,1.07,glow,.48,pen*.72);
    const specks=giant?58:24;
    for(let i=0;i<specks;i++){
      const [x,y,depth]=inclusions[i];
      const shimmer=.5+.5*Math.sin(phase*TAU+i*2.14);
      disc(x,y,pen*(.43+.41*depth),bright,.12+.24*depth+.13*shimmer);
    }
    // Hairline reflections follow the circumference, separated by bare glass.
    for(let i=0;i<(giant?17:9);i++){
      const a=i*2.39996+.15,r=.968-(i%4)*.008;
      ring(r,a,a+.023+.044*((i*.618)%1),glow,.32+.16*(i%3),pen*.60);
    }
  }

  if(dark){
    // Filaments spiral into the dark centre along a flattened, inclined disk.
    // Further strands disappear behind the aperture; the near lip catches light.
    const count=giant?18:10;
    for(let i=0;i<count;i++){
      const turn=TAU*(phase+i/count),reach=.45+.44*((i*.618)%1);
      const hot=.25+.65*(.5+.5*Math.cos(turn-i*2.12))**2;
      ctx.beginPath();
      for(let j=0;j<=14;j++){
        const f=j/14,a=turn+f*(1.3+.55*((i*.427)%1)),r=reach*(1-.31*f);
        const x=r*Math.cos(a),y=r*Math.sin(a)*.67-x*.23;
        if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      }
      ctx.strokeStyle=i%4===0?bright:glow;ctx.lineWidth=pen*(i%4===0?.9:.66);
      ctx.globalAlpha=hot;ctx.stroke();
    }
    const aperture=ctx.createRadialGradient(-.065,-.04,.12,0,0,.47);
    aperture.addColorStop(0,'#05050a');aperture.addColorStop(.60,'#090810');
    aperture.addColorStop(.82,'#271b29');aperture.addColorStop(.95,'#713a42');
    aperture.addColorStop(1,'rgba(216,111,102,0)');
    disc(0,0,.47,aperture,1);
    ring(.409,2.87,5.78,glow,.86,pen*1.15);
    ring(.423,3.55,4.66,bright,.83,pen*.88);
    return;
  }

  const tracks=giant?richTracks:discharges[3];
  const segments=giant?23:13;
  for(const track of tracks){
    const t=(phase+track.offset)%1;
    const e=track.events.find(item=>t>=item.start && t<item.start+item.duration);
    if(!e)continue;
    const life=(t-e.start)/e.duration;
    const power=Math.min(1,(life+.025)/.13,(1-life)/.28);
    const reach=e.rimLength*(e.rooted?1:.26+.74*Math.min(1,life/.22));
    const wave=Math.sin(e.jitter+life*8)*Math.sin(life*Math.PI);
    let forkX=0,forkY=0,midX=0,midY=0,tipX=0,tipY=0;
    ctx.beginPath();ctx.moveTo(0,0);
    for(let j=1;j<=segments;j++){
      const f=j/segments;
      const bend=(1-f)*(e.bendA*(1-f)+e.bendB*f);
      const kink=Math.sin(e.jitter+j*1.93+wave*.9)*.043+Math.sin(j*.73+life*3)*.055;
      const a=e.angle+bend+kink*Math.sin(Math.PI*f);
      tipX=Math.cos(a)*reach*f;tipY=Math.sin(a)*reach*f;
      ctx.lineTo(tipX,tipY);
      if(j===Math.ceil(segments*.62)){forkX=tipX;forkY=tipY;}
      if(j===Math.ceil(segments*.37)){midX=tipX;midY=tipY;}
    }
    if(e.fork&&life>e.forkTime&&life<.94){
      ctx.moveTo(forkX,forkY);
      for(let j=1;j<=5;j++){
        const f=j/5,a=e.angle+e.fork*f+.07*Math.sin(Math.PI*f+wave);
        const r=reach*(.62+.31*f);
        ctx.lineTo(r*Math.cos(a),r*Math.sin(a));
      }
    }
    ctx.strokeStyle=glow;ctx.lineWidth=pen*2.65;ctx.globalAlpha=power*.27;ctx.stroke();
    ctx.strokeStyle=bright;ctx.lineWidth=pen;ctx.globalAlpha=power*.94;ctx.stroke();
    if(giant&&e.fork&&life>e.forkTime&&life<.90){
      ctx.beginPath();ctx.moveTo(midX,midY);
      for(let j=1;j<=7;j++){
        const f=j/7,a=e.angle+e.bendB*(1-f)-e.fork*f*.62+.032*Math.sin(j*1.91+wave);
        ctx.lineTo(Math.cos(a)*reach*(.37+.22*f),Math.sin(a)*reach*(.37+.22*f));
      }
      ctx.strokeStyle=bright;ctx.lineWidth=pen*.57;ctx.globalAlpha=power*.64;ctx.stroke();
    }
    // An arc finds a contact and crawls along the inside of the membrane.
    if(!bodyOnly&&reach>.84&&life>.13&&life<.87){
      const nx=Math.cos(e.angle),ny=Math.sin(e.angle);
      ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.lineTo(nx*.974,ny*.974);
      ctx.strokeStyle=bright;ctx.lineWidth=pen*.77;ctx.globalAlpha=power*.65;ctx.stroke();
      ring(.982,e.angle-.017,e.angle+.022+.064*life,bright,power*.70,pen*1.05);
      disc(.978*nx,.978*ny,pen*1.15,'#ffffff',power*.85);
    }
  }
  const heart=ctx.createRadialGradient(0,0,0,0,0,.26);
  heart.addColorStop(0,'#ffffff');heart.addColorStop(.18,'#f6fcff');
  heart.addColorStop(.31,'rgba(225,241,255,.95)');heart.addColorStop(.48,'rgba(183,216,241,.39)');
  heart.addColorStop(1,'rgba(164,202,224,0)');
  disc(0,0,.26,heart,1);
}

function largeSprite(doc,id,frame,bodyOnly,mass,scale){
  // Quantize the sampling rate, never the geometry. Up to eight recent views
  // share reusable canvases instead of retaining a full giant animation atlas.
  const density=sparkRasterMetrics(scale).density;
  let atlas=largeAtlases.get(doc);
  if(!atlas){atlas={slots:[],next:0};largeAtlases.set(doc,atlas);}
  const key=id+':'+frame+':'+mass+':'+density+':'+bodyOnly;
  for(const slot of atlas.slots)if(slot.key===key)return slot.canvas;
  const spec=getPickupSpec(id);
  const radius=(spec.plasma?PLASMA_SHELL_RADIUS:spec.contactRadius)*SPARK_ART_SCALE*density;
  const side=2*Math.ceil(radius*1.12+1);
  let slot;
  if(atlas.slots.length<8){
    slot={canvas:doc.createElement('canvas')};
    atlas.slots.push(slot);
  }else{
    // Retain the backing store when a Surge and Giant share a frame.
    let index=atlas.next;
    for(let i=0;i<atlas.slots.length;i++){
      const candidate=(atlas.next+i)%atlas.slots.length;
      if(atlas.slots[candidate].canvas.width===side){index=candidate;break;}
    }
    slot=atlas.slots[index];
    atlas.next=(index+1)%atlas.slots.length;
  }
  const sprite=slot.canvas;
  if(sprite.width!==side || sprite.height!==side)sprite.width=sprite.height=side;
  const c=sprite.getContext('2d');c.clearRect(0,0,side,side);c.save();
  const pen=Math.max(.9/radius,mass===10?.0115:.021);
  largeSparkArt(c,id,frame/cycles[id][1],bodyOnly,mass,radius,pen);
  c.restore();sprite.sparkTexelScale=density;slot.key=key;
  return sprite;
}

function cachedSprite(doc,id,frame,tiny,reducedMotion,bodyOnly,detailed=false,massTier=0,scale=1) {
  if(getPickupSpec(id).plasma&&sparkRasterMetrics(scale).density!==1){
    return adaptiveFuelSprite(doc,id,frame,bodyOnly,scale,reducedMotion);
  }
  if(!getPickupSpec(id).plasma&&id!=='sight'&&(massTier>=5||detailed)){
    return largeSprite(doc,id,frame,bodyOnly,massTier || (scale>=5?10:6),scale);
  }
  if(bodyOnly && getPickupSpec(id).plasma) frame -= frame % 6;
  let cache=atlases.get(doc);
  if(!cache){cache=new Map();atlases.set(doc,cache);}
  const key=id+':'+frame+':'+tiny+':'+reducedMotion+':'+bodyOnly;
  if(cache.has(key))return cache.get(key);
  const [period,frames]=cycles[id]||[1,1];
  const sprite=doc.createElement('canvas'),fuel=Boolean(getPickupSpec(id).plasma);
  const side=fuel?FUEL_ANIMATION.size:72;
  sprite.sparkTexelScale=1;
  sprite.width=sprite.height=side;
  const c=sprite.getContext('2d');
  if(fuel)drawFuelFrame(c,side/2,side/2,id,frame,reducedMotion,bodyOnly);
  else for(const p of packetPixels(id,{time:frame/frames*period,reducedMotion,tiny,bodyOnly})){
    c.globalAlpha=p.alpha;c.fillStyle=p.color;c.fillRect(side/2+p.x,side/2+p.y,p.width,p.height);
  }
  cache.set(key,sprite);
  return sprite;
}
// Absorption samples the same full sprite and phase as the pickup it replaces.
export function pickupSpriteFrame(doc, kind, {time=0, phase=0, reducedMotion=false, bodyOnly=false,detailed=false,massTier=0,scale=1}={}) {
  if (!doc?.createElement) return null;
  const id=pickupKind(kind), [period, frames]=cycles[id];
  const frame=frameAt(time + phase*period/TAU, period, frames, reducedMotion);
  return cachedSprite(doc,id,frame,false,reducedMotion,bodyOnly,detailed,massTier,scale);
}
const warmups=new WeakMap();
export function prepareFuelSprites(doc,reducedMotion=false) {
  const frames=reducedMotion?1:FUEL_ANIMATION.frames;
  const key=reducedMotion?'quiet':'moving';
  let pending=warmups.get(doc);if(!pending){pending={};warmups.set(doc,pending);}
  if(!pending[key])pending[key]=(async()=>{
    for(let frame=0;frame<frames;frame++){
      for(const kind of ['light','cluster','cache']){
        cachedSprite(doc,kind,frame,false,reducedMotion,false);
        // A compact set of shell-free frames also serves moving Collector cargo.
        if(frame%6===0)cachedSprite(doc,kind,frame,false,reducedMotion,true);
      }
      if(frame%3===2&&frame<frames-1)await new Promise(resolve=>setTimeout(resolve,0));
    }
  })();
  return pending[key];
}
export function drawPickup(context,x,y,{kind='light',time=0,phase=0,reducedMotion=false,tiny=false,bodyOnly=false,alpha=1,scale=1,detailed=false,massTier=0,handling=null}={}){
  const id=pickupKind(kind),size=Math.max(.1,Number(scale)||1),doc=context.canvas?.ownerDocument;
  const [period,frames]=cycles[id]||[1,1];
  const clock=time+phase*period/TAU;
  const frame=frameAt(clock,period,frames,reducedMotion);
  const plasma=Boolean(getPickupSpec(id).plasma);
  const sprite=doc&&cachedSprite(doc,id,frame,plasma?false:tiny,reducedMotion,bodyOnly,detailed,massTier,size);
  context.save();const inherited=context.globalAlpha*clamp(Number(alpha)||0,0,1);
  if(sprite){
    const drawSize=size*(plasma&&tiny?.62:1)/sprite.sparkTexelScale;
    context.globalAlpha=inherited;context.imageSmoothingEnabled=false;
    const width=sprite.width*drawSize;
    context.drawImage(sprite,Math.round(x-width/2),Math.round(y-width/2),Math.round(width),Math.round(width));
  }
  else for(const p of packetPixels(id,{time:plasma?frame/frames*period:clock,reducedMotion,tiny,bodyOnly})){context.globalAlpha=inherited*p.alpha;context.fillStyle=p.color;context.fillRect(Math.round(x+p.x*size),Math.round(y+p.y*size),Math.max(1,Math.round(p.width*size)),Math.max(1,Math.round(p.height*size)))}
  if(handling&&!bodyOnly){
    context.globalAlpha=inherited;
    const ink=fields[getPickupSpec(id).plasma]?.rim||getPickupSpec(id).color;
    drawPickupHandlingCue(context,x,y,handling.packet||{kind:id,sparkMass:massTier},handling.modifiers,
      {collector:handling.collector,scale:size,time,phase,reducedMotion,shellColor:ink,hookAngle:handling.hookAngle??null});
  }
  context.restore();
}

export function drawSparkSymbol(context,x,y,{size=16,time=0,reducedMotion=false}={}){
  drawPickup(context,x,y,{kind:'light',time,reducedMotion,scale:size/FUEL_ANIMATION.size});
}

export function pickupArtSvg(kind = 'light', { className = '',handling=false } = {}) {
  const id = pickupKind(kind), name = getPickupSpec(kind).name;
  const classes = String(className || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 120);
  const tier=getPickupSpec(id).plasma;
  const side=tier?44:48,ring=handling?pickupRingSvg({kind:id},side/2,side/2,fields[tier]?.rim||getPickupSpec(id).color):'';
  if(tier)return `<svg xmlns="http://www.w3.org/2000/svg" class="${classes}" viewBox="0 0 44 44" width="36" height="36" role="img" aria-label="${name}" shape-rendering="crispEdges" overflow="visible">${sparkSymbolArt(0,0,44,tier)}${ring}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${classes}" viewBox="0 0 48 48" width="36" height="36" role="img" aria-label="${name}" shape-rendering="crispEdges" overflow="visible">${sparkImageArt(id,0,0,48)}${ring}</svg>`;
}
