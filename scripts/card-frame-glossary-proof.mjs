import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome, until, delay} from './browser-probe.mjs';
import * as M from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';

const output=path.resolve('outputs/card-frame-glossary'), before=process.argv.includes('--before');
await fs.mkdir(output,{recursive:true});
const root=path.resolve('dist'), mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return;}if(url.pathname==='/__dev-revision'){res.writeHead(200,{'Content-Type':'text/plain'}).end('card-frame-proof-stable');return;}const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error();const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,b=await chrome(['--mute-audio']),{ev,send}=b,report={before,checks:[],screens:[]};
async function size(width,height,mobile=false){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});await delay(80);}
async function visit(url,selector){await b.visit(base+url);await until(()=>ev(`!!document.querySelector(${JSON.stringify(selector)})`),selector,120);await ev('document.fonts.ready');await delay(100);}
async function click(selector){await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(70);}
async function shot(label){const file=path.join(output,(before?'before-':'after-')+label+'.png');await b.shot(file);report.screens.push(file);}
async function tap(selector){const p=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(90);}
async function saved(state){await b.visit(base+'/loading.html');await until(()=>ev("document.readyState==='complete'"),'save origin',60);await ev(`localStorage.setItem(${JSON.stringify('cards-pilot:'+M.SAVE_KEY)},${JSON.stringify(JSON.stringify(state))})`);await visit('/game.html?cards=1','[data-action=continue-run]');await tap('[data-action=continue-run]');
  if(await ev("!!document.querySelector('.flight-reward-ceremony')")){
    if(await ev("!!document.querySelector('[data-action=flight-reward-continue]')"))await tap('[data-action=flight-reward-continue]');
    if(await ev("!!document.querySelector('[data-action=flight-reward-open-pack]')"))await tap('[data-action=flight-reward-open-pack]');
    await until(()=>ev("document.querySelector('.flight-reward-ceremony')?.dataset.stage==='cards'"),'explicitly opened draft',100);await delay(500);
  }
}
function allRarityDraft(){const state=M.newState();state.profile.tutorialComplete=true;state.settings.skipTutorial=true;state.run=M.createRun(state.profile,'aligned-real-draft',1,{cards:true});M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id);const run=state.run;run.mountedCards=['body-spark','harvest-rare','last-light'].map((id,i)=>makeSkillCard(id,'aligned-mounted-'+i));M.selectNode(run,M.getChoices(run).find(n=>n.type!=='support').id);M.beginFlightAttempt(run);M.markFlightAttemptStarted(run);M.finishFlight(run,{success:true,flame:50});M.settleCheckpoint(state);run.cardDraft.offers=['tight-packing','harvest-rare','last-light'].map((id,i)=>makeSkillCard(id,'aligned-offer-'+i));return state;}
const faceGeometry=selector=>`[...document.querySelectorAll(${JSON.stringify(selector)})].map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.cardHelp,height:r.height,width:r.width,...Object.fromEntries(['header','.card-illustration','.card-rule-band'].map(s=>{const b=n.querySelector(s).getBoundingClientRect();return [s,{y:b.y-r.y,height:b.height}]}))}})`;
async function aligned(selector,label){const faces=await ev(faceGeometry(selector));assert.ok(faces.length>=3,label+' has three faces');for(const s of ['header','.card-illustration','.card-rule-band'])for(const d of ['y','height']){const v=faces.map(f=>f[s][d]);assert.ok(Math.max(...v)-Math.min(...v)<1,label+' '+s+'.'+d+' '+v);}report.checks.push({label,faces});}
const geometry=`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};return [...document.querySelectorAll('#combo-15 .skill-card')].map(n=>{const r=rect(n);return {id:n.dataset.cardHelp,rarity:n.className.match(/card-(common|rare|legendary)/)?.[1],card:r,title:rect(n.querySelector('header')),heading:rect(n.querySelector('h3')),art:rect(n.querySelector('.card-illustration')),image:rect(n.querySelector('.skill-card-art')),rules:rect(n.querySelector('.card-rule-band'))};});})()`;
try{
  for(const [width,height,mobile] of [[1440,900,false],[915,412,true],[740,333,true]]){
    await size(width,height,mobile);await visit('/card-combos.html?seed=moonwell-15&combo=wayfarers-purse,field-impulse,last-light&row=15#combo-15','#combo-15');await ev("document.querySelector('#combo-15').scrollIntoView({block:'start'})");await delay(70);
    const cards=await ev(geometry);report.checks.push({width,height,cards});await shot('combination15-'+width+'x'+height);
    if(!before){for(const prop of ['title','art','image','rules'])for(const dim of ['y','height']){const values=cards.map(c=>c[prop][dim]-(['y'].includes(dim)?c.card.y:0));assert.ok(Math.max(...values)-Math.min(...values)<1,`${width} ${prop}.${dim}: ${values}`);}}
  }
  if(before){await fs.writeFile(path.join(output,'before-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({before,output}));}
  else{
    await size(1440,900);await visit('/card-combos.html?seed=moonwell-15','#combo-catalog');
    const catalog=await ev(`(()=>{return [...document.querySelectorAll('#combo-catalog .skill-card')].map(n=>{const r=n.querySelector('.card-rule-band'),h=n.querySelector('header'),t=n.querySelector('h3');return {id:n.dataset.cardHelp,over:r.scrollHeight-r.clientHeight,titleOver:t.getBoundingClientRect().bottom-h.getBoundingClientRect().bottom,text:r.textContent}})})()`);
    report.catalog=catalog;assert.ok(catalog.every(c=>c.over<=1&&c.titleOver<=1),'catalog text fits: '+JSON.stringify(catalog.filter(c=>c.over>1||c.titleOver>1)));
    await ev("document.querySelector('#combo-catalog [data-card-help=\"tight-packing\"]').scrollIntoView({block:'center'})");
    const opener='#combo-catalog [data-card-help="tight-packing"] [data-card-term="packing-efficiency"]';
    const point=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(opener)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await until(()=>ev("!!document.querySelector('.card-term-hover')"),'desktop term hover',30);await shot('packing-hover-desktop');
    assert.match(await ev("document.querySelector('.card-term-hover').textContent"),/Packing/);await click(opener);
    assert.equal(await ev("document.querySelectorAll('dialog.card-term-dialog[open]').length"),1);
    await click('.card-term-dialog[open] [data-card-term="packing"]');
    await click('.card-term-dialog:last-of-type [data-card-term="stored"]');await shot('packing-stored-linked');
    assert.equal(await ev("document.querySelectorAll('dialog.card-term-dialog[open]').length"),3);
    await click('.card-term-dialog:last-of-type [data-card-term="packing"]');
    assert.equal(await ev("document.querySelectorAll('dialog.card-term-dialog[open]').length"),2,'cycles return to existing topic');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    assert.equal(await ev("document.querySelectorAll('dialog.card-term-dialog[open]').length"),1);
    await click('.card-term-dialog[open] [data-card-term-close]');
    assert.equal(await ev(`document.activeElement===document.querySelector(${JSON.stringify(opener)})`),true,'returns focus to opening keyword');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
    assert.equal(await ev("document.querySelectorAll('dialog.card-term-dialog[open]').length"),1,'Enter opens the focused keyword');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
    assert.equal(await ev("document.querySelector('.card-term-dialog[open]').contains(document.activeElement)"),true,'keyboard stays in modal help');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    await size(915,412,true);await visit('/game.html?cards=1&mock=cards','.card-equipped-foreground');await shot('deck-915x412');
    await click('[data-action="card-slot"][data-index="1"]');await click('[data-action="card-inspect"]');await until(()=>ev("!!document.querySelector('.card-read-face')"),'reader',40);await shot('deck-reader-915x412');
    await tap('.card-read-face [data-card-term-trigger]');assert.equal(await ev("!!document.querySelector('dialog.card-term-dialog[open]')"),true);assert.match(await ev("document.querySelector('[data-card-help-rules]').textContent"),/\+4 Sparks/);await shot('card-help-mobile');await tap('.card-term-dialog[open] [data-card-term-close]');
    assert.equal(await ev("!!document.querySelector('.card-read-face')"),true,'help leaves selection intact');
    for(const [width,height] of [[915,412],[740,333],[640,320]]){
      await size(width,height,true);const state=allRarityDraft();await saved(state);await until(()=>ev("!!document.querySelector('.card-draft-offers')"),'real three-rarity draft',60);
      await aligned('.card-draft-face>.skill-card','draft-'+width);await shot('rarity-draft-'+width+'x'+height);
      const saveKey=JSON.stringify('cards-pilot:'+M.SAVE_KEY),beforeSave=await ev(`localStorage.getItem(${saveKey})`);
      await tap('.card-draft-face [data-card-term="packing-efficiency"]');await tap('.card-term-dialog:last-of-type [data-card-term="packing"]');await tap('.card-term-dialog:last-of-type [data-card-term="stored"]');if(width===915)await shot('packing-linked-touch-'+width+'x'+height);await tap('.card-term-dialog:last-of-type [data-card-term-close]');await tap('.card-term-dialog:last-of-type [data-card-term-close]');await tap('.card-term-dialog:last-of-type [data-card-term-close]');
      assert.equal(await ev(`localStorage.getItem(${saveKey})`),beforeSave,'linked glossary preserves live unclaimed draft '+width);
      await tap('[data-action="card-draft-pick"][data-id="aligned-offer-2"]');await until(()=>ev("!!document.querySelector('.card-reward-slots')"),'real reward',60);
      await aligned('.card-reward-mounted-face>.skill-card','reward-'+width);await shot('rarity-reward-'+width+'x'+height);
      await tap('[data-action=card-reward-continue]');await until(()=>ev("document.body.dataset.screen==='map'"),'reward finish',60);
      await tap('#header [data-action=skills]');await until(()=>ev("!!document.querySelector('.card-equipped-foreground')"),'real deck',60);await aligned('.card-equipped-face>.skill-card','deck-'+width);await shot('rarity-deck-'+width+'x'+height);
    }
    report.mobileCatalog=[];
    for(const [width,height] of [[915,412],[740,333],[640,320]]) {
      await size(width,height,true);await visit('/card-combos.html?seed=moonwell-15','#combo-catalog');
      const fits=await ev(`[...document.querySelectorAll('#combo-catalog .skill-card')].map(n=>{const b=n.querySelector('.card-rule-band'),h=n.querySelector('header'),t=n.querySelector('h3');return {id:n.dataset.cardHelp,over:b.scrollHeight-b.clientHeight,titleOver:t.getBoundingClientRect().bottom-h.getBoundingClientRect().bottom,text:b.textContent}})`);
      report.mobileCatalog.push({width,height,fits});assert.ok(fits.every(c=>c.over<=1&&c.titleOver<=1),'mobile catalog '+width+' '+JSON.stringify(fits.filter(c=>c.over>1||c.titleOver>1)));
    }
    report.errors=b.errors;report.badResponses=b.badResponses;assert.deepEqual(b.errors,[]);assert.deepEqual(b.badResponses,[]);
    await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,catalog:catalog.length,output}));
  }
}finally{b.close();await new Promise(r=>server.close(r));}
