// The live Collector finish: winding, broad release, two fast turns, contact.
export const COLLECTOR_VORTEX=Object.freeze({setup:.252,launch:.168,orbit:.504,absorb:.126,duration:1.05,turns:2,minimumRadius:55,minimumScale:.22});
const TAU=Math.PI*2;
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const bezier=(a,b,c,d,u)=>a*(1-u)**3+3*b*u*(1-u)**2+3*c*u*u*(1-u)+d*u**3;

export function vortexProgress(elapsed){
  const t=COLLECTOR_VORTEX;
  return elapsed<t.setup?elapsed/t.setup*.24:elapsed<t.setup+t.launch
    ?.24+(elapsed-t.setup)/t.launch*.18:.42+(elapsed-t.setup-t.launch)/(t.orbit+t.absorb)*.58;
}

export function vortexScale(elapsed){
  const t=COLLECTOR_VORTEX,start=t.setup+t.launch*.35,end=t.setup+t.launch+t.orbit*.325;
  return 1-(1-t.minimumScale)*smooth((elapsed-start)/(end-start));
}

export function vortexCargoPoint(s,contact,quiet,out){
  const t=COLLECTOR_VORTEX,orbitAt=t.setup+t.launch,absorbAt=orbitAt+t.orbit;
  const radius=Math.max(t.minimumRadius,s.radius),verticalScale=s.verticalScale??1;
  if(s.elapsed<orbitAt){
    const u=smooth((s.elapsed-t.setup)/t.launch);
    out.x=bezier(s.launch.x,s.launch.x+8,radius*.9,radius,u);
    out.y=bezier(s.launch.y,s.side*radius*1.5,s.side*radius*.8,0,u)*verticalScale;
    // launch.y already follows a resized viewport.
    out.y+=s.launch.y*(1-u)**3*(1-verticalScale);
    out.stage='sling';
  }else if(s.elapsed<absorbAt){
    const u=(s.elapsed-orbitAt)/t.orbit;
    const angle=-s.side*(quiet?Math.PI*.4*Math.sin(Math.PI*u):TAU*t.turns*u);
    const r=radius+(contact+7-radius)*(1-(1-u)**3);
    out.x=Math.cos(angle)*r;out.y=Math.sin(angle)*r*verticalScale;out.stage='spiral';
  }else{
    out.x=contact+7-(7+contact*.12)*smooth((s.elapsed-absorbAt)/t.absorb);
    out.y=0;out.stage='absorb';
  }
  return out;
}

export function createVortexTrail(){return {points:Array.from({length:32},()=>({x:0,y:0,age:0})),start:0,count:0};}
export function recordVortexTrail(s,x,y){
  const trail=s.trail;
  while(trail.count&&s.elapsed-trail.points[trail.start].age>.22){trail.start=(trail.start+1)%trail.points.length;trail.count--;}
  if(trail.count===trail.points.length){trail.start=(trail.start+1)%trail.points.length;trail.count--;}
  const p=trail.points[(trail.start+trail.count++)%trail.points.length];p.x=x;p.y=y;p.age=s.elapsed;
}

export function drawCollectorVortex(ctx,state,scale,quiet=false){
  const m=state.vortex;if(!m)return;
  const p=vortexProgress(m.elapsed),trail=m.trail;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.globalCompositeOperation='screen';
  const alpha=ctx.globalAlpha;
  if(p<.42){
    const grow=smooth(p/.18),fade=1-smooth((p-.24)/.18);
    const x=state.x+(state.cargoPose?.offsetX||0),y=state.y+(state.cargoPose?.offsetY||0);
    for(let j=0;j<(quiet?1:3);j++){
      ctx.beginPath();const a=(quiet?0:m.elapsed*24)+j*TAU/3,r=(18+j*6)*grow;
      ctx.arc(x*scale,y*scale,r*scale,a,a+Math.PI*1.18);
      ctx.strokeStyle=j===0?'#e2ffe9':'#66ef99';ctx.lineWidth=(j===0?1.2:.8)*scale;
      ctx.globalAlpha=alpha*fade*(quiet?.18:.6-j*.12);ctx.stroke();
    }
  }
  if(!quiet&&p>.24&&p<.95&&trail.count>2){
    for(let j=1;j<trail.count;j++){
      const a=trail.points[(trail.start+j-1)%trail.points.length],b=trail.points[(trail.start+j)%trail.points.length];
      ctx.beginPath();ctx.moveTo((state.homeX+a.x)*scale,(state.homeY+a.y)*scale);ctx.lineTo((state.homeX+b.x)*scale,(state.homeY+b.y)*scale);
      ctx.globalAlpha=alpha*(j/trail.count)*.34;ctx.strokeStyle='#66ef99';ctx.lineWidth=2.2*scale;ctx.stroke();
      ctx.globalAlpha=alpha*(j/trail.count)*.65;ctx.strokeStyle='#e2ffe9';ctx.lineWidth=.8*scale;ctx.stroke();
    }
  }
  ctx.restore();
}
