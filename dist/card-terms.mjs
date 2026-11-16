/** Contextual card vocabulary. Native modal dialogs keep help above the Deck. */
import { resourceSymbol } from './game-symbols.mjs?v=tow-swing-1';
import {lifeHeartSvg} from './lives.mjs?v=tow-swing-1';
import {duskGlyphArt} from './spark-symbol.mjs?v=tow-swing-1';
import {getGlowCapacity,formatGlow} from './vitality.mjs?v=tow-swing-1';
import {glowGaugeUnits} from './glow-ui.mjs?v=tow-swing-1';
import {getRunModifiers} from './model.mjs?v=tow-swing-1';
import {cardAmount,makeSkillCard,SKILL_CARDS} from './skill-cards.mjs?v=tow-swing-1';
import {cardRowTermHelpMarkup} from './card-row-help.mjs?v=tow-swing-1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const CARD_TERMS = Object.freeze({
  round: ['Round', 'One flight through a passage, ending in clear rewards or a lost heart.'],
  map: ['Map', 'A route of Rounds and Rest stops, ending at a Guardian.'],
  game: ['Game', 'One journey through 3 Maps, ending at the final Guardian or when you run out of hearts.'],
  spark: ['Spark', 'A pickup in the passage that your wisp can touch or Collector can deliver.'],
  meter: ['Spark Meter', 'The segmented bar of fuel your wisp spends to Lift.'],
  dusk: ['Dusk Spark', 'A rose crescent pickup that drains up to 3 Sparks and dims Luminance for 4 seconds when touched.'],
  luminance: ['Luminance', 'The radius of light around your wisp that reveals nearby passage.'],
  heart: ['Heart', 'One remaining attempt at a Round.'],
  stored: ['Stored Sparks', 'The boxed savings you spend on cards at Rest.'],
  wisp: ['Wisp', 'The larger flying light you control and use to touch pickups yourself.'],
  lift: ['Lift', 'Tap or press Lift to rise, spending fuel from your Spark Meter.'],
  proximity: ['Proximity', 'Skim near solid terrain for 2 seconds to send a revealing wave.'],
  wave: ['Wave', 'A pulse of light that spreads outward and reveals the passage.'],
  collector: ['Collector', 'The small green light that catches a missed pickup and reels it to your wisp.'],
  ring: ['Collector’s ring', 'The orbit showing Collector’s search reach and available Field Impulse energy.'],
  impulse: ['Field Impulse', 'With Collector home and its ring at least ¼ full, swipe to spend the ring on a float, dive or speed burst.'],
  flash: ['Flash', 'A white triangular pickup that briefly lights the passage.'],
  cache: ['Cache', 'A dense pickup worth 18 Sparks on your touch or 12 on a Cache Handling delivery.'],
  rest: ['Rest', 'A checkpoint where you choose an action and can improve your Deck.'],
  uses: ['Uses', 'A limited card spends one use when its effect succeeds and leaves your Deck at zero.'],
  shared: ['Shared uses', 'Echo and Chameleon spend uses from the actual card they copy.'],
  next: ['Card to the right', 'The equipped slot immediately to this card’s right.'],
  copy: ['Copying cards', 'Echo repeats the action on the card to the right; Chameleon borrows its ability.'],
  packing: ['Packing', 'Convert spare passage fuel into Stored Sparks during a Round and after a successful clear.'],
  'packing-efficiency': ['Packing efficiency', 'Add a percentage of extra Stored Sparks to ordinary Packing.'],
  grow: ['Grow', 'At Rest, owned Growth Seeds add maximum Sparks and refill your Spark Meter.'],
  cluster: ['Cluster', 'A group of Sparks that counts as one pickup.'],
  rhythm: ['Rhythm', 'Perform 3 successful Lifts at an even pace to send one wave.'],
  watchlight: ['Watchlight', 'With Collector home and a full ring, survive one fatal impact per flight and send a wave.'],
  pass: ['Row pass', 'For one event, equipped cards act once from left to right.'],
});

const CARD_TERM_DETAILS = Object.freeze({
  round: 'Clear a Round to earn its rewards and choose your next stop. A failed attempt costs one heart; you can retry while hearts remain.',
  map: 'Effects that last for this Map end when you move to the next Map. A full Game contains 3 Maps.',
  game: 'A new Game starts a fresh journey and Deck. Effects that last for this Game remain through its Maps.',
  spark: 'Touching a natural Spark, Cluster or Cache refills the meter. A direct touch can trigger Body Spark and Pocket Sparks. Collector deliveries and a wave crossing the pickup are different events. Dusk Sparks drain fuel before eligible card bonuses pay. Pickups created by powers do not trigger these direct-pickup bonuses.',
  meter: 'Touch passage pickups or gain bonus Sparks from cards to refill this bar. Maximum Sparks means the bar’s capacity. Equipping a capacity card does not refill it. Overflow can be packed into Stored Sparks, but card-created bonus fuel cannot be packed. The Lift cost shown here uses the paused flight when available; otherwise it uses your current build or the labelled base example.',
  stored: 'Earn Stored Sparks by clearing flights, packing spare fuel or melting cards. Spend them at Rest to Forge, improve or Evolve cards. These services use no Rest action.',
  wisp: 'A direct touch means your wisp meets the pickup itself. A Collector delivery or a wave passing over the pickup is a different event.',
  lift: 'You choose when to Lift, even with Lift Guide equipped. A successful Lift spends the next cost shown by the flight controls; effects can temporarily change that cost.',
  dusk: 'Touching Dusk dims Luminance by 20% for 4 seconds. Collector leaves it alone. Dusk Wick pays its bonus after the drain.',
  luminance: 'Dusk and Dark Sparks briefly reduce your light radius. Lantern Lens increases it while equipped.',
  wave: 'Rhythm sends a wave after 3 successful Lifts at an even pace. Resonant Harvest rewards a wave for crossing an uncollected fuel pickup already in the passage.',
  cache: 'Cache Handling unlocks Collector delivery. Extra Cache Handling cards keep one 12-Spark delivery. Direct touch and wave crossing can trigger different cards; crossing leaves the Cache in place.',
  rest: 'Recover heals and refills your meter. Add slot gives an empty equipped slot. Growth Seed adds Grow. Open Deck to Forge or improve cards.',
  uses: 'Pocket Sparks spends 1 use per successful direct pickup bonus. Second Ember spends its use only after your second different Rest action succeeds. An unsuccessful condition spends no use.',
  shared: 'A repeat or borrowed effect spends a use from its copied card when it succeeds. Copying adds no new uses. Independent equipped cards keep their own uses.',
  next: 'Empty slots and cards that cannot be copied give no copied effect. Changing card order changes what Echo and Chameleon target.',
  cluster: 'Your wisp can touch a Cluster and Collector can fetch it. Pickup bonuses check the Cluster once, rather than checking every bright core.',
  rhythm: 'All 3 Lifts must succeed and be evenly spaced. You perform them yourself. Extra Rhythm cards still send only one wave.',
  watchlight: 'Collector recovers for 4 normal cycles after the save. It must be home with a full ring before the fatal impact.',
  "heart": "Each heart is one remaining attempt. A failed flight costs one heart. Heart Stitch restores a missing heart after three direct passage Spark pickups in one flight; it spends a use only when healing succeeds. Devourer can restore one after a clear by consuming the adjacent Rare. Full hearts spend no healing use or Rare target.",
  "proximity": "Skim near solid terrain for 2 seconds to send a revealing wave. The reveal lasts 5 seconds, then recovers for 2 seconds. Proximity enables normal reach while equipped, without Collector. Edge Reach also enables this and adds 50% of normal reach per equipped or Chameleon-borrowed source. Echo cannot repeat a passive ability. Brief gaps keep progress for 1.25 seconds; contact, protection and Dream never charge it.",
  "collector": "The small green light beside your main wisp. It catches a missed pickup and reels the intact pickup back to your moving wisp. Sparks arrive on contact. It stays busy during the reel and is ready again when the pickup is absorbed. Cache Handling and Flash Handling let it fetch those pickups too.",
  "ring": "Collector’s search reach and Field Impulse energy. Its orbit shows the available reach. An ordinary reel ends ready for another search; an explicit Field Impulse spends the ring and recovers over time. A fuller ring makes Field Impulse stronger and longer.",
  "impulse": "Spend Collector’s ring with a swipe: up to float, down to dive, or right to speed up. Collector must be home and its ring at least ¼ full. Duration is 0.8 seconds × current ring radius / full radius × effective sources, for every direction. Two equipped Field Impulses, or Chameleon immediately left of Field Impulse, last twice as long at the same ring fullness. Extra sources extend duration; force stays at native ring-scaled strength. Up to 9 sources give 7.2 seconds with a full ring. One swipe spends the ring once. Lift ends an active float or dive.",
  "flash": "The triangular pickup that briefly lights your surroundings. Flash Handling lets Collector fetch it. Each equipped or copied Flash Handling also restores up to 6 missing Sparks when either of you picks one up.",
  "copy": "Echo repeats the action on the card to its right. Higher Echo tiers repeat it more times, as printed. Chameleon borrows its ability. They share that card’s uses. Echo cannot repeat Deep Vessel or Edge Reach, because passive abilities have no action. Neither can copy Echo, Chameleon, Lift Guide, Rhythm, Cache Handling or Rest cards.",
  "packing": "Convert spare passage Sparks into Stored Sparks during a Round and from the spare meter at its successful exit. Packing efficiency adds extras to the Stored Sparks this conversion normally makes. Open Packing efficiency for examples and exclusions.",
  "packing-efficiency": "Adds extra Stored Sparks to the amount ordinary packing makes from spare passage Sparks. +50% means 2 ordinarily made → 3 total; +75% means 4 → 7 total; +100% means 1 → 2 total. Equipped cards, Echo repeats and Chameleon copies add their percentages: two +50% sources give +100%. Prism and the row’s Spark multipliers multiply bonus flight Sparks only, so they do not multiply packing efficiency or Stored Sparks. Fractions carry between cleared Rounds, and whole extras pay as they are earned. With Rare and no earlier fraction, making 1, 2, 3, then 4 ordinary Stored Sparks earns 0, 1, 2, then 3 extras in total. With Common, making 1 this Round and 1 next Round earns 1 extra overall. A failed Round keeps the fraction saved before that attempt and banks none of that attempt’s new packing. Rewards, card payouts, Melt and the extra Stored Sparks do not earn packing extras. Generated or Dream pickups and bonus fuel from cards do not count.",
  "grow": "Keep Growth Seeds in your Deck to unlock Grow at Rest. Each owned Seed adds its printed amount to your maximum Sparks, up to +90 total: Common +3, Rare +5, Legendary +8 (improved to +9 or +10). Grow refills the meter once and does not heal hearts. All Seeds share 3 Grow actions per journey. No active slot is needed; copying cards cannot copy Rest cards.",
  "pass": "For a matching event, equipped cards act from left to right. Each pass starts with zero bonus Sparks. Additions and multipliers affect only that pass’s bonus. Refrain can play the row once more from slot 1. Stored Sparks, pickups, waves and recovery time are separate.",
});

/** The same game artwork and keyword ink appear on cards and in their glossary. */
const termArt = Object.freeze({
  spark: () => resourceSymbol('energy'),
  meter: () => resourceSymbol('energy'),
  dusk: () => duskGlyphArt(),
  heart: () => lifeHeartSvg(),
  stored: () => resourceSymbol('packed'),
  lift: () => resourceSymbol('lift'),
});
export function cardTermIcon(key) {
  return termArt[key] ? `<span class="card-term-icon card-term-icon-${esc(key)}" aria-hidden="true">${termArt[key]()}</span>` : '';
}
export function cardTermMarkup(key, label = CARD_TERMS[key]?.[0] || key, {icon = true, iconOnly = false, accessibleLabel = label} = {}) {
  return `<button type="button" class="card-term${iconOnly ? ' card-term-symbol' : ''}" data-card-term="${esc(key)}" aria-haspopup="dialog" aria-label="${esc(accessibleLabel)}: help">${icon || iconOnly ? cardTermIcon(key) : ''}${iconOnly ? '' : esc(label)}</button>`;
}

// Runtime descriptions use the same vocabulary without maintaining a second rules renderer.
const keywords = [
  ['Packing efficiency', 'packing-efficiency'], ['Dusk(?: Sparks?)?', 'dusk'], ['Luminance', 'luminance'],
  ['Proximity(?: waves?)?', 'proximity'], ['Stored Sparks?', 'stored'], ['hearts?', 'heart'], ['Field Impulse', 'impulse'], ['waves?', 'wave'],
  ['Watchlight', 'watchlight'], ['Rhythm(?: phrase)?', 'rhythm'], ['Clusters?', 'cluster'], ['Collector', 'collector'], ['Flash(?: Powerups?)?', 'flash'], ['Caches?', 'cache'],
  ['Spark Meter|meter', 'meter'], ['Sparks?', 'spark'], ['wisps?', 'wisp'], ['Lifts?', 'lift'], ['Rest', 'rest'], ['Grow', 'grow'],
  ['Shared uses|Share its (?:remaining )?uses|Copies share uses', 'shared'], ['remaining (?:uses|charges)|uses?', 'uses'], ['pack(?:ing|ed|s)?', 'packing'], ['next slot|card to the right', 'next'], ['ring', 'ring'],
  ["pass(?:’s|'s)?", 'pass'], ['Repeat|Borrow', 'copy'],
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
  'use-doubler': 'When an actual flight starts, Use Doubler consumes itself to double the remaining uses of the real consumable immediately to its right. The added uses and expanded ceiling belong to that exact card through swaps, saves and eligible paid refills. An empty slot, a spent card, a lasting card or another Use Doubler keeps the card unspent. Opening a preview, Dream, pausing, resuming and reloading never repeat a grant. Echo, Chameleon and replay cannot copy it.',
  'ember-feeder': 'After a successful real flight, Ember Feeder consumes the first two occupied cards anywhere to its right together, skipping empty slots. Both cards must still be present; fewer than two consumes neither. Each meal adds one maximum Spark to that specific Ember Feeder while equipped. Stored growth survives swaps and saves, but removing, melting or consuming the Feeder removes its capacity bonus. Equipping never refills the meter. Heart Stitch heals first; physical consumers then resolve left to right before clear rewards. Failed flights, Dream, copying and replay never feed it.',
  'devourer': 'After a successful clear, Devourer can consume the actual Rare card immediately to its right to restore one missing heart. That Rare must have been equipped for the flight and remain present. Full hearts and failed flights spare it. Heart Stitch heals first; Devourers then resolve from left to right. The target disappears, while Devourer remains. Echo, Chameleon and row replay cannot copy this physical action.',
  'slip-feather': 'Proximity enables terrain charging at normal reach without Collector or another skill. Skim near real solid terrain for 2 seconds; open sky and touching terrain never charge it. Extra Proximity cards share one meter. Edge Reach is the Rare version with additional reach. Removing every Proximity and Edge Reach source turns it off unless you learned the native skill.',
  'springboard': 'Touch a natural fuel pickup while descending to bounce upward at half your ordinary Lift impulse. Generated pickups, Collector deliveries, Flash and wave crossings do not trigger it. The bounce costs no Sparks and never counts as a manual Lift, Downbeat or Rhythm tap. Springboard cannot be copied; extra equipped copies keep one bounce.',
  'diving-bell': 'When the current passage Flash expires, Prism Wick sends one final revealing wave and pays 3 bonus Sparks. A new Flash refreshes the timer. Generated and Dream Flash do not qualify. Echo and Chameleon share its three uses; numeric replay can repeat the Spark payout, while the physical expiry always sends one final wave.',
  'tailwind': 'While a heart is missing, each direct natural fuel pickup advances Heart Stitch. Three in the same flight restore one heart and spend one of its two uses. Full hearts, Collector deliveries, generated pickups, Flash and Dream do not advance it. Progress resets between flights. Earned healing and spent uses survive a failed attempt. This card cannot be copied.',
  'edge-reach': 'Edge Reach enables the existing proximity wave, independently of Collector’s ring. Normal reach is about 2.6 wisp widths; one source reaches 3.9 and two reach 5.1. Sources add 50% of normal reach, rather than multiplying each other. Removing every source turns proximity off unless you learned the native skill. Equipping never sends a wave or refills its charge.',
  'body-spark': 'This bonus works when your wisp touches a passage Spark, Cluster, Cache or Dusk Spark. Dusk drains fuel before paying the card bonus. Collector deliveries, wave crossings and pickups created by powers do not trigger it. The extra Sparks cannot be packed.',
  'spark-cache': 'Touch a passage Spark, Cluster, Cache or Dusk Spark to gain the bonus and spend 1 use. Dusk drains fuel before paying the card bonus. Collector deliveries, wave crossings and pickups created by powers do not trigger it. The extra Sparks cannot be packed.',
  'deep-vessel': 'Your maximum is higher while this card is equipped. Removing it lowers the maximum again. Equipping it does not refill the meter.',
  'harvest-common': 'The wave must cross an uncollected fuel pickup already in the passage. Pickups created by powers do not count. This refills your meter without collecting the Spark or adding packing rewards.',
  'harvest-rare': 'The wave must cross an uncollected fuel pickup already in the passage. Pickups created by powers do not count. This refills your meter without collecting the Spark or adding packing rewards.',
  'harvest-legendary': 'The wave must cross an uncollected fuel pickup already in the passage. Pickups created by powers do not count. The meter refill does not collect it or add packing rewards. The extra Stored Spark is awarded once per wave, at its first crossing, even if the meter is full.',
  'field-impulse': 'Collector must be home with at least ¼ of its ring ready. A fuller ring scales force and duration. Each equipped or compatible copied source adds 0.8 seconds at a full ring, at the same force. One swipe spends the ring once. Lift ends a float or dive.',
  'flash-handling': 'Either your wisp or Collector picking up Flash restores up to 6 missing Sparks per equipped or copied Flash Handling. Extra copies add more refill. Collector makes one pickup; the meter cannot go above its maximum.',
  'growth-seed-common': 'Keep in your Deck to unlock Grow at Rest. Each owned Seed adds its printed maximum Sparks, up to +90 total. All Growth Seeds share 3 Grow actions per journey. Each action refills the meter once, without healing hearts. At Rest, Evolve Common to Rare for 25 Stored Sparks, then Rare to Legendary for 40.',
  'growth-seed': 'Keep in your Deck to unlock Grow at Rest. Each owned Seed adds its printed maximum Sparks, up to +90 total. All Growth Seeds share 3 Grow actions per journey. Each action refills the meter once, without healing hearts. At Rest, Evolve Rare to Legendary for 40 Stored Sparks.',
  'growth-seed-legendary': 'Keep in your Deck to unlock Grow at Rest. Each owned Seed adds its printed maximum Sparks, up to +90 total: +8 at rank 1, +9 at rank 2 and +10 at rank 3. All Growth Seeds share 3 Grow actions per journey. Each action refills the meter once, without healing hearts.',
  'tight-packing': CARD_TERMS['packing-efficiency'][1],
  'tight-packing-ii': CARD_TERMS['packing-efficiency'][1],
  'tight-packing-iii': CARD_TERMS['packing-efficiency'][1],
  'cache-handling': 'Extra Cache Handling cards keep one 12-Spark delivery. Your wisp can always touch a Cache for 18 Sparks, plus any pickup card bonus.',
  'twin-orbit': 'While equipped, a second Collector catches and reels independently. Each pickup belongs to one Collector. Two is the maximum. Removing the card releases its second Collector’s current load, unless Twin Wick already unlocked that Collector for the expedition. The first Collector keeps Field Impulse and fatal-impact saves.',
  'twin-wick': 'Its single use unlocks a second Collector when you start or resume a real flight with Collector selected. The unlock lasts for this expedition, including retries and removing the card. Preview, practice and Dream do not spend it. If Twin Orbit already supplies the second Collector, the use stays available.',
  'long-spool': 'For five extra catches, Collector can reach 35% beyond its current normal range. A use is spent only when an eligible missed pickup beyond normal reach is actually attached. Your wisp gets the whole approach and contact window. Long Spool and Cast Line do not stack; the shortest sufficient extension spends one use. Copies share the original uses.',
  'cast-line': 'For two extra catches, Collector can reach twice its current normal range. Only successful attachments beyond normal reach spend a use. Long Spool pays first if its shorter extension can reach the pickup. Neither extension changes which pickup types Collector can carry or takes the player’s first chance to touch them.',
  'fast-spool': 'Touching a natural passage Spark while a Collector reels shortens one active reel by up to 3 seconds. The longest active reel is chosen. Each successful action spends one of this card’s three uses. Copies spend this card’s uses too. No use is spent when there is no remaining reel time.',
  rhythm: 'All 3 Lifts must succeed and be evenly spaced. You perform them yourself. Extra Rhythm cards still send one wave.',
  'camp-kit': 'Keep in your Deck when arriving at Rest to choose 2 different actions. No active slot is needed. Spend the use only after the second action succeeds. Extra Second Ember cards do not add a third action or spend another use.',
  'lift-guide': 'The amber chevron uses your current fall and Lift impulse. It opens when a Lift can rise back to its starting height, as from level flight. It does not judge terrain; choose when to tap. Extra copies keep one chevron.',
});

// Explanatory pictures are captures of the running game, never replacement art.
const termPictures = Object.freeze({
  spark: {src:'./assets/help/spark-flight.png', alt:'A bright Spark suspended in the passage, captured from the running game.', caption:'A Spark in the passage. Touch it with your wisp to absorb it.'},
  flash: {src:'./assets/help/flash-flight.png', alt:'The white triangular Flash pickup in the passage, captured from the running game.', caption:'Flash is the white triangle. It briefly lights your surroundings.'},
  wisp: {src:'./assets/help/wisp-flight.png', alt:'The main white wisp flying in the passage, captured from the running game.', caption:'Your main wisp is the larger white light.'},
  wave: {src:'./assets/help/wave-flight.png', alt:'An actual revealing wave spreading through the passage.', caption:'A wave reveals the passage as it spreads outward.'},
  proximity: {src:'./assets/help/wave-flight.png', alt:'The revealing wave used by Proximity, rendered in the passage.', caption:'Skimming terrain can send this revealing wave. The live example below shows the required distance.'},
  collector: {src:'./assets/previews/collector-tether/reel-front.png', video:'./assets/previews/collector-tether/reel.mp4', alt:'The small green Collector tows a swinging Spark through seven Lifts, then delivers it to the larger white wisp.', caption:'Actual flight: the trailing Spark swings as you Lift. Collector reels it in; Sparks arrive on contact.'},
});
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
  ring:'A full ring gives the longest Field Impulse; a quarter ring gives a shorter one.',
  impulse:'Swipe up with a full ring and one Field Impulse source: float for up to 0.8 seconds.',
  rest:'Choose Recover to heal and refill, or Add slot to make room for another equipped card.',
  uses:'A card at 2 uses succeeds once: 2 → 1 use; its last successful action removes it.',
  shared:'Echo beside Pocket Sparks repeats its bonus and spends another Pocket Sparks use.',
  next:'Slot 2 copies slot 3; an empty slot 3 gives it no copied effect.',
  copy:'Echo → Body Spark repeats Body Spark’s bonus when the direct pickup event happens.',
  packing:'Spare passage fuel becomes boxed Stored Sparks that you keep after a clear.',
  'packing-efficiency':'+50% efficiency turns 2 ordinary Stored Sparks into 3 total.',
  grow:'One Rare Growth Seed adds +5 maximum Sparks and refills the meter when you choose Grow.',
  cluster:'Touch one Cluster with Body Spark equipped: its pickup bonus happens once.',
  rhythm:'Three evenly spaced successful Lift taps send one revealing wave.',
  watchlight:'At full ring with Collector home, a fatal impact spends the save and starts a longer recovery.',
  pass:'Body Spark adds +2, then Prism multiplies that pass’s bonus to 2.5 Sparks.',
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
  const picture=termPictureMarkup(key), text=termExamples[key];
  return `${picture}${text?`<figure class="card-term-example"><figcaption>Example</figcaption><p>${cardTermTextMarkup(text,{exclude:[key]})}</p></figure>`:''}`;
}

const relatedTerms = Object.freeze({
  'packing-efficiency':['packing','stored','copy','pass'], packing:['stored','meter','packing-efficiency'],
  dusk:['spark','luminance','collector'], luminance:['wisp','dusk','flash','wave'],
  spark:['meter','dusk','cluster','cache','wisp'], meter:['spark','lift','stored','packing'], lift:['meter','rhythm'],
  stored:['meter','packing','rest'], cache:['spark','meter','collector','wave'], impulse:['collector','ring','lift'], proximity:['wave','collector'],
  uses:['shared','copy'], shared:['uses','copy','next'], next:['copy','shared'],
  copy:['next','uses','shared'], grow:['rest','game','meter'], heart:['round','watchlight'], pass:['copy','meter'],
});
function termDetailsMarkup(key) {
  const details=CARD_TERM_DETAILS[key], related=relatedTerms[key] || [];
  return `${details ? `<details class="card-term-extra"><summary>${key === 'packing-efficiency' ? 'Rounding, copies and exclusions' : 'More details'}</summary><p>${cardTermTextMarkup(details,{exclude:[key]})}</p></details>` : ''}${related.length ? `<nav class="card-term-related" aria-label="Related terms">${related.map(key=>cardTermMarkup(key)).join('')}</nav>` : ''}`;
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
    dialog.className = 'card-term-dialog card-glossary-dialog';
    dialog.setAttribute('aria-labelledby',heading);
    const groups = [['Journey',['round','map','game']],['Flying & fuel',['wisp','spark','meter','dusk','cluster','heart','lift','luminance','wave','rhythm','proximity','packing','packing-efficiency','stored']],['Collector',['collector','ring','impulse','flash','cache','watchlight']],['Your cards',['pass','next','copy','uses','shared','rest','grow']]];
    dialog.innerHTML = `<header><h2 id="${heading}">Glossary</h2><button type="button" data-card-term-close aria-label="Close glossary">×</button></header><div class="card-term-content card-glossary-list">${groups.map(([title,keys])=>`<section><h3>${esc(title)}</h3><div>${keys.map(key=>cardTermMarkup(key,CARD_TERMS[key][0])).join('')}</div></section>`).join('')}</div><footer><button type="button" data-card-term-close>Back</button></footer>`;
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
      dialog.className = 'card-term-dialog card-status-dialog';
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
    dialog.className = 'card-term-dialog';
    dialog.setAttribute('aria-labelledby', heading);
    const content = button.dataset.cardTerm
      ? items.map(key => `<section data-card-term-section="${esc(key)}"><p class="card-term-definition">${cardTermTextMarkup(CARD_TERMS[key][1],{exclude:[key]})}</p><div data-card-term-example="${esc(key)}">${cardTermExampleMarkup(key,cardContext)}</div>${termDetailsMarkup(key)}</section>`).join('')
      : `<section data-card-help-rules><p>${cardTermTextMarkup(description)}</p></section>${note && note !== description ? `<details class="card-term-extra"><summary>Card details</summary><p>${cardTermTextMarkup(note)}</p></details>` : ''}${items.length ? `<nav class="card-term-related" aria-label="Card keywords">${items.map(key=>cardTermMarkup(key)).join('')}</nav>` : ''}`;
    dialog.innerHTML = `<header><h2 id="${heading}">${button.dataset.cardTerm ? cardTermIcon(items[0]) : ''}${esc(title)}</h2><button type="button" data-card-term-close aria-label="Close card help">×</button></header><div class="card-term-content">${content}</div><footer><button type="button" data-card-term-close>Back</button></footer>`;
    const layer = mount(dialog,opener,cardContext); layer.termKey = button.dataset.cardTerm || null;
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
      import('./cache-card-help.mjs?v=tow-swing-1').then(({mountCacheCardHelp})=>{
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
        import('./proximity-card-help.mjs?v=tow-swing-1').then(({mountProximityCardHelp})=>{
          if(layers.includes(layer))appendDisposer(mountProximityCardHelp(host,previewContext));
        });
      }
    }
  }
  doc.addEventListener('click', event => {
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
