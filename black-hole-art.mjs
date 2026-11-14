import {lightVisibility} from './light-field.mjs?v=stream-and-dream-1';
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
  // Match angular velocity across the approach/orbit seam.
  const orbitSpeed=1+p.seed*.4;
  const rotation=turn*t+u*u*(u-1)*p.approach*orbitSpeed/p.orbit;
  const a=p.angle+(p.quiet?0:TAU*rotation),r=mix(p.range,radius,t);
  out.x=p.hx+Math.cos(a)*r;out.y=p.hy+Math.sin(a)*r*mix(1,.72,t);
 }else{
  const u=clamp((age-p.approach)/p.orbit,0,1),r=radius*(1-u*u*(2-u))**1.4;
  const a=p.angle+(p.quiet?.55*u*u:TAU*(turn+(1+p.seed*.4)*u+3.8*u*u));
  out.x=p.hx+Math.cos(a)*r;out.y=p.hy+Math.sin(a)*r*.72;
 }
}
const point={x:0,y:0},before={x:0,y:0},after={x:0,y:0};
// Siphoned light starts as a small clot at the wisp. Its leading material
// winds ahead faster than the trailing lobe until only a fine filament remains.
function drawSiphonMote(c,p,age,x,y,scale) {
 const approach=clamp(age/p.approach,0,1),swallowed=clamp((age-p.approach)/p.orbit,0,1);
 const strain=Math.min(1,approach*1.48),pull=strain*strain*(3-2*strain);
 const shrink=(1-swallowed)**.78;
 const material=(p.quiet?4:7.5+p.seed*2)*scale*shrink;
 const length=material*(1+pull*(p.quiet?.6:2.3));
 const width=material/(1+pull*(p.quiet?.4:1.35));
 // Use tangents on both sides. As the funnel tightens its tail actually
 // curls away from the head, rather than rotating a uniformly straight dash.
 const spread=p.quiet?.018:.028;
 position(p,Math.max(0,age-spread),before);
 position(p,Math.min(p.life,age+spread),after);
 let fx=after.x-point.x,fy=after.y-point.y,bx=point.x-before.x,by=point.y-before.y;
 const front=Math.hypot(fx,fy),back=Math.hypot(bx,by);
 if(front>.001){fx/=front;fy/=front;}else if(back>.001){fx=bx/back;fy=by/back;}else{fx=Math.cos(p.angle);fy=Math.sin(p.angle);}
 if(back>.001){bx/=back;by/=back;}else{bx=fx;by=fy;}
 const count=Math.max(4,Math.ceil(length)),ink=swallowed>.55?'#e1a3a2':'#f4edd0';
 const contraction=age*(p.quiet?4:13)+p.seed*TAU;
 for(let i=0;i<=count;i++){
  const u=i/count,along=(u-.5)*length;
  const dx=mix(bx,fx,u),dy=mix(by,fy,u);
  const px=x+dx*along,py=y+dy*along;
  // Cross-sections have a travelling constriction and uneven material
  // distribution. Rim and hot core narrow together.
  const section=Math.sqrt(Math.max(0,4*u*(1-u)));
  const taper=1+pull*(.24*(2*u-1)+.16*Math.sin(contraction-TAU*u));
  const pixels=Math.max(1,Math.round(width*section*taper));
  c.fillStyle=ink;
  c.fillRect(Math.round(px-(pixels-1)*.5),Math.round(py-(pixels-1)*.5),pixels,pixels);
  if(pixels>1&&u>.22&&u<.92){
   c.fillStyle='#fff7df';
   const core=Math.max(1,Math.round(pixels*.32));
   c.fillRect(Math.round(px-(core-1)*.5),Math.round(py-(core-1)*.5),core,core);
  }
 }
}
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
  // Bounded cosmetic Hawking-like rim emission: outward blue-white pixels,
  // distinct from the larger stolen-light fragments spiralling inward.
  for(let i=0;i<(e.reducedMotion?4:12);i++){
   const age=(t*.55+i*.61803398875)%1,angle=i*2.39996+(hole.seed||0)*.01;
   const rr=r*(1.05+age*2.6),px=x+Math.cos(angle)*rr,py=y+Math.sin(angle)*rr;
   c.globalAlpha=proximity*Math.sin(age*Math.PI)*.48;c.fillStyle=i%3?'#adcadd':'#e8f4ed';
   c.fillRect(Math.round(px),Math.round(py),q,q);
  }
  for(let ring=0;ring<2;ring++)for(let i=0;i<32;i++){
   const a=i/32*TAU+t*(ring?.8:-.5)+(hole.seed||0)*.003;
   if(Math.sin(a*2+ring)<-.2)continue;
   const rr=r*(ring?1.75:1.3),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr*(ring?.58:.9);
   c.globalAlpha=proximity*(ring?.45:.72);c.fillStyle=ring?'#a45c68':'#d38a91';
   c.fillRect(Math.round(xx),Math.round(yy),q,q);
  }
 }
 for(const p of v.motes){
  const age=(e.captureTime??e.visualTime??now)-p.born;
  if(age<0||age>p.life)continue;
  const absorption=clamp((age-p.approach)/p.orbit,0,1);
  position(p,age,point);
  const x=(point.x-distance)*scale,offset=(1-clamp(age/p.approach,0,1))*(playerY-e.player.y);
  if(x<-36||x>e.width*scale+36)continue;
  c.globalAlpha=.87*(1-absorption*.45);
  drawSiphonMote(c,p,age,x,(point.y+offset)*scale,scale);
 }
 for(const hole of e.blackHoles.items){
  const x=(hole.x-distance)*scale;if(x<-100*scale||x>(e.width+100)*scale)continue;
  c.globalAlpha=1;disc(c,x,hole.y*scale,hole.coreRadius*scale,'#000000',q);
 }
 c.restore();
}
export function blackHoleArtStats(engine){const v=views.get(engine);return{motes:v?.motes.length||0,maximumMotes:MAX_MOTES};}
