// Terrain collides as a union of filled polygons. Its visible contact outline
// must be that same union, rather than outlining every buried source piece.
import {isContactEdgeStyle,paintContactEdge} from './contact-edge-art.mjs?v=skim-1';
import {getContactEdgePalette} from './contact-edge-palettes.mjs?v=skim-1';
const cache=new WeakMap();
const renderFrames=new WeakMap();
const EPS=1e-6;
const revision=shape=>{let h=2166136261;for(const point of shape||[])for(const value of point)h=Math.imul(h^Math.round(value*1024),16777619);return h>>>0;};
function edgeAt(profile,x){
 const points=profile.points;if(x<points[0][0]-EPS||x>points.at(-1)[0]+EPS)return -1;
 let lo=0,hi=points.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(points[mid][0]<=x)lo=mid;else hi=mid;}
 return Math.min(lo,points.length-2);
}
function heightAt(profile,x){
 const i=edgeAt(profile,x);if(i<0)return null;
 const a=profile.points[i],b=profile.points[i+1];
 if(Math.abs(b[0]-a[0])<EPS)return profile.top?Math.max(a[1],b[1]):Math.min(a[1],b[1]);
 return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
}
function buried(profiles,owner,x,y){
 for(const other of profiles){
  if(other===owner)continue;
  const edge=heightAt(other,x);if(edge===null)continue;
  if(other.top?y<edge-EPS:y>edge+EPS)return true;
  // Coincident contacts have one owner, avoiding doubled bright strokes.
  if(Math.abs(y-edge)<EPS&&other.index<owner.index)return true;
 }
 return false;
}
function buildSegments(profiles){
 const result=[];
 for(const profile of profiles){
  const neighbours=profiles.filter(p=>p!==profile&&p.points[0][0]<=profile.points.at(-1)[0]&&p.points.at(-1)[0]>=profile.points[0][0]);
  for(let i=1;i<profile.points.length;i++){
   const a=profile.points[i-1],b=profile.points[i],dx=b[0]-a[0];
   if(Math.abs(dx)<EPS){
    if(Math.abs(b[1]-a[1])<EPS)continue;
    const cuts=[Math.min(a[1],b[1]),Math.max(a[1],b[1])];
    for(const p of neighbours){const y=heightAt(p,a[0]);if(y>cuts[0]&&y<cuts[1])cuts.push(y);}
    cuts.sort((a,b)=>a-b);
    for(let j=1;j<cuts.length;j++)if(cuts[j]-cuts[j-1]>EPS&&!buried(neighbours,profile,a[0],(cuts[j]+cuts[j-1])/2))
     result.push({a:[a[0],cuts[j-1]],b:[a[0],cuts[j]],top:profile.top,owner:profile.owner});
    continue;
   }
   const slope=(b[1]-a[1])/dx,at=x=>a[1]+(x-a[0])*slope,cuts=[a[0],b[0]];
   for(const p of neighbours){
    if(p.points[0][0]>b[0]||p.points.at(-1)[0]<a[0])continue;
    const start=Math.max(0,edgeAt(p,Math.max(a[0],p.points[0][0])));
    for(let j=start+1;j<p.points.length&&p.points[j-1][0]<b[0]+EPS;j++){
     const c=p.points[j-1],d=p.points[j],left=Math.max(a[0],c[0]),right=Math.min(b[0],d[0]);
     if(left>right)continue;
     if(left>a[0]+EPS)cuts.push(left);if(right<b[0]-EPS)cuts.push(right);
     const otherSlope=(d[1]-c[1])/(d[0]-c[0]||EPS);
     if(Math.abs(slope-otherSlope)>EPS){
      const crossing=(c[1]-otherSlope*c[0]-a[1]+slope*a[0])/(slope-otherSlope);
      if(crossing>left+EPS&&crossing<right-EPS)cuts.push(crossing);
     }
    }
   }
   cuts.sort((a,b)=>a-b);
   for(let j=1;j<cuts.length;j++){
    const left=cuts[j-1],right=cuts[j];if(right-left<EPS)continue;
    const mid=(left+right)/2;
    if(!buried(neighbours,profile,mid,at(mid)))result.push({a:[left,at(left)],b:[right,at(right)],top:profile.top,owner:profile.owner});
   }
  }
 }
 return result;
}
// Ecology, rims, props and foreground share one render's exact local union.
// True polygon extents include long shoulders; unscoped inspection retains the
// full-course union and its in-place shape invalidation.
export function beginTerrainBoundaryFrame(engine,time,distance,width=engine.width){
 let frame=renderFrames.get(engine);if(!frame){frame={obstacles:[]};renderFrames.set(engine,frame);}
 const nearby=[],left=distance-64,right=distance+width+64;
 for(const o of engine.layout.obstacles){
  if(o.destroyed)continue;let min=Infinity,max=-Infinity;
  for(const shape of [o.topShape,o.bottomShape])for(const point of shape||[]){min=Math.min(min,point[0]);max=Math.max(max,point[0]);}
  if(o.x+max>=left&&o.x+min<=right)nearby.push(o);
 }
 if(nearby.length!==frame.obstacles.length||nearby.some((o,i)=>o!==frame.obstacles[i]))frame.obstacles=nearby;
 frame.time=time;frame.active=true;frame.boundary=null;
}
export function endTerrainBoundaryFrame(engine){const frame=renderFrames.get(engine);if(frame)frame.active=false;}
export function releaseTerrainBoundaryFrame(engine){renderFrames.delete(engine);}
export function terrainBoundary(engine,time=engine.visualTime??engine.time??0){
 const frame=renderFrames.get(engine);
 if(frame?.active&&frame.time===time)return frame.boundary??=buildBoundary(frame.obstacles,time);
 return buildBoundary(engine.layout.obstacles,time);
}
function buildBoundary(obstacles,time){
 let state=cache.get(obstacles),changed=!state||state.entries.length!==obstacles.length;
 if(!changed)for(let i=0;i<obstacles.length;i++){
  const o=obstacles[i],saved=state.entries[i],center=o.center+Math.sin(time*.9+(o.phase||0))*(o.motion||0);
  if(saved.owner!==o||saved.x!==o.x||saved.center!==center||saved.gap!==o.gap||saved.destroyed!==o.destroyed||saved.top!==o.topShape||saved.bottom!==o.bottomShape||saved.topRevision!==revision(o.topShape)||saved.bottomRevision!==revision(o.bottomShape)){changed=true;break;}
 }
 if(!changed)return state;
 const profiles=[],entries=[];
 for(const owner of obstacles){
  const center=owner.center+Math.sin(time*.9+(owner.phase||0))*(owner.motion||0);
  entries.push({owner,x:owner.x,center,gap:owner.gap,destroyed:owner.destroyed,top:owner.topShape,bottom:owner.bottomShape,topRevision:revision(owner.topShape),bottomRevision:revision(owner.bottomShape)});
  if(owner.destroyed)continue;
  for(const top of [true,false]){
   const shape=top?owner.topShape:owner.bottomShape;if(!shape||shape.length<4)continue;
   const anchor=center+(top?-1:1)*owner.gap/2;
   const points=shape.slice(2).reverse().map(([x,y])=>[owner.x+x,anchor+y]);
   if(points.length<2)continue;
   profiles.push({owner,top,points,index:profiles.length});
  }
 }
 state={entries,profiles,segments:buildSegments(profiles)};cache.set(obstacles,state);return state;
}
export function terrainSurfaceExposed(engine,owner,top,x,y,time,boundary){
 const {profiles}=boundary||terrainBoundary(engine,time),profile=profiles.find(p=>p.owner===owner&&p.top===top);
 return Boolean(profile&&!buried(profiles,profile,x,y));
}
export function drawTerrainBoundary(c,engine,{scale=1,distance=engine.renderDistance??engine.distance,time=engine.visualTime??engine.time,line}={}){
 const {segments}=terrainBoundary(engine,time),camera=Math.round(distance*scale),width=engine.width*scale,height=engine.height*scale;
 const palette=engine.contactEdgePalette||getContactEdgePalette(engine);
 const stroke=line||((c,x,y,xx,yy,color,size)=>{c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=size;c.stroke();});
 for(const segment of segments){
  let [ax,ay]=segment.a,[bx,by]=segment.b;
  if(bx<distance-4||ax>distance+engine.width+4)continue;
  // Clip to the viewport before pixel stepping, including long offscreen
  // shoulders. Baking/static contour work never scales with camera distance.
  if(bx>ax){const slope=(by-ay)/(bx-ax);if(ax<distance-4){ay+=(distance-4-ax)*slope;ax=distance-4;}if(bx>distance+engine.width+4){by-=(bx-distance-engine.width-4)*slope;bx=distance+engine.width+4;}}
  const x=Math.round(ax*scale)-camera,y=Math.round(ay*scale),xx=Math.round(bx*scale)-camera,yy=Math.round(by*scale),inward=segment.top?-1:1;
  if(Math.max(y,yy)<-4||Math.min(y,yy)>height+4||x>width+4)continue;
  stroke(c,x,y+inward*2,xx,yy+inward*2,'#14201f',2);
  if(isContactEdgeStyle(engine.boundaryStyle))paintContactEdge(c,{x,y,xx,yy,inward,worldAx:ax,worldAy:ay,scale,
    playerX:engine.player.x*scale,playerY:(engine.renderPlayerY??engine.player.y)*scale,time,style:engine.boundaryStyle,line:stroke,reducedMotion:engine.reducedMotion,palette});
  else stroke(c,x,y,xx,yy,'#b9c6aa',1);
 }
}
