const STYLES=new Set(['moon','living','danger']);
export const isContactEdgeStyle=style=>STYLES.has(style);
const hash=(x,y)=>{let n=(Math.floor(x*1.7)*374761393+Math.floor(y*1.7)*668265263)|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
const fallbackLine=(c,x,y,xx,yy,color,size)=>{c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=size;c.stroke();};

/** A purely visual contact rim. Coordinates describe the actual collider boundary. */
export function paintContactEdge(c,{x,y,xx,yy,inward=1,worldAx=0,worldAy=0,scale=1,playerX=-10000,playerY=-10000,time=0,style,line}={}) {
  if(!STYLES.has(style))return;
  const originalX=x,originalY=y,dx=xx-x,dy=yy-y;
  const width=c.canvas?.width??Math.max(x,xx)+4,height=c.canvas?.height??Math.max(y,yy)+4;
  // Liang–Barsky bounds first: even a kilometre-long shoulder costs a screenful.
  let lo=0,hi=1;
  for(const [p,q] of [[-dx,x+3],[dx,width+3-x],[-dy,y+3],[dy,height+3-y]]){
    if(p===0){if(q<0)return;continue;}
    const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
    if(lo>hi)return;
  }
  xx=Math.round(x+dx*hi);yy=Math.round(y+dy*hi);x=Math.round(x+dx*lo);y=Math.round(y+dy*lo);
  const normal=typeof inward==='number'?{x:0,y:inward}:inward;
  const length=Math.hypot(normal.x,normal.y)||1,nx=normal.x/length,ny=normal.y/length;
  const stroke=line||fallbackLine;
  // The thin uninterrupted rim always marks the exact contact, never a false offset.
  stroke(c,x,y,xx,yy,style==='moon'?'#c9d9d5':style==='living'?'#a5b7a3':'#8b9b91',1);
  const steps=Math.max(Math.abs(xx-x),Math.abs(yy-y));
  const savedAlpha=c.globalAlpha,reach=125*Math.max(.25,scale);
  for(let i=0;i<=steps;i++){
    const f=steps?i/steps:0,px=Math.round(x+(xx-x)*f),py=Math.round(y+(yy-y)*f);
    const wx=worldAx+(px-originalX)/scale,wy=worldAy+(py-originalY)/scale,h=hash(wx,wy);
    const proximity=Math.max(0,1-Math.hypot(px-playerX,py-playerY)/reach);
    if(style==='living'){
      // World-hashed mineral and lichen grain stays still while the camera moves.
      if(h<.26){c.globalAlpha=savedAlpha*(.42+h);c.fillStyle=h<.09?'#c6d6ba':'#6f917e';c.fillRect(Math.round(px+nx),Math.round(py+ny),1,1);}
      if(h>.92){c.globalAlpha=savedAlpha*.32;c.fillStyle='#8caa85';c.fillRect(Math.round(px+nx*2),Math.round(py+ny*2),1,1);}
    } else if(style==='moon'&&proximity>0){
      c.globalAlpha=savedAlpha*proximity*.17;c.fillStyle='#8dbad4';
      c.fillRect(Math.round(px+nx),Math.round(py+ny),1,1);
      if(h>.45){c.globalAlpha*=.35;c.fillRect(Math.round(px+nx*2),Math.round(py+ny*2),1,1);}
    } else if(style==='danger'&&proximity>0){
      c.globalAlpha=savedAlpha*proximity*(.65+.08*Math.sin(time*4));c.fillStyle='#dfc28e';c.fillRect(px,py,1,1);
      if(h<.2){c.globalAlpha*=.25;c.fillRect(Math.round(px+nx),Math.round(py+ny),1,1);}
    }
  }
  c.globalAlpha=savedAlpha;
}
