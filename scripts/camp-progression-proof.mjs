// Production routes, save loading, app handlers and renderer in disposable muted Chrome.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chrome, until } from './browser-probe.mjs';

const out = path.resolve('work/camp-progression-proof');
await fs.mkdir(out, { recursive: true });
const release = /src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html', 'utf8'))[1];
const types = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.ttf':'font/ttf', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.webmanifest':'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), file = path.resolve('dist', '.' + url.pathname);
    if (!file.startsWith(path.resolve('dist') + path.sep)) throw Error('Outside dist');
    let data = await fs.readFile(file);
    if (url.pathname === '/app.mjs') data = Buffer.from(data.toString() + '\nwindow.__campProof={state:()=>state,engine:()=>engine,screen:()=>screen};\n');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' }).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const b = await chrome(['--mute-audio']), { ev, send } = b;
const reports = [], key = 'cards-pilot:wispbound.save.condensed.v7';
const click = selector => ev(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
const wait = selector => until(() => ev(`!!document.querySelector(${JSON.stringify(selector)})`), selector, 150);
const saved = () => ev(`localStorage.getItem('${key}')`);
async function fixture(kind = '') {
  await b.visit(base + '/loading.html');
  await until(() => ev("location.pathname==='/loading.html'"), 'fixture origin', 100);
  await ev(`(async()=>{
    const M=await import('./model.mjs?v=${release}'),C=await import('./skill-cards.mjs?v=${release}');
    const s=M.newState();s.settings.skipTutorial=true;s.settings.sound=false;s.profile.tutorialComplete=true;
    if(${JSON.stringify(kind)}){
      s.run=M.createRun(s.profile,'camp-browser-'+${JSON.stringify(kind)},1,{cards:true});const r=s.run;
      M.chooseStartingGift(s,M.getStartingGiftOffers(r).find(g=>g.cardId!=='camp-kit').id);
      if(${JSON.stringify(kind)}==='grow'){r.reserveCards.push(C.makeSkillCard('growth-seed','proof:growth'));M.equipOwnedCard(r,'proof:growth',2);}
      if(${JSON.stringify(kind)}==='second'){r.reserveCards.push(C.makeSkillCard('camp-kit','proof:second'));M.equipOwnedCard(r,'proof:second',2);}
      const camp=r.map.flat().find(n=>n.kind==='camp'),route=[camp];let n=camp;
      while(n.row>0){n=r.map[n.row-1].find(p=>p.nextIds.includes(n.id));if(!n)throw Error('Disconnected camp');route.unshift(n);}
      for(const n of route){if(!M.selectNode(r,n.id))throw Error('Cannot select route');if(n===camp)break;
        if(n.type==='support'){if(!M.resolveSupport(r,M.getSupportChoices(r,s.profile).findIndex(c=>!c.disabled),s.profile))throw Error('Support failed');}
        else {M.beginFlightAttempt(r);M.markFlightAttemptStarted(r);if(!M.finishFlight(r,{success:true,flame:55,collected:4}))throw Error('Flight failed');M.settleCheckpoint(s);if(r.cardReward)r.cardReward.uiAcknowledged=true;if(r.flightReward&&!r.flightReward.claimed)M.chooseFlightReward(s,r.flightReward.offers[0]);M.acknowledgeVictory(s);}}
      r.condensedGlow=150;if(${JSON.stringify(kind)}==='full'){r.cardSlots=5;r.mountedCards.push(null,null);r.flame=100;r.lives=r.maxLives;}
    }
    M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});localStorage.setItem('emberwing-muted','true');
  })()`);
  await b.visit(base + '/game.html?cards=1'); await wait('.front-new-button');
  if (kind) { await click('[data-action=continue-run]'); await wait('.card-rest-screen'); }
}
try {
  await send('Network.setBypassServiceWorker', { bypass:true });
  await send('Emulation.setDeviceMetricsOverride', { width:900,height:405,deviceScaleFactor:1,mobile:true });
  await send('Emulation.setTouchEmulationEnabled', { enabled:true,maxTouchPoints:1 });
  await fixture(); await click('.front-new-button'); await wait('.card-starter-pair');
  const offers = await ev("[...document.querySelectorAll('.card-pick[data-id]')].map(n=>n.dataset.id)"), before = await saved();
  await click('.card-pick[data-id]'); await wait('.card-starter-confirm'); assert.equal(await saved(), before);
  await b.shot(path.join(out, 'starter-confirmation.png'));
  await click('[data-action=cancel-starting-gift]'); await wait('.card-starter-pair');
  assert.deepEqual(await ev("[...document.querySelectorAll('.card-pick[data-id]')].map(n=>n.dataset.id)"), offers); assert.equal(await saved(), before);
  await click('.card-pick[data-id]'); await wait('.card-starter-confirm');
  await send('Input.dispatchKeyEvent', { type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27 });
  await send('Input.dispatchKeyEvent', { type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27 });
  await wait('.card-starter-pair'); assert.equal(await saved(), before);
  await click('.card-pick[data-id]'); await wait('.card-starter-confirm'); await click('[data-action=confirm-starting-gift]'); await wait('.game-map-screen');
  const starting = JSON.parse(await saved()).run; assert.equal(starting.mountedCards.filter(Boolean).length,2);assert.ok(starting.mountedCards.some(c=>c?.cardId==='lift-guide'));
  reports.push({ starter:true, offers, previewAndNoAndEscapePreserveSave:true, confirmedCards:starting.mountedCards.filter(Boolean).map(c=>c.cardId) });
  for (const action of ['recover','slot','grow','continue','full','second']) {
    await fixture(action);
    if (action==='recover') await b.shot(path.join(out,'camp-arrival.png'));
    if (action==='recover') {
      const before = await ev('({wallet:window.__campProof.state().run.condensedGlow,actions:[...window.__campProof.state().run.cardRest.actions]})');
      await click('.card-rest-screen [data-action=card-preview-forge]');await wait('[data-action=card-confirm-forge]');
      assert.equal(await ev('document.querySelector("[data-action=card-confirm-forge]").disabled'),false);
      await click('[data-action=card-confirm-forge]');
      assert.equal(await ev('window.__campProof.state().run.condensedGlow'),before.wallet-30);
      assert.deepEqual(await ev('window.__campProof.state().run.cardRest.actions'),before.actions);
      await click('[data-action=card-forge-back]');await wait('.card-rest-screen');
      reports.push({campForge:true,walletSpent:30,usesNoRestAction:true});
    }
    if (action==='full') assert.equal(await ev("[...document.querySelectorAll('.card-camp-choice button')].every(n=>n.disabled)"),true);
    const pick = action==='full'||action==='continue'?'rest-continue':action==='second'?'rest-recover':'rest-'+action;
    const index = await ev(`(async()=>{const M=await import('./model.mjs?v=${release}');return M.getSupportChoices(window.__campProof.state().run).findIndex(c=>c.id==='${pick}')})()`);
    await click(`[data-action=support][data-index="${index}"]`);
    if(action==='second'){
      assert.equal(await ev("window.__campProof.state().run.mountedCards[2].charges"),1);
      await click('[data-action=support][data-index="1"]');
      assert.equal(await ev("window.__campProof.state().run.mountedCards[2]"),null);
    }
    await until(()=>ev("document.querySelector('.card-rest-screen')?.innerText.includes('Rest complete')"),'completed '+action,100);
    assert.equal(await ev("document.querySelectorAll('.card-rest-screen [data-action=support]').length"),0);
    if(action==='recover')await b.shot(path.join(out,'camp-completed.png'));
    const state = JSON.parse(await saved()), r=state.run;
    await b.visit(base+'/game.html?cards=1');await wait('.front-new-button');await click('[data-action=continue-run]');
    await until(()=>ev("document.querySelector('.card-rest-screen')?.innerText.includes('Rest complete')"),'reload completed '+action,100);
    await click('[data-action=view-route]');await wait('.game-map-screen');
    const next=await ev(`(async()=>{const M=await import('./model.mjs?v=${release}');return M.getChoices(window.__campProof.state().run).map(n=>n.id)})()`);assert.equal(next.length,1);
    reports.push({ action, complete:true,reload:true,next,used:r.cardRest.actions,slots:r.cardSlots,growUses:r.cardGrowUses });
  }
  // A normal onward passage renders a physical Guide cue after the real wake.
  await fixture('recover');await click('[data-action=support][data-index="0"]');await click('[data-action=view-route]');
  const next=await ev(`(async()=>{const M=await import('./model.mjs?v=${release}');return M.getChoices(window.__campProof.state().run)[0].id})()`);
  await click(`[data-action=preview-node][data-id="${next}"]`);await wait(`[data-action=node][data-id="${next}"]`);
  await click(`[data-action=node][data-id="${next}"]`);await wait('[data-action=wake-flight]');await click('[data-action=wake-flight]');
  const lift=await ev("(()=>{const r=document.querySelector('#flap-btn').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[lift]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const cue = await until(()=>ev("(()=>{const e=window.__campProof.engine();const c=e?.getLiftGuide();return c?.phase==='open'?{cue:c,time:e.time,vy:e.player.vy,y:e.player.y,scale:e.scaleY,flaps:e.flaps}:null})()"),'actual normal Guide cue',100);
  assert.equal(cue.flaps,1);
  await send('Emulation.setVirtualTimePolicy',{policy:'pause'});await ev('window.__campProof.engine().render()');await b.shot(path.join(out,'guide-actual-cue.png'));
  reports.push({ actualNormalFlightCue:cue });
  assert.deepEqual(b.errors,[]);
  const report={viewport:{width:900,height:405},muted:true,productionApp:true,productionSavedConnectedRoutes:true,readOnlyEngineInspector:true,
    regressionBeforeFix:{seed:'camp-normal-production-repro',path:['m0-0-2','m0-1-2','m0-2-2','m0-3-2','m0-4-2'],action:'rest-recover',arrivalMarkupLength:25572,phaseAfter:'map',currentAfter:null,restReadyAfter:true,completedMarkupLength:0,cause:'Completed Rest cleared current; the card camp quote required current.kind=camp and returned no view.'},reports,errors:b.errors};
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} finally { b.close();server.close(); }
