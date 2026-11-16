import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chrome,until,delay} from './browser-probe.mjs';

const output=path.resolve('outputs/reward-compositions');await fs.mkdir(output,{recursive:true});
const root=path.resolve('dist'),mime={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
 try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep))throw Error('Outside dist');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,b=await chrome(['--disable-gpu']);
const variants=['pedestal','horizontal','compact'],report=[];
const sentinels={'wispbound.save.condensed.v7':'reward-main-save-sentinel','cards-pilot:wispbound.save.condensed.v7':'reward-cards-save-sentinel'};
const viewport=(width,height)=>b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
const page=async route=>{await b.visit(`${base}/${route}`);await until(()=>b.ev(`document.documentElement.dataset.previewReady==='true'`),'Production preview');await delay(150);};
const click=selector=>b.ev(`{const node=document.querySelector(${JSON.stringify(selector)});node.focus({preventScroll:true});node.click();}`);
const verify=async(frame=false)=>{
 const context=frame?`document.querySelector('#reward-frame').contentWindow`:'window';
 const data=await b.ev(`(()=>{const w=${context},d=w.document,s=d.querySelector('.acquired-reward'),a=[...s.querySelectorAll('button')];return {text:s.textContent,docOverflow:d.documentElement.scrollHeight>w.innerHeight+1,appOverflow:d.querySelector('#app').scrollHeight>w.innerHeight+1,bounds:[...s.querySelectorAll('.acquired-identity,.acquired-rules,.acquired-boon,button')].map(n=>{const r=n.getBoundingClientRect();return {class:n.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}),touch:a.every(n=>n.getBoundingClientRect().height>=43&&n.getBoundingClientRect().width>=43),size:[w.innerWidth,w.innerHeight]}})()`);
 assert.equal(data.docOverflow,false,'No document scrolling');assert.equal(data.appOverflow,false,'No component scrolling');assert.equal(data.touch,true,'44px touch targets');
 for(const rect of data.bounds)assert.ok(rect.x>=-1&&rect.y>=-1&&rect.right<=data.size[0]+1&&rect.bottom<=data.size[1]+1,`In view: ${JSON.stringify(rect)} at ${data.size}`);
 assert.match(data.text,/Elite cleared/);assert.match(data.text,/Dawn Loom/);assert.match(data.text,/When a pickup speeds up Collector recovery/);assert.match(data.text,/Reveal the route ahead for 1.5 seconds/);assert.match(data.text,/At least 4 seconds between flashes/);assert.match(data.text,/Wild Circuit/);assert.match(data.text,/Companion recovery 20% faster for 3 cleared flights/);assert.doesNotMatch(data.text,/Automatic|permanent|Active this run/);
 return data;
};
try{
 await viewport(915,412);await page('components-preview.html?family=rewards&state=pedestal');
 await b.ev(`Object.entries(${JSON.stringify(sentinels)}).forEach(([key,value])=>localStorage.setItem(key,value))`);
 for(const [width,height] of [[915,412],[740,333],[640,320]]){
  await viewport(width,height);
  for(const variant of variants){
   await page(`components-preview.html?family=rewards&state=${variant}`);const data=await verify();
   await b.shot(path.join(output,`${variant}-${width}.png`));report.push({surface:'production',variant,width,height,bounds:data.bounds});
  }
 }
 await viewport(915,412);await page('components-preview.html?family=rewards&state=pedestal');
 await click('[data-action="reward-artifact-details"]');
 assert.match(await b.ev('document.querySelector("dialog.artifact-sheet").textContent'),/Ordinary cooldown ticking does not trigger it/);
 await click('dialog [data-action="close-sheet"]');assert.equal(await b.ev('document.activeElement.dataset.action'),'reward-artifact-details','Rules restores opener focus');
 await click('[data-action="skills"]');await until(()=>b.ev('!!document.querySelector("dialog.card-sheet")'),'Deck opens');
 await page('components-preview.html?family=rewards&state=pedestal');await click('[data-action="victory-next"]');await until(()=>b.ev('!!document.querySelector(".game-world-map")'),'Continue opens route');
 await page('components-preview.html?family=rewards&state=acquired');assert.equal(await b.ev('!!document.querySelector(".acquired-reward")'),false,'Default acquired design unchanged');
 for(const [width,height]of [[915,412],[640,320]]){
  await viewport(width,height);await b.visit(`${base}/reward-compare.html`);
  await until(()=>b.ev(`document.querySelector('#reward-frame')?.contentDocument?.documentElement.dataset.previewReady==='true'`),'Comparison');
  for(const variant of variants){
   await click(`[data-variant="${variant}"]`);await until(()=>b.ev(`document.querySelector('#reward-frame')?.contentDocument?.querySelector('[data-acquired-presentation="${variant}"]')`),'Variant switch');await delay(100);
   const data=await verify(true);assert.equal(await b.ev(`document.querySelector('[data-variant="${variant}"]').getAttribute('aria-pressed')`),'true');
   assert.equal(await b.ev('document.documentElement.scrollHeight>innerHeight+1'),false,'Comparison no scroll');await b.shot(path.join(output,`compare-${variant}-${width}.png`));report.push({surface:'compare',variant,width,height,innerSize:data.size});
  }
 }
 assert.deepEqual(await b.ev(`Object.fromEntries(Object.keys(${JSON.stringify(sentinels)}).map(key=>[key,localStorage.getItem(key)]))`),sentinels,'Both saved journeys unchanged');
 assert.deepEqual(b.errors,[],'No browser exceptions');assert.deepEqual(b.badResponses.filter(entry=>!entry.url.includes('favicon.ico')),[],'No missing resources');
 const result={variants,viewports:[[915,412],[740,333],[640,320]],saveIsolation:true,fullRules:true,deck:true,continue:true,defaultUnchanged:true,errors:b.errors,checks:report};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,checks:report.length},null,2));
}finally{b.close();server.close();}
