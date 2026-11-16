import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const root=path.resolve('dist'),out=path.resolve('work/combo-lesson-qa');await fs.mkdir(out,{recursive:true});
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('Outside dist');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'combo-lesson-qa-'));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<180;i++){try{const v=await fn();if(v)return v;}catch{}await delay(100);}throw Error('Timed out '+label);}
let socket;
try{
 const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome');
 const target=await until(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'),'page');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map();
 socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 await call('Page.enable');await call('Runtime.enable');
 await call('Page.addScriptToEvaluateOnNewDocument',{source:"window.__lessonErrors=[];addEventListener('error',e=>__lessonErrors.push(e.message));addEventListener('unhandledrejection',e=>__lessonErrors.push(String(e.reason)));"});
 const report=[];
 for(const [width,height]of [[900,405],[720,320],[390,660]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await call('Page.navigate',{url:base+'/combo-lesson.html'});
  await until(()=>ev("!!document.querySelector('.combo-lesson[data-phase=ready]')"),'ready');await ev('document.fonts.ready');await delay(300);
  await ev("localStorage.setItem('combo-lesson-save-sentinel','unchanged')");
  const assertLayout=async()=>{
   assert.equal(await ev('document.documentElement.scrollWidth<=innerWidth'),true,'viewport overflow');
   const layout=await ev(`(()=>{const d=document.querySelector('.combo-lesson'),r=d.getBoundingClientRect();return {inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,buttons:[...d.querySelectorAll('button')].filter(b=>!b.hidden&&b.getClientRects().length).map(b=>({action:b.dataset.lesson,height:b.getBoundingClientRect().height,visible:b.getBoundingClientRect().bottom<=r.bottom})),canvas:d.querySelector('canvas').getBoundingClientRect().height};})()`);
   assert.equal(layout.inside,true);assert.ok(layout.canvas>=100);assert.ok(layout.buttons.every(b=>b.visible),JSON.stringify({width,height,...layout}));
   assert.ok(layout.buttons.filter(b=>!['guided','free'].includes(b.action)).every(b=>b.height>=44));return layout;
  };
  let shot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,`ready-${width}.png`),Buffer.from(shot.data,'base64'));
  await assertLayout();
  for(let i=0;i<3;i++){
   await until(()=>ev("!document.querySelector('[data-lesson=lift]').disabled"),'Lift ready');
   await ev("document.querySelector('[data-lesson=lift]').click()");
  }
  await until(()=>ev("document.querySelector('.combo-lesson').dataset.phase==='complete'"),'crossing').catch(async error=>{const shot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,`failure-${width}.png`),Buffer.from(shot.data,'base64'));console.log(await ev("({phase:document.querySelector('.combo-lesson')?.dataset,errors:__lessonErrors})"));throw error;});
  await assertLayout();
  assert.equal(await ev("document.querySelector('.combo-lesson-meter b').textContent"),'10');
  assert.equal(await ev("localStorage.getItem('combo-lesson-save-sentinel')"),'unchanged');
  assert.deepEqual(await ev('__lessonErrors'),[]);
  shot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,`complete-${width}.png`),Buffer.from(shot.data,'base64'));
  await ev("document.querySelector('[data-lesson=replay]').click()");
  assert.equal(await ev("document.querySelector('.combo-lesson').dataset.phase"),'ready');
  assert.equal(await ev("document.querySelector('.combo-lesson-meter b').textContent"),'18');
  await ev("document.querySelector('[data-lesson=free]').click();document.querySelector('[data-lesson=lift]').click()");
  await delay(900);await ev("document.querySelector('[data-lesson=lift]').click()");
  await until(()=>ev("document.querySelector('.combo-lesson').dataset.phase==='miss'"),'free pace expiry');
  await ev("document.querySelector('[data-lesson=skip]').click()");
  assert.equal(await ev("!!document.querySelector('dialog.combo-lesson')"),false);report.push({width,height,guided:'complete',free:'safe miss',saved:'unchanged'});
 }
 // Verify entry through the real Field Guide, returning to the same modal.
 await call('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:1,mobile:true});
 await call('Page.navigate',{url:base+'/game.html?cards=1'});
 await until(()=>ev("!!document.querySelector('[data-action=tutorial]')"),'Field Guide entry');
 await ev("document.querySelector('[data-action=tutorial]').click();document.querySelector('[data-action=guide-page][data-id=\"1\"]').click()");
 await until(()=>ev("!!document.querySelector('.field-guide-sheet [data-combo-lesson]')"),'combo entry');
 assert.equal(await ev("(()=>{const r=document.querySelector('.field-guide-sheet [data-combo-lesson]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})()"),true);
 let appShot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'field-guide-entry.png'),Buffer.from(appShot.data,'base64'));
 const save=await ev('JSON.stringify({...localStorage})');
 await ev("document.querySelector('.field-guide-sheet [data-combo-lesson]').click()");
 await until(()=>ev("!!document.querySelector('dialog.combo-lesson[open]')"),'in-app combo lesson');
 appShot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'in-game-ready.png'),Buffer.from(appShot.data,'base64'));
 await ev("document.querySelector('[data-lesson=close]').click()");
 assert.equal(await ev("!!document.querySelector('.field-guide-sheet[open]')"),true);
 assert.equal(await ev('JSON.stringify({...localStorage})'),save);assert.deepEqual(await ev('__lessonErrors'),[]);
 // Seed a valid resumed prologue checkpoint, preserving a real suspended run
 // and a New Game continuation, then use the ordinary Continue entry.
 const checkpointFixture=await ev(`(async()=>{const m=await import('./model.mjs?v=relic-guide-1'),s=m.newState();s.run=m.createRun(s.profile,'saved-campaign-under-practice');m.startTutorial(s,{forNewGame:true,difficulty:2});m.selectNode(s.run,m.getChoices(s.run)[0].id);m.beginFlightAttempt(s.run);m.finishFlight(s.run,{success:true,flame:70,collected:5});let saved;m.saveState(s,{setItem:(k,v)=>saved=['cards-pilot:'+k,v]});return saved;})()`);
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem(${JSON.stringify(checkpointFixture[0])},${JSON.stringify(checkpointFixture[1])})`});
 await call('Page.navigate',{url:base+'/game.html?cards=1'});
 await until(()=>ev("!!document.querySelector('[data-action=continue-run]')"),'resumed practice');
 await ev("document.querySelector('[data-action=continue-run]').click()");
 await until(()=>ev("!!document.querySelector('.combo-lesson-entry [data-combo-lesson]')"),'checkpoint practice link');
 appShot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,'first-light-checkpoint.png'),Buffer.from(appShot.data,'base64'));
 const checkpointSave=await ev('JSON.stringify({...localStorage})');
 await ev("document.querySelector('.combo-lesson-entry [data-combo-lesson]').click()");
 await until(()=>ev("!!document.querySelector('dialog.combo-lesson[open]')"),'checkpoint lesson');
 await ev("document.querySelector('[data-lesson=skip]').click()");
 assert.equal(await ev('JSON.stringify({...localStorage})'),checkpointSave);
 assert.equal(await ev("!!document.querySelector('.prologue-map')"),true);assert.deepEqual(await ev('__lessonErrors'),[]);
 console.log(JSON.stringify({report,fieldGuide:'returned to same guide, save unchanged',checkpoint:'ordinary Continue, optional lesson, suspended campaign and continuation unchanged',screenshots:out},null,2));
}finally{socket?.close();browser.kill();await new Promise(r=>server.close(r));}
