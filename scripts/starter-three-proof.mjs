import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const output=path.resolve('outputs/starter-three'),profile=await fs.mkdtemp(path.join(os.tmpdir(),'emberwing-starter-proof-'));
await fs.mkdir(output,{recursive:true});
const root=path.resolve('dist'),types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error('outside');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label){for(let i=0;i<160;i++){try{const value=await fn();if(value)return value;}catch{}await delay(100);}throw Error('Timed out: '+label);}
let socket;
const errors=[],report={screenshots:[],layouts:[],flows:{}};
try{
  const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome');
  const target=await until(async()=>(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item=>item.type==='page'),'page');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let serial=0;const pending=new Map();
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const[resolve,reject]=pending.get(message.id);pending.delete(message.id);message.error?reject(Error(message.error.message)):resolve(message.result);}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,[resolve,reject]);socket.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const click=async selector=>{assert.ok(await ev(`!!document.querySelector(${JSON.stringify(selector)})`),selector);await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);};
  let navigation=0;
  const page=async()=>{const marker='starter-three-'+ ++navigation;await send('Page.navigate',{url:base+'/game.html?cards=1&proof='+marker});await until(()=>ev(`location.search.includes(${JSON.stringify(marker)})&&document.readyState==='complete'&&!!document.querySelector('[data-action=new-game]')`),'home');};
  const ids=()=>ev('[...document.querySelectorAll(".card-starter .card-pick")].map(n=>n.dataset.id)');
  const save=()=>ev('JSON.parse(localStorage.getItem("cards-pilot:wispbound.save.condensed.v7"))');
  const screenshot=async name=>{const shot=await send('Page.captureScreenshot',{format:'png'});const file=path.join(output,name+'.png');await fs.writeFile(file,Buffer.from(shot.data,'base64'));report.screenshots.push(file);};
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:956,height:440,deviceScaleFactor:1,mobile:true});
  await page();
  const seeds=await ev(`(async()=>{const C=await import('./skill-cards.mjs');let dreamRare,fieldRare;for(let i=0;i<6000&&(!dreamRare||!fieldRare);i++){const seed='starter-proof-'+i,o=C.getCardStarterOffers({campaignSeed:seed,cardStarterVersion:3,skillSystem:C.CARD_SYSTEM});if(o.some(g=>g.cardId==='dream')&&o.some(g=>g.rarity==='rare'))dreamRare||=seed;if(o.some(g=>g.cardId==='field-impulse')&&o.some(g=>g.cardId==='flash-handling'))fieldRare||=seed;}return{dreamRare,fieldRare};})()`);
  assert.ok(seeds.dreamRare&&seeds.fieldRare);report.seeds=seeds;
  for(const[kind,seed]of Object.entries(seeds)){
    await send('Page.navigate',{url:base+'/loading.html'});await until(()=>ev("location.pathname==='/loading.html'&&document.readyState==='complete'"),'fixture');
    await ev(`(async()=>{const M=await import('./model.mjs'),s=M.newState();s.profile.tutorialComplete=true;s.settings.skipTutorial=true;M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});localStorage.setItem('orbix-next-cards-expedition',${JSON.stringify(seed)});})()`);
    await page();await click('[data-action="new-game"]');
    try{await until(()=>ev('!!document.querySelector(".card-starter-trio")'),'three offers');}catch(error){console.log(JSON.stringify({errors,state:await save(),body:await ev('document.body.innerText.slice(0,2500)')}));await screenshot('failure');throw error;}
    const expected=await ids();assert.equal(expected.length,3);assert.equal(new Set(expected).size,3);
    for(const[width,height]of [[956,440],[740,333],[720,280]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      const layout=await ev(`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}},cards=[...document.querySelectorAll('.card-starter .card-readable')].map(n=>({id:n.dataset.cardHelp,face:rect(n),band:rect(n.querySelector('.card-rule-band')),rulesScroll:n.querySelector('.card-rule-band').scrollHeight,rulesClient:n.querySelector('.card-rule-band').clientHeight,stripes:[...n.querySelectorAll('.card-rule-stripe')].map(rect)}));return{width:innerWidth,height:innerHeight,cards};})()`);
      assert.equal(layout.cards.length,3);
      for(const card of layout.cards){assert.ok(card.face.x>=0&&card.face.y>=0&&card.face.right<=width+1&&card.face.bottom<=height+1,JSON.stringify(card));assert.ok(card.face.width>=105,JSON.stringify(card));assert.ok(card.rulesScroll<=card.rulesClient+1,`${width}x${height}: clipped rules ${JSON.stringify(card)}`);assert.ok(card.stripes.every(stripe=>stripe.bottom<=card.band.bottom+1),`${width}x${height}: clipped stripe ${JSON.stringify(card)}`);}
      report.layouts.push({kind,...layout});await screenshot(`${kind}-${width}x${height}`);
    }
    await click('.card-starter [data-action="close-sheet"]');await click('[data-action="new-game"]');assert.deepEqual(await ids(),expected);
    await page();await click('[data-action="new-game"]');assert.deepEqual(await ids(),expected);
    const selected=kind==='dreamRare'?'card:dream':expected.find(id=>id==='card:flash-handling');
    await click(`.card-pick[data-id="${selected}"]`);assert.ok(await ev('!!document.querySelector(".card-starter-confirm")'));
    await click('[data-action="cancel-starting-gift"]');assert.deepEqual(await ids(),expected);
    await click(`.card-pick[data-id="${selected}"]`);await click('[data-action="confirm-starting-gift"]');
    const state=await save(),owned=[...state.run.mountedCards,...state.run.reserveCards].filter(Boolean).map(card=>card.cardId).sort();
    assert.deepEqual(owned,[selected.slice(5),'lift-guide'].sort());assert.equal(state.run.mountedCards.filter(Boolean).length,2);assert.equal(state.run.startingGiftId,selected);
    await page();await click('[data-action="continue-run"]');assert.deepEqual((await save()).run.mountedCards,state.run.mountedCards);
    report.flows[kind]={expected,selected,backStable:true,reloadStable:true,cancelStable:true,onlyChosenAndGuide:true,continueStable:true};
  }
  assert.deepEqual(errors,[]);report.errors=errors;await fs.writeFile(path.join(output,'proof.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,...report}));
}finally{socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));}
