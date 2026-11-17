// Disposable, deterministic equipped samples. No app boot, persistence or economy actions.
import { CARD_SYSTEM, SKILL_CARDS, makeSkillCard, getMountedCards, previewCardRow } from './skill-cards.mjs?v=clips-1';
import { cardRowTraceMarkup, cardRowSequenceMarkup } from './card-row-feedback.mjs?v=clips-1';
import { cardFace } from './card-ui.mjs?v=clips-1';
import { CARD_TERMS, cardTermTextMarkup, installCardTermHelp } from './card-terms.mjs?v=clips-1';
import {resolveCardHelpContext} from './card-row-help.mjs?v=clips-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const DEFAULT_COMBO_SEED = 'moonwell-15';

function seededRandom(seed) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ state >>> 15, state | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function createComboSample(seed = DEFAULT_COMBO_SEED) {
  const random = seededRandom(seed), catalog = Object.keys(SKILL_CARDS).filter(id => !SKILL_CARDS[id].retired && !SKILL_CARDS[id].unreleased);
  // One shuffled catalog guarantees coverage; the remaining draws stay independent.
  let pool = catalog.length <= 45 ? [...catalog, ...Array.from({length:45 - catalog.length}, () => catalog[Math.floor(random() * catalog.length)])] : shuffled(catalog, random).slice(0,45);
  do { pool = shuffled(pool, random); }
  while (new Set(Array.from({length:15}, (_, row) => pool.slice(row * 3, row * 3 + 3).join('|'))).size < 15);
  return Array.from({length:15}, (_, row) => {
    const ids = pool.slice(row * 3, row * 3 + 3);
    const run = {skillSystem:CARD_SYSTEM, cardSlots:3, mountedCards:ids.map((id, slot) => makeSkillCard(id, `combo:${row}:${slot}`))};
    return {run, cards:getMountedCards(run)};
  });
}

// Explicit card IDs keep a shared example reproducible as the catalog grows.
export function createPinnedCombo(ids, row = 0) {
  if (!Array.isArray(ids) || ids.length !== 3 || !ids.every(id => typeof id === 'string' && SKILL_CARDS[id]) || !Number.isInteger(row) || row < 0 || row >= 15) return null;
  const run = {skillSystem:CARD_SYSTEM,cardSlots:3,mountedCards:ids.map((id,slot)=>makeSkillCard(id,`pinned:${row}:${slot}`))};
  return {run,cards:getMountedCards(run)};
}

function outcomesMarkup(cards) {
  const copies = cards.flatMap((card, slot) => card.copyPreview ? [`<section><h3>Slot ${slot + 1} · ${esc(card.name)} <small>${esc(card.rarity)}</small></h3><p>${cardTermTextMarkup(card.copyPreview)}</p></section>`] : []);
  const combined = new Map();
  cards.forEach((card, slot) => {
    if (!card.effectiveSummary) return;
    if (!combined.has(card.effectiveSummary)) combined.set(card.effectiveSummary, []);
    combined.get(card.effectiveSummary).push({card, slot});
  });
  return '<p class="combo-contribution-note">Base contributions before row multipliers and replay. Try an event above for its final result.</p>' + copies.join('') + [...combined].map(([summary, sources]) => `<section><h3>${sources.length > 1 ? 'Combined across slots' : 'In slot'} ${sources.map(({slot}) => slot + 1).join(' + ')}<small class="combo-source-cards">${sources.map(({card}) => esc(card.name)).join(' + ')}</small></h3><p>${cardTermTextMarkup(summary)}</p></section>`).join('');
}
export const COMBO_EVENT_PRESETS = Object.freeze([
  ['wave-first','Pulse · first Spark crossing',{kind:'wave-crossing',firstCrossing:true}],
  ['wave-later','Pulse · later Spark crossing',{kind:'wave-crossing',firstCrossing:false}],
  ['body-light','Wisp absorbs a Spark',{kind:'body-spark',pickupKind:'light'}],
  ['body-cluster','Wisp absorbs a Cluster',{kind:'body-spark',pickupKind:'cluster'}],
  ['body-cache','Wisp absorbs a Cache',{kind:'body-spark',pickupKind:'cache'}],
  ['body-dusk','Wisp absorbs a Dusk Spark',{kind:'body-spark',pickupKind:'dusk'}],
  ['body-low','Wisp absorbs a Spark · ¼ meter',{kind:'body-spark',pickupKind:'light',meterFraction:.25}],
  ['body-guard','Wisp Spark · Collector recovering from save',{kind:'body-spark',pickupKind:'light',guardRecovering:true}],
  ['flash','Flare pickup',{kind:'flash-pickup',pickupKind:'sight'}],
  ['flash-low','Flare pickup · ¼ meter',{kind:'flash-pickup',pickupKind:'sight',meterFraction:.25}],
  ['flash-expiry','Passage Flare expires',{kind:'flash-expiry',pickupKind:'sight'}],
  ['lift','Falling paid Lift',{kind:'downbeat-lift'}],
  ['overfill','Spark overfill',{kind:'natural-overfill'}],
  ['collector-light','Collector delivers a Spark',{kind:'collector-delivery',pickupKind:'light'}],
  ['collector-cluster','Collector delivers a Cluster',{kind:'collector-delivery',pickupKind:'cluster'}],
  ['collector-cache','Collector delivers a Cache',{kind:'collector-delivery',pickupKind:'cache'}],
  ['rhythm','Successful Rhythm phrase',{kind:'rhythm-phrase'}],
  ['guard','Collector saves you',{kind:'guard-rescue'}],
  ['guard-low','Collector saves you · ¼ meter',{kind:'guard-rescue',meterFraction:.25}],
]);
const eventOptions = COMBO_EVENT_PRESETS.map(([id,label])=>`<option value="${id}">${label}</option>`).join('');
export function comboEventContext(id = 'wave-first') {
  const preset = COMBO_EVENT_PRESETS.find(preset=>preset[0]===id) || COMBO_EVENT_PRESETS[0];
  return {firstCrossing:true,availableRecovery:10,pickupKind:'light',meterFraction:.75,direction:'up',guardRecovering:false,...preset[2]};
}
const receipt = (run, preset = 'wave-first') => previewCardRow(run, comboEventContext(preset));
export function comboRowsMarkup(rows) {
  return rows.map(({cards,run}, row) => `<section class="combo-row" id="combo-${row + 1}" aria-labelledby="combo-title-${row + 1}"><header class="combo-row-heading"><h2 id="combo-title-${row + 1}">Combination ${String(row + 1).padStart(2, '0')}</h2><span>Equipped order →</span></header><div class="combo-cards">${cards.map((card, slot) => `<div class="combo-slot"><div class="combo-slot-label"><span>Slot ${slot + 1}</span><span>${esc(card.rarity)}</span></div>${cardFace(card)}</div>`).join('')}</div><details class="combo-outcomes"><summary>Try an event · see slot order</summary><div><label class="combo-event-control">One event<select data-combo-event="${row}" aria-label="Event for combination ${row + 1}">${eventOptions}</select></label><div class="combo-event-receipt" data-combo-receipt="${row}">${cardRowTraceMarkup(receipt(run))}</div><div class="combo-passives">${outcomesMarkup(cards)}</div></div></details></section>`).join('');
}
const examples = [
  {ids:['harvest-rare','prism-lens','refrain'], label:'Harvest → Prism → Refrain'},
  {ids:['prism-lens','harvest-rare','refrain'], label:'Prism → Harvest → Refrain'},
  {ids:['rhythm','harvest-rare','prism-lens'], label:'Rhythm → Harvest → Prism'},
];
const exampleRun = example => ({skillSystem:CARD_SYSTEM,cardSlots:3,mountedCards:example.ids.map((id,slot)=>makeSkillCard(id,`example:${slot}`))});

if (typeof document !== 'undefined') {
  const params = new URLSearchParams(location.search);
  let seed = params.get('seed')?.slice(0, 80) || DEFAULT_COMBO_SEED;
  const pinnedRow = Number(params.get('row') || 1) - 1;
  const pinned = createPinnedCombo((params.get('combo') || '').split(','),pinnedRow);
  let samples = [];
  const render = () => {
    document.getElementById('combo-catalog-count').textContent = Object.values(SKILL_CARDS).filter(card => !card.unreleased).length;
    samples = createComboSample(seed);
    if (pinned) samples[pinnedRow] = pinned;
    document.getElementById('combo-rows').innerHTML = comboRowsMarkup(samples);
    document.getElementById('combo-coverage-note').textContent = Object.values(SKILL_CARDS).filter(card => !card.unreleased).length <= 45 ? 'Every card appears in this sample.' : '45 sampled slots. Browse every card below.';
    document.getElementById('combo-sample-note').textContent = `Sample ${seed} · reload keeps these combinations${pinned ? ` · Combination ${pinnedRow + 1} uses the shared card IDs` : ''}`;
  };
  document.getElementById('combo-glossary').dataset.cardTerms = Object.keys(CARD_TERMS).join(' ');
  document.getElementById('combo-shuffle').addEventListener('click', () => {
    seed = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    const next = new URL(location.href); next.searchParams.set('seed', seed);
    history.replaceState(null, '', next); render();
  });
  document.getElementById('combo-rows').addEventListener('change', event => {
    const index = event.target.dataset.comboEvent;
    if(index === undefined)return;
    document.querySelector(`[data-combo-receipt="${index}"]`).innerHTML = cardRowTraceMarkup(receipt(samples[Number(index)].run,event.target.value));
  });
  const renderExample = index => {
    const example = examples[index], run = exampleRun(example), trace = receipt(run);
    document.getElementById('combo-example-cards').innerHTML = getMountedCards(run).map((card,slot)=>`<div class="combo-slot"><div class="combo-slot-label">Slot ${slot + 1}</div>${cardFace(card)}</div>`).join('');
    document.getElementById('combo-example-result').innerHTML = `<strong>One Pulse crossing · +${trace.sparks} Sparks</strong><span class="card-row-sequences">${cardRowSequenceMarkup(trace)}</span>`;
    document.getElementById('combo-example-trace').innerHTML = cardRowTraceMarkup(trace);
    document.querySelectorAll('[data-combo-example]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.comboExample)===index)));
  };
  document.getElementById('combo-example-controls').innerHTML = examples.map((example,index)=>`<button type="button" data-combo-example="${index}" aria-pressed="${index===0}">${example.label}</button>`).join('');
  document.getElementById('combo-example-controls').addEventListener('click',event=>{const button=event.target.closest('[data-combo-example]');if(button)renderExample(Number(button.dataset.comboExample));});
  const renderCatalog = () => {
    const query = document.getElementById('combo-catalog-search').value.trim().toLowerCase();
    const tier = document.getElementById('combo-catalog-rarity').value;
    const cards = Object.values(SKILL_CARDS).filter(card=>!card.unreleased&&(!tier||card.rarity===tier)&&(!query||`${card.name} ${card.kind} ${card.id}`.toLowerCase().includes(query)));
    document.getElementById('combo-catalog-result').textContent = `${cards.length} cards`;
    document.getElementById('combo-catalog').innerHTML = cards.map(card=>`<div class="combo-slot">${cardFace(getMountedCards({skillSystem:CARD_SYSTEM,cardSlots:3,mountedCards:[makeSkillCard(card.id,`catalog:${card.id}`)]})[0])}</div>`).join('');
  };
  document.getElementById('combo-catalog-search').addEventListener('input',renderCatalog);
  document.getElementById('combo-catalog-rarity').addEventListener('change',renderCatalog);
  const galleryContext = button => {
    const own=button.closest('[data-card-instance]');if(!own)return null;const row=button.closest('.combo-row')||button.closest('#combo-example-cards')||own;
    const cards=row===own?[own]:[...row.querySelectorAll('[data-card-instance]')];
    const mountedCards=cards.map(face=>{
      const card=makeSkillCard(face.dataset.cardHelp,face.dataset.cardInstance);
      card.rank=Number(face.dataset.cardRank)||1;
      if(face.dataset.cardCharges!==undefined)card.charges=Number(face.dataset.cardCharges);
      return card;
    });
    const run={skillSystem:CARD_SYSTEM,cardSlots:Math.max(3,cards.length),mountedCards,reserveCards:[],skills:{},companions:['collector']};
    return resolveCardHelpContext(button,run,{example:true,label:row===own?'Catalog card · example row':'This gallery row · preview'});
  };
  installCardTermHelp(document,{resolveCardContext:galleryContext,resolveProximityContext:galleryContext}); render(); renderExample(0); renderCatalog();
}
