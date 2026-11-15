/** Original upright pixel illustrations for the card collection. Each subject is
 * composed on a 120×180 grid: slots and the inspector show the complete portrait.
 * No fonts, remote assets, filters, animation loops or generated element IDs. */
const r = (x,y,w,h,c,o=1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${o===1?'':` opacity="${o}"`}/>`;
const p = (d,c,o=1) => `<path d="${d}" fill="${c}"${o===1?'':` opacity="${o}"`}/>`;
const g = (x,y,content,s=1) => `<g transform="translate(${x} ${y}) scale(${s})">${content}</g>`;
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const C = Object.freeze({night:'#0a1518',deep:'#101f23',far:'#182e30',mid:'#25423b',rock:'#42584b',moss:'#7a8e59',mint:'#b4dcc0',white:'#f7f2cd',gold:'#e5bc73',blue:'#91bfd1',lilac:'#b4a9d1'});
const mote = (x,y,c=C.white,s=1) => r(x,y,s,s,c)+r(x-2,y+1,1,1,c,.3);
function aura(x,y,c=C.mint,s=1){return g(x,y,p('M-24-9h4v-7h6v-5h28v5h6v7h4V9h-4v7h-6v5h-28v-5h-6V9h-4Z',c,.035)+p('M-17-6h4v-6h7v-3H6v3h7v6h4V6h-4v6H6v3H-6v-3h-7V6h-4Z',c,.065)+p('M-11-4h3v-5H8v5h3V4H8v5H-8V4h-3Z',c,.10),s);}
function wisp(x,y,s=1,c=C.white){return g(x,y,aura(0,0,c,1.2)+p('M-6-10H6v2h3v3h2V5H9v3H6v2H-6V8H-9V5h-2V-5h2v-3h3Z','#546c63')+p('M-5-8H5v2h3V6H5v2H-5V6h-3V-6h3Z','#c4d1b3')+p('M-3-6H3v2h3V4H3v2H-3V4h-3V-4h3Z',c)+r(-4,-5,4,5,'#fffce0'),s);}
function collector(x,y,s=1){return g(x,y,aura(0,0,C.mint,.7)+p('M-4-8h8v2h3v3h2v6H7v3H4v2h-8V6h-3V3h-2v-6h2v-3h3Z','#426b61')+p('M-3-6h6v2h3v8H3v2h-6V4h-3v-8h3Z',C.mint),s);}
function spark(x,y,s=1,c=C.white){return g(x,y,aura(0,0,c,.5)+p('M0-8h3v4h4v4h3v3H5v4H2v3h-3V5h-4V1h-3v-3h5v-4h3Z','#879a72')+p('M0-6h2v4h4v3H3v4H0V2h-4v-3h4Z',c),s);}
function cube(x,y,s=1){return g(x,y,aura(13,12,C.gold,1.1)+p('M0 4 8 0h18l8 5v24l-8 5H8l-8-5Z','#1b2d27')+p('M2 6h23v25H2Z','#7d865b')+p('M25 6 32 3v24l-7 4Z','#3d5844')+p('M2 4 9 1h22l-7 4Z','#bbbd80')+r(6,10,15,17,'#c5d29c')+r(9,13,10,11,'#f4eac0')+r(9,14,2,5,'#fffbdd')+r(3,29,20,2,'#a9ad75')+r(27,10,2,13,'#718459'),s);}
function flash(x,y,s=1){return g(x,y,aura(0,0,'#d6e6cf',1.1)+p('M-2-20h4v5h4v6h4v6h4v6h4v7h-36V3h4v-6h4v-6h4v-6h4Z','#5c8c84')+p('M-1-16h2v6h4v6h4v6h4v5h-26V2h4v-6h4v-6h4Z','#d5ead7')+p('M-1-9h2v6h4v6h3v2H-8V3h3v-6h4Z','#fffbdc'),s);}
function pine(x,y,s=1,c=C.far){return g(x,y,p('M-2 0h4v-8h12v-4H8v-5h6v-4H7v-6h4v-3H5v-7h3v-4H3v-8H-2v8h-5v4h3v7h-7v3h4v6h-8v4h6v5h-7v4h14Z',c),s);}
function branch(x,y,s=1,c='#182c2a'){return g(x,y,p('M0 0h8v-26h7v-5h9v-5H13v4H7v-19H1v25h-6v-8h-7v-7h-5v11h8v9h9Z',c),s);}
function ring(x,y,s=1,c=C.mint){return g(x,y,p('M-29-8h3v-9h6v-6h10v-3H10v3h10v6h6v9h3V8h-3v9h-6v6H10v3H-10v-3h-10v-6h-6V8h-3Zm2 1V7h3v9h6v5h9v3H9v-3h9v-5h6V7h3V-7h-3v-9h-6v-5H9v-3H-9v3h-9v5h-6v9Z',c,.8),s);}
function wave(x,y,s=1,c=C.mint){return g(x,y,p('M0-28h4v5h6v7h5v9h3V7h-3v9h-5v7H4v5H0v-3h4v-6h6v-7h3v-24h-3v-7H4v-6H0Z',c)+r(8,-11,2,22,c,.24),s);}
function urn(x,y,s=1){return g(x,y,aura(0,-23,C.mint,1.6)+p('M-16-52h32v6h-4v9h8v10h5v27h-5v9h-8v5h-24V9h-8V0h-5v-27h5v-10h8v-9h-4Z','#263c36')+p('M-13-48h26v4H9v12h8v7h5v25h-5v6H9v5H-9V6h-8V0h-5v-25h5v-7h8v-12h-4Z','#637963')+p('M-15-26h9v-6H7v5h7v24H7v8H-7V0h-8Z','#98b28a')+p('M-4-27H5v6h6v16H5V2H-4V-4h-5v-17h5Z','#bad7a7')+p('M-1-24H3v7h3v8H2v8h-3V-8h-4v-8h4Z','#f1edbc')+r(-13,-48,26,2,'#b4bb8c')+r(-12,-40,23,3,'#2e4940')+r(-15,4,29,3,'#7f936a')+r(13,-15,4,12,'#496951')+r(-19,-19,2,11,'#c4c89b'),s);}
// The distant canopy, subject and near bank occupy separate vertical planes.
// No scene is a cropped or stretched landscape; essential shapes fit this grid.
function background(seed=0,{water=false,ruin=false,sky='#0c1a1e',haze='#2c4b46'}={}){
  let art=r(0,0,120,180,sky)+p('M39 11h42v11h10v27h8v79H21V49h8V22h10Z',haze,.10)+p('M47 22h26v9h9v27h8v76H30V58h8V31h9Z',haze,.12);
  art+=p('M0 77h8V62h10V51h12v16h10v19h14v-8h17v-9h15V51h12v13h10v13h12v55H0Z',haze,.28);
  art+=p('M0 111h9V94h12v8h8V87h11v20h11v-9h16v9h13V89h11v11h9V90h11v15h9v43H0Z',haze,.37);
  for(let i=0;i<9;i++){
    const x=[3,17,29,42,79,90,102,115,60][i],y=100+(i*13+seed*3)%28;
    art+=pine(x,y,.9+(i%3)*.22,i%2?'#203932':'#1a302e');
  }
  art+=p('M0 134h17v-5h15v4h19v-4h20v4h19v-5h17v4h13v48H0Z',haze,.38);
  if(ruin)art+=p('M8 140V59h5V45h15v7h-9v88Zm88 0V38h6V24h13v8h-7v108Z','#2c423b')+r(9,73,7,3,'#5a6c51')+r(97,53,9,3,'#5a6c51')+r(13,48,12,3,'#718063',.55)+r(102,27,10,2,'#788368',.55);
  if(water)art+=p('M35 133h48v9H71v12h15v8h17v18H15v-11h16v-12h14v-11H30v-8h5Z','#153532')+p('M38 137h39v1H38Zm7 10h22v1H45Zm-9 12h47v1H36Zm12 9h42v1H48Zm-24 7h41v1H24Z','#6d9a88',.42);
  art+=mote(32+(seed*7)%45,24,C.mint)+mote(91,54,C.mint)+mote(25,69,C.gold);
  return art;
}
function ground(seed=0,{water=false,top='#6c8058',ink='#293e32',left=true,right=true}={}){
  let art=water?p('M0 146h15v-6h13v7h10v10H26v13H15v10H0Zm85 34v-12h10v-19h12v-8h13v39Z',ink):p('M0 153h14v-7h18v4h15v-5h24v4h17v-5h17v6h15v30H0Z',ink);
  art+=water?p('M0 145h15v-6h13v7h9v4H24v-6h-8v6H0Zm95 4h12v-9h13v5h-10v8H95Z',top):p('M0 152h14v-7h18v4h15v-5h24v4h17v-5h17v6h15v4h-17v-5H89v5H70v-4H48v5H31v-4H15v6H0Z',top);
  for(let i=0;i<21;i++){const x=(i*31+seed*11)%120,y=157+(i*7+seed)%21;if(!water||x<25||x>99)art+=r(x,y,2+i%4,1,i%3?'#47634a':'#899462',i%2?.7:.5);}
  if(left)art+=pine(2,174,1.45,'#0a1c19')+branch(10,183,1.15,'#0a1b18');
  if(right)art+=pine(119,181,1.5,'#091b19')+branch(111,187,1.1,'#0a1b18');
  return art;
}
function rock(x,y,w=68){return g(x,y,p(`M0 11h7V5h9V1h${w-33}v4h10v5h7v14H0Z`,'#2b4238')+p(`M4 10h9V4h${w-28}v4h10v6H4Z`,'#68795b')+r(17,5,w-39,2,'#a6ad7b')+r(8,16,13,3,'#4a6248')+r(w-22,14,9,5,'#344f40'));}
const ladder = (x,y,c=C.gold) => g(x,y,p('M-4 0h8v3H4v8H1v8h-3v10h-3V17h3V7h-2Z',c,.48)+mote(1,9,c)+mote(-4,22,c));
function bodySpark(){
  return background(1,{sky:'#152021',haze:'#3a5140'})+aura(62,80,C.gold,2.7)+p('M18 140h8v-10h7v-13h8v-13h9V92h8V80h8v-9h8v5h-6v10h-7v14h-9v14h-9v13h-8v11h-8v8H18Z','#b6c499',.28)+ladder(36,113,C.mint)+wisp(48,102,1.9)+spark(74,66,2.2,C.gold)+mote(88,40,C.gold,2)+mote(51,47,C.white,2)+mote(91,99,C.gold)+ground(1)+p('M74 154v-14h3v8h5v-13h3v17h-7v5Z','#9bad69');
}
function pocketSparks(){
  return background(3,{ruin:true,sky:'#191d1c',haze:'#4b4d35'})+aura(61,88,C.gold,2.5)+rock(23,133,78)+g(31,76,p('M7 0h41v6h8v14h5v43h-6v10H2V63h-5V20h5V6h5Z','#25342b')+p('M7 7h39v12h9v42h-6v6H6v-7H2V21h5Z','#79633f')+p('M7 21h15v39H5V26h2Z','#a58953')+p('M27 21h27v40h-6v5H27Z','#564e34')+p('M7 7h39v12H7Z','#c2ae70')+p('M13 2h26v12H13Z','#35452f')+r(22,35,15,15,'#d9be73')+r(26,39,7,7,'#4b553a')+r(5,60,43,4,'#b19355')+r(46,25,4,27,'#3d4530'))+spark(47,68,.9,C.gold)+spark(72,49,1.1)+spark(88,76,.8,C.gold)+spark(47,34,.7)+spark(29,48,.55,C.gold)+spark(88,28,.6,C.gold)+mote(61,22,C.gold,2)+ground(2);
}
function deepVessel(){
  return background(5,{water:true,ruin:true,sky:'#111d24',haze:'#29474b'})+aura(60,96,C.mint,2.4)+rock(21,140,80)+urn(60,129,1.47)+p('M47 56h26v3H47Zm-4-5h34v2H43Z',C.mint,.75)+mote(38,81,C.mint,2)+mote(85,68,C.mint)+mote(81,123,C.white)+ground(3,{water:true})+r(42,157,36,1,C.mint,.6)+r(48,163,24,1,C.mint,.35);
}
function tightPacking(){
  return background(6,{ruin:true,sky:'#1a231d',haze:'#4b5036'})+aura(60,96,C.gold,2.7)+rock(18,139,88)+g(24,63,p('M0 20 12 9h54l9 10v67H0Z','#24372b')+p('M3 22h58v59H3Z','#796f48')+p('M61 22 72 13v62l-11 6Z','#45573a')+p('M3 20 15 12h55l-11 8Z','#b5a673')+p('M9 27h45v46H9Z','#253c30')+r(10,31,16,18,'#adc79a')+r(14,34,8,12,'#e5e7b2')+r(31,29,18,21,'#c2b374')+r(35,32,9,14,'#eee7ba')+r(10,53,18,17,'#c2b374')+r(14,56,10,11,'#eee7ba')+r(33,55,17,16,'#91aa87')+r(37,58,9,10,'#e2db9f')+r(5,25,4,51,'#d2bc7c')+r(54,25,4,51,'#d2bc7c')+r(9,74,45,4,'#c3aa6e')+r(9,48,45,4,'#b49a61')+p('M14 10V4h5V-4h9v8h5v7h-6V5h-7v5Z','#769364')+p('M47 12V-6h5V3h10v6H52v6Z','#a2955f'))+g(60,109,p('M-4-13h8v5h7v8h-3v6H4v5h-8V6h-7V0h-3v-8h10Z','#354a36')+p('M-3-9h6v5h5v7H3v5h-6V3h-5v-7h5Z','#e4dca3')+r(-2,-2,4,4,'#5a724f'))+mote(61,42,C.gold,2)+mote(89,55,C.gold)+ground(4);
}
function echo(){
  return background(8,{water:true,sky:'#121b27',haze:'#3d4659'})+aura(60,83,C.lilac,2.1)+g(24,32,p('M0 89V29h5V17h8V8h12V2h22v6h12v9h8v12h5v60H55V32h-6v-9H23v9h-6v57Z','#35464b')+p('M3 28h5V17h9V9h12V5h15v4h12v8h9v11h4v60H59V31h-7V19H20v12h-7v57H3Z','#697b7a')+r(5,47,9,3,'#a2afa4')+r(59,65,9,3,'#9aa69b')+r(20,11,15,3,'#bec3ae')+r(3,84,12,4,'#94a18c')+r(58,84,11,4,'#94a18c'))+wisp(60,83,1.14,'#e4e0d1')+p('M27 126h9v24h6v8h9v4h18v-4h9v-8h6v-24h9v30h-8v8H73v5H48v-5H35v-8h-8Z','#7b8fa0',.52)+r(51,132,18,3,'#d4d4d1',.7)+r(55,139,10,3,'#b2bec0',.5)+r(24,125,73,1,'#c3cdda',.55)+mote(45,45,C.lilac)+mote(82,96,C.lilac)+ground(5,{water:true});
}
function chameleon(){
  return background(11,{sky:'#14201f',haze:'#455343'})+aura(68,94,'#b2cd8b',2.1)+p('M8 159h12v-12h13v-11h16v-12h15v-11h16v-11h16V90h17v-9h7v9h-13v11H94v12H78v11H64v12H48v11H34v11H22v9H8Z','#485b38')+p('M10 157h13v-12h13v-11h16v-12h15v-11h16v-11h15V88h15v-5h7v4h-13v13H96v12H80v12H65v12H49v11H35v11H22v6H10Z','#929b64')+p('M37 107h9v-9h10V87h22v-9h17v7h9v17H91v-6H79v12H64v-4H52v11H40v12H29v13H17v-6h-6v-14h6v-9h10v6h-9v11h6v-8h8v-13Z','#2f4b35')+p('M41 101h12V91h25v-9h15v8h8v9H89v-8H78v11H61v-4H49v10h-8Z','#8fb36b')+p('M56 93h20v5H56Z','#c7d591')+p('M80 85h13v6H80Z','#bed48d')+r(94,87,7,7,'#e7e0b2')+r(98,88,3,4,'#193b2c')+r(100,95,4,2,'#c0c780')+p('M54 104h7v15h-10v-4h3Zm22-2h7v12H73v-4h3Z','#84a55d')+p('M41 105v9h-9v7h-9v12h5v5h10v-5h5v-9h-5v-4H28v5h-5v-10h17v5h9v17h-7v7H24v-5h-8v-20h7v-9h10v-5Z','#b79d69')+p('M39 108v5h-9v7h-9v15h6v5h12v-5h6v-10h-5v-3H29v4h-4v-8h13v5h8v12h-6v7H26v-5h-8v-17h7v-8h10v-4Z','#d0b67b')+mote(60,48,C.mint)+mote(93,57,C.gold)+ground(6);
}
function fieldImpulse(){
  return background(12,{water:true,sky:'#0f2021',haze:'#2b5149'})+aura(60,88,C.mint,2.55)+ring(60,88,1.5,'#658f78')+ring(60,88,1.15,C.mint)+p('M32 124h7v-9h7v-10h8v-9h9v-8h10v4h-7v9h-9v9h-8v9h-7v10H32Z','#e0ecc4',.6)+collector(60,88,2.0)+spark(28,112,.65)+spark(86,62,.6)+spark(87,113,.55)+mote(47,49,C.white,2)+mote(62,134,C.mint)+ground(7,{water:true});
}
function liftGuide(){
  return background(13,{sky:'#1a2425',haze:'#3e5047'})+p('M0 145h17v-17h17v-16h17V96h17V80h17V64h16V48h19v7h-14v17H90v16H74v16H57v16H41v16H23v17H0Z','#3b5340')+p('M0 145h17v-17h17v-16h17V96h17V80h17V64h16V48h19v3h-16v17H88v16H72v16H55v16H39v16H21v17H0Z','#829367')+aura(65,64,C.gold,1.9)+g(49,45,p('M5 0h25v6h6v38h-6v6H5v-6H0V6h5Z','#344536')+p('M5 5h25v39H5Z','#718261')+p('M9 20h5v-6h7v6h5v7h-5v-6h-7v6H9Zm0 14h5v-6h7v6h5v7h-5v-6h-7v6H9Z',C.gold)+r(14,47,8,52,'#4f6948')+r(15,48,2,48,'#b0ae75')+r(5,5,25,3,'#bdbe89'))+wisp(29,119,.8)+p('M38 110h5v-7h6v-8h7v-6h5v4h-4v7h-6v8h-6v7h-7Z',C.gold,.8)+mote(79,30,C.gold,2)+ground(8,{left:true,right:false});
}
function rhythm(){
  return background(17,{water:true,sky:'#111c25',haze:'#304b50'})+aura(61,88,C.blue,2.55)+p('M26 136h6v-13h9v-17h10V88h11V71h10V53h7v4h-4v18H65v17H55v18H45v17h-9v14H26Z','#9dc7b5',.22)+wave(28,116,.8,'#89b8ba')+wave(48,91,1.04,'#a7d4c5')+wave(73,63,1.32,'#e0edc9')+wisp(26,137,.75)+spark(47,105,.38,C.mint)+spark(69,76,.46,C.white)+spark(92,42,.5,C.white)+mote(84,28,C.blue)+mote(24,78,C.mint)+ground(9,{water:true})+r(38,159,37,1,C.blue,.6)+r(48,165,25,1,C.mint,.4);
}
function harvest(tier){
  const legendary=tier==='legendary',rare=tier==='rare',c=legendary?C.gold:rare?C.blue:C.mint;
  let art=background(20+(rare?1:legendary?2:0),{water:true,ruin:rare,sky:legendary?'#211f24':rare?'#101e29':'#10251d',haze:legendary?'#504335':rare?'#2d4b55':'#35563c'});
  art+=aura(61,91,c,2.55);
  if(legendary){
    art+=p('M55 147V98H37V84H22V66h-9V44h7v17h9v16h15v13h12V66H45V49H32V32h7v13h13v16h11V46h15V30h7v21H69v23h14V64h16V46h7v25H89v12H69v64Z','#73623e')+p('M59 145V94H41V81H26V63h-9V46h2v17h10v16h15v13h16V63H49V47H36V34h2v13h13v16h12V48h17V32h2v18H66v29h18V68h18V48h2v21H87v13H65v63Z','#c9b071')+spark(34,32,.8,c)+spark(17,44,.7,c)+spark(83,29,.95,c)+spark(104,45,.65,c)+cube(81,119,.65);
  }else{
    art+=p('M56 146V90h5V75h5v14h-3v57Zm-15-1v-37H30V95h-9v-7h13v15h12v42Zm32 1v-30h10v-15h11v7h-7v13H78v25Z',rare?'#567f79':'#839866')+spark(63,72,1.5,c)+spark(26,86,.9,c)+(rare?spark(94,98,.8,c):'')+p('M35 145h-9v-18h-7v-12h4v10h7v17h5Zm48 1v-15h10v-13h3v16H87v12Z','#5b825d');
  }
  art+=wave(34,99,1.18,c)+wave(18,99,.79,c)+mote(91,83,c)+mote(56,121,c,2);
  return art+ground(11,{water:true,top:legendary?'#938555':'#708962'});
}
function secondEmber(){
  return background(25,{ruin:true,sky:'#1d1d20',haze:'#534d35'})+aura(60,104,'#e0a46d',2.6)+p('M16 144V94h7V72h11V57h52v15h11v22h7v50Z','#2b3b31')+p('M22 140V95h8V76h11V63h38v13h11v19h8v45Z','#72765a')+p('M34 137V98h8V83h36v15h9v39Z','#162923')+r(40,65,18,5,'#a2a87a')+r(63,65,15,5,'#a5aa7b')+r(25,102,9,20,'#929c73')+r(89,103,7,18,'#4e644b')+r(31,137,59,6,'#a58a54')+r(37,130,21,6,'#775537')+r(65,130,20,6,'#8b603c')+g(46,115,p('M-8 9V-3h5v-10h4v-14h4v14h5v8h5V9h-5v8H-5V9Z','#bb7d46')+p('M-3 9V-2h5v-12h3V0h5v11H6v3H0v-5Z','#f1cf87')+r(1,3,4,11,'#fff2bd'))+g(73,112,p('M-7 11V0h4v-11h5v-15h4v17h5v10h4v12h-5v6H-4v-6Z','#ca8f50')+p('M-2 11V1h4v-11h3V3h5v10H6v3H0v-5Z','#f3d48e')+r(2,4,4,10,'#fff1bc'))+mote(47,43,C.gold,2)+mote(77,84,C.gold)+mote(60,79,'#d9b17a')+ground(13,{top:'#8a8257'});
}
function growthSeed(){
  return background(28,{sky:'#11231b',haze:'#36553a'})+aura(61,93,'#add397',2.6)+rock(19,137,85)+g(59,136,p('M-4 0V-38h-16v-8h-12v-14h-7v-24h19v8h14v20H0v-25h9v-16h15v-7h19v23h-8v17H20v12H5V0Z','#355b3d')+p('M-2-3v-37h-16v-10h-11v-13h-7v-17h14v8h13v21H2v-27h10v-15h14v-7h14v15h-8v17H18v13H4v52Z','#85ad68')+p('M3-53v-23h10v-15h15v-5h8v6H25v13H14v13H7v11Z','#c7d58e')+p('M-4-53h-10v-12h-11v-8h-7v-4h10v8h12v11h6Z','#b2c981')+p('M-2-4h6v12h12v7h10v5h-5v-4H9v-5H1v10h-6v-8h-10v6h-5v-8h11V5h7Z','#b4ad72')+r(-1,-38,4,32,'#d7dca0'))+mote(39,78,C.mint,2)+mote(89,106,C.mint)+spark(77,34,.5,'#ecedb2')+ground(14);
}
function cacheHandling(){
  return background(31,{ruin:true,sky:'#102124',haze:'#3e5547'})+aura(65,92,C.gold,2.2)+rock(38,123,64)+cube(43,77,1.5)+collector(31,129,1.5)+p('M33 113h5v-10h6V92h5v5h-2v10h-6v10h-8Z',C.mint,.8)+p('M26 108v-5h-6v-8h5v-8h5v5h-2v7h5v9Zm-9 23h-5v-11h-4v-9h3v8h5v9h1Z','#7da792')+spark(80,53,.65,C.gold)+mote(41,48,C.mint)+mote(91,94,C.gold)+ground(15);
}
function flashHandling(){
  return background(33,{water:true,sky:'#10212a',haze:'#2c4e51'})+p('M16 149h9v-16h9v-15h10v-16h10V86h11V71h13v5H68v16H58v16H48v16H38v15H28v16H16Z','#6f9c85',.5)+aura(72,65,'#cde0d5',2.3)+flash(72,67,1.8)+p('M97 54h11v3H97Zm-2 14h18v3H95Zm3 14h10v3H98Z','#c5d9c9',.6)+collector(38,127,1.5)+p('M45 115h5v-10h6V94h7V83h6v5h-4v11h-6v11h-7v10h-7Z',C.mint,.85)+mote(50,38,C.white,2)+mote(95,112,C.blue)+ground(16,{water:true});
}
const ART = Object.freeze({
  'body-spark':{name:'Body Spark',scene:bodySpark,description:'A golden natural Spark crossing the pale wisp in a deep woodland.'},
  'spark-cache':{name:'Pocket Sparks',scene:pocketSparks,description:'Six little Sparks spilling from a weathered woodland satchel.'},
  'deep-vessel':{name:'Deep Vessel',scene:deepVessel,description:'An ancient carved vessel holding a deep pool of mint light.'},
  'tight-packing':{name:'Tight Packing',scene:tightPacking,description:'A wooden travelling box tightly packed with glowing supplies and a visible gear.'},
  echo:{name:'Echo',scene:echo,description:'A ruined arch and its luminous reflection in still moonlit water.'},
  chameleon:{name:'Chameleon',scene:chameleon,description:'A green chameleon with a curled copper tail perched on a mossy branch.'},
  'field-impulse':{name:'Field Impulse',scene:fieldImpulse,description:'The mint Collector sweeping loose Sparks inside its circular search field.'},
  'lift-guide':{name:'Lift Guide',scene:liftGuide,description:'An amber chevron on a weathered guidepost above a rising forest passage.'},
  rhythm:{name:'Rhythm',scene:rhythm,description:'Three open luminous wavefronts travelling upward over a stream between dark banks.'},
  'harvest-common':{name:'Resonant Harvest',scene:()=>harvest('common'),description:'Mint resonance passing through a natural Spark growing among reeds.'},
  'harvest-rare':{name:'Resonant Harvest',scene:()=>harvest('rare'),description:'Blue resonance gathering light from Sparks beneath ancient forest ruins.'},
  'harvest-legendary':{name:'Resonant Harvest',scene:()=>harvest('legendary'),description:'Golden resonance flowing through a luminous tree and a small Stored Spark cache.'},
  'camp-kit':{name:'Second Ember',scene:secondEmber,description:'Two separate warm flames burning together in a ruined woodland hearth.'},
  'growth-seed':{name:'Growth Seed',scene:growthSeed,description:'A broad luminous sprout putting down roots through a mossy stone.'},
  'cache-handling':{name:'Cache Handling',scene:cacheHandling,description:'The mint Collector reaching for a dense glowing Cache cube on a ruined plinth.'},
  'flash-handling':{name:'Flash Handling',scene:flashHandling,description:'The small mint Collector climbing toward a brilliant triangular Flash above a stream.'},
});
export const CARD_ART_IDS = Object.freeze(Object.keys(ART));
const scenes = new Map();
export function cardArt(card = {}, {compact = false, size = null} = {}) {
  const requested=String(card?.cardId||card?.id||''),id=Object.hasOwn(ART,requested)?requested:'body-spark',entry=ART[id];
  if(!scenes.has(id))scenes.set(id,entry.scene());
  const tier=String(card?.rarity||'common'),ink=tier==='legendary'?C.gold:tier==='rare'?'#90b8af':'#627c65';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="skill-card-art skill-card-illustration card-art-${id}${compact?' card-art-compact':''}" data-card-art="${id}" data-art-size="${compact?'compact':size==='compact'?'compact':'full'}" viewBox="0 0 120 180" width="120" height="180" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" focusable="false" role="img" aria-label="${esc(entry.description)}">${scenes.get(id)}${p('M0 0h120v1H0ZM0 179h120v1H0ZM0 0h1v180H0ZM119 0h1v180h-1Z','#0b1917')}${r(1,1,118,1,ink,.5)}${p('M1 1h8v1H2v6H1ZM111 1h8v7h-1V2h-7ZM1 172h1v6h7v1H1Zm117 0h1v7h-8v-1h7Z',ink)}</svg>`;
}
