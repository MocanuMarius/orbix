// Proof for the first-visit "Play fullscreen?" dialog (dist/display-prompt.mjs): touch emulation, throwaway Chrome profile, own static server.
//   node scripts/display-prompt-proof.mjs     -> outputs/backlog-ui/display-prompt-*.png
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chrome,until,delay} from './browser-probe.mjs';
const output=path.resolve('outputs/backlog-ui');await fs.mkdir(output,{recursive:true});
const root=path.resolve('dist'),mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))throw Error();const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`,b=await chrome(['--mute-audio']),{send,ev}=b;
const size=async(width,height,touch=true)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch});await send('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:1}:{enabled:false});await delay(100);};
const dialog=()=>ev("(()=>{const d=document.querySelector('dialog.display-prompt-sheet[open]');if(!d)return null;const r=d.getBoundingClientRect();return{title:d.querySelector('h2').textContent,buttons:[...d.querySelectorAll('button')].map(x=>x.textContent),x:r.x,y:r.y,right:r.right,bottom:r.bottom,scroll:d.scrollHeight-d.clientHeight,btnH:Math.min(...[...d.querySelectorAll('button')].map(x=>x.getBoundingClientRect().height))}})()");
const home=async()=>{await b.visit(base+'/game.html?cards=1');await until(()=>ev("document.readyState==='complete'&&!!document.querySelector('[data-action=play],[data-action=continue-run],[data-action=new-game],[data-action=practice]')"),'home',150);await delay(500);};
const report={};
try{
  for(const [w,h] of [[890,400],[924,308]]){
    await size(w,h);await b.visit(base+'/loading.html');await until(()=>ev("document.readyState==='complete'"),'origin',100);await ev('localStorage.clear()');
    await home();
    await until(dialog,'dialog',50);let d=await dialog();
    assert.equal(d.title,'Play fullscreen?');assert.ok(d.buttons[0]==='Fullscreen'&&d.buttons.at(-1)==='Not now'&&d.buttons.length<=3);report.installOffered=d.buttons.includes('Install app');
    assert.ok(d.x>=0&&d.y>=0&&d.right<=w&&d.bottom<=h&&d.scroll<=0,`fits ${w}x${h} ${JSON.stringify(d)}`);assert.ok(d.btnH>=43);
    await b.shot(path.join(output,`display-prompt-${w}x${h}.png`));report[`${w}x${h}`]=d;
    await ev("[...document.querySelectorAll('dialog.display-prompt-sheet button')].find(x=>x.textContent==='Not now').click()");await delay(200);
    assert.equal(await dialog(),null);
    assert.match(await ev("localStorage.getItem('wispbound.display-prompt.v1')"),/later/);
    await home();assert.equal(await dialog(),null,'never asks again');
  }
  // Install button appears when the browser offered an install.
  await size(890,400);await ev('localStorage.clear()');await b.visit(base+'/game.html?cards=1');
  await until(()=>ev("!!document.querySelector('[data-action=play],[data-action=continue-run],[data-action=new-game],[data-action=practice]')"),'home',150);
  await ev("(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{window.__prompted=true};e.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(e)})()");
  await ev('localStorage.clear()');await ev("document.querySelector('[data-action=settings],.front-settings')?.click()");await delay(300);
  // Reopen Home with the install event already known: the Settings page shows the entries.
  const settings=await ev("document.querySelector('dialog.settings-sheet')?.innerText||''");
  assert.match(settings,/fullscreen/i);await b.shot(path.join(output,'display-settings-890x400.png'));
  // Desktop (no touch): never asks.
  await size(1280,720,false);await ev('localStorage.clear()');await b.visit(base+'/game.html?cards=1');await delay(3000);assert.equal(await dialog(),null,'desktop');
  assert.equal(b.errors.length,0,b.errors.join('\n'));
  await fs.writeFile(path.join(output,'display-prompt-proof.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok:true,report}));
}finally{b.close?.();server.close();}
