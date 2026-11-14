// Guardian attacks occupy only part of generous rooms; distant attacks do no work.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function prepareGuardian(layout,height,speed){
 const id=layout.boss.id;
 if(['moonweaver','hollow-warden'].includes(id))return layout;
 for(const spark of layout.embers){const o=layout.obstacles.find(o=>o.id===spark.anchor);if(o){spark.y=o.center;spark.pocket=false;spark.pocketSide=null;spark.feature='guardian-respite';delete o.cachePocket;}}
 layout.boss.attacks=layout.obstacles.filter(o=>!o.cacheEligible).filter((o,i)=>layout.boss.difficulty>1||i%2===0||o.bossPhase===2).map((o,i)=>({x:o.x+o.width*.65,y:o.center-height*.12,center:o.center,baseGap:o.gap,side:o.bossPhase===1?-1:(i%2?1:-1),obstacle:o,index:i,trigger:null,spent:false}));
 layout.boss.scale=height/620;layout.boss.speed=speed;
 return layout;
}
export function guardianWellDrain(distance,scale=1){return Math.min(14,18000/((distance/scale)**2+900))*Math.max(0,1-(distance/(210*scale))**4);}
export function updateGuardian(engine,dt){
 const boss=engine.layout?.boss;if(!boss?.attacks)return;
 const x=engine.distance+engine.player.x, s=boss.scale, now=engine.time;
 for(const a of boss.attacks){
  const dx=a.x-x;if(dx < -320 || dx > 640)continue;
  if(a.trigger===null && dx<boss.speed*2.6)a.trigger=now;
  const age=a.trigger===null?-1:now-a.trigger;a.age=age;
  const finale=a.obstacle.bossPhase===2;
  if(boss.id==='rootbound-heart'){
   // A continuous rhythm, never narrower than a generous 150-reference-pixel passage.
   const wave=(1-Math.cos(now*1.25+a.index*.7))/2;
   a.obstacle.gap=a.baseGap-(a.baseGap-(finale?210:220)*s)*wave;
  }else if(boss.id==='frost-matron'){
   a.iceY=a.center+a.side*a.baseGap/2-a.side*Math.max(0,age-2.2)*110*s;
   const active=age>=2.2&&a.side*(a.iceY-a.center)>-8*s;
   if(active&&!a.spent&&Math.hypot(dx,engine.player.y-a.iceY)<engine.player.radius+17*s){a.spent=true;engine.hit(null);}
  }else if(boss.id==='storm-shepherd'){
   const strength=Math.max(0,1-Math.abs(dx)/(150*s));
   const vertical=Math.max(0,1-Math.abs(engine.player.y-a.center)/(190*s));
   engine.player.vy+=(a.index%2?1:-1)*150*s*(finale?1.2:1)*strength*vertical*dt*(engine.boostTime>0?.4:1);
  }else if(boss.id==='hollow-sun'){
   a.wellY=a.center+a.side*70*s+Math.sin(now*.8+a.index)*24*s;
   const distance=Math.hypot(dx,engine.player.y-a.wellY);
   if(distance<210*s){engine.spendGlow(Math.max(0,guardianWellDrain(distance,s))*dt);a.draining=true;}else a.draining=false;
  }
 }
}
export function drawGuardian(c,{engine,width,height,distance,time,scale,pass}){
 const boss=engine.layout.boss,s=boss.scale,k=scale;
 const colors={'frost-matron':'#a9e6f0','rootbound-heart':'#a0c580','storm-shepherd':'#c4b3ed','hollow-sun':'#c68fb9'};
 const color=colors[boss.id];c.save();c.strokeStyle=color;c.lineWidth=Math.max(1,2*k);
 if(pass==='silhouette'){
  c.globalAlpha=.32;c.fillStyle=color;const x=width*.78,y=height*.18,r=32*k;
  c.beginPath();
  if(boss.id==='frost-matron'){c.moveTo(x-r,y+r);c.lineTo(x-r*.7,y-r);c.lineTo(x,y-r*.3);c.lineTo(x+r*.7,y-r);c.lineTo(x+r,y+r);}
  else if(boss.id==='rootbound-heart'){c.moveTo(x,y+r);c.bezierCurveTo(x-r*2,y-r*.3,x-r,y-r*1.5,x,y-r*.5);c.bezierCurveTo(x+r,y-r*1.5,x+r*2,y-r*.3,x,y+r);}
  else if(boss.id==='storm-shepherd'){c.moveTo(x-r,y-r);c.lineTo(x+r,y-r);c.lineTo(x+r*.3,y);c.lineTo(x+r,y);c.lineTo(x-r*.6,y+r*1.4);c.lineTo(x-r*.2,y);c.lineTo(x-r,y);}
  else c.arc(x,y,r,0,Math.PI*2);c.fill();c.fillStyle='#091315';
  if(boss.id==='hollow-sun'){c.beginPath();c.arc(x,y,r*.7,0,Math.PI*2);c.fill();}else c.fillRect(x-r*.7,y-r*.4,r*1.4,r*.25);
  c.restore();return;
 }
 // Warnings are repeated by drawGuardianWarnings above the lighting overlay.
 drawGuardianWarnings(c,{engine,distance,scale});c.restore();
}
export function drawGuardianWarnings(c,{engine,distance=engine.distance,scale=1}){
 const boss=engine.layout?.boss;if(!boss?.attacks)return;
 const s=boss.scale,k=scale,t=engine.time;c.save();c.lineWidth=Math.max(1,2*k);
 for(const a of boss.attacks){
  const x=(a.x-distance)*k;if(x < -60 || x>engine.width*k+60)continue;
  const y=a.center*k,age=a.age??-1;
  if(boss.id==='frost-matron'){
   if(age<2.2){c.strokeStyle='#ccefff';c.globalAlpha=.5+.3*Math.sin(t*8);c.setLineDash([3*k,7*k]);c.beginPath();c.moveTo(x,(a.center+a.side*a.baseGap/2)*k);c.lineTo(x,y);c.stroke();c.setLineDash([]);}
   else if(!a.spent&&a.side*(a.iceY-a.center)>-8*s){c.globalAlpha=1;c.fillStyle='#b4e8f1';c.beginPath();c.moveTo(x-14*s*k,a.iceY*k-18*s*k);c.lineTo(x+14*s*k,a.iceY*k-18*s*k);c.lineTo(x,a.iceY*k+20*s*k);c.fill();}
  }else if(boss.id==='rootbound-heart'){
   c.globalAlpha=.8;c.strokeStyle='#b5db8b';for(const sign of [-1,1]){const yy=(a.center+sign*a.obstacle.gap/2)*k;c.beginPath();c.moveTo(x-30*k,yy);c.lineTo(x,yy-sign*7*k);c.lineTo(x+30*k,yy);c.stroke();}
  }else if(boss.id==='storm-shepherd'){
   c.globalAlpha=.6;c.strokeStyle='#c5c4ee';const sign=a.index%2?1:-1;
   for(let i=0;i<6;i++){const xx=x+(i-2.5)*24*s*k,yy=y+Math.sin(t*2+i)*25*s*k;c.beginPath();c.moveTo(xx-6*k,yy-sign*6*k);c.lineTo(xx,yy);c.lineTo(xx+6*k,yy-sign*6*k);c.stroke();}
  }else if(boss.id==='hollow-sun'){
   const yy=(a.wellY??a.y)*k,r=17*s*k;c.globalAlpha=1;c.fillStyle='#000';c.beginPath();c.arc(x,yy,r,0,Math.PI*2);c.fill();c.strokeStyle='#bd78ac';c.stroke();
   for(let i=0;i<12;i++){const angle=t*2+i*Math.PI/6,rr=r*(1+((i/12+t*.25)%1)*2.4);c.fillStyle='#b88ba9';c.globalAlpha=.65;c.fillRect(x+Math.cos(angle)*rr,yy+Math.sin(angle)*rr*.65,3*k,3*k);}
   if(a.draining){c.globalAlpha=.65;c.strokeStyle='#d9b4cd';c.beginPath();c.moveTo(engine.player.x*k,engine.player.y*k);c.quadraticCurveTo(x+40*k,yy-45*k,x,yy);c.stroke();}
  }
 }
 c.restore();
}
