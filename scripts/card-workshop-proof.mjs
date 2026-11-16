import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard} from '../dist/skill-cards.mjs';
import {chrome,until,delay} from './browser-probe.mjs';

const output=path.resolve('outputs/card-workshop');await fs.mkdir(output,{recursive:true});
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
try{
  await size(915,412);await b.visit(base+'/loading.html');await until(()=>ev("document.readyState==='complete'"),'origin',100);
  await ev(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(state))})`);await reload();
  await click('[data-action=card-workshop]');await until(()=>ev("!!document.querySelector('.card-workshop')"),'Workshop',100);
  const layouts=[];
  for(const [width,height] of [[915,412],[740,333],[640,320],[720,280]]){
    await size(width,height);
    const layout=await ev(`(()=>{const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};return {panels:[...document.querySelectorAll('.card-workshop-services>article')].map(box),back:box(document.querySelector('[data-action=card-workshop-back]')),offers:[...document.querySelectorAll('.card-workshop-offer')].map(box)}})()`);
    for(const rect of [...layout.panels,layout.back])assert.ok(rect.x>=-1&&rect.y>=-1&&rect.right<=width+1&&rect.bottom<=height+1,`${width}x${height} ${JSON.stringify(rect)}`);
    assert.ok(layout.back.height>=43);for(const rect of layout.offers)assert.ok(rect.height>=43);
    await b.shot(path.join(output,`workshop-${width}x${height}.png`));layouts.push({width,height,...layout});
  }
  await size(740,333);await click('[data-action=card-workshop-refill][data-id="proof:1"]');
  assert.match(await ev("document.querySelector('.card-refill-confirm').textContent"),/Uses 1 → 6/);
  await b.shot(path.join(output,'refill-740x333.png'));
  await click('[data-action=card-workshop]');assert.equal((await saved()).run.condensedGlow,100,'Back keeps wallet');
  await click('[data-action=card-workshop-refill][data-id="proof:1"]');await click('[data-action=card-confirm-refill]');
  let r=(await saved()).run;assert.equal(r.condensedGlow,87);assert.equal(r.mountedCards[1].charges,6);assert.deepEqual(r.cardRest.actions,[]);
  await click('[data-action=card-workshop-improve][data-id="proof:0"]');await click('[data-action=card-back-improve]');assert.ok(await ev("!!document.querySelector('.card-workshop')"));
  await click('[data-action=card-workshop-improve][data-id="proof:0"]');await click('[data-action=card-confirm-improve]');
  r=(await saved()).run;assert.equal(r.condensedGlow,72);assert.equal(r.mountedCards[0].rank,2);
  await click('[data-action=card-workshop-forge][data-rarity=rare]');const token=await ev("document.querySelector('[data-action=card-confirm-forge]').dataset.token");
  await click('[data-action=card-forge-back]');assert.ok(await ev("!!document.querySelector('.card-workshop')"));
  await click('[data-action=card-workshop-forge][data-rarity=rare]');assert.equal(await ev("document.querySelector('[data-action=card-confirm-forge]').dataset.token"),token);
  await click('[data-action=card-confirm-forge]');r=(await saved()).run;assert.equal(r.condensedGlow,42);assert.deepEqual(r.cardRest.actions,[]);
  await click('[data-action=card-forge-back]');await click('[data-action=card-workshop-back]');await reload();await click('[data-action=card-workshop]');
  r=(await saved()).run;assert.equal(r.condensedGlow,42);assert.equal(r.mountedCards[1].charges,6);assert.equal(r.mountedCards[0].rank,2);
  const gameSave=await ev(`localStorage.getItem(${JSON.stringify(key)})`);
  await b.visit(base+'/components-preview.html?family=cards&state=workshop');
  await until(()=>ev("!!document.querySelector('.card-workshop')"),'Gallery Workshop',100);
  await click('[data-action=card-workshop-refill][data-id="sample-workshop-1"]');await click('[data-action=card-confirm-refill]');
  assert.match(await ev("document.querySelector('.card-workshop').textContent"),/87Stored Sparks/);
  await click('[data-action=card-workshop-improve][data-id="sample-workshop-0"]');await click('[data-action=card-confirm-improve]');
  assert.match(await ev("document.querySelector('.card-workshop').textContent"),/72Stored Sparks/);
  await click('[data-action=card-workshop-forge][data-rarity=rare]');await click('[data-action=card-confirm-forge]');await click('[data-action=card-forge-back]');
  assert.match(await ev("document.querySelector('.card-workshop').textContent"),/42Stored Sparks/);
  await b.shot(path.join(output,'gallery-workshop-740x333.png'));
  await click('[data-action=card-workshop-back]');assert.ok(await ev("!!document.querySelector('.card-rest-screen')"));
  await click('[data-action=card-workshop]');assert.ok(await ev("!!document.querySelector('.card-workshop')"));
  assert.equal(await ev(`localStorage.getItem(${JSON.stringify(key)})`),gameSave,'Gallery writes no player save');
  assert.equal(b.errors.length,0,b.errors.join('\n'));await fs.writeFile(path.join(output,'proof.json'),JSON.stringify({layouts,wallet:[100,87,72,42],reload:true,campActions:[],galleryIsolated:true,errors:b.errors},null,2));
  console.log(JSON.stringify({layouts:layouts.length,wallet:[100,87,72,42],namedRefill:true,namedImprove:true,shownForge:true,cancel:true,reload:true,errors:b.errors,output}));
}finally{b.close();server.close();}
