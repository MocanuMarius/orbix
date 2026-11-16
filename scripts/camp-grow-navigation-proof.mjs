// Production app handlers in disposable Chrome; fixtures use connected model routes.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chrome, until, delay } from './browser-probe.mjs';

const output = path.resolve(process.env.CAMP_PROOF_OUTPUT || 'work/camp-grow-navigation-proof');
await fs.mkdir(output, { recursive: true });
const types = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.ttf':'font/ttf', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.webmanifest':'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  try {
    const file = path.resolve('dist', '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(path.resolve('dist') + path.sep)) throw Error('Outside dist');
    const data=await fs.readFile(file);
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' }).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = (process.env.CAMP_PROOF_BASE || 'http://127.0.0.1:' + server.address().port).replace(/\/$/, '');
const release = process.env.CAMP_PROOF_RELEASE || /src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html', 'utf8'))[1];
const b = await chrome(['--mute-audio']), { ev, send } = b;
const key = 'cards-pilot:wispbound.save.condensed.v7', reports = [];
const wait = selector => until(() => ev(`!!document.querySelector(${JSON.stringify(selector)})`), selector, 150);
const saved = () => ev(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
const snap = () => ev(`({screen:document.body.dataset.screen,title:!!document.querySelector('.front-new-button'),rest:document.querySelector('.card-rest-screen')?.innerText,header:document.querySelector('#header')?.innerText,url:location.href,app:document.querySelector('script[src*="app.mjs"]')?.src})`);
async function tap(selector) {
  const p = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{...p,id:1}] });
  await send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await delay(70);
}
async function home() { await b.visit(base + '/game.html?cards=1&v=' + release); await wait('.front-new-button'); }
async function resume() { await tap('[data-action=continue-run]'); await delay(100); }
async function action(id) {
  const run = (await saved()).run;
  const index = await ev(`import('./model.mjs?v=${release}').then(M=>M.getSupportChoices(${JSON.stringify(run)}).findIndex(c=>c.id===${JSON.stringify(id)}))`);
  assert.ok(index >= 0, id); await tap(`[data-action=support][data-index="${index}"]`);
}
async function fixture(kind) {
  await b.visit(base + '/loading.html'); await until(() => ev("location.pathname.endsWith('/loading.html')"), 'fixture origin', 100);
  await ev(`(async()=>{
    const M=await import('./model.mjs?v=${release}'),C=await import('./skill-cards.mjs?v=${release}');
    const s=M.newState();s.settings.skipTutorial=true;s.settings.sound=false;s.profile.tutorialComplete=true;
    s.run=M.createRun(s.profile,'camp-grow-navigation-'+${JSON.stringify(kind)},1,{cards:true});const r=s.run;
    if(!M.chooseStartingGift(s,M.getStartingGiftOffers(r).find(g=>g.cardId!=='camp-kit').id))throw Error('gift');
    r.mountedCards[2]=C.makeSkillCard('growth-seed-common','proof:growth');
    if(${JSON.stringify(kind)}==='extra')r.mountedCards[0]=C.makeSkillCard('camp-kit','proof:second');
    const camp=r.map.flat().find(n=>n.kind==='camp'),route=[camp];let cursor=camp;
    while(cursor.row>0){cursor=r.map[cursor.row-1].find(p=>p.nextIds.includes(cursor.id));if(!cursor)throw Error('Disconnected camp');route.unshift(cursor);}
    for(const node of route){if(!M.selectNode(r,node.id))throw Error('route select');if(node===camp)break;
      if(node.type==='support'){if(!M.resolveSupport(r,M.getSupportChoices(r,s.profile).findIndex(c=>!c.disabled),s.profile))throw Error('support');}
      else{if(!M.beginFlightAttempt(r)||!M.markFlightAttemptStarted(r)||!M.finishFlight(r,{success:true,flame:55,collected:4}))throw Error('flight');M.settleCheckpoint(s);if(r.cardReward)r.cardReward.uiAcknowledged=true;if(r.flightReward&&!r.flightReward.claimed)M.chooseFlightReward(s,r.flightReward.offers[0]);if(!M.acknowledgeVictory(s))throw Error('receipt');}}
    r.condensedGlow=130;r.flame=17;r.lives=2;
    if(${JSON.stringify(kind)}==='none'){r.cardSlots=5;r.mountedCards.push(null,null);r.cardGrowUses=3;r.cardGrowCapacity=30;r.flame=9999;r.lives=r.maxLives;}
    if(${JSON.stringify(kind)}.startsWith('spent')){r.artifacts=['glow-wick','moonwake-lens'];r.artifactCharges={'glow-wick':0};}
    if(${JSON.stringify(kind)}==='spent-resume'){
      if(!M.resolveSupport(r,M.getSupportChoices(r,s.profile).findIndex(c=>c.id==='rest-grow'),s.profile))throw Error('saved Grow');
      if(!M.selectNode(r,M.getChoices(r)[0].id)||!M.beginFlightAttempt(r)||!M.markFlightAttemptStarted(r)||!M.finishFlight(r,{success:true,flame:17,collected:0}))throw Error('onward flight');
      M.settleCheckpoint(s);if(r.cardReward)r.cardReward.uiAcknowledged=true;if(r.flightReward&&!r.flightReward.claimed)M.chooseFlightReward(s,r.flightReward.offers[0]);if(!M.acknowledgeVictory(s))throw Error('onward receipt');
      r.artifacts=['glow-wick','moonwake-lens'];r.artifactCharges={'glow-wick':0};r.flame=17;
    }
    M.saveState(s,{setItem:(k,v)=>localStorage.setItem('cards-pilot:'+k,v)});localStorage.setItem('emberwing-muted','true');
  })()`);
  await home(); const before = await saved(); await resume(); if(kind!=='spent-resume')await wait('.card-rest-screen');
  assert.equal((await saved()).run.id, before.run.id, 'Continue preserves the run');
  return before;
}
try {
  await send('Network.setBypassServiceWorker', { bypass:true });
  await send('Emulation.setDeviceMetricsOverride', { width:740,height:333,deviceScaleFactor:1,mobile:true });
  await send('Emulation.setTouchEmulationEnabled', { enabled:true,maxTouchPoints:1 });
  {
    const errorStart=b.errors.length,original=await fixture('spent-resume'),state=await snap(),errors=b.errors.slice(errorStart);
    await b.shot(path.join(output,'spent-resume-continue.png'));
    assert.equal((await saved()).run.id,original.run.id);assert.equal((await saved()).run.cardGrowUses,1);
    if(process.env.CAMP_EXPECT_FAILURE==='1') {
      assert.equal(state.title,true,'failed map render leaves title in the app');assert.equal(state.screen,'map');
      assert.ok(errors.some(e=>/artifactPixelPortrait/.test(e)));
      reports.push({kind:'spent-resume',knownFailure:true,titleWithActiveRunHeader:true,state,errors});
    } else {
      await wait('.game-map-screen');assert.equal(state.title,false);assert.deepEqual(errors,[]);
      assert.match(await ev("document.querySelector('.collection-dock')?.innerText"),/Collection · 1/);
      reports.push({kind:'spent-resume',continueRecovered:true,growUses:1,runPreserved:true,errors});
    }
  }
  for (const kind of ['normal','extra','none','spent']) {
    const errorStart = b.errors.length, original = await fixture(kind), before=(await saved()).run;
    await b.shot(path.join(output,kind+'-before.png'));
    const quote = await ev(`import('./model.mjs?v=${release}').then(M=>M.getCardCampPreview(${JSON.stringify(before)}))`);
    if(kind==='none') { assert.equal(quote.remaining,1); assert.ok(quote.actions.filter(a=>a.key).every(a=>a.disabled)); await action('rest-continue'); }
    else {
      await action('rest-grow');
      const after=(await saved()).run;
      assert.equal(after.id,before.id); assert.equal(after.cardGrowUses,before.cardGrowUses+1);
      assert.equal(after.lives,before.lives); assert.equal(after.condensedGlow,before.condensedGlow);
      assert.ok(Math.abs(after.flame-quote.actions.find(a=>a.key==='grow').after.maxMeter)<1e-8);
      const staleIndex=quote.actions.find(a=>a.key==='grow').index;
      const once=await saved();
      await ev(`(()=>{const e=document.createElement('button');e.dataset.action='support';e.dataset.index=${staleIndex};document.body.append(e);e.click();e.remove()})()`);
      assert.deepEqual(await saved(),once,'stale Grow cannot apply twice');
      if(kind==='extra') {
        assert.equal(after.phase,'support');assert.equal(after.cardRest.closed,false);
        const remaining=await ev(`import('./model.mjs?v=${release}').then(M=>M.getCardCampPreview(${JSON.stringify(after)}).remaining)`);assert.equal(remaining,1);
        await home();await resume();await wait('.card-rest-screen');
        assert.match((await snap()).rest,/Choose one more/);assert.equal((await saved()).run.cardGrowUses,after.cardGrowUses);
        await action('rest-slot');
      }
    }
    const completed=await saved(); assert.equal(completed.run.cardRest.closed,true); assert.equal(completed.run.phase,'map');
    assert.match((await snap()).rest,/Rest complete/);await b.shot(path.join(output,kind+'-completed.png'));
    if(kind==='spent') {
      const beforeRoute=await saved();await tap('[data-action=view-route]');
      await delay(100);const routeState=await snap(),errors=b.errors.slice(errorStart);
      await b.shot(path.join(output,kind+'-first-route.png'));
      if(process.env.CAMP_EXPECT_FAILURE==='1') {
        assert.ok(errors.some(e=>/artifactPixelPortrait/.test(e)),JSON.stringify({routeState,errors}));
        assert.deepEqual(await saved(),beforeRoute,'failed render preserves Grow');
        reports.push({kind,knownFailure:true,routeState,errors,savedRunId:beforeRoute.run.id});
        continue;
      }
      await wait('.game-map-screen');assert.deepEqual(errors,[]);
      assert.match(await ev("document.querySelector('.collection-dock')?.innerText"),/Collection · 1/,'only surviving relic counted');
    }
    await home(); await resume(); await wait('.card-rest-screen');
    assert.match((await snap()).rest,/Rest complete/);assert.equal((await saved()).run.id,original.run.id);
    assert.equal((await saved()).run.cardGrowUses,completed.run.cardGrowUses);assert.deepEqual((await saved()).run.mountedCards,completed.run.mountedCards);
    const beforeRoute=await saved();await tap('[data-action=view-route]');
    await delay(100);const routeState=await snap(),errors=b.errors.slice(errorStart);
    await b.shot(path.join(output,kind+'-route.png'));
    assert.equal(routeState.title,false); assert.equal(routeState.screen,'map');await wait('.game-map-screen');
    assert.ok(await ev("!!document.querySelector('.reachable[data-action=preview-node]')"),'next route remains reachable');
    assert.deepEqual(await saved(),beforeRoute,'opening route never replays Grow');assert.deepEqual(errors,[]);
    reports.push({kind,runPreserved:true,growUses:completed.run.cardGrowUses,remainingActions:0,reloadContinue:true,routeOpened:true,oneTimeGrow:true,actions:completed.run.cardRest.actions,errors});
  }
  const report={passed:true,base,release,viewport:{width:740,height:333},realTouchHandlers:true,productionModules:true,expectedBaselineFailure:process.env.CAMP_EXPECT_FAILURE==='1',reports};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
  await b.shot(path.join(output,'failure.png'));
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error.stack),state:await snap(),errors:b.errors},null,2));throw error;
} finally { b.close();server.close(); }
