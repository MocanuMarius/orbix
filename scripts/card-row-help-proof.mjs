import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until,delay} from './browser-probe.mjs';
import * as model from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';

const output=path.resolve('outputs/card-row-help');
await fs.mkdir(output,{recursive:true});
const root=path.resolve('dist'), mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error();res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`, browser=await chrome(['--mute-audio']), {ev,send}=browser;
const top='dialog.card-term-dialog:last-of-type';
const report={checks:[],screens:[]};
async function visit(url,selector){await browser.visit(base+url);await until(()=>ev(`!!document.querySelector(${JSON.stringify(selector)})`),selector,100);await ev('document.fonts.ready');await delay(100);}
async function size(width,height){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});}
async function tap(selector){await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);const point=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(100);}
async function back(){await tap(top+'>footer [data-card-term-close]');}
async function shot(name){const file=path.join(output,name+'.png');await browser.shot(file);report.screens.push(file);}
try {
  for(const [width,height] of [[915,412],[740,333]]){
    await size(width,height);
    await visit('/card-combos.html?combo=echo-iii,spark-cache,refrain&row=1','#combo-1');
    await tap('#combo-1 [data-card-help="echo-iii"] [data-card-term="copy"]');
    assert.match(await ev(`document.querySelector(${JSON.stringify(top)}).textContent`),/This gallery row · preview/);
    assert.match(await ev(`document.querySelector(${JSON.stringify(top)}).textContent`),/Repeats 3 times Pocket Sparks in slot 2/);
    await shot('gallery-repeat-'+width);
    await tap(top+' [data-card-term="shared"]');
    const text=await ev(`document.querySelector(${JSON.stringify(top)}).textContent`);
    assert.match(text,/6 → 5/);assert.match(text,/1 → 0/);assert.match(text,/Slot 1 · Echo III/);
    await ev(`document.querySelector(${JSON.stringify(top+' .card-row-help-receipt')}).scrollIntoView({block:'start'})`);
    await shot('gallery-shared-receipt-'+width);
    const bounds=await ev(`(()=>{const n=document.querySelector(${JSON.stringify(top)}),r=n.getBoundingClientRect(),c=n.querySelector('.card-term-content'),b=n.querySelector('footer button').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overflow:c.scrollWidth-c.clientWidth,backHeight:b.height}})()`);
    assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.right<=width&&bounds.bottom<=height);
    assert.ok(bounds.overflow<2);assert.ok(bounds.backHeight>=44);
    await back();assert.match(await ev(`document.querySelector(${JSON.stringify(top)}).textContent`),/Slot 1 · Echo III/);
    await back();assert.equal(await ev('document.querySelectorAll("dialog[open]").length'),0);
    await tap('#combo-glossary');assert.ok(await ev('!!document.querySelector(".card-glossary-list")'));
    await tap(top+' [data-card-term="uses"]');assert.match(await ev(`document.querySelector(${JSON.stringify(top)}).textContent`),/Example row · 2 shared uses/);
    await back();assert.ok(await ev('!!document.querySelector(".card-glossary-list")'));await back();
    report.checks.push({kind:'gallery',width,height,bounds});
    await visit('/game.html?cards=1&mock=cards','.card-equipped-foreground');
    const before=await ev('[...document.querySelectorAll(".card-equipped-face .skill-card")].map(n=>({id:n.dataset.cardInstance,rank:n.dataset.cardRank,uses:n.dataset.cardCharges}))');
    await tap('.card-equipped-face [data-card-help="echo"] [data-card-term-trigger]');
    await tap(top+' [data-card-term="shared"]');
    const current=await ev(`document.querySelector(${JSON.stringify(top)}).textContent`);
    assert.match(current,/Slot 1 · Echo/);assert.match(current,/sharing its 4 remaining uses/);assert.match(current,/4 → 3/);assert.match(current,/3 → 2/);
    await shot('deck-shared-'+width);
    await back();await back();
    const after=await ev('[...document.querySelectorAll(".card-equipped-face .skill-card")].map(n=>({id:n.dataset.cardInstance,rank:n.dataset.cardRank,uses:n.dataset.cardCharges}))');
    assert.deepEqual(after,before,'opening help leaves current row and uses unchanged');
    report.checks.push({kind:'deck',width,height,before,after});
  }
  await size(915,412);
  const state=model.newState();state.profile.tutorialComplete=true;state.settings.skipTutorial=true;
  state.run=model.createRun(state.profile,'live-help-proof',1,{cards:true});
  model.chooseStartingGift(state,model.getStartingGiftOffers(state.run)[0].id);
  state.run.guideSkipped=true;
  state.run.mountedCards=['echo-iii','spark-cache','refrain'].map((id,slot)=>makeSkillCard(id,`live-help:${slot}`));
  state.run.mountedCards[1].rank=3;state.run.mountedCards[1].charges=2;
  await visit('/loading.html','body');
  const saveKey='cards-pilot:'+model.SAVE_KEY;
  await ev(`localStorage.setItem(${JSON.stringify(saveKey)},${JSON.stringify(JSON.stringify(state))})`);
  await visit('/game.html?cards=1','[data-action="continue-run"]');await tap('[data-action="continue-run"]');
  await until(()=>ev('!!document.querySelector("#header [data-action=skills]")'),'saved run map',60);
  await tap('#header [data-action="skills"]');
  await until(()=>ev('!!document.querySelector(".card-equipped-foreground")'),'saved run deck',60);
  const savedBefore=await ev(`localStorage.getItem(${JSON.stringify(saveKey)})`);
  await tap('.card-equipped-face [data-card-help="spark-cache"] [data-card-term="uses"]');
  const liveText=await ev(`document.querySelector(${JSON.stringify(top)}).textContent`);
  assert.match(liveText,/Your current row · preview/);assert.match(liveText,/Slot 2 · Pocket Sparks. 2 uses remaining/);
  assert.match(liveText,/\+12 Sparks/);assert.match(liveText,/2 → 1/);assert.match(liveText,/1 → 0/);
  await shot('saved-run-uses-915');await back();
  assert.equal(await ev(`localStorage.getItem(${JSON.stringify(saveKey)})`),savedBefore,'real save unchanged by Uses preview');
  report.checks.push({kind:'saved-run',width:915,height:412,savedUnchanged:true,uses:2,rank:3,bonus:12});
  assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.badResponses,[]);
  report.errors=browser.errors;report.badResponses=browser.badResponses;
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:true,output,checks:report.checks.length}));
} finally {browser.close();await new Promise(resolve=>server.close(resolve));}
