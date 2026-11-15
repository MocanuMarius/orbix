import {createNearLandscape,drawNearLandscapePlates} from './near-landscape.mjs?v=spark-progression-1';
// Artwork by Luis Zuno / Ansimuz. Source packs and licences are listed in
// nature-credits.html and assets/nature/licenses/. Prepared once per document.
const artFiles = {
  forestBack:'assets/nature/forest-back.png', forestMid:'assets/nature/forest-mid.png', forestFront:'assets/nature/forest-front.png',
  swampBack:'assets/nature/swamp-back.png', swampMid:'assets/nature/swamp-mid.png', swampNear:'assets/nature/swamp-near.png',
  swampTrees:'assets/nature/swamp-trees.png', swampProps:'assets/nature/swamp-props.png', swampTiles:'assets/nature/swamp-tiles.png',
  caveBack:'assets/nature/cave-back.png', caveWall:'assets/nature/cave-wall.png', caveTiles:'assets/nature/cave-tiles.png',
  rockBack:'assets/nature/rock-back.png', rockMid:'assets/nature/rock-mid.png', rockNear:'assets/nature/rock-near.png',
  rockTiles:'assets/nature/rock-tiles.png', rockPlant1:'assets/nature/rock-plant-1.png', rockPlant2:'assets/nature/rock-plant-2.png',
  reefFar:'assets/nature/reef-far.png', reefFront:'assets/nature/reef-front.png',
  graveBack:'assets/nature/grave-back.png', graveMid:'assets/nature/grave-mid.png', graveObjects:'assets/nature/grave-objects.png',
  graveTiles:'assets/nature/grave-tiles.png', castleBack:'assets/nature/castle-back.png', castleTiles:'assets/nature/castle-tiles.png',
};
const profiles = {
  moonruins:{layers:[['graveBack',.06,.7],['castleBack',.18,.64],['graveMid',.34,.48]],texture:'castleTiles',patch:[36,144,48,32],tone:'#707b71',plant:'swampProps'},
  frost:{layers:[['rockBack',.06,.7],['rockMid',.18,.66],['rockNear',.31,.46]],texture:'rockTiles',patch:[18,24,12,24],tone:'#859fa7',plant:'rockPlant1'},
  pinewood:{layers:[['forestBack',.05,.65],['forestMid',.13,.55],['swampMid',.22,.56],['swampTrees',.36,.55]],texture:'swampTiles',patch:[223,24,56,26],tone:'#67785a',plant:'swampProps'},
  marsh:{layers:[['swampBack',.04,.4],['swampMid',.15,.7],['swampNear',.29,.5],['swampTrees',.42,.48]],texture:'swampTiles',patch:[223,24,56,26],tone:'#68745b',plant:'swampProps'},
  fungal:{layers:[['caveBack',.07,.72],['caveWall',.23,.54]],texture:'caveTiles',patch:[116,32,12,40],tone:'#7e6b8e',plant:'rockPlant2'},
  basalt:{layers:[['rockBack',.06,.62],['caveWall',.22,.54],['rockNear',.37,.5]],texture:'rockTiles',patch:[18,24,12,24],tone:'#806961',plant:'rockPlant2'},
  desert:{layers:[['rockBack',.06,.68],['rockMid',.17,.7],['rockNear',.35,.55]],texture:'rockTiles',patch:[18,24,12,24],tone:'#a48d6e',plant:'rockPlant1'},
  coral:{layers:[['reefFar',.07,.64],['reefFront',.23,.48]],texture:'graveTiles',patch:[320,48,32,24],tone:'#9b8587',plant:'rockPlant2'},
  crystal:{layers:[['caveBack',.06,.65],['rockMid',.18,.48],['caveWall',.3,.55]],texture:'caveTiles',patch:[116,32,12,40],tone:'#8c83a0',plant:'rockPlant1'},
  cloud:{layers:[['rockBack',.05,.6],['rockMid',.17,.48]],texture:'graveTiles',patch:[320,48,32,24],tone:'#8b9fa1',plant:'swampProps'},
  thorn:{layers:[['forestBack',.06,.56],['swampNear',.18,.5],['swampTrees',.37,.62]],texture:'swampTiles',patch:[223,24,56,26],tone:'#788067',plant:'swampProps'},
  cemetery:{layers:[['graveBack',.06,.72],['graveMid',.21,.76],['forestFront',.4,.38]],texture:'graveTiles',patch:[320,48,32,24],tone:'#7e8c81',plant:'graveObjects'},
};
const documents = new WeakMap();
function biomeOf(engine){
  return engine.levelIdentity?.biomeId || ({ruins:'moonruins',canopy:'pinewood',storm:'frost'}[engine.terrain]);
}
export function prepareEnvironmentArt(document){
  if(!document?.createElement)return Promise.resolve();
  if(documents.has(document))return documents.get(document).ready;
  const state={images:new Map(),variants:new Map(),nearLandscapes:new Map(),ready:null};documents.set(document,state);
  state.ready=Promise.all(Object.entries(artFiles).map(([key,url])=>new Promise(resolve=>{
    const image=document.createElement('img');
    image.onload=()=>{state.images.set(key,image);resolve();};image.onerror=resolve;
    image.src=new URL(url,import.meta.url).href;
  })));
  return state.ready;
}
function stateFor(context){return documents.get(context.canvas?.ownerDocument);}
function tinted(document,state,key,tone){
  const id=key+tone;if(state.variants.has(id))return state.variants.get(id);
  const image=state.images.get(key);if(!image)return null;
  const surface=document.createElement('canvas');surface.width=image.width;surface.height=image.height;
  const c=surface.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
  if(['#859fa7','#8b9fa1','#8c83a0'].includes(tone)){
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
    const image=tinted(context.canvas.ownerDocument,state,key,profile.tone);if(!image)continue;
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
export function prepareNearLandscape(document,engine){
  const state=documents.get(document),biome=biomeOf(engine),profile=profiles[biome];
  if(!state||!profile)return null;
  const variant=engine.levelIdentity?.variant||0,key=biome+':'+variant;
  if(state.nearLandscapes.has(key))return state.nearLandscapes.get(key);
  const texture=tinted(document,state,profile.texture,profile.tone);
  const wet=['moonruins','pinewood','marsh','thorn','cemetery','cloud'].includes(biome);
  const image=tinted(document,state,wet?'swampProps':profile.plant,profile.tone);
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
  drawNearLandscapePlates(c,plates,{width:e.width,height:e.height,distance,scale,variant:e.levelIdentity?.variant||0});
}
export function drawAuthoredPlant(context,engine,{x,y,sign,push,seed}){
  const state=stateFor(context),profile=profiles[biomeOf(engine)];if(!state||!profile)return false;
  // Forest and marsh props are deliberately placed in clusters with open gaps.
  if(seed%5===0)return false;
  const image=tinted(context.canvas.ownerDocument,state,profile.plant,profile.tone);if(!image)return false;
  let rect;
  if(profile.plant==='swampProps')rect=seed%2?[8,3,39,39]:[124,4,48,37];
  else if(profile.plant==='graveObjects')rect=[177,7,40,42];
  else rect=[0,0,image.width,image.height];
  const [sx,sy,sw,sh]=rect,height=36+(seed%19),width=sw*height/sh;
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
    const shift=(Math.floor(y/sh)%2)*Math.floor(sw*.37);
    context.drawImage(source,sx,sy,sw,sh,Math.round(x+shift),Math.round(y),sw,sh);
  }
  if(surface?.length)drawGeologicalRelief(context,{identity,width,height,surface,top,seed,tone:profile.tone});
  context.restore();return true;
}

const geologyNoise=n=>{let h=Math.imul(n|0,1597334677);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
function drawGeologicalRelief(c,{identity,width,height,surface,top,seed,tone}){
  const sign=top?-1:1,biome=identity.biomeId;
  const at=x=>{for(let i=1;i<surface.length;i++){const a=surface[i-1],b=surface[i];if(x>=a[0]&&x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]||1);}return surface.at(-1)[1];};
  const stroke=(points,color,alpha,width=1)=>{c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke();};
  // Bedding is independent of the skyline: layers are buried into the face,
  // rather than tracing every bump as if the mountain were made of rubber.
  const sediment=['desert','moonruins','cemetery','cloud'].includes(biome);
  const wet=['marsh','pinewood','thorn','fungal'].includes(biome);
  for(let row=0;row<Math.ceil(height/14);row++){
    const y=row*14+geologyNoise(seed+row*43)*8,lean=(geologyNoise(seed+12)-.5)*.20,points=[];
    for(let x=-8;x<width+9;x+=11)points.push([x,y+x*lean+Math.sin(x*.025+row*.7)*3]);
    stroke(points,sediment?'#a79c79':tone,sediment?.27:.15,sediment?2:1);
    stroke(points.map(([x,yy])=>[x,yy+sign*2]),'#0b161a',.32,1);
  }
  for(let col=0;col<Math.ceil(width/38);col++){
    const x=col*38+geologyNoise(seed+col*73)*19,sy=at(x)+sign*5;
    const depth=22+geologyNoise(seed+col*97)*65,lean=(geologyNoise(seed+col*131)-.5)*18;
    const fracture=[[x,sy],[x+lean*.3,sy+sign*depth*.32],[x+lean*.4-3,sy+sign*depth*.51],[x+lean,sy+sign*depth]];
    stroke(fracture,'#09151b',.56,2);
    stroke(fracture.map(([xx,y])=>[xx+2,y]),tone,.37,1);
    stroke([fracture[2],[x+lean-11,sy+sign*depth*.72]],'#111d21',.45,1);
    // Slope-dependent ledge deposits: snow, roots, mineral seams and talus.
    const slope=Math.abs(at(x+4)-at(x-4))/8;
    if(slope<.8){
      stroke([[x-4,sy],[x+4,at(x+4)+sign*5]],biome==='frost'?'#b2c9cf':wet?'#81916b':tone,.6,2);
      if(wet)stroke([[x+2,sy],[x+3,sy+sign*11],[x,sy+sign*19]],'#354b3e',.75,2);
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
      for(let j=0;j<(lush?24:14);j++){
        const seed=j*157+layer*367,x=j*(lush?14:25)+geologyNoise(seed)*9,y=51+geologyNoise(seed+3)*16;
        if(cover&&j%3!==0){
          const rect=lush?(j%2?[8,3,39,39]:[124,4,48,37]):[0,0,cover.width,cover.height];
          const [sx,sy,sw,sh]=rect,h=12+geologyNoise(seed+7)*19;
          p.globalAlpha=.8;p.drawImage(cover,sx,sy,sw,sh,Math.round(x-sw*h/sh/2),Math.round(y-h),Math.round(sw*h/sh),Math.round(h));p.globalAlpha=1;
        }
        for(let blade=0;blade<(lush?5:3);blade++){
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
