import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {chrome,until,delay} from './browser-probe.mjs';

const output=path.resolve('outputs/backlog-ui');await fs.mkdir(output,{recursive:true});
const root=path.resolve('dist'),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error();const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,b=await chrome(['--mute-audio']),{send,ev}=b,key='cards-pilot:'+M.SAVE_KEY;
const state=M.newState();state.profile.tutorialComplete=true;state.settings.skipTutorial=true;
const run=state.run=M.createRun(state.profile,'real-workshop-proof',1,{cards:true});
M.chooseStartingGift(state,M.getStartingGiftOffers(run)[0].id);
run.mountedCards=['body-spark','spark-cache','rhythm'].map((id,i)=>makeSkillCard(id,`proof:${i}`));run.mountedCards[1].charges=1;
run.reserveCards=[makeSkillCard('deep-vessel','proof:reserve'),{...makeSkillCard('cluster-heart','proof:cluster'),charges:1}];
run.current=run.map[4][0];run.step=4;run.path=[run.current.id];run.phase='support';run.condensedGlow=100;M.getSupportChoices(run);
const saved=()=>ev(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
async function click(selector){await ev(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw Error('Missing '+${JSON.stringify(selector)});node.click();})()`);await delay(100);}
async function size(width,height){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await delay(100);}
async function reload(){await b.visit(base+'/game.html?cards=1');await until(()=>ev("!!document.querySelector('[data-action=continue-run]')"),'Continue',150);await click('[data-action=continue-run]');await until(()=>ev("!!document.querySelector('[data-action=card-workshop]')"),'Rest',100);}

const geom=()=>ev(`(()=>{const box=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};const sheet=document.querySelector('.card-workshop');const scrollers=[...sheet.querySelectorAll('*')].filter(n=>n.scrollHeight>n.clientHeight+2&&['auto','scroll'].includes(getComputedStyle(n).overflowY)).map(n=>n.className);const text=sheet.innerText;return{mode:sheet.dataset.wk,tiles:[...sheet.querySelectorAll('.wk-tile,.wk-pick')].map(box),back:box(sheet.querySelector('.card-back')),sheetBox:box(sheet),scrollers,pageScroll:sheet.scrollHeight>sheet.clientHeight+2,neg:/-\d/.test(text),bad:/wallet|reserve/i.test(text),text}})()`);
const check=(g,w,h,label)=>{for(const r of [...g.tiles,g.back])assert.ok(r.x>=-1&&r.y>=-1&&r.right<=w+1&&r.bottom<=h+1,`${label} ${w}x${h} ${JSON.stringify(r)}`);assert.equal(g.neg,false,label+' negative');assert.equal(g.bad,false,label+' words');assert.equal(g.pageScroll,false,label+' page scroll');};
try{
  await size(915,412);await b.visit(base+'/loading.html');await until(()=>ev("document.readyState==='complete'"),'origin',100);
  await ev(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(state))})`);await reload();
  await click('[data-action=card-workshop-back]').catch(()=>{});
  const layouts=[];
  // Open the hub through the Rest tile, then Back to the three tiles.
  await click('[data-rest-service=improve]');await until(()=>ev("!!document.querySelector('.card-workshop')"),'Workshop',100);
  await click('[data-action=card-workshop-hub]');
  for(const [w,h] of [[890,400],[924,308],[740,333]]){
    await size(w,h);
    let g=await geom();assert.equal(g.mode,'hub');assert.equal(g.tiles.length,3);check(g,w,h,'hub');
    const widths=g.tiles.map(t=>Math.round(t.w));assert.ok(Math.max(...widths)-Math.min(...widths)<=2,'equal tiles '+widths);
    assert.deepEqual(g.scrollers,[],'hub does not scroll');
    await b.shot(path.join(output,`workshop-hub-${w}x${h}.png`));layouts.push({w,h,hub:g.tiles.map(t=>[Math.round(t.w),Math.round(t.h)])});
    for(const [svc,sel] of [['improve','.wk-pick'],['refill','.wk-pick'],['forge','.wk-pick']]){
      await click(`[data-wk-service=${svc}]`);await until(()=>ev(`document.querySelector('.card-workshop')?.dataset.wk===${JSON.stringify(svc)}`),svc,60);
      g=await geom();check(g,w,h,svc);assert.ok(g.tiles.length>=1);
      if(h>=400)assert.deepEqual(g.scrollers,[],svc+' no scroll at 890x400');else assert.ok(g.scrollers.length<=1,svc+' at most one scroller');
      await b.shot(path.join(output,`workshop-${svc}-${w}x${h}.png`));layouts.push({w,h,[svc]:g.tiles.length,scrollers:g.scrollers});
      await click('[data-action=card-workshop-hub]');assert.equal((await geom()).mode,'hub','Back returns to the tiles');
    }
  }
  // Tap to pick: the first tap selects, the second opens the quote; Back from the quote returns to the offers.
  await size(890,400);await click('[data-wk-service=refill]');
  await click('.wk-pick');assert.ok(await ev("!!document.querySelector('.wk-pick.tp-selected')"),'first tap selects');assert.ok(await ev("!!document.querySelector('.card-workshop')"));
  await click('.wk-pick.tp-selected');assert.match(await ev("document.querySelector('.card-refill-confirm')?.textContent||''"),/Uses 1 → 6/);
  await click('.card-refill-confirm [data-action=card-workshop]');assert.equal((await geom()).mode,'refill','Back from the quote returns to the offers');
  await click('[data-action=card-workshop-hub]');await click('[data-wk-service=forge]');await click('.wk-pick');await click('.wk-pick.tp-selected');
  assert.ok(await ev("!!document.querySelector('.card-forge-preview,.card-forge-sheet')"),'forge opens its confirmation');
  assert.equal(b.errors.length,0,b.errors.join('\n'));
  await fs.writeFile(path.join(output,'workshop-redesign-proof.json'),JSON.stringify({layouts,errors:b.errors},null,2));
  console.log(JSON.stringify({ok:true,layouts}));
}finally{b.close?.();server.close();}
