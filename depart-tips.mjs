// Departure tips for the paused "Ready to depart" field note (look v1.0-depart-A, approved 2026-11-17).
// Data, the picker, the run-state adapter and the shown-tip history. No DOM here.
// Every claim was checked against dist/card-catalog.mjs, dist/card-terms.mjs, dist/pickups.mjs, dist/biomes.mjs and
// dist/black-holes.mjs. Cards marked `retired` or `unreleased` are never named. Limits: headline at most 5 words,
// sentence at most 16 words.
//
// context grammar (a tip is shown only when ALL "&" parts hold):
//   always                      any run
//   card:<id>[|<id>...]         one of these cards is equipped (ids from card-catalog.mjs)
//   trigger:<name>              an equipped card waits for that Trigger (collect, delivery, pulse, flash, overfill,
//                               rhythm, falling-lift); "pulse" is the catalog's "wave"
//   biome:<id>                  the destination is in that biome (ids from biomes.mjs)
//   hazard:black-hole           the passage has a Black Hole
//   low-hearts                  one heart left          first-flights   flights 1 to 3 of the run
//   collector                   the Collector companion is along   empty-slot   the Chain has a free Slot
//   has-stored-sparks           Stored Sparks in the wallet        after-death  the last flight was lost
import {CARD_CATALOG} from './card-catalog.mjs?v=courses-2';
import {getBiome} from './biomes.mjs?v=courses-2';
import {FLASH_BASE_DURATION} from './pickups.mjs?v=courses-2';
import {isCardRun,isInventoryOnlyCard} from './skill-cards.mjs?v=courses-2';
import {onboardingFlightPlan} from './onboarding.mjs?v=courses-2';

export const TIPS = Object.freeze([
 // ── General: fine in any run ──────────────────────────────────────────────────────────────
 {id:'lift-cost',context:'always',icon:'wisp',headline:'Lifts cost Sparks',text:'Each Lift spends Sparks from your Spark Meter. Touching a Spark refills it.'},
 {id:'lift-sooner',context:'always',icon:'wisp',headline:'Lift sooner near rock',text:'Lift sooner to clear rock, and leave room to rise first.'},
 {id:'pause-menu',context:'always',icon:'moon',headline:'Pause when you need to',text:'MENU pauses the flight. Play eases back in when you resume.'},
 {id:'chain-order',context:'always',icon:'chain',headline:'Your Chain fires in order',text:'When a Trigger happens, your cards fire left to right.'},
 {id:'read-trigger',context:'always',icon:'chain',headline:'Read the Trigger first',text:'Each card shows its Trigger first: what makes it fire, like Collect or Pulse.'},
 {id:'luminance',context:'always',icon:'lantern',headline:'Luminance is your light',text:'Luminance is the radius of light around your wisp. It reveals nearby passage.'},
 {id:'flash-light',context:'always',icon:'flash',headline:'Flare lights the way',text:`Flare: for ${FLASH_BASE_DURATION} seconds, a Pulse every 2 seconds and very high Luminance.`},
 {id:'dusk-drain',context:'always',icon:'dusk',headline:'Rose crescents drain',text:'A Dusk Spark drains up to 3 Sparks and dims your light for 4 seconds.'},
 {id:'spare-fuel',context:'always',icon:'jar',headline:'Spare fuel is saved',text:'Extra meter fuel is packed into Stored Sparks, during a Round and after a clear.'},
 {id:'rest-checkpoint',context:'always',icon:'camp',headline:'Rest is a checkpoint',text:'At Rest you choose an action and can improve your Deck.'},
 // ── Card-specific: only when that card is equipped ────────────────────────────────────────
 {id:'rhythm-glide',context:'card:rhythm',icon:'beat',headline:'Lift, rise, then glide',text:'In still air, glide back to takeoff height between Lifts. Rhythm needs even gaps.'},
 {id:'rhythm-three',context:'card:rhythm',icon:'beat',headline:'Three even Lifts, one Pulse',text:'Three successful, evenly spaced Lifts send one Pulse. Choose a pace the passage allows.'},
 {id:'lift-guide-chevron',context:'card:lift-guide',icon:'note',headline:'Follow the amber chevron',text:'The chevron marks a Lift that regains height. With sound on, Lift on the higher note.'},
 {id:'harvest-pulse',context:'card:harvest-common|harvest-rare|harvest-legendary',icon:'pulse',headline:'Harvest the Pulse',text:'Resonant Harvest pays when a Pulse crosses an uncollected Spark. The Spark stays.'},
 {id:'echo-copy',context:'card:echo|echo-ii|echo-iii',icon:'chain',headline:'Echo copies the next card',text:'Echo repeats the card directly to its right, and spends that card’s uses.'},
 {id:'chameleon-borrow',context:'card:chameleon',icon:'chain',headline:'Chameleon borrows the next card',text:'It acts as the card to its right and shares that card’s uses.'},
 {id:'boost-left',context:'card:prism-lens|prism-lens-ii|crescendo|closing-chord|second-sun',icon:'spark',headline:'Boosts look left',text:'A × card multiplies the cards to its left, so place it after them.'},
 {id:'pocket-uses',context:'card:spark-cache',icon:'jar',headline:'Pocket Sparks runs out',text:'It spends one use per direct pickup bonus, then leaves your Deck at zero.'},
 {id:'deep-vessel',context:'card:deep-vessel',icon:'jar',headline:'Bigger meter, not fuller',text:'Deep Vessel raises maximum Sparks but does not refill your meter. The cap is 100.'},
 {id:'grow-at-rest',context:'card:growth-seed|growth-seed-common|growth-seed-legendary',icon:'sprout',headline:'Grow at Rest',text:'Growth Seeds add maximum Sparks and refill your meter when you Grow at Rest.'},
 {id:'cache-handling',context:'card:cache-handling',icon:'collector',headline:'Touch beats delivery',text:'Collector delivers a Cache for 12 Sparks, but touching it yourself pays 18.'},
 {id:'watchlight',context:'card:watchlight',icon:'collector',headline:'Keep Collector close',text:'Watchlight blocks one fatal impact per flight while Collector sits beside you at full charge.'},
 {id:'dream',context:'card:dream',icon:'moon',headline:'Dream is free practice',text:'Dream rehearses the first 8 seconds with free Lifts. Rehearsing spends no heart.'},
 {id:'double-lift',context:'card:double-lift',icon:'beat',headline:'Tap twice, pay once',text:'Two successful manual Lifts within one second make the second one free.'},
 {id:'springboard',context:'card:springboard',icon:'spark',headline:'Bounce on the way down',text:'Touch a natural Spark while falling for a free half-Lift bounce. No Rhythm progress.'},
 {id:'refrain',context:'card:refrain',icon:'chain',headline:'Refrain: one Encore',text:'Refrain fires your Chain once more for the same Trigger, from Slot 1.'},
 {id:'tight-packing',context:'card:tight-packing|tight-packing-ii|tight-packing-iii',icon:'jar',headline:'Pack tighter',text:'Tight Packing adds extra Stored Sparks to ordinary Packing.'},
 {id:'proximity',context:'card:slip-feather|edge-reach',icon:'pulse',headline:'Skim, do not touch',text:'Stay near terrain for 2 seconds to send a revealing Pulse. Touching it does not count.'},
 // ── Trigger-specific: only when a card in the Chain waits for that Trigger ────────────────
 {id:'collect-trigger',context:'trigger:collect',icon:'spark',headline:'Collect fires on touch',text:'Your wisp touching a Spark, Cluster, Cache or Dusk Spark fires your Collect cards.'},
 {id:'delivery-not-collect',context:'trigger:delivery',icon:'collector',headline:'Delivery is not Collect',text:'A pickup Collector brings you fires Delivery cards, not Collect cards.'},
 {id:'pulse-uncollected',context:'trigger:pulse',icon:'pulse',headline:'Cross, then collect',text:'A Pulse crossing an uncollected Spark fires Pulse cards. The Spark stays; pick it up.'},
 {id:'overfill-two',context:'trigger:overfill',icon:'spark',headline:'One touch, two Triggers',text:'A Spark that overfills your meter fires Overfill first, then Collect.'},
 {id:'falling-lift',context:'trigger:falling-lift',icon:'wisp',headline:'Wait, fall, then Lift',text:'Lift while falling: a paid Lift, at least 0.75 s after your last.'},
 {id:'flash-trigger',context:'trigger:flash',icon:'flash',headline:'Collect a Flare',text:'Collecting a Flare triangle fires your Flare cards as well as lighting the passage.'},
 // The Rhythm Trigger only fires from the Rhythm card's three even Lifts, so the card is part of the context.
 {id:'rhythm-trigger',context:'trigger:rhythm&card:rhythm',icon:'beat',headline:'Lift on the beat',text:'Cards that say Lift on the beat fire each time your three even Lifts complete.'},
 // ── Place-specific: biome hints from biomes.mjs, kept to its own wording ──────────────────
 {id:'biome-moonruins',context:'biome:moonruins',icon:'arch',headline:'Loose stones tremble',text:'Cracked masonry shakes, then falls. Do not linger under it.'},
 {id:'biome-frost',context:'biome:frost',icon:'peaks',headline:'Ice melts in your light',text:'Your light melts hanging ice into falling shards. Keep clear below it.'},
 {id:'biome-pinewood',context:'biome:pinewood',icon:'pines',headline:'Cones drop as you near',text:'Ripe cones drop from the canopy as you approach them.'},
 {id:'biome-marsh',context:'biome:marsh',icon:'wisp',headline:'Touch the reed bubbles',text:'Touching a reed bubble gives you a gentle lift.'},
 {id:'biome-fungal',context:'biome:fungal',icon:'sprout',headline:'Burst the puffcaps',text:'Burst a puffcap to ride a rising spore cloud.'},
 {id:'biome-basalt',context:'biome:basalt',icon:'peaks',headline:'Fumaroles launch jets',text:'Passing a fumarole triggers a short rising jet.'},
 {id:'biome-desert',context:'biome:desert',icon:'dune',headline:'Sand warns, then falls',text:'Loose sandstone warns with falling sand, then crumbles.'},
 {id:'biome-coral',context:'biome:coral',icon:'dune',headline:'Anemones open for you',text:'Anemones open into rising currents as you approach.'},
 {id:'biome-crystal',context:'biome:crystal',icon:'peaks',headline:'Touch crystals to flash',text:'Touching a resonant crystal flashes the way ahead.'},
 {id:'biome-cloud',context:'biome:cloud',icon:'dune',headline:'Listen for wind bells',text:'Wind bells warn before a strong local lift.'},
 {id:'biome-thorn',context:'biome:thorn',icon:'pines',headline:'Open the ripe pods',text:'Touch a ripe pod to open it and release a few Sparks.'},
 {id:'biome-cemetery',context:'biome:cemetery',icon:'arch',headline:'Ring the old bells',text:'Ring weathered bells to briefly reveal the path.'},
 // ── Situation-specific ───────────────────────────────────────────────────────────────────
 {id:'black-hole',context:'hazard:black-hole',icon:'blackhole',headline:'Give Black Holes room',text:'A Black Hole drains Sparks and slows time as you near it.'},
 {id:'low-hearts-rest',context:'low-hearts',icon:'heart',headline:'Rest can mend you',text:'At Rest, Recover heals and refills your meter.'},
 {id:'low-hearts-attempts',context:'low-hearts',icon:'heart',headline:'Hearts are attempts',text:'Each heart is one remaining attempt. A failed flight costs one heart.'},
 {id:'first-tap',context:'first-flights',icon:'wisp',headline:'Tap to Lift',text:'Tap or press Lift to rise. Each Lift spends Sparks from your Spark Meter.'},
 {id:'first-collector',context:'first-flights&collector',icon:'collector',headline:'Collector catches misses',text:'The small green light catches a missed pickup and reels it to your wisp.'},
 {id:'collector-orbit',context:'collector',icon:'collector',headline:'Read the orbit',text:'The orbit around your wisp shows how far Collector can search.'},
 {id:'empty-slot',context:'empty-slot',icon:'chain',headline:'Fill your empty Slot',text:'A Slot with no card fires nothing. Equip one from your Reserve in the Deck.'},
 {id:'stored-rest',context:'has-stored-sparks',icon:'jar',headline:'Spend Stored Sparks at Rest',text:'At Rest, Stored Sparks pay to Forge, improve or Evolve cards.'},
 {id:'after-death',context:'after-death',icon:'spark',headline:'Try again',text:'Clear a Round to earn its rewards and choose your next stop.'},
]);

/** The First Light practice shows only tips that cannot contradict its own lessons (its entry lesson is its own coach card). */
export const PRACTICE_TIP_IDS = Object.freeze(['first-tap','lift-cost','lift-sooner','pause-menu']);

/** A tip without a picture of its own takes the picture of its context family. */
const FAMILY_ICON = Object.freeze({always:'wisp',card:'chain',trigger:'spark',biome:'peaks',hazard:'blackhole','low-hearts':'heart','first-flights':'wisp',collector:'collector','empty-slot':'chain','has-stored-sparks':'jar','after-death':'spark'});
export const tipIcon = tip => tip.icon || FAMILY_ICON[String(tip.context).split(/[:&]/)[0]] || 'spark';

export const words = s => String(s).trim().split(/\s+/).filter(Boolean).length;
export const isContextual = tip => tip.context !== 'always';

// ── Run state the picker reads ──────────────────────────────────────────────────────────────
// {cards:[cardId|{cardId}|null], slots, hearts, maxHearts, biome, hazards:[], flight (1-based in this run),
//  companion:'collector', stored, lastFlightLost, practice}
const TRIGGER_ALIAS = {wave: 'pulse'};
const cardId = c => (c && typeof c === 'object') ? (c.cardId || c.id) : c;
const usable = id => !!CARD_CATALOG[id] && !CARD_CATALOG[id].retired && !CARD_CATALOG[id].unreleased;
export function runFacts(run) {
  const ids = (run.cards || []).map(cardId).filter(Boolean).filter(usable);
  const triggers = new Set((run.chain || run.cards || []).map(cardId).filter(usable).map(id => CARD_CATALOG[id].trigger).filter(Boolean).map(t => TRIGGER_ALIAS[t] || t));
  return {
    ids: new Set(ids), triggers,
    biome: run.biome, hazards: new Set(run.hazards || []),
    lowHearts: (run.hearts ?? 3) <= 1 && (run.maxHearts ?? 3) > 1, firstFlights: (run.flight ?? 99) <= 3,
    collector: run.companion === 'collector', emptySlot: (run.slots ?? 0) > (run.filled ?? ids.length),
    stored: (run.stored ?? 0) > 0, afterDeath: !!run.lastFlightLost, practice: !!run.practice,
  };
}
function partHolds(part, f) {
  const [key, value = ''] = part.split(':');
  switch (key) {
    case 'always': return true;
    case 'card': return value.split('|').some(id => f.ids.has(id));
    case 'trigger': return f.triggers.has(value);
    case 'biome': return f.biome === value;
    case 'hazard': return f.hazards.has(value);
    case 'low-hearts': return f.lowHearts;
    case 'first-flights': return f.firstFlights;
    case 'collector': return f.collector;
    case 'empty-slot': return f.emptySlot;
    case 'has-stored-sparks': return f.stored;
    case 'after-death': return f.afterDeath;
    default: return false;
  }
}
export const isEligible = (tip, facts) => (!facts.practice || PRACTICE_TIP_IDS.includes(tip.id)) && tip.context.split('&').every(part => partHolds(part, facts));
export const eligibleTips = run => { const f = runFacts(run); return TIPS.filter(tip => isEligible(tip, f)); };

/** Pick one tip for the next flight. history: tip ids shown on earlier flights, oldest first.
 *  Rules: never a tip from the last 8 flights (unless fewer than that many tips fit this run, then the one
 *  seen longest ago); context tips about two times in three; within a pool, tips never shown first,
 *  then the one seen longest ago. */
export function pickTip(run, history = [], rand = Math.random, {recent = 8, contextShare = 2 / 3} = {}) {
  const eligible = eligibleTips(run);
  if (!eligible.length) return null;
  const banned = new Set(history.slice(-recent));
  let pool = eligible.filter(tip => !banned.has(tip.id));
  if (!pool.length) pool = eligible;
  const ctx = pool.filter(isContextual), gen = pool.filter(tip => !isContextual(tip));
  const wantContext = rand() < contextShare;
  const first = wantContext ? ctx : gen, second = wantContext ? gen : ctx;
  const group = first.length ? first : second;
  const age = tip => { const i = history.lastIndexOf(tip.id); return i < 0 ? Infinity : history.length - i; };
  const oldest = Math.max(...group.map(age));
  const best = group.filter(tip => age(tip) === oldest);
  return best[Math.floor(rand() * best.length) % best.length];
}

// Plain words for the small context line ("For your Rhythm").
const cardName = id => CARD_CATALOG[id]?.name || id;
const TRIG_NAME = {collect: 'Collect', delivery: 'Delivery', pulse: 'Pulse', flash: 'Flare', overfill: 'Overfill', rhythm: 'Lift', 'falling-lift': 'Lift'};
export function whyLabel(tip, run) {
  const f = runFacts(run), parts = tip.context.split('&'), first = parts.find(p => p !== 'always' && p !== 'collector') || parts[0];
  const [key, value = ''] = first.split(':');
  switch (key) {
    case 'always': return 'Good to know';
    case 'card': return `For your ${cardName(value.split('|').find(i => f.ids.has(i)))}`;
    case 'trigger': return `For your ${TRIG_NAME[value] || value} cards`;
    case 'biome': return `In ${getBiome(run.biome)?.name || value}`;
    case 'hazard': return 'Black Hole ahead';
    case 'low-hearts': return 'One heart left';
    case 'first-flights': return 'Early flights';
    case 'collector': return 'With your Collector';
    case 'empty-slot': return 'You have a free Slot';
    case 'has-stored-sparks': return 'You hold Stored Sparks';
    case 'after-death': return 'After a lost flight';
    default: return 'Good to know';
  }
}

// ── Adapter: the real run and the route node about to be flown → the object pickTip reads ────
// Field sources (all read-only):
//   cards          run.mountedCards[] ({instanceId,cardId,rank,charges}|null), model.mjs createRun / skill-cards.mjs makeSkillCard;
//                  plus owned Reserve cards that never sit in the Chain (Growth Seed kinds), run.reserveCards
//   chain          the mounted cards only: their catalog `trigger` gives the Triggers present
//   slots, filled  run.cardSlots (3 to 5); filled = mounted, non-empty slots; only for card runs (isCardRun)
//   hearts         run.lives / run.maxLives (model.mjs createRun)
//   biome          getBiome(node): node.biomeId|levelId|id|scene (biomes.mjs); null for practice and legacy nodes
//   hazards        a Black Hole sits on every ordinary course unless the engine suppresses it: onboarding stage < 3 and
//                  the Ascent 1 / Ascent 2 openings (flight.mjs easyOpening / firstA2Flight), bosses, or practice
//   flight         run.stats.flights + 1 (cleared flights in this run, model.mjs completeFlight)
//   companion      run.companions[0] (model.mjs createRun)
//   stored         run.condensedGlow (what the HUD shows as Stored Sparks; model.mjs runWallet)
//   lastFlightLost run.lastAttempt: success false, not interrupted, not practice (model.mjs completeFlight)
//   practice       run.isTutorial
const storedKinds = new Set(['camp-grow', 'camp-extra']);
export function courseHasBlackHole(run, node, profile) {
  if (!run || !node || node.type === 'support' || run.isTutorial || node.boss || node.bossId) return false;
  const plan = onboardingFlightPlan(profile, run);
  if (plan.enabled && !plan.blackHoles) return false;
  const difficulty = Number(run.difficulty) || 1, map = Number(node.mapIndex ?? run.mapIndex) || 0, row = Number(node.row) || 0;
  if (!node.elite && map === 0 && ((difficulty === 1 && row <= 2) || (difficulty === 2 && row === 0))) return false;
  return true;
}
export function departureRunState(run, node, {profile = null} = {}) {
  const practice = run?.isTutorial === true;
  const cardsRun = isCardRun(run);
  const slots = cardsRun ? Math.max(0, Number(run.cardSlots) || (run.mountedCards || []).length) : 0;
  const mounted = cardsRun ? (run.mountedCards || []).slice(0, slots) : [];
  const chain = mounted.filter(card => card && !isInventoryOnlyCard(card)).map(card => card.cardId || card.id);
  const held = cardsRun ? (run.reserveCards || []).filter(card => card && storedKinds.has(CARD_CATALOG[card.cardId || card.id]?.kind)).map(card => card.cardId || card.id) : [];
  const attempt = run?.lastAttempt;
  return {
    cards: [...chain, ...held], chain, slots, filled: mounted.filter(Boolean).length,
    hearts: run?.lives ?? 3, maxHearts: run?.maxLives ?? 3,
    biome: practice ? null : getBiome(node)?.id ?? null,
    hazards: courseHasBlackHole(run, node, profile) ? ['black-hole'] : [],
    flight: (run?.stats?.flights || 0) + 1,
    companion: (run?.companions || [])[0] || run?.companionRole || null,
    stored: practice ? 0 : Math.max(0, Number(run?.condensedGlow) || 0),
    lastFlightLost: !practice && !!attempt && attempt.success === false && !attempt.interrupted && !attempt.practice,
    practice,
  };
}

// ── History: ids of shown tips, newest last, last 20, in localStorage ───────────────────────
export const DEPART_TIP_HISTORY_KEY = 'emberwing.depart-tips.v1';
export const DEPART_TIP_HISTORY_LIMIT = 20;
let memory = [];
const knownIds = new Set(TIPS.map(tip => tip.id));
function defaultStorage() { try { return globalThis.localStorage; } catch { return null; } }
export function readTipHistory(storage = defaultStorage()) {
  let saved = memory;
  try { const parsed = JSON.parse(storage?.getItem(DEPART_TIP_HISTORY_KEY) || 'null'); if (Array.isArray(parsed)) saved = parsed; } catch {}
  return saved.filter(id => typeof id === 'string' && knownIds.has(id)).slice(-DEPART_TIP_HISTORY_LIMIT);
}
export function writeTipHistory(history, storage = defaultStorage()) {
  memory = history.slice(-DEPART_TIP_HISTORY_LIMIT);
  try { storage?.setItem(DEPART_TIP_HISTORY_KEY, JSON.stringify(memory)); } catch {}
  return memory;
}

/** One selection per departure: the tip, its context line and its place among the tips that fit this run. */
export function selectDepartureTip({run, node, profile = null, showTips = true, storage = defaultStorage(), rand = Math.random} = {}) {
  if (showTips === false) return null;
  const state = departureRunState(run, node, {profile}), history = readTipHistory(storage);
  const tip = pickTip(state, history, rand);
  if (!tip) return null;
  const list = eligibleTips(state);
  writeTipHistory([...history, tip.id], storage);
  return {tip, why: whyLabel(tip, state), note: list.indexOf(tip) + 1, total: list.length, liftHint: state.practice || state.flight <= 3, practice: state.practice};
}
