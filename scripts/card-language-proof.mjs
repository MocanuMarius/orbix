import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const output=path.resolve('work/card-language-proof');
await fs.mkdir(output,{recursive:true});
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'emberwing-terms-'));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--mute-audio','--no-first-run','--disable-gpu','--no-default-browser-check',
  '--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'
],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label){for(let i=0;i<100;i++){try{const result=await fn();if(result)return result;}catch{}await delay(100);}throw Error('Timed out: '+label);}
let socket;
try {
  const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'browser');
  const target=(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(item=>item.type==='page');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let serial=0;const pending=new Map(),errors=[];
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const [resolve,reject]=pending.get(message.id);pending.delete(message.id);message.error?reject(Error(message.error.message)):resolve(message.result);}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,[resolve,reject]);socket.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const shot=async name=>{const result=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(output,name+'.png'),Buffer.from(result.data,'base64'));};
  await send('Page.enable');await send('Runtime.enable');
  const report=[];
  for(const [width,height] of [[740,333],[1440,900]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width===740});
    await send('Page.navigate',{url:'http://localhost:4180/card-combos.html?seed=moonwell-15'});
    await until(()=>ev("document.querySelectorAll('.combo-row').length===15"),'gallery');
    await ev('document.fonts.ready');
    await ev('Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))');
    assert.equal(await ev("document.querySelectorAll('.skill-card').length"),45);
    assert.equal(await ev("new Set([...document.querySelectorAll('.skill-card')].map(n=>n.dataset.cardHelp)).size"),16);
    assert.equal(await ev("document.querySelectorAll('.card-term-icon-collector,.card-term-icon-wave,.card-term-icon-ring,.card-term-icon-rest,.card-term-icon-uses,.card-term-icon-copy').length"),0);
    const bad=await ev(`Array.from(document.querySelectorAll('.card-rule-band')).map(n=>({name:n.closest('[data-card-help]').dataset.cardHelp,over:n.scrollHeight-n.clientHeight})).filter(n=>n.over>1)`);
    assert.deepEqual(bad,[],'rules fit '+width);
    const signature=await ev("[...document.querySelectorAll('.combo-row')].map(n=>[...n.querySelectorAll('[data-card-help]')].map(c=>c.dataset.cardHelp).join('|'))");
    report.push({width,height,signature});
    await shot('gallery-'+width+'x'+height);
    await ev("document.querySelector('[data-card-help=body-spark]').scrollIntoView({block:'start'})");
    await shot('body-spark-'+width+'x'+height);
    const body=await ev(`(()=>{const n=document.querySelector('[data-card-help=body-spark]');return {lines:n.querySelectorAll('.card-rule-line').length,reward:n.querySelector('.card-rule-reward').textContent.trim(),symbols:[...n.querySelectorAll('.card-term-symbol')].map(b=>({label:b.getAttribute('aria-label'),size:b.getBoundingClientRect().width}))}})()`);
    assert.equal(body.lines,1);assert.equal(body.reward,'+2');assert.equal(body.symbols.length,2);
    assert.ok(body.symbols.every(s=>s.size>=16&&s.size<=20),'16–20px inline resources');
    await ev("document.querySelector('[data-card-help=body-spark] [data-card-term=spark]').focus()");
    await send('Page.bringToFront');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await until(()=>ev("!!document.querySelector('.card-term-dialog[open]')"),'keyboard help');
    await shot('spark-help-'+width+'x'+height);
    assert.match(await ev("document.querySelector('.card-term-dialog').textContent"),/created by powers do not trigger/);
    await click('[data-card-term-close]');
    assert.equal(await ev("document.activeElement.dataset.cardTerm"),'spark');
    await click('[data-card-help=spark-cache] .card-use-counter');
    assert.match(await ev("document.querySelector('.card-term-dialog').textContent"),/At zero it leaves your deck/);
    await click('[data-card-term-close]');
    await ev("document.querySelector('[data-card-help=cache-handling]').closest('.combo-row').scrollIntoView({block:'start'})");
    await shot('collector-card-'+width+'x'+height);
    await click('[data-card-help=cache-handling] [data-card-term=collector]');
    await ev("document.querySelector('.card-term-picture img').decode()");
    assert.equal(await ev("document.querySelector('.card-term-picture img').naturalWidth"),320);
    const dialog=await ev("(()=>{const r=document.querySelector('.card-term-dialog').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}})()");
    assert.ok(dialog.x>=0&&dialog.y>=0&&dialog.right<=width&&dialog.bottom<=height,'modal in viewport');
    await shot('collector-help-'+width+'x'+height);
    await click('.card-term-dialog footer [data-card-term-close]');
    assert.equal(await ev('document.activeElement.dataset.cardTerm'),'collector');
    await ev("document.querySelector('[data-card-help=rhythm]').closest('.combo-row').scrollIntoView({block:'start'})");
    await shot('rhythm-'+width+'x'+height);
    await click('[data-card-help=rhythm] [data-card-term=wave]');
    assert.equal(await ev("document.querySelectorAll('.card-term-dialog svg,.card-term-dialog figure').length"),0,'wave is text only');
    await click('[data-card-term-close]');
    await ev("document.querySelector('[data-card-help=body-spark]').closest('.combo-row').querySelector('.combo-outcomes').open=true");
    assert.ok(await ev("document.querySelectorAll('.combo-outcomes [data-card-term=wave]').length>0"),'plain wave summary links help');
  }
  assert.deepEqual(report[0].signature,report[1].signature,'sample stable across viewports');
  await send('Emulation.setDeviceMetricsOverride',{width:740,height:333,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:'http://localhost:4180/game.html?cards=1&mock=cards'});
  await until(()=>ev("!!document.querySelector('[data-action=card-slot][data-index=\"1\"]')"),'equipped');
  await click('[data-action=card-slot][data-index="1"]');
  await until(()=>ev("!!document.querySelector('.card-read-face .card-use-counter')"),'reader');
  await ev('document.fonts.ready');
  const badge=await ev("(()=>{const n=document.querySelector('.card-read-face .card-use-counter'),r=n.getBoundingClientRect();return {label:n.getAttribute('aria-label'),x:r.x,y:r.y,right:r.right,bottom:r.bottom}})()");
  assert.match(badge.label,/4 of 6 uses remaining/);
  assert.ok(badge.x>=0&&badge.y>=0&&badge.right<=740&&badge.bottom<=333);
  await shot('pocket-reader-740x333');
  await click('.card-read-face .card-use-counter');
  await until(()=>ev("!!document.querySelector('.card-term-dialog[open]')"),'uses help');
  await shot('uses-help-740x333');
  await click('[data-card-term-close]');
  assert.equal(await ev('document.activeElement.className'),'card-use-counter');
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:true,viewports:report.map(({width,height})=>({width,height})),output}));
} finally {
  socket?.close();browser.kill();
  await delay(150);
  await fs.rm(profile,{recursive:true,force:true}).catch(()=>{});
}
