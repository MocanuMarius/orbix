// v1.2-level preview: the real WispFlight renderer, paused, in real flight
// lighting only (no fully-lit view). Each course gets two engines:
//  before = the game with the ground dressing off (?scenery=1: original
//           terrain material and the shared ecology plants),
//  after  = what the game ships (v1.2 ground, boulders and growth).
// Everything else (background, edge light, rock law) is the same in both.
// Moments per course: the wisp's own light at two places along the course and
// a Flash pickup moment (scene reveal + forward sight), all real game states.
// The probe can also ask for p3, luminance and finish.
// Query: ?still=1 (fixed time, for captures), ?only=frost-0 (one course).
import {WispFlight} from '../flight.mjs?v=guide-clarity-1';
import {BIOMES,BIOME_LEVELS} from '../biomes.mjs?v=guide-clarity-1';
import {getRunModifiers} from '../model.mjs?v=guide-clarity-1';
import {sceneryTwoStats} from '../level-scenery-two.mjs?v=guide-clarity-1';
import {terrainBoundary} from '../terrain-boundary.mjs?v=guide-clarity-1';

const query=new URLSearchParams(location.search);
const SECTIONS=['moonruins','frost','pinewood','marsh','fungal','basalt','desert','coral','crystal','cloud','thorn','cemetery']
 .map(biome=>({biome,code:'v1.2-level-'+biome,courses:biome==='frost'?[0,3]:[0,2],moments:['p1','p2','flash']}));
const LOOKS={
 moonruins:'Earth over worked stone courses, broken columns and fallen blocks at the surface, dry grass and ivy on tops, ivy vines below.',
 frost:'Snow with wind-carved sastrugi over firn and glacial ice, ice lenses, crevasses and dark erratic boulders. Hoarfrost, ice shards, cornices and icicles. No plants.',
 pinewood:'Moss over humus with roots and grey stone; mossy boulders. Pines, ferns, mushrooms, twigs and logs; roots and lichen below.',
 marsh:'Wet moss over peat with roots and sunk logs, waterlogged clay below. Reeds, cattails and sedge; hanging moss under roofs.',
 fungal:'Spongy purple loam threaded with mycelium. Mushroom groups, shelf fungi on faces, rare spore glints; hyphae hang below.',
 basalt:'Ash drifts over hexagonal basalt columns with dim ember seams deep inside; scoria boulders. Cooled lava drips under overhangs. No plants.',
 desert:'Rippled sand over fine sand strata and sandstone, half-buried sandstone boulders, bones and fossils. Sparse dry tufts and rare cacti.',
 coral:'Barnacle crust over porous coral rock with shells and bones; coral heads. Fan corals and anemones; weed hangs below.',
 crystal:'Bare dark rock with crystal veins and embedded crystals. Crystal clusters on tops and under roofs. No plants.',
 cloud:'Grass cap over soil and grey island rock with stones. Grass and flowers on tops; roots and dangling rubble below.',
 thorn:'Dark moss over root-bound earth with pale stone ribs. Briars and rare blossoms on tops, hanging briars below.',
 cemetery:'Grass over soft dark soil with small stones and old bones. Tall grass, wildflowers, rare posts and grave markers.',
};
const MOMENTS={
 p1:{at:22,label:'Flight darkness · early'},
 p2:{at:48,label:'Flight darkness · middle'},
 p3:{at:74,label:'Flight darkness · late'},
 flash:{at:48,label:'Flash pickup moment (scene reveal)'},
 luminance:{at:48,label:'Maximum Luminance (+180%)'},
 // Probe only: the finish reveal at 80%.
 finish:{at:48,label:'Finish reveal'},
};
const status=document.querySelector('#status');
const still=query.get('still')==='1';
const courses=[];

function makeEngine(level,after){
 const host=document.createElement('div');host.className='host';
 const canvas=document.createElement('canvas');host.append(canvas);document.querySelector('#hosts').append(host);
 const options=after?{scenery:2}:{scenery:1};
 const e=new WispFlight({canvas,terrain:level.terrain,seed:17,duration:90,preview:true,...options,
  node:{...level,levelId:level.id,type:'flight',boss:false,row:2,mapIndex:0,difficulty:1},
  companions:['collector'],flame:100,modifiers:getRunModifiers({companions:['collector'],skills:{}})});
 e.setMuted(true);e.start({paused:true});
 return e;
}
function view(caption){
 const figure=document.createElement('figure'),label=document.createElement('figcaption'),canvas=document.createElement('canvas');
 label.innerHTML=caption;canvas.className='view';canvas.width=900;canvas.height=405;figure.append(label,canvas);return {figure,canvas};
}
function playLinks(biome,index){
 const play=document.createElement('a');play.className='play';play.href=`game.html?mock=boundary&cards=1&biome=${biome}&course=${index+1}&scenery=2`;play.textContent='Play it (v1.2 ground)';
 const old=document.createElement('a');old.className='play';old.href=`game.html?mock=boundary&cards=1&biome=${biome}&course=${index+1}&scenery=1`;old.textContent='Play with ground off (?scenery=1)';
 return [play,old];
}
function addCourse(section,biomeId,index,moments,afterLabel){
 const key=biomeId+'-'+index;if(query.has('only')&&query.get('only')!==key)return;
 const level=BIOME_LEVELS.filter(l=>l.biomeId===biomeId)[index],biome=BIOMES.find(b=>b.id===biomeId);
 const title=document.createElement('h3');title.append(`${biome.name} · course ${index+1}: ${level.name}`,...playLinks(biomeId,index));
 section.append(title);
 const views={};
 for(const moment of moments){
  const grid=document.createElement('div');grid.className='grid';
  const before=view(`<b>Before</b> · ${MOMENTS[moment].label}`),after=view(`<b>After</b> · ${afterLabel} · ${MOMENTS[moment].label}`);
  grid.append(before.figure,after.figure);section.append(grid);
  views[moment]={before,after};
 }
 courses.push({key,level,moments,views,before:makeEngine(level,false),after:makeEngine(level,true)});
}
for(const group of SECTIONS){
 if(query.has('only')&&!group.courses.some(index=>query.get('only')===group.biome+'-'+index))continue;
 const section=document.createElement('section'),heading=document.createElement('h2');
 const biome=BIOMES.find(b=>b.id===group.biome);
 heading.innerHTML=`<span class="code">${group.code}</span> ${biome.name}`;section.append(heading);
 const lead=document.createElement('p');lead.className='lead';lead.textContent=LOOKS[group.biome];section.append(lead);
 for(const index of group.courses)addCourse(section,group.biome,index,group.moments,'v1.2 ground, boulders and growth');
 document.querySelector('#sections').append(section);
}

// Put the wisp in the open corridor a little above the floor at its screen x.
function corridorY(e){
 const {profiles}=terrainBoundary(e,e.time),x=e.distance+e.player.x;
 let floor=e.height,roof=0;
 for(const p of profiles){
  const pts=p.points;if(!pts.length)continue;const lo=Math.min(pts[0][0],pts.at(-1)[0]),hi=Math.max(pts[0][0],pts.at(-1)[0]);if(x<lo||x>hi)continue;
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if((x-a[0])*(x-b[0])<=0&&a[0]!==b[0]){const y=a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);if(p.top)roof=Math.max(roof,y);else floor=Math.min(floor,y);break;}}
 }
 if(!(floor>roof))return e.height*.5;
 // About three wisp radii above the floor, so ground and edge sit in its light.
 return Math.max(roof+(floor-roof)*.35,floor-(window.__clearance||46));
}
const baseLuminance=new WeakMap();
function setMoment(e,moment){
 const m=MOMENTS[moment];
 e.time=3;e.visualTime=3;
 e.distance=e.previousDistance=e.totalDistance*m.at/100;
 e.player.y=e.previousPlayerY=corridorY(e);
 if(!baseLuminance.has(e))baseLuminance.set(e,e.mod.cardLuminancePercent||0);
 e.mod.cardLuminancePercent=moment==='luminance'?180:baseLuminance.get(e);
 e.sightUntil=0;e.pickupRevealStartedAt=-Infinity;e.pickupRevealHoldUntil=-Infinity;e.pickupRevealFrom=0;
 e.completing=moment==='finish';e.completionAge=moment==='finish'?1.2:0;
 if(moment==='flash'){
  // The Flash pickup's own state: forward sight for its duration and the
  // scene reveal at full strength (half a second after collection).
  e.time=2.5;e.sightUntil=2.5+4;e.revealFromPickup(true,null,false);e.time=e.visualTime=3;
 }
}
function paint(e,target){
 e.render();
 const source=e.pixiView?.canvas;if(!source)return;
 const c=target.getContext('2d');c.imageSmoothingEnabled=false;
 if(target.width!==source.width||target.height!==source.height){target.width=source.width;target.height=source.height;}
 c.drawImage(source,0,0,target.width,target.height);
}
function frame(course){
 for(const moment of course.moments){
  setMoment(course.before,moment);paint(course.before,course.views[moment].before.canvas);
  setMoment(course.after,moment);paint(course.after,course.views[moment].after.canvas);
 }
}
const ready=Promise.all(courses.flatMap(c=>[c.before.ready,c.after.ready])).then(()=>{
 for(const course of courses)frame(course);
 status.textContent=`${courses.length} courses ready`;return true;
});
document.querySelector('#redraw').onclick=()=>{for(const course of courses)frame(course);};

// Capture and measurement helpers for scripts/level-scenery-probe.mjs.
function lum(r,g,b){const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(r)+.7152*f(g)+.0722*f(b);}
window.__level={ready,courses,setMoment,
 // Edge contrast in flight darkness: for exposed contact points binned by
 // distance from the wisp (in wisp radii), the brightest pixel on the contact
 // (0-2 px into the solid) against open air 4-5 px outside it.
 async edgeContrast({key,moment='p2',which='after',bins=[2,6,12],clearance=46}={}){
  await ready;const course=courses.find(c=>c.key===key),e=course[which];window.__clearance=clearance;setMoment(e,moment);window.__clearance=0;e.render();
  const view=e.pixiView,buffer=view.buffer,W=buffer.width,H=buffer.height,s=view.scale;
  const data=buffer.getContext('2d').getImageData(0,0,W,H).data,px=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=H)return null;const i=(y*W+x)*4;return [data[i],data[i+1],data[i+2]];};
  const {segments}=terrainBoundary(e,e.visualTime),wx=e.distance+e.player.x,wy=e.renderPlayerY??e.player.y,R=e.player.radius;
  const rows=Object.fromEntries(bins.map(b=>[b,[]]));
  for(const seg of segments){
   const [ax,ay]=seg.a,[bx,by]=seg.b,len=Math.hypot(bx-ax,by-ay),inward=seg.top?-1:1;if(!len)continue;
   for(let t=0;t<=len;t+=2){
    const x=ax+(bx-ax)*t/len,y=ay+(by-ay)*t/len,dr=Math.hypot(x-wx,y-wy)/R;
    const bin=bins.find(b=>Math.abs(dr-b)<=Math.max(.5,b*.12));if(bin===undefined)continue;
    const sx=x*s-Math.round(e.distance*s),sy=y*s;if(sx<2||sx>W-3)continue;
    let edge=null,best=-1;for(let k=0;k<=2;k++){const p=px(sx,sy+inward*k);if(p){const l=lum(...p);if(l>best){best=l;edge=p;}}}
    const airA=px(sx,sy-inward*4),airB=px(sx,sy-inward*5);if(!edge||!airA||!airB)continue;
    const air=[0,1,2].map(i=>(airA[i]+airB[i])/2),la=lum(...air);
    rows[bin].push({edge,air,le:best,la,ratio:(best+.05)/(la+.05)});
   }
  }
  const median=a=>a.length?a.toSorted((x,y)=>x-y)[Math.floor(a.length/2)]:null;
  return Object.fromEntries(Object.entries(rows).map(([bin,list])=>[bin,{n:list.length,edgeLum:median(list.map(r=>r.le)),airLum:median(list.map(r=>r.la)),ratio:median(list.map(r=>r.ratio)),edgeRGB:list.length?list.toSorted((a,b)=>a.le-b.le)[Math.floor(list.length/2)].edge:null}]));
 },
 // Light inside rock: mean luminance of solid pixels deeper than `depth`
 // world units behind any exposed contact, against open-air pixels.
 async interiorLight({key,moment='flash',which='after',depth=24}={}){
  await ready;const course=courses.find(c=>c.key===key),e=course[which];setMoment(e,moment);e.render();
  const view=e.pixiView,buffer=view.buffer,W=buffer.width,H=buffer.height,s=view.scale,cam=Math.round(e.distance*s);
  const data=buffer.getContext('2d').getImageData(0,0,W,H).data;
  const {profiles,segments}=terrainBoundary(e,e.visualTime);
  const heightAt=(p,x)=>{const pts=p.points;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if((x-a[0])*(x-b[0])<=0&&a[0]!==b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return null;};
  let deep=0,deepN=0,air=0,airN=0;
  for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){
   const wxp=(x+cam)/s,wyp=y/s;let solid=false;
   for(const p of profiles){const h=heightAt(p,wxp);if(h===null)continue;if(p.top?wyp<h:wyp>h){solid=true;break;}}
   const i=(y*W+x)*4,l=lum(data[i],data[i+1],data[i+2]);
   if(!solid){air+=l;airN++;continue;}
   let near=Infinity;for(const seg of segments){const [ax,ay]=seg.a,[bx,by]=seg.b,dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((wxp-ax)*dx+(wyp-ay)*dy)/L));near=Math.min(near,Math.hypot(wxp-ax-dx*t,wyp-ay-dy*t));if(near<depth)break;}
   if(near>=depth){deep+=l;deepN++;}
  }
  return {deepMean:deepN?deep/deepN:null,deepN,airMean:airN?air/airN:null,airN};
 },
 async bakeLoop({rounds=6}={}){
  await ready;const out={};
  for(const course of courses)for(const which of ['before','after']){
   const e=course[which],view=e.pixiView,cache=view.terrainCache,palette=view.palette;
   const jobs=[];for(const o of e.layout.obstacles)for(const top of [true,false]){const shape=top?o.topShape:o.bottomShape;if(shape?.length)jobs.push([o,shape,top]);}
   const s0={...sceneryTwoStats};let total=0,count=0;
   for(let r=0;r<rounds;r++){
    for(const item of cache.values()){item.canvas.width=1;if(item.growth)item.growth.canvas.width=1;}cache.clear();
    const t0=performance.now();for(const [o,shape,top] of jobs){view.terrainImage(e,o,shape,top,palette);if(cache.size>17){for(const item of cache.values()){item.canvas.width=1;if(item.growth)item.growth.canvas.width=1;}cache.clear();}}
    total+=performance.now()-t0;count+=jobs.length;
   }
   out[course.key+'-'+which]={chunks:jobs.length,msPerChunk:total/count,materialMs:(sceneryTwoStats.materialMs-s0.materialMs)/count,growthMs:(sceneryTwoStats.growthMs-s0.growthMs)/count};
  }
  return out;
 },
 // Level start: a fresh engine's init (art preparation, first frame) for one course.
 async startCost({key,which='after',runs=3}={}){
  await ready;const course=courses.find(c=>c.key===key),list=[];
  for(let r=0;r<runs;r++){const t0=performance.now();const e=makeEngine(course.level,which==='after');await e.ready;e.render();list.push(performance.now()-t0);const host=e.canvas.parentElement;e.destroy?.();host?.remove();}
  return list.toSorted((a,b)=>a-b)[Math.floor(list.length/2)];
 },
 async bench({frames=120,which='after',key}={}){
  await ready;const results={};
  for(const course of courses){if(key&&course.key!==key)continue;const e=course[which],view=e.pixiView;setMoment(e,'p1');
   const cache=view.terrainCache;let bakeMs=0,bakes=0;const original=view.terrainImage,seen=new WeakSet();
   for(const item of cache.values()){item.canvas.width=1;if(item.growth)item.growth.canvas.width=1;}cache.clear();
   view.terrainImage=function(...args){const t0=performance.now();const item=original.apply(this,args);const dt=performance.now()-t0;if(!seen.has(item)){seen.add(item);bakeMs+=dt;bakes++;}return item;};
   const span=e.totalDistance*.9,step=span/frames,renderMs=[];
   for(let i=0;i<frames;i++){e.distance=e.previousDistance=e.totalDistance*.03+i*step;e.time=3+i/60;const t0=performance.now();e.render();renderMs.push(performance.now()-t0);}
   view.terrainImage=original;
   const steady=[];
   for(let pass=0;pass<2;pass++)for(let i=0;i<frames;i++){e.distance=e.previousDistance=e.totalDistance*.03+i*step*.25;e.time=3+i/60;const t0=performance.now();e.render();if(pass)steady.push(performance.now()-t0);}
   const mean=a=>a.reduce((s,n)=>s+n,0)/Math.max(1,a.length),sorted=a=>a.toSorted((x,y)=>x-y);
   results[course.key]={bakes,bakeMsPerChunk:bakes?bakeMs/bakes:0,firstPassRenderMean:mean(renderMs),steadyRenderMean:mean(steady),steadyP95:sorted(steady)[Math.floor(steady.length*.95)]};
  }
  return results;
 }};
if(!still)status.textContent='Loading…';
