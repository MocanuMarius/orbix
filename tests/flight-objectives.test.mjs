import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {ROUTE_BONUSES} from '../dist/route-bonuses.mjs';
import {GLOW_DISPLAY_SCALE} from '../dist/vitality.mjs';
import {getPickupSpec} from '../dist/pickups.mjs';
import {sparkMass} from '../dist/spark-size.mjs';
import {createFlightObjective} from '../dist/flight-objectives.mjs';

const fixtureSeeds=new Map();
function flight(id, modifiers={},spare=false) {
  const key=id+':'+spare;
  const choices=fixtureSeeds.has(key)?[fixtureSeeds.get(key)]:[{seed:1,duration:60},...Array.from({length:40},(_,i)=>({seed:i+1,duration:140}))];
  for(const spec of choices){
    const game=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})},
      preflight:true,...spec,terrain:'canopy',node:{mapIndex:1,row:2,difficulty:3,bonusId:id},
      modifiers:{proximityUnlocked:true,...modifiers}});
    if(id==null||game.routeObjective.eligible&&(!spare||game.routeObjective.targets.filter(t=>t.stage===0).length>1)){
      fixtureSeeds.set(key,spec);game.running=true;return game;
    }
    game.destroy();
  }
  throw Error('No funded objective fixture for '+id);
}
const targets = game=>game.routeObjective.targets;
function visit(game,x,y) {
  game.distance=x-game.player.x;
  game.player.y=y;
}
function take(game,index,extra={}) {
  const packet=Object.assign(targets(game)[index].object,extra);
  game.collect(packet);
}

test('an 18-Spark Cache counts as one pickup, names its real fuel and keeps generated motes out of onboarding',()=>{
  const game=flight(null,{maxGlow:300});
  const x=game.distance+game.player.x+90,y=game.player.y;
  const mote={kind:'light',generated:true,x:x-20,y};
  const surge={kind:'cache',value:3,sparkMass:3,x,y};
  game.layout.embers=[mote,surge];
  assert.equal(game.getNearbyPickup()?.packet,surge);
  game.flame=0;
  game.collect(surge);
  game.collect(surge);
  assert.equal(game.event,'Spark Cache · +18 Sparks');
  assert.equal(game.baseEmbers,1);
  assert.equal(game.bodyFuelCollected,1);
  game.collect(mote);
  assert.equal(game.baseEmbers,1);
  assert.equal(game.bodyFuelCollected,1);
  game.destroy();
});

test('all eligible plans are deterministic, pure to inspect, and mark funded real geometry',()=>{
  for(const id of Object.keys(ROUTE_BONUSES)){
    const game=flight(id),before=JSON.stringify(game.layout.embers);
    const p=game.planRouteObjective(id),second=flight(id).planRouteObjective(id);
    assert.ok(p,id);
    assert.deepEqual(p.targets.map(t=>[t.x,t.y]),second.targets.map(t=>[t.x,t.y]),id);
    for(const t of p.targets){
      assert.ok(t.x>=98+game.baseSpeed*2,id);
      assert.ok(game.objectiveBodyClear(t.x,t.y,9),id);
      if(t.type==='spark')assert.ok(game.layout.embers.includes(t.object),id);
    }
    assert.equal(JSON.stringify(game.layout.embers),before);game.destroy();
  }
  assert.equal(flight(null,{proximityUnlocked:false}).planRouteObjective('edgeweaver'),null);
  const dream=flight(null,{dreamDuration:10});
  for(const id of Object.keys(ROUTE_BONUSES))
    for(const t of dream.planRouteObjective(id)?.targets||[]) assert.ok(t.x>=98+dream.baseSpeed*12,id);
});

test('Spark Trail recovers two missed marks, counts Collector deliveries, and never adds fuel',()=>{
 const bare=flight(null),game=flight('spark-trail');
 const before=game.layout.embers.map(p=>[p.id,p.x,p.y,p.kind,p.value]);
 assert.equal(targets(game).length,5);
 for(const index of [2,3,4])take(game,index,{deliveredByWisp:true});
 assert.ok(game.routeObjective.complete);assert.equal(game.routeObjective.progress,3);
 assert.deepEqual(game.layout.embers.map(p=>[p.id,p.x,p.y,p.kind,p.value]),before);
 assert.ok(targets(game).every(t=>!t.object.generated));
 const dream=flight('spark-trail');dream.dream={active:true,mode:'replay'};
 for(let i=0;i<5;i++)take(dream,i);
 assert.equal(dream.routeObjective.progress,0);
 bare.destroy();game.destroy();dream.destroy();
});

test('collection needs distinct marked natural packets, Precision needs the body, and Dream never earns a mark or Packing credit',()=>{
  const game=flight('precision');
  take(game,0,{deliveredByWisp:true});
  const wakingPacked=game.routeObjective.packed;
  game.dream={active:true,mode:'replay'};
  take(game,1);
  assert.equal(game.getState().routeBonus.packed,wakingPacked);
  game.dream=null;
  for(let i=2;i<6;i++)take(game,i);
  assert.equal(game.getState().routeBonus.complete,true);
  assert.equal(game.getState().routeBonus.progress,4);
  const gilded=flight('gilded');
  const [t]=targets(gilded);
  gilded.condensedRemainder=.98;
  gilded.storeNaturalOverflow({collected:true},{fuel:20},1);
  assert.equal(gilded.condensedGlow,1);
  assert.equal(gilded.routeObjective.packed,0);
  gilded.dream={active:true,mode:'replay'};
  gilded.storeNaturalOverflow({collected:true},{fuel:20},80);
  assert.equal(gilded.routeObjective.packed,0);
  gilded.dream=null;
  gilded.collect({...t.object});
  assert.equal(gilded.routeObjective.progress,0);
  take(gilded,0,{fetchedInDream:true});
  for(let i=1;i<5;i++)take(gilded,i);
  assert.equal(gilded.routeObjective.complete,true);
  const suns=flight('three-suns');
  assert.deepEqual(targets(suns).map(t=>sparkMass(t.object)),[3,3,3]);
  [0,1,2].forEach(i=>take(suns,i));
  assert.ok(suns.routeObjective.complete);
});

test('Flash Relay marks a single Flash Powerup and accepts Sparks throughout its light',()=>{
  const game=flight('flash-relay');
  const natural=targets(game)[0].object;
  const fuelBefore=game.layout.embers.filter(p=>getPickupSpec(p).fuel>0).length;
  game.routeObjective=createFlightObjective(game,'flash-relay');
  assert.equal(targets(game)[0].object,natural);
  assert.equal(game.layout.embers.filter(p=>p.kind==='sight').length,1);
  assert.equal(game.layout.embers.filter(p=>getPickupSpec(p).fuel>0).length,fuelBefore);
  const duration=getPickupSpec('sight').sightDuration;
  take(game,1);
  assert.equal(game.routeObjective.progress,0);
  take(game,0);
  assert.equal(game.sightUntil,duration);
  take(game,2);
  game.time=duration-.01;
  take(game,3);
  assert.ok(game.routeObjective.complete);
  const late=flight('flash-relay');
  take(late,0);
  late.time=duration+.05;
  late.routeObjective.update();
  assert.ok(late.routeObjective.failed);

});

test('Constellation recovers a missed first mark, ignores completed layers, and requires all three in order',()=>{
  const game=flight('constellation',{},true);
  const marks=targets(game);
  const groups=[0,1,2].map(stage=>marks.filter(t=>t.stage===stage));
  assert.ok(groups[0].length>=2&&groups[1].length>=1&&groups[2].length>=1);
  assert.ok(marks.every(t=>sparkMass(t.object)===t.stage+1));
  visit(game,marks[0].x+40,0); // Fly past the first one without collecting it.
  game.routeObjective.update();
  assert.equal(game.routeObjective.progress,0);
  visit(game,marks[1].x,marks[1].y);
  take(game,1);
  assert.equal(game.routeObjective.progress,1);
  take(game,marks.indexOf(groups[1][0]));
  if(groups[1][1])take(game,marks.indexOf(groups[1][1]));
  assert.equal(game.routeObjective.progress,2);
  take(game,marks.indexOf(groups[2][0]));
  assert.ok(game.routeObjective.complete);
  const skipped=flight('constellation',{},true);
  take(skipped,marks.indexOf(groups[1][0]));
  take(skipped,marks.indexOf(groups[2][0]));
  assert.equal(skipped.routeObjective.progress,0);
  const lastOne=targets(skipped)[1];
  visit(skipped,lastOne.x+800,lastOne.y);
  skipped.routeObjective.update();
  assert.ok(skipped.routeObjective.failed);
});

test('the predicted two-second glide succeeds in actual fixed-step flight; lifting between its pickups breaks it',()=>{
  const game=flight('long-glide'), start=game.routeObjective.guide[0];
  visit(game,start.x,start.y);
  game.time=(start.x-98)/game.baseSpeed;
  assert.ok(game.flap());
  for(let frame=0;frame<132;frame++)game.step(1/60);
  assert.ok(game.alive && !game.dying);
  assert.ok(game.routeObjective.complete);
  const cancelled=flight('long-glide');
  take(cancelled,0);
  cancelled.flap();
  cancelled.routeObjective.update();
  assert.ok(cancelled.routeObjective.failed);
});

test('real terrain actors, two different Proximity zones and flight through gates credit only their own marks',()=>{
  const wild=flight('wild-circuit');
  for(const t of targets(wild)){
    visit(wild,t.object.x,t.object.baseY);
    wild.biomeDynamics.update(1/60);
    wild.routeObjective.update();
    assert.ok(t.object.spent);
  }
  assert.ok(wild.routeObjective.complete);
  const edge=flight('edgeweaver');
  for(const t of targets(edge)){
    for(const pt of t.ribbon){
      visit(edge,pt.x,pt.y);
      edge.edgingPulse.update(32/edge.baseSpeed,edge.layout.obstacles);
      edge.routeObjective.update();
    }
    if(edge.routeObjective.progress===1){
      visit(edge,t.end+200,edge.height*.5);
      for(let tick=0;tick<9*60;tick++)edge.edgingPulse.update(1/60,[]);
    }
  }
  assert.ok(edge.routeObjective.complete);
  const gate=flight('wayfinder');
  for(const t of targets(gate)){
    visit(gate,t.x,t.y+t.radius+4);
    gate.routeObjective.update();
    const before=gate.routeObjective.progress;
    visit(gate,t.x,t.y);
    gate.routeObjective.update();
    gate.routeObjective.update();
    assert.equal(gate.routeObjective.progress,before+1);
  }
  assert.ok(gate.routeObjective.complete);
});

test('Night Sail waits until the marked hole has passed and counts its Energy drain only',()=>{
  for(const drain of [3,3.1]){
    const game=flight('night-sail'), hole=game.routeObjective.hole;
    take(game,0);
    take(game,1);
    assert.equal(game.routeObjective.complete,false);
    hole.drained=drain/GLOW_DISPLAY_SCALE;
    visit(game,hole.x+hole.influence+1,hole.bypass.y);
    game.routeObjective.update();
    assert.equal(game.routeObjective.complete,drain===3);
    assert.equal(game.routeObjective.failed,drain>3);
  }
});
