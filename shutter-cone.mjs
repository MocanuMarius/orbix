// A fixed projector on the roof or floor. Crossing close to its mount
// shortens the blackout; the wide part cuts across the open chamber.
const clamp01=n=>Math.max(0,Math.min(1,n));
const remainingLight=.05;

function wallAt(o,side,x){
 const shape=side<0?o.topShape:o.bottomShape;
 for(let i=3;i<shape.length;i++){
  const [ax,ay]=shape[i-1],[bx,by]=shape[i];
  if(x>=bx&&x<=ax)return o.center+side*o.gap*.5+ay+(by-ay)*(x-ax)/(bx-ax);
 }
 return o.center+side*o.gap*.5;
}

export function installShutters(layout,height){
 const boss=layout.boss;
 if(boss?.id!=='hollow-sun')return;
 boss.shutters=[];
 for(const phase of [2,3]){
  const quiet=layout.obstacles.filter(o=>o.bossPhase===phase&&o.cacheEligible&&!o.motion&&o.topShape&&o.bottomShape);
  const o=quiet[Math.floor((quiet.length-1)/2)];
  if(!o)continue;
  const side=phase===2?-1:1,localX=o.width*.64;
  const y=wallAt(o,side,localX),opposite=wallAt(o,-side,localX);
  const depth=Math.abs(opposite-y)+62*height/620;
  const x=o.x+localX;
  boss.shutters.push({x,y,side,depth,shift:76,spread:142,pocket:55*height/620,
    obstacleId:o.id,phase,warningX:x-100-boss.speed*3.5,openX:x-100-boss.speed*1.5});
 }
 // A chamber teaches a visibility choice without simultaneously draining the player.
 boss.attacks=boss.attacks.filter(a=>!boss.shutters.some(s=>a.x>=s.x-100-170*boss.scale&&a.x<=s.x+s.shift+s.spread+170*boss.scale));
}

export function resizeShutters(boss,factor){
 for(const s of boss.shutters||[]){s.y*=factor;s.depth*=factor;s.pocket*=factor;}
}

export function shutterPhase(s,playerX){
 if(playerX<s.warningX)return 0;
 if(playerX<s.openX)return 1;
 return 2;
}

export function insideShutter(s,x,y){
 const across=(s.y-y)*s.side/s.depth;
 return across>=0&&across<=1&&Math.abs(x-s.x-s.shift*across)<=s.spread*across;
}

export function shutterLightFactor(boss,x,y,playerX,playerY){
 if(!boss?.shutters)return 1;
 for(const s of boss.shutters){
  if(shutterPhase(s,playerX)!==2||!insideShutter(s,x,y))continue;
  if(!insideShutter(s,playerX,playerY))return remainingLight;
  const radius=Math.hypot(x-playerX,y-playerY)/s.pocket;
  return 1-(1-remainingLight)*clamp01((radius-.18)/.82);
 }
 return 1;
}

function conePath(c,s){
 c.beginPath();c.moveTo(s.x,s.y);
 c.lineTo(s.x+s.shift-s.spread,s.y-s.side*s.depth);
 c.lineTo(s.x+s.shift+s.spread,s.y-s.side*s.depth);
 c.closePath();
}

function drawProjector(c,s,phase,aim,size,quiet){
 c.save();c.translate(s.x,s.y);c.scale(size,-s.side*size);
 c.fillStyle='#393342';c.fillRect(-16,-8,32,8);
 c.fillStyle='#756b78';c.fillRect(-13,-6,26,3);
 c.rotate(-(.14+(phase===1?(1-aim)*.34:0)));
 const aperture=phase===1?2+aim*3:5;
 c.fillStyle='#322e39';
 c.beginPath();c.moveTo(-12,-4);c.lineTo(-10,7);c.lineTo(-4,12);
 c.lineTo(6,12);c.lineTo(11,6);c.lineTo(12,-4);c.closePath();c.fill();
 c.fillStyle='#b7a387';c.fillRect(-10,4,3,5);c.fillRect(6,5,3,4);
 c.fillStyle='#f0dcb5';c.fillRect(-aperture,9,2*aperture,2);
 if(phase===1&&!quiet){
  c.globalAlpha=.45+.45*aim;c.fillRect(-2,13,4,2+aim*4);
 }
 c.restore();
}

export function drawShutters(c,engine,{distance=engine.renderDistance??engine.distance,playerY=engine.renderPlayerY??engine.player.y,scale=1}={}){
 const boss=engine.layout?.boss;
 if(!boss?.shutters?.length)return;
 const playerX=distance+engine.player.x;
 for(const s of boss.shutters){
  if(s.x+s.shift+s.spread<distance||s.x+s.shift-s.spread>distance+engine.width)continue;
  const phase=shutterPhase(s,playerX);
  if(!phase)continue;
  const aim=clamp01((playerX-s.warningX)/(s.openX-s.warningX));
  c.save();c.scale(scale,scale);c.translate(-distance,0);
  c.globalAlpha=1;c.globalCompositeOperation='source-over';
  conePath(c,s);
  if(phase===2&&engine.dream?.mode!=='record'){
   c.fillStyle='rgba(0,0,0,.95)';
   if(insideShutter(s,playerX,playerY)){
    const gradient=c.createRadialGradient(playerX,playerY,0,playerX,playerY,s.pocket);
    gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(.18,'rgba(0,0,0,0)');
    gradient.addColorStop(1,'rgba(0,0,0,.95)');c.fillStyle=gradient;
   }
   c.fill();
  }
  // Only the warning marks fan out; the shadow itself is fixed.
  c.strokeStyle=phase===1?'#c1ab91':'#725d75';c.lineWidth=Math.max(1,boss.scale*1.5);
  c.globalAlpha=phase===1?.3+.48*aim:.36;
  for(const side of [-1,1]){
   const dx=s.shift+side*s.spread,dy=-s.side*s.depth;
   c.beginPath();
   const count=phase===1?Math.ceil(2+aim*6):8;
   for(let k=0;k<count;k++){
    const u=.09+k*.116,v=u+.041;
    c.moveTo(s.x+dx*u,s.y+dy*u);c.lineTo(s.x+dx*v,s.y+dy*v);
   }
   c.stroke();
  }
  c.globalAlpha=1;drawProjector(c,s,phase,aim,boss.scale,engine.reducedMotion);c.restore();
 }
}
