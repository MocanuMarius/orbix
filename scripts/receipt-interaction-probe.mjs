import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {createCardInspectorState} from '../dist/card-inspector.mjs';
import {chrome, until, delay} from './browser-probe.mjs';

// Use the production late-game fixture as a real saved campaign. Neither this
// probe nor the disposable inspector reads the player's own browser profile.
const root=path.resolve('dist'),output=path.resolve('outputs/receipt-interaction');
await fs.mkdir(output,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/favicon.ico')return res.writeHead(204).end();
 if(pathname==='/__dev-revision')return res.writeHead(200,{'Content-Type':'application/json'}).end('{"revision":"receipt-probe"}');
 try{const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('Outside dist');const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,b=await chrome(['--mute-audio']),{ev,send}=b;
const key='cards-pilot:'+M.SAVE_KEY,checks=[],layouts=[],details=[];
const readSave=()=>ev(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
const unchanged=async before=>assert.deepEqual(await readSave(),before,'Receipt inspection must not mutate the saved run');
async function size(w,h,touch=true){await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:touch});await send('Emulation.setTouchEmulationEnabled',{enabled:touch,maxTouchPoints:1});await delay(100);}
async function point(selector){return ev(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Missing ${selector}');const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);}
async function tap(selector){const p=await point(selector);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(150);}
async function click(selector){const p=await point(selector);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await delay(150);}
async function shot(name){await ev('document.fonts.ready');await b.shot(path.join(output,name+'.png'));}
function shortFixture(){
 const state=M.newState();state.profile.tutorialComplete=true;state.settings.skipTutorial=true;
 state.run=M.createRun(state.profile,'receipt-short',1,{cards:true});M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id);
 const run=state.run;run.mountedCards=[];run.artifacts=['flash-stone'];run.artifactCharges={'flash-stone':2};
 M.selectNode(run,M.getChoices(run).find(node=>node.type==='flight').id);M.beginFlightAttempt(run);M.markFlightAttemptStarted(run);
 M.finishFlight(run,{success:true,flame:10,artifactCharges:{'flash-stone':1},artifactActivations:{'flash-stone':1}});M.settleCheckpoint(state);return state;
}
async function open(late){
 const state=late==='short'?shortFixture():createCardInspectorState(new URLSearchParams(`scenario=pack${late?'&late=1':''}`));state.settings.reducedMotion=true;
 await b.visit(base+'/loading.html');await until(()=>ev("document.readyState==='complete'&&location.pathname==='/loading.html'"),'isolated browser');
 await ev(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(state))})`);
 await b.visit(base+'/game.html?cards=1');await until(()=>ev("!!document.querySelector('[data-action=continue-run]')"),'continue saved campaign',80);await tap('[data-action=continue-run]');
 await until(()=>ev("document.querySelector('.flight-reward-ceremony')?.dataset.stage==='income'"),'real campaign receipt',80);
 await delay(250);return readSave();
}
async function geometry(){return ev(`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};return {regions:[...document.querySelectorAll('[data-receipt-scroll]')].map(n=>({label:n.getAttribute('aria-label'),...rect(n),scrollTop:n.scrollTop,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth,cueHidden:n.parentElement.querySelector('[data-receipt-scroll-cue]').hidden,cueDisplay:getComputedStyle(n.parentElement.querySelector('[data-receipt-scroll-cue]')).display})),heading:rect(document.querySelector('.flight-reward-heading')),summary:rect(document.querySelector('.flight-reward-summary')),continue:rect(document.querySelector('[data-action=flight-reward-continue]')),footerActions:[...document.querySelectorAll('.flight-reward-actions button')].map(n=>n.dataset.action),bodyWidth:document.documentElement.scrollWidth,bodyHeight:document.documentElement.scrollHeight}})()`);}
function checkGeometry(g,w,h){
 assert.equal(g.regions.length,2,'Sources and recorded effects have separate scroll regions');assert.deepEqual(g.footerActions,['flight-reward-continue']);
 for(const r of [...g.regions,g.heading,g.summary,g.continue])assert.ok(r.x>=-1&&r.y>=-1&&r.right<=w+1&&r.bottom<=h+1,`Viewport ${w}x${h}: ${JSON.stringify(r)}`);
 assert.ok(g.continue.width>=44&&g.continue.height>=44,'Continue keeps a 44px tap target');assert.ok(g.bodyWidth<=w&&g.bodyHeight<=h,'Receipt does not scroll the page');
 for(const r of g.regions){assert.ok(r.scrollWidth<=r.clientWidth,'No horizontal region overflow');assert.equal(r.cueHidden,r.scrollHeight-r.clientHeight-r.scrollTop<=2,'Cue follows actual remaining overflow');if(r.cueHidden)assert.equal(r.cueDisplay,'none','Hidden scroll cue is visually hidden');}
}
try{
 await send('Network.setBypassServiceWorker',{bypass:true});
 for(const late of [true,false])for(const [w,h] of [[900,405],[667,300]]){
  await size(w,h);const before=await open(late),kind=late?'late':'ordinary',initial=await geometry();checkGeometry(initial,w,h);
  await shot(`${kind}-top-${w}x${h}`);
  for(let index=0;index<2;index++){
   await ev(`document.querySelectorAll('[data-receipt-scroll]')[${index}].scrollTop=100000`);await delay(100);const moved=await geometry();checkGeometry(moved,w,h);
   assert.equal(moved.regions[1-index].scrollTop,0,'Scrolling one column leaves the other at its own position');
   assert.deepEqual(moved.heading,initial.heading);assert.deepEqual(moved.summary,initial.summary);assert.deepEqual(moved.continue,initial.continue);
   assert.equal(moved.regions[index].cueHidden,true,'At the bottom its cue disappears');await shot(`${kind}-column-${index}-bottom-${w}x${h}`);
   await ev(`document.querySelectorAll('[data-receipt-scroll]')[${index}].scrollTop=0`);await delay(100);
  }
  if(late)assert.ok(initial.regions.every(r=>r.scrollHeight>r.clientHeight),'Both long late-game columns overflow');
  const targets=await ev("[...document.querySelectorAll('[data-receipt-detail]')].map(n=>({key:n.dataset.receiptDetail,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}))");
  for(const target of targets)assert.ok(target.width>=44&&target.height>=44,'44px receipt detail target: '+JSON.stringify(target));
  if(!late)assert.equal(initial.regions[1].cueHidden,true,'Short recorded-effects column shows no unnecessary hint');
  await unchanged(before);layouts.push({kind,w,h,...initial});
 }
 for(const [w,h] of [[900,405],[667,300]]){
  await size(w,h);const before=await open('short'),g=await geometry();checkGeometry(g,w,h);
  assert.ok(g.regions.every(r=>r.cueHidden),'A short ordinary receipt has no scroll hints');await unchanged(before);await shot(`short-top-${w}x${h}`);layouts.push({kind:'short',w,h,...g});
 }
 checks.push('real-late-and-ordinary-saved-campaigns','independent-column-scroll','conditional-overflow-cues','bottom-cue-hides','fixed-heading-summary-continue','44px-continue','no-page-or-horizontal-overflow','inspection-no-save-writes');

 await size(900,405,true);const before=await open(true);await size(900,405,false);
 await until(()=>ev("!!document.querySelector('[data-receipt-detail]')"),'receipt detail controls',40);
 const p=await point('[data-receipt-detail]');await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await until(()=>ev("!!document.querySelector('.receipt-inspector:not(dialog)')"),'desktop hover preview',40);await shot('desktop-hover-preview');
 const preview=await ev("document.querySelector('.receipt-inspector:not(dialog)').innerText");assert.ok(preview.trim().length>10,'Hover preview contains useful detail');
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:5});await until(()=>ev("!document.querySelector('.receipt-inspector:not(dialog)')"),'hover preview dismissal',40);
 await size(667,300,true);await tap('[data-receipt-detail]');await until(()=>ev("!!document.querySelector('dialog.receipt-inspector[open]')"),'touch detail dialog',40);await shot('touch-detail-dialog');
 const dialog=await ev("(()=>{const n=document.querySelector('dialog.receipt-inspector[open]'),r=n.getBoundingClientRect();return {text:n.innerText,x:r.x,y:r.y,right:r.right,bottom:r.bottom,buttons:[...n.querySelectorAll('button')].map(b=>({action:b.dataset.action,text:b.textContent}))}})()");
 assert.ok(dialog.text.trim().length>10);assert.ok(dialog.x>=0&&dialog.y>=0&&dialog.right<=667&&dialog.bottom<=300,'Touch dialog fits the short landscape viewport');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until(()=>ev("!document.querySelector('dialog.receipt-inspector[open]')"),'Escape closes detail',40);
 await unchanged(before);checks.push('desktop-hover-detail','hover-dismissal','touch-detail-dialog','short-landscape-dialog-fit','escape-dismissal');
 for(const detailKey of ['source-tight-packing','artifact:flash-stone','event-pact','challenge']){
  const selector=`[data-receipt-detail="${detailKey}"]`;
  await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);await delay(100);
  const p=await point(selector),hit=await ev(`document.elementFromPoint(${p.x},${p.y})?.closest('[data-receipt-detail]')?.dataset.receiptDetail`);assert.equal(hit,detailKey,'Scrolled detail is a reachable touch target');
  const scrolled=await geometry();await tap(selector);await until(()=>ev("!!document.querySelector('dialog.receipt-inspector[open]')"),'pinned '+detailKey,40);
  await shot('pinned-'+detailKey.replace(':','-'));
  const detail=await ev("(()=>{const d=document.querySelector('dialog.receipt-inspector[open]');return {kind:d.dataset.kind,text:d.innerText,art:[...d.querySelectorAll('img,svg')].map(n=>{const r=n.getBoundingClientRect();return {tag:n.tagName,src:n.getAttribute('src'),class:n.getAttribute('class'),width:r.width,height:r.height}})}})()");
  if(detailKey==='source-tight-packing')assert.equal(detail.kind,'cards');
  if(detailKey==='artifact:flash-stone')assert.equal(detail.kind,'artifact');
  if(detailKey==='event-pact')assert.equal(detail.kind,'event');
  if(['source-tight-packing','artifact:flash-stone'].includes(detailKey)){
   assert.ok(detail.art.some(a=>a.width>=20&&a.height>=20),'Actual source art is rendered');
   const term="dialog.receipt-inspector[open] [data-card-term]";
   await ev(`document.querySelector(${JSON.stringify(term)}).scrollIntoView({block:'center'})`);await delay(80);await tap(term);
   await until(()=>ev("!!document.querySelector('dialog.card-term-dialog[open]')"),'nested source glossary',40);await shot('glossary-'+detailKey.replace(':','-'));
   assert.equal(await ev("!!document.querySelector('dialog.receipt-inspector[open]')"),true,'Source stays open below glossary');
   await tap('dialog.card-term-dialog[open] [data-card-term-close]');await until(()=>ev("!document.querySelector('dialog.card-term-dialog[open]')"),'glossary closes to source',40);
  }
  await tap('dialog.receipt-inspector[open] .receipt-detail-close');await until(()=>ev("!document.querySelector('dialog.receipt-inspector[open]')"),'source closes',40);
  const restored=await geometry();assert.deepEqual(restored.regions.map(r=>r.scrollTop),scrolled.regions.map(r=>r.scrollTop),'Inspecting and glossary preserve both column positions');
  details.push({detailKey,...detail});await unchanged(before);
 }
 checks.push('all-detail-targets-44px','scrolled-detail-hit-testing','actual-card-face','actual-artifact-art','original-event-inspection','challenge-inspection','nested-card-and-artifact-glossary','detail-preserves-scroll-positions');
 await tap('[data-action=flight-reward-continue]');await until(()=>ev("document.querySelector('.flight-reward-ceremony')?.dataset.stage==='pack'"),'Continue goes to sealed pack');assert.equal(await ev("document.querySelectorAll('[data-action=card-draft-pick]').length"),0);checks.push('continue-retains-sealed-pack');
 assert.deepEqual(b.errors,[]);assert.deepEqual(b.badResponses,[]);
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({passed:true,checks,layouts,preview,dialog,details,errors:b.errors,badResponses:b.badResponses},null,2));
 await fs.rm(path.join(output,'failure.json'),{force:true});await fs.rm(path.join(output,'failure.png'),{force:true});
 console.log(JSON.stringify({passed:true,checks,output},null,2));
}catch(error){await shot('failure').catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),stack:error.stack,layouts,errors:b.errors,badResponses:b.badResponses},null,2));throw error;}
finally{b.close();await new Promise(resolve=>server.close(resolve));}
