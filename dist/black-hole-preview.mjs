import {WispFlight} from './flight.mjs?v=resonance-1';
import {getRunModifiers} from './model.mjs?v=resonance-1';
import {wispOrbit} from './wisp.mjs?v=resonance-1';
import {formatGlow, glowPoints} from './vitality.mjs?v=resonance-1';

const frame=document.querySelector('#flight-frame'),gate=document.querySelector('#gate');
const status=document.querySelector('#status'),meter=document.querySelector('meter'),amount=document.querySelector('#meter');
const edgeButtons=[...document.querySelectorAll('[data-edge]')];
let engine,hole,endX,phase='loading',attempt=0;

function prompt(title,detail){
 gate.querySelector('strong').textContent=title;
 gate.querySelector('span').textContent=detail;
 gate.hidden=false;
 frame.setAttribute('aria-label',title+'. '+detail);
}
function end(cleared){
 if(phase==='done')return;
 phase='done';
 engine.pause();
 const lost=formatGlow(hole.drained);
 status.textContent=lost+' Sparks drained by the giant.';
 prompt(cleared?'Passage cleared':'The light scatters','Tap to return to the approach');
}
function update(s){
 if(!engine||!hole||phase==='loading')return;
 const points=glowPoints(s.flame);
 amount.textContent=String(points);meter.value=points;meter.max=glowPoints(s.maxFlame);
 if(phase!=='flying')return;
 const x=engine.distance+engine.player.x;
 if(!s.dying&&x>=endX){end(true);return;}
 if(s.dying)return;
 const rate=glowPoints(hole.rate);
 const text=hole.rate>0?(rate<1?'Faint drain':'Drain · '+rate+' Sparks/s'):
  x<hole.x?'Approaching the '+(hole.edge<0?'roof':'floor')+' giant.':'Clear of the field · catch the recovery Sparks.';
 if(status.textContent!==text)status.textContent=text;
}
async function reset(){
 const ticket=++attempt;
 engine?.destroy();engine=null;hole=null;phase='loading';
 prompt('Preparing passage…','');status.textContent='Opening the passage…';
 const floor=location.hash==='#floor';
 for(const b of edgeButtons)b.setAttribute('aria-pressed',String((b.dataset.edge==='floor')===floor));
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');frame.replaceChildren(canvas);
 const node={id:'edge-rehearsal',name:'Bell Stair',levelId:'moonruins-bell-stair',terrain:'ruins',duration:90,
  type:'flight',row:3,mapIndex:1,difficulty:1,blackHoleEncounter:'giant',blackHoleEdge:floor?1:-1};
 const run={companions:['collector'],skills:{},current:node};
 try{
  const e=new WispFlight({canvas,node,terrain:node.terrain,duration:node.duration,seed:1,
   flame:100,companions:run.companions,skills:run.skills,modifiers:getRunModifiers(run),
   reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,onUpdate:update,
   onFinish:()=>{if(ticket===attempt)end(false);},onPause:()=>{if(phase==='flying'){phase='ready';prompt('Tap to resume','Tap again to Lift');}}});
  engine=e;e.setMuted(true);
  hole=e.blackHoles.items.find(h=>h.giant);
  if(!hole)throw Error('The rehearsal requires a checked giant crossing.');
  // Enter just before this generated room, inside the same checked lane used in a campaign.
  const x=Math.max(hole.bypass.startX,hole.x-e.baseSpeed*2.5);
  e.distance=e.previousDistance=x-e.player.x;
  e.time=(e.distance-e.distanceOrigin)/e.baseSpeed;
  e.previousPlayerY=e.player.y=hole.bypass.y;
  const orbit=wispOrbit(e.player,e.time);
  e.wisp.previousX=e.wisp.x=orbit.x;e.wisp.previousY=e.wisp.y=orbit.y;
  endX=hole.bypass.endX+e.baseSpeed*1.4;
  e.start({paused:true});await e.ready;
  if(ticket!==attempt)return;
  phase='ready';e.render();e.notify();
  prompt('Tap to begin','Tap again anywhere to Lift');
  status.textContent=floor?'Floor giant · stay high, then catch the recovery Sparks.':'Roof giant · stay low, then catch the recovery Sparks.';
 }catch(error){
  if(ticket!==attempt)return;
  phase='error';engine?.destroy();engine=null;hole=null;
  prompt('Passage unavailable','Tap to try again');status.textContent='The giant crossing could not open.';
  console.error(error);
 }
}
function press(){
 if(phase==='done'||phase==='error'){reset();return;}
 if(phase==='ready'){phase='flying';gate.hidden=true;frame.setAttribute('aria-label','Lift');engine.resume();return;}
 if(phase==='flying')engine.beginLiftInput();
}
frame.addEventListener('pointerdown',e=>{if(e.button===0&&e.isPrimary){frame.setPointerCapture(e.pointerId);press();}});
frame.addEventListener('lostpointercapture',()=>engine?.endLiftInput());
frame.addEventListener('click',e=>{if(e.detail===0){press();engine?.endLiftInput();}});
document.querySelector('#restart').addEventListener('click',reset);
for(const b of edgeButtons)b.addEventListener('click',()=>{
 const hash='#'+b.dataset.edge;if(location.hash!==hash)location.hash=hash;
});
window.addEventListener('hashchange',reset);
window.addEventListener('pagehide',()=>{attempt++;engine?.destroy();});
window.addEventListener('pageshow',e=>{if(e.persisted)reset();});
reset();
