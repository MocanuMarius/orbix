// Distant location silhouettes, cached by the renderer and masked by the same
// dynamic light field as the rest of the landscape. No new live particle loop.
export function drawExpandedBackdrop(c,{identity,width:W,height:H,distance,palette:p},h){
 const scene=identity.scene;if(!['mill','cloister','spores','mangrove','causeway','basalt'].includes(scene))return false;
 const {line,polygon}=h,fill=(points,ink)=>{c.fillStyle=ink;polygon(c,points);c.fill()},scroll=distance*.025;
 c.save();c.globalAlpha=.72;
 if(scene==='mill'){
  const x=W*.62-scroll*.25,y=H*.75;
  c.fillStyle=p.far;c.fillRect(x-42,y-55,62,65);fill([[x-52,y-55],[x-12,y-86],[x+29,y-55]],p.middle);
  c.fillStyle=p.sky[1];c.fillRect(x-28,y-36,10,18);c.fillRect(x-4,y-36,10,18);
  for(let j=0;j<12;j++){const a=j*Math.PI/6,b=(j+1)*Math.PI/6,r=32;line(c,x+32,y-4,x+32+Math.cos(a)*r,y-4+Math.sin(a)*r,p.middle,2);line(c,x+32+Math.cos(a)*r,y-4+Math.sin(a)*r,x+32+Math.cos(b)*r,y-4+Math.sin(b)*r,p.middle,4);}
  fill([[0,H],[0,y+24],[W,y+8],[W,H]],p.far);
  for(let j=0;j<8;j++)line(c,(j*47-scroll*.6)%(W+40),y+26+j*5,(j*47-scroll*.6)%(W+40)+28,y+26+j*5,p.middle);
 }else if(scene==='cloister'){
  const stride=57,offset=scroll*.65,y=H*.82;
  for(let j=-1;j<W/stride+1;j++){const x=j*stride-offset%stride;c.fillStyle=p.far;c.fillRect(x,y-105,12,120);c.fillRect(x-3,y-108,18,7);line(c,x+8,y-102,x+30,y-126,p.middle,4);line(c,x+30,y-126,x+60,y-102,p.middle,4);if(j%3!==0)line(c,x,y-130,x+57,y-130,p.far,7);}
  fill([[0,H],[0,y],[W,y+12],[W,H]],p.far);for(let j=0;j<5;j++)line(c,0,y+j*7,W,y+j*7+12,p.middle);
 }else if(scene==='spores'){
  for(let j=-1;j<5;j++){const x=j*73-scroll*.7%73+30,y=H*(.73+(j%2)*.08),r=24+(j%3)*5;
   fill([[x-6,H],[x+7,H],[x+4,y],[x-3,y]],p.far);
   fill([[x-r,y],[x-r*.8,y-14],[x-7,y-23],[x+11,y-20],[x+r,y-4],[x+r*.8,y+4],[x-r*.6,y+5]],p.middle);
   line(c,x-r*.7,y+2,x+r*.7,y+1,p.far,2);c.fillStyle=p.grain;c.globalAlpha=.34;for(let k=0;k<3;k++)c.fillRect(x-12+k*10,y-8-(k%2)*5,2,2);c.globalAlpha=.72;}
 }else if(scene==='mangrove'){
  const y=H*.79;for(let j=-1;j<5;j++){const x=j*78-scroll*.65%78;
   line(c,x,y-84,x+7,y-15,p.middle,9);line(c,x+7,y-15,x-24,y+35,p.middle,4);line(c,x+7,y-15,x+30,y+35,p.middle,4);
   line(c,x,y-62,x-24,y-87,p.middle,5);line(c,x+2,y-55,x+29,y-78,p.middle,5);
   fill([[x-33,y-87],[x-21,y-112],[x+4,y-120],[x+34,y-94],[x+25,y-78],[x-13,y-82]],p.far);
   if(j%2===0){c.fillStyle=p.far;c.fillRect(x+31,y-12,31,23);fill([[x+25,y-12],[x+47,y-28],[x+67,y-12]],p.middle);line(c,x+35,y+9,x+35,y+38,p.middle,3);line(c,x+58,y+9,x+58,y+38,p.middle,3);}}
  for(let j=0;j<6;j++)line(c,0,y+30+j*6,W,y+28+j*6,p.far);
 }else if(scene==='causeway'){
  const y=H*.66;for(let j=-1;j<4;j++){const x=j*100-scroll*.45%100;
   fill([[x,H],[x+4,y+15],[x+20,y],[x+35,y+9],[x+38,H]],p.far);
   line(c,x-12,y-4,x+45,y-4,p.middle,6);line(c,x+45,y-4,x+64,y+9,p.middle,3);
   if(j%2===0){line(c,x+5,y-7,x+5,y-33,p.middle,2);line(c,x+5,y-31,x+25,y-27,p.middle,2);}}
  c.globalAlpha=.22;for(let j=0;j<4;j++){const x=j*85-scroll*.2%85;line(c,x,H*.43+j*9,x+60,H*.43+j*9,p.mist,3);}
 }else if(scene==='basalt'){
  for(let j=-1;j<W/19+2;j++){const x=j*19-scroll*.5%19,y=H*(.63+Math.sin(j*1.7)*.13);
   fill([[x,H],[x,y+8],[x+8,y],[x+17,y+5],[x+17,H]],p.far);line(c,x+8,y+2,x+8,H,p.middle,2);
   if(j%3===0)fill([[x,0],[x+16,0],[x+16,H*.18],[x+8,H*.22],[x,H*.18]],p.far);}
 }
 c.restore();return true;
}
