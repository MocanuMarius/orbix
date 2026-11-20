import {WISP_ART} from './companion-art.mjs?v=batch-1';
import {rectBatch,rectsOn,identityTransform} from './rect-raster.mjs?v=batch-1';

const STEP=1/60,RASTER=240/390;
const INKS=['#9daaa0','#ccd6c6','#f0f1d8'];
export const WISP_WAKE_TUNING=Object.freeze({capacity:24,reducedCapacity:8,rate:16,reducedRate:6,
  lifeMin:.45,lifeMax:.60,reducedLifeMin:.34,reducedLifeMax:.43,liftCount:5,reducedLiftCount:2});
const sample=(serial,salt)=>{
  let n=Math.imul(serial+1,374761393)^Math.imul(salt+1,668265263);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967296;
};

// The engine owns a fixed pool. Births follow world seconds and the real path;
// painting only samples immutable birth records at the interpolated world time.
export class WispWake{
  constructor(){
    this.marks=Array.from({length:WISP_WAKE_TUNING.capacity},()=>({active:false,x:0,y:0,
      vx:0,vy:0,bornAt:0,life:0,size:1,ink:0,glint:false}));
    this.count=0;this.cursor=0;this.serial=0;this.births=0;this.reduced=false;
    this.nextAt=NaN;this.lastTime=NaN;this.lastX=NaN;this.lastY=NaN;
  }
  clear(){
    for(const mark of this.marks)mark.active=false;
    this.count=0;this.cursor=0;this.nextAt=NaN;this.lastTime=NaN;this.lastX=NaN;this.lastY=NaN;
  }
  prepare(e){
    const reduced=e.reducedMotion===true;
    if(reduced!==this.reduced){this.clear();this.reduced=reduced;}
    for(const mark of this.marks)if(mark.active&&e.time-mark.bornAt>mark.life+STEP){mark.active=false;this.count--;}
  }
  birth(x,y,time,tx,ty,lift=false){
    const t=WISP_WAKE_TUNING,reduced=this.reduced,cap=reduced?t.reducedCapacity:t.capacity;
    let slot=this.cursor;
    for(let n=0;n<cap;n++){const candidate=(this.cursor+n)%cap;if(!this.marks[candidate].active){slot=candidate;break;}}
    const mark=this.marks[slot],serial=this.serial++;
    if(!mark.active)this.count++;
    mark.active=true;mark.bornAt=time;
    mark.life=(reduced?t.reducedLifeMin:t.lifeMin)+sample(serial,1)*(reduced?t.reducedLifeMax-t.reducedLifeMin:t.lifeMax-t.lifeMin);
    const spread=(sample(serial,2)-.5)*(reduced?3:7),radius=WISP_ART.worldRadius;
    const rear=radius*(lift?1.17:.9);
    mark.x=x-tx*rear-ty*spread;
    mark.y=y-ty*rear+tx*spread;
    mark.vx=lift?-(12+sample(serial,3)*17):-(2+sample(serial,3)*4);
    mark.vy=lift?3+sample(serial,4)*11:(sample(serial,4)-.5)*(reduced?2:7);
    mark.size=!reduced&&sample(serial,5)>.76?2:1;
    mark.ink=serial%3;mark.glint=!reduced&&serial%7===0;
    this.cursor=(slot+1)%cap;this.births++;
  }
  update(e,dt){
    if(!(dt>0)||e.destroyed||e.paused||!e.running||e.finished||e.tutorialAwaitingLift)return;
    this.prepare(e);
    if(e.dying||e.completing||!e.alive){this.nextAt=NaN;return;}
    const x=e.distance+e.player.x,y=e.player.y;
    const px=(e.previousDistance??e.distance)+e.player.x,py=e.previousPlayerY??y;
    const dx=x-px,dy=y-py,length=Math.hypot(dx,dy),start=e.time-dt;
    if(Number.isFinite(this.lastTime)&&(start<this.lastTime-1e-6||Math.hypot(px-this.lastX,py-this.lastY)>80))this.clear();
    if(length>80){
      this.clear();this.lastTime=e.time;this.lastX=x;this.lastY=y;return;
    }
    this.lastTime=e.time;this.lastX=x;this.lastY=y;
    if(length<1e-6){this.nextAt=NaN;return;}
    if(!Number.isFinite(this.nextAt))this.nextAt=start;
    const interval=1/(this.reduced?WISP_WAKE_TUNING.reducedRate:WISP_WAKE_TUNING.rate);
    // A discontinuity starts locally; it can never backfill a long bridge.
    if(this.nextAt<start-interval)this.nextAt=start;
    for(let n=0;n<3&&this.nextAt<=e.time+1e-9;n++){
      const u=Math.max(0,Math.min(1,(this.nextAt-start)/dt));
      this.birth(px+dx*u,py+dy*u,this.nextAt,dx/length,dy/length);
      this.nextAt+=interval;
    }
  }
  lift(e){
    if(e.destroyed||e.paused||!e.running||e.finished||!e.alive||e.dying||e.completing)return;
    this.prepare(e);
    const count=this.reduced?WISP_WAKE_TUNING.reducedLiftCount:WISP_WAKE_TUNING.liftCount;
    // Input responds on the next paint, including inside time dilation. Start
    // at the displayed pose/clock instead of waiting a fixed world step.
    const hiddenReplay=e.dream?.preparing||e.time-(e.captureTime??e.time)>STEP*2;
    const time=hiddenReplay?e.time:(e.captureTime??e.time);
    const x=(hiddenReplay?e.distance:(e.renderDistance??e.distance))+e.player.x;
    const y=hiddenReplay?e.player.y:(e.renderPlayerY??e.player.y);
    for(let i=0;i<count;i++){
      const angle=.22+(i/(count-1||1))*.62;
      this.birth(x,y,time,Math.cos(angle),-Math.sin(angle),true);
    }
  }
}

export function drawWispWake(c,e,scale=1,rasterScale=scale/RASTER){
  const wake=e.wispWake;if(!wake||!wake.count||e.destroyed||e.finished)return;
  const time=e.captureTime??e.time,distance=e.renderDistance??e.distance;
  const opacity=e.dream?.mode==='record' ? .48 : 1;
  // Optional (?rects=1): one batch (rect-raster.mjs) for every mark; off by default (an extra canvas written per frame).
  const batch=rectsOn()&&identityTransform(c)?rectBatch(c.canvas?.ownerDocument,'wake'):null,g=batch?batch.begin(c.globalAlpha):c;
  c.save();
  for(const mark of wake.marks){
    if(!mark.active)continue;
    const age=time-mark.bornAt;if(age<0||age>=mark.life)continue;
    const fade=1-age/mark.life;
    g.globalAlpha=fade*.67*opacity;g.fillStyle=INKS[mark.ink];
    const x=Math.round((mark.x+mark.vx*age-distance)*scale),y=Math.round((mark.y+mark.vy*age)*scale);
    const pixel=rasterScale,size=mark.size*pixel;
    g.fillRect(Math.round(x-size*.5),Math.round(y-size*.5),size,size);
    if(mark.glint){
      g.globalAlpha=fade*.34*opacity;
      g.fillRect(Math.round(x-pixel),y,pixel*3,pixel);
      g.fillRect(x,Math.round(y-pixel),pixel,pixel*3);
    }
  }
  if(batch)batch.flush(c);
  c.restore();
}
