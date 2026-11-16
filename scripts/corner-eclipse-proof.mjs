// Real card surfaces in a disposable sample game. No saved player data is used.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome, until, delay} from './browser-probe.mjs';

const output=path.resolve('work/corner-eclipse-proof');
await fs.mkdir(output,{recursive:true});
const release=/src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json','.webmanifest':'application/manifest+json'};
const hook=`\nwindow.__cornerProof={equip:async(ids)=>{const C=await import('./skill-cards.mjs?v=${release}');state.run.mountedCards=ids.map((id,i)=>C.makeSkillCard(id,'corner-proof:'+i));resetDeckChoices();showCards();},read:async(id,showStatus=true)=>{const C=await import('./skill-cards.mjs?v=${release}'),U=await import('./card-ui.mjs?v=${release}'),S=await import('./card-status.mjs?v=${release}'),card=C.makeSkillCard(id,'corner-read:'+id),status=showStatus?S.getEquippedCardStatuses({...state.run,mountedCards:[card]})[0]:null;document.querySelector('.card-read-face').innerHTML=U.cardFace(C.describeSkillCard(card),{status,slot:0});}};`;
const root=path.resolve('dist');
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error('outside dist');let data=await fs.readFile(file);if(url.pathname==='/app.mjs')data=Buffer.concat([data,Buffer.from(hook)]);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chrome(['--mute-audio','--disable-gpu']);
const base='http://127.0.0.1:'+server.address().port,{ev,send}=browser;
const wait=selector=>until(()=>ev(`!!document.querySelector(${JSON.stringify(selector)})`),selector,150);
const click=async selector=>{await wait(selector);await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);};
const settle=async()=>{await ev('document.fonts.ready');await ev(`Promise.all([...document.querySelectorAll('svg image')].map(n=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error(n.getAttribute('href')));image.src=n.getAttribute('href');})))`);await ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');};
const measure=()=>ev(`(()=>{const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return [...document.querySelectorAll('.skill-card')].filter(n=>n.getClientRects().length).map(card=>{const r=card.getBoundingClientRect(),band=card.querySelector('.card-rule-band'),heading=card.querySelector('header').getBoundingClientRect(),title=card.querySelector('h3').getBoundingClientRect(),status=card.querySelector('.card-config-status'),help=card.querySelector('.card-help'),uses=card.querySelector('.card-use-counter'),range=document.createRange(),texts=band?[...band.querySelectorAll('.card-rule-stripe')].flatMap(n=>{range.selectNodeContents(n);return [...range.getClientRects()];}).filter(t=>t.width&&t.height):[],b=band?.getBoundingClientRect(),art=card.querySelector('.card-illustration').getBoundingClientRect();return {id:card.dataset.cardHelp,rarity:card.getAttribute('aria-label'),width:r.width,height:r.height,artHeight:art.height,ruleHeight:b?.height,ruleOverflow:band?band.scrollHeight-band.clientHeight:0,textOutside:texts.some(t=>t.bottom>b.bottom+1||t.right>b.right+1),titleOutside:title.top<heading.top-1||title.bottom>heading.bottom+1,statusOverlap:status?texts.some(t=>overlap(t,status.getBoundingClientRect())):false,useOverlap:uses?texts.some(t=>overlap(t,uses.getBoundingClientRect())):false,helpOverlap:status&&help?overlap(help.getBoundingClientRect(),status.getBoundingClientRect()):false,frame:getComputedStyle(card,':before').backgroundImage,atlas:card.querySelector('svg[data-card-art] image')?.getAttribute('href'),font:band&&getComputedStyle(band.querySelector('.card-mechanic-main')).fontSize};});})()`);
const reports=[];
const inspect=async(width,height,surface,shot=false)=>{await settle();reports.push({width,height,surface,cards:await measure()});if(shot)await browser.shot(path.join(output,`${surface}-${width}x${height}.png`));};
try{
  await send('Network.setBypassServiceWorker',{bypass:true});
  for(const [width,height] of [[844,390],[740,333],[720,280]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    await browser.visit(base+'/game.html?cards=1&mock=cards');await wait('.card-equipped-foreground');
    await ev("__cornerProof.equip(['growth-seed-common','growth-seed','growth-seed-legendary'])");
    await inspect(width,height,'seed-tiers',true);
    await ev("__cornerProof.equip(['field-impulse','watchlight','harvest-legendary'])");
    await inspect(width,height,'long-rules-equipped',true);
    await click('[data-action="card-slot"][data-index="0"]');
    await inspect(width,height,'field-impulse-reader',true);
    const all=await ev(`(async()=>{const C=await import('./skill-cards.mjs?v=${release}');return Object.keys(C.SKILL_CARDS);})()`);
    for(const id of all){await ev(`__cornerProof.read(${JSON.stringify(id)})`);await inspect(width,height,'all-reader');await ev(`__cornerProof.read(${JSON.stringify(id)},false)`);await inspect(width,height,'all-unmounted-reader');}
    for(const id of ['twin-wick','devourer','refrain','tight-packing-iii']){await ev(`__cornerProof.read(${JSON.stringify(id)})`);await inspect(width,height,id+'-reader',true);}
    await click('[data-action="card-reading-back"]');
    for(let i=0;i<all.length;i+=3){await ev(`__cornerProof.equip(${JSON.stringify(all.slice(i,i+3))})`);await inspect(width,height,'all-equipped');}
    await click('[data-action="card-open-collection"]');await inspect(width,height,'collection',true);
  }
  const problems=reports.flatMap(report=>report.cards.filter(card=>card.ruleOverflow>1||card.textOutside||card.titleOutside||card.statusOverlap||card.useOverlap||card.helpOverlap||Math.abs(card.width/card.height-5/7)>.01||card.atlas!=='./assets/cards/skill-card-scenes-rare.webp').map(card=>({width:report.width,height:report.height,surface:report.surface,...card})));
  const badAssets=browser.badResponses.filter(r=>!r.url.endsWith('/favicon.ico'));
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({reports,problems,errors:browser.errors,badAssets},null,2)+'\n');
  console.log(JSON.stringify({output,checks:reports.length,problems:problems.length,errors:browser.errors,badAssets}));
  assert.equal(problems.length,0,JSON.stringify(problems.map(p=>({id:p.id,viewport:p.width+'x'+p.height,surface:p.surface,overflow:p.ruleOverflow,title:p.titleOutside,text:p.textOutside,status:p.statusOverlap,uses:p.useOverlap}))));assert.deepEqual(browser.errors,[]);assert.deepEqual(badAssets,[]);
}finally{browser.close();await new Promise(resolve=>server.close(resolve));await delay(100);}
