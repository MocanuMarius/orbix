// Screenshots of the rebuilt event / chest stop screens: event with 2 options, chest, Marked Passage (3 options), Refill card pick.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chrome,until,delay} from './browser-probe.mjs';
const root=path.resolve('dist'),out=path.resolve('outputs/backlog-ui');await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://x');if(u.pathname==='/__dev-revision'){res.writeHead(200,{'Content-Type':'application/json'}).end('{"revision":"proof"}');return;}const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root)){res.writeHead(403).end();return;}const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(body);}catch{res.writeHead(404).end();}}).listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const base='http://127.0.0.1:'+server.address().port,b=await chrome(['--mute-audio']),{ev,send}=b;
const release=/src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html','utf8'))[1];
const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
const size=async(w,h)=>{await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});};
const CHECKS={event:"n.eventIndex===9",chest:"n.kind==='treasure'&&!n.practiceLoan",marked:"n.kind==='event'&&(n.nextIds||[]).length>=2",refill:"n.eventIndex===3"};
const SETUPS={
 event:`const n=r.map.flat().find(n=>n.eventIndex===9)||r.map.flat().find(n=>n.kind==='event');r.lives=2;r.flame=30;r.current=n;r.phase='support';`,
 chest:`const n=r.map.flat().find(n=>n.kind==='treasure'&&!n.practiceLoan);n.treasureKind='lens';r.current=n;r.phase='support';M.queueChestChoice(r);`,
 marked:`const n=r.map.flat().find(n=>n.kind==='event'&&(n.nextIds||[]).length>=2)||r.map.flat().find(n=>n.kind==='event');n.eventIndex=4;n.nextIds=r.map.flat().filter(x=>x.row===n.row+1&&x.type!=='support').slice(0,2).map(x=>x.id);r.current=n;r.supportOffers=null;r.phase='support';`,
 refill:`const n=r.map.flat().find(n=>n.eventIndex===3);r.current=n;r.phase='support';const c=C.makeSkillCard('twin-wick','tw:1');c.charges=1;r.mountedCards[0]=c;`,
};
async function seed(name){
 await b.visit(base+'/components-preview.html?family=cards&state=reward');await delay(300);await until(()=>ev("document.documentElement.dataset.previewReady==='true'"),'seed page',100);
 await ev(`(async()=>{const M=await import('./model.mjs?v=${release}'),C=await import('./skill-cards.mjs?v=${release}');const s=M.newState();s.settings.skipTutorial=true;s.profile.tutorialComplete=true;s.profile.pickupCoachSkipped=true;for(let i=0;i<80;i++){s.run=M.createRun(s.profile,'event-proof-'+i,1,{cards:true});if(s.run.map.flat().some(n=>${CHECKS[name]}))break;}M.chooseStartingGift(s,M.getStartingGiftOffers(s.run)[0].id);const r=s.run;
  r.mapIndex=0;${SETUPS[name]}
  M.saveState(s,{getItem:k=>localStorage.getItem('cards-pilot:'+k),setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});localStorage.setItem('emberwing-muted','true');})()`);
 await b.visit(base+'/game.html?cards=1');await delay(300);await until(()=>ev("!!document.querySelector('[data-action=continue-run]')"),'home',100);await click('[data-action=continue-run]');
 await until(()=>ev("!!document.querySelector('.stop2')"),'stop screen '+name,100);await delay(400);
}
const geometry=()=>ev("(()=>{const q=s=>[...document.querySelectorAll(s)].map(n=>{const r=n.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),b:Math.round(r.bottom),r:Math.round(r.right),sw:n.scrollWidth>n.clientWidth+1,sh:n.scrollHeight>n.clientHeight+1}});return{vw:innerWidth,vh:innerHeight,page:q('.stop2')[0],art:q('.stop2-art')[0],tiles:q('.stop2-tile,.stop2-card'),pageScroll:document.documentElement.scrollHeight>innerHeight}})()");
try{
 for(const name of Object.keys(SETUPS)) for(const [w,h] of [[890,400],[924,308],[740,333]]){
  await size(w,h);await seed(name);
  if(name==='refill'){await click('.stop2-tile:nth-child(1)');await delay(300);}
  const g=await geometry();
  const bad=g.tiles.filter(t=>t.b>g.vh||t.r>g.vw||t.sh||t.sw);
  console.log(name,w+'x'+h,'tiles',g.tiles.length,'overflow',bad.length,'pageScroll',g.pageScroll,'art',JSON.stringify(g.art&&{w:g.art.w,h:g.art.h,sh:g.art.sh}));
  if(w!==740)await b.shot(path.join(out,`event-${name}-${w}x${h}.png`));
 }
 console.log(JSON.stringify({errors:b.errors,bad:b.badResponses}));
}catch(e){console.error(e.message,JSON.stringify(b.errors))}finally{server.close();process.exit(0);}
