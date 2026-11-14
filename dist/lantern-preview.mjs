import { WispFlight } from './flight.mjs?v=chapter-pressure-1';
import { createRun, getRunModifiers } from './model.mjs?v=chapter-pressure-1';
import { insideShutter, shutterPhase } from './shutter-cone.mjs?v=chapter-pressure-1';
import { lanternRoute } from './lantern-layout.mjs?v=chapter-pressure-1';
import { wispOrbit } from './wisp.mjs?v=chapter-pressure-1';

const step = 1 / 60;

// This seed puts Hollow Sun at the first guardian. The rehearsal uses its
// actual chamber and keeps all flight and skill state local to this page.
export function createLanternPreview({host, isPaused, play, reducedMotion}) {
  const run = createRun(undefined, 1, 1);
  const node = run.map.flat().find(site => site.bossId === 'hollow-sun');
  const scene = document.createElement('section');
  scene.className = 'lantern-preview';
  scene.innerHTML = `
    <button type="button" class="lantern-frame" aria-label="Fly the passage"></button>
    <div class="lantern-controls">
      <label>Encounter
        <select aria-label="Lantern encounter">
          <option value="3">Crossfire</option><option value="2">Single lantern</option>
        </select>
      </label>
      <label>Route
        <select aria-label="Starting route">
          <option value="wide">Wide arc</option><option value="near">Near the wall</option>
        </select>
      </label>
      <div class="lantern-light" role="group" aria-label="Compare Luminance">
        <span>Luminance</span>
        <div>
          <button type="button" data-light="base" aria-pressed="false">Base</button>
          <button type="button" data-light="max" aria-pressed="false">Max</button>
          <button type="button" data-light="flash" aria-label="Flash Powerup with base Luminance" aria-pressed="true">△ Flash</button>
        </div>
      </div>
      <button type="button" data-flight>Fly passage →</button>
    </div>
    <p role="status"></p>`;
  host.replaceChildren(scene);
  const frame = scene.querySelector('.lantern-frame');
  const status = scene.querySelector('[role=status]');
  const [encounterPicker, routePicker] = scene.querySelectorAll('select');
  const lightButtons = [...scene.querySelectorAll('[data-light]')];
  const flightButton = scene.querySelector('[data-flight]');
  let lightMode = 'flash', engine, shutters, route, state, raf, last = 0, remainder = 0;

  function updateShadowCount() {
    const x = engine.distance + engine.player.x;
    const count = shutters.filter(s => shutterPhase(s, x) === 2 && insideShutter(s, x, engine.player.y)).length;
    scene.dataset.beams = String(count);
    scene.dataset.inside = String(count > 0);
    return count;
  }

  function applyLight() {
    const skills = lightMode === 'max'
      ? {...run.skills, 'main-sight':1, 'main-horizon':1}
      : run.skills;
    const mods = getRunModifiers({...run, skills, current:node});
    engine.applySkillUpgrade(mods, 0);
    for (const button of lightButtons) button.setAttribute('aria-pressed', String(button.dataset.light === lightMode));
    // Compare a settled, still-burning triangle using its actual pickup path.
    // Its first whole-scene flash has already passed at this moment.
    engine.flashTether = null;
    engine.sightUntil = 0;
    engine.pickupRevealStartedAt = -Infinity;
    engine.pickupRevealHoldUntil = -Infinity;
    if (lightMode === 'flash') {
      const worldX = engine.distance + engine.player.x;
      const now = engine.time;
      engine.time = now - 3;
      engine.collect({kind:'sight', x:worldX - 30, y:engine.player.y - 10, phase:0});
      engine.time = now;
    }
    scene.dataset.light = lightMode;
    engine.render();
  }

  function reset(fly = false) {
    engine?.destroy();
    const canvas = document.createElement('canvas');
    frame.replaceChildren(canvas);
    engine = new WispFlight({canvas, node, terrain:node.terrain, elite:node.elite,
      seed:run.seed+'-'+node.id, duration:node.duration, companions:run.companions,
      skills:run.skills, flame:run.flame, modifiers:getRunModifiers({...run,current:node}), reducedMotion});
    engine.setMuted(true);
    shutters = engine.layout.boss.shutters.filter(s => s.phase === Number(encounterPicker.value));
    route = lanternRoute(shutters, routePicker.value);
    const x = fly ? route.startX : route.focusX;
    engine.distance = engine.previousDistance = x - engine.player.x;
    engine.time = (engine.distance - engine.distanceOrigin) / engine.baseSpeed;
    engine.player.y = engine.previousPlayerY = route.y;
    const home = wispOrbit(engine.player, engine.time);
    engine.wisp.x = engine.wisp.previousX = home.x;
    engine.wisp.y = engine.wisp.previousY = home.y;
    state = fly ? 'flying' : 'inspect';
    scene.dataset.state = state;
    engine.running = fly;
    const count = updateShadowCount();
    applyLight();
    flightButton.textContent = fly ? 'Inspect passage' : 'Fly passage →';
    frame.setAttribute('aria-label', fly ? 'Lift' : 'Fly the passage');
    const location = count === 2 ? 'The two beams cross here.' : 'At the lantern’s beam.';
    status.textContent = fly ? 'Tap the scene to Lift.' : location + ' Switch light to compare, or tap to fly.';
    last = 0;
    remainder = 0;
  }

  function control() {
    if (state !== 'flying') {
      if (state === 'done') { reset(); return; }
      if (isPaused()) play();
      reset(true);
    } else if (isPaused()) {
      play();
    } else {
      engine.paused = false;
      engine.flap();
    }
  }
  frame.addEventListener('click', control);
  frame.addEventListener('keydown', event => {
    if (event.repeat && (event.key === ' ' || event.key === 'Enter')) event.preventDefault();
  });
  for (const picker of [encounterPicker, routePicker]) picker.addEventListener('change', () => reset());
  for (const button of lightButtons) button.addEventListener('click', () => {
    lightMode = button.dataset.light;
    if (state === 'inspect') applyLight();
    else reset();
  });
  flightButton.addEventListener('click', () => {
    if (state === 'inspect') control();
    else reset();
  });

  function tick(now) {
    const dt = last ? Math.min((now-last)/1000,.08) : 0;
    last = now;
    if (state === 'flying' && !isPaused()) {
      engine.paused = false;
      remainder += dt;
      while (remainder >= step && !engine.finished) {
        engine.step(step);
        remainder -= step;
      }
      engine.accumulator = remainder;
      engine.render();
      const previous = scene.dataset.beams;
      const count = updateShadowCount();
      if (String(count) !== previous) {
        status.textContent = count === 2 ? 'Inside both beams. Tap to Lift.' : count === 1 ? 'Inside one beam. Tap to Lift.' : 'Clear air. Tap to Lift.';
      }
      const x = engine.distance + engine.player.x;
      if (engine.finished || (!engine.dying && x >= route.endX)) {
        state = 'done';
        scene.dataset.state = state;
        engine.running = false;
        status.textContent = engine.finished ? 'Hit the rock. Tap to inspect the passage again.' : 'Passage cleared. Tap to inspect it again.';
        frame.setAttribute('aria-label', 'Inspect passage');
      }
    }
    raf = requestAnimationFrame(tick);
  }
  reset();
  raf = requestAnimationFrame(tick);
  return {stop() { cancelAnimationFrame(raf); engine.destroy(); }};
}
