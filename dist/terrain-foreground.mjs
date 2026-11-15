import {terrainBoundary} from './terrain-boundary.mjs?v=first-light-1';
import {sparkBodyRadius} from './spark-size.mjs?v=first-light-1';

// The closest plane is cut paper: opaque black land and foliage, without any
// material, rim light or texture. Three small plates are baked per biome.
const documents=new WeakMap();
const foregroundInk=new WeakMap();
const noise=n=>{let h=Math.imul(n|0,1597334677);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
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
 const biome=e.levelIdentity?.biomeId||({ruins:'moonruins',canopy:'pinewood',storm:'frost'}[e.terrain]),variant=e.levelIdentity?.variant||0;
 const plates=platesFor(document,biome,variant),W=e.width,H=e.height,time=e.visualTime??e.time??0;
 let ink=foregroundInk.get(e);if(!ink){const canvas=document.createElement('canvas');ink={canvas,context:canvas.getContext('2d')};foregroundInk.set(e,ink);}
 const rw=Math.ceil(W*scale),rh=Math.ceil(H*scale);if(ink.canvas.width!==rw||ink.canvas.height!==rh){ink.canvas.width=rw;ink.canvas.height=rh;}
 const p=ink.context;p.setTransform(1,0,0,1,0,0);p.clearRect(0,0,rw,rh);p.setTransform(scale,0,0,scale,0,0);p.globalAlpha=1;p.globalCompositeOperation='source-over';p.imageSmoothingEnabled=false;
 const speed=1.22,scroll=distance*speed,span=512,first=Math.floor(scroll/span)-1,last=Math.ceil((scroll+W)/span);
 for(let tile=first;tile<=last;tile++){
  const item=plates[((tile+variant)%plates.length+plates.length)%plates.length],x=Math.round(tile*span-scroll);
  p.drawImage(item.canvas,x,H-160);if(item.roof)p.drawImage(item.roofCanvas,x,0);
 }
 // One bounded erase pass preserves the true contact seam. Geometry nowhere
 // near the top/bottom ink bands never enters this path, even in dense courses.
 p.globalCompositeOperation='destination-out';p.strokeStyle='#000000';p.lineWidth=8;p.lineCap='round';p.beginPath();
 for(const segment of terrainBoundary(e,time).segments){
  const ax=segment.a[0]-distance,ay=segment.a[1],bx=segment.b[0]-distance,by=segment.b[1];
  if(Math.max(ax,bx)<-6||Math.min(ax,bx)>W+6||Math.max(ay,by)<-6||Math.min(ay,by)>H+6||Math.min(ay,by)>76&&Math.max(ay,by)<H-88)continue;
  p.moveTo(ax,ay);p.lineTo(bx,by);
 }
 p.stroke();p.fillStyle='#000000';p.beginPath();
 const protect=(x,y,r)=>{if(x+r<0||x-r>W||y+r<0||y-r>H||y-r>76&&y+r<H-88)return;p.moveTo(x+r,y);p.arc(x,y,r,0,Math.PI*2);};
 protect(e.player.x,e.renderPlayerY??e.player.y,19);
 for(const orb of e._companionViews||[])if(Number.isFinite(orb.x)&&Number.isFinite(orb.y))protect(orb.x,orb.y,11);
 for(const spark of e.layout.embers||[])if(!spark.collected&&!spark.carried){const x=spark.x-distance;if(x<-70||x>W+70)continue;protect(x,spark.y,sparkBodyRadius(spark,H)+1);}
 p.fill();p.globalCompositeOperation='source-over';
 c.save();c.globalAlpha=1;c.globalCompositeOperation='source-over';c.imageSmoothingEnabled=false;c.drawImage(ink.canvas,0,0);c.restore();
}
export function releaseTerrainForeground(engine){const ink=foregroundInk.get(engine);if(ink)ink.canvas.width=ink.canvas.height=1;foregroundInk.delete(engine);}
