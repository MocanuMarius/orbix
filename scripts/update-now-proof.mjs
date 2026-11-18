// Proof for the first-visit "Play fullscreen?" dialog (dist/update-now.mjs): touch emulation, throwaway Chrome profile, own static server.
//   node scripts/update-now-proof.mjs     -> outputs/backlog-ui/update-now-*.png
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until,delay} from './browser-probe.mjs';
const output=path.resolve('outputs/backlog-ui');await fs.mkdir(output,{recursive:true});
const root=path.resolve('dist'),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{try{const pn=new URL(req.url,'http://localhost').pathname;if(pn==='/offline-list.js'){let t=await fs.readFile(path.join(root,'offline-list.js'),'utf8');if(globalThis.__newer)t=t.replace(/"release": "[^"]+"/,'"release": "newer-build"');res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(t);return;}const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error();const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,b=await chrome(['--mute-audio']),{send,ev}=b;
const size=async(width,height,touch=true)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch});await send('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:1}:{enabled:false});await delay(100);};
const dialog=()=>ev("(()=>{const d=document.querySelector('dialog.update-now-sheet[open]');if(!d)return null;const r=d.getBoundingClientRect();return{title:d.querySelector('h2').textContent,buttons:[...d.querySelectorAll('button')].map(x=>x.textContent),x:r.x,y:r.y,right:r.right,bottom:r.bottom,scroll:d.scrollHeight-d.clientHeight,btnH:Math.min(...[...d.querySelectorAll('button')].map(x=>x.getBoundingClientRect().height))}})()");
const home=async()=>{await b.visit(base+'/game.html?cards=1');await until(()=>ev("document.readyState==='complete'&&!!document.querySelector('[data-action=play],[data-action=continue-run],[data-action=new-game],[data-action=practice]')"),'home',150);await delay(500);};
const report={};
const settingsFit=()=>ev("(()=>{const d=document.querySelector('dialog.settings-sheet');const r=d.getBoundingClientRect();const row=[...d.querySelectorAll('[data-action=update-now]')][0];const rr=row.getBoundingClientRect();return{text:d.innerText,fits:r.bottom<=innerHeight&&r.right<=innerWidth,scrolls:[...d.querySelectorAll('*')].some(n=>n.scrollHeight>n.clientHeight+2&&['auto','scroll'].includes(getComputedStyle(n).overflowY)),rowBottom:rr.bottom,h:rr.height,inView:rr.bottom<=innerHeight}})()");
try{
  const answered=()=>ev("localStorage.setItem('wispbound.display-prompt.v1',JSON.stringify({answer:'later'}))");
  for(const [w,h] of [[890,400],[924,308]]){
    await size(w,h);await b.visit(base+'/loading.html');await until(()=>ev("document.readyState==='complete'"),'origin',100);await ev('localStorage.clear()');await answered();
    await home();
    assert.equal(await ev("document.querySelector('.front-update').hidden"),true,'no update available yet');
    await ev("document.querySelector('[data-action=settings],.front-settings').click()");await delay(300);
    const s=await settingsFit();assert.match(s.text,/Update now/i);assert.ok(s.fits&&s.inView&&!s.scrolls,`settings ${w}x${h} ${JSON.stringify({...s,text:undefined})}`);
    await b.shot(path.join(output,`update-settings-${w}x${h}.png`));report[`settings-${w}x${h}`]={...s,text:undefined};
    await ev("document.querySelector('dialog.settings-sheet [data-action=settings-back]').click()");await delay(200);
    // A newer release is published: Home shows the small button.
    globalThis.__newer=true;await home();await until(()=>ev("!document.querySelector('.front-update').hidden"),'update available',50);
    const btn=await ev("(()=>{const r=document.querySelector('.front-update').getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,text:document.querySelector('.front-update').textContent,inView:r.bottom<=innerHeight&&r.right<=innerWidth,docScroll:document.documentElement.scrollHeight>innerHeight+1}})()");
    assert.equal(btn.text,'Update available');assert.ok(btn.inView,JSON.stringify(btn));
    await b.shot(path.join(output,`update-home-${w}x${h}.png`));report[`home-${w}x${h}`]=btn;globalThis.__newer=false;
  }
  // Press it: saves survive, the page reloads with a cache-busting query.
  await size(890,400);globalThis.__newer=true;await ev("localStorage.setItem('keep-me','1')");await home();await until(()=>ev("!document.querySelector('.front-update').hidden"),'update available',50);
  await ev("document.querySelector('.front-update').click()");await until(()=>ev("location.search.includes('_u=')"),'reloaded with _u',80);
  await until(()=>ev("document.readyState==='complete'"),'loaded',50);assert.equal(await ev("localStorage.getItem('keep-me')"),'1','saves untouched');
  report.reloaded=await ev('location.search');
  assert.equal(b.errors.length,0,b.errors.join('\n'));
  await fs.writeFile(path.join(output,'update-now-proof.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok:true,report}));
}finally{b.close?.();server.close();}
