import {lightVisibility,renderLightState} from './light-field.mjs?v=forge-1';
import {drawBlackHoleWarning} from './black-hole-warning.mjs?v=forge-1';
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
  const cap=e.reducedMotion?2:hole.giant?Math.min(8,Math.max(0,40-v.motes.length)):20;
  const amount=Math.min(cap,Math.floor(credit.fraction));credit.fraction-=Math.floor(credit.fraction);
  for(let i=0;i<amount;i++){
   const seed=(++v.serial*.61803398875+(hole.seed||0)*.001)%1;
   const sx=hole.sourceX??e.distance+e.player.x,sy=hole.sourceY??e.player.y;
   const angle=Math.atan2(sy-hole.y,sx-hole.x),range=Math.hypot(sx-hole.x,sy-hole.y);
   const approach=hole.giant?clamp((range-hole.coreRadius)/300,.20,.68)
     :clamp(range/(350+Math.min(80,hole.rate||0)*4),.15,.6);
   const orbit=hole.giant?.45:e.reducedMotion?.42:.65;
   if(v.motes.length>=MAX_MOTES)v.motes.shift();
   v.motes.push({born:now,life:approach+orbit,approach,orbit,sx,sy,hx:hole.x,hy:hole.y,
    radius:hole.coreRadius||16,range,angle,seed,giant:hole.giant,quiet:!!e.reducedMotion});
  }
 }
}
function position(p,age,out){
 if(p.giant){
  // A deep exterior source disappears at the event horizon. Spiral into
  // the visible near rim rather than circling the offscreen centre.
  const u=clamp(age/p.life,0,1),fall=u*u*(2-u);
  const radius=mix(p.range,Math.min(p.range,p.radius*.85),fall);
  const spin=Math.sin(p.seed*21)>0?1:-1;
  const angle=p.angle+spin*(p.quiet?.12:.54+p.seed*.34)*fall;
  out.x=p.hx+Math.cos(angle)*radius;out.y=p.hy+Math.sin(angle)*radius;
  return;
 }
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
// Keep an inclined, luminous disk around the cold core. Draw a continuous
// band on the pixel grid, with brighter clumps travelling along its rim.
function accretionDisk(ctx,x,y,r,visibility,time,seed){
 const a=r*2.72, b=r*.53, slope=-.24, thickness=Math.max(1,r*.17);
 const pixel=Math.max(1,Math.round(r/18));
 const span=Math.ceil(a/pixel);
 const peak=Math.min(1,Math.sqrt(visibility)*1.18);
 for(let i=-span;i<=span;i++){
  const dx=i*pixel, normalized=dx/a;
  if(Math.abs(normalized)>1)continue;
  const curve=Math.sqrt(1-normalized*normalized);
  const screenX=Math.round(x+dx),middle=y+dx*slope;
  for(const side of [-1,1]){
   const yy=Math.round(middle+side*b*curve);
   const angle=Math.atan2(side*curve,normalized);
   const knot=.5+.5*Math.cos(angle*4-time*1.7+seed*.025);
   const hot=(.6+.4*knot*knot)*(side>0?1:.79);
   ctx.globalAlpha=peak*(.22+.13*hot);ctx.fillStyle='#f57b56';
   ctx.fillRect(screenX,Math.round(yy-thickness*1.7),pixel,Math.ceil(thickness*3.4));
   ctx.globalAlpha=peak*(.73+.22*hot);ctx.fillStyle='#ff9a70';
   ctx.fillRect(screenX,Math.round(yy-thickness*.62),pixel,Math.max(1,Math.ceil(thickness*1.25)));
   ctx.globalAlpha=peak*hot;ctx.fillStyle='#fff0c7';
   ctx.fillRect(screenX,yy,pixel,pixel);
  }
 }
}

// Shaft, inner throat and bent light paths of one finite accretion sheet.
// Only its part facing open sky is exposed; the hole is anchored beyond the
// screen edge. All work uses the visible viewport, with no giant sprite atlas.
const giantDiskReach=2.62;
const giantBands=[
 {a:2.50,b:.46,lean:.22,weight:.28,ink:'#a44c62',width:.066,rate:.41},
 {a:2.37,b:.53,lean:.19,weight:.72,ink:'#cc765b',width:.032,rate:.57},
 {a:2.25,b:.47,lean:.22,weight:.83,ink:'#f1a16c',width:.022,rate:.74},
 {a:2.18,b:.50,lean:.24,weight:.88,ink:'#ffdcad',width:.011,rate:.83},
 {a:1.97,b:.57,lean:.19,weight:.49,ink:'#dc8e78',width:.021,rate:.91},
 {a:1.67,b:.81,lean:.12,weight:.58,ink:'#f2ab79',width:.022,rate:.63}
];
const lensedRings=[
 [1.195,'#735576',.29,.030], [1.13,'#b87b79',.43,.025],
 [1.069,'#f6a974',.66,.021], [1.027,'#ffe7b2',.89,.021], [1.009,'#f8eee1',.72,.010]
];
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function giantExposure(e,hole,light,x,playerY){
 const r=hole.coreRadius, inward=hole.edge===1?-1:1;
 const nx=clamp((e.player.x-x)/r,-.94,.94);
 const rimX=x+nx*r, rimY=hole.y+inward*r*Math.sqrt(1-nx*nx);
 const face=lightVisibility(e,light,clamp(rimX,0,e.width),clamp(rimY,0,e.height),playerY);
 const lobeX=x-Math.sign(x-e.player.x)*r*1.84,lobeY=hole.y+inward*r*.72;
 const wing=lightVisibility(e,light,clamp(lobeX,0,e.width),clamp(lobeY,0,e.height),playerY);
 const separation=Math.hypot(x-e.player.x,hole.y-playerY);
 const reach=hole.influence||r*3.54;
 const selfLight=smooth((reach*1.82-separation)/reach);
 return Math.min(1,.68*selfLight+.78*Math.sqrt(Math.max(face,wing)));
}

function drawGiantDisk(c,x,y,r,inward,exposure,t,seed,width,height){
 const extent=r*giantDiskReach;
 const left=Math.max(0,Math.floor(x-extent)),right=Math.min(width,Math.ceil(x+extent));
 if(right<=left||exposure<=.002)return;
 c.save();
 const halo=c.createRadialGradient(x,y,r*.91,x,y,r*1.55);
 halo.addColorStop(0,'rgba(54,34,40,0)');
 halo.addColorStop(.17,'rgba(210,108,69,.43)');
 halo.addColorStop(.32,'rgba(135,73,68,.24)');
 halo.addColorStop(.64,'rgba(84,55,89,.13)');
 halo.addColorStop(1,'rgba(56,44,84,0)');
 c.globalAlpha=exposure;c.fillStyle=halo;
 c.fillRect(left,Math.max(0,y-extent),right-left,Math.max(0,Math.min(y+extent,height)-Math.max(0,y-extent)));

 // A broad, optically thin dust bed sits below the hotter lanes. Its
 // approaching wing glows while the receding side sinks into shadow.
 const dust=c.createLinearGradient(x-r*2.5,0,x+r*2.5,0);
 dust.addColorStop(0,'rgba(112,57,85,0)');dust.addColorStop(.12,'rgba(138,68,73,.48)');
 dust.addColorStop(.27,'rgba(196,104,64,.58)');dust.addColorStop(.55,'rgba(142,71,69,.48)');
 dust.addColorStop(.82,'rgba(113,60,86,.30)');dust.addColorStop(1,'rgba(77,53,83,0)');
 c.fillStyle=dust;c.globalAlpha=exposure;
 for(let side=-1;side<=1;side+=2){
  const from=Math.max(left,x-r*2.5),to=Math.min(right,x+r*2.5);
  if(to<=from)continue;
  c.beginPath();
  for(let pass=0;pass<2;pass++){
   for(let i=0;i<=72;i++){
    const f=(pass?72-i:i)/72,px=from+(to-from)*f,u=(px-x)/(r*2.5);
    const edge=Math.sqrt(Math.max(0,1-u*u));
    const material=edge*(.07+.022*Math.cos(13*u-t*.45+seed));
    const py=y+inward*r*(-u*.56+side*edge*.52+(pass?-1:1)*material);
    if(pass===0&&i===0)c.moveTo(px,py);else c.lineTo(px,py);
   }
  }
  c.closePath();c.fill();
 }

 // Low-inclination dirt lanes, with a hot approaching wing. Continuous
 // traces break up in brightness and thickness as material orbits.
 for(const band of giantBands){
  const span=r*band.a,from=Math.max(left,x-span),to=Math.min(right,x+span);
  if(to<=from)continue;
  const step=Math.max(1,(to-from)/145);
  c.strokeStyle=band.ink;c.lineWidth=Math.max(.8,r*band.width);c.lineCap='round';
  for(let side=-1;side<=1;side+=2){
   let previousX=from,previousY=0,portion=-1,drawing=false;
   for(let px=from; ;px=Math.min(to,px+step)){
    const u=clamp((px-x)/span,-1,1),corr=Math.sqrt(1-u*u);
    const phase=Math.atan2(corr*side,u);
    const ripple=(.014*Math.sin(phase*8+t*band.rate+seed)
      +.006*Math.sin(phase*21-t*.73+seed))*corr;
    const py=y+inward*r*(-u*band.lean*band.a+side*band.b*corr+ripple);
    if(px!==from && Math.max(previousY,py)>=-r*.05 && Math.min(previousY,py)<=height+r*.05){
     const segment=Math.floor((u+1)*5);
     if(!drawing||portion!==segment){
      if(drawing)c.stroke();
      const hot=.65+.35*Math.cos(phase*3-t*band.rate+seed)**2;
      c.globalAlpha=exposure*band.weight*hot*(side>0?1:.48)*(.73-.24*u);
      portion=segment;drawing=true;
      c.beginPath();c.moveTo(previousX,previousY);
     }
     c.lineTo(px,py);
    }else if(drawing){
     c.stroke();drawing=false;
    }
    previousX=px;previousY=py;
    if(px>=to)break;
   }
   if(drawing)c.stroke();
  }
 }
 // Antipodal light folds over the black face as a bright, rim-hugging arc.
 // Draw sky-facing horizons with lensing at the sides. The core itself is
 // drawn in the final pass so travelling ribbons are truly swallowed.
 c.lineCap='round';
 for(let i=0;i<5;i++){
  const [lens,ink,opacity,thickness]=lensedRings[i];
  c.strokeStyle=ink;c.lineWidth=Math.max(.72,r*thickness);
  c.beginPath();
  for(let n=0;n<=110;n++){
   const a=.03+(Math.PI-.06)*n/110;
   const ca=Math.cos(a),sa=Math.sin(a);
   const radial=r*(lens+.0045*Math.sin(7*a+t*.39+seed)*(1-i/5));
   const px=x+ca*radial,py=y+inward*sa*radial;
   if(n===0)c.moveTo(px,py);else c.lineTo(px,py);
  }
  c.globalAlpha=exposure*opacity;c.stroke();
 }
 // Hawking-like sparks originate on the accessible near hemisphere. The
 // tiny cool ejections are visually distinct from inward-moving hot gas.
 c.fillStyle='#c2dbef';
 const still=t===0;
 for(let i=0;i<(still?8:22);i++){
  const age=(t*.38+i*.61803)%1, a=(.12+.76*((i*.38197+seed*.11)%1))*Math.PI;
  const radial=r*(1.045+.46*age*age);
  const px=x+Math.cos(a)*radial,py=y+inward*Math.sin(a)*radial;
  if(px<0||px>width||py<0||py>height)continue;
  c.globalAlpha=exposure*(still?.32:Math.sin(age*Math.PI)*.52);
  c.fillRect(Math.round(px),Math.round(py),1+(i%7===0?1:0),1);
 }
 c.restore();
}
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
 const light=renderLightState(e);
 c.save();c.globalCompositeOperation='source-over';
 for(const hole of e.blackHoles.items){
  const worldX=hole.x-distance,extent=hole.giant?hole.coreRadius*giantDiskReach:100;
  if(worldX< -extent||worldX>e.width+extent)continue;
  drawBlackHoleWarning(c,e,hole,light,distance,playerY,t,scale);
  const x=worldX*scale,y=hole.y*scale,r=hole.coreRadius*scale;
  if(hole.giant){
   drawGiantDisk(c,x,y,r,hole.edge===1?-1:1,giantExposure(e,hole,light,worldX,playerY),
    t,(hole.seed>>>0)%7919*.001,e.width*scale,e.height*scale);
   continue;
  }
  const proximity=clamp(1-(Math.abs(worldX-e.player.x)-90)/380,.15,1)*lightVisibility(e,light,worldX,hole.y,playerY);
  if(proximity<=0)continue;
  // A dark halo separates the bright disk from the surrounding scenery.
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
  accretionDisk(c,x,y,r,proximity,t,hole.seed||0);
 }
 for(const p of v.motes){
  const age=(e.captureTime??e.visualTime??now)-p.born;
  if(age<0||age>p.life)continue;
  const absorption=clamp((age-p.approach)/p.orbit,0,1);
  position(p,age,point);
  const x=(point.x-distance)*scale,offset=(1-clamp(age/p.approach,0,1))*(playerY-e.player.y);
  const y=(point.y+offset)*scale;
  if(x<-36||x>e.width*scale+36||y< -36||y>e.height*scale+36)continue;
  c.globalAlpha=.87*(1-absorption*.45);
  drawSiphonMote(c,p,age,x,y,scale);
 }
 for(const hole of e.blackHoles.items){
  const x=(hole.x-distance)*scale;
  if(hole.giant){
   const r=hole.coreRadius*scale,y=hole.y*scale;
   if(x+r>=0&&x-r<=e.width*scale&&y+r>=0&&y-r<=e.height*scale){
    c.globalAlpha=1;c.fillStyle='#000000';c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
   }
   continue;
  }
  if(x<-100*scale||x>(e.width+100)*scale)continue;
  c.globalAlpha=1;disc(c,x,hole.y*scale,hole.coreRadius*scale,'#000000',q);
 }
 c.restore();
}
export function blackHoleArtStats(engine){const v=views.get(engine);return{motes:v?.motes.length||0,maximumMotes:MAX_MOTES};}
