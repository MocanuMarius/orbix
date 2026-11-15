// A tapered ribbon of the body's own light. No outline or detached marker:
// the wide root is buried in the shell and the tip thins into its curl.
const samples=new Float64Array(13*4);
function strandSamples(points,width){
  const count=width<2?8:12,[a,b,d,e]=points;
  for(let i=0;i<=count;i++){
    const t=i/count,u=1-t;
    const x=u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*d.x+t*t*t*e.x;
    const y=u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*d.y+t*t*t*e.y;
    const dx=3*u*u*(b.x-a.x)+6*u*t*(d.x-b.x)+3*t*t*(e.x-d.x);
    const dy=3*u*u*(b.y-a.y)+6*u*t*(d.y-b.y)+3*t*t*(e.y-d.y);
    const length=Math.max(.001,Math.hypot(dx,dy)),r=width*(1-.78*t)*.5;
    const offset=i*4;samples[offset]=x;samples[offset+1]=y;
    samples[offset+2]=-dy/length*r;samples[offset+3]=dx/length*r;
  }
  return count;
}
export function livingStrandPath(points,width=2){
  const count=strandSamples(points,width);let path='';
  for(let i=0;i<=count;i++){const p=i*4;path+=(i?'L':'M')+(samples[p]+samples[p+2]).toFixed(2)+' '+(samples[p+1]+samples[p+3]).toFixed(2);}
  for(let i=count;i>=0;i--){const p=i*4;path+='L'+(samples[p]-samples[p+2]).toFixed(2)+' '+(samples[p+1]-samples[p+3]).toFixed(2);}
  return path+'Z';
}
export function drawLivingStrand(c,points,{width=2,color='#efffe0',glow=color,alpha=1}={}){
  if(!(alpha>0)||points.length<4)return;
  const count=strandSamples(points,width);
  c.save();const inherited=c.globalAlpha;
  for(let layer=0;layer<2;layer++){
    const swell=layer?1:2.5;
    c.globalAlpha=inherited*alpha*(layer?1:.10);c.fillStyle=layer?color:glow;c.beginPath();
    for(let i=0;i<=count;i++){const p=i*4,x=samples[p]+samples[p+2]*swell,y=samples[p+1]+samples[p+3]*swell;if(i)c.lineTo(x,y);else c.moveTo(x,y);}
    for(let i=count;i>=0;i--){const p=i*4;c.lineTo(samples[p]-samples[p+2]*swell,samples[p+1]-samples[p+3]*swell);}
    c.closePath();c.fill();
  }
  c.restore();
}
