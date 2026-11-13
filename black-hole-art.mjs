import {lightVisibility} from './light-field.mjs?v=responsive-menus-1';
// Pixel accretion and stolen-light trails. Cosmetics consume recorded drain;
// rendering never spends fuel or changes the simulation.
const TAU=Math.PI*2,MAX_MOTES=96;
const views=new WeakMap();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
function disc(c,x,y,r,ink,quantum=1){
 c.fillStyle=ink;r=Math.max(1,Math.round(r));
 for(let row=-r;row<=r;row+=quantum){const half=Math.floor(Math.sqrt(Math.max(0,r*r-row*row)));c.fillRect(Math.round(x-half),Math.round(y+row),half*2+1,quantum);}
}
function view(e){let v=views.get(e);if(!v){v={motes:[],credits:new Map(),lastTime:-Infinity,serial:0,height:e.height};views.set(e,v);}return v;}
function update(v,e){
 const now=e.time||0;if(v.height!==e.height){v.height=e.height;v.motes.length=0;}if(v.lastTime===now)return;
 if(now<v.lastTime){v.motes.length=0;v.credits.clear();}v.lastTime=now;
 for(let i=v.motes.length-1;i>=0;i--)if(now-v.motes[i].born>v.motes[i].life)v.motes.splice(i,1);
 for(const hole of e.blackHoles?.items||[]){
  let credit=v.credits.get(hole.id);if(!credit){credit={total:0,fraction:0};v.credits.set(hole.id,credit);}
  const delta=Math.max(0,(hole.drained||0)-credit.total);credit.total=hole.drained||0;
  if(!delta||e.dying||e.completing||e.alive===false||now-(hole.lastDrainAt??-Infinity)>.15)continue;
  credit.fraction+=delta*(e.reducedMotion?.22:1.8);
  const amount=Math.min(e.reducedMotion?2:20,Math.floor(credit.fraction));credit.fraction-=Math.floor(credit.fraction);
  for(let i=0;i<amount;i++){
   const seed=(++v.serial*.61803398875+(hole.seed||0)*.001)%1;
   const sx=hole.sourceX??e.distance+e.player.x,sy=hole.sourceY??e.player.y;
   const angle=Math.atan2(sy-hole.y,sx-hole.x),range=Math.hypot(sx-hole.x,sy-hole.y);
   const approach=clamp(range/(350+Math.min(80,hole.rate||0)*4),.15,.6),orbit=e.reducedMotion?.42:.65;
   if(v.motes.length>=MAX_MOTES)v.motes.shift();
   v.motes.push({born:now,life:approach+orbit,approach,orbit,sx,sy,hx:hole.x,hy:hole.y,
    radius:hole.coreRadius||16,range,angle,seed,quiet:!!e.reducedMotion});
  }
 }
}
function position(p,age,out){
 const radius=Math.min(p.range,p.radius*(2.55+p.seed*.5)),turn=.39+p.seed*.12;
 if(age<p.approach){
  const u=clamp(age/p.approach,0,1),t=u*u*(3-2*u);
  const a=p.angle+(p.quiet?0:TAU*turn*u*u),r=mix(p.range,radius,t);
  out.x=p.hx+Math.cos(a)*r;out.y=p.hy+Math.sin(a)*r*mix(1,.72,t);
 }else{
  const u=clamp((age-p.approach)/p.orbit,0,1),r=radius*(1-u)**1.4;
  const a=p.angle+(p.quiet?.55*u:TAU*(turn+(1+p.seed*.4)*u+3.8*u*u));
  out.x=p.hx+Math.cos(a)*r;out.y=p.hy+Math.sin(a)*r*.72;
 }
}
const point={x:0,y:0};
export function drawBlackHoles(c,e,{scale=1,distance=e.renderDistance??e.distance,playerY=e.renderPlayerY??e.player.y}={}){
 if(!e.blackHoles?.items?.length)return;
 const v=view(e);update(v,e);const now=e.time||0,t=e.reducedMotion?0:(e.visualTime??now),q=Math.max(1,Math.round(scale*1.5));
 c.save();c.globalCompositeOperation='source-over';
 for(const hole of e.blackHoles.items){
  const worldX=hole.x-distance;if(worldX<-100||worldX>e.width+100)continue;
  const x=worldX*scale,y=hole.y*scale,r=hole.coreRadius*scale;
  const proximity=clamp(1-(Math.abs(worldX-e.player.x)-90)/380,.15,1)*lightVisibility(e,e.getLightState?.()||{},worldX,hole.y,playerY);
  if(proximity<=0)continue;
  // Dark halo remains dark during a whole-scene reveal. Sparse red accretion
  // edges identify danger before its effective drain becomes strong.
  c.globalAlpha=.14*proximity;disc(c,x,y,r*3.2,'#020104',q);
  c.globalAlpha=.3*proximity;disc(c,x,y,r*2.2,'#070307',q);
  for(let ring=0;ring<2;ring++)for(let i=0;i<32;i++){
   const a=i/32*TAU+t*(ring?.8:-.5)+(hole.seed||0)*.003;
   if(Math.sin(a*2+ring)<-.2)continue;
   const rr=r*(ring?1.75:1.3),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*(ring?.58:.9);
   c.globalAlpha=proximity*(ring?.45:.72);c.fillStyle=ring?'#a45c68':'#d38a91';
   c.fillRect(Math.round(xx),Math.round(yy),q,q);
  }
 }
 for(const p of v.motes){
  const age=now-p.born;if(age<0||age>p.life)continue;
  const absorption=clamp((age-p.approach)/p.orbit,0,1);
  for(let tail=p.quiet?0:2;tail>=0;tail--){
   position(p,Math.max(0,age-tail*.023),point);
   const x=(point.x-distance)*scale,y=(point.y+(1-clamp(age/p.approach,0,1))*(playerY-e.player.y))*scale;
   if(x<-12||x>e.width*scale+12)continue;
   // Broad, stepped light fragments narrow into the funnel. No blur/filter or
   // per-frame sprite allocation; the dark core is painted over them last.
   const size=Math.max(q,Math.round(q*(p.quiet?3:5)*(1-absorption*.84)*(tail?.55:1)));
   const px=Math.round(x-size/2),py=Math.round(y-size/2),cut=Math.max(1,Math.round(size*.2));
   c.globalAlpha=(tail?.18:.86)*(1-absorption*.45);c.fillStyle=absorption>.55?'#e1a3a2':tail?'#a6bca7':'#f4edd0';
   if(size<=2){c.fillRect(px,py,size,size);continue;}
   c.fillRect(px+cut,py,size-cut*2,size);c.fillRect(px,py+cut,size,size-cut*2);
   if(!tail&&size>3){c.globalAlpha=.95*(1-absorption*.5);c.fillStyle='#fff8df';c.fillRect(px+cut,py+cut,Math.max(1,size-cut*2),Math.max(1,size-cut*2));}
  }
 }
 for(const hole of e.blackHoles.items){
  const x=(hole.x-distance)*scale;if(x<-100*scale||x>(e.width+100)*scale)continue;
  c.globalAlpha=1;disc(c,x,hole.y*scale,hole.coreRadius*scale,'#000000',q);
 }
 c.restore();
}
export function blackHoleArtStats(engine){const v=views.get(engine);return{motes:v?.motes.length||0,maximumMotes:MAX_MOTES};}
