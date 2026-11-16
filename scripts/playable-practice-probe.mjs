import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const root=path.resolve('dist'),out=path.resolve('work/playable-practice-qa');await fs.mkdir(out,{recursive:true});
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error('Outside dist');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end();}});
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
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`if(window.name==='practice-clear'){localStorage.clear();window.name='';}if(window.name.startsWith('practice-fixture:')){const f=JSON.parse(window.name.slice(17));localStorage.setItem(f[0],f[1]);window.name='';}`});
 const report=[];
 for(const [width,height]of [[900,405],[667,300]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await call('Page.navigate',{url:base+'/game.html?cards=1'});
  await until(()=>ev("!!document.querySelector('[data-action=tutorial]')"),'Tutorial button');
  await ev(`(async()=>{const f=await import('./flight.mjs?v=guide-clarity-1');const start=f.WispFlight.prototype.start;f.WispFlight.prototype.start=function(...args){window.__practiceFlight=this;return start.apply(this,args)};})()`);
  await ev("document.querySelector('[data-action=tutorial]').click()");
  await until(()=>ev("!!document.querySelector('.prologue-map')"),'playable route').catch(async error=>{console.log(await ev("({screen:document.body.dataset.screen,text:document.body.innerText,errors:__lessonErrors})"));throw error;});
  assert.equal(await ev("!!document.querySelector('.field-guide-sheet')"),false,'Tutorial goes to the route');
  assert.ok((await ev("document.querySelector('.prologue-tools').textContent")).includes('1/7'));
  let shot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,`route-${width}.png`),Buffer.from(shot.data,'base64'));
  await ev("document.querySelector('[data-action=preview-node][data-id=practice-glide]').dispatchEvent(new MouseEvent('click',{bubbles:true}))");
  await until(()=>ev("!!document.querySelector('[data-action=node][data-id=practice-glide]')"),'travel');
  await ev("document.querySelector('[data-action=node][data-id=practice-glide]').click()");
  await until(()=>ev("!!document.querySelector('[data-action=wake-flight]')"),'tap gate');
  assert.equal(await ev("!!document.querySelector('.tutorial-coach:not([hidden])')"),false,'no initial reading wall');
  await ev("document.querySelector('[data-action=wake-flight]').click();__practiceFlight.beginLiftInput();__practiceFlight.endLiftInput()");
  // Normal accepted Lifts keep this first broad passage alive. A coach may only
  // interrupt after a full quiet second and a safe collision projection.
  await ev(`window.__practicePilot=setInterval(()=>{const e=__practiceFlight;if(!e||e.paused||e.dying)return;if(e.player.y>e.height*.57&&e.player.vy>0){e.beginLiftInput();e.endLiftInput();}},25)`);
  await until(()=>ev("!!document.querySelector('.tutorial-coach[data-contextual=true]:not([hidden])')"),'contextual popup');
  const popup=await ev(`(()=>{const e=__practiceFlight,c=document.querySelector('.tutorial-coach-card').getBoundingClientRect(),b=document.querySelector('[data-coach=next]').getBoundingClientRect();return {paused:e.paused,time:e.time,quiet:e.time-Math.max(e.lastHintInputTime||0,e.lastFlapTime||0),inside:c.left>=0&&c.right<=innerWidth&&c.top>=0&&c.bottom<=innerHeight,button:b.height>=44&&b.bottom<=innerHeight,lesson:document.querySelector('.tutorial-coach').dataset.step};})()`);
  assert.equal(popup.paused,true);assert.ok(popup.quiet>=1);assert.ok(popup.inside);assert.ok(popup.button);
  shot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,`popup-${width}.png`),Buffer.from(shot.data,'base64'));
  await ev("document.querySelector('[data-coach=next]').click()");
  await until(()=>ev("__practiceFlight.resumeRemaining>0&&!__practiceFlight.paused"),'slow resume');
  await ev("clearInterval(__practicePilot);document.querySelector('[data-action=menu]').click()");
  assert.deepEqual(await ev('__lessonErrors'),[]);
  report.push({width,height,popup,entry:'main Tutorial → seven-stop route',resume:'countdown then slow motion'});
  await ev("document.querySelector('[data-action=exit-menu]').click()");
  await ev(`(async()=>{const m=await import('./model.mjs?v=guide-clarity-1'),s=m.newState();s.run=m.createRun(s.profile,'protected',1,{cards:true});m.startTutorial(s);const r=s.run;const clear=()=>{m.selectNode(r,m.getChoices(r)[0].id);m.beginFlightAttempt(r);m.finishFlight(r,{success:true,flame:70,collected:5});};clear();m.selectNode(r,m.getChoices(r)[0].id);m.saveState(s,{setItem:(k,v)=>{window.name='practice-fixture:'+JSON.stringify(['cards-pilot:'+k,v]);}});})()`);
  await call('Page.navigate',{url:base+'/game.html?cards=1'});
  await until(()=>ev("!!document.querySelector('[data-action=continue-run]')"),'saved chest');
  await ev("document.querySelector('[data-action=continue-run]').click()");
  await until(()=>ev("!!document.querySelector('.practice-stop [data-action=support]')"),'borrow checkpoint');
  assert.equal(await ev("document.querySelector('.practice-stop [data-card-name]').dataset.cardName"),'Proximity');
  assert.equal(await ev("(()=>{const b=document.querySelector('.practice-stop [data-action=support]').getBoundingClientRect();return b.height>=44&&b.bottom<=innerHeight;})()"),true);
  shot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,`borrow-${width}.png`),Buffer.from(shot.data,'base64'));
  await ev("document.querySelector('.practice-stop [data-action=support]').click()");
  await ev(`(async()=>{const m=await import('./model.mjs?v=guide-clarity-1'),s=m.loadState({getItem:k=>localStorage.getItem('cards-pilot:'+k),setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)}),r=s.run;m.selectNode(r,m.getChoices(r)[0].id);m.beginFlightAttempt(r);m.finishFlight(r,{success:true,flame:70,collected:5});m.selectNode(r,m.getChoices(r)[0].id);m.saveState(s,{setItem:(k,v)=>{window.name='practice-fixture:'+JSON.stringify(['cards-pilot:'+k,v]);}});})()`);
  await call('Page.navigate',{url:base+'/game.html?cards=1'});
  await until(()=>ev("!!document.querySelector('[data-action=continue-run]')"),'saved camp');
  await ev("document.querySelector('[data-action=continue-run]').click()");
  await until(()=>ev("document.querySelectorAll('.practice-stop [data-card-name]').length===2"),'combo card faces');
  assert.deepEqual(await ev("[...document.querySelectorAll('.practice-stop [data-card-name]')].map(c=>c.dataset.cardName)"),['Rhythm','Resonant Harvest']);
  assert.equal(await ev("(()=>{const b=document.querySelector('.practice-stop [data-action=support]').getBoundingClientRect();return b.height>=44&&b.bottom<=innerHeight;})()"),true);
  shot=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(out,`camp-${width}.png`),Buffer.from(shot.data,'base64'));
  const crossing=await ev(`(async()=>{const m=await import('./model.mjs?v=guide-clarity-1'),p=await import('./practice-route.mjs?v=guide-clarity-1'),{WispFlight}=await import('./flight.mjs?v=guide-clarity-1'),s=m.newState();m.startTutorial(s);p.loanPracticeCards(s.run,['rhythm','harvest-common']);const e=new WispFlight({canvas:{style:{},getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})},preflight:true,node:s.run.map[4][0],duration:26,flame:100,companions:['collector'],modifiers:m.getRunModifiers(s.run)});e.running=true;for(let i=0;i<3;i++){e.beginLiftInput();e.endLiftInput();for(let j=0;j<48;j++)e.step(1/60);}const result={waves:e.cardRhythm.waves,event:e.cardRowTrace?.event?.kind,restored:e.cardRowTrace?.restoredSparks,observed:e.tutorial.harvestPaid,dying:e.dying};e.destroy();return result;})()`);
  assert.deepEqual(crossing,{waves:1,event:'wave-crossing',restored:1,observed:true,dying:false});
  report[report.length-1].crossing=crossing;
  await ev("localStorage.clear();window.name='practice-clear'");
 }
 console.log(JSON.stringify({report,screenshots:out},null,2));
}finally{socket?.close();browser.kill();await new Promise(r=>server.close(r));}
