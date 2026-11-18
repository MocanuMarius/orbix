import { WispFlight, circleHitsObstacle } from './flight.mjs?v=finish-1';
import { createRun, getRunModifiers } from './model.mjs?v=finish-1';
import { shutterDensityAt } from './shutter-cone.mjs?v=finish-1';
import { lanternPassageY, lanternRoute } from './lantern-layout.mjs?v=finish-1';
import { wispOrbit } from './wisp.mjs?v=finish-1';
import { stepFlashTether } from './flash-tether.mjs?v=finish-1';

const step = 1 / 60;

// This seed puts Hollow Sun at the first guardian. The rehearsal uses its
// actual chamber and keeps all flight and skill state local to this page.
export function createLanternPreview({host, isPaused, play, reducedMotion}) {
  const run = createRun(undefined, 1, 1);
  const node = run.map.flat().find(site => site.bossId === 'hollow-sun');
  const scene = document.createElement('section');
  scene.className = 'lantern-preview';
  scene.innerHTML = `
    <button type="button" class="lantern-frame" aria-label="Pause the fly-through"></button>
    <div class="lantern-controls">
      <label>Encounter
        <select aria-label="Lantern encounter">
          <option value="chain">Growing chain</option><option value="crossfire">Crossfire</option><option value="single">Single lantern</option>
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
          <button type="button" data-light="base" aria-pressed="true">Base</button>
          <button type="button" data-light="max" aria-pressed="false">Max</button>
          <button type="button" data-light="flash" aria-label="Flare Powerup with base Luminance" aria-pressed="false">△ Flare</button>
        </div>
      </div>
      <button type="button" data-flight>Fly passage</button>
    </div>
    <div class="lantern-playback">
      <button type="button" data-watch aria-label="Pause the fly-through">Ⅱ</button>
      <input type="range" min="0" max="1000" value="0" aria-label="Fly-through position">
      <output aria-label="Lanterns lit"></output>
    </div>
    <p role="status"></p>`;
  host.replaceChildren(scene);
  const frame = scene.querySelector('.lantern-frame');
  const status = scene.querySelector('[role=status]');
  const [encounterPicker, routePicker] = scene.querySelectorAll('select');
  const lightButtons = [...scene.querySelectorAll('[data-light]')];
  const flightButton = scene.querySelector('[data-flight]');
  const playback = scene.querySelector('.lantern-playback');
  const watchButton = playback.querySelector('button');
  const timeline = playback.querySelector('input');
  const litLabel = playback.querySelector('output');
  let lightMode = 'base', engine, shutters, route, state, raf, last = 0, remainder = 0;
  let watching, tourX, tourStart, tourEnd, waypoints, endHold;
  const directPage = Boolean(host.closest('.lantern-only'));

  function openLinkedView() {
    const hash = window.location.hash;
    if (hash === '#shadow') {
      encounterPicker.value = 'single'; routePicker.value = 'near'; lightMode = 'base';
    } else if (hash === '#chain' || hash === '') {
      encounterPicker.value = 'chain'; routePicker.value = 'wide'; lightMode = 'base';
    } else if (hash === '#crossfire') {
      encounterPicker.value = 'crossfire'; routePicker.value = 'wide'; lightMode = 'base';
    } else return;
    reset();
  }

  function updateShadowCount() {
    const x = engine.distance + engine.player.x;
    const count = shutters.filter(s => shutterDensityAt(s, x, engine.player.y, x, engine.layout.boss.speed) > .06).length;
    scene.dataset.beams = String(count);
    scene.dataset.inside = String(count > 0);
    const lit = shutters.filter(s => x >= s.openX).length;
    if (litLabel.value !== lit + ' / ' + shutters.length + ' lit') {
      litLabel.value = lit + ' / ' + shutters.length + ' lit';
    }
    return count;
  }

  function setTriangle(age) {
    const worldX = engine.distance + engine.player.x;
    const now = engine.time;
    engine.time = now - age;
    engine.collect({kind:'sight', x:worldX - 30, y:engine.player.y - 10, phase:0});
    engine.time = now;
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
      setTriangle(3);
    }
    scene.dataset.light = lightMode;
    engine.render();
  }

  function placeWisps(x, y) {
    engine.player.x = x;
    engine.player.y = engine.previousPlayerY = y;
    const home = wispOrbit(engine.player, engine.time);
    engine.wisp.x = engine.wisp.previousX = home.x;
    engine.wisp.y = engine.wisp.previousY = home.y;
  }

  function position(x, y) {
    engine.distance = engine.previousDistance = x - engine.player.x;
    engine.time = (engine.distance - engine.distanceOrigin) / engine.baseSpeed;
    placeWisps(engine.player.x, y);
  }

  function setWatching(value) {
    watching = value;
    watchButton.textContent = value ? 'Ⅱ' : '▶';
    watchButton.setAttribute('aria-label', value ? 'Pause fly-through' : 'Play fly-through');
    frame.setAttribute('aria-label', watchButton.getAttribute('aria-label'));
  }

  function showTour(x, dt = 0) {
    tourX = x;
    const next = waypoints.findIndex(point => point.x >= x);
    const a = waypoints[Math.max(0, next - 1)] || waypoints[0];
    const b = waypoints[next] || waypoints[waypoints.length - 1];
    const fraction = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x || 1)));
    const y = a.y + (b.y - a.y) * fraction * fraction * (3 - 2 * fraction);
    position(x, y);
    if (lightMode === 'flash') {
      if (dt === 0 || !engine.flashTether || engine.sightUntil - engine.time < 2.5) setTriangle(3);
      stepFlashTether(engine.flashTether, x, y, engine.time, dt);
    }
    timeline.value = String(Math.round(1000 * (x - tourStart) / (tourEnd - tourStart)));
    updateShadowCount();
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
    const group = encounterPicker.value;
    const isChain = group === 'chain';
    shutters = engine.layout.boss.shutters.filter(s => isChain ? s.phase === 3 : s.group === group);
    if (group === 'single') engine.layout.boss.shutters = shutters;
    route = lanternRoute(shutters, routePicker.value);
    let x = fly ? route.startX : route.focusX;
    let y = fly ? route.startY ?? route.y : route.y;
    if (group === 'single' && !fly) {
      const source = shutters[0];
      const ray = Math.atan2(source.shift,source.depth);
      const reach = routePicker.value === 'near' ? 68 : 94;
      x = source.x + Math.sin(ray) * reach;
      y = source.y - source.side * Math.cos(ray) * reach;
    }
    if (isChain && !fly) {
      // The camera follows the authored openings and pauses wherever the
      // timeline is released. Shutters read real world position and speed.
      const rooms = engine.layout.obstacles.filter(o => o.bossPhase === 3);
      waypoints = rooms.flatMap(room => [0,.4,.8,1.2,1.7,2].map(fraction => {
        const x = room.x + room.width * fraction;
        return {x, y:lanternPassageY(room, x)};
      }));
      const finish = lanternRoute(shutters.filter(s => s.group === 'crossfire'), routePicker.value);
      waypoints.push({x:finish.focusX, y:finish.y});
      waypoints.sort((a,b) => a.x - b.x);
      tourStart = Math.min(...shutters.map(s => s.openX)) - engine.baseSpeed * .35;
      tourEnd = finish.focusX + engine.baseSpeed * .45;
      x = tourStart;
      endHold = 0;
    }
    position(x, y);
    state = fly ? 'flying' : isChain ? 'watch' : 'inspect';
    scene.dataset.state = state;
    scene.dataset.encounter = group;
    engine.running = fly;
    const count = updateShadowCount();
    applyLight();
    playback.hidden = state !== 'watch';
    flightButton.textContent = fly ? isChain ? 'Watch lanterns' : 'Inspect passage' : 'Fly passage →';
    frame.setAttribute('aria-label', fly ? 'Lift' : 'Fly the passage');
    const location = count === 2 ? 'The two beams cross here.' : 'At the lantern’s beam.';
    status.textContent = fly ? 'Tap the scene to Lift.' : location + ' Switch light to compare, or tap to fly.';
    if (group === 'single' && !fly) {
      frame.setAttribute('aria-label','Move the wisp to steer its light wedge. Use touch or arrow keys.');
      status.textContent = 'Drag the wisp across the beam and watch the light behind it.';
    }
    if (state === 'watch') {
      setWatching(!reducedMotion);
      showTour(x);
      status.textContent = 'Watch each lantern open. Drag the timeline to inspect the chain.';
    }
    last = 0;
    remainder = 0;
  }

  function control() {
    if (state !== 'flying') {
      if (state === 'done') { reset(); return; }
      if (isPaused()) play();
      if (state === 'watch') { setWatching(!watching); return; }
      if (state === 'inspect' && encounterPicker.value === 'single') return;
      reset(true);
    } else if (isPaused()) {
      play();
    } else {
      engine.paused = false;
      engine.flap();
    }
  }
  function moveWisp(x, y) {
    const r = engine.player.radius;
    const screenX = Math.max(r,Math.min(engine.width-r,x));
    const screenY = Math.max(r,Math.min(engine.height-r,y));
    const worldX = engine.distance + screenX;
    if (engine.layout.obstacles.some(o => circleHitsObstacle(worldX,screenY,r,o,engine.time))) return;
    const dx = screenX - engine.player.x, dy = screenY - engine.player.y;
    placeWisps(screenX, screenY);
    if (engine.flashTether) {
      engine.flashTether.x += dx; engine.flashTether.px += dx; engine.flashTether.anchorX += dx;
      engine.flashTether.y += dy; engine.flashTether.py += dy; engine.flashTether.anchorY += dy;
    }
    updateShadowCount();
    engine.render();
  }
  let drag;
  frame.addEventListener('pointerdown', event => {
    if (state !== 'inspect' || encounterPicker.value !== 'single') return;
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY, wispX:engine.player.x, wispY:engine.player.y};
    frame.setPointerCapture(event.pointerId);
  });
  frame.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const rect = frame.getBoundingClientRect();
    moveWisp(drag.wispX + (event.clientX-drag.x)*engine.width/rect.width,
      drag.wispY + (event.clientY-drag.y)*engine.height/rect.height);
  });
  frame.addEventListener('lostpointercapture', () => { drag = null; });
  frame.addEventListener('click', control);
  frame.addEventListener('keydown', event => {
    if (state === 'inspect' && encounterPicker.value === 'single' && event.key.startsWith('Arrow')) {
      event.preventDefault();
      moveWisp(engine.player.x + 8*((event.key==='ArrowRight')-(event.key==='ArrowLeft')),
        engine.player.y + 8*((event.key==='ArrowDown')-(event.key==='ArrowUp')));
      return;
    }
    if (event.repeat && (event.key === ' ' || event.key === 'Enter')) event.preventDefault();
  });
  for (const picker of [encounterPicker, routePicker]) picker.addEventListener('change', () => reset());
  for (const button of lightButtons) button.addEventListener('click', () => {
    lightMode = button.dataset.light;
    if (state === 'inspect' || state === 'watch') applyLight();
    else reset();
  });
  flightButton.addEventListener('click', () => {
    if (state === 'inspect' || state === 'watch') {
      if (isPaused()) play();
      reset(true);
    } else reset();
  });
  watchButton.addEventListener('click', control);
  timeline.addEventListener('input', () => {
    setWatching(false);
    endHold = 0;
    showTour(tourStart + (tourEnd - tourStart) * Number(timeline.value) / 1000);
  });

  function tick(now) {
    const dt = last ? Math.min((now-last)/1000,.08) : 0;
    last = now;
    if (state === 'watch' && watching && !isPaused()) {
      if (tourX < tourEnd) showTour(Math.min(tourEnd, tourX + engine.baseSpeed * dt), dt);
      else if ((endHold += dt) >= 1.1) { endHold = 0; showTour(tourStart); }
    }
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
        status.textContent = count > 1 ? 'Overlapping beams. Tap to Lift.' : count === 1 ? 'Inside one beam. Tap to Lift.' : 'Clear air. Tap to Lift.';
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
  if (directPage) window.addEventListener('hashchange', openLinkedView);
  if (directPage && ['#shadow','#chain','#crossfire',''].includes(window.location.hash)) openLinkedView();
  else reset();
  raf = requestAnimationFrame(tick);
  return {stop() {
    if (directPage) window.removeEventListener('hashchange', openLinkedView);
    cancelAnimationFrame(raf);
    engine.destroy();
  }};
}
