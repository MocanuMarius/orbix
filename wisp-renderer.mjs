import {prepareEnvironmentArt,prepareNearLandscape,prepareCourseArt,drawCourseArt,drawNearLandscape,drawTerrainForeground,releaseTerrainForeground} from './authored-environment.mjs?v=early-play-1';
import {drawTerrainEcology,drawHabitatBackdrop} from './terrain-ecology.mjs?v=early-play-1';
import {drawTerrainBoundary,terrainBoundary,beginTerrainBoundaryFrame,endTerrainBoundaryFrame,releaseTerrainBoundaryFrame} from './terrain-boundary.mjs?v=early-play-1';
import {spacetimeBaseShape,drawSpacetimeTerrain} from './spacetime.mjs?v=early-play-1';
import {paintContactEdge,isContactEdgeStyle,contactEdgeInk} from './contact-edge-art.mjs?v=early-play-1';
import {ContactEdgeRaster} from './contact-edge-raster.mjs?v=early-play-1';
import {getContactEdgePalette} from './contact-edge-palettes.mjs?v=early-play-1';
import {drawAtlasFlight} from './atlas-flight.mjs?v=early-play-1';
import {drawGuardianPresence} from './guardian-presence.mjs?v=early-play-1';
import { drawGuardianWarnings } from './guardian-art.mjs?v=early-play-1';
import { drawShutters } from './shutter-cone.mjs?v=early-play-1';
import {drawProximityMeter} from './proximity-meter.mjs?v=early-play-1';
import {drawFourthBeat} from './fourth-beat-art.mjs?v=early-play-1';
import {drawCollectorField} from './collector-field-art.mjs?v=early-play-1';
import {drawObjectiveMarks} from './flight-objectives.mjs?v=early-play-1';
import {drawFlightProjection,drawLiftGuide} from './flight-projection.mjs?v=early-play-1';
import {revealLuminanceWaves} from './luminance-waves.mjs?v=early-play-1';
import {drawGlowSense} from './glow-sense.mjs?v=early-play-1';
import {drawLastGlimmer} from './last-glimmer.mjs?v=early-play-1';
import {formatGlow} from './vitality.mjs?v=early-play-1';
import {LOCATION_PALETTES} from './world-expansion.mjs?v=early-play-1';
import {biomePalette} from './biome-art.mjs?v=early-play-1';
import { sceneryIdentity, drawIdentityBackground, drawIdentityMaterial, drawIdentityLife } from './level-scenery.mjs?v=early-play-1';
import { getCompanionAbility, normalizeCompanionRole } from './companion-abilities.mjs?v=early-play-1';
import { companionPalette, makeCompanionSprite, makeWispSprite } from './companion-art.mjs?v=early-play-1';
import { createScenePropArt } from './scene-prop-art.mjs?v=early-play-1';
import { drawBoss } from './boss.mjs?v=early-play-1';
import {drawFlashTether} from './flash-tether.mjs?v=early-play-1';
import { drawPickup, drawSparkSymbol } from './pickup-art.mjs?v=early-play-1';
import {pickupHookAnchor} from './pickup-handling-cue.mjs?v=early-play-1';
import {sparkBodyRadius,sparkArtScale,sparkMass} from './spark-size.mjs?v=early-play-1';
import { pickupKind, getPickupSpec } from './pickups.mjs?v=early-play-1';
import { LIGHT_EXTENT,lightAttenuation,lightVisibility,createLightMaskCanvas,castFlightFlashLights,revealLanternWake,sceneRevealStrength,renderLightState,lightDreamScenery,companionTerrainLight } from './light-field.mjs?v=early-play-1';
import {drawExitLandmark} from './exit-landmark.mjs?v=early-play-1';
import {drawBlackHoles} from './black-hole-art.mjs?v=early-play-1';
import {drawCapture, drawShellPuff, drawCarriedSpark,drawCollectorGrip} from './capture-art.mjs?v=early-play-1';
import {drawShellArcs} from './shell-arcs.mjs?v=early-play-1';
import {drawWispWake} from './wisp-wake.mjs?v=early-play-1';
import {drawFlightForks,drawFlightForkBackdrops} from './flight-forks.mjs?v=early-play-1';
import {drawFallWarning} from './fall-chain-art.mjs?v=early-play-1';
import {castTerrainLight,releaseTerrainLight,prepareTerrainLight} from './terrain-light.mjs?v=early-play-1';

const TAU = Math.PI * 2;
const propContactCache=new WeakMap();
const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
function propContains(polygons,x,y){
 for(const points of polygons){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[i],b=points[j];
   if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  if(inside)return true;
 }
 return false;
}
// Bake the union's exposed edges once per immutable prop. Material seams and
// overlapping authored faces are not additional collision boundaries.
function propContacts(prop,height){
 const saved=propContactCache.get(prop);if(saved?.parts===prop.parts&&saved.height===height)return saved.edges;
 const polygons=prop.parts.map(part=>part.polygon),source=[],edges=[];
 for(const polygon of polygons)for(let i=0;i<polygon.length;i++)source.push({a:polygon[i],b:polygon[(i+1)%polygon.length]});
 for(const edge of source){
  const [ax,ay]=edge.a,dx=edge.b[0]-ax,dy=edge.b[1]-ay,length=Math.hypot(dx,dy);if(length<1e-6)continue;
  const cuts=[0,1],nx=-dy/length,ny=dx/length;
  for(const other of source){
   if(other===edge)continue;
   const ox=other.a[0]-ax,oy=other.a[1]-ay,ex=other.b[0]-other.a[0],ey=other.b[1]-other.a[1],den=cross(dx,dy,ex,ey);
   if(Math.abs(den)>1e-7){
    const t=cross(ox,oy,ex,ey)/den,u=cross(ox,oy,dx,dy)/den;
    if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
   }else if(Math.abs(cross(ox,oy,dx,dy))<1e-6){
    for(const point of [other.a,other.b]){const t=((point[0]-ax)*dx+(point[1]-ay)*dy)/(length*length);if(t>0&&t<1)cuts.push(t);}
   }
  }
  cuts.sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){
   const lo=cuts[i-1],hi=cuts[i];if(hi-lo<1e-6)continue;
   const mid=(lo+hi)/2,mx=ax+dx*mid,my=ay+dy*mid;
   const left=propContains(polygons,mx+nx*.01,my+ny*.01),right=propContains(polygons,mx-nx*.01,my-ny*.01);
   if(left===right)continue;
   // Coincident exposed segments have a single owner.
   const a=[ax+dx*lo,ay+dy*lo],b=[ax+dx*hi,ay+dy*hi];
   if(edges.some(e=>Math.hypot(e.a[0]-a[0],e.a[1]-a[1])+Math.hypot(e.b[0]-b[0],e.b[1]-b[1])<1e-5||Math.hypot(e.a[0]-b[0],e.a[1]-b[1])+Math.hypot(e.b[0]-a[0],e.b[1]-a[1])<1e-5))continue;
   edges.push({a,b,inward:{x:left?nx:-nx,y:left?ny:-ny}});
  }
 }
 propContactCache.set(prop,{parts:prop.parts,height,edges});return edges;
}
function terrainCovers(profiles,x,y){
 for(const profile of profiles){
  const points=profile.points;if(x<points[0][0]||x>points.at(-1)[0])continue;
  let lo=0,hi=points.length-1;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(points[mid][0]<=x)lo=mid;else hi=mid;}
  const a=points[lo],b=points[hi],height=a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]||1);
  if(profile.top?y<=height:y>=height)return true;
 }
 return false;
}
const SCENERY_HELPERS = { line: pixelLine, disc: pixelDisc, polygon: path };
const BACKGROUND_HELPERS = { line: pixelLine, disc() {}, polygon: path };
const SIDES = [true, false];
const WIDTH = 240;
const WORLD_RASTER_SCALE = WIDTH / 390;
const ART_SCALE = WIDTH / 195;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const hash = (x, y = 0, seed = 0) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
};
const timeOf = e => e.visualTime ?? e.time ?? 0;
const distanceOf = e => e.renderDistance ?? e.distance ?? 0;
const yOf = e => e.renderPlayerY ?? e.player.y;
const PALETTES = {
  ruins: { sky: ['#101719', '#192426', '#293434'], far: '#263131', middle: '#34403c', near: '#40483f', stone: '#363a35', shade: '#242c2b', face: '#4c4e42', grain: '#626150', rim: '#929078', mist: '#777e70' },
  canopy: { sky: ['#0c1515', '#172321', '#26342b'], far: '#203029', middle: '#2b3b30', near: '#3c4836', stone: '#2c342a', shade: '#1d2823', face: '#414b35', grain: '#5b6145', rim: '#82866a', mist: '#78826a' },
  storm: { sky: ['#111821', '#202b34', '#344147'], far: '#2c3940', middle: '#3d4a4d', near: '#4b5758', stone: '#343f44', shade: '#232f35', face: '#4d5b5d', grain: '#6a7878', rim: '#a2afaa', mist: '#879a9b' },
};
const MATERIALS = {
  aqueduct: { stone: '#36382f', face: '#4a4638', grain: '#746c51', rim: '#9d9272' },
  belfry: { stone: '#363c38', face: '#4e554c', shade: '#202e2c', grain: '#747b63', rim: '#9ca38b' },
  ossuary: { stone: '#393c36', face: '#51564a', grain: '#92977d', rim: '#b0b99a' },
  elder: { stone: '#30332a', face: '#514a34', grain: '#75714d', rim: '#929571' },
  fen: { stone: '#26342d', face: '#3a5141', grain: '#656f45', rim: '#90a074' },
  hanging: { stone: '#26352f', face: '#415849', grain: '#61836a', rim: '#91b89e' },
  ridge: { stone: '#363f45', face: '#526169', grain: '#6f7d83', rim: '#a4b4b6' },
  chasm: { stone: '#2f343f', face: '#454f60', grain: '#69768c', rim: '#9da9bc' },
  glass: { stone: '#303f4a', face: '#4a6673', grain: '#7999a7', rim: '#b6ced0' },
};
const MAIN_LIGHT = { outer: '#9daaa0', mid: '#ccd6c6', core: '#f0f1d8', bright: '#ffffec' };
const GLYPHS = {
  '%':['101','001','010','100','101'],'.':['000','000','000','000','010'],
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
  G: ['111', '100', '101', '101', '111'], L: ['100', '100', '100', '100', '111'],
  O: ['111', '101', '101', '101', '111'], W: ['101', '101', '101', '111', '101'],
  F: ['111', '100', '110', '100', '100'], U: ['101', '101', '101', '101', '111'],
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'],
  C: ['111', '100', '100', '100', '111'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], J: ['001', '001', '001', '101', '111'],
  K: ['101', '101', '110', '101', '101'], M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'], P: ['111', '101', '111', '100', '100'],
  Q: ['111', '101', '101', '111', '001'], R: ['110', '101', '110', '101', '101'],
  S: ['111', '100', '111', '001', '111'], T: ['111', '010', '010', '010', '010'],
  V: ['101', '101', '101', '101', '010'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
  '-': ['000', '000', '111', '000', '000'], '−': ['000', '000', '111', '000', '000'],
  '.': ['000', '000', '000', '000', '010'], '%': ['101', '001', '010', '100', '101'],
};

function pixelText(c, value, x, y, ink) {
  c.fillStyle = ink;
  for (const letter of String(value)) {
    const rows = GLYPHS[letter];
    if (rows) for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 3; xx++) if (rows[yy][xx] === '1') c.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
    x += 4;
  }
}

function pixelLine(c, x0, y0, x1, y1, ink, size = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  c.fillStyle = ink;
  for (let guard = 0; guard < 4096; guard++) {
    c.fillRect(x0, y0, size, size);
    if (x0 === x1 && y0 === y1) break;
    const next = error * 2;
    if (next >= dy) { error += dy; x0 += sx; }
    if (next <= dx) { error += dx; y0 += sy; }
  }
}

function pixelDisc(c, x, y, radius, ink) {
  c.fillStyle = ink;
  for (let row = -radius; row <= radius; row++) {
    const half = Math.floor(Math.sqrt(Math.max(0, radius * radius - row * row)));
    c.fillRect(Math.round(x - half), Math.round(y + row), half * 2 + 1, 1);
  }
}

function path(c, points, offsetX = 0, offsetY = 0, scale = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => {
    const px = Math.round(x * scale + offsetX), py = Math.round(y * scale + offsetY);
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  });
  c.closePath();
}

function hexMix(a, b, amount) {
  const aa = parseInt(a.slice(1), 16), bb = parseInt(b.slice(1), 16);
  const r = Math.round((aa >> 16) * (1 - amount) + (bb >> 16) * amount);
  const g = Math.round((aa >> 8 & 255) * (1 - amount) + (bb >> 8 & 255) * amount);
  const blue = Math.round((aa & 255) * (1 - amount) + (bb & 255) * amount);
  return `rgb(${r},${g},${blue})`;
}

export class WispFlightView {
  constructor(engine) {
    this.engine = engine;
    this.ready = false;
    this.destroyed = false;
    this.canvas = null;
    this.buffer = null;
    this.terrainCache = new Map();
    this.scenePropCache = new Map();
    this.spriteCache = new Map();
    this.glowCache = new Map();
    this.propBounds = new WeakMap();
    this.visibleObstacles = [];
    this.obstacleCursor = 0;
    this.lastVisibleDistance = -1;
    this.identity = sceneryIdentity(engine);
    this.contactEdgePalette = getContactEdgePalette(engine);
    this.palette = { ...(PALETTES[engine.terrain] || PALETTES.ruins), ...(MATERIALS[this.identity.materialScene||this.identity.scene] || {}), ...(LOCATION_PALETTES[this.identity.scene]||{}), ...biomePalette(this.identity) };
    this.lifeOptions = { identity: this.identity, width: WIDTH, height: 0, distance: 0, time: 0, palette: this.palette, reducedMotion: false };
    this.bossOptions = { engine, width: WIDTH, height: 0, distance: 0, time: 0, scale: 1, pass: 'silhouette' };
    this.fallbackFleet = [{ role: 'collector', x: 0, y: 0, homeX: 0, homeY: 0, radius: 100, phase: 'ready', recovery: 1, carrying: false }];
    this.originalOpacity = engine.canvas.style?.opacity || '';
  }

  async init() {
    const e = this.engine;
    const document = e.canvas.ownerDocument || globalThis.document;
    if (!document || !e.canvas.parentElement || this.destroyed || e.destroyed) return false;
    try {
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'pixel-flight-canvas';
      this.canvas.dataset.renderer = 'canvas-pixel';
      this.canvas.dataset.pixelWidth = String(WIDTH);
      this.canvas.setAttribute('aria-hidden', 'true');
      Object.assign(this.canvas.style, { position: 'absolute', inset: '0', pointerEvents: 'none', imageRendering: 'pixelated' });
      this.context = this.canvas.getContext('2d', { alpha: false });
      this.buffer = document.createElement('canvas');
      this.bufferContext = this.buffer.getContext('2d', { alpha: false });
      this.fog = document.createElement('canvas');
      this.fogContext = this.fog.getContext('2d');
      if (!this.context || !this.bufferContext || !this.fogContext) throw Error('Canvas 2D is unavailable.');
      this.document = document;
      prepareTerrainLight();
      await prepareEnvironmentArt(document);
      if(this.destroyed||e.destroyed)return false;
      prepareCourseArt(document,e);
      prepareNearLandscape(document,e);
      e.canvas.parentElement.appendChild(this.canvas);
      this.resize();
      this.ready = true;
      // Opacity preserves the original canvas's pointer input below this view.
      if (e.canvas.style) e.canvas.style.opacity = '0';
      this.render(e);
      return true;
    } catch (error) {
      this.error = error;
      this.destroy();
      return false;
    }
  }

  resize() {
    if (this.destroyed || !this.canvas || !this.buffer) return;
    const e = this.engine, bounds = e.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, bounds.width || 390), cssHeight = Math.max(1, bounds.height || 620);
    const ratio = clamp(globalThis.devicePixelRatio || 1, 1, 2);
    const layoutKey = `${cssWidth}:${cssHeight}:${ratio}:${e.width}:${e.height}`;
    // Assigning even identical canvas dimensions clears the bitmap and forces
    // expensive terrain regeneration during mobile resize event bursts.
    if (layoutKey === this.layoutKey) return;
    this.layoutKey = layoutKey;
    this.canvas.width = Math.round(cssWidth * ratio);
    this.canvas.height = Math.round(cssHeight * ratio);
    this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
    // Retain the established world-to-pixel density on wider scenes, rather
    // than squeezing landscape into a 240px strip. Bound raster cost on very
    // wide desktop views; all terrain, light and sprite culling uses this width.
    const pixelWidth = Math.min(720,Math.max(WIDTH,Math.round((e.width||390)*WORLD_RASTER_SCALE)));
    this.buffer.width = pixelWidth;
    this.buffer.height = Math.max(1, Math.round((e.height || 620) / (e.width || 390) * pixelWidth));
    this.scale = pixelWidth / (e.width || 390);
    // On very wide displays the backing buffer reaches its 720px cap.
    // Keep the body, its shield and discharge roots in proportion to the world.
    this.wispRasterScale = pixelWidth === 720 ? Math.min(1,this.scale/WORLD_RASTER_SCALE) : 1;
    this.canvas.dataset.pixelWidth=String(pixelWidth);
    this.lifeOptions.width=pixelWidth;this.bossOptions.width=pixelWidth;
    this.fog.width = this.buffer.width; this.fog.height = this.buffer.height;
    this.fogPixels = null;
    if (this.skyCanvas) this.skyCanvas.width = this.skyCanvas.height = 1;
    this.skyCanvas = null;
    if (this.backgroundCanvas) this.backgroundCanvas.width = this.backgroundCanvas.height = 1;
    this.backgroundCanvas = null; this.backgroundSample = NaN;
    this.propBounds = new WeakMap();
    this.obstacleCursor = 0; this.lastVisibleDistance = -1;
    this.context.imageSmoothingEnabled = false;
    this.bufferContext.imageSmoothingEnabled = false;
    for (const item of this.terrainCache.values()) { item.canvas.width = 1; item.canvas.height = 1; }
    this.terrainCache.clear();
    for (const item of this.scenePropCache.values()) { item.canvas.width = 1; item.canvas.height = 1; }
    this.scenePropCache.clear();
    if (this.ready) this.render(e);
  }

  drawSky(e, t, distance, palette) {
    const c = this.bufferContext, W = this.buffer.width, H = this.buffer.height;
    if (!this.skyCanvas) {
      this.skyCanvas = this.document.createElement('canvas');
      this.skyCanvas.width = W; this.skyCanvas.height = H;
      const sky = this.skyCanvas.getContext('2d');
      for (let row = 0; row < H; row += 4) {
        const fraction = row / H * 2;
        sky.fillStyle = hexMix(palette.sky[Math.min(1, Math.floor(fraction))], palette.sky[Math.min(2, Math.floor(fraction) + 1)], fraction % 1);
        sky.fillRect(0, row, W, 4);
      }
    }
    c.drawImage(this.skyCanvas, 0, 0);
    for (let i = 0; i < 54; i++) {
      const x = Math.floor(hash(i, 4, 12) * W), y = Math.floor(hash(i, 7, 15) * H * .65);
      c.globalAlpha = .20 + (e.reducedMotion ? .10 : Math.floor((Math.sin(t * .7 + i) + 1) * 2) * .08);
      c.fillStyle = '#a9b1a0'; c.fillRect(x, y, 1, 1);
      if (i % 17 === 0) c.fillRect(x - 1, y + 1, 3, 1);
    }
    c.globalAlpha = 1;
    this.drawCachedBackground(e, distance, palette);
    // Low, broken cloud and mist strips keep the world atmospheric without blurred assets.
    c.globalAlpha = .12;
    for (let i = 0; i < 13; i++) {
      const width = 20 + Math.floor(hash(i, 6) * 50);
      const x = ((hash(i, 3) * (W + width) - distance * .018) % (W + width) + W + width) % (W + width) - width;
      const y = Math.floor(H * (.24 + hash(i, 8) * .62));
      c.fillStyle = palette.mist; c.fillRect(Math.round(x), y, width, i % 3 === 0 ? 2 : 1);
    }
    c.globalAlpha = 1;
  }

  drawCachedBackground(e, distance, palette) {
    const c = this.bufferContext, W = this.buffer.width, H = this.buffer.height;
    const sceneId = this.identity.scene, scroll = distance * .025;
    const sample = Math.floor(scroll * 2) / 2, pad = 4;
    if (!this.backgroundCanvas) {
      this.backgroundCanvas = this.document.createElement('canvas');
      this.backgroundCanvas.width = W + pad * 2; this.backgroundCanvas.height = H;
      // Rasterize cached art once on the CPU. Thousands of tiny deferred GPU
      // paint commands caused long presentation stalls; the main buffers and
      // final lighting/presentation retain their accelerated contexts.
      this.backgroundContext = this.backgroundCanvas.getContext('2d', { willReadFrequently: true });
      this.backgroundContext.imageSmoothingEnabled = false;
    }
    this.backgroundRepainted = sample !== this.backgroundSample;
    if (this.backgroundRepainted) {
      const b = this.backgroundContext;
      b.setTransform(1, 0, 0, 1, pad, 0); b.globalAlpha = 1;
      b.clearRect(-pad, 0, W + pad * 2, H);
      const scene = this.lifeOptions; scene.height = H; scene.distance = sample / .025;
      // Keep the moon fixed. Only the slowly scrolling scenery is rasterized
      // into this strip; stars, mist, lighting and living details still animate.
      drawIdentityBackground(b, scene, BACKGROUND_HELPERS);
      b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1;
      this.backgroundSample = sample;
    }
    const moonX = W * (sceneId === 'chasm' ? .62 : sceneId === 'belfry' ? .30 : .78);
    const moonY = H * (sceneId === 'hanging' || sceneId === 'glass' ? .31 : .16);
    c.save(); c.globalAlpha = .64;
    pixelDisc(c, Math.round(moonX), Math.round(moonY), sceneId === 'chasm' ? 26 : 15, '#8e9b91');
    if (sceneId !== 'chasm') pixelDisc(c, Math.round(moonX + 5), Math.round(moonY - 3), 13, palette.sky[0]);
    else { c.globalAlpha = .32; pixelDisc(c, Math.round(W * .28), Math.round(H * .26), 9, '#9aa5b0'); }
    c.globalAlpha = 1;
    c.drawImage(this.backgroundCanvas, -pad - (scroll - sample), 0);
    c.restore();
  }

  drawDeadForest(t, distance, palette) {
    const c = this.bufferContext, H = this.buffer.height;
    for (let layer = 0; layer < 2; layer++) {
      const spacing = layer ? 49 : 37, scroll = distance * (layer ? .085 : .043), first = Math.floor(scroll / spacing);
      for (let i = -1; i < this.buffer.width / spacing + 2; i++) {
        const id = first + i, lean = hash(id, 9) * 12 - 6;
        const x = Math.round(i * spacing - scroll % spacing), base = Math.round(H * (layer ? .98 : .88));
        const height = 29 + hash(id, 2) * (layer ? 61 : 44), ink = layer ? palette.shade : palette.far;
        c.globalAlpha = .62;
        pixelLine(c, x, base, x + lean * .4, base - height * .52, ink, layer ? 3 : 2);
        pixelLine(c, x + lean * .4, base - height * .52, x + lean, base - height, ink, 2);
        for (let root = -1; root <= 1; root++) pixelLine(c, x, base - 4, x + root * 9, base + 2, ink);
        for (let branch = 0; branch < 5; branch++) {
          const y = base - height * (.34 + branch * .125), side = branch % 2 ? -1 : 1;
          const bx = x + lean * .5 + side * (7 + hash(id + branch, 12) * 13);
          pixelLine(c, x + lean * .5, y + 5, bx, y - 7, ink, branch < 2 ? 2 : 1);
          pixelLine(c, bx, y - 7, bx + side * 3, y - 17, ink);
          if (branch % 2 === 0) pixelLine(c, bx - side * 3, y - 5, bx + side * 7, y - 8, ink);
        }
        if (id % 4 === 1) {
          pixelLine(c, x + 10, base - height * .6, x + 10, base - height * .6 + 8, palette.near);
          c.fillStyle = palette.middle; c.fillRect(x + 8, Math.round(base - height * .6 + 8), 4, 5);
          c.fillStyle = '#72735b'; c.fillRect(x + 9, Math.round(base - height * .6 + 9), 1, 2);
        }
      }
    }
    c.globalAlpha = 1;
  }

  drawDistantRuins(distance, palette, frozen = false) {
    const c = this.bufferContext, H = this.buffer.height;
    const scroll = distance * .029;
    for (let site = -1; site < 3; site++) {
      const id = Math.floor(scroll / 170) + site;
      const x = Math.round(site * 170 + 44 - scroll % 170), y = Math.round(H * (.77 + hash(id, 8) * .08));
      c.globalAlpha = .72; c.fillStyle = palette.far;
      c.fillRect(x, y - 27, 8, 38); c.fillRect(x + 31, y - 35, 9, 46);
      c.fillRect(x + 6, y - 22, 27, 5); c.fillRect(x + 11, y - 28, 19, 6);
      c.fillRect(x + 2, y - 31, 5, 4); c.fillRect(x + 32, y - 39, 6, 4);
      c.fillRect(x - 5, y + 8, 51, 4); c.fillRect(x + 42, y - 7, 17, 19);
      c.fillStyle = palette.sky[1];
      c.fillRect(x + 3, y - 20, 2, 7); c.fillRect(x + 34, y - 26, 3, 9);
      c.fillRect(x + 14, y - 28, 4, 3); c.fillRect(x + 45, y - 7, 4, 3);
      c.fillStyle = palette.middle; c.fillRect(x - 3, y + 10, 56, 1);
      if (frozen) {
        c.fillStyle = '#6e8286'; c.fillRect(x + 1, y - 28, 7, 1); c.fillRect(x + 31, y - 36, 10, 1); c.fillRect(x + 35, y - 35, 1, 5);
      } else {
        pixelLine(c, x + 49, y, x + 47, y - 19, palette.far); pixelLine(c, x + 47, y - 13, x + 54, y - 22, palette.far);
      }
    }
    c.globalAlpha = 1;
  }

  drawMist(e, t, distance, palette) {
    const c = this.bufferContext, H = this.buffer.height;
    const scene = sceneryIdentity(e).scene;
    const [start, spacing, layers] = ({ belfry: [.76, .05, 4], fen: [.72, .06, 4],
      hanging: [.18, .20, 3], glass: [.36, .37, 2], chasm: [.79, .10, 2],
      elder: [.57, .12, 4], ridge: [.33, .22, 3] })[scene] || [.57, .14, 3];
    for (let layer = 0; layer < layers; layer++) {
      const y = Math.round(H * (start + layer * spacing));
      const shift = (distance * (.012 + layer * .007) + (e.reducedMotion ? 0 : t * 1.4)) % 80;
      c.globalAlpha = .055 + layer * .012; c.fillStyle = palette.mist;
      for (let patch = -1; patch < 4; patch++) {
        const x = Math.round(patch * 80 - shift);
        c.fillRect(x, y, 61, 1); c.fillRect(x + 7, y + 1, 46, 2); c.fillRect(x + 18, y + 3, 28, 1);
      }
    }
    c.globalAlpha = 1;
  }

  drawTerrainStory(c, surface, top, palette, obstacle, terrain, canvasWidth) {
    const inward = top ? -1 : 1;
    const crest = surface.reduce((best, p) => inward * p[1] < inward * best[1] ? p : best, surface[0]);
    const at = x => {
      for (let i = 1; i < surface.length; i++) {
        const a = surface[i - 1], b = surface[i];
        if (x >= a[0] && x <= b[0] && b[0] !== a[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
      return crest[1];
    };
    const cx = Math.round(clamp(crest[0] + (obstacle.id % 2 ? -7 : 7), 20, canvasWidth - 20));
    const cy = Math.round(at(cx));
    if (terrain === 'ruins') {
      // Buried masonry is filled relief in solid stone, never a false opening.
      for (let row = 0; row < 5; row++) for (let brick = -3; brick <= 3; brick++) {
        const xx = cx + brick * 7 + row % 2 * 3, yy = cy + inward * (5 + row * 5);
        c.fillStyle = row % 2 ? palette.face : palette.grain; c.fillRect(xx, yy, 6, 3);
        c.fillStyle = palette.shade; c.fillRect(xx + 1, yy + 3, 5, 1);
      }
      if (!top && obstacle.id % 3 !== 2) {
        const y = cy + 7;
        c.fillStyle = palette.face; c.fillRect(cx - 9, y + 6, 18, 18);
        for (const [xx, yy] of [[-12, 10], [-11, 6], [-8, 3], [-4, 1], [0, 0], [4, 1], [8, 3], [11, 6], [12, 10]]) {
          c.fillStyle = palette.shade; c.fillRect(cx + xx - 2, y + yy, 5, 4);
          c.fillStyle = palette.grain; c.fillRect(cx + xx - 1, y + yy, 4, 2);
        }
        c.fillStyle = palette.grain; c.fillRect(cx - 14, y + 11, 3, 14); c.fillRect(cx + 12, y + 11, 3, 14);
        c.fillStyle = palette.shade; c.fillRect(cx - 9, y + 13, 18, 1); c.fillRect(cx - 9, y + 19, 18, 1);
        c.fillRect(cx, y + 8, 1, 17); c.fillRect(cx - 5, y + 14, 1, 5); c.fillRect(cx + 5, y + 20, 1, 5);
        c.fillStyle = '#8c8669'; c.fillRect(cx - 1, y + 10, 3, 1); c.fillRect(cx, y + 9, 1, 4);
      } else for (let step = 0; step < 5; step++) {
        c.fillStyle = palette.grain; c.fillRect(cx - 13 + step * 5, cy + inward * (8 + step * 4), 8, 2);
        c.fillStyle = palette.shade; c.fillRect(cx - 13 + step * 5, cy + inward * (10 + step * 4), 7, 1);
      }
      c.fillStyle = palette.shade; c.fillRect(cx - 18, cy + inward * 23, 8, 2); c.fillRect(cx + 14, cy + inward * 16, 6, 3);
    } else if (terrain === 'canopy') {
      for (let root = 0; root < 4; root++) {
        const start = cx + (root - 1.5) * 11, y = at(start);
        let previousX = start, previousY = y + inward * 2;
        for (let segment = 1; segment <= 9; segment++) {
          const xx = start + Math.sin(segment * .42 + root * 1.3) * (4 + segment * .6), yy = y + inward * segment * 5;
          pixelLine(c, previousX, previousY, xx, yy, palette.shade, segment < 4 ? 4 : 2);
          pixelLine(c, previousX + 1, previousY, xx + 1, yy, '#586047');
          if (segment === 4 || segment === 7) pixelLine(c, xx, yy, xx + (root % 2 ? -9 : 9), yy + inward * 9, palette.shade, 2);
          previousX = xx; previousY = yy;
        }
      }
      c.fillStyle = '#737956';
      for (let i = 0; i < 9; i++) c.fillRect(cx - 20 + i * 5, Math.round(at(cx - 20 + i * 5)) + inward, 3, 1);
    } else {
      for (let vein = 0; vein < 3; vein++) {
        const xx = cx - 17 + vein * 17, yy = at(xx);
        for (let step = 0; step < 7; step++) {
          const x = xx + Math.round(Math.sin(step * .7 + vein) * 2), y = yy + inward * (4 + step * 4);
          c.fillStyle = step % 2 ? '#657d82' : '#789095'; c.fillRect(x, y, vein === 1 ? 3 : 2, 4);
          c.fillStyle = '#a2b5b3'; c.fillRect(x, y, 1, 2);
        }
      }
      if (!top) {
        c.fillStyle = palette.shade; c.fillRect(cx - 2, cy + 6, 6, 19);
        c.fillStyle = palette.grain; c.fillRect(cx - 1, cy + 6, 3, 17);
        c.fillStyle = palette.rim; c.fillRect(cx, cy + 9, 1, 5); c.fillRect(cx - 1, cy + 10, 3, 1);
      }
    }
  }

  terrainImage(e, obstacle, shape, top, palette) {
    const identity = this.identity;
    const key = `${identity.id}:${obstacle.sectionId || ''}:${obstacle.id}:${top ? 'top' : 'floor'}:${this.buffer.height}`;
    const cached = this.terrainCache.get(key);
    if (cached) return cached;
    const s = this.scale, minX = Math.min(...shape.map(p => p[0]));
    const maxX = Math.max(...shape.map(p => p[0]));
    // Closing faces extend deep beyond the playfield. Bake only the band that
    // can enter the viewport, including the obstacle's entire sway envelope.
    const anchor = obstacle.center + (top ? -1 : 1) * obstacle.gap / 2;
    const margin = Math.abs(obstacle.motion || 0) + 4 / s;
    const minY = Math.max(Math.min(...shape.map(p => p[1])), -anchor - margin);
    const maxY = Math.max(minY, Math.min(Math.max(...shape.map(p => p[1])), e.height - anchor + margin));
    const canvas = this.document.createElement('canvas');
    canvas.width = Math.ceil((maxX - minX) * s) + 4; canvas.height = Math.ceil((maxY - minY) * s) + 4;
    const c = canvas.getContext('2d', { willReadFrequently: true }), ox = 2 - minX * s, oy = 2 - minY * s;
    c.imageSmoothingEnabled = false;
    path(c, shape, ox, oy, s); c.fillStyle = palette.stone; c.fill();
    c.save(); c.clip();
    const surface = shape.slice(2).reverse().map(([x, y]) => [Math.round(x * s + ox), Math.round(y * s + oy)]);
    const section = e.layout.sections?.find(item => item.id === obstacle.sectionId);
    const hardEntry = Boolean(section?.hard && e.layout.obstacles.find(item => item.sectionId === section.id) === obstacle);
    drawIdentityMaterial(c, { identity, surface, top, palette, width: canvas.width,
      height: canvas.height, obstacle, hardEntry }, { line: pixelLine, polygon: path });
    const inward = top ? -1 : 1;
    // Contact edges are drawn once, from the exposed union, after all ground
    // pieces. A cached source polygon must never expose a buried join.
    if (obstacle.soft) {
      // Shatter Wake's convertible brambles stay inside the real silhouette but
      // carry a distinct dry-vine weave and a few dormant amber thorn tips.
      for (let i = 5; i < surface.length - 3; i += 9) {
        const [x, y] = surface[i];
        pixelLine(c, x - 3, y + inward * 4, x + 3, y + inward * 17, '#785e42', 2);
        pixelLine(c, x + 2, y + inward * 8, x + 7, y + inward * 5, '#785e42');
        pixelLine(c, x, y + inward * 12, x - 5, y + inward * 10, '#785e42');
        c.fillStyle = '#be9356'; c.fillRect(x + 6, y + inward * 5, 1, 1);
      }
    }
    c.restore();
    const item = { canvas, x: minX, y: minY, pad: 2 };
    this.terrainCache.set(key, item);
    while (this.terrainCache.size > 18) {
      const oldest = this.terrainCache.keys().next().value;
      this.terrainCache.get(oldest).canvas.width = 1; this.terrainCache.delete(oldest);
    }
    return item;
  }

  drawTerrain(e, t, distance, palette) {
    const c = this.bufferContext, s = this.scale;
    for (const obstacle of this.visibleObstacles) {
      if (obstacle.destroyed || obstacle.x + obstacle.width * 2.5 < distance - 10 || obstacle.x - obstacle.width > distance + e.width + 10) continue;
      // These are the simulation's exact local collider polygons and animated
      // center; cached art avoids allocating transformed vertex arrays per frame.
      const center = obstacle.center + Math.sin(t * .9 + obstacle.phase) * obstacle.motion;
      for (const top of SIDES) {
        const shape = top ? obstacle.topShape : obstacle.bottomShape;
        if (!shape?.length) continue;
        const item = this.terrainImage(e, obstacle, spacetimeBaseShape(shape), top, palette);
        const x=Math.round((obstacle.x + item.x) * s) - Math.round(distance * s) - item.pad,
          y=Math.round((center + (top ? -1 : 1) * obstacle.gap / 2 + item.y) * s) - item.pad;
        if(!shape.spacetime||!drawSpacetimeTerrain(c,item,shape,{scale:s,x,y,path,fill:palette.stone}))c.drawImage(item.canvas,x,y);
      }
    }
  }

  drawSceneProps(e, t, distance) {
    const c = this.bufferContext, s = this.scale, identity = this.identity;
    for (const obstacle of this.visibleObstacles) {
      if (obstacle.destroyed || !obstacle.sceneProps?.length
        || obstacle.x + obstacle.width * 2.5 < distance - 10
        || obstacle.x - obstacle.width > distance + e.width + 10) continue;
      // Props share the parent's exact local anchor and sway, never an
      // independently animated silhouette that could drift off its collider.
      const center = obstacle.center + Math.sin(t * .9 + obstacle.phase) * obstacle.motion;
      for (const prop of obstacle.sceneProps) {
        const bounds = this.getPropBounds(prop), side = prop.side === -1 ? -1 : 1;
        const anchorY = center + side * obstacle.gap / 2;
        if ((obstacle.x - distance + bounds.maxX) * s < -2 || (obstacle.x - distance + bounds.minX) * s > this.buffer.width + 2
          || (anchorY + bounds.maxY) * s < -2 || (anchorY + bounds.minY) * s > this.buffer.height + 2) continue;
        const key = `${identity.id}:${obstacle.id}:${prop.id}`;
        let item = this.scenePropCache.get(key);
        if (!item || item.prop !== prop || item.scale !== s) {
          if (item) { item.canvas.width = 1; item.canvas.height = 1; }
          item = createScenePropArt(this.document, prop, { scale: s, terrain: e.terrain, identity: identity.id });
          if (!item) continue;
          this.scenePropCache.set(key, item);
          while (this.scenePropCache.size > 24) {
            const oldest = this.scenePropCache.keys().next().value;
            const unused = this.scenePropCache.get(oldest);
            unused.canvas.width = 1; unused.canvas.height = 1;
            this.scenePropCache.delete(oldest);
          }
        }
        const x = Math.round((obstacle.x + item.x) * s) - Math.round(distance * s) - item.pad;
        const y = Math.round((center + side * obstacle.gap / 2 + item.y) * s) - item.pad;
        if (x + item.canvas.width < 0 || x > this.buffer.width || y + item.canvas.height < 0 || y > this.buffer.height) continue;
        c.drawImage(item.canvas, x, y);
      }
    }
  }

  drawScenePropContacts(e,t,distance){
    if(!isContactEdgeStyle(e.boundaryStyle))return;
    const c=this.bufferContext,s=this.scale,camera=Math.round(distance*s),profiles=terrainBoundary(e,t).profiles;
    const broad=['carved','spectral','roots','fracture'].includes(e.boundaryStyle);
    const options={scale:s,playerX:Math.round(e.player.x*s),playerY:Math.round(yOf(e)*s),time:t,style:e.boundaryStyle,reducedMotion:e.reducedMotion,palette:this.contactEdgePalette,line:pixelLine};
    for(const obstacle of this.visibleObstacles){
      if(obstacle.destroyed||!obstacle.sceneProps?.length)continue;
      const center=obstacle.center+Math.sin(t*.9+(obstacle.phase||0))*(obstacle.motion||0);
      for(const prop of obstacle.sceneProps){
        const bounds=this.getPropBounds(prop),anchor=center+prop.side*obstacle.gap/2;
        if(obstacle.x+bounds.maxX<distance-4||obstacle.x+bounds.minX>distance+e.width+4||anchor+bounds.maxY<0||anchor+bounds.minY>e.height)continue;
        let seams;
        if(broad){
          seams=[];c.save();c.beginPath();
          // Consistent winding makes nonzero clipping the union, including
          // overlapping authored faces whose source polygons wind oppositely.
          for(const part of prop.parts){
            const polygon=part.polygon;let area=0;
            for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];area+=a[0]*b[1]-b[0]*a[1];}
            for(let i=0;i<polygon.length;i++){
              const point=polygon[area<0?polygon.length-1-i:i],x=Math.round((obstacle.x+point[0])*s)-camera,y=Math.round((anchor+point[1])*s);
              if(i===0)c.moveTo(x,y);else c.lineTo(x,y);
            }
            c.closePath();
          }
          c.clip('nonzero');
        }
        for(const edge of propContacts(prop,e.height)){
          const ax=obstacle.x+edge.a[0],ay=anchor+edge.a[1],dx=edge.b[0]-edge.a[0],dy=edge.b[1]-edge.a[1];
          const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))*s));
          let start=-1;
          options.inward=edge.inward;
          // Clip exposed runs at raster resolution against the current terrain
          // union, including moving roofs/floors. Buried roots never get rims.
          for(let i=0;i<=steps;i++){
            const f=Math.min(1,(i+.5)/steps),x=ax+dx*f,y=ay+dy*f;
            const exposed=i<steps&&x>=distance-3&&x<=distance+e.width+3&&y>=-3&&y<=e.height+3&&!terrainCovers(profiles,x,y);
            if(exposed&&start<0)start=i;
            if(!exposed&&start>=0){
              const lo=start/steps,hi=i/steps;
              options.worldAx=ax+dx*lo;options.worldAy=ay+dy*lo;
              options.x=Math.round(options.worldAx*s)-camera;options.y=Math.round(options.worldAy*s);
              options.xx=Math.round((ax+dx*hi)*s)-camera;options.yy=Math.round((ay+dy*hi)*s);
              paintContactEdge(c,options);
              if(broad)seams.push([options.x,options.y,options.xx,options.yy]);
              start=-1;
            }
          }
        }
        if(broad){
          c.restore();
          // Keep the exact contact readable outside the decorative clip,
          // including narrow branches and outermost raster boundary pixels.
          const ink=contactEdgeInk(e.boundaryStyle,this.contactEdgePalette);
          for(const [x,y,xx,yy]of seams)pixelLine(c,x,y,xx,yy,ink,1);
        }
      }
    }
  }

  getPropBounds(prop) {
    let bounds = this.propBounds.get(prop);
    if (bounds) return bounds;
    bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const part of prop.parts || []) for (const point of part.polygon || []) {
      bounds.minX = Math.min(bounds.minX, point[0]); bounds.maxX = Math.max(bounds.maxX, point[0]);
      bounds.minY = Math.min(bounds.minY, point[1]); bounds.maxY = Math.max(bounds.maxY, point[1]);
    }
    this.propBounds.set(prop, bounds); return bounds;
  }

  prewarmSurfaces(e, distance) {
    // At most one future surface per frame. This stays a small, bounded window
    // ahead of the viewport rather than allocating an entire expedition.
    const end = distance + e.width + Math.min(500, Math.max(320, (e.baseSpeed || 154) * 3));
    const obstacles = e.layout.obstacles, palette = this.palette, identity = this.identity;
    for (let i = this.obstacleCursor; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      if (obstacle.x - obstacle.width > end) break;
      if (obstacle.destroyed || obstacle.x + obstacle.width * 2.5 < distance - 24) continue;
      for (const top of SIDES) {
        const shape = top ? obstacle.topShape : obstacle.bottomShape;
        if (!shape?.length) continue;
        const key = `${identity.id}:${obstacle.sectionId || ''}:${obstacle.id}:${top ? 'top' : 'floor'}:${this.buffer.height}`;
        if (!this.terrainCache.has(key)) { this.terrainImage(e, obstacle, spacetimeBaseShape(shape), top, palette); return; }
      }
      const center = obstacle.center + Math.sin(timeOf(e) * .9 + obstacle.phase) * obstacle.motion;
      for (const prop of obstacle.sceneProps || []) {
        const bounds = this.getPropBounds(prop), anchorY = center + (prop.side === -1 ? -1 : 1) * obstacle.gap / 2;
        if ((anchorY + bounds.maxY) * this.scale < -2 || (anchorY + bounds.minY) * this.scale > this.buffer.height + 2) continue;
        const key = `${identity.id}:${obstacle.id}:${prop.id}`;
        if (this.scenePropCache.has(key)) continue;
        const item = createScenePropArt(this.document, prop, { scale: this.scale, terrain: e.terrain, identity: identity.id });
        if (item) {
          this.scenePropCache.set(key, item);
          while (this.scenePropCache.size > 24) { const oldest = this.scenePropCache.keys().next().value; this.scenePropCache.get(oldest).canvas.width = 1; this.scenePropCache.delete(oldest); }
        }
        return;
      }
    }
  }

  drawCollectibles(e, t, distance) {
    const s = this.scale,light=renderLightState(e);
    for (const ember of e.layout.embers) {
      if (ember.collected || ember.carried) continue;
      const x = (ember.x - distance) * s, y = ember.y * s;
      if (x > this.buffer.width + (e.height*.4+32)*s || x < -(e.height*.4+32)*s) continue;
      const margin = (sparkBodyRadius(ember,e.height)*1.5 + 8)*s;
      if (x < -margin || x > this.buffer.width + margin) continue;
      const hook=pickupHookAnchor(ember,x/s,ember.y);
      const handling=e.hasCompanion?.('collector')===true&&lightVisibility(e,light,hook.x,hook.y,yOf(e))>0
        ?{packet:ember,modifiers:e.mod,collector:true}:null;
      this.drawPacket(x, y, { kind: pickupKind(ember), time: e.captureTime ?? t, phase: ember.phase, reducedMotion: e.reducedMotion,
        scale: s*sparkArtScale(ember,e.height), massTier:sparkMass(ember),
        handling });
      // The real successful Harvest crossing owns this brief, stationary cue.
      // Draw in the same pixel buffer as the pickup, before ordinary fog masking.
      if(ember.harvestFlashUntil>e.time){
        const c=this.bufferContext;
        c.save();c.strokeStyle='#edffd0';c.globalAlpha=Math.min(1,(ember.harvestFlashUntil-e.time)*3);c.lineWidth=Math.max(1,3*s);
        c.beginPath();c.arc(x,y,margin+5*s,0,Math.PI*2);c.stroke();c.restore();
      }
    }
  }

  drawPacket(x, y, { kind, dark = false, rich = false, tiny = false, bodyOnly = false, massTier, alpha = 1,
    time = 0, phase = 0, reducedMotion = false, scale = this.scale,handling=null } = {}) {
    drawPickup(this.bufferContext, x, y, { kind: kind || (dark ? 'dark' : rich ? 'cache' : 'light'),
      time, phase, reducedMotion, tiny, bodyOnly, massTier, alpha, scale,handling });
  }

  drawBurstEffects(e, tint) {
    const c = this.bufferContext, s = this.scale;
    const particles = e.particles || [];
    for (let i = Math.max(0, particles.length - 72); i < particles.length; i++) {
      const p = particles[i];
      if(p.type==='shell-puff'){
        const age=(e.captureTime ?? timeOf(e))-p.bornAt;
        c.globalAlpha=1;
        drawShellPuff(c,(p.worldX-distanceOf(e))*s,p.y*s,p.radius*s,age,p.kind,p.phase,e.reducedMotion);
        drawShellArcs(c,e.player.x*s,yOf(e)*s,s,age,p.kind,p.phase,e.reducedMotion,11*(this.wispRasterScale??1));
        continue;
      }
      c.globalAlpha = clamp(p.life / p.maxLife, 0, 1) * .7;
      c.fillStyle = p.type === 'spark' ? tint.core : tint.outer;
      c.fillRect(Math.round(p.x * s), Math.round(p.y * s), p.type === 'spark' ? 2 : 1, 1);
    }
    c.globalAlpha = 1;
  }

  updateVisible(e, distance) {
    const obstacles = e.layout.obstacles, list = this.visibleObstacles;
    if (distance < this.lastVisibleDistance) this.obstacleCursor = 0;
    this.lastVisibleDistance = distance;
    while (this.obstacleCursor < obstacles.length) {
      const o = obstacles[this.obstacleCursor];
      if (o.x + o.width * 2.5 >= distance - 24) break;
      this.obstacleCursor++;
    }
    list.length = 0;
    for (let i = this.obstacleCursor; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (o.x > distance + e.width + 800) break;
      if (!o.destroyed && o.x + o.width * 2.5 >= distance - 24 && o.x - o.width <= distance + e.width + 24) list.push(o);
    }
  }

  lightMask() {
    return this.maskCanvas??=createLightMaskCanvas(this.document);
  }

  lightFog(e, fleet, playerX, playerY) {
    const c = this.bufferContext, f = this.fogContext, W = this.buffer.width, H = this.buffer.height, s = this.scale;
    const light = renderLightState(e);
    this.currentLightState = light;
    const baseRadius = Number(light.baseRadius) || Number(e.mod?.lightRadius) || 145;
    this.lightRadius = Math.max(24, Number(light.radius) || baseRadius);
    this.lightIntensity = clamp(Number.isFinite(light.intensity) ? light.intensity : 1, 0, 1);
    this.lightDimScale = clamp(this.lightRadius / baseRadius, .6, 1);
    if (light.rehearsing) return;
    f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.globalAlpha = 1;
    f.clearRect(0, 0, W, H); f.fillStyle = '#000000'; f.fillRect(0, 0, W, H);
    f.globalCompositeOperation = 'destination-out';
    const mask = this.lightMask();
    // Baseline light is circular. Forward scouting is earned through skills,
    // the Flash Powerup and artifacts.
    castTerrainLight(f,mask,e,{x:playerX/s,y:playerY/s,radius:this.lightRadius,alpha:this.lightIntensity,scale:s,channel:'main'});
    const forward = light.forwardLight || e.forwardLight;
    if (forward?.active && forward.radius > 0) {
      castTerrainLight(f,mask,e,{x:Number.isFinite(forward.screenX)?forward.screenX:forward.x,y:forward.y+yOf(e)-e.player.y,
        radius:forward.radius,alpha:clamp((forward.intensity??1)*this.lightIntensity,0,1),scale:s,channel:'forward'});
    }
    if(light.landmarkLight){const lamp=light.landmarkLight;
      castTerrainLight(f,mask,e,{x:lamp.x,y:lamp.y,radius:lamp.radius,alpha:lamp.intensity,scale:s,channel:'landmark'});}
    castFlightFlashLights(f,mask,e,light,s,distanceOf(e),yOf(e));
    revealLuminanceWaves(f,e,{distance:distanceOf(e),scale:s});
    revealLanternWake(f,e,{distance:distanceOf(e),playerY:yOf(e),scale:s,light});
    for (let i = 0; i < fleet.length && i < 3; i++) {
      const orb=fleet[i],glow=companionTerrainLight(orb,this.lightDimScale,this.lightIntensity);
      castTerrainLight(f,mask,e,{x:orb.x,y:orb.y,...glow,scale:s,channel:`fleet${i}`});
    }
    f.globalAlpha = 1; f.globalCompositeOperation = 'source-over';
    const reveal=e.completionProgress||0;
    c.globalAlpha=(1-reveal*reveal*(3-2*reveal))*(1-sceneRevealStrength(light));
    c.drawImage(this.fog, 0, 0);c.globalAlpha=1;
  }

  glow(x, y, radius, ink, strength = .12) {
    const c = this.bufferContext;
    let sprite = this.glowCache.get(ink);
    if (!sprite) {
      sprite = this.document.createElement('canvas'); sprite.width = sprite.height = 128;
      const g = sprite.getContext('2d'), gradient = g.createRadialGradient(64, 64, 0, 64, 64, 63);
      gradient.addColorStop(0, ink); gradient.addColorStop(.26, ink + 'b0');
      gradient.addColorStop(.60, ink + '45'); gradient.addColorStop(1, ink + '00');
      g.fillStyle = gradient; g.fillRect(0, 0, 128, 128);
      this.glowCache.set(ink, sprite);
      while (this.glowCache.size > 24) {
        const first = this.glowCache.keys().next().value;
        this.glowCache.get(first).width = 1; this.glowCache.delete(first);
      }
    }
    c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = strength;
    c.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2); c.restore();
  }

  orbSprite(role) {
    const key = 'orb:' + role;
    let canvas = this.spriteCache.get(key);
    if (canvas) return canvas;
    canvas = makeCompanionSprite(this.document,role);
    this.spriteCache.set(key, canvas);
    return canvas;
  }

  mainSprite(fuel) {
    const band = Math.round(clamp(fuel, 0, 1) * 32), key = 'main:' + band;
    let canvas = this.spriteCache.get(key);
    if (canvas) return canvas;
    canvas = makeWispSprite(this.document, band);
    this.spriteCache.set(key, canvas);
    return canvas;
  }

  drawMain(e, t, x, y) {
    const c = this.bufferContext, fuel = clamp((e.visibleGlow ?? e.flame ?? 100) / (e.maxFlame||100), 0, 1);
    const bodyScale=.85*(this.wispRasterScale??1);
    c.save();c.translate(x,y);c.scale(bodyScale,bodyScale);c.translate(-x,-y);
    const dying = e.dying === true || (e.dyingProgress > 0 && fuel <= 0);
    const progress = dying ? clamp(e.dyingProgress || 0, 0, 1) : 0;
    if(dying && e.deathCause==='collision') {
      const sprite=this.mainSprite(fuel),scatter=e.reducedMotion?3:42;
      this.glow(x,y,31*(1-progress*.7),MAIN_LIGHT.outer,.3*(1-progress));
      c.save();
      // Break the cached pixel body into tiles: no sprite creation or particle
      // allocation in the two-second animation loop.
      for(let row=0;row<6;row++)for(let col=0;col<6;col++){
        const seed=hash(col,row,17),age=clamp((progress-seed*.16)/.84,0,1);
        const angle=Math.atan2(row-2.5,col-2.5)+seed*.45;
        const travel=age*(.3+seed*.7)*scatter;
        c.globalAlpha=Math.max(0,1-age**1.3);
        const size=Math.max(1,Math.ceil(6*(1-age*.8)));
        c.drawImage(sprite,col*6,row*6,6,6,
          Math.round(x-18+col*6+Math.cos(angle)*travel),
          Math.round(y-18+row*6+Math.sin(angle)*travel+age*age*(e.reducedMotion?0:14)),size,size);
      }
      c.restore();c.restore();return;
    }
    const tapAge = t - (e.lastFlapTime ?? -1000), tap = clamp(1 - tapAge / .16, 0, 1);
    const breath = e.reducedMotion ? 0 : Math.sin(t * 2.3) * .005;
    const size = (1 + breath + tap * .025) * (1 - progress ** 1.35);
    const power = (this.lightIntensity || 1) * (dying ? 1 - progress * .85 : .76 + fuel * .24);
    this.glow(x, y, (24 + fuel * 7) * Math.max(.1, size), MAIN_LIGHT.outer, .29 * power);
    c.save(); c.globalAlpha = power;
    if(e.dream?.mode==='record')c.globalAlpha*=e.reducedMotion?.48:.46+.09*Math.sin(t*3);
    if (size > .02) c.drawImage(this.mainSprite(fuel), x - 18 * size, y - 18 * size, 36 * size, 36 * size);
    if (dying && progress > .25 && !e.reducedMotion) {
      c.fillStyle = '#f7f5d8'; c.globalAlpha = (1 - progress) ** 1.5;
      for (let i = 0; i < 5; i++) {
        const angle = i * TAU / 5 + .4, r = 5 + progress * 10;
        const dot = Math.max(.3, 1.8 * (1 - progress));
        c.fillRect(x + Math.cos(angle) * r, y + Math.sin(angle) * r, dot, dot);
      }
    }
    if(!dying&&e.mod.mainKindler&&e.kindlerPulse>0){
      const pulse=clamp(e.kindlerPulse/.9,0,1),r=14+(1-pulse)*9;
      c.fillStyle='#efbcc3';c.globalAlpha=pulse*.55;
      for(let i=0;i<6;i++){const a=i*TAU/6+(e.reducedMotion?0:t*.4);c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r),1,1);}
    }
    if(!dying&&e.mod.mainSeer&&e.mainSeerUntil>e.time){
      const strength=clamp((e.time-e.mainSeerStartedAt)/.25,0,1)*clamp((e.mainSeerUntil-e.time)/.4,0,1);
      c.fillStyle='#d2bce8';c.globalAlpha=strength*.45;
      for(let i=0;i<3;i++){const step=e.reducedMotion?i/3:(t*.8+i/3)%1;c.fillRect(Math.round(x+17+step*20),Math.round(y+Math.sin(step*Math.PI)*3-2),2,1);}
    }
    if(!dying&&e.artifactEffects?.freeLift){
      c.fillStyle='#f5db92';c.globalAlpha=.8;
      // Three gold stitches travel close to the shell while a free Lift waits.
      for(let i=0;i<3;i++){const a=i*TAU/3+(e.reducedMotion?0:t*.9);c.fillRect(Math.round(x+Math.cos(a)*14),Math.round(y+Math.sin(a)*14),2,1);}
    }
    c.restore();c.restore();
  }

  drawProtector(e, t, x, y) {
    const shield = e.getShieldState?.() || e.shield;
    if (!shield?.lightAegis && !(shield?.layers>=1)) return;
    const c = this.bufferContext, layers = Math.min(3, shield.layers||0), charges = Math.max(0, shield.charges || 0);
    const hit = clamp(shield.hitFlash || 0, 0, 1), total = Math.max(.1, shield.recoveryTotal || 1);
    const recovery = clamp(1 - (shield.recovery || 0) / total, 0, 1);
    c.save();
    const scale=this.wispRasterScale??1;
    c.translate(x,y);c.scale(scale,scale);c.translate(-x,-y);
    if(shield.lightAegis){c.strokeStyle='#e6f8ff';c.lineWidth=1.5;c.globalAlpha=.75+.2*Math.sin(t*5);c.beginPath();c.arc(x,y,21,0,TAU);c.stroke();}
    for (let i = 0; i < layers; i++) {
      const radius = 16.5 + i * 2, charged = i < charges, rebuilding = i === charges;
      c.lineWidth = charged ? 1.5 : 1;
      c.strokeStyle = hit > .05 ? '#e3f5ff' : charged ? '#8ab9e4' : '#6c9fc4';
      // Repaired segments are intermittent until the charge is complete.
      for(let segment=0;segment<20;segment++){
        const built=charged||rebuilding&&segment/20<recovery;
        const shimmer=e.reducedMotion?1:.65+.35*Math.sin(t*12+segment*1.7)**2;
        c.globalAlpha=(charged?.70:built?.38*shimmer:.065)*(this.lightIntensity||1);
        const a=-Math.PI/2+segment*TAU/20;
        c.beginPath();c.arc(x,y,radius,a,a+TAU/20*(charged?.94:.64));c.stroke();
      }
      if(rebuilding){
        const a=-Math.PI/2+recovery*TAU,wx=x+Math.cos(a)*radius,wy=y+Math.sin(a)*radius;
        c.globalAlpha=.85;c.fillStyle='#e6f6ff';c.fillRect(Math.round(wx)-1,Math.round(wy)-1,2,2);
        if(!e.reducedMotion)for(let spark=0;spark<4;spark++){
          const age=(t*3+spark/4)%1,theta=a+(spark-1.5)*.8;
          c.globalAlpha=(1-age)*.8;c.fillRect(Math.round(wx+Math.cos(theta)*age*8),Math.round(wy+Math.sin(theta)*age*8),1,1);
        }
      }
    }
    if (hit > .02) {
      c.globalAlpha = hit * .8; c.strokeStyle = '#d9f1ff'; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3 + .2;
        c.beginPath(); c.moveTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16);
        c.lineTo(x + Math.cos(a + .09) * 20, y + Math.sin(a + .09) * 20);
        c.lineTo(x + Math.cos(a - .07) * 23, y + Math.sin(a - .07) * 23); c.stroke();
      }
    }
    c.restore();
  }

  drawFleet(e, t, fleet, pass='all') {
    const c = this.bufferContext, s = this.scale;
    for (let i = 0; i < fleet.length && i < 3; i++) {
      const state = fleet[i], role = normalizeCompanionRole(state.role || state.id), tint = companionPalette(role);
      const collector = role === 'collector', cooling = collector && (state.phase === 'cooldown'||state.phase==='guard-recovery');
      const front=collector&&(state.depth||0)>0;if(pass==='front'&&!front||pass==='back'&&front)continue;
      const depthScale=collector?.95+(state.depth||0)*.25:1;
      const x = state.x * s, y = state.y * s;
      const recovery = clamp(state.recovery ?? 1, 0, 1);
      const intensity = (cooling ? .7 + recovery * .25 : 1) * (collector?.82+(state.depth||0)*.18:1) * (this.lightIntensity || 1);
      this.glow(x, y, collector ? 11 : 12, tint.outer, intensity * .21);
      const sprite = this.orbSprite(role);
      c.globalAlpha = intensity;
      if(collector)c.drawImage(sprite,x-5*depthScale,y-5*depthScale,10*depthScale,10*depthScale);else c.drawImage(sprite, x - 6, y - 6,13,13);
      c.globalAlpha = 1;
      const px=e.player.x*s,py=yOf(e)*s,clock=e.reducedMotion?0:t;
      c.save();c.strokeStyle=tint.core;c.fillStyle=tint.bright;c.lineWidth=1;
      if(role==='protector'&&state.charges<state.layers){
        const a=state.weldAngle??(-Math.PI/2+(1-state.recovery/state.recoveryTotal)*TAU),r=16.5+state.charges*2;
        c.globalAlpha=e.reducedMotion?.5:.45+.3*Math.sin(clock*21)**2;c.beginPath();
        c.moveTo(x,y);c.lineTo(px+Math.cos(a)*r,py+Math.sin(a)*r);c.stroke();
      }
      if(state.active&&role==='swift'){
        for(let j=0;j<3;j++){const phase=(clock*4+j/3)%1;c.globalAlpha=(1-phase)*.6*intensity;
          const offset=(j-1)*5;c.beginPath();c.moveTo(x-8-phase*10,y+offset);c.lineTo(x-3-phase*10,y+offset);c.stroke();}
      }
      if(state.active&&role==='leveler'){
        for(let j=0;j<3;j++){const phase=(clock*1.7+j/3)%1;c.globalAlpha=(1-phase)*.45;
          c.beginPath();c.ellipse(px,py+10+phase*11,10+phase*7,2.4,0,0,TAU);c.stroke();}
      }
      if(state.active&&role==='seer'){
        const aim=e.reducedMotion?0:Math.sin(clock*2.8)*.45;c.globalAlpha=.38;
        c.beginPath();c.arc(x,y,12,aim-.45,aim+.45);c.arc(x,y,19,aim-.32,aim+.32);c.stroke();
        c.globalAlpha=.25;c.beginPath();c.moveTo(x+5,y);c.lineTo(x+24*Math.cos(aim),y+24*Math.sin(aim));c.stroke();
      }
      if(role==='kindler'){
        const pulse=state.procFlash||0;
        for(let j=0;j<3;j++){const a=clock*2.6+j*TAU/3,r=8+Math.sin(clock*3+j)*1.5+pulse*4;
          c.globalAlpha=(.32+pulse*.55)*intensity;c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r),1+pulse,1+pulse);}
        if(pulse>0){c.globalAlpha=pulse*.5;c.beginPath();c.arc(px,py,12+(1-pulse)*10,0,TAU);c.stroke();}
      }
      c.restore();
    }
    if(e.hasCompanion?.('leveler')){
      const level=e.getLevelerState(),px=e.player.x*s,py=yOf(e)*s,charge=clamp(level.charge/Math.max(.001,level.capacity),0,1);
      c.save();c.globalAlpha=level.active?.85:.45;c.fillStyle='#244847';c.fillRect(Math.round(px)-10,Math.round(py)+19,20,2);
      c.fillStyle='#a7e8df';c.fillRect(Math.round(px)-10,Math.round(py)+19,Math.round(20*charge),2);c.restore();
    }
  }

  drawAbsorptions(e, t) {
    for (const effect of e.absorptionEffects || []) {
      drawCapture(this.bufferContext,effect,e.captureTime ?? t,e.player.x,yOf(e),distanceOf(e),this.scale,e.reducedMotion,11*(this.wispRasterScale??1));
    }
  }

  drawWind(e, t, lightState) {
    const puffs = e.getDraftPuffs?.(t) || [];
    if (!puffs.length) return;
    const c = this.bufferContext, H = this.buffer.height, s = this.scale;
    const light=this.currentLightState||e.getLightState?.()||{};
    const carrier = lightState;
    const carrierX = (carrier?.x ?? e.player.x) * s, carrierY = (carrier?.y ?? yOf(e)) * s;
    const carrierRadius = (carrier?.phase === 'cooldown' ? 13 + carrier.recovery * 7 : 26) * ART_SCALE * (this.lightDimScale || 1);
    const visibility = (x, y) => {
      const carrierDistance = ((x - carrierX) ** 2 + (y - carrierY) ** 2) / (carrierRadius * carrierRadius);
      const lit = Math.max(lightVisibility(e,light,x/s,y/s,yOf(e)),
        carrier ? lightAttenuation(carrierDistance)*.75*(this.lightIntensity||1) : 0);
      return lit;
    };
    for (const puff of puffs) {
      if (![puff.x, puff.y, puff.rx, puff.ry].every(Number.isFinite)) continue;
      const x = (puff.x - distanceOf(e)) * s, y = puff.y * s;
      const rx = puff.rx * s, ry = puff.ry * s;
      if (rx <= 0 || ry <= 0 || x + rx < -2 || x - rx > this.buffer.width + 2 || y + ry < 0 || y - ry > H) continue;
      const progress = clamp(Number(puff.progress) || 0, 0, 1);
      const power = clamp(Number(puff.strength) || 0, 0, 1);
      const opacity = clamp(Number.isFinite(puff.opacity) ? puff.opacity : 1, 0, 1);
      const warning = puff.phase === 'warning' || puff.phase === 'gather';
      const fading = puff.phase === 'fade' || puff.phase === 'fading';
      if (!opacity || puff.phase === 'idle' || puff.phase === 'spent') continue;
      const direction = puff.direction < 0 ? -1 : 1;
      const expansion = e.reducedMotion ? .94 : warning ? .66 + progress * .28 : .87 + progress * .10;
      const drift = e.reducedMotion ? 0 : (progress - .5) * ry * (warning ? .22 : .86) * direction;
      const fade = fading ? 1 - progress : 1;
      const baseAlpha = opacity * fade * (warning ? .22 + progress * .12 : .34 + power * .26);
      const ink = warning ? (this.palette.grain || '#bcc7af') : (this.palette.rim || '#c1d9d0');
      c.save();
      // Exactly the physical field bounds, used only as a clip. There is no
      // drawn ellipse/range ring, solid AOE panel or whole-screen weather.
      c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.clip();
      const segment = (a, b, alpha = 1, bold = false) => {
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const edge = clamp((1 - ((mx - x) / rx) ** 2 - ((my - y) / ry) ** 2) / .48, 0, 1);
        c.globalAlpha = baseAlpha * edge * visibility(mx, my) * alpha;
        if (c.globalAlpha > .008) pixelLine(c, ...a, ...b, ink, bold ? 2 : 1);
      };
      // A few curls gather first; travelling chips make the live push legible.
      // Fewer curved segments than the old seven-coil field keep this bounded.
      const curls = [[-.50, -.24], [.10, -.54], [.48, -.08], [-.20, .40]];
      for (let i = 0; i < curls.length; i++) {
        const [u, v] = curls[i], cx = x + u * rx * expansion, cy = y + v * ry * expansion + drift;
        const turn = e.reducedMotion ? i * .7 : i * .7 + progress * direction * .65;
        const coilX = rx * (i < 5 ? .27 : .20) * expansion;
        const coilY = ry * (i < 5 ? .16 : .10) * expansion;
        let previous;
        for (let step = 0; step <= 8; step++) {
          const angle = turn + step / 8 * Math.PI * 1.35;
          const taper = 1 - step / 8 * .42;
          const point = [cx + Math.cos(angle) * coilX * taper, cy + Math.sin(angle) * coilY * taper];
          if (previous) segment(previous, point, i < 5 ? 1 : .6, !warning && i < 3 && power > .3);
          previous = point;
        }
      }
      for(let i=0;i<12;i++){
        const u=Math.sin(i*2.399)*.78;
        const travel=e.reducedMotion ? (i*.137)%1 : (i*.137+t*(warning?.16:1.1))%1;
        const xx=x+u*rx,yy=y+direction*(travel*2-1)*ry*.88;
        const edge=Math.max(0,1-u*u-((yy-y)/ry)**2);
        c.globalAlpha=opacity*fade*edge*visibility(xx,yy)*(warning?.32:.8);
        c.fillStyle=ink;c.fillRect(Math.round(xx),Math.round(yy),warning?1:2,warning?2:4+Math.round(power*4));
      }
      const arrowX = x + rx * .15, arrowY = y - direction * ry * .12;
      const arrows = warning ? 1 : power > .7 ? 3 : 2;
      for (let i = 0; i < arrows; i++) {
        const yy = arrowY + direction * i * 9;
        c.globalAlpha = opacity * fade * visibility(arrowX, yy) * (warning ? .48 : .76);
        const size = warning ? 1 : 2;
        pixelLine(c, arrowX, yy - direction * 6, arrowX, yy + direction * 2, ink, size);
        pixelLine(c, arrowX - 4, yy - direction * 2, arrowX, yy + direction * 2, ink, size);
        pixelLine(c, arrowX, yy + direction * 2, arrowX + 4, yy - direction * 2, ink, size);
      }
      c.restore();
    }
  }

  drawPortal(e,t) {
    drawExitLandmark(this.bufferContext,{refuge:e.getExitLandmark?.(),scale:this.scale,
      terrain:e.terrain,time:t,reducedMotion:e.reducedMotion});
  }

  render(e = this.engine) {
    if (!this.ready || this.destroyed || !this.context) return;
    const c = this.bufferContext, t = timeOf(e), distance = distanceOf(e), s = this.scale;
    const identity = this.identity, palette = this.palette;
    const rehearsing = e.dream?.mode === 'record';
    beginTerrainBoundaryFrame(e,t,distance);
    try {
    if (this.canvas.dataset.levelIdentity !== identity.id) this.canvas.dataset.levelIdentity = identity.id;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    this.updateVisible(e, distance);
    this.drawSky(e, t, distance, palette);
    // Authored parallax supplies the major depth layers in the new art pass.
    c.globalAlpha = rehearsing ? .1 : .34; c.fillStyle = '#03080b'; c.fillRect(0, 0, this.buffer.width, this.buffer.height); c.globalAlpha = 1;
    const boss = this.bossOptions; boss.height = this.buffer.height; boss.distance = distance; boss.time = t; boss.scale = s; boss.pass = 'silhouette';
    drawHabitatBackdrop(c,e,{scale:s,distance,time:t});
    drawCourseArt(c,e,{scale:s,distance});
    drawNearLandscape(c,e,{scale:s,distance});
    drawCourseArt(c,e,{scale:s,distance,pass:'near'});
    drawFlightForkBackdrops(c,e,{distance,scale:s});
    // The world-anchored guardian stays behind solid ground, but is no longer
    // buried under opaque background layers or the new course landmarks.
    drawBoss(c, boss);
    drawGuardianPresence(c,{engine:e,width:this.buffer.width,height:this.buffer.height,distance,time:t});
    this.drawTerrain(e, t, distance, palette);
    boss.pass = 'hands'; drawBoss(c, boss);
    this.drawSceneProps(e, t, distance);
    drawTerrainEcology(c,e,{scale:s,distance,time:t});
    if(e.boundaryStyle==='spectral'&&this.edgeRasterEnabled!==false){
      const edge=this.contactEdgeRaster??=new ContactEdgeRaster(this.document);
      edge.begin(this.buffer.width,this.buffer.height);
      drawTerrainBoundary(edge,e,{scale:s,distance,time:t,line:pixelLine});
      this.bufferContext=edge;
      try { this.drawScenePropContacts(e,t,distance); } finally { this.bufferContext=c; }
      edge.composite(c);
    }else{
      drawTerrainBoundary(c,e,{scale:s,distance,time:t,line:pixelLine});
      this.drawScenePropContacts(e,t,distance);
    }
    e.biomeDynamics?.draw(c,{distance,scale:s,height:this.buffer.height});
    this.drawPortal(e,t);
    if (rehearsing) lightDreamScenery(c,this.buffer.width,this.buffer.height);
    this.drawCollectibles(e, t, distance);
    drawFlightForks(c,e,{distance,scale:s});
    this.drawBurstEffects(e, MAIN_LIGHT);
    this.drawMist(e, t, distance, palette);
    const life = this.lifeOptions; life.height = this.buffer.height; life.distance = distance; life.time = t; life.reducedMotion = e.reducedMotion;
    drawIdentityLife(c, life, SCENERY_HELPERS);
    let fleet = e.getCompanionStates?.(yOf(e), t,e.renderBlend);
    if (!fleet?.length) {
      const wisp = e.getWispState?.(yOf(e), t), fallback = this.fallbackFleet[0];
      if (wisp) Object.assign(fallback, wisp);
      else { fallback.x = e.player.x - 29; fallback.y = yOf(e) + 19; fallback.homeX = fallback.x; fallback.homeY = fallback.y; }
      fleet = this.fallbackFleet;
    }
    const playerX = e.player.x * s, playerY = yOf(e) * s;
    e.luminanceWaves?.draw(c,{distance,scale:s,time:t});
    this.lightFog(e, fleet, playerX, playerY);
    drawWispWake(c,e,s,this.wispRasterScale??1);
    drawFallWarning(c,e,{distance,scale:s,light:this.currentLightState});
    e.drawWayfinder?.(c,s);
    drawGuardianWarnings(c,{engine:e,distance,scale:s,time:t});
    e.biomeDynamics?.drawHighlights(c,{distance,scale:s,light:this.currentLightState,playerY:yOf(e)});
    drawAtlasFlight(c,e,{scale:s,distance});
    drawObjectiveMarks(c,e,{scale:s,distance});
    drawFlightProjection(c,e,{scale:s,distance,playerY:yOf(e)});
    if (!rehearsing) drawGlowSense(c,e,{scale:s,distance,playerY:yOf(e),light:this.currentLightState});
    if (!rehearsing) drawLastGlimmer(c,e,{scale:s,distance,playerY:yOf(e),light:this.currentLightState,time:t});
    drawCollectorField(c,e,{distance,scale:s,playerY:yOf(e),time:t});
    let collector = null;
    for (let i = 0; i < fleet.length; i++) if (fleet[i].role === 'collector') { collector = fleet[i]; break; }
    this.drawWind(e, t, collector);
    drawShutters(c,e,{distance,scale:s,playerY:yOf(e),light:this.currentLightState});
    const towLight={engine:e,light:this.currentLightState,playerY:yOf(e)};
    for(const carrier of fleet)if(carrier.role==='collector'&&carrier.carrying)drawCollectorGrip(c,carrier,s,towLight);
    this.drawFleet(e, t, fleet,'back');
    for(const carrier of fleet)if(carrier.role==='collector'&&carrier.carrying)drawCarriedSpark(c,carrier,e.captureTime??t,s,e.reducedMotion,e.captureStyle,towLight);
    this.drawMain(e, t, playerX, playerY);
    this.drawFleet(e, t, fleet,'front');
    this.drawProtector(e, t, playerX, playerY);
    this.drawAbsorptions(e, t);
    drawFourthBeat(c,e,playerX,playerY,this.wispRasterScale);
    if(e.flashTether)drawFlashTether(c,e.flashTether,{time:e.captureTime ?? t,distance,scale:s,
      playerX:distance+e.player.x,playerY:yOf(e)});
    drawBlackHoles(c,e,{scale:s,distance,playerY:yOf(e)});
    if (!rehearsing) for (const effect of e.pickupEffects || []) {
      const progress = 1 - clamp(effect.life / .72, 0, 1);
      c.globalAlpha = 1 - progress;
      const gain = effect.restored > 0 && !effect.text;
      const label = String(effect.text || (gain ? `+${formatGlow(effect.restored)}` : 'FULL')).toUpperCase();
      const labelWidth = label.length * 4 + (gain ? 13 : 0);
      const labelX = clamp(Math.round(effect.x*s - labelWidth/2),2,this.buffer.width-labelWidth-2);
      const labelY = Math.round(effect.y*s - 28 - (e.reducedMotion ? 0 : progress*10));
      if(gain)drawSparkSymbol(c,labelX+5,labelY+2,{size:11,time:t,reducedMotion:e.reducedMotion});
      pixelText(c, label, labelX+(gain?13:0), labelY,
        effect.color || (effect.pickupKind ? getPickupSpec(effect.pickupKind).color : '#f2d79a'));
    }
    c.globalAlpha = 1;
    if(!rehearsing)drawLiftGuide(c,e,{scale:s,playerY:yOf(e)});
    if (e.flash > 0) { c.globalAlpha = Math.min(.2, e.flash * 1.3); c.fillStyle = '#dbc2a1'; c.fillRect(0, 0, this.buffer.width, this.buffer.height); c.globalAlpha = 1; }
    if(e.completing){c.save();c.globalCompositeOperation='screen';const p=e.completionProgress||0;c.globalAlpha=.11*p*p*(3-2*p)+Math.sin(Math.PI*p)*.02;c.fillStyle='#efd4a0';c.fillRect(0,0,this.buffer.width,this.buffer.height);c.restore();}
    // Composite the closest opaque plane once, after every world light/wash
    // and overlay. Its real-terrain clip leaves open flight and actors clear.
    drawTerrainForeground(c,e,{scale:s,distance});
    if (!rehearsing) drawProximityMeter(c,e,{scale:s});
    this.context.imageSmoothingEnabled = false;
    this.context.drawImage(this.buffer, 0, 0, this.canvas.width, this.canvas.height);
    if (!this.backgroundRepainted) this.prewarmSurfaces(e, distance);
    } finally { endTerrainBoundaryFrame(e); }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.ready = false;
    releaseTerrainLight(this.engine);
    releaseTerrainBoundaryFrame(this.engine);
    releaseTerrainForeground(this.engine);
    this.contactEdgeRaster?.destroy();this.contactEdgeRaster=null;
    if (this.engine.canvas.style) this.engine.canvas.style.opacity = this.originalOpacity;
    this.canvas?.remove();
    for (const item of this.terrainCache.values()) { item.canvas.width = 1; item.canvas.height = 1; }
    this.terrainCache.clear();
    for (const item of this.scenePropCache.values()) { item.canvas.width = 1; item.canvas.height = 1; }
    this.scenePropCache.clear();
    if (this.buffer) { this.buffer.width = 1; this.buffer.height = 1; }
    if (this.fog) { this.fog.width = 1; this.fog.height = 1; }
    for (const canvas of this.spriteCache.values()) canvas.width = canvas.height = 1;
    for (const canvas of this.glowCache.values()) canvas.width = canvas.height = 1;
    this.spriteCache.clear(); this.glowCache.clear(); this.visibleObstacles.length = 0;
    if (this.maskCanvas) this.maskCanvas.width = this.maskCanvas.height = 1;
    if (this.forwardMaskCanvas) this.forwardMaskCanvas.width=this.forwardMaskCanvas.height=1;
    if (this.skyCanvas) this.skyCanvas.width = this.skyCanvas.height = 1;
    if (this.backgroundCanvas) this.backgroundCanvas.width = this.backgroundCanvas.height = 1;
    this.backgroundCanvas = this.backgroundContext = null;
    this.depthLayers=null;
    this.fogPixels = null; this.context = null; this.bufferContext = null; this.fogContext = null;
  }
}
