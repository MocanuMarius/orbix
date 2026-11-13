import {formatGlow,getGlowCapacity} from './vitality.mjs?v=risk-chains-1';
import {livesMarkup} from './lives.mjs?v=risk-chains-1';
import { COMPANION_ABILITIES } from './companion-abilities.mjs?v=risk-chains-1';
import { companionArtSvg } from './companion-art.mjs?v=risk-chains-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const tier = value => Math.max(1, Math.floor(Number(value) || 1));
const benefits = Object.freeze({
  collector: 'Rescues missed light packets', protector: 'A shell against collisions',
  leveler: 'Hold a steady height', swift: 'Surge through the passage',
  seer: 'See farther into the dark', kindler: 'More Glow from fuel lights',
});
const lockIcon = '<svg class="unlock-lock" viewBox="0 0 12 14" fill="none" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2M1 6h10v7H1z" stroke="currentColor" stroke-width="1.5"/><path d="M6 9v2" stroke="currentColor"/></svg>';
const arrow = '<svg class="front-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.5"/></svg>';
const landmarks = [
  '<path d="M4 25h24M7 25V12h5v13m8 0V9h5v16M6 12h20v4H6z"/><path d="M11 12V8h11v4"/>',
  '<path d="m5 27 7-10-4 1 7-13 8 13-4-1 7 10H5Zm9-9v10h4V18"/>',
  '<path d="M7 26V11h4V7h10v4h4v15H7Zm5-16v3h3v-3m3 0v3h3v-3M12 19h8v3h-8"/>',
];

/** Three-map path and, when present, the exact resumable run checkpoint. */
export function runProgressMarkup(run) {
  const active = Boolean(run && run.phase !== 'ended' && !run.banked);
  const practice = active && run.isTutorial;
  const map = active ? Math.max(0, Math.min(2, Number(run.mapIndex) || 0)) : -1;
  const totalStops = run?.map?.length || (practice ? 3 : 7);
  const stop = Math.max(1, Math.min(totalStops, (Number(run?.step) || 0) + 1));
  const mapCleared = active && run.phase === 'map-clear';
  const path = `<div class="front-map-path" aria-label="Three maps; the Warden waits at the end of the third">${landmarks.map((landmark, index) => {
    const complete = active && !practice && (index < map || index === map && mapCleared);
    const current = active && !practice && index === map && !mapCleared;
    return `<div class="front-map-stop ${complete ? 'complete' : current ? 'current' : ''}"><span class="front-map-landmark"><svg viewBox="0 0 32 32" aria-hidden="true">${landmark}</svg></span><b>${index === 2 ? 'WARDEN' : `MAP ${index + 1}`}</b><small>${complete ? 'CLEARED' : current ? 'YOU' : index === 2 ? 'MAP 3' : ''}</small></div>`;
  }).join('')}</div>`;
  if (!active) return `<section class="run-progress empty-run">${path}</section>`;
  return `<section class="run-progress">${path}<div class="run-checkpoint"><div><b>${practice ? 'PRACTICE' : `${run.testMode?'TEST · ':''}ASCENSION ${tier(run.difficulty)}`}</b><span>${practice ? '' : `MAP ${map + 1}/3 · `}${mapCleared ? 'REFUGE REACHED' : `STOP ${stop}/${totalStops}`}</span></div><div class="run-checkpoint-resources">${livesMarkup(run,{compact:true})}<span class="front-glow">${formatGlow(run.flame,getGlowCapacity(run),0)} GLOW</span></div></div>${run.phase === 'retry' ? `<p class="run-retry-note">RETRY WAITING · ${esc(run.current?.name || 'Same passage')}</p>` : ''}</section>`;
}

/** Permanent companion unlocks only; this front-page view never equips wisps. */
export function unlockPreviewMarkup(profile = {}, { compact = false } = {}) {
  const maximum = tier(profile.difficulty), roles = Object.values(COMPANION_ABILITIES);
  const next = roles.find(role => role.unlockDifficulty > maximum);
  const unlocked = roles.filter(role => role.unlockDifficulty <= maximum).length;
  return `<section class="unlock-preview ${compact ? 'compact' : ''}" aria-label="Companion unlocks"><button class="unlock-preview-trigger" data-action="companion-unlocks">${next ? `<span class="unlock-next-orb">${companionArtSvg(next.id)}</span><span class="unlock-next-copy"><small>NEXT UNLOCK</small><strong>${esc(next.name)}</strong><span>${esc(benefits[next.id] || next.description)}</span><b>Clear Ascension ${Math.max(1, next.unlockDifficulty - 1)} to unlock</b></span>` : `<span class="unlock-next-copy"><small>COMPANIONS</small><strong>All six lights unlocked</strong><span>Choose your fleet at a Rest.</span></span>`}${arrow}</button><div class="unlock-orb-lineup" role="list" aria-label="${unlocked} of ${roles.length} companions unlocked">${roles.map(role => {
    const open = role.unlockDifficulty <= maximum;
    return `<span class="unlock-orb ${open ? 'unlocked' : 'locked'}" role="listitem" aria-label="${esc(role.name)}. ${open ? 'Unlocked' : `Unlock by clearing Ascension ${role.unlockDifficulty - 1}`}"><i>${companionArtSvg(role.id)}${open ? '' : lockIcon}</i><b>${esc(role.name)}</b><small>${open ? 'READY' : `ASC ${role.unlockDifficulty}`}</small></span>`;
  }).join('')}</div></section>`;
}

/** Standalone front page: Continue, New Game and Tutorial remain distinct. */
export function testStarterMarkup(selected = 'collector') {
  const chosen = COMPANION_ABILITIES[selected] || COMPANION_ABILITIES.collector;
  return `<section class="test-starter-picker" aria-label="Choose a TEST starting companion"><div class="test-starter-heading"><small>NEXT NEW GAME</small><strong>START WITH ${esc(chosen.name.toUpperCase())}</strong></div><div class="test-starter-options">${Object.values(COMPANION_ABILITIES).map(role=>`<button type="button" class="test-starter-option ${chosen.id===role.id?'selected':''}" data-action="test-starter" data-id="${role.id}" aria-label="Start with ${esc(role.name)}" aria-pressed="${chosen.id===role.id}">${companionArtSvg(role.id)}<span>${esc(role.name)}</span></button>`).join('')}</div><p>${esc(benefits[chosen.id])}</p></section>`;
}

export function homeMenuMarkup({ profile = {}, run = null, selectedDifficulty, testOverride = false, testStarterCompanion = 'collector' } = {}) {
  const maximum = testOverride ? Math.max(6,tier(profile.difficulty)) : tier(profile.difficulty), chosen = Math.min(maximum, tier(selectedDifficulty ?? maximum));
  const active = Boolean(run && run.phase !== 'ended' && !run.banked);
  return `<section class="run-front-page"><header class="front-title"><div class="front-main-light" aria-hidden="true"></div><h1>WISPBOUND</h1><p>A LIGHT IN THE LOST WOODS</p></header>${runProgressMarkup(active ? run : null)}<div class="front-actions">${active ? `<button class="front-continue primary" data-action="continue-run"><span>CONTINUE<small>${run.isTutorial ? 'Your practice route' : 'Saved run'}</small></span>${arrow}</button>` : ''}<div class="front-new-game"><div class="front-ascension-picker" role="group" aria-label="Choose ascension for a new game"><button data-action="choose-ascension" data-value="${Math.max(1, chosen - 1)}" aria-label="Previous ascension" ${chosen <= 1 ? 'disabled' : ''}>−</button><span>ASCENSION <b>${chosen}</b><small>${testOverride ? `TEST · 1–${maximum}` : maximum > 1 ? `UNLOCKED 1–${maximum}` : 'FIRST JOURNEY'}</small></span><button data-action="choose-ascension" data-value="${Math.min(maximum, chosen + 1)}" aria-label="Next ascension" ${chosen >= maximum ? 'disabled' : ''}>+</button></div><button class="front-new-button ${active ? 'secondary' : 'primary'}" data-action="new-game"><span>NEW GAME<small>Fresh run</small></span>${arrow}</button></div><button class="front-tutorial secondary" data-action="tutorial"><span>TUTORIAL</span><small>Practice</small>${arrow}</button></div>${testOverride?testStarterMarkup(testStarterCompanion):unlockPreviewMarkup(profile)}</section>`;
}
