import {drawFluidCapture, FLUID_STYLES} from './fluid-capture.mjs?v=first-light-1';
import {drawPickup} from './pickup-art.mjs?v=first-light-1';
import {drawShellPuff} from './capture-art.mjs?v=first-light-1';
import {drawShellArcs} from './shell-arcs.mjs?v=first-light-1';
import {sparkArtScale, sparkBodyRadius} from './spark-size.mjs?v=first-light-1';
import {makeWispSprite} from './companion-art.mjs?v=first-light-1';
import {createDepthScenery, drawDepthScenery} from './depth-scenery.mjs?v=first-light-1';
import {biomePalette} from './biome-art.mjs?v=first-light-1';

const canvas = document.querySelector('#scene');
const ctx = canvas.getContext('2d');
const wisp = makeWispSprite(document, 32);
const height = 430;
const phoneRaster = 240 / 390;
const bodySize = 36 * .85 / phoneRaster;
const bodyRim = 11 / phoneRaster;
const scenery = createDepthScenery(document, height, 'ruins', biomePalette({biomeId: 'moonruins'}));
const phaseText = document.querySelector('#phase');
const scrub = document.querySelector('#time');
const play = document.querySelector('#play');
const speedButton = document.querySelector('#speed');
const angleButton = document.querySelector('#angle');
const contact = .94;
const approachAngles = [{label:'↗ Above', angle:-.43}, {label:'↘ Below', angle:.53},
  {label:'↖ Behind', angle:-2.70}];
const params = new URLSearchParams(location.search);
let mode = Object.hasOwn(FLUID_STYLES,location.hash.slice(1)) ? location.hash.slice(1) : 'hybrid';
let mass = params.get('size') === 'cluster' ? 2 : 3;
let direction = Math.max(0, approachAngles.findIndex(a => a.label.toLowerCase().includes(params.get('angle') || 'above')));
let elapsed = 0, last = 0, speed = 1;
let running = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let sceneWidth = 640, sceneScale = 1;
let frame = 0;
const duration = () => FLUID_STYLES[mode].duration * (mass===3 ? 1 : .83);
const total = () => contact + duration() + .52;
function syncControls() {
  document.querySelectorAll('[data-style]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.style === mode)));
  document.querySelectorAll('[data-mass]').forEach(button =>
    button.setAttribute('aria-pressed', String(Number(button.dataset.mass) === mass)));
  play.textContent = running ? 'Ⅱ' : '▶';
  play.setAttribute('aria-label', running ? 'Pause playback' : 'Play animation');
  speedButton.textContent = speed + '×';
  angleButton.textContent = approachAngles[direction].label;
}

function restart() {
  elapsed = 0; last = 0; running = true;
  syncControls(); draw(); schedule();
}
function preserveFrame(change) {
  const progress = elapsed - contact;
  const fraction = progress / duration();
  change();
  if (progress >= 0) elapsed = Math.min(total(), contact + fraction * duration());
  syncControls(); draw(); schedule();
}
for (const button of document.querySelectorAll('[data-style]')) {
  button.addEventListener('click', () => preserveFrame(() => {
    mode = button.dataset.style;
    history.replaceState(null, '', '#' + mode);
  }));
}
for (const button of document.querySelectorAll('[data-mass]')) {
  button.addEventListener('click', () => preserveFrame(() => {mass = Number(button.dataset.mass);}));
}
angleButton.addEventListener('click', () => preserveFrame(() => {direction = (direction+1)%approachAngles.length;}));
document.querySelector('#replay').addEventListener('click', restart);
play.addEventListener('click', () => {running = !running; last = 0; syncControls();schedule();});
speedButton.addEventListener('click', () => {
  speed = speed === 1 ? .5 : speed === .5 ? .25 : 1;
  syncControls();
});
scrub.addEventListener('input', () => {
  running = false; last = 0; elapsed = total()*Number(scrub.value)/1000;
  syncControls(); draw();
});

function luminousMist(x,y,r,light,color) {
  if (r < 1 || light <= 0) return;
  const gradient = ctx.createRadialGradient(x,y,0,x,y,r);
  gradient.addColorStop(0, 'rgba('+color+','+light+')');
  gradient.addColorStop(.43, 'rgba('+color+','+light*.32+')');
  gradient.addColorStop(1, 'rgba('+color+',0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x-r,y-r,r*2,r*2);
}

function draw() {
  const angle = approachAngles[direction].angle;
  const worldX = (direction===2 ? .58 : .41)*sceneWidth;
  const worldY = (direction===1 ? .52 : .46)*height;
  const item = {kind:'cache',sparkMass:mass};
  const radius = sparkBodyRadius(item,height);
  const distance = radius+bodyRim*.74;
  const centerX = worldX+Math.cos(angle)*distance;
  const centerY = worldY+Math.sin(angle)*distance;
  const age = elapsed-contact;
  ctx.setTransform(sceneScale,0,0,sceneScale,0,0);
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.imageSmoothingEnabled=false;
  const sky = ctx.createLinearGradient(0,0,0,height);
  sky.addColorStop(0,'#0b1a23');sky.addColorStop(.7,'#223541');sky.addColorStop(1,'#1a3037');
  ctx.fillStyle=sky;ctx.fillRect(0,0,sceneWidth,height);
  drawDepthScenery(ctx,scenery,elapsed*15,sceneWidth);
  ctx.fillStyle='rgba(6,16,24,.44)';ctx.fillRect(0,0,sceneWidth,height);
  const auraAlpha = age>=0 && age<duration() ? .16+.13*Math.sin(Math.PI*age/duration())**2 : .12;
  luminousMist(worldX,worldY,bodyRim*5,auraAlpha,'217,235,205');
  if(age<0) {
    const approach = -age*112;
    drawPickup(ctx,centerX+Math.cos(angle)*approach,centerY+Math.sin(angle)*approach,{
      kind:'cache',time:elapsed,phase:2.4,scale:sparkArtScale(item,height),massTier:mass
    });
  } else {
    drawShellPuff(ctx,centerX,centerY,radius,age,'cache',2.4);
    if(age<duration()){
      drawFluidCapture(ctx,{x:worldX,y:worldY,radius,bodyRadius:bodyRim,sourceRadius:distance,
        age:age/duration(),angle,spin:direction===1?-1:1,phase:2.4,style:mode,rasterScale:sceneScale});
    }
  }
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(wisp,Math.round(worldX-bodySize/2),Math.round(worldY-bodySize/2),bodySize,bodySize);
  if (age>=0) drawShellArcs(ctx,worldX,worldY,1,age,'cache',2.4,false,bodyRim);
  phaseText.textContent = age < 0 ? 'Approach' : age < .16 ? 'Shell break' : age < duration() ? 'Absorbing' : 'Absorbed';
  scrub.value = Math.round(1000*elapsed/total());
}
function animate(now) {
  frame=0;
  if(document.hidden || !running) return;
  if(last) elapsed=(elapsed+Math.min(.15,(now-last)/1000)*speed)%total();
  last=now;
  draw(); schedule();
}
function schedule() {
  if(!frame && running && !document.hidden) frame=requestAnimationFrame(animate);
}
function resize() {
  const box=canvas.getBoundingClientRect();
  const ratio=Math.min(1.75,window.devicePixelRatio||1);
  canvas.width=Math.max(1,Math.round(box.width*ratio));
  canvas.height=Math.max(1,Math.round(box.height*ratio));
  sceneScale=canvas.height/height;
  sceneWidth=canvas.width/sceneScale;
  draw();
}
document.addEventListener('visibilitychange',()=>{last=0;schedule();});
if(!running) elapsed = contact + duration()*.47;
new ResizeObserver(resize).observe(canvas);
syncControls();resize();schedule();
