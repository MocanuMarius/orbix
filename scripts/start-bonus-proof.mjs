// Screenshots of the "Choose your start" screen at phone sizes. node scripts/start-bonus-proof.mjs
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome,until,delay} from './browser-probe.mjs';
import {drawStartBonusIds,startBonusKind} from '../dist/start-bonus.mjs';
const root=path.resolve('dist'),out=path.resolve('outputs/backlog-ui');await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://x');if(u.pathname==='/__dev-revision'){res.writeHead(200,{'Content-Type':'application/json'}).end('{"revision":"proof"}');return;}const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root)){res.writeHead(403).end();return;}const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(body);}catch{res.writeHead(404).end();}}).listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const base='http://127.0.0.1:'+server.address().port,b=await chrome(['--mute-audio']),{ev,send}=b;
const release=/src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
const size=async(w,h)=>{await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});};
// seeds that show the mixes we want to look at
const want={mixed:ids=>new Set(ids.map(startBonusKind)).size===3,wisps:ids=>ids.every(i=>startBonusKind(i)==='wisp'),inscriptions:ids=>ids.every(i=>startBonusKind(i)==='inscription')};
const seedFor={};for(const [name,ok] of Object.entries(want)){for(let i=0;i<5000;i++){const run={campaignSeed:`sb-${name}-${i}`};if(ok(drawStartBonusIds(run.campaignSeed))){seedFor[name]=run.campaignSeed;break;}}}
async function seed(campaignSeed){
 await b.visit(base+'/components-preview.html?family=cards&state=reward');await delay(300);await until(()=>ev("document.documentElement.dataset.previewReady==='true'"),'seed page',100);
 await ev(`(async()=>{const M=await import('./model.mjs?v=${release}');const s=M.newState();s.settings.skipTutorial=true;s.profile.tutorialComplete=true;s.profile.pickupCoachSkipped=true;s.run=M.createRun(s.profile,${JSON.stringify(campaignSeed)},1,{cards:true});
  M.saveState(s,{getItem:k=>localStorage.getItem('cards-pilot:'+k),setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});localStorage.setItem('emberwing-muted','true');})()`);
 await b.visit(base+'/game.html?cards=1');await delay(300);await until(()=>ev("!!document.querySelector('[data-action=continue-run],[data-action=new-game]')"),'home',100);
 await click('[data-action=continue-run],[data-action=new-game]');
 await until(()=>ev("!!document.querySelector('.card-pick')"),'start screen',100);await delay(500);
}
try{
 for(const [name,s] of Object.entries(seedFor)) for(const [w,h] of [[890,400],[924,308]]){
  await size(w,h);await seed(s);
  const info=await ev("({tiles:[...document.querySelectorAll('.card-pick')].map(n=>{const r=n.getBoundingClientRect();return{name:n.getAttribute('aria-label').split('.')[0],x:Math.round(r.x),w:Math.round(r.width),b:Math.round(r.bottom)}}),scroll:document.documentElement.scrollHeight>innerHeight})");
  console.log(name,w,h,JSON.stringify(info));
  await b.shot(path.join(out,`startbonus-${name}-${w}x${h}.png`));
 }
 console.log(JSON.stringify({errors:b.errors,bad:b.badResponses}));
}catch(e){console.error(e.message,JSON.stringify(b.errors))}finally{server.close();process.exit(0);}
