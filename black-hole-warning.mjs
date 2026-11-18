import {lightVisibility} from './light-field.mjs?v=rates-1';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const WARNING_NOTICE=.31;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

// The exposed half of the disk is the signal. A driver can see its oncoming
// wing while the source is still outside the viewport or in unlit sky.
function giantWarning(e,hole,light,distance,playerY,time,quiet,out){
  const x=hole.x-distance, r=hole.coreRadius, inward=hole.edge===1?-1:1;
  const ahead=x-e.player.x;
  if(ahead <= r*.48 || x-r*2.55 > e.width || x+r*2.55 < 0)return false;
  const separation=Math.hypot(ahead,hole.y-playerY);
  const field=hole.influence||r*3.54;
  const approach=smooth((field*1.69-separation)/(field*.81));
  if(approach<=0)return false;
  const phase=quiet?.48:.5+.5*Math.sin(time*1.23+(hole.seed||0)*.0031);
  const tangent=Math.atan2(inward*.41,1);
  const p=out[0]??(out[0]={});
  out.length=1;
  p.x=x-r*(1.77+.12*phase);p.y=hole.y+inward*r*(.86-.06*phase);
  if(p.x < -r*.28 || p.x>e.width+r*.28 || p.y<0 || p.y>e.height)return false;
  p.nx=Math.cos(tangent);p.ny=Math.sin(tangent);p.side=inward;
  const local=lightVisibility(e,light,p.x,p.y,playerY);
  p.alpha=approach*smooth((ahead-r*.48)/(r*.70))*
    (.55+.30*Math.sqrt(local)+.10*phase);
  return p.alpha>.01;
}

// Only two points on the near face of the gravity field shed light. Sample
// the actual local Luminance there, including shutters. They cannot reveal
// a corridor, the centre of the hazard or a signal in pitch black.
export function blackHoleWarning(e,hole,light,distance,playerY,time,reducedMotion,out){
  if(hole.giant)return giantWarning(e,hole,light,distance,playerY,time,reducedMotion,out);
  const x=hole.x-distance,y=hole.y,dx=x-e.player.x,dy=y-playerY;
  if(dx<22 || dx>Math.min(e.width-e.player.x+100,2.4*(hole.influence||220)))return false;
  const separation=Math.hypot(dx,dy),nx=dx/separation,ny=dy/separation;
  // Once the player has already taken the wide bypass, don't coax them
  // farther towards a wall to dodge the harmless outer tail.
  const approachBand=clamp((163-Math.abs(dy))/25,0,1);
  if(approachBand===0)return false;
  const seed=(hole.seed||0)%37;
  let visible=false;
  for(let i=0;i<2;i++){
    const phase=reducedMotion ? .42 : (time*.91+(seed*.017+i*.49))%1;
    const sweep=Math.max(0,phase);
    const reach=Math.min(100,separation*.6)*(1-.21*sweep);
    const side=(i===0?-1:1)*(13-8*sweep);
    const p=out[i]??(out[i]={});
    p.x=x-nx*reach-ny*side;p.y=y-ny*reach+nx*side;
    p.nx=nx;p.ny=ny;p.side=i===0?-1:1;
    const exposure=p.x>0&&p.x<e.width&&p.y>0&&p.y<e.height
      ? lightVisibility(e,light,p.x,p.y,playerY):0;
    const lit=clamp((exposure-.035)/.18,0,1);
    const approach=clamp((dx-22)/55,0,1);
    p.alpha=lit*approach*approachBand*(reducedMotion?.88:.78+.22*Math.sin(Math.PI*sweep));
    visible ||= p.alpha>.01;
  }
  return visible;
}

const marks=[];
export function drawBlackHoleWarning(c,e,hole,light,distance,playerY,time,scale){
  if(!blackHoleWarning(e,hole,light,distance,playerY,time,e.reducedMotion,marks))return;
  if(hole.giant){
    const p=marks[0],r=hole.coreRadius*scale,x=p.x*scale,y=p.y*scale;
    const side=p.side;
    // This is one tapered, flowing sheet along the disk wing. The free tip
    // leading into the corridor fades; its hot throat turns toward the core.
    c.save();c.lineCap='round';
    c.beginPath();c.moveTo(x-.44*r,y-side*.16*r);
    c.bezierCurveTo(x-.16*r,y-side*.15*r,x+.07*r,y+side*.06*r,x+.39*r,y+side*.08*r);
    c.globalAlpha=p.alpha*.21;c.strokeStyle='#dc694f';c.lineWidth=Math.max(2,r*.067);c.stroke();
    c.globalAlpha=p.alpha*.66;c.strokeStyle='#ec9474';c.lineWidth=Math.max(1,r*.024);c.stroke();
    c.beginPath();c.moveTo(x-.14*r,y-side*.074*r);
    c.quadraticCurveTo(x+.02*r,y+side*.014*r,x+.13*r,y+side*.042*r);
    c.globalAlpha=p.alpha;c.strokeStyle='#ffe6c0';c.lineWidth=Math.max(1,r*.012);c.stroke();
    c.restore();
    return;
  }
  const pixel=Math.max(1,Math.round(scale*1.6));
  for(const p of marks){
    if(p.alpha<=.01)continue;
    for(let j=0;j<6;j++){
      const f=j/5,along=-9*(1-f),across=p.side*(1-f)*(1-f)*5;
      const x=Math.round((p.x+along*p.nx-across*p.ny)*scale);
      const y=Math.round((p.y+along*p.ny+across*p.nx)*scale);
      c.globalAlpha=p.alpha*(.32+.60*f);
      c.fillStyle=j===5?'#f6dedd':j>=3?'#db898b':'#a64d60';
      c.fillRect(x,y,pixel+(j===4?1:0),pixel);
    }
  }
}
