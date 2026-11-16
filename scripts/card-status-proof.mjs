import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const profile=await fs.mkdtemp(path.join(os.tmpdir(),'emberwing-status-'));
const output=path.resolve('work/card-status-proof');await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  try{const url=new URL(req.url,'http://localhost');const file=path.resolve('dist','.'+url.pathname);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await fs.readFile(file));}
  catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--mute-audio','--no-first-run','--disable-gpu','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label){for(let i=0;i<100;i++){try{const result=await fn();if(result)return result;}catch{}await delay(100);}throw Error('Timed out: '+label);}
let socket;const errors=[],report=[];
try{
  const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'browser');
  const target=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(item=>item.type==='page');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let serial=0;const pending=new Map();
  socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const [resolve,reject]=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(m.error.message)):resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,[resolve,reject]);socket.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(output,name+'.png'),Buffer.from(r.data,'base64'));};
  await send('Page.enable');await send('Runtime.enable');
  for(const [width,height] of [[740,333],[720,280]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate',{url:base+'/game.html?cards=1&mock=cards&slots=5'});
    await until(()=>ev("!!document.querySelector('.card-equipped-foreground .card-config-status')"),'equipped status');
    await ev('document.fonts.ready');
    assert.equal(await ev("document.querySelectorAll('.card-equipped-face .card-config-status').length"),5);
    const check=async()=>ev(`(()=>{const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return [...document.querySelectorAll('.card-has-status')].map(card=>{const status=card.querySelector('.card-config-status'),r=status.getBoundingClientRect(),help=card.querySelector('.card-help'),uses=card.querySelector('.card-use-counter'),band=card.querySelector('.card-rule-band');const text=[...band.querySelectorAll('.card-rule-stripe')].flatMap(stripe=>{const range=document.createRange();range.selectNodeContents(stripe);return [...range.getClientRects()].filter(v=>v.width>0&&v.height>0);});return {lastBand:[...band.querySelectorAll(".card-rule-stripe")].map(n=>({text:n.textContent,display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility,color:getComputedStyle(n).color,rect:n.getBoundingClientRect().toJSON()})),id:card.dataset.cardHelp,status:status.textContent,ruleOverflow:band.scrollHeight-band.clientHeight,textOutside:text.some(t=>t.bottom>band.getBoundingClientRect().bottom+1||t.right>band.getBoundingClientRect().right+1),helpOverlap:help?overlap(r,help.getBoundingClientRect()):false,usesOverlap:uses?overlap(r,uses.getBoundingClientRect()):false,textOverlap:text.some(t=>overlap(r,t)),width:r.width,height:r.height};});})()`);
    await shot(`equipped-5-${width}x${height}`);
    await ev("document.querySelector('.card-foreground-row').scrollLeft=10000");await shot(`equipped-5-end-${width}x${height}`);const foreground=await check();assert.ok(foreground.every(n=>n.ruleOverflow<=1&&!n.textOutside&&!n.helpOverlap&&!n.usesOverlap&&!n.textOverlap&&n.height>=24),JSON.stringify(foreground));
    await click('.card-equipped-face .card-config-status');await until(()=>ev("!!document.querySelector('.card-status-dialog[open]')"),'status dialog');
    assert.match(await ev("document.querySelector('.card-status-dialog').textContent"),/when its condition happens/);
    await click('.card-status-dialog [data-card-term-close]');
    assert.equal(await ev("document.activeElement.matches('[data-card-status-help]')"),true);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await until(()=>ev("!!document.querySelector('.card-status-dialog[open]')"),'keyboard status dialog');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await until(()=>ev("!document.querySelector('.card-status-dialog')"),'escape closes');
    await click('[data-action="card-slot"][data-index="1"]');await until(()=>ev("!!document.querySelector('.card-read-face .card-config-status')"),'reader');
    assert.equal(await ev("document.querySelector('.card-use-counter').textContent"),'4/6');
    const reader=await check();assert.ok(reader.every(n=>n.ruleOverflow<=1&&!n.textOutside&&!n.usesOverlap&&!n.textOverlap),JSON.stringify(reader));
    await shot(`reader-${width}x${height}`);
    await ev(`(async()=>{const U=await import('./card-ui.mjs?v=skills-cards-3'),C=await import('./skill-cards.mjs?v=skills-cards-3'),I=await import('./card-inspector.mjs?v=skills-cards-3');const state=I.createCardInspectorState();state.run.mountedCards=['prism-lens','chameleon','echo','toll-bell','closing-chord'].map((id,i)=>C.makeSkillCard(id,'bad:'+i));state.run.cardSlots=5;document.querySelector('.card-sheet').innerHTML=U.cardsBenchMarkup(state);})()`);
    assert.equal(await ev("document.querySelectorAll('.card-config-blocked').length"),5);
    await shot(`placement-hints-${width}x${height}`);
    await click('.card-config-blocked');await until(()=>ev("!!document.querySelector('.card-status-dialog[open]')"),'blocked help');
    assert.match(await ev("document.querySelector('.card-status-fix').textContent"),/Move it after/);
    await shot(`placement-help-${width}x${height}`);
    report.push({width,height,foreground,reader,keyboardHelp:true,blockedHelp:true});
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({report,errors},null,2));
  console.log(JSON.stringify({output,report,errors},null,2));
}finally{socket?.close();browser.kill();await new Promise(resolve=>server.close(resolve));}
