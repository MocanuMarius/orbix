// Gallery mobile/nested-route and production shared-art selection checks.
import http from 'node:http';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {companionSprite,companionPalette,collectorArtVariant} from '../dist/companion-art.mjs';
for(const variant of ['current','flat2','flat3']){
 const art=companionSprite('collector',{collectorArt:variant}),palette=companionPalette('collector',{collectorArt:variant});
 assert.equal(art.width,25);assert.equal(art.height,25);assert.equal(art.rows.length,25);assert.ok(art.rows.every(row=>row.length===25));
 assert.equal(new Set(art.rows.join('').replaceAll('0','')).size,{current:4,flat2:2,flat3:3}[variant]);
 assert.ok(palette.outer&&palette.core);
 for(const role of ['protector','leveler','swift','runner','space-timer'])assert.equal(companionSprite(role,{collectorArt:variant}),companionSprite(role,{collectorArt:'current'}));
}
assert.equal(collectorArtVariant('unknown'),'current');assert.equal(companionSprite(),companionSprite('collector',{collectorArt:'current'}));
const root=path.resolve('dist'),out=path.resolve('work/collector-art-qa');await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),pathname=url.pathname.replace(/^\/nested\//,'/'),file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep))throw Error('Outside dist');const body=await fs.readFile(file);
 const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
 const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
 if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),body.length-1):body.length-1;res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1}).end(body.subarray(start,end+1));}
 else res.writeHead(200,{...headers,'Content-Length':body.length}).end(body);
}catch(e){res.writeHead(404).end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'collector-art-qa-'));
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<300;i++){const result=await fn().catch(()=>null);if(result)return result;await delay(100);}throw Error('Timed out '+label);}
let socket;
try{
 const port=await until(async()=>Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome');
 const target=await until(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'),'page');
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));let serial=0;const pending=new Map();
 socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 await call('Page.enable');await call('Runtime.enable');
 await call('Page.addScriptToEvaluateOnNewDocument',{source:"window.__artErrors=[];addEventListener('error',e=>__artErrors.push(e.message));addEventListener('unhandledrejection',e=>__artErrors.push(String(e.reason)));"});
 const results=[];
 for(const [width,height] of [[360,800],[390,844],[900,405]]){
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await call('Page.navigate',{url:base+'/nested/collector-art.html'});
  await until(()=>evaluate('document.querySelector("[data-portrait=flat2] svg")&&document.querySelector("#movie-flat2").readyState>=2'),'gallery videos and art');
  await evaluate('document.fonts.ready');await delay(150);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'No horizontal overflow at '+width);
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".native-comparison img"),i=>[i.width,i.height,i.naturalWidth,i.naturalHeight])'),[[128,128,128,128],[128,128,128,128],[128,128,128,128]]);
  await evaluate('document.querySelector("[data-art=flat3]").click();document.querySelector("[data-moment=fetch]").click()');
  await until(()=>evaluate('document.querySelector("#still-flat3").complete&&document.querySelector("#still-flat3").src.includes("fetch-native")'),'fetch still');
  assert.equal(await evaluate('document.querySelector("#movie-flat3").paused'),true);
  assert.equal(await evaluate('document.querySelector("[data-art=flat3]").getAttribute("aria-pressed")'),'true');
  assert.ok((await evaluate('document.querySelector("#full-still").href')).endsWith('/nested/assets/previews/collector-art/flat3-fetch.png'));
  assert.deepEqual(await evaluate('__artErrors'),[]);
  await fs.writeFile(path.join(out,'gallery-'+width+'.png'),Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
  const links=await evaluate('Array.from(document.querySelectorAll("[src],a[href],link[href]"),e=>e.src||e.href).filter(u=>new URL(u).origin===location.origin)');
  for(const url of new Set(links)){const response=await fetch(url);assert.equal(response.status,200,url);}
  results.push({width,height,overflow:false,errors:0,nativeCrops:[128,128]});
 }
 await call('Emulation.setDeviceMetricsOverride',{width:900,height:405,deviceScaleFactor:1,mobile:true});
 for(const variant of ['current','flat2','flat3','unknown']){
  await call('Page.navigate',{url:base+'/nested/game.html?cards=1&collectorArt='+variant});
  await until(()=>evaluate('document.querySelector("[data-role-art=collector]")'),'actual menu portrait');
  assert.equal(await evaluate('document.querySelector("[data-role-art=collector]").dataset.collectorArt'),variant==='unknown'?'current':variant);
  const source=await evaluate('(async()=>{const m=await import("./companion-art.mjs?v=skills-cards-1");const a=m.companionSprite();return {variant:m.collectorArtVariant(),inks:new Set(a.rows.join("").replaceAll("0","")).size}})()');
  assert.equal(source.variant,variant==='unknown'?'current':variant);assert.equal(source.inks,{current:4,flat2:2,flat3:3,unknown:4}[variant]);
  assert.deepEqual(await evaluate('__artErrors'),[]);results.push({query:variant,...source});
 }
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({at:new Date().toISOString(),results},null,2));console.log(JSON.stringify({passed:true,results}));
}finally{socket?.close();browser.kill();server.close();}
