import test from 'node:test';
import assert from 'node:assert/strict';
import {createComboLessonController,COMBO_LESSON_GAP} from '../dist/combo-lesson.mjs';
import {newState,createRun,startTutorial} from '../dist/model.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function lesson(mode='guided',width=900,height=405){
  return createComboLessonController({mode,preflight:true,canvas:{style:{},getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width,height})}});
}
function advance(controller,seconds){for(let remaining=seconds;remaining>1e-8;remaining-=.01)controller.advance(Math.min(.01,remaining));}

test('guided practice waits for each manual Lift, emits one real wave and pays exactly one Spark on crossing',()=>{
  const controller=lesson(),e=controller.engine;
  try{
    assert.deepEqual(controller.run.mountedCards.map(c=>[c.cardId,c.rank]),[['rhythm',1],['harvest-common',1]]);
    advance(controller,8);assert.equal(e.flaps,0);near(e.time,0);
    assert.ok(controller.lift());assert.equal(controller.lift(),false,'a waiting beat never auto-Lifts or accepts a too-early tap');
    advance(controller,4);near(e.time,COMBO_LESSON_GAP);assert.equal(controller.state.phase,'beat');
    advance(controller,15);near(e.time,COMBO_LESSON_GAP);
    assert.ok(controller.lift());advance(controller,5);near(e.time,COMBO_LESSON_GAP*2);
    assert.equal(e.cardRhythm.waves,0);assert.equal(controller.state.restored,0);
    assert.ok(controller.lift());assert.equal(e.flaps,3);assert.equal(e.cardRhythm.waves,1);
    assert.equal(e.luminanceWaves.waves.length,1);assert.equal(e.luminanceWaves.sources.size,0);
    assert.equal(controller.state.phase,'wave');const meterBefore=e.flame;
    assert.equal(controller.target.collected,false);assert.equal(controller.state.restored,0);
    advance(controller,5);
    assert.equal(controller.state.phase,'complete');assert.equal(controller.state.restored,1);
    near(e.flame-meterBefore,10/3);assert.equal(controller.target.collected,false);
    assert.equal(e.bodyPickups,0);assert.equal(e.collectorPickups,0);assert.equal(e.cardRhythm.waves,1);
    advance(controller,30);near(e.flame,meterBefore+10/3);
    assert.equal(controller.lift(),false,'the resolved lesson cannot send another wave');
  }finally{controller.destroy();}
});

test('free pace uses the real rhythm tolerance and an uneven phrase never pays',()=>{
  for(const gaps of [[.8,.8],[.8,1.2]]){
    const controller=lesson('free'),e=controller.engine;
    try{
      controller.lift();advance(controller,gaps[0]);controller.lift();advance(controller,gaps[1]);
      if(controller.state.phase!=='miss')controller.lift();advance(controller,3);
      if(gaps[0]===gaps[1]){assert.equal(controller.state.phase,'complete');assert.equal(controller.state.restored,1);}
      else{assert.equal(controller.state.phase,'miss');assert.equal(e.cardRhythm.waves,0);assert.equal(controller.state.restored,0);}
      assert.equal(controller.target.collected,false);assert.equal(e.dying,false);
    }finally{controller.destroy();}
  }
});

test('safe practice works on short landscape screens, resets cleanly and never edits campaign or prologue continuation',()=>{
  const state=newState();state.run=createRun(state.profile,'real-combo-save');startTutorial(state,{forNewGame:true,difficulty:2});
  const before=JSON.stringify(state);
  for(const [width,height] of [[900,405],[720,320],[390,660]]){
    const controller=lesson('guided',width,height);
    try{
      for(let i=0;i<3;i++){controller.lift();advance(controller,i<2?2:5);}
      assert.equal(controller.state.phase,'complete',`${width} × ${height}`);
      assert.equal(controller.state.restored,1);assert.equal(controller.target.collected,false);
      assert.equal(controller.engine.dying,false);assert.equal(controller.engine.collisions,0);
    }finally{controller.destroy();}
  }
  const replay=lesson();assert.equal(replay.state.lifts,0);assert.equal(replay.state.sparks,18);assert.equal(replay.state.waves,0);replay.destroy();
  assert.equal(JSON.stringify(state),before);
});
