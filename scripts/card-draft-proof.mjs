import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {isInventoryOnlyCard} from '../dist/skill-cards.mjs';
import {chrome, until, delay} from './browser-probe.mjs';

const output = path.resolve('outputs/card-draft');
await fs.mkdir(output, {recursive: true});
const root = path.resolve('dist'), mime = {'.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.mp4':'video/mp4'};
const server = http.createServer(async (req, res) => {
  if (new URL(req.url, 'http://localhost').pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
  try {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) throw Error('Outside dist');
    const body = await fs.readFile(file);
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'}).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`, b = await chrome(['--mute-audio']), {ev, send} = b;
const key = 'cards-pilot:' + M.SAVE_KEY;
function fixture(final = false) {
  const state = M.newState(); state.profile.tutorialComplete = true; state.settings.skipTutorial = true;
  state.run = M.createRun(state.profile, final ? 'touch-final-draft' : 'touch-round-draft', 1, {cards:true});
  M.chooseStartingGift(state, M.getStartingGiftOffers(state.run)[0].id);
  const run = state.run;
  run.guardianRituals = [0,1,2];
  if (final) {
    run.mapIndex = 2;
    const node = run.map.at(-1).find(node => node.boss);
    Object.assign(run, {phase:'briefing', current:node, step:node.row, path:[]});
  } else M.selectNode(run, M.getChoices(run).find(node => node.type !== 'support').id);
  assert.ok(M.beginFlightAttempt(run)); assert.ok(M.markFlightAttemptStarted(run));
  assert.ok(M.finishFlight(run, {success:true, flame:50})); M.settleCheckpoint(state);
  return state;
}
const save = () => ev(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
async function size(width, height) {
  await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor:1, mobile:true});
  await send('Emulation.setTouchEmulationEnabled', {enabled:true, maxTouchPoints:1});
}
async function tap(selector) {
  const p = await ev(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Missing touch target '+${JSON.stringify(selector)});const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[p]});
  await send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]}); await delay(120);
}
async function open(state) {
  await b.visit(base + '/loading.html');
  await until(() => ev("document.readyState==='complete'"), 'origin');
  await ev(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(state))});localStorage.setItem('wispbound.save.condensed.v7','legacy-save-sentinel')`);
  await reload();
}
async function reload() {
  await b.visit(base + '/game.html?cards=1');
  await until(() => ev("!!document.querySelector('[data-action=continue-run]')"), 'saved game Continue', 120);
  await tap('[data-action=continue-run]');
}
try {
  const layouts = [];
  const state = fixture(), initial = M.getOwnedCards(state.run).map(card => card.instanceId).sort(), draft = M.getCardDraft(state.run);
  await size(915,412); await open(state);
  await until(() => ev("document.body.dataset.screen==='card-draft'"), 'draft screen');
  const expected = draft.offers.map(card => card.instanceId);
  for (const [width,height] of [[915,412],[740,333],[640,320]]) {
    await size(width,height); await delay(100);
    const layout = await ev(`(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return {cards:[...document.querySelectorAll('.card-draft-face>.skill-card')].map(rect),actions:[...document.querySelectorAll('.card-draft-option>button,.card-draft-screen>.card-heading>button')].map(rect),ids:[...document.querySelectorAll('.card-draft-face>.skill-card')].map(n=>n.dataset.cardInstance)}})()`);
    assert.deepEqual(layout.ids, expected);
    for (const r of [...layout.cards,...layout.actions]) assert.ok(r.x>=-1 && r.y>=-1 && r.right<=width+1 && r.bottom<=height+1, `${width}x${height} fits: ${JSON.stringify(r)}`);
    for (const r of layout.cards) assert.ok(r.height>r.width && r.height>150, 'Actual portrait card faces');
    for (const r of layout.actions) assert.ok(r.width>=43 && r.height>=43, '44px touch actions');
    await b.shot(path.join(output,`draft-${width}x${height}.png`)); layouts.push({width,height,...layout});
  }
  await size(915,412);
  await tap('.card-draft-face [data-card-term-trigger]');
  assert.ok(await ev("!!document.querySelector('dialog.card-term-dialog[open]')"), 'Draft card help works without choosing');
  await tap('dialog.card-term-dialog [data-card-term-close]');
  assert.equal((await save()).run.cardDraft.claimed, false);
  await reload(); await until(() => ev("document.body.dataset.screen==='card-draft'"), 'draft after reload');
  assert.deepEqual((await save()).run.cardDraft.offers.map(card => card.instanceId), expected, 'Reload never rerolls');
  assert.deepEqual(M.getOwnedCards((await save()).run).map(card=>card.instanceId).sort(), initial, 'No pre-credit on touch/read/reload');
  const chosen = draft.offers.find(card => !isInventoryOnlyCard(card));
  await tap(`[data-action=card-draft-pick][data-id="${chosen.instanceId}"]`);
  await until(() => ev("document.body.dataset.screen==='card-reward'"), 'won card loadout');
  let stored = await save();
  assert.equal(stored.run.cardReward.card.instanceId, chosen.instanceId);
  assert.equal(M.getOwnedCards(stored.run).length, initial.length+1);
  assert.ok(await ev(`!!document.querySelector('.card-reward-new [data-card-instance="${chosen.instanceId}"]')`));
  await reload(); await until(() => ev("document.body.dataset.screen==='card-reward'"), 'won card receipt after reload');
  assert.equal((await save()).run.cardHistory.filter(event=>event.type==='drop').length,1);
  await tap('[data-action=card-reward-equip]');
  await tap('[data-action=card-reward-slot][data-index="0"] .card-illustration');
  assert.equal((await save()).run.mountedCards[0].instanceId, chosen.instanceId, 'Real touch equips chosen card');
  await b.shot(path.join(output,'chosen-loadout.png'));
  await tap('[data-action=card-reward-continue]');
  assert.equal(await ev('document.body.dataset.screen'), 'map');
  assert.equal(await ev("localStorage.getItem('wispbound.save.condensed.v7')"), 'legacy-save-sentinel');

  const finalState = fixture(true), finalDraft = M.getCardDraft(finalState.run), hand = structuredClone(finalState.run.winningHand);
  await open(finalState); await until(() => ev("document.body.dataset.screen==='card-draft'"), 'final saved draft');
  assert.equal((await save()).run.banked, false);
  await tap('[data-action=card-draft-pick]');
  assert.ok(await ev("!!document.querySelector('.card-draft-trophy')"), 'Final pick has a trophy receipt');
  await reload(); await until(() => ev("!!document.querySelector('.card-draft-trophy')"), 'final receipt after reload');
  assert.equal((await save()).run.banked, false, 'Trophy acknowledgment stays reachable');
  assert.deepEqual((await save()).run.winningHand, hand);
  await b.shot(path.join(output,'final-trophy.png'));
  await tap('[data-action=card-reward-continue]');
  assert.ok(['victory','result'].includes(await ev('document.body.dataset.screen')), 'Boss relic/result flow follows the card');
  assert.equal((await save()).run.cardReward.card.instanceId, finalDraft.offers[0].instanceId);
  assert.deepEqual(b.errors, []); assert.deepEqual(b.badResponses, []);
  const report = {passed:true, layouts, checks:['three-portrait-faces','44px-touch-actions','card-help-no-claim','unclaimed-reload-stable','exactly-one-owned','won-card-reload','touch-equip','legacy-save-isolation','final-draft-before-banking','final-receipt-reload','winning-hand-preserved','boss-relic-flow'], output};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:true,checks:report.checks,output},null,2));
} finally {b.close(); await new Promise(resolve => server.close(resolve));}
