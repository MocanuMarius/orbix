import {pixelContour} from './pixel-contour.mjs?v=packing-parcel-1';
// Solid foreground scenery. Every opaque part is also a collision polygon.
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
const POOLS = Object.freeze({
  moonruins:['ruined-cottage','vault-wall','broken-bridge'],
  frost:['ice-serac','ice-shelf','ice-serac'],
  pinewood:['windswept-pine','hollow-tree','windswept-pine'],
  marsh:['willow','reed-clump','hollow-tree'],
  fungal:['giant-mushroom','giant-mushroom','root-thicket'],
  basalt:['basalt-column','basalt-column','standing-stones'],
  desert:['sandstone-arch','desert-cactus','sandstone-arch'],
  coral:['coral-fan','ship-rib','coral-fan'],
  crystal:['crystal-cluster','crystal-cluster','mine-timber'],
  cloud:['chalk-spire','broken-bridge','chalk-spire'],
  thorn:['briar-arch','root-thicket','briar-arch'],
  cemetery:['grave-marker','crypt-wall','grave-marker'],
  mill:['broken-bridge','ruined-cottage','mine-timber'],cloister:['standing-stones','vault-wall','broken-wall'],
  spores:['giant-mushroom','giant-mushroom','root-thicket'],mangrove:['willow','mine-timber','hollow-tree'],
  causeway:['broken-bridge','stone-shelter','standing-stones'],
  aqueduct: ['ruined-cottage', 'old-tree', 'broken-wall'],
  belfry: ['broken-wall', 'old-tree', 'ruined-cottage'],
  ossuary: ['vault-wall', 'old-tree', 'broken-wall'],
  elder: ['hollow-tree', 'willow', 'root-thicket'],
  fen: ['willow', 'reed-clump', 'hollow-tree'],
  hanging: ['hollow-tree', 'willow', 'root-thicket'],
  ridge: ['windswept-pine', 'stone-shelter', 'windswept-pine'],
  chasm: ['stone-shelter', 'mine-timber', 'windswept-pine'],
  glass: ['mine-timber', 'stone-shelter', 'windswept-pine'],
});

function randomFor(seed) {
  let value = 2166136261;
  for (const char of String(seed)) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => { value += 0x6d2b79f5; let n = value;
    n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}

function authoredParts(kind) {
  const parts = [];
  const p = (material, polygon) => parts.push({ material, polygon });
  const box = (material, x1, y1, x2, y2) => p(material, [[x1,y1],[x2,y1],[x2,y2],[x1,y2]]);
  if(kind==='ice-serac'||kind==='ice-shelf'||kind==='crystal-cluster'||kind==='basalt-column'||kind==='chalk-spire'){
    const material=kind==='crystal-cluster'?'crystal':kind==='basalt-column'?'basalt':kind==='chalk-spire'?'chalk':'ice';
    const columns=kind==='ice-shelf'?2:3;
    for(let i=0;i<columns;i++){
      const x=-.9+i*(columns===2?.9:.62),w=columns===2?.85:.55,tip=(i===1?.02:.22+i*.07);
      p(material,[[x,1.05],[x,tip+.22],[x+w*.36,tip],[x+w*.86,tip+.08],[x+w,tip+.3],[x+w,1.05]]);
    }
  }else if(kind==='coral-fan'){
    p('coral',[[-.17,1.05],[.17,1.05],[.11,.35],[-.03,.18],[-.17,.25],[-.09,.55]]);
    p('coral',[[-.09,.75],[-.62,.54],[-.89,.19],[-.75,.13],[-.46,.42],[.03,.54]]);
    p('coral',[[.05,.67],[.64,.44],[.9,.11],[.77,.06],[.53,.32],[.02,.43]]);
    p('coral',[[-.49,.47],[-.53,.07],[-.39,.02],[-.31,.48]]);
    p('coral',[[.48,.43],[.42,.12],[.55,.08],[.63,.44]]);
  }else if(kind==='ship-rib'){
    p('wood',[[-.95,.87],[-.72,.99],[.69,1.05],[.95,.86],[.65,.81],[-.68,.78]]);
    for(let i=0;i<4;i++){const x=-.65+i*.43;p('wood',[[x,.89],[x-.16,.35],[x-.1,.11],[x+.04,.14],[x+.02,.37],[x+.17,.9]]);}
  }else if(kind==='desert-cactus'){
    p('succulent',[[-.19,1.05],[.17,1.05],[.2,.15],[.1,.04],[-.09,.04],[-.22,.18]]);
    p('succulent',[[-.15,.76],[-.67,.7],[-.83,.56],[-.84,.28],[-.72,.21],[-.6,.29],[-.58,.51],[-.13,.53]]);
    p('succulent',[[.13,.6],[.57,.56],[.79,.41],[.8,.15],[.69,.07],[.57,.15],[.55,.34],[.12,.38]]);
  }else if(kind==='sandstone-arch'||kind==='crypt-wall'){
    const m=kind==='sandstone-arch'?'sandstone':'stone';
    p(m,[[-.92,1.05],[-.88,.38],[-.62,.1],[-.12,.02],[.48,.08],[.83,.35],[.92,1.05],[.55,1.05],[.48,.41],[.18,.24],[-.24,.26],[-.49,.45],[-.53,1.05]]);
    if(kind==='crypt-wall')box('stone',-.13,.05,.11,.28);
  }else if(kind==='grave-marker'){
    for(let i=0;i<3;i++){const x=-.85+i*.61,t=i===1?.03:.29;p('chalk',[[x,1.05],[x,t+.13],[x+.13,t],[x+.35,t],[x+.47,t+.13],[x+.47,1.05]]);}
  }else if(kind==='briar-arch'){
    p('bark',[[-.91,1.05],[-.8,.45],[-.51,.14],[-.16,.06],[.12,.2],[-.38,.36],[-.54,.57],[-.52,1.05]]);
    p('bark',[[.48,1.05],[.5,.58],[.25,.35],[-.02,.3],[.12,.11],[.48,.26],[.76,.54],[.92,1.05]]);
    p('bark',[[-.69,.72],[-1,.43],[-.58,.52]]);p('bark',[[.61,.65],[.99,.28],[.76,.79]]);
  }else if(kind==='giant-mushroom'){
    p('bark',[[-.18,1.05],[.24,1.05],[.12,.44],[-.08,.42]]);
    p('roof',[[-1,.45],[-.85,.25],[-.42,.08],[.08,.02],[.62,.17],[.98,.4],[.78,.52],[-.72,.55]]);
    p('plaster',[[-.74,.49],[-.35,.43],[.3,.43],[.72,.47],[.37,.56],[-.4,.58]]);
  }else if(kind==='standing-stones'){
    for(let i=0;i<4;i++){const x=-.85+i*.46,top=.08+(i%3)*.16;p('stone',[[x,1.05],[x,top+.08],[x+.12,top],[x+.34,top+.03],[x+.37,1.05]]);}
  }else if(kind==='broken-bridge'){
    box('stone',-.9,.4,-.62,1.05);box('stone',.54,.4,.82,1.05);
    p('stone',[[-1,.32],[-.22,.32],[-.12,.48],[-.62,.56],[-1,.5]]);
    p('stone',[[.2,.4],[1,.25],[1,.45],[.6,.55],[.26,.55]]);
  }else if (kind === 'ruined-cottage' || kind === 'stone-shelter') {
    box('stone', -.72, .45, .72, .68);
    box('stone', -.72, .65, -.23, 1.05);
    box('stone', .23, .65, .72, 1.05);
    p('roof', [[-.95,.47],[-.88,.39],[-.13,.04],[.68,.28],[.94,.47],[.64,.51],[-.66,.51]]);
    if (kind === 'ruined-cottage') {
      box('stone', .39, .12, .57, .34);
      p('foliage', [[-.77,.42],[-.47,.29],[-.27,.34],[-.15,.25],[.03,.34],[-.1,.48],[-.67,.53]]);
    }
  } else if (kind === 'broken-wall' || kind === 'vault-wall') {
    p('stone', [[-.88,1.05],[-.88,.39],[-.65,.39],[-.65,.22],[-.43,.24],[-.43,.53],[-.19,.53],[-.19,1.05]]);
    p('stone', [[.18,1.05],[.18,.34],[.43,.34],[.43,.12],[.71,.17],[.71,.37],[.9,.37],[.9,1.05]]);
    if (kind === 'vault-wall') p('stone', [[-.46,.46],[-.46,.24],[-.24,.09],[.17,.05],[.5,.25],[.5,.46],[.24,.28],[-.18,.28]]);
    p('foliage', [[-.89,.42],[-.75,.31],[-.58,.36],[-.45,.31],[-.36,.46],[-.57,.52],[-.79,.5]]);
  } else if (kind === 'mine-timber' || kind === 'old-beams') {
    box('wood', -.72, .27, -.55, 1.05);
    box('wood', .55, .22, .72, 1.05);
    p('wood', [[-.94,.23],[.88,.13],[.96,.29],[-.9,.4]]);
    p('wood', [[-.69,.6],[-.59,.67],[-.16,.31],[-.28,.26]]);
    p('wood', [[.67,.58],[.56,.66],[.16,.3],[.28,.25]]);
  } else if (kind === 'reed-clump') {
    for (let i = 0; i < 6; i++) {
      const x = -.72 + i * .28, tip = .08 + (i % 3) * .16;
      p('foliage', [[x-.07,1.05],[x-.04,.51],[x-.21,tip],[x-.12,tip+.03],[x+.08,.56],[x+.06,1.05]]);
      if (i % 2) box('bark', x-.16, tip-.015, x-.08, tip+.18);
    }
  } else if (kind === 'windswept-pine') {
    p('bark', [[-.16,1.05],[.09,1.05],[.01,.52],[.25,.14],[.13,.05],[-.16,.51]]);
    p('foliage', [[-.96,.58],[-.47,.3],[-.64,.29],[-.05,.05],[.34,.0],[.65,.25],[.39,.25],[.87,.43],[.54,.45],[1,.65],[.4,.7],[-.12,.65]]);
    p('foliage', [[-.8,.76],[-.28,.47],[.26,.4],[.72,.59],[.52,.6],[.99,.79],[.2,.85]]);
  } else if (kind === 'hanging-roots' || kind === 'hanging-branch') {
    p('bark', [[-.83,.85],[-.82,1.05],[.77,1.05],[.85,.87],[.29,.7],[-.14,.75]]);
    p('bark', [[-.53,.9],[-.69,.49],[-.46,.12],[-.35,.06],[-.48,.49],[-.32,.89]]);
    p('bark', [[.18,.91],[.23,.5],[.62,.15],[.53,.06],[.05,.46],[-.02,.88]]);
    p('bark', [[.57,.91],[.75,.59],[.9,.39],[.8,.32],[.6,.51],[.43,.87]]);
    if (kind === 'hanging-branch') p('foliage', [[-.67,.58],[-.91,.5],[-.96,.29],[-.65,.15],[-.4,.22],[-.3,.45]]);
  } else {
    const hollow = kind === 'hollow-tree';
    if (hollow) {
      p('bark', [[-.35,1.05],[-.28,.43],[-.14,.33],[-.08,.49],[-.16,1.05]]);
      p('bark', [[.13,1.05],[.1,.49],[.23,.36],[.34,.45],[.38,1.05]]);
      box('bark', -.24, .34, .29, .51);
    } else p('bark', [[-.32,1.05],[-.15,.56],[-.24,.32],[-.07,.2],[.08,.5],[.2,.76],[.35,1.05]]);
    p('bark', [[-.1,.6],[-.56,.48],[-.91,.22],[-.82,.15],[-.45,.35],[.05,.42]]);
    p('bark', [[.03,.56],[.57,.41],[.91,.18],[.82,.13],[.48,.29],[-.05,.39]]);
    if (kind !== 'old-tree' && kind !== 'root-thicket') {
      p('foliage', [[-1.04,.4],[-.92,.2],[-.61,.08],[-.34,.15],[-.11,.02],[.32,.08],[.43,.2],[.83,.13],[1.04,.32],[.94,.5],[.48,.48],[.13,.39],[-.25,.51],[-.61,.42]]);
      if (kind === 'willow') {
        p('foliage', [[-.93,.32],[-.63,.34],[-.68,.72],[-.82,.84],[-.9,.57]]);
        p('foliage', [[.55,.3],[.9,.31],[1,.69],[.83,.87],[.7,.68]]);
      }
    } else p('foliage', [[-.38,.45],[-.26,.34],[-.08,.41],[.02,.32],[.19,.38],[.14,.51],[-.1,.55]]);
  }
  return parts;
}

export function scenePropPolygons(obstacle, time = 0) {
  const center = obstacle.center + Math.sin(time * .9 + obstacle.phase) * (obstacle.motion || 0);
  return (obstacle.sceneProps || []).flatMap(prop => prop.parts.map(part => part.polygon
    .map(([x,y]) => [obstacle.x + x, center + prop.side * obstacle.gap / 2 + y])));
}

/** World bounds include the full sway envelope, so draft rooms stay clear. */
export function scenePropBounds(obstacle) {
  return (obstacle.sceneProps || []).map(prop => {
    const points = prop.parts.flatMap(part => part.polygon), motion = Math.abs(obstacle.motion || 0);
    const originY = obstacle.center + prop.side * obstacle.gap / 2;
    return { id: prop.id, kind: prop.kind, side: prop.side,
      minX: obstacle.x + Math.min(...points.map(point => point[0])),
      maxX: obstacle.x + Math.max(...points.map(point => point[0])),
      minY: originY + Math.min(...points.map(point => point[1])) - motion,
      maxY: originY + Math.max(...points.map(point => point[1])) + motion };
  });
}

export function populateSceneProps({ obstacles = [], embers = [], terrain = 'ruins',
  height = 620, seed = 1, totalDistance = Infinity, scene = 'aqueduct', circleHitsPolygon } = {}) {
  const rng = randomFor(`${seed}:${scene}:solid-scenery`), scale = height / 620;
  const thematic=['mill','cloister','spores','mangrove','causeway','basalt','moonruins','frost','pinewood','marsh','fungal','desert','coral','crystal','cloud','thorn','cemetery'].includes(scene);
  const pool = POOLS[scene] || POOLS.aqueduct, counts = new Map(), lastX = new Map(), placements = [];
  const offset = Math.floor(rng() * pool.length);
  for (const obstacle of obstacles) {
    const leg = obstacle.leg || 0, used = counts.get(leg) || 0;
    if (used >= 3 || obstacle.hard || obstacle.soft || (!thematic&&obstacle.cachePocket) || obstacle.sceneProps?.length
      || obstacle.x < 1050 || obstacle.x + obstacle.width * 2.45 > totalDistance - 640
      || (!thematic&&embers.some(packet => packet.anchor === obstacle.id))
      || obstacle.x - (lastX.get(leg) || -Infinity) < 680 || rng() > .72) continue;
    const side = obstacle.topShape && (!obstacle.bottomShape || scene!=='spores'&&rng() < .26) ? -1 : 1;
    const shape = side < 0 ? obstacle.topShape : obstacle.bottomShape;
    if (!shape) continue;
    const overhead={frost:'ice-serac',crystal:'crystal-cluster',basalt:'basalt-column',desert:'sandstone-arch',coral:'coral-fan',cloud:'chalk-spire',cemetery:'crypt-wall',fungal:'giant-mushroom',thorn:'briar-arch'};
    const kind = side < 0 ? overhead[scene] || (terrain === 'canopy' ? used % 2 ? 'hanging-branch' : 'hanging-roots'
      : terrain === 'ruins' && used % 2 ? 'hanging-roots' : 'old-beams') : pool[(offset + used + leg) % pool.length];
    const centerX = obstacle.width * .72, halfWidth = obstacle.width * (kind==='giant-mushroom'?.44:.63);
    const left = centerX - halfWidth * 1.34, right = centerX + halfWidth * 1.34;
    const oldDepth = shape.slice(2).filter(point => point[0] >= left && point[0] <= right)
      .map(point => side * point[1]);
    const base = Math.max(134 * scale, Math.max(0, ...oldDepth) + 18 * scale);
    const tip = (kind==='giant-mushroom'?48:7) * scale;
    const prop = { id: `scene:${obstacle.id}`, kind, side,
      parts: authoredParts(kind).map(part => ({ material: part.material,
        polygon: part.polygon.map(([u,v]) => [centerX + u * halfWidth,
          side * (tip + (base - tip) * v)]) })) };
    if(kind==='windswept-pine')for(const part of prop.parts)part.polygon=pixelContour(part.polygon,2);
    const candidate = { ...obstacle, sceneProps: [prop] };
    const bounds = scenePropBounds(candidate)[0];
    if (typeof circleHitsPolygon === 'function' && embers.some(packet => {
      const clearance = Math.max(22, Number(packet.clearance) || 0);
      if (packet.x + clearance < bounds.minX || packet.x - clearance > bounds.maxX
        || packet.y + clearance < bounds.minY || packet.y - clearance > bounds.maxY) return false;
      return [-1, 1].some(sign => scenePropPolygons({ ...candidate, phase: 0, motion: 0,
        center: candidate.center + sign * Math.abs(candidate.motion || 0) })
        .some(polygon => circleHitsPolygon(packet.x, packet.y, clearance, polygon)));
    })) continue;
    // The old solid surface retreats. Props rise only within its occupied side;
    // the entire original central corridor remains free of new geometry.
    for (const point of shape.slice(2)) {
      const inset = Math.min(point[0] - left, right - point[0]);
      if (inset <= 0) continue;
      const depth = side * point[1], blend = smooth(inset / (obstacle.width * .2));
      point[1] = side * (depth + Math.max(0, base - depth) * blend);
    }
    obstacle.sceneProps = [prop];
    counts.set(leg, used + 1); lastX.set(leg, obstacle.x);
    placements.push({ id: prop.id, obstacleId: obstacle.id, leg, kind, side });
  }
  return placements;
}
