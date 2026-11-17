import {WispFlight} from './flight.mjs?v=words-1';
import {bindFlightPointerControls} from './flight-input.mjs?v=words-1';
import {createRhythmScore} from './rhythm-score.mjs?v=words-1';
import {artifactIcon} from './upgrade-icons.mjs?v=words-1';
import {BLACK_HOLE_TUNING} from './black-holes.mjs?v=words-1';
import {attachFlightPerformance} from './flight-performance.mjs?v=words-1';

const root=document.querySelector('.flight-device'),canvas=root.querySelector('canvas'),status=document.querySelector('#preview-status'),reduced=document.querySelector('#reduced'),pause=document.querySelector('#pause');
const blackHole=document.querySelector('#black-hole'),rate=document.querySelector('#preview-rate');
blackHole.checked=new URLSearchParams(location.search).get('blackHole')==='1';
document.querySelector('#preview-artifact').innerHTML=artifactIcon('glow-wick');
reduced.checked=matchMedia('(prefers-reduced-motion:reduce)').matches;
let engine,score,performanceRecorder,lastPhase='',lastWaves=0;
function reset(){
  engine?.destroy();score?.destroy();score=createRhythmScore(root);lastPhase='';lastWaves=0;pause.textContent='Pause';
  engine=new WispFlight({canvas,preflight:true,terrain:'grove',duration:240,seed:'rhythm-practice',reducedMotion:reduced.checked,
    modifiers:{cardRhythm:true},onUpdate(snapshot){
      score.update(snapshot);
      const speed=`World · ${snapshot.worldRate.toFixed(2)}×`;if(rate.textContent!==speed)rate.textContent=speed;
      const phrase=snapshot.cardRhythm;
      if(phrase?.phase!==lastPhase||phrase?.waves!==lastWaves){
        lastPhase=phrase?.phase;lastWaves=phrase?.waves||0;
        status.textContent=snapshot.paused?'Paused. The phrase has cleared.':lastPhase==='caught'?`Caught · ${lastWaves} wave${lastWaves===1?'':'s'}`:lastPhase==='miss'?'Missed. Your next tap starts fresh.':lastPhase==='two'?'Catch the bright third note.':lastPhase==='one'?'First note. Tap again to set the tempo.':'Ready for your first note.';
      }
    },onPause(){pause.textContent='Resume';status.textContent='Paused. The phrase has cleared.';}});
  // This sandbox preserves production Lift/Rhythm/wave code while refilling its
  // meter and returning from the edges, so practice never consumes a saved run.
  engine.layout.obstacles=[];engine.layout.flightChallenges=[];
  engine.blackHoles.items=blackHole.checked?[{id:'rhythm-practice-hole',x:engine.distance+engine.player.x+75,y:engine.height*.5,
    ...BLACK_HOLE_TUNING,seed:114,rate:0,potentialRate:0,frameDrained:0,drained:0,lastDrainAt:-Infinity,
    drainSequence:0,sourceX:null,sourceY:null,bypass:{y:engine.height*.75}}]:[];
  engine.hit=()=>{engine.player.y=engine.previousPlayerY=engine.height*.5;engine.player.vy=0;};
  const step=engine.step.bind(engine);
  engine.step=dt=>{engine.flame=engine.maxFlame;step(dt);};
  performanceRecorder=new URLSearchParams(location.search).get('perf')==='1'?attachFlightPerformance(engine):null;
  engine.pointerControls=bindFlightPointerControls({lift:document.querySelector('#flap-btn'),playfield:root.querySelector('.canvas-wrap'),getEngine:()=>engine});
  engine.start();engine.resumeElapsed=engine.resumeRampSeconds;engine.notify();
}
document.querySelector('#reset').addEventListener('click',reset);
root.addEventListener('pointerdown',()=>engine?.unlockAudio(),{capture:true});
pause.addEventListener('click',()=>{if(engine.paused){engine.resume();engine.resumeElapsed=engine.resumeRampSeconds;pause.textContent='Pause';status.textContent='Ready for your first note.';}else engine.pause();});
reduced.addEventListener('change',()=>{engine.cardRhythm.clear();engine.reducedMotion=reduced.checked;engine.notify();});
blackHole.addEventListener('change',reset);
window.addEventListener('keydown',event=>{if(event.code!=='Space'||event.repeat||event.target.closest('button,input'))return;event.preventDefault();engine.unlockAudio();engine.beginLiftInput();});
window.addEventListener('keyup',event=>{if(event.code==='Space'){event.preventDefault();engine.endLiftInput();}});
window.addEventListener('blur',()=>{engine.endLiftInput(true);engine.pause(true);});
window.addEventListener('pagehide',()=>{engine.destroy();score.destroy();});
reset();
// Read-only hooks for the repeatable browser smoke, not used by live gameplay.
globalThis.rhythmPractice={get engine(){return engine;},get performance(){return performanceRecorder?.report();},reset};
