import {iceShardPoints,ICE_GUIDE_FACETS} from './guardian-geometry.mjs?v=guardian-currents-1';

// Draw in world units inside the same camera transform for the pixel buffer and canvas fallback.
const TAU=Math.PI*2;
const clamp01=n=>Math.max(0,Math.min(1,n));
const wrap=n=>n-Math.floor(n);

function stroke(c,ink,width){
 c.strokeStyle=ink;
 c.lineWidth=width;
 c.stroke();
}

// A stream narrows toward its mouth and fans into the pocket. Every bright
// filament remains inside the ellipse that actually exerts force.
function windX(lane,p,phase){
 const edge=Math.sqrt(Math.max(0,1-(p*2-1)**2));
 return edge*(lane*.85+.072*Math.sin(p*7+phase+lane*3));
}

function drawStorm(c,a,playerX,playerY,t,s,alpha,reduced){
 const z=a.stormZone;
 if(!z)return;
 const {x,y,rx,ry,direction}=z;
 c.save();
 c.translate(x,y);
 c.globalAlpha=alpha*.14;
 c.fillStyle='#6694b0';
 c.beginPath();c.ellipse(0,0,rx,ry,0,0,TAU);c.fill();
 const phase=t*1.7+a.index;
 for(let lane=-1;lane<=1;lane+=2){
  c.beginPath();
  for(let i=0;i<=18;i++){
   const p=.03+i*.94/18;
   const px=windX(lane,p,phase)*rx;
   const py=direction*(p*2-1)*ry;
   if(i===0)c.moveTo(px,py);else c.lineTo(px,py);
  }
  c.globalAlpha=.38*alpha;
  stroke(c,'#aac8e3',2*s);
 }
 const lines=reduced?8:17;
 for(let i=0;i<lines;i++){
  const lane=(i%7-3)/3,p=.045+wrap(t*.8+(i*.618)+a.index*.21)*.89;
  const end=Math.min(.98,p+.045+(1-Math.abs(lane))*.08);
  const mid=(p+end)/2;
  const tx=windX(lane,end,phase)*rx,ty=direction*(end*2-1)*ry;
  c.beginPath();
  c.moveTo(windX(lane,p,phase)*rx,direction*(p*2-1)*ry);
  c.quadraticCurveTo(windX(lane,mid,phase)*rx,direction*(mid*2-1)*ry,tx,ty);
  c.globalAlpha=alpha*(.39+.44*(1-Math.abs(lane)));
  stroke(c,i%3?'#9ed4e1':'#f1e4bd',i%3?2*s:3*s);
  // Feathered heads are readable even with reduced motion.
  if(i%4===0){
   c.beginPath();c.moveTo(tx-4*s,ty-direction*6*s);c.lineTo(tx,ty);
   c.lineTo(tx+4*s,ty-direction*6*s);c.stroke();
  }
 }
 const mouthY=-direction*ry*.86;
 c.globalAlpha=.9*alpha;
 c.strokeStyle='#bbd5df';c.lineWidth=2*s;
 for(let i=0;i<2;i++){
  c.beginPath();
  c.ellipse(0,mouthY+direction*i*4*s,(.19+i*.07)*rx,(3+i)*s,0,.08*Math.PI,1.97*Math.PI);
  c.stroke();
 }
 c.restore();
 if(!a.stormContact)return;
 c.save();c.translate(playerX,playerY);
 for(let i=0;i<5;i++){
  const p=wrap(t*2.2+i/5),side=i%2?1:-1;
  const dx=side*(9+p*12)*s,dy=direction*(5+p*16)*s;
  c.globalAlpha=alpha*(1-p)*(.46+.50*(a.stormStrength||0));
  c.beginPath();c.moveTo(dx,dy);c.lineTo(dx+side*2*s,dy+direction*(3+p*5)*s);
  stroke(c,'#d5eff6',2*s);
 }
 c.restore();
}

function drawIce(c,a,t,s,alpha){
 if(a.spent||!Number.isFinite(a.iceOrigin)||!Number.isFinite(a.iceEnd))return;
 const direction=-a.side;
 const y=a.iceActive?a.iceY:a.iceOrigin;
 if(!Number.isFinite(y)||(!a.iceActive&&a.iceProgress>=1))return;
 c.save();
 c.translate(a.x,a.iceOrigin);
 c.scale(s,s*direction);
 const travel=(a.iceEnd-a.iceOrigin)*direction/s;
 if(!a.iceActive){
  c.globalAlpha=.52*alpha;
  c.beginPath();c.moveTo(-18,-8);c.lineTo(-9,-5);c.lineTo(-13,-1);c.lineTo(-4,2);
  c.moveTo(18,-6);c.lineTo(9,-3);c.lineTo(11,0);c.lineTo(3,3);
  stroke(c,'#c7edff',2);
 }
 const glint=a.iceActive?.62:.66+.17*Math.sin(t*4);
 for(const fraction of ICE_GUIDE_FACETS){
  if(fraction<a.iceProgress)continue;
  c.globalAlpha=alpha*glint*(1-.28*fraction);
  if(fraction===1){
   c.beginPath();c.moveTo(-5,travel-6);c.lineTo(0,travel);c.lineTo(5,travel-6);
   stroke(c,'#b4deec',2);
  } else {
   c.fillStyle='#b2dceb';c.fillRect(-1,travel*fraction,2,4);
  }
 }
 c.restore();
 c.save();c.translate(a.x,y);
 c.globalAlpha=alpha;
 const shard=a.icePoints||iceShardPoints(a,s);
 c.beginPath();
 for(let i=0;i<shard.length;i++){
  const [x,y]=shard[i];
  if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
 }
 c.closePath();c.fillStyle='#6ea3be';c.fill();
 c.save();c.clip();c.scale(s,s*direction);
 c.beginPath();c.moveTo(-8,-11);c.lineTo(-1,-15);c.lineTo(2,-7);c.lineTo(0,14);
 c.lineTo(-5,4);c.closePath();c.fillStyle='#d1f1f4';c.fill();
 c.fillStyle='#f0ffff';c.fillRect(-4,-11,3,8);
 c.restore();c.scale(s,s*direction);
 if(a.iceActive){
  for(let i=0;i<7;i++){
   const p=wrap(t*2+i*.318);
   c.globalAlpha=alpha*(1-p)*.8;
   c.fillRect((i%2?1:-1)*(4+p*9),-14-p*19,2,3);
  }
 }
 c.restore();
}

function drawRoots(c,engine,a,t,s,alpha){
 const o=a.obstacle;
 const center=engine.obstacleCenter(o);
 for(const side of [-1,1]){
  const shape=side===1?o.bottomShape:o.topShape;
  if(!shape)continue;
  const base=center+side*o.gap/2;
  let last=-1;
  c.beginPath();
  for(let i=2;i<shape.length;i++){
   const [px,py]=shape[i],worldX=o.x+px;
   if(Math.abs(worldX-a.x)>o.width*.75)continue;
   if(last<0)c.moveTo(worldX,base+py+side*5*s);else c.lineTo(worldX,base+py+side*5*s);
   last=i;
  }
  if(last<0)continue;
  c.globalAlpha=.82*alpha;stroke(c,'#5b4d38',10*s);
  for(let i=3;i<=last;i++){
   const [px,py]=shape[i],[qx,qy]=shape[i-1];
   if(Math.abs(o.x+px-a.x)>o.width*.75||Math.abs(o.x+qx-a.x)>o.width*.75)continue;
   c.globalAlpha=alpha*(.45+.4*(.5+.5*Math.sin(t*2-i*.17)));
   c.beginPath();c.moveTo(o.x+qx,base+qy+side*2*s);c.lineTo(o.x+px,base+py+side*2*s);
   stroke(c,'#c3d590',2.5*s);
   if(i%6===0){
    const x=o.x+px,y=base+py;
    c.beginPath();c.moveTo(x,y+side*3*s);c.lineTo(x+5*s,y+side*11*s);
    c.lineTo(x+12*s,y+side*15*s);c.moveTo(x+5*s,y+side*11*s);
    c.lineTo(x+2*s,y+side*17*s);stroke(c,'#9d9f63',2.5*s);
   }
  }
 }
}

function drawWell(c,a,playerX,playerY,t,s,alpha){
 const x=a.x,y=a.wellY;
 if(!Number.isFinite(y))return;
 const r=16*s;
 c.globalAlpha=.14*alpha;
 c.fillStyle='#311f3a';c.beginPath();c.arc(x,y,60*s,0,TAU);c.fill();
 for(let i=0;i<17;i++){
  const p=wrap(t*.34+i/17);
  const angle=i*2.4+p*p*6.2+t*.23;
  const d=(19+(1-p)**2*44)*s;
  c.globalAlpha=alpha*(.23+p*.67);
  c.fillStyle=i%3?'#b18bac':'#e1bfd6';
  c.fillRect(x+Math.cos(angle)*d,y+Math.sin(angle)*d*.75,2.8*s,2*s);
 }
 c.globalAlpha=alpha;c.fillStyle='#040207';c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
 c.beginPath();c.ellipse(x,y,r*1.3,r*.8,-.2,.08,Math.PI*.92);stroke(c,'#d0a1c5',2.4*s);
 if(!a.draining)return;
 const dx=playerX-x,dy=playerY-y,dist=Math.hypot(dx,dy);
 const turn=Math.atan2(dy,dx);
 for(let i=0;i<8;i++){
  const p=wrap(t*.74+i/8),w=p*p;
  const rad=dist*(1-p)+r*p,angle=turn+w*(1+p)*2.5;
  c.globalAlpha=alpha*(.36+.55*Math.sin(Math.PI*p));
  c.fillStyle=i%3?'#e0d8cd':'#a674a0';
  c.fillRect(x+Math.cos(angle)*rad,y+Math.sin(angle)*rad,(5-p*3)*s,(4-p*2)*s);
 }
}

export function drawGuardianWarnings(c,{engine,distance=engine.distance,scale=1,time=engine.visualTime??engine.time}){
 const boss=engine.layout?.boss;
 if(!boss?.attacks?.length)return;
 const ahead=Math.max(1,boss.speed)*2.85,playerX=distance+engine.player.x,playerY=engine.renderPlayerY??engine.player.y,s=boss.scale;
 const t=engine.reducedMotion?0:time;
 c.save();c.scale(scale,scale);c.translate(-distance,0);
 for(const a of boss.attacks){
  const width=a.stormZone?.rx??(boss.id==='rootbound-heart'?a.obstacle.width*.75:boss.id==='hollow-sun'?65*s:17*s);
  const dx=a.x-playerX;
  if(a.x+width<distance||a.x-width>distance+engine.width||dx-width>ahead)continue;
  const alpha=clamp01((ahead-dx+width)/Math.max(1,boss.speed*.55));
  if(boss.id==='storm-shepherd')drawStorm(c,a,playerX,playerY,t,s,alpha,engine.reducedMotion);
  else if(boss.id==='frost-matron')drawIce(c,a,t,s,alpha);
  else if(boss.id==='rootbound-heart')drawRoots(c,engine,a,t,s,alpha);
  else if(boss.id==='hollow-sun')drawWell(c,a,playerX,playerY,t,s,alpha);
 }
 c.restore();
}
