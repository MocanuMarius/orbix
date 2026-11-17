import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard, isInventoryOnlyCard} from '../dist/skill-cards.mjs';
import {chrome, until, delay} from './browser-probe.mjs';

// Real campaign model transitions and saved games, never the disposable mock.
const root = path.resolve(process.argv.find(a => a.startsWith('--root='))?.slice(7) || 'dist');
const output = path.resolve('outputs/reward-ceremony');
await fs.mkdir(output, {recursive:true});
const mime = {'.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.ttf':'font/ttf', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.webmanifest':'application/manifest+json'};
const server = http.createServer(async (req,res) => {
  if (new URL(req.url,'http://localhost').pathname === '/favicon.ico') return res.writeHead(204).end();
  if (new URL(req.url,'http://localhost').pathname === '/__dev-revision') return res.writeHead(200,{'Content-Type':'text/plain'}).end('ceremony-probe-stable');
  try {
    const file = path.resolve(root,'.' + new URL(req.url,'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) throw Error('Outside dist');
    const bytes = await fs.readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'}).end(bytes);
  } catch {res.writeHead(404).end();}
});
await new Promise(r => server.listen(0,'127.0.0.1',r));
const base = `http://127.0.0.1:${server.address().port}`, b = await chrome(['--mute-audio']), {ev,send} = b;
const key = 'cards-pilot:' + M.SAVE_KEY, checks = [], layouts = [], countUpSamples = [];
let lastTap;
const save = () => ev(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
const stage = () => ev("document.querySelector('.flight-reward-ceremony')?.dataset.stage");
const untilStage = expected => until(async () => (await stage()) === expected, `ceremony ${expected}`,100);
const owned = run => M.getOwnedCards(run).map(c => c.instanceId).sort();
const economy = state => ({wallet:state.run.condensedGlow, pending:state.run.pendingCondensedGlow, receipts:state.run.cardClearReceipts, progress:state.profile.cardProgressReceipts, capacity:state.profile.cardFutureCapacity, drops:state.run.cardHistory.filter(e=>e.type==='drop').length});
function fixture(reducedMotion = false, elite = false) {
  const state = M.newState(); state.profile.tutorialComplete = true; state.settings.skipTutorial = true; state.settings.reducedMotion = reducedMotion;
  state.run = M.createRun(state.profile,`ceremony-${reducedMotion}-${elite}`,1,{cards:true});
  assert.ok(M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id));
  const r = state.run;
  r.mountedCards = ['growth-ring','wayfarers-purse','body-spark'].map((id,i) => makeSkillCard(id,`ceremony-mounted-${i}`));
  const node = M.getChoices(r).find(n => n.type !== 'support'); node.elite = elite;
  assert.ok(M.selectNode(r,node.id)); assert.ok(M.beginFlightAttempt(r)); assert.ok(M.markFlightAttemptStarted(r));
  assert.ok(M.finishFlight(r,{success:true,flame:53,collected:5,bodyPickups:3,collectorPickups:2})); M.settleCheckpoint(state);
  assert.equal(M.getCardDraft(r).offers.length,3);
  return state;
}
async function size(width,height) {
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
}
async function tap(selector, wait = 100) {
  const point = await ev(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Missing '+${JSON.stringify(selector)});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  lastTap = {selector,point,hit:await ev(`document.elementFromPoint(${point.x},${point.y})?.outerHTML?.slice(0,400)`)};
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); if (wait) await delay(wait);
}
async function reload() {
  await b.visit(base+'/game.html?cards=1');
  await until(() => ev("!!document.querySelector('[data-action=continue-run]')"),'saved game',120);
  await tap('[data-action=continue-run]',0);
  await until(() => ev("document.body.dataset.screen!=='home'"),'continued saved game',100);
}
async function open(state) {
  await b.visit(base+'/loading.html');
  await until(() => ev("location.pathname==='/loading.html'&&document.readyState==='complete'"),'isolated origin',80);
  await ev(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(state))});localStorage.setItem(${JSON.stringify(M.SAVE_KEY)},'legacy-save-sentinel')`);
  await reload();
}
async function screenshot(name) {await ev('document.fonts.ready'); await b.shot(path.join(output,name+'.png'));}
async function layout(width,height,expectedStage) {
  await size(width,height); await delay(80);
  const geometry = await ev(`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return {stage:document.querySelector('.flight-reward-ceremony')?.dataset.stage,screen:document.body.dataset.screen,cards:[...document.querySelectorAll('.card-draft-face>.skill-card')].map(rect),buttons:[...document.querySelectorAll('.flight-reward-ceremony button')].filter(n=>!n.disabled&&n.getBoundingClientRect().width&&getComputedStyle(n).visibility!=='hidden').map(n=>({action:n.dataset.action,scrollRegion:!!n.closest('[data-receipt-scroll]'),...rect(n)})),body:{width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,height:document.documentElement.clientHeight,scrollHeight:document.documentElement.scrollHeight}}})()`);
  assert.equal(geometry.stage,expectedStage);
  for (const r of [...geometry.cards,...geometry.buttons.filter(n=>!n.scrollRegion)]) assert.ok(r.x>=-1&&r.y>=-1&&r.right<=width+1&&r.bottom<=height+1,`${width}x${height} ${expectedStage}: ${JSON.stringify(r)}`);
  for (const r of geometry.buttons.filter(n=>n.action&&!n.action.includes('term'))) assert.ok(r.width>=43&&r.height>=43,`44px ${r.action}: ${JSON.stringify(r)}`);
  layouts.push({width,height,...geometry}); await screenshot(`${expectedStage}-${width}x${height}`);
}
try {
  await send('Network.setBypassServiceWorker',{bypass:true});
  await size(900,405); const automatic = fixture(); await open(automatic); await untilStage('income');
  const expectedAutomatic = economy(automatic);
  for(let attempt=0;attempt<60&&await stage()==='income';attempt++){
    countUpSamples.push(await ev("({income:Number(document.querySelector('[data-ceremony-income]')?.textContent),wallet:Number(document.querySelector('[data-ceremony-wallet]')?.textContent)})"));
    assert.deepEqual(economy(await save()),expectedAutomatic,'Visual count-up never changes settled economics');
    await delay(70);
  }
  assert.equal(await stage(),'income','A finished count waits for a player tap');
  for (const [w,h] of [[900,405],[667,300]]) await layout(w,h,'income');
  await tap('[data-action=flight-reward-continue]'); await untilStage('pack');
  assert.ok(countUpSamples.length>3,'Normal count-up provides observable feedback');
  assert.ok(countUpSamples.every((v,i)=>i===0||v.income>=countUpSamples[i-1].income&&v.wallet>=countUpSamples[i-1].wallet),'Displayed income and wallet rise monotonically');
  assert.ok(new Set(countUpSamples.map(v=>v.income)).size>2,'Income visibly counts upward');
  assert.ok(new Set(countUpSamples.map(v=>v.wallet)).size>2,'Wallet visibly receives the earned amount');
  assert.equal(Number(await ev("document.querySelector('[data-ceremony-wallet]').textContent")),expectedAutomatic.wallet);
  checks.push('automatic-income-count-up','wallet-count-up','animation-no-economic-writes');
  const s = fixture(), expectedEconomy = economy(s), initialOwned = owned(s.run), expectedOffers = s.run.cardDraft.offers.map(c=>c.instanceId);
  await size(900,405); await open(s); await untilStage('income');
  assert.equal(await ev("document.querySelectorAll('[data-action=card-draft-pick]').length"),0,'No cards can be selected during count-up');
  await screenshot('income-900x405');
  await reload(); await untilStage('income');
  assert.deepEqual(economy(await save()),expectedEconomy,'Reload during count-up cannot re-credit the clear');
  const skipStarted = Date.now();
  await tap('[data-action=flight-reward-continue]'); await untilStage('pack');
  assert.ok(Date.now()-skipStarted<650,'Continue immediately reveals the sealed pack');
  assert.equal(Number(await ev("document.querySelector('[data-ceremony-wallet]').textContent")),expectedEconomy.wallet,'Displayed wallet ends at saved balance');
  assert.deepEqual(economy(await save()),expectedEconomy,'Presentation and skip cannot re-credit settlement');
  assert.deepEqual(owned((await save()).run),initialOwned,'Pack is unopened and unowned');
  for (const [w,h] of [[900,405],[667,300]]) await layout(w,h,'pack');
  await delay(1500); assert.equal(await stage(),'pack','Waiting never opens the pack automatically');
  await reload(); await untilStage('pack');
  assert.deepEqual(economy(await save()),expectedEconomy,'Reload during sealed pack cannot duplicate currency or growth');
  await tap('[data-action=flight-reward-open-pack]',0);
  await untilStage('cards');
  // An immediate second activation represents the compatibility click that can
  // follow touchend; no newly exposed card may consume that opening gesture.
  await ev("document.querySelector('[data-action=card-draft-pick]')?.click()");
  assert.equal((await save()).run.cardDraft.claimed,false,'Opening gesture cannot choose a card');
  await delay(500);
  assert.deepEqual(owned((await save()).run),initialOwned,'Opening only reveals offers');
  for (const [w,h] of [[667,300],[900,405]]) await layout(w,h,'cards');
  assert.equal(await ev("document.querySelectorAll('.card-draft-face>.skill-card').length"),3);
  await reload(); await untilStage('cards'); await delay(500);
  assert.deepEqual((await save()).run.cardDraft.offers.map(c=>c.instanceId),expectedOffers,'Reload preserves all three offers');
  assert.deepEqual(economy(await save()),expectedEconomy);
  const selected = s.run.cardDraft.offers.find(c=>!isInventoryOnlyCard(c));
  await tap(`[data-action=card-draft-pick][data-id="${selected.instanceId}"]`);
  await until(() => ev("document.body.dataset.screen==='card-reward'"),'one chosen receipt',100);
  let stored = await save();
  assert.equal(stored.run.cardDraft.chosen,selected.instanceId);
  assert.equal(owned(stored.run).length,initialOwned.length+1);
  assert.deepEqual(owned(stored.run),[...initialOwned,selected.instanceId].sort());
  assert.equal(stored.run.cardHistory.filter(e=>e.type==='drop').length,1);
  await screenshot('one-chosen-900x405');
  await reload(); await until(() => ev("document.body.dataset.screen==='card-reward'"),'selected receipt reload',100);
  stored = await save(); assert.equal(stored.run.cardHistory.filter(e=>e.type==='drop').length,1); assert.equal(stored.run.condensedGlow,expectedEconomy.wallet);
  await tap('[data-action=card-reward-continue]'); assert.equal(await ev('document.body.dataset.screen'),'map');
  assert.equal(await ev(`localStorage.getItem(${JSON.stringify(M.SAVE_KEY)})`),'legacy-save-sentinel');
  checks.push('income-hidden-offers','income-reload-no-double-settlement','explicit-continue-to-pack','completed-count-waits-for-tap','no-auto-open','sealed-reload-no-double-settlement','touch-open-no-accidental-pick','three-saved-offers','revealed-reload-stable','exactly-one-owned','chosen-reload-one-drop','real-return-to-map','legacy-save-isolation');

  await size(667,300); const reduced = fixture(true); await open(reduced); await untilStage('income'); await delay(500); assert.equal(await stage(),'income'); await tap('[data-action=flight-reward-continue]'); await untilStage('pack');
  assert.equal(await ev("document.documentElement.dataset.reducedMotion"),'true');
  assert.equal(await ev("document.querySelectorAll('[data-action=card-draft-pick]').length"),0);
  assert.deepEqual(economy(await save()),economy(reduced)); await screenshot('reduced-pack-667x300');
  await tap('[data-action=flight-reward-open-pack]'); await untilStage('cards'); await delay(500);
  assert.equal((await save()).run.cardDraft.claimed,false); await screenshot('reduced-cards-667x300');
  checks.push('reduced-motion-keeps-explicit-pack','reduced-motion-stable-economy');

  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await open(fixture()); await untilStage('income'); await tap('[data-action=flight-reward-continue]'); await untilStage('pack');
  assert.equal(await ev("document.querySelectorAll('[data-action=card-draft-pick]').length"),0,'System reduced motion retains a sealed pack');
  checks.push('system-reduced-motion-keeps-explicit-pack');
  await send('Emulation.setEmulatedMedia',{features:[]});

  // Elite artifact choices retain their existing place after the card receipt.
  await size(900,405); const elite = fixture(true,true); await open(elite); await untilStage('income'); await tap('[data-action=flight-reward-continue]'); await untilStage('pack');
  await tap('[data-action=flight-reward-open-pack]'); await untilStage('cards'); await delay(500);
  await tap('[data-action=card-draft-pick]'); await until(() => ev("document.body.dataset.screen==='card-reward'"),'elite selected card',100);
  await tap('[data-action=card-reward-continue]');
  assert.equal(await ev('document.body.dataset.screen'),'victory');
  assert.equal((await save()).run.flightReward.claimed,false); await screenshot('elite-artifact-after-card');
  checks.push('elite-artifact-flow-preserved');
  assert.deepEqual(b.errors,[]); assert.deepEqual(b.badResponses,[]);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({passed:true,root,checks,layouts,countUpSamples,expectedEconomy,errors:b.errors,badResponses:b.badResponses,serviceWorkerBypassed:true},null,2));
  await fs.rm(path.join(output,'failure.json'),{force:true}); await fs.rm(path.join(output,'failure.png'),{force:true});
  console.log(JSON.stringify({passed:true,checks,output},null,2));
} catch(error) {
  await screenshot('failure').catch(()=>{});
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),stack:error.stack,lastTap,layouts,stage:await stage().catch(()=>null),save:await save().catch(()=>null),errors:b.errors,badResponses:b.badResponses},null,2));
  throw error;
} finally {b.close(); await new Promise(r=>server.close(r));}
