import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard,getMountedCards,getCardModifiers} from '../dist/skill-cards.mjs';
import {EdgingPulse,getProximityClearance} from '../dist/edging-pulse.mjs';
import {proximityCardComparison} from '../dist/proximity-card-help.mjs';
import {WispFlight} from '../dist/flight.mjs';
const makeRun=ids=>{const s=M.newState();s.profile.tutorialComplete=true;const r=M.createRun(s.profile,'proximity-card',1,{cards:true});r.mountedCards=ids.map((id,i)=>id?makeSkillCard(id,`slot:${i}`):null);r.cardSlots=ids.length;r.reserveCards=[];return r;};
const engine=(range,gap)=>{const e={mod:{proximityUnlocked:true,cardProximitySources:range},running:true,alive:true,width:900,height:430,time:0,distance:0,player:{x:180,y:220,radius:9.35},obstacleCenter:o=>o.center};e.edgingPulse=new EdgingPulse(e);e.obstacles=[{x:0,width:500,center:220+9.35+gap,gap:0,bottomShape:[[0,0],[500,0],[500,200],[0,200]],sceneProps:[]}];return e;};

test('Edge Reach counts passive sources, native skill survives removal, Echo never repeats it',()=>{
  for(const [ids,sources] of [[['edge-reach'],1],[['chameleon','edge-reach'],2],[['echo-iii','edge-reach'],1],[['edge-reach','edge-reach'],2]]) {
    const run=makeRun(ids),mod=M.getRunModifiers(run);assert.equal(mod.cardProximitySources,sources);assert.equal(mod.proximityUnlocked,true);assert.equal(getProximityClearance(mod),48*(1+.5*sources));
  }
  const run=makeRun(['echo','edge-reach']);assert.match(getMountedCards(run)[0].copyPreview,/no action/);
  run.mountedCards=[null,null];assert.equal(M.getRunModifiers(run).proximityUnlocked,false);
  run.skills['proximity-awakening']=1;assert.equal(M.getRunModifiers(run).proximityUnlocked,true);assert.equal(getProximityClearance(M.getRunModifiers(run)),48);
});

test('actual solid-edge charge boundary is inclusive at 48/72/96 and excludes contact/open viewport/Dream/guard',()=>{
  for(const [sources,reach] of [[0,48],[1,72],[2,96]])for(const [gap,near] of [[0,false],[reach,true],[reach+.01,false]]){
    const e=engine(sources,gap);e.edgingPulse.update(1,e.obstacles);assert.equal(e.edgingPulse.nearEdge,near,`${sources} sources, gap ${gap}`);assert.equal(e.edgingPulse.charge,near?.5:0);
  }
  for(const mode of ['open','Dream','guard','invulnerable']){
    const e=engine(1,60);if(mode==='Dream')e.dream={phase:'dream'};if(mode==='guard')e.shield={protection:1};if(mode==='invulnerable')e.invulnerable=true;
    e.edgingPulse.update(1,mode==='open'?[]:e.obstacles);assert.equal(e.edgingPulse.charge,0,mode);
  }
  const before=engine(0,60),after=engine(1,60);before.edgingPulse.update(1,before.obstacles);after.edgingPulse.update(1,after.obstacles);
  assert.equal(before.edgingPulse.charge,0);assert.equal(after.edgingPulse.charge,.5);
  after.edgingPulse.update(1,after.obstacles);assert.equal(after.edgingPulse.triggerCount,1);assert.equal(after.edgingPulse.remaining,5);
});

test('expanded broadphase and polygon reach both admit a real solid beyond normal reach',()=>{
  const e=engine(1,60);e.player.x=0;e.player.y=200;
  const wall={x:69.35,width:10,center:200,gap:0,bottomShape:[[0,-90],[10,-90],[10,90],[0,90]],sceneProps:[]};
  e.edgingPulse.update(1,[wall]);assert.equal(e.edgingPulse.charge,.5);
  e.mod.cardProximitySources=0;e.edgingPulse.reset();e.edgingPulse.update(1,[wall]);assert.equal(e.edgingPulse.charge,0);
});

test('help uses exact cloned rows, honest full-slot displacement and all adjacent-copy effects without mutating source',()=>{
  const run=makeRun(['chameleon','body-spark','deep-vessel']);run.reserveCards=[makeSkillCard('edge-reach','reserve')];const original=structuredClone(run);
  assert.equal(proximityCardComparison(run,'reserve').needsSlot,true);
  const preview=proximityCardComparison(run,'reserve',1);assert.equal(preview.displaced.cardId,'body-spark');assert.equal(preview.beforeMod.cardProximitySources,0);assert.equal(preview.afterMod.cardProximitySources,2);
  assert.deepEqual(run,original);
  const mounted=makeRun(['chameleon','edge-reach',null]),comparison=proximityCardComparison(mounted,'slot:1');
  assert.equal(comparison.beforeMod.proximityUnlocked,false);assert.equal(comparison.afterMod.cardProximitySources,2);assert.equal(comparison.before.mountedCards[1],null);
  assert.deepEqual(comparison.afterMod,M.getRunModifiers(mounted));
  const common=makeRun([null,null,null]);common.reserveCards=[makeSkillCard('slip-feather','common')];
  const commonPreview=proximityCardComparison(common,'common');
  assert.equal(commonPreview.afterLabel,'With Proximity · slot 1');
  assert.equal(commonPreview.afterMod.proximityUnlocked,true);assert.equal(getProximityClearance(commonPreview.afterMod),48);
});

test('paused live reconcile applies/removes range without moving flight or firing on equip',()=>{
  const run=makeRun([null,null,null]),canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},
    e=new WispFlight({preflight:true,canvas,seed:'edge-range-live',modifiers:M.getRunModifiers(run)});
  try {
    e.running=true;e.paused=true;e.time=12;e.distance=1000;
    const before={time:e.time,distance:e.distance,y:e.player.y,vy:e.player.vy,fuel:e.flame};
    run.mountedCards[0]=makeSkillCard('edge-reach','live');
    assert.ok(e.reconcileCardLoadout({modifiers:M.getRunModifiers(run),condensedGlow:run.condensedGlow}));assert.equal(e.mod.proximityUnlocked,true);assert.equal(getProximityClearance(e.mod),72);assert.equal(e.edgingPulse.triggerCount,0);
    run.mountedCards[0]=null;assert.ok(e.reconcileCardLoadout({modifiers:M.getRunModifiers(run),condensedGlow:run.condensedGlow}));assert.equal(e.mod.proximityUnlocked,false);assert.equal(getProximityClearance(e.mod),48);
    assert.deepEqual({time:e.time,distance:e.distance,y:e.player.y,vy:e.player.vy,fuel:e.flame},before);
  } finally {e.destroy();}
});
