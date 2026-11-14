import { WispFlight } from './flight.mjs?v=giant-detail-1';
import { createRun, getRunModifiers } from './model.mjs?v=giant-detail-1';
import { insideShutter, shutterPhase } from './shutter-cone.mjs?v=giant-detail-1';
import { wispOrbit } from './wisp.mjs?v=giant-detail-1';

// Seed 1 puts Hollow Sun at the first expedition's guardian. This in-memory
// run never loads or saves campaign state.
export function createLanternPreview({host, isPaused, play, reducedMotion}) {
  const run = createRun(undefined, 1, 1);
  const node = run.map.flat().find(site => site.bossId === 'hollow-sun');
  const scene = document.createElement('section');
  scene.className = 'lantern-preview';
  scene.innerHTML = `
    <button type="button" class="lantern-frame" aria-label="Start flight, then tap or press Space to Lift"></button>
    <div class="lantern-controls">
      <label>Hollow Sun
        <select aria-label="Guardian phase">
          <option value="2">Phase 2 · Roof</option><option value="3">Phase 3 · Floor</option>
        </select>
      </label>
      <div class="lantern-routes" role="group" aria-label="Starting route">
        <button type="button" data-route="near" aria-pressed="true">Near the wall</button>
        <button type="button" data-route="wide" aria-pressed="false">Wide arc</button>
      </div>
      <button type="button" data-retry>Retry</button>
    </div>
    <p role="status"></p>`;
  host.replaceChildren(scene);
  const frame = scene.querySelector('.lantern-frame');
  const status = scene.querySelector('[role=status]');
  const phasePicker = scene.querySelector('select');
  const routeButtons = [...scene.querySelectorAll('[data-route]')];
  const retry = scene.querySelector('[data-retry]');
  let route = 'near', engine, shutter, endX, state, raf, last = 0, remainder = 0;

  function reset() {
    engine?.destroy();
    const canvas = document.createElement('canvas');
    frame.replaceChildren(canvas);
    engine = new WispFlight({canvas, node, terrain:node.terrain, elite:node.elite,
      seed:run.seed+'-'+node.id, duration:node.duration, companions:run.companions,
      skills:run.skills, flame:run.flame, modifiers:getRunModifiers({...run,current:node}), reducedMotion});
    engine.setMuted(true);
    shutter = engine.layout.boss.shutters.find(s => s.phase === Number(phasePicker.value));
    const across = route === 'near' ? .19 : .60;
    const startX = shutter.x + (shutter.shift-shutter.spread)*across - 60;
    engine.distance = engine.previousDistance = startX-engine.player.x;
    engine.time = (engine.distance-engine.distanceOrigin)/engine.baseSpeed;
    engine.player.y = engine.previousPlayerY = shutter.y-shutter.side*shutter.depth*across;
    const home = wispOrbit(engine.player,engine.time);
    engine.wisp.x = engine.wisp.previousX = home.x;
    engine.wisp.y = engine.wisp.previousY = home.y;
    endX = shutter.x + shutter.shift+shutter.spread + 20;
    engine.render();
    state = 'ready';
    scene.dataset.state = state;
    scene.dataset.inside = 'false';
    frame.setAttribute('aria-label','Start flight, then tap or press Space to Lift');
    status.textContent = (route === 'near' ? 'A short blackout, close to the rock.' : 'More clearance, longer in darkness.') + ' Tap the scene to fly. Tap again to Lift.';
    for (const button of routeButtons) button.setAttribute('aria-pressed', String(button.dataset.route === route));
    last = 0; remainder = 0;
  }

  function control() {
    if (state === 'done') { reset(); return; }
    if (isPaused()) play();
    if (state === 'ready') {
      state = 'flying'; scene.dataset.state = state;
      // This short, restartable window uses the same fixed step and collisions as flight.
      engine.running = true;
      engine.paused = false;
      status.textContent = 'Tap to Lift. Inside the shadow, only a small pocket around you stays lit.';
      frame.setAttribute('aria-label','Lift');
    } else {
      engine.paused = false;
      engine.flap();
    }
  }
  frame.addEventListener('click', control);
  frame.addEventListener('keydown', event => {
    if (event.repeat && (event.key === ' ' || event.key === 'Enter')) event.preventDefault();
  });
  phasePicker.addEventListener('change', reset);
  for (const button of routeButtons) button.addEventListener('click', () => { route = button.dataset.route; reset(); });
  retry.addEventListener('click', reset);

  function tick(now) {
    const dt = last ? Math.min((now-last)/1000,.08) : 0;
    last = now;
    if (state === 'flying' && !isPaused()) {
      engine.paused = false;
      remainder += dt;
      while (remainder >= 1/60 && !engine.finished) {
        engine.step(1/60); remainder -= 1/60;
      }
      engine.accumulator = remainder;
      engine.render();
      const x = engine.distance+engine.player.x;
      const shadow = shutterPhase(shutter,x) === 2 && insideShutter(shutter,x,engine.player.y);
      scene.dataset.inside = String(shadow);
      if (engine.finished || (!engine.dying && x>=endX)) {
        state = 'done'; scene.dataset.state = state; engine.running = false;
        status.textContent = engine.finished ? 'Hit the rock. Tap to reset or try the other route.' : 'Lantern cleared. Tap to reset or try the other route.';
        frame.setAttribute('aria-label','Reset flight');
      }
    }
    raf = requestAnimationFrame(tick);
  }
  reset();
  raf = requestAnimationFrame(tick);
  return {stop() { cancelAnimationFrame(raf); engine.destroy(); }};
}
