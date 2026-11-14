// Shared hand-pixelled route artwork. Explicit material colors survive map states.
const sprites={
 rest:'........6......./.......65......./.......655....../.....5.655....../.....556655...../....55666555..../....56666655..../.....566655...../......5555....../...222....222.../..234322223432../...2343333432.../.....234432...../...2234334322.../..23432..23432../...222....222...',
 flight:'................ /....4.........../...443.......4../..44332.....443./.4433322...44332/.43333222..43332/..333222....3322/.......66......./......655......./.....655......../......655......./.......655....../......655......./.....655......../....655........./....66..........',
 treasure:'................ /....77777777..../...7444444477.../..743333333347../..743333333347../..777777777777../...6666666666.../..777777777777../..743337733347../..743376673347../..743337733347../..743333333347../..744444444447../..777777777777../................ /................',
 encounter:'......555......./.....54445....../....5433345...../...543333345..../...543222345..../...532662235..../....3322233...../....4333334...../...443333344..../..44333333344.../..43333333334.../.4433333333344../.4333322333334../.4333222233334../..2222..2222..../................',
 warden:'..33........33../..343......343../..344333333443../...4433333444.../...4333333334.../...4322222234.../...4266226624.../...4322222234.../...4332332334.../....43233234..../....43333334..../.....432234...../.....443344...../......4444....../.......44......./................',
 frost:'.......4......../...4..444..4..../...44.454.44..../...454454454..../....4555554...../...443333344..../...432222234..../...426626624..../....4322234...../....4332334...../.....43234....../.....44344....../......444......./.......4......../................ /................',
 moon:'..55........55../.5445......5445./.54345....54345./.543345..543345./..543344443345../...5433333345.../....43222234..../....42662624..../....43222234..../.....433334...../.....443344...../....54444445..../...5445..5445.../..5445....5445../...55......55.../................',
 root:'..33..3..3..33../...3343..3433.../...3443333443.../....44333344..../...4433333344.../..443322223344../..433266263334../...4322222234.../....43366334..../....43655634..../.....436634...../.....443344...../....33444433..../...33..33..33.../..33...33...33../................',
 storm:'..444......444../.43334....43334./.432234..432234./.43223444432234./..433433334334../...4443333444.../....43266234..../....42622624..../....43266234..../.....436634...../.....436234...../......4664....../......4344....../.......44......./................ /................',
 sun:'.......55......./...5..5665..5.../...5555445555.../....54444445..../..554432234455../.56443222234465./..544266226445../5544322222234455/5644322222234465/..544226622445../.56443222234465./..554433334455../....54444445..../...5555445555.../...5..5665..5.../.......55.......'
};
const palettes={
 rest:['#101b20','#443127','#825237','#bd8653','#f39d48','#fff0af','#847353'],
 flight:['#111d23','#293b45','#58717a','#9ab6b1','#b1d2d3','#edf5d2','#728780'],
 treasure:['#191c25','#54412f','#956333','#d8a15a','#ffcc67','#fff0a7','#b89855'],
 encounter:['#1a1825','#302435','#67516f','#ad91b5','#8f73a9','#f4d7a9','#8c7a9c'],
 boss:['#111924','#253039','#586270','#a1b6ba','#bd665d','#fff0a7','#b9a16d'],
 frost:['#121d2e','#293750','#5b7c9a','#b5dee7','#78b5de','#fff4d8','#a0c4d4'],
 root:['#17201b','#303b26','#606e40','#a1b979','#bca351','#f5db8d','#a58b5a'],
 moon:['#1a1928','#322739','#76688c','#c5accf','#9a77bd','#ffe4b2','#bba5cd'],
 storm:['#151e2a','#293548','#607c9c','#aecbdb','#83bde5','#fff2b6','#afbfcc'],
 sun:['#211c21','#3b2835','#80534d','#c9966b','#e29945','#fff2b1','#c7a875']
};
const bosses={'hollow-warden':'warden','frost-matron':'frost','rootbound-heart':'root',moonweaver:'moon','storm-shepherd':'storm','hollow-sun':'sun'};
// Small local highlights; the fixed silhouettes carry the category without motion.
const highlights={
 flight:'<path class="landmark-motion trail-guide" d="M2 2h3v3H2zm-2 3h2v2h-2z" fill="#fffad5"/>',
 rest:'<path class="landmark-motion hearth-flare" d="M-5-22h4v6h4v5H0v4h-6v-5h-2v-5h3z" fill="#fff3a5"/><path class="landmark-motion hearth-ember" d="M2-24h2v3H2zm4-3h2v2H6z" fill="#ffca77"/>',
 treasure:'<path class="landmark-motion latch-glint" d="M1 0h2v3h3v2H3v3H1V5h-3V3h3z" fill="#fff0a7"/>',
 encounter:'<path class="landmark-motion pilgrim-lantern" d="M13 4h5v2h2v2h-2v7h-5V8h-2V6h2z" fill="#d69e63"/><path class="landmark-motion pilgrim-lantern" d="M14 8h3v5h-3z" fill="#ffefbc"/>'
};
const cache=new Map();
export function pixelLandmark(category,node={}){
 const shape=category==='boss'?(bosses[node.bossId]||'warden'):category==='elite'?'warden':category;
 const key=category+':'+shape;if(cache.has(key))return cache.get(key);
 const colors=palettes[shape]||palettes[category]||palettes.boss,rows=(sprites[shape]||sprites.flight).replaceAll(' ','').split('/');
 const size=category==='boss'?4:category==='elite'?2.8:3.5;
 // Store each ink as a single path. Long scans merge adjacent pixels of one
 // color, including the guardian's own eyes, without moving the mask.
 const materials=new Map();
 for(const [y,row] of rows.entries()){
  let x=0;
  while(x<row.length){
   const ink=row[x],start=x++;
   while(x<row.length&&row[x]===ink)x++;
   if(ink==='.')continue;
   const rect=`M${(start-8)*size} ${(y-8)*size}h${(x-start)*size}v${size}h-${(x-start)*size}z`;
   materials.set(ink,(materials.get(ink)||'')+rect);
  }
 }
 let art='';
 for(const [ink,d] of materials){
  const eyes=ink==='6'&&(category==='boss'||category==='elite');
  art+=`<path${eyes?' class="landmark-motion guardian-gaze"':''} fill="${colors[Number(ink)-1]}" d="${d}"/>`;
 }
 art+=highlights[category]||'';
 // Elites are smaller creatures; guardians carry a broad crown of warning sparks.
 if(category==='boss')art+='<path fill="#e9aa70" d="M-14-35h4v4h-4M-2-38h4v4h-4M10-35h4v4h-4"/>';
 const out=`<g class="map-pixel-portrait" data-pixel-kind="${category}" shape-rendering="crispEdges">${art}</g>`;cache.set(key,out);return out;
}
