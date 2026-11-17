import {sparkImageArt,sparkSymbolArt} from './spark-symbol.mjs?v=card-rules-1';
import {condensedIconMarkup} from './afterglow-ui.mjs?v=card-rules-1';
import {fineTreasureObject} from './fine-treasure-art.mjs?v=card-rules-1';

// Three material tones sit above a shared dark contour. Keep light and shadow
// readable at the tree's smallest size, even with all motion switched off.
const pigments={
 jade:['#244e47','#518e72','#9bd3aa','#e4f7cd'], copper:['#613d30','#aa7451','#e2ad75','#fff0b4'],
 blue:['#25405f','#466f94','#88bade','#d5f1f2'], silver:['#284e58','#4e8993','#97d0d1','#e5f6e4'],
 amber:['#613c2c','#a96d38','#e2a650','#ffeb9e'], lilac:['#4c385f','#85699f','#c8abd6','#f4dcdb'],
 rose:['#683547','#ad5668','#e19095','#ffe1c5'], stone:['#373d46','#646976','#a5a4a0','#e6d2b3']
};
const ink='#15202a';
const p=(d,fill,cls='')=>`<path${cls?' class="'+cls+'"':''} d="${d}" fill="${fill}"/>`;
const g=(cls,body)=>`<g class="${cls}">${body}</g>`;
const dot=(x,y,size,color)=>`<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}"/>`;
const shine=(x,y,color)=>g('skill-shine',p(`M${x} ${y-2}h1v2h2v1h-2v2h-1v-2h-2v-1h2z`,color));
const shift=(x,y,body)=>`<g transform="translate(${x} ${y})">${body}</g>`;

function eye(){
 const lid='M1 15h3v-3h3V9h4V7h9v1h5v3h4v3h2v5h-3v3h-4v2h-5v2h-8v-2H7v-2H4v-3H1z';
 return p(lid,ink)
  +p('M2 15h3v-3h3v-2h4V8h8v1h5v3h3v3h2v3h-3v2h-4v2h-5v2h-6v-1H8v-2H5v-3H2z','#79574b')
  +p('M4 15h3v-3h5v-2h8v1h4v2h3v2h-3v-1h-4v-1h-8v1H8v2H4z','#c89d78')
  +p('M6 16h3v-2h4v-2h7v1h3v2h3v3h-3v2h-4v2h-7v-2H9v-1H6z','#c4cec0')
  +p('M6 16h3v-2h4v-2h7v1h3v2h-4v-1h-7v1H9v2H6z','#7c998e')
  +g('skill-iris',p('M12 13h2v-2h5v1h2v2h1v5h-2v2h-5v-1h-3z','#244e50')
   +p('M13 14h2v-2h4v1h2v5h-2v2h-4v-1h-2z','#4eaaaa')
   +p('M14 17h2v2h3v-1h2v1h-2v1h-4v-1h-1z','#b7dcb5')
   +p('M15 14h4v5h-4z','#183845')+dot(14,13,2,'#eff8dc')+dot(19,17,1,'#e0e8ad'))
  +g('skill-eyelid',p('M7 12h4v-2h9v1h4v2h2v2h-3v-1h-4v-1h-7v1H8v1H6v-2h1z','#65483d')
   +p('M9 11h4v-1h7v1h3v1h-4v-1h-6v1H9z','#ddb990'))
  +p('M9 21h4v1h6v-1h4v1h-3v2h-7v-1H9z','#a17c60')
  +g('skill-ripple',p('M3 24h3v2h4v1h5v1h-6v-1H5v-2H3zm20-17h3v2h3v2h-3v-2h-3z','#75ac94'))
  +shine(24,11,'#fae6aa');
}

function feather(c,dive=false){
 const feather=p('M2 26h3v-5h3v-5h3v-4h3V8h5V5h5V3h6v6h-2v5h-4v3h-4v4h-5v3H9v4H5v2H2z',ink)
  +p('M4 25h3v-5h3v-4h3v-4h3V9h4V6h5V4h4v5h-3v5h-4v3h-4v4h-5v2H8v4H4z',c[0])
  +p('M8 21v-5h3v-4h4V9h5V6h5V5h3v3h-3v3h-4v3h-5v3h-4v4z',c[2])
  +p('M10 23h3v-4h5v-4h4v-3h4v-3h2v4h-4v4h-5v4h-5v3h-4z',c[1])
  +p('M3 27h3v-4h5v-5h4v-4h5v-4h4V7h2v2h-2v3h-3v3h-5v4h-4v4H7v5H3z',c[3]);
 return dive?`<g transform="translate(32 32) rotate(180)">${feather}</g>`:feather;
}
function shield(c){
 return p('M4 5h6V4h4V2h4v2h4v1h6v13h-2v4h-3v4h-4v3h-2v2h-2v-2h-4v-3H8v-4H6v-4H4z',ink)
  +p('M6 7h6V5h4V4h1v1h5v2h4v10h-2v5h-3v3h-4v3h-2v-3h-4v-3H9v-5H6z',c[2])
  +p('M9 9h4V7h3v17h-2v-2h-3v-4H9z',c[1])
  +p('M17 6h4v2h4v9h-2v4h-3v3h-3z',c[0])
  +p('M7 7h5V6h4v1h-3v2H9v5H7z',c[3])
  +g('skill-shine',p('M19 10h4v2h-2v1h-2z',c[2]));
}
function heart(c){
 return p('M2 9h2V6h4V4h5v2h3v2h2V6h3V4h5v2h3v3h2v9h-3v4h-4v3h-4v3h-3v2h-3v-3h-4v-3H6v-4H3v-4H2z',ink)
  +p('M4 10h2V7h6v1h3v3h3V9h3V7h5v2h3v8h-3v4h-4v3h-4v3h-3v-3h-4v-3H8v-4H5z',c[0])
  +g('skill-heartbeat',p('M5 10h2V8h5v2h3v2h3v-2h3V8h4v2h2v5h-2v4h-4v3h-4v3h-2v-3h-4v-3H8v-4H5z',c[1])
   +p('M6 10h5v1h3v3h4v-2h3v3h-3v4h-4v-2H9v-3H6z',c[2])+p('M7 10h4v2H9v2H7z',c[3]));
}
function hourglass(c){
 return p('M5 2h22v6h-3v5h-4v5h3v3h3v6h2v4H4v-4h2v-6h3v-3h3v-4H9v-3H7V7H5z',ink)
  +p('M9 7h14v4h-2v3h-4v4h3v4h3v5H9v-5h3v-4h3v-4h-3v-3H9z',c[0])
  +p('M11 8h2v3h3v2h-3v-2h-2zm0 15h2v-2h2v-2h2v2h2v2h2v3H11z',c[1])
  +p('M11 9h10v2h-2v2h-2v2h-2v-2h-2v-2h-2z',c[2])
  +p('M6 3h20v4H6zM5 27h22v3H5z','#9b7356')+p('M7 3h17v1H7zm0 24h15v1H7z','#dfc79a')
  +g('skill-fall',dot(15,16,2,c[3]))+dot(11,8,2,'#d8ece8');
}
function vessel(c){
 return '<g transform="translate(1 1) scale(.58)">'+fineTreasureObject('vessel',[ink,c[0],c[1],c[2],c[3],'#b68d5c'])+'</g>';
}
function seed(c){
 return p('M4 25v-3h6v-3h4v-6h-3v-1H7V9H4V4h7v2h4v3h2v5h2V9h3V5h6v6h-2v4h-3v2h-5v4h3v1h5v3h2v4H4z',ink)
  +p('M6 6h5v2h4v6h-4v-2H8V9H6zm12 9v-4h4V7h5v4h-3v3h-3v2z',c[1])
  +p('M6 6h4v2h3v2h-3V9H7zm16 3h3V7h2v2h-2v2h-3z',c[3])
  +p('M15 12h2v5h3v1h-3v7h-3v-6h1z',c[2])
  +p('M5 25h5v-3h10v1h4v2h3v3H5z','#6c5341')+p('M8 25h4v-2h6v2h4v1H8z','#b3916b');
}
function crystal(c){
 return p('M14 1h4v3h3v4h4v7h2v6h-3v5h-5v4h-6v-2H9v-3H5v-5h2v-7h3V7h3z',ink)
  +p('M15 3h2v3h3v3h3v7h2v4h-3v5h-5v3h-4v-2h-3v-3H7v-3h2v-7h3V8h3z',c[0])
  +p('M15 5h2v13h-3v7h-3v-3H8v-3h3v-7h2V8h2z',c[1])
  +p('M17 5h2v4h3v7h2v3h-5v-4h-2z',c[2])+p('M14 8h2v6h-2v5h-2v-7h2z',c[3])+shine(21,10,c[3]);
}
function crescent(c){
 return p('M20 2h5v2h-3v4h-3v7h2v4h4v2h6v4h-4v3h-6v2h-8v-2H8v-3H5v-4H3v-8h2V8h3V5h5V3h7z',ink)
  +p('M14 5h7v2h-3v7h1v6h4v3h6v2h-4v2h-7v1h-4v-2H9v-3H6v-4H5v-5h2V9h4V7h3z',c[2])
  +p('M12 9h4v-2h2v2h-2v6h2v6h4v4h3v1H14v-2H9v-3H7v-7h2v-3h3z',c[1])
  +p('M13 7h5v2h-5zm-6 6h2v7H7z',c[3])+shine(24,10,'#f0dba2');
}
function tunefork(c){
 return p('M4 3h6v12h3v3h6v-3h3V3h6v15h-3v4h-5v3h-2v6h-5v-7h-3v-2H7v-5H4z',ink)
  +p('M5 5h4v11h3v3h8v-3h3V5h4v11h-3v4h-4v2h-3v7h-3v-7h-3v-2H8v-4H5z',c[1])
  +p('M5 4h3v10H5zm18 0h3v9h-3zm-9 15h4v2h-4z',c[3])
  +g('skill-ripple',p('M11 7h3V5h4v2h3v2h-3V7h-4v2h-3z',c[2]));
}
function metronome(c){
 const frame='M13 2h6v3h2v5h2v6h2v6h3v5h2v3H2v-3h2v-5h3v-6h2v-6h2V5h2z';
 return p(frame,ink)+p('M14 4h4v3h2v5h2v6h2v6h2v2H6v-2h2v-6h2v-6h2V7h2z',c[1])
  +p('M15 6h2v3h2v6h2v5h2v3H9v-3h2v-5h2V9h2z',c[0])
  +p('M19 6h2V4h3v2h-2v5h-2v4h-2v6h-2v3h-2v-5h2v-5h2V9h1z',c[3])
  +g('skill-shine',p('M17 9h6v3h-1v2h-6v-3h1z',c[2]))
  +p('M5 25h22v3H5z',c[2])+dot(9,25,2,c[0])+dot(13,25,2,c[0])+dot(17,25,2,c[0])+dot(21,25,2,c[3]);
}
function wing(c){
 return p('M1 20h4v-5h5v-4h5V8h6V5h5V2h5v9h-3v5h-5v4h-5v4h-8v5H4v-4H1z',ink)
  +p('M3 20h4v-5h5v-3h5V9h5V6h5V4h3v6h-4v4h-5v4h-5v4H9v4H6v-3H3z',c[0])
  +p('M6 18h5v-4h5v-3h6V8h4V6h3v3h-4v4h-6v3h-6v4H8v2H6z',c[2])
  +p('M11 20h5v-3h6v-3h4v2h-3v4h-5v3h-7z',c[1])+p('M15 12h3V9h4V8h3v2h-4v2h-3v2h-3z',c[3]);
}
function orbit(c){
 return g('skill-orbit',p('M1 16v-4h3V9h5V6h9V5h7v2h4v3h2v6h-3v3h-5v3h-8v2H8v-1H4v-2H1zm3-2v5h3v2h7v-2h8v-3h4v-3h2V9h-4V8h-6v1h-8v3H6v2z',c[1])
  +p('M2 12h3V9h5V7h5v2h-4v2H7v2H4v3H2z',c[3])+dot(23,19,3,c[2]))
  +p('M11 13h2v-2h5v1h3v6h-2v2h-6v-2h-2z',c[0])+p('M13 13h5v2h2v3h-6v-2h-1z',c[2])+dot(14,13,2,c[3]);
}
function trajectory(c){
 return p('M1 27h7v-3h5v3h5v-2h4v-3h4v-3h4v10H1z','#475852')
  +p('M2 26h6v-3h4v2H8v3H2zm18-2h4v-3h4v-3h3v3h-2v3h-4v2h-5z','#90ac8a')
  +g('skill-ripple',dot(3,17,2,c[1])+dot(7,12,2,c[2])+dot(12,9,3,c[3])+dot(18,10,2,c[2])+dot(22,13,2,c[1]))
  +sparkSymbolArt(21,11,10);
}
function edgebank(c){
 return p('M1 25h4v-3h6v2h4v-3h5v-2h5v-3h6v14H1z','#344942')+p('M2 24h4v-3h5v2h5v-3h5v-2h5v-3h5v3h-5v2h-4v2h-6v3h-6v-2H6v3H2z','#82a48f')
  +p('M7 11h3V8h5v1h3v3h1v4h-3v2h-6v-2H7z',c[0])+p('M9 11h3V9h3v2h2v3h-2v2h-4v-2H9z',c[3])
  +g('skill-ripple',p('M11 17h2v3h-2v3H9v-4h2zm5-2h2v2h2v2h-3v-2h-1z',c[2]));
}
function hourdial(c){
 return p('M11 3h11v2h4v4h3v13h-3v4h-4v3H10v-3H6v-3H3V10h3V6h5z',ink)
  +p('M12 5h9v2h4v4h2v10h-3v4h-4v2h-9v-3H8v-3H5V11h3V8h4z',c[2])
  +p('M12 8h8v1h3v4h1v7h-3v3h-3v1h-6v-3H9v-3H8v-5h2v-3h2z',c[0])
  +g('skill-shine',p('M14 9h3v7h5v2h-7v-2h-1z',c[3]))+dot(14,22,2,c[1])+dot(9,15,2,c[1]);
}
function banner(c){
 return p('M4 4h4v2h10V4h7v2h6v11h-6v3h-9v-2H8v12H4z',ink)
  +p('M6 5h2v23H6z','#d3ad73')+p('M9 8h10V6h7v2h4v7h-6v3h-7v-2H9z',c[1])
  +p('M9 8h9v2h-7v3H9zm14-1h3v3h4v2h-4v-1h-3z',c[3])
  +p('M15 15h3v-3h7v3h-3v2h-6z',c[0]);
}
function scale(c){
 return p('M13 4h6v9h9v4h-3v2h-4v-2H11v2H7v-2H4v-4h9zm1 13h4v6h4v3h4v3H6v-3h4v-3h4z',ink)
  +p('M15 6h2v9h9v2h-6v-1H10v1H6v-2h9zm0 12h2v6h4v2h3v1H8v-1h4v-2h3z',c[2])
  +g('skill-ripple',p('M2 18h7v3h3v2H5v-2H2zm20 3h3v-3h5v3h-2v2h-6z',c[1]))+shine(16,5,c[3]);
}
function box(){
 return condensedIconMarkup().replace('<svg ','<svg x="2" y="2" width="28" height="28" ');
}
function ghost(c){
 return p('M10 3h12v2h4v4h2v13h-3v6h-3v-4h-4v6h-3v-5h-4v3H8v-6H5V10h2V6h3z',ink)
  +p('M11 5h10v2h4v4h1v10h-3v5h-1v-4h-6v5h-1v-5H9v3H8v-5H7V11h2V7h2z',c[1])
  +p('M12 7h8v2h3v3h1v7h-3v2H11v-2H9v-7h1V9h2z',c[2])
  +p('M12 8h8v2h-6v2h-3v5H9v-5h1v-2h2z',c[3])
  +p('M12 13h3v4h-3zm6 0h3v4h-3z',c[0]);
}
const bodies={eye,feather,wing,heart,vessel,seed,crystal,crescent,tunefork,metronome,shield,orbit,trajectory,edgebank,hourdial,hourglass,banner,scale,box,ghost,
 dive:c=>feather(c,true),fuel:()=>sparkSymbolArt(2,2,28),flash:()=>sparkImageArt('sight',0,0,32)};
const recipes={
 'Lift':['feather','copper'],'Double Lift':['metronome','copper'],'Climb':['metronome','copper'],'Luminance':['eye','jade'],'Momentum':['wing','amber'],'Spark Vessel':['vessel','jade'],
 'Last Glimmer':['ghost','silver'],
 'Long Flash':['flash','silver','time'],'Vitality':['heart','rose'],'Glide Regeneration':['seed','jade'],'Trajectory Guide':['trajectory','silver'],'Spark Sense':['tunefork','jade'],
 'Storage':['box','copper'],'Prismatic Yield':['crystal','lilac'],'Kept Light':['box','copper','seal'],'Dream':['crescent','lilac'],
 'Hand Seal':['box','jade','leaf'],'Deep Cache':['crystal','amber','spark'],
 'Proximity':['edgebank','blue'],'Lasting Pulse':['edgebank','blue','time'],'Regenerative Pulse':['edgebank','jade','seed'],'Light Aegis':['shield','lilac','star'],
 'Far Search':['tunefork','jade','star'],'Rich Cargo':['vessel','jade','spark'],'Fleet Return':['wing','jade'],'Close Orbit':['orbit','jade','spark'],
 'Wide Search':['orbit','jade','star'],'Quick Return':['hourdial','jade','wing'],'Search Spark':['fuel','jade','leaf'],'Field Impulse':['orbit','jade','wing'],'Last Orbit':['shield','jade','spark'],
 'Clean Break':['shield','blue','split'],'Thrifty Shell':['shield','blue','spark'],'Returning Shell':['shield','blue','return'],
 'Lasting Shell':['shield','blue','time'],'Frugal Ward':['vessel','blue','ward'],'Quick Ward':['hourdial','blue','ward'],
 'Deep Ward':['shield','blue','ward'],'Ward Spark':['shield','blue','star'],
 'Long Balance':['hourglass','silver','star'],'Quick Balance':['hourdial','silver','level'],'Deep Dive':['dive','blue','star'],
 'Ready Release':['feather','silver','level'],'Longer Level':['hourglass','silver','level'],'Still Point':['scale','silver'],
 'Falling Release':['dive','silver','level'],'Balance Spark':['scale','silver','spark'],
 'Long Spark':['wing','amber','spark'],'Rapid Spark':['wing','amber','return'],'Storm Runner':['banner','amber','storm'],
 'Sheltered Pace':['banner','amber','ward'],'Longer Surge':['wing','amber','time'],'Quick Sparks':['hourdial','amber','spark'],
 'Wind Lance':['feather','amber','storm'],'Surge Spark':['wing','amber','star']
};
const symbols={
 leaf:'M1 8V5h3V2h4V1h3v4H9v3H6v2H3v2H1z',star:'M5 0h2v4h4v2H7v5H5V7H1V4h4z',
 seal:'M1 1h9v7H8v4L5 10l-3 2V8H1z',time:'M2 1h8v2H8v2H6v2h2v2h2v2H2V9h2V7h2V5H4V3H2z',
 seed:'M2 2h4v3h2V2h3v5H8v2H6v3H4V7H2z',ward:'M1 2h4V1h2v1h4v5H9v2H7v2H5V9H3V7H1z',
 wing:'M1 7h3V5h3V3h3V1h2v4h-2v3H7v2H4v1H1z',split:'M8 0h3L6 5h3l-6 7H1l4-6H2z',
 return:'M1 6l4-5v3h5v2h2v5H9V7H5v3z',level:'M1 4h10v3H1zM4 1h4v1H4zm0 9h4v1H4z',
 storm:'M3 4h2V2h4v2h2v3H7l-2 5H3l1-4H1V5h2z'
};
function charm(name,c){
 if(name==='spark')return sparkSymbolArt(20,19,12);
 if(!symbols[name])return '';
 return shift(19,19,p('M0 3h2V1h7v1h3v7h-2v3H2v-2H0z',ink)+p(symbols[name],c[3]));
}
const aliases={
 sight:'Luminance',radiance:'Luminance',lift:'Lift',thrift:'Lift',heart:'Vitality','heart-plus':'Vitality',reserve:'Spark Vessel',cup:'Spark Vessel',hourglass:'Long Balance',
 trajectory:'Trajectory Guide',regen:'Glide Regeneration',beacon:'Spark Sense','edge-pulse':'Proximity',shield:'Light Aegis',
 dream:'Dream',condense:'Storage',reach:'Wide Search',recovery:'Quick Return',ward:'Ward Spark',layers:'Deep Ward',
 duration:'Longer Level',level:'Still Point',dive:'Falling Release',wind:'Wind Lance',swift:'Momentum',fuel:'Search Spark'
};
const byId={
 'collector-fetch-large':'Spark Vessel','collector-fetch-flash':'Long Flash',
 'main-long-flash':'Long Flash',
 'main-resonant-harvest':'Luminance','main-resonant-purification':'Luminance','main-resonant-bounty':'Luminance',
 'main-sight':'Luminance','main-horizon':'Luminance','main-edging-attunement':'Proximity','main-reservoir':'Spark Vessel',
 'main-dream':'Dream','main-speed':'Momentum','main-lift':'Lift','main-efficiency':'Lift','main-glide-regen':'Glide Regeneration',
 'main-spare-spark':'Vitality','main-glow-sense':'Spark Sense','main-drift-sense':'Trajectory Guide','main-afterglow':'Storage'
};
export function skillPortrait(skill={}){
 const id=String(skill.incrementBase||skill.id||'');
 const name=skill.treeName||skill.baseName||skill.name;
 const title=Object.hasOwn(recipes,name)?name:byId[id]||aliases[skill.treeIcon||skill.icon]||'Search Spark';
 const [body,material,detail]=recipes[title],c=pigments[material];
 return `<svg class="upgrade-glyph skill-portrait" data-skill-art="${title}" viewBox="0 0 32 32" aria-hidden="true" shape-rendering="crispEdges">${bodies[body](c)}${charm(detail,c)}${body==='eye'||body==='fuel'||body==='box'?'':shine(25,5,c[3])}</svg>`;
}
