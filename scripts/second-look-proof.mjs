// Screenshots of the Choose 1 card screen with Second Look mounted: before, selected, after Re-roll. node scripts/second-look-proof.mjs
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
async function seed(){
 await b.visit(base+'/components-preview.html?family=cards&state=reward');await delay(300);await until(()=>ev("document.documentElement.dataset.previewReady==='true'"),'seed page',100);
 await ev(`(async()=>{const M=await import('./model.mjs?v=${release}'),C=await import('./skill-cards.mjs?v=${release}');const s=M.newState();s.settings.skipTutorial=true;s.profile.tutorialComplete=true;s.profile.pickupCoachSkipped=true;s.run=M.createRun(s.profile,'second-look-proof',1,{cards:true});M.chooseStartingGift(s,M.getStartingGiftOffers(s.run)[0].id);const r=s.run;
  const node=M.getChoices(r).find(n=>n.type!=='support');M.selectNode(r,node.id);M.beginFlightAttempt(r);M.markFlightAttemptStarted(r);M.finishFlight(r,{success:true,flame:50});M.settleCheckpoint(s);
  r.mountedCards[r.mountedCards.findIndex(c=>!c)>=0?r.mountedCards.findIndex(c=>!c):2]=C.makeSkillCard('second-look','sl:1');r.cardDraft.ceremony={version:1,stage:'cards'};
  M.saveState(s,{getItem:k=>localStorage.getItem('cards-pilot:'+k),setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});localStorage.setItem('emberwing-muted','true');})()`);
 await b.visit(base+'/game.html?cards=1');await delay(300);await until(()=>ev("!!document.querySelector('[data-action=continue-run]')"),'home',100);await click('[data-action=continue-run]');
 await until(()=>ev("!!document.querySelector('.card-draft-option')"),'draft screen',100);await delay(900);
}
try{
 for(const [w,h] of [[890,400],[924,308]]){
  await size(w,h);await seed();
  await b.shot(path.join(out,`reroll-before-${w}x${h}.png`));
  await click('.card-draft-option:nth-child(2)');await delay(150);
  console.log('selected state',await ev("document.querySelector('.card-reroll').className+' '+document.querySelector('.card-reroll').getAttribute('aria-disabled')+' '+getComputedStyle(document.querySelector('.card-reroll')).opacity"));
  await b.shot(path.join(out,`reroll-selected-${w}x${h}.png`));
  const was=await ev("[...document.querySelectorAll('.card-draft-option')].map(n=>n.getAttribute('aria-label').split(',')[0])");
  await click('.card-reroll');await delay(600);
  await b.shot(path.join(out,`reroll-after-${w}x${h}.png`));
  const now=await ev("[...document.querySelectorAll('.card-draft-option')].map(n=>n.getAttribute('aria-label').split(',')[0])");
  console.log(w,h,JSON.stringify({was,now,button:await ev("document.querySelector('.card-reroll')?.innerText"),scroll:await ev("document.documentElement.scrollHeight<=innerHeight")}));
 }
 console.log(JSON.stringify({errors:b.errors,bad:b.badResponses}));
}catch(e){console.error(e.message,JSON.stringify(b.errors))}finally{server.close();process.exit(0);}
