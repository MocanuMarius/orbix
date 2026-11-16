import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {COMPONENT_SAMPLES} from '../dist/ui/gallery-catalog.mjs';

const output=path.resolve('outputs/ui-components');
await fs.mkdir(output,{recursive:true});
const game=await fs.readFile('dist/game.html','utf8'),preview=await fs.readFile('dist/components-preview.html','utf8');
const stylesheetPaths=html=>[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]);
assert.deepEqual(stylesheetPaths(preview).filter(value=>!value.includes('/ui/preview.css')),stylesheetPaths(game),'Preview must use the exact production CSS order.');
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'wisp-ui-components-'));
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost'),file=path.resolve('dist','.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(path.resolve('dist')+path.sep))throw Error('Outside dist');
    const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label){for(let index=0;index<160;index++){try{const value=await fn();if(value)return value;}catch{}await delay(75);}throw Error(`Timed out: ${label}`);}
let socket;
const errors=[],failedResources=[];
try{
  const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome');
  const target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(entry=>entry.type==='page');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let serial=0;const pending=new Map();
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(Error(message.error.message)):resolve(message.result);}
    else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
    else if(message.method==='Network.responseReceived'&&message.params.response.status>=400)failedResources.push(`${message.params.response.status} ${message.params.response.url}`);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;};
  const click=async selector=>{assert.ok(await ev(`!!document.querySelector(${JSON.stringify(selector)})`),selector);await ev(`{const node=document.querySelector(${JSON.stringify(selector)});node.focus({preventScroll:true});node.dispatchEvent(new MouseEvent('click',{bubbles:true}));}`);};
  const shot=async label=>{const result=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(output,`${label}.png`),Buffer.from(result.data,'base64'));};
  const viewport=async(width=900,height=405)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  const page=async(family,variant)=>{
    const url=`${base}/components-preview.html?${new URLSearchParams({family,state:variant})}`;
    await send('Page.navigate',{url});
    await until(()=>ev(`location.href===${JSON.stringify(url)}&&document.documentElement.dataset.previewReady==='true'`),`${family}/${variant}`);
  };
  await send('Runtime.enable');await send('Network.enable');await viewport();
  await page('collection','rest');
  const sentinels={'wispbound.save.condensed.v7':'main-save-sentinel','cards-pilot:wispbound.save.condensed.v7':'cards-save-sentinel'};
  await ev(`Object.entries(${JSON.stringify(sentinels)}).forEach(([key,value])=>localStorage.setItem(key,value))`);
  for(const [family,spec]of Object.entries(COMPONENT_SAMPLES))for(const variant of Object.keys(spec.states)){
    await page(family,variant);
    assert.ok(await ev('document.querySelector("#app").textContent.trim().length>0||!!document.querySelector("dialog[open]")'),`${family}/${variant} rendered`);
  }
  await page('collection','rest');
  await click('[data-action="inspect-artifact"][data-id="glow-wick"]');
  await click('[data-action="collection-artifact-details"]');
  assert.ok(await ev('!!document.querySelector("dialog.artifact-sheet[open] .artifact-explanation")'),'Production full rules');
  await click('dialog.artifact-sheet [data-action="close-sheet"]');
  assert.equal(await ev('document.activeElement.dataset.action'),'collection-artifact-details','Full rules restores opener focus');
  await click('[data-action="sell-artifact"][data-id="glow-wick"]');
  assert.ok(await ev('document.querySelector(".collection-inline-melt").textContent.includes("remaining effect")'),'Melt consequence');
  await click('[data-action="cancel-artifact-melt"]');
  assert.ok(await ev('!!document.querySelector("[data-action=inspect-artifact][data-id=glow-wick]")'),'Cancel preserves relic');
  await click('[data-action="sell-artifact"][data-id="glow-wick"]');
  await click('[data-action="confirm-artifact-forge"][data-id="glow-wick"]');
  assert.equal(await ev('!!document.querySelector("[data-action=inspect-artifact][data-id=glow-wick]")'),false,'Melt removes sample relic');
  assert.ok(await ev('document.querySelector(".collection-inline-receipt").textContent.includes("melted")'),'Melt receipt');
  for(const [width,height]of [[900,405],[740,360],[640,320]]){
    await viewport(width,height);await page('collection','rest');
    const bounds=await ev(`Array.from(document.querySelectorAll('.collection-sheet [data-action]')).filter(node=>!node.disabled&&node.getClientRects().length).map(node=>{const rect=node.getBoundingClientRect();return {action:node.dataset.action,x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height}})`);
    for(const rect of bounds){assert.ok(rect.x>=-1&&rect.y>=-1&&rect.right<=width+1&&rect.bottom<=height+1,`Collection in ${width}×${height}: ${JSON.stringify(rect)}`);assert.ok(rect.width>=43&&rect.height>=43,`44px touch target: ${JSON.stringify(rect)}`);}
    await shot(`collection-${width}`);
  }
  await viewport();await page('rewards','choose');
  assert.ok(await ev(`Array.from(document.querySelectorAll('.artifact-choice-actions button')).every(node=>{const rect=node.getBoundingClientRect();return rect.y>=0&&rect.bottom<=innerHeight+1&&rect.height>=43})`),'Reward actions remain visible');
  await shot('reward-choice');
  await click('[data-action="keep-flight-reward"]');
  assert.equal(await ev('!!document.querySelector(".artifact-acquired")'),true,'Reward acquired state');
  await page('route','progress');
  assert.ok(await ev(`document.querySelector('.game-world-map .world-map-node')&&document.querySelector('.game-world-map').getBoundingClientRect().height>200`),'Route renders into its visible production SVG');
  await shot('route-progress');
  await ev(`document.querySelector('.route-state-future[role=button]').focus();document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);
  assert.ok(await ev('!!document.querySelector("dialog.flight-preview-sheet[open]")'),'Keyboard opens future stop preview');
  assert.equal(await ev('!!document.querySelector("dialog.flight-preview-sheet [data-action=node]")'),false,'Future preview cannot commit');
  await page('cards','equipped');await shot('cards-equipped');
  const first=await ev('document.querySelector("[data-card-instance]").dataset.cardInstance');
  await click('[data-action="card-move-one"][data-index="0"][data-direction="1"]');
  assert.notEqual(await ev('document.querySelector("[data-card-instance]").dataset.cardInstance'),first,'Card order changes');
  await page('menus','resume');await shot('home-resume');
  await page('hud','ready');const before=await ev('document.querySelector("#flame-meter").getAttribute("aria-valuenow")');
  await click('[data-action="preview-lift"]');assert.ok(Number(await ev('document.querySelector("#flame-meter").getAttribute("aria-valuenow")'))<Number(before),'HUD accessible meter follows Lift');await shot('hud');
  assert.deepEqual(await ev(`Object.fromEntries(Object.keys(${JSON.stringify(sentinels)}).map(key=>[key,localStorage.getItem(key)]))`),sentinels,'Gallery preserves both saved journeys');
  await viewport(1440,1000);
  await send('Page.navigate',{url:`${base}/components.html?family=collection&state=rest`});
  await until(()=>ev(`document.querySelector('#component-frame')?.contentDocument?.documentElement.dataset.previewReady==='true'`),'Gallery shell');
  assert.ok(Number(await ev(`document.querySelector('#component-frame').dataset.previewScale`))>0,'Accessible scaled desktop preview');
  await shot('workshop-desktop');
  await viewport(915,412);await shot('workshop-mobile');
  assert.deepEqual(errors,[],'No browser exceptions');
  assert.deepEqual(failedResources.filter(url=>!url.includes('/favicon.ico')),[],'No missing component resources');
  const report={samples:Object.values(COMPONENT_SAMPLES).reduce((total,spec)=>total+Object.keys(spec.states).length,0),viewports:[[900,405],[740,360],[640,320]],saveIsolation:true,errors,failedResources,output};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{
  socket?.close();browser.kill();server.close();
  const target=path.resolve(profile),temporaryRoot=path.resolve(os.tmpdir());
  if(path.dirname(target)===temporaryRoot&&path.basename(target).startsWith('wisp-ui-components-'))await fs.rm(target,{recursive:true,force:true,maxRetries:10,retryDelay:150}).catch(()=>{});
}
