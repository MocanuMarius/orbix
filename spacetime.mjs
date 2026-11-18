import {WISP_ART} from './companion-art.mjs?v=cue-1';

// Spacetime changes the real, local bank polygon. All solid queries therefore
// see the same dent; Sparks, scene props and guardian geometry are never moved.
export const SPACETIME_TUNING=Object.freeze({clearance:34,fullClearance:10,depth:WISP_ART.worldRadius*.65,
 behind:82,ahead:146,lead:25,sample:6,rise:14,release:6});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>v*v*(3-2*v),EPS=.0001;
export const spacetimeBaseShape=shape=>shape?.spacetime?.base||shape;
const ordinary=o=>!o.destroyed&&!o.motion&&!o.soft&&!o.bossPhase&&!o.guardianGate&&!o.guardianLane&&!o.dynamic&&!o.hazard;
export function spacetimeOffsetAt(shape,localX){
 const data=shape?.spacetime;if(!data)return 0;
 const x=data.originX+localX;let depth=0;
 for(const f of data.fields){
  const delta=x-f.x-f.lead,span=delta<0?f.behind:f.ahead,u=Math.max(0,(Math.abs(delta)-32)/(span-32));
  if(u<1)depth=Math.max(depth,f.depth*(1-smooth(u)));
 }
 return (data.top?-1:1)*depth;
}
function profileY(shape,x){
 for(let i=3;i<shape.length;i++){
  const a=shape[i-1],b=shape[i];
  if(x>=b[0]-EPS&&x<=a[0]+EPS){const dx=b[0]-a[0];return dx?a[1]+(b[1]-a[1])*(x-a[0])/dx:Math.min(a[1],b[1]);}
 }
 return null;
}
export function spacetimeSurfaceOffsetAt(shape,x){
 if(!shape?.spacetime)return 0;
 const y=profileY(shape,x),source=profileY(shape.spacetime.base,x);
 return y===null||source===null?0:y-source;
}
function nearestBank(obstacles,x,y,radius){
 let nearest=null,best=Infinity;
 for(const o of obstacles){
  if(!ordinary(o))continue;
  for(const top of [true,false]){
   const shape=spacetimeBaseShape(top?o.topShape:o.bottomShape);if(!shape?.length)continue;
   const localX=x-o.x,anchor=o.center+(top?-1:1)*o.gap/2,localY=y-anchor;
   // Contact profiles are monotone in X. Closing faces are not skimmable banks.
   if(localX<shape.at(-1)[0]||localX>shape[2][0])continue;
   const under=profileY(shape,localX);if(under===null||(top?under-localY:localY-under)>SPACETIME_TUNING.depth)continue;
   const inside=top?localY<under:localY>under;
   for(let i=3;i<shape.length;i++){
    const a=shape[i-1],b=shape[i],dx=b[0]-a[0],dy=b[1]-a[1];
    if(Math.max(a[0],b[0])<localX-radius-SPACETIME_TUNING.clearance||Math.min(a[0],b[0])>localX+radius+SPACETIME_TUNING.clearance)continue;
    const t=clamp(((localX-a[0])*dx+(localY-a[1])*dy)/(dx*dx+dy*dy||1),0,1);
    const clearance=(inside?-1:1)*Math.hypot(localX-a[0]-dx*t,localY-a[1]-dy*t)-radius;
    if(clearance<best){best=clearance;nearest={top,clearance};}
   }
  }
 }
 return nearest;
}
function deform(base,o,top,fields){
 const active=fields.filter(f=>f.top===top&&f.depth>EPS&&o.x+base[2][0]>f.x+f.lead-f.behind&&o.x+base.at(-1)[0]<f.x+f.lead+f.ahead);
 if(!active.length)return base;
 const xs=base.slice(2).map(p=>p[0]);
 for(const f of active){
   const left=Math.max(base.at(-1)[0],f.x+f.lead-f.behind-o.x),right=Math.min(base[2][0],f.x+f.lead+f.ahead-o.x);
  xs.push(left,right);
  for(let x=Math.ceil((o.x+left)/SPACETIME_TUNING.sample)*SPACETIME_TUNING.sample-o.x;x<right;x+=SPACETIME_TUNING.sample)xs.push(x);
 }
 xs.sort((a,b)=>b-a);
 const shape=[base[0].slice(),base[1].slice()];
 Object.defineProperty(shape,'spacetime',{value:{base,originX:o.x,top,fields:active.map(f=>({...f}))}});
 let last=Infinity;
 for(const x of xs){if(Math.abs(last-x)<EPS)continue;last=x;const y=profileY(base,x);shape.push([x,y+spacetimeOffsetAt(shape,x)]);}
 return shape;
}
export class SpacetimeTerrain{
 constructor(engine){this.engine=engine;this.fields=[];this.changed=new Set();this.revision=0;}
 update(dt,obstacles=this.engine.layout.obstacles){
  const e=this.engine,x=e.distance+e.player.x,y=e.player.y;
  const nearest=nearestBank(obstacles,x,y,e.player.radius),t=SPACETIME_TUNING;
  const top=nearest&&nearest.clearance<t.clearance?nearest.top:null;
  const target=top===null?0:t.depth*smooth(clamp((t.clearance-nearest.clearance)/(t.clearance-t.fullClearance),0,1));
  let field=this.fields.find(f=>f.top===top);
  if(target>EPS&&!field){field={top,x,depth:0,lead:t.lead,behind:t.behind,ahead:t.ahead};this.fields.push(field);}
  for(const f of this.fields){
   const aim=f===field?target:0;
   if(f===field&&aim>EPS)f.x=x;
   f.depth+=(aim-f.depth)*(1-Math.exp(-dt*(aim>f.depth?t.rise:t.release)));
  }
  this.fields=this.fields.filter(f=>f.depth>.002);
  if(!this.fields.length&&!this.changed.size)return;
  const visit=new Set([...this.changed,...obstacles]);this.changed.clear();
  for(const o of visit){
   for(const top of [true,false]){
    const key=top?'topShape':'bottomShape',base=spacetimeBaseShape(o[key]);if(!base?.length)continue;
    o[key]=ordinary(o)?deform(base,o,top,this.fields):base;
    if(o[key]!==base)this.changed.add(o);
   }
  }
  this.revision++;
 }
 resizeY(factor){
  // The normal resize loop scales displayed shapes; their saved source needs
  // scaling once too, so release cannot restore pre-resize geometry.
  for(const o of this.changed)for(const shape of [o.topShape,o.bottomShape])if(shape?.spacetime){
   // Body size stays fixed in world units. Keep this shallow displacement
   // fixed too while the surrounding course is resized vertically.
   for(let i=2;i<shape.length;i++)shape[i][1]-=spacetimeSurfaceOffsetAt(shape,shape[i][0])*(1-1/factor);
   for(const point of shape.spacetime.base)point[1]*=factor;
  }
 }
 fork(obstacles){
  const copies=obstacles.map(o=>({...o,topShape:spacetimeBaseShape(o.topShape),bottomShape:spacetimeBaseShape(o.bottomShape)}));
  const engine={...this.engine,layout:{obstacles:copies},player:{...this.engine.player}},field=new SpacetimeTerrain(engine);
  field.fields=this.fields.map(f=>({...f}));field.update(0,copies);
  return {engine,field,obstacles:copies};
 }
 clear(){for(const o of this.changed){o.topShape=spacetimeBaseShape(o.topShape);o.bottomShape=spacetimeBaseShape(o.bottomShape);}this.fields=[];this.changed.clear();}
}

// Reuse the original material bake. Only the local dent uses translated image
// columns, clipped by the real polygon; the rest remains two ordinary blits.
export function drawSpacetimeTerrain(c,item,shape,{scale,x,y,path,fill}){
 const data=shape.spacetime;if(!data)return false;
 const canvas=item.canvas,s=scale,left=Math.max(0,Math.floor((Math.min(...data.fields.map(f=>f.x+f.lead-f.behind))-data.originX-item.x)*s+item.pad)),
  right=Math.min(canvas.width,Math.ceil((Math.max(...data.fields.map(f=>f.x+f.lead+f.ahead))-data.originX-item.x)*s+item.pad));
 c.save();path(c,shape,x+item.pad-item.x*s,y+item.pad-item.y*s,s);
 if(fill){c.fillStyle=fill;c.fill();}c.clip();
 if(left>0)c.drawImage(canvas,0,0,left,canvas.height,x,y,left,canvas.height);
 if(right<canvas.width)c.drawImage(canvas,right,0,canvas.width-right,canvas.height,x+right,y,canvas.width-right,canvas.height);
 for(let col=left;col<right;col++){
  const localX=(col+.5-item.pad)/s+item.x,offset=spacetimeSurfaceOffsetAt(shape,localX)*s;
  c.drawImage(canvas,col,0,1,canvas.height,x+col,y+offset,1,canvas.height);
 }
 c.restore();return true;
}
