// Course landmarks are composed once at load time. They borrow the silhouette
// hierarchy of atmospheric platformers, not their artwork. Texture/cutout art
// is from the credited Gothicvania CC0 and Underwater Fantasy CC-BY packs.
const looks={
 pinewood:['wood-gate','high-bough','fallen-giant','root-cathedral'],
 marsh:['reed-bank','willow-veil','lost-boardwalk','root-cathedral'],
 thorn:['root-cathedral','high-bough','fallen-giant','wood-gate'],
 moonruins:['aqueduct','bell-stair','courtyard','chapel'],
 cemetery:['grave-road','crypt','bell-stair','chapel'],
 desert:['sand-terrace','buried-temple','obelisk','sand-arch'],
 frost:['glacier-gate','ice-floes','ice-vault','frozen-falls'],
 basalt:['column-stair','smoke-flue','cinder-spill','scoria-crown'],
 fungal:['plate-caps','spore-stair','gilled-arch','mycelium'],
 crystal:['prism-gate','mirror-well','geode','crystal-spill'],
 coral:['reef-arch','reef-gully','wreck-ribs','reef-lattice'],
 cloud:['sky-islands','broken-span','sky-stair','sky-vault'],
};
const themes={
 pinewood:['#142626','#293f39','#49644e','#71836a'],marsh:['#162c30','#2c4949','#577168','#8c9b80'],
 thorn:['#182729','#344839','#667153','#929675'],moonruins:['#18242e','#35434a','#65706c','#8b927c'],
 cemetery:['#18232d','#38434b','#65726c','#929884'],desert:['#30242d','#594451','#8b7363','#b29b7b'],
 frost:['#1a2e40','#3b5967','#71919c','#b2c5c8'],basalt:['#29232f','#463b48','#6c5c65','#927b76'],
 fungal:['#241f36','#463a54','#7c6587','#ab94ad'],crystal:['#25243b','#49445f','#807896','#b7b0c5'],
 coral:['#1a2d3b','#3c4d60','#746978','#a39a9f'],cloud:['#243747','#4d6371','#7d939b','#b2bdb5'],
};
export function makeCourseTableaux(document,{biome,variant=0,stone,bark,tree,town,spires,reef,reefGarden,patch=[0,0,24,24]}){
 const inks=themes[biome]||themes.pinewood,kind=(looks[biome]||looks.pinewood)[variant%4],result=[];
 for(let stage=0;stage<3;stage++){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=390;
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  const main=stage===1,base=388;
  const line=(points,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.stroke();};
  const silhouette=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();};
  const mass=(points,material='stone',face=1)=>{
   const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),w=right-left;
   silhouette(points,inks[material==='wood'?2:face]);c.save();c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
   const source=material==='wood'?bark:stone;
   if(source){
    const [sx,sy,sw,sh]=material==='wood'?[68,164,16,24]:patch,rotate=material==='wood'&&w>(bottom-top)*1.8,tw=rotate?sh:sw,th=rotate?sw:sh;c.globalAlpha=material==='wood'?.86:.36;
    for(let y=Math.max(0,Math.floor(top));y<Math.min(390,bottom+1);y+=th)for(let x=Math.max(0,Math.floor(left));x<Math.min(768,right+1);x+=tw){
     if(rotate){c.save();c.translate(x+tw,y);c.rotate(Math.PI/2);c.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);c.restore();}
     else c.drawImage(source,sx,sy,sw,sh,x,y,sw,sh);
    }c.globalAlpha=1;
   }
   // Shade the local face instead of cutting every formation with the same
   // screen-aligned strip. Organic silhouettes keep softer, narrower shading.
   c.globalAlpha=material==='wood'?.22:.32;
   silhouette([[left+w*.76,top],[right+2,top],[right+2,bottom+2],[left+w*.67,bottom+2]],inks[0]);c.globalAlpha=1;
   c.restore();
  };
  const bank=(left,right,y)=>mass([[left-40,390],[left,y+18],[left+45,y],[right-43,y-4],[right,y+21],[right+40,390]]);
  const trunk=(x,y,w,h,flip=1)=>{
   if(tree){c.save();c.translate(x,y);c.scale(flip,1);c.drawImage(tree,0,7,173,185,Math.round(-w/2),-h,Math.round(w),Math.round(h));c.restore();}
  };
  const pillar=(x,y,w,h,broken=false)=>{
   mass([[x-w/2,y],[x-w*.43,y-h+8],[x-w*.22,y-h-(broken?11:0)],[x+w*.3,y-h+3],[x+w*.46,y-h+10],[x+w/2,y]]);
   line([[x-w*.30,y-h+13],[x-w*.24,y-10]],inks[2],2);
   for(let band=16;band<h;band+=21)line([[x-w*.45,y-band],[x+w*.46,y-band+2]],inks[0],2);
  };
  const arch=(x,y,w,h,broken=false)=>{
   const ring=[],inner=[];
   for(let j=0;j<=16;j++){const a=Math.PI+j*Math.PI/16;ring.push([x+Math.cos(a)*w,y+Math.sin(a)*h]);}
   for(let j=16;j>=0;j--){const a=Math.PI+j*Math.PI/16;inner.push([x+Math.cos(a)*(w-18),y+Math.sin(a)*(h-21)]);}
   mass([...ring,...inner]);
   for(let j=1;j<16;j+=2){if(broken&&j===7)continue;const a=Math.PI+j*Math.PI/16;
    line([[x+Math.cos(a)*(w-17),y+Math.sin(a)*(h-20)],[x+Math.cos(a)*(w+1),y+Math.sin(a)*(h+1)]],inks[0],2);}
  };
  const shards=(x,y,size=1,ice=false)=>{
   for(const [dx,h,w]of [[-45,73,22],[-12,127,28],[24,91,23],[48,54,20]]){
    const xx=x+dx*size,hh=h*size,ww=w*size;
    mass([[xx-ww/2,y],[xx-ww*.4,y-hh+11],[xx+2,y-hh],[xx+ww*.5,y-hh+17],[xx+ww*.4,y]]);
    silhouette([[xx+2,y-hh],[xx+ww*.5,y-hh+17],[xx+ww*.4,y],[xx+4,y-9]],inks[2]);
    if(ice)line([[xx-5,y-hh+16],[xx+1,y-hh+11],[xx+5,y-hh+19]],inks[3]);
   }
  };
  if(['pinewood','thorn','marsh'].includes(biome)){
   const lift=main?0:25;
   bank(10,239,324+lift);bank(515,757,315+lift);
   trunk(145,base,main?220:178,main?290:228);trunk(663,base,203,264,-1);
   if(kind==='fallen-giant'||kind==='lost-boardwalk'){
    mass([[61,293],[116,260],[261,250],[398,269],[541,256],[681,269],[731,298],[622,316],[480,298],[348,310],[213,282],[93,315]],'wood');
    line([[97,280],[240,266],[373,286],[530,273],[692,288]],inks[2],3);
    line([[184,269],[163,233],[175,202]],inks[1],11);line([[516,279],[540,240],[578,222]],inks[1],9);
   }else if(kind==='high-bough'||kind==='willow-veil'){
    mass([[0,0],[768,0],[768,45],[642,61],[519,39],[392,53],[261,27],[130,51],[0,37]],'wood');
    for(const x of [170,281,561,641])line([[x,32],[x-8,81],[x+4,111+(x%3)*12]],inks[1],3);
   }else if(kind==='reed-bank'){
    for(const x of [106,132,173,585,611,638,677]){
     const h=48+(x%5)*11;line([[x,365],[x-6,365-h*.57],[x-2,365-h]],inks[2],3);
     line([[x-8,366-h],[x-9,355-h]],inks[3],4);
    }
   }else{
    // Opposed buttress roots frame an empty central glade, with uneven limbs.
    mass([[75,390],[119,248],[182,158],[249,112],[310,104],[283,129],[219,162],[174,263],[163,390]],'wood');
    mass([[610,390],[587,251],[542,181],[482,158],[447,140],[508,142],[576,184],[635,259],[681,390]],'wood');
    line([[143,319],[180,221],[231,157],[279,128]],inks[2],2);
    if(kind==='root-cathedral'){
     mass([[173,174],[224,119],[290,75],[355,50],[395,46],[443,71],[471,104],[443,91],[388,67],[341,73],[283,102],[218,151]],'wood');
     line([[286,96],[341,66],[391,57],[438,81]],inks[2],2);
     trunk(385,base,118,177,-1);
    }
   }
  }else if(['moonruins','cemetery','desert'].includes(biome)){
   bank(-20,790,main?340:363);
   if(town&&biome!=='desert'){
    const h=160,w=town.width*h/town.height;
    c.drawImage(town,0,0,town.width,town.height,Math.round(384-w/2),180,Math.round(w),h);
   }
   if(spires&&['bell-stair','chapel'].includes(kind))c.drawImage(spires,280,0,40,80,568,166,86,172);
   if(kind==='aqueduct'||kind==='crypt'||kind==='sand-arch'){
    for(const x of [125,362,604]){pillar(x-99,base,34,169,true);arch(x,268,104,104,stage!==1);}
   }else if(kind==='bell-stair'||kind==='obelisk'){
    for(let j=0;j<5;j++)pillar(130+j*128,base,kind==='obelisk'?38:52,116+j*27,(j+stage)%2===0);
    if(kind==='bell-stair'){line([[540,99],[540,142]],inks[2],2);silhouette([[531,142],[528,154],[554,154],[550,142]],inks[2]);}
   }else if(kind==='chapel'||kind==='buried-temple'){
    pillar(177,base,57,282,true);pillar(600,base,69,266,true);arch(389,279,217,168,true);
    mass([[157,127],[177,84],[202,120],[193,148]],'stone');
    for(const x of [302,375,448]){pillar(x,base,17,115);arch(x+30,298,31,51);}
   }else{
    pillar(128,base,53,144,true);pillar(623,base,67,201,true);arch(617,243,79,94,true);
    for(let j=0;j<5;j++)mass([[260+j*44,390],[257+j*44,353-j*7],[297+j*44,349-j*7],[308+j*44,390]]);
   }
   if(biome==='cemetery'){trunk(73,base,153,234);trunk(725,base,138,198,-1);}
  }else if(biome==='coral'){
   const reefPlate=(source,x,y,w,h,flip=false)=>{
    if(!source)return;c.save();c.translate(x+(flip?w:0),y);if(flip)c.scale(-1,1);
    c.drawImage(source,0,0,source.width,source.height,0,0,w,h);c.restore();
   };
   // Native reef ridges retain their branching kelp, porous rock and broken
   // wreck silhouettes. Their source transparency is preserved by grading.
   if(kind==='reef-arch'){
    reefPlate(reef,-104,102,384,288);reefPlate(reef,488,102,384,288,true);
    reefPlate(reefGarden,207,198,256,192);
   }else if(kind==='reef-gully'){
    reefPlate(reefGarden,-82,42,464,348);reefPlate(reef,441,138,336,252,true);
   }else if(kind==='reef-lattice'){
    reefPlate(reef,32,54,448,336);reefPlate(reefGarden,357,90,400,300,true);
   }else{
    reefPlate(reefGarden,100,6,512,384);reefPlate(reef,491,174,288,216,true);
   }
   if(kind==='wreck-ribs'){
    for(let rib=0;rib<6;rib++){
     const x=130+rib*99,points=[];
     for(let j=0;j<=9;j++){const a=Math.PI+j/9*Math.PI*.6;points.push([x+Math.cos(a)*78,367+Math.sin(a)*160]);}
     line(points,inks[2],7);line(points.map(([x,y])=>[x+3,y+1]),inks[1],2);
    }
   }
  }else if(biome==='fungal'){
   bank(-25,246,337);bank(540,794,330);
   const bases=kind==='gilled-arch'?[135,641]:[111,409,685];
   for(const [j,x]of bases.entries()){
    const y=kind==='spore-stair'?284-j*48:kind==='mycelium'?303-j%2*21:186+(j%2)*49+(stage===0?18:0),r=(main?93:73)+(j%2)*12;
    mass([[x-9,390],[x-15,y+100],[x-9,y+23],[x+5,y+4],[x+15,y+21],[x+9,y+90],[x+13,390]],'wood');
     mass([[x-r,y+9],[x-r*.81,y-19],[x-r*.34,y-39],[x+r*.22,y-43],[x+r*.79,y-24],[x+r,y+2],[x+r*.67,y+14],[x-r*.5,y+15]],'stone',2);
     for(let g=-3;g<=3;g++)line([[x+g*r*.19,y+12],[x+g*4,y+25]],inks[0],2);
   }
  }else if(biome==='cloud'){
   for(const [j,x]of [137,407,674].entries()){
    const y=kind==='sky-stair'?330-j*59:269+(j%2)*48;
    mass([[x-109,y],[x-61,y-21],[x+33,y-18],[x+103,y+4],[x+67,y+37],[x+21,y+65],[x-13,y+86],[x-38,y+47],[x-84,y+30]]);
    pillar(x-14,y-12,18,43,true);if(kind==='broken-span')arch(x+70,y-7,73,34,true);
   }
   if(kind==='sky-vault')mass([[113,0],[654,0],[617,67],[557,91],[486,70],[409,113],[337,76],[262,96],[177,60]]);
  }else{
   // Glacier buttresses, basalt organs and mineral vaults use broad planes
   // and a large central opening, rather than a picket fence of tiny spikes.
   mass([[0,390],[0,110],[87,153],[156,208],[216,311],[260,390]]);
   mass([[768,390],[768,86],[695,139],[642,187],[590,305],[554,390]]);
   const ice=biome==='frost';
   shards(144,349,main?1.15:.8,ice);shards(650,338,.92,ice);
   if(/vault|flue|geode/.test(kind))mass([[0,0],[768,0],[768,52],[648,80],[577,51],[451,77],[333,43],[222,74],[106,48],[0,78]]);
   if(biome==='basalt')for(let j=0;j<6;j++)pillar(157+j*90,base,31,kind==='column-stair'?65+j*26:kind==='cinder-spill'?42+(j%2)*13:73+(j%3)*33,true);
   if(kind==='scoria-crown')mass([[157,0],[630,0],[608,61],[548,91],[516,139],[463,98],[419,156],[375,88],[321,139],[270,93],[203,74]]);
   if(kind==='crystal-spill')shards(389,374,main?1.23:.86,false);
   if(kind==='frozen-falls')for(const x of [171,589,642])mass([[x-12,0],[x+18,0],[x+21,110],[x+5,175],[x-10,108]]);
   if(kind==='mirror-well'||kind==='ice-floes')bank(290,493,357);
  }
  // A restrained atmospheric wash gives a light background to the focal gap.
  // This is painted under normal FOW; it never increases Luminance or reveals
  // routes at the screen edge.
  c.globalCompositeOperation='destination-over';
  const mist=c.createRadialGradient(384,205,20,384,205,280);mist.addColorStop(0,inks[2]+'24');mist.addColorStop(1,inks[0]+'00');c.fillStyle=mist;c.fillRect(0,0,768,390);
  // Foundations and branches blend into the surrounding depth plane instead
  // of exposing a rectangular image edge as the landmark passes the camera.
  c.globalCompositeOperation='destination-in';const edge=c.createLinearGradient(0,0,768,0);
  edge.addColorStop(0,'#ffffff00');edge.addColorStop(.07,'#ffffffff');edge.addColorStop(.93,'#ffffffff');edge.addColorStop(1,'#ffffff00');c.fillStyle=edge;c.fillRect(0,0,768,390);
  result.push({canvas,kind,near:main,position:[.17,.51,.83][stage],speed:[.39,.86,.43][stage],alpha:main?.66:.40});
 }
 return result;
}
export function drawCourseTableaux(c,tableaux,e,{scale=1,distance=e.renderDistance??e.distance,pass='far'}={}){
 c.save();c.imageSmoothingEnabled=false;
 for(const item of tableaux){
  if(item.near!==(pass==='near'))continue;
  const x=(e.totalDistance*item.position-distance)*item.speed+e.width*.5-item.canvas.width*.5;
  if(x>e.width+8||x+item.canvas.width< -8)continue;
  c.globalAlpha=item.alpha;c.drawImage(item.canvas,Math.round(x*scale),Math.round((e.height-item.canvas.height)*scale),Math.round(item.canvas.width*scale),Math.round(item.canvas.height*scale));
 }
 c.restore();
}
