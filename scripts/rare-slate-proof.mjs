// Production card faces at phone sizes, in a disposable, unsaved sample game.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome, until, delay} from './browser-probe.mjs';

const output = path.resolve('work/rare-slate-proof');
await fs.mkdir(output,{recursive:true});
const release = /src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json','.webmanifest':'application/manifest+json'};
const hook=`\nwindow.__rareProof={equip:async(ids)=>{const C=await import('./skill-cards.mjs?v=${release}');state.run.mountedCards=ids.map((id,i)=>C.makeSkillCard(id,'rare-proof:'+i));resetDeckChoices();showCards();}};`;
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve('dist','.'+url.pathname);if(!file.startsWith(path.resolve('dist')+path.sep))throw Error('outside dist');let data=await fs.readFile(file);if(url.pathname==='/app.mjs')data=Buffer.concat([data,Buffer.from(hook)]);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chrome(['--mute-audio','--disable-gpu']);
const {ev,send}=browser;
const wait=selector=>until(()=>ev(`!!document.querySelector(${JSON.stringify(selector)})`),selector,150);
const click=async selector=>{await wait(selector);await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);};
const size=async(width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});};
const visit=async()=>{await browser.visit(base+'/game.html?cards=1&mock=cards');await wait('.card-equipped-foreground');await ev('document.fonts.ready');};
const settle=async()=>{await ev(`Promise.all([...document.querySelectorAll('svg image')].map(n=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error(n.getAttribute('href')));image.src=n.getAttribute('href');})))`);await delay(100);};
const measure=()=>ev(`(()=>{const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return [...document.querySelectorAll('.skill-card')].filter(n=>n.getClientRects().length).map(card=>{const r=card.getBoundingClientRect(),band=card.querySelector('.card-rule-band'),heading=card.querySelector('header').getBoundingClientRect(),title=card.querySelector('h3').getBoundingClientRect(),status=card.querySelector('.card-config-status'),help=card.querySelector('.card-help'),range=document.createRange(),texts=band?[...band.querySelectorAll('.card-rule-stripe')].flatMap(n=>{range.selectNodeContents(n);return [...range.getClientRects()];}).filter(t=>t.width&&t.height):[],b=band?.getBoundingClientRect();return {id:card.dataset.cardHelp,rarity:card.getAttribute('aria-label'),width:r.width,height:r.height,ruleOverflow:band?band.scrollHeight-band.clientHeight:0,textOutside:texts.some(t=>t.bottom>b.bottom+1||t.right>b.right+1),titleOutside:title.top<heading.top-1||title.bottom>heading.bottom+1,statusOverlap:status?texts.some(t=>overlap(t,status.getBoundingClientRect())):false,helpOverlap:status&&help?overlap(help.getBoundingClientRect(),status.getBoundingClientRect()):false,frame:getComputedStyle(card,':before').backgroundImage,atlas:card.querySelector('svg[data-card-art] image')?.getAttribute('href'),bands:band?[...band.querySelectorAll('[data-rule-type]')].map(n=>({type:n.dataset.ruleType,background:getComputedStyle(n).backgroundColor})):[]};});})()`);
const reports=[];
try{
  await send('Network.setBypassServiceWorker',{bypass:true});
  await size(844,390);
  await browser.visit(base+'/loading.html');
  await until(()=>ev("location.pathname==='/loading.html'"),'atlas origin',150);
  if(process.argv.includes('--generate-atlas')){
    const data=await ev(`(async()=>{const image=new Image();image.src='./assets/cards/skill-card-scenes.webp';await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=320;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';for(let y=0;y<4;y++)for(let x=0;x<4;x++)ctx.drawImage(image,x*313,y*313,313,313,x*80,y*80,80,80);return canvas.toDataURL('image/webp',1).split(',')[1];})()`);
    await fs.writeFile('dist/assets/cards/skill-card-scenes-rare.webp',Buffer.from(data,'base64'));
  }
  for(const [width,height] of [[844,390],[740,333],[720,280]]){
    await size(width,height);await visit();
    await ev("__rareProof.equip(['rhythm','watchlight','growth-seed'])");await settle();
    const fitted=await measure();reports.push({width,height,surface:'equipped-dense',cards:fitted});
    await browser.shot(path.join(output,`equipped-dense-${width}x${height}.png`));
    await click('[data-action="card-slot"][data-index="1"]');await settle();
    const dense=await measure();reports.push({width,height,surface:'dense-reader',cards:dense});
    await browser.shot(path.join(output,`dense-reader-${width}x${height}.png`));
    await click('.card-read-face [data-rule-type="condition"] [data-card-term]');await wait('.card-term-dialog[open]');await click('[data-card-term-close]');
    await click('[data-action="card-reading-back"]');
    await ev("__rareProof.equip(['growth-seed-common','growth-seed','growth-seed-legendary'])");await settle();
    reports.push({width,height,surface:'seed-tiers',cards:await measure()});
    await browser.shot(path.join(output,`seed-tiers-${width}x${height}.png`));
    await click('[data-action="card-open-collection"]');await wait('.card-deck-browser');await settle();
    reports.push({width,height,surface:'collection',cards:await measure()});
    await browser.shot(path.join(output,`collection-${width}x${height}.png`));
    await click('[data-action="card-select"][data-id="sample:stored:2"]');await settle();
    const all=await ev(`(async()=>{const C=await import('./skill-cards.mjs?v=${release}'),U=await import('./card-ui.mjs?v=${release}');window.rareCards=Object.values(C.SKILL_CARDS).filter(c=>c.rarity==='rare');window.rareFixture=id=>document.querySelector('.card-read-face').innerHTML=U.cardFace(C.describeSkillCard(C.makeSkillCard(id,'rare-art:'+id)));return rareCards.map(c=>c.id);})()`);
    for(const id of all){await ev(`rareFixture(${JSON.stringify(id)})`);await settle();reports.push({width,height,surface:'all-rare-reader',cards:await measure()});}
    for(let i=0;i<all.length;i+=3){await ev(`__rareProof.equip(${JSON.stringify(all.slice(i,i+3))})`);await settle();reports.push({width,height,surface:'all-rare-equipped',cards:await measure()});}
  }
  await browser.visit(base+'/card-art-preview.html');await wait('[data-art-card="flash-handling"]');
  await until(()=>ev("document.querySelectorAll('.art-card-variant canvas').length===2"),'initial art preview',150);await click('[data-art-card="flash-handling"]');
  await until(()=>ev("[...document.querySelectorAll('.art-card-variant canvas')].filter(n=>n.dataset.source==='./assets/cards/skill-card-scenes-rare.webp').length===2"),'Rare preview atlas',150);
  // Use the actual service worker, then reload with the network unavailable.
  await send('Network.setBypassServiceWorker',{bypass:false});
  await ev("(async()=>{await navigator.serviceWorker.register('./worker.js',{scope:'./',updateViaCache:'none'});await navigator.serviceWorker.ready;})()");
  await browser.visit(base+'/loading.html');await until(()=>ev("location.pathname==='/loading.html'"),'worker-controlled document',150);
  await until(()=>ev('!!navigator.serviceWorker.controller'),'prepared offline worker',150);
  const cached=await ev("(async()=>{const names=await caches.keys(),cache=await caches.open(names.at(-1)),paths=['assets/cards/skill-card-scenes-rare.webp','assets/rare-slate-frame.svg'];return Promise.all(paths.map(async path=>({path,ok:!!(await cache.match(new URL(path,location.href).href))})));})()");
  assert.ok(cached.every(asset=>asset.ok));
  await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await size(844,390);await visit();await ev("__rareProof.equip(['rhythm','watchlight','growth-seed'])");await settle();
  reports.push({width:844,height:390,surface:'offline-equipped',cards:await measure()});
  await browser.shot(path.join(output,'offline-equipped-844x390.png'));
  const problems=reports.flatMap(report=>report.cards.filter(card=>card.ruleOverflow>1||card.textOutside||card.titleOutside||card.statusOverlap||card.helpOverlap||Math.abs(card.width/card.height-5/7)>.01).map(card=>({width:report.width,height:report.height,surface:report.surface,...card})));
  const badAssets=browser.badResponses.filter(r=>!r.url.endsWith('/favicon.ico'));
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({reports,problems,cached,preparedOfflineReload:true,errors:browser.errors,badAssets},null,2)+'\n');
  assert.deepEqual(problems,[],'Card layout');assert.deepEqual(browser.errors,[]);assert.deepEqual(badAssets,[]);
  console.log(JSON.stringify({output,checks:reports.length,rareCardCount:reports.filter(r=>r.surface==='all-rare-reader').length/3,errors:browser.errors}));
}finally{browser.close();await new Promise(resolve=>server.close(resolve));}
