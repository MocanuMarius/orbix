import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,newState,buyCheckpointSkill,saveState,loadState,getRunModifiers} from '../dist/model.mjs';
import {WispFlight,FLIGHT_TUNING,circleHitsObstacle} from '../dist/flight.mjs';
import {FlightProjection} from '../dist/flight-projection.mjs';
import {projectedLiftCost} from '../dist/flight-projection.mjs';

function flight(modifiers,role='collector') {
  const engine=new WispFlight({
    canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})},
    preflight:true,seed:'beat',companions:[role],modifiers
  });
  engine.running=true;
  let seconds=0;
  engine.fourthBeatNow=()=>seconds;
  function tap(at) {
    seconds=at;
    const accepted=engine.beginLiftInput();
    engine.endLiftInput();
    return accepted;
  }
  return {engine,tap,setTime:at=>{seconds=at;}};
}

test('legacy skill identities survive reload and provide Double Lift or Climb at zero Sparks',()=>{
  const state=newState();
  state.run=createRun(state.profile,'buy-beat');
  state.run.condensedGlow=500;
  assert.equal(buyCheckpointSkill(state,'main-fourth-beat'),false);
  assert.ok(buyCheckpointSkill(state,'main-efficiency'));
  const data=new Map();
  const storage={setItem:(key,value)=>data.set(key,value),getItem:key=>data.get(key)};
  for(const [id,needed] of [['main-fourth-beat',2],['main-fourth-beat-2',3]]) {
    assert.ok(buyCheckpointSkill(state,id));
    assert.ok(saveState(state,storage));
    const {engine,tap}=flight(getRunModifiers(loadState(storage).run));
    engine.flame=engine.flapCost;
    for(let i=0;i<needed-1;i++)assert.ok(tap(i*.25));
    assert.ok(engine.flame<1e-7);
    const impulse=engine.player.vy;
    const hud=engine.getState();
    assert.ok(hud.canFlap && hud.fourthBeat.ready);
    assert.equal(hud.flapCost,0);
    assert.ok(tap(1),'includes the one-second boundary');
    assert.equal(engine.player.vy,impulse);
    assert.equal(engine.fourthBeat.count,0);
    assert.equal(tap(1.01),false);
  }
});

test('a Space Timer hover or an interrupted input clears the rapid Lift phrase',()=>{
  const {engine,tap,setTime}=flight({fourthBeatRank:1},'leveler');
  assert.ok(tap(0));
  assert.ok(engine.fourthBeat.ready);
  assert.ok(tap(.7));
  assert.equal(engine.fourthBeat.count,0);
  assert.ok(tap(1.5));
  setTime(1.7);
  assert.ok(engine.beginLiftInput());
  assert.equal(engine.beginLiftInput(),false);
  engine.time+=.2;
  engine.updateLeveler(.2);
  assert.equal(engine.fourthBeat.count,0);
  engine.endLiftInput();
  assert.ok(tap(1.9));
  engine.pause();
  assert.equal(engine.fourthBeat.count,0);
});

test('a ready Beat spends before stored free Lifts and route boons, and Dream never primes it',()=>{
  const {engine,tap}=flight({fourthBeatRank:2});
  engine.dream={freeGlow:true};
  for(const t of [0,.1,.2])assert.ok(tap(t));
  engine.dream=null;
  assert.equal(engine.fourthBeat.count,0);
  assert.ok(tap(.3));
  engine.flame=0;
  engine.artifactEffects.freeLift=true;
  engine.flightBoon.giftLifts=1;
  assert.ok(tap(.4));
  assert.equal(engine.fourthBeat.count,2,'free second Lift preserves the third opportunity');
  assert.ok(tap(.5));
  assert.ok(engine.artifactEffects.freeLift);
  assert.equal(engine.flightBoon.giftLifts,1);
  assert.ok(tap(.6));
  assert.equal(engine.artifactEffects.freeLift,false);
  assert.equal(engine.flightBoon.giftLifts,1);
});

test('the guide can show a free Lift now and rejects a route that would use it after expiry',()=>{
  const {engine,tap,setTime}=flight({fourthBeatRank:1,driftSense:3,lightRadius:400});
  assert.ok(tap(0));
  engine.layout.obstacles=[];
  engine.layout.boss=null;
  engine.biomeDynamics=null;
  engine.drafts.zones=[];
  engine.player.y=180;
  engine.player.vy=0;
  engine.flame=0;
  const guide=new FlightProjection(FLIGHT_TUNING,circleHitsObstacle);
  const delayed=guide.predict(engine,3,[.8]).points.find(p=>p.time>=1);
  engine.layout.embers=[{kind:'light',x:delayed.x,y:delayed.y}];
  assert.ok(guide.findRoute(engine));
  setTime(.95);
  assert.equal(projectedLiftCost(engine),0);
  assert.ok(Object.hasOwn(guide.read(engine),'liftContact'));
  assert.equal(guide.findRoute(engine),null);
  assert.deepEqual(engine.fourthBeatTaps,[0]);
  setTime(1.01);
  engine.time+=.1;
  assert.equal(guide.read(engine).liftContact,undefined);
});
