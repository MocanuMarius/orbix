// A short, branching discharge jumps out from the wisp's shell. Clip the
// moving head and tail along each channel so the ends travel independently.
const TAU = Math.PI*2;
const duration = .36;
const clamp = t => Math.max(0,Math.min(1,t));

function noise(seed){
  const n=Math.sin(seed*127.1+3.79)*43758.5453;
  return n-Math.floor(n);
}

// Templates hold local radial and tangential offsets. Every hit chooses one
// and rotates it by the pickup's own phase, stable across frames and scrubs.
function makeChannels(seed){
  const channels=[];
  for(let i=0;i<8;i++){
    const k=seed*31+i*13;
    const angle=TAU*(i+.6*noise(k))/8;
    const reach=13+18*noise(k+1);
    const start=8+3*noise(k+2);
    const lean=(noise(k+3)-.5)*14;
    const points=[];
    for(let j=0;j<=6;j++){
      const f=j/6;
      const r=start+f*reach;
      const side=f*lean+(j===0?0:(noise(k+5+j)-.5)*(4+5*Math.sin(f*Math.PI)));
      points.push([r*Math.cos(angle)-side*Math.sin(angle),r*Math.sin(angle)+side*Math.cos(angle)]);
    }
    const delay=noise(k+12)*.12, travel=.38+.17*noise(k+14);
    channels.push({points,delay,travel});
    if(i%3!==1){
      const j=2+Math.floor(noise(k+15)*2);
      const [x,y]=points[j], divergence=angle+(i%2?1:-1)*(.47+.42*noise(k+16));
      const length=7+5*noise(k+17), dx=Math.cos(divergence),dy=Math.sin(divergence);
      channels.push({
        points:[[x,y],[x+dx*length*.38+dy*1.4,y+dy*length*.38-dx*1.4],
          [x+dx*length*.64-dy*1.7,y+dy*length*.64+dx*1.7],[x+dx*length,y+dy*length]],
        delay:delay+j*travel/6, travel:travel*.56
      });
    }
  }
  return channels;
}
const templates=Array.from({length:6},(_,i)=>makeChannels(i+1));

function trace(ctx,points,start,end){
  const segments=points.length-1, a=start*segments, b=end*segments;
  for(let i=Math.floor(a);i<Math.ceil(b);i++){
    const [x,y]=points[i], [nx,ny]=points[i+1];
    const dx=nx-x,dy=ny-y;
    if(i===Math.floor(a))ctx.moveTo(x+dx*(a-i),y+dy*(a-i));
    const t=Math.min(1,b-i);
    ctx.lineTo(x+dx*t,y+dy*t);
  }
}

export function drawShellArcs(ctx,x,y,scale,age,kind,phase=0,reducedMotion=false){
  if(age<0||age>=duration||kind==='sight')return;
  const u=age/duration, fade=(1-u*u)**1.15;
  const input=Math.abs(Math.sin(phase*9.13))*.99999;
  const channels=templates[Math.floor(input*templates.length)];
  const size=reducedMotion?scale*.82:scale;
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(phase);
  ctx.scale(size,size);
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath();
  for(const channel of channels){
    // Reduced motion holds the forked pattern steady and only fades it.
    const head=reducedMotion?.83:clamp((u+.05-channel.delay)/channel.travel);
    const tail=reducedMotion?.06:clamp((u-.30-channel.delay)/channel.travel);
    if(head>tail)trace(ctx,channel.points,tail,head);
  }
  const alpha=ctx.globalAlpha*fade*(reducedMotion?.62:1);
  const dim=kind==='dark'||kind==='dusk';
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=alpha*.37;
  ctx.strokeStyle=dim?'#fa839c':'#75c9f4'; ctx.lineWidth=3.3; ctx.stroke();
  ctx.globalAlpha=alpha*.94;
  ctx.strokeStyle=dim?'#ffdbe2':'#e5faff'; ctx.lineWidth=1.15; ctx.stroke();
  ctx.restore();
}
