import {artifactIcon} from './upgrade-icons.mjs?v=clear-rewards-1';

// Original, small world illustrations. Pixel light is layered geometry rather
// than SVG blur; motion is bounded CSS, never another animation-frame loop.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const glow=(x,y,ink='#cfe9b4',size=1)=>`<g transform="translate(${x} ${y}) scale(${size})" class="scene-aura">${path('M-18-8h4v-6h6v-4H8v4h6v6h4V8h-4v6H8v4H-8v-4h-6V8h-4Z',ink,'opacity=".055"')}${path('M-13-6h4v-5h5v-2H4v2h5v5h4V6H9v5H4v2H-4v-2h-5V6h-4Z',ink,'opacity=".10"')}${path('M-9-4h3v-4H6v4h3V4H6v4H-6V4h-3Z',ink,'opacity=".16"')}</g>`;
const orb=(x,y,{ink='#f3edc6',size=1,cls='scene-wisp',dim=false}={})=>`<g class="${cls}" transform="translate(${x} ${y})"><g class="scene-orb-body" transform="scale(${size})">${glow(0,0,ink,1.1)}${path('M-4-6h8v2h2v8H4v2H-4V4h-2V-4h2Z',dim?'#39493d':'#a5bda0')}${path('M-3-5h6v2h2V3H3v2H-3V3h-2V-3h2Z',dim?'#516252':ink)}${rect(-2,-3,4,5,dim?'#1c2e28':'#fff8d8')}${rect(-4,-2,1,3,'#e8ecc8',dim?'opacity=".2"':'opacity=".65"')}</g></g>`;
const cube=(x,y,{lit=true,cls='scene-cube'}={})=>`<g class="${cls}" transform="translate(${x} ${y})">${path('M0 3 5 0h10l5 3v14l-5 3H5l-5-3Z','#192e29')}${path('M1 4h14v14H1Z','#596e55')}${path('M15 4 19 2v14l-4 2Z','#354c3d')}${path('M1 3 5 1h13l-4 3Z','#a1aa79')}${path('M3 6h10v10H3Z',lit?'#c3d6a0':'#263c30')}${rect(5,8,6,6,lit?'#eff0c0':'#42543e')}${rect(6,9,4,4,lit?'#fff7d6':'#53634b')}${rect(3,4,9,1,'#b5c28b')}${rect(2,17,11,1,'#809168')}</g>`;
const spark=(x,y,delay=0,ink='#e5ebbe')=>`<g class="scene-spark" style="--spark-delay:${delay}s">${rect(x,y,2,2,ink)}${rect(x-1,y+1,1,1,ink,'opacity=".35"')}</g>`;
const textures=(seed=0)=>Array.from({length:26},(_,i)=>{const x=12+(i*37+seed*13)%134,y=64+(i*11+seed*5)%20;return rect(x,y,2+i%5,1,i%3===0?'#65705a':'#364a3d',`opacity="${i%2?.45:.7}"`);}).join('');
const scenery=(kind)=>{
 const forge=kind==='forge',dark=forge?'#171d20':'#10251f';
 return `<g class="scene-background">${path('M14 20h13V12h28V7h55v6h28v11h10v46h-8v12H18V70h-8V37h4Z',dark)}${path('M22 69 36 57 44 61 58 48 68 56 84 44 94 55 111 50 130 64 144 61v17H22Z',forge?'#25302b':'#20382d')}${path('M8 77h13v-6h22v3h17v-5h20v4h25v-4h25v3h22v8h-8v6H18v-3H8Z','#2e4335')}${path('M19 77h22v-3h18v2h22v-3h23v3h25v-2h18v4h-18v3h-25v-3H80v2H58v-2H39v2H19Z','#59644a')}${textures(forge?6:1)}${forge?'':`${path('M19 61V29h3V20h4v20h4v5h-4v24h-7Zm112 7V30h-4v-6h4V13h4v33h5v4h-5v18Z','#24392d')}${path('M17 33h9v-5h9v5h-8v8h-4v-5h-6Zm109-5h12v-7h7v5h-6v7h-13Z','#334b36')}${rect(20,32,1,27,'#61734c','opacity=".45"')}${rect(131,35,1,25,'#61734c','opacity=".3"')}`}</g>`;
};

function refillScene(){return `${scenery('recover')}${glow(81,54,'#bdddc1',2)}
 <g class="scene-stone">${path('M39 63h9v-7h9v-4h47v4h10v7h9v9h-9v6H48v-6h-9Z','#304c41')}${path('M47 60h10v-5h47v5h12v11h-12v4H57v-4H47Z','#75856a')}${path('M53 60h11v-3h33v3h13v9H97v3H64v-3H53Z','#1a443d')}${path('M57 62h12v-2h24v2h13v5H93v3H69v-3H57Z','#609783')}${path('M64 63h31v4H64Z','#b2d1a6')}${rect(50,70,13,2,'#a9ad7a')}${rect(98,71,13,2,'#818d62')}${rect(44,64,3,5,'#a1a477')}${rect(116,64,3,6,'#4b6650')}</g>
 <g class="scene-ripple scene-ripple-a">${path('M60 62h13v-2h16v2h13v2H90v2H72v-2H60Z','#d8e3b0','opacity=".65"')}</g>
 <g class="scene-ripple scene-ripple-b">${rect(54,68,18,1,'#dce1b0')}${rect(90,68,20,1,'#dce1b0')}</g>
 <g class="scene-refill-stream">${rect(79,41,3,16,'#adc79c','opacity=".42"')}${rect(80,47,2,14,'#f0e5b0','opacity=".75"')}${rect(75,52,2,4,'#dee6bc')}${rect(85,55,2,3,'#afcfaa')}</g>
 ${orb(81,34)}${spark(65,45,.2)}${spark(94,48,1.3)}${spark(73,56,.8)}${spark(92,35,2.1)}
 <g fill="#8d9767">${path('M34 72v-9h2v4h3v-5h2v8h-3v5h-2v-3Z','#6d8455')}${rect(124,69,3,9,'#627c51')}${rect(127,66,2,6,'#7e9560')}</g>`;}

function gatherScene(){return `${scenery('gather')}${glow(67,48,'#d9e5ae',1.8)}${glow(119,63,'#cfe7b4',1.05)}
 <g class="scene-pod">${path('M44 65V46h5V35h7V29h17v5h9v9h5v20h-6v7H53v-5Z','#263d2b')}${path('M48 48h5V37h9v-4h9v7h8v9h5v13h-8v5H53v-7h-5Z','#65794e')}${path('M53 46h6V36h8v6h4v12h-5v10H53Z','#93a069')}${path('M73 39h6v9h4v12h-8v6h-7V55h4v-9h1Z','#3f5c36')}${path('M66 35h4v8h-3v8h4v11h-5V52h-4v-9h4Z','#e4dba4')}${path('M66 40h2v8h-3v7h3v7h-2V51h-2v-7h2Z','#fff1bf')}${rect(52,42,2,8,'#b5b680')}${rect(49,57,3,5,'#7c8959')}${path('M58 29v-7h3v-5h3v10h6v-5h3v8Z','#526b40')}</g>
 <g class="scene-gather-flight">${orb(91,43,{size:.42,cls:'scene-travelling-light'})}${rect(83,41,3,2,'#d8dfae','opacity=".55"')}${rect(78,43,2,2,'#b8c999','opacity=".35"')}</g>
 ${cube(110,58)}<g class="scene-box-glint">${rect(116,64,6,6,'#fff7d7','opacity=".55"')}${rect(112,72,2,1,'#f4e4aa')}</g>
 ${path('M38 74h5v-7h2v-4h2v10h7v3H40Z','#647c4d')}${path('M88 76v-7h4v3h7v4Z','#3e5b37')}${spark(79,30,1.8)}${spark(104,52,.7)}${spark(119,48,2.3)}${spark(54,68,.1)}`;}

function heartScene(){return `${scenery('hearts')}${glow(83,53,'#dfc2a4',2.2)}
 <g class="scene-hearth">${path('M38 75V61h8V50h9v-8h48v8h10v11h9v14Z','#273b32')}${path('M44 72V61h8V50h12v-5h33v5h10v12h9v10Z','#69705a')}${path('M56 72V61h7V53h34v8h8v11Z','#182c27')}${rect(45,65,9,5,'#889275')}${rect(52,54,8,4,'#9da07a')}${rect(99,53,8,6,'#4d614b')}${rect(108,65,7,5,'#758266')}${rect(61,46,16,3,'#a1a782')}${rect(81,46,15,2,'#a1a782')}${rect(57,73,47,3,'#344d39')}${path('M62 68h7v-4h6v-5h7v5h9v5h8v4H62Z','#997b4d')}${path('M70 68h6v-4h7v4h9v4H70Z','#d4bc7e')}${rect(78,66,6,5,'#ede5aa')}</g>
 <g class="scene-rekindle-path">${rect(60,38,2,3,'#d4d49e')}${rect(69,30,3,2,'#d4d49e')}${rect(81,27,2,2,'#e1d4a2')}${rect(94,32,2,3,'#ebcfaa')}</g>
 ${orb(54,35,{size:.72,ink:'#f0dfb4',cls:'scene-wisp scene-heart-source'})}
 ${orb(107,36,{size:.72,ink:'#efcfb0',dim:true,cls:'scene-heart-target'})}
 <g class="scene-heart-ignite">${orb(107,36,{size:.72,ink:'#f7ddaf',cls:'scene-heart-restored'})}</g>
 ${spark(72,49,.2,'#e4c78f')}${spark(82,54,.8,'#eed69b')}${spark(95,45,1.7,'#e6caa0')}${rect(32,76,11,2,'#68774f')}${rect(121,75,9,2,'#73805a')}`;}

function skillsScene(){return `${scenery('skills')}${glow(81,44,'#c8dba7',2.2)}
 <g class="scene-tree">${path('M72 77h18v-7h-7V51h10V39h16V28h-4v8H90v11H80V32H67V21h-5v15h13v18H60V44H45v-9h-4v14h15v11h19v12h-3Z','#4b6547')}${path('M77 73h3V49h12v-9h14v-3H89v10H80V32H65v-9h-2v12h14v21H59V46H44v-9h-2v12h15v10h20Z','#9aaf79')}${path('M62 78h35v3H62Z','#78815c')}</g>
 ${orb(65,20,{size:.65,ink:'#e3e7b3',cls:'scene-tree-leaf'})}${orb(43,34,{size:.55,ink:'#d3e0b1',cls:'scene-tree-leaf'})}${orb(107,27,{size:.65,ink:'#f1dca5',cls:'scene-tree-leaf'})}${orb(82,45,{size:.78,ink:'#f1e9bd'})}${spark(92,18,.7)}${spark(57,61,1.8)}${spark(113,51,2.2)}`;}
function companionsScene(){return `${scenery('companions')}${glow(80,44,'#c8ddc0',2.2)}
 <g class="scene-bond-stones">${path('M50 75v-7h15v3h29v-3h17v8H50Z','#53664f')}${rect(57,69,7,2,'#8a9772')}${rect(97,69,8,2,'#8a9772')}${path('M65 76h31v4H65Z','#7f8b66')}</g>
 <g class="scene-orbit-dust">${rect(60,28,2,2,'#6c8e70')}${rect(97,26,2,2,'#7f977d')}${rect(110,42,2,2,'#728c7b')}${rect(96,62,2,2,'#9b9971')}${rect(61,62,2,2,'#748b78')}${rect(48,44,2,2,'#739486')}</g>
 ${orb(80,43,{size:1.3})}${orb(53,34,{size:.66,ink:'#b8dfa0',cls:'scene-companion-one'})}${orb(104,51,{size:.66,ink:'#92bfdf',cls:'scene-companion-two'})}${orb(94,20,{size:.47,ink:'#efd08f',cls:'scene-companion-three'})}${orb(65,64,{size:.47,ink:'#a5dfd6',cls:'scene-companion-four'})}`;}

function forgeScene(artifactId){
 const relic=artifactIcon(artifactId||'quiet-cinder').replace('class="upgrade-glyph"','class="choice-relic" x="0" y="0" width="24" height="24"');
 return `${scenery('forge')}${glow(73,55,'#dfb47c',2.4)}${glow(128,69,'#e2d9a1',1.1)}
 <g class="scene-forge-back">${path('M40 70V42h7V27h48v14h9v30Z','#263630')}${path('M47 43V29h48v14h7v25H42V43Z','#465547')}${rect(49,31,17,4,'#66705b')}${rect(69,31,22,4,'#68715d')}${rect(44,43,15,8,'#5a6651')}${rect(62,39,15,8,'#65705a')}${rect(80,42,16,7,'#56634f')}${rect(45,54,8,12,'#829072')}${rect(92,54,7,12,'#485a47')}${path('M54 64V49h6v-7h24v7h7v15Z','#151f20')}${path('M58 65V52h7v-7h15v7h7v13Z','#795a3f')}${path('M63 65V55h6v-8h7v8h6v10Z','#bc9053')}${path('M69 64V54h7v10Z','#ebd99c')}</g>
 <g class="forge-artifact" transform="translate(61 5)">${glow(12,12,'#d9c29b',.75)}${rect(-3,-2,30,2,'#4e5547')}${rect(-3,-2,2,23,'#606a53')}${rect(25,-2,2,23,'#606a53')}${relic}</g>
 <g class="forge-ghost" transform="translate(65 31)">${path('M2 0h10v3h3v10h-3v3H2v-3h-3V3h3Z','#e4c48d','opacity=".35"')}${rect(4,4,6,8,'#fff0bd','opacity=".35"')}</g>
 <g class="scene-forge-front">${path('M37 70h7V58h10v7h40v-7h10v12h5v8H37Z','#364638')}${path('M45 62h9v5h40v-5h9v10H45Z','#7b7a59')}${path('M54 64h40v5H54Z','#dcbb73')}${rect(57,65,34,2,'#f7df9a')}${path('M94 67h16v7h9v5h-15v-6H94Z','#716d4c')}${path('M95 67h13v6h9v3h-12v-5H95Z','#d5b875')}${rect(97,67,9,2,'#f2dfa0')}${rect(109,73,7,2,'#efe3ad')}${rect(41,73,17,3,'#8c8d67')}${rect(64,73,22,2,'#717b5b')}${rect(91,73,12,3,'#535f46')}${path('M33 80h74v4H30v-2h3Z','#1b3028')}</g>
 <g class="forge-pour">${rect(115,74,3,8,'#f4df9d')}${rect(118,77,2,5,'#ceb87b')}</g>
 ${cube(124,64,{cls:'forge-output-cube'})}
 <g class="forge-output-light">${rect(130,72,6,6,'#fff7d7','opacity=".75"')}${glow(133,74,'#e4ecb2',.75)}</g>
 <g class="forge-ash">${rect(65,42,3,2,'#c4c2a0')}${rect(79,37,2,2,'#dec693')}${rect(88,49,2,3,'#c3a66e')}${rect(59,50,2,2,'#d3c29a')}</g>
 ${spark(60,54,.3,'#f2c984')}${spark(85,49,1.4,'#f3d5a0')}${spark(104,60,2.1,'#d8bc83')}
 <g class="scene-anvil">${path('M18 72h17v5H20v4h-3v-4h-5v-3h6Z','#697365')}${rect(20,76,8,7,'#364a3d')}${rect(17,82,15,2,'#8b8d6d')}</g>`;
}

/** Decorative by default: exact resource loss/gain belongs in adjacent UI. */
function rechargeScene(){return `${path('M24 72h112v7H24zM33 64h94v8H33z','#54665c')}${path('M40 59h30v5H40zM90 59h30v5H90z','#b0ba95')}<g transform="translate(40 30) scale(1)">${artifactIcon('glow-wick').replace('<svg ','<svg width="32" height="32" ')}</g><g transform="translate(90 30) scale(1)">${artifactIcon('flash-stone').replace('<svg ','<svg width="32" height="32" ')}</g><g class="scene-refill-stream">${rect(55,15,3,16,'#f2edbb')}${rect(105,19,3,12,'#d9e7b7')}${rect(48,20,3,5,'#9cc79c')}${rect(114,14,3,5,'#9cc79c')}</g>${orb(81,17)}${spark(69,30,.2)}${spark(95,27,1.2)}`;}
export function choiceScene(kind,{artifactId=null,phase='preview',label=null}={}){
 const canonical=kind==='refillGlow'?'recover':kind;
 const type=['recover','gather','hearts','forge','skills','companions','recharge'].includes(canonical)?canonical:'recover';
 const content=type==='recharge'?rechargeScene():type==='skills'?skillsScene():type==='companions'?companionsScene():type==='forge'?forgeScene(artifactId):type==='gather'?gatherScene():type==='hearts'?heartScene():refillScene();
 const accessible=label?`role="img" aria-label="${esc(label)}"`:'aria-hidden="true"';
 return `<span class="choice-scene choice-scene-${type}" data-kind="${type}" data-phase="${phase==='complete'?'complete':'preview'}" ${accessible}><svg viewBox="0 0 160 90" fill="none" shape-rendering="crispEdges" focusable="false">${content}</svg></span>`;
}
