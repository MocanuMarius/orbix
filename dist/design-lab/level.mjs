// v1.0-level preview: real WispFlight renderer, paused. Each course gets two
// engines (scenery off / scenery 2); each engine is rendered twice per frame
// (fully lit, then normal flight light) and copied into the visible canvases.
// Query: ?at=30 (course position %), ?still=1 (fixed time, for captures),
// ?only=frost-0 (one course), ?bench=1 (exposes timing helpers).
import {WispFlight} from '../flight.mjs?v=guide-clarity-1';
import {BIOMES,BIOME_LEVELS} from '../biomes.mjs?v=guide-clarity-1';
import {getRunModifiers} from '../model.mjs?v=guide-clarity-1';
import {sceneryTwoStats} from '../level-scenery-two.mjs?v=guide-clarity-1';

const query=new URLSearchParams(location.search);
const SHOWCASE=[
 {biome:'frost',code:'v1.0-level-ice',courses:[0,3]},
 {biome:'pinewood',code:'v1.0-level-forest',courses:[0,2]},
];
const atInput=document.querySelector('#at'),panButton=document.querySelector('#pan'),stillButton=document.querySelector('#still'),status=document.querySelector('#status');
if(query.has('at'))atInput.value=String(Math.max(2,Math.min(94,Number(query.get('at'))||30)));
let panning=false,still=query.get('still')==='1';
stillButton.setAttribute('aria-pressed',String(still));
const pairs=[];

function makeEngine(level,scenery){
 const host=document.createElement('div');host.className='host';
 const canvas=document.createElement('canvas');host.append(canvas);document.querySelector('#hosts').append(host);
 const e=new WispFlight({canvas,terrain:level.terrain,seed:17,duration:90,scenery,preview:true,
  node:{...level,levelId:level.id,type:'flight',boss:false,row:2,mapIndex:0,difficulty:1},
  companions:['collector'],flame:100,modifiers:getRunModifiers({companions:['collector'],skills:{}})});
 e.setMuted(true);
 const normal=e.getLightState.bind(e);let lit=true;
 e.getLightState=()=>lit?{...normal(),radius:5000,pickupReveal:1}:normal();
 e.start({paused:true});
 return {e,host,setLit(v){lit=v;}};
}
function view(caption){
 const figure=document.createElement('figure'),label=document.createElement('figcaption'),canvas=document.createElement('canvas');
 label.innerHTML=caption;canvas.className='view';canvas.width=900;canvas.height=405;figure.append(label,canvas);return {figure,canvas};
}
for(const group of SHOWCASE){
 const biome=BIOMES.find(b=>b.id===group.biome),levels=BIOME_LEVELS.filter(l=>l.biomeId===group.biome);
 const section=document.createElement('section'),heading=document.createElement('h2');
 heading.innerHTML=`<span class="code">${group.code}</span> ${biome.name}`;section.append(heading);
 for(const index of group.courses){
  const key=group.biome+'-'+index;if(query.has('only')&&query.get('only')!==key)continue;
  const level=levels[index],title=document.createElement('h3'),play=document.createElement('a');
  play.className='play';play.href=`game.html?mock=boundary&cards=1&biome=${group.biome}&course=${index+1}&scenery=2`;play.textContent='Play it (scenery 2)';
  const old=document.createElement('a');old.className='play';old.href=`game.html?mock=boundary&cards=1&biome=${group.biome}&course=${index+1}`;old.textContent='Play today’s look';
  title.append(`Course ${index+1}: ${level.name}`,play,old);
  const grid=document.createElement('div');grid.className='grid';
  const views={beforeLit:view('<b>Before</b> · scenery off · fully lit'),afterLit:view('<b>After</b> · v1.0-level · fully lit'),
   beforeDark:view('<b>Before</b> · flight darkness'),afterDark:view('<b>After</b> · v1.0-level · flight darkness')};
  for(const v of Object.values(views))grid.append(v.figure);
  section.append(title,grid);
  pairs.push({key,level,views,before:makeEngine(level,1),after:makeEngine(level,2)});
 }
 document.querySelector('#sections').append(section);
}

function place(engine){
 const e=engine.e;e.distance=e.previousDistance=e.totalDistance*Number(atInput.value)/100;
 if(still)e.time=e.visualTime=3;
}
function paint(engine,target,lit){
 engine.setLit(lit);engine.e.render();
 const source=engine.e.pixiView?.canvas;if(!source)return;
 const c=target.getContext('2d');c.imageSmoothingEnabled=false;
 if(target.width!==source.width||target.height!==source.height){target.width=source.width;target.height=source.height;}
 c.drawImage(source,0,0,target.width,target.height);
}
function frame(pair){
 for(const engine of [pair.before,pair.after])place(engine);
 paint(pair.before,pair.views.beforeLit.canvas,true);paint(pair.after,pair.views.afterLit.canvas,true);
 paint(pair.before,pair.views.beforeDark.canvas,false);paint(pair.after,pair.views.afterDark.canvas,false);
}
const visible=new Set();
const observer=new IntersectionObserver(entries=>{for(const entry of entries){const pair=pairs.find(p=>p.views.beforeLit.figure.parentElement===entry.target);if(pair)entry.isIntersecting?visible.add(pair):visible.delete(pair);}});
const ready=Promise.all(pairs.flatMap(p=>[p.before.e.ready,p.after.e.ready])).then(()=>{
 for(const pair of pairs){frame(pair);observer.observe(pair.views.beforeLit.figure.parentElement);}
 status.textContent=`${pairs.length} courses ready`;return true;
});
let last=0;
function animate(now){
 const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
 if(!document.hidden)for(const pair of visible){
  if(panning){const p=(Number(atInput.value)+dt*3);atInput.value=String(p>94?2:p);}
  if(!still)for(const engine of [pair.before,pair.after])engine.e.time+=dt;
  frame(pair);
 }
 requestAnimationFrame(animate);
}
atInput.oninput=()=>{for(const pair of pairs)frame(pair);};
panButton.onclick=()=>{panning=!panning;panButton.setAttribute('aria-pressed',String(panning));};
stillButton.onclick=()=>{still=!still;stillButton.setAttribute('aria-pressed',String(still));};
if(!still)requestAnimationFrame(animate);

// Capture and measurement helpers for scripts/level-scenery-probe.mjs.
async function bufferHash(engine){
 const buffer=engine.e.pixiView.buffer,data=buffer.getContext('2d').getImageData(0,0,buffer.width,buffer.height).data;
 let h=2166136261;for(let i=0;i<data.length;i++)h=Math.imul(h^data[i],16777619);return (h>>>0).toString(16);
}
window.__level={ready,pairs,
 async hashes(){await ready;const out={};for(const pair of pairs){place(pair.before);for(const lit of [true,false]){pair.before.setLit(lit);pair.before.e.render();out[pair.key+(lit?'-lit':'-dark')]=await bufferHash(pair.before);}}return out;},
 async bakeLoop({rounds=6}={}){
  await ready;const out={};
  for(const pair of pairs)for(const which of ['before','after']){
   const e=pair[which].e,view=e.pixiView,cache=view.terrainCache,palette=view.palette;
   const jobs=[];for(const o of e.layout.obstacles)for(const top of [true,false]){const shape=top?o.topShape:o.bottomShape;if(shape?.length)jobs.push([o,shape,top]);}
   const s0={...sceneryTwoStats};let total=0,count=0;
   for(let r=0;r<rounds;r++){
    for(const item of cache.values()){item.canvas.width=1;if(item.growth)item.growth.canvas.width=1;}cache.clear();
    const t0=performance.now();for(const [o,shape,top] of jobs){view.terrainImage(e,o,shape,top,palette);if(cache.size>17){for(const item of cache.values()){item.canvas.width=1;if(item.growth)item.growth.canvas.width=1;}cache.clear();}}
    total+=performance.now()-t0;count+=jobs.length;
   }
   out[pair.key+'-'+which]={chunks:jobs.length,msPerChunk:total/count,materialMs:(sceneryTwoStats.materialMs-s0.materialMs)/count,growthMs:(sceneryTwoStats.growthMs-s0.growthMs)/count};
  }
  return out;
 },
 async bench({frames=120,which='after',key}={}){
  await ready;const results={};
  for(const pair of pairs){if(key&&pair.key!==key)continue;const engine=pair[which],e=engine.e,view=e.pixiView;engine.setLit(false);
   // Bake cost: re-bake every terrain chunk on this course once.
   const cache=view.terrainCache;let bakeMs=0,bakes=0;const original=view.terrainImage,seen=new WeakSet();
   for(const item of cache.values()){item.canvas.width=1;if(item.growth)item.growth.canvas.width=1;}cache.clear();
   const stats0={...sceneryTwoStats};
   view.terrainImage=function(...args){const t0=performance.now();const item=original.apply(this,args);const dt=performance.now()-t0;if(!seen.has(item)){seen.add(item);bakeMs+=dt;bakes++;}return item;};
   let particleMs=0,particleCalls=0;const scenery=view.scenery,drawParticles=scenery?.drawParticles;
   if(scenery)scenery.drawParticles=function(...args){const t0=performance.now();drawParticles.apply(this,args);particleMs+=performance.now()-t0;particleCalls++;};
   const span=e.totalDistance*.9;const step=span/frames;let renderMs=[];
   for(let i=0;i<frames;i++){e.distance=e.previousDistance=e.totalDistance*.03+i*step;e.time=3+i/60;const t0=performance.now();e.render();renderMs.push(performance.now()-t0);}
   view.terrainImage=original;
   const materialMs=sceneryTwoStats.materialMs-stats0.materialMs,growthMs=sceneryTwoStats.growthMs-stats0.growthMs;
   // Steady-state frames: same positions again with every chunk already baked.
   const steady=[];for(let i=0;i<frames;i++){e.distance=e.previousDistance=e.totalDistance*.03+i*step;e.time=3+i/60;}
   for(let pass=0;pass<2;pass++)for(let i=0;i<frames;i++){e.distance=e.previousDistance=e.totalDistance*.03+i*step*.25;e.time=3+i/60;const t0=performance.now();e.render();if(pass)steady.push(performance.now()-t0);}
   const mean=a=>a.reduce((s,n)=>s+n,0)/Math.max(1,a.length),sorted=a=>a.toSorted((x,y)=>x-y);
   if(scenery)scenery.drawParticles=drawParticles;
   results[pair.key]={bakes,bakeMsPerChunk:bakes?bakeMs/bakes:0,particleMsPerFrame:particleCalls?particleMs/particleCalls:null,materialMsPerChunk:bakes?materialMs/bakes:0,growthMsPerChunk:bakes?growthMs/bakes:0,firstPassRenderMean:mean(renderMs),steadyRenderMean:mean(steady),steadyP95:sorted(steady)[Math.floor(steady.length*.95)]};
  }
  return results;
 }};
