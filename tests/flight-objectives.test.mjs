import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {ROUTE_BONUSES} from '../dist/route-bonuses.mjs';
import {GLOW_DISPLAY_SCALE} from '../dist/vitality.mjs';
import {pickupKind} from '../dist/pickups.mjs';

function flight(id, modifiers={}) {
  const game=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})},
    preflight:true,seed:1,terrain:'canopy',duration:60,node:{mapIndex:1,row:2,difficulty:3,bonusId:id},
    modifiers:{proximityUnlocked:true,...modifiers}});
  game.running=true;
  return game;
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

test('all ten plans are deterministic, pure before acceptance, and mark real geometry',()=>{
  const game=flight(null), before=JSON.stringify(game.layout.embers);
  for(const id of Object.keys(ROUTE_BONUSES)){
    const p=game.planRouteObjective(id),second=flight(null).planRouteObjective(id);
    assert.ok(p,id);
    assert.deepEqual(p.targets.map(t=>[t.x,t.y]),second.targets.map(t=>[t.x,t.y]),id);
    for(const t of p.targets){
      assert.ok(t.x>=98+game.baseSpeed*2,id);
      assert.ok(game.objectiveBodyClear(t.x,t.y,9),id);
      if(t.type==='spark')assert.ok(game.layout.embers.includes(t.object),id);
    }
  }
  assert.equal(JSON.stringify(game.layout.embers),before);
  assert.equal(flight(null,{proximityUnlocked:false}).planRouteObjective('edgeweaver'),null);
  const dream=flight(null,{dreamDuration:10});
  for(const id of Object.keys(ROUTE_BONUSES))
    for(const t of dream.planRouteObjective(id)?.targets||[]) assert.ok(t.x>=98+dream.baseSpeed*12,id);
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
  assert.deepEqual(targets(suns).map(t=>pickupKind(t.object)),['cache','cache','cache']);
  [0,1,2].forEach(i=>take(suns,i));
  assert.ok(suns.routeObjective.complete);
});

test('relay has a real six-second Flash window',()=>{
  const game=flight('flash-relay');
  take(game,1);
  assert.equal(game.routeObjective.progress,0);
  take(game,0);
  assert.equal(game.sightUntil,6);
  take(game,2);
  game.time=5.99;
  take(game,3);
  assert.ok(game.routeObjective.complete);
  const late=flight('flash-relay');
  take(late,0);
  late.time=6.05;
  late.routeObjective.update();
  assert.ok(late.routeObjective.failed);

});

test('Constellation recovers a missed first mark, ignores completed layers, and requires all three in order',()=>{
  const game=flight('constellation');
  const marks=targets(game);
  assert.deepEqual(marks.map(t=>pickupKind(t.object)),['light','light','cluster','cluster','cache','cache']);
  visit(game,marks[0].x+40,0); // Fly past the first one without collecting it.
  game.routeObjective.update();
  assert.equal(game.routeObjective.progress,0);
  visit(game,marks[1].x,marks[1].y);
  take(game,1);
  assert.equal(game.routeObjective.progress,1);
  take(game,2);
  take(game,3);
  assert.equal(game.routeObjective.progress,2);
  take(game,4);
  assert.ok(game.routeObjective.complete);
  const skipped=flight('constellation');
  take(skipped,2);
  take(skipped,4);
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
