/** Typed face copy. Catalog metadata takes precedence over these legacy cards. */
const band = (type, text) => ({type, text});
const condition = text => band('condition', text);
const effect = text => band('effect', text);
const note = text => band('note', text);
const legacy = {
  body: card => [condition('When your wisp absorbs a Spark'), effect(`+${card.amount} Sparks`), ...(card.charges != null ? [note('1 use per pickup')] : [])],
  capacity: card => [effect(`Your meter holds ${card.amount} more Sparks`)],
  packing: () => [condition('For every 2 Stored Sparks naturally packed'), effect('+1 Stored Spark')],
  echo: () => [effect('Repeat the action on the card to the right'), note('Shared uses')],
  chameleon: () => [effect('Borrow the ability on the card to the right'), note('Shared uses')],
  field: () => [condition('With Collector home and its ring at least ¼ full'), effect('Spend the ring. Swipe up to float, down to dive, or right to speed up')],
  guide: () => [effect('An amber arrow shows when to Lift')],
  rhythm: () => [condition('After 3 successful Lifts at an even pace'), effect('Send out a wave')],
  harvest: (card, def) => [condition('When a wave crosses an uncollected Spark'), effect(`+${card.amount} Sparks`), ...(def.stored || card.rarity === 'legendary' ? [condition('First crossing of each wave'), effect(`+${def.stored || 1} Stored Spark`)] : [])],
  'camp-extra': () => [effect('Take 2 different actions at one Rest'), note('1 use after the second action')],
  'camp-grow': (card, def) => [condition('At Rest, choose Grow'), effect(`+${card.amount ?? def.amount ?? 3} maximum Sparks and refill your meter`), note('3 shared Grow actions per journey')],
  'cache-handling': () => [effect('Collector can fetch Caches'), condition('On a Cache delivery'), effect('+12 Sparks')],
  'flash-handling': () => [effect('Collector can fetch Flash'), condition('When either of you picks up Flash'), effect('+6 Sparks')],
  prism: () => [effect('Multiply this pass’s Sparks so far by 1.25')],
  crescendo: () => [condition('After two earlier cards pay Sparks this pass'), effect('Double this pass’s Sparks so far')],
  refrain: () => [condition('After the row resolves'), effect('Play its matching actions again from slot 1'), note('Once per event')],
  downbeat: () => [condition('While falling, pay for a Lift ¾ s or more after your last Lift'), effect('+2 Sparks')],
  'ring-spring': () => [condition('When a passage Spark overfills your meter'), effect('Shorten Collector recovery by 1 s')],
  watchlight: () => [condition('On a crash with Collector home and its ring full'), effect('Collector saves you and sends a wave'), note('Once per flight. Recovery takes 4× as long')],
};

export function getCardRuleBands(card = {}, definition = {}) {
  const source = card.ruleBands || definition.ruleBands || legacy[card.kind || definition.kind]?.(card, definition)
    || [effect(card.effect || card.description || definition.description || '')];
  const values = {...definition, ...card};
  return source.filter(item => item && item.text).map(item => ({
    type: ['condition', 'effect', 'note'].includes(item.type) ? item.type : 'effect',
    text: String(item.text).replace(/\{(\w+)\}/g, (whole, key) => values[key] ?? whole).replace(/:\s*$/, ''),
  }));
}
