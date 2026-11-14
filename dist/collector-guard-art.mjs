const TAU=Math.PI*2;

// Four tiny knots stitch the outside of a full rescue ring. On impact they
// collapse onto the wisp; an incomplete arc shows how long the fetch is sealed.
export function drawCollectorGuard(ctx,aura,x,y,scale,reducedMotion){
  if(!aura?.active||(!aura.guardReady&&!aura.guardRecovering))return;
  ctx.save();
  ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.lineWidth=1.5;ctx.lineCap='butt';
  if(aura.guardRecovering){
    let radius=14;
    if(!reducedMotion&&aura.guardElapsed<.22){
      radius+=(aura.maximumReach-radius)*(1-aura.guardElapsed/.22)**2;
    }
    ctx.strokeStyle='#809b7c';ctx.globalAlpha=.48;ctx.beginPath();
    for(let i=0;i<4;i++){
      const start=i*TAU/4;
      ctx.moveTo(Math.cos(start)*radius,Math.sin(start)*radius);
      ctx.arc(0,0,radius,start,start+.46);
    }
    ctx.stroke();
    if(aura.growth>0){
      ctx.globalAlpha=.78;ctx.strokeStyle='#c4dda5';ctx.beginPath();
      ctx.arc(0,0,radius,-TAU/4,-TAU/4+TAU*aura.growth);ctx.stroke();
    }
  }else{
    const r=aura.radius;
    ctx.strokeStyle='#d8e8b8';ctx.globalAlpha=.74;ctx.beginPath();
    for(let i=0;i<4;i++){
      const angle=(i+.5)*TAU/4,cos=Math.cos(angle),sin=Math.sin(angle);
      ctx.moveTo(cos*r+sin*2,sin*r-cos*2);
      ctx.lineTo(cos*(r+2),sin*(r+2));ctx.lineTo(cos*r-sin*2,sin*r+cos*2);
    }
    ctx.stroke();
  }
  ctx.restore();
}
