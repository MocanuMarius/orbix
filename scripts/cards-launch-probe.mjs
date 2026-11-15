// Exercise a real previous installed worker, not a query-only navigation mock.
import http from 'node:http';
import {spawn, execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const baseline='d55eeed7886d6ea5b66da63c8c843362e9a18b22';
const release='skills-cards-1';
const output=path.resolve('work/cards-release');
await fs.mkdir(output,{recursive:true});
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'wisp-cards-launch-'));
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.webmanifest':'application/manifest+json','.json':'application/json'};
const oldFiles=new Set(execFileSync('git',['ls-tree','-r','--name-only',baseline,'dist'],{encoding:'utf8'}).trim().split(/\r?\n/).map(file=>file.slice(5)));
const oldSources=new Map();
let previous=true;
const requests=[],errors=[];
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost'),file=url.pathname.slice(1)||'index.html';
    if(file.includes('..'))throw Error('Invalid path');
    let data;
    if(previous&&oldFiles.has(file)){
      if(!oldSources.has(file))oldSources.set(file,execFileSync('git',['show',`${baseline}:dist/${file}`],{maxBuffer:32*1024*1024}));
      data=oldSources.get(file);
    }else data=await fs.readFile(path.resolve('dist',file));
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
  }catch{requests.push({path:req.url,status:404});res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
// The worker deliberately keeps localhost live online. A secure-test origin
// exercises its production cache-first branch, including swallowed queries.
const base='http://wisp-launch.test:'+server.address().port;
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--no-proxy-server','--host-resolver-rules=MAP wisp-launch.test 127.0.0.1','--unsafely-treat-insecure-origin-as-secure='+base,'--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label){for(let i=0;i<900;i++){try{const value=await fn();if(value)return value;}catch{}await delay(100);}throw Error('Timed out: '+label);}
let socket;
try{
  const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome');
  const target=await until(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'),'page');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let serial=0;const pending=new Map();
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const [resolve,reject]=pending.get(message.id);pending.delete(message.id);message.error?reject(Error(message.error.message)):resolve(message.result);}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,[resolve,reject]);socket.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const visit=async url=>{await send('Page.navigate',{url:base+url});};
  const home=()=>until(()=>ev("!!document.querySelector('.front-new-button')"),'game home');
  const offline=enabled=>send('Network.emulateNetworkConditions',{offline:enabled,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  const launch=()=>ev("document.querySelector('#launch').click()");
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await visit('/game.html');await home();
  await until(()=>ev("navigator.serviceWorker.controller&&caches.keys().then(names=>names.some(name=>name.includes(':first-light-2:')))"),'real previous worker');
  const oldCache=await ev('caches.keys()');assert.ok(oldCache.some(name=>name.includes(':first-light-2:')));
  // Leave the live app before seeding storage: its pagehide handler correctly
  // persists its own in-memory state and would overwrite a fixture made there.
  await visit('/loading.html');await until(()=>ev("location.pathname==='/loading.html'"),'fixture document');
  const ordinary=await ev(`(async()=>{const M=await import('./model.mjs?v=first-light-2');const state=M.newState();state.settings.skipTutorial=true;state.run=M.createRun(state.profile,'cards-launch-standard',1);M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id);M.saveState(state);localStorage.setItem('emberwing-muted','true');return localStorage.getItem('wispbound.save.condensed.v7');})()`);
  previous=false;
  assert.match(await ev("fetch('/game.html?cards=1').then(response=>response.text())"),/app\.mjs\?v=first-light-2/,'old production worker swallows a new game query');
  await visit('/cards.html');await until(()=>ev("!!document.querySelector('#launch')"),'fresh pathname through old worker');
  await offline(true);await launch();await until(()=>ev("document.querySelector('#status').textContent.includes('Connect to the internet')"),'honest offline response');
  await offline(false);await launch();await home();
  assert.equal(await ev("new URLSearchParams(location.search).get('cards')"),'1');
  assert.equal(await ev("new URLSearchParams(location.search).has('tutorial')"),false);
  assert.equal(await ev("document.body.classList.contains('card-pilot')"),true);
  assert.ok(await ev("localStorage.getItem('wispbound.save.condensed.v7')")===ordinary,'ordinary save stays byte-for-byte identical');
  assert.equal(await ev("localStorage.getItem('emberwing-muted')"),'true');
  const updatedCaches=await ev('caches.keys()');assert.ok(updatedCaches.some(name=>name.includes(':'+release+':')));
  assert.equal(await ev("import('./skill-cards.mjs?v=skills-cards-1').then(module=>module.CARD_SYSTEM)"),'cards-v1');
  await ev("document.querySelector('.front-new-button').click()");
  await until(()=>ev("!!document.querySelector('.prologue-map')"),'normal New Game First Light choice');
  await ev("document.querySelector('[data-action=skip-practice]').click()");
  await until(()=>ev("!!document.querySelector('[data-action=skip-practice-once]')"),'practice skip choice');
  await ev("document.querySelector('[data-action=skip-practice-once]').click()");
  await until(()=>ev("!!document.querySelector('[data-action=new-gift]')"),'real card New Game gifts');
  assert.equal(await ev("document.querySelectorAll('[data-action=new-gift]').length"),2);
  await visit('/cards.html');await until(()=>ev("!!document.querySelector('#launch')"),'current launcher');await launch();await home();
  await offline(true);await visit('/cards.html');await until(()=>ev("!!document.querySelector('#launch')"),'offline cached launcher');await launch();await home();
  assert.equal(await ev("document.body.classList.contains('card-pilot')"),true);
  await offline(false);
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await visit('/cards.html?display=desktop&zoom=125&collectorArt=flat3');await until(()=>ev("!!document.querySelector('#launch')"),'desktop launcher');await launch();
  await until(()=>ev("!!document.querySelector('#game-frame')?.contentDocument?.querySelector('.front-new-button')"),'desktop game frame');
  const frame=await ev("document.querySelector('#game-frame').src");
  assert.equal(new URL(frame).searchParams.get('cards'),'1');assert.equal(new URL(frame).searchParams.get('collectorArt'),'flat3');
  assert.equal(await ev("document.querySelector('#display-zoom').value"),'125');
  assert.equal(await ev("document.querySelector('#game-frame').contentDocument.querySelector('.companion-portrait[data-role-art=collector]')?.dataset.collectorArt"),'flat3');
  await ev("navigator.serviceWorker.getRegistrations().then(registrations=>Promise.all(registrations.map(registration=>registration.unregister())))");
  await visit('/cards.html?display=native');await until(()=>ev("!!document.querySelector('#launch')&&!navigator.serviceWorker.controller"),'fresh install launcher');await launch();await home();
  assert.ok(await ev("localStorage.getItem('wispbound.save.condensed.v7')")===ordinary,'ordinary save survives all launcher paths');
  assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(requests.filter(entry=>!entry.path.includes('favicon.ico')).length,0,JSON.stringify(requests));
  const result={baseline,oldCache,release,updatedCaches,staleWorkerUpgrade:true,offlineBeforeInstallHonest:true,offlineAfterInstall:true,alreadyCurrent:true,firstInstall:true,realNewGame:true,standardSavePreserved:true,soundPreferencePreserved:true,nativePhoneRouting:true,desktopDisplayAndArtQuery:true,requests,errors};
  await fs.writeFile(path.join(output,'launcher-report.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
}finally{socket?.close();browser.kill();server.close();}
