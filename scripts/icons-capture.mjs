// Screenshot and geometry capture for the v2.0-icons build. Usage: PORT=4261 node scripts/icons-capture.mjs before|after
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome,until,delay} from './browser-probe.mjs';
const label=process.argv[2]||'after',port=process.env.PORT||'4261',base='http://127.0.0.1:'+port;
const out=path.resolve('outputs/icons-build',label);await fs.mkdir(out,{recursive:true});
const b=await chrome(['--mute-audio']),{ev,send}=b,report={shots:[],geometry:{},icons:{},errors:[],failed:[]};
const click=sel=>ev(`(()=>{const n=document.querySelector(${JSON.stringify(sel)});if(!n)throw Error('missing '+${JSON.stringify(sel)});n.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`);
const clickText=(sel,text)=>ev(`(()=>{const n=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}));if(!n)throw Error('missing '+${JSON.stringify(text)});n.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`);
const size=async(w,h)=>{await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});};
const release=/src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const geo=()=>ev(`(()=>{const r=n=>{const b=n.getBoundingClientRect();return [b.x,b.y,b.width,b.height].map(v=>Math.round(v*10)/10)};const sel=['#header button','#header .ascension-lives','.wb-sign','.rest-benefit','.rest-hub-tools>button','.flight-hud *','.flight-dock *','.world-map-node','.life-heart','.ico','.ui-icon','.map-stop-icon','.resource-symbol'];const o={};for(const s of sel){const l=[...document.querySelectorAll(s)];if(l.length)o[s]=l.slice(0,40).map(r)}return o})()`);
const icons=()=>ev(`(()=>[...document.querySelectorAll('[data-ui-icon]')].map(n=>{const b=n.getBoundingClientRect(),vb=n.viewBox?.baseVal,g=vb?vb.width:0;let W=b.width,H=b.height;if(n.ownerSVGElement){const m=n.parentNode.getScreenCTM();W=parseFloat(n.getAttribute('width'))*m.a;H=parseFloat(n.getAttribute('height'))*m.d;b.width=W;}return {name:n.dataset.uiIcon,w:Math.round(W*100)/100,h:Math.round(H*100)/100,grid:g,whole:g>0&&W>0&&Math.abs(W/g-Math.round(W/g))<0.02&&Math.abs(H/g-Math.round(H/g))<0.02,cls:(n.parentElement?.className||'').toString().slice(0,40)}}).filter(x=>x.w>0))()`);
async function shot(name,w,h){await delay(250);const file=`${name}-${w}x${h}.png`;await Promise.race([b.shot(path.join(out,file)),delay(20000).then(()=>{throw Error('screenshot timeout')})]);report.shots.push(file);try{report.geometry[`${name}-${w}x${h}`]=await geo();report.icons[`${name}-${w}x${h}`]=await icons();}catch(e){report.failed.push('geo '+name+' '+e.message)}}
const only=(process.env.ONLY||'').split(',').filter(Boolean);
async function step(name,fn){if(only.length&&!only.includes(name)&&['home','map','deck','rest','rest-cards','flight','reward','help-home','result','extra'].includes(name))return;try{await fn()}catch(e){report.failed.push(name+': '+e.message);console.log('FAIL',name,e.message)}}
async function seed(kind){
 await b.visit(base+'/components-preview.html?family=cards&state=reward');await until(()=>ev("document.documentElement.dataset.previewReady==='true'"),'seed page',100);
 await ev(`(async()=>{const M=await import('./model.mjs?v=${release}'),C=await import('./skill-cards.mjs?v=${release}');const s=M.newState();s.settings.skipTutorial=true;s.profile.tutorialComplete=true;s.profile.pickupCoachSkipped=true;s.profile.difficulty=3;s.run=M.createRun(s.profile,'travel-guide-6',2,{cards:true});const r=s.run;r.startingGiftId='card:body-spark';r.guideSkipped=true;r.companions=['collector'];r.companionRole='collector';r.mountedCards=['downbeat','glide-prism','downbeat-iii'].map((id,i)=>C.makeSkillCard(id,'proof:'+i));r.condensedGlow=90;r.lives=2;if(${JSON.stringify(kind)}==='result'){r.phase='ended';r.success=true;r.bossDefeated=true;r.endScore={v:1,runId:r.id,earned:1234,ascension:3,outcome:'won',flights:10,version:'x',complete:true};}if(${JSON.stringify(kind)}==='reward'){r.cardReward={id:'ui-earned',source:'flight',claimed:false,card:C.makeSkillCard('watchlight','ui-earned')};}M.saveState(s,{getItem:k=>localStorage.getItem('cards-pilot:'+k),setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});localStorage.setItem('emberwing-muted','true');})()`);
 await b.visit(base+'/game.html?cards=1');await until(()=>ev("!!document.querySelector('[data-action=play],[data-action=continue-run],[data-action=new-game]')"),'seed home',100);
}
const dismiss=async()=>{for(let i=0;i<4;i++){const hit=await ev(`(()=>{const n=[...document.querySelectorAll('button')].filter(x=>x.offsetParent).find(x=>/^(got it|tap to depart|remember & skip|continue)$/i.test(x.textContent.trim().replace(/\s+/g,' ')));if(!n)return false;n.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`);if(!hit)break;await delay(500);}};
const cont=async()=>{await click('[data-action=continue-run],[data-action=play]')};
try{
 for(const [w,h] of [[900,405],[667,300]]){
  await size(w,h);
  await step('home',async()=>{await seed('map');await delay(300);await shot('01-home',w,h);
   await step('settings-home',async()=>{await click('[data-action=settings]');await until(()=>ev("!!document.querySelector('.wb-settings')"),'settings',50);await shot('05-settings',w,h);await click('[data-action=settings-back]').catch(()=>click('[data-action=close-sheet]'));});});
  await step('map',async()=>{await seed('map');await cont();await until(()=>ev("!!document.querySelector('.world-map-node')"),'map',100);await shot('02-map',w,h);
   await step('bubble',async()=>{await click('.world-map-node[data-route-state=next][data-action=preview-node]');await until(()=>ev("!!document.querySelector('.preview-atlas')"),'preview',50);await shot('03-node-preview',w,h);await click('.preview-back');});
   await step('pause',async()=>{await click('[data-action=menu]');await until(()=>ev("!!document.querySelector('.wb-pause')"),'pause',50);await shot('04-pause',w,h);
    await step('help',async()=>{await click('[data-action=field-guide]');await delay(400);await shot('08a-help',w,h);});
    await step('mapkey',async()=>{await click('[data-action=map-key]');await delay(300);await ev("(()=>{const n=document.querySelector('dialog[open] [data-map-category]');n&&n.scrollIntoView({block:'start'})})()");await shot('08c-map-guide',w,h);await click('[data-action=close-sheet]');});
   });
  });
  await step('deck',async()=>{await seed('map');await cont();await until(()=>ev("!!document.querySelector('[data-action=skills]')"),'deck btn',100);await click('[data-action=skills]');await delay(500);await shot('06-deck-chain',w,h);
   await step('deck-tab',async()=>{await clickText('button,[role=tab]','Deck');await delay(300);await shot('06b-deck-tab',w,h);});});
  await step('rest',async()=>{await b.visit(base+'/game.html?mock=rest');await until(()=>ev("!!document.querySelector('.rest-benefit,.rest-hub,.card-rest-rail')"),'rest',100);await delay(500);await dismiss();await shot('07-rest',w,h);
   });
  await step('rest-cards',async()=>{await b.visit(base+'/game.html?mock=cards&scenario=rest');await until(()=>ev("!!document.querySelector('.card-rest-screen')"),'rest cards',100);await delay(500);await dismiss();await shot('07c-rest-cards',w,h);
   await step('workshop',async()=>{await click('[data-action=card-workshop]');await delay(400);await shot('07d-workshop',w,h);});});
  await step('flight',async()=>{await seed('map');await cont();await until(()=>ev("!!document.querySelector('.world-map-node[data-route-state=next]')"),'map',100);await click('.world-map-node[data-route-state=next][data-action=preview-node]');await click('.preview-advance');await until(()=>ev("!!document.querySelector('[data-action=wake-flight]')"),'flight',200);await click('[data-action=wake-flight]');await delay(1500);await dismiss();await delay(3500);await shot('09-flight',w,h);
   await step('flight-pause',async()=>{await click('[data-action=menu]');await delay(500);await shot('09b-flight-pause',w,h);});});
  await step('reward',async()=>{await seed('reward');await cont();await until(()=>ev("!!document.querySelector('.card-reward-equip')"),'reward',100);await shot('10-reward',w,h);});
  await step('result',async()=>{await seed('result');await delay(500);await shot('11a-home-after-win',w,h);await click('[data-action=score-view]');await delay(1500);await shot('11-result',w,h);});
  await step('extra',async()=>{for(const [name,url] of [['12-treasure','/game.html?mock=treasure'],['13-lantern-map','/game.html?mock=lantern-map'],['14-support','/game.html?mock=rest&scenario=support'],['15-first-light','/game.html?mock=cards&scenario=starter']]){await step(name,async()=>{await b.visit(base+url);await delay(2500);await dismiss();await shot(name,w,h);});}});
  await step('help-home',async()=>{await seed('map');await click('[data-action=settings]');await delay(300);await click('[data-action=field-guide]');await delay(500);await shot('08b-help-glossary',w,h);});
 }
 report.errors=b.errors;report.failed.push(...b.badResponses.map(x=>'bad '+JSON.stringify(x)));
}finally{await fs.writeFile(path.join(out,'report-'+(process.env.ONLY||'all')+'.json'),JSON.stringify(report,null,1));console.log(JSON.stringify({shots:report.shots.length,failed:report.failed,errors:b.errors},null,1));b.close();}
