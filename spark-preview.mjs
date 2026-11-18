import {resourceSymbol} from './game-symbols.mjs?v=forge-1';
import {drawPickup, pickupArtSvg} from './pickup-art.mjs?v=forge-1';
import {getPickupSpec} from './pickups.mjs?v=forge-1';
import {drawBlackHoles} from './black-hole-art.mjs?v=forge-1';
import {blackHoleDrainRate, BLACK_HOLE_TUNING} from './black-holes.mjs?v=forge-1';
import {CAPTURE_STYLES, readCaptureStyle, saveCaptureStyle} from './capture-styles.mjs?v=forge-1';
import {drawCapture} from './capture-art.mjs?v=forge-1';
import {glowPoints, LIGHT_PACKET_TUNING} from './vitality.mjs?v=forge-1';
import {SKILLS, ARTIFACTS} from './model.mjs?v=forge-1';
import {ROUTE_BONUSES} from './route-bonuses.mjs?v=forge-1';
import {skillIcon, artifactIcon} from './upgrade-icons.mjs?v=forge-1';
import {mapStopIconMarkup} from './map-guide.mjs?v=forge-1';
import {companionArtSvg, makeWispSprite} from './companion-art.mjs?v=forge-1';
import {lifeHeartSvg} from './lives.mjs?v=forge-1';
import {bonusIcon} from './route-bonus-ui.mjs?v=forge-1';
import {menuIcon} from './menu-icons.mjs?v=forge-1';

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
const summaries = {sight:'Reveals the passage', dusk:'Drains up to 3 Sparks · dims Luminance 20% for 4s', dark:'Dims sight'};
const pickup = kind => {
  const spec = getPickupSpec(kind);
  return {...card(spec.name, pickupArtSvg(kind), spec.plasma ? '+' + glowPoints(spec.fuel) + ' Sparks' : summaries[kind]), kind};
};
const groups = {
  absorption: () => [],
  sizes: () => [],
  flash: () => [],
  fuel: () => ['light','cluster','cache'].map(pickup),
  other: () => ['sight','dusk','dark'].map(pickup),
  siphon: () => [],
  lantern: () => [],
  skills: () => Array.from(skillGroups.values(), skill => card(skill.treeName || skill.name, skillIcon(skill))),
  companions: () => [['collector','Collector'],['protector','Protector'],['swift','Runner'],['leveler','Space Timer']].map(([id,name]) => card(name,companionArtSvg(id))),
  relics: () => Object.values(ARTIFACTS).map(artifact => card(artifact.name,artifactIcon(artifact.id))),
  sites: () => [['flight','Flight'],['rest','Rest'],['treasure','Treasure'],['encounter','Encounter'],['elite','Elite'],['boss','Guardian']].map(([id,name]) => card(name,mapStopIconMarkup(id))),
  bonuses: () => Object.values(ROUTE_BONUSES).map(b => card(b.condition,bonusIcon(b.id),b.reward)),
  controls: () => [
    card('Heart',lifeHeartSvg()), card('Spent heart',lifeHeartSvg(true)),
    ...[['up','Lift'],['down','Decrease'],['uses','Uses'],['auto','Automatic'],['clock','Duration'],['music','Music']].map(([id,name]) => card(name,resourceSymbol(id))),
    ...[['arrow','Next'],['shield','Shield'],['route','Route'],['tune','Settings'],['info','Information'],['sound','Sound'],['pause','Pause'],['check','Confirm']].map(([id,name])=>card(name,menuIcon(id)))
  ]
};

document.querySelector('#fuel-mark').innerHTML = resourceSymbol('energy');
document.querySelector('#wallet-mark').innerHTML = resourceSymbol('packed');
document.querySelector('#sight-mark').innerHTML = skillIcon(SKILLS['main-sight']);
let reducedMotion = preferences.matches;
let paused = reducedMotion;
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
    media.mediaText = reducedMotion && !paused
      ? original.replace(/\(prefers-reduced-motion:\s*(reduce|no-preference)\)/g, (_,value)=>value==='reduce'?'(width < 0px)':'(width >= 0px)')
      : original;
  }
  root.dataset.previewPaused = String(paused || document.hidden);
  motion.textContent = paused ? 'Play motion' : 'Pause motion';
}
let previewWisp;
function wirePickupDemo(button, kind) {
  const duration = LIGHT_PACKET_TUNING.absorptionDuration;
  const wispX = 65, wispY = 89;
  const effect = {pickupKind:kind, initialAngle:Math.atan2(80-wispY,80-wispX),
    approachX:-40, approachY:-8, initialScale:1, style:readCaptureStyle(), startRadius:Math.hypot(80-wispX,80-wispY), captureDistance:0, capturePlayerY:wispY, phase:0, duration};
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 160;
  canvas.setAttribute('aria-hidden','true');
  button.append(canvas);
  const ctx = canvas.getContext('2d');
  let frame;
  button.addEventListener('click', () => {
    cancelAnimationFrame(frame);
    const start = performance.now();
    effect.bornAt = start / 1000;
    button.classList.add('bursting');
    function render(now) {
      if (!button.isConnected) return;
      const elapsed = (now-start)/1000;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if (elapsed >= duration) {
        button.classList.remove('bursting');
        return;
      }
      const quiet = root.dataset.previewPaused === 'true';
      previewWisp ??= makeWispSprite(document,28);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(previewWisp,wispX-15,wispY-15,30,30);
      drawCapture(ctx,effect,effect.bornAt+elapsed,wispX,wispY,0,1,quiet);
      frame = requestAnimationFrame(render);
    }
    render(start);
  });
}
// A fixed distance lets the same drain and rendering code run without a flight.
function createSiphonPreview() {
  const figure = document.createElement('figure');
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 96;
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','Light stretching from the wisp into the black hole');
  const caption = document.createElement('figcaption');
  caption.textContent = 'Black hole';
  figure.append(canvas,caption);
  const c = canvas.getContext('2d');
  const player = {x:62,y:48};
  const hole = {id:'preview',x:146,y:48,seed:24,coreRadius:BLACK_HOLE_TUNING.coreRadius,
    sourceX:player.x,sourceY:player.y,rate:blackHoleDrainRate(146-player.x),drained:0,lastDrainAt:0};
  const scene = {player,width:canvas.width,height:canvas.height,distance:0,time:0,alive:true,blackHoles:{items:[hole]}};
  previewWisp ??= makeWispSprite(document,28);
  let previous, lastQuiet;
  function paint(now) {
    if (!canvas.isConnected) return;
    const quiet = root.dataset.previewPaused === 'true';
    if (!quiet || quiet !== lastQuiet) {
      const elapsed = quiet || previous == null ? 0 : Math.min(.05,(now-previous)/1000);
      scene.time += elapsed;
      scene.visualTime = scene.time;
      scene.reducedMotion = quiet;
      hole.drained += hole.rate * elapsed;
      hole.lastDrainAt = scene.time;
      c.clearRect(0,0,canvas.width,canvas.height);
      c.imageSmoothingEnabled = false;
      c.drawImage(previewWisp,player.x-15,player.y-15,30,30);
      drawBlackHoles(c,scene);
    }
    lastQuiet = quiet;
    previous = now;
    requestAnimationFrame(paint);
  }
  requestAnimationFrame(paint);
  return figure;
}

const scrub = document.querySelector('#capture-time');
const sample = document.querySelector('#sample-kind');
const angleControl = document.querySelector('#capture-angle');
// Contact offsets and incoming velocity relative to the wisp. Opposite
// encounters mirror each other so each pair can be compared at the same time.
const encounters = {
  ahead:  { dx: 28, dy: -7, approachX: -38, approachY: -12 },
  behind: { dx:-28, dy: -7, approachX:  38, approachY: -12 },
  above:  { dx:  7, dy:-28, approachX: -22, approachY:  24 },
  below:  { dx:  7, dy: 28, approachX: -22, approachY: -24 }
};
const styleNote = document.querySelector('#style-note');
const duration = LIGHT_PACKET_TUNING.absorptionDuration;
const leadIn = .4;
const loopLength = leadIn + duration + .4;
let previewTime = 0;
let compareFrame;
let flashPreview;
let sizesPreview;
let lanternPreview;

scrub.addEventListener('input', () => {
  paused = true;
  syncMotion();
  previewTime = Number(scrub.value) / 1000 * loopLength;
});

angleControl.addEventListener('change', () => {
  if (!paused) previewTime = 0;
});

function createComparison(fragment) {
  const selected = readCaptureStyle();
  const wispX = 75, wispY = 60;
  const contexts = [];
  previewWisp ??= makeWispSprite(document,28);
  for (const style of CAPTURE_STYLES) {
    const figure = document.createElement('figure');
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 120;
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label',style.name + ' absorption');
    const label = document.createElement('label');
    label.className = 'capture-choice';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'capture-style';
    radio.value = style.id;
    radio.checked = style.id === selected;
    radio.addEventListener('change', () => {
      styleNote.textContent = saveCaptureStyle(style.id)
        ? style.name + ' selected for your next flight.'
        : 'This browser could not save your choice.';
    });
    label.append(radio,style.name);
    figure.append(canvas,label);
    fragment.append(figure);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const effect = {style:style.id,
      captureDistance:0, capturePlayerY:wispY, phase:.7, initialScale:1, bornAt:1, duration};
    contexts.push({ctx,effect});
  }
  const initialStyle = CAPTURE_STYLES.find(style=>style.id === selected);
  styleNote.textContent = initialStyle.name + ' selected for your next flight.';
  // All three renders use one clock and the same flight coordinates. Pausing or
  // scrubbing therefore compares the same instant regardless of refresh rate.
  let lastWallTime, lastTime, lastKind, lastEncounter;
  previewTime = paused ? leadIn + duration * .22 : 0;
  function paint(now) {
    const playing = root.dataset.previewPaused !== 'true';
    if (playing && lastWallTime !== undefined) {
      previewTime = (previewTime + Math.min(.1,(now-lastWallTime)/1000)) % loopLength;
    }
    lastWallTime = now;
    const kind = sample.value;
    const encounter = encounters[angleControl.value];
    if (previewTime !== lastTime || kind !== lastKind || encounter !== lastEncounter) {
      const {dx,dy,approachX,approachY} = encounter;
      scrub.value = Math.round(1000*previewTime/loopLength);
      const age = previewTime - leadIn;
      for (const {ctx,effect} of contexts) {
        ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
        if (encounter !== lastEncounter) {
          effect.approachX = approachX;
          effect.approachY = approachY;
          effect.initialAngle = Math.atan2(dy,dx);
          effect.startRadius = Math.hypot(dx,dy);
          ctx.canvas.setAttribute('aria-label',effect.style + ' absorption from ' + angleControl.value);
        }
        ctx.drawImage(previewWisp,wispX-15,wispY-15,30,30);
        effect.pickupKind = kind;
        const time = effect.bornAt + age;
        if (age < 0) {
          drawPickup(ctx,wispX+dx+age*approachX,wispY+dy+age*approachY,{kind,time,phase:effect.phase});
        } else if (age < duration) {
          drawCapture(ctx,effect,time,wispX,wispY,0,1,false);
        }
      }
      lastTime = previewTime;
      lastKind = kind;
      lastEncounter = encounter;
    }
    compareFrame = requestAnimationFrame(paint);
  }
  compareFrame = requestAnimationFrame(paint);
}

function renderGroup() {
  cancelAnimationFrame(compareFrame);
  flashPreview?.stop();
  flashPreview = null;
  sizesPreview?.stop();
  sizesPreview = null;
  lanternPreview?.stop();
  lanternPreview = null;
  const lantern = picker.value === 'lantern';
  const sizes=picker.value==='sizes';
  const flash = picker.value === 'flash';
  const comparison = picker.value === 'absorption';
  root.dataset.comparison = String(comparison);
  root.dataset.flash = String(flash);
  root.dataset.sizes = String(sizes);
  root.dataset.lantern = String(lantern);
  scale.hidden = flash||sizes||lantern;
  gallery.setAttribute('aria-label',comparison ? 'Compare absorption styles for your next flight' : 'Icon artwork');
  document.querySelector('h1').textContent = comparison ? 'Spark absorption' : sizes?'Spark strengths':flash ? 'Flare Powerup' : lantern ? 'Darkness Lantern' : 'Icon preview';
  document.querySelector('#comparison-controls').hidden = !comparison;
  styleNote.hidden = !comparison;
  const fragment = document.createDocumentFragment();
  if (comparison) createComparison(fragment);
  for (const {name, art: markup, detail, kind} of groups[picker.value]()) {
    const figure = document.createElement('figure'), art = document.createElement('div');
    const caption = document.createElement('figcaption');
    art.className = 'art';
    art.setAttribute('aria-hidden','true');
    art.innerHTML = markup;
    caption.textContent = name;
    if (kind === 'sight') {
      const link = document.createElement('a');
      link.href = '#flash';
      link.className = 'pickup-demo';
      link.setAttribute('aria-label','Watch the Flare Powerup in flight');
      link.append(...art.childNodes);
      art.append(link);
      art.removeAttribute('aria-hidden');
    } else if (kind) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pickup-demo absorb-demo';
      if (getPickupSpec(kind).plasma) button.dataset.plasma = '';
      button.setAttribute('aria-label','Replay ' + name + ' absorption');
      button.append(...art.childNodes);
      art.append(button);
      art.removeAttribute('aria-hidden');
      wirePickupDemo(button,kind);
    }
    if (detail) {
      const text = document.createElement('small');
      text.textContent = kind === 'sight' ? 'Watch in flight' : detail;
      caption.append(text);
      if (kind && kind !== 'sight') {
        const hint = document.createElement('small');
        hint.textContent = 'Tap to absorb';
        caption.append(hint);
      }
    }
    figure.append(art, caption);
    fragment.append(figure);
  }
  if (picker.value === 'siphon') fragment.append(createSiphonPreview());
  gallery.replaceChildren(fragment);
  gallery.dataset.group = picker.value;
  if (flash) openFlashPreview();
  if (sizes) openSizesPreview();
  if (lantern) openLanternPreview();
  if (location.hash.slice(1) !== picker.value) history.replaceState(null, '', '#' + picker.value);
}
async function openLanternPreview() {
  try {
    const {createLanternPreview} = await import('./lantern-preview.mjs?v=forge-1');
    if (picker.value !== 'lantern' || lanternPreview) return;
    lanternPreview = createLanternPreview({
      host: gallery,
      isPaused: () => root.dataset.previewPaused === 'true',
      play: () => { paused = false; syncMotion(); },
      reducedMotion
    });
  } catch (error) {
    if (picker.value === 'lantern') gallery.textContent = 'The encounter could not load. Reload to try again.';
    console.error(error);
  }
}
async function openSizesPreview(){
  try{
    const {createSparkSizesPreview}=await import('./spark-sizes-preview.mjs?v=forge-1');
    if(picker.value!=='sizes'||sizesPreview)return;
    sizesPreview=createSparkSizesPreview({isPaused:()=>root.dataset.previewPaused==='true',
      setPaused:value=>{paused=value;syncMotion();},reducedMotion:()=>reducedMotion});
    gallery.replaceChildren(sizesPreview.element);
  }catch(error){
    if(picker.value==='sizes')gallery.textContent='The size preview could not load. Reload to try again.';
    console.error(error);
  }
}
async function openFlashPreview() {
  try {
    const {createFlashPreview} = await import('./flash-preview.mjs?v=forge-1');
    if (picker.value !== 'flash' || flashPreview) return;
    flashPreview = createFlashPreview({
      isPaused: () => root.dataset.previewPaused === 'true',
      reducedMotion: () => reducedMotion,
      setPaused: value => { paused = value; syncMotion(); }
    });
    gallery.replaceChildren(flashPreview.element);
  } catch (error) {
    if (picker.value === 'flash') gallery.textContent = 'The preview could not load. Reload to try again.';
    console.error(error);
  }
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
preferences.addEventListener('change', event => { reducedMotion = event.matches; paused = reducedMotion; syncMotion(); });
document.addEventListener('visibilitychange', syncMotion);
syncMotion();
followGroupLink();
