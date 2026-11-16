import test from 'node:test';
import assert from 'node:assert/strict';
import {CardRhythm,RHYTHM_TUNING,rhythmThirdWindow} from '../dist/card-rhythm.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {createRhythmScore} from '../dist/rhythm-score.mjs';

function fixture(){
  const sounds=[],waves=[];
  const engine={mod:{cardRhythm:true},time:0,running:true,alive:true,player:{x:10,y:40},width:900,height:430,distance:0,
    fourthBeatNow:()=>999,sound:kind=>sounds.push(kind),luminanceWaves:{emit:wave=>waves.push(wave)}};
  const rhythm=new CardRhythm(engine);
  const clock=at=>{engine.time=at;};
  const tick=at=>{clock(at);rhythm.advance();};
  const tap=at=>{clock(at);return rhythm.lift(engine.time);};
  return {rhythm,engine,sounds,waves,tap,tick,clock};
}

test('third-window bounds solve the actual original tolerance, including minimum and maximum gaps',()=>{
  const {minimumGap:m,maximumGap:M,tolerance:t,relativeTolerance:r}=RHYTHM_TUNING;
  for(const a of [m,.23,.34,.59,.6,.7,1,2.9,M]){
    const window=rhythmThirdWindow(a,10);
    for(const b of [m-1e-5,m,...Array.from({length:301},(_,i)=>i/100),M+1e-5]){
      const expected=b>=m&&b<=M&&Math.abs(a-b)<=Math.max(t,r*Math.min(a,b))+1e-12;
      const shown=10+b>=window.opensAt-1e-12&&10+b<=window.closesAt+1e-12;
      assert.equal(shown,expected,`${a} / ${b}`);
    }
    for(const boundary of [window.opensAt,window.closesAt]){
      const f=fixture();f.tap(0);f.tap(a);assert.equal(f.tap(boundary-10+a),true,`accept boundary for ${a}`);
    }
  }
});

test('accepted first and second notes ink immediately and every bad third consumes the whole phrase',()=>{
  for(const third of [.5,1.01]){
    const f=fixture();f.tap(0);assert.equal(f.rhythm.state.phase,'one');assert.equal(f.rhythm.state.notes,1);
    f.tap(.4);assert.equal(f.rhythm.state.phase,'two');assert.equal(f.rhythm.state.opensAt,.68);
    assert.equal(f.tap(third),false);assert.equal(f.rhythm.state.phase,'miss');assert.equal(f.rhythm.state.count,0);
    assert.equal(f.waves.length,0);assert.equal(f.sounds.length,0);
    f.tap(third+.1);assert.equal(f.rhythm.state.count,1);assert.equal(f.rhythm.state.phase,'one');assert.equal(f.rhythm.state.firstAt,third+.1);
  }
});

test('no-tap timeout drops once then disappears on world time at 30, 60 and 120 Hz',()=>{
  for(const hz of [30,60,120]){
    const f=fixture();f.tap(0);f.tap(.6);let drops=0,last='two';
    for(let frame=1;frame<=hz*3;frame++){
      f.tick(.6+frame/hz);const phase=f.rhythm.state.phase;if(phase==='miss'&&last!=='miss')drops++;last=phase;
    }
    assert.equal(drops,1);assert.equal(last,'idle');assert.equal(f.waves.length,0);
    f.tap(4);assert.equal(f.rhythm.state.firstAt,4);assert.equal(f.rhythm.state.count,1);
  }
});

test('each successful trio gives exactly one existing wave and sound at all render rates',()=>{
  for(const hz of [30,60,120]){
    const f=fixture();for(const at of [0,.6,1.2])f.tap(at);
    assert.equal(f.rhythm.state.phase,'caught');assert.equal(f.rhythm.state.notes,3);assert.equal(f.rhythm.state.count,0);
    for(let frame=1;frame<=hz*2;frame++)f.tick(1.2+frame/hz);
    assert.equal(f.waves.length,1);assert.deepEqual(f.sounds,['luminance']);assert.equal(f.rhythm.state.phase,'idle');
    for(const at of [4,4.5,5])f.tap(at);assert.equal(f.waves.length,2);assert.equal(f.sounds.length,2);
  }
});

test('pause, death, finish, Dream and close never retain a phrase',()=>{
  for(const stop of [e=>e.paused=true,e=>e.dying=true,e=>e.finished=true,e=>e.destroyed=true,e=>e.dream={phase:'recording'}]){
    const f=fixture();f.tap(0);f.tap(.4);stop(f.engine);assert.equal(f.rhythm.state.phase,'idle');
    f.tick(10);assert.equal(f.waves.length,0);
  }
  const f=fixture();f.tap(0);f.tap(.4);f.rhythm.destroy();assert.equal(f.rhythm.phase,'idle');
});

test('real manual input ownership rejects duplicate controls and cancelled gestures clear Rhythm',()=>{
  const e=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},preflight:true,modifiers:{cardRhythm:true}});
  e.fourthBeatNow=()=>999;e.running=true;
  assert.equal(e.beginLiftInput(),true);assert.equal(e.beginLiftInput(),false);assert.equal(e.cardRhythm.state.count,1);
  e.endLiftInput();e.time=.6;assert.equal(e.beginLiftInput(),true);e.endLiftInput(true);assert.equal(e.cardRhythm.state.phase,'idle');
  e.time=1;e.beginLiftInput();e.endLiftInput();e.pause();assert.equal(e.cardRhythm.state.phase,'idle');e.destroy();
});

function fakeRoot(){
  const animations=[],writes=[];
  const third={animate(frames,options){const animation={frames,options,cancel(){this.cancelled=true;}};animations.push(animation);return animation;}};
  const layer={hidden:true,dataset:{},style:{setProperty(){}},setAttribute(key,value){writes.push([key,value]);},querySelector:()=>third,remove(){}};
  layer.animate=third.animate.bind(third);
  const root={ownerDocument:{createElement:()=>layer,defaultView:{addEventListener(){},removeEventListener(){}}},append(){},querySelector:()=>({offsetTop:7,offsetHeight:44})};
  return {root,layer,animations,writes};
}
test('fixed-node HUD animates once per phrase, holds at the exact catch window, and supports still notes',()=>{
  for(const reducedMotion of [false,true]){
    const dom=fakeRoot(),score=createRhythmScore(dom.root),f=fixture();f.tap(0);f.tap(.6);
    const snapshot={cardRhythm:f.rhythm.state,reducedMotion};score.update(snapshot);
    assert.equal(dom.layer.hidden,false);assert.equal(dom.animations.length,reducedMotion?1:2);
    const visual=dom.animations.at(-1);assert.equal(visual.frames[1].offset,(snapshot.cardRhythm.opensAt-.6)/(snapshot.cardRhythm.closesAt-.6));
    const writes=dom.writes.length;score.update({...snapshot,time:500});assert.equal(dom.writes.length,writes);assert.equal(dom.animations.length,reducedMotion?1:2);
    score.update({...snapshot,worldRate:.35,cardRhythm:{...snapshot.cardRhythm,now:.8}});
    assert.equal(dom.animations.length,reducedMotion?1:2);assert.ok(dom.animations.every(animation=>animation.playbackRate===.35&&Math.abs(animation.currentTime-200)<1e-8));
    score.update({...snapshot,paused:true});assert.equal(dom.layer.hidden,true);assert.ok(dom.animations.every(animation=>animation.cancelled));score.destroy();
  }
});

test('equal world gaps catch through unequal wall gaps; equal wall gaps can miss after slowing',()=>{
  const f=fixture();let wall=0;
  const advance=(seconds,rate)=>{wall+=seconds;f.tick(f.engine.time+seconds*rate);};
  f.tap(0);advance(.6,1);f.tap(f.engine.time);advance(.6/.35,.35);
  assert.equal(f.tap(f.engine.time),true);assert.ok(wall>2.3);assert.equal(f.waves.length,1);
  const g=fixture();g.tap(0);g.tick(.6);g.tap(.6);g.tick(.6+.6*.35);
  assert.equal(g.tap(g.engine.time),false);assert.equal(g.rhythm.state.phase,'miss');assert.equal(g.waves.length,0);
});

test('a frozen world cannot expire a phrase and a slowed no-tap phrase uses its full world window',()=>{
  const f=fixture();f.tap(0);f.tap(.6);const end=f.rhythm.state.closesAt;
  for(let wall=0;wall<10;wall++)f.tick(.6);
  assert.equal(f.rhythm.state.phase,'two');
  f.tick(end+1/60);assert.equal(f.rhythm.state.phase,'miss');
  f.tick(end+RHYTHM_TUNING.dropSeconds+1/60);assert.equal(f.rhythm.state.phase,'idle');assert.equal(f.waves.length,0);
});

test('catch and miss animations share the world rate, including reduced motion',()=>{
  for(const phase of ['caught','miss'])for(const reducedMotion of [false,true]){
    const dom=fakeRoot(),score=createRhythmScore(dom.root),f=fixture();f.tap(0);f.tap(.6);f.tap(phase==='caught'?1.2:1.5);
    const state=f.rhythm.state;score.update({cardRhythm:state,worldRate:.35,reducedMotion});
    assert.ok(dom.animations.length>0);assert.ok(dom.animations.every(a=>a.playbackRate===.35&&Math.abs(a.currentTime)<1e-8));
    const count=dom.animations.length;score.update({cardRhythm:{...state,now:state.now+.1},worldRate:.8,reducedMotion});
    assert.equal(dom.animations.length,count);assert.ok(dom.animations.every(a=>a.playbackRate===.8&&Math.abs(a.currentTime-100)<1e-8));score.destroy();
  }
});
