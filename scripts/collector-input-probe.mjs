import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const release=/src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))?.[1];
assert.ok(release,'The game entry must declare its release marker');
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'wisp-field-input-'));
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve('dist','.'+new URL(req.url,'http://localhost').pathname);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){try{const result=await fn();if(result)return result;}catch{}await delay(100);}throw Error('Timed out');}
let socket;
try{
 const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]));
 const target=await until(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'));
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map();
 socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const [ok,no]=pending.get(m.id);pending.delete(m.id);m.error?no(Error(m.error.message)):ok(m.result);}});
 const send=(method,params={})=>new Promise((ok,no)=>{const id=++serial;pending.set(id,[ok,no]);socket.send(JSON.stringify({id,method,params}));});
 const ev=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
 const box=selector=>ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width*.5,y:r.y+r.height*.5,width:r.width,height:r.height};})()`);
 const mouse=async(type,x,y)=>send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
 const gesture=async(start,end)=>{await mouse('mousePressed',start.x,start.y);await mouse('mouseMoved',end.x,end.y);await mouse('mouseReleased',end.x,end.y);};
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('wispbound.save.condensed.v7','preserved-field-input-save')"});
 await send('Page.navigate',{url:base+'/game.html?mock=boundary&fieldimpulse=1&biome=pinewood&course=3'});
 await until(()=>ev("!!document.querySelector('.flight-resume-gate')"));
 await ev(`(async()=>{const {WispFlight}=await import(${JSON.stringify('./flight.mjs?v='+release)});const resume=WispFlight.prototype.resume;WispFlight.prototype.resume=function(...args){window.qaEngine=this;this.tick=()=>{};return resume.apply(this,args);};})()`);
 const gate=await box('.flight-resume-gate');await gesture(gate,gate);
 await until(()=>ev('!!window.qaEngine&&!qaEngine.paused'));
 assert.equal(await ev('qaEngine.flaps'),0,'the first tap only unpauses');
 const field=await box('.canvas-wrap'),lift=await box('#flap-btn');
 const inspect=()=>ev('({flaps:qaEngine.flaps,fuel:qaEngine.flame,ring:qaEngine.wisp.cooldown,direction:qaEngine.fieldImpulse?.direction})');
 const reset=()=>ev("qaEngine.fieldImpulse=null;qaEngine.wisp.phase='ready';qaEngine.wisp.target=qaEngine.wisp.cargo=qaEngine.wisp.leg=null;qaEngine.wisp.cooldown=0");
 const initial=await inspect();await mouse('mousePressed',field.x,field.y);assert.equal((await inspect()).flaps,initial.flaps);await mouse('mouseReleased',field.x,field.y);assert.equal((await inspect()).flaps,initial.flaps+1);
 const beforeButton=(await inspect()).flaps;await mouse('mousePressed',lift.x,lift.y);assert.equal((await inspect()).flaps,beforeButton+1);await mouse('mouseReleased',lift.x,lift.y);assert.equal((await inspect()).flaps,beforeButton+1);
 for(const [direction,dx,dy]of [['up',0,-65],['down',0,65],['right',65,0]]){
  await reset();const before=await inspect();await gesture(field,{x:field.x+dx,y:field.y+dy});const after=await inspect();
  assert.equal(after.direction,direction);assert.equal(after.flaps,before.flaps);assert.equal(after.fuel,before.fuel);assert.ok(after.ring>0);
 }
 for(const [name,dx,dy]of [['left',-65,0],['ambiguous',50,50],['below-swipe-threshold',16,0]]){
  await reset();const before=await inspect();await gesture(field,{x:field.x+dx,y:field.y+dy});assert.deepEqual(await inspect(),before,name);
 }
 await reset();await ev("qaEngine.wisp.phase='outbound';qaEngine.wisp.target={}");const fetchBefore=await inspect();await gesture(field,{x:field.x+65,y:field.y});assert.deepEqual(await inspect(),fetchBefore,'ineligible fetch gesture does not Lift');
 await reset();await ev('qaEngine.mod.collectorFieldImpulse=false');const oldTap=(await inspect()).flaps;await mouse('mousePressed',field.x,field.y);assert.equal((await inspect()).flaps,oldTap+1);await mouse('mouseReleased',field.x,field.y);await ev('qaEngine.mod.collectorFieldImpulse=true;qaEngine.pointerControls.refresh()');
 const point=(id,x,y)=>({id,x,y,radiusX:2,radiusY:2,force:1});
 const touch=(type,touchPoints)=>send('Input.dispatchTouchEvent',{type,touchPoints});
 await reset();const beforeTouch=await inspect();await touch('touchStart',[point(1,field.x,field.y)]);await touch('touchMove',[point(1,field.x+65,field.y)]);await touch('touchEnd',[]);assert.equal((await inspect()).direction,'right');assert.equal((await inspect()).flaps,beforeTouch.flaps);
 await reset();const cancelled=await inspect();await touch('touchStart',[point(1,field.x,field.y)]);await touch('touchMove',[point(1,field.x+65,field.y)]);await touch('touchCancel',[]);assert.deepEqual(await inspect(),cancelled);
 await touch('touchStart',[point(1,field.x,field.y)]);await touch('touchStart',[point(1,field.x,field.y),point(2,field.x+20,field.y+20)]);await touch('touchEnd',[]);assert.deepEqual(await inspect(),cancelled,'two fingers cannot leave a phantom tap');
 await reset();await gesture(field,{x:field.x+65,y:field.y});
 const feedback=await ev("[...document.querySelectorAll('.activation-cue')].some(n=>n.title==='Field Impulse')");assert.ok(feedback);
 await fs.writeFile('work/collector-field-impulse-proof.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 assert.equal(await ev("localStorage.getItem('wispbound.save.condensed.v7')"),'preserved-field-input-save');
 // Exercise real browser pointer capture and CSS matrices for rotated layouts.
 await ev(`(async()=>{qaEngine.pause();const {bindFlightPointerControls}=await import(${JSON.stringify('./flight-input.mjs?v='+release)});const stage=document.createElement('div');stage.style.cssText='position:fixed;left:300px;top:40px;width:180px;height:300px;transform:rotate(90deg);background:#183329;z-index:20000';document.body.append(stage);const button=document.createElement('button');document.body.append(button);window.rotatedCalls=[];window.rotatedControls=bindFlightPointerControls({lift:button,playfield:stage,getEngine:()=>window.rotatedScene});window.rotatedScene={running:true,mod:{collectorFieldImpulse:true},hasCompanion:()=>true,flap:()=>rotatedCalls.push('tap'),activateFieldImpulse:d=>rotatedCalls.push(d)};stage.id='rotated-qa';})()`);
 const rotated=await box('#rotated-qa');await gesture(rotated,{x:rotated.x+65,y:rotated.y});assert.deepEqual(await ev('rotatedCalls'),['up']);
 await ev('rotatedControls.destroy()');
 console.log(JSON.stringify({passed:['one-tap unpause','owner tap on release','instant dedicated Lift','instant nonowner tap','up/down/right no-Lift swipe','ignored left/ambiguous/ineligible swipe','real touch swipe','touch cancellation','multitouch cancellation','CSS rotated landscape mapping','visible existing skill feedback','ordinary save preserved'],viewport:'844×390',screenshot:path.resolve('work/collector-field-impulse-proof.png')}));
}finally{socket?.close();browser.kill();server.close();}
