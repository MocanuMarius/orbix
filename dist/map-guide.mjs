// Map labels and event identities are presentation metadata, never reward rules.
const stop = (kind, label, name, summary) => Object.freeze({ kind, label, name, summary, icon: kind });
export const MAP_STOP_TYPES = Object.freeze({
  flight: stop('flight', 'FLIGHT', 'Flight', 'Fly a passage, secure embers, then choose a temporary power.'),
  elite: stop('elite', 'ELITE', 'Elite flight', 'A harder passage with a larger clear reward and a themed power draft.'),
  rest: stop('rest', 'REST', 'Rest', 'Refill Glow or gather embers. Redistribute tuning and change companions here.'),
  shrine: stop('shrine', 'SHRINE', 'Shrine', 'Choose Glow and embers, or a temporary power. Rest preparation is available.'),
  event: stop('event', 'EVENT', 'Event', 'One of six encounters, each with two resource or build choices. Rest preparation is available.'),
  finale: stop('finale', 'FINALE', 'Map finale', 'Finish this map. Maps one and two lead onward; the third map ends with the difficulty-tier boss.'),
});

const UNLOCKED_EVENT_SCENARIOS = Object.freeze([
  { id: 'ash-spring', index: 0, name: 'Ash Spring',
    summary: 'Refill Glow or take 16 embers.',
    detail: 'The refill costs 12 embers when affordable; the ember option leaves the spring untouched.' },
  { id: 'cinder-bargain', index: 1, name: 'Cinder Bargain',
    summary: 'Trade spare Glow for more embers, or take 12 embers safely.',
    detail: 'With enough Glow, spend 15 to gain 35 embers. At low Glow, the first choice stores light instead.' },
  { id: 'abandoned-lantern', index: 2, name: 'Abandoned Lantern',
    summary: 'Recover 24 Glow or take 22 embers.',
    detail: 'Choose fuel for the next passage or permanent ember currency.' },
  { id: 'weathered-shrine', index: 3, name: 'Weathered Shrine',
    summary: 'Draft a temporary power or keep your build and take 20 embers.',
    detail: 'The draft offers two new cards; keeping your current loadout grants embers.' },
  { id: 'luminous-well', index: 4, name: 'Luminous Well',
    summary: 'Refill Glow or store 10 Glow for later flights.',
    detail: 'Stored Glow respects reserve capacity; a full reserve offers 12 embers instead.' },
  { id: 'ember-archive', index: 5, name: 'The Ember Archive',
    summary: 'Draft a temporary power or store 8 Glow for later flights.',
    detail: 'The draft costs 10 embers when affordable. A full reserve offers embers instead of stored Glow.' },
].map(Object.freeze));

// The default catalogue teaches only the choices available before the first boss.
// Names, order and indices stay identical so seeded events never change identity.
const INTRO_EVENT_COPY = Object.freeze({
  'cinder-bargain': {
    summary: 'Trade spare Glow for more embers, or take 12 embers safely.',
    detail: 'With enough Glow, spend 15 to gain 35 embers. At low Glow, the first choice recovers 18 Glow instead.'
  },
  'luminous-well': {
    summary: 'Refill Glow or take 12 embers.',
    detail: 'Choose a full fuel refill for the next passage or permanent ember currency.'
  },
  'ember-archive': {
    summary: 'Draft a temporary power or take 12 embers.',
    detail: 'The draft costs 10 embers when affordable; the other choice keeps your build and grants 12 embers.'
  }
});
export const EVENT_SCENARIOS = Object.freeze(UNLOCKED_EVENT_SCENARIOS.map(event =>
  Object.freeze({ ...event, ...(INTRO_EVENT_COPY[event.id] || {}) })));

/** Accepts {afterglowUnlocked:boolean} or a boolean. Locked is the default. */
export function getEventScenarios(options = {}) {
  const unlocked = typeof options === 'boolean' ? options : options?.afterglowUnlocked === true;
  return unlocked ? UNLOCKED_EVENT_SCENARIOS : EVENT_SCENARIOS;
}

function kindOf(value) {
  if (typeof value === 'string') {
    if (value === 'camp') return 'rest';
    if (value === 'normal' || value === 'ordinaryflight') return 'flight';
    return Object.hasOwn(MAP_STOP_TYPES, value) ? value : 'flight';
  }
  const node = value || {};
  if (node.type === 'finale' || node.kind === 'finale') return 'finale';
  if (node.kind === 'camp' || node.kind === 'rest') return 'rest';
  if (node.kind === 'shrine') return 'shrine';
  if (node.kind === 'event') return 'event';
  if (node.type === 'support') return node.kind === 'camp' || node.kind === 'rest' ? 'rest'
    : node.kind === 'shrine' ? 'shrine' : 'event';
  if (node.elite || node.kind === 'elite') return 'elite';
  return 'flight';
}

export function getMapStopInfo(node = {}) {
  const kind = kindOf(node), base = MAP_STOP_TYPES[kind];
  const event = kind === 'event' && Number.isInteger(node.eventIndex) ? getEventScenarios({ afterglowUnlocked: node.afterglowUnlocked === true })[node.eventIndex] : null;
  return { ...base,
    name: event?.name || (kind === 'flight' || kind === 'elite' || kind === 'finale'
      ? node.locationName || node.name : node.name) || base.name,
    summary: event?.summary || base.summary,
    detail: event?.detail || base.summary,
    eventIndex: event?.index ?? null, scenarioId: event?.id || null };
}

const ICONS = Object.freeze({
  flight: '<path d="M3 16 11 7 21 4 16 14 8 20l2-8 11-8M10 12l6 2"/>',
  elite: '<path d="M7 17c-2-1-3-3-3-6a8 8 0 0 1 16 0c0 3-1 5-3 6v4H7zM10 18v3m4-3v3"/><circle cx="8.5" cy="11.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="11.5" r="1.2" fill="currentColor"/><path d="m11 16 1-2 1 2"/>',
  rest: '<path d="m4 21 16-3M4 18l16 3M12 3c1 5 6 5 5 10-1 5-10 5-11 0-1-3 2-5 3-7 0 3 2 3 3-3z"/><path d="M12 11c0 2 3 3 2 5h-4c-1-2 1-3 2-5z"/>',
  shrine: '<path d="M5 5H3v15h12v-2"/><rect x="7" y="2" width="14" height="16" rx="1.5"/><path d="m14 6 3 4-3 4-3-4z"/>',
  event: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5"/><path d="M12 17h.01"/>',
  finale: '<path d="M5 22V3m0 1h15v11H5"/><path d="M5 4h5v5H5zm10 0h5v5h-5zm-5 5h5v6h-5z" fill="currentColor" stroke="none"/>',
});

/** Full SVG markup; size and color inherit from the surrounding map or key. */
export function mapStopIconMarkup(kindOrNode) {
  return `<svg class="map-stop-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[kindOf(kindOrNode)]}</svg>`;
}
