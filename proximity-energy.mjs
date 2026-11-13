// Fixed-budget pixel effects, driven by simulation time: no particle allocations,
// timers, per-frame geometry scans, or collectible/gameplay side effects.
const TAU=Math.PI*2;
export function drawProximityEnergy(c,e,{scale=1}={}){
 const p=e.edgingPulse;if(!p?.live||p.dreaming||e.dying||e.completing)return;
 const t=e.visualTime??e.time??0,x=e.player.x,y=e.renderPlayerY??e.player.y;
 const active=p.remaining>0,charge=p.charge||0;
 if(!active&&charge<=0)return;
 const px=v=>Math.round(v*scale),size=Math.max(1,Math.round(2*scale));
 c.save();
 if(active){
  const elapsed=Math.max(0,p.duration-p.remaining),strength=p.strength;
  // Existing lighting removes fog; this wash gives the newly visible terrain
  // a blue cast without washing out collision edges or drawing over HTML HUD.
  c.globalCompositeOperation='screen';c.globalAlpha=strength*.19;c.fillStyle='#389bdc';
  c.fillRect(0,0,e.width*scale,e.height*scale);
  c.globalCompositeOperation='source-over';
  if(!e.reducedMotion){
   const wave=(elapsed%1.65)/1.65,radius=wave*Math.hypot(e.width,e.height);
   c.globalAlpha=(1-wave)*Math.min(1,p.remaining/p.duration)*.28;
   c.strokeStyle='#b5eaff';c.lineWidth=Math.max(1,scale*2);c.beginPath();c.arc(px(x),px(y),px(radius),0,TAU);c.stroke();
  }
  if(elapsed<1.35){
   const age=elapsed/1.35,origin=p.burstOrigin;
   const bx=(origin?.x??e.distance+x)-(e.renderDistance??e.distance),by=origin?.y??y;
   for(let i=0;i<(e.reducedMotion?12:48);i++){
    const angle=i*2.39996323,speed=80+(i*37%180),r=elapsed*speed*(1-age*.25);
    c.globalAlpha=(1-age)**2*(.6+(i%3)*.15);c.fillStyle=i%3?'#8ed7ff':'#eefbff';
    c.fillRect(px(bx+Math.cos(angle)*r),px(by+Math.sin(angle)*r),size+(i%4===0?size:0),size);
   }
  }
 }else if(!p.recoveryRemaining){
  const liveNear=p.nearEdge&&!p.protected;
  const fade=liveNear?1:.28;
  // Streamers connect the orb to the exact closest collidable surface.
  if(liveNear&&p.surface&&Number.isFinite(p.surface.clearance)){
   const sx=p.surface.x-(e.renderDistance??e.distance),sy=p.surface.y;
   for(let arc=0;arc<(e.reducedMotion?1:3);arc++){
    c.globalAlpha=.24+charge*.45;c.strokeStyle=arc===1?'#edfaff':'#6ac8ff';c.lineWidth=Math.max(1,scale*(arc===1?1:2));c.beginPath();
    for(let j=0;j<=8;j++){
     const u=j/8,envelope=Math.sin(u*Math.PI),wobble=e.reducedMotion?0:Math.sin(t*25+j*4.7+arc*2)*envelope*(3+charge*4);
     const xx=px(x+(sx-x)*u+wobble),yy=px(y+(sy-y)*u+Math.sin(j*2+arc)*envelope*3);
     if(j===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);
    }c.stroke();
   }
   c.globalAlpha=.45+charge*.35;c.fillStyle='#d7f5ff';c.fillRect(px(sx)-size,px(sy)-size,size*2,size*2);
  }
  const count=Math.floor(charge*(e.reducedMotion?10:30));
  for(let i=0;i<count;i++){
   const a=i*2.39996323+(e.reducedMotion?0:t*(.7+(i%4)*.22)),r=e.player.radius+6+(1-charge)*16+(i%5)*2;
   c.globalAlpha=(.35+charge*.6)*fade;c.fillStyle=i%3?'#88cfff':'#e9f9ff';
   c.fillRect(px(x+Math.cos(a)*r),px(y+Math.sin(a)*r),size,size);
  }
 }
 c.restore();
}
