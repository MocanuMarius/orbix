import assert from 'node:assert/strict';
import test from 'node:test';
import {WispFlight} from '../dist/flight.mjs';
import {blackHoleDrainRate} from '../dist/black-holes.mjs';
import {bellwindAcceleration,drawAtlasGuardian,moonDrainScale} from '../dist/atlas-flight.mjs';

const step=1/60;
function passage(forecast,{seed='atlas-c7',mapIndex=1,boss=false,bonusId}={}){
  const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
  const game=new WispFlight({canvas,preflight:true,seed,terrain:'canopy',duration:70,companions:['protector'],
    node:{atlasForecast:forecast,mapIndex,row:boss?6:3,difficulty:2,boss,bossId:'storm-shepherd',bonusId}});
  game.running=true;
  game.render=()=>{};
  return game;
}
const fuelLedger=engine=>engine.layout.embers.map(p=>[p.id,p.kind,p.value,Math.round(p.x)]);

test('a marked map 2 forecast preserves baseline fuel cadence, repeatable placement and ordinary runs',()=>{
 for(const seed of ['a','b','c','d']){
   const base=passage(null,{seed});
   for(const id of ['bellwind','hollow-moon']){
     const g=passage(id,{seed}), replay=passage(id,{seed});
     assert.deepEqual(fuelLedger(g),fuelLedger(base));
     assert.deepEqual(fuelLedger(g),fuelLedger(replay));
     assert.ok((g.atlas.bells||g.atlas.moons).length);
     assert.equal(passage(id,{mapIndex:0,seed}).atlas,null);
     assert.equal(passage(id,{mapIndex:2,seed}).atlas,null);
   }
   assert.equal(base.atlas,null);
 }
});

test('a bell rings on approach and the regular flight physics carry a rider into the original Spark',()=>{
 for(const seed of ['atlas-r0','atlas-r1','atlas-r2']){
  const g=passage('bellwind',{seed}), bell=g.atlas.bells[0];
  const chimes=[];
  g.sound=t=>chimes.push(t);
  g.time=10;
  g.distance=bell.start-g.player.x-g.baseSpeed;
  g.player.y=bell.y+bell.rise;
  g.step(step);
  assert.deepEqual(chimes,['bellwind']);
  assert.equal(bellwindAcceleration(g,bell.start,bell.y+bell.rise+42*g.scaleY,0),0);
  g.distance=bell.start-g.player.x;
  g.player.y=bell.y+bell.rise;
  g.player.vy=0;
  let frames=0;
  while(g.distance+g.player.x<bell.x+3 && frames++<120)g.step(step);
  assert.ok(bell.packet.collected);
  assert.ok(g.player.y<bell.y+8);
  assert.equal(g.flaps,0);
  assert.equal(chimes.filter(t=>t==='bellwind').length,1);
  assert.ok(g.alive&&!g.dying);
 }
});

test('the eclipse changes vision and finite environmental drain without raising the inner drain rate',()=>{
 const g=passage('hollow-moon'), h=g.atlas.moons[0].hole, base=passage(null);
 g.distance=h.x-g.player.x;
 g.player.y=h.y;
 assert.equal(moonDrainScale(g,h),1);
 assert.ok(g.getLightState().radius<base.getLightState().radius);
 g.blackHoles.update(step);
 assert.ok(Math.abs(g.blackHoles.rate-blackHoleDrainRate(0,h.influence))<1e-6);
 g.player.y=h.bypass.y;
 assert.ok(g.getLightState().radius>base.getLightState().radius*1.25);
 assert.ok(moonDrainScale(g,h)<.21);
 // Verify a positive raw debit at the edge of a real outer lane.
 g.player.y += Math.sign(h.y-h.bypass.y)*Math.max(24,Math.abs(h.bypass.y-h.y)-h.influence+20);
 const raw=blackHoleDrainRate(Math.abs(g.player.y-h.y),h.influence);
 assert.ok(raw>0);
 g.blackHoles.update(step);
 assert.ok(g.blackHoles.rate<raw);
 assert.equal(g.condensedGlow,0);
});

test('guardian forecast artwork responds at the silhouette and ordinary guardians have no crest',()=>{
 const context=()=>({n:0,save(){},restore(){},translate(){},scale(){},fillRect(){this.n++;}});
 for(const id of ['bellwind','hollow-moon']){
   const g=passage(id,{boss:true}), c=context();
   drawAtlasGuardian(c,g,{x:80,y:100,h:400,time:1});
   assert.ok(c.n>5);
   assert.ok((g.atlas.bells||g.atlas.moons).length);
 }
 const c=context();
 drawAtlasGuardian(c,passage(null,{boss:true}),{x:80,y:100,h:400,time:1});
 assert.equal(c.n,0);
});
