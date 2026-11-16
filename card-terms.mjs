/** Contextual card vocabulary. Native modal dialogs keep help above the Deck. */
import { resourceSymbol } from './game-symbols.mjs?v=flight-120-1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const CARD_TERMS = Object.freeze({
  spark: ['Spark', 'Fuel for your Spark Meter. Lifts spend it. Absorb a Spark by touching it with your wisp. Fuel pickups include Clusters, Caches and Dusk Sparks. Stored Sparks use the boxed icon and are kept separately.'],
  stored: ['Stored Sparks', 'Your journey’s savings, shown as a box. Earn them by clearing flights, packing spare Sparks or melting cards. Spend them in Deck to Forge or improve cards. Forging uses no Rest action.'],
  wisp: ['Wisp', 'The flying light you control. “Your wisp absorbs” means you touch the pickup yourself. A Collector delivery or a wave passing over it is a different event.'],
  lift: ['Lift', 'Tap or press Lift to rise. Each successful Lift spends Sparks. You choose when to Lift, even with Lift Guide equipped.'],
  proximity: ['Proximity', 'Skim near solid terrain for 2 seconds to send a revealing wave. The reveal lasts 5 seconds, then recovers for 2 seconds. Edge Reach enables this while equipped and adds 50% of normal reach per equipped or Chameleon-borrowed source. Echo cannot repeat a passive ability. Brief gaps keep progress for 1.25 seconds; contact, protection and Dream never charge it.'],
  wave: ['Wave', 'A pulse of light that spreads outward and reveals the passage. Rhythm sends one after 3 successful Lifts at an even pace. Resonant Harvest rewards it for passing over uncollected fuel pickups already in the passage.'],
  collector: ['Collector', 'Your companion that fetches missed pickups. Its ring recovers between searches. Cache Handling and Flash Handling let it fetch those pickups too.'],
  ring: ['Collector’s ring', 'Collector’s search energy. It recovers over time. A fuller ring makes Field Impulse stronger and longer. A Cache delivery refills it completely.'],
  impulse: ['Field Impulse', 'Spend Collector’s ring with a swipe: up to float, down to dive, or right to speed up. Collector must be home and its ring at least ¼ full. Duration is 0.8 seconds × current ring radius / full radius × effective sources, for every direction. Two equipped Field Impulses, or Chameleon immediately left of Field Impulse, last twice as long at the same ring fullness. Extra sources extend duration; force stays at native ring-scaled strength. Up to 9 sources give 7.2 seconds with a full ring. One swipe spends the ring once. Lift ends an active float or dive.'],
  flash: ['Flash', 'The triangular pickup that briefly lights your surroundings. Flash Handling lets Collector fetch it. Each equipped or copied Flash Handling also restores up to 6 missing Sparks when either of you picks one up.'],
  cache: ['Cache', 'A dense Spark pickup. Touch it yourself for 18 Sparks. With Cache Handling, Collector can deliver it for 12 Sparks and a full ring. Extra copies keep that same delivery.'],
  rest: ['Rest', 'A checkpoint where you choose an action. Recover heals and refills your meter. Add slot gives an empty slot. Growth Seed adds Grow. You can also open Deck to Forge or improve cards.'],
  uses: ['Uses', 'A limited card spends a use when its effect works. At zero it leaves your deck. Pocket Sparks spends 1 use per pickup. Second Ember spends its use after your second, different Rest action succeeds.'],
  shared: ['Shared uses', 'Echo and Chameleon spend the copied card’s uses. They do not add more. Each successful repeat or borrowed effect spends a use too.'],
  next: ['Card to the right', 'The next equipped slot, immediately to the right. Empty slots and cards that cannot be copied give no effect. Changing the order changes what Echo and Chameleon copy.'],
  copy: ['Copying cards', 'Echo repeats the action on the card to its right. Higher Echo tiers repeat it more times, as printed. Chameleon borrows its ability. They share that card’s uses. Echo cannot repeat Deep Vessel or Edge Reach, because passive abilities have no action. Neither can copy Echo, Chameleon, Lift Guide, Rhythm, Cache Handling or Second Ember.'],
  packing: ['Packing', 'After a successful flight, spare eligible Sparks become Stored Sparks. Tight Packing adds 1 for every 4 packed, per equipped or copied card. Progress toward the next extra carries forward. The extras do not earn more extras. Pickup card bonuses cannot be packed.'],
  grow: ['Grow', 'Growth Seed adds this Rest action. Each equipped or copied Growth Seed adds 3 to your maximum Sparks. Grow refills the meter once and does not heal hearts. All copies share 3 Grow actions per journey.'],
  pass: ['Row pass', 'For a matching event, equipped cards act from left to right. Each pass starts with zero bonus Sparks. Additions and multipliers affect only that pass’s bonus. Refrain can play the row once more from slot 1. Stored Sparks, pickups, waves and recovery time are separate.'],
});

/** The same game artwork and keyword ink appear on cards and in their glossary. */
const termArt = Object.freeze({
  spark: () => resourceSymbol('energy'),
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
  ['Proximity(?: waves?)?', 'proximity'], ['Stored Sparks?', 'stored'], ['Field Impulse', 'impulse'], ['(?:Luminance )?waves?', 'wave'],
  ['Collector', 'collector'], ['Flash(?: Powerups?)?', 'flash'], ['Caches?', 'cache'],
  ['Spark Meter|Sparks?', 'spark'], ['wisps?', 'wisp'], ['Lifts?', 'lift'], ['Rest', 'rest'], ['Grow', 'grow'],
  ['(?:remaining|shared) (?:uses|charges)', 'shared'], ['uses?', 'uses'], ['pack(?:ing|ed|s)?', 'packing'], ['next slot|card to the right', 'next'], ['ring', 'ring'],
  ["pass(?:’s|'s)?", 'pass'], ['Repeat|Borrow', 'copy'],
];
const keywordPattern = new RegExp(`\\b(${keywords.map(([pattern]) => pattern).join('|')})\\b`, 'gi');
export function cardTermTextMarkup(value) {
  const text = String(value ?? ''), seen = new Set();
  let cursor = 0, result = '';
  for (const match of text.matchAll(keywordPattern)) {
    const key = keywords.find(([pattern]) => new RegExp(`^(?:${pattern})$`, 'i').test(match[0]))?.[1];
    result += esc(text.slice(cursor, match.index));
    result += cardTermMarkup(key, match[0], {icon:!seen.has(key)});
    seen.add(key); cursor = match.index + match[0].length;
  }
  return result + esc(text.slice(cursor));
}

const CARD_NOTES = Object.freeze({
  'edge-reach': 'Edge Reach enables the existing proximity wave, independently of Collector’s ring. Normal reach is about 2.6 wisp widths; one source reaches 3.9 and two reach 5.1. Sources add 50% of normal reach, rather than multiplying each other. Removing every source turns proximity off unless you learned the native skill. Equipping never sends a wave or refills its charge.',
  'body-spark': 'This bonus works when your wisp touches a fuel pickup already in the passage, including Clusters, Caches and Dusk Sparks. Collector deliveries, wave crossings and pickups created by powers do not trigger it. The extra Sparks cannot be packed.',
  'spark-cache': 'Touch a fuel pickup already in the passage to gain the bonus and spend 1 use. This includes Clusters, Caches and Dusk Sparks. Collector deliveries, wave crossings and pickups created by powers do not trigger it. The extra Sparks cannot be packed.',
  'deep-vessel': 'Your maximum is higher while this card is equipped. Removing it lowers the maximum again. Equipping it does not refill the meter.',
  'harvest-common': 'The wave must cross an uncollected fuel pickup already in the passage. Pickups created by powers do not count. This refills your meter without collecting the Spark or adding packing rewards.',
  'harvest-rare': 'The wave must cross an uncollected fuel pickup already in the passage. Pickups created by powers do not count. This refills your meter without collecting the Spark or adding packing rewards.',
  'harvest-legendary': 'The wave must cross an uncollected fuel pickup already in the passage. Pickups created by powers do not count. The meter refill does not collect it or add packing rewards. The extra Stored Spark is awarded once per wave, at its first crossing, even if the meter is full.',
  'field-impulse': 'Collector must be home with at least ¼ of its ring ready. A fuller ring gives a stronger burst. Each extra equipped copy or Echo/Chameleon to the left adds half the base strength. One swipe spends the ring once.',
  'flash-handling': 'Either your wisp or Collector picking up Flash restores up to 6 missing Sparks per equipped or copied Flash Handling. Extra copies add more refill. Collector makes one pickup; the meter cannot go above its maximum.',
  'growth-seed': 'Each equipped or copied Growth Seed adds 3 maximum Sparks per Grow. All copies share 3 Grow actions per journey. Each action refills the meter once, without healing hearts.',
  'tight-packing': 'Each equipped or copied Tight Packing adds 1 Stored Spark for every 4 packed. Progress carries forward. These extra Stored Sparks do not earn another packing bonus.',
  'cache-handling': 'Extra Cache Handling cards keep one 12-Spark delivery and a full ring. Your wisp can always touch a Cache for 18 Sparks, plus any pickup card bonus.',
  rhythm: 'All 3 Lifts must succeed and be evenly spaced. You perform them yourself. Extra Rhythm cards still send one wave.',
  'camp-kit': 'Choose 2 different actions at one Rest. Spend the use only after the second action succeeds. Extra Second Ember cards do not add a third action or spend another use.',
  'lift-guide': 'The amber upward arrow suggests a safe, efficient moment. You choose when to Lift. Extra copies keep one arrow.',
});

// Explanatory pictures are captures of the running game, never replacement art.
const termPictures = Object.freeze({
  collector: {src:'./assets/help/collector-orbit.webp', alt:'A small mint Collector orbits the larger white wisp in flight.', caption:'Collector is the small mint light below your wisp.'},
});
function termPictureMarkup(key) {
  const picture = termPictures[key];
  return picture ? `<figure class="card-term-picture"><img src="${esc(picture.src)}" alt="${esc(picture.alt)}" width="320" height="160"><figcaption>${esc(picture.caption)}</figcaption></figure>` : '';
}

export function installCardTermHelp(doc = document, {resolveProximityContext} = {}) {
  const layers = [];
  let serial = 0;
  const current = () => layers.at(-1);
  function close() {
    const layer = layers.pop();
    if (!layer) return;
    layer.disposePreview?.(); layer.dialog.close(); layer.dialog.remove();
    if (layer.opener?.isConnected) layer.opener.focus({preventScroll:true});
  }
  function mount(dialog, opener) {
    const layer = {dialog, opener, disposePreview:null};
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
    while (layers.length) close();
    const heading = `card-glossary-heading-${++serial}`, dialog = doc.createElement('dialog');
    dialog.className = 'card-term-dialog card-glossary-dialog';
    dialog.setAttribute('aria-labelledby',heading);
    const groups = [['Flying & fuel',['wisp','spark','lift','wave','proximity','packing','stored']],['Collector',['collector','ring','impulse','flash','cache']],['Your cards',['pass','next','copy','uses','shared','rest','grow']]];
    dialog.innerHTML = `<header><h2 id="${heading}">Glossary</h2><button type="button" data-card-term-close aria-label="Close glossary">×</button></header><div class="card-term-content card-glossary-list">${groups.map(([title,keys])=>`<section><h3>${esc(title)}</h3><div>${keys.map(key=>cardTermMarkup(key,CARD_TERMS[key][0])).join('')}</div></section>`).join('')}</div><footer><button type="button" data-card-term-close>Back</button></footer>`;
    mount(dialog,button);
  }
  function open(button) {
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
    const keys = button.dataset.cardTerm ? [button.dataset.cardTerm] : (button.dataset.cardTerms || '').split(' ').filter(Boolean);
    const items = [...new Set(keys)].filter(key => CARD_TERMS[key]);
    const description = !button.dataset.cardTerm && context?.dataset.cardDescription;
    if (!items.length && !description) return;
    const title = button.dataset.cardTerm ? CARD_TERMS[items[0]][0] : button.dataset.cardTermTitle || `${context?.dataset.cardName || 'Card'} · help`;
    const note = context && CARD_NOTES[context.dataset.cardHelp] || description;
    const heading = `card-term-heading-${++serial}`, dialog = doc.createElement('dialog');
    dialog.className = 'card-term-dialog';
    dialog.setAttribute('aria-labelledby', heading);
    dialog.innerHTML = `<header><h2 id="${heading}">${esc(title)}</h2><button type="button" data-card-term-close aria-label="Close card help">×</button></header><div class="card-term-content">${items.map(key => `<section><h3><span class="card-term-label" data-card-term-key="${key}">${cardTermIcon(key)}${esc(CARD_TERMS[key][0])}</span></h3>${termPictureMarkup(key)}<p>${esc(CARD_TERMS[key][1])}</p></section>`).join('')}${note ? `<p class="card-term-note">${esc(note)}</p>` : ''}</div><footer><button type="button" data-card-term-close>Back</button></footer>`;
    const layer = mount(dialog,button);
    if(button.dataset.cardTerm === 'proximity' || context?.dataset.cardHelp === 'edge-reach') {
      const previewContext=resolveProximityContext?.(button);
      if(previewContext?.run) {
        dialog.classList.add('card-proximity-dialog');
        const host=doc.createElement('section');host.className='proximity-card-help';
        dialog.querySelector('.card-term-content').prepend(host);
        import('./proximity-card-help.mjs?v=flight-120-1').then(({mountProximityCardHelp})=>{
          if(layers.includes(layer))layer.disposePreview=mountProximityCardHelp(host,previewContext);
        });
      }
    }
  }
  doc.addEventListener('click', event => {
    const button = event.target.closest?.('[data-card-term],[data-card-term-trigger],[data-card-glossary],[data-card-status-help]');
    if (!button || button.disabled) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if(button.hasAttribute('data-card-glossary'))openGlossary(button);else open(button);
  }, true);
  doc.addEventListener('keydown', event => {
    const status = event.target.closest?.('[data-card-status-help]');
    if (status && ['Enter', ' '].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) open(status);
      return;
    }
    if (!current() || event.key !== 'Escape') return;
    event.preventDefault(); event.stopImmediatePropagation(); close();
  }, true);
  return {close};
}
