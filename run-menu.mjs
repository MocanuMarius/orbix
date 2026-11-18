import {menuWorldMarkup} from './menu-world.mjs?v=spring-1';
import {resourceSymbol} from './game-symbols.mjs?v=spring-1';
import {formatGlow,getGlowCapacity} from './vitality.mjs?v=spring-1';
import {livesMarkup} from './lives.mjs?v=spring-1';
import { COMPANION_ABILITIES, getCompanionUnlock } from './companion-abilities.mjs?v=spring-1';
import { companionArtSvg } from './companion-art.mjs?v=spring-1';
import { GAME_VERSION } from './build-version.mjs?v=spring-1';
import { menuIcon } from './menu-icons.mjs?v=spring-1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const tier = value => Math.max(1, Math.floor(Number(value) || 1));
const benefits = Object.freeze({
  collector: 'Fetches Sparks + Clusters.', protector: 'Shields one collision, then recharges.',
  leveler: 'Hold to hover. Release to glide.', swift: 'Surges through drafts.',
});
export const companionLockIcon = '<svg class="unlock-lock" viewBox="0 0 12 14" fill="none" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2M1 6h10v7H1z" stroke="currentColor" stroke-width="1.5"/><path d="M6 9v2" stroke="currentColor"/></svg>';
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
// One horizon and one road give all three places a shared sense of scale.
// Only the visited portion of the road is inked in moss green.
const journeyRoad = [
  'M0 57h8v-2h9v-2h8v-3h6v-2h9',
  'M40 48h12v2h9v3h10v2h13v-2h9v-3h7v-4h6v-3h11v-2h12v2h7v1h8',
  'M144 44h11v2h14v3h11v3h11v2h15v-2h6v-4h7v-4h6v-3h7v-2h17'
];
const journeyTerrain = `<g fill="#21332f"><path d="M0 46h7v-3h9v-4h7v-3h7v3h5v5h22v-3h8v-5h7v-4h6v-6h5v-5h5v4h4v7h6v4h5v4h12v-3h8v-5h8v-4h5v-6h6v3h7v5h8v6h8v5h7v3h7v-4h6v-4h7v-7h5v-5h6v3h5v7h7v5h12v-4h7v-7h6v-4h5v6h8v5h9v5h7v4h11v4h7v4h7v4H0z"/></g>
  <path fill="#32483c" d="M0 54h10v-4h14v-3h17v-2h13v4h13v2h17v-2h11v-4h12v-3h12v-3h15v-2h13v1h16v3h12v3h13v4h12v1h12v-3h9v-4h10v-4h12v-3h14v-3h11v2h10v4h11v3h8v5h8v4h9v4h5v2h-12v2h-15v-1h-17v-2h-29v2h-18v3h-16v3h-20v-1h-18v-3h-21v-2h-19v1h-18v3H72v3H55v-1H37v-2H21v1H5v-2H0z"/>
  <path fill="#6a7659" d="M2 51h6v2H2zm65 0h10v1H67zm17-3h7v1h-7zm22-6h9v1h-9zm53 0h8v2h-8zm17 4h4v1h-4zm24 6h7v1h-7zm21-10h5v1h-5zm49 2h7v1h-7zm12 5h4v1h-4z"/>
  <path fill="#243831" d="M79 48v-7h-4v-2h2v-3h2v-5h2v5h2v3h2v2h-4v7zm9-3v-7h-4v-2h2v-3h2v-5h2v5h2v3h2v2h-4v6zm109 1v-7h-4v-2h2v-3h2v-4h2v4h2v3h2v2h-4v7z"/>`;

function chapterJourney(map, mapCleared, practice) {
  const earned = practice || map < 0 ? 0 : map + Number(mapCleared);
  const active = !practice && map >= 0 && !mapCleared ? map : -1;
  const stops = [[5,14,.83],[106,7,.90],[200,0,1.08]];
  const road = journeyRoad.map((d,i) => `<path class="${i<earned?'journey-road-cleared':'journey-road-ahead'}" d="${d}"/>`).join('');
  const places = journeyPlaces.map((art,i) => {
    const [x,y,scale]=stops[i], current=i===active, cleared=i<earned;
    const marker=current?`<g transform="translate(0 -10)">${wispMarker}</g>`:'';
    return `<g class="chapter-${current?'lit':cleared?'cleared':'future'}" transform="translate(${x} ${y}) scale(${scale})">${art}${marker}</g>`;
  }).join('');
  const labels = stops.map((_,i) => {
    const state=i===active?'current':i<earned?'complete':'';
    return `<span class="journey-caption ${state}" ${state==='current'?'aria-current="step"':''}>Map ${i+1}${state?`<span class="journey-sr-only">, ${state}</span>`:''}</span>`;
  }).join('');
  return `<figure class="journey-landscape journey-ink" aria-label="Journey through three maps"><svg viewBox="0 -2 288 65" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${journeyTerrain}${places}<g fill="none" stroke-width="2" stroke-linejoin="miter">${road}</g></svg><figcaption>${labels}</figcaption></figure>`;
}

/** Three-map path and, when present, the exact resumable run checkpoint. */
export function runProgressMarkup(run) {
  const active = Boolean(run && (run.phase !== 'ended' || run.victoryPending || run.cardDraft && !run.cardDraft.claimed || run.cardReward?.draftId && !run.cardReward.uiAcknowledged) && !run.banked);
  const practice = active && run.isTutorial;
  const map = active ? Math.max(0, Math.min(2, Number(run.mapIndex) || 0)) : -1;
  const totalStops = run?.map?.length || (practice ? 3 : 10);
  const stop = Math.max(1, Math.min(totalStops, (Number(run?.step) || 0) + 1));
  const mapCleared = active && run.phase === 'map-clear';
  const path = chapterJourney(map, mapCleared, practice);
  if (!active) return `<section class="run-progress empty-run">${path}</section>`;
  return `<section class="run-progress">${path}<div class="run-checkpoint"><div><b>${practice ? 'PRACTICE' : `${run.testMode?'TEST · ':''}ASCENSION ${tier(run.difficulty)}`}</b><span>${practice ? '' : `MAP ${map + 1}/3 · `}${mapCleared ? 'REFUGE REACHED' : `STOP ${stop}/${totalStops}`}</span></div><div class="run-checkpoint-resources">${livesMarkup(run,{compact:true})}<span class="front-glow" aria-label="Spark Meter: ${formatGlow(run.flame)} of ${formatGlow(getGlowCapacity(run))}">${resourceSymbol('energy')}${formatGlow(run.flame)} / ${formatGlow(getGlowCapacity(run))}</span></div></div>${run.phase === 'retry' ? `<p class="run-retry-note">RETRY WAITING · ${esc(run.current?.name || 'Same passage')}</p>` : ''}</section>`;
}

/** Companion tab. Locked portraits appear only when a real choice exists, or in TEST. */
export function testStarterMarkup({testOverride=false}={}){
 const roles=Object.values(COMPANION_ABILITIES),selectable=roles.filter(role=>getCompanionUnlock(role.id).selectable);
 const shown=testOverride||selectable.length>1?roles:selectable;
 const choices=shown.map(role=>{
   const available=getCompanionUnlock(role.id).selectable;
   const label=esc(role.name+(available?' equipped':' locked'));
   return `<button type="button" class="home-companion-option${available?' selected':''}" data-action="starting-companion" data-id="${role.id}" aria-label="${label}" title="${label}" aria-pressed="${available}" ${available?'':'disabled'}>${companionArtSvg(role.id)}<span>${esc(role.name)}</span>${available?'<i class="home-companion-state" aria-hidden="true"></i>':`<small class="home-companion-lock" aria-hidden="true">${companionLockIcon}</small>`}</button>`;
 }).join('');
 return `<section class="home-companion wb-tabbox${shown.length>1?' is-roster':''}" aria-label="Companions"><strong class="home-companion-heading">Companion</strong><div class="home-companion-options" role="group" aria-label="Companion roster">${choices}</div><p class="home-companion-benefit">${esc(benefits.collector)}</p></section>`;
}

/** One Waystone plaque (ui/waystone.css). Primary plaques carry no art, as in the kit. */
function homeSign(role,action,title,sub,{cls='',art=''}={}){
 return `<button type="button" class="wb-sign wb-sign-${role}${cls?` ${cls}`:''}" data-action="${action}">${art?`<i class="wb-sign-art" aria-hidden="true">${menuIcon(art)}</i>`:''}<span class="wb-sign-text"><b>${esc(title)}</b><small>${esc(sub)}</small></span></button>`;
}

export function homeMenuMarkup({ profile = {}, run = null, selectedDifficulty, testOverride = false, gameMode = 'cards', modeLinks = null, practiceFirst = false } = {}) {
  const maximum = testOverride ? Math.max(6,tier(profile.difficulty)) : tier(profile.difficulty), chosen = Math.min(maximum, tier(selectedDifficulty ?? maximum));
  const active = Boolean(run && (run.phase !== 'ended' || run.victoryPending || run.cardDraft && !run.cardDraft.claimed || run.cardReward?.draftId && !run.cardReward.uiAcknowledged) && !run.banked);
  const continueSub = active ? (run.isTutorial ? 'Your practice route' : `MAP ${Math.min(3,(Number(run.mapIndex)||0)+1)}/3 · ${run.phase==='map-clear'?'MAP CLEARED':`STOP ${Math.min(run.map?.length||10,(Number(run.step)||0)+1)}/${run.map?.length||10}`}`) : '';
  const journey = !active&&run?.endScore
    ? `<button type="button" class="home-score-tab wb-tabbox" data-action="score-view"><b>Last scorecard</b><small>${Math.max(0,Math.floor(run.endScore.earned||0))} Stored Sparks</small></button>`
    : `<div class="home-journey wb-tabbox">${runProgressMarkup(active ? run : null)}</div>`;
  const ascension = `<div class="home-ascension${maximum===1?' is-fixed':''}" role="group" aria-label="Choose ascension for a new game"><button type="button" class="home-ascension-step" data-action="choose-ascension" data-value="${Math.max(1, chosen - 1)}" aria-label="Previous ascension" ${chosen <= 1 ? 'disabled' : ''}>−</button><span class="home-ascension-label">ASCENSION <b>${chosen}</b><small>${testOverride ? `TEST · 1–${maximum}` : maximum > 1 ? `UNLOCKED 1–${maximum}` : 'FIRST JOURNEY'}</small></span><button type="button" class="home-ascension-step" data-action="choose-ascension" data-value="${Math.min(maximum, chosen + 1)}" aria-label="Next ascension" ${chosen >= maximum ? 'disabled' : ''}>+</button></div>`;
  const menu = (active ? homeSign('primary','continue-run','CONTINUE',continueSub,{cls:'front-continue'}) : '')
    + homeSign(active ? 'standard' : 'primary','new-game','NEW GAME',practiceFirst ? 'First Light practice first' : 'Choose a starting gift',{cls:'front-new-button',art:active?'new-game':''})
    + ascension
    + homeSign('standard','tutorial','TUTORIAL','Lessons & practice',{cls:'front-tutorial',art:'tutorial'})
    + homeSign('standard','settings','SETTINGS','Sound & options',{cls:'front-settings',art:'tune'});
  // DOM order is focus order: the page's menu first, then the tabs on the painting.
  return `<section class="menu-art-home wb-ground${active?' has-continue':''}">${menuWorldMarkup()}<div class="wb-shade home-shade" aria-hidden="true"></div><div class="wb-page home-page"><div class="wb-pagelight" aria-hidden="true"></div><header class="wb-head home-head"><div class="wb-title-row"><i class="wb-flourish" aria-hidden="true"></i><h1 class="wb-title">WISPBOUND</h1><i class="wb-flourish wb-flip" aria-hidden="true"></i></div><p class="wb-context home-tagline">A LIGHT IN THE LOST WOODS</p></header><nav class="home-menu" aria-label="Main menu">${menu}</nav><small class="front-version" data-game-version="${esc(GAME_VERSION)}">Version ${esc(GAME_VERSION)}</small><button type="button" class="front-update secondary" data-action="update-now" data-update-title hidden>Update available</button></div><div class="home-tabs">${journey}${testStarterMarkup({testOverride})}</div></section>`;
}
