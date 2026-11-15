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
  frost:{layers:[['rockBack',.06,.7],['rockMid',.18,.66],['rockNear',.31,.46]],texture:'rockTiles',patch:[32,32,32,32],tone:'#859fa7',plant:'rockPlant1'},
  pinewood:{layers:[['forestBack',.05,.65],['forestMid',.13,.55],['swampMid',.22,.56],['swampTrees',.36,.55]],texture:'swampTiles',patch:[223,24,56,26],tone:'#67785a',plant:'swampProps'},
  marsh:{layers:[['swampBack',.04,.4],['swampMid',.15,.7],['swampNear',.29,.5],['swampTrees',.42,.48]],texture:'swampTiles',patch:[223,24,56,26],tone:'#68745b',plant:'swampProps'},
  fungal:{layers:[['caveBack',.07,.72],['caveWall',.23,.54]],texture:'caveTiles',patch:[116,32,12,40],tone:'#7e6b8e',plant:'rockPlant2'},
  basalt:{layers:[['rockBack',.06,.62],['caveWall',.22,.54],['rockNear',.37,.5]],texture:'rockTiles',patch:[32,32,32,32],tone:'#806961',plant:'rockPlant2'},
  desert:{layers:[['rockBack',.06,.68],['rockMid',.17,.7],['rockNear',.35,.55]],texture:'rockTiles',patch:[32,32,32,32],tone:'#a48d6e',plant:'rockPlant1'},
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
  const state={images:new Map(),variants:new Map(),ready:null};documents.set(document,state);
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
export function drawAuthoredMaterial(context,{identity,width,height}){
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
  context.restore();return true;
}
