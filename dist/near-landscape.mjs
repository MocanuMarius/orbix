// Decorative parallax plates. Built during scene loading, never registered as
// land, hazards or pickups. Native-size texture crops retain the world's texels.
const noise=n=>{let h=Math.imul(n|0,1597334677);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
const colors={
 moonruins:['#273432','#38483e','#4c5d4b','#69765b'],pinewood:['#21372d','#354c39','#4a6546','#718358'],
 marsh:['#243d38','#3c5442','#586e4b','#87925e'],thorn:['#293a2f','#41513a','#61744c','#8b9464'],
 fungal:['#302b3c','#4c3f50','#76617b','#a18a9d'],frost:['#2c414a','#435c64','#66838a','#9db5b8'],
 basalt:['#352e36','#4c4249','#68565b','#8a7368'],desert:['#433b33','#5a5040','#807052','#a4926c'],
 coral:['#303e46','#514a5a','#7b657e','#a28c9f'],crystal:['#302f45','#4c475f','#716a8a','#a49cbb'],
 cloud:['#33474b','#4f6463','#7a9182','#a9b7a0'],cemetery:['#2b3938','#43544a','#65776a','#8c9b83'],
};
const wooded=new Set(['pinewood','marsh','thorn','moonruins','cemetery','cloud']);
export function createNearLandscape(document,{biome,texture,patch,plants=[],variant=0}){
 const inks=colors[biome]||colors.pinewood,plates=[];
 let biomeSeed=0;for(const letter of biome)biomeSeed=Math.imul(biomeSeed,31)+letter.charCodeAt(0)|0;
 for(let depth=0;depth<2;depth++){
  const tiles=[];
  for(let tile=0;tile<3;tile++){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=210;
   const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
   const seed=biomeSeed+variant*7919+depth*1427+tile*913;
   const box=(x,y,w,h,ink)=>{c.fillStyle=ink;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
   const poly=(points,ink)=>{c.fillStyle=ink;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();};
   const line=(points,ink,w=1)=>{c.strokeStyle=ink;c.lineWidth=w;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke();};
   const foliage=(x,y,s)=>{
    const arid=['frost','basalt','desert','crystal'].includes(biome);
    const stems=arid?4:7,height=arid?10+noise(s)*12:20+noise(s)*28;
    for(let j=0;j<stems;j++){
     const bend=(j-stems*.5)*3,xx=x+bend,hh=height*(.45+noise(s+j*83)*.55);
     line([[xx,y],[xx+bend*.25,y-hh*.45],[xx+bend*.7,y-hh]],j%2?inks[2]:inks[1]);
     if(biome==='fungal'){
      const cap=4+noise(s+j)*6;
      poly([[xx-cap,y-hh+1],[xx-cap*.7,y-hh-4],[xx,y-hh-6],[xx+cap,y-hh-1],[xx+cap-1,y-hh+2]],j%2?inks[2]:inks[3]);
      box(xx-2,y-hh-2,2,1,inks[1]);
     }else if(biome==='marsh')box(xx+bend*.7-1,y-hh-3,2,6,inks[3]);
     else if(!arid)for(let leaf=1;leaf<4;leaf++){
      const yy=y-hh*leaf/4,spread=(1-leaf/5)*7;
      poly([[xx,yy+2],[xx-spread,yy-4],[xx-2,yy-2],[xx+spread,yy-6],[xx+3,yy+1]],j%2?inks[2]:inks[1]);
     }
    }
   };
   // Two substantial, asymmetrical islands per plate, with an open gap between
   // them. Their lower faces terminate naturally rather than at a rectangle.
   for(let island=0;island<2;island++){
    const s=seed+island*227,x=14+island*258+noise(s)*14,w=180+noise(s+1)*56;
    const y=94+noise(s+2)*24+(depth?8:0),body=50+noise(s+3)*35;
    const crest=[];
    for(let j=0;j<=12;j++){
     const u=j/12;
     crest.push([x+u*w,y-Math.sin(Math.PI*u)*(10+noise(s+4)*17)+(noise(s+j*31)-.5)*5]);
    }
    const shape=[...crest,[x+w-9,y+body*.28],[x+w*.82,y+body*.56],[x+w*.66,y+body*.63],
     [x+w*.55,y+body],[x+w*.39,y+body*.72],[x+w*.20,y+body*.59],[x+8,y+body*.23]];
    poly(shape,inks[0]);
    c.save();c.beginPath();shape.forEach(([xx,yy],j)=>j?c.lineTo(xx,yy):c.moveTo(xx,yy));c.closePath();c.clip();
    if(texture){
     const [sx,sy,sw,sh]=patch;c.globalAlpha=.44;
     for(let yy=y-35;yy<y+body;yy+=sh)for(let xx=x;xx<x+w;xx+=sw)c.drawImage(texture,sx,sy,sw,sh,xx,yy,sw,sh);
     c.globalAlpha=1;
    }
    poly([[x+w*.32,y],[x+w*.62,y+9],[x+w*.58,y+body],[x+w*.36,y+body*.7]],inks[1]);
    // Broken strata and fracture planes have the scale of land, rather than
    // magnifying the tiny boulder texture into a floating pebble.
    for(let band=0;band<5;band++){
     const yy=y+band*12;
     line([[x-4,yy],[x+w*.35,yy+2],[x+w*.69,yy-3],[x+w+4,yy+2]],band%2?inks[1]:inks[0],2);
    }
    for(let k=0;k<6;k++){
     const xx=x+noise(s+k*97)*w,yy=y+noise(s+k*61)*body*.7;
     line([[xx,yy],[xx-4,yy+9],[xx-2,yy+15]],inks[0],2);
     box(xx+2,yy+5,3,1,inks[2]);
    }
    c.restore();
    // A broken, mossy soil cap: deliberately no continuous bright collision rim.
    for(let j=1;j<crest.length-2;j++){
     const [xx,yy]=crest[j];
     if(noise(s+j*43)>.18)box(xx-3,yy+2,8+noise(j+s)*8,3,biome==='frost'?inks[3]:inks[1]);
     if(wooded.has(biome)||biome==='fungal'||biome==='coral'){
      line([[xx,yy+body*.25],[xx-2,yy+body*.55],[xx+2,yy+body*.75+noise(j+s)*14]],inks[1],2);
      if(j%2===0)line([[xx,yy+body*.47],[xx+6,yy+body*.58]],inks[2]);
     }
    }
    // Ground cover has several silhouettes and overlapping scales, not one fern
    // repeated at equal intervals. Existing licensed sprites supply shaded clumps.
    const density=wooded.has(biome)||['fungal','coral'].includes(biome)?10:6;
    for(let j=0;j<density;j++){
     const u=(j+.4+noise(s+j*47)*.3)/density,idx=Math.min(11,Math.floor(u*12));
     const a=crest[idx],b=crest[idx+1],yy=a[1]+(b[1]-a[1])*(u*12-idx),xx=x+u*w;
     const plant=plants[(j+tile+island)%plants.length];
     if(plant&&j%3!==1){
      const [sx,sy,sw,sh]=plant.rect,h=20+noise(s+j*19)*25;
      c.globalAlpha=.88;c.drawImage(plant.image,sx,sy,sw,sh,Math.round(xx-sw*h/sh/2),Math.round(yy-h+3),Math.round(sw*h/sh),Math.round(h));c.globalAlpha=1;
     }
     foliage(xx,yy+2,s+j*257);
     if(j%3===1)poly([[xx-8,yy+2],[xx-6,yy-6],[xx+2,yy-9],[xx+9,yy-3],[xx+6,yy+4]],inks[1]);
    }
    if(['pinewood','thorn','marsh'].includes(biome)){
     // Tangled fallen wood and a scrub crown diversify the large silhouettes.
     const xx=x+w*.58,yy=crest[7][1];
     line([[xx-26,yy-3],[xx-4,yy-12],[xx+21,yy-8]],inks[0],7);
     line([[xx-4,yy-12],[xx-9,yy-31],[xx-3,yy-48]],inks[0],5);
     for(let k=0;k<5;k++){
      const bx=xx-3+(k-2)*12,by=yy-42-(k%2)*8;
      poly([[bx-13,by+9],[bx-16,by],[bx-6,by-8],[bx+5,by-10],[bx+15,by-2],[bx+12,by+10]],k%2?inks[1]:inks[0]);
      box(bx-6,by-5,7,2,inks[2]);
     }
    }else if(['moonruins','cemetery'].includes(biome)){
     const xx=x+w*.52,yy=crest[6][1];
     poly([[xx-10,yy],[xx-8,yy-34],[xx+1,yy-38],[xx+8,yy-30],[xx+8,yy]],inks[1]);
     line([[xx-5,yy-29],[xx+2,yy-27],[xx-1,yy-16]],inks[0],2);
    }else if(['frost','crystal','basalt'].includes(biome)){
     const xx=x+w*.55,yy=crest[6][1];
     poly([[xx-14,yy],[xx-9,yy-24],[xx-2,yy-38],[xx+7,yy-25],[xx+13,yy]],inks[1]);
     poly([[xx-2,yy-38],[xx+7,yy-25],[xx+13,yy],[xx+1,yy-4]],inks[2]);
    }
   }
   tiles.push(canvas);
  }
  plates.push({tiles,speed:depth?.78:.54,alpha:depth?.57:.38,yOffset:depth?-20:-45});
 }
 return plates;
}

export function drawNearLandscapePlates(c,plates,{width,height,distance,scale=1,variant=0}){
 c.save();c.imageSmoothingEnabled=false;
 for(let depth=0;depth<plates.length;depth++){
  const p=plates[depth],span=p.tiles[0].width,scroll=distance*p.speed;
  const first=Math.floor(scroll/span)-1,last=Math.ceil((scroll+width)/span);
  c.globalAlpha=p.alpha;
  for(let i=first;i<=last;i++){
   const tile=p.tiles[Math.floor(noise(i*313+variant*71+depth*191)*p.tiles.length)];
   const x=(i*span-scroll)*scale,y=(height-tile.height+p.yOffset)*scale;
   c.drawImage(tile,Math.round(x),Math.round(y),Math.round(tile.width*scale),Math.round(tile.height*scale));
  }
 }
 c.restore();
}
