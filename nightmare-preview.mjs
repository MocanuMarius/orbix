import {WispFlight,FLIGHT_TUNING,circleHitsObstacle} from './flight.mjs?v=spark-field-guide-1';
import {FlightProjection} from './flight-projection.mjs?v=spark-field-guide-1';
import {getRunModifiers} from './model.mjs?v=spark-field-guide-1';
import {glowPoints} from './vitality.mjs?v=spark-field-guide-1';
const $=id=>document.getElementById(id),canvas=document.querySelector('canvas');
const forecast=new FlightProjection(FLIGHT_TUNING,circleHitsObstacle);
let phase='loading',spent=false,flashStart=-Infinity;
const node={id:'nightmare-rehearsal',levelId:'moonruins-bell-stair',name:'Bell Stair',terrain:'ruins',type:'flight',row:1,mapIndex:0,difficulty:1,duration:60};
const e=new WispFlight({canvas,node,terrain:'ruins',duration:60,seed:1,flame:100,companions:['collector'],skills:{},modifiers:getRunModifiers({companions:['collector'],skills:{}}),onFinish:result=>{phase='ended';$('gate').hidden=false;$('gate').textContent=result.success?'Passage cleared':'The light scatters';},onPause:()=>{if(phase==='flying'){phase='ready';$('gate').hidden=false;$('gate').textContent='Tap to resume';}}});
e.setMuted(true);
function position(){
 for(const obstacle of e.layout.obstacles.slice(0,10)){
  for(let dx=-80;dx<=20;dx+=10)for(let y=30;y<e.height*.8;y+=5){
   e.distance=e.previousDistance=obstacle.x+dx-e.player.x;e.player.y=e.previousPlayerY=y;
   if(circleHitsObstacle(e.distance+e.player.x,y,e.player.radius,obstacle,e.time))continue;
   const p=forecast.predict(e,1,[0]);
   if(p.ceilingContact&&p.ceilingContact.time-e.time>.12&&!forecast.predict(e,1,[]).contact)return true;
  }
 }
 return false;
}
const positioned=position();e.start({paused:true});await e.ready;e.render();phase='ready';
$('gate').textContent='Tap to begin';$('status').textContent=positioned?'Tap once to start, then Lift beneath the stone roof.':'Fly close to a roof, then Lift.';
function blink(amount){for(const lid of document.querySelectorAll('.lid'))lid.style.transform='scaleY('+amount+')';}
function nightmare(path){
 spent=true;phase='vision';e.pause();
 const ghost=Object.create(e);ghost.player={...e.player};ghost.dyingDuration=.38;
 const first=path.points[0],last=path.points.at(-1);
 let elapsed=0,previous=performance.now();
 function frame(now){
  elapsed+=document.hidden?0:Math.min(.05,(now-previous)/1000);previous=now;
  const t=first.time+elapsed*.25,points=path.points;
  const j=points.findIndex(p=>p.time>=t);
  const a=j>0?points[j-1]:last,b=j>0?points[j]:last;
  const f=j>0?(t-a.time)/(b.time-a.time):0;
  ghost.distance=ghost.previousDistance=a.x+(b.x-a.x)*f-e.player.x;
  ghost.player.y=ghost.previousPlayerY=a.y+(b.y-a.y)*f;
  ghost.time=t;ghost.dying=t>=last.time;ghost.dyingAge=Math.max(0,t-last.time);ghost.deathCause='collision';
  const closing=elapsed-(last.time-first.time+.38)*4;
  if(closing<.42)ghost.render();else e.render();
  blink(closing<0?0:closing<.42?closing/.42:closing<.6?1:Math.max(0,1-(closing-.6)/.45));
  if(closing<1.05)requestAnimationFrame(frame);else{phase='waiting';$('speed').textContent='';$('wake').hidden=false;$('wake').focus();}
 }
 $('speed').textContent='0.25×';requestAnimationFrame(frame);
}
function press(){
 if(phase==='ready'){phase='flying';$('gate').hidden=true;e.resume();return;}
 if(phase!=='flying'||e.dying)return;
 if(!spent&&e.availableGlow>=e.nextLiftCost){const p=forecast.predict(e,1,[0]);if(p.contact&&!p.uncertain&&!forecast.predict(e,1,[]).contact){nightmare(p);return;}}
 e.beginLiftInput();
}
$('flight-frame').onpointerdown=ev=>{if(ev.isPrimary&&ev.button===0)press();};
$('flight-frame').onpointerup=()=>e.endLiftInput();
$('flight-frame').onclick=ev=>{if(ev.detail===0)press();};
$('restart').onclick=()=>location.reload();
$('wake').onclick=()=>{phase='flying';$('wake').hidden=true;$('flight-frame').focus();flashStart=performance.now();$('status').textContent='Nightmare spent · continue flying';e.resume();};
function hud(now){
 $('fuel').textContent=glowPoints(e.flame)+' Sparks';
 if(phase==='flying')$('speed').textContent=e.resumeRemaining>0?e.resumeScale.toFixed(2)+'×':'';
 const f=(now-flashStart)/1000,flash=$('flash');
 flash.style.opacity=f>=0&&f<1?String(Math.sin(3*Math.PI*f)**2):'0';
 if(f<1){flash.style.left=100*e.player.x/e.width+'%';flash.style.top=100*e.player.y/e.height+'%';}
 requestAnimationFrame(hud);
}
requestAnimationFrame(hud);
