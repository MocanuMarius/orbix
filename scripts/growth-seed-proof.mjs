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

const accessOnly = process.argv.includes('--camp-access-only');
const out = path.resolve(accessOnly ? 'work/growth-seed-camp-access-proof' : 'work/growth-seed-proof');
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

const b = await chrome(['--mute-audio']), {ev, send} = b;
const reports = [], visuals = [];
const click = selector => ev(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
const wait = selector => until(() => ev(`!!document.querySelector(${JSON.stringify(selector)})`), selector, 150);
const current = () => ev('window.__growthProof.state()');
async function viewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled', {enabled:true,maxTouchPoints:1});
}
async function load(value) {
  await b.visit(base + '/loading.html');
  await until(() => ev("location.pathname==='/loading.html'"), 'fixture origin', 100);
  await ev(`localStorage.clear();localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(value)});localStorage.setItem('emberwing-muted','true')`);
  await b.visit(base + '/game.html?cards=1'); await wait('.front-new-button');
  await click('[data-action=continue-run]');
}
async function reload() {
  await b.visit(base + '/game.html?cards=1'); await wait('.front-new-button');
  await click('[data-action=continue-run]');
}
async function closeDeck() {
  if (await ev("!!document.querySelector('[data-action=card-reading-back]')")) await click('[data-action=card-reading-back]');
  if (await ev("!!document.querySelector('[data-action=card-collection-back]')")) await click('[data-action=card-collection-back]');
  await click('.card-close[data-action=close-sheet]'); await wait('.card-rest-screen');
}
async function growQuote(expected) {
  const quote = await ev(`(async()=>{const M=await import('./model.mjs?v=${release}');return M.getCardCampPreview(window.__growthProof.state().run).actions.find(c=>c.key==='grow')})()`);
  assert.equal(quote.disabled, false);
  assert.equal(formatGlow(quote.after.maxMeter - quote.before.maxMeter), String(expected));
  const text = await ev(`document.querySelector('.card-camp-choice [data-action=support][data-index="${quote.index}"]').closest('article').innerText`);
  assert.ok(text.includes(`${formatGlow(quote.before.maxMeter)} → ${formatGlow(quote.after.maxMeter)}`), text);
  assert.match(text, /No healing · Grow used 0\/3/);
  return quote;
}
try {
  await send('Network.setBypassServiceWorker', {bypass:true});
  if (accessOnly) {
    // Keep the actual earned Seed in reserve through this connected route.
    const arrival = structuredClone(earned.state); acknowledge(arrival);
    for (const id of earned.route.slice(earned.nextIndex)) {
      const node = arrival.run.map.flat().find(n => n.id === id);
      if (node.kind === 'camp') { assert.ok(M.selectNode(arrival.run, id)); break; }
      clear(arrival, node);
    }
    assert.equal(arrival.run.cardRest.growUnlocked, false);
    assert.ok(arrival.run.reserveCards.some(card => card.instanceId === earned.card.instanceId));
    arrival.run.lives = 1; arrival.run.flame = 20;
    await viewport(720,280); await load(serialized(arrival)); await wait('.card-rest-screen');
    const disabled = await ev(`(async()=>{const M=await import('./model.mjs?v=${release}');return M.getCardCampPreview(window.__growthProof.state().run).actions.find(c=>c.key==='grow')})()`);
    assert.equal(disabled.disabled, true); assert.equal(disabled.disabledReason, 'Equip a Growth Seed to Grow');
    assert.match(await ev("document.querySelector('.card-rest-screen').innerText"), /Equip a Growth Seed to Grow/);
    await b.shot(path.join(out,'reserve-seed-rest-720x280.png'));
    await click('.card-rest-screen [data-action=cards]'); await wait('.card-equipped-foreground');
    await click('[data-action=card-open-collection]'); await wait('.card-deck-browser');
    await click(`[data-action=card-select][data-id="${earned.card.instanceId}"]`); await wait('.card-deck-reading');
    await click('[data-action=card-equip]'); await wait('.card-deck-equipping');
    await click('[data-action=card-slot][data-index="2"]'); await wait('.card-equipped-foreground');
    assert.equal((await current()).run.mountedCards[2].instanceId, earned.card.instanceId);
    await click('.card-close[data-action=close-sheet]'); await wait('.card-rest-screen');
    const quote = await growQuote(3);
    assert.equal((await current()).run.cardRest.growUnlocked, false);
    await b.shot(path.join(out,'equipped-at-rest-720x280.png'));
    await reload(); await wait('.card-rest-screen'); await growQuote(3);
    assert.equal((await current()).run.cardRest.growUnlocked, false);
    await click(`[data-action=support][data-index="${quote.index}"]`);
    await until(() => ev("document.querySelector('.card-rest-screen')?.innerText.includes('Rest complete')"), 'same-visit Grow committed', 100);
    const settled = await current();
    assert.equal(settled.run.cardGrowUses, 1); assert.equal(settled.run.lives, 1);
    assert.equal(getGlowCapacity(settled.run), quote.after.maxMeter); assert.equal(settled.run.flame, quote.after.maxMeter);
    assert.deepEqual(settled.run.lastRest.actions, ['grow']);
    await b.shot(path.join(out,'same-visit-grow-complete-720x280.png'));
    await reload(); await wait('.card-rest-screen');
    assert.equal((await current()).run.cardGrowUses, 1);
    assert.equal(getGlowCapacity((await current()).run), quote.after.maxMeter);
    assert.deepEqual(b.errors, []);
    const report = { productionApp:true, muted:true, width:720, height:280,
      earnedReceiptUsesRealFinishFlight:true, earnedCard:earned.card, route:earned.route,
      arrivedWithSeedInReserve:true, legacyArrivalBit:false, disabledBeforeEquip:disabled,
      equippedThroughRealRestDeck:true, reloadWithFalseBitEnabled:true, growQuote:quote,
      oneCommittedGrow:true, refill:quote.after.maxMeter, hearts:1, reloadPreservesGrowth:true, errors:b.errors };
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({out, sameVisitEquipAndGrow:true, reloadWithFalseBitEnabled:true, errors:b.errors}));
  } else {
  await viewport(844,390);
  await load(serialized(earned.state)); await wait('.card-deck-receipt');
  assert.equal(await ev("document.querySelector('.card-deck-receipt .skill-card').dataset.cardHelp"), 'growth-seed-common');
  await b.shot(path.join(out,'earned-common-receipt-844x390.png'));
  await click('[data-action=card-reward-deck]'); await wait('.card-deck-reading');
  assert.equal(await ev("document.querySelector('[data-action=card-preview-improve]').disabled"), true);
  await click('[data-action=card-equip]'); await wait('.card-deck-equipping');
  await click('[data-action=card-slot][data-index="2"]'); await wait('.card-equipped-foreground');
  assert.equal((await current()).run.mountedCards[2].cardId,'growth-seed-common');
  await b.shot(path.join(out,'earned-common-equipped-844x390.png'));
  await click('.card-close[data-action=close-sheet]');

  // Continue the same connected route, using real flight settlement, to Rest.
  const equipped = await current(); acknowledge(equipped);
  for (const id of earned.route.slice(earned.nextIndex)) {
    const node = equipped.run.map.flat().find(n => n.id === id);
    if (node.kind === 'camp') { assert.ok(M.selectNode(equipped.run, id)); break; }
    clear(equipped, node);
  }
  equipped.run.lives = 1; equipped.run.flame = 20; equipped.run.condensedGlow = 250;
  M.getSupportChoices(equipped.run, equipped.profile);
  const arrival = serialized(equipped);
  await load(arrival); await wait('.card-rest-screen');
  const commonQuote = await growQuote(3);
  await click('.card-camp-help'); await wait('.card-term-dialog[open]');
  await click('[data-card-term-close]');
  await click('.card-rest-screen [data-action=cards]'); await wait('.card-equipped-foreground');
  await click('[data-card-glossary]'); await wait('.card-glossary-dialog[open]');
  await click('.card-glossary-dialog [data-card-term=grow]');
  const glossary = await ev("[...document.querySelectorAll('.card-term-dialog[open]')].at(-1).innerText");
  assert.match(glossary,/Common \+3, Rare \+5, Legendary \+8/); assert.match(glossary,/\+9 or \+10/); assert.match(glossary,/share 3 Grow actions/);
  await b.shot(path.join(out,'grow-glossary-844x390.png'));
  await click('.card-term-dialog:last-of-type [data-card-term-close]');
  await click('.card-glossary-dialog [data-card-term-close]'); await closeDeck();
  await b.shot(path.join(out,'earned-common-rest-844x390.png'));
  await click(`[data-action=support][data-index="${commonQuote.index}"]`);
  await until(() => ev("document.querySelector('.card-rest-screen')?.innerText.includes('Rest complete')"), 'Common Grow committed', 100);
  const grown = await current();
  assert.equal(grown.run.cardGrowUses, 1); assert.equal(grown.run.lives, 1);
  assert.equal(getGlowCapacity(grown.run), commonQuote.after.maxMeter); assert.equal(grown.run.flame, commonQuote.after.maxMeter);
  await reload(); await wait('.card-rest-screen');
  assert.equal(getGlowCapacity((await current()).run), commonQuote.after.maxMeter);
  assert.equal((await current()).run.cardGrowUses, 1);
  reports.push({earnedNormalFlight:true,campaignSeed:earned.state.run.campaignSeed,route:earned.route,earnedReceipt:earned.card,earnedDrops,commonFlightDropNumber:2,equippedThroughRealDeck:true,commonGrow:commonQuote,reloadPreservesCommonGrow:true,glossary});

  // Restore the same valid arrival to compare every upgrade through the UI.
  await load(arrival); await wait('.card-rest-screen');
  for (const [before, after, price] of [[3,5,25],[5,8,40],[8,9,40],[9,10,80]]) {
    await growQuote(before);
    await click('.card-rest-screen [data-action=cards]'); await wait('.card-equipped-foreground');
    await click('[data-action=card-slot][data-index="2"]'); await wait('.card-deck-reading');
    await click('[data-action=card-preview-improve]'); await wait('.card-improve-confirm');
    const pair = await ev("[...document.querySelectorAll('.card-improve-version')].map(n=>({text:n.innerText.replace(/\\s+/g,' '),rarity:n.querySelector('.skill-card').className}))");
    assert.match(pair[0].text,new RegExp('\\+' + before + ' maximum Sparks'));
    assert.match(pair[1].text,new RegExp('\\+' + after + ' maximum Sparks'));
    assert.match(await ev("document.querySelector('[data-action=card-confirm-improve]').textContent"),new RegExp(String(price)));
    await b.shot(path.join(out,`improve-${before}-to-${after}-844x390.png`));
    await click('[data-action=card-confirm-improve]'); await wait('.card-deck-reading'); await closeDeck();
    await growQuote(after);
    reports.push({upgrade:{before,after,price},actualConfirmation:true,actualCampQuote:true,pair});
  }
  await click('.card-rest-screen [data-action=cards]'); await wait('.card-equipped-foreground');
  await click('[data-action=card-slot][data-index="2"]'); await wait('.card-deck-reading');
  assert.equal(await ev("document.querySelector('[data-action=card-preview-improve]').textContent"),'Max rank');
  assert.equal(await ev("document.querySelector('[data-action=card-preview-improve]').disabled"),true);
  await closeDeck();
  const maximumQuote = await growQuote(10);
  await click(`[data-action=support][data-index="${maximumQuote.index}"]`); await wait('.card-rest-screen');
  assert.equal(getGlowCapacity((await current()).run),maximumQuote.after.maxMeter);

  // Explicit visual fixture, using production card faces and canonical frames.
  const tiers = structuredClone(equipped);
  tiers.run.mountedCards = ['growth-seed-common','growth-seed','growth-seed-legendary'].map((id,i)=>C.makeSkillCard(id,'visual:seed:'+i));
  tiers.run.cardGrowUses = 0; tiers.run.cardGrowCapacity = 0;
  for (const [width,height] of [[844,390],[720,280]]) {
    await viewport(width,height); await load(serialized(tiers)); await wait('.card-rest-screen');
    await click('.card-rest-screen [data-action=cards]'); await wait('.card-equipped-foreground');
    await ev('document.fonts.ready');
    const cards = await ev(`(()=>{const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return [...document.querySelectorAll('.card-equipped-face .skill-card')].map(card=>{const band=card.querySelector('.card-rule-band'),status=card.querySelector('.card-config-status'),help=card.querySelector('.card-help'),r=band.getBoundingClientRect();const text=[...band.querySelectorAll('.card-rule-stripe')].flatMap(n=>{const range=document.createRange();range.selectNodeContents(n);return [...range.getClientRects()];}).filter(r=>r.width&&r.height);return {id:card.dataset.cardHelp,classes:card.className,text:band.innerText,status:status.getAttribute('aria-label'),frame:getComputedStyle(card).borderImageSource,background:getComputedStyle(card).backgroundColor,ruleOverflow:band.scrollHeight-band.clientHeight,textOutside:text.some(t=>t.bottom>r.bottom+1||t.right>r.right+1),statusOverlap:text.some(t=>overlap(t,status.getBoundingClientRect())),helpOverlap:overlap(help.getBoundingClientRect(),status.getBoundingClientRect())};});})()`);
    assert.equal(cards.length,3);
    for (const [i,tier] of ['common','rare','legendary'].entries()) { assert.ok(cards[i].classes.includes('card-'+tier)); assert.match(cards[i].text.replace(/\s+/g,' '),new RegExp('\\+' + [3,5,8][i] + ' maximum Sparks')); assert.match(cards[i].text.replace(/\s+/g,' '),/3 shared Grow actions per journey/); }
    assert.deepEqual(cards.map(c=>c.background),['rgb(34, 53, 43)','rgb(28, 49, 41)','rgb(37, 35, 46)']);
    assert.ok(cards.every(c=>c.status.includes('Ready')&&c.ruleOverflow<=1&&!c.textOutside&&!c.statusOverlap&&!c.helpOverlap),JSON.stringify(cards));
    await b.shot(path.join(out,`seed-tiers-${width}x${height}.png`));
    visuals.push({width,height,cards});
  }
  tiers.run.cardGrowUses = 3;
  tiers.run.cardGrowCapacity = C.CARD_UNIT * 9;
  await load(serialized(tiers)); await wait('.card-rest-screen');
  await click('.card-rest-screen [data-action=cards]'); await wait('.card-equipped-foreground');
  const cappedStatuses = await ev("[...document.querySelectorAll('.card-equipped-face .card-config-status')].map(n=>n.getAttribute('aria-label'))");
  assert.ok(cappedStatuses.every(label=>label.includes('Grow limit reached')),JSON.stringify(cappedStatuses));
  await b.shot(path.join(out,'seed-tiers-shared-limit-720x280.png'));
  reports.push({allTiersRecognizeSharedThreeActionLimit:true,cappedStatuses});
  await load(arrival); await wait('.card-rest-screen');
  await growQuote(3);
  const campLayout = await ev(`(()=>{const tile=[...document.querySelectorAll('.card-camp-choice')].find(n=>n.querySelector('h3').textContent==='Grow'),note=tile.querySelector('.card-camp-note'),button=tile.querySelector('button'),r=note.getBoundingClientRect(),b=button.getBoundingClientRect();return {note:note.innerText,noteBottom:r.bottom,buttonTop:b.top,buttonBottom:b.bottom,viewportHeight:innerHeight,horizontalOverflow:document.documentElement.scrollWidth-innerWidth};})()`);
  assert.ok(campLayout.noteBottom <= campLayout.buttonTop && campLayout.buttonBottom <= campLayout.viewportHeight && campLayout.horizontalOverflow <= 1,JSON.stringify(campLayout));
  await b.shot(path.join(out,'earned-common-rest-720x280.png'));
  reports.push({earnedCommonCampAt720:campLayout});
  assert.deepEqual(b.errors,[]);
  const report={productionApp:true,muted:true,earnedReceiptUsesRealFinishFlight:true,syntheticTierVisualFixture:true,reports,visuals,errors:b.errors};
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({out,reports:reports.length,visuals,errors:b.errors}));
  }
} finally { b.close(); server.close(); }
