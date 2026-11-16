import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {LuminanceWaves,luminanceWaveVisibility,revealLuminanceWaves} from '../dist/luminance-waves.mjs';
import {projectedLiftCost,LIFT_GUIDE_TUNING,drawLiftGuide} from '../dist/flight-projection.mjs';
import {makeSkillCard,CARD_UNIT,getCardModifiers,CARD_SYSTEM} from '../dist/skill-cards.mjs';

function flight(modifiers={},options={}){
  const {width=900,height=430,...rest}=options;
  const engine=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width,height})},
    preflight:true,seed:'card-flight-proof',modifiers,...rest});
  engine.running=true;let now=0;
  engine.fourthBeatNow=()=>now;
  const tap=at=>{now=at;if(modifiers.cardRhythm)engine.time=at;const accepted=engine.beginLiftInput();engine.endLiftInput();return accepted;};
  return {engine,tap,clock:at=>{now=at;}};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('six manual even Lifts, including a real free Lift, emit two consumed Rhythm trios on the world clock',()=>{
  const {engine:e,tap}=flight({cardRhythm:true,fourthBeatRank:2});
  const cues=[];e.sound=kind=>cues.push(kind);e.flame=100;
  for(const at of [0,.4,.87,1.3,1.73,2.18])assert.ok(tap(at));
  assert.equal(e.time,2.18,'accepted Lifts use the same elapsed world time as flight');
  assert.equal(e.cardRhythm.state.waves,2);assert.equal(e.cardRhythm.state.count,0);
  assert.equal(e.luminanceWaves.waves.length,2);assert.equal(e.luminanceWaves.sources.size,0);
  assert.equal(e.luminanceWaves.revealCount,2);assert.equal(cues.filter(c=>c==='luminance').length,2);
  assert.ok(e.effortSpent<e.flaps*e.flapCost,'the legitimate free Fourth Beat Lift counted');
  assert.ok(e.particles.some(p=>p.color==='#d9f6ce'),'Rhythm has visible wisp glints');e.destroy();
});

test('uneven cadence costs only an ordinary Lift; pause and Dream break a pending trio',()=>{
  const {engine:e,tap}=flight({cardRhythm:true});
  for(const at of [0,.3,1.2])assert.ok(tap(at));
  assert.equal(e.luminanceWaves.waves.length,0);near(e.effortSpent,e.flapCost*3);
  e.pause();assert.equal(e.cardRhythm.state.count,0);e.paused=false;
  tap(2);tap(2.6);e.dream={phase:'recording',active:true,freeGlow:true};tap(3.2);
  assert.equal(e.cardRhythm.state.count,0);assert.equal(e.luminanceWaves.waves.length,0);
  e.dream={phase:'done'};tap(4);tap(4.6);tap(5.2);assert.equal(e.luminanceWaves.waves.length,1);e.destroy();
  const next=flight({cardRhythm:true});assert.equal(next.engine.cardRhythm.state.count,0);next.engine.destroy();
});

test('all three Harvest tiers pay the dedicated meter, Legendary Stored pays once per wave, crossings never collect',()=>{
  for(const [cardId,meter,stored]of [['harvest-common',3,0],['harvest-rare',6,0],['harvest-legendary',6,1]]){
    const mod=getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:[makeSkillCard(cardId,'harvest')]});
    const e={running:true,alive:true,mod,flame:0,maxFlame:100,distance:0,width:900,height:430,player:{x:0,y:50},
      layout:{embers:[80,110,140].map(x=>({x,y:50,kind:'light'}))}};
    const waves=new LuminanceWaves(e);waves.emit({x:0,y:50,radius:300});waves.update(.5);
    near(e.flame,meter*CARD_UNIT);assert.equal(e.resonanceStored||0,stored);
    assert.ok(e.layout.embers.every(p=>!p.collected));waves.update(.1);near(e.flame,meter*CARD_UNIT);
    waves.emit({x:0,y:50,radius:300});waves.update(.5);near(e.flame,meter*2*CARD_UNIT);assert.equal(e.resonanceStored||0,stored*2);
  }
});

test('temporary sources all support Harvest; generated, collected, carried, Dream and non-fuel objects cannot pay',()=>{
  const mod={cardHarvestMeter:2*CARD_UNIT,cardHarvestStoredPerWave:1};
  const natural={x:90,y:50,kind:'light'};
  const e={running:true,alive:true,mod,flame:100,maxFlame:100,distance:0,player:{x:0,y:50},layout:{embers:[natural,
    {x:90,y:50,kind:'light',generated:true},{x:90,y:50,kind:'light',collected:true},{x:90,y:50,kind:'light',carried:true},
    {x:90,y:50,kind:'sight'},{x:90,y:50,kind:'dark'},{x:90,y:50,kind:'dusk'}]}};
  const waves=new LuminanceWaves(e);waves.addSource({id:'flash',follow:'wisp',radius:200,duration:1.5});waves.update(.5);
  assert.equal(e.flame,100);assert.equal(e.resonanceStored,1,'Stored pays even at meter cap');assert.ok(!natural.collected);
  e.paused=true;waves.update(2);assert.equal(waves.clock,.5);e.paused=false;e.dream={phase:'recording'};
  waves.update(1);assert.equal(e.resonanceStored,1);e.finished=true;waves.update(.1);assert.equal(waves.waves.length,0);
});

test('Rhythm fronts reveal actual fog and visibility, without doubling existing temporary-source illumination',()=>{
  const e={running:true,alive:true,distance:0,player:{x:0,y:50}};e.luminanceWaves=new LuminanceWaves(e);
  e.luminanceWaves.emit({x:0,y:50,radius:300,reveal:true});e.luminanceWaves.update(.3);
  assert.ok(luminanceWaveVisibility(e.luminanceWaves,108,50)>.6);assert.equal(luminanceWaveVisibility(e.luminanceWaves,240,50),0);
  let strokes=0,erases=0;const c={save(){},restore(){},beginPath(){},arc(){},stroke(){strokes++;if(this.globalCompositeOperation==='destination-out')erases++;}};
  revealLuminanceWaves(c,e);assert.equal(strokes,3);assert.equal(erases,3);
  e.luminanceWaves.clear();e.luminanceWaves.addSource({radius:300,duration:1});e.luminanceWaves.update(.3);
  assert.equal(luminanceWaveVisibility(e.luminanceWaves,108,50),0);revealLuminanceWaves(c,e);assert.equal(strokes,3);
});

test('real body pickup executes shared finite card uses while Collector, generated and Dream pickups do not',()=>{
  const source=makeSkillCard('spark-cache','finite');source.charges=3;
  const mods=getCardModifiers({skillSystem:CARD_SYSTEM,mountedCards:[makeSkillCard('echo','echo'),source]});
  const {engine:e}=flight(mods);e.flame=0;e.collect({kind:'light'});
  near(e.flame,20+8*CARD_UNIT);assert.equal(e.getState().cardCharges.finite,1);assert.equal(e.cardExecutions,2);
  e.flame=0;e.collect({kind:'light',deliveredByWisp:true});assert.equal(e.getState().cardCharges.finite,1);
  e.collect({kind:'light',generated:true});assert.equal(e.getState().cardCharges.finite,1);
  e.dream={phase:'recording',active:true};e.collect({kind:'light'});assert.equal(e.getState().cardCharges.finite,1);
  e.dream=null;e.flame=0;e.collect({kind:'light'});near(e.flame,20+4*CARD_UNIT);
  assert.equal(e.getState().cardCharges.finite,0);assert.equal(source.charges,3,'flight uses an isolated execution snapshot');
  let result;e.onFinish=r=>{result=r;};e.finish(false);assert.deepEqual(result.cardCharges,{finite:0});assert.equal(result.cardExecutions,3);e.destroy();
});

test('pilot loan is visible in the actual Lift lesson, then advises useful early windows on phone and landscape',()=>{
  for(const [width,height]of [[390,620],[900,430]]){
    const {engine:e,tap,clock}=flight({}, {width,height,node:{tutorialLesson:'glide'},cardPilot:true});
    e.resumeElapsed=0;assert.equal(e.getLiftGuide().phase,'open','initial loan is visible during the first wake ramp');e.resumeElapsed=e.resumeRampSeconds;let strokes=0;
    drawLiftGuide({save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes++;}},e);
    assert.equal(strokes,2,'amber cue has a legible dark backing');tap(0);assert.equal(e.liftGuide.state,null);
    let early=0,opened=0;
    for(let i=0;i<240&&!e.dying;i++){
      clock(i/60);const cue=e.getLiftGuide();
      if(cue?.phase==='soon'){early++;assert.ok(cue.opensIn<=LIFT_GUIDE_TUNING.lead+1e-7);}
      if(cue?.phase==='open'){opened++;tap(i/60);}
      e.step(1/60);
    }
    assert.ok(early>=10);assert.ok(opened>=2);assert.equal(e.dying,false);assert.ok(e.liftGuide.projections<100);e.destroy();
  }
  const normal=flight({}, {node:{tutorialLesson:'glide'}}).engine;
  assert.equal(normal.getLiftGuide(),null);assert.equal(normal.liftGuide,undefined);assert.equal(normal.cardExecution,null);normal.destroy();
});

test('Guide honors actual Lift cost and free opportunities without reading the route or changing live beat taps',()=>{
  const {engine:e,tap,clock}=flight({cardLiftGuide:true,fourthBeatRank:1});
  for(const t of [0,.08,.19])tap(t);clock(.95);e.flame=0;
  assert.equal(projectedLiftCost(e,0),0);assert.equal(projectedLiftCost(e,.3),e.flapCost);assert.deepEqual(e.fourthBeatTaps,[0,.08,.19]);
  e.artifactEffects.freeLift=true;assert.equal(projectedLiftCost(e,.3),0);
  e.player.vy=205*e.scaleY;e.layout.boss={attacks:[{}]};assert.equal(e.getLiftGuide().phase,'open');assert.equal(e.liftGuide.projections,0);
  e.getLightState=()=>{throw Error('Cadence does not inspect light');};assert.equal(e.getLiftGuide().phase,'open');e.destroy();
});
