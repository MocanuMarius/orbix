import {drawHabitatAnimal,habitatFooting} from './habitat-wildlife.mjs?v=cue-1';
// Whole, authored vignettes replace interchangeable mounds and evenly spaced
// plants. Coordinates describe geology, exposed rock and sheltered soil pockets.
const noise=n=>{let h=Math.imul(n|0,1597334677);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
const colors={
 moonruins:['#273432','#38483e','#4c5d4b','#69765b'],pinewood:['#21372d','#354c39','#4a6546','#718358'],
 marsh:['#243d38','#3c5442','#586e4b','#87925e'],thorn:['#293a2f','#41513a','#61744c','#8b9464'],
 fungal:['#302b3c','#4c3f50','#76617b','#a18a9d'],frost:['#2c414a','#435c64','#66838a','#9db5b8'],
 basalt:['#352e36','#4c4249','#68565b','#8a7368'],desert:['#433b33','#5a5040','#807052','#a4926c'],
 coral:['#303e46','#514a5a','#7b657e','#a28c9f'],crystal:['#302f45','#4c475f','#716a8a','#a49cbb'],
 cloud:['#33474b','#4f6463','#7a9182','#a9b7a0'],cemetery:['#2b3938','#43544a','#65776a','#8c9b83'],
};
const crests={
 rootbank:[[0,.9],[.1,.6],[.18,.18],[.28,.06],[.48,0],[.59,.16],[.64,.4],[.82,.44],[1,.9]],
 terrace:[[0,.82],[.08,.64],[.23,.6],[.26,.29],[.43,.26],[.47,.06],[.68,0],[.71,.2],[.87,.28],[1,.65]],
 talus:[[0,1],[.16,.84],[.34,.52],[.42,.48],[.59,.12],[.68,0],[.75,.12],[.81,.48],[1,.9]],
 stack:[[0,1.2],[.14,1.12],[.2,.46],[.24,.4],[.29,.05],[.46,0],[.52,.15],[.59,.13],[.67,.82],[.74,.89],[1,1.1]],
 bank:[[0,.42],[.13,.22],[.31,.1],[.42,.15],[.48,.4],[.6,.48],[.73,.26],[.84,.18],[1,.34]],
 fractured:[[0,1],[.11,.68],[.22,.52],[.28,.22],[.44,.15],[.51,0],[.61,.24],[.64,.64],[.81,.7],[1,1]],
 shelf:[[0,.65],[.08,.38],[.26,.27],[.38,.23],[.58,.26],[.69,.12],[.87,.15],[.92,.4],[1,.62]],
};
// [profile,x,y,width,relief,plant-cluster positions,feature,wildlife]
const scenes={
 pinewood:[
  [['rootbank',-25,113,292,48,[.18,.24,.71],'log','deer'],['talus',351,143,194,30,[.69],'stump']],
  [['terrace',28,132,206,38,[.28,.35],'roots','rabbit'],['rootbank',278,111,268,42,[.17,.7,.76],'log','deer']],
  [['talus',-34,132,199,38,[],null],['rootbank',190,126,321,30,[.23,.31,.72],'roots','fox']]],
 marsh:[
  [['bank',-20,146,234,26,[.2,.28,.72],'reeds','frog'],['rootbank',335,131,215,43,[.25,.61],'roots','butterfly']],
  [['shelf',22,150,165,23,[.28,.36],'pool','frog'],['bank',260,143,289,29,[.22,.69,.76],'log','raven']],
  [['rootbank',-38,139,232,35,[.18,.7],'stump'],['bank',291,156,247,20,[.23,.3,.78],'reeds','frog']]],
 moonruins:[
  [['terrace',-30,136,277,42,[.2,.74],'arch','raven'],['talus',329,151,207,34,[.67],'rubble']],
  [['shelf',28,141,207,34,[.25],'rubble','rabbit'],['terrace',291,120,260,44,[.3,.78],'pillar']],
  [['stack',-45,126,217,51,[],'pillar'],['rootbank',234,147,312,29,[.27,.7],'arch','raven']]],
 cemetery:[
  [['terrace',-24,145,247,31,[.25,.7],'graves','raven'],['rootbank',291,133,254,36,[.2,.28,.75],'roots']],
  [['shelf',16,133,277,38,[.25,.7],'arch','rabbit'],['talus',381,151,171,32,[],'graves']],
  [['rootbank',-34,137,253,32,[.2,.72],'log'],['terrace',299,143,246,35,[.3,.77],'graves','raven']]],
 thorn:[
  [['rootbank',-28,121,281,44,[.2,.27,.7],'roots','fox'],['fractured',334,135,208,45,[.28],'stump']],
  [['terrace',21,141,207,33,[.25,.32],'log'],['rootbank',285,115,271,43,[.2,.72],'roots','rabbit']],
  [['rootbank',-36,133,243,37,[.22,.7],'stump'],['talus',278,142,274,41,[.68,.74],'roots','fox']]],
 frost:[
  [['fractured',-37,126,275,50,[],'ice','hare'],['talus',331,137,217,48,[],'scree','raven']],
  [['stack',12,108,213,63,[],'ice'],['shelf',302,149,250,29,[.7],'scree','hare']],
  [['talus',-27,139,258,43,[],'scree','hare'],['fractured',288,120,267,52,[],'ice']]],
 desert:[
  [['terrace',-38,128,299,42,[.75],'rubble'],['stack',359,108,186,65,[],'scree']],
  [['talus',-12,145,227,32,[.65],null,'lizard'],['terrace',288,117,266,52,[.25],'pillar']],
  [['stack',-40,109,235,68,[],null],['bank',269,159,280,28,[.22,.76],'rubble','lizard']]],
 basalt:[
  [['stack',-35,111,266,66,[],'columns'],['talus',324,139,227,43,[],'scree','lizard']],
  [['fractured',11,127,217,51,[],'columns','lizard'],['terrace',291,141,263,36,[],'scree']],
  [['talus',-39,143,245,38,[],'scree','lizard'],['stack',271,112,283,62,[],'columns']]],
 crystal:[
  [['fractured',-31,139,264,41,[.24],'crystals','moth'],['stack',328,122,221,57,[],'crystals']],
  [['terrace',17,147,207,32,[.72],'crystals'],['talus',288,131,265,47,[.7],'scree','lizard']],
  [['stack',-41,115,239,62,[],'crystals'],['shelf',269,151,284,28,[.3,.74],'crystals']]],
 fungal:[
  [['rootbank',-32,135,275,42,[.22,.28,.72],'mushrooms','moth'],['stack',335,113,215,63,[.3],'mushrooms']],
  [['terrace',19,141,216,36,[.25,.33],'mushrooms'],['rootbank',294,129,259,43,[.22,.68,.75],'roots']],
  [['stack',-40,115,233,62,[.28],'mushrooms'],['bank',274,151,279,27,[.22,.3,.75],'mushrooms','moth']]],
 coral:[
  [['shelf',-30,143,271,33,[.2,.27,.72],'coral','fish'],['stack',335,119,214,59,[.29],'coral']],
  [['terrace',18,137,212,41,[.25,.74],'coral'],['bank',289,152,267,29,[.22,.3,.76],'coral','fish']],
  [['stack',-40,117,236,61,[.28],'coral','fish'],['fractured',277,139,279,41,[.23,.73],'coral']]],
 cloud:[
  [['shelf',-28,119,261,35,[.22,.29,.73],'roots','raven'],['terrace',337,137,211,32,[.28],'rubble']],
  [['talus',18,129,209,39,[.69],'roots'],['shelf',294,117,260,34,[.27,.73],'pillar','raven']],
  [['terrace',-34,141,239,32,[.3],'rubble'],['shelf',277,123,279,33,[.24,.32,.73],'roots','raven']]],
};
function at(crest,u){for(let i=1;i<crest.length;i++)if(u<=crest[i][0]){const a=crest[i-1],b=crest[i];return a[1]+(b[1]-a[1])*(u-a[0])/(b[0]-a[0]);}return crest.at(-1)[1];}
// Low native cover stays tied to its soil pocket. Forest sheet cutouts belong
// only to wooded/wet banks; regrading their colors cannot turn them into reef
// plants, cave lichen or exposed alpine turf.
function groundCover(biome,x,y,inks,{poly,line,box},seed){
 if(biome==='desert'||biome==='cloud'){
  const dry=biome==='desert',height=dry?9:5;
  for(let j=-2;j<=2;j++)line([[x+j*2,y+1],[x+j*3+(dry?-2:4),y-height+Math.abs(j)*2]],inks[j%2?2:3]);
  box(x-6,y+1,14,2,inks[1]);
 }else if(biome==='crystal'||biome==='basalt'){
  // Mineral crust and low lichen never read as a free-standing green shrub.
  for(let j=0;j<4;j++)box(x-7+j*4,y-1-j%2,3,2,inks[j%2+1]);
 }else if(biome==='fungal'){
  line([[x-8,y+1],[x-2,y-1],[x+5,y+1],[x+9,y-1]],inks[2]);
  for(let j=0;j<3;j++){
   const xx=x+(j-1)*7,h=5+noise(seed+j*19)*5;
   line([[xx,y+1],[xx,y-h]],inks[2]);
   poly([[xx-4,y-h+1],[xx-2,y-h-2],[xx+2,y-h-2],[xx+4,y-h+1]],inks[j%2+2]);
  }
 }else if(biome==='coral'){
  for(let j=-1;j<=1;j++){
   const xx=x+j*5,h=10+noise(seed+j*29)*9;
   line([[xx,y+1],[xx+3,y-h*.45],[xx+1,y-h]],inks[j?2:3],2);
   line([[xx+2,y-h*.4],[xx-4,y-h*.7]],inks[2]);
  }
 }else if(biome==='frost')line([[x-9,y],[x-4,y-2],[x+7,y-1],[x+10,y]],inks[3],2);
}
function groundedCrest(profile,x,y,w,h,kind,anchorX,facing){
 const span=habitatFooting(kind,facing);if(!span)return profile;
 // Flatten only a small resting/excursion ledge, with shoulders joining the
 // existing landform. This is baked geology: every foot shares real support.
 const left=(Math.floor(anchorX+span[0])-x)/w,right=(Math.ceil(anchorX+span[1])-x)/w,
  shoulder=12/w,a=Math.max(0,left-shoulder),b=Math.min(1,right+shoulder),
  level=(Math.floor(y+Math.min(at(profile,left),at(profile,right),...profile.filter(([u])=>u>left&&u<right).map(([,v])=>v))*h)-y)/h;
 const surface=u=>u<a||u>b?at(profile,u):u<left?at(profile,a)+(level-at(profile,a))*(u-a)/(left-a):u<=right?level:level+(at(profile,b)-level)*(u-right)/(b-right);
 return [...new Set([...profile.map(([u])=>u),a,left,right,b])].sort((a,b)=>a-b).map(u=>[u,surface(u)]);
}
function ravenPerch(feature,x,y,inks,{poly,line}){
 // These points come from the feature silhouettes below. A narrow cap gives
 // both feet a visible common perch, including the arch's offset crown.
 const offset={arch:[28,-71],pillar:[-5,-48],graves:[-5,-24],log:[20,-20],roots:[-3,-36],stump:[-3,-36]}[feature];
 if(!offset)return null;
 const px=Math.round(x+offset[0]),py=Math.round(y+offset[1]);
 poly([[px-5,py],[px+5,py],[px+6,py+4],[px-5,py+4]],inks[1]);line([[px-5,py],[px+5,py]],inks[2]);
 return {x:px,y:py};
}
function featureArt(kind,x,y,inks,{poly,line,box},seed){
 if(['log','stump','roots'].includes(kind)){
  if(kind==='log'){
   poly([[x-39,y-4],[x-34,y-13],[x+25,y-20],[x+38,y-14],[x+34,y-6],[x-26,y+1]],inks[0]);
   line([[x-31,y-10],[x+24,y-17],[x+34,y-13]],inks[2],2);line([[x-23,y-6],[x+13,y-11],[x+29,y-9]],inks[1],2);
   line([[x-7,y-16],[x-12,y-26],[x-22,y-29]],inks[0],3);line([[x+3,y-8],[x+10,y+3],[x+22,y+6]],inks[0],3);
   box(x+29,y-14,4,6,inks[2]);box(x+30,y-12,2,3,inks[0]);
  }else{
   poly([[x-24,y+3],[x-9,y-6],[x-8,y-31],[x-3,y-36],[x+1,y-27],[x+7,y-33],[x+12,y-4],[x+27,y+5],[x+9,y+2],[x,y-2]],inks[0]);
   line([[x-5,y-26],[x-4,y-7],[x-14,y+1]],inks[2],2);line([[x+5,y-23],[x+7,y-8],[x+16,y+2]],inks[1],2);
  }
  if(kind==='roots')for(let j=0;j<4;j++)line([[x+(j-2)*9,y],[x+(j-2)*12,y+19],[x+(j-2)*10,y+36]],inks[1],2);
 }else if(['pillar','arch','graves'].includes(kind)){
  const h=kind==='graves'?24:48;
  poly([[x-12,y],[x-11,y-h+7],[x-6,y-h],[x+6,y-h+2],[x+10,y-h+9],[x+10,y]],inks[1]);
  line([[x-7,y-h+10],[x-6,y-4]],inks[2],2);line([[x+4,y-h+6],[x,y-h+21],[x+5,y-h+28]],inks[0],2);
  if(kind==='arch'){
   poly([[x-9,y-38],[x-4,y-56],[x+10,y-67],[x+28,y-71],[x+36,y-65],[x+21,y-59],[x+10,y-49],[x+7,y-32]],inks[1]);
   line([[x-4,y-53],[x+12,y-64],[x+26,y-67]],inks[2],2);
  }else if(kind==='graves'){
   poly([[x+22,y+1],[x+23,y-13],[x+29,y-18],[x+34,y-14],[x+33,y+3]],inks[1]);
   line([[x-4,y-18],[x+4,y-18]],inks[3]);line([[x,y-21],[x,y-11]],inks[3]);
  }
 }else if(['crystals','ice','columns'].includes(kind)){
  for(let j=0;j<4;j++){
   const px=x+(j-1.5)*12,h=[23,41,52,29][j],w=kind==='columns'?11:14;
   poly([[px-w*.5,y+3],[px-w*.4,y-h+7],[px+1,y-h],[px+w*.45,y-h+9],[px+w*.5,y]],inks[1]);
   poly([[px+1,y-h],[px+w*.45,y-h+9],[px+w*.5,y],[px+1,y-4]],inks[2]);
   if(kind==='ice')line([[px-3,y-h+9],[px+1,y-h+4],[px+3,y-h+10]],inks[3]);
   if(kind==='columns')line([[px-5,y-h+19],[px+4,y-h+21]],inks[0]);
  }
 }else if(['mushrooms','coral','reeds'].includes(kind)){
  for(let j=0;j<5;j++){
   const px=x+(j-2)*9,h=[18,28,40,24,16][j];line([[px,y+2],[px+2,y-h*.5],[px-1,y-h]],inks[2],kind==='coral'?3:1);
   if(kind==='mushrooms'){
    const r=h*.36;poly([[px-r,y-h+2],[px-r*.6,y-h-5],[px-2,y-h-8],[px+r*.65,y-h-4],[px+r,y-h+2]],inks[2]);line([[px-r+3,y-h+3],[px+r-2,y-h+3]],inks[3]);
   }else if(kind==='coral'){
    line([[px+1,y-h*.45],[px-8,y-h*.67],[px-10,y-h*.89]],inks[2],2);line([[px+1,y-h*.6],[px+9,y-h*.77],[px+11,y-h]],inks[3],2);
   }else box(px-2,y-h-5,2,7,inks[3]);
  }
 }else if(kind==='pool'){
  line([[x-23,y+3],[x-13,y+1],[x+19,y+2],[x+26,y+4]],inks[1],3);line([[x-17,y+3],[x+16,y+3]],inks[3]);
 }else if(kind==='scree'||kind==='rubble')for(let j=0;j<7;j++){
  const xx=x+(j-3)*8,yy=y+Math.abs(j-3)*2,r=3+noise(seed+j)*5;
  poly([[xx-r,yy],[xx-r*.4,yy-r],[xx+r*.5,yy-r*.7],[xx+r,yy+2]],inks[j%2+1]);line([[xx-r*.4,yy-r],[xx+r*.5,yy-r*.7]],inks[2]);
 }
}
export function createNearLandscape(document,{biome,texture,patch,plants=[],variant=0}){
 const inks=colors[biome]||colors.pinewood,plans=scenes[biome]||scenes.pinewood,plates=[];
 for(let depth=0;depth<2;depth++){
  const tiles=[];
  for(let tile=0;tile<3;tile++){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=320;canvas.habitatSites=[];
   const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const seed=variant*7919+depth*1427+tile*913;
   const box=(x,y,w,h,ink)=>{c.fillStyle=ink;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
   const poly=(points,ink)=>{c.fillStyle=ink;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();};
   const line=(points,ink,w=1)=>{c.strokeStyle=ink;c.lineWidth=w;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke();};
   for(const [index,spec]of plans[(tile+variant+depth)%plans.length].entries()){
    const [kind,px,py,w,h,clusters,feature,life]=spec,s=seed+index*227,x=px+(variant%2?9:-4),y=py+(depth?7:0)+(variant>1?5:0),facing=index?-1:1;
    const fu=feature==='arch'?.4:feature==='log'?.39:.5,u=life==='raven'?fu:life==='rabbit'?fu-.09:life==='frog'?.73:life==='lizard'?.62:.34,
     ax=Math.round(x+w*u),profile=depth===1&&life?groundedCrest(crests[kind],x,y,w,h,life,ax,facing):crests[kind];
    const crest=profile.map(([u,v])=>[x+u*w,y+v*h]),floating=biome==='cloud',base=floating?y+85:canvas.height+20;
    const shape=[...crest,...(floating?[[x+w*.83,base-22],[x+w*.6,base-9],[x+w*.51,base+10],[x+w*.32,base-8],[x+w*.09,base-23]]:[[x+w*1.18,base],[x-w*.18,base]])];
    poly(shape,inks[0]);c.save();c.beginPath();shape.forEach(([xx,yy],j)=>j?c.lineTo(xx,yy):c.moveTo(xx,yy));c.closePath();c.clip();
    if(texture){const [sx,sy,sw,sh]=patch;c.globalAlpha=.38;for(let yy=y-4;yy<base+12;yy+=sh)for(let xx=x;xx<x+w;xx+=sw)c.drawImage(texture,sx,sy,sw,sh,xx,yy,sw,sh);c.globalAlpha=1;}
    // Fracture planes follow geology rather than the skyline's every bump.
    const organic=['pinewood','marsh','thorn','fungal'].includes(biome);
    c.globalAlpha=organic?.18:.42;
    poly([[x+w*.44,y],[x+w*.61,y+9],[x+w*.67,base],[x+w*.36,base]],inks[1]);c.globalAlpha=1;
    if(['basalt','crystal','frost'].includes(biome))for(const u of [.21,.29,.45,.59,.67,.82]){
     const xx=x+u*w,yy=y+at(profile,u)*h;line([[xx,yy+6],[xx+4,yy+30],[xx-3,base]],inks[0],2);line([[xx+3,yy+9],[xx+7,yy+32]],inks[2]);
    }else if(organic)for(const u of clusters){
     const xx=x+u*w,yy=y+at(profile,u)*h;
     line([[xx,yy+3],[xx-4,yy+22],[xx+2,yy+47],[xx-2,yy+63]],inks[0],3);
     line([[xx-4,yy+22],[xx-14,yy+35],[xx-18,yy+44]],inks[1],2);
     line([[xx+2,yy+47],[xx+12,yy+61]],inks[1],2);
    }else for(let band=0;band<4;band++){
     const yy=y+22+band*21,lean=biome==='desert'?-8:4;line([[x+8,yy],[x+w*.28,yy+lean],[x+w*.59,yy+lean-3],[x+w*.92,yy+lean+2]],inks[0],3);line([[x+w*.13,yy-2],[x+w*.3,yy+lean-2]],inks[2]);
    }
    c.restore();
    // Thumb-sized grounded stones sit on the authored skyline; quieter chips
    // remain embedded in its texture. Neither becomes another hazard edge.
    for(let pebble=0;pebble<9;pebble++){
     const u=.08+noise(s+pebble*83)*.83,xx=x+u*w,yy=y+at(profile,u)*h,r=2+noise(s+pebble*79+5)*4;
     poly([[xx-r,yy+1],[xx-r*.7,yy-r*.55],[xx+r*.2,yy-r],[xx+r,yy-r*.35],[xx+r*.85,yy+1]],inks[pebble%2+1]);
     if(pebble%3===0)line([[xx-r*.5,yy-r*.6],[xx+r*.2,yy-r]],inks[3]);
    }
    for(const u of clusters){
     const cy=y+at(profile,u)*h,xx=x+u*w;
     for(let j=0;j<3;j++){
      const wooded=['pinewood','marsh','thorn','moonruins','cemetery'].includes(biome),plant=wooded?plants[(j+tile+index)%plants.length]:null,dx=(j-1)*9;
      if(plant){const [sx,sy,sw,sh]=plant.rect,ph=19+noise(s+j*79+u*197)*15;c.globalAlpha=.86;c.drawImage(plant.image,sx,sy,sw,sh,Math.round(xx+dx-sw*ph/sh/2),Math.round(cy-ph+3),Math.round(sw*ph/sh),Math.round(ph));c.globalAlpha=1;}
      box(xx+dx-4,cy+2,9,2,inks[1]);
     }
     groundCover(biome,xx,cy,inks,{poly,line,box},s+Math.round(u*197));
    }
    const fx=x+w*fu,fy=y+at(profile,fu)*h;
    featureArt(feature,fx,fy,inks,{poly,line,box},s);
    if(life&&depth===1){
     const perch=life==='raven'?ravenPerch(feature,fx,fy,inks,{poly,line}):null;
     canvas.habitatSites.push({kind:life,x:perch?.x??ax,y:perch?.y??Math.round(y+at(profile,(ax-x)/w)*h),
      travelRise:0,phase:s*.019,facing});
    }
   }
   tiles.push(canvas);
  }
  plates.push({tiles,speed:depth?.78:.54,alpha:depth?.58:.36,yOffset:depth?-48:-85});
 }
 return plates;
}
export function drawNearLandscapePlates(c,plates,{width,height,distance,scale=1,variant=0,time=0,reducedMotion=false}){
 c.save();c.scale(scale,scale);c.imageSmoothingEnabled=false;
 for(let depth=0;depth<plates.length;depth++){
  const p=plates[depth],span=p.tiles[0].width,scroll=distance*p.speed,first=Math.floor(scroll/span)-1,last=Math.ceil((scroll+width)/span);c.globalAlpha=p.alpha;
  for(let i=first;i<=last;i++){
   const tile=p.tiles[Math.floor(noise(i*313+variant*71+depth*191)*p.tiles.length)],x=Math.round((i*span-scroll)*scale)/scale,y=Math.round((height-232+p.yOffset)*scale)/scale;
   // Share one raster-snapped tile transform. Rounding world-space animals
   // separately lets their feet drift against their plate at fractional scale.
   c.save();c.translate(x,y);c.drawImage(tile,0,0);
   for(const site of tile.habitatSites){if(x+site.x< -45||x+site.x>width+45)continue;drawHabitatAnimal(c,site,{x:site.x,y:site.y,time,reducedMotion});}
   c.restore();
  }
 }
 c.restore();
}
