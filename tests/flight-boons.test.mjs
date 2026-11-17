import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {dreamFingerprint} from '../dist/dream.mjs';

const near = (actual, expected) => assert.ok(Math.abs(actual-expected)<1e-7, actual+' ≠ '+expected);
function engine(boon, role='collector', extra={}) {
  const context = new Proxy({}, {
    get:(object,key)=>object[key] ?? (String(key).includes('Gradient') ? ()=>({addColorStop(){}}) : ()=>{}),
    set:(object,key,value)=>(object[key]=value,true)
  });
  const flight = new WispFlight({
    canvas:{style:{},getContext:()=>context,getBoundingClientRect:()=>({width:900,height:405})},
    node:{row:3,mapIndex:1}, duration:40, seed:'route-boon', companions:[role],
    modifiers:{flightBoon:boon, ...extra}
  });
  flight.running = true;
  return flight;
}
function packet(engine,kind='light',extra={}) {
  return {x:engine.distance+engine.player.x, y:engine.player.y,kind, phase:0, ...extra};
}

test('Long Glide pays at most nine Energy, preserving free Dream and artifact uses',()=>{
  const flight=engine('long-glide','collector',{liftCostPoints:4});
  flight.dream={active:true,mode:'replay',freeGlow:true};
  flight.flap(); assert.equal(flight.flightBoon.lifts,3);
  flight.dream=null; flight.artifactEffects.freeLift=true;
  flight.flap(); assert.equal(flight.flightBoon.lifts,3);
  const before=flight.flame;
  for(let i=0;i<3;i++) assert.ok(flight.flap());
  near((before-flight.flame)*.3,3);
  near(flight.nextLiftCost*.3,4);
  const empty=engine('long-glide');
  empty.flame=0;
  for(let i=0;i<3;i++) assert.ok(empty.flap());
  assert.equal(empty.flap(),false);
});

test('Edgeweaver catches one collision, pays first Protector use, and cannot shield a second hit',()=>{
  for(const role of ['collector','protector']){
    const flight=engine('edgeweaver',role);
    flight.flame=0; flight.player.y=flight.height-1;
    flight.hit(null);
    assert.equal(flight.dying,false);
    assert.equal(flight.flightBoon.wardReady,false);
    assert.equal(flight.shield.charges,0);
    assert.ok(flight.player.vy<0);
    flight.shield.protection=0;
    flight.hit(null);
    assert.equal(flight.dying,true);
  }
});

test('Wild Circuit accelerates each equipped role after the dream opening',()=>{
  const runner=engine('wild-circuit','swift');
  runner.dream={active:true,mode:'replay'};
  const full=runner.roleCooldown('swift');
  runner.dream=null; near(runner.roleCooldown('swift'),full/1.2);
  const leveler=engine('wild-circuit','leveler');leveler.levelCharge=0;leveler.updateLeveler(.1);
  const same=engine(null,'leveler');same.levelCharge=0;same.updateLeveler(.1);
  near(leveler.levelCharge,same.levelCharge*1.2);
  const collector=engine('wild-circuit');collector.wisp.cooldown=5;collector.wisp.update(collector,.1);
  near(collector.wisp.cooldown,4.88);
  const protector=engine('wild-circuit','protector');protector.shield.charges=0;protector.shield.recovery=5;protector.step(.1);
  near(protector.shield.recovery,4.88);
});

test('Flare Relay and Night Sail use time-limited light or actual simulated hole drain',()=>{
  const flight=engine('flash-relay','collector',{lightRadius:180});
  near(flight.getLightState().baseRadius,225);
  flight.time=15;near(flight.getLightState().baseRadius,180);
  flight.time=4;flight.dream={duration:6,active:true,mode:'replay'};near(flight.getLightState().baseRadius,180);
  flight.time=17;flight.dream.active=false;near(flight.getLightState().baseRadius,225);
  const holeTest=boon=>{
    const f=engine(boon);
    f.blackHoles.items=[{id:'hole',x:f.distance+f.player.x+70,y:f.player.y,influence:220,drained:0,drainSequence:0}];
    const before=f.flame;f.blackHoles.update(.1);return before-f.flame;
  };
  const ordinary=holeTest(null);assert.ok(ordinary>0);
  near(holeTest('night-sail'),ordinary*.75);
});

test('Constellation grants up to six bonus Energy only from natural waking fuel, without packing that bonus',()=>{
  const f=engine('constellation');
  f.collect(packet(f,'light',{generated:true}));
  f.collect(packet(f,'sight'));
  f.dream={mode:'replay',active:true};f.collect(packet(f));f.dream=null;
  assert.equal(f.flightBoon.pickups,3);
  const baseline=engine(null);
  for (const state of [f,baseline]) {
    state.condensedGlow=0;state.condensedRemainder=0;
    state.flame=state.maxFlame;state.collect(packet(state));
  }
  near(f.condensedGlow,baseline.condensedGlow);
  near(f.condensedRemainder,baseline.condensedRemainder);
  for(const flight of [f,baseline]) {
    flight.flame=0;
    for(let i=0;i<3;i++) flight.collect(packet(flight));
  }
  near((f.flame-baseline.flame)*.3,4);
  assert.equal(f.flightBoon.pickups,0);
});

test('Wayfinder draws only at the initial safe pause, and waking rewards preserve Dream compatibility',()=>{
  const f=engine('wayfinder');
  const base={modifiers:{speed:1},node:{id:'abc'}};
  assert.equal(dreamFingerprint(base),dreamFingerprint({...base,modifiers:{...base.modifiers,flightBoon:'wayfinder'}}));
  assert.notEqual(dreamFingerprint(base),dreamFingerprint({...base,modifiers:{speed:1.1}}));
  let rectangles=0;
  const ctx=new Proxy({fillRect(){rectangles++;}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  f.paused=true;f.drawWayfinder(ctx);assert.ok(rectangles>0);
  const first=rectangles;f.dream={mode:'record',active:true};f.drawWayfinder(ctx);assert.equal(rectangles,first);
  f.dream=null;
  const previous=globalThis.requestAnimationFrame;
  try {globalThis.requestAnimationFrame=()=>42;f.resume();f.paused=true;f.drawWayfinder(ctx);assert.equal(rectangles,first);}
  finally{globalThis.requestAnimationFrame=previous;}
});
