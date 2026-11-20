/** Contextual card vocabulary. Native modal dialogs keep help above the Deck. */
import { resourceSymbol } from './game-symbols.mjs?v=guide-clarity-1';
import {lifeHeartSvg} from './lives.mjs?v=guide-clarity-1';
import {duskGlyphArt} from './spark-symbol.mjs?v=guide-clarity-1';
import {getGlowCapacity,formatGlow} from './vitality.mjs?v=guide-clarity-1';
import {glowGaugeUnits} from './glow-ui.mjs?v=guide-clarity-1';
import {getRunModifiers} from './model.mjs?v=guide-clarity-1';
import {cardAmount,makeSkillCard,SKILL_CARDS} from './skill-cards.mjs?v=guide-clarity-1';
import {cardRowTermHelpMarkup} from './card-row-help.mjs?v=guide-clarity-1';
import {dreamEye} from './dream.mjs?v=guide-clarity-1';
import {FLASH_BASE_DURATION} from './pickups.mjs?v=guide-clarity-1';
import {INSCRIPTIONS} from './inscriptions.mjs?v=guide-clarity-1';
import {inscriptionGlyph} from './inscription-glyphs.mjs?v=guide-clarity-1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const CARD_TERMS = Object.freeze({
  inscription: ['Inscription', 'An effect written on a Chain slot, not on a card. It stays on the slot when cards move, swap or leave. Some change the card on that slot; some work on any slot, even an empty one. Get one from the Scribe after an Elite or Guardian. One per slot; writing again replaces it.'],
  'ins-card': ['Card Inscription', 'Changes the card in its slot. It does nothing while the slot is empty, and works on whatever card you put there.'],
  'ins-slot': ['Slot Inscription', 'Works on its own, on any slot, even an empty one.'],
  round: ['Round', 'One flight through a passage, ending in clear rewards or a lost heart.'],
  map: ['Map', 'A route of Rounds and Rest stops, ending at a Guardian.'],
  game: ['Game', 'One journey through 3 Maps, ending at the final Guardian or when you run out of hearts.'],
  spark: ['Spark', 'A pickup in the passage that your wisp can touch or Collector can deliver.'],
  meter: ['Spark Meter', 'The segmented bar of fuel your wisp spends to Lift. It never holds more than 100 Sparks.'],
  dusk: ['Dusk Spark', 'A rose crescent pickup that drains up to 3 Sparks and dims Luminance for 4 seconds when touched.'],
  luminance: ['Luminance', 'The radius of light around your wisp that reveals nearby passage.'],
  heart: ['Heart', 'One remaining attempt at a Round.'],
  stored: ['Stored Sparks', 'The boxed savings you spend on cards at Rest.'],
  wisp: ['Wisp', 'The larger flying light you control and use to touch pickups yourself.'],
  lift: ['Lift', 'Tap or press Lift to rise, spending fuel from your Spark Meter.'],
  proximity: ['Proximity', 'Skim near solid terrain for 2 seconds to send a revealing Pulse.'],
  wave: ['Pulse', 'An expanding ring of light. Its edge lights the passage as it travels. As a Trigger: a Pulse crosses a Spark you have not collected, or a card to its left sends a Pulse.'],
  collector: ['Collector', 'The small green light that catches a missed pickup and reels it to your wisp.'],
  ring: ['Collector charge', 'The visible orbit around your wisp shows Collector charge: a full orbit means maximum reach.'],
  flash: ['Flare', `A white triangle. For ${FLASH_BASE_DURATION} seconds it sends a Pulse every 2 seconds and raises your Luminance very high. Some cards react when you Collect one or when it ends.`],
  cache: ['Cache', 'A dense pickup worth 18 Sparks on your touch or 12 on a Cache Handling delivery.'],
  rest: ['Rest', 'A checkpoint where you choose an action and can improve your Deck. At Rest cards work from there and never go in the chain.'],
  uses: ['Uses', 'A limited card spends one use when its effect succeeds and leaves your Deck at zero.'],
  shared: ['Shared uses', 'Echo and Chameleon spend uses from the actual card they copy.'],
  next: ['Repeat', 'Role: the card fires when the card in the Slot directly to its right fires. Echo and Chameleon work this way.'],
  copy: ['Copying cards', 'Echo repeats the next card; Chameleon acts as the next card.'],
  packing: ['Packing', 'Convert spare passage fuel into Stored Sparks during a Round and after a successful clear.'],
  'packing-efficiency': ['Stored Sparks from packing', 'Tight Packing adds a percentage of extra Stored Sparks to ordinary Packing.'],
  grow: ['Grow', 'At Rest, owned Growth Seeds add maximum Sparks and refill your Spark Meter.'],
  cluster: ['Cluster', 'A group of Sparks that counts as one pickup.'],
  rhythm: ['Rhythm', 'Perform 3 successful Lifts at an even pace to send one Pulse.'],
  dream: ['Dream', 'Equip Dream to rehearse 8 seconds after Rest or before an Elite or Guardian, in full light with free Lifts. Devour makes it longer.'],
  devour: ['Devour', 'At take-off, this card destroys the card to its right and grows. The growth stays on this card and is lost with it. Nothing to its right: nothing happens.'],
  watchlight: ['Watchlight', 'With Collector beside you at full charge, block one fatal impact per flight and send a Pulse.'],
  pass: ['Chain', 'Your cards in Slots 1 to 5. When a Trigger happens, they fire left to right.'],
  slot: ['Slot', 'One place in your chain, numbered 1 to 5 from the left. Rest can give you more Slots.'],
  trigger: ['Trigger', 'What makes your chain fire, such as Collect, Pulse or Delivery. Each card shows its Trigger first, or its role: Passive, Boost or Repeat.'],
  boost: ['Boost', 'Role: works with whatever Trigger fires the chain. Most Boosts are × cards: It multiplies the Sparks and Collector time of every card to its left. Never Stored Sparks or forever gains.'],
  encore: ['Encore', 'Refrain fires the chain once more for the same Trigger, from Slot 1.'],
  'always-on': ['Passive', 'Role: the card works all the time while it is in your chain, whatever fires the chain. A Boost to its right still strengthens its bonus.'],
  collect: ['Collect', 'Trigger: your wisp touches a Spark, Cluster, Cache or Dusk Spark.'],
  delivery: ['Delivery', 'Trigger: Collector brings you a pickup. Some cards fire when your Collector grabs a Spark.'],
  overfill: ['Overfill', 'Trigger: a Spark brings more than your meter can hold.'],
  'falling-lift': ['Lift', 'Trigger: some cards need a Lift while falling, or a Lift on the beat (Rhythm) or on the cue (Lift Guide), or a Lift with your meter under half.'],
  clear: ['Finish', 'Trigger: you clear a flight, or you pack your spare Sparks at the end of it.'],
  engine: ['Engine', 'A chain that keeps itself going: one card’s event fires a card to its right, and a Timer sends it back to Slot 1.'],
  chance: ['Chance', 'A percentage on a card is a roll each time the card would fire. If it fails, nothing happens.'],
  turn: ['Timer firing', 'Each time a Timer card fires, the Chain is walked again from the first slot.'],
  timer: ['Timer', 'A card that acts on a clock: Metronome fires the next card every 3 s, Slow Wick sends a Pulse every 3 s, Long Fuse repeats your last Trigger every 5 s, both by themselves. Each time one fires, the Chain is walked again from the first slot; without a Timer an engine runs once. A Pulse a Timer sends is a beat: each Pulse card that hears it fires once.'],
  'engine-skim': ['Skim', 'Trigger: you fly close to terrain until Proximity fills.'],
  timers: ['Timers', 'The card changes every Timer card in your chain.'],
  'take-off': ['Take-off', 'When you start a flight. Cards that say At take-off act then.'],
});

const CARD_TERM_DETAILS = Object.freeze({
  round: 'Clear a Round to earn its rewards and choose your next stop. A failed attempt costs one heart; you can retry while hearts remain.',
  map: 'Effects that last for this Map end when you move to the next Map. A full Game contains 3 Maps.',
  game: 'A new Game starts a fresh journey and Deck. Effects that last for this Game remain through its Maps.',
  spark: 'Touching a natural Spark, Cluster or Cache refills the meter. That touch is the Collect Trigger, which fires cards such as Body Spark and Pocket Sparks. A Collector delivery (Delivery) and a Pulse crossing the pickup (Pulse) are different Triggers. Dusk Sparks drain fuel before card Sparks arrive. Pickups created by powers do not Collect.',
  meter: 'Touch passage pickups or gain Sparks from cards to refill this bar. Maximum Sparks means the bar’s capacity, which never goes above 100 Sparks: a card that would add more says Max 100 reached. A capacity card does not refill it. Overflow can be packed into Stored Sparks, but Sparks made by cards cannot be packed. The Lift cost shown here uses the paused flight when available; otherwise it uses your current build or the labelled base example.',
  stored: 'Earn Stored Sparks by clearing flights, packing spare fuel or melting cards. Spend them at Rest to Forge, improve or Evolve cards. These services use no Rest action.',
  wisp: 'A direct touch means your wisp meets the pickup itself. A Collector delivery or a Pulse passing over the pickup is a different event.',
  lift: 'You choose when to Lift, even with Lift Guide equipped. A successful Lift spends the next cost shown by the flight controls; effects can temporarily change that cost.',
  dusk: 'Touching Dusk dims Luminance by 20% for 4 seconds. Collector leaves it alone. Dusk Wick pays its bonus after the drain.',
  luminance: 'Dusk and Dark Sparks briefly reduce your light radius. Lantern Lens increases it while equipped.',
  wave: 'Flare triangles, terrain and cards can all send a Pulse. When its edge crosses an uncollected Spark, Resonant Harvest pays once. The Spark stays in place and another Pulse can cross it again.',
  cache: 'Cache Handling unlocks Collector delivery. Extra Cache Handling cards keep one 12-Spark delivery. Direct touch and Pulse crossing can trigger different cards; crossing leaves the Cache in place.',
  rest: 'Recover heals and refills your meter. Add slot gives an empty Slot in your chain. Growth Seed adds Grow. Open the Workshop to Forge a surprise card, improve or refill cards.',
  uses: 'Pocket Sparks spends 1 use per successful direct pickup bonus. Second Ember spends its use only after your second different Rest action succeeds. An unsuccessful condition spends no use.',
  shared: 'A repeat or borrowed effect spends a use from its copied card when it succeeds. Copying adds no new uses. Independent equipped cards keep their own uses.',
  next: 'An empty Slot or a card that cannot be copied gives nothing to copy. Changing the order changes what Echo and Chameleon copy.',
  cluster: 'Your wisp can touch a Cluster and Collector can fetch it. Pickup bonuses check the Cluster once, rather than checking every bright core.',
  rhythm: 'All 3 Lifts must succeed and be evenly spaced. You perform them yourself. Extra Rhythm cards still send only one Pulse.',
  dream: 'With Dream equipped, your next flight directly after a visited Rest, or an Elite or Guardian, starts with an 8-second golden rehearsal (longer once Dream has devoured: up to 40 seconds). Ordinary flights elsewhere start normally. Go back to sleep to practise again, or Wake up at the end of the chosen opening with its pickups and free Lifts. Waking starts paused; resume builds slowly back to full speed and does not Lift. Rehearsing spends no heart, card uses or saved Sparks and grants no run rewards. Devour: at take-off Dream destroys the card to its right and grows by 0.5 seconds for a Common, 1 for a Rare or 3 for a Legendary, up to 40 seconds in all. The time is stored on that Dream, shown on its face, and lost if Dream leaves your chain or is melted or sold. Extra Dream cards keep the longest opening. Echo and Chameleon cannot copy it.',
  watchlight: 'Watchlight is a once-per-flight shield against a fatal impact. Collector must be beside your wisp at full charge. After the save it cannot fetch for 4 normal recovery cycles. Mending Moss shortens only this recovery when your wisp directly touches a Spark.',
  "heart": "Each heart is one remaining attempt. A failed flight costs one heart. Heart Stitch restores a missing heart after three direct passage Spark pickups in one flight; it spends a use only when healing succeeds. Devourer can restore one after a clear by consuming the adjacent Rare. Full hearts spend no healing use or Rare target.",
  "proximity": "Skim near solid terrain for 2 seconds to send a revealing Pulse. The reveal lasts 5 seconds, then recovers for 2 seconds. Proximity enables normal reach while equipped, without Collector. Edge Reach also enables this and adds 50% of normal reach per equipped or Chameleon-borrowed source. Echo cannot repeat a passive ability. Brief gaps keep progress for 1.25 seconds; contact, protection and Dream never charge it.",
  "collector": "The small green light beside your main wisp. It catches a missed pickup and reels the intact pickup back to your moving wisp. Sparks arrive on contact. It stays busy during the reel, then rebuilds charge before its next search. Cache Handling and Flare Handling let it fetch those pickups too.",
  "ring": "Collector’s search reach. Its orbit shows the available reach. After each delivery Collector rebuilds charge before its next search. Base recovery is 3⅓ seconds for a 6-Spark pickup, 6⅔ for a 12-Spark pickup, and 10 for an 18-Spark pickup, before compression and build modifiers. Flare uses the 10-second base.",
  "flash": "The white triangle. For "+FLASH_BASE_DURATION+" seconds it sends a Pulse every 2 seconds and raises your Luminance very high. Some cards react when you Collect one or when it ends. Flare Handling lets Collector fetch it. Each Flare Handling in your chain, or copy of one, also gives +6 Sparks when either of you picks one up (Collect a Flare), so a Boost to its right strengthens it.",
  "copy": "Echo repeats the action on the card to its right. Higher Echo tiers repeat it more times, as printed. Chameleon borrows its ability. They share that card’s uses. Echo cannot repeat Deep Vessel or Edge Reach, because passive abilities have no action. Neither can copy Echo, Chameleon, Lift Guide, Rhythm, Cache Handling or Rest cards.",
  "packing": "Convert spare passage Sparks into Stored Sparks during a Round and from the spare meter at its successful exit. Tight Packing adds extras to the Stored Sparks this conversion normally makes. Open Stored Sparks from packing for examples and exclusions.",
  "packing-efficiency": "Adds extra Stored Sparks to the amount ordinary packing makes from spare passage Sparks. +50% means 2 ordinarily made → 3 total; +75% means 4 → 7 total; +100% means 1 → 2 total. Cards in your chain, Echo repeats and Chameleon copies add their percentages: two +50% sources give +100%. A Boost to the right of a packing card multiplies its percentage (+50% ×2 = +100%), up to +900% in all. Fractions carry between cleared Rounds, and whole extras pay as they are earned. With Rare and no earlier fraction, making 1, 2, 3, then 4 ordinary Stored Sparks earns 0, 1, 2, then 3 extras in total. With Common, making 1 this Round and 1 next Round earns 1 extra overall. A failed Round keeps the fraction saved before that attempt and banks none of that attempt’s new packing. Rewards, card payouts, Melt and the extra Stored Sparks do not earn packing extras. Generated or Dream pickups and bonus fuel from cards do not count.",
  "grow": "Keep Growth Seeds in your Deck to unlock Grow at Rest. You hold only one Growth Seed: any Seed you gain merges into it, adds its amount and the best rarity shows. Each Seed adds its printed amount to your maximum Sparks, up to +90 total: Common +3, Rare +5, Legendary +8 (improved to +9 or +10). Grow refills the meter once and does not heal hearts. All Seeds share 3 Grow actions per journey. No active slot is needed; copying cards cannot copy Rest cards.",
  "pass": "Your chain fires only when a card in it has that Trigger, such as Collect when your wisp touches a Spark. The cards then fire left to right, from Slot 1. A card works only if its Trigger and condition match; empty Slots, always-on cards and cards with other Triggers wait. The Sparks start at zero each time: + cards add Sparks, and a Boost (× card) multiplies the Sparks and Collector time of every card to its left; Stored Sparks and forever gains always stay at their printed amount. Echo repeats the next card in its own Slot and spends that card’s uses. With Refrain, the chain fires once more from Slot 1 for the same Trigger, an Encore. Uses spent stay spent, so the Encore can give less or nothing, and it makes no extra pickup or Pulse. Card Sparks fill only the room left in your meter after the pickup’s own fuel.",
  slot: "Order matters only where a card says so: Boosts reach cards to their left, Echo and Chameleon copy the next card, Kindling Bead needs a + card before it, and Closing Chord must be the last card. You start with 3 Slots and Rest can add up to 5.",
  trigger: "The Triggers are Collect, Lift, Pulse, Delivery, Overfill, Finish and Skim. Boost cards work with all of them; Passive cards and At Rest cards do not wait for one. One touch can be two Triggers: a Spark that overfills your meter is Overfill, then Collect.",
  boost: "Boosts sit to the right of the cards they strengthen. Several Boosts multiply together (×1.25 then ×2 is ×2.5). Fractions round up: each firing’s Sparks are rounded up to a whole number at the end (2.5 becomes 3); Collector time keeps its decimals. They also strengthen always-on cards to their left (+20% Luminance ×2 = +40%), except Boosts that have their own Trigger or limited uses. Boosts never multiply Stored Sparks rewards or gains that last beyond the journey, such as Growth Ring and Wind Feather. Caps still apply: the meter stops at 100 Sparks, and boosted time never brings Collector below half a second.",
  engine: "Events made by a card travel to the right only. A card never answers an event it made itself in the same firing. An engine stops when a card cannot do its job, for example on a full meter; as Lift spends Sparks, the next event can start it again. Without a Timer a chain runs once.",
  timer: "Slow Wick sends a Pulse every 3 s, with or without a Pulse to start it; each Pulse card that hears it fires once. Metronome, once an event reaches it, fires the card to its right every 3 s while that card can act. Long Fuse fires your last Trigger again every 5 s. Heartbeat halves every wait.",
  encore: "All Refrains share one Encore per Trigger. It happens only if something worked the first time. The Sparks start at zero again, uses spent stay spent, and a first-crossing Stored Spark comes only once. Second Sun multiplies by more in an Encore.",
});

/** The same game artwork and keyword ink appear on cards and in their glossary. */
const termArt = Object.freeze({
  spark: () => resourceSymbol('energy'),
  meter: () => resourceSymbol('energy'),
  dusk: () => duskGlyphArt(),
  heart: () => lifeHeartSvg(),
  stored: () => resourceSymbol('packed'),
  lift: () => resourceSymbol('lift'),
  dream: () => dreamEye,
});
export function cardTermIcon(key) {
  return termArt[key] ? `<span class="card-term-icon card-term-icon-${esc(key)}" aria-hidden="true">${termArt[key]()}</span>` : '';
}
export function cardTermMarkup(key, label = CARD_TERMS[key]?.[0] || key, {icon = true, iconOnly = false, accessibleLabel = label} = {}) {
  return `<button type="button" class="card-term${iconOnly ? ' card-term-symbol' : ''}" data-card-term="${esc(key)}" aria-haspopup="dialog" aria-label="${esc(accessibleLabel)}: help">${icon || iconOnly ? cardTermIcon(key) : ''}${iconOnly ? '' : esc(label)}</button>`;
}

// Runtime descriptions use the same vocabulary without maintaining a second rules renderer.
const keywords = [
  ['Packing efficiency|Stored Sparks from packing', 'packing-efficiency'],
  ['Take-off', 'take-off'], ['Timers', 'timers'], ['Skim', 'engine-skim'],
  ['Turns?', 'turn'], ['engines?', 'engine'], ['Timer', 'timer'], ['Triggers?', 'trigger'], ['Passive', 'always-on'], ['Finish', 'clear'], ['Encore', 'encore'],
  ['Collect', 'collect'], ['Delivery', 'delivery'], ['Overfill', 'overfill'],
  ['Dusk(?: Sparks?)?', 'dusk'], ['Luminance', 'luminance'],
  ['Proximity(?: waves?)?', 'proximity'], ['Stored Sparks?', 'stored'], ['hearts?', 'heart'], ['(?:Light )?pulses?|waves?', 'wave'],
  ['Watchlight', 'watchlight'], ['Devour(?:s|ed)?', 'devour'], ['Dream', 'dream'], ['Rhythm(?: phrase)?', 'rhythm'], ['Clusters?', 'cluster'], ['Collector charge|full charge|¼ charge|charge|ring', 'ring'], ['Collector', 'collector'], ['Flare(?: Powerups?)?', 'flash'], ['Caches?', 'cache'],
  ['Spark Meter|meter', 'meter'], ['Sparks?', 'spark'], ['wisps?', 'wisp'], ['Lifts?', 'lift'], ['Rest', 'rest'], ['Grow', 'grow'],
  ['Shared uses|Share its (?:remaining )?uses|Copies share uses', 'shared'], ['remaining (?:uses|charges)|uses?', 'uses'], ['pack(?:ing|ed|s)?', 'packing'], ['next card|next slot|card to the right', 'next'],
  ["chain(?:’s|'s)?", 'pass'], ['Inscriptions?', 'inscription'], ['Slots?', 'slot'], ['Repeats?|Borrow|Acts as', 'copy'],
  ['Rounds?', 'round'], ['Maps?', 'map'], ['Game', 'game'],
];
const keywordPattern = new RegExp(`\\b(${keywords.map(([pattern]) => pattern).join('|')})\\b`, 'gi');
// The same word names a passage pickup and the fuel it awards. A numeric
// payout/capacity links to the meter; touch/collection/crossing links to pickup help.
function sparkTermForMatch(text, match, context) {
  if (context === 'pickup') return 'spark';
  if (context === 'meter') return 'meter';
  const before = text.slice(Math.max(0, match.index - 90), match.index);
  if (/[+−-]\d+(?:\.\d+)?\s+$/.test(before)) return 'meter';
  if (/\b(?:touch\w*|absorb\w*|collect\w*|deliver\w*|cross\w*|fetch\w*)\s+(?:up to\s+)?\d+(?:\.\d+)?\s+$/i.test(before)) return 'spark';
  if (/(?:[+−-]?\d+(?:\.\d+)?\s+(?:(?:maximum|max|missing|extra|bonus|more|fewer)\s+)*|\b(?:maximum|max|missing|bonus|extra|more|fewer)\s+)$/i.test(before)) return 'meter';
  const clause = before.split(/[.!?;:]/).at(-1);
  if (/\b(?:touch\w*|absorb\w*|collect\w*|deliver\w*|cross\w*|fetch\w*|pickup|pickups|passage|natural|uncollected|missed|dark|generated)\b/i.test(clause)) return 'spark';
  return /^Spark$/i.test(match[0]) ? 'spark' : 'meter';
}
export function cardTermTextMarkup(value, {exclude = [], sparkContext} = {}) {
  const text = String(value ?? ''), seen = new Set();
  let cursor = 0, result = '';
  for (const match of text.matchAll(keywordPattern)) {
    const found = keywords.find(([pattern]) => new RegExp(`^(?:${pattern})$`, 'i').test(match[0]))?.[1];
    const key = found === 'spark' ? sparkTermForMatch(text,match,sparkContext) : found;
    const label = /remaining (?:uses|charges)/i.test(match[0]) ? 'Uses' : match[0];
    result += esc(text.slice(cursor, match.index));
    result += exclude.includes(key) ? esc(label) : cardTermMarkup(key, label, {icon:!seen.has(key), accessibleLabel:key==='meter'?'Spark Meter':label});
    seen.add(key); cursor = match.index + match[0].length;
  }
  return result + esc(text.slice(cursor));
}

const CARD_NOTES = Object.freeze({
  dream: CARD_TERM_DETAILS.dream,
  'use-doubler': 'When an actual flight starts, Use Doubler consumes itself to double the remaining uses of the real card directly to its right. The added uses and expanded ceiling belong to that exact card through swaps, saves and eligible paid refills. An empty Slot, a spent card, a lasting card or another Use Doubler keeps the card unspent. Opening a preview, Dream, pausing, resuming and reloading never repeat a grant. Echo, Chameleon and an Encore cannot copy it.',
  'ember-feeder': 'After a successful real flight, Ember Feeder consumes the first two occupied cards anywhere to its right together, skipping empty slots (or just one when only one is there; Growth Ring, Wind Feather and Deep Vessel are skipped). One card adds one maximum Spark and two cards add three to that specific Ember Feeder while equipped. Stored growth survives swaps and saves, but removing, melting or consuming the Feeder removes its capacity bonus. Equipping never refills the meter. Heart Stitch heals first; physical consumers then resolve left to right before clear rewards. Failed flights, Dream, copies and Encores never feed it.',
  'devourer': 'After a successful clear, Devourer can consume the actual Rare card immediately to its right to restore one missing heart. That Rare must have been equipped for the flight and remain present. Full hearts and failed flights spare it. Heart Stitch heals first; Devourers then resolve from left to right. The target disappears, while Devourer remains. Echo, Chameleon and an Encore cannot copy it.',
  'slip-feather': 'Proximity enables terrain charging at normal reach without Collector or another skill. Skim near real solid terrain for 2 seconds; open sky and touching terrain never charge it. Extra Proximity cards share one meter. Edge Reach is the Rare version with additional reach. Removing every Proximity and Edge Reach source turns it off unless you learned the native skill.',
  'springboard': 'Touch a natural fuel pickup while descending to bounce upward at half your ordinary Lift impulse. Generated pickups, Collector deliveries, Flare and Pulse crossings do not trigger it. The bounce costs no Sparks and never counts as a manual Lift, Downbeat or Rhythm tap. Springboard cannot be copied; extra equipped copies keep one bounce.',
  'diving-bell': 'When the current passage Flare expires, Prism Wick sends one final revealing Pulse and pays 3 bonus Sparks. A new Flare refreshes the timer. Generated and Dream Flare do not qualify. Echo and Chameleon share its three uses; an Encore can repeat its +3 Sparks, while the expiry always sends one final Pulse.',
  'tailwind': 'While a heart is missing, each direct natural fuel pickup advances Heart Stitch. Three in the same flight restore one heart and spend one of its two uses. Full hearts, Collector deliveries, generated pickups, Flare and Dream do not advance it. Progress resets between flights. Earned healing and spent uses survive a failed attempt. This card cannot be copied.',
  'edge-reach': 'Edge Reach enables the existing proximity Pulse, independently of Collector’s ring. Normal reach is about 2.6 wisp widths; one source reaches 3.9 and two reach 5.1. Sources add 50% of normal reach, rather than multiplying each other. Removing every source turns proximity off unless you learned the native skill. Equipping never sends a Pulse or refills its charge.',
  'body-spark': 'This bonus works when your wisp touches a passage Spark, Cluster, Cache or Dusk Spark. Dusk drains fuel before paying the card bonus. Collector deliveries, Pulse crossings and pickups created by powers do not trigger it. The extra Sparks cannot be packed.',
  'spark-cache': 'Touch a passage Spark, Cluster, Cache or Dusk Spark to gain the bonus and spend 1 use. Dusk drains fuel before paying the card bonus. Collector deliveries, Pulse crossings and pickups created by powers do not trigger it. The extra Sparks cannot be packed.',
  'deep-vessel': 'Your maximum is higher while this card is in your chain, and a Boost to its right multiplies the extra. Removing it lowers the maximum again. It does not refill the meter, and the meter never holds more than 100.',
  'harvest-common': 'The Pulse must cross an uncollected fuel pickup already in the passage. Pickups created by powers do not count. This refills your meter without collecting the Spark or adding packing rewards.',
  'harvest-rare': 'The Pulse must cross an uncollected fuel pickup already in the passage. Pickups created by powers do not count. This refills your meter without collecting the Spark or adding packing rewards.',
  'harvest-legendary': 'The Pulse must cross an uncollected fuel pickup already in the passage. Pickups created by powers do not count. The meter refill does not collect it or add packing rewards. The extra Stored Spark is awarded once per Pulse, at its first crossing, even if the meter is full.',
  'flash-handling': 'Either your wisp or Collector picking up Flare is Collect a Flare: each Flare Handling in your chain, or copy of one, gives +6 Sparks, and a Boost to its right strengthens it. Collector makes one pickup; the meter cannot go above its maximum.',
  'growth-seed-common': 'Keep in your Deck to unlock Grow at Rest. You hold only one Growth Seed: any Seed you gain merges into it, adds its amount and the best rarity shows. Each owned Seed adds its printed maximum Sparks, up to +90 total. All Growth Seeds share 3 Grow actions per journey. Each action refills the meter once, without healing hearts. At Rest, Evolve Common to Rare for the current Rare Forge price, then Rare to Legendary for the current Legendary Forge price.',
  'growth-seed': 'Keep in your Deck to unlock Grow at Rest. You hold only one Growth Seed: any Seed you gain merges into it, adds its amount and the best rarity shows. Each owned Seed adds its printed maximum Sparks, up to +90 total. All Growth Seeds share 3 Grow actions per journey. Each action refills the meter once, without healing hearts. At Rest, Evolve Rare to Legendary for the current Legendary Forge price.',
  'growth-seed-legendary': 'Keep in your Deck to unlock Grow at Rest. You hold only one Growth Seed: any Seed you gain merges into it, adds its amount and the best rarity shows. Each owned Seed adds its printed maximum Sparks, up to +90 total: +8 at rank 1, +9 at rank 2 and +10 at rank 3. All Growth Seeds share 3 Grow actions per journey. Each action refills the meter once, without healing hearts.',
  'tight-packing': CARD_TERMS['packing-efficiency'][1],
  'tight-packing-ii': CARD_TERMS['packing-efficiency'][1],
  'tight-packing-iii': CARD_TERMS['packing-efficiency'][1],
  'ring-spring': 'Each Overfill banks 1 second (Ring Spring II: 2) that comes off the NEXT Collector recovery, never below 0.5 s. The banked seconds show on the card until used. A Boost to its right strengthens them.',
  'ring-spring-ii': 'Each Overfill banks 2 seconds that come off the NEXT Collector recovery, never below 0.5 s. The banked seconds show on the card until used. A Boost to its right strengthens them.',
  'crate-lining': 'Pays +8 Sparks when Collector delivers a Cache, and half of that (+4) when it delivers a Cluster. 4 uses; Cache Handling is not needed for the Cluster part.',
  'cache-handling': 'Extra Cache Handling cards keep one 12-Spark delivery. Your wisp can always touch a Cache for 18 Sparks, plus any pickup card bonus.',
  'twin-orbit': 'While equipped, a second Collector catches and reels independently. Each pickup belongs to one Collector. Two is the maximum. Removing the card releases its second Collector’s current load. The first Collector keeps fatal-impact saves.',
  'twin-wick': '4 uses. Each real flight with this mounted spends one: fly with 2 Collectors. Preview, practice and Dream do not spend one. Nothing is spent while Twin Orbit already supplies the second Collector. At 0 uses it does nothing.',
  'long-spool': 'For five extra catches, Collector can reach 35% beyond its current normal range. A use is spent only when an eligible missed pickup beyond normal reach is actually attached. Your wisp gets the whole approach and contact window. Long Spool and Cast Line do not stack; the shortest sufficient extension spends one use. Copies share the original uses.',
  'cast-line': 'For two extra catches, Collector can reach twice its current normal range. Only successful attachments beyond normal reach spend a use. Long Spool pays first if its shorter extension can reach the pickup. Neither extension changes which pickup types Collector can carry or takes the player’s first chance to touch them.',
  'fast-spool': 'Touching a natural passage Spark while a Collector reels shortens one active reel by up to 3 seconds. The longest active reel is chosen. Each successful action spends one of this card’s three uses. Copies spend this card’s uses too. No use is spent when there is no remaining reel time.',
  rhythm: 'All 3 Lifts must succeed and be evenly spaced. You perform them yourself. Extra Rhythm cards still send one Pulse.',
  'camp-kit': 'Keep in your Deck when arriving at Rest to choose 2 different actions. No active slot is needed. Spend the use only after the second action succeeds. Extra Second Ember cards do not add a third action or spend another use.',
  'skim-line': 'Turns Proximity on for the flight: that is part of the card, so flying close to terrain now builds the Proximity meter. A thin gold band hugs the terrain near your wisp, where a Skim counts: flying within Proximity reach of terrain. It brightens while you are inside it. When Proximity fills (a Skim), +12 Sparks. Needs no other card. Extra copies keep one band and each pays.',
  'pulse-reader': 'While mounted it sends its own Pulse every 8 seconds, and a soft ring on your wisp tightens just before any Pulse front reaches a Spark you have not collected. That crossing adds 1 Spark. Its own Pulse reaches only cards to its right and never fires Pulse Reader itself.',
  'courier-cord': 'Collector’s cord glows brighter and flashes once at each drop-off. Each Delivery adds 10 Sparks over the next 10 seconds; Deliveries add up. Needs Collector.',
  'meter-mark': 'A gold notch at the top of the Spark Meter glows when the Meter is nearly full. Each Overfill, 50%: keeps 1 spilled Spark as a Stored Spark. A Boost does not multiply Stored Sparks.',
  'finish-flag': 'A thin gold bar along the bottom edge fills toward the finish. Each Finish adds 2 Stored Sparks. A Boost does not multiply Stored Sparks.',
  'lift-guide': 'The amber chevron uses your current fall and Lift impulse. It opens when a Lift can rise back to its starting height, as from level flight. It does not judge terrain; choose when to tap. A Lift tapped while the chevron is open is on the cue: 50% chance of +1 Spark. Extra copies keep one chevron.',
});

// Explanatory pictures are captures of the running game, never replacement art.
const termPictures = Object.freeze({
  spark: {src:'./assets/help/spark-flight.png', alt:'A bright Spark suspended in the passage, captured from the running game.', caption:'A Spark in the passage. Touch it with your wisp to absorb it.'},
  flash: {src:'./assets/help/flash-flight.png', alt:'The white triangular Flare pickup in the passage, captured from the running game.', caption:'Flare is the white triangle. It sends a Pulse every 2 seconds and lights like very high Luminance.'},
  wisp: {src:'./assets/help/wisp-flight.png', alt:'The main white wisp flying in the passage, captured from the running game.', caption:'Your main wisp is the larger white light.'},
  wave: {src:'./assets/help/wave-flight.png', alt:'An actual revealing Pulse spreading through the passage.', caption:'A Pulse reveals the passage as it spreads outward.'},
  proximity: {src:'./assets/help/wave-flight.png', alt:'The revealing Pulse used by Proximity, rendered in the passage.', caption:'Skimming terrain can send this revealing Pulse. The live example below shows the required distance.'},
  collector: {src:'./assets/previews/collector-tether/reel-front.png', video:'./assets/previews/collector-tether/reel.mp4', alt:'The small green Collector tows a swinging Spark through seven Lifts, then delivers it to the larger white wisp.', caption:'Actual flight: the trailing Spark swings as you Lift. Collector reels it in; Sparks arrive on contact.'},
});
// Gameplay clips for glossary terms (recorded from the real game by scripts/term-clips.mjs; docs/term-clips.md).
// The clip comes first in a term's dialog, then ONE short line; the full text moves under "More details".
// Paths are built from this directory string on purpose: pwa-assets.mjs follows literal asset paths into the offline
// list, and these clips are fetched on demand instead (offline, the poster or just the text shows).
const TERM_CLIP_DIR = './assets/terms/';
export const TERM_CLIP_LINES = Object.freeze({
  luminance: ['More Luminance lights more of the passage around your wisp.', 'Light around the wisp: a small radius, then a larger one.'],
  flash: ['Take the white triangle: your light jumps and a Pulse leaves every 2 seconds.', 'The wisp takes a Flare; the light jumps and rings of light follow.'],
  wave: ['A ring of light. Cards that listen for Pulses pay when it crosses a Spark.', 'A Pulse ring crossing Sparks while a card pays.'],
  collect: ['Touch a Spark and every card waiting for Collect fires.', 'The wisp touches a Spark and the Chain pays.'],
  'falling-lift': ['Lift while you are falling to fire the cards that wait for it.', 'The wisp falls, Lifts, and the Chain fires.'],
  rhythm: ['Three evenly spaced Lifts send one Pulse.', 'Three even Lifts, then a Pulse leaves the wisp.'],
  'engine-skim': ['Fly close to terrain until Proximity fills; it then sends a Pulse.', 'The wisp hugs terrain, Proximity fills, and a Pulse follows.'],
  delivery: ['Your Collector brings a missed Spark home and cards fire.', 'The Collector fetches a missed Spark and delivers it.'],
  overfill: ['A Spark that does not fit in the full Meter spills over and fires cards.', 'The Meter is full; the extra Sparks spill and are kept.'],
  devour: ['At take-off this card eats the card on its right and grows.', 'The Chain screen marks the card that take-off will eat.'],
  inscription: ['A mark on the slot, not on the card: the slot changes the card it holds.', 'A branded slot and the card on it firing.'],
  next: ['Fires again whenever the card on its right fires.', 'Echo repeats the card on its right.'],
  boost: ['Multiplies every card to its left.', 'Boosts multiply the cards on their left.'],
});
export const termClipFor = key => TERM_CLIP_LINES[key] ? {key, src: `${TERM_CLIP_DIR}${key}.mp4`, poster: `${TERM_CLIP_DIR}${key}.webp`, line: TERM_CLIP_LINES[key][0], alt: TERM_CLIP_LINES[key][1]} : null;
/** Clip first: autoplaying muted loop (a poster with a play button when motion is reduced), then the one-line summary. */
export function termClipMarkup(key, {reducedMotion = false} = {}) {
  const clip = termClipFor(key);
  if (!clip) return '';
  return `<figure class="card-term-clip" data-card-term-clip="${esc(key)}"><video src="${esc(clip.src)}" poster="${esc(clip.poster)}" muted loop playsinline preload="metadata"${reducedMotion ? '' : ' autoplay'} aria-label="${esc(clip.alt)}"></video><button type="button" class="card-term-clip-play" aria-label="Play clip"${reducedMotion ? '' : ' hidden'}>&#9654;</button></figure>`;
}
const CLIP_CSS = `.card-term-dialog.card-term-has-clip{width:min(450px,calc(100vw - 24px))}
.card-term-clip{position:relative;margin:6px 0 8px;background:#101d18;border:1px solid #6f8265;line-height:0}
.card-term-clip video,.card-term-clip>img{display:block;width:100%;height:auto;max-height:min(44vh,190px);object-fit:contain;background:#101d18;image-rendering:pixelated}
.card-term-clip-play{position:absolute;inset:0;margin:auto;width:56px;height:56px;min-height:56px;border-radius:50%;border:2px solid #f4e7b9;background:#101d18d9;color:#f4e7b9;font:22px/1 var(--pixel,monospace);cursor:pointer;padding:0}
.card-term-clip-play[hidden]{display:none}
.card-term-short{margin:0 0 6px}
.card-term-extra .card-term-long{margin:0 0 8px}
@media(max-height:420px){.card-term-clip video,.card-term-clip>img{max-height:min(32vh,128px)}.card-term-clip{margin:4px 0 6px}}`;
function ensureClipStyles(doc) {
  if (doc.getElementById('card-term-clip-style')) return;
  const style = doc.createElement('style'); style.id = 'card-term-clip-style'; style.textContent = CLIP_CSS; (doc.head || doc.body).appendChild(style);
}
const prefersReducedMotion = doc => !!(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || doc.documentElement?.dataset.reducedMotion === 'true');
/** Autoplay (or the play button), and the offline fallback: no clip -> the poster if it loads, else just the text. */
function armTermClips(dialog) {
  for (const figure of dialog.querySelectorAll('.card-term-clip')) {
    const video = figure.querySelector('video'), button = figure.querySelector('.card-term-clip-play');
    const showPlay = () => { if (button) button.hidden = false; };
    button?.addEventListener('click', () => { button.hidden = true; video.play().catch(showPlay); });
    video.addEventListener('error', () => {
      const poster = new Image(); poster.alt = video.getAttribute('aria-label') || '';
      poster.onload = () => video.replaceWith(poster); poster.onerror = () => figure.remove();
      button?.remove(); poster.src = video.getAttribute('poster');
    }, {once: true});
    if (!video.hasAttribute('autoplay')) continue;
    video.play?.()?.catch?.(showPlay);
  }
}
function termPictureMarkup(key) {
  const picture = termPictures[key];
  return picture?.video ? `<figure class="card-term-picture"><video src="${esc(picture.video)}" poster="${esc(picture.src)}" controls muted playsinline preload="metadata" aria-label="${esc(picture.alt)}"></video><figcaption>${esc(picture.caption)}</figcaption></figure>` : picture ? `<figure class="card-term-picture"><img src="${esc(picture.src)}" alt="${esc(picture.alt)}" width="320" height="160"><figcaption>${esc(picture.caption)}</figcaption></figure>` : '';
}

/** Uses the same segmented units and display scale as the actual flight HUD. */
export function sparkMeterExampleState(context = {}) {
  const {run,snapshot} = context, baseCost=10;
  const maximum=Number.isFinite(snapshot?.maxFlame)?snapshot.maxFlame:run?getGlowCapacity(run):100;
  const flame=Number.isFinite(snapshot?.flame)?snapshot.flame:Number.isFinite(run?.flame)?run.flame:70;
  const buildCost=run?getRunModifiers(run).liftCostPoints/.3:baseCost;
  const paidCost=Number.isFinite(snapshot?.paidFlapCost)?snapshot.paidFlapCost:buildCost;
  const cost=snapshot?.artifactEffects?.freeLift?0:Number.isFinite(snapshot?.flapCost)?snapshot.flapCost:buildCost;
  return {units:glowGaugeUnits(flame,maximum,paidCost),flame,maximum,cost,
    label:snapshot?'Current flight':run?(context.example?'Example build':'Current build'):'Base example',
    value:formatGlow(Math.min(maximum,Math.max(0,flame))),max:formatGlow(maximum),lift:formatGlow(cost),
    after:formatGlow(Math.max(0,Math.min(maximum,flame)-cost)),canLift:flame+1e-7>=cost};
}
function meterExampleMarkup(context) {
  const state=sparkMeterExampleState(context), {units}=state;
  const rail=Array.from({length:units.capacity},(_,index)=>`<span class="glow-unit${index<units.filled?' lit':index===units.filled&&units.partial?' partial':''}"${index===units.filled&&units.partial?` style="--unit-fill:${units.partial*100}%"`:''}></span>`).join('');
  return `<figure class="card-term-example card-term-meter-example"><figcaption>${esc(state.label)} · flight meter</figcaption><div class="card-term-meter-demo"><div class="card-term-meter-rail glow-gauge-v3">${resourceSymbol('energy')}<div class="card-term-meter-bar" role="meter" aria-label="Spark Meter" aria-valuemin="0" aria-valuemax="${units.maxValue}" aria-valuenow="${units.value}" aria-valuetext="${units.value} of ${units.maxValue} Sparks; each segment holds ${units.unitCost} Sparks"><i>${rail}</i></div></div><div><strong>${state.value} / ${state.max} Sparks</strong><p>${cardTermMarkup('lift')} costs <b>${state.lift} ${Number(state.lift)===1?'Spark':'Sparks'}</b>${state.cost===0?' while free Lift is active':''}.</p><p>${state.canLift?`One Lift: ${state.value} → ${state.after} Sparks.`:`You need ${formatGlow(state.cost-state.flame)} more Sparks to Lift.`}</p></div></div></figure>`;
}
const termExamples = Object.freeze({
  round:'A clear pays its rewards; a crash costs 1 heart and lets you retry while hearts remain.',
  map:'An effect marked “this Map” ends after this Map’s Guardian.',
  game:'A “this Game” effect stays with you as you travel from Map 1 to Map 2.',
  dusk:'At 2 Sparks, touch Dusk: your meter drains to 0 before any Dusk Wick bonus pays.',
  luminance:'Equip Lantern Lens to reveal terrain farther from your wisp.',
  heart:'With 2 hearts, a failed Round leaves 1 heart for another attempt.',
  ring:'A full orbit means Collector can search at its widest reach.',
  rest:'Choose Recover to heal and refill, or Add slot to make room for another equipped card.',
  uses:'A card at 2 uses succeeds once: 2 → 1 use; its last successful action removes it.',
  shared:'Echo beside Pocket Sparks repeats its bonus and spends another Pocket Sparks use.',
  next:'Echo in Slot 2 copies the card in Slot 3; an empty Slot 3 gives it nothing to copy.',
  copy:'Echo then Body Spark: each Collect gives Body Spark’s +2 twice.',
  packing:'Spare passage fuel becomes boxed Stored Sparks that you keep after a clear.',
  'packing-efficiency':'+50% turns 2 ordinary Stored Sparks into 3 total.',
  grow:'One Rare Growth Seed adds +5 maximum Sparks and refills the meter when you choose Grow.',
  cluster:'Touch one Cluster with Body Spark equipped: its pickup bonus happens once.',
  rhythm:'Three evenly spaced successful Lift taps send one revealing Pulse.',
  watchlight:'With Collector beside you at full charge, a fatal impact spends the shield and starts a longer recovery.',
  pass:'Pocket Sparks gives +4, then Prism Lens to its right makes it 5 Sparks.',
  boost:'Body Spark, Prism Lens, Crescendo: +2 ×1.25 ×2 = 5 Sparks on each Collect.',
  encore:'Pocket Sparks, Prism Lens, Refrain: each Collect gives 5 Sparks, then 5 more in the Encore.',
  slot:'Move Prism Lens from Slot 1 to Slot 3 and it strengthens the two cards before it.',
  'always-on':'Lantern Lens then Crescendo: +20% Luminance becomes +40%.',
});
export function cardTermExampleMarkup(key, context = {}) {
  if(key==='meter'||key==='lift')return meterExampleMarkup(context);
  if(key==='stored'){
    const value=Math.max(0,Math.floor(Number(context.run?.condensedGlow)||0));
    return `<figure class="card-term-example card-term-stored-example"><figcaption>${context.run?(context.example?'Example build':'Current build'):'Base example'} · savings</figcaption><div>${resourceSymbol('packed')}<strong>${value} Stored Sparks</strong></div><p>A +1 Stored Spark reward changes this balance to ${value+1}; it does not refill the ${cardTermMarkup('meter')}.</p></figure>`;
  }
  if(key==='spark'){
    const current=context.card, def=context.definition||SKILL_CARDS[current?.cardId||current?.id];
    const card=def?.kind==='body'?current:makeSkillCard('body-spark','help:body-example');
    const definition=SKILL_CARDS[card?.cardId||card?.id]||def;
    const bonus=cardAmount(card), rank=card.rank||1;
    const picture=termPictures.spark;
    return `<figure class="card-term-example card-term-card-example"><figcaption>${current===card?'This card':'Base example'} · ${esc(definition.name.replace(/ \+\d+$/,''))} · rank ${rank}</figcaption><div class="card-term-spark-demo"><img src="${esc(picture.src)}" alt="${esc(picture.alt)}" width="96" height="84"><div><div class="card-term-action-condition">Your wisp touches a Spark</div><div class="card-term-action-effect">${cardTermTextMarkup(`+${bonus} Sparks`,{sparkContext:'meter'})}</div></div></div><p>The touch triggers the card; the green bonus refills your ${cardTermMarkup('meter')}.</p></figure>`;
  }
  const picture=TERM_CLIP_LINES[key]?'':termPictureMarkup(key), text=termExamples[key];
  return `${picture}${text?`<figure class="card-term-example"><figcaption>Example</figcaption><p>${cardTermTextMarkup(text,{exclude:[key]})}</p></figure>`:''}`;
}

const relatedTerms = Object.freeze({
  'packing-efficiency':['packing','stored','copy','boost'], packing:['stored','meter','packing-efficiency'],
  dusk:['spark','luminance','collector'], luminance:['wisp','dusk','flash','wave'],
  spark:['meter','dusk','cluster','cache','wisp'], meter:['spark','lift','stored','packing'], lift:['meter','rhythm'],
  stored:['meter','packing','rest'], cache:['spark','meter','collector','wave'], proximity:['wave','collector'],
  uses:['shared','copy'], shared:['uses','copy','next'], next:['copy','shared'],
  copy:['next','uses','shared'], grow:['rest','game','meter'], heart:['round','watchlight'], pass:['trigger','slot','boost','encore','copy'],
  trigger:['collect','wave','delivery','pass'], boost:['pass','always-on','slot','trigger'], encore:['pass','uses'], slot:['pass','next'],
  'always-on':['boost','pass'], collect:['trigger','spark','wisp'], delivery:['trigger','collector'], 
  overfill:['trigger','meter','stored'], 'falling-lift':['trigger','lift'], clear:['trigger','round'],
  engine:['turn','timer','wave','pass'], turn:['engine','timer'], timer:['engine','turn','timers'], devour:['dream','take-off','trigger'],
  'engine-skim':['trigger','proximity'], timers:['timer','engine'],
  'take-off':['trigger'],
});
/** Glossary keys that are Triggers: their entries link to the Trigger collection (dist/ui/trigger-book.mjs). */
export const TRIGGER_TERM_KEYS = Object.freeze(['collect','falling-lift','wave','delivery','overfill','clear','engine-skim','always-on','boost','next','trigger']);
const bookButton = () => `<button type="button" class="card-term-book" data-trigger-book>${'All Triggers'}</button>`;
/** The glossary's Inscription entry lists every Inscription with its brand mark, name and rule. */
export function inscriptionLegendMarkup() {
  return `<details class="card-term-extra ins-legend"><summary>All Inscriptions and their marks</summary><ul class="ins-legend-list">${Object.values(INSCRIPTIONS).map(i => `<li data-ins-legend="${esc(i.id)}">${inscriptionGlyph(i.id, {role: 'list'})}<span><b>${esc(i.name)}</b> ${esc(i.text)}</span></li>`).join('')}</ul></details>`;
}
function termDetailsMarkup(key, lead = '') {
  const details=CARD_TERM_DETAILS[key], related=relatedTerms[key] || [];
  return `${key === 'inscription' ? inscriptionLegendMarkup() : ''}${details||lead ? `<details class="card-term-extra"><summary>${key === 'packing-efficiency' ? 'Rounding, copies and exclusions' : 'More details'}</summary>${lead}${details?`<p>${cardTermTextMarkup(details,{exclude:[key]})}</p>`:''}</details>` : ''}${related.length ? `<nav class="card-term-related" aria-label="Related terms">${related.map(key=>cardTermMarkup(key)).join('')}</nav>` : ''}`;
}

/** One term's section of the term dialog. With a clip: the clip, ONE short line, then everything else under More details. */
export function termSectionMarkup(key, cardContext = {}, {reducedMotion = false} = {}) {
  return TERM_CLIP_LINES[key]
    ? `<section data-card-term-section="${esc(key)}" class="card-term-clipped">${termClipMarkup(key,{reducedMotion})}<p class="card-term-definition card-term-short">${cardTermTextMarkup(TERM_CLIP_LINES[key][0],{exclude:[key]})}</p>${termDetailsMarkup(key,`<p class="card-term-long">${cardTermTextMarkup(CARD_TERMS[key][1],{exclude:[key]})}</p><div data-card-term-example="${esc(key)}">${cardTermExampleMarkup(key,cardContext)}</div>`)}${TRIGGER_TERM_KEYS.includes(key)?bookButton():''}</section>`
    : `<section data-card-term-section="${esc(key)}"><p class="card-term-definition">${cardTermTextMarkup(CARD_TERMS[key][1],{exclude:[key]})}</p><div data-card-term-example="${esc(key)}">${cardTermExampleMarkup(key,cardContext)}</div>${termDetailsMarkup(key)}${TRIGGER_TERM_KEYS.includes(key)?bookButton():''}</section>`;
}
export function installCardTermHelp(doc = document, {resolveProximityContext,resolveCardContext} = {}) {
  const layers = [];
  let serial = 0, hoverTimer, hoverCloseTimer, hover;
  const hoverCapable = () => globalThis.matchMedia?.('(hover:hover) and (pointer:fine)').matches;
  function hideHover() { clearTimeout(hoverTimer); clearTimeout(hoverCloseTimer); hover?.remove(); hover = null; }
  function preview(button) {
    if (!hoverCapable() || layers.length || !CARD_TERMS[button.dataset.cardTerm]) return;
    hideHover();
    hoverTimer = setTimeout(() => {
      const key=button.dataset.cardTerm, rect=button.getBoundingClientRect();
      hover=doc.createElement('aside'); hover.sourceButton=button; hover.className='card-term-hover'; hover.setAttribute('role','dialog'); hover.setAttribute('aria-label','Keyword preview');
      hover.innerHTML=`<h3>${cardTermIcon(key)}${esc(CARD_TERMS[key][0])}</h3><p>${cardTermTextMarkup(CARD_TERMS[key][1],{exclude:[key]})}</p><small>Click the keyword for details. Escape closes this preview.</small>`;
      doc.body.appendChild(hover); const bounds=hover.getBoundingClientRect();
      hover.style.left=Math.max(10,Math.min(rect.left,innerWidth-bounds.width-10))+'px';
      hover.style.top=(rect.bottom+bounds.height+8 < innerHeight ? rect.bottom+6 : Math.max(10,rect.top-bounds.height-6))+'px';
      hover.addEventListener('pointerenter',()=>clearTimeout(hoverCloseTimer));
      hover.addEventListener('pointerleave',()=>{hoverCloseTimer=setTimeout(hideHover,180);});
    },240);
  }
  doc.addEventListener('pointerover',event=>{const button=event.target.closest?.('[data-card-term]');if(button && !button.contains(event.relatedTarget) && !button.closest('.card-term-hover')) preview(button);});
  doc.addEventListener('pointerout',event=>{const button=event.target.closest?.('[data-card-term]');if(button && !button.contains(event.relatedTarget)) {clearTimeout(hoverTimer);hoverCloseTimer=setTimeout(hideHover,180);}});
  doc.addEventListener('focusin',event=>{const button=event.target.closest?.('[data-card-term]');if(button && !button.closest('.card-term-hover'))preview(button);});
  doc.addEventListener('focusout',event=>{if(!hover?.contains(event.relatedTarget))hideHover();});
  const current = () => layers.at(-1);
  function close() {
    const layer = layers.pop();
    if (!layer) return;
    layer.disposePreview?.(); layer.dialog.close(); layer.dialog.remove();
    if (layer.opener?.isConnected) layer.opener.focus({preventScroll:true});
  }
  function mount(dialog, opener, context) {
    const layer = {dialog, opener, context, disposePreview:null};
    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-card-term-close]')) {event.preventDefault();event.stopPropagation();close();}
      else if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
      }
    });
    dialog.addEventListener('cancel', event => {event.preventDefault(); close();});
    layers.push(layer); doc.body.appendChild(dialog); dialog.showModal();
    dialog.querySelector('button')?.focus({preventScroll:true});
    return layer;
  }
  function openGlossary(button) {
    hideHover(); while (layers.length) close();
    const heading = `card-glossary-heading-${++serial}`, dialog = doc.createElement('dialog');
    dialog.className = 'card-term-dialog card-glossary-dialog wb-dlg';
    dialog.setAttribute('aria-labelledby',heading);
    const groups = [['Journey',['round','map','game']],['Flying & fuel',['wisp','spark','meter','dusk','cluster','heart','lift','luminance','wave','rhythm','proximity','packing','packing-efficiency','stored']],['Collector',['collector','ring','flash','cache','watchlight']],['Your cards',['pass','slot','trigger','boost','encore','always-on','next','copy','uses','shared','rest','grow','devour']],['Triggers',['collect','falling-lift','wave','delivery','overfill','clear','engine-skim']],['Engines',['engine','turn','timer','timers','take-off']]];
    dialog.innerHTML = `<header><h2 id="${heading}">Glossary</h2><button type="button" data-card-term-close aria-label="Close glossary">×</button></header><div class="card-term-content card-glossary-list">${groups.map(([title,keys])=>`<section><h3>${esc(title)}</h3><div>${keys.map(key=>cardTermMarkup(key,CARD_TERMS[key][0])).join('')}${title==='Triggers'?bookButton():''}</div></section>`).join('')}</div><footer><button type="button" data-card-term-close>Back</button></footer>`;
    mount(dialog,button,resolveCardContext?.(button)||resolveProximityContext?.(button)||{});
  }
  function open(button) {
    const opener=hover?.contains(button) ? hover.sourceButton : button;
    hideHover();
    const existing = button.dataset.cardTerm ? layers.findIndex(layer=>layer.termKey === button.dataset.cardTerm) : -1;
    if (existing >= 0) { while (layers.length > existing + 1) close(); current()?.dialog.querySelector('button')?.focus({preventScroll:true}); return; }
    if (layers.length > Object.keys(CARD_TERMS).length) close();
    const inheritedContext=current()?.dialog.contains(button)?current().context:null;
    // A term opened from the glossary returns to the same index and scroll position.
    if (current() && !current().dialog.contains(button)) while (layers.length) close();
    if (button.hasAttribute('data-card-status-help')) {
      const heading = `card-status-heading-${++serial}`, dialog = doc.createElement('dialog');
      dialog.className = 'card-term-dialog card-status-dialog wb-dlg';
      dialog.setAttribute('aria-labelledby', heading);
      dialog.innerHTML = `<header><h2 id="${heading}">${esc(button.dataset.cardStatusTitle || 'Card readiness')}</h2><button type="button" data-card-term-close aria-label="Close status help">×</button></header><div class="card-term-content"><p>${esc(button.dataset.cardStatusDescription)}</p><p class="card-status-fix">${esc(button.dataset.cardStatusFix)}</p><p class="card-status-meaning">Ready means a card can work in this build when its condition happens. It does not mean its effect is active all the time.</p></div><footer><button type="button" data-card-term-close>Back</button></footer>`;
      mount(dialog, button); return;
    }
    const context = button.closest('[data-card-help]');
    // Links inside a help layer retain the original card/build, including after
    // crossing from a pickup to its meter, uses or related card term.
    const cardContext=inheritedContext||resolveCardContext?.(button)||resolveProximityContext?.(button)||{};
    const keys = button.dataset.cardTerm ? [button.dataset.cardTerm] : (button.dataset.cardTerms || '').split(' ').filter(Boolean);
    const items = [...new Set(keys)].filter(key => CARD_TERMS[key]);
    const description = !button.dataset.cardTerm && context?.dataset.cardDescription;
    if (!items.length && !description) return;
    const title = button.dataset.cardTerm ? CARD_TERMS[items[0]][0] : button.dataset.cardTermTitle || `${context?.dataset.cardName || 'Card'} · help`;
    const note = !button.dataset.cardTerm && (context && CARD_NOTES[context.dataset.cardHelp] || description);
    const heading = `card-term-heading-${++serial}`, dialog = doc.createElement('dialog');
    dialog.className = 'card-term-dialog wb-dlg';
    dialog.setAttribute('aria-labelledby', heading);
    const reducedMotion = prefersReducedMotion(doc), hasClip = items.some(key => TERM_CLIP_LINES[key]);
    if (hasClip) ensureClipStyles(doc);
    const content = button.dataset.cardTerm
      ? items.map(key => termSectionMarkup(key,cardContext,{reducedMotion})).join('')
      : `<section data-card-help-rules><p>${cardTermTextMarkup(description)}</p></section>${note && note !== description ? `<details class="card-term-extra"><summary>Card details</summary><p>${cardTermTextMarkup(note)}</p></details>` : ''}${items.length ? `<nav class="card-term-related" aria-label="Card keywords">${items.map(key=>cardTermMarkup(key)).join('')}</nav>` : ''}`;
    dialog.innerHTML = `<header><h2 id="${heading}">${button.dataset.cardTerm ? cardTermIcon(items[0]) : ''}${esc(title)}</h2><button type="button" data-card-term-close aria-label="Close card help">×</button></header><div class="card-term-content">${content}</div><footer><button type="button" data-card-term-close>Back</button></footer>`;
    if (hasClip) dialog.classList.add('card-term-has-clip');
    const layer = mount(dialog,opener,cardContext); layer.termKey = button.dataset.cardTerm || null;
    if (hasClip) armTermClips(dialog);
    const appendDisposer=dispose=>{const previous=layer.disposePreview;layer.disposePreview=()=>{previous?.();dispose?.();};};
    if(['uses','shared','copy','repeat','pass'].includes(button.dataset.cardTerm)){
      const host=dialog.querySelector('[data-card-term-example]');
      const markup=cardRowTermHelpMarkup(button.dataset.cardTerm,cardContext);
      if(host&&markup)host.innerHTML=markup;
    }
    const cardKind=cardContext.definition?.kind||SKILL_CARDS[cardContext.card?.cardId]?.kind;
    if(button.dataset.cardTerm==='cache'||!button.dataset.cardTerm&&['cache-handling','harvest'].includes(cardKind)){
      dialog.classList.add('card-cache-dialog');
      const host=button.dataset.cardTerm?dialog.querySelector('[data-card-term-example]'):doc.createElement('div');
      if(!button.dataset.cardTerm){host.className='cache-card-example';dialog.querySelector('[data-card-help-rules]').append(host);}
      import('./cache-card-help.mjs?v=guide-clarity-1').then(({mountCacheCardHelp})=>{
        if(layers.includes(layer))appendDisposer(mountCacheCardHelp(host,{focus:cardKind==='harvest'?'cross':cardKind==='cache-handling'?'deliver':'touch',harvestCard:cardKind==='harvest'?cardContext.card:undefined}));
      });
    }
    if(button.dataset.cardTerm === 'proximity' || ['edge-reach','slip-feather'].includes(context?.dataset.cardHelp)) {
      const previewContext=cardContext.run?cardContext:resolveProximityContext?.(button);
      if(previewContext?.run) {
        dialog.classList.add('card-proximity-dialog');
        const host=doc.createElement('section');host.className='proximity-card-help';
        const example=dialog.querySelector('[data-card-term-example="proximity"]');
        if(example)example.replaceChildren(host);else dialog.querySelector('.card-term-content').prepend(host);
        import('./proximity-card-help.mjs?v=guide-clarity-1').then(({mountProximityCardHelp})=>{
          if(layers.includes(layer))appendDisposer(mountProximityCardHelp(host,previewContext));
        });
      }
    }
  }
  doc.addEventListener('click', event => {
    // "All Triggers": close every help layer, then the Deck screen (or the app) opens the Trigger collection.
    if (event.target.closest?.('[data-trigger-book]') && event.target.closest('.card-term-dialog')) {
      event.preventDefault(); event.stopImmediatePropagation(); hideHover(); while (layers.length) close();
      doc.dispatchEvent(new CustomEvent('trigger-book', {bubbles: true})); return;
    }
    const button = event.target.closest?.('[data-card-term],[data-card-term-trigger],[data-card-glossary],[data-card-status-help]');
    if (!button || button.disabled) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if(button.hasAttribute('data-card-glossary')||button.dataset.cardTermTrigger==='glossary')openGlossary(button);else open(button);
  }, true);
  doc.addEventListener('keydown', event => {
    const trigger = event.target.closest?.('[data-card-term],[data-card-term-trigger],[data-card-glossary],[data-card-status-help]');
    if (trigger && !trigger.disabled && ['Enter', ' '].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) trigger.hasAttribute('data-card-glossary')||trigger.dataset.cardTermTrigger==='glossary' ? openGlossary(trigger) : open(trigger);
      return;
    }
    if (event.key === 'Escape' && hover) {event.preventDefault();hideHover();return;}
    if (!current() || event.key !== 'Escape') return;
    event.preventDefault(); event.stopImmediatePropagation(); close();
  }, true);
  return {close};
}
