import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,createRun,getRunModifiers,equipOwnedCard} from '../dist/model.mjs';
import {makeSkillCard,CARD_ROW_EVENTS} from '../dist/skill-cards.mjs';
import {getDeckComboLinks,deckSwapComboMarkup} from '../dist/deck-combos.mjs';
import {WispFlight} from '../dist/flight.mjs';

function row(ids,artifacts=['dawn-loom']){
  const state=newState(),run=state.run=createRun(state.profile,'deck-combos',1,{cards:true,cardSlots:3});
  run.companions=['collector'];run.companionRole='collector';run.artifacts=artifacts;
  run.mountedCards=ids.map((id,i)=>id?makeSkillCard(id,`mounted:${i}`):null);run.reserveCards=[];
  return run;
}
const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
function flight(ids){
  const run=row(ids),engine=new WispFlight({canvas,preflight:true,seed:'deck-combos',companions:['collector'],modifiers:getRunModifiers(run)});
  engine.render=()=>{};engine.start({paused:true});engine.paused=false;return engine;
}
const pickup=engine=>engine.collect({kind:'light',x:engine.player.x+engine.distance,y:engine.player.y});

test('mounted connections use current rank, actual sources and either mounting order',()=>{
  const run=row(['harvest-common','ring-spring-ii','rhythm']);
  run.mountedCards[0].rank=3;
  const links=getDeckComboLinks(run);
  assert.equal(links[0].sourceSlot,2);assert.equal(links[0].targetSlot,0);
  assert.equal(links[0].result,'+3 on crossing');assert.equal(links[1].result,'−2s → light ahead');
  run.artifacts=[];assert.equal(getDeckComboLinks(run).length,1);
  run.companions=['swift'];assert.equal(getDeckComboLinks(run).length,1);
  const copied=row(['rhythm','echo','harvest-common']);
  assert.equal(getDeckComboLinks(copied)[0].targetSlot,2,'connection highlights the actual printed Harvest condition');
});

test('swap preview explains Toll Bell losing its trigger and Echo gaining its immediate right target',()=>{
  const run=row(['rhythm','harvest-common','ring-spring']);
  const bell=makeSkillCard('toll-bell','incoming');run.reserveCards=[bell];
  let after=structuredClone(run);equipOwnedCard(after,bell.instanceId,0,run.mountedCards[0].instanceId);
  assert.match(deckSwapComboMarkup(run,after,bell),/Needs Rhythm/);
  after=structuredClone(run);equipOwnedCard(after,bell.instanceId,2,run.mountedCards[2].instanceId);
  assert.match(deckSwapComboMarkup(run,after,bell),/3 evenly timed Lifts also give \+2/);
  const echo=makeSkillCard('echo','echo');run.reserveCards.push(echo);
  after=structuredClone(run);equipOwnedCard(after,echo.instanceId,0,run.mountedCards[0].instanceId);
  assert.match(deckSwapComboMarkup(run,after,echo),/Echo → Resonant Harvest/);
});

// Retired (artifacts removed, docs/inscriptions.md): Dawn Loom is an artifact and artifacts no longer apply.
test.skip('real Ring Spring overfill lights Dawn Loom only after positive recovery, respecting its cooldown',()=>{
  const engine=flight(['ring-spring',null,null]);
  const callbacks=[],original=engine.artifactEffects.onRecharge.bind(engine.artifactEffects);
  engine.artifactEffects.onRecharge=seconds=>{callbacks.push(seconds);original(seconds);};
  engine.flame=engine.maxFlame;engine.wisp.cooldown=5;pickup(engine);
  assert.equal(engine.wisp.cooldown,4);assert.deepEqual(callbacks,[1]);
  assert.equal(engine.artifactEffects.state.forwardLight,1.5);assert.equal(engine.artifactEffects.procCounts['dawn-loom'],1);
  engine.time=1;pickup(engine);assert.equal(engine.artifactEffects.procCounts['dawn-loom'],1);
  engine.time=4;pickup(engine);assert.equal(engine.artifactEffects.procCounts['dawn-loom'],2);
  engine.time=8;engine.wisp.cooldown=0;pickup(engine);
  assert.deepEqual(callbacks,[1,1,1]);assert.equal(engine.artifactEffects.procCounts['dawn-loom'],2);
  engine.destroy();
});

test('non-pickup row recovery cannot trigger Dawn Loom',()=>{
  const engine=flight(['rhythm','pacesetter','counterweight']);
  engine.wisp.cooldown=5;
  engine.resolveCardRowEvent(CARD_ROW_EVENTS.rhythm);
  engine.resolveCardRowEvent(CARD_ROW_EVENTS.lift);
  assert.ok(engine.wisp.cooldown<5);assert.equal(engine.artifactEffects.procCounts['dawn-loom'],0);
  engine.destroy();
});
