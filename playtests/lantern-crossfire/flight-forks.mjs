// One optional side passage carved out of real terrain. The broad original
// route stays intact; the dividing shelf uses the normal scenery colliders.
const hash=value=>{let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const FLIGHT_FORK_TUNING=Object.freeze({minimumStart:1600,exitMargin:1150,warningLead:300,
  approach:270,exit:300,minOpening:76,minimumSpan:135,maximumSpan:440,sample:8,cacheLimit:1});

function clipShelf(shape,side,cut){
 const input=shape.map(([x,y])=>[x,side*y]),result=[];
 for(let i=0;i<input.length;i++){
  const a=input[i],b=input[(i+1)%input.length],insideA=a[1]<=cut,insideB=b[1]<=cut;
  if(insideA)result.push(a);
  if(insideA!==insideB){const t=(cut-a[1])/(b[1]-a[1]);result.push([a[0]+(b[0]-a[0])*t,cut]);}
 }
 return result.map(([x,y])=>[x,side*y]);
}
function laneY(fork,x,risky){
 if(!risky)return fork.safeY;
 if(x<fork.start)return fork.safeY+(fork.cacheY-fork.safeY)*smooth((x-fork.approachStart)/(fork.start-fork.approachStart));
 if(x>fork.end)return fork.cacheY+(fork.safeY-fork.cacheY)*smooth((x-fork.end)/(fork.exitEnd-fork.end));
 return fork.cacheY;
}
export function flightForkLane(fork,risky=false){
 const points=[],count=Math.ceil((fork.exitEnd-fork.approachStart)/FLIGHT_FORK_TUNING.sample);
 for(let i=0;i<=count;i++){const x=fork.approachStart+(fork.exitEnd-fork.approachStart)*i/count;points.push({x,y:laneY(fork,x,risky)});}
 return points;
}
function clearPath(fork,risky,obstacles,height,hit){
 const points=flightForkLane(fork,risky),radius=risky?Math.max(17,height*.039)
  :fork.authored?Math.max(70,height*.16):Math.max(30,height*.066);
 for(let i=0;i<points.length;i++){
  const p=points[i],next=points[i+1]||p;
  // Half the sampled segment covers the continuum between samples, including
  // the vertical part of the entrance/exit curve. Sway is inflated in full.
  const inflated=radius+Math.hypot(next.x-p.x,next.y-p.y)*.5;
  if(p.y-inflated<24||p.y+inflated>height-24)return false;
  for(const o of obstacles){
   if(o.destroyed||p.x+inflated<o.x-o.width||p.x-inflated>o.x+o.width*2.5)continue;
   if(hit(p.x,p.y,inflated+Math.abs(o.motion||0),o,0,o.center))return false;
  }
 }
 return true;
}
export function validateFlightFork(fork,layout,{height=430,circleHitsObstacle}={}){
 return !!circleHitsObstacle&&clearPath(fork,false,layout.obstacles,height,circleHitsObstacle)
  &&clearPath(fork,true,layout.obstacles,height,circleHitsObstacle);
}

export function installFlightForks(layout,{height=430,seed=1,terrain='ruins',endX=Infinity,
  tutorial=false,boss=false,drafts=[],circleHitsObstacle}={}){
 if(layout.flightForks?.length)return layout;
 layout.flightForks=[];
 if(tutorial||boss||layout.boss||!circleHitsObstacle)return layout;
 const t=FLIGHT_FORK_TUNING,obstacles=layout.obstacles||[],target=t.minimumStart+(endX-t.exitMargin-t.minimumStart)*.46;
 const candidates=obstacles.filter(o=>!o.destroyed&&!o.soft&&!o.hard&&!o.reservedDraft&&!o.sceneProps?.length
  &&o.x>t.minimumStart&&o.x+o.width*2.5<endX-t.exitMargin)
  .sort((a,b)=>Math.abs(a.x-target)-Math.abs(b.x-target)||a.x-b.x);
 const sideFirst=hash(seed+':fork-side')%2?1:-1;
 for(const authored of [false,true])for(const original of candidates)for(const side of [sideFirst,-sideFirst]){
  let shape=side<0?original.topShape:original.bottomShape;if(!shape?.length)continue;
  const anchor=original.center+side*original.gap/2;
  if(authored){
   // A second, deliberately authored option: a low floor grows into a broad
   // natural bridge within a roomy breather. Its shoulders use the existing
   // landform contour and tapered joins; the open route must retain 140 units.
   const room=layout.sections.find(s=>s.id===original.sectionId);
   if(side<0||original.topShape||!['breather','outro'].includes(room?.kind))continue;
   const oldPeak=Math.min(...shape.slice(2).map(p=>p[1])),raise=anchor+oldPeak-height*.60;
   if(raise<=0||raise>height*.36)continue;
   const left=shape[0][0],right=shape[1][0],ramp=original.width*.8;
   shape=shape.map(([x,y],i)=>[x,i<2?y:y-raise*smooth(Math.min((x-left)/ramp,(right-x)/ramp))]);
  }
  const peak=Math.min(...shape.slice(2).map(p=>side*p[1]));
  // At the 430-unit landscape height the ~90-unit aperture leaves about
  // 23 units beyond a baseline Lift arc plus the body's full diameter.
  const opening=Math.max(t.minOpening,height*.21),thickness=Math.max(30,height*.07),cut=peak+thickness;
  const shelf=clipShelf(shape,side,cut);if(shelf.length<4)continue;
  let groups=0,inside=false;for(const p of shape.slice(2)){const next=side*p[1]<=cut;if(next&&!inside)groups++;inside=next;}
  if(groups!==1)continue;
  const minX=Math.min(...shelf.map(p=>p[0])),maxX=Math.max(...shelf.map(p=>p[0]));
  if(maxX-minX<t.minimumSpan||maxX-minX>t.maximumSpan)continue;
  const cacheY=anchor+side*(cut+opening/2),safeY=anchor+side*(peak-Math.max(authored?80:49,height*.13));
  const start=original.x+minX-28,end=original.x+maxX+28;
  const fork={id:`flight-fork:${original.id}`,hostId:original.id,side,start,end,
   approachStart:start-t.approach,warningX:start-t.warningLead,exitEnd:end+t.exit,
   safeY,cacheY,cacheX:(start+end)/2,opening,authored,cacheId:`fork-cache:${original.id}`,
   shelfLeft:original.x+minX,shelfRight:original.x+maxX,shelfBottom:anchor+side*cut,
   groundY:anchor+side*(cut+opening),rootBridge:terrain==='canopy'};
  if(fork.approachStart<t.minimumStart-350||fork.exitEnd>endX-t.exitMargin)continue;
  if(drafts.some(z=>z.x+z.rx>fork.approachStart-100&&z.x-z.rx<fork.exitEnd+100))continue;
  if((layout.riskChains||[]).some(chain=>chain.end>fork.approachStart-100&&chain.start<fork.exitEnd+100))continue;
  if((layout.embers||[]).some(p=>(p.harmful||p.kind==='dark'||p.kind==='dusk')&&p.x>fork.approachStart-50&&p.x<fork.exitEnd+50))continue;
  const donors=layout.embers.filter(p=>p.kind==='light'&&p.value!==3&&!p.generated&&!p.intro&&!p.riskChain&&!p.forkCache
    &&Math.abs(p.x-fork.cacheX)<650).sort((a,b)=>Math.abs(a.x-fork.cacheX)-Math.abs(b.x-fork.cacheX));
  if(!donors.length)continue;
  const carved=shape.map(([x,y])=>[x,side*Math.max(side*y,cut+opening)]);
  const material=terrain==='canopy'?'bark':layout.levelIdentity?.biomeId==='frost'?'ice':layout.levelIdentity?.biomeId==='crystal'?'crystal':layout.levelIdentity?.biomeId==='desert'?'sandstone':'stone';
  const prop={id:fork.id,kind:terrain==='canopy'?'hollow-root-crossing':'weathered-underpass',side,
    parts:[{material,polygon:shelf}]};
  const candidate={...original,[side<0?'topShape':'bottomShape']:carved,sceneProps:[prop],reservedFork:true};
  const validation={obstacles:obstacles.map(o=>o===original?candidate:o)};
  if(!validateFlightFork(fork,validation,{height,circleHitsObstacle}))continue;
  if(authored&&layout.embers.some(p=>p!==donors[0]&&p.x>fork.approachStart&&p.x<fork.exitEnd
    &&circleHitsObstacle(p.x,p.y,12+Math.abs(candidate.motion||0),candidate,0,candidate.center)))continue;
  // The cut removes solid ground. Keep normal fuel count unchanged by moving
  // an existing nearby mote onto the broad lane; exactly one optional reward.
  Object.assign(original,candidate);
  fork.markerGroundY=groundAt(obstacles,fork.warningX,height);
  Object.assign(donors[0],{x:fork.cacheX,y:fork.safeY,feature:'fork-safe-fuel',pocket:false,pocketSide:null,anchor:null});
  fork.fuelId=donors[0].id;
  layout.embers.push({id:fork.cacheId,x:fork.cacheX,y:fork.cacheY,kind:'cache',value:3,fuel:true,
    optional:true,forkCache:true,manualOnly:true,feature:'fork-cache',collected:false,attracted:false,phase:0});
  layout.flightForks.push(fork);layout.embers.sort((a,b)=>a.x-b.x);
  return layout;
 }
 return layout;
}

export function resizeFlightForks(layout,factor){
 for(const fork of layout.flightForks||[]){
  fork.safeY*=factor;fork.cacheY*=factor;fork.opening*=factor;
  fork.shelfBottom*=factor;fork.groundY*=factor;fork.markerGroundY*=factor;
 }
}

function groundAt(obstacles,x,height){
 let floor=height-24;
 for(const o of obstacles){
  if(o.destroyed||!o.bottomShape)continue;
  const shape=o.bottomShape,lx=x-o.x;
  for(let i=2;i<shape.length-1;i++){
   const a=shape[i],b=shape[i+1];if(lx<Math.min(a[0],b[0])||lx>Math.max(a[0],b[0]))continue;
   const t=(lx-a[0])/(b[0]-a[0]||1);floor=Math.min(floor,o.center+o.gap/2+a[1]+(b[1]-a[1])*t);break;
  }
 }
 return floor;
}
function box(c,x,y,w,h,color,scale=1){c.fillStyle=color;c.fillRect(Math.round(x*scale),Math.round(y*scale),Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));}
function polygon(c,points,distance,scale,color){
 c.fillStyle=color;c.beginPath();for(let i=0;i<points.length;i++){const p=points[i],x=Math.round((p[0]-distance)*scale),y=Math.round(p[1]*scale);if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();c.fill();
}
function pixelLine(c,x1,y1,x2,y2,scale,color){
 c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.moveTo(Math.round(x1*scale),Math.round(y1*scale));c.lineTo(Math.round(x2*scale),Math.round(y2*scale));c.stroke();
}
function cacheGlyph(c,x,y,color,scale){
 box(c,x-6,y-5,12,2,color,scale);box(c,x-6,y+5,12,2,color,scale);box(c,x-7,y-3,2,8,color,scale);box(c,x+5,y-3,2,8,color,scale);
 box(c,x-2,y-2,4,4,'#f2ecc6',scale);
}
const backdropGeometry=new WeakMap();
function bridgeBackdrop(fork){
 const cached=backdropGeometry.get(fork);
 if(cached?.groundY===fork.groundY)return cached;
 const side=fork.side,left=fork.shelfLeft-14,right=fork.shelfRight+14,mid=(left+right)/2;
 const span=(right-left)/2,spring=fork.groundY-side*12,crown=fork.shelfBottom-side*7,foot=fork.groundY+side*36;
 const outer=[[left,foot]],inner=[],arches=[];
 for(let i=0;i<=12;i++){
  const angle=Math.PI-i*Math.PI/12,sn=Math.sin(angle),cs=Math.cos(angle);
  const ox=mid+cs*span,oy=spring-(spring-crown)*sn;
  const ix=mid+cs*(span-19),iy=spring-(spring-crown-side*18)*sn;
  outer.push([ox,oy]);inner.unshift([ix,iy]);arches.push([ox,oy,ix,iy]);
 }
 outer.push([right,foot],[right-19,foot],...inner,[left+19,foot]);
 const geometry={outer,arches,left,right,spring,foot,groundY:fork.groundY};
 backdropGeometry.set(fork,geometry);return geometry;
}
/** Receding supports use background colors and no collision-edge highlight.
 * Foreground terrain covers their feet. The bright solid shelf stays exact. */
export function drawFlightForkBackdrops(c,e,{distance=e.distance,scale=1}={}){
 for(const fork of e.layout.flightForks||[]){
  if(fork.shelfRight<distance-80||fork.shelfLeft>distance+e.width+80)continue;
  // The dim rear face is visibly offset from the foreground bridge edge.
  const {outer,arches,left,right,spring,foot}=bridgeBackdrop(fork);
  const ink=fork.rootBridge?'#263329':'#28332f',seam=fork.rootBridge?'#18271e':'#182723';
  polygon(c,outer,distance,scale,ink);
  for(let i=1;i<arches.length;i+=2){const a=arches[i];pixelLine(c,a[0]-distance,a[1],a[2]-distance,a[3],scale,seam);}
  // Rear pilasters/root buttresses descend behind the usable passage.
  for(const edge of [left,right-19]){
   box(c,edge-distance,Math.min(spring,foot),19,Math.abs(foot-spring),ink,scale);
   pixelLine(c,edge-distance+7,spring,edge-distance+4,foot,scale,seam);
  }
 }
}
/** Pixel waymarks are part of the lit world, not a new overlay/action. */
export function drawFlightForks(c,e,{distance=e.distance,scale=1}={}){
 for(const fork of e.layout.flightForks||[]){
  if(fork.exitEnd<distance||fork.warningX>distance+e.width)continue;
  const x=fork.warningX-distance,y=Math.min((fork.safeY+fork.cacheY)*.5,fork.markerGroundY-43),sign=fork.side;
  if(x>-30){
   const pale='#bcc8a2',gold='#d6bd89',wood='#535544',shade='#303e32';
   box(c,x-2,y-18,4,fork.markerGroundY-y+23,shade,scale);box(c,x-2,y-17,2,fork.markerGroundY-y+21,wood,scale);
   box(c,x-6,fork.markerGroundY-2,13,5,shade,scale);
   for(const branch of [-1,1]){
    const by=y+branch*11;
    polygon(c,[[x-17,by-7],[x+16,by-7],[x+24,by],[x+16,by+7],[x-17,by+7]],0,scale,shade);
    polygon(c,[[x-15,by-5],[x+15,by-5],[x+21,by],[x+15,by+5],[x-15,by+5]],0,scale,wood);
    const color=branch===sign?gold:pale;
    if(branch===sign)cacheGlyph(c,x+1,by,color,scale);else box(c,x-1,by-2,4,4,color,scale);
    // Small diagonal arrowhead points toward the actual upper/lower lane.
    box(c,x+13,by+(branch<0?-3:1),4,2,color,scale);box(c,x+15,by-1,2,2,color,scale);
   }
  }
  // Warm squared glints identify the optional cache while the normal fuel
  // keeps its familiar round rings. The cache never respawns after collection.
  const packet=e.layout.embers.find(p=>p.id===fork.cacheId);
  if(packet&&!packet.collected&&!packet.carried){
   const cx=packet.x-distance,cy=packet.y;
   cacheGlyph(c,cx,cy,'#dfc58b',scale);
  }
 }
}
