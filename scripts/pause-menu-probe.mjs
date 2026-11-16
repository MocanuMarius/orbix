// Real-game probe for the Waystone pause menu (v1.5-pause) and Settings (v1.1-settings) in the v2.5-theme skin.
// Headless Chrome with a throwaway profile and its own static server on a random port.
// Usage: node scripts/pause-menu-probe.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';

const root=path.resolve('dist'),outRoot=path.resolve('outputs/menu-standardization');
const outPause=path.join(outRoot,'v1.5-pause'),outSettings=path.join(outRoot,'v1.1-settings');
await fs.mkdir(outPause,{recursive:true});await fs.mkdir(outSettings,{recursive:true});
const SIZES=[[900,405],[740,333],[667,300],[640,320]];
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/__compare.html'){const a=url.searchParams.get('a'),b=url.searchParams.get('b');res.writeHead(200,{'Content-Type':'text/html'}).end(`<!doctype html><body style="margin:0;background:#222;color:#ddd;font:12px monospace;display:flex;gap:8px;padding:8px"><figure style="margin:0"><figcaption>Design lab</figcaption><img src="/__out/${a}"></figure><figure style="margin:0"><figcaption>Game</figcaption><img src="/__out/${b}"></figure></body>`);return;}
  if(url.pathname.startsWith('/__out/')){const file=path.resolve(outRoot,'.'+decodeURIComponent(url.pathname.slice(6)));if(!file.startsWith(outRoot))throw 0;const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':'image/png'}).end(data);return;}
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep))throw 0;
  const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
 }catch{if(!res.headersSent)res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'wisp-pause-menu-'));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--no-default-browser-check','--autoplay-policy=no-user-gesture-required','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,n=160){for(let i=0;i<n;i++){try{const v=await fn();if(v)return v;}catch{}await delay(75);}throw Error('Timed out: '+label);}
const report={pause:[],settings:[],destinations:{},volume:{},escape:{},errors:[]};
let socket;
try{
 const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome');
 const target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(e=>e.type==='page');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map();
 socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(m.error.message)):resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const has=sel=>ev(`!!document.querySelector(${JSON.stringify(sel)})`);
 const wait=(sel,label=sel)=>until(()=>has(sel),label);
 const click=async sel=>{await wait(sel);await ev(`document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);};
 const key=async(k,code=k)=>{for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:k,code,windowsVirtualKeyCode:{Escape:27,ArrowLeft:37,ArrowRight:39}[k]||0});};
 const shot=async file=>{const r=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(file,Buffer.from(r.data,'base64'));};
 const viewport=(width,height)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 const visit=async url=>{await send('Page.navigate',{url});await until(()=>ev(`location.href===${JSON.stringify(url)}&&document.readyState==='complete'`),url);};
 const settle=()=>ev('document.fonts.ready.then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))');
 await send('Runtime.enable');await send('Page.enable');await send('Network.setBypassServiceWorker',{bypass:true});
 // Record music players so their volume can be read.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const A=window.Audio;window.__audios=[];window.Audio=function(...a){const p=new A(...a);window.__audios.push(p);return p};window.Audio.prototype=A.prototype;})();`});
 await viewport(900,405);

 // Saves: a real Cards run with one relic (so Collection shows), or a blank profile for practice and Home.
 async function fixture(kind){
  await visit(base+'/loading.html');
  await ev(`localStorage.clear()`);
  if(kind==='home')await ev(`(async()=>{const M=await import('./model.mjs?v=guide-clarity-1');const s=M.newState();s.profile.cardCruisingSpeed=6;M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});})()`);
  if(kind==='run'||kind==='run-plain')await ev(`(async()=>{const M=await import('./model.mjs?v=guide-clarity-1');const s=M.newState();s.settings.skipTutorial=true;s.profile.tutorialComplete=true;s.run=M.createRun(s.profile,'pause-menu-probe',1,{cards:true});M.chooseStartingGift(s,M.getStartingGiftOffers(s.run)[0].id);${kind==='run'?"s.run.artifacts.push('glow-wick');":''}M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});})()`);
  await visit(base+'/game.html?cards=1');await wait('[data-action]');await delay(300);
 }
 const toMap=async()=>{await click('[data-action=continue-run]');await until(()=>ev("document.body.dataset.screen==='map'"),'map');};
 const toPracticeMap=async()=>{await click('[data-action=tutorial]');await until(()=>ev("document.body.dataset.screen==='map'"),'practice map');};
 const toFlight=async()=>{await click('.world-map-node.route-state-next[data-action=preview-node]');await click('button[data-action=node]');await until(()=>ev("document.body.dataset.screen==='flight'&&!!document.querySelector('#flight-canvas')"),'flight');await delay(1200);for(let i=0;i<6&&await has('.tutorial-coach:not([hidden]) .tutorial-coach-next');i++){await click('.tutorial-coach:not([hidden]) .tutorial-coach-next');await delay(500);}};
 const openFlightPause=async()=>{if(await has('.game-menu-trigger[data-action=menu]'))await click('.game-menu-trigger[data-action=menu]');else await key('Escape');await wait('#pause-layer .wb-pause','flight pause');await settle();};
 const openMapPause=async()=>{if(await has('dialog[open]'))await click('dialog[open] [data-action=close-sheet]').catch(()=>{});await click('[data-action=menu]');await wait('dialog.wb-pause-sheet[open] .wb-pause','map pause');await settle();};

 // Layout checks inside the visible Waystone screen.
 const checks=()=>ev(`(()=>{const r=document.querySelector('dialog[open] .wb-ground')||document.querySelector('#pause-layer .wb-ground');if(!r)return {missing:true};
  const vw=innerWidth,vh=innerHeight,out=[],clip=[],small=[],page=r.querySelector('.wb-page'),pr=page.getBoundingClientRect(),cs=getComputedStyle(page),inner={top:pr.top+parseFloat(cs.borderTopWidth),bottom:pr.bottom-parseFloat(cs.borderBottomWidth),left:pr.left+parseFloat(cs.borderLeftWidth),right:pr.right-parseFloat(cs.borderRightWidth)};
  const vis=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
  for(const e of r.querySelectorAll('button,a,[role=slider],select,.wb-tabbox,.wb-head,.pause-bonus-rule')){if(!vis(e))continue;const b=e.getBoundingClientRect();if(b.left<-0.5||b.top<-0.5||b.right>vw+0.5||b.bottom>vh+0.5)out.push((e.dataset.action||e.className||e.tagName)+' outside viewport');if(page.contains(e)&&e.tagName!=='SELECT'&&(b.top<inner.top-0.5||b.bottom>inner.bottom+0.5))out.push((e.dataset.action||e.className)+' outside page');}
  for(const e of r.querySelectorAll('.wb-sign b,.wb-sign small,.wb-title,.wb-context,.wb-set-label,.wb-set-group')){if(!vis(e))continue;const p=e.closest('.wb-sign');if(e.scrollWidth>e.clientWidth+1)clip.push(e.textContent.trim());if(p){const pb=p.getBoundingClientRect(),eb=e.getBoundingClientRect(),pc=getComputedStyle(p),l=pb.left+parseFloat(pc.borderLeftWidth),rr=pb.right-parseFloat(pc.borderRightWidth);if(e.tagName==='B'){const range=document.createRange();range.selectNodeContents(e);const tb=range.getBoundingClientRect();if(tb.left<l-0.5||tb.right>rr+0.5)clip.push(e.textContent.trim()+' (past plaque edge)');}}}
  for(const e of r.querySelectorAll('button,a,[role=slider],label.wb-select')){if(!vis(e))continue;const b=e.getBoundingClientRect(),a=getComputedStyle(e,'::after'),extra=a.content!=='none'&&a.position==='absolute'?-2*parseFloat(a.left||0):0;if(b.width+extra<44||b.height<44)small.push((e.dataset.action||e.getAttribute('aria-label')||e.textContent.trim())+' '+Math.round(b.width)+'x'+Math.round(b.height));}
  const left=r.querySelector('.wb-side-left');
  return {overflow:out,clipped:clip,small,actions:[...r.querySelectorAll('[data-action]')].filter(vis).map(e=>e.dataset.action),leftTab:!!left&&vis(left),status:left?left.textContent.replace(/\\s+/g,' ').trim():'',focus:document.activeElement?.dataset?.action||document.activeElement?.tagName};})()`);

 async function pauseShots(situation,open,reopen){
  for(const [w,h] of SIZES){
   await viewport(w,h);await delay(250);await reopen();await delay(150);
   const name=`${situation}-${w}x${h}.png`;await shot(path.join(outPause,name));
   const c=await checks();report.pause.push({situation,size:`${w}x${h}`,...c});
  }
  await viewport(900,405);
 }

 // 1. Real run, map screen (dialog host).
 await fixture('run');await toMap();await openMapPause();
 report.escape.mapFocus=(await checks()).focus;
 await key('Escape');await delay(300);report.escape.mapEscapeCloses=!(await has('dialog[open]'));
 await pauseShots('run-map',null,openMapPause);
 // Destinations from the map pause menu.
 for(const [action,expect] of [['close-sheet','none'],['skills','dialog'],['artifacts','dialog'],['field-guide','dialog.field-guide-sheet'],['settings','dialog.settings-sheet']]){
  await openMapPause();await click(`dialog[open] [data-action="${action}"]`);await delay(500);
  const got=await ev(`document.querySelector('dialog[open]')?.className||'none'`);report.destinations[`map:${action}`]=got;
  if(expect==='none')assert.equal(got,'none',`map ${action}`);else assert.ok(await has(expect+'[open]'),`map ${action} opened ${got}`);
  if(action==='skills'){await click('dialog[open] .card-close');await delay(500);report.destinations['map:skills-done']=await ev(`document.querySelector('dialog[open]')?.className||'none'`);assert.ok(await has('dialog.wb-pause-sheet[open]'),'Deck Done returns to the map menu');}
  if(await has('dialog[open]'))await ev(`document.querySelector('dialog[open]').close()`);await delay(200);
 }
 // Map Guide moved into the Field Guide header on the map screen.
 await openMapPause();await click('dialog[open] [data-action="field-guide"]');await wait('dialog.field-guide-sheet[open] [data-action="map-key"]','Map guide in Field Guide');await click('dialog[open] [data-action="map-key"]');await wait('dialog.map-key-sheet[open]','Map guide sheet');report.destinations['field-guide:map-key']='dialog.map-key-sheet';
 await ev(`document.querySelector('dialog[open]').close()`);
 report.destinations['field-guide:glossary']=await (async()=>{await openMapPause();await click('dialog[open] [data-action="field-guide"]');await delay(300);return await has('dialog.field-guide-sheet[open] [data-card-glossary]');})();
 await ev(`document.querySelector('dialog[open]')?.close()`);

 // 2. Real run, flight (#pause-layer) and volume.
 await toFlight();
 await delay(2500);
 const volBefore=await ev('window.__audios.map(p=>p.volume)');
 await openFlightPause();
 report.escape.flightFocusFirst=await ev(`document.querySelector('#pause-layer .wb-pause button')?.dataset.action`);
 await pauseShots('run-flight',null,openFlightPause);
 await openFlightPause();
 // Music to level 1 by tapping the first bar; FX muted with its icon.
 await ev(`(()=>{const b=document.querySelector('[data-level-bars=music]'),r=b.getBoundingClientRect();b.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+6,clientY:r.top+20}));})()`);
 await click('[data-level-mute=fx]');
 // Arrow keys on the FX slider: from 0 to 2.
 await ev(`document.querySelector('[data-level-bars=fx]').focus()`);await key('ArrowRight');await key('ArrowRight');
 report.volume.afterInput=await ev(`({music:localStorage.getItem('wispbound-music-level'),fx:localStorage.getItem('emberwing-fx-level'),muted:localStorage.getItem('emberwing-muted'),musicNow:document.querySelector('[data-level-bars=music]').getAttribute('aria-valuenow'),fxNow:document.querySelector('[data-level-bars=fx]').getAttribute('aria-valuenow'),fxPressed:document.querySelector('[data-level-mute=fx]').getAttribute('aria-pressed')})`);
 await click('#pause-layer [data-action=resume]');await delay(400);
 if(await has('[data-action=wake-flight]'))await click('[data-action=wake-flight]');
 await delay(3500);
 const volAfter=await ev('window.__audios.map(p=>p.volume)');
 report.volume.music={before:volBefore,after:volAfter,ratio:volAfter.map((v,i)=>volBefore[i]?v/volBefore[i]:null)};
 // Destinations from the flight pause menu.
 for(const [action,expect] of [['resume','resumed'],['skills','dialog'],['artifacts','dialog'],['field-guide','dialog.field-guide-sheet'],['settings','dialog.settings-sheet'],['abandon-run','dialog'],['exit-menu','home']]){
  if(await has('dialog[open]'))await ev(`document.querySelector('dialog[open]').close()`);
  if(!(await ev("document.body.dataset.screen==='flight'")))break;
  await openFlightPause();await click(`#pause-layer [data-action="${action}"]`);await delay(600);
  const got=expect==='home'?await ev('document.body.dataset.screen'):expect==='resumed'?(await ev(`!document.querySelector('#pause-layer .wb-pause')`))?'resumed':'still paused':await ev(`document.querySelector('dialog[open]')?.className||'none'`);
  report.destinations[`flight:${action}`]=got;
  if(expect==='dialog')assert.notEqual(got,'none',`flight ${action}`);else if(expect.startsWith('dialog.'))assert.ok(await has(expect+'[open]'),`flight ${action}`);else assert.equal(got,expect,`flight ${action}`);
  if(action==='abandon-run'&&await has('dialog[open]'))await ev(`document.querySelector('dialog[open]').close()`);
  if(action==='resume')await delay(300);
 }
 // Persistence across reload.
 await visit(base+'/game.html?cards=1');await wait('[data-action=settings]');
 await click('[data-action=settings]');await wait('dialog.wb-settings-sheet[open]');
 report.volume.afterReload=await ev(`({music:document.querySelector('[data-level-bars=music]').getAttribute('aria-valuenow'),fx:document.querySelector('[data-level-bars=fx]').getAttribute('aria-valuenow')})`);
 assert.deepEqual(report.volume.afterReload,{music:'1',fx:'2'});
 await ev(`document.querySelector('dialog[open]').close()`);

 // 3. Real run without a relic: Deck alone, full width.
 await fixture('run-plain');await toMap();await toFlight();
 await openFlightPause();report.pause.push({situation:'run-flight-no-collection',...(await checks())});
 await shot(path.join(outPause,'run-flight-no-collection-900x405.png'));

 // 4. Practice flight.
 await fixture('practice');await toPracticeMap();await toFlight();
 await pauseShots('practice-flight',null,openFlightPause);
 for(const [action,expect] of [['skip-practice','any'],['exit-menu','home']]){
  if(!(await ev("document.body.dataset.screen==='flight'"))){await fixture('practice');await toPracticeMap();await toFlight();}
  await openFlightPause();await click(`#pause-layer [data-action="${action}"]`);await delay(700);
  report.destinations[`practice:${action}`]=expect==='home'?await ev('document.body.dataset.screen'):(await ev(`document.querySelector('dialog[open]')?.className||document.body.dataset.screen`));
  if(await has('dialog[open]'))await ev(`document.querySelector('dialog[open]').close()`);
 }

 // 5. Settings: from Home (Help plaque) and from the run's pause menu.
 await fixture('home');
 for(const [w,h] of SIZES){
  await viewport(w,h);await delay(250);if(await has('dialog[open]'))await ev(`document.querySelector('dialog[open]').close()`);
  await click('[data-action=settings]');await wait('dialog.wb-settings-sheet[open] .wb-settings');await settle();
  await shot(path.join(outSettings,`home-${w}x${h}.png`));report.settings.push({situation:'home',size:`${w}x${h}`,...(await checks())});
 }
 await viewport(900,405);
 // Settings controls: Lessons toggles skip-tutorial; Advanced and Back.
 const before=await ev(`JSON.parse(localStorage.getItem('cards-pilot:wispbound.save.condensed.v7')||'{}').settings?.skipTutorial??null`);
 await click('dialog[open] [data-action=skip-tutorial]');await delay(300);
 report.destinations['settings:lessons']={before,after:await ev(`JSON.parse(localStorage.getItem('cards-pilot:wispbound.save.condensed.v7')||'{}').settings?.skipTutorial??null`),label:await ev(`document.querySelector('dialog[open] [data-action=skip-tutorial] b').textContent`),focus:await ev('document.activeElement?.dataset?.action')};
 await click('dialog[open] [data-action=skip-tutorial]');await delay(300);
 report.destinations['settings:speed']=await ev(`(()=>{const sel=document.querySelector('dialog[open] select[data-cruising-speed]');if(!sel)return 'missing';sel.value=sel.options[1].value;sel.dispatchEvent(new Event('change',{bubbles:true}));return {options:[...sel.options].map(o=>o.textContent),chosen:sel.value,saved:JSON.parse(localStorage.getItem('cards-pilot:wispbound.save.condensed.v7')).settings?.cardCruisingSpeed,label:sel.closest('.wb-select').querySelector('small').textContent}})()`);
 await click('dialog[open] [data-action=settings-advanced]');await wait('dialog.settings-sheet[open] #settings-heading');report.destinations['settings:advanced']=await ev(`document.querySelector('#settings-heading').textContent+' | '+document.querySelector('.settings-heading span')?.textContent`);
 await shot(path.join(outSettings,'home-advanced-900x405.png'));
 await click('dialog[open] [data-action=settings-back]');await wait('dialog.wb-settings-sheet[open]');report.destinations['settings:advanced-back-focus']=await ev('document.activeElement?.dataset?.action');
 await click('dialog[open] [data-action=field-guide]');await wait('dialog.field-guide-sheet[open]');report.destinations['settings:help']='dialog.field-guide-sheet';
 await click('dialog[open] [data-action=guide-back]');await wait('dialog.wb-settings-sheet[open]');report.destinations['settings:help-back']='settings';
 await key('Escape');await delay(300);report.escape.settingsEscapeCloses=!(await has('dialog[open]'));
 await fixture('run');await toMap();
 for(const [w,h] of SIZES){
  await viewport(w,h);await delay(250);await openMapPause();await click('dialog[open] [data-action=settings]');await wait('dialog.wb-settings-sheet[open]');await settle();
  await shot(path.join(outSettings,`run-${w}x${h}.png`));report.settings.push({situation:'run',size:`${w}x${h}`,...(await checks())});
  await ev(`document.querySelector('dialog[open]').close()`);
 }

 // Side-by-side with the design lab.
 const labShots=[['v2.5-theme','practice','practice-flight'],['v2.5-theme','run','run-flight'],['v2.5-theme','map','run-map']];
 for(const [variant,ctx,situation] of labShots)for(const [w,h] of SIZES){
  await viewport(w,h);await visit(`${base}/design-lab/frame.html?variant=${variant}&ctx=${ctx}`);await wait('#pause-layer .wb-sign');await settle();await delay(200);
  const lab=`lab-${situation}-${w}x${h}.png`;await shot(path.join(outPause,lab));
  await viewport(w*2+24,h+40);await visit(`${base}/__compare.html?a=v1.5-pause/${lab}&b=v1.5-pause/${situation}-${w}x${h}.png`);await delay(300);
  await shot(path.join(outPause,`compare-${situation}-${w}x${h}.png`));
 }
 for(const [w,h] of SIZES){
  await viewport(w,h);await visit(`${base}/design-lab/frame.html?variant=v1.1-settings`);await wait('#pause-layer .wb-sign');await settle();
  const lab=`lab-v1.1-settings-${w}x${h}.png`;await shot(path.join(outSettings,lab));
  await viewport(w*2+24,h+40);await visit(`${base}/__compare.html?a=v1.1-settings/${lab}&b=v1.1-settings/home-${w}x${h}.png`);await delay(300);
  await shot(path.join(outSettings,`compare-home-${w}x${h}.png`));
 }
}finally{
 await fs.writeFile(path.join(outRoot,'pause-settings-probe.json'),JSON.stringify(report,null,1));
 try{socket?.close()}catch{}browser.kill();server.close();await delay(300);await fs.rm(profile,{recursive:true,force:true}).catch(()=>{});
}
const problems=[...report.pause,...report.settings].filter(r=>r.missing||r.overflow?.length||r.clipped?.length||r.small?.length);
console.log(JSON.stringify({problems,destinations:report.destinations,volume:report.volume,escape:report.escape,errors:report.errors},null,1));
