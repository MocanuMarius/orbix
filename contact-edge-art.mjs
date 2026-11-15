const STYLES=new Set(['moon','living','danger','carved','spectral','roots','fracture']);
const BOLD=new Set(['carved','spectral','roots','fracture']);
const INKS={moon:'#c9d9d5',living:'#a5b7a3',danger:'#8b9b91',carved:'#f0e5c6',spectral:'#d3f9ff',roots:'#c3cd9b',fracture:'#d9a292'};
const SPECTRAL_BLUE=Object.freeze({deep:'#15305f',body:'#2964be',fringe:'#45b9ed',core:'#a1efff',hot:'#b5fbff',mote:'#6987ef',seam:'#d3f9ff'});
export const contactEdgeInk=(style,palette)=>style==='spectral'&&palette?palette.seam:INKS[style]||'#b9c6aa';
export const isContactEdgeStyle=style=>STYLES.has(style);
const hash=(x,y)=>{let n=(Math.floor(x*1.7)*374761393+Math.floor(y*1.7)*668265263)|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
const fallbackLine=(c,x,y,xx,yy,color,size)=>{c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=size;c.stroke();};

/** A purely visual contact rim. Coordinates describe the actual collider boundary. */
export function paintContactEdge(c,{x,y,xx,yy,inward=1,worldAx=0,worldAy=0,scale=1,playerX=-10000,playerY=-10000,time=0,style,line,reducedMotion=false,palette}={}) {
  if(!STYLES.has(style))return;
  // The common terrain rim has a vertical inward normal and is already clipped
  // by drawTerrainBoundary. Preserve its exact pixel order and alpha
  // without per-segment closures, normal objects or unused proximity work.
  if(style==='spectral'&&typeof inward==='number'&&inward!==0){
    const w=c.canvas?.width??Infinity,h=c.canvas?.height??Infinity;
    if(Math.min(x,xx)>=-32&&Math.max(x,xx)<=w+32&&Math.min(y,yy)>=-32&&Math.max(y,yy)<=h+32){
      paintSpectralTerrain(c,{x:Math.round(x),y:Math.round(y),xx:Math.round(xx),yy:Math.round(yy),originalX:x,originalY:y,worldAx,worldAy,scale,ny:inward<0?-1:1,palette,line});return;
    }
  }
  const originalX=x,originalY=y,dx=xx-x,dy=yy-y;
  const width=c.canvas?.width??Math.max(x,xx)+4,height=c.canvas?.height??Math.max(y,yy)+4;
  // Liang–Barsky bounds first: even a kilometre-long shoulder costs a screenful.
  let lo=0,hi=1;const margin=BOLD.has(style)?32:3;
  for(const [p,q] of [[-dx,x+margin],[dx,width+margin-x],[-dy,y+margin],[dy,height+margin-y]]){
    if(p===0){if(q<0)return;continue;}
    const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
    if(lo>hi)return;
  }
  xx=Math.round(x+dx*hi);yy=Math.round(y+dy*hi);x=Math.round(x+dx*lo);y=Math.round(y+dy*lo);
  const normal=typeof inward==='number'?{x:0,y:inward}:inward;
  const length=Math.hypot(normal.x,normal.y)||1,nx=normal.x/length,ny=normal.y/length;
  const stroke=line||fallbackLine;
  if(BOLD.has(style)){
    paintBoldEdge(c,{x,y,xx,yy,nx,ny,originalX,originalY,worldAx,worldAy,scale,playerX,playerY,time:reducedMotion?0:time,style,stroke,palette});
    return;
  }
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

function paintSpectralTerrain(c,{x,y,xx,yy,originalX,originalY,worldAx,worldAy,scale,ny,palette,line}){
 const savedAlpha=c.globalAlpha,steps=Math.max(Math.abs(xx-x),Math.abs(yy-y)),spectral=palette||SPECTRAL_BLUE;
 // Match the renderer's rounded world-pixel lattice, including clipped origins.
 // Mineral grain belongs to the bank; only physical lighting animates it.
 const worldPixelX=Math.round(worldAx*scale)-Math.round(originalX),worldPixelY=Math.round(worldAy*scale)-Math.round(originalY);
 for(let i=0;i<=steps;i++){
  const f=steps?i/steps:0,px=Math.round(x+(xx-x)*f),py=Math.round(y+(yy-y)*f);
  const wx=(px+worldPixelX)/scale,wy=(py+worldPixelY)/scale,coord=wx*.87+wy*.49;
  const cell=Math.floor(coord/23),cluster=hash(cell*23,41),h=hash(wx,wy);
  const grain=(Math.sin(coord*.089)+Math.sin(coord*.193)*.5)/1.5,depth=(6+grain*3+cluster*4)*scale;
  let d=Math.max(1,Math.round(depth));c.globalAlpha=savedAlpha*.7;c.fillStyle=spectral.deep;c.fillRect(px,ny<0?py-d+1:py,1,d);
  d=Math.max(1,Math.round(depth*.68));c.globalAlpha=savedAlpha*.88;c.fillStyle=spectral.body;c.fillRect(px,ny<0?py-d+1:py,1,d);
  d=Math.max(1,Math.round(depth*.36));c.globalAlpha=savedAlpha*.9;c.fillStyle=spectral.fringe;c.fillRect(px,ny<0?py-d+1:py,1,d);
  d=Math.max(1,Math.round(1.6*scale));c.globalAlpha=savedAlpha;c.fillStyle=spectral.core;c.fillRect(px,ny<0?py-d+1:py,1,d);
  if(Math.sin(coord*.12)>.88){d=Math.max(1,Math.round(2.5*scale));c.globalAlpha=savedAlpha*.9;c.fillStyle=spectral.hot;c.fillRect(px,ny<0?py-d+1:py,1,d);}
  if(h>.96){const d=depth*.75;c.globalAlpha=savedAlpha*.45;c.fillStyle=spectral.mote;c.fillRect(px,Math.round(py+ny*d),1,1);}
 }
 c.globalAlpha=savedAlpha;(line||fallbackLine)(c,x,y,xx,yy,contactEdgeInk('spectral',palette),1);c.globalAlpha=savedAlpha;
}

// Deliberately different visual languages for review. All mass grows into the
// solid side; the true collision seam is painted last, at its original position.
function paintBoldEdge(c,{x,y,xx,yy,nx,ny,originalX,originalY,worldAx,worldAy,scale,playerX,playerY,time,style,stroke,palette}){
 const savedAlpha=c.globalAlpha,steps=Math.max(Math.abs(xx-x),Math.abs(yy-y)),tx=-ny,ty=nx;
 const spectral=palette||SPECTRAL_BLUE;
 const worldPixelX=Math.round(worldAx*scale)-Math.round(originalX),worldPixelY=Math.round(worldAy*scale)-Math.round(originalY);
 const band=(px,py,depth,ink,alpha=1)=>{
  depth=Math.max(1,Math.round(depth));c.globalAlpha=savedAlpha*alpha;c.fillStyle=ink;
  if(Math.abs(nx)<.12)c.fillRect(px,ny<0?py-depth+1:py,1,depth);
  else if(Math.abs(ny)<.12)c.fillRect(nx<0?px-depth+1:px,py,depth,1);
  else stroke(c,px,py,Math.round(px+nx*depth),Math.round(py+ny*depth),ink,1);
 };
 const segment=(ax,ay,bx,by,ink,size=1,alpha=1)=>{c.globalAlpha=savedAlpha*alpha;stroke(c,Math.round(ax),Math.round(ay),Math.round(bx),Math.round(by),ink,size);};
 for(let i=0;i<=steps;i++){
  const f=steps?i/steps:0,px=Math.round(x+(xx-x)*f),py=Math.round(y+(yy-y)*f);
  const wx=style==='spectral'?(px+worldPixelX)/scale:worldAx+(px-originalX)/scale,wy=style==='spectral'?(py+worldPixelY)/scale:worldAy+(py-originalY)/scale,coord=wx*.87+wy*.49;
  const cell=Math.floor(coord/23),cluster=hash(cell*23,41),h=style==='spectral'?hash(wx,wy):hash(Math.floor(wx*scale),Math.floor(wy*scale));
  const near=Math.max(0,1-Math.hypot(px-playerX,py-playerY)/(150*Math.max(.25,scale)));
  if(style==='carved'){
   const chunk=hash(Math.floor(coord/13)*13,17),depth=(11+chunk*13)*scale;
   band(px,py,depth+2,'#273832');band(px,py,depth,'#757f70');band(px,py,depth*.64,'#acb59b');band(px,py,2.8*scale,'#e0d6b4');
   if(h>.83&&chunk>.35)band(px,py,depth*(.55+h*.35),'#4b5b4f',.8);
   if(h<.035)segment(px+nx*2,py+ny*2,px+nx*depth+tx*4,py+ny*depth+ty*4,'#23342f',1,.8);
  }else if(style==='spectral'){
   const grain=(Math.sin(coord*.089)+Math.sin(coord*.193)*.5)/1.5;
   const depth=(6+grain*3+cluster*4)*scale;
   band(px,py,depth,spectral.deep,.7);band(px,py,depth*.68,spectral.body,.88);band(px,py,depth*.36,spectral.fringe,.9);band(px,py,1.6*scale,spectral.core);
   if(Math.sin(coord*.12)>.88)band(px,py,2.5*scale,spectral.hot,.9);
   if(h>.96){const d=depth*.75;c.globalAlpha=savedAlpha*.45;c.fillStyle=spectral.mote;c.fillRect(Math.round(px+nx*d),Math.round(py+ny*d),1,1);}
  }else if(style==='roots'){
   band(px,py,2*scale,'#3c4930');
   if(cluster>.36&&h>.90){
    const depth=(15+cluster*21)*scale,bend=(hash(cell,5)-.5)*17*scale;
    const ax=px+nx*depth*.52+tx*bend,ay=py+ny*depth*.52+ty*bend;
    const bx=px+nx*depth+tx*bend*.6,by=py+ny*depth+ty*bend*.6;
    segment(px,py,ax,ay,'#6c5939',2);segment(ax,ay,bx,by,'#a38c50',1);
    for(const side of [-1,1]){
     const leafX=ax+tx*side*7*scale+nx*5*scale,leafY=ay+ty*side*7*scale+ny*5*scale;
     segment(ax,ay,leafX,leafY,'#75934b',2);
     c.globalAlpha=savedAlpha*.9;c.fillStyle=side<0?'#9ebd65':'#506f37';c.fillRect(Math.round(leafX)-2,Math.round(leafY)-1,4,3);
    }
   }
   if(cluster>.55&&h<.18)band(px,py,(4+cluster*4)*scale,'#77934a',.8);
  }else{
   band(px,py,5*scale,'#231e2d');
   if(near>.12)band(px,py,(1+near*3)*scale,'#c7614b',near*.8);
   if(h>.91&&cluster>.22){
    const depth=(14+cluster*22)*scale,bend=(hash(cell,9)-.5)*14*scale;
    const ax=px+nx*depth*.44+tx*bend,ay=py+ny*depth*.44+ty*bend;
    const bx=px+nx*depth+tx*bend*.25,by=py+ny*depth+ty*bend*.25;
    const glow=.22+near*(.65+.13*Math.sin(time*5+cell)),hot=near>.3;
    segment(px,py,ax,ay,hot?'#a53e40':'#61444b',3,glow);segment(ax,ay,bx,by,hot?'#cf6146':'#61444b',2,glow);
    segment(ax,ay,ax+tx*9*scale+nx*5*scale,ay+ty*9*scale+ny*5*scale,hot?'#e59055':'#61444b',1,glow);
    if(hot){segment(px,py,ax,ay,'#ffc185',1,glow);segment(ax,ay,bx,by,'#f09a65',1,glow*.8);}
   }
  }
 }
 c.globalAlpha=savedAlpha;stroke(c,x,y,xx,yy,contactEdgeInk(style,palette),1);c.globalAlpha=savedAlpha;
}
