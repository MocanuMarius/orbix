import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const output=path.resolve('work/rhythm-playtest');await fs.mkdir(output,{recursive:true});
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'wisp-rhythm-ui-'));
const mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
  try{const url=new URL(req.url,'http://localhost'),file=path.resolve('dist','.'+url.pathname),data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--disable-gpu','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label){for(let i=0;i<100;i++){try{const value=await fn();if(value)return value;}catch{}await delay(100);}throw Error('Timed out: '+label);}
let socket;const errors=[],worldExamples=[],performanceReports=[];
try{
  const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'browser');
  const target=await until(async()=>(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item=>item.type==='page'),'page');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let serial=0;const pending=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const [resolve,reject]=pending.get(message.id);pending.delete(message.id);message.error?reject(Error(message.error.message)):resolve(message.result);}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,[resolve,reject]);socket.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const screenshot=async label=>{const result=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(output,label+'.png'),Buffer.from(result.data,'base64'));};
  await send('Runtime.enable');
  for(const [width,height,label]of [[844,390,'phone-landscape'],[390,844,'phone-portrait'],[1280,720,'desktop']]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<900});
    await send('Page.navigate',{url:base+'/rhythm-preview.html?perf=1'});
    await until(()=>ev('!!globalThis.rhythmPractice?.engine?.running'),'real practice flight');
    assert.equal(await ev("document.querySelector('.rhythm-score').hidden"),true);
    // Actual production input and actual advancing world time. No cue or clock
    // is fabricated for screenshots, successful catches or no-input expiry.
    await ev(`(()=>{const e=rhythmPractice.engine;e.beginLiftInput();e.endLiftInput();})()`);
    assert.equal(await ev("document.querySelector('.rhythm-score').dataset.phase"),'one');
    await ev(`(async()=>{const e=rhythmPractice.engine,target=e.time+.6;await new Promise(resolve=>{const frame=()=>e.time>=target?resolve():requestAnimationFrame(frame);frame();});e.beginLiftInput();e.endLiftInput();})()`);
    assert.equal(await ev("document.querySelector('.rhythm-score').dataset.phase"),'two');
    await screenshot(label+'-approach');
    const bounds=await ev(`(()=>{const r=document.querySelector('.rhythm-score').getBoundingClientRect(),a=document.querySelector('.flight-artifact-bar').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,artifactBottom:a.bottom};})()`);
    assert.ok(bounds.left>=0&&bounds.right<=width&&bounds.top>=bounds.artifactBottom&&bounds.bottom<height/2,JSON.stringify(bounds));
    // Catch at equal world gaps while the genuine renderer/physics keep running.
    await click('#reset');
    const success=await ev(`(async()=>{const e=rhythmPractice.engine;let count=0;const sound=e.sound.bind(e);e.sound=(kind,...rest)=>{if(kind==='luminance')count++;return sound(kind,...rest);};const wait=target=>new Promise(resolve=>{const frame=()=>e.time>=target?resolve():requestAnimationFrame(frame);frame();});const tap=()=>{const accepted=e.beginLiftInput();e.endLiftInput();return accepted;};tap();await wait(e.time+.6);tap();await wait(e.cardRhythm.state.targetAt);tap();return {phase:e.cardRhythm.state.phase,waves:e.cardRhythm.state.waves,sounds:count};})()`);
    assert.deepEqual(success,{phase:'caught',waves:1,sounds:1});
    await screenshot(label+'-caught');
    await delay(400);assert.equal(await ev("document.querySelector('.rhythm-score').hidden"),true);
    await ev(`(async()=>{const e=rhythmPractice.engine;e.beginLiftInput();e.endLiftInput();await new Promise(r=>setTimeout(r,450));e.beginLiftInput();e.endLiftInput();})()`);
    await until(()=>ev("document.querySelector('.rhythm-score').dataset.phase==='miss'"),'no-tap drop');
    await until(()=>ev("document.querySelector('.rhythm-score').hidden"),'no-tap clear');
    assert.equal(await ev('rhythmPractice.engine.cardRhythm.state.waves'),1);
    await ev(`(()=>{const e=rhythmPractice.engine;e.beginLiftInput();e.endLiftInput();window.dispatchEvent(new Event('blur'));})()`);
    assert.equal(await ev("document.querySelector('.rhythm-score').hidden"),true);
    await click('#pause');await click('#reduced');
    const still=await ev(`(async()=>{const e=rhythmPractice.engine;e.beginLiftInput();e.endLiftInput();await new Promise(r=>setTimeout(r,400));e.beginLiftInput();e.endLiftInput();return {reduced:e.reducedMotion,animations:document.querySelector('.rhythm-third').getAnimations().map(a=>a.effect.getKeyframes())};})()`);
    assert.equal(still.reduced,true);assert.equal(still.animations.length,1);assert.ok(still.animations[0].every(frame=>!frame.transform));
    await screenshot(label+'-still');
    await click('#pause');assert.equal(await ev("document.querySelector('.rhythm-score').hidden"),true);
    assert.equal(await ev('localStorage.length'),0,'practice never touches saves');
    // A deterministic actual-hole fixture changes pace between manual Lifts.
    // The same BlackHoles.update(), tick(), CardRhythm and WAAPI HUD are used.
    await click('#black-hole');
    const example=await ev(`(async()=>{const e=rhythmPractice.engine,h=e.blackHoles.items[0],tap=()=>{const accepted=e.beginLiftInput();e.endLiftInput();return accepted;},wait=target=>new Promise(resolve=>{const frame=()=>e.time>=target?resolve():requestAnimationFrame(frame);frame();});h.x=e.distance+e.player.x+900;e.blackHoles.update(0);e.notify();const first={world:e.time,wall:performance.now()};tap();await wait(e.time+.6);h.x=e.distance+e.player.x;h.y=e.player.y;e.blackHoles.cursor=0;e.blackHoles.update(0);e.notify();const second={world:e.time,wall:performance.now(),rate:e.worldRate};tap();await wait(e.cardRhythm.state.targetAt);const third={world:e.time,wall:performance.now(),rate:e.worldRate};tap();return {first,second,third,phase:e.cardRhythm.state.phase,waves:e.cardRhythm.waves,animationRates:document.querySelector('.rhythm-score').getAnimations({subtree:true}).map(a=>a.playbackRate)};})()`);
    assert.equal(example.phase,'caught');assert.equal(example.waves,1);assert.ok(Math.abs(example.second.rate-.35)<1e-8);
    assert.ok(Math.abs((example.second.world-example.first.world)-(example.third.world-example.second.world))<.04);
    assert.ok(example.third.wall-example.second.wall>(example.second.wall-example.first.wall)*1.15);
    assert.ok(example.animationRates.every(rate=>Math.abs(rate-example.third.rate)<.011));
    worldExamples.push({label,...example});await screenshot(label+'-black-hole-caught');
    await ev(`(()=>{const e=rhythmPractice.engine,h=e.blackHoles.items[0];h.x=e.distance+e.player.x+20;h.y=e.player.y;e.blackHoles.cursor=0;e.blackHoles.update(0);e.notify();e.beginLiftInput();e.endLiftInput();})()`);
    await delay(700);
    const samples=await ev(`(()=>{const e=rhythmPractice.engine;return {worldRate:e.worldRate,phase:e.cardRhythm.phase,report:rhythmPractice.performance};})()`);
    assert.ok(samples.report.tickCpuMs.count>40);assert.equal(samples.report.errors.length,0);
    performanceReports.push({label,...samples});await screenshot(label+'-black-hole-practice');
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({passed:true,sizes:[[844,390],[390,844],[1280,720]],worldExamples,performanceReports,errors},null,2));
  console.log('Rhythm real-flight smoke passed at 844×390, 390×844 and 1280×720. Screenshots: '+output);
}finally{
  socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));
}
