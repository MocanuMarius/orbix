import {guardianPortraits} from './guardian-portraits.mjs?v=rates-1';
// Hand-authored pixel silhouettes, shared by rewards, Collection, HUD and lessons.
// 1=ink, 2=shade, 3=material, 4=lit edge, 5=magic, 6=hot highlight, 7=metal.
const sprites={
 lantern:'.....7777...../....722227..../....7....7..../...77777777.../...74444427.../...74355327.../...74365327.../...74355327.../...74233227.../...72222227.../...77777777.../....722227..../...77777777...',
 wick:'......55....../.....565....../.....6535...../......53....../....777777..../....743327..../....743327..../....743327..../....742227..../....742227..../...17777771...',
 feather:'.........44.../.......44341../......443341../.....4433341../....44333321../...44333321.../..44334321..../..4334321...../..433421....../...3421......./...421......../..421........./.41...........',
 prism:'......66....../.....6454...../....644554..../...64435554.../..6443355554../.644333555554./.443333555552./..4333355552../...43335552.../....433552..../.....4352...../......32......',
 bell:'.....777....../....74427...../....7...7...../...7777777..../...7444327..../..744433227.../..744333227.../..744333227.../.74433332227../.77777777777../.....765....../......5.......',
 coil:'....555555..../...56777775.../..5772222775../..572....775../...5...7775.../.....77775..../...77775....../..7775......../..775....557../..5772222775../...57777775.../....555555....',
 crown:'..6....6....6./..75..757..57./..77575557577./..74353535327./...743333327../...777777777../...745333327../...745653527../...743333327../...177777771..',
 heart:'...444...444../..44334.43334./.4433334333321/.4333333333321/.4333555333321/..43356533321./...435553321../....4333321.../.....43321..../......421.....',
 seed:'.....444....../....43334...../...4333334..../..433553324.../..433565324.../..433553324.../...4333324..../....43324...../.....327....../.....727....../......7.......',
 flower:'.....444....../..4444334444../..4334433432../...43355332.../.443356533344./.433335333332./..4433333344../....433324..../.....327....../...3372733..../....33733...../.....727......',
 eye:'.....7777...../...77444477.../..7444554427../.744355553327./.743556655327./.743355553327./..7433553327../...77333377.../.....7777...../......77....../......77......',
 cinder:'.......55...../.....55635..../....5533355.../...553333235../...533332235../..53333222235./..53333222235./...533222235../....5332235.../.....53235..../......555.....',
 loom:'..77......77../..7777777777../..7435353527../..7435353527../..7437777527../..7437567527../..7437777527../..7435353527../..7435353527../..7777777777../..77......77..',
 spool:'...77777777.../...74444327.../....755557..../....754557..../....755557..../....755457..../....755557..../....754557..../...77777777.../...74444327.../...77777777...',
 dream:'......77....../....775577..../...75444457.../..7545555457../..7456565547../..7455655547../..7545555457../...75444457.../....775577..../...75.77.57.../...45.77.54.../...35.77.53.../....5....5....',
 sunrise:'......66....../...6..55..6.../....5.55.5..../.....5555...../..5556555555../....555555..../.777777777777./..7444443327../...74433327.../....733327..../.....7777.....',
 vessel:'.....7777...../.....7447...../....773377..../...74433327.../..7445553227../..7435653327../..7435553327../..7433333227../...74333227.../...77777777.../....722227..../...77777777...',
 watering:'...7777......./...7..7......./...777777..77./..74444327747./..7435332777../..743333277.../..74333327..5./..74333227.55./...777777..5../...........5..',
 shield:'..7777777777../..7444433327../..7433553327../..7435653327../..7433553327../..7433333327../...74333327.../...74333227.../....743327..../.....7427...../......77......',
 knot:'....444..555../...433245655../..4332456535../..4324565325../...24565325.../....565324..../...56532432.../..5653243324../..5532453324../...55244324.../....55..44....',
 reed:'..44..44..44../..43..43..43../..32..32..32../..32..32..32../...3..3..3..../...3777773..../...3756573..../...3777773..../...3..3..3..../...3..3..3....',
 moon:'......44444.../....443332..../...44332....../..44332......./..4332......../.44332......../.43332....55../..43332..565../..433332555.../...43333332.../....433332..../......222.....',
 anchor:'.....7777...../.....7447...../.....7777...../......77....../...77777777.../......77....../.77...77...77./.747..77..747./..747.77.747../...74777747.../....744447..../......77......',
 sail:'......77....../.....4777...../....44377...../...4432774..../..443327734.../.44333277334../.777777777777./......77....../...77777777.../....744447..../.....7777.....',
 needle:'......66....../.....7447...../.....7557...../.....7557...../.....7447...../......77....../......77....../...55.77.55.../....5.77.5..../......77....../......74....../.......4......',
 hourglass:'...77777777.../...74444327.../....755557..../....745537..../.....7557...../......57....../......75....../.....7557...../....755557..../....745537..../...77777777.../...74444327...',
 cup:'..777777777.../..74444332777./..74355532747./..74356532747./..74355532777./..743333327.../...7433327..../....77777...../.....777....../...7777777....',
 thread:'..77.....555../..747...56535./..747..563335./..747..533335./..747...5335../..747....55.../..747..555..../..747.553...../..747.53....../..777755....../...7755.......',
};
const palettes={
 amber:['#171a20','#604238','#bd7746','#edba72','#f2a354','#fff0b6','#98836a'],
 jade:['#111d22','#274d43','#4d9174','#a7cfa0','#83decb','#e6f5ca','#a39d73'],
 ice:['#151c2b','#354565','#668da9','#b9d5db','#88d9ef','#effaf5','#8195a2'],
 violet:['#191828','#443458','#82638f','#c4a2c5','#bf91e6','#f2deec','#a28a83'],
 rose:['#241927','#65394f','#ac627a','#e2a7a4','#ed9fbd','#ffe6ca','#a48d78'],
 bronze:['#1b1e24','#4f4b4c','#827567','#c2ad8b','#a3d4ba','#e4f4cd','#b89965'],
};
const designs={
 'wayward-seed':['seed','jade'],'hearth-bloom':['flower','amber'],'lantern-bloom':['flower','ice'],
 'glow-wick':['wick','amber'],'flash-stone':['prism','violet'],'sunheart-engine':['heart','amber'],
 'dream-sovereign':['crown','violet'],'hollow-covenant':['crown','rose'],
 'overflow-coil':['coil','jade'],'echo-bell':['bell','bronze'],'dawn-loom':['loom','rose'],
 sunspool:['spool','amber'],dreamcatcher:['dream','violet'],'second-dawn':['sunrise','amber'],
 'echo-vessel':['vessel','violet'],'glass-lantern':['lantern','ice'],'night-gardener':['watering','jade'],
 'ember-lens':['eye','amber'],'quiet-cinder':['cinder','amber'],'silver-feather':['feather','ice'],
 'moss-heart':['heart','jade'],'wayfinder-seed':['seed','amber'],'iron-petal':['shield','ice'],
 'storm-knot':['knot','violet'],'hollow-bell':['bell','violet'],'dawn-thread':['thread','rose'],
 'reed-charm':['reed','jade'],'moon-glass':['moon','ice'],'stone-anchor':['anchor','bronze'],
 'silk-sail':['sail','rose'],'edge-needle':['needle','ice'],'pulse-hourglass':['hourglass','violet'],
 'cache-cup':['cup','amber'],'path-prism':['prism','jade'],
};
for(const [id,[palette,sprite]] of Object.entries(guardianPortraits)){
 designs[id]=[id,palette];
 sprites[id]=sprite.replaceAll(' ','');
}
const legendary=new Set(['sunheart-engine','dream-sovereign','hollow-covenant',...Object.keys(guardianPortraits)]);
const rare=new Set(['hearth-bloom','lantern-bloom','overflow-coil','echo-bell','dawn-loom','sunspool','echo-vessel','night-gardener']);
const cache=new Map();
const glowing=new Set(['wick','heart','lantern','vessel','cinder','sunrise','hourglass','spool','loom']);
const fluttering=new Set(['feather','reed','sail','flower','seed','thread','dream']);
export function artifactPixelPortrait(id){
 if(cache.has(id))return cache.get(id);
 const [shape,paletteName]=designs[id]||['prism','violet'],palette=palettes[paletteName];
 const tier=legendary.has(id)?'boss':rare.has(id)?'rare':'common';
 const [bg,edge]={common:['#252b32','#69757d'],rare:['#1a342a','#659570'],boss:['#362541','#a17db5']}[tier];
 const rows=sprites[shape].split('/'),width=Math.max(...rows.map(x=>x.length)),paths=Array(8).fill('');
 const left=Math.floor((40-width*2)/2),top=Math.floor((40-rows.length*2)/2);
 let witness=null;
 rows.forEach((row,y)=>{
   for(let x=0;x<row.length;){
     const start=x,cell=row[x++];while(x<row.length&&row[x]===cell)x++;
     if(cell==='.')continue;
     const xx=left+start*2,yy=top+y*2,run=(x-start)*2;
     paths[Number(cell)]+=`M${xx} ${yy}h${run}v2h-${run}z`;
     if(!witness&&(cell==='4'||cell==='6'))witness=[xx,yy];
   }
 });
 const art=paths.slice(1).map((d,i)=>d?`<path class="relic-ink-${i+1}" d="${d}" fill="${palette[i]}"/>`:'').join('');
 const [gx,gy]=witness||[18,8];
 const mode=glowing.has(shape)?'glow':fluttering.has(shape)?'flutter':'glint';
 const gleam=`<g class="relic-glint" opacity=".65" fill="${palette[5]}"><path d="M${gx} ${gy}h2v2h-2z"/><path d="M${gx+3} ${gy-2}h1v1h-1z"/></g>`;
 const out=`<svg class="upgrade-glyph artifact-portrait artifact-chest" data-rarity="${tier}" data-artifact-art="${id}" data-relic-motion="${mode}" viewBox="0 0 40 40" aria-hidden="true" shape-rendering="crispEdges" style="--relic-delay:-${(id.length+shape.length)%7*.41}s"><g class="artifact-chest-casing"><path d="M6 0h28v2h4v4h2v30h-2v3H2v-3H0V6h2V2h4z" fill="#101711"/><path d="M6 2h28v2h3v31h-3v2H6v-2H3V5h3z" fill="${tier==='boss'?'#573669':tier==='rare'?'#72582b':'#4b4634'}"/><path d="M6 4h28v2H6zM4 7h2v25H4zM34 7h2v25h-2zM7 34h26v2H7z" fill="${tier==='boss'?'#b58dcd':tier==='rare'?'#e2bd66':'#a69970'}"/><path d="M7 7h26v25H7z" fill="${bg}"/><path d="M8 8h24v2H10v20H8z" fill="${edge}" opacity=".45"/><path d="M0 10h7v5H0zM33 10h7v5h-7zM0 25h7v5H0zM33 25h7v5h-7z" fill="#8f794c"/><path d="M1 10h5v2H1zM34 10h5v2h-5zM1 25h5v2H1zM34 25h5v2h-5z" fill="#dfc887"/><path d="M2 13h2v2H2zM36 13h2v2h-2zM2 28h2v2H2zM36 28h2v2h-2z" fill="#352e20"/><path d="M15 32h10v6H15zM17 30h6v2h-6z" fill="#a98b4d"/><path d="M17 32h6v4h-6z" fill="#ead18d"/><path d="M19 33h2v3h-2z" fill="#3e3023"/></g><g class="relic-body" transform="translate(4 3) scale(.8)">${art}${gleam}</g>${tier==='boss'?'<path d="M18 2h4v2h2v3h-2v2h-4V7h-2V4h2z" fill="#d9b1ef"/><path d="M18 3h3v2h-3z" fill="#f3dbfa"/>':''}</svg>`;
 cache.set(id,out);return out;
}
export const artifactPortraitIds=Object.freeze(Object.keys(designs));
