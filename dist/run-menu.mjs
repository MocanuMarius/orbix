import {menuWorldMarkup} from './menu-world.mjs?v=guardian-currents-1';
import {formatGlow,getGlowCapacity} from './vitality.mjs?v=guardian-currents-1';
import {livesMarkup} from './lives.mjs?v=guardian-currents-1';
import { COMPANION_ABILITIES } from './companion-abilities.mjs?v=guardian-currents-1';
import { companionArtSvg } from './companion-art.mjs?v=guardian-currents-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const tier = value => Math.max(1, Math.floor(Number(value) || 1));
const benefits = Object.freeze({
  collector: 'Collector rescues missed Sparks', protector: 'A shell against collisions',
  leveler: 'Hold a steady height', swift: 'Surge through the passage',
});
const lockIcon = '<svg class="unlock-lock" viewBox="0 0 12 14" fill="none" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2M1 6h10v7H1z" stroke="currentColor" stroke-width="1.5"/><path d="M6 9v2" stroke="currentColor"/></svg>';
const arrow = '<svg class="front-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.5"/></svg>';
// Three places along one path. The soil, roots and windows deliberately leave
// negative space through the illustration so that the menu sky shows between them.
const journeyPlaces = [
  // Forgotten Verge: moss-covered arch, broken pillar and fallen masonry.
  `<path fill="#172826" d="M5 41h5v-3h7v-3h6V21h4v-8h5V9h14v3h7v7h4v16h7v3h10v4h-3v3H57v3H29v-2H12v-2H5z"/>
   <path fill="#425651" d="M17 39h6V22h5V13h5v-3h12v4h5v5h4v18h-8V20h-5v-3h-6v4h-4v17h5v3H17z"/>
   <path fill="#71837a" d="M23 24h6v4h-6zm5-9h6v5h-6zm5-5h9v4h-9zm13 6h4v5h-4zm5 8h3v7h-3z"/>
   <path fill="#a9ac85" d="M32 9h11v2H32zm-5 8h3v2h-3zm19-3h4v2h-4z"/>
   <path fill="#709068" d="M22 22h7v3h-5v4h-2zm10-13h5v3h-3v3h-2zm17 8h5v3h-3v4h-2z"/>
   <path fill="#53675a" d="M58 37V27h4v-3h5v4h-2v9zm-44 0v-6h4v-3h3v10z"/>
   <path fill="#88916d" d="M58 27h5v2h-5zm-44 4h4v2h-4zm42 7h11v3H56z"/>
   <path fill="#465c48" d="M7 40h10v-3h12v3h11v-2h12v2h14v-2h8v4H60v3H29v-2H12v-1H7z"/>
   <path class="chapter-beacon" fill="#90a68e" d="M38 23h4v2h2v4h-2v2h-4v-2h-2v-4h2z"/> `,
  // Rootbound March: a split, crooked ancient oak with amber sap in its hollow.
  `<path fill="#192a23" d="M5 42h6v-3h9v-3h12v-8h-5v-4h-9v-3h-7v-6h4v-5h8V6h9V3h12v3h11v4h8v5h6v5h-5v5H53v4h-7v8h8v3h13v2h7v3H60v3H25v-2H11v-2H5z"/>
   <path fill="#445e43" d="M11 16h5v-5h8V7h9V4h11v3h10v4h9v5h5v4h-8v4h-9v3h-9v-5h-9v4h-7v-3h-9v-4h-6z"/>
   <path fill="#698058" d="M16 13h6V9h9V6h11v4h-6v3h-9v3H16zm25-1h9v-3h5v5h8v3H50v2h-5v-4h-4z"/>
   <path fill="#9aab6c" d="M24 8h7v2h-7zm9-4h7v2h-7zm17 6h5v2h-5zm7 5h5v2h-5z"/>
   <path fill="#775f44" d="M15 21h9v3h9v-7h4v7h4V14h4v8h7v-4h4v6h-7v3h-6v8h3v4h9v3H40v-3h-6v3H20v-3h9v-4h4v-6h-6v-3h-7v-2h-5z"/>
   <path fill="#ad8860" d="M36 23h3v10h-3zm4-4h3v5h-3zm9 4h6v2h-6z"/>
   <path fill="#253631" d="M35 39v-8h2v-4h3v3h2v9z"/>
   <path class="chapter-beacon" fill="#b69c68" d="M37 32h3v4h-3z"/>
   <path fill="#526b48" d="M7 41h11v-2h10v2h7v-2h8v2h13v-2h8v3h8v2H60v2H26v-2H13v-1H7z"/> `,
  // Warden's Reach: two unequal watchtowers guarding a dark portcullis.
  `<path fill="#172527" d="M5 42h7v-3h5V23h3v-9h3v-3h2v4h5v-4h3v4h3v9h5V11h2V6h3V3h3v4h6V4h3v4h4v19h2v10h6v4h5v3H65v3H42v2H24v-3H11v-2H5z"/>
   <path fill="#536466" d="M19 38V24h3v-9h3v3h5v-3h4v11h10V10h4V7h3v4h6V8h4v19h2v12H51V29h-4v-3h-6v3h-3v10z"/>
   <path fill="#7b8c86" d="M20 24h5v13h-5zm2-8h4v4h-4zm21-4h5v10h-5zm8 1h8v3h-8zm8 12h3v12h-3z"/>
   <path fill="#a7b2a0" d="M43 10h5v2h-5zm6-4h2v3h-2zm8 2h3v3h-3zm-36 9h4v2h-4z"/>
   <path fill="#243436" d="M27 22h3v5h-3zm25-4h3v6h-3zm-9 16h4v6h-4z"/>
   <path class="chapter-beacon" fill="#a68e70" d="M52 19h2v4h-2zm-25 4h2v3h-2z"/>
   <path fill="#77604d" d="M49 0h2v7h-2zm2 0h11v2h-3v2h-8z"/>
   <path fill="#485847" d="M6 42h10v-3h9v2h8v-2h9v2h13v-3h10v2h7v3H61v3H42v1H24v-3H12v-1H6z"/> `
];

const wispMarker = `<path fill="#6f754e" d="M35 0h6v2h3v5h-3v2h-6V7h-3V2h3z"/>
  <path fill="#f5e3a1" d="M36 1h4v2h2v3h-2v2h-4V6h-2V3h2z"/>
  <path fill="#ffffdc" d="M37 2h3v3h-3z"/>`;
const clearedMarker = '<path fill="#acdc9b" d="M32 4h3v2h3V4h3V2h3V0h3v4h-3v2h-3v3h-6V7h-3z"/>';

function chapterJourney(map, mapCleared, practice) {
  const status = journeyPlaces.map((_, i) => {
    if (practice || map < 0) return '';
    if (i < map || (i === map && mapCleared)) return 'complete';
    return i === map ? 'current' : '';
  });
  const pictures = journeyPlaces.map((place, i) => {
    const state = status[i];
    const marker = state === 'current' ? wispMarker : state === 'complete' ? clearedMarker : '';
    const tone = state === 'current' ? 'lit' : state === 'complete' ? 'cleared' : 'future';
    return `<g class="chapter-${tone}" transform="translate(${i * 96 + 8} 10)">${place}<g transform="translate(0 -10)">${marker}</g></g>`;
  }).join('');
  const labels = status.map((state, i) => `<span class="journey-caption ${state}" ${state === 'current' ? 'aria-current="step"' : ''} aria-label="Map ${i + 1}${state ? ', '+state : ''}">MAP ${i + 1}</span>`).join('');
  return `<figure class="journey-landscape" aria-label="Three maps; a different guardian waits at the end of each"><svg viewBox="0 0 288 61" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><g fill="#84936a"><path d="M77 51h4v2h-4zm7-2h4v2h-4zm7-3h4v2h-4zm7 1h4v2h-4zm7 3h4v2h-4zm69-1h4v2h-4zm7 1h4v2h-4zm7 2h4v2h-4zm8-3h4v2h-4zm7-2h4v2h-4z"/></g>${pictures}</svg><figcaption>${labels}</figcaption></figure>`;
}

/** Three-map path and, when present, the exact resumable run checkpoint. */
export function runProgressMarkup(run) {
  const active = Boolean(run && run.phase !== 'ended' && !run.banked);
  const practice = active && run.isTutorial;
  const map = active ? Math.max(0, Math.min(2, Number(run.mapIndex) || 0)) : -1;
  const totalStops = run?.map?.length || (practice ? 3 : 7);
  const stop = Math.max(1, Math.min(totalStops, (Number(run?.step) || 0) + 1));
  const mapCleared = active && run.phase === 'map-clear';
  const path = chapterJourney(map, mapCleared, practice);
  if (!active) return `<section class="run-progress empty-run">${path}</section>`;
  return `<section class="run-progress">${path}<div class="run-checkpoint"><div><b>${practice ? 'PRACTICE' : `${run.testMode?'TEST · ':''}ASCENSION ${tier(run.difficulty)}`}</b><span>${practice ? '' : `MAP ${map + 1}/3 · `}${mapCleared ? 'REFUGE REACHED' : `STOP ${stop}/${totalStops}`}</span></div><div class="run-checkpoint-resources">${livesMarkup(run,{compact:true})}<span class="front-glow">${formatGlow(run.flame,getGlowCapacity(run),0)} SPARKS</span></div></div>${run.phase === 'retry' ? `<p class="run-retry-note">RETRY WAITING · ${esc(run.current?.name || 'Same passage')}</p>` : ''}</section>`;
}

/** Permanent companion unlocks only; this front-page view never equips wisps. */
export function unlockPreviewMarkup(profile = {}, { compact = false } = {}) {
  const maximum = tier(profile.difficulty), roles = Object.values(COMPANION_ABILITIES);
  const next = roles.find(role => role.unlockDifficulty > maximum);
  const unlocked = roles.filter(role => role.unlockDifficulty <= maximum).length;
  return `<section class="unlock-preview ${compact ? 'compact' : ''}" aria-label="Companion unlocks"><button class="unlock-preview-trigger" data-action="companion-unlocks">${next ? `<span class="unlock-next-orb">${companionArtSvg(next.id)}</span><span class="unlock-next-copy"><small>NEXT UNLOCK</small><strong>${esc(next.name)}</strong><span>${esc(benefits[next.id] || next.description)}</span><b>Clear Ascension ${Math.max(1, next.unlockDifficulty - 1)} to unlock</b></span>` : `<span class="unlock-next-copy"><small>COMPANIONS</small><strong>All four companions unlocked</strong><span>Choose one companion at a Rest.</span></span>`}${arrow}</button><div class="unlock-orb-lineup" role="list" aria-label="${unlocked} of ${roles.length} companions unlocked">${roles.map(role => {
    const open = role.unlockDifficulty <= maximum;
    return `<span class="unlock-orb ${open ? 'unlocked' : 'locked'}" role="listitem" aria-label="${esc(role.name)}. ${open ? 'Unlocked' : `Unlock by clearing Ascension ${role.unlockDifficulty - 1}`}"><i>${companionArtSvg(role.id)}${open ? '' : lockIcon}</i><b>${esc(role.name)}</b><small>${open ? 'READY' : `ASC ${role.unlockDifficulty}`}</small></span>`;
  }).join('')}</div></section>`;
}

/** Standalone front page: Continue, New Game and Tutorial remain distinct. */
export function testStarterMarkup(selected='collector',{profile={},testOverride=true}={}){
 const roles=Object.values(COMPANION_ABILITIES),maximum=tier(profile.difficulty);
 const candidate=COMPANION_ABILITIES[selected],chosen=candidate&&(testOverride||candidate.unlockDifficulty<=maximum)?candidate:COMPANION_ABILITIES.collector;
 const next=roles.find(role=>role.unlockDifficulty>maximum);
 return `<section class="test-starter-picker starter-roster" aria-label="Choose your starting companion"><div class="test-starter-heading"><small>${testOverride?'TEST · ALL SELECTABLE':'STARTING COMPANION'}</small><strong>${next?`Clear A${next.unlockDifficulty-1} → ${esc(next.name)}`:'All roles unlocked'}</strong></div><div class="test-starter-options">${roles.map(role=>{const locked=role.unlockDifficulty>maximum;return `<button type="button" class="test-starter-option ${chosen.id===role.id?'selected':''} ${locked?'progression-locked':''}" data-action="starting-companion" data-id="${role.id}" aria-label="${esc(role.name)}${locked?`, unlocks at Ascension ${role.unlockDifficulty}`:''}" aria-pressed="${chosen.id===role.id}" ${locked&&!testOverride?'disabled':''}>${companionArtSvg(role.id)}<span>${esc(role.name)}</span>${locked?`<small class="starter-lock">${lockIcon} A${role.unlockDifficulty}</small>`:''}</button>`;}).join('')}</div><p>${esc(benefits[chosen.id])}</p></section>`;
}

export function homeMenuMarkup({ profile = {}, run = null, selectedDifficulty, testOverride = false, testStarterCompanion = 'collector' } = {}) {
  const maximum = testOverride ? Math.max(6,tier(profile.difficulty)) : tier(profile.difficulty), chosen = Math.min(maximum, tier(selectedDifficulty ?? maximum));
  const active = Boolean(run && run.phase !== 'ended' && !run.banked);
  return `<section class="run-front-page menu-art-home">${menuWorldMarkup()}<header class="front-title"><div class="front-main-light" aria-hidden="true"></div><h1>WISPBOUND</h1><p>A LIGHT IN THE LOST WOODS</p></header>${runProgressMarkup(active ? run : null)}<div class="front-actions">${active ? `<button class="front-continue primary" data-action="continue-run"><span>CONTINUE<small>${run.isTutorial ? 'Your practice route' : `MAP ${Math.min(3,(Number(run.mapIndex)||0)+1)}/3 · ${run.phase==='map-clear'?'MAP CLEARED':`STOP ${Math.min(run.map?.length||7,(Number(run.step)||0)+1)}/${run.map?.length||7}`}`}</small></span>${arrow}</button>` : ''}<div class="front-new-game"><button class="front-new-button ${active ? 'secondary' : 'primary'}" data-action="new-game"><span>NEW GAME<small>BUILD A NEW JOURNEY</small></span>${arrow}</button><div class="front-ascension-picker" role="group" aria-label="Choose ascension for a new game"><button data-action="choose-ascension" data-value="${Math.max(1, chosen - 1)}" aria-label="Previous ascension" ${chosen <= 1 ? 'disabled' : ''}>−</button><span>ASCENSION <b>${chosen}</b><small>${testOverride ? `TEST · 1–${maximum}` : maximum > 1 ? `UNLOCKED 1–${maximum}` : 'FIRST JOURNEY'}</small></span><button data-action="choose-ascension" data-value="${Math.min(maximum, chosen + 1)}" aria-label="Next ascension" ${chosen >= maximum ? 'disabled' : ''}>+</button></div></div><button class="front-tutorial secondary" data-action="tutorial"><span>FIELD GUIDE<small>Lessons & practice</small></span>${arrow}</button></div>${testStarterMarkup(testStarterCompanion,{profile,testOverride})}</section>`;
}
