import {pineCrown} from './pixel-contour.mjs?v=guardian-currents-1';
// Original pixel scenery. Backdrops and solid materials are rasterized by the
// existing renderer caches; only a few matte weather pixels animate each frame.
// Nothing here emits light or draws outside the simulation's solid silhouettes.
const PALETTES = {
 moonruins:{sky:['#10171d','#1c262d','#303c40'],far:'#26323a',middle:'#374449',near:'#48524f',stone:'#3c413b',shade:'#272f2e',face:'#55574a',grain:'#807e67',rim:'#bcb39a',mist:'#82918d'},
 frost:{sky:['#101b28','#1d3343','#395363'],far:'#263e50',middle:'#3c5665',near:'#4c6a76',stone:'#3c5867',shade:'#263e50',face:'#607d86',grain:'#88a7b0',rim:'#b4d9e2',mist:'#8da9b8'},
 pinewood:{sky:['#101a18','#1b2d27','#2f4333'],far:'#25382d',middle:'#354b38',near:'#486044',stone:'#383e2c',shade:'#252d24',face:'#555b3b',grain:'#77815b',rim:'#a3b68b',mist:'#7d9279'},
 marsh:{sky:['#111c20','#1c3336','#354b48'],far:'#29423f',middle:'#3a5550',near:'#52675a',stone:'#394a3c',shade:'#25382f',face:'#53634a',grain:'#7c8860',rim:'#a7b88c',mist:'#8da898'},
 fungal:{sky:['#191423','#2d253a','#43384c'],far:'#372c44',middle:'#4b3b54',near:'#5c4d63',stone:'#433a4c',shade:'#2d2936',face:'#645467',grain:'#927b99',rim:'#c2a9ca',mist:'#aa95ad'},
 basalt:{sky:['#201619','#39242b','#51323b'],far:'#3c2b35',middle:'#523841',near:'#62434a',stone:'#3b343c',shade:'#28242c',face:'#57505a',grain:'#82717c',rim:'#bc9b93',mist:'#a38386'},
 desert:{sky:['#201b20','#38303a','#52434a'],far:'#403640',middle:'#5a4748',near:'#6a5551',stone:'#55473a',shade:'#382f2c',face:'#77624c',grain:'#a48a66',rim:'#c8b18b',mist:'#ac9987'},
 coral:{sky:['#111d27','#203640','#344e57'],far:'#2d414b',middle:'#415962',near:'#56656a',stone:'#4c4547',shade:'#30343c',face:'#6d5f60',grain:'#9c8580',rim:'#c6aaa3',mist:'#90a9af'},
 crystal:{sky:['#171624','#2a2940','#40425a'],far:'#302f48',middle:'#46465e',near:'#5b5a71',stone:'#403d58',shade:'#292b43',face:'#625c7b',grain:'#8c82a8',rim:'#c6bcdf',mist:'#a59fba'},
 cloud:{sky:['#16212d','#2e4050','#4b5e6a'],far:'#3c5060',middle:'#526775',near:'#6b7d85',stone:'#49545a',shade:'#303d46',face:'#65767b',grain:'#8ea1a4',rim:'#b9c9d0',mist:'#a7bec8'},
 thorn:{sky:['#161b1c','#293431','#424a3d'],far:'#303c35',middle:'#465143',near:'#5a6350',stone:'#3d4030',shade:'#292e25',face:'#5a5d42',grain:'#7f8560',rim:'#a4b28e',mist:'#919982'},
 cemetery:{sky:['#171b22','#292f3a','#42494e'],far:'#323d42',middle:'#465258',near:'#5b6465',stone:'#414744',shade:'#2c3433',face:'#606962',grain:'#869189',rim:'#b8c1b5',mist:'#9aa8a3'},
};
const idOf = identity => identity?.biomeId || (PALETTES[identity?.scene] ? identity.scene : null);
export const biomePalette = identity => PALETTES[idOf(identity)] || {};
const n = (x,seed=0) => {let v=Math.imul((x|0)^seed,1597334677);v=Math.imul(v^v>>>13,1274126177);return((v^v>>>16)>>>0)/4294967296;};
const seedOf = text => {let h=2166136261;for(const ch of String(text))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};

export function drawBiomeBackground(c,{identity,width:W,height:H,distance=0,palette:p},h){
 const biome=idOf(identity);if(!biome)return false;
 const variant=(identity.variant||0)%4,seed=seedOf(identity.id),scroll=distance*.025;
 const box=(x,y,w,hh,ink)=>{c.fillStyle=ink;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(hh));};
 const poly=(points,ink)=>{c.fillStyle=ink;h.polygon(c,points.map(([x,y])=>[Math.round(x),Math.round(y)]));c.fill();};
 const line=(x,y,xx,yy,ink,width=1)=>h.line(c,x,y,xx,yy,ink,width);
 const pine=(x,y,hh,w,ink)=>poly(pineCrown(x,y,w,hh),ink);
 const root=(x,y,hh,ink,willow=false)=>{line(x,y,x+3,y-hh*.5,ink,3);line(x+3,y-hh*.5,x-2,y-hh,ink,3);for(let k=-1;k<=1;k+=2){line(x+1,y-hh*.6,x+k*17,y-hh*.85,ink,2);line(x+k*17,y-hh*.85,x+k*24,y-hh*.67,ink,2);if(willow)for(let t=0;t<4;t++)line(x+k*(12+t*4),y-hh*.82,x+k*(14+t*4),y-hh*(.28+t*.08),ink);}};
 const stone=(x,y,hh,w,ink)=>poly([[x-w,y],[x-w*.75,y-hh*.7],[x-w*.2,y-hh],[x+w*.62,y-hh*.89],[x+w,y]],ink);
 c.save();c.globalAlpha=.74;
 // Both layers use the same slow cached parallax as the existing scenery.
 for(let layer=0;layer<2;layer++){
  const span=layer?112:151,offset=scroll*(layer?1.12:.49),first=Math.floor(offset/span),ink=layer?p.middle:p.far;
  for(let i=-1;i<W/span+1;i++){
   const index=first+i,x=Math.round(i*span-offset%span),j=n(index,seed),y=H*(layer?.96:.79),hh=H*(.25+j*.24),v=(index+variant+40)%4;
   if(biome==='moonruins'){
    const base=y-(v===1?13:0);box(x-8,base,span+10,H-base+8,ink);
    for(let pier=0;pier<4;pier++){const px=x+pier*29;box(px,base-hh*.66,6,hh*.66,ink);box(px-2,base-hh*.69,10,3,ink);if((pier+v)%4!==2){line(px+5,base-hh*.61,px+14,base-hh*.82,ink,3);line(px+14,base-hh*.82,px+29,base-hh*.61,ink,3);}}
    if(v===0||v===3){box(x+43,base-hh*1.36,24,hh*.71,ink);poly([[x+40,base-hh*1.36],[x+55,base-hh*1.61],[x+70,base-hh*1.36]],ink);box(x+54,base-hh*1.72,2,5,ink);}
    if(layer)for(let stair=0;stair<5;stair++)box(x+span-26+stair*4,base-20+stair*4,7,24-stair*4,p.near);
   }else if(biome==='frost'){
    const peak=y-hh*(v===2?1.45:1);poly([[x-28,y+10],[x+3,peak+13],[x+20,peak],[x+33,peak+18],[x+57,y-hh*.45],[x+88,y+12]],ink);
    poly([[x+3,peak+13],[x+20,peak],[x+33,peak+18],[x+24,peak+11],[x+15,peak+17],[x+10,peak+11]],layer?p.near:p.middle);
    if(layer){line(x+20,peak+4,x+26,y-2,p.far);line(x+26,peak+15,x+13,y-hh*.3,p.far);box(x+55,y-3,35,2,p.near);box(x+71,y+2,23,1,p.far);}
    if(v===1)poly([[x+67,y+4],[x+73,y-13],[x+83,y-18],[x+96,y+4]],ink);
   }else if(biome==='pinewood'){
    for(let tree=0;tree<3;tree++){const tx=x+tree*39,ht=hh*(.9+n(tree+index,seed+8)*.8);pine(tx,y,ht,15+tree*2,ink);if(layer)line(tx,y-ht*.37,tx-5,y,p.far);}
    if(v===2){box(x+34,y-16,28,16,ink);poly([[x+29,y-15],[x+48,y-29],[x+67,y-15]],ink);box(x+56,y-31,4,12,ink);}
    if(layer){line(x-4,y-2,x+91,y+1,p.near,3);line(x+20,y-4,x+30,y-12,p.near,2);}
   }else if(biome==='marsh'){
    box(x,y+4,span,2,ink);root(x+20,y,hh,ink,true);if(v!==1)root(x+91,y+5,hh*.72,ink,true);
    if(v===1||v===3){box(x+48,y-16,29,3,ink);line(x+51,y-16,x+48,y+8,ink,2);line(x+74,y-16,x+77,y+8,ink,2);poly([[x+43,y-22],[x+61,y-33],[x+82,y-22]],ink);box(x+48,y-22,28,8,ink);}
    for(let reed=0;reed<5;reed++){const rx=x+40+reed*7;line(rx,y+4,rx-3,y-5-reed%3*4,ink);box(rx-4,y-8-reed%3*4,2,4,ink);}
    if(layer){box(x+5,y+9,23,1,p.near);box(x+43,y+13,52,1,p.near);}
   }else if(biome==='fungal'){
    for(let cap=0;cap<3;cap++){const mx=x+cap*40,ht=hh*(cap===1?1.2:.65),my=y-ht,r=cap===1?27:18;line(mx,y,mx+3,my+7,ink,5);poly([[mx-r,my+7],[mx-r*.8,my-3],[mx-5,my-13],[mx+9,my-11],[mx+r,my+3],[mx+r-3,my+9]],ink);if(layer){line(mx-r+4,my+8,mx+r-5,my+8,p.near);for(let g=-2;g<=2;g++)line(mx+g*5,my+8,mx+g*2,my+14,p.far);}}
    if(v===3)for(let chain=0;chain<3;chain++)line(x+chain*34,0,x+chain*34+6,hh*.8,ink,2);
   }else if(biome==='basalt'){
    for(let col=0;col<7;col++){const cx=x+col*17,ch=hh*(.42+n(index*7+col,seed)*.85);poly([[cx,y+12],[cx,y-ch+4],[cx+7,y-ch],[cx+17,y-ch+4],[cx+17,y+12]],ink);if(layer){line(cx+5,y-ch+5,cx+5,y+10,p.far);line(cx+15,y-ch+5,cx+15,y-4,p.near);}}
    if(v===1&&!layer)poly([[x-18,y],[x+22,y-hh*1.45],[x+36,y-hh*1.45],[x+44,y-hh*1.2],[x+55,y-hh*1.4],[x+105,y]],ink);
    if(layer)for(let crack=0;crack<3;crack++)box(x+crack*31,y-crack*4,14,1,'#76504c');
   }else if(biome==='desert'){
    poly([[x-27,y+15],[x-3,y-hh*.23],[x+20,y-hh*.37],[x+49,y-hh*.27],[x+83,y+4],[x+span+20,y+15]],ink);
    if(v!==2){poly([[x+14,y-hh*.24],[x+20,y-hh],[x+49,y-hh*1.02],[x+53,y-hh*.72],[x+67,y-hh*.70],[x+83,y+6]],ink);if(layer){line(x+23,y-hh*.79,x+51,y-hh*.79,p.near);line(x+19,y-hh*.48,x+62,y-hh*.49,p.far);}}
    else{box(x+31,y-hh*.65,27,hh*.56,ink);poly([[x+26,y-hh*.65],[x+45,y-hh*.94],[x+65,y-hh*.65]],ink);box(x+44,y-hh*.45,5,13,p.far);}
    if(layer)line(x-10,y+3,x+78,y+9,p.near);
   }else if(biome==='coral'){
    for(let coral=0;coral<3;coral++){const cx=x+coral*42,ht=hh*(.5+coral*.2);line(cx,y,cx+4,y-ht,ink,4);for(let branch=0;branch<3;branch++){const by=y-ht*(.3+branch*.24),sgn=branch%2?-1:1;line(cx+3,by,cx+sgn*(15-branch*2),by-12,ink,3);line(cx+sgn*(15-branch*2),by-12,cx+sgn*(18-branch*2),by-22,ink,2);}}
    if(v===2){poly([[x+12,y-4],[x+64,y-1],[x+52,y+10],[x+24,y+9]],ink);line(x+38,y+3,x+34,y-hh*.7,ink,2);line(x+34,y-hh*.7,x+55,y-hh*.39,ink);}
    if(layer)for(let shell=0;shell<4;shell++)poly([[x+shell*29,y+4],[x+shell*29+4,y-1],[x+shell*29+11,y+4]],p.near);
   }else if(biome==='crystal'){
    for(let shard=0;shard<4;shard++){const cx=x+shard*29,ht=hh*(.45+n(index+shard,seed+1)*1.15),bw=10+shard%2*3;poly([[cx-bw,y],[cx-bw,y-ht*.72],[cx,y-ht],[cx+bw,y-ht*.74],[cx+bw,y]],ink);if(layer){line(cx,y-ht+2,cx,y-1,p.near);line(cx-bw,y-ht*.72,cx,y-ht*.63,p.far);}}
    if(v===0||v===3)for(let shard=0;shard<3;shard++)poly([[x+shard*36,0],[x+shard*36+17,0],[x+shard*36+9,hh*.75]],ink);
   }else if(biome==='cloud'){
    const base=H*(.4+j*.26),ww=45+v*9;poly([[x,base],[x+ww,base],[x+ww*.8,base+11],[x+ww*.48,base+hh*.8],[x+ww*.22,base+15]],ink);box(x-3,base-4,ww+7,5,ink);
    if(v===1||v===3){box(x+14,base-hh*.48,7,hh*.48,ink);box(x+10,base-hh*.50,15,3,ink);line(x+17,base-hh*.48,x+38,base-hh*.54,ink,2);}
    if(layer){line(x+4,base+1,x+ww-4,base+1,p.near);box(x+30,base+hh*.9,54,2,p.far);box(x-18,base+hh*.6,39,3,p.far);}
   }else if(biome==='thorn'){
    for(let vine=0;vine<3;vine++){const vx=x+vine*42,ht=hh*(.8+vine*.25);line(vx-5,y,vx+11,y-ht*.5,ink,5);line(vx+11,y-ht*.5,vx-3,y-ht,ink,4);line(vx-3,y-ht,vx+20,y-ht*1.1,ink,2);for(let spine=0;spine<4;spine++){const yy=y-ht*(.15+spine*.22),xx=vx+(spine%2?8:0);poly([[xx-2,yy],[xx+13,yy-10],[xx+4,yy+2]],ink);}}
    if(v===2){line(x+3,y-hh*.6,x+28,y-hh*1.12,ink,3);line(x+28,y-hh*1.12,x+52,y-hh*.6,ink,3);}
   }else if(biome==='cemetery'){
    poly([[x-10,y+14],[x+21,y-2],[x+59,y+1],[x+span+10,y+12]],ink);
    for(let grave=0;grave<5;grave++){const gx=x+grave*24,gh=10+(grave+v)%3*6;box(gx,y-gh,6,gh+7,ink);if((grave+v)%2)box(gx-4,y-gh+5,14,3,ink);else poly([[gx-1,y-gh+2],[gx+3,y-gh-2],[gx+7,y-gh+2]],ink);}
    if(v===1||v===3){box(x+40,y-hh*.9,29,hh*.9,ink);poly([[x+34,y-hh*.88],[x+54,y-hh*1.2],[x+75,y-hh*.88]],ink);box(x+54,y-hh*1.38,2,9,ink);box(x+50,y-hh*1.32,10,2,ink);if(layer)box(x+51,y-hh*.57,7,hh*.57,p.far);}
   }
  }
 }
 c.restore();return true;
}

// Relief is clipped to the real collision polygon by the caller. Larger strata,
// bark, ice planes and fossils identify materials before the sparse pixel grain.
export function drawBiomeMaterial(c,{identity,surface,top,palette:p,width:W,height:H,obstacle,hardEntry},h){
 const biome=idOf(identity);if(!biome)return false;
 const seed=seedOf(identity.id+':'+obstacle.id+':'+top),sign=top?-1:1;
 const at=x=>{for(let i=1;i<surface.length;i++){const a=surface[i-1],b=surface[i];if(x>=Math.min(a[0],b[0])&&x<=Math.max(a[0],b[0])&&a[0]!==b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}return surface[Math.floor(surface.length/2)][1];};
 const line=(x,y,xx,yy,ink,w=1)=>h.line(c,x,y,xx,yy,ink,w);
 const box=(x,y,w,hh,ink)=>{c.fillStyle=ink;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(hh));};
 const poly=(points,ink)=>{c.fillStyle=ink;h.polygon(c,points);c.fill();};
 if(biome==='moonruins'||biome==='cemetery'){
  for(let row=0,y=0;y<H;y+=10,row++)for(let x=-(row%2)*11;x<W;x+=22){box(x+1,y+1,20,8,n(x+y,seed)>.3?p.face:p.stone);line(x+2,y+2,x+16,y+2,p.grain);}
  for(let x=15;x<W;x+=53){const y=at(x)+sign*30;line(x,y-6,x-5,y+3,p.shade,2);line(x-5,y+3,x+1,y+12,p.shade);if(biome==='cemetery'){line(x+17,y-8,x+17,y+10,p.grain,2);line(x+12,y-3,x+22,y-3,p.grain);}}
 }else if(biome==='frost'||biome==='crystal'){
  for(let x=-10;x<W;x+=22){const y=at(x)+sign*2,depth=37+n(x,seed)*72,tip=[x+8,y+sign*depth];poly([[x,y],[x+21,at(x+21)+sign*5],tip],p.face);poly([[x+21,at(x+21)+sign*5],[x+27,y+sign*(depth*.75)],tip],p.shade);line(x+1,y+sign*3,...tip,p.grain);if(biome==='frost'){line(x+2,y+sign*17,x+12,y+sign*27,p.shade);line(x+12,y+sign*27,x+8,y+sign*46,p.shade);}}
  for(let i=1;i<surface.length;i++){const a=surface[i-1],b=surface[i];line(a[0],a[1]+sign*2,b[0],b[1]+sign*2,biome==='frost'?'#bdcdd0':p.grain,biome==='frost'?3:1);}
 }else if(biome==='basalt'){
  for(let x=0;x<W;x+=16){const y=at(x);box(x+2,Math.min(y,y+sign*160),11,160,p.face);line(x,y,x,y+sign*160,p.shade,2);line(x+13,y+sign*5,x+13,y+sign*150,p.grain);for(let d=15;d<130;d+=24)line(x+2,y+sign*d,x+12,y+sign*(d+4),p.shade);if(n(x,seed)>.67){line(x+1,y+sign*14,x+1,y+sign*43,'#95614f');line(x+1,y+sign*43,x+5,y+sign*51,'#95614f');}}
 }else if(biome==='desert'||biome==='cloud'){
  const step=biome==='desert'?8:13;for(let d=4;d<170;d+=step){let prev=[0,at(0)+sign*d];for(let x=10;x<=W+10;x+=10){const next=[x,at(x)+sign*(d+Math.sin(x*.04+d*.1)*3)];line(...prev,...next,d%3?p.face:p.grain,biome==='desert'?2:1);prev=next;}}
  for(let x=7;x<W;x+=31){const y=at(x)+sign*23;line(x,y,x+4,y+sign*21,p.shade);if(biome==='cloud')box(x+10,y+sign*6,3,2,p.shade);}
 }else if(biome==='pinewood'||biome==='thorn'){
  for(let x=-6;x<W;x+=11){let prev=[x,at(x)+sign*2];for(let d=7;d<150;d+=7){const xx=x+Math.sin(d*(biome==='thorn'?.07:.035)+x*.06)*(biome==='thorn'?10:5),yy=at(x)+sign*d;line(...prev,xx,yy,p.shade,3);line(prev[0]+2,prev[1],xx+2,yy,p.face);prev=[xx,yy];}if(n(x,seed)>.58){const yy=at(x)+sign*35;poly([[x,yy],[x+8,yy+sign*8],[x+2,yy+sign*19],[x-4,yy+sign*8]],p.grain);poly([[x,yy+sign*4],[x+4,yy+sign*9],[x,yy+sign*14]],p.shade);}}
 }else if(biome==='marsh'){
  for(let d=5;d<150;d+=13){line(0,at(0)+sign*d,W,at(W)+sign*(d+8),d%2?p.face:p.shade,3);}
  for(let x=2;x<W;x+=17){const y=at(x);line(x,y+sign*2,x+8,y+sign*52,p.shade,3);line(x+8,y+sign*52,x+2,y+sign*73,p.shade,2);box(x+3,y+sign*11,8,2,p.grain);}
 }else if(biome==='coral'||biome==='fungal'){
  for(let x=8;x<W;x+=20){const y=at(x)+sign*(12+n(x,seed)*15);for(let d=0;d<130;d+=25){const yy=y+sign*d,ox=x+Math.sin(d*.1)*6;poly([[ox-4,yy],[ox,yy-4],[ox+6,yy],[ox+3,yy+6],[ox-3,yy+5]],p.face);box(ox-1,yy-1,3,3,p.shade);if(biome==='fungal'){line(ox+3,yy+5,ox+10,yy+13,p.grain);line(ox+10,yy+13,ox+7,yy+21,p.face);}else{line(ox-4,yy,ox,yy-4,p.grain);line(ox,yy-4,ox+6,yy,p.grain);}}}
 }
 for(let y=2;y<H;y+=7)for(let x=2;x<W;x+=6){const q=n(x+y*43,seed);if(q<.16)box(x,y,1,q<.04?2:1,q<.06?p.grain:p.shade);}
 if(hardEntry){const x=surface[Math.floor(surface.length*.25)][0],y=at(x);for(let i=0;i<3;i++)line(x+i*5,y+sign*10,x+i*5+3,y+sign*5,p.rim);}
 return true;
}

export function drawBiomeLife(c,{identity,width:W,height:H,distance=0,time=0,palette:p,reducedMotion=false},h){
 const biome=idOf(identity);if(!biome)return false;
 const seed=seedOf(identity.id),t=reducedMotion?0:time;
 const weather=['frost','basalt','desert','cloud'].includes(biome),count=weather?5:3;
 c.save();c.globalAlpha=biome==='frost'?.27:.19;
 for(let i=0;i<count;i++){
  const x=Math.round(((n(i,seed)*W+t*(biome==='desert'?9:2.5)-distance*.055)%(W+20)+W+20)%(W+20)-10);
  const y=Math.round((n(i+9,seed)*H+t*(biome==='frost'?5:1.4))%H),ink=i%2?p.middle:p.near;
  c.fillStyle=ink;
  if(biome==='frost'){c.fillRect(x,y,1,2);c.fillRect(x-1,y+1,3,1);}
  else if(biome==='desert'||biome==='cloud')c.fillRect(x,y,5+i%3,1);
  else if(biome==='coral'||biome==='crystal')h.line(c,x-2,y+1,x+2,y-1,ink);
  else {h.polygon(c,[[x-2,y],[x+1,y-1],[x+3,y+1],[x,y+2]]);c.fill();}
 }
 c.restore();return true;
}

// One recognizable silhouette per biome. Variant additions are architectural,
// not extra map event symbols; the event icon vocabulary remains unchanged.
const GLYPHS={
 moonruins:[[0,5,16,2,1],[1,7,2,8,1],[7,7,2,8,1],[13,7,2,8,1],[3,7,1,2,1],[6,7,1,2,1],[9,7,1,2,1],[12,7,1,2,1],[5,2,6,3,1],[6,1,4,1,2],[0,5,16,1,2]],
 frost:[[0,13,16,3,1],[1,9,4,5,1],[2,6,3,4,1],[3,4,1,5,2],[5,7,6,8,1],[6,3,4,7,1],[7,1,2,9,2],[10,10,5,5,1],[11,6,3,6,1],[12,5,1,6,2],[2,13,4,1,3],[7,11,5,1,3]],
 pinewood:[[3,4,1,11,1],[11,1,1,14,1],[2,3,3,2,2],[1,5,5,2,1],[0,8,7,2,1],[2,6,3,1,2],[10,2,3,2,2],[9,4,5,2,1],[8,7,7,2,1],[7,10,9,2,1],[9,8,4,1,2]],
 marsh:[[0,14,16,1,2],[3,1,2,14,1],[1,2,6,2,1],[0,4,8,2,1],[0,5,1,6,2],[6,5,1,5,2],[12,8,1,6,1],[10,7,5,2,1],[10,9,1,3,2],[14,9,1,4,2],[8,13,3,1,3]],
 fungal:[[5,7,2,8,1],[1,5,10,3,1],[2,3,8,2,2],[4,2,4,1,2],[2,7,8,1,3],[6,4,2,1,3],[12,11,2,4,1],[10,10,6,2,2],[11,9,4,1,2],[12,10,1,1,3]],
 basalt:[[0,9,3,7,1],[3,5,3,11,1],[6,1,3,15,1],[9,4,3,12,1],[12,8,4,8,1],[1,9,1,6,2],[4,6,1,9,2],[7,2,1,13,2],[10,5,1,10,2],[13,9,1,6,2],[5,12,1,3,3]],
 desert:[[0,12,16,4,1],[2,8,10,5,1],[3,4,6,5,1],[4,2,5,2,2],[3,4,6,1,2],[9,7,4,6,1],[10,6,3,1,2],[4,7,5,1,2],[1,13,14,1,2],[4,10,6,1,3]],
 coral:[[7,5,2,11,1],[2,9,6,2,1],[1,5,2,6,1],[0,4,4,2,2],[8,6,6,2,1],[12,2,2,6,1],[11,1,4,2,2],[5,2,2,6,1],[4,1,4,2,2],[13,11,2,4,1],[10,13,4,2,2]],
 crystal:[[5,5,5,10,1],[6,2,3,4,1],[7,0,1,14,2],[1,10,3,5,1],[2,6,1,8,2],[11,9,4,6,1],[12,6,2,4,1],[12,5,1,9,2],[6,4,1,10,3],[0,15,16,1,1]],
 cloud:[[0,5,9,3,1],[1,8,7,2,1],[3,10,3,3,1],[4,13,1,2,1],[0,4,9,1,2],[3,0,2,4,1],[2,0,4,1,2],[11,10,5,2,1],[12,12,3,2,1],[13,14,1,1,1],[10,9,6,1,2]],
 thorn:[[2,7,3,9,1],[4,3,2,7,1],[5,1,3,2,1],[7,0,2,1,2],[9,3,2,7,1],[11,7,3,9,1],[8,1,3,2,1],[0,9,4,2,2],[3,5,4,2,2],[10,5,4,2,2],[12,11,4,2,2]],
 cemetery:[[1,7,3,8,1],[0,5,5,3,1],[2,3,1,6,2],[8,5,7,10,1],[7,4,9,1,2],[9,2,5,2,1],[10,1,3,1,2],[11,7,2,8,0],[10,7,1,4,2],[13,7,1,4,2],[0,15,16,1,1]],
};
export function biomeMapGlyph(identity,x,y,size){
 const biome=idOf(identity),shape=GLYPHS[biome];if(!shape)return null;
 const p=biomePalette(identity),inks=[p.shade,p.face,p.rim,p.grain],v=(identity.variant||0)%4;
 const cells=[...shape,[1+v*4,15,3,1,2]];
 if(v===1)cells.push([0,12,2,3,1],[0,11,3,1,2]);
 if(v===2)cells.push([13,2,2,3,1],[12,1,4,1,2]);
 if(v===3)cells.push([0,1,3,1,2],[1,0,1,3,2]);
 return `<g class="map-location-glyph" data-landmark="${identity.id}" data-biome="${biome}" transform="translate(${x-size/2} ${y-size/2}) scale(${size/16})" shape-rendering="crispEdges">${cells.map(([a,b,w,h,k])=>`<rect x="${a}" y="${b}" width="${w}" height="${h}" fill="${inks[k]}"/>`).join('')}</g>`;
}
