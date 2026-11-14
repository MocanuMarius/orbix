import {resourceSymbol} from './game-symbols.mjs?v=flash-prism-1';
import {pickupArtSvg, drawFlashBurst, FLASH_BURST_DURATION} from './pickup-art.mjs?v=flash-prism-1';
import {getPickupSpec} from './pickups.mjs?v=flash-prism-1';
import {glowPoints} from './vitality.mjs?v=flash-prism-1';
import {SKILLS, ARTIFACTS} from './model.mjs?v=flash-prism-1';
import {ROUTE_BONUSES} from './route-bonuses.mjs?v=flash-prism-1';
import {skillIcon, artifactIcon} from './upgrade-icons.mjs?v=flash-prism-1';
import {mapStopIconMarkup} from './map-guide.mjs?v=flash-prism-1';
import {companionArtSvg} from './companion-art.mjs?v=flash-prism-1';
import {lifeHeartSvg} from './lives.mjs?v=flash-prism-1';
import {bonusIcon} from './route-bonus-ui.mjs?v=flash-prism-1';
import {menuIcon} from './menu-icons.mjs?v=flash-prism-1';

const preferences = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const picker = document.querySelector('#group');
const gallery = document.querySelector('#gallery');
const motion = document.querySelector('#motion');
const scale = document.querySelector('#scale');
const skillGroups = new Map();
for (const skill of Object.values(SKILLS)) {
  if (!skill.retired && !skillGroups.has(skill.treeGroup || skill.id)) {
    skillGroups.set(skill.treeGroup || skill.id, skill);
  }
}
const card = (name, art, detail = '') => ({name, art, detail});
const summaries = {sight:'Reveals the passage', dusk:'Fuel · dims sight', dark:'Dims sight'};
const pickup = kind => {
  const spec = getPickupSpec(kind);
  return {...card(spec.name, pickupArtSvg(kind), spec.plasma ? '+' + glowPoints(spec.fuel) + ' Sparks' : summaries[kind]), kind};
};
const groups = {
  fuel: () => ['light','cluster','cache'].map(pickup),
  other: () => ['sight','dusk','dark'].map(pickup),
  skills: () => Array.from(skillGroups.values(), skill => card(skill.treeName || skill.name, skillIcon(skill))),
  companions: () => [['collector','Collector'],['protector','Protector'],['swift','Runner'],['leveler','Space Timer']].map(([id,name]) => card(name,companionArtSvg(id))),
  relics: () => Object.values(ARTIFACTS).map(artifact => card(artifact.name,artifactIcon(artifact.id))),
  sites: () => [['flight','Flight'],['rest','Rest'],['treasure','Treasure'],['encounter','Encounter'],['elite','Elite'],['boss','Guardian']].map(([id,name]) => card(name,mapStopIconMarkup(id))),
  bonuses: () => Object.values(ROUTE_BONUSES).map(b => card(b.name,bonusIcon(b.id))),
  controls: () => [
    card('Heart',lifeHeartSvg()), card('Spent heart',lifeHeartSvg(true)),
    ...[['up','Lift'],['down','Decrease'],['uses','Uses'],['auto','Automatic'],['clock','Duration'],['music','Music']].map(([id,name]) => card(name,resourceSymbol(id))),
    ...[['arrow','Next'],['shield','Shield'],['route','Route'],['tune','Settings'],['info','Information'],['sound','Sound'],['pause','Pause'],['check','Confirm']].map(([id,name])=>card(name,menuIcon(id)))
  ]
};

document.querySelector('#fuel-mark').innerHTML = resourceSymbol('energy');
document.querySelector('#wallet-mark').innerHTML = resourceSymbol('packed');
document.querySelector('#sight-mark').innerHTML = skillIcon(SKILLS['main-sight']);
let paused = preferences.matches;
// Preview playback is an explicit per-page choice. Keep the initial system
// preference, and allow both the normal and reduced motion artwork to be inspected.
const motionRules = [];
function collectMotionRules(rules) {
  for (const rule of rules) {
    if (rule instanceof CSSMediaRule && /prefers-reduced-motion/.test(rule.conditionText)) {
      motionRules.push([rule.media, rule.conditionText]);
    }
    if ('cssRules' in rule) collectMotionRules(rule.cssRules);
  }
}
for (const sheet of document.styleSheets) collectMotionRules(sheet.cssRules);
function syncMotion() {
  for (const [media, original] of motionRules) {
    media.mediaText = preferences.matches && !paused
      ? original.replace(/\(prefers-reduced-motion:\s*(reduce|no-preference)\)/g, (_,value)=>value==='reduce'?'(width < 0px)':'(width >= 0px)')
      : original;
  }
  root.dataset.previewPaused = String(paused || document.hidden);
  motion.textContent = paused ? 'Play motion' : 'Pause motion';
}
// Render the actual pickup burst at the same scale as the idle triangle.
function wireFlashDemo(button) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 160;
  canvas.setAttribute('aria-hidden','true');
  button.append(canvas);
  const ctx = canvas.getContext('2d');
  let frame;
  button.addEventListener('click', () => {
    cancelAnimationFrame(frame);
    const start = performance.now();
    button.classList.add('bursting');
    function render(now) {
      if (!button.isConnected) return;
      const elapsed = (now-start)/1000;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if (elapsed >= FLASH_BURST_DURATION) {
        button.classList.remove('bursting');
        return;
      }
      drawFlashBurst(ctx,80,80,elapsed,1,root.dataset.previewPaused === 'true');
      frame = requestAnimationFrame(render);
    }
    render(start);
  });
}
function renderGroup() {
  const fragment = document.createDocumentFragment();
  for (const {name, art: markup, detail, kind} of groups[picker.value]()) {
    const figure = document.createElement('figure'), art = document.createElement('div');
    const caption = document.createElement('figcaption');
    art.className = 'art';
    art.setAttribute('aria-hidden','true');
    art.innerHTML = markup;
    caption.textContent = name;
    if (kind === 'sight') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'flash-demo';
      button.setAttribute('aria-label','Try the Flash Powerup burst');
      button.append(...art.childNodes);
      art.append(button);
      art.removeAttribute('aria-hidden');
      wireFlashDemo(button);
    }
    if (detail) { const text = document.createElement('small'); text.textContent = kind === 'sight' ? 'Tap to burst' : detail; caption.append(text); }
    figure.append(art, caption);
    fragment.append(figure);
  }
  gallery.replaceChildren(fragment);
  gallery.dataset.group = picker.value;
  if (location.hash.slice(1) !== picker.value) history.replaceState(null, '', '#' + picker.value);
}
function followGroupLink() {
  const group = location.hash.slice(1);
  picker.value = Object.hasOwn(groups, group) ? group : 'fuel';
  renderGroup();
}
window.addEventListener('hashchange', followGroupLink);
picker.addEventListener('change', renderGroup);
scale.addEventListener('click', () => {
  const large = scale.getAttribute('aria-pressed') !== 'true';
  scale.setAttribute('aria-pressed', String(large));
  root.dataset.large = String(large);
});
motion.addEventListener('click', () => { paused = !paused; syncMotion(); });
preferences.addEventListener('change', () => { paused = preferences.matches; syncMotion(); });
document.addEventListener('visibilitychange', syncMotion);
syncMotion();
followGroupLink();
