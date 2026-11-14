import {drawPickup} from './pickup-art.mjs?v=collector-audit-1';
import {drawShellPuff} from './capture-art.mjs?v=collector-audit-1';
import {drawShellArcs} from './shell-arcs.mjs?v=collector-audit-1';
import {sparkArtScale, sparkBodyRadius} from './spark-size.mjs?v=collector-audit-1';
import {makeWispSprite} from './companion-art.mjs?v=collector-audit-1';
import {createDepthScenery, drawDepthScenery} from './depth-scenery.mjs?v=collector-audit-1';
import {biomePalette} from './biome-art.mjs?v=collector-audit-1';

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
const tau = 2 * Math.PI;
const contact = .94;
const approachAngles = [{label:'↗ Above', angle:-.43}, {label:'↘ Below', angle:.53},
  {label:'↖ Behind', angle:-2.70}];
const modes = {
  mist: {turns:.58, delay:.36, taper:2.4, duration:1.8},
  ribbon: {turns:1.36, delay:.53, taper:3, duration:2.05},
  undertow: {turns:.99, delay:.46, taper:3.5, duration:1.88}
};
const params = new URLSearchParams(location.search);
let mode = Object.hasOwn(modes,location.hash.slice(1)) ? location.hash.slice(1) : 'ribbon';
let mass = params.get('size') === 'surge' ? 6 : 10;
let direction = Math.max(0, approachAngles.findIndex(a => a.label.toLowerCase().includes(params.get('angle') || 'above')));
let elapsed = 0, last = 0, speed = 1;
let running = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let sceneWidth = 640, sceneScale = 1;
let frame = 0;
const clamp = number => Math.max(0, Math.min(1, number));
const ease = t => t*t*(3-2*t);
const duration = () => modes[mode].duration * (mass===10 ? 1 : .83);
const total = () => contact + duration() + .52;
const radiance = document.createElement('canvas');
radiance.width = radiance.height = 48;
const glowPen = radiance.getContext('2d');
const glowRamp = glowPen.createRadialGradient(24,24,0,24,24,24);
glowRamp.addColorStop(0, '#e0f8eb');
glowRamp.addColorStop(.28, 'rgba(183,231,223,.73)');
glowRamp.addColorStop(.63, 'rgba(108,197,206,.25)');
glowRamp.addColorStop(1, 'rgba(101,187,203,0)');
glowPen.fillStyle = glowRamp;
glowPen.fillRect(0,0,48,48);

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

// Treat the spark's contents as neighboring slices of one fluid mass.
// The side nearest the wisp escapes first. Each successive slice follows the
// same streamline from its own depth in the spark. Its width collapses with
// its distance to the throat, leaving the unemptied rear free to keep moving.
function fluidSheet(radius, age, angle, spin) {
  const style = modes[mode];
  const count = 104;
  const cx = Math.cos(angle), cy = Math.sin(angle);
  const slices = [];
  for (let i=0; i<=count; i++) {
    const s = i/count;
    const delay = style.delay*(1-s)**1.12;
    const arrival = .32+.68*(1-s)**.84;
    const lead = clamp((age-delay)/(arrival-delay));
    const advance = lead**.91*(.48+.52*lead);
    const distance = bodyRim*.74 + radius*(2-2*s);
    const orbit = (mode==='ribbon' ? .61 : mode==='mist' ? .29 : .81)*radius + bodyRim*.68;
    const gap = distance * (1-ease(lead)) + orbit * Math.sin(Math.PI*lead)**1.15;
    const swirl = (mode==='undertow' ? .54*lead+.46*advance : advance);
    const a = angle + spin*tau*style.turns*swirl;
    const eddy = mode==='mist' ? Math.sin(lead*8+s*8)*radius*.33*Math.sin(lead*Math.PI) : 0;
    const x = Math.cos(a)*gap - cy*eddy;
    const y = Math.sin(a)*gap + cx*eddy;
    const chord = 2*radius*Math.sqrt(s*(1-s));
    const pinch = (1-lead)**style.taper / (1+(mode==='mist'?2.2:9)*lead);
    const thickness = chord*pinch;
    slices.push({s,x,y,w:thickness,lead,nx:0,ny:0});
  }
  for (let i=0; i<=count; i++) {
    const slice=slices[i], prev=slices[Math.max(0,i-2)], next=slices[Math.min(count,i+2)];
    const dx=next.x-prev.x, dy=next.y-prev.y;
    const length=Math.hypot(dx,dy) || 1;
    const turn=ease(clamp(slice.lead*4));
    const original = Math.atan2(cx,-cy), tangent = Math.atan2(-dx/length,dy/length);
    const rotation = Math.atan2(Math.sin(tangent-original),Math.cos(tangent-original));
    slice.nx=Math.cos(original+turn*rotation); slice.ny=Math.sin(original+turn*rotation);
  }
  return slices;
}
function offsetPoint(slice, fraction, age, phase) {
  const {s, lead, w, nx, ny} = slice;
  const tide = Math.sin(3.45*s+age*5.2+phase)*.12 + Math.sin(8.1*s-age*7.8+phase)*.055;
  const fray = mode==='mist' ? 1.15 : mode==='undertow' ? .64 : .28;
  const folds = Math.sin(s*33+phase+age*12)*.044 + Math.sin(s*63-phase-age*7)*.019;
  const width = w*(1+tide*(.32+lead)+fray*folds);
  const offset = fraction*width;
  return [slice.x+nx*offset, slice.y+ny*offset];
}
function fillStrip(slices, low, high, age, phase, color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  for(let i=0;i<slices.length;i++) {
    const [x,y]=offsetPoint(slices[i],high(slices[i]),age,phase);
    if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  for(let i=slices.length-1;i>=0;i--) {
    const [x,y]=offsetPoint(slices[i],low(slices[i]),age,phase);
    ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.fill();
}
const fixed = value => () => value;
function drawVolume(slices, age, radius) {
  const mist = mode === 'mist';
  const undertow = mode === 'undertow';
  // Overlapping diffuse emission spans the full thickness. There are no
  // individual outlined sprites or detached grains following the player.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.imageSmoothingEnabled = true;
  for (let i=1; i<slices.length; i+=2) {
    const slice=slices[i];
    if (slice.w < .15) continue;
    const neighbor=slices[Math.max(0,i-2)];
    const ds=Math.hypot(slice.x-neighbor.x,slice.y-neighbor.y);
    const cross = slice.w*(mist ? 2.1 : 1.65)+.9;
    const along = Math.max(Math.min(radius*.12,ds*3.5), cross*.31, 1);
    ctx.save();
    ctx.transform(slice.nx,slice.ny,-slice.ny,slice.nx,slice.x,slice.y);
    ctx.globalAlpha = mist ? .25 : .17;
    ctx.drawImage(radiance,-cross,-along,2*cross,2*along);
    if (mist && slice.w>3) {
      const billow=Math.sin(slice.s*17-age*7)*.42*slice.w;
      ctx.globalAlpha=.3;
      ctx.drawImage(radiance,billow-cross*.79,-along*1.3,cross*1.58,along*2.6);
    }
    ctx.restore();
  }
  ctx.restore();
  const waver = (s, seed) => Math.sin(s.s*12 + seed - age*6)*.12
    + Math.sin(s.s*23 + .76*seed + age*3)*.045;
  const depth = ctx.createLinearGradient(slices[0].x,slices[0].y,slices.at(-1).x+.1,slices.at(-1).y+.1);
  depth.addColorStop(0, '#b4d1cb');
  depth.addColorStop(.38, mist ? '#accdca' : '#a1c3c9');
  depth.addColorStop(.78, '#dcf1e5');
  depth.addColorStop(1, '#f9fbe6');
  ctx.globalAlpha = mist ? .26 : .74;
  fillStrip(slices,fixed(-1),fixed(1),age,.9,depth);
  ctx.globalAlpha = 1;
  const lanes = mist ? 17 : undertow ? 15 : 13;
  for(let i=0;i<lanes;i++) {
    const base = -.91+1.82*(i+.48)/lanes;
    const seed = i*2.39996;
    const bend = mist ? .48 : undertow ? .56 : .28;
    const middle = s => base + bend*Math.sin(Math.PI*s.s)*Math.sin(4.3*s.s+seed+age*5.5)
      + waver(s,seed)*(mist?.88:.52);
    const band = s => (mist?.23:.090)*Math.sin(Math.PI*s.s)**.52*
      (.70+.30*Math.cos(seed+age*5-s.s*12));
    const light = .50 + .50*Math.sin(i*1.97+.43);
    const tint = light>.52 ? '246,255,233' : '60,119,143';
    const alpha = mist ? .12+light*.19 : .17+light*.21;
    fillStrip(slices,s=>middle(s)-band(s),s=>middle(s)+band(s),age,seed,'rgba('+tint+','+alpha+')');
  }
  // Branch tips shear across the source face, dissolving into the same liquid.
  for(let i=0;i<(mist?10:15);i++) {
    const k=i+1;
    const bend=s=>.72*Math.sin(s.s*5.1+k*2.42+age*3.6)
      +.12*Math.sin(s.s*17-k+s.lead*7)+.058*Math.sin(s.s*43+k*1.8-age*7);
    const width=s=>Math.sin(Math.PI*s.s)**.76*(.027+.019*Math.sin(s.s*13+k+age*5));
    fillStrip(slices,s=>bend(s)-width(s),s=>bend(s)+width(s),age,k,
      mist?'rgba(218,246,240,.23)':'rgba(237,255,234,.41)');
  }
  if(!mist) {
    // A moving caustic runs along the wet crest, never a train of round payloads.
    const crest = s => (undertow?.49:.64)*Math.sin(s.s*4.7+age*4.6)
      + (undertow?.20:.11)*Math.sin(s.s*12-age*8);
    fillStrip(slices,s=>crest(s)-.025,s=>crest(s)+.034,age,.6,'rgba(240,254,239,.69)');
  } else {
    // The mist billows outward as the remaining source thins. Offset layered
    // vapor folds use the same deforming sheet so neighboring puffs overlap.
    for(let i=0;i<6;i++) {
      const side=i%2?1:-1,seed=i*2.136;
      const lift=s=>side*(.82+.28*Math.sin(s.s*15-age*9+seed)
        +.19*Math.sin(s.s*34+age*5+seed)*Math.min(1,age*4));
      fillStrip(slices,s=>lift(s)-.12,s=>lift(s)+.12,age,seed,'rgba(188,225,222,.17)');
    }
  }
  // The last part of the streamline is below one pixel wide. Its short
  // glint makes the much longer spiral readable without changing its mass.
  ctx.beginPath();
  let started=false;
  for(const slice of slices) {
    if(slice.lead<.25 || slice.w<.018)continue;
    if(!started){ctx.moveTo(slice.x,slice.y);started=true;}
    else ctx.lineTo(slice.x,slice.y);
  }
  if(started) {
    ctx.strokeStyle = mist ? 'rgba(210,236,228,.40)' : 'rgba(228,250,235,.76)';
    ctx.lineWidth = Math.max(.9, radius*.012)*(1-age*.6);
    ctx.stroke();
  }
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
      const normalized = age/duration();
      ctx.save(); ctx.translate(worldX,worldY);
      const spin = direction===1 ? -1 : 1;
      const slices = fluidSheet(radius,normalized,angle,spin);
      if (mode==='undertow') {
        // Back-fold of the same sheet cups the moving throat like a draining
        // basin. Both edges meet the near face of the original single spark.
        const fold=fluidSheet(radius,normalized,angle,spin);
        for (const slice of fold) {
          const bend = Math.sin(Math.PI*slice.lead);
          const angleOffset = -spin*bend*1.62;
          const cos=Math.cos(angleOffset),sin=Math.sin(angleOffset);
          const x=slice.x, nx=slice.nx;
          slice.x=(cos*x-sin*slice.y)*(1-.25*bend);
          slice.y=(sin*x+cos*slice.y)*(1-.25*bend);
          slice.nx=cos*nx-sin*slice.ny; slice.ny=sin*nx+cos*slice.ny;
          slice.w *= .18 + bend*.38;
        }
        fillStrip(fold,fixed(-1),fixed(1),normalized,.7,'rgba(170,222,219,.34)');
        fillStrip(fold,fixed(.26),fixed(.43),normalized,2,'rgba(223,246,232,.61)');
      }
      drawVolume(slices,normalized,radius);
      ctx.restore();
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
