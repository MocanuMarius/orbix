// The Chain and Deck screens (v2.3-deck, approved 2026-11-17), built from the approved design-lab preview
// (dist/design-lab/deck.mjs › runV21). Two tabs on one sheet:
//   CHAIN: the cards that fire, on a track, with a plate under each card (chain-model.mjs), the Triggers
//          that fire this chain as glossary keywords, Play, Swap / Add (pick mode) and drag to trade slots.
//   DECK:  every owned card in one grid (In your chain / Not in chain / Rest cards), rarity chips and sort;
//          the eye opens the real card, where "Put in chain…" and "Melt…" live.
// This module draws and handles everything that does not change the save. Every real change (equip, swap,
// take out, Melt, Workshop) goes through the `actions` the app passes in, which call the model's own
// transactions and then reopen the sheet; the view state object survives that reopen.
import {CARD_SYSTEM, getMountedCards, describeSkillCard, getCardChargeCapacity} from '../skill-cards.mjs?v=beat-1';
import {getOwnedCards, getUnseenCardIds} from '../model.mjs?v=beat-1';
import {uiIcon} from '../ui-icons.mjs?v=beat-1';
import {wispChipText} from '../start-bonus.mjs?v=beat-1';
import {cardFace, cardArt, getCardFaceAvailability} from '../card-ui.mjs?v=beat-1';
import {getEquippedCardStatuses} from '../card-status.mjs?v=beat-1';
import {glowGaugeMarkup, glowGaugeUnits} from '../glow-ui.mjs?v=beat-1';
import {cardTileLine, SPARK_ICON_SRC, WISP_ORB_SRC} from '../card-tile-lines.mjs?v=beat-1';
import {LIFT_KIND, resolveChain, slotInfo, hereLine, fullRuleText, plateWords, whenOf, markOf, TRIGGER_BY, triggerName, RARITY_WORD, rarityOf, nameOf, shortName, isRest, num, METER_MAX, START_FLAME,
  chipOf, triggerBook, enginePlate, holeTally} from './chain-model.mjs?v=beat-1';
import {triggerIcon, pixelArt, CHEVRON, gem, EYE, WARN, PLUS, NEXT, FIRE, medalUrl, frameVars, chipBadge, chipIcon, rarityPips, TIMER_MARK} from './trigger-icons.mjs?v=beat-1';
import {CARD_TRIGGERS} from '../card-rule-bands.mjs?v=beat-1';
import {triggerLabel, triggerTermKey} from '../card-trigger-labels.mjs';
import {CARD_TERMS} from '../card-terms.mjs?v=beat-1';
import {SKILL_CARDS} from '../skill-cards.mjs?v=beat-1';
import {isDevourCard} from '../card-black-hole.mjs?v=beat-1';
import {simulateEngineChain, engineStarts} from '../card-engine.mjs?v=beat-1';
import {GLOW_DISPLAY_SCALE} from '../vitality.mjs?v=beat-1';
import {slotInscriptionId, slotInscriptionList, slotEntry} from '../inscriptions.mjs?v=beat-1';
import {inscriptionEffect} from '../inscription-on-card.mjs?v=beat-1';
import {inscriptionBrand, inscriptionFrame, inscriptionBlock, inscriptionSheetMarkup} from '../inscription-ui.mjs?v=beat-1';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const SPARK_SRC = SPARK_ICON_SRC;
const SPARK_IMG = `<img class="dc-spark" src="${SPARK_SRC}" width="16" height="16" alt="" draggable="false">`;
const SHORT_QUERY = '(max-height:380px)';
const NEW_BADGE = '<b class="dk2-new" data-new>NEW</b>';
const RANK = {legendary: 0, rare: 1, common: 2};

/** The screen's own state. It belongs to the open Deck only; nothing here enters a save. */
export function createDeckView() {
  return {tab: 'chain', pick: null, placing: null, filter: 'all', sort: 'rarity', trigger: null, liftFalling: true, liftCue: true, reading: null, readingReturn: null,
    melting: null, insSheet: null, note: '', noteTone: '', scroll: 0, focus: null, announce: '', bookFrom: 'chain', menu: false, shown: []};
}

// ── Data ─────────────────────────────────────────────────────────────────────
function deckData(run, view) {
  const slots = Math.max(0, Number(run?.cardSlots) || (run?.mountedCards || []).length);
  const row = Array.from({length: slots}, (_, i) => run?.mountedCards?.[i] || null);
  const printed = getMountedCards(run);
  const owned = getOwnedCards(run);
  const raw = [...row.filter(Boolean), ...(run?.reserveCards || [])];
  const byUid = uid => raw.find(c => c?.instanceId === uid) || null;
  const ownedOf = uid => owned.find(c => c.instanceId === uid) || null;
  const chain = resolveChain(row, view.trigger, slotInscriptionList(run, row), {liftFalling: true, liftCue: true});
  view.trigger = chain.trigger;
  let statuses = [];
  try {statuses = getEquippedCardStatuses(run);} catch {statuses = [];}
  const unseen = new Set(getUnseenCardIds(run).filter(id => raw.some(c => c?.instanceId === id)));
  return {run, row, printed, owned, raw, unseen, byUid, ownedOf, chain, statuses, slotOf: c => row.indexOf(c), reserve: (run?.reserveCards || []).filter(Boolean)};
}
const usesOf = c => Number.isFinite(c?.charges) ? {now: c.charges, max: getCardChargeCapacity(c)} : null;
const shortScreen = () => typeof matchMedia === 'function' && matchMedia(SHORT_QUERY).matches;

// ── Pieces ───────────────────────────────────────────────────────────────────
const eyeBtn = (attrs, label) => `<button type="button" class="dk2-btn dk21-eye" ${attrs} aria-haspopup="dialog" aria-label="${esc(label)}"><span class="dk21-eyebody">${EYE}</span></button>`;
/** A Trigger as a glossary keyword: tapping the word opens the game's glossary entry (card-terms.mjs). */
function termBtn(kind, {icon = true, cls = '', glossary = true} = {}) {
  const term = TRIGGER_BY[kind]?.term;
  const help = glossary && term ? `data-card-term="${esc(term)}" aria-haspopup="dialog" aria-label="${esc(triggerName(kind))}: what it means"` : `aria-label="${esc(triggerName(kind))}"`;
  return `<button type="button" class="dk2-btn dk22-term ${cls}" data-term="${esc(kind)}" ${help}>${icon ? triggerIcon(kind, 16) : ''}<span class="dk22-word">${esc(triggerName(kind))}</span></button>`;
}
/** A Trigger chip as a glossary keyword (chips that are not a flight event too: Card Pulse, Pack, Passive...). */

/** The spoken chip: "Trigger: Collect. ", "Role: Boost. ", or nothing when the card shows no chip. */
const chipWord = chip => chip?.label ? `${chip.kind === 'role' ? 'Role' : 'Trigger'}: ${chip.label}. ` : '';
function chipTermBtn(id, {icon = true, cls = '', size = 16} = {}) {
  const label = triggerLabel(id, CARD_TRIGGERS[id]?.label || id), term = triggerTermKey(id);
  const help = CARD_TERMS[term] ? `data-card-term="${esc(term)}" aria-haspopup="dialog" aria-label="${esc(label)}: what it means"` : `aria-label="${esc(label)}"`;
  return `<button type="button" class="dk2-btn dk22-term ${cls}" data-chip="${esc(id)}" ${help}>${icon ? chipIcon(id, size) : ''}<span class="dk22-word">${esc(label)}</span></button>`;
}
/** Engine cards that pass events along (the ones a circle is made of); Pack, Black Hole and governors are not. */
const passesEvents = c => {const s = SKILL_CARDS[c?.cardId]?.engine;return !!s && s.family !== 'pack' && (s.does?.includes('pulse') || !!s.timer || (s.hears || []).some(h => ['pulse', 'gain'].includes(h)));};
/** The engine view of a Chain: a circle (Timer), "runs once", or nothing to show. */
function engineView(chain) {
  const e = chain.engine;
  if (!e) return null;
  const loop = !e.runsOnce && (e.returns.length || e.timers.length);
  const once = e.runsOnce && chain.row.filter(passesEvents).length > 0;
  if (!loop && !once) return null;
  const from = e.returns.length ? e.returns[0] : e.timers[0];
  const metronome = loop && !e.returns.length;
  return {loop: !!loop, once, from, to: loop ? (metronome ? from + 1 : 0) : -1, metronome, perTurn: e.sparksPerTurn, per10: e.turnsPer10s, starts: e.starts || []};
}
const inert = html =>html.replace(/<button type="button"/g, '<span').replace(/<\/button>/g, '</span>').replace(/ aria-haspopup="dialog"/g, '').replace(/: help"/g, '"');

function plateHTML(info) {
  const n = num;
  if (info.kind === 'waits') return `<span class="dk23-waits"><small class="pl-long">Waits for</small><span class="dk23-wline">${triggerIcon(info.waits, 16)}<b class="pl-long">${esc(info.waitLabel || triggerName(info.waits))}</b><b class="pl-short">Waits</b></span></span>`;
  if (info.kind === 'spent') return '<b class="pl-long">Uses spent</b><b class="pl-short">Spent</b>';
  if (info.role === 'repeat-paid') return `<b class="pl-long">Repeats ×${info.paid.count}: +${n(info.paid.amount)}</b><b class="pl-short">×${info.paid.count}: +${n(info.paid.amount)}</b>`;
  if (info.role === 'mul' && info.m2) return `<b>×${n(info.step.multiplier)}</b><span class="dk23-m2"><b>· ×${n(info.m2)}</b><small>Encore</small></span>`;
  if (info.kind === 'idle') return `<i class="dk2-warn">${WARN}</i><b class="pl-long">No effect here</b><b class="pl-short">No effect</b>`;
  if (info.role === 'repeat') return `<b class="pl-long">Repeats next</b><b class="pl-short">Repeats</b><i class="pl-short dk2-next">${NEXT}</i>`;
  if (info.role === 'add' && info.changed) return `<span class="dk22-old"><span class="dk-sr">was </span>+${n(info.base)}</span><b class="dk22-new">+${n(info.eff)}</b>`;
  if (info.role === 'encore') return '<b class="pl-long">Encore: again</b><b class="pl-short">Again</b>';
  return `<b>${esc(info.plate)}</b>`;
}

// ── Chain tab ────────────────────────────────────────────────────────────────
function stationsHTML(d, view, opts) {
  const {row, printed, chain} = d;
  const placing = view.placing ? d.byUid(view.placing) : null;
  const editable = !opts.locked;
  return row.map((c, i) => {
    const info = chain.infos[i], col = `grid-column:${i + 2}`, lit = placing ? ' dk2-lit' : '';
    const notch = `<div class="dk2-anchor dk2-notch" style="${col}" aria-hidden="true"><i></i></div>`;
    const swap = editable ? `<button type="button" class="wb-sign wb-sign-quiet dk2-swap dk21-swap" data-slot="${i}" style="${col}" aria-label="${c ? `Swap ${esc(nameOf(c))} in slot ${i + 1} for another card` : `Add a card to slot ${i + 1}`}"><span class="wb-sign-text"><b>${c ? 'Swap' : 'Add'}</b></span></button>` : '';
    let insId = slotInscriptionId(d.run, i), insMark = insId ? inscriptionFrame(insId) + inscriptionBrand(i, insId, slotEntry(d.run, i)) : '', insClass = insId ? ' dk2-inscribed' : '';
    // JOB I: an Inscription that does nothing for the card in its slot wears the warning mark.
    const insIdle = insId && c && !inscriptionEffect(insId, c).works;
    if (insIdle) insClass += ' dk2-ins-idle';
    if (!c) {
      return `<div class="dk2-station dk2-empty${insClass}${lit}" data-slot="${i}" style="${col}"><span class="dk2-eyerow"></span>
        <button type="button" class="dk2-btn dk2-card dk2-addcard" data-slot="${i}" ${editable ? '' : 'aria-disabled="true"'} aria-label="${placing ? `Put ${esc(nameOf(placing))} in slot ${i + 1}` : editable ? `Slot ${i + 1} is empty. Add a card` : `Slot ${i + 1} is empty`}"><span class="dk2-addskin">${PLUS}<b>${placing ? 'Put here' : editable ? 'Add a card' : 'Empty slot'}</b></span></button>
        <span class="dk2-plate dk2-plate-empty" aria-hidden="true"></span>${insMark}</div>${notch}${swap}`;
    }
    const mark = markOf(c);
    const availability = getCardFaceAvailability(d.run, printed[i], d.statuses[i]);
    // Engine wording, Black Hole's meal and its victim replace the ordinary plate (chain-model.mjs › enginePlate).
    const meal = chain.blackHole?.find(m => m.slot === i), hole = isDevourCard(c);
    const holeMeal = hole ? chain.blackHole?.find(m => m.holeSlot === i) : null;
    const eng = !meal && !hole && chain.engine ? enginePlate(chain.row, i) : null;
    const special = meal ? {cls: 'dk-plate-wine', long: 'Eaten at take-off', short: 'Eaten'} : hole ? (holeMeal ? {cls: 'dk-plate-hole', long: 'Eats the next card', short: 'Eats next'} : {cls: 'dk-plate-hole', long: 'Nothing to eat', short: 'Nothing'}) : eng ? {cls: 'dk-plate-eng', ...eng} : null;
    const words = special ? special.long : plateWords(info);
    const label = placing ? `Put ${nameOf(placing)} in slot ${i + 1}. ${nameOf(c)} goes back to the Deck`
      : `Slot ${i + 1}: ${nameOf(c)}, ${RARITY_WORD[rarityOf(c)]}. ${chipWord(chipOf(c))}${special ? words : `On ${triggerName(chain.trigger)}: ${words}`}.${availability.state !== 'active' && availability.reason ? ` ${availability.reason}` : ''}${editable ? ' Drag to trade slots, or open it' : ' Open it to read'}`;
    const face = cardFace(printed[i], {compact: true, ...(availability.state !== 'active' ? {availability} : {})});
    const timer = opts.engineView && (i === opts.engineView.from) ? dialHTML(c, chain.row) : '';
    const plate = special ? `<span class="dk2-plate dk21-plate dk2-plate-word ${special.cls}" aria-hidden="true"><b class="pl-long">${esc(special.long)}</b><b class="pl-short">${esc(special.short)}</b></span>`
      : `<span class="dk2-plate dk21-plate dk2-plate-${info.kind}${info.role === 'add' || info.role === 'mul' ? '' : ' dk2-plate-word'}${info.changed ? ' dk21-plate-changed' : ''}" aria-hidden="true">${plateHTML(info)}</span>`;
    return `<div class="dk2-station dk2-k-${special ? 'eng' : info.kind}${meal ? ' dk-eaten' : ''}${insClass}${lit}" data-slot="${i}" style="${col}">
      <span class="dk2-eyerow">${d.unseen.has(c.instanceId) ? NEW_BADGE : ''}${eyeBtn(`data-slot="${i}"`, `Read ${nameOf(c)}`)}</span>
      <button type="button" class="dk2-btn dk2-card" data-slot="${i}" aria-label="${esc(label)}">${mark && ['add', 'mul', 'repeat'].includes(mark.cls) ? `<span class="dk2-mark dk-mark-${mark.cls}" aria-hidden="true">${mark.glyph}</span>` : ''}${face}${timer}${placing ? '<span class="dk2-puthere" aria-hidden="true">Put here</span>' : ''}</button>
      ${plate}${insMark}${insIdle ? `<i class="dk2-warn dk2-ins-warn" aria-hidden="true">${WARN}</i>` : ''}</div>${notch}${swap}`;
  }).join('');
}
// Lift simulation (2026-11-18): a simulated Lift always counts as falling and on the Lift Guide cue; there are no toggles.
function chipsHTML(d, ev = null, view = {}) {
  const {chain} = d, short = shortScreen();
  // An engine that no ordinary Trigger fires: the flying that starts it, as glossary keywords (the first is shown).
  if (!chain.trigs.length && ev?.starts?.length) return ev.starts.map((id, i) => `<div class="dk22-trow${i ? '' : ' dk22-on'}"><i class="dk22-dot" aria-hidden="true"></i>${chipTermBtn(id)}</div>`).join('');
  if (!chain.trigs.length) return '<p class="dk21-none">Nothing triggers this chain yet.</p>';
  const rows = chain.trigs.map(t => {
    const on = t.kind === chain.trigger;
    // Short screens: the icon itself switches the track (one tap); the "?" after the list explains the shown one.
    const term = short ? termBtn(t.kind, {glossary: false}).replace(`aria-label="${esc(t.name)}"`, `aria-label="Show ${esc(t.name)} on the chain" aria-pressed="${on}"`) : termBtn(t.kind);
    return `<div class="dk22-trow${on ? ' dk22-on' : ''}"><button type="button" class="dk2-btn dk22-tsel" role="radio" data-trigger="${t.kind}" aria-checked="${on}" tabindex="${on ? 0 : -1}" aria-label="Show ${esc(t.name)} on the chain"><i class="dk22-dot" aria-hidden="true"></i></button>${term}</div>`;
  }).join('');
  const shown = TRIGGER_BY[chain.trigger];
  const help = shown?.term ? `<button type="button" class="dk2-btn dk23-help" data-card-term="${esc(shown.term)}" aria-haspopup="dialog" aria-label="What is ${esc(shown.name)}?"><b>?</b></button>` : '';
  return rows + help;
}
/** "Lift costs 3 Sparks: net +2" for the simulated Lift. */
const liftNetWords = (lift, gained) => `Lift −${lift.cost} → net ${lift.net > 0 ? '+' : lift.net < 0 ? '−' : ''}${num(Math.abs(lift.net))}`;
function dialHTML(c, row) {
  const spec = SKILL_CARDS[c?.cardId]?.engine;
  if (!spec?.wait) return '';
  const wait = spec.wait * (row.some(x => SKILL_CARDS[x?.cardId]?.engine?.timerScale) ? .5 : 1);
  return `<span class="dk-dial" aria-hidden="true"><i class="dk-dial-ring"></i><b>${esc(num(wait))} s</b></span>`;
}
function chainPanelHTML(d, view, opts) {
  const {chain} = d, sol = chain.sol, tr = TRIGGER_BY[chain.trigger] || {name: 'this Trigger'};
  const ev = engineView(chain);
  opts = {...opts, engineView: ev};
  const has = chain.trigs.length > 0, start = !has && ev?.starts?.[0];
  // A chain that runs once shows what one run gives (the engine's own rules), not the ordinary walker's 0.
  const once = ev?.once ? simulateEngineChain(d.row, {horizon: 10, events: engineStarts(d.row), log: false}).asked : 0;
  const text = sol.sparks > 0 ? `+${num(sol.sparks)}` : once > 0 ? `+${num(once)}` : '0';
  const passes = chain.passes.length ? chain.passes.join(' + ') : '';
  const twoNumbers = ev?.loop && ev.perTurn !== null && ev.per10 !== null;
  const sumLabel = twoNumbers ? `Engine: ${num(ev.perTurn)} Sparks each time a Timer fires, ${num(Math.round(ev.per10 * 10) / 10)} firings every 10 seconds`
    : `Equals ${passes ? `${chain.passes.join(' plus ')}, ` : ''}${sol.sparks > 0 ? `plus ${num(sol.sparks)}` : 'zero'} Sparks on ${tr.name}`;
  const medal = twoNumbers
    ? `<span class="dk22-medal dk-medal2" id="dk22-medal"><span class="dk-m-row"><b id="dk22-num">${esc(num(ev.perTurn))}</b><small>per firing</small></span><span class="dk-m-row"><b>${esc(num(Math.round(ev.per10 * 10) / 10))}</b><small>firings per 10&nbsp;s</small></span></span>`
    : `<span class="dk22-medal${text.length > 3 ? ' dk22-long' : ''}" id="dk22-medal"><b id="dk22-num">${esc(text)}</b><small>Sparks</small></span>`;
  const origin = has ? triggerIcon(chain.trigger, 32) : start ? chipIcon(start, 32) : `<img src="${WISP_ORB_SRC}" width="32" height="32" alt="">`;
  const originName = has ? termBtn(chain.trigger, {icon: false, cls: 'dk22-term-origin'}) : start ? chipTermBtn(start, {icon: false, cls: 'dk22-term-origin'}) : 'No Trigger';
  const playName = has ? tr.name : start ? CARD_TRIGGERS[start].label : 'this Trigger';
  const timerMark = ev?.loop ? `<button type="button" class="dk2-btn dk-timer-mark" data-card-term="timer" aria-haspopup="dialog" aria-label="Timer: this chain keeps coming back to the first slot">${TIMER_MARK}</button>` : '';
  return `<div class="dk2-stage dk21-stage${view.placing ? ' dk2-placing' : ''}${ev ? ` dk-eng${ev.once ? ' dk-eng-once' : ''}` : ''}" id="dk2-stage" role="group" aria-label="Your chain. On a Trigger, your cards fire left to right.${ev?.loop ? ' It is an engine: a Timer sends it round again.' : ''}" style="--n:${d.row.length}">
    <div class="dk2-track" id="dk2-track" aria-hidden="true"></div>
    ${ev?.loop ? '<i class="dk-ret dk-ret-a" aria-hidden="true"></i><i class="dk-ret dk-ret-b" aria-hidden="true"></i><i class="dk-ret dk-ret-c" aria-hidden="true"></i>' : ''}
    <div class="dk21-left" id="dk21-left"><h2 class="dk21-thead" id="dk21-thead">Triggers</h2><div class="dk21-chips" id="dk21-chips" role="radiogroup" aria-labelledby="dk21-thead">${chipsHTML(d, ev, view)}</div>
     <button type="button" class="wb-sign wb-sign-primary dk2-play dk21-play" id="dk2-play" aria-pressed="false" aria-label="${esc(ev ? `Play the engine from ${playName}: watch it turn, one card at a time` : `Play ${tr.name}: watch a Spark pass through your chain. Result: ${sol.sparks > 0 ? `+${num(sol.sparks)}` : 'no'} Bonus`)}"><span class="wb-sign-text"><b>Play</b></span></button></div>
    <div class="dk2-anchor dk2-start dk21-start" aria-hidden="${has || start ? 'false' : 'true'}"><span class="dk21-origin" id="dk21-origin">${origin}</span><span class="dk2-start-label" id="dk21-origin-name">${originName}</span></div>
    <div class="dk2-stations" id="dk2-stations">${stationsHTML(d, view, opts)}</div>
    <div class="dk22-sum${twoNumbers ? ' dk-sum2' : ''}" id="dk22-sum" role="img" aria-label="${esc(sumLabel)}"><i class="dk22-eq" aria-hidden="true"></i><small class="dk23-passes" id="dk23-passes" aria-hidden="true">${twoNumbers ? '' : esc(passes)}</small>${medal}${timerMark}${chain.lift ? `<small class="dk24-net" id="dk24-net">${esc(liftNetWords(chain.lift, sol.sparks))}</small>` : ''}</div>
    <div class="dk2-track dk23-track2" id="dk23-track2" aria-hidden="true"></div>
    <div class="dk2-anchor dk2-meter" id="dk2-meter"><span class="dk2-meter-label" aria-hidden="true">Spark Meter</span><div class="dk2-gauge" id="dk2-gauge" aria-hidden="true">${gaugeHTML(chain, false)}</div>
     <div class="dk2-meter-info"><b id="dk2-meter-value">${esc(meterValue(chain, false))}</b><small id="dk2-meter-gain"></small></div></div>
    <p class="dk2-result" id="dk2-result"></p>
    <div class="dk2-spark dk23-resting" id="dk2-spark" aria-hidden="true"><img id="dk2-spark-img" src="${SPARK_SRC}" width="16" height="16" alt="" draggable="false"><b class="dk2-tag" id="dk2-tag"></b></div>
   </div>`;
}
const flameOf = (chain, full) => START_FLAME + (full ? chain.sol.gainFlame : 0);
function gaugeHTML(chain, full) {
  return glowGaugeMarkup({flame: flameOf(chain, full), skillSystem: CARD_SYSTEM, isTutorial: true});
}
function meterValue(chain, full) {const u = glowGaugeUnits(flameOf(chain, full), METER_MAX);return `${u.value}/${u.maxValue}`;}

// ── Deck tab ─────────────────────────────────────────────────────────────────
function groups(d, view) {
  const passes = c => view.filter === 'all' || rarityOf(c) === view.filter;
  const order = list => list.sort((a, b) => view.sort === 'name' ? nameOf(a).localeCompare(nameOf(b)) : RANK[rarityOf(a)] - RANK[rarityOf(b)] || nameOf(a).localeCompare(nameOf(b)));
  const picking = view.pick !== null;
  return [
    {id: 'chain', title: 'In your chain', cards: d.row.filter(c => c && passes(c))},
    {id: 'free', title: 'Not in chain', cards: order(d.reserve.filter(c => !isRest(c) && passes(c)))},
    {id: 'rest', title: picking ? 'Cannot go in a slot' : 'Rest cards', note: picking ? 'Rest cards work from the Deck at Rest.' : 'Work from the Deck at Rest. They never go in the chain.', cards: order(d.reserve.filter(c => isRest(c) && passes(c)))},
  ].filter(g => g.cards.length);
}
function tileHTML(d, view, c) {
  const r = rarityOf(c), mark = markOf(c), at = d.slotOf(c), rest = isRest(c), u = usesOf(c), chip = chipOf(c);
  const tally = isDevourCard(c) ? holeTally(c) : null;
  const effect = tally?.eaten ? `Devoured ${tally.eaten} · ${SKILL_CARDS[c.cardId]?.kind === 'dream' ? `Dream ${8 + tally.growth} s` : `+${tally.growth} max Sparks`}` : cardTileLine(c);
  let label = `${nameOf(c)}. ${RARITY_WORD[r]}. ${chipWord(chip)}${effect}.${at >= 0 ? ` In your chain, slot ${at + 1}.` : rest ? ' Rest card.' : ' Not in your chain.'}${u ? ` Uses ${u.now} of ${u.max}.` : ''}`;
  let cls = '', sub = '', disabled = false;
  if (view.pick !== null) {
    const p = view.pick, here = d.row[p];
    if (rest) {cls = ' dk2-dim';disabled = true;label = `${nameOf(c)}: Rest cards work from the Deck. They cannot go in a slot.`;}
    else if (at === p) {cls = ' dk2-dim dk21-here';disabled = true;sub = 'Already in this slot';label = `${nameOf(c)} is already in slot ${at + 1}`;}
    else if (at >= 0) {cls = ' dk2-choice';sub = `Trades with slot ${p + 1}`;label = `Trade slots: ${nameOf(c)} goes to slot ${p + 1}${here ? `, ${nameOf(here)} goes to slot ${at + 1}` : ''}`;}
    else {cls = ' dk2-choice';label = `Put ${nameOf(c)} in slot ${p + 1}${here ? `. ${nameOf(here)} goes back to the Deck` : ''}`;}
  }
  const frame = rest ? 'rest' : at >= 0 ? `chain${RARITY_WORD[r]}` : r;
  return `<div class="dk2-tile dk21-tile dc-r-${r}${d.unseen.has(c.instanceId) ? ' dk2-isnew' : ''}${rest ? ' dk21-rest' : ''}${at >= 0 ? ' dk21-inchain' : ''}${cls}" data-uid="${esc(c.instanceId)}" style="--fr:var(--fr-${frame})">
    <button type="button" class="dk2-btn dk2-tilemain dk21-tilemain" data-uid="${esc(c.instanceId)}" aria-label="${esc(label)}" ${disabled ? 'aria-disabled="true"' : ''}>
     <span class="dk21-top">${chipBadge(chip, {cls: 'dk-tbadge'})}<span class="dk-topr">${d.unseen.has(c.instanceId) ? NEW_BADGE : ''}${rarityPips(r)}${at >= 0 ? `<span class="dk21-slot"><b>Slot ${at + 1}</b></span>` : ''}</span></span>
     <span class="dk2-body dk21-body"><span class="dk2-art dk21-art">${cardArt(c, {compact: true})}${mark && !rest && ['add', 'mul', 'repeat'].includes(mark.cls) ? `<span class="dk2-mark dk-mark-${mark.cls}" aria-hidden="true">${mark.glyph}</span>` : ''}${u ? `<span class="dk2-uses" aria-hidden="true">${u.now}/${u.max}</span>` : ''}</span>
      <span class="dk2-text"><b class="dk2-name">${esc(nameOf(c))}</b>${sub ? `<small class="dk2-sub">${esc(sub)}</small>` : `<b class="dk2-effect">${esc(effect)}</b>`}</span></span>
    </button>
    ${eyeBtn(`data-uid="${esc(c.instanceId)}"`, `Read ${nameOf(c)}`)}</div>`;
}
function countOf(d, r) {return [...d.row.filter(Boolean), ...d.reserve].filter(c => r === 'all' || rarityOf(c) === r).length;}
function barHTML(d, view, opts) {
  if (view.pick !== null) {
    const here = d.row[view.pick];
    return `<p class="dk2-banner" id="dk2-banner"><b>Choose a card for slot ${view.pick + 1}</b><span>${here ? `${esc(shortName(here))} goes back to the Deck` : 'This slot is empty'}</span></p>
      <button type="button" class="wb-sign wb-sign-quiet dk2-cancel" id="dk2-pickcancel"><span class="wb-sign-text"><b>Cancel</b></span></button>`;
  }
  return `<button type="button" class="dk2-btn dk2-sort" id="dk2-sort" aria-label="Sort by ${view.sort}. Press to sort by ${view.sort === 'rarity' ? 'name' : 'rarity'}"><small>Sort</small><b>${view.sort === 'rarity' ? 'Rarity' : 'Name'}</b></button>
    ${opts.workshop ? '<button type="button" class="wb-sign wb-sign-quiet dk2-workshop" id="dk2-workshop" aria-label="Workshop: Improve, Evolve, Refill and Forge at this Rest"><span class="wb-sign-text"><b>Workshop</b></span></button>' : ''}`;
}
function gridHTML(d, view) {
  const gs = groups(d, view);
  return gs.map(g => `<h3 class="dk21-group dk21-group-${g.id}"><span>${esc(g.title)}</span><i class="dk21-rule" aria-hidden="true"></i></h3>${g.note ? `<p class="dk21-groupnote">${esc(g.note)}</p>` : ''}${g.cards.map(c => tileHTML(d, view, c)).join('')}`).join('') || '<p class="dk2-none">No cards here</p>';
}
function deckPanelHTML(d, view, opts) {
  return `<div class="dk2-bar" id="dk2-bar">${barHTML(d, view, opts)}</div>
   <div class="dk21-gridwrap" id="dk21-gridwrap"><div class="dk2-grid dk21-grid${view.pick !== null ? ' dk2-picking' : ''}" id="dk2-grid" role="group" aria-label="All your cards">${gridHTML(d, view)}</div>
    <span class="dk21-more" id="dk21-more" aria-hidden="true">${pixelArt(CHEVRON, {size: 16})}</span></div>`;
}

// ── Triggers tab: the collection of Triggers ─────────────────────────────────
function bookPanelHTML(d, view, opts) {
  const rows = triggerBook(d.run), mine = rows.filter(r => r.owned).length;
  const row = r => `<li class="tb-row${r.owned ? '' : ' tb-none'}" data-chip="${esc(r.id)}">
     <span class="tb-icon" aria-hidden="true">${chipIcon(r.id, 32)}</span>
     <span class="tb-text"><span class="tb-name">${chipTermBtn(r.id, {icon: false, cls: 'tb-term'})}<small class="tb-often">${esc(r.often)}</small></span><span class="tb-does" title="${esc(r.does)}">${esc(r.short)}</span></span>
     <span class="tb-cards">${r.owned ? r.cards.map(k => `<button type="button" class="dk2-btn tb-card dc-r-${rarityOf(k.card)}${k.inChain ? ' tb-inchain' : ''}" data-uid="${esc(k.card.instanceId)}" aria-label="${esc(`${nameOf(k.card)}, ${RARITY_WORD[rarityOf(k.card)]}${k.count > 1 ? `, ${k.count} owned` : ''}${k.inChain ? ', in your chain' : ''}. Open it`)}">${cardArt(k.card, {compact: true})}${k.count > 1 ? `<b class="tb-count" aria-hidden="true">×${k.count}</b>` : ''}</button>`).join('') : '<small class="tb-nocard">No card yet</small>'}</span></li>`;
  return `<div class="tb-scroll" id="tb-scroll"><ul class="tb-list" id="tb-list" aria-label="Every Trigger">${[...rows.filter(r => r.owned), ...rows.filter(r => !r.owned)].map(row).join('')}</ul></div>`;
}

// ── The opened card ──────────────────────────────────────────────────────────
function readerHTML(d, view, opts) {
  if (view.insSheet != null) {const at = view.insSheet, card = d.row[at] || null;return slotInscriptionId(d.run, at) ? inscriptionSheetMarkup(at, slotInscriptionId(d.run, at), card, card ? nameOf(card) : '') : '';}
  const c = view.reading && d.byUid(view.reading);
  if (!c) return '';
  const at = d.slotOf(c), rest = isRest(c), w = whenOf(c), r = rarityOf(c);
  const printed = at >= 0 ? d.printed[at] : describeSkillCard(c);
  const idle = at >= 0 && d.chain.infos[at]?.kind === 'idle';
  let acts = '';
  if (view.melting) {
    const m = view.melting;
    acts = `<p class="dk2-confirm" id="dk2-confirm">You get <b>+${esc(m.amount)} Stored Sparks</b> · you have ${esc(m.wallet)}. ${esc(shortName(c))} is gone for good.</p>
      <div class="dk2-acts"><button type="button" class="wb-sign wb-sign-quiet" id="dk2-keep"><span class="wb-sign-text"><b>Keep</b></span></button>
      <button type="button" class="wb-sign wb-sign-danger" id="dk2-meltgo" data-token="${esc(m.token)}" aria-label="Melt ${esc(nameOf(c))} for ${esc(m.amount)} Stored Sparks. This cannot be undone."><span class="wb-sign-text"><b>Melt</b></span></button></div>`;
  } else if (opts.loaned) {
    acts = '<p class="dk2-loan">Loaned for practice. It goes back when practice ends, so it cannot be melted.</p>';
  } else if (opts.locked) {
    acts = '';
  } else if (view.tab === 'deck' && view.pick !== null) {
    acts = rest || at === view.pick ? '' : `<div class="dk2-acts"><button type="button" class="wb-sign wb-sign-primary dk2-wide" id="dk2-choose"><span class="wb-sign-text"><b>Choose for slot ${view.pick + 1}</b></span></button></div>`;
  } else if (view.tab === 'deck') {
    acts = `<div class="dk2-acts">${rest ? '' : `<button type="button" class="wb-sign wb-sign-standard" id="dk2-put" aria-label="${at >= 0 ? `Move ${esc(nameOf(c))} to another slot` : `Put ${esc(nameOf(c))} in your chain`}"><span class="wb-sign-text"><b>${at >= 0 ? 'Move…' : 'Put in chain…'}</b></span></button>`}
      ${at >= 0 ? `<button type="button" class="wb-sign wb-sign-quiet" id="dk2-takeout" aria-label="Take ${esc(nameOf(c))} out of slot ${at + 1}. It stays in your Deck"><span class="wb-sign-text"><b>Take out</b></span></button>` : ''}
      <button type="button" class="wb-sign wb-sign-quiet" id="dk2-melt" aria-label="Melt ${esc(nameOf(c))}: shows what you get first"><span class="wb-sign-text"><b>Melt…</b></span></button></div>`;
  }
  const availability = getCardFaceAvailability(d.run, printed, at >= 0 ? d.statuses[at] : null);
  const face = inert(cardFace(printed, {compact: false, ...(availability.state !== 'active' ? {availability} : {})}));
  return `<div class="dk2-read" id="dk2-read"><div class="dk2-dialog" role="dialog" aria-modal="true" aria-labelledby="dk2-read-name">
    <div class="dk2-face" id="dk2-face" aria-hidden="true">${face}</div>
    <div class="dk2-info">
     <div class="dk2-info-body">
     <h2 class="dk-sr" id="dk2-read-name">${esc(nameOf(c))}</h2>
     <p class="dk2-rar dc-r-${r}">${gem(r)}<span>${RARITY_WORD[r]}</span></p>
     ${chipOf(c).label ? `<p class="dk21-on"><small>${chipOf(c).kind === 'role' ? 'Role' : 'Trigger'}</small>${chipTermBtn(chipOf(c).id)}</p>` : ''}
     ${isRest(c) ? '' : `<p class="dk2-rule">${esc(fullRuleText(c))}</p>`}
     <p class="dk2-here${idle ? ' dk2-here-idle' : ''}">${idle ? `<i class="dk2-warn">${WARN}</i>` : ''}<span>${esc(hereLine(d.chain, c))}</span></p>
     ${at >= 0 && slotInscriptionId(d.run, at) ? inscriptionBlock(at, slotInscriptionId(d.run, at), slotEntry(d.run, at), c) : ''}
     </div>
     <div class="dk2-info-foot">
     ${acts}
     <button type="button" class="wb-sign wb-sign-quiet dk2-close" id="dk2-close" aria-label="Close ${esc(nameOf(c))}"><span class="wb-sign-text"><b>Close</b></span></button>
     </div>
    </div></div></div>`;
}

// ── The sheet ────────────────────────────────────────────────────────────────
const FILTERS = ['all', 'common', 'rare', 'legendary'];
const filterWord = f => f === 'all' ? 'All' : RARITY_WORD[f];
/** One Filter button in the top bar (Deck tab only) that opens a small menu; the menu choices are the old rarity chips. */
function filterHTML(d, view) {
  if (view.tab !== 'deck' || view.pick !== null || view.placing) return '';
  const on = view.filter !== 'all';
  return `<div class="dk2-filter" id="dk2-filterwrap"><button type="button" class="dk2-btn dk2-filterbtn${on ? ' dk2-filter-on' : ''}" id="dk2-filter" aria-haspopup="menu" aria-expanded="${view.menu}" aria-controls="dk2-filtermenu" aria-label="Filter cards: ${filterWord(view.filter)}${on ? ' (filter on)' : ''}"><span>Filter</span>${on ? `<small>${esc(filterWord(view.filter))}</small><i class="dk2-dot" aria-hidden="true"></i>` : ''}</button>${view.menu ? `<div class="dk2-filtermenu" id="dk2-filtermenu" role="menu" aria-label="Show by rarity">${FILTERS.map(f => `<button type="button" role="menuitemradio" aria-checked="${view.filter === f}" class="dk2-btn dk2-fitem ${f !== 'all' ? 'dc-r-' + f : ''}" data-filter="${f}">${f === 'all' ? '' : gem(f)}<span>${filterWord(f)}</span><b>${countOf(d, f)}</b></button>`).join('')}${on ? '<button type="button" role="menuitem" class="dk2-btn dk2-fitem dk2-fclear" data-filter="all" data-clear><span>Clear</span></button>' : ''}</div>` : ''}</div>`;
}
function headHTML(d, view, opts) {
  const placing = view.placing ? d.byUid(view.placing) : null;
  const note = placing ? `Choose a slot for ${shortName(placing)}` : view.note;
  return `<button type="button" class="wb-sign wb-sign-quiet dk2-done" id="dk2-done"><span class="wb-sign-text"><b>Done</b></span></button>
   <div class="dk2-tabs" role="tablist" aria-label="${opts.loaned ? 'Loaned cards' : 'Deck screens'}">
    <button type="button" class="dk2-btn dk2-tab" role="tab" id="dk2-tab-chain" aria-controls="dk2-rowpanel" data-tab="chain" aria-selected="${view.tab === 'chain'}" tabindex="${view.tab === 'chain' ? 0 : -1}"><span>Chain</span></button>
    <button type="button" class="dk2-btn dk2-tab" role="tab" id="dk2-tab-deck" aria-controls="dk2-deckpanel" data-tab="deck" aria-selected="${view.tab === 'deck'}" tabindex="${view.tab === 'deck' ? 0 : -1}"${d.unseen.size ? ' aria-label="Deck, new cards"' : ''}><span>Deck</span>${d.unseen.size ? '<i class="dk2-dot dk2-tabdot" aria-hidden="true"></i>' : ''}</button>
    <button type="button" class="dk2-btn dk2-tab dk-tab-book" role="tab" id="dk2-tab-triggers" aria-controls="dk2-bookpanel" data-tab="triggers" aria-selected="${view.tab === 'triggers'}" tabindex="${view.tab === 'triggers' ? 0 : -1}"><span>Triggers</span></button>
   </div>
   ${wispChipText(d.run) ? `<span class="dk2-wisp-chip" role="note" aria-label="${esc(wispChipText(d.run))}">${esc(wispChipText(d.run))}</span>` : ''}
   <div class="dk2-context" id="dk2-context"><p class="dk2-note ${placing ? 'dk2-note-mode' : esc(view.noteTone)}" id="dk2-note">${esc(note || (view.tab === 'triggers' ? (rows => `What fires your cards. You have cards for ${rows.filter(r => r.owned).length} of ${rows.length}.`)(triggerBook(d.run)) : opts.loaned ? 'Loaned cards for practice' : opts.paused ? 'Flight paused' : ''))}</p>
    ${filterHTML(d, view)}
    <button type="button" class="wb-sign wb-sign-quiet dk2-cancel" id="dk2-placecancel" ${placing ? `aria-label="Cancel: keep ${esc(nameOf(placing))} where it is"` : 'hidden'}><span class="wb-sign-text"><b>Cancel</b></span></button></div>`;
}
/** The whole sheet for one run. opts: {locked, loaned, paused, workshop}. */
export function deckScreenMarkup(run, view = createDeckView(), opts = {}) {
  const d = deckData(run, view);
  if (view.reading && !d.byUid(view.reading)) {view.reading = null;view.melting = null;}
  const mode = view.pick !== null ? 'pick' : view.placing ? 'place' : '';
  return `<div class="dk dk2 dk21 dk22 dk23 wb-ground wb-t2 wb-t3 wb-go card-screens" id="dk-root" data-view="${view.tab}" data-mode="${mode}" data-slots="${d.row.length}" data-trigger="${esc(d.chain.trigger)}" data-triggers="${esc(d.chain.trigs.map(t => t.kind).join(','))}" data-result="${d.chain.sol.sparks}" data-linesum="${d.chain.linesum}" data-plain="${d.chain.plain}" data-row="${esc(d.row.map(c => c ? c.cardId : '-').join(','))}"${opts.loaned ? ' data-loaned="true"' : ''}>
  <div class="wb-world" aria-hidden="true"></div>
  <div class="wb-page dk-sheet" id="dk-sheet">
   <div class="wb-pagelight" aria-hidden="true"></div>
   <header class="dk2-head dk21-head" id="dk2-head"${view.reading || view.insSheet != null ? ' inert' : ''}>${headHTML(d, view, opts)}</header>
   <section class="dk2-panel dk2-rowpanel" id="dk2-rowpanel" role="tabpanel" aria-labelledby="dk2-tab-chain"${view.tab !== 'chain' ? ' hidden' : ''}${view.reading || view.insSheet != null ? ' inert' : ''}>${view.tab === 'chain' ? chainPanelHTML(d, view, opts) : ''}</section>
   <section class="dk2-panel dk2-deckpanel" id="dk2-deckpanel" role="tabpanel" aria-labelledby="dk2-tab-deck"${view.tab !== 'deck' ? ' hidden' : ''}${view.reading || view.insSheet != null ? ' inert' : ''}>${view.tab === 'deck' ? deckPanelHTML(d, view, opts) : ''}</section>
   <section class="dk2-panel dk-bookpanel" id="dk2-bookpanel" role="tabpanel" aria-labelledby="dk2-tab-triggers"${view.tab !== 'triggers' ? ' hidden' : ''}${view.reading || view.insSheet != null ? ' inert' : ''}>${view.tab === 'triggers' ? bookPanelHTML(d, view, opts) : ''}</section>
   ${readerHTML(d, view, opts)}
  </div>
  <p class="dk-sr" id="dk-live" role="status" aria-live="polite"></p>
 </div>`;
}

// ── Behaviour ────────────────────────────────────────────────────────────────
/** Wire the sheet. actions: {done, transfer(uid, slot, expectedUid), takeOut(slot, uid), meltQuote(uid), meltConfirm(uid, token), workshop, back}. */
export function mountDeckScreen(host, {run, view, opts = {}, actions = {}}) {
  const root = host.querySelector('#dk-root');
  if (!root) return null;
  root.setAttribute('style', frameVars());
  const $ = id => root.querySelector(`#${id}`);
  const reduced = () => !!opts.reducedMotion || document.documentElement.dataset.reducedMotion === 'true' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let d = deckData(run, view);
  const geo = {};
  let playing = 0, playTimer = 0;
  const announce = text => {const live = $('dk-live');if (!live) return;live.textContent = '';requestAnimationFrame(() => {live.textContent = text;});};
  const say = (text, tone = '') => {view.note = text;view.noteTone = tone;};
  const resultWords = () => d.chain.lift ? `Lift: ${d.chain.sol.sparks > 0 ? `plus ${num(d.chain.sol.sparks)} Bonus` : 'no Bonus'}. A Lift costs ${d.chain.lift.cost} Sparks, so the net is ${d.chain.lift.net}` : d.chain.sol.sparks > 0 ? `${triggerName(d.chain.trigger)}: +${num(d.chain.sol.sparks)} Bonus` : `${triggerName(d.chain.trigger)}: no Bonus`;

  function renderAll() {
    stopPlay();
    const keep = view.tab === 'deck' ? $('dk2-grid')?.scrollTop : null;
    const tmp = document.createElement('div');
    tmp.innerHTML = deckScreenMarkup(run, view, opts);
    const fresh = tmp.firstElementChild;
    d = deckData(run, view);
    root.replaceChildren(...fresh.childNodes);
    for (const a of fresh.attributes) if (a.name !== 'style') root.setAttribute(a.name, a.value);
    if (keep != null && $('dk2-grid')) $('dk2-grid').scrollTop = keep;
    afterRender();
  }
  function afterRender() {
    if (view.tab === 'deck' && !view.reading) {for (const n of root.querySelectorAll('#dk2-grid .dk2-isnew')) if (!view.shown.includes(n.dataset.uid)) view.shown.push(n.dataset.uid);}
    root.querySelectorAll('.dk2-stations .skill-card, #dk2-grid .skill-card').forEach(node => {node.setAttribute('aria-hidden', 'true');node.querySelectorAll('[role="img"]:not(.card-sight-warning)').forEach(el => el.removeAttribute('role'));});
    root.querySelectorAll('#dk2-grid svg[role="img"]').forEach(svg => {svg.removeAttribute('role');svg.setAttribute('aria-hidden', 'true');});
    // The opened card: the real full face, read-only; the approved Spark icon (16px grid) replaces the old symbol.
    const face = $('dk2-face');
    if (face) {
      face.querySelector('.card-help')?.remove();
      face.querySelectorAll('.card-term-icon-spark, .card-term-icon-meter').forEach(icon => {icon.innerHTML = SPARK_IMG;});
      face.querySelectorAll('[tabindex]').forEach(el => el.removeAttribute('tabindex'));
      face.querySelectorAll('[role="img"]:not(.card-sight-warning)').forEach(el => el.removeAttribute('role'));
    }
    if (view.tab === 'chain') {sizeStage();paintMedal();fitNames();} else hint();
    sizeFace();
  }

  // A one-word name wider than a narrow Chain tile ellipsizes instead of being cut off mid-letter.
  function fitNames() {
    root.querySelectorAll('.dk2-card .card-face-heading h3').forEach(h => {
      h.classList.remove('dk-name-cut');
      if (h.scrollWidth > h.clientWidth + 1) h.classList.add('dk-name-cut');
    });
  }
  // ── Chain geometry, medallion, crossed figures, Play ───────────────────────
  function sizeStage() {
    const stage = $('dk2-stage');
    if (!stage || view.tab !== 'chain') return;
    const cs = getComputedStyle(stage);
    const fixed = ['--eye', '--plate', '--ga', '--gb', '--eng', '--swap'].reduce((sum, v) => sum + (parseFloat(cs.getPropertyValue(v)) || 0), 0);
    const h = stage.clientHeight, w = stage.clientWidth;
    const endl = parseFloat(cs.getPropertyValue('--endl')) || 96, endr = parseFloat(cs.getPropertyValue('--endr')) || 120;
    const medw = parseFloat(cs.getPropertyValue('--medw')) || 0;
    const n = Math.max(1, d.row.length);
    const colW = (w - endl - endr - medw) / n;
    const card = Math.max(80, Math.min(parseFloat(cs.getPropertyValue('--card-max')) || 150, Math.floor(h - fixed - 10), Math.floor((colW - 10) * 7 / 5)));
    stage.style.setProperty('--card', `${card}px`);
    measure();
  }
  function measure() {
    const stage = $('dk2-stage');
    if (!stage) return;
    const base = stage.getBoundingClientRect();
    if (!base.width) return;
    const centre = el => {const r = el.getBoundingClientRect();return {x: Math.round(r.left + r.width / 2 - base.left), y: Math.round(r.top + r.height / 2 - base.top)};};
    const rect = el => {const r = el.getBoundingClientRect();return {l: Math.round(r.left - base.left), r: Math.round(r.right - base.left)};};
    const gaugeEl = stage.querySelector('#flame-meter') || $('dk2-gauge');
    geo.orb = centre($('dk21-origin'));geo.gauge = centre(gaugeEl);geo.sum = centre($('dk22-medal'));
    geo.notches = [...stage.querySelectorAll('.dk2-notch>i')].map(centre);
    geo.y = geo.orb.y;
    // Two clean segments: from the Trigger icon's edge to a gap before "=", then from the medallion to the meter.
    const icon = rect($('dk21-origin')), eq = rect(stage.querySelector('.dk22-eq')), medal = rect($('dk22-medal')), gauge = rect(gaugeEl);
    const track = $('dk2-track'), t2 = $('dk23-track2');
    track.style.left = `${icon.r}px`;track.style.width = `${Math.max(0, eq.l - 8 - icon.r)}px`;track.style.top = `${geo.y - 3}px`;
    t2.style.left = `${medal.r}px`;t2.style.width = `${Math.max(0, gauge.l - 4 - medal.r)}px`;t2.style.top = `${geo.y - 3}px`;
    // The engine's return path: a stepped line under the cards, from the Timer back to the first Slot (or, for a
    // Metronome, from the card it fires back to the Metronome), in the row between the track and the Swap plaques.
    geo.ret = null;
    const ev = engineView(d.chain), a = stage.querySelector('.dk-ret-a');
    if (ev?.loop && a && geo.notches[ev.from] && geo.notches[ev.to]) {
      const cs = getComputedStyle(stage), yR = Math.round(geo.y + (parseFloat(cs.getPropertyValue('--gb')) || 10) + (parseFloat(cs.getPropertyValue('--eng')) || 16) / 2);
      const xa = Math.min(geo.notches[ev.from].x, geo.notches[ev.to].x), xb = Math.max(geo.notches[ev.from].x, geo.notches[ev.to].x);
      geo.ret = {y: yR, xa, xb};
      const b = stage.querySelector('.dk-ret-b'), c = stage.querySelector('.dk-ret-c');
      a.style.cssText = `left:${xa - 3}px;top:${geo.y + 5}px;height:${yR - geo.y - 2}px`;
      c.style.cssText = `left:${xb - 3}px;top:${geo.y + 5}px;height:${yR - geo.y - 2}px`;
      b.style.cssText = `left:${xa - 3}px;top:${yR - 3}px;width:${xb - xa + 6}px`;
    }
    if (!playing) parkSpark();
  }
  function paintMedal() {
    const medal = $('dk22-medal');
    if (!medal) return;
    medal.style.backgroundImage = medalUrl(Math.round(medal.offsetWidth));
    drawSlashes();
    (document.fonts?.ready || Promise.resolve()).then(drawSlashes);
  }
  // The crossed figure gets a stepped two-pixel diagonal drawn at its exact pixel size (bottom left to top right).
  function drawSlashes() {
    root.querySelectorAll('.dk22-old').forEach(el => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (w < 4 || h < 6) return;
      const top = 2, bottom = h - 2, span = bottom - top - 2;
      let path = '';
      for (let x = 0; x < w; x++) path += `M${x} ${top + Math.round(span * (1 - x / (w - 1)))}h1v2h-1z`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"><path fill="#2a1d12" d="${path}"/></svg>`;
      el.style.setProperty('--slash', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
    });
  }
  const sizeFor = k => k >= 2 ? 32 : 16;
  function sparkAt(x, size, bonus, poured = false, animate = true) {
    const spark = $('dk2-spark'), img = $('dk2-spark-img');
    if (!spark) return;
    spark.classList.toggle('dk2-moving', animate && !reduced());
    spark.style.transform = `translate(${x}px,${geo.y}px)`;
    img.width = img.height = size;img.style.width = img.style.height = `${size}px`;img.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
    $('dk2-tag').textContent = bonus === null ? '' : `Bonus ${num(bonus)}`;
    $('dk2-tag').style.left = `${size / 2 + 4}px`;
    spark.classList.toggle('dk2-poured', poured);
    spark.classList.toggle('dk2-notag', bonus === null);
  }
  // No resting Spark beside the Trigger icon; the Spark appears only while playing.
  function parkSpark() {if (geo.orb) sparkAt(geo.orb.x + 26, 16, null, false, false);$('dk2-spark')?.classList.add('dk23-resting');}
  function meter(full) {
    const g = $('dk2-gauge');
    if (!g) return;
    g.innerHTML = gaugeHTML(d.chain, full);
    const startU = glowGaugeUnits(START_FLAME, METER_MAX), nowU = glowGaugeUnits(flameOf(d.chain, full), METER_MAX);
    g.querySelectorAll('.glow-unit').forEach((u, i) => u.classList.toggle('dk2-gain', full && i >= startU.filled && i < nowU.filled));
    $('dk2-meter-value').textContent = `${nowU.value}/${nowU.maxValue}`;
    $('dk2-meter').classList.toggle('dk2-meter-on', full);
  }
  function stopPlay() {
    clearTimeout(playTimer);playing = 0;engineToken++;cancelAnimationFrame(dialRaf);
    $('dk2-play')?.setAttribute('aria-pressed', 'false');
    const label = $('dk2-play')?.querySelector('b');if (label) label.textContent = 'Play';
    $('dk2-stage')?.classList.remove('dk-playing');
    root.querySelectorAll('.dk2-swap,.dk2-card,.dk21-eye').forEach(el => el.removeAttribute('aria-disabled'));
    root.querySelectorAll('.dk2-firing,.dk-dial-on').forEach(el => el.classList.remove('dk2-firing', 'dk-dial-on'));
  }
  // ── Engine Play: the flight's own engine (card-engine.mjs) on a capped meter, played back one card at a time ──
  // Events in one instant: one step each (320 ms). A Timer's wait: shown three times faster, its real seconds printed.
  const ENGINE_STEP = 320, ENGINE_SPEED = 3, ENGINE_TURNS = 8;
  let engineToken = 0, dialRaf = 0;
  const STOP_WORDS = {'meter-full': 'Meter full', 'cannot-act': 'Meter full', 'nothing-to-repeat': 'Nothing to repeat'};
  function engineSteps(ev) {
    const maxP = Math.round(METER_MAX * GLOW_DISPLAY_SCALE), per = Math.max(1, Number(ev.perTurn) || 1);
    const start = ev.loop ? Math.max(0, maxP - Math.ceil(4 * per)) : Math.round(START_FLAME * GLOW_DISPLAY_SCALE);
    const run = simulateEngineChain(d.row, {horizon: 40, events: engineStarts(d.row), meter: {start, max: maxP}, log: true});
    const scale = d.row.some(c => SKILL_CARDS[c?.cardId]?.engine?.timerScale) ? .5 : 1;
    const steps = [];let meter = start, lastTimer = -1, stop = null;
    for (const e of run.log) {
      if (e.k === 'trigger' && e.type !== 'gain' && e.type !== 'overfill') steps.push({t: e.t, kind: 'start', type: e.type});
      else if (e.k === 'hit' || e.k === 'fired') steps.push({t: e.t, kind: 'hit', slot: e.slot});
      else if (e.k === 'gain') {meter = Math.min(maxP, meter + (Number(e.real) || 0));steps.push({t: e.t, kind: 'gain', slot: e.slot, amount: e.amount, real: e.real, meter});}
      else if (e.k === 'lit' || e.k === 'armed') {const w = (SKILL_CARDS[d.row[e.slot]?.cardId]?.engine?.wait || 1) * scale;steps.push({t: e.t, kind: 'wait', slot: e.slot, wait: w});}
      else if (e.k === 'turn') {lastTimer = e.slot;steps.push({t: e.t, kind: 'turn', slot: e.slot, n: e.turn});if (e.turn > ENGINE_TURNS) {stop = 'Keeps turning';break;}}
      else if (e.k === 'pulse' && e.slot === -1) steps.push({t: e.t, kind: 'back', from: lastTimer, to: e.to});
      else if (e.k === 'keep') steps.push({t: e.t, kind: 'keep', slot: e.slot, amount: e.amount});
      else if (e.k === 'stop') {stop = STOP_WORDS[e.reason] || 'It stopped';steps.push({t: e.t, kind: 'stop', reason: stop});break;}
    }
    if (!steps.some(s => s.kind === 'stop')) steps.push({t: steps.at(-1)?.t || 0, kind: 'stop', reason: stop || (ev.loop ? 'Keeps turning' : 'Ran once')});
    return {steps, start, maxP};
  }
  function engineMeter(printed, maxP, gained) {
    const g = $('dk2-gauge');
    if (!g) return;
    const flame = printed / GLOW_DISPLAY_SCALE;
    g.innerHTML = glowGaugeMarkup({flame, skillSystem: CARD_SYSTEM, isTutorial: true});
    $('dk2-meter-value').textContent = `${Math.round(printed)}/${maxP}`;
    $('dk2-meter-gain').textContent = gained ? `+${num(gained)}` : '';
    $('dk2-meter').classList.toggle('dk2-meter-on', gained > 0);
  }
  const notchX = slot => slot < 0 ? geo.orb.x + 26 : geo.notches[slot]?.x ?? geo.orb.x;
  function engineSparkPath(points, ms) {
    const spark = $('dk2-spark');
    if (!spark) return Promise.resolve();
    spark.classList.remove('dk2-moving', 'dk23-resting', 'dk2-poured', 'dk2-notag');
    if (reduced() || points.length < 2) {const p = points.at(-1);spark.style.transform = `translate(${p.x}px,${p.y}px)`;return Promise.resolve();}
    let len = 0;const segs = points.slice(1).map((p, i) => (len += Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y)));
    const frames = points.map((p, i) => ({offset: i ? segs[i - 1] / (len || 1) : 0, transform: `translate(${p.x}px,${p.y}px)`}));
    spark.style.transform = frames.at(-1).transform;
    return spark.animate(frames, {duration: ms, easing: 'steps(10,end)'}).finished.catch(() => {});
  }
  const later = (ms, token) => new Promise(res => {playTimer = setTimeout(() => res(token === engineToken), ms);});
  function waitDial(slot, from, to, token) {
    // The Timer's own dial fills in sped-up time; its label keeps the real seconds.
    const dial = root.querySelector(`.dk2-station[data-slot="${slot}"] .dk-dial`);
    const ms = Math.max(0, (to - from) / ENGINE_SPEED * 1000);
    if (!dial || reduced()) return later(ms, token);
    dial.classList.add('dk-dial-on');
    const t0 = performance.now();
    return new Promise(res => {
      const tick = now => {
        if (token !== engineToken) return res(false);
        const k = Math.min(1, (now - t0) / (ms || 1));dial.style.setProperty('--k', `${Math.round(k * 360)}deg`);
        if (k >= 1) {dial.classList.remove('dk-dial-on');dial.style.setProperty('--k', '0deg');return res(true);}
        dialRaf = requestAnimationFrame(tick);
      };
      dialRaf = requestAnimationFrame(tick);
    });
  }
  async function enginePlay(ev) {
    stopPlay();measure();
    const token = ++engineToken, {steps, start, maxP} = engineSteps(ev), stage = $('dk2-stage');
    playing = 1;stage.classList.remove('dk-stopped');stage.classList.add('dk-playing');
    root.querySelectorAll('.dk2-swap,.dk2-card,.dk21-eye').forEach(el => el.setAttribute('aria-disabled', 'true'));
    $('dk2-play').setAttribute('aria-pressed', 'true');$('dk2-play').querySelector('b').textContent = 'Stop';
    let gained = 0, turn = 0, lastT = 0, waiting = null;
    engineMeter(start, maxP, 0);
    const note = text => {const el = $('dk2-note');if (el) {el.textContent = text;el.className = 'dk2-note dk-note-play';}};
    const light = slot => {root.querySelectorAll('.dk2-firing').forEach(el => el.classList.remove('dk2-firing'));if (slot >= 0) root.querySelector(`.dk2-station[data-slot="${slot}"]`)?.classList.add('dk2-firing');};
    const y = geo.y, yR = geo.ret?.y ?? y + 14;
    for (const s of steps) {
      if (token !== engineToken) return;
      if (s.t > lastT + 1e-9) {
        if (waiting) note(`${turn ? `Timer fired ${turn}× · ` : ''}${shortName(d.row[waiting.slot])} waits ${num(waiting.wait)} s, shown ${ENGINE_SPEED}× faster`);
        if (!(await (waiting ? waitDial(waiting.slot, lastT, s.t, token) : later((s.t - lastT) / ENGINE_SPEED * 1000, token)))) return;
        lastT = s.t;waiting = null;
      }
      if (s.kind === 'start') {light(-1);engineSparkPath([{x: geo.orb.x, y}, {x: geo.orb.x + 26, y}], 1);note(`${CARD_TRIGGERS[ev.starts[0]]?.label || 'Start'}: the engine starts`);}
      else if (s.kind === 'hit') {light(s.slot);await engineSparkPath([{x: notchX(s.slot), y}], 1);}
      else if (s.kind === 'gain') {light(s.slot);gained += Number(s.real) || 0;engineMeter(s.meter, maxP, gained);$('dk2-tag').textContent = `+${num(s.amount)}`;}
      else if (s.kind === 'wait') {light(s.slot);waiting = s;await engineSparkPath([{x: notchX(s.slot), y}], 1);}
      else if (s.kind === 'turn') {turn = s.n;light(s.slot);note(`Timer fired ${turn}×`);}
      else if (s.kind === 'back') {
        const from = notchX(s.from), to = notchX(s.to);
        await engineSparkPath([{x: from, y}, {x: from, y: yR}, {x: notchX(engineView(d.chain)?.to ?? 0), y: yR}, {x: notchX(engineView(d.chain)?.to ?? 0), y}, {x: to, y}], ENGINE_STEP * 1.6);
        continue;
      } else if (s.kind === 'keep') {$('dk2-tag').textContent = `Keeps ${num(s.amount)}`;}
      else if (s.kind === 'stop') {
        light(-1);parkSpark();stage.classList.add('dk-stopped');note(`Stopped: ${s.reason}${turn ? ` · fired ${turn}×` : ''}`);
        stopPlay();announce(`The engine stopped: ${s.reason}. The Timer fired ${turn} times, plus ${num(gained)} Sparks.`);
        return;
      }
      if (!(await later(ENGINE_STEP, token))) return;
    }
  }
  function play() {
    if (!$('dk2-stage')) return;
    const ev = engineView(d.chain);
    if (ev) {if (playing) {stopPlay();return;} enginePlay(ev);return;}
    stopPlay();meter(false);measure();
    const sol = d.chain.sol, acts = sol.steps.filter(st => st.success);
    const frames = [{x: geo.orb.x + 26, size: 16, bonus: 0}];
    acts.forEach((st, k) => frames.push({x: geo.notches[st.slot]?.x ?? geo.orb.x, size: sizeFor(k + 1), bonus: st.after, slot: st.slot}));
    if (geo.sum) frames.push({x: geo.sum.x, size: sizeFor(acts.length), bonus: sol.sparks});
    frames.push({x: geo.gauge.x, size: sizeFor(acts.length), bonus: sol.sparks, end: true});
    $('dk2-spark').classList.remove('dk23-resting');
    const done = () => announce(sol.sparks > 0 ? `${triggerName(d.chain.trigger)}: plus ${num(sol.sparks)} Bonus. ${d.chain.sol.gain} Sparks go into your meter.` : `${triggerName(d.chain.trigger)}: no Bonus this time.`);
    if (reduced()) {const last = frames[frames.length - 1];sparkAt(last.x, last.size, last.bonus, true, false);meter(true);done();return;}
    playing = 1;$('dk2-play').setAttribute('aria-pressed', 'true');
    let i = 0;
    const tick = () => {
      if (!root.isConnected) return;
      const f = frames[i];
      root.querySelectorAll('.dk2-firing').forEach(el => el.classList.remove('dk2-firing'));
      if (Number.isInteger(f.slot)) root.querySelector(`.dk2-station[data-slot="${f.slot}"]`)?.classList.add('dk2-firing');
      sparkAt(f.x, f.size, f.bonus, false, i > 0);
      if (f.end) {
        playTimer = setTimeout(() => {sparkAt(f.x, f.size, f.bonus, true);meter(true);stopPlay();done();playTimer = setTimeout(() => {if (!playing && root.isConnected) parkSpark();}, 2600);}, 520);
        return;
      }
      i += 1;playTimer = setTimeout(tick, i === 1 ? 500 : 760);
    };
    tick();
  }
  function setTrigger(kind, {focus = true} = {}) {
    if (!d.chain.trigs.some(t => t.kind === kind)) return;
    view.trigger = kind;renderAll();
    if (kind === LIFT_KIND && !reduced()) play();
    if (focus) root.querySelector(`[data-trigger="${kind}"]`)?.focus({preventScroll: true});
    announce(`${triggerName(kind)}: ${d.chain.sol.sparks > 0 ? `plus ${num(d.chain.sol.sparks)} Bonus` : 'no Bonus'}. ${d.row.map((c, i) => c && d.chain.infos[i].kind === 'idle' ? `${shortName(c)} has no effect.` : '').filter(Boolean).join(' ')}`.trim());
  }

  // ── Deck tab scroll hint, opened card size ─────────────────────────────────
  function hint() {
    const grid = $('dk2-grid'), wrap = $('dk21-gridwrap');
    if (!grid || !wrap) return;
    wrap.classList.toggle('dk21-hasmore', grid.scrollHeight - grid.scrollTop - grid.clientHeight > 2);
  }
  function sizeFace() {
    const host2 = $('dk2-read'), face = $('dk2-face'), head = $('dk2-head');
    // The reader starts below the tab bar, so nothing in it can sit on the tabs or the status line.
    if (host2 && head) host2.style.top = `${head.offsetTop + head.offsetHeight + 4}px`;
    if (host2 && face) face.style.setProperty('--face', `${Math.floor(Math.min(340, host2.clientHeight - 20))}px`);
  }

  // ── Moves ───────────────────────────────────────────────────────────────────
  // NEW badges: tiles shown in the Deck tab count as seen once the player leaves it; a tap, read or move clears one at once.
  function flushSeen() {const ids = view.shown;view.shown = [];if (ids.length) actions.seen?.(ids);}
  function seeNow(uid) {if (uid && d.unseen.has(uid)) {view.shown = view.shown.filter(id => id !== uid);actions.seen?.([uid]);d = deckData(run, view);}}
  function showTab(tab, {focus = true, from = null} = {}) {
    if (tab === view.tab) return;
    if (tab === 'triggers') {view.bookFrom = from || view.tab;view.pick = null;view.placing = null;}
    if (tab === 'chain') view.pick = null;
    if (tab === 'deck') view.placing = null;
    if (view.tab === 'deck') flushSeen();
    if (view.noteTone === 'dk2-note-ins') {view.note = '';view.noteTone = '';}
    view.menu = false;view.tab = tab;renderAll();
    if (focus) $(`dk2-tab-${tab}`)?.focus({preventScroll: true});
  }
  // Every real change goes to the app, which reopens the sheet; this view state is kept for that reopen.
  function commit(uid, slot, text) {
    const expected = d.row[slot]?.instanceId || null;seeNow(uid);
    view.pick = null;view.placing = null;view.tab = 'chain';view.reading = null;view.melting = null;
    say(text, 'dk2-note-done');view.focus = {slot};view.announce = text;
    actions.transfer?.(uid, slot, expected);
  }
  function refuseRest(c) {say(`${shortName(c)} is a Rest card: it works from the Deck at Rest`, 'dk2-note-warn');renderAll();announce(`${nameOf(c)} cannot go in a slot. Rest cards work from the Deck at Rest.`);}
  function moveText(c, slot) {
    const at = d.slotOf(c), other = d.row[slot];
    if (at >= 0) return other ? `Traded: ${shortName(c)} is in slot ${slot + 1}, ${shortName(other)} in slot ${at + 1}.` : `Moved ${shortName(c)} to slot ${slot + 1}.`;
    return other ? `${shortName(c)} is in slot ${slot + 1}. ${shortName(other)} went back to the Deck.` : `${shortName(c)} is in slot ${slot + 1}.`;
  }
  function chooseForPick(c) {
    const slot = view.pick;
    if (slot === null || !c || opts.locked) return;
    if (isRest(c)) {refuseRest(c);return;}
    if (d.slotOf(c) === slot) return;
    commit(c.instanceId, slot, moveText(c, slot));
  }
  function startPick(slot) {
    if (opts.locked) return;
    view.pick = slot;view.placing = null;view.tab = 'deck';say('');
    renderAll();$('dk2-tab-deck')?.focus({preventScroll: true});
    announce(`Choose a card for slot ${slot + 1}. ${d.row[slot] ? `${nameOf(d.row[slot])} goes back to the Deck.` : ''} Cancel returns to your chain.`);
  }
  function cancelPick() {
    const slot = view.pick;
    view.pick = null;view.tab = 'chain';say('');renderAll();
    root.querySelector(`.dk2-swap[data-slot="${slot}"]`)?.focus({preventScroll: true});
    announce('Cancelled. Your chain is unchanged.');
  }
  function startPlacing(c) {
    if (!c || opts.locked) return;
    if (isRest(c)) {refuseRest(c);return;}
    view.placing = c.instanceId;view.pick = null;view.tab = 'chain';say('');
    renderAll();root.querySelector('.dk2-card')?.focus({preventScroll: true});
    announce(`${nameOf(c)} picked up. Tap a slot to put it there; the card in that slot goes back to the Deck. Or Cancel.`);
  }
  function placeAt(slot) {
    const c = d.byUid(view.placing);
    if (!c) return;
    if (d.slotOf(c) === slot) {cancelPlacing();return;}
    commit(c.instanceId, slot, moveText(c, slot));
  }
  function cancelPlacing() {
    const c = d.byUid(view.placing);
    view.placing = null;say('');renderAll();$('dk2-tab-chain')?.focus({preventScroll: true});
    announce(`Cancelled. ${c ? nameOf(c) : 'The card'} stays where it was.`);
  }

  // ── The opened card ─────────────────────────────────────────────────────────
  let opener = null;
  const openerKey = el => el?.classList?.contains('tb-card') ? `.tb-card[data-uid="${CSS.escape(el.dataset.uid)}"]` : el?.dataset?.slot !== undefined && el.closest('.dk2-station') ?`[data-slot="${el.dataset.slot}"].${el.classList.contains('dk21-eye') ? 'dk21-eye' : 'dk2-card'}` : el?.dataset?.uid ? `.${el.classList.contains('dk21-eye') ? 'dk21-eye' : 'dk2-tilemain'}[data-uid="${CSS.escape(el.dataset.uid)}"]` : null;
  function openCard(c, from) {
    if (!c || view.reading) return;
    seeNow(c.instanceId);view.reading = c.instanceId;view.melting = null;opener = openerKey(from);
    renderAll();
    $('dk2-close')?.focus({preventScroll: true});
    const w = whenOf(c);
    announce(`${nameOf(c)}. ${RARITY_WORD[rarityOf(c)]}. Triggers on: ${w.text}. ${hereLine(d.chain, c)}`);
  }
  function openIns(slot) {
    if (view.reading || view.insSheet != null || !slotInscriptionId(d.run, slot)) return;
    view.insSheet = slot;renderAll();$('dk2-close')?.focus({preventScroll: true});
  }
  function closeIns() {
    const slot = view.insSheet;view.insSheet = null;renderAll();
    (root.querySelector(`[data-ins-slot="${slot}"]`) || $('dk2-done'))?.focus({preventScroll: true});
  }
  function closeCard() {
    if (!view.reading) return;
    view.reading = null;view.melting = null;
    if (view.readingReturn) {const back = view.readingReturn;view.readingReturn = null;actions.back?.(back);return;}
    renderAll();
    const el = opener && root.querySelector(opener);
    (el || $('dk2-done'))?.focus({preventScroll: true});
  }
  function askMelt() {
    const c = d.byUid(view.reading);
    const quote = c && actions.meltQuote?.(c.instanceId);
    if (!quote?.eligible) {say(quote?.reason || 'This card cannot be melted now.', 'dk2-note-warn');return;}
    view.melting = {amount: quote.amount, wallet: quote.wallet, token: quote.token};
    renderAll();$('dk2-keep')?.focus({preventScroll: true});
    announce(`Melt ${nameOf(c)}? You get ${quote.amount} Stored Sparks; you have ${quote.wallet}. It is gone for good.`);
  }
  function keepCard() {view.melting = null;renderAll();$('dk2-melt')?.focus({preventScroll: true});announce('Kept.');}
  function confirmMelt(button) {
    const c = d.byUid(view.reading);
    if (!c || !view.melting) return;
    const {amount, wallet} = view.melting, at = d.slotOf(c);
    const text = `Melted ${shortName(c)} · +${amount} Stored Sparks (you have ${wallet + amount})`;
    view.reading = null;view.melting = null;say(text, 'dk2-note-receipt');
    view.announce = `Melted ${nameOf(c)}. Plus ${amount} Stored Sparks: ${wallet} to ${wallet + amount}.${at >= 0 ? ` Slot ${at + 1} is now empty.` : ''}`;
    view.focus = {tab: view.tab};
    actions.meltConfirm?.(c.instanceId, button.dataset.token);
  }

  // ── Input ───────────────────────────────────────────────────────────────────
  let swallow = false;
  root.addEventListener('click', event => {
    if (swallow) {swallow = false;return;}
    const t = event.target;
    // Glossary keywords are opened by card-terms.mjs; on short screens a Trigger icon in the list switches the track.
    if (t.closest('[data-card-term]')) return;
    const term = t.closest('.dk22-term');
    if (term && term.closest('.dk22-trow')) {setTrigger(term.dataset.term);return;}
    if (view.insSheet != null) {if (t.closest('#dk2-close') || t === $('dk2-read')) closeIns();return;}
    if (view.reading) {
      const c = d.byUid(view.reading);
      if (t.closest('#dk2-close') || t === $('dk2-read')) {closeCard();return;}
      if (t.closest('#dk2-melt')) {askMelt();return;}
      if (t.closest('#dk2-keep')) {keepCard();return;}
      if (t.closest('#dk2-meltgo')) {confirmMelt(t.closest('#dk2-meltgo'));return;}
      if (t.closest('#dk2-put')) {view.reading = null;startPlacing(c);return;}
      if (t.closest('#dk2-choose')) {view.reading = null;chooseForPick(c);return;}
      if (t.closest('#dk2-takeout')) {
        const at = d.slotOf(c);
        view.reading = null;view.tab = 'deck';say(`${shortName(c)} went back to the Deck. Slot ${at + 1} is empty.`, 'dk2-note-done');
        view.announce = `${nameOf(c)} went back to the Deck. Slot ${at + 1} is empty.`;view.focus = {tab: 'deck'};
        actions.takeOut?.(at, c.instanceId);return;
      }
      return;
    }
    if ($('dk2-stage')?.classList.contains('dk-playing') && t.closest('.dk2-swap,.dk2-card,.dk21-eye,.dk22-tsel,.dk2-tab')) {if (t.closest('.dk2-tab')) stopPlay(); else return;}
    const tab = t.closest('.dk2-tab');
    if (tab) {showTab(tab.dataset.tab);return;}
    if (t.closest('#tb-back')) {if (view.bookFrom === 'outside') actions.done?.(); else showTab(view.bookFrom === 'deck' ? 'deck' : 'chain');return;}
    const bookCard = t.closest('.tb-card');
    if (bookCard) {openCard(d.byUid(bookCard.dataset.uid), bookCard);return;}
    const insButton = t.closest('[data-ins-slot]');
    if (insButton && !view.placing) {openIns(Number(insButton.dataset.insSlot));return;}
    if (t.closest('#dk2-done')) {actions.done?.();return;}
    if (t.closest('#dk2-placecancel')) {cancelPlacing();return;}
    if (t.closest('#dk2-pickcancel')) {cancelPick();return;}
    if (t.closest('#dk2-workshop')) {actions.workshop?.();return;}
    if (t.closest('#dk2-play')) {if (view.placing) cancelPlacing();play();return;}
    const sel = t.closest('.dk22-tsel');
    if (sel) {setTrigger(sel.dataset.trigger);return;}
    if (view.menu && !t.closest('#dk2-filtermenu')) {
      const toggle = t.closest('#dk2-filter');
      view.menu = false;renderAll();
      if (toggle) {$('dk2-filter')?.focus({preventScroll: true});return;}
    }
    if (t.closest('#dk2-filter')) {if (view.noteTone === 'dk2-note-ins') {view.note = '';view.noteTone = '';}view.menu = true;renderAll();root.querySelector('#dk2-filtermenu [aria-checked="true"]')?.focus({preventScroll: true});return;}
    const filter = t.closest('[data-filter]');
    if (filter) {view.filter = filter.dataset.filter;view.menu = false;renderAll();$('dk2-filter')?.focus({preventScroll: true});announce(`${view.filter === 'all' ? 'All cards' : RARITY_WORD[view.filter]}: ${countOf(d, view.filter)}.`);return;}
    if (filter) {view.filter = filter.dataset.filter;renderAll();root.querySelector(`[data-filter="${view.filter}"]`)?.focus({preventScroll: true});announce(`${view.filter === 'all' ? 'All cards' : RARITY_WORD[view.filter]}: ${countOf(d, view.filter)}.`);return;}
    if (t.closest('#dk2-sort')) {view.sort = view.sort === 'rarity' ? 'name' : 'rarity';renderAll();$('dk2-sort')?.focus({preventScroll: true});announce(`Sorted by ${view.sort}.`);return;}
    const eye = t.closest('.dk21-eye');
    if (eye && eye.dataset.slot !== undefined) {openCard(d.row[Number(eye.dataset.slot)], eye);return;}
    if (eye && eye.dataset.uid) {openCard(d.byUid(eye.dataset.uid), eye);return;}
    const swapBtn = t.closest('.dk2-swap');
    if (swapBtn) {if (view.placing) placeAt(Number(swapBtn.dataset.slot)); else startPick(Number(swapBtn.dataset.slot));return;}
    const cardBtn = t.closest('.dk2-card');
    if (cardBtn) {
      const slot = Number(cardBtn.dataset.slot);
      if (view.placing) {placeAt(slot);return;}
      if (!d.row[slot]) {startPick(slot);return;}
      openCard(d.row[slot], cardBtn);return;
    }
    const main = t.closest('.dk2-tilemain');
    if (main) {const c = d.byUid(main.dataset.uid);if (view.pick !== null) chooseForPick(c); else openCard(c, main);}
  });
  // Escape steps back one layer: Melt question, opened card, pick or place mode, then the whole sheet.
  // Handled on keydown so the browser's dialog close request (which may skip a repeated cancel) never runs.
  const stepBack = () => {
    if (view.menu) {view.menu = false;renderAll();$('dk2-filter')?.focus({preventScroll: true});return;}
    if (view.insSheet != null) {closeIns();return;}
    if (view.reading) {if (view.melting) keepCard(); else closeCard();return;}
    if (view.pick !== null) {cancelPick();return;}
    if (view.placing) {cancelPlacing();return;}
    actions.done?.();
  };
  host.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();event.stopPropagation();stepBack();
  });
  host.addEventListener('cancel', event => {
    event.preventDefault();
    if (document.querySelector('dialog.card-term-dialog[open]')) return;
    stepBack();
  });
  root.addEventListener('keydown', event => {
    if ((view.reading || view.insSheet != null) && event.key === 'Tab') {
      const items = [...$('dk2-read').querySelectorAll('button:not([disabled])')];
      const i = items.indexOf(document.activeElement);
      event.preventDefault();items[(i + (event.shiftKey ? items.length - 1 : 1) + items.length) % items.length]?.focus();
      return;
    }
    const tab = event.target.closest?.('[role="tab"]');
    if (tab && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();const tabs = ['chain', 'deck', 'triggers'];
      showTab(tabs[(tabs.indexOf(view.tab) + (event.key === 'ArrowLeft' ? 2 : 1)) % 3]);return;
    }
    const chip = event.target.closest?.('.dk22-tsel');
    const trigs = d.chain.trigs;
    if (chip && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && trigs.length > 1) {
      event.preventDefault();
      const i = trigs.findIndex(x => x.kind === view.trigger), step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      setTrigger(trigs[(i + step + trigs.length) % trigs.length].kind);
    }
  });
  // Drag a chain card onto another slot: the two trade slots (an empty slot just takes it).
  let drag = null;
  root.addEventListener('pointerdown', event => {
    const card = event.target.closest('.dk2-card');
    if (!card || event.button !== 0 || view.placing || view.reading || opts.locked) return;
    const slot = Number(card.dataset.slot);
    if (!d.row[slot]) return;
    drag = {node: card, slot, x: event.clientX, y: event.clientY, id: event.pointerId, moved: false};
  });
  const onMove = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    const stage = $('dk2-stage');
    if (!drag.moved) {drag.moved = true;stopPlay();drag.node.classList.add('dk2-dragging');stage?.classList.add('dk2-dragmode');}
    drag.node.style.transform = `translate(${Math.round(dx)}px,${Math.round(dy)}px)`;
    const over = document.elementsFromPoint(event.clientX, event.clientY).map(el => el.closest?.('.dk2-station')).find(el => el && root.contains(el) && Number(el.dataset.slot) !== drag.slot);
    root.querySelectorAll('.dk2-station').forEach(el => el.classList.toggle('dk2-drop', el === over));
    event.preventDefault();
  };
  const endDrag = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const {node, slot, moved} = drag;drag = null;
    if (!moved) return;
    swallow = true;setTimeout(() => {swallow = false;}, 0);
    node.classList.remove('dk2-dragging');node.style.transform = '';$('dk2-stage')?.classList.remove('dk2-dragmode');
    const target = root.querySelector('.dk2-station.dk2-drop');
    root.querySelectorAll('.dk2-drop').forEach(el => el.classList.remove('dk2-drop'));
    if (!target || event.type !== 'pointerup') return;
    const to = Number(target.dataset.slot), c = d.row[slot];
    commit(c.instanceId, to, moveText(c, to));
  };
  window.addEventListener('pointermove', onMove, {passive: false});
  window.addEventListener('pointerup', endDrag);window.addEventListener('pointercancel', endDrag);
  root.addEventListener('scroll', event => {if (event.target.id === 'dk2-grid') hint();}, {capture: true, passive: true});

  const relayout = () => {if (!root.isConnected) return;if (view.tab === 'chain') {sizeStage();fitNames();} else hint();sizeFace();};
  const resize = new ResizeObserver(relayout);resize.observe(root);
  const short = typeof matchMedia === 'function' ? matchMedia(SHORT_QUERY) : null;
  const onShort = () => {if (root.isConnected && view.tab === 'chain') renderAll();};
  short?.addEventListener?.('change', onShort);
  document.fonts?.ready.then(relayout);
  // "All Triggers" in the glossary (card-terms.mjs) opens the collection here.
  const onBook = () => {if (!root.isConnected) return;view.reading = null;view.melting = null;if (view.tab !== 'triggers') showTab('triggers'); else renderAll();};
  document.addEventListener('trigger-book', onBook);
  host.addEventListener('close', () => {
    document.removeEventListener('trigger-book', onBook);
    if (view.tab === 'deck') flushSeen();
    stopPlay();resize.disconnect();short?.removeEventListener?.('change', onShort);
    window.removeEventListener('pointermove', onMove);window.removeEventListener('pointerup', endDrag);window.removeEventListener('pointercancel', endDrag);
  }, {once: true});

  afterRender();
  // Focus and the spoken result after a reopen (a move, Melt or Take out).
  const focus = view.focus;view.focus = null;
  if (focus?.slot !== undefined) root.querySelector(`.dk2-card[data-slot="${focus.slot}"]`)?.focus({preventScroll: true});
  else if (view.reading) $('dk2-close')?.focus({preventScroll: true});
  else if (focus?.tab) (root.querySelector('.dk2-tilemain') || $(`dk2-tab-${focus.tab}`))?.focus({preventScroll: true});
  else $(`dk2-tab-${view.tab}`)?.focus({preventScroll: true});
  if (view.announce) {const text = `${view.announce} ${resultWords()}.`;view.announce = '';announce(text);}
  if (focus?.slot !== undefined && !reduced()) root.querySelector(`.dk2-card[data-slot="${focus.slot}"]`)?.animate?.([{transform: 'translateY(-6px)'}, {transform: 'none'}], {duration: 220, easing: 'steps(3,end)'});
  return {render: renderAll, play, setTrigger: k => setTrigger(k, {focus: false}), showTab, openCard: uid => openCard(d.byUid(uid)), get data() {return d;}};
}
