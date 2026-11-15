import {createNearLandscape,drawNearLandscapePlates} from './near-landscape.mjs?v=bold-edge-ideas-1';
import {prepareWildlife} from './habitat-wildlife.mjs?v=bold-edge-ideas-1';
import {makeCourseTableaux,drawCourseTableaux} from './course-tableaux.mjs?v=bold-edge-ideas-1';
// Artwork by Luis Zuno / Ansimuz. Source packs and licences are listed in
// nature-credits.html and assets/nature/licenses/. Prepared once per document.
const artFiles = {
  forestBack:'assets/nature/forest-back.png', forestMid:'assets/nature/forest-mid.png', forestFront:'assets/nature/forest-front.png',
  swampBack:'assets/nature/swamp-back.png', swampMid:'assets/nature/swamp-mid.png', swampNear:'assets/nature/swamp-near.png',
  swampTrees:'assets/nature/swamp-trees.png', swampProps:'assets/nature/swamp-props.png', swampTiles:'assets/nature/swamp-tiles.png',
  caveBack:'assets/nature/cave-back.png', caveWall:'assets/nature/cave-wall.png', caveTiles:'assets/nature/cave-tiles.png',
  rockBack:'assets/nature/rock-back.png', rockMid:'assets/nature/rock-mid.png', rockNear:'assets/nature/rock-near.png',
  rockTiles:'assets/nature/rock-tiles.png', rockPlant1:'assets/nature/rock-plant-1.png', rockPlant2:'assets/nature/rock-plant-2.png',
  reefFar:'assets/nature/reef-far.png', reefFront:'assets/nature/reef-front.png', reefGarden:'assets/nature/reef-garden.png',
  graveBack:'assets/nature/grave-back.png', graveMid:'assets/nature/grave-mid.png', graveObjects:'assets/nature/grave-objects.png',
  graveTiles:'assets/nature/grave-tiles.png', castleBack:'assets/nature/castle-back.png', castleTiles:'assets/nature/castle-tiles.png',
  townFar:'assets/nature/town-far.png',townRoofs:'assets/nature/town-roofs.png',
};
// Background color is independent of the warm, readable solid material. These
// grades establish distance; the normal fog/light mask still controls sight.
const atmospheres={pinewood:'#426667',marsh:'#476a63',thorn:'#4f6259',moonruins:'#4d6675',cemetery:'#536475',
 frost:'#678393',basalt:'#725463',desert:'#856f76',fungal:'#645879',coral:'#4d7488',crystal:'#69658a',cloud:'#718a9b'};
const backgroundGrades=new Set(Object.values(atmospheres));
const profiles = {
  moonruins:{layers:[['graveBack',.06,.7],['castleBack',.18,.64],['graveMid',.34,.48]],texture:'castleTiles',patch:[36,32,24,24],tone:'#707b71',plant:'swampProps'},
  frost:{layers:[['rockBack',.06,.7],['rockMid',.18,.66],['rockNear',.31,.46]],texture:'rockTiles',patch:[48,24,24,24],tone:'#859fa7',plant:'rockPlant1'},
  pinewood:{layers:[['forestBack',.05,.65],['forestMid',.13,.55],['swampMid',.22,.56],['swampTrees',.36,.55]],texture:'swampTiles',patch:[68,24,24,24],tone:'#67785a',plant:'swampProps'},
  marsh:{layers:[['swampBack',.04,.4],['swampMid',.15,.7],['swampNear',.29,.5],['swampTrees',.42,.48]],texture:'swampTiles',patch:[68,24,24,24],tone:'#68745b',plant:'swampProps'},
  fungal:{layers:[['caveBack',.07,.72],['caveWall',.23,.54]],texture:'rockTiles',patch:[48,24,24,24],tone:'#7e6b8e',plant:'rockPlant2'},
  basalt:{layers:[['rockBack',.06,.62],['caveWall',.22,.54],['rockNear',.37,.5]],texture:'rockTiles',patch:[48,24,24,24],tone:'#806961',plant:'rockPlant2'},
  desert:{layers:[['rockBack',.06,.68],['rockMid',.17,.7],['rockNear',.35,.55]],texture:'rockTiles',patch:[48,24,24,24],tone:'#a48d6e',plant:'rockPlant1'},
  coral:{layers:[['reefFar',.07,.64],['reefFront',.23,.48]],texture:'graveTiles',patch:[336,92,24,24],tone:'#9b8587',plant:'rockPlant2'},
  crystal:{layers:[['caveBack',.06,.65],['rockMid',.18,.48],['caveWall',.3,.55]],texture:'rockTiles',patch:[48,24,24,24],tone:'#8c83a0',plant:'rockPlant1'},
  cloud:{layers:[['rockBack',.05,.6],['rockMid',.17,.48]],texture:'graveTiles',patch:[336,92,24,24],tone:'#8b9fa1',plant:'swampProps'},
  thorn:{layers:[['forestBack',.06,.56],['swampNear',.18,.5],['swampTrees',.37,.62]],texture:'swampTiles',patch:[68,24,24,24],tone:'#788067',plant:'swampProps'},
  cemetery:{layers:[['graveBack',.06,.72],['graveMid',.21,.76],['forestFront',.4,.38]],texture:'graveTiles',patch:[336,92,24,24],tone:'#7e8c81',plant:'graveObjects'},
};
const documents = new WeakMap();
function biomeOf(engine){
  return engine.levelIdentity?.biomeId || ({ruins:'moonruins',canopy:'pinewood',storm:'frost'}[engine.terrain]);
}
export function prepareEnvironmentArt(document){
  if(!document?.createElement)return Promise.resolve();
  if(documents.has(document))return documents.get(document).ready;
  const state={images:new Map(),variants:new Map(),nearLandscapes:new Map(),tableaux:new Map(),ready:null};documents.set(document,state);
  state.ready=Promise.all([prepareWildlife(document),...Object.entries(artFiles).map(([key,url])=>new Promise(resolve=>{
    const image=document.createElement('img');
    image.onload=()=>{state.images.set(key,image);resolve();};image.onerror=resolve;
    image.src=new URL(url,import.meta.url).href;
  }))]);
  return state.ready;
}
function stateFor(context){return documents.get(context.canvas?.ownerDocument);}
function tinted(document,state,key,tone){
  const id=key+tone;if(state.variants.has(id))return state.variants.get(id);
  const image=state.images.get(key);if(!image)return null;
  const surface=document.createElement('canvas');surface.width=image.width;surface.height=image.height;
  const c=surface.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
  if(key.endsWith('Tiles')||backgroundGrades.has(tone)||['#859fa7','#8b9fa1','#8c83a0'].includes(tone)){
    const pixels=c.getImageData(0,0,surface.width,surface.height);
    const channels=[1,3,5].map(index=>parseInt(tone.slice(index,index+2),16));
    for(let index=0;index<pixels.data.length;index+=4){
      const light=(pixels.data[index]*.2126+pixels.data[index+1]*.7152+pixels.data[index+2]*.0722)/255;
      for(let channel=0;channel<3;channel++)pixels.data[index+channel]=Math.min(255,10+channels[channel]*Math.pow(light,.8)*1.6);
    }
    c.putImageData(pixels,0,0);
  }
  c.globalCompositeOperation='source-atop';c.globalAlpha=.19;c.fillStyle=tone;c.fillRect(0,0,surface.width,surface.height);
  // Suppress the source pack's brighter hues while retaining its pixel shading.
  c.globalAlpha=.30;c.fillStyle='#0d1b25';c.fillRect(0,0,surface.width,surface.height);
  state.variants.set(id,surface);return surface;
}
export function drawAuthoredBackdrop(context,engine,{scale=1,distance=engine.renderDistance??engine.distance}={}){
  const state=stateFor(context),profile=profiles[biomeOf(engine)];
  if(!state||!profile)return false;
  context.save();context.scale(scale,scale);context.imageSmoothingEnabled=false;
  let painted=false;
  for(const [key,speed,opacity]of profile.layers){
    const image=tinted(context.canvas.ownerDocument,state,key,atmospheres[biomeOf(engine)]||profile.tone);if(!image)continue;
    const crop=key.startsWith('swamp')&&key!=='swampBack'?Math.floor(image.height*.18):0;
    const sourceHeight=image.height-crop;
    const height=engine.height*1.05,width=image.width*height/sourceHeight;
    const offset=(distance*speed)%width;
    context.globalAlpha=opacity;
    for(let x=-offset-width;x<engine.width;x+=width)context.drawImage(image,0,crop,image.width,sourceHeight,Math.round(x),Math.round(engine.height-height),Math.ceil(width),Math.ceil(height));
    painted=true;
  }
  context.restore();return painted;
}
export function prepareCourseArt(document,engine){
 const state=documents.get(document),biome=biomeOf(engine),profile=profiles[biome];if(!state||!profile)return;
 const variant=engine.levelIdentity?.variant||0,key=biome+':'+variant;if(state.tableaux.has(key))return;
 const tone=atmospheres[biome]||profile.tone;
 const stone=tinted(document,state,profile.texture,tone),tree=tinted(document,state,'graveObjects',tone);
 const town=tinted(document,state,'townRoofs',tone),spires=tinted(document,state,'townFar',tone);
 const reef=biome==='coral'?tinted(document,state,'reefFront',tone):null;
 const reefGarden=biome==='coral'?tinted(document,state,'reefGarden',tone):null;
 const items=makeCourseTableaux(document,{biome,variant,stone,bark:tree,tree,town,spires,reef,reefGarden,patch:profile.patch});
 if(state.tableaux.size>=2){const first=state.tableaux.keys().next().value;for(const item of state.tableaux.get(first))item.canvas.width=1;state.tableaux.delete(first);}
 state.tableaux.set(key,items);
}
export function drawCourseArt(c,e,{scale=1,distance=e.renderDistance??e.distance,pass='far'}={}){
 const state=stateFor(c),key=biomeOf(e)+':'+(e.levelIdentity?.variant||0),items=state?.tableaux.get(key);if(!items)return;
 drawCourseTableaux(c,items,e,{scale,distance,pass});
}
export function prepareNearLandscape(document,engine){
  const state=documents.get(document),biome=biomeOf(engine),profile=profiles[biome];
  if(!state||!profile)return null;
  const variant=engine.levelIdentity?.variant||0,key=biome+':'+variant;
  if(state.nearLandscapes.has(key))return state.nearLandscapes.get(key);
  const texture=tinted(document,state,profile.texture,profile.tone);
  const wet=['moonruins','pinewood','marsh','thorn','cemetery','cloud'].includes(biome);
  const barren=['frost','basalt','crystal','fungal'].includes(biome);
  const image=barren?null:tinted(document,state,wet?'swampProps':profile.plant,profile.tone);
  const plants=!image?[]:wet?[[8,3,39,39],[124,4,48,37]].map(rect=>({image,rect})):
    [{image,rect:[0,0,image.width,image.height]}];
  const plates=createNearLandscape(document,{biome,texture,patch:profile.patch,plants,variant});
  // Three course sets are enough for a map; bound retained canvas memory when
  // inspecting many biomes or playing multiple expeditions in the same tab.
  if(state.nearLandscapes.size>=3)state.nearLandscapes.delete(state.nearLandscapes.keys().next().value);
  state.nearLandscapes.set(key,plates);return plates;
}
export function drawNearLandscape(c,e,{scale=1,distance=e.renderDistance??e.distance}={}){
  const plates=prepareNearLandscape(c.canvas.ownerDocument,e);if(!plates)return;
  drawNearLandscapePlates(c,plates,{width:e.width,height:e.height,distance,scale,variant:e.levelIdentity?.variant||0,time:e.visualTime??e.time,reducedMotion:e.reducedMotion});
}
export function drawAuthoredPlant(context,engine,{x,y,sign,push,seed}){
  const state=stateFor(context),profile=profiles[biomeOf(engine)];if(!state||!profile)return false;
  if(['frost','basalt','crystal','fungal','coral'].includes(biomeOf(engine)))return false;
  // Forest and marsh props are deliberately placed in clusters with open gaps.
  if(seed%5===0)return false;
  const image=tinted(context.canvas.ownerDocument,state,profile.plant,profile.tone);if(!image)return false;
  let rect;
  if(profile.plant==='swampProps')rect=seed%2?[8,3,39,39]:[124,4,48,37];
  else if(profile.plant==='graveObjects')rect=[177,7,40,42];
  else rect=[0,0,image.width,image.height];
  const [sx,sy,sw,sh]=rect,height=18+Math.abs(seed%19),width=sw*height/sh;
  context.save();context.translate(x,y+sign*2);
  context.transform(1,0,push*.016,sign,0,0);context.globalAlpha*=.96;context.imageSmoothingEnabled=false;
  context.drawImage(image,sx,sy,sw,sh,-width/2,-height,width,height);
  context.restore();return true;
}
export function drawAuthoredMaterial(context,{identity,width,height,surface,top=false,seed=0}){
  const state=stateFor(context),profile=profiles[identity.biomeId];if(!state||!profile)return false;
  const source=tinted(context.canvas.ownerDocument,state,profile.texture,profile.tone);if(!source)return false;
  const [sx,sy,sw,sh]=profile.patch;
  context.save();context.globalAlpha=.65;context.imageSmoothingEnabled=false;
  context.fillStyle='#1e282b';context.fillRect(0,0,width,height);
  // Stagger neighbouring texture rows to soften visible repetition.
  for(let y=-sh;y<height;y+=sh)for(let x=-sw;x<width;x+=sw){
    const shift=Math.floor(geologyNoise(seed+Math.floor(y/sh)*79)*sw*.77);
    const flip=geologyNoise(seed+Math.floor(x/sw)*193+Math.floor(y/sh)*47)>.5;
    context.save();context.translate(Math.round(x+shift)+(flip?sw:0),Math.round(y));context.scale(flip?-1:1,1);context.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);context.restore();
  }
  if(surface?.length)drawGeologicalRelief(context,{identity,width,height,surface,top,seed,tone:profile.tone});
  context.restore();return true;
}

const geologyNoise=n=>{let h=Math.imul(n|0,1597334677);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
function drawGeologicalRelief(c,{identity,width,height,surface,top,seed,tone}){
  const sign=top?-1:1,biome=identity.biomeId;
  const at=x=>{for(let i=1;i<surface.length;i++){const a=surface[i-1],b=surface[i];if(x>=a[0]&&x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]||1);}return x<surface[0][0]?surface[0][1]:surface.at(-1)[1];};
  const stroke=(points,color,alpha,width=1)=>{c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke();};
  const plane=(points,color,alpha)=>{c.globalAlpha=alpha;c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();};
  const sediment=['desert','moonruins','cemetery','cloud'].includes(biome);
  const columnar=['frost','basalt','crystal'].includes(biome);
  const wet=['marsh','pinewood','thorn','fungal'].includes(biome);
  const lean=(geologyNoise(seed+12)-.5)*(biome==='desert'?.16:.08);
  if(sediment){
    // Beds retain one dip across a whole face; erosion breaks them into
    // unequal ledges. They do not follow every bump of the collision surface.
    let row=0;
    for(let y=-width*.1;y<height+width*.1;y+=13+geologyNoise(seed+row++*43)*16){
      const a=width*(.02+geologyNoise(seed+row*61)*.14),b=width*(.7+geologyNoise(seed+row*89)*.3);
      plane([[a,y+a*lean],[b,y+b*lean-2],[b-7,y+b*lean+5],[a+14,y+a*lean+3]],tone,.23);
      stroke([[a+3,y+5+a*lean],[width*.48,y+4+width*.48*lean],[b-6,y+3+b*lean]],'#0e191d',.4,2);
      stroke([[a+12,y+a*lean],[a+width*.2,y+(a+width*.2)*lean]],'#b6ab8a',.22,1);
    }
  }else if(columnar){
    // Cooling basalt, split ice and mineral slabs have vertical load-bearing
    // facets, unlike the sedimentary faces above.
    let col=0;
    for(let x=-10;x<width;x+=23+geologyNoise(seed+col++*73)*29){
      const w=19+geologyNoise(seed+col*17)*19,y=at(x),d=32+geologyNoise(seed+col*97)*85,slant=(geologyNoise(seed+col*13)-.5)*11;
      plane([[x,y],[x+w,at(x+w)],[x+w+slant,y+sign*d],[x+slant,y+sign*(d+13)]],tone,.24);
      stroke([[x,y+sign*4],[x+slant*.4,y+sign*d*.48],[x+slant,y+sign*(d+13)]],'#0c171e',.64,2);
      stroke([[x+3,y+sign*8],[x+slant*.4+3,y+sign*d*.48]],biome==='frost'?'#b1c9cf':'#aaa3b9',.31,1);
      if(col%3===1)stroke([[x+slant*.4,y+sign*d*.48],[x+w*.6,y+sign*d*.61]],'#102026',.5,1);
    }
  }else{
    // A darker soil cap, buried stones and branching roots form an organic
    // bank. Root masses are clustered and stop well below the contact lip.
    for(let mass=0;mass<Math.ceil(width/105);mass++){
      const x=24+mass*109+geologyNoise(seed+mass*47)*26,y=at(x),d=35+geologyNoise(seed+mass*91)*55;
      const root=[[x,y+sign*5],[x-5,y+sign*d*.27],[x+4,y+sign*d*.63],[x-2,y+sign*d]];
      stroke(root,'#14261f',.7,4);stroke(root.map(([xx,yy])=>[xx+2,yy]),'#718060',.32,1);
      stroke([root[1],[x-14,y+sign*d*.48],[x-19,y+sign*d*.62]],'#192a23',.7,2);
      stroke([root[2],[x+15,y+sign*d*.8]],'#192a23',.65,2);
      plane([[x+15,y+sign*29],[x+27,y+sign*24],[x+38,y+sign*30],[x+32,y+sign*39],[x+17,y+sign*40]],tone,.28);
    }
  }
  // Unequal joints and slope-dependent deposits break up texture repetition.
  let joint=0;
  for(let x=18;x<width;x+=41+geologyNoise(seed+joint++*131)*49){
    const sy=at(x)+sign*6,depth=18+geologyNoise(seed+joint*97)*47;
    if(!wet)stroke([[x,sy],[x-3,sy+sign*depth*.43],[x+4,sy+sign*depth]],'#0b171c',.42,1);
    const slope=Math.abs(at(x+5)-at(x-5))/10;
    if(slope<.5){
      stroke([[x-5,sy],[x+7,at(x+7)+sign*6]],biome==='frost'?'#b2c9cf':wet?'#81916b':tone,.53,2);
      if(wet)stroke([[x+2,sy],[x+3,sy+sign*10],[x,sy+sign*16]],'#354b3e',.66,2);
    }
  }
}

// Two small reusable strips in front of the landform. They are clipped inside
// real ground, below its rim: no decorative silhouette becomes a false hazard.
export function drawTerrainForeground(c,e,{scale=1,distance=e.renderDistance??e.distance}={}){
  const state=stateFor(c),profile=profiles[biomeOf(e)];if(!state||!profile)return;
  const W=e.width*scale,H=e.height*scale;
  c.save();c.beginPath();let visible=false;
  for(const o of e.layout.obstacles){
    if(o.destroyed||o.x+o.width*2.5<distance||o.x-o.width>distance+e.width)continue;
    const shape=o.bottomShape;if(!shape)continue;
    const center=o.center+Math.sin((e.visualTime??e.time)*.9+o.phase)*o.motion;
    const ox=(o.x-distance)*scale,oy=(center+o.gap/2+9)*scale;
    shape.forEach(([x,y],i)=>i?c.lineTo(ox+x*scale,oy+y*scale):c.moveTo(ox+x*scale,oy+y*scale));c.closePath();visible=true;
  }
  if(!visible){c.restore();return;}c.clip();c.imageSmoothingEnabled=false;
  for(let layer=0;layer<2;layer++){
    const key='foreground:'+biomeOf(e)+':'+layer;
    let strip=state.variants.get(key);
    if(!strip){
      strip=c.canvas.ownerDocument.createElement('canvas');strip.width=320;strip.height=72;
      const p=strip.getContext('2d');p.imageSmoothingEnabled=false;
      const poly=(points,ink)=>{p.fillStyle=ink;p.beginPath();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();p.fill();};
      for(let i=-1;i<15;i++){
        const seed=i*79+layer*197,base=i*27,x=base+Math.floor(geologyNoise(seed)*13),r=9+Math.floor(geologyNoise(seed+3)*12),y=50+Math.floor(geologyNoise(seed+7)*16);
        const points=[[x-r,y],[x-r*.65,y-r*.70],[x-r*.1,y-r],[x+r*.5,y-r*.8],[x+r,y-r*.24],[x+r*.8,72],[x-r,72]];
        poly(points,layer?'#142321':'#253933');
        poly([[x-r,y],[x-r*.65,y-r*.70],[x-r*.1,y-r],[x+r*.1,y-r*.35],[x-r*.1,y+1]],'#3c4840');
        p.globalAlpha=.6;poly([[x-r*.1,y-r],[x+r*.5,y-r*.8],[x+r*.2,y-r*.37],[x+r*.1,y-r*.35]],'#47534a');p.globalAlpha=1;
        // Rock grain uses native texels, not a magnified miniature boulder.
        const material=tinted(c.canvas.ownerDocument,state,profile.texture,profile.tone);
        if(material){
          p.save();p.beginPath();points.forEach(([xx,yy],j)=>j?p.lineTo(xx,yy):p.moveTo(xx,yy));p.closePath();p.clip();p.globalAlpha=.28;
          const [sx,sy,sw,sh]=profile.patch;
          for(let yy=Math.floor(y-r);yy<72;yy+=sh)for(let xx=Math.floor(x-r);xx<x+r;xx+=sw)p.drawImage(material,sx,sy,sw,sh,xx,yy,sw,sh);
          p.restore();
        }
        p.fillStyle='#102125';p.fillRect(x-r*.1,y-r*.4,r*.5,1);p.fillRect(x+r*.25,y-r*.22,1,r*.45);
        if(['frost','cloud'].includes(biomeOf(e))){p.fillStyle='#8ca4a8';p.fillRect(x-r*.4,y-r*.83,r*.65,2);}
        else if(['pinewood','marsh','thorn','cemetery'].includes(biomeOf(e))){p.fillStyle='#586c48';p.fillRect(x-r*.5,y-r*.7,r*.7,2);p.fillRect(x-r*.7,y-r*.6,2,5);}
      }
      const lush=['moonruins','pinewood','marsh','thorn','cemetery','cloud'].includes(biomeOf(e));
      const cover=tinted(c.canvas.ownerDocument,state,lush?'swampProps':profile.plant,profile.tone);
      // Dense, uneven understory is cached with the rocks, rather than adding
      // dozens of animated sprites to the live flight loop.
      for(let j=0;j<(lush?13:5);j++){
        const seed=j*157+layer*367,group=Math.floor(j/3),x=group*81+(j%3)*9+geologyNoise(seed)*7,y=51+geologyNoise(seed+3)*16;
        if(cover&&lush&&j%3!==0){
          const rect=lush?(j%2?[8,3,39,39]:[124,4,48,37]):[0,0,cover.width,cover.height];
          const [sx,sy,sw,sh]=rect,h=12+geologyNoise(seed+7)*19;
          p.globalAlpha=.8;p.drawImage(cover,sx,sy,sw,sh,Math.round(x-sw*h/sh/2),Math.round(y-h),Math.round(sw*h/sh),Math.round(h));p.globalAlpha=1;
        }
        for(let blade=0;blade<(lush?4:0);blade++){
          const height=4+geologyNoise(seed+blade*31)*10;
          p.fillStyle=blade%2?profile.tone:'#354d3e';
          p.fillRect(Math.round(x+blade*2),Math.round(y-height),1,Math.round(height));
          p.fillRect(Math.round(x+blade*2-2),Math.round(y-height*.6),3,1);
        }
      }
      state.variants.set(key,strip);
    }
    const zoom=layer?1.12:1.6,tileW=strip.width*scale*zoom,tileH=strip.height*scale*zoom;
    const offset=(distance*(layer?1.23:1.08)*scale)%tileW;
    c.globalAlpha=layer?.62:.42;
    for(let x=-offset-tileW;x<W;x+=tileW)c.drawImage(strip,Math.round(x),Math.round(H-tileH+(layer?15:0)*scale),Math.ceil(tileW),Math.ceil(tileH));
  }
  c.restore();
}
