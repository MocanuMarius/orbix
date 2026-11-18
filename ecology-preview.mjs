import {WispFlight} from './flight.mjs?v=prune-1';
import {BIOMES,BIOME_LEVELS} from './biomes.mjs?v=prune-1';
import {getRunModifiers} from './model.mjs?v=prune-1';
const canvas=document.querySelector('canvas'),select=document.querySelector('select'),slider=document.querySelector('input');
const course=document.querySelector('#course');
const mode=document.querySelector('#mode'),light=document.querySelector('#light'),status=document.querySelector('#status'),gate=document.querySelector('#gate');
const pan=document.createElement('button');pan.id='pan';pan.textContent='Pan';mode.before(pan);
for(const b of BIOMES)select.add(new Option(b.name,b.id));
const reviewParams=new URLSearchParams(location.search);
select.value=reviewParams.get('biome')||'marsh';
course.value=String(Math.max(0,Math.min(3,(Number(reviewParams.get('course'))||1)-1)));
if(reviewParams.has('at'))slider.value=String(Math.max(0,Math.min(98,Number(reviewParams.get('at'))||0)));
let e,lit=true,flying=false,token=0,last=0,panning=reviewParams.get('pan')==='1';
function panLabel(){pan.textContent=panning?'Stop pan':'Pan';pan.setAttribute('aria-pressed',String(panning));}
panLabel();pan.onclick=()=>{panning=!panning;panLabel();};
async function open(){
 const ticket=++token;e?.destroy();flying=false;mode.textContent='Fly';
 const level=BIOME_LEVELS.filter(l=>l.biomeId===select.value)[Number(course.value)];
 e=new WispFlight({canvas,terrain:level.terrain,seed:17,duration:90,node:{...level,levelId:level.id,type:'flight',boss:reviewParams.get('guardian')==='1',row:2,mapIndex:0,difficulty:1},companions:['collector'],flame:100,modifiers:getRunModifiers({companions:['collector'],skills:{}}),onFinish:()=>{flying=false;mode.textContent='Retry';gate.hidden=false;},onPause:()=>{gate.hidden=false;}});
 e.setMuted(true);
 const normalLight=e.getLightState.bind(e);
 e.getLightState=()=>lit?{...normalLight(),radius:5000,pickupReveal:1}:normalLight();
 e.start({paused:true});await e.ready;if(ticket!==token)return;
 move();status.textContent=level.name+' · scenery inspection';
}
function move(){if(!e||flying)return;e.distance=e.previousDistance=e.totalDistance*Number(slider.value)/100;e.render();}
slider.oninput=()=>{panning=false;panLabel();move();};select.onchange=open;course.onchange=open;
light.onclick=()=>{lit=!lit;light.textContent=lit?'Scene light':'Flight light';e.render();};
mode.onclick=()=>{if(!e)return;if(e.finished){open();return;}flying=!flying;mode.textContent=flying?'Inspect':'Fly';gate.hidden=true;if(flying)e.resume();else e.pause();};
canvas.onpointerdown=ev=>{if(!flying)return;ev.preventDefault();if(e.paused){gate.hidden=true;e.resume();}else e.beginLiftInput();};
canvas.onpointerup=()=>e?.endLiftInput();
canvas.onpointercancel=()=>e?.endLiftInput();
function animate(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(e&&!flying&&!document.hidden){e.time+=dt;
 if(panning&&e.pixiView?.ready){e.distance=e.previousDistance=(e.distance+dt*154)%(e.totalDistance*.98);slider.value=e.distance/e.totalDistance*100;}
 e.render();}requestAnimationFrame(animate);}
open();requestAnimationFrame(animate);
