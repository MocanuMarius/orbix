import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until,delay} from './browser-probe.mjs';
const dist=path.resolve(process.argv[2]||'dist'),out=path.resolve(process.env.PRACTICE_PROBE_OUT||'work/practice-paused-hints');await fs.mkdir(out,{recursive:true});
const game=await fs.readFile(path.join(dist,'game.html'),'utf8'),release=/src="app\.mjs\?v=([^"]+)"/.exec(game)[1];
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{try{const relative=new URL(req.url,'http://local').pathname.slice(1)||'index.html',file=path.resolve(dist,relative);assert.ok(file.startsWith(dist+path.sep));const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,b=await chrome(['--mute-audio']),{ev,send}=b,report=[];
const visible=selector=>ev(`!!Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(e=>e.getClientRects().length&&!e.closest('[hidden]'))`);
const tap=async selector=>{await until(()=>visible(selector),selector,180);await ev(`Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(e=>e.getClientRects().length&&!e.closest('[hidden]')).dispatchEvent(new MouseEvent("click",{bubbles:true}))`);};
try{
 for(const [width,height]of [[900,405],[667,300]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await b.visit(base+'/loading.html');await until(()=>ev("document.readyState==='complete'"),'loading',180);await ev('localStorage.clear()');
  await b.visit(base+'/game.html?cards=1');await until(()=>visible('[data-action=tutorial]'),'home',180);
  await ev(`(async()=>{const {WispFlight}=await import('./flight.mjs?v=${release}'),start=WispFlight.prototype.start;WispFlight.prototype.start=function(...args){window.__practice=this;return start.apply(this,args)};})()`);
  await tap('[data-action=tutorial]');await tap('[data-action=preview-node][data-id=practice-glide]');await tap('[data-action=node][data-id=practice-glide]');
  await until(()=>visible('.tutorial-coach:not([hidden])'),'entry card',180);
  const entry=await ev("({step:document.querySelector('.tutorial-coach').dataset.step,paused:__practice.paused,time:__practice.time,skipHidden:document.querySelector('[data-coach=skip]').hidden,next:document.querySelector('[data-coach=next]').textContent,gate:!!document.querySelector('[data-action=wake-flight]')})");
  assert.equal(entry.paused,true);assert.equal(entry.gate,false);assert.equal(entry.next,'Got it');assert.equal(entry.skipHidden,true);
  await b.shot(path.join(out,`entry-${width}.png`));await tap('[data-coach=next]');await tap('[data-action=wake-flight]');
  await ev('__practice.beginLiftInput();__practice.endLiftInput();window.__pilot=setInterval(()=>{const e=__practice;if(!e||e.paused||e.dying)return;if(e.player.y>e.height*.57&&e.player.vy>0){e.beginLiftInput();e.endLiftInput();}},25)');
  await until(()=>visible('.tutorial-coach:not([hidden])'),'contextual coach',300);
  const paused=await ev("({time:__practice.time,paused:__practice.paused,step:document.querySelector('.tutorial-coach').dataset.step,liveHintVisible:!!Array.from(document.querySelectorAll('#tutorial-hint')).find(e=>!e.hidden&&e.getClientRects().length),card:(()=>{const r=document.querySelector('.tutorial-coach-card').getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom}})()})");
  assert.equal(paused.paused,true);assert.equal(paused.liveHintVisible,false);assert.ok(paused.card.left>=0&&paused.card.top>=0&&paused.card.right<=width&&paused.card.bottom<=height);
  await delay(250);assert.equal(await ev('__practice.time'),paused.time,'reading freezes simulation');await b.shot(path.join(out,`paused-${width}.png`));
  const before=await ev('__practice.lastFlapTime');await tap('[data-coach=next]');
  const resumed=await ev("({paused:__practice.paused,remaining:__practice.resumeRemaining,scale:__practice.resumeScale,countdown:!!document.querySelector('.flight-countdown'),lastLift:__practice.lastFlapTime})");
  assert.equal(resumed.paused,false);assert.ok(resumed.remaining>2);assert.ok(resumed.scale>=.1&&resumed.scale<.5);assert.equal(resumed.countdown,false);assert.equal(resumed.lastLift,before);
  await ev('clearInterval(__pilot)');report.push({width,height,entry,paused,resumed});
 }
 assert.deepEqual(b.errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,release,scenarios:report,errors:b.errors},null,2)+'\n');console.log(JSON.stringify({passed:true,release,viewports:report.map(r=>r.width+'x'+r.height)}));
}catch(e){await b.shot(path.join(out,'failure.png'));await fs.writeFile(path.join(out,'failure.txt'),String(e.stack)+'\n'+await ev('document.body.innerText'));throw e;}finally{b.close();await new Promise(r=>server.close(r));}
