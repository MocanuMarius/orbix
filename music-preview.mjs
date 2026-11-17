// An audition of repeated level flight in still air. Both the guide calculation
// and its instrument are the ones the game uses.
import {createMusic} from './music.mjs?v=rest-2';
import {LiftGuide} from './flight-projection.mjs?v=rest-2';
import {FLIGHT_TUNING} from './flight.mjs?v=rest-2';

const music = createMusic({storage:{getItem:()=>null,setItem(){}},version:1});
const guide = new LiftGuide(FLIGHT_TUNING);
const buttons = [...document.querySelectorAll('#guide,[data-scene]')];
const sample = document.querySelector('#sample');
const status = document.querySelector('#status');
const stop = document.querySelector('#mute');
const flight = {running:true,alive:true,time:0,flaps:0,scaleY:1,flame:30,maxFlame:30,
  availableGlow:30,nextLiftCost:3,worldRate:1,mod:{cardLiftGuide:true},player:{vy:0}};
let frame = 0;
music.setEnabled(false);

function endScene() {
  cancelAnimationFrame(frame);
  frame = 0;
  music.setEnabled(false);
  for (const button of buttons) button.setAttribute('aria-pressed','false');
}
function auditionGuide() {
  const start = performance.now();
  const period = 2 * FLIGHT_TUNING.flapImpulse / FLIGHT_TUNING.gravity;
  let liftStart = 0;
  flight.flaps = 1;
  function advance(now) {
    const time = (now-start)/1000;
    flight.time = time;
    flight.player.vy = -FLIGHT_TUNING.flapImpulse + FLIGHT_TUNING.gravity * (time-liftStart);
    const cue = guide.read(flight);
    music.setFlight({...flight, liftGuide:cue});
    if (time-liftStart >= period) {
      liftStart = time;
      flight.flaps++;
    }
    frame = requestAnimationFrame(advance);
  }
  advance(start);
}
for (const button of buttons) button.addEventListener('click',()=>{
  sample.pause();
  endScene();
  button.setAttribute('aria-pressed','true');
  music.setEnabled(true);
  if (button.id==='guide') {
    auditionGuide();
    status.textContent = 'Lift Guide in still air. Listen for the resolving note every two beats.';
  } else {
    music.setScene(button.dataset.scene,Number(button.dataset.pressure)||0);
    status.textContent = button.textContent;
  }
});
sample.addEventListener('play',()=>{endScene();status.textContent='Playing the recorded score.';});
function silence() {sample.pause();endScene();status.textContent='Choose a scene to listen.';}
stop.addEventListener('click',silence);
document.addEventListener('visibilitychange',()=>{if(document.hidden)silence();});
window.addEventListener('pagehide',()=>{silence();music.destroy();});
