// The screens menu-audit.mjs opens. Each has a name (file name part) and open(ctx, w, h) that leaves the screen showing.
// Routes are the game's own dev routes (nothing is saved): /game.html?cards=1&mock=cards&scenario=... (dist/card-inspector.mjs, dist/app.mjs).
// Not covered here (other workers own them): Scribe, chest, temporary-Inscription screens and the tutorial lesson overlay.
const MOCK = '/game.html?cards=1&mock=cards';
const CHAIN = MOCK + '&chain=rhythm,echo,-,body-spark&reserve=lift-guide,proximity,body-spark,echo&slots=0:twin-mark,3:gilded';
const REST = MOCK + '&scenario=rest&chain=rhythm,echo,-,body-spark&reserve=lift-guide,body-spark,deep-vessel,harvest-rare';
const deck = c => c.go(CHAIN, '#dk-root .dk2-station');
const home = async c => { await c.go('/game.html', '[data-action=new-game]'); await c.delay(600); };
const settings = async c => { await home(c); await c.click('[data-action=settings]'); await c.until(() => c.exists('dialog[open]'), 'settings'); };
const fieldGuide = async c => { await settings(c); await c.click('[data-action=field-guide]'); await c.delay(500); };
const map = async c => { await c.go(MOCK, '#dk-root .dk2-station'); await c.click('#dk2-done'); await c.delay(500); };
const rest = async c => { await c.go(REST, '[data-action=card-workshop]'); await c.delay(400); };

export const SCREENS = [
  // Home and settings
  {name: 'home', open: home},
  {name: 'settings', open: settings},
  {name: 'settings-advanced', open: async c => { await settings(c); await c.click('[data-action=settings-advanced]'); await c.delay(400); }},
  {name: 'help-field-guide', open: fieldGuide},
  {name: 'help-glossary', open: async c => { await fieldGuide(c); await c.click('.card-glossary-link'); await c.until(() => c.exists('.card-glossary-dialog[open]'), 'glossary'); }},
  {name: 'help-glossary-term', open: async c => { await fieldGuide(c); await c.click('.card-glossary-link'); await c.until(() => c.exists('.card-glossary-dialog[open]'), 'glossary'); await c.click('.card-glossary-list .card-term'); await c.delay(500); }},
  {name: 'help-credits', open: async c => { await settings(c); await c.clickText('Credits'); await c.delay(400); }},
  // Starting card
  {name: 'starting-card-choice', open: async c => { await c.go(MOCK + '&scenario=starter&gifts=spark-cache,cache-handling,harvest-common', '.card-starter, .card-starter-pair'); }},
  {name: 'starting-card-confirm', open: async c => { await c.go(MOCK + '&scenario=starter&gifts=spark-cache,cache-handling,harvest-common', '.card-starter-pair'); await c.click('.card-pick'); await c.delay(500); }},
  // Deck tabs
  {name: 'chain-tab', open: deck},
  {name: 'deck-tab', open: async c => { await c.go(CHAIN + '&new=1', '#dk-root .dk2-station'); await c.click('#dk2-tab-deck'); }},
  {name: 'deck-filter-menu', open: async c => { await c.go(CHAIN + '&new=1', '#dk-root .dk2-station'); await c.click('#dk2-tab-deck'); await c.click('#dk2-filter'); }},
  {name: 'triggers-tab', open: async c => { await deck(c); await c.click('#dk2-tab-triggers'); }},
  {name: 'card-inspector', open: async c => { await deck(c); await c.click('.dk21-eye'); await c.delay(300); }},
  {name: 'chain-swap-picker', open: async c => { await deck(c); await c.click('.dk21-swap'); await c.delay(300); }},
  // Map and stops
  {name: 'map', open: map},
  {name: 'map-stop-page', open: async c => { await map(c); await c.click('.world-map-node.reachable'); await c.until(() => c.exists('.flight-preview-sheet'), 'stop page'); }},
  {name: 'depart-panel', open: async c => { await c.go(MOCK + '&scenario=departure', '[data-action=wake-flight]'); await c.delay(800); }},
  {name: 'pause-menu-map', open: async c => { await map(c); await c.click('[data-action=menu]'); await c.delay(400); }},
  {name: 'pause-abandon-confirm', open: async c => { await map(c); await c.click('[data-action=menu]'); await c.click('[data-action=abandon-run]'); await c.delay(500); }},
  {name: 'pause-settings', open: async c => { await map(c); await c.click('[data-action=menu]'); await c.click('.wb-pause-sheet [data-action=settings]'); await c.delay(500); }},
  {name: 'map-help', open: async c => { await map(c); await c.click('[data-action=menu]'); await c.click('.wb-pause-sheet [data-action=field-guide]'); await c.delay(500); }},
  {name: 'map-clear', open: async c => { await c.go(MOCK + '&scenario=mapclear', '[data-action=next-map]'); }},
  {name: 'retry', open: async c => { await c.go(MOCK + '&scenario=retry', '[data-action=retry]'); }},
  // Rest
  {name: 'rest', open: rest},
  {name: 'rest-workshop', open: async c => { await rest(c); await c.click('[data-action=card-workshop]'); await c.delay(500); }},
  {name: 'rest-forge-preview', open: async c => { await rest(c); await c.click('[data-action=card-workshop-forge]'); await c.delay(500); }},
  {name: 'rest-forge-result', open: async c => { await rest(c); await c.click('[data-action=card-workshop-forge]'); await c.delay(400); await c.click('[data-action=card-confirm-forge]'); await c.delay(2200); }},
  {name: 'rest-complete', open: async c => { await rest(c); await c.click('[data-action=support]'); await c.delay(2200); }},
  // Flights, rewards, endings
  {name: 'flight-summary', open: async c => { await c.go(MOCK + '&scenario=pack', '#app *'); await c.delay(3500); }},
  {name: 'flight-summary-late', open: async c => { await c.go(MOCK + '&scenario=pack&late=1', '#app *'); await c.delay(3500); }},
  {name: 'victory', open: async c => { await c.go(MOCK + '&scenario=victory', '.game-result-screen'); }},
  {name: 'victory-recap-scrolled', open: async c => { await c.go(MOCK + '&scenario=victory', '.game-result-screen'); await c.click('.game-result-recap>summary'); await c.ev("document.querySelector('.game-result-body').scrollTop=9999"); await c.delay(300); }},
  {name: 'defeat-result', open: async c => { await c.go(MOCK + '&scenario=defeat', '.game-result-screen'); }},
  {name: 'death-light-fallen', open: async c => { await c.go(MOCK + '&scenario=death', '.death-screen'); await c.delay(2500); }},
];
export {CHAIN};
