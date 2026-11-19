import {pickupKind} from './pickups.mjs?v=skim-1';

const clamp01 = n => Math.max(0, Math.min(1, n));
const isFuel = p => !p.generated && !p.harmful && !p.riskChain && !p.forkCache &&
  ['light','cluster','cache'].includes(pickupKind(p));

// Geometry is fixed when the flight is built. Position and simulation time drive
// both physics and cues, including during a recorded Dream.
function clearBellApproach(engine, x, shelfY, rise) {
  const start = x - engine.baseSpeed * 1.12;
  for (let i = 0; i <= 9; i++) {
    const t = i / 9, checkX = start + (x-start)*t;
    const pathY = shelfY + rise * (1-t);
    // The current follows this rising corridor. A separate lane below it remains open.
    if (!engine.objectiveBodyClear(checkX,pathY,25) ||
        !engine.objectiveBodyClear(checkX,shelfY+rise+42*engine.scaleY,21)) return false;
  }
  return true;
}

function bellSites(engine) {
  const end = engine.totalDistance+engine.player.x;
  const candidates = engine.layout.embers.filter(p => isFuel(p) && p.x>1150 && p.x<end-330 &&
    !(engine.layout.flightForks||[]).some(f=>p.x>f.approachStart && p.x-engine.baseSpeed*1.12<f.exitEnd) &&
    !engine.blackHoles.items.some(h=>Math.abs(h.x-p.x)<h.influence+engine.baseSpeed*1.12));
  const choices = [];
  for (const fraction of [.33,.75]) {
    const ordered = candidates.filter(p => choices.every(site=>Math.abs(site.x-p.x)>engine.baseSpeed*4))
      .sort((a,b)=>Math.abs(a.x-end*fraction)-Math.abs(b.x-end*fraction));
    for (const packet of ordered) {
      const rise=engine.height*.10;
      if (!clearBellApproach(engine,packet.x,packet.y,rise)) continue;
      const start = packet.x-engine.baseSpeed*1.12;
      choices.push({x:packet.x,start,y:packet.y,rise,packet,rang:false});
      break;
    }
  }
  return choices;
}

function moonSites(engine) {
  return engine.blackHoles.items.map(hole=>{
    const lane=hole.bypass;
    const packets=engine.layout.embers.filter(p=>isFuel(p) && p.x>=lane.startX && p.x<=lane.endX+engine.baseSpeed*2.15)
      .sort((a,b)=>Math.abs(a.x-hole.x)-Math.abs(b.x-hole.x));
    // Keep x, values and packet cadence. Select one local packet for the moon lane,
    // preserving the other fuel and the gentle entrance of a guardian passage.
    const donor=packets.find(p=>p.x<=lane.endX);
    if(hole.placement!=='approach' && donor){
      const p=donor;
      if(engine.objectiveBodyClear(p.x,lane.y,25)){
        p.y=lane.y;
        p.anchor=null;
        p.pocket=false;
        p.blackHoleBypass=true;
        p.atlasBypass=true;
      }
    }
    return {hole,packets};
  });
}

export function prepareAtlasFlight(engine) {
  const node=engine.options.node;
  if(engine.tutorial || node?.mapIndex!==1)return null;
  if(node.atlasForecast==='bellwind') return {id:node.atlasForecast,bells:bellSites(engine)};
  if(node.atlasForecast==='hollow-moon') return {id:node.atlasForecast,moons:moonSites(engine)};
  return null;
}

export function resizeAtlasFlight(atlas, factor) {
  for (const bell of atlas?.bells || []) {
    bell.y*=factor;
    bell.rise*=factor;
  }
}

// A bell can be missed below or above. A rider follows the lift along the visible
// curve; damping limits momentum on exit, and a player's own Lift still works.
export function ringBellwind(engine) {
  const worldX=engine.distance+engine.player.x;
  for(const bell of engine.atlas.bells){
    if(!bell.rang && worldX>=bell.start-engine.baseSpeed*1.7 && worldX<=bell.start){
      bell.rang=true;
      engine.sound('bellwind');
    }
  }
}

export function bellwindAcceleration(engine, worldX=engine.distance+engine.player.x, y=engine.player.y,
    vy=engine.player.vy, boost=engine.boostTime) {
  const bells=engine.atlas?.bells;
  if(!bells)return 0;
  for (const bell of bells) {
    const t=(worldX-bell.start)/(bell.x-bell.start);
    if(t<0||t>1)continue;
    const laneY=bell.y+bell.rise*(1-t);
    const falloff=clamp01((36*engine.scaleY-Math.abs(y-laneY))/(12*engine.scaleY));
    if(!falloff)continue;
    const velocity=-bell.rise/1.12 + (laneY-y)*1.7;
    const correction=(velocity-vy)*11-300*engine.scaleY;
    const resistance=boost>0 ? 1-(engine.mod.swiftResistance||.72) : 1;
    return Math.max(-900*engine.scaleY,Math.min(0,correction))*falloff*resistance;
  }
  return 0;
}

// The eclipse begins as the wisp approaches, so pausing or drifting through a
// Dream cannot advance its clock. Its peak moonlights the outer passage.
export function eclipsePhase(engine,hole) {
  const x=engine.distance+engine.player.x;
  const distance=Math.abs(x-hole.x);
  if(distance>hole.influence+engine.baseSpeed*1.8)return 0;
  const phase=clamp01(1-distance/(hole.influence+engine.baseSpeed*1.5));
  return phase*phase*(3-2*phase);
}

export function moonDrainScale(engine,hole) {
  if(engine.atlas?.id!=='hollow-moon')return 1;
  const distanceFromLane=Math.abs(engine.player.y-hole.bypass.y);
  const lane=clamp01(1-distanceFromLane/(engine.height*.19));
  return 1-.8*eclipsePhase(engine,hole)*lane;
}

export function moonLightScale(engine) {
  const moons=engine.atlas?.moons;
  if(!moons?.length)return 1;
  for(const {hole} of moons){
    const phase=eclipsePhase(engine,hole);
    if(!phase)continue;
    const outsideLane=clamp01(Math.abs(engine.player.y-hole.bypass.y)/(engine.height*.22));
    return 1+phase*(.34-.58*outsideLane);
  }
  return 1;
}

function bellGlyph(c,x,y,size,ring) {
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(size,size);
  c.fillStyle='#383127';c.fillRect(-6,-8,12,1);c.fillRect(-1,-8,2,5);
  c.fillStyle='#e7c983';c.fillRect(-2,-5,4,2);c.fillRect(-4,-3,8,6);
  c.fillRect(-6,2,12,2);c.fillRect(-1,5,2,2);
  c.fillStyle='#80764c';c.fillRect(1,-2,2,5);
  if(ring){c.fillStyle='#b8e5d2';c.fillRect(-10,-2,1,5);c.fillRect(10,-2,1,5);c.fillRect(-13,0,1,2);c.fillRect(13,0,1,2);}
  c.restore();
}

function moonGlyph(c,x,y,size,phase) {
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(size,size);
  const shift=2+Math.round(phase*4);
  for(let iy=-7;iy<=7;iy++){
    const span=Math.floor(Math.sqrt(49-iy*iy));
    const shadow=Math.max(0,Math.min(span*2+1,span*2-shift));
    c.fillStyle='#b7c6e9';c.fillRect(-span,iy,span*2+1,1);
    c.fillStyle='#18252f';c.fillRect(-span,iy,shadow,1);
  }
  c.restore();
}

function drawBells(c,e,distance) {
  const worldX=distance+e.player.x;
  const time=e.reducedMotion?0:e.time;
  for(const b of e.atlas.bells){
    if(worldX<b.start-e.baseSpeed*2.35 || worldX>b.x+60)continue;
    const x=b.start-distance,y=b.y+b.rise;
    bellGlyph(c,x,y-13,1.1,Math.sin(time*7)>.1||e.reducedMotion);
    c.fillStyle='#8fceb7';
    for(let j=0;j<8;j++){
      const t=(j+(time*.9)%1)/8;
      const xx=x+(b.x-b.start)*t,yy=y-b.rise*t;
      c.fillRect(Math.round(xx),Math.round(yy),4,2);
      c.fillRect(Math.round(xx+3),Math.round(yy-2),2,2);
    }
  }
}

function drawMoons(c,e,distance) {
  const worldX=distance+e.player.x;
  for(const {hole,packets} of e.atlas.moons){
    if(Math.abs(hole.x-worldX)>hole.influence+e.baseSpeed*2.65)continue;
    const phase=eclipsePhase(e,hole), x=hole.x-distance;
    const iconY=hole.y<e.height*.5?hole.y+34:hole.y-34;
    moonGlyph(c,x,iconY,1.2,phase);
    const lane=hole.bypass;
    c.globalAlpha=.32+.65*phase;c.fillStyle='#b3d1f6';
    for(let xx=lane.startX+12;xx<lane.endX;xx+=24){
      c.fillRect(Math.round(xx-distance),Math.round(lane.y),7,2);
    }
    for(const packet of packets){
      if(packet.collected || phase<.15)continue;
      const px=Math.round(packet.x-distance), py=Math.round(packet.y);
      c.fillRect(px-7,py+10,3,2);c.fillRect(px-4,py+12,8,2);c.fillRect(px+4,py+10,3,2);
    }
    c.globalAlpha=1;
  }
}

export function drawAtlasFlight(c,engine,{distance=engine.renderDistance,scale=1}={}) {
  if(!engine.atlas)return;
  c.save();c.scale(scale,scale);
  if(engine.atlas.id==='bellwind')drawBells(c,engine,distance);
  else drawMoons(c,engine,distance);
  c.restore();
}

// A relic on the guardian's gauntlet responds as the player crosses its threshold.
export function drawAtlasGuardian(c,engine,{x,y,h,time}) {
  if(!engine.atlas)return;
  const pulse=engine.reducedMotion ? .7 : .5-.5*Math.cos(time*2.7);
  const handX=x+h*.27,handY=y-h*.33;
  c.save();
  if(engine.atlas.id==='bellwind')bellGlyph(c,handX,handY+h*.015*pulse,h*.004,pulse>.38);
  else moonGlyph(c,handX,handY-h*.018*pulse,h*.0048,pulse);
  c.restore();
}
