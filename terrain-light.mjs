import {LIGHT_EXTENT,lightAttenuation} from './light-attenuation.mjs?v=skills-cards-1';

// Rendering only: rock consumes 4.5 units of Luminance reach for each unit
// travelled. Gameplay visibility, encounters and collection use their own law.
export const SOLID_LIGHT_COST=4.5;
export const TERRAIN_LIGHT_LIMITS=Object.freeze({rays:96,pixels:128,masks:8,sourceStep:6,motionHz:12});
const states=new WeakMap(),TAU=Math.PI*2,EPS=1e-7;
const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
const inside=(points,x,y)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
 const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
}return hit;};
export function solidRayIntervals(polygons,x,y,dx,dy,reach){
 const spans=[];
 for(const points of polygons){
  const cuts=[0,reach];
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[j],b=points[i],ex=b[0]-a[0],ey=b[1]-a[1],den=cross(dx,dy,ex,ey);
   if(Math.abs(den)<EPS)continue;
   const ox=a[0]-x,oy=a[1]-y,t=cross(ox,oy,ex,ey)/den,u=cross(ox,oy,dx,dy)/den;
   if(t>0&&t<reach&&u>=-EPS&&u<=1+EPS)cuts.push(t);
  }
  cuts.sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++)if(cuts[i]-cuts[i-1]>EPS){
   const mid=(cuts[i]+cuts[i-1])/2;
   if(inside(points,x+dx*mid,y+dy*mid))spans.push([cuts[i-1],cuts[i]]);
  }
 }
 spans.sort((a,b)=>a[0]-b[0]);const union=[];
 for(const span of spans){const last=union.at(-1);if(last&&span[0]<=last[1]+EPS)last[1]=Math.max(last[1],span[1]);else union.push(span);}
 return union;
}
export function solidDistanceAt(spans,distance){
 let solid=0;for(const [a,b]of spans){if(a>=distance)break;solid+=Math.max(0,Math.min(distance,b)-a);}return solid;
}
export function materialLightDistance(distance,solidDistance){return Math.max(0,distance)+(SOLID_LIGHT_COST-1)*Math.max(0,solidDistance);}
export function materialLightAt(polygons,source,target,radius){
 const dx=target.x-source.x,dy=target.y-source.y,d=Math.hypot(dx,dy);if(!d)return 1;
 const solid=solidDistanceAt(solidRayIntervals(polygons,source.x,source.y,dx/d,dy/d,d),d);
 return lightAttenuation((materialLightDistance(d,solid)/radius)**2);
}
function checksum(points){let h=2166136261;for(const point of points)for(const v of point){h=Math.imul(h^(Math.round(v*1024)|0),16777619);}return h>>>0;}
function sceneFor(engine,distance,time){
 let state=states.get(engine);if(!state){state={objects:new WeakMap(),masks:new Map(),builds:0,hits:0};states.set(engine,state);}
 const stamp=`${distance}:${time}:${engine.width}:${engine.height}:${engine.spacetime?.revision||0}`;
 if(state.stamp===stamp)return state;
 state.stamp=stamp;const polygons=[],keys=[],reach=LIGHT_EXTENT*Math.max(145,engine.mod?.lightRadius||0,engine.getLightState?.()?.radius||0);
 for(const o of engine.layout?.obstacles||[]){
  if(o.destroyed||o.x+o.width*2.5<distance-reach)continue;
  if(o.x-o.width>distance+engine.width+reach)break;
  const sampledTime=Math.round(time*TERRAIN_LIGHT_LIMITS.motionHz)/TERRAIN_LIGHT_LIMITS.motionHz;
  const center=o.center+Math.sin(sampledTime*.9+(o.phase||0))*(o.motion||0),parts=[];
  if(o.topShape)parts.push({points:o.topShape,anchor:center-o.gap/2});
  if(o.bottomShape)parts.push({points:o.bottomShape,anchor:center+o.gap/2});
  for(const prop of o.sceneProps||[])for(const part of prop.parts||[])if(part.polygon)parts.push({points:part.polygon,anchor:center+(prop.side===-1?-1:1)*o.gap/2});
  const key=`${o.x}:${center}:${o.gap}:${parts.map(p=>`${p.anchor},${checksum(p.points)}`).join(';')}`;
  let saved=state.objects.get(o);
  if(saved?.key!==key){saved={key,polygons:parts.map(p=>{
   const points=p.points.map(([x,y])=>[o.x+x,p.anchor+y]);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
   for(const [x,y]of points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
   return{points,key:`${o.x}:${p.anchor}:${checksum(p.points)}`,minX,minY,maxX,maxY};
  })};state.objects.set(o,saved);}
  polygons.push(...saved.polygons);keys.push(key);
 }
 state.polygons=polygons;state.geometryKey=keys.join('|');return state;
}
let polar;
function polarSamples(){
 if(polar)return polar;
 const size=TERRAIN_LIGHT_LIMITS.pixels,rays=TERRAIN_LIGHT_LIMITS.rays;
 polar=Array.from({length:size*size},(_,i)=>{const dx=(i%size+.5-size/2)/(size/2),dy=(Math.floor(i/size)+.5-size/2)/(size/2),angle=(Math.atan2(dy,dx)+TAU)%TAU*rays/TAU;
  return {r:Math.hypot(dx,dy),a:Math.floor(angle),mix:angle%1};});return polar;
}
function maskFor(document,state,x,y,radius,channel){
 radius=Math.max(1,Math.round(radius/2)*2);
 const {rays,pixels,sourceStep}=TERRAIN_LIGHT_LIMITS,reach=radius*LIGHT_EXTENT;
 const sx=Math.round(x/sourceStep)*sourceStep,sy=Math.round(y/sourceStep)*sourceStep;
 // A moving floor on the far side of the viewport cannot change this light.
 // Bounds are baked with geometry, avoiding a vertex walk for every source.
 const relevant=state.polygons.filter(p=>sx+reach>=p.minX&&sx-reach<=p.maxX&&sy+reach>=p.minY&&sy-reach<=p.maxY);
 const key=`${sx}:${sy}:${radius}:${relevant.map(p=>p.key).join('|')}`,previous=state.masks.get(channel);
 if(previous?.key===key){state.hits++;return previous.canvas;}
 const nearby=relevant.map(p=>p.points);
 if(!nearby.length){rememberMask(state,channel,{key,canvas:null});return null;}
 const paths=Array.from({length:rays},(_,i)=>{const a=i*TAU/rays;return solidRayIntervals(nearby,sx,sy,Math.cos(a),Math.sin(a),reach);});
 if(paths.every(path=>!path.length)){rememberMask(state,channel,{key,canvas:null});return null;}
 const canvas=previous?.canvas||document.createElement('canvas');canvas.width=canvas.height=pixels;
 const c=canvas.getContext('2d'),image=c.createImageData(pixels,pixels),samples=polarSamples();
 for(let i=0;i<samples.length;i++){
  const {r,a,mix}=samples[i];if(r>=1)continue;
  const d=r*reach,sa=solidDistanceAt(paths[a],d),sb=solidDistanceAt(paths[(a+1)%rays],d),effective=materialLightDistance(d,sa+(sb-sa)*mix);
  const offset=i*4;image.data[offset]=image.data[offset+1]=image.data[offset+2]=255;image.data[offset+3]=Math.round(lightAttenuation((effective/radius)**2)*255);
 }
 c.putImageData(image,0,0);state.builds++;rememberMask(state,channel,{key,canvas});
 return canvas;
}
function rememberMask(state,channel,item){
 const previous=state.masks.get(channel);if(previous?.canvas&&previous.canvas!==item.canvas)previous.canvas.width=previous.canvas.height=1;
 state.masks.delete(channel);state.masks.set(channel,item);
 while(state.masks.size>TERRAIN_LIGHT_LIMITS.masks){const first=state.masks.keys().next().value,old=state.masks.get(first);if(old.canvas)old.canvas.width=old.canvas.height=1;state.masks.delete(first);}
}
export function prepareTerrainLight(){polarSamples();}
export function castTerrainLight(context,clearMask,engine,{x,y,radius,alpha=1,scale=1,distance=engine.renderDistance??engine.distance??0,time=engine.visualTime??engine.time??0,channel='main'}={}){
 if(!(radius>0)||!(alpha>0))return;
 const document=context.canvas?.ownerDocument||engine.canvas?.ownerDocument;
 const state=sceneFor(engine,distance,time),mask=document?maskFor(document,state,distance+x,y,radius,channel):null,r=radius*LIGHT_EXTENT*scale;
 const old=context.globalAlpha;context.globalAlpha=alpha;context.drawImage(mask||clearMask,x*scale-r,y*scale-r,r*2,r*2);context.globalAlpha=old;
}
export function terrainLightStats(engine){const state=states.get(engine);return state?{builds:state.builds,hits:state.hits,masks:state.masks.size,polygons:state.polygons?.length||0}: {builds:0,hits:0,masks:0,polygons:0};}
export function releaseTerrainLight(engine){const state=states.get(engine);if(state)for(const item of state.masks.values())if(item.canvas)item.canvas.width=item.canvas.height=1;states.delete(engine);}
