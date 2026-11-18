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

const tap=async selector=>{const r=await ev(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)return null;n.scrollIntoView({block:'center'});const b=n.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}})()`);if(!r)throw Error('Missing '+selector);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x,y:r.y}]});await delay(60);await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(350);};
const paint=selector=>ev(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)return null;const c=getComputedStyle(n);return[c.backgroundColor,c.backgroundImage.slice(0,60),c.filter,c.outlineStyle+c.outlineWidth,c.boxShadow.slice(0,40),c.color,c.borderImageSource.slice(0,60)].join('|')})()`);
const audit=()=>ev(`(()=>{let hover=0,focusPaint=0,activePaint=0;const walk=list=>{for(const r of list){if(r.selectorText!==undefined&&r.style){for(const s of r.selectorText.split(',')){if(/:hover(?![-\w])/.test(s))hover++;if(/:focus(?![-\w])/.test(s)&&!/focus-visible|focus-within/.test(s)&&(r.style.getPropertyValue('background')||r.style.getPropertyValue('background-color')||r.style.getPropertyValue('outline')))focusPaint++;if(/:active(?![-\w])/.test(s)&&(r.style.getPropertyValue('background')||r.style.getPropertyValue('background-color')||r.style.getPropertyValue('filter')))activePaint++;}}else if(r.cssRules&&!/Keyframes/.test(r.constructor.name))walk(r.cssRules)}};for(const s of document.styleSheets){try{walk(s.cssRules)}catch{}}return{hover,focusPaint,activePaint,touchLike:matchMedia('(hover: none), (pointer: coarse)').matches,tapColor:getComputedStyle(document.body).webkitTapHighlightColor}})()`);
const report={};
try{
  await size(890,400);await b.visit(base+'/loading.html');await until(()=>ev("document.readyState==='complete'"),'origin',100);
  await ev(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(state))});localStorage.setItem('wispbound.display-prompt.v1',JSON.stringify({answer:'later'}))`);
  await b.visit(base+'/game.html?cards=1');await until(()=>ev("!!document.querySelector('[data-action=continue-run]')"),'home',150);await delay(600);
  report.home=await audit();assert.deepEqual([report.home.hover,report.home.focusPaint,report.home.activePaint],[0,0,0],JSON.stringify(report.home));assert.match(report.home.tapColor,/rgba\(0, 0, 0, 0\)|transparent/);
  for(const sel of ['[data-action=settings],.front-settings']){const before=await paint(sel);await tap(sel);
    if(await ev("!!document.querySelector('dialog[open]')")){const d=await ev("document.querySelector('dialog[open]')?.className");report['dialog-'+sel]=d;await ev("document.querySelector('dialog[open] [data-action=settings-back],dialog[open] [data-action=close-sheet]')?.click()");await delay(300);}
    if(!await ev(`!!document.querySelector(${JSON.stringify(sel)})`))continue;
    const after=await paint(sel);assert.equal(after,before,`Home ${sel} tinted after tap: ${before} -> ${after}`);}
  await b.shot(path.join(output,'touch-clean-home-890x400.png'));
  await tap('[data-action=continue-run]');await until(()=>ev("!!document.querySelector('[data-action=card-workshop]')"),'Rest',100);await delay(400);
  report.rest=await audit();
  for(const sel of ['[data-rest-service=improve]','.rest2-tile','[data-action=menu]','[data-action=card-deck],[data-action=deck],[data-action=cards]']){const n=await paint(sel);if(n===null)continue;await tap(sel);
    if(await ev("!!document.querySelector('dialog[open]')")){await ev("document.querySelector('dialog[open] .card-back,dialog[open] [data-action=card-workshop-back],dialog[open] [data-action=settings-back],dialog[open] [data-action=close-sheet]')?.click()");await delay(300);}
    report['tap '+sel]=true;}
  await b.shot(path.join(output,'touch-clean-rest-890x400.png'));
  assert.equal(b.errors.length,0,b.errors.join('\n'));
  await fs.writeFile(path.join(output,'touch-clean-proof.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,report}));
}finally{b.close?.();server.close();}
