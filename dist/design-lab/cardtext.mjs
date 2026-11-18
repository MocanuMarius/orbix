// v1.0-cardtext · design-lab only. A proposal: plain rule text for every card.
// Nothing here changes the game. TODAY's text is read live from the game's own
// card-rule-bands.mjs › getCardRuleBands, so it is always verbatim.
// The data below is also the source for docs/card-text-rewrite.md.

/* Each entry: t = Trigger chip, c = short condition after the chip, x = WHAT line,
   u = small third element (uses or a limit), b = WHAT line if the decided Boost rules
   (docs/boost-rules.md) were built, f = decision id, n = note.
   Flagged cards also carry keep/simple: the two candidate texts. */
export const CARD_TEXT = [
  // ── Common ──
  {id: 'body-spark', t: 'Collect', x: '+2 Sparks'},
  {id: 'spark-cache', t: 'Collect', x: '+4 Sparks', u: '6 uses', n: '"1 use per pickup" is the normal use rule.'},
  {id: 'deep-vessel', t: 'Always on', x: '+3 max Sparks', n: 'Dropped "Equipping does not refill the meter" (no card refills unless it says so). Boost: plate shows the boosted figure; 100-Spark meter cap.'},
  {id: 'tight-packing', t: 'Always on', x: '+50% Stored Sparks from packing', n: '"Packing efficiency" made concrete.'},
  {id: 'echo', t: 'Next card', x: 'Repeats the next card', f: 'D4',
    keep: {t: 'Next card', x: 'Repeats the next card', u: 'Not × or always-on cards'}, simple: {t: 'Next card', x: 'Repeats the next card'},
    n: '"Share its uses" dropped: a repeat spends a use like any other firing.'},
  {id: 'field-impulse', t: 'Always on', c: 'Collector home, ¼ charge', x: 'Swipe: float, dive or speed up, 0.8 s', n: 'Dropped "Extra sources extend duration": copies adding time is the normal expectation.'},
  {id: 'lift-guide', t: 'Rhythm', x: '+1 Spark', u: 'Shows the arrow', n: 'Lift Guide pays +1 Spark for a Lift tapped while its arrow is open (2026-11-18); the arrow stays on.'},
  {id: 'harvest-common', t: 'Wave', x: '+1 Spark', n: '"Leaves the pickup in place" belongs to the Wave Trigger (the wave crosses a Spark you have not collected).'},
  {id: 'camp-kit', t: 'At Rest', x: 'Take 2 different Rest actions', u: '1 use', n: 'The use is still spent only when the second action succeeds (normal use rule).'},
  {id: 'downbeat', t: 'Falling Lift', x: '+2 Sparks', n: '"Paid Lift while falling, 0.75 s after the last Lift" moves into the Falling Lift glossary entry; rule unchanged.'},
  {id: 'courier-tip', t: 'Delivery', x: '+2 Sparks'},
  {id: 'dusk-wick', t: 'Collect', c: 'Dusk Spark', x: '+20 Sparks', n: '"after its drain" and the Dusk note describe the Dusk pickup itself; the pickup always resolves before card Sparks.'},
  {id: 'lantern-lens', t: 'Always on', x: '+20% Luminance', n: 'Copy note dropped (Echo shows "Can\'t repeat" status).'},
  {id: 'cluster-heart', t: 'Collect', c: 'Cluster', x: '+6 Sparks', u: '5 uses'},
  {id: 'low-wick', t: 'Collect', c: 'meter ⅓ or less', x: '+5 Sparks', u: '6 uses', n: 'Dropped "Checks before the pickup refills it": the meter is read as you touch the Spark, which is what the line says.'},
  {id: 'first-ripple', t: 'Wave', c: 'its 1st Spark', x: '+4 Sparks', u: '6 uses'},
  {id: 'far-shore', t: 'Wave', c: 'its 2nd Spark onward', x: '+5 Sparks', u: '6 uses'},
  {id: 'toll-bell', t: 'Rhythm', x: '+2 Sparks'},
  {id: 'slip-feather', t: 'Always on', c: 'near terrain for 2 s', x: 'Sends out a revealing wave', f: 'D6', n: 'Dropped "Works without Collector" and the charge-gap details (fine print for the inspector).'},
  {id: 'diving-bell', t: 'Flash ends', x: 'Sends a final wave, +3 Sparks', u: '3 uses', f: 'D6', n: 'Copies already share uses (normal rule).'},
  {id: 'tailwind', t: 'Always on', c: 'while missing a heart', x: 'Every 3rd Collect: +1 heart', u: '2 uses', n: '"Collector deliveries do not count" is already what Collect means.'},
  {id: 'springboard', t: 'Always on', c: 'while falling', x: 'Each Collect gives a free half-Lift bounce', n: 'Dropped "No Rhythm progress"; the bounce still does not count toward Rhythm.'},
  {id: 'pacesetter', t: 'Rhythm', x: 'Collector ready 3 s sooner', u: '5 uses', n: '"up to" dropped: every time card is limited by the time left.'},
  {id: 'counterweight', t: 'Falling Lift', x: 'Collector ready 0.75 s sooner'},
  {id: 'courier-glass', t: 'Delivery', x: 'Double the chain\'s Sparks', u: '5 uses', b: 'Double every reward before it'},
  {id: 'home-beacon', t: 'Save', x: '+9 Sparks', u: '3 uses', n: 'Today\'s face says "Watchlight"; the code also fires on Last Orbit saves, which "Save" covers.'},
  {id: 'mending-moss', t: 'Collect', c: 'Collector recovering from a save', x: 'Collector ready 3 s sooner', u: '6 uses', n: '"Needs Watchlight or Last Orbit" is implied by "a save".'},
  {id: 'return-spring', t: 'Always on', x: 'Your Collector reels in 0.5 s sooner'},
  {id: 'haul-winch', t: 'Delivery', c: 'Cluster', x: 'The next reel is 3 s sooner', u: '5 uses'},
  {id: 'crate-lining', t: 'Delivery', c: 'Cache', x: '+8 Sparks', u: '4 uses'},
  {id: 'glass-spool', t: 'Collect', x: 'Collector ready 0.5 s sooner'},
  {id: 'clear-prism', t: 'Flash', x: 'Double the chain\'s Sparks', u: '4 uses', b: 'Double every reward before it'},
  {id: 'flash-thread', t: 'Flash', x: 'Collector ready 3 s sooner', u: '5 uses'},
  {id: 'kindling-bead', t: 'Any Trigger', c: 'needs a + card before it', x: '+1 Spark', f: 'D2',
    keep: {t: 'Any Trigger', c: 'needs a + card before it', x: '+1 Spark'}, simple: {t: 'Any Trigger', x: '+1 Spark'}},
  {id: 'growth-ring', t: 'Clear', x: '+1 max Spark forever', n: 'Dropped "Does not refill" and the copy note. Boost: 100-Spark meter cap.'},
  {id: 'wind-feather', t: 'Clear', x: '+1% speed per Finish, kept on this card (max +10%)', n: 'Changed 2026-11-18: growth stored on the card.'},
  {id: 'wayfarers-purse', t: 'Clear', x: '+5 Stored Sparks', n: '"Cannot earn packing bonuses" is the general rule for card payouts (glossary).'},
  {id: 'nest-egg', t: 'Clear', x: '+1 Stored per 10 brought in (max +10)', n: 'Copy note dropped (normal rule).'},
  {id: 'use-doubler', t: 'Always on', c: 'flight start', x: 'Doubles the next card\'s uses', u: '1 use', n: 'Dropped "Needs a live target / not another Use Doubler / Preview and Dream spend nothing"; status chips already say "Needs consumable right".'},
  {id: 'wick-doubler', t: 'Collect', x: 'Double the chain\'s Sparks', u: '3 uses', b: 'Double every reward before it'},
  {id: 'fast-spool', t: 'Collect', c: 'while Collector reels in', x: 'Collector reels in 3 s sooner', u: '3 uses'},
  {id: 'twin-wick', t: 'Always on', c: 'flight start with Collector', x: 'Fly with 2 Collectors', u: '4 uses', f: 'D6', n: 'One use per flight; the effect lives on the card.'},
  {id: 'long-spool', t: 'Always on', x: '+35% Collector reach', u: '5 uses', f: 'D6', n: 'A use is spent only on a catch beyond normal reach (normal use rule).'},
  {id: 'cast-line', t: 'Always on', x: '+100% Collector reach', u: '2 uses', f: 'D6', n: '"Double" written as +100% so it is not read as a × card.'},
  {id: 'growth-seed-common', t: 'At Rest', c: 'Grow', x: '+3 max Sparks and a full meter', u: '3 Grows per journey', f: 'D8',
    keep: {t: 'At Rest', c: 'Grow', x: '+3 max Sparks and a full meter', u: '3 Grows per journey · max +90'}, simple: {t: 'At Rest', c: 'Grow', x: '+3 max Sparks and a full meter', u: '3 Grows per journey'}},
  {id: 'dream', t: 'Always on', c: 'after Rest, or before Elite or Guardian', x: 'Practise the first 8 s, then keep it', f: 'D6', n: '"full light, free Lifts" and Wake/Repeat are how the rehearsal plays; moved to the Dream glossary entry.'},
  // ── Rare ──
  {id: 'chameleon', t: 'Next card', x: 'Acts as the next card', f: 'D4',
    keep: {t: 'Next card', x: 'Acts as the next card', u: 'Not × cards or Rest cards'}, simple: {t: 'Next card', x: 'Acts as the next card'}},
  {id: 'rhythm', t: 'Always on', x: '3 even Lifts send out a wave'},
  {id: 'harvest-rare', t: 'Wave', x: '+2 Sparks'},
  {id: 'growth-seed', t: 'At Rest', c: 'Grow', x: '+5 max Sparks and a full meter', u: '3 Grows per journey', f: 'D8',
    keep: {t: 'At Rest', c: 'Grow', x: '+5 max Sparks and a full meter', u: '3 Grows per journey · max +90'}, simple: {t: 'At Rest', c: 'Grow', x: '+5 max Sparks and a full meter', u: '3 Grows per journey'}},
  {id: 'cache-handling', t: 'Always on', x: 'Collector fetches Caches: +12 Sparks each', n: 'The +12 works outside the chain today, so it is "Always on" and × cards do not touch it.'},
  {id: 'flash-handling', t: 'Flash', x: '+6 Sparks; Collector can fetch Flash', n: '"Restore up to 6 missing Sparks" is the meter limit every card has; the code adds 6 through the chain.'},
  {id: 'prism-lens', t: 'Any Trigger', x: 'Chain\'s Sparks ×1.25', b: 'Every card before it ×1.25', n: '"Earlier slots must pay first" dropped: ×1.25 of nothing is nothing.'},
  {id: 'crescendo', t: 'Any Trigger', x: 'Double the chain\'s Sparks', b: 'Double every card before it', f: 'D1', decided: true,
    keep: {t: 'Any Trigger', c: 'needs 2 + cards before it', x: 'Double the chain\'s Sparks'}, simple: {t: 'Any Trigger', x: 'Double the chain\'s Sparks'}},
  {id: 'ring-spring', t: 'Overfill', x: 'Next ready 1 s sooner'},
  {id: 'watchlight', t: 'Always on', c: 'Collector home, full charge', x: 'Collector catches a fatal crash, sends a wave', u: '1 per flight · then 4× recovery', f: 'D7',
    keep: {t: 'Always on', c: 'Collector home, full charge', x: 'Collector catches a fatal crash, sends a wave', u: '1 per flight · then 4× recovery'},
    simple: {t: 'Always on', c: 'Collector home, full charge', x: 'Collector catches a fatal crash, sends a wave', u: '1 per flight'}},
  {id: 'echo-ii', t: 'Next card', x: 'Repeats the next card twice', f: 'D4',
    keep: {t: 'Next card', x: 'Repeats the next card twice', u: 'Not × or always-on cards'}, simple: {t: 'Next card', x: 'Repeats the next card twice'}},
  {id: 'dusk-wick-ii', t: 'Collect', c: 'Dusk Spark', x: '+30 Sparks'},
  {id: 'ripple-glass', t: 'Wave', c: 'its 2nd Spark onward', x: 'Double the chain\'s Sparks', b: 'Double every reward before it'},
  {id: 'glide-prism', t: 'Lift', x: 'Double the chain\'s Sparks', b: 'Double every reward before it'},
  {id: 'flash-bank', t: 'Flash', c: 'meter ⅓ or less', x: '+8 Sparks', n: '"Checks before the pickup refills it" dropped (see Low Wick).'},
  {id: 'spillway', t: 'Always on', x: 'Every 2nd Overfill sends out a wave', f: 'D6'},
  {id: 'tight-packing-ii', t: 'Always on', x: '+75% Stored Sparks from packing'},
  {id: 'kindling-bead-ii', t: 'Any Trigger', c: 'needs a + card before it', x: '+2 Sparks', f: 'D2',
    keep: {t: 'Any Trigger', c: 'needs a + card before it', x: '+2 Sparks'}, simple: {t: 'Any Trigger', x: '+2 Sparks'}},
  {id: 'mirror-grain', t: 'Any Trigger', x: 'Adds the last + card\'s Sparks again', n: 'Needing an earlier + card is implied (nothing to add again). A × card\'s increase is not a + card.'},
  {id: 'closing-chord', t: 'Any Trigger', c: 'last card only', x: 'Chain\'s Sparks ×1.75', b: 'Every card before it ×1.75', f: 'D3',
    keep: {t: 'Any Trigger', c: 'last card only', x: 'Chain\'s Sparks ×1.75'}, simple: {t: 'Any Trigger', x: 'Chain\'s Sparks ×1.75'}},
  {id: 'edge-reach', t: 'Always on', c: 'near terrain for 2 s', x: 'Sends a wave; reach +50%', n: 'Code (model.mjs: proximityUnlocked) lets Edge Reach send Proximity waves on its own; today\'s face does not say so. Text now matches the code.'},
  {id: 'devourer', t: 'Always on', c: 'clear while missing a heart', x: 'Eats the next Rare card: +1 heart', n: '"Keeps both at full hearts" is the missing-heart condition; "Devourer survives" is implied.'},
  {id: 'ember-feeder', t: 'Always on', c: 'after a clear', x: 'Eats the next 2 cards: +1 max Spark', n: 'Still eats nothing if fewer than 2 cards follow (status chip "Needs 2 cards right"). The +1 stays on Ember Feeder while it is in the chain.'},
  {id: 'twin-orbit', t: 'Always on', x: 'A 2nd Collector fetches too', f: 'D6', n: '"The first keeps Field Impulse and saves" moves to the inspector.'},
  // ── Legendary ──
  {id: 'harvest-legendary', t: 'Wave', x: '+2 Sparks, +1 Stored on its 1st Spark', n: 'The Stored Spark is still paid once per wave (not again in an Encore).'},
  {id: 'refrain', t: 'Any Trigger', x: 'Encore: the chain fires once more', f: 'D5',
    keep: {t: 'Any Trigger', x: 'Encore: the chain fires once more', u: '1 Encore per Trigger'}, simple: {t: 'Any Trigger', x: 'Encore: the chain fires once more'}},
  {id: 'echo-iii', t: 'Next card', x: 'Repeats the next card 3 times', f: 'D4',
    keep: {t: 'Next card', x: 'Repeats the next card 3 times', u: 'Not × or always-on cards'}, simple: {t: 'Next card', x: 'Repeats the next card 3 times'}},
  {id: 'prism-lens-ii', t: 'Any Trigger', x: 'Chain\'s Sparks ×1.5', b: 'Every card before it ×1.5'},
  {id: 'downbeat-iii', t: 'Falling Lift', x: '+5 Sparks'},
  {id: 'ring-spring-ii', t: 'Overfill', x: 'Next ready 2 s sooner'},
  {id: 'courier-tip-iii', t: 'Delivery', x: '+5 Sparks'},
  {id: 'dusk-wick-iii', t: 'Collect', c: 'Dusk Spark', x: '+40 Sparks'},
  {id: 'wave-loom', t: 'Always on', x: 'Each Field Impulse swipe sends a wave', f: 'D6'},
  {id: 'last-light', t: 'Save', c: 'meter ⅓ or less', x: '+9 Sparks'},
  {id: 'spillway-ii', t: 'Always on', x: 'Every Overfill sends out a wave', f: 'D6'},
  {id: 'tight-packing-iii', t: 'Always on', x: '+100% Stored Sparks from packing'},
  {id: 'kindling-bead-iii', t: 'Any Trigger', c: 'needs a + card before it', x: '+4 Sparks', f: 'D2',
    keep: {t: 'Any Trigger', c: 'needs a + card before it', x: '+4 Sparks'}, simple: {t: 'Any Trigger', x: '+4 Sparks'}},
  {id: 'second-sun', t: 'Any Trigger', x: 'Chain\'s Sparks ×1.25, ×2 in an Encore', b: 'Every card before it ×1.25, ×2 in an Encore', f: 'D9',
    keep: {t: 'Any Trigger', x: 'Chain\'s Sparks ×1.25, ×2 in an Encore'}, simple: {t: 'Any Trigger', x: 'Chain\'s Sparks ×1.25'}},
  {id: 'growth-seed-legendary', t: 'At Rest', c: 'Grow', x: '+8 max Sparks and a full meter', u: '3 Grows per journey', f: 'D8',
    keep: {t: 'At Rest', c: 'Grow', x: '+8 max Sparks and a full meter', u: '3 Grows per journey · max +90'}, simple: {t: 'At Rest', c: 'Grow', x: '+8 max Sparks and a full meter', u: '3 Grows per journey'}},
];

/* Short titles for the page; the full write-up is in docs/card-text-rewrite.md. */
export const DECISIONS = {
  D1: {kind: 'rule', title: 'Crescendo: drop "after 2 earlier adds"', decided: true, rec: 'Decided by the designer: requirement dropped. Engine change pending.'},
  D2: {kind: 'rule', title: 'Kindling Bead: keep "needs a + card before it"?', rec: 'Keep the requirement; without it a lone Bead pays on every Trigger.'},
  D3: {kind: 'rule', title: 'Closing Chord: keep "last card only"?', rec: 'Keep; three plain words. Without it, ×1.75 anywhere beats Prism Lens II (×1.5, Legendary).'},
  D4: {kind: 'text', title: 'Echo / Chameleon: hide the copy limits?', rec: 'Simpler text; the "Can\'t repeat" status chip already flags a bad neighbour.'},
  D5: {kind: 'text', title: 'Refrain: hide "one Encore per Trigger"?', rec: 'Simpler text; the "Shared replay" status chip flags a second Refrain.'},
  D6: {kind: 'text', title: 'Abilities that do not stack: hide the note?', rec: 'Simpler text; the "Already covered" status chip flags a duplicate.'},
  D7: {kind: 'text', title: 'Watchlight: keep the 4× recovery cost on the face?', rec: 'Keep the cost: players should see a downside before they commit.'},
  D8: {kind: 'text', title: 'Growth Seed: drop the +90 per-Grow cap from the face?', rec: 'Drop it from the face; keep it in code (the 100-Spark meter cap makes it moot).'},
  D9: {kind: 'rule', title: 'Second Sun: keep the Encore clause?', rec: 'Keep; it is the card\'s reason to exist and reads plainly once "Encore" is a glossary word.'},
};

// D6 cards share one pair of candidates: today's rule says it, or the status chip does.
for (const e of CARD_TEXT) if (e.f === 'D6' && !e.keep) {
  const {t, c, x, u} = e;
  e.keep = {t, c, x, u: (u ? `${u} · ` : '') + 'Doesn\'t stack'};
  e.simple = {t, c, x, u};
}

export const RARITIES = ['common', 'rare', 'legendary'];

// ── Page (browser only) ─────────────────────────────────────────────────────
if (typeof document !== 'undefined') boot();

async function boot() {
  const [{CARD_CATALOG}, {getCardRuleBands}, {cardArt}] = await Promise.all([
    import('../card-catalog.mjs?v=guide-clarity-1'),
    import('../card-rule-bands.mjs?v=guide-clarity-1'),
    import('../card-art.mjs?v=guide-clarity-1'),
  ]);
  const query = new URLSearchParams(location.search);
  document.documentElement.dataset.variant = query.get('variant') || 'v1.0-cardtext';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const $ = id => document.getElementById(id);

  const today = def => getCardRuleBands(def, def).map(b => b.text.replace(/\.$/, '')).join(' · ');
  const chip = t => `<span class="ct-chip${t === 'Always on' ? ' ct-chip-always' : t === 'At Rest' ? ' ct-chip-rest' : t === 'Any Trigger' || t === 'Next card' ? ' ct-chip-any' : ''}">${esc(t)}</span>`;
  const proposal = (p, cls = '') => `<div class="ct-prop ${cls}">
      <p class="ct-when">${chip(p.t)}${p.c ? `<span class="ct-cond">${esc(p.c)}</span>` : ''}</p>
      <p class="ct-what">${esc(p.x)}${p.u ? ` <span class="ct-uses">${esc(p.u)}</span>` : ''}</p></div>`;

  const entry = e => {
    const def = CARD_CATALOG[e.id];
    const d = e.f ? DECISIONS[e.f] : null;
    const flagged = d && !d.decided;
    const tag = d ? (d.decided ? `<span class="ct-tag ct-tag-decided">Decided · rule change</span>` : `<span class="ct-tag">Needs a decision</span>`) : '';
    const both = e.keep && e.simple ? `<div class="ct-both">
        <div><small>${d.decided ? 'Was (today\'s rule)' : d.kind === 'rule' ? 'Keeps today\'s rule' : 'Card states the limit'}</small>${proposal(e.keep, 'ct-prop-small' + (d.decided ? ' ct-prop-was' : ''))}</div>
        <div><small>${d.decided ? 'Decided (engine change later)' : d.kind === 'rule' ? 'Simpler (needs a rule change)' : 'Simpler (same rule; status chip or inspector says it)'}</small>${proposal(e.simple, 'ct-prop-small')}</div>
      </div>` : '';
    return `<article class="ct-card" data-rarity="${def.rarity}" data-flagged="${flagged ? 1 : 0}" data-id="${e.id}">
      <div class="ct-art">${cardArt(def, {compact: true})}</div>
      <div class="ct-body">
        <h3 class="ct-name">${esc(def.name)} <small class="ct-rarity ct-r-${def.rarity}">${def.rarity}</small>${tag}</h3>
        <p class="ct-today"><s>${esc(today(def))}</s></p>
        ${proposal(e)}
        ${d ? `<p class="ct-dec"><b>${esc(e.f)}</b> ${esc(d.title)} <span>${esc(d.rec)}</span></p>` : ''}
        ${both}
        ${e.b ? `<p class="ct-boost"><b>With Boost rules:</b> ${esc(e.b)}</p>` : ''}
      </div>
    </article>`;
  };

  $('ct-list').innerHTML = RARITIES.map(r => {
    const group = CARD_TEXT.filter(e => CARD_CATALOG[e.id].rarity === r);
    return `<section class="ct-group" data-rarity="${r}"><h2 class="ct-group-title">${r} <small>${group.length}</small></h2>${group.map(entry).join('')}</section>`;
  }).join('');

  const counts = {all: CARD_TEXT.length, flagged: CARD_TEXT.filter(e => e.f && !DECISIONS[e.f].decided).length};
  for (const r of RARITIES) counts[r] = CARD_TEXT.filter(e => CARD_CATALOG[e.id].rarity === r).length;
  for (const btn of document.querySelectorAll('[data-filter]')) btn.querySelector('small').textContent = counts[btn.dataset.filter];

  const apply = filter => {
    for (const btn of document.querySelectorAll('[data-filter]')) btn.setAttribute('aria-pressed', String(btn.dataset.filter === filter));
    for (const card of document.querySelectorAll('.ct-card')) {
      const show = filter === 'all' || (filter === 'flagged' ? card.dataset.flagged === '1' : card.dataset.rarity === filter);
      card.hidden = !show;
    }
    for (const g of document.querySelectorAll('.ct-group')) g.hidden = !g.querySelector('.ct-card:not([hidden])');
    $('ct-list').scrollTop = 0;
    $('ct-shown').textContent = `${document.querySelectorAll('.ct-card:not([hidden])').length} shown`;
  };
  document.querySelector('.ct-filters').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-filter]');
    if (btn) apply(btn.dataset.filter);
  });
  apply(query.get('filter') || 'all');
  document.documentElement.dataset.ready = '1';
}
