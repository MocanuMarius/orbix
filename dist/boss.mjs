// The Hollow Warden is a survival encounter: read its hands, keep your Glow,
// and reach the waylight. Every solid hand uses the ordinary terrain pipeline.
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const PHASES = Object.freeze([
  Object.freeze({ id: 'awakening', name: 'STONE AWAKENS', instruction: 'Climb the stone fingers; recover between hands.',
    cells: [[.51, 270, 'floor', 0], [.55, 198, 'floor', 0], [.49, 190, 'both', 0], [.47, 292, 'floor', 0]] }),
  Object.freeze({ id: 'grasp', name: 'THE SWEEPING GRASP', instruction: 'The paired hands sway together. Follow the opening.',
    cells: [[.47, 282, 'floor', 0], [.46, 178, 'both', 12], [.52, 170, 'both', 12], [.53, 290, 'floor', 0]] }),
  Object.freeze({ id: 'vigil', name: 'THE LAST VIGIL', instruction: 'Read the upper hand, then the lower hand. The waylight lies beyond.',
    cells: [[.51, 286, 'floor', 0], [.55, 168, 'roof', 9], [.49, 156, 'floor', 9], [.46, 148, 'both', 9], [.48, 294, 'floor', 0]] }),
]);
const MOON_PHASES = Object.freeze([
  {id:'shuttle',name:'THE SILVER SHUTTLE',instruction:'Low crescent, high crescent. Read the next side before you turn.',
    cells:[[.28,196,'floor',0],[.72,196,'roof',0],[.50,330,'both',0],[.28,206,'floor',0],[.72,206,'roof',0],[.50,330,'both',0]]},
  {id:'tide',name:'THE TIDAL LOOM',instruction:'The whole opening drifts. Wait for its rise, then follow its centre.',
    cells:[[.50,320,'both',0],[.44,226,'both',22],[.54,226,'both',22],[.50,326,'both',0]]},
  {id:'unravel',name:'THE UNRAVELLING',instruction:'Alternate above and below the crescents. Rest in the wide silver rooms.',
    cells:[[.31,192,'floor',9],[.69,192,'roof',9],[.50,238,'both',14],[.50,336,'both',0]]},
]);
export const BOSS_PREVIEWS=Object.freeze({
  'hollow-warden':Object.freeze({id:'hollow-warden',name:'Hollow Warden',instruction:'Stone hands and swaying passages.',icon:'boss'}),
  moonweaver:Object.freeze({id:'moonweaver',name:'Moonweaver',instruction:'Alternating crescents and a drifting silver loom.',icon:'boss'})
});
export const getBossPreview=id=>BOSS_PREVIEWS[id]||BOSS_PREVIEWS['hollow-warden'];

function randomFor(seed) {
  let n = 2166136261;
  for (const char of String(seed)) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return () => { n += 0x6d2b79f5; let value = n;
    value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296; };
}

function handShape(width, scale, side, variant, gentle) {
  // The first two vertices close underground; the exposed boundary is sorted
  // right-to-left, just like the normal landform renderer and draft sampler.
  const xs = [-.8, -.5, -.22, .05, .22, .36, .50, .65, .80, .96, 1.12, 1.34, 1.65, 2.04, 2.45];
  const depths = gentle ? [186, 145, 102, 67, 43, 28, 20, 20, 20, 28, 42, 65, 105, 151, 190]
    : variant % 2 ? [190, 147, 99, 56, 24, 4, 18, 0, 17, 3, 24, 45, 90, 146, 190]
      : [190, 145, 97, 55, 26, 5, 0, 18, 2, 15, 4, 38, 88, 145, 190];
  const surface = [];
  for (let i = 0; i < xs.length - 1; i++) for (let sample = 0; sample < 4; sample++) {
    const t = sample / 4, eased = t * t * (3 - 2 * t);
    surface.push([lerp(xs[i], xs[i + 1], t) * width, side * lerp(depths[i], depths[i + 1], eased) * scale]);
  }
  surface.push([xs.at(-1) * width, side * depths.at(-1) * scale]);
  return [[-.8 * width, side * 900 * scale], [2.45 * width, side * 900 * scale], ...surface.reverse()];
}

function crescentShape(width,scale,side,variant,gentle){
  // One broad crescent ridge rather than the Warden's toothed fingers. Its
  // concave shoulders provide a readable lead-in to each alternating lane.
  const xs=[-.8,-.45,-.1,.2,.44,.64,.85,1.1,1.45,1.85,2.45];
  const depths=gentle?[190,150,95,54,34,26,34,55,94,148,190]:[190,154,108,52,14,0,16,54,106,155,190];
  const surface=[];
  for(let i=0;i<xs.length-1;i++)for(let step=0;step<4;step++){
    const t=step/4,e=t*t*(3-2*t);surface.push([lerp(xs[i],xs[i+1],t)*width,side*lerp(depths[i],depths[i+1],e)*scale]);
  }
  surface.push([2.45*width,side*190*scale]);
  return [[-.8*width,side*900*scale],[2.45*width,side*900*scale],...surface.reverse()];
}

function edgeAt(shape, x) {
  for (let i = 3; i < shape.length; i++) {
    const a = shape[i - 1], b = shape[i];
    if (x >= b[0] && x <= a[0]) return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0] || 1));
  }
  return 0;
}

export function getBossTuning(difficulty=1){
  // First encounters teach the hand patterns; the original trial returns by Ascension 4.
  const easing=clamp(1-(Math.max(1,Number(difficulty)||1)-1)/3,0,1);
  return {gapMultiplier:1+.15*easing,spacingMultiplier:1+.08*easing,motionMultiplier:1-.15*easing,warningDistance:360*(1+.2*easing)};
}

export function buildBossLayout({ seed = 1, height = 620, speed = 154, duration = 165,
  gapScale = .88, difficulty = 1, elite = false, levelIdentity = null,
  circleHitsPolygon = null, bossId='hollow-warden' } = {}) {
  const moon=bossId==='moonweaver',identity=getBossPreview(bossId),definitions=moon?MOON_PHASES:PHASES;
  const prefix=moon?'moonweaver':'warden';
  const rng = randomFor(`${seed}:${identity.id}`), scale = height / 620, tuning=getBossTuning(difficulty);
  const totalDistance = duration * speed, end = totalDistance + 98 - speed * 3.2;
  const start = Math.min(650, end * .24), phaseSpan = Math.max(1, end - start) / 3;
  const obstacles = [], embers = [], sections = [], phases = [];
  let previous = height * .5, index = 0, nextFuel = 0;
  for (let phase = 0; phase < 3; phase++) {
    const definition = definitions[phase], first = start + phase * phaseSpan, limit = start + (phase + 1) * phaseSpan;
    const spacing = (moon?phase===1?418:464:phase === 2 ? 344 : 352)*tuning.spacingMultiplier;
    const count = Math.max(1, Math.floor((limit - first - 355) / spacing) + 1);
    const phaseCells = [];
    for (let cell = 0; cell < count; cell++) {
      const patternIndex = cell % definition.cells.length;
      const [flow, opening, occupancy, motion] = definition.cells[patternIndex];
      const gentle = opening >= 260 || phase === 0 && cell === 0;
      const center = clamp(height * flow, previous - height * (moon?.44:.06), previous + height * (moon?.44:.06));
      const gap = gentle ? opening * scale : Math.max(elite ? 104 : 120, opening * scale * gapScale)*tuning.gapMultiplier;
      const width = phase === 2 ? 135 : 142;
      const x = first + cell * spacing;
      if (x + width * 2.45 > end) break;
      const sectionId = `${prefix}:${phase}:${cell}`;
      const obstacle = { id: index, x, width, center, gap, motion: motion * scale * tuning.motionMultiplier,
        phase: phase === 1 ? .6 : phase === 2 ? 2.2 : 0,
        pattern: `${prefix}-${definition.id}`, bossPart: moon?gentle?'silver-rest':occupancy==='both'?'tidal-loom':'crescent':gentle ? 'resting-palm' : occupancy === 'both' ? 'paired-hands' : 'stone-fingers',
        bossPhase: phase + 1, soft: false, destroyed: false, hit: false, passed: false,
        variation: cell % 4, sectionId, hard: !gentle, setpiece: `${prefix}-${definition.id}`,
        landmark: identity.id, levelId: levelIdentity?.id || 'storm-ridge', leg: phase,
        cacheEligible: gentle, windShelter: gentle ? 1 : .32,
        shelterStart: x - width * .15, shelterEnd: x + width * 1.5,
        topShape: occupancy !== 'floor' ? (moon?crescentShape:handShape)(width, scale, -1, cell + phase, gentle) : null,
        bottomShape: occupancy !== 'roof' ? (moon?crescentShape:handShape)(width, scale, 1, cell + phase + 1, gentle) : null,
        sceneProps: [] };
      obstacles.push(obstacle); phaseCells.push(obstacle);
      sections.push({ id: sectionId, name: definition.name, start: x - width * .8,
        end: x + width * 2.45, kind: gentle ? cell === 0 ? 'intro' : 'breather' : 'challenge',
        difficulty: gentle ? 0 : phase + 1, hard: !gentle, setpiece: obstacle.setpiece,
        landmark: identity.id, warningStart: x - tuning.warningDistance, windShelter: obstacle.windShelter, leg: phase });
      previous = center; index++;
    }
    phases.push({ id: definition.id, name: definition.name, instruction: definition.instruction,
      start: first, end: limit, index: phase + 1, cells: phaseCells.length });
  }
  // Curated fuel sites persist across all three phases. Hand-edge collection
  // uses the real solid contour and its complete sway envelope, not free fuel.
  for (const phase of phases) {
    const cells = obstacles.filter(obstacle => obstacle.bossPhase === phase.index && (moon||obstacle.bottomShape));
    const candidates = cells.filter((obstacle, i) => i % 2 === 0 || obstacle.cacheEligible);
    let fuelOrder = 0;
    for (const obstacle of candidates) {
      const localX = obstacle.width * .51, x = obstacle.x + localX;
      if (x < nextFuel) continue;
      const side=obstacle.bottomShape?1:-1,shape=side===1?obstacle.bottomShape:obstacle.topShape;
      const edge = edgeAt(shape, localX);
      const y = moon?obstacle.center:obstacle.center + obstacle.gap / 2 + edge - (29 * scale + Math.abs(obstacle.motion));
      if (y < 36 || y > height - 36) continue;
      const clear = !circleHitsPolygon || obstacles.every(other => {
        if (x < other.x - other.width * .8 - 19 || x > other.x + other.width * 2.45 + 19) return true;
        for (const shape of [other.topShape, other.bottomShape]) {
          if (!shape) continue;
          const side = shape === other.topShape ? -1 : 1;
          for (const sway of [-1, 1]) {
            const cy = other.center + sway * Math.abs(other.motion) + side * other.gap / 2;
            const polygon = shape.map(([px, py]) => [other.x + px, cy + py]);
            if (circleHitsPolygon(x, y, 18, polygon)) return false;
          }
        }
        return true;
      });
      if (!clear) continue;
      const rich = fuelOrder % 5 === 2;
      embers.push({ id: `${prefix}-cache:${obstacle.id}`, kind: 'light', x, y, value: rich ? 3 : 1,
        fuel: true, feature: moon?'silver-thread':'warden-offering', anchor: obstacle.id, pocket: !moon,
        pocketSide: moon?null:'ground', clearance: 29 * scale, collected: false, attracted: false,
        phase: rng() * TAU, bossPhase: phase.index, intro: embers.length === 0 });
      if(!moon)obstacle.cachePocket = { localX, side: 1, rich, first: embers.length === 1 };
      fuelOrder++; nextFuel = x + speed * 3.8;
    }
  }
  return { obstacles, embers, sections, sceneProps: [], levelIdentity,
    boss: { id: identity.id, name: identity.name, difficulty, phases, tuning,
      introEnd: start, end, exitStart: totalDistance - speed * 3.2 },
    legs: phases.map(phase => ({ index: phase.index - 1, start: phase.start, end: phase.end })),
    hardWindows: sections.filter(section => section.hard).length, lengthScale: 3 };
}

export function getBossState(engine) {
  const boss = engine.layout?.boss;
  if (!boss) return null;
  const worldX = engine.distance + engine.player.x;
  const phase = boss.phases.find(item => worldX < item.end) || boss.phases.at(-1);
  const upcoming = engine.layout.obstacles.find(obstacle => (obstacle.motion > 0||boss.id==='moonweaver'&&obstacle.hard)
    && obstacle.x + obstacle.width * .8 > worldX && obstacle.x - worldX < (boss.tuning?.warningDistance||360));
  const direction = upcoming && Math.cos(engine.time * .9 + upcoming.phase) < 0 ? 'rising' : 'falling';
  return { id: boss.id, name: boss.name, phase: phase.index, phaseName: phase.name,
    progress: clamp((worldX - phase.start) / Math.max(1, phase.end - phase.start), 0, 1),
    warning: upcoming ? boss.id==='moonweaver'?(upcoming.motion>0?`Silver opening ${direction} · follow the loom`
      :upcoming.topShape&&!upcoming.bottomShape?'Upper crescent · pass below':'Lower crescent · pass above'):`Sweeping hands ${direction} · follow the gap`
      : worldX >= boss.exitStart ? `${boss.name} yields · reach the waylight`
        : worldX < phase.start + 260 ? phase.instruction : '' };
}

function poly(c, points, fill) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath(); c.fillStyle = fill; c.fill();
}
function stroke(c, x0, y0, x1, y1, ink, size = 1) {
  c.strokeStyle = ink; c.lineWidth = size; c.beginPath(); c.moveTo(Math.round(x0), Math.round(y0));
  c.lineTo(Math.round(x1), Math.round(y1)); c.stroke();
}

function drawMoonweaver(c,{engine,width,height,distance,time,scale,pass}){
  c.save();
  if(pass!=='hands'){
    const x=Math.round(width*.76),y=Math.round(height*.24),r=v=>Math.round(v*scale);
    const breathe=engine.reducedMotion?0:Math.round(Math.sin(time*.48)*3*scale);
    c.globalAlpha=.65;
    // A veiled lunar moth/loom, with a broken ring and silver wings. Everything
    // here is background; the crescent colliders below are the only hazards.
    for(const side of [-1,1]){
      poly(c,[[x+side*r(8),y-r(18)],[x+side*r(47),y-r(52)+breathe],
        [x+side*r(74),y-r(13)],[x+side*r(49),y+r(35)-breathe],
        [x+side*r(14),y+r(18)]],'#46415c');
      poly(c,[[x+side*r(14),y-r(13)],[x+side*r(45),y-r(35)+breathe],
        [x+side*r(54),y-r(10)],[x+side*r(34),y+r(16)]],'#79728b');
      for(let strand=0;strand<4;strand++)stroke(c,x+side*r(12),y+r(strand*5-9),x+side*r(45+strand*5),y+r(strand*8-28),'#bbb5be',Math.max(1,scale));
    }
    poly(c,[[x-r(10),y-r(29)],[x+r(9),y-r(29)],[x+r(14),y+r(11)],
      [x,y+r(45)],[x-r(14),y+r(11)]],'#a8a2b5');
    c.fillStyle='#28253d';c.fillRect(x-r(6),y-r(11),r(12),r(16));
    c.fillStyle='#e2d9e9';c.fillRect(x-r(4),y-r(7),r(8),Math.max(1,r(2)));
    c.strokeStyle='#9e96b2';c.lineWidth=Math.max(1,2*scale);c.beginPath();
    c.arc(x,y-r(3),r(62),Math.PI*1.1,Math.PI*1.9);c.stroke();
  }
  if(pass!=='silhouette')for(const o of engine.layout.obstacles){
    if(o.destroyed||o.exitFoundation||o.x+o.width*2.5<distance||o.x-o.width>distance+width/scale)continue;
    const centre=o.center+Math.sin(time*.9+o.phase)*o.motion;
    for(const [side,shape]of[[-1,o.topShape],[1,o.bottomShape]]){
      if(!shape)continue;c.save();c.globalAlpha=.86;
      poly(c,shape.map(([x,y])=>[(o.x-distance+x)*scale,(centre+side*o.gap/2+y)*scale]),'#494555');c.clip();
      for(let line=0;line<3;line++){
        c.beginPath();c.strokeStyle=['#d2c6d5','#8e839d','#645c77'][line];c.lineWidth=Math.max(1,scale);
        shape.slice(2).forEach(([x,y],i)=>{const xx=(o.x-distance+x)*scale,yy=(centre+side*o.gap/2+y+side*(2+line*9))*scale;
          if(i)c.lineTo(xx,yy);else c.moveTo(xx,yy);});c.stroke();
      }
      for(let stitch=0;stitch<5;stitch++){
        const local=o.width*(.23+stitch*.2),edge=edgeAt(shape,local),xx=(o.x-distance+local)*scale,yy=(centre+side*o.gap/2+edge)*scale;
        stroke(c,xx-5*scale,yy+side*13*scale,xx+6*scale,yy+side*26*scale,'#ada0b9',Math.max(1,scale));
      }
      c.restore();
    }
  }
  c.restore();
}

export function drawBoss(c, { engine, width = 390, height = 620,
  distance = engine?.distance || 0, time = engine?.time || 0, scale = 1, pass = 'all' } = {}) {
  if (!engine?.layout?.boss) return;
  if(engine.layout.boss.id==='moonweaver')return drawMoonweaver(c,{engine,width,height,distance,time,scale,pass});
  const state = getBossState(engine), W = width, H = height;
  c.save();
  if (pass !== 'hands') {
    // The guardian's weathered mask looms in the upper background. Its actual
    // hands below are separately rendered from their collision polygons.
    const x = Math.round(W * .77), y = Math.round(H * .205);
    const unit = Math.max(1, Math.round(2 * scale)), r = v => Math.round(v * scale);
    const sway = engine.reducedMotion ? 0 : Math.round(Math.sin(time * .34) * 2 * scale);
    c.translate(sway, 0); c.globalAlpha = .76;
    poly(c, [[x-r(45),y+r(80)],[x-r(38),y-r(2)],[x-r(24),y-r(30)],
      [x-r(30),y-r(56)],[x-r(17),y-r(45)],[x-r(11),y-r(69)],[x-r(2),y-r(42)],
      [x+r(12),y-r(61)],[x+r(20),y-r(35)],[x+r(35),y-r(45)],[x+r(28),y-r(15)],
      [x+r(41),y+r(12)],[x+r(48),y+r(87)]], '#202e2b');
    poly(c, [[x-r(26),y-r(18)],[x-r(12),y-r(35)],[x+r(16),y-r(28)],
      [x+r(30),y-r(6)],[x+r(23),y+r(28)],[x+r(5),y+r(43)],[x-r(18),y+r(31)]], '#4c584a');
    poly(c, [[x-r(12),y-r(28)],[x+r(4),y-r(31)],[x+r(4),y+r(33)],
      [x-r(13),y+r(23)],[x-r(22),y-r(2)]], '#616a55');
    c.fillStyle = '#192721';
    c.fillRect(x-r(21), y-r(3), r(16), r(7)); c.fillRect(x+r(9), y-r(1), r(15), r(6));
    c.fillRect(x-r(4), y+r(17), r(10), r(17));
    c.fillStyle = '#8f9577'; c.fillRect(x-r(18), y-r(2), r(9), unit);
    c.fillRect(x+r(11), y, r(state.phase === 3 ? 10 : 6), unit);
    stroke(c,x-r(2),y-r(25),x-r(8),y-r(10),'#2b3930',unit);
    stroke(c,x-r(8),y-r(10),x-r(2),y+r(3),'#2b3930',unit);
    stroke(c,x+r(20),y+r(9),x+r(15),y+r(26),'#788064',unit);
    for (let rib=0;rib<5;rib++) {
      const yy=y+r(44+rib*9);
      stroke(c,x-r(33+rib),yy,x-r(6),yy-r(7),'#384b3d',unit);
      stroke(c,x+r(10),yy-r(6),x+r(36+rib),yy+r(3),'#35473b',unit);
    }
    c.translate(-sway, 0);
  }
  if (pass !== 'silhouette') for (const obstacle of engine.layout.obstacles) {
    if (obstacle.destroyed || obstacle.exitFoundation || obstacle.x + obstacle.width * 2.5 < distance
      || obstacle.x - obstacle.width > distance + W / scale) continue;
    const center = obstacle.center + Math.sin(time * .9 + obstacle.phase) * obstacle.motion;
    for (const [side, shape] of [[-1, obstacle.topShape], [1, obstacle.bottomShape]]) {
      if (!shape) continue;
      c.save(); c.globalAlpha = .8;
      const points = shape.map(([x,y])=>[(obstacle.x-distance+x)*scale,(center+side*obstacle.gap/2+y)*scale]);
      poly(c,points,'#3c493b'); c.clip();
      for (let finger=0;finger<4;finger++) {
        const localX=obstacle.width*(.27+finger*.22), localY=edgeAt(shape,localX);
        const x=(obstacle.x-distance+localX)*scale, y=(center+side*obstacle.gap/2+localY)*scale;
        const length=(obstacle.bossPart==='resting-palm'?33:58)*scale;
        stroke(c,x,y+side*3*scale,x+7*scale,y+side*length,'#26382c',Math.max(1,2*scale));
        stroke(c,x+3*scale,y+side*7*scale,x+9*scale,y+side*(length-6),'#6d7759',Math.max(1,scale));
        for (let joint=0;joint<3;joint++) {
          const yy=y+side*(15+joint*13)*scale;
          stroke(c,x-4*scale,yy,x+5*scale,yy+side*2*scale,'#7a8164',Math.max(1,scale));
        }
      }
      c.restore();
    }
  }
  c.restore();
}
