import {terrainBoundary} from './terrain-boundary.mjs?v=glossary-1';

// The closest plane is cut paper: opaque black land and foliage, without any
// material, rim light or texture. Three small plates are baked per biome.
const documents=new WeakMap();
const foregroundInk=new WeakMap();
const noise=n=>{let h=Math.imul(n|0,1597334677);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
function opaqueSilhouette(context,canvas){
 // This is a plate-bake operation only. Canvas paths antialias their edges;
 // the nearest pixel-art plane has binary coverage, including its fine stems.
 const image=context.getImageData(0,0,canvas.width,canvas.height);if(!image?.data)return;
 for(let i=3;i<image.data.length;i+=4)image.data[i]=image.data[i]>=128?255:0;
 context.putImageData(image,0,0);
}
function hardContactClearance(c,ax,ay,bx,by,size,width,height){
 // Clip before integer stepping: a long offscreen shoulder costs no more
 // than a viewport contour. A single fill batches all hard-edged rectangles.
 const dx=bx-ax,dy=by-ay,pad=size;let start=0,end=1;
 for(const [p,q]of [[-dx,ax+pad],[dx,width+pad-ax],[-dy,ay+pad],[dy,height+pad-ay]]){
  if(!p){if(q<0)return;continue;}
  const u=q/p;if(p<0)start=Math.max(start,u);else end=Math.min(end,u);if(start>end)return;
 }
 let x=Math.round(ax+dx*start),y=Math.round(ay+dy*start);
 const xx=Math.round(ax+dx*end),yy=Math.round(ay+dy*end),sx=x<xx?1:-1,sy=y<yy?1:-1,
  wx=Math.abs(xx-x),hy=-Math.abs(yy-y),half=Math.floor(size/2);let error=wx+hy;
 while(true){
  c.rect(x-half,y-half,size,size);if(x===xx&&y===yy)break;
  const twice=error*2;if(twice>=hy){error+=hy;x+=sx;}if(twice<=wx){error+=wx;y+=sy;}
 }
}
export const FOREGROUND_BIOMES=Object.freeze(['moonruins','frost','pinewood','marsh','fungal','basalt','desert','coral','crystal','cloud','thorn','cemetery']);
export function createForegroundSilhouettes(document,biome,variant=0){
 const plates=[];
 for(let tile=0;tile<3;tile++){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const c=canvas.getContext('2d');
  c.fillStyle='#000000';c.strokeStyle='#000000';c.lineCap='butt';c.lineJoin='miter';
  const poly=points=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();};
  const line=(points,width=2)=>{c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke();};
  for(let island=0;island<4;island++){
   const seed=variant*7919+tile*941+island*317,x=island*151-28+noise(seed)*30,w=66+noise(seed+7)*56,y=118+noise(seed+3)*16;
   poly([[x-12,160],[x,y+9],[x+w*.15,y+1],[x+w*.33,y-4],[x+w*.47,y-2],[x+w*.61,y+4],[x+w*.82,y+5],[x+w,y+13],[x+w+9,160]]);
   for(let cluster=0;cluster<2;cluster++){
    const root=x+w*(cluster?.68:.28),base=y+(cluster?4:0),h=14+noise(seed+cluster*97+13)*28;
    if(biome==='pinewood'||biome==='thorn'||biome==='moonruins'||biome==='cemetery'){
     line([[root,base+3],[root+2,base-h*.55],[root,base-h]],3);
     for(let branch=0;branch<4;branch++){
      const yy=base-h*.2-branch*h*.18,spread=(4-branch)*3+4;
      poly([[root-spread,yy+5],[root-4,yy-4],[root,yy-10],[root+4,yy-4],[root+spread,yy+5],[root+2,yy+1],[root,yy+4]]);
     }
    }else if(biome==='fungal'){
     line([[root,base+3],[root+1,base-h]],3);
     poly([[root-13,base-h+1],[root-10,base-h-5],[root-3,base-h-9],[root+5,base-h-8],[root+14,base-h+1]]);
     line([[root+15,base+4],[root+14,base-h*.45]],2);poly([[root+7,base-h*.45],[root+10,base-h*.45-5],[root+17,base-h*.45-4],[root+21,base-h*.45]]);
    }else if(biome==='coral'){
     for(let k=0;k<4;k++){const xx=root+(k-1.5)*5;line([[xx,base+3],[xx-2,base-h*.5],[xx+(k-2)*3,base-h]],2);line([[xx-2,base-h*.5],[xx-8,base-h*.7],[xx-9,base-h*.87]],2);}
    }else if(biome==='crystal'||biome==='basalt'){
     // Sparse wiry scrub grows between angular rock fragments, even here.
     poly([[root-8,base+3],[root-6,base-10],[root,base-18],[root+5,base-8],[root+9,base+3]]);
     line([[root+13,base+4],[root+12,base-7],[root+16,base-13]],1);line([[root+12,base-5],[root+8,base-10]],1);
    }else{
     for(let k=0;k<(biome==='marsh'?6:4);k++){
      const xx=root+(k-2)*3,hh=h*(.46+noise(seed+k*79)*.5);
      line([[xx,base+4],[xx+(k-2)*.8,base-hh*.6],[xx+(k-2)*2,base-hh]],biome==='marsh'?2:1);
      if(biome==='marsh'&&k%2===0)c.fillRect(Math.round(xx+(k-2)*2-1),Math.round(base-hh-5),3,7);
      else line([[xx,base-hh*.5],[xx-5,base-hh*.7]],1);
     }
    }
   }
  }
  const roofCanvas=document.createElement('canvas');roofCanvas.width=512;roofCanvas.height=76;const r=roofCanvas.getContext('2d');r.fillStyle=r.strokeStyle='#000000';
  for(let shelf=0;shelf<3;shelf++){
   const seed=tile*419+shelf*137+variant*71,x=shelf*193-27+noise(seed)*22,w=77+noise(seed+9)*44,lip=9+noise(seed+3)*14;
   r.beginPath();[[x-8,0],[x+w+8,0],[x+w,lip*.7],[x+w*.76,lip+2],[x+w*.48,lip-1],[x+w*.23,lip+3],[x,lip*.6]].forEach(([xx,yy],i)=>i?r.lineTo(xx,yy):r.moveTo(xx,yy));r.closePath();r.fill();
   for(let root=0;root<4;root++){
    const xx=x+12+root*17,drop=11+noise(seed+root*53)*24;
    r.beginPath();r.moveTo(xx-2,lip-3);
    if(['frost','crystal','basalt'].includes(biome)){r.lineTo(xx+4,lip-2);r.lineTo(xx+1,lip+drop);r.closePath();r.fill();}
    else{r.lineWidth=root%2?1:2;r.lineTo(xx+2,lip+drop*.48);r.lineTo(xx-2,lip+drop);r.stroke();
     if(['pinewood','thorn','marsh','moonruins','coral','cemetery'].includes(biome))for(let leaf=0;leaf<3;leaf++){const yy=lip+5+leaf*5;r.beginPath();r.moveTo(xx-5+leaf,yy-2);r.lineTo(xx+1,yy+3);r.lineTo(xx+6-leaf,yy);r.stroke();}
    }
   }
  }
  opaqueSilhouette(c,canvas);opaqueSilhouette(r,roofCanvas);
  plates.push({canvas,roofCanvas,roof:tile===((variant+1)%3)});
 }
 return plates;
}
function platesFor(document,biome,variant){
 let state=documents.get(document);if(!state){state=new Map();documents.set(document,state);}
 const key=`${biome}:${variant}`;if(state.has(key))return state.get(key);
 const plates=createForegroundSilhouettes(document,biome,variant);state.set(key,plates);
 while(state.size>3){const first=state.keys().next().value;for(const p of state.get(first)){p.canvas.width=p.canvas.height=1;p.roofCanvas.width=p.roofCanvas.height=1;}state.delete(first);}
 return plates;
}
export function drawTerrainForeground(c,e,{scale=1,distance=e.renderDistance??e.distance??0}={}){
 const document=c.canvas?.ownerDocument;if(!document)return;
 const time=e.visualTime??e.time??0,boundary=terrainBoundary(e,time);
 if(!boundary.profiles.length)return;
 const biome=e.levelIdentity?.biomeId||({ruins:'moonruins',canopy:'pinewood',storm:'frost'}[e.terrain]),variant=e.levelIdentity?.variant||0;
 const plates=platesFor(document,biome,variant),W=e.width,H=e.height;
 let ink=foregroundInk.get(e);if(!ink){const canvas=document.createElement('canvas');ink={canvas,context:canvas.getContext('2d')};foregroundInk.set(e,ink);}
 const rw=Math.ceil(W*scale),rh=Math.ceil(H*scale);if(ink.canvas.width!==rw||ink.canvas.height!==rh){ink.canvas.width=rw;ink.canvas.height=rh;}
 const p=ink.context;p.setTransform(1,0,0,1,0,0);p.clearRect(0,0,rw,rh);p.globalAlpha=1;p.globalCompositeOperation='source-over';p.imageSmoothingEnabled=false;
 // The same current-camera union supplies ecology and contact edges. Clip the
 // nearest art to its actual filled polygons, including motion and Spacetime,
 // rather than treating a screen-edge band as ground. Opposite bank polygons
 // have opposite winding; reverse roofs so overlapping solids remain a union.
 const camera=Math.round(distance*scale);p.save();p.beginPath();
 for(const profile of boundary.profiles){
  if(profile.points.at(-1)[0]<distance||profile.points[0][0]>distance+W)continue;
  const owner=profile.owner,shape=profile.top?owner.topShape:owner.bottomShape;
  const anchor=owner.center+Math.sin(time*.9+(owner.phase||0))*(owner.motion||0)+(profile.top?-1:1)*owner.gap/2;
  for(let i=0;i<shape.length;i++){
   const [x,y]=shape[profile.top?shape.length-1-i:i],px=Math.round((owner.x+x)*scale)-camera,py=Math.round((anchor+y)*scale);
   if(i)p.lineTo(px,py);else p.moveTo(px,py);
  }
  p.closePath();
 }
 p.clip();
 const speed=1.22,scroll=distance*speed,span=512,first=Math.floor(scroll/span)-1,last=Math.ceil((scroll+W)/span);
 const floorY=Math.round((H-160)*scale),roofHeight=Math.round(76*scale);
 for(let tile=first;tile<=last;tile++){
  const item=plates[((tile+variant)%plates.length+plates.length)%plates.length],left=Math.round((tile*span-scroll)*scale),right=Math.round(((tile+1)*span-scroll)*scale);
  // Snap shared tile edges and destination extents in the actual game raster.
  // Even a binary texture acquires fractional alpha at a transformed blit edge.
  p.drawImage(item.canvas,left,floorY,right-left,rh-floorY);
  if(item.roof)p.drawImage(item.roofCanvas,left,0,right-left,roofHeight);
 }
 p.restore();
 // Preserve the real contact seam with binary raster clearance. A native
 // antialiased erase stroke would leave gray, partly transparent ink along it.
 p.setTransform(1,0,0,1,0,0);p.globalCompositeOperation='destination-out';p.fillStyle='#000000';p.beginPath();
 const clearance=Math.max(1,Math.ceil(8*scale));
 for(const segment of boundary.segments){
  const ax=segment.a[0]-distance,ay=segment.a[1],bx=segment.b[0]-distance,by=segment.b[1];
  if(Math.max(ax,bx)<-6||Math.min(ax,bx)>W+6||Math.max(ay,by)<-6||Math.min(ay,by)>H+6||Math.min(ay,by)>76&&Math.max(ay,by)<H-160)continue;
  hardContactClearance(p,Math.round(segment.a[0]*scale)-camera,Math.round(ay*scale),
   Math.round(segment.b[0]*scale)-camera,Math.round(by*scale),clearance,rw,rh);
 }
 p.fill();p.globalCompositeOperation='source-over';
 c.save();c.globalAlpha=1;c.globalCompositeOperation='source-over';c.imageSmoothingEnabled=false;c.drawImage(ink.canvas,0,0);c.restore();
}
export function releaseTerrainForeground(engine){const ink=foregroundInk.get(engine);if(ink)ink.canvas.width=ink.canvas.height=1;foregroundInk.delete(engine);}
