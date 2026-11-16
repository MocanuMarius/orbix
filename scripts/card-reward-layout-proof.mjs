import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until,delay} from './browser-probe.mjs';

const output=path.resolve('outputs/card-reward-layout');
await fs.mkdir(output,{recursive:true});
const root=path.resolve('dist'),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep))throw Error('Outside dist');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await fs.readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,b=await chrome(['--mute-audio']),{ev,send}=b;
const sentinels={'wispbound.save.condensed.v7':'main-save-sentinel','cards-pilot:wispbound.save.condensed.v7':'cards-save-sentinel'};
async function size(width,height){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});}
async function page(state='reward'){
  await b.visit(`${base}/components-preview.html?family=cards&state=${state}`);
  await until(()=>ev("document.documentElement.dataset.previewReady==='true'"),'reward fixture',120);
}
async function center(selector){return ev(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw Error('Missing '+${JSON.stringify(selector)});const r=node.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);}
async function tap(selector){const point=await center(selector);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(100);}
async function drag(from,to){const a=await center(from),z=await center(to);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});for(let i=1;i<=12;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(z.x-a.x)*i/12,y:a.y+(z.y-a.y)*i/12}]});await delay(18);}await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(120);}
const mounted=()=>ev("Array.from(document.querySelectorAll('.card-reward-mounted-face .skill-card')).map(n=>n.dataset.cardInstance||null)");
const proof=[];
try{
  await size(915,412);await page('rewardLong');
  const longRules=await ev("Array.from(document.querySelectorAll('.card-reward-body .card-rule-band')).map(n=>({height:n.clientHeight,scroll:n.scrollHeight,name:n.closest('.skill-card').dataset.cardName,text:n.textContent}))");
  await b.shot(path.join(output,'long-rules-915x412.png'));
  assert.ok(longRules.every(r=>r.scroll<=r.height+2),'Long rules all visible at 915×412: '+JSON.stringify(longRules.map(r=>[r.name,r.height,r.scroll])));
  await page();
  await ev(`Object.entries(${JSON.stringify(sentinels)}).forEach(([key,value])=>localStorage.setItem(key,value))`);
  for(const [width,height]of [[915,412],[900,405],[740,333],[720,280],[640,320]]){
    await size(width,height);await page();
    const layout=await ev(`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};return {faces:Array.from(document.querySelectorAll('.card-reward-body .skill-card')).map(rect),actions:Array.from(document.querySelectorAll('.card-reward-footer button,.card-reward-screen>.card-heading>button')).map(rect),rules:Array.from(document.querySelectorAll('.card-reward-body .card-rule-band')).map(n=>({height:n.clientHeight,scroll:n.scrollHeight,text:n.textContent})),grips:document.querySelectorAll('.card-reward-screen .card-drag-grip').length}})()`);
    assert.equal(layout.faces.length,4,'Incoming and three equipped full faces');assert.equal(layout.grips,0,'No grip filler');
    await b.shot(path.join(output,`reward-${width}x${height}.png`));
    for(const r of [...layout.faces,...layout.actions])assert.ok(r.x>=-1&&r.y>=-1&&r.right<=width+1&&r.bottom<=height+1,`${width}×${height}: ${JSON.stringify(r)}`);
    for(const r of layout.actions)assert.ok(r.width>=43&&r.height>=43,'44px primary touch controls');
    assert.ok(await ev("Array.from(document.querySelectorAll('.card-reward-body .card-use-counter')).every(n=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.card-use-counter')===n})"),'Uses stay visible and tappable above the art');
    assert.ok(layout.faces.slice(1).every(r=>r.height/layout.faces[0].height>.82),'Mounted cards stay near incoming face size: '+JSON.stringify(layout.faces));
    assert.ok(layout.rules.every(r=>r.height>25&&r.text.length>10),'Every face exposes printed rules');
    if(width>=740&&height>=333)assert.ok(layout.rules.every(r=>r.scroll<=r.height+2),'All initial conditions/effects/uses and notes are visible at normal landscape sizes: '+JSON.stringify(layout.rules.map(r=>[r.height,r.scroll])));
    await b.shot(path.join(output,`reward-${width}x${height}.png`));
    proof.push({width,height,layout});
  }
  await size(915,412);await page();
  await tap('.card-reward-mounted-face [data-card-term-trigger]');
  assert.ok(await ev("!!document.querySelector('dialog.card-term-dialog[open]')"),'Mounted face opens real help');
  await tap('dialog.card-term-dialog [data-card-term-close]');
  await tap('[data-action=card-reward-equip]');
  const before=await mounted();await tap('[data-action=card-reward-slot][data-index="0"] .card-illustration');
  assert.equal((await mounted())[0],'sample-reward','Touch slot transfer applies immediately');
  assert.equal(await ev("!!document.querySelector('.card-swap-review')"),false,'No extra swap confirmation');
  await tap('[data-action=card-reward-equip]');await tap('[data-action=card-reward-slot][data-index="1"] .card-illustration');
  assert.deepEqual((await mounted()).slice(0,2),[before[1],'sample-reward'],'Move swaps both mounted cards safely');
  await tap('[data-action=card-reward-equip]');await tap('[data-action=card-reward-slot][data-index="0"] .card-illustration');
  assert.deepEqual((await mounted()).slice(0,2),['sample-reward',before[1]],'The swap is directly reversible');
  await tap('[data-action=card-reward-continue]');
  assert.ok(await ev(`!!document.querySelector('[data-card-instance="${before[0]}"]')`),'Outgoing card remains in sample Deck');
  await page();await drag('.card-reward-new .card-illustration','[data-action=card-reward-slot][data-index="1"] .card-illustration');
  assert.equal((await mounted())[1],'sample-reward','Direct touch drag still equips');
  await page();await tap('[data-action=card-preview-reward-melt]');
  assert.ok(await ev("!!document.querySelector('.card-melt-confirm')"),'Melt retains loss confirmation');
  await tap('[data-action=card-cancel-melt]');
  assert.ok(await ev("!!document.querySelector('.card-reward-new [data-card-instance=sample-reward]')"),'Cancel keeps the reward');
  await tap('[data-action=card-preview-reward-melt]');await tap('[data-action=card-confirm-melt-selected]');
  assert.equal(await ev("!!document.querySelector('[data-card-instance=sample-reward]')"),false,'Melt removes sample card once confirmed');
  await page('rewardFive');
  assert.equal((await mounted()).length,5,'All five slots remain available');
  await tap('[data-action=card-reward-equip]');
  await ev("document.querySelector('.card-reward-slots').scrollLeft=2000");await delay(80);
  await tap('[data-action=card-reward-slot][data-index="4"] .empty-card');
  assert.equal((await mounted())[4],'sample-reward','Fifth empty slot can equip');
  await b.shot(path.join(output,'five-slots.png'));
  await page('rewardSeed');
  assert.equal(await ev("document.querySelectorAll('.card-reward-screen [data-action=card-reward-equip],.card-reward-screen [data-deck-drag-id],.card-reward-screen [data-deck-drop]').length"),0,'Seed remains inventory only');
  assert.deepEqual(await ev(`Object.fromEntries(Object.keys(${JSON.stringify(sentinels)}).map(key=>[key,localStorage.getItem(key)]))`),sentinels,'Preview leaves both saved journeys unchanged');
  await size(1440,1000);await b.visit(`${base}/components.html?family=cards&state=reward&viewport=wide`);
  await until(()=>ev("document.querySelector('#component-frame')?.contentDocument?.documentElement.dataset.previewReady==='true'"),'Gallery deep link',120);
  assert.ok(Number(await ev("document.querySelector('#component-frame').dataset.previewScale"))>0,'Desktop preview scales the phone viewport');
  await b.shot(path.join(output,'gallery-desktop.png'));
  assert.deepEqual(b.errors,[]);assert.deepEqual(b.badResponses,[]);
  const report={passed:true,deepLink:'components.html?family=cards&state=reward&viewport=wide',directPhone:'components-preview.html?family=cards&state=reward',longRules,proof,checks:['full-renderer-faces','complete-rules-at-740','long-rules-at-915','visible-use-counters','mounted-help','touch-tap-direct-transfer','reversible-mounted-swap','touch-drag-direct-transfer','outgoing-safe-in-deck','confirmed-Melt','five-slot-equip','Seed-inventory-only','save-isolation','desktop-phone-preview'],output};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,checks:report.checks,output},null,2));
}finally{b.close();await new Promise(resolve=>server.close(resolve));}
