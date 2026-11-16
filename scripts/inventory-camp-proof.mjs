// Focused production-renderer proof: real earned Seed, real Deck/Rest handlers,
// and clearly separated three-tier presentation fixtures in disposable Chrome.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import * as C from '../dist/skill-cards.mjs';
import { getGlowCapacity, formatGlow } from '../dist/vitality.mjs';
import { chrome, until } from './browser-probe.mjs';

const out = path.resolve('work/inventory-camp-proof');
await fs.mkdir(out, { recursive: true });
const release = /src="app\.mjs\?v=([^"]+)"/.exec(await fs.readFile('dist/game.html', 'utf8'))[1];
const key = 'cards-pilot:wispbound.save.condensed.v7';
const types = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.ttf':'font/ttf', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.webmanifest':'application/manifest+json' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), file = path.resolve('dist', '.' + url.pathname);
    if (!file.startsWith(path.resolve('dist') + path.sep)) throw Error('Outside dist');
    let data = await fs.readFile(file);
    if (url.pathname === '/app.mjs') data = Buffer.from(data.toString() + '\nwindow.__growthProof={state:()=>state};\n');
    res.writeHead(200, { 'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' }).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;

function fresh(seed) {
  const s = M.newState();
  s.settings.skipTutorial = true; s.settings.sound = false; s.profile.tutorialComplete = true;
  s.run = M.createRun(s.profile, seed, 1, { cards:true });
  const offer = M.getStartingGiftOffers(s.run).find(g => g.cardId !== 'camp-kit');
  assert.ok(M.chooseStartingGift(s, offer.id));
  return s;
}
function campRoute(run) {
  const camp = run.map.flat().find(n => n.kind === 'camp'), route = [camp];
  let node = camp;
  while (node.row > 0) {
    node = run.map[node.row - 1].find(p => p.nextIds.includes(node.id));
    assert.ok(node, 'Camp route must be connected'); route.unshift(node);
  }
  return route;
}
function acknowledge(s) {
  const r = s.run;
  if (r.cardReward) r.cardReward.uiAcknowledged = true;
  if (r.flightReward && !r.flightReward.claimed) assert.ok(M.chooseFlightReward(s, r.flightReward.offers[0]));
  assert.ok(M.acknowledgeVictory(s));
}
function clear(s, node, leaveReceipt = false) {
  const r = s.run;
  assert.ok(M.selectNode(r, node.id), `Select connected node ${node.id}`);
  if (node.type === 'support') {
    assert.ok(M.resolveSupport(r, M.getSupportChoices(r, s.profile).findIndex(c => !c.disabled), s.profile));
  } else {
    assert.ok(M.beginFlightAttempt(r)); assert.ok(M.markFlightAttemptStarted(r));
    assert.ok(M.finishFlight(r, { success:true, flame:55, collected:4 }));
    M.settleCheckpoint(s);
    if (!leaveReceipt) acknowledge(s);
  }
}
function serialized(state) {
  let value;
  M.saveState(state, {setItem:(_key, text) => { value = text; }});
  return value;
}

// Find a deterministic ordinary route whose second Common flight reward is the
// early safeguard. Every receipt is earned through finishFlight, never injected.
let earned;
for (let i = 0; i < 200 && !earned; i++) {
  const s = fresh('growth-ui-earned-' + i), route = campRoute(s.run);
  let commonCount = 0;
  for (let j = 0; j < route.length - 1; j++) {
    const node = route[j]; clear(s, node, true);
    if (node.type !== 'support') {
      const card = M.getCardReward(s.run)?.card;
      if (card?.rarity === 'common') commonCount++;
      if (card?.cardId === 'growth-seed-common' && commonCount === 2 && !node.elite && !node.boss) {
        earned = {state:s, route:route.map(n => n.id), nextIndex:j + 1, card}; break;
      }
      acknowledge(s);
    }
  }
}
assert.ok(earned, 'Find second Common normal-flight Seed receipt');
assert.equal(earned.state.run.cardHistory.filter(e => e.type === 'drop' && e.card.rarity === 'common').length, 2);
const earnedDrops = earned.state.run.cardHistory.filter(e => e.type === 'drop');
assert.equal(earnedDrops.filter(e => e.card.kind === 'camp-grow').length,1);
assert.equal(earnedDrops.at(-1).card.cardId,'growth-seed-common');

const b = await chrome(['--mute-audio']), {ev,send}=b;
const click=selector=>ev(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
const wait=selector=>until(()=>ev(`!!document.querySelector(${JSON.stringify(selector)})`),selector,150);
const current=()=>ev('window.__growthProof.state()');
async function load(value){
  await b.visit(base+'/loading.html'); await until(()=>ev("location.pathname==='/loading.html'"),'fixture origin',100);
  await ev(`localStorage.clear();localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(value)});localStorage.setItem('emberwing-muted','true')`);
  await b.visit(base+'/game.html?cards=1');await wait('.front-new-button');await click('[data-action=continue-run]');
}
async function reload(){await b.visit(base+'/game.html?cards=1');await wait('.front-new-button');await click('[data-action=continue-run]');}
async function closeDeck(){
  if(await ev("!!document.querySelector('[data-action=card-reading-back]')"))await click('[data-action=card-reading-back]');
  if(await ev("!!document.querySelector('[data-action=card-collection-back]')"))await click('[data-action=card-collection-back]');
  await click('.card-close[data-action=close-sheet]');await wait('.card-rest-screen');
}
async function quote(){return ev(`(async()=>{const M=await import('./model.mjs?v=${release}');return M.getCardCampPreview(window.__growthProof.state().run).actions.find(c=>c.key==='grow')})()`);}
async function bounds(selector){return ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight}})()`);}
const reports=[];
try{
 await send('Network.setBypassServiceWorker',{bypass:true});
 for(const [width,height] of [[844,390],[720,280]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await load(serialized(earned.state));await wait('.card-reward-inventory');
  assert.equal(await ev("document.querySelectorAll('.card-deck-receipt [data-action=card-reward-equip],.card-deck-receipt [data-deck-drag-id],.card-deck-receipt [data-deck-drop]').length"),0);
  await b.shot(path.join(out,`earned-seed-reward-${width}x${height}.png`));
  await click('[data-action=card-reward-continue]');
  const arrival=structuredClone(earned.state);acknowledge(arrival);
  arrival.run.reserveCards.push(C.makeSkillCard('camp-kit','proof:inventory-ember'));
  for(const id of earned.route.slice(earned.nextIndex)){
    const node=arrival.run.map.flat().find(n=>n.id===id);
    if(node.kind==='camp'){assert.ok(M.selectNode(arrival.run,id));break;}clear(arrival,node);
  }
  arrival.run.lives=1;arrival.run.flame=20;arrival.run.condensedGlow=500;arrival.run.cardRest.growUnlocked=false;
  // Search an actual deterministic Forge sequence, without replacing its offer.
  for(let sequence=0;sequence<1000;sequence++){
    arrival.run.cardForgeCounts.rare=sequence;
    if(M.getCardForgePreview(arrival.run).card.cardId==='growth-seed')break;
  }
  assert.equal(M.getCardForgePreview(arrival.run).card.cardId,'growth-seed');
  await load(serialized(arrival));await wait('.card-rest-screen');
  assert.equal((await quote()).disabled,false);
  assert.equal((await current()).run.mountedCards.some(c=>C.isInventoryOnlyCard(c)),false);
  await b.shot(path.join(out,`inventory-rest-${width}x${height}.png`));
  await click('.card-rest-screen [data-action=cards]');await wait('.card-equipped-foreground');
  await click('[data-action=card-open-collection]');await wait('.card-deck-browser');
  assert.equal(await ev(`document.querySelectorAll('[data-deck-drag-id="${earned.card.instanceId}"]').length`),0);
  await click(`[data-action=card-select][data-id="${earned.card.instanceId}"]`);await wait('.card-deck-reading');
  assert.equal(await ev("document.querySelectorAll('.card-deck-reading [data-action=card-equip],.card-deck-reading [data-deck-drop]').length"),0);
  assert.match(await ev("document.querySelector('.card-read-location').innerText"),/In Deck · available at Rest/);
  await b.shot(path.join(out,`inventory-reader-${width}x${height}.png`));
  for(const [cardId,rank,amount,price] of [['growth-seed',1,5,25],['growth-seed-legendary',1,8,40],['growth-seed-legendary',2,9,40],['growth-seed-legendary',3,10,80]]){
    const improvementBefore=await current();
    await click('[data-action=card-preview-improve]');await wait('.card-improve-confirm');
    await click('[data-action=card-confirm-improve]');await wait('.card-deck-reading');
    const improvementAfter=await current(),seed=improvementAfter.run.reserveCards.find(c=>c.instanceId===earned.card.instanceId);
    assert.equal(seed.cardId,cardId);assert.equal(seed.rank,rank);assert.equal(C.describeSkillCard(seed).amount,amount);
    assert.equal(improvementAfter.run.condensedGlow,improvementBefore.run.condensedGlow-price);
    assert.equal(improvementAfter.run.cardGrowUses,0);assert.deepEqual(improvementAfter.run.cardRest.actions,[]);
    assert.equal(await ev("document.querySelectorAll('[data-action=card-equip]').length"),0);
    await b.shot(path.join(out,`inventory-seed-${amount}-${width}x${height}.png`));
  }
  await closeDeck();
  await click('.card-rest-screen [data-action=card-preview-forge]');await wait('.card-forge-preview');
  assert.match(await ev("document.querySelector('.card-forge-preview').innerText"),/Available at Rest directly from your Deck/);
  const forgeBefore=await current();await click('[data-action=card-confirm-forge]');await wait('.card-forge-receipt');
  const forged=await current();assert.equal(forged.run.condensedGlow,forgeBefore.run.condensedGlow-30);
  assert.deepEqual(forged.run.cardRest.actions,[]);
  await click('[data-action=card-forge-view]');await wait('.card-deck-reading');
  assert.equal(await ev("document.querySelectorAll('[data-action=card-equip]').length"),0);
  await click('[data-action=card-reading-back]');await wait('.card-forge-preview');
  await click('[data-action=card-forge-back]');await wait('.card-rest-screen');
  const before=await current(),grow=await quote();
  await click(`[data-action=support][data-index="${grow.index}"]`);await wait('.card-grow-confirm');
  const reviewText=await ev("document.querySelector('.card-grow-confirm').innerText");
  assert.match(reviewText,/Uses 1 Rest action and 1 shared Grow action/);
  const confirmBounds=await bounds('[data-action=card-confirm-grow]');
  assert.ok(confirmBounds.left>=0&&confirmBounds.right<=width&&confirmBounds.top>=0&&confirmBounds.bottom<=height,JSON.stringify(confirmBounds));
  await b.shot(path.join(out,`grow-confirm-${width}x${height}.png`));
  assert.equal((await current()).run.cardGrowUses,0);
  await click('[data-action=card-cancel-grow]');await wait('.card-rest-screen');
  assert.equal((await current()).run.cardGrowUses,0);
  assert.equal((await current()).run.reserveCards.find(c=>c.instanceId==='proof:inventory-ember').charges,1);
  await click(`[data-action=support][data-index="${grow.index}"]`);await wait('.card-grow-confirm');
  await click('[data-action=card-confirm-grow]');await wait('.card-rest-screen');
  const grown=await current();assert.equal(grown.run.cardGrowUses,1);assert.equal(grown.run.lives,1);
  assert.equal(getGlowCapacity(grown.run),grow.after.maxMeter);assert.equal(grown.run.flame,grow.after.maxMeter);
  assert.equal(grown.run.reserveCards.find(c=>c.instanceId==='proof:inventory-ember').charges,1);
  await reload();await wait('.card-rest-screen');
  const reloaded=await current();assert.equal(reloaded.run.cardGrowUses,1);assert.equal(getGlowCapacity(reloaded.run),grow.after.maxMeter);
  const slot=await ev(`(async()=>{const M=await import('./model.mjs?v=${release}');return M.getCardCampPreview(window.__growthProof.state().run).actions.find(c=>c.key==='slot')})()`);
  await click(`[data-action=support][data-index="${slot.index}"]`);
  await until(()=>ev("document.querySelector('.card-rest-screen')?.innerText.includes('Rest complete')"),'second action',100);
  const settled=await current();assert.deepEqual(settled.run.lastRest.actions,['grow','slot']);
  assert.equal(settled.run.reserveCards.some(c=>c.instanceId==='proof:inventory-ember'),false);
  await b.shot(path.join(out,`rest-complete-${width}x${height}.png`));
  await reload();await wait('.card-rest-screen');assert.equal((await current()).run.reserveCards.some(c=>c.instanceId==='proof:inventory-ember'),false);
  reports.push({width,height,realEarnedSeed:earned.card,inventoryGrow:true,noEquipOrDrag:true,forgeSeed:true,evolutionAndAllLegendaryRanks:true,forgeUsesNoRestAction:true,growReview:reviewText,cancelPreservesUses:true,confirmedGrow:grow,secondEmberOnlySpentOnSecondSuccess:true,reloadPreservesGrowthAndConsumedEmber:true,confirmBounds});
 }
 assert.deepEqual(b.errors,[]);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({productionApp:true,muted:true,reports,errors:b.errors,badResponses:b.badResponses},null,2)+'\n');
 console.log(JSON.stringify({out,viewports:reports.map(({width,height})=>`${width}x${height}`),errors:b.errors}));
}finally{b.close();await new Promise(resolve=>server.close(resolve));}
