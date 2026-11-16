import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {SCORE_BOOK_KEY} from '../dist/game-score.mjs';
import {chrome,until,delay} from './browser-probe.mjs';
const output=path.resolve('outputs/scorecards');await fs.mkdir(output,{recursive:true});
const root=path.resolve('dist'),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error();const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,b=await chrome(['--mute-audio']),{send,ev}=b,key='cards-pilot:'+M.SAVE_KEY,bookKey='cards-pilot:'+SCORE_BOOK_KEY;
function fresh(seed){const state=M.newState();state.profile.tutorialComplete=true;state.profile.onboarding.stage=4;state.settings.skipTutorial=true;state.run=M.createRun(state.profile,seed,1,{cards:true});M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id);return state;}
function resolveRewards(state){const r=state.run;M.settleCheckpoint(state);const draft=M.getCardDraft(r);if(draft)M.chooseCardDraft(state,draft.id,draft.offers[0].instanceId);if(r.cardReward)r.cardReward.uiAcknowledged=true;if(r.flightReward&&!r.flightReward.claimed)M.chooseFlightReward(state,r.flightReward.offers[0]);M.acknowledgeVictory(state);}
function play(state,{win=true}={}){const r=state.run;let guard=0;while(r.phase!=='ended'&&guard++<100){
 if(r.phase==='map-clear'){assert.ok(M.advanceMap(r));continue;}
 if(r.phase==='map'){const node=M.getChoices(r).find(n=>n.type!=='support')||M.getChoices(r)[0];assert.ok(M.selectNode(r,node.id));}
 if(r.phase==='support'){const offers=M.getSupportChoices(r),i=offers.findIndex(c=>!c.disabled);assert.ok(M.resolveSupport(r,i,state.profile));continue;}
 if(r.phase==='briefing'){assert.ok(M.beginFlightAttempt(r));M.markFlightAttemptStarted(r);const success=win||r.stats.flights<2;if(!success)r.lives=1;assert.ok(M.finishFlight(r,{success,flame:70,condensedGlow:6,collected:8}));resolveRewards(state);}
 }assert.equal(r.phase,'ended');r.guardianRituals=[0,1,2];r.deathPending=false;assert.ok(M.bankRun(state));return state;}
const won=play(fresh('scorecard-real-win')),lost=play(fresh('scorecard-real-loss'),{win:false});
const click=async selector=>{await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);await delay(120);};
const storageSnapshot=()=>ev('JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b))))');
async function size(width,height){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await delay(100);}
try{
 await size(915,412);await b.visit(base+'/loading.html');await until(()=>ev("document.readyState==='complete'"),'origin',100);
 await send('Browser.grantPermissions',{origin:base,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:output});
 const layouts=[];
 for(const [name,state]of [['won',won],['lost',lost]]){
  await b.visit(base+'/loading.html?proof='+name);await until(()=>ev("location.pathname.endsWith('/loading.html')&&document.readyState==='complete'"),'fixture origin',100);
  await ev(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(state))})`);await b.visit(base+'/game.html?cards=1');
  await until(()=>ev("!!document.querySelector('[data-action=score-view]')"),'last scorecard',100);await b.shot(path.join(output,`home-${name}.png`));await click('[data-action=score-view]');
  for(const [width,height]of [[915,412],[740,333],[640,320]]){
   await size(width,height);await until(()=>ev("document.querySelector('.game-score-image img')?.complete"),'score PNG',100);
   const layout=await ev(`(()=>{const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};return {image:box(document.querySelector('.game-score-image img')),buttons:[...document.querySelectorAll('.game-result-controls button')].map(box),documentWidth:document.documentElement.scrollWidth,bodyWidth:innerWidth}})()`);
   await b.shot(path.join(output,`${name}-${width}x${height}.png`));assert.ok(layout.documentWidth<=width+1,JSON.stringify(layout));for(const rect of layout.buttons){assert.ok(rect.width>=43&&rect.height>=43);assert.ok(rect.x>=0&&rect.right<=width+1&&rect.y>=0&&rect.bottom<=height+1,`${name} ${width}: ${JSON.stringify(rect)}`);}
   await b.shot(path.join(output,`${name}-${width}x${height}.png`));layouts.push({name,width,height,...layout});
  }
 }
 await click('[data-action=score-save]');const saved=await until(async()=>(await fs.readdir(output)).find(name=>name.endsWith('.png')&&name.startsWith('wispbound-ascension')),'saved image',100);const bytes=await fs.readFile(path.join(output,saved));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),1440);assert.equal(bytes.readUInt32BE(20),810);
 await send('Page.bringToFront');await click('[data-action=score-link]');const shared=await ev('navigator.clipboard.readText()');assert.match(shared,/scorecard\.html#card=/);
 const before=await storageSnapshot();await b.visit(shared);await until(()=>ev("document.querySelector('#shared-score-image')?.complete"),'shared viewer',100);const after=await storageSnapshot();if(after!==before){const a=JSON.parse(before),z=JSON.parse(after);for(const key of new Set([...Object.keys(a),...Object.keys(z)]))if(a[key]!==z[key]){let x,y;try{x=JSON.parse(a[key]);y=JSON.parse(z[key]);}catch{}const diff=(a,b,p='')=>{if(JSON.stringify(a)===JSON.stringify(b))return [];if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>diff(a[k],b[k],p+'.'+k));return [{path:p,before:a,after:b}];};console.log(JSON.stringify({key,diffs:diff(x,y).slice(0,20)}));}}assert.ok(after===before,'shared viewer is read-only');
 await b.shot(path.join(output,'shared-mobile.png'));assert.equal(await ev("document.querySelector('#shared-score-image').naturalWidth"),1440);
 await ev(`window.scoreShareCalls=[];Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>files?.[0]?.type==='image/png'});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{const file=data.files[0],bytes=new Uint8Array(await file.arrayBuffer());window.scoreShareCalls.push({name:file.name,type:file.type,size:file.size,png:[...bytes.slice(0,8)]});}});`);
 await click('#share-score');const nativeShare=await ev('scoreShareCalls');assert.equal(nativeShare.length,1);assert.equal(nativeShare[0].type,'image/png');assert.deepEqual(nativeShare[0].png,[137,80,78,71,13,10,26,10]);
 assert.equal(await storageSnapshot(),before,'sharing a viewed card is read-only');
 await b.visit(base+'/scorecard.html#card=%7B%22earned%22%3A-1%7D');await until(()=>ev("document.body.textContent.includes('Scorecard unavailable')"),'invalid card',100);assert.equal(await storageSnapshot(),before,'invalid viewer is read-only');
 await b.visit(base+'/game.html?cards=1');await until(()=>ev("!!document.querySelector('[data-action=score-view]')"),'reload',100);await click('[data-action=score-view]');assert.equal(await ev(`localStorage.getItem(${JSON.stringify(bookKey)})`),JSON.parse(before)[bookKey],'reload preserves immutable best receipt');
 assert.equal(b.errors.length,0,b.errors.join('\n'));await fs.writeFile(path.join(output,'proof.json'),JSON.stringify({layouts,won:won.run.endScore,lost:lost.run.endScore,nativeShare,png:{file:saved,width:1440,height:810},viewerReadOnly:true,reloadIdempotent:true,errors:b.errors},null,2));
 console.log(JSON.stringify({layouts:layouts.length,win:won.run.endScore.earned,loss:lost.run.endScore.earned,png:saved,nativeShare:true,viewerReadOnly:true,reloadIdempotent:true,errors:b.errors,output}));
}finally{b.close();server.close();}
