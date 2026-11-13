// Small repeating pixel plates: rasterized once, translated at separate depths.
// No outlines or collision geometry: these shapes always sit behind playable terrain.
export function createDepthScenery(document,height,terrain,palette){
 return [.07,.18,.36].map((speed,layer)=>{
  const tile=document.createElement('canvas');tile.width=384;tile.height=height;
  const c=tile.getContext('2d');c.imageSmoothingEnabled=false;
  const poly=points=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  c.fillStyle=[palette.far,palette.middle,palette.near][layer];
  for(let i=0;i<6;i++){
   const x=18+i*64+(i%2)*9,base=Math.round(height*(.78+layer*.09)),h=18+((i*19+layer*13)%37),w=10+layer*3;
   if(terrain==='canopy'){
    c.fillRect(x,base-h,3+layer, h+20);
    poly([[x-w,base-h+8],[x-5,base-h-12],[x+5,base-h-20],[x+w+8,base-h+3],[x+w,base-h+15]]);
    c.fillRect(x-8,base-h+18,10,3);c.fillRect(x+2,base-h+10,13,3);
   }else if(terrain==='ruins'){
    c.fillRect(x,base-h,w,h+20);c.fillRect(x-3,base-h-3,w+6,4);
    if(i%2===0){c.fillRect(x+w,base-h+5,20,5);c.fillRect(x+w+16,base-h+5,5,h+15);}
   }else{
    poly([[x-w,base+20],[x-w+3,base-h*.4],[x-2,base-h],[x+5,base-h+5],[x+w,base+20]]);
    poly([[x+12,base+20],[x+17,base-h*.65],[x+24,base-h*.4],[x+32,base+20]]);
   }
   // A sparse upper hanging silhouette helps convey speed in open passages.
   if(layer===2&&i%2===0)poly([[x,0],[x+16,0],[x+11,9+h*.2],[x+6,5]]);
  }
  return {tile,speed,alpha:[.23,.30,.36][layer]};
 });
}
export function drawDepthScenery(c,layers,distance,width){
 c.save();
 for(const layer of layers){const offset=(distance*layer.speed)%layer.tile.width;c.globalAlpha=layer.alpha;
  for(let x=-offset;x<width;x+=layer.tile.width)c.drawImage(layer.tile,x,0);
 }
 c.restore();
}
