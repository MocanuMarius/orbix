import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {getCardModifiers,isCardDreamRoute,makeSkillCard,describeSkillCard,getMountedCards} from '../dist/skill-cards.mjs';
import {attachDream,canDreamAt,dreamConfig,prepareDreamHandoff,validateDreamPreset} from '../dist/dream.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {renderLightState} from '../dist/light-field.mjs';
import {cardRestMarkup,cardFace} from '../dist/card-ui.mjs';
import {flightPreviewMarkup} from '../dist/flight-preview.mjs';
import {createCardInspectorState} from '../dist/card-inspector.mjs';
import {getEquippedCardStatuses} from '../dist/card-status.mjs';
import {CARD_GUIDE_TOPICS} from '../dist/card-guide.mjs';
import {CARD_TERMS,cardTermTextMarkup} from '../dist/card-terms.mjs';

function game(seed='cards-dream') {
  const state=M.newState(),run=state.run=M.createRun(state.profile,seed,1,{cards:true,cardSlots:3});
  run.mountedCards=['dream','spark-cache','lift-guide'].map((id,i)=>makeSkillCard(id,`${seed}:${i}`));
  return {state,run};
}
function visitRest(run) {
  const camp=run.map.flat().find(node=>node.kind==='camp');
  run.current=camp;run.step=camp.row;run.path=[camp.id];run.phase='support';
  const choices=M.getSupportChoices(run);
  assert.ok(M.resolveSupport(run,choices.findIndex(choice=>choice.effect?.restContinue)));
  return camp;
}

test('equipped Common Dream reaches the one Rest exit and preserves it on retry without affecting ordinary flights',()=>{
  for(let seed=0;seed<12;seed++) {
    const {run}=game(`card-dream-route-${seed}`),normal=M.getChoices(run).find(n=>!n.elite&&n.type!=='support');
    assert.ok(normal);assert.equal(canDreamAt(run,normal),false);
    run.current=normal;assert.equal(M.getRunModifiers(run).dreamDuration,0);run.current=null;
    const camp=visitRest(run),[next,...others]=M.getChoices(run);
    assert.equal(others.length,0);assert.deepEqual(camp.nextIds,[next.id]);
    assert.ok(canDreamAt(run,next));assert.equal(dreamConfig(run,next).duration,8);
    assert.match(cardRestMarkup(run,camp,M.getSupportChoices(run)),/Enter Dream · 8s/);
    const guide=flightPreviewMarkup(run,next,{available:true});
    assert.ok(guide.includes(`aria-label="Dream for 8 seconds at ${next.name}"`));
    assert.ok(guide.includes(`data-action="node" data-id="${next.id}"`));
    const copy=structuredClone(run);copy.path=[];assert.equal(isCardDreamRoute(copy,next),false);
    copy.path=[camp.id];copy.lastRest.mapIndex++;assert.equal(isCardDreamRoute(copy,next),false);
    assert.ok(M.selectNode(run,next.id));assert.equal(M.getRunModifiers(run).dreamDuration,8);
    assert.ok(M.beginFlightAttempt(run));assert.equal(run.restReady,false);
    assert.equal(M.getRunModifiers(run).dreamDuration,8,'Wake must retain identical seeded objective placement');
    assert.equal(canDreamAt(run,next),false,'An active attempt cannot start a second rehearsal');
    assert.ok(M.finishFlight(run,{success:false,flame:run.flame,condensedGlow:0}));
    assert.deepEqual(M.getChoices(run).map(n=>n.id),[next.id]);assert.ok(canDreamAt(run,next));
    assert.ok(M.selectNode(run,next.id));assert.ok(canDreamAt(run,next));
    assert.deepEqual(camp.nextIds,[next.id]);
  }
});

test('Elite and Guardian eligibility is explicit, equip dependent, nonstacking and separate from legacy skills',()=>{
  const {run}=game();
  for(const kind of ['elite','finale']) {
    const node=run.map.flat().find(n=>n.kind===kind);
    run.current=node;run.step=node.row;run.phase='briefing';run.path=[node.id];
    assert.ok(canDreamAt(run,node),kind);assert.equal(M.getRunModifiers(run).dreamDuration,8);
    run.mountedCards[2]=makeSkillCard('dream','extra-dream');
    assert.equal(M.getRunModifiers(run).dreamDuration,8);
    assert.match(getEquippedCardStatuses(run)[2].reason,/already gives this ability/);
    run.reserveCards=[run.mountedCards[0],run.mountedCards[2]];run.mountedCards[0]=run.mountedCards[2]=null;
    assert.equal(canDreamAt(run,node),false,'Reserve alone does not enable Dream');
    run.skills['main-dream']=1;assert.equal(canDreamAt(run,node),false,'Card mode does not depend on hidden legacy skills');
    run.mountedCards[0]=run.reserveCards[0];
  }
  run.mountedCards=[makeSkillCard('echo','echo'),makeSkillCard('dream','dream'),makeSkillCard('dream','dream-2')];
  assert.match(getMountedCards(run)[0].copyPreview,/Cannot repeat Dream/);
  assert.match(getEquippedCardStatuses(run)[0].reason,/cannot be repeated/);
  run.mountedCards[0]=makeSkillCard('chameleon','chameleon');
  assert.match(getMountedCards(run)[0].copyPreview,/Cannot borrow Dream/);
  const legacy=M.createRun(M.newState().profile,'legacy-dream');
  legacy.skills['main-dream']=1;const normal=M.getChoices(legacy).find(n=>n.type!=='support');
  assert.ok(canDreamAt(legacy,normal));assert.equal(dreamConfig(legacy,normal).duration,8);
  const card=describeSkillCard(makeSkillCard('dream','rules'));
  assert.equal(card.rarity,'common');assert.match(card.effect,/8 seconds.*full light/);
  assert.ok(CARD_GUIDE_TOPICS.dream);assert.ok(CARD_TERMS.dream);
  assert.match(cardTermTextMarkup('Dream'),/data-card-term="dream"/);
});

test('disposable Dream demos use the production Elite and Rest routes with Dream equipped',()=>{
  for(const scenario of ['dream','dream-rest']) {
    const {run}=createCardInspectorState(new URLSearchParams({scenario}));
    assert.equal(getCardModifiers(run).cardDream,true);
    if(scenario==='dream')assert.ok(canDreamAt(run,run.current));
    else {visitRest(run);assert.ok(canDreamAt(run,M.getChoices(run)[0]));}
  }
});

globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const ctx=new Proxy({},{get:(o,k)=>o[k]??(String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const canvas={style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})};
const snapshot=e=>({time:e.time,distance:e.distance,y:e.player.y,vy:e.player.vy,flame:e.flame,flaps:e.flaps,condensedGlow:e.condensedTotal,
  pickups:e.layout.embers.map(p=>[p.id,p.collected]),charges:e.getState().cardCharges,companion:e.wisp.phase});

test('real card Dream repeats freely, hands off the chosen eight seconds silently, and resumes slowly without lifting',async()=>{
  const {run}=createCardInspectorState(new URLSearchParams({scenario:'dream'}));
  run.flame=40;
  run.cardCruisingSpeed=0;run.cardCruisingSpeedNext=4;
  const before=JSON.stringify(run),node=run.current;
  const create=()=>{
    const scene=new WispFlight({canvas,node,seed:`${run.seed}-${node.id}`,terrain:node.terrain,elite:node.elite,duration:node.duration,
      companions:run.companions,flame:run.flame,condensedGlow:run.condensedGlow,modifiers:M.getRunModifiers(run)});
    scene.render=()=>{};scene.notify=()=>{};return scene;
  };
  const rehearse=()=>{
    const scene=create();let result;attachDream(scene,{onReady:r=>result=r});scene.start();
    assert.equal(renderLightState(scene).rehearsing,true);assert.equal(renderLightState(scene).intensity,1);
    for(let frame=0;frame<480;frame++) {
      if(scene.player.y>scene.height*.52&&scene.player.vy>0)scene.flap();
      scene.step(1/60);
    }
    assert.ok(result?.valid,result?.reason);assert.equal(scene.paused,true);
    assert.equal(scene.getState().flame,scene.maxFlame);assert.ok(Math.abs(scene.time-8)<1e-6);
    return {scene,result};
  };
  const first=rehearse(),chosen=rehearse();
  assert.deepEqual(snapshot(first.scene),snapshot(chosen.scene));
  assert.equal(JSON.stringify(run),before,'Repeated rehearsal cannot spend hearts, saved Sparks or card uses');
  assert.ok(M.beginFlightAttempt(run));
  assert.equal(run.cardCruisingSpeed,4);assert.equal(run.cardCruisingSpeedNext,undefined);
  const real=create(),dream=attachDream(real,{mode:'replay',preset:chosen.result.preset});assert.ok(dream);
  real.start({paused:true});let draws=0,sounds=0,updates=0;
  real.render=()=>{draws++};real.sound=()=>{sounds++};real.notify=()=>{updates++};
  assert.ok(await prepareDreamHandoff(real));assert.equal(draws+sounds+updates,0,'Wake never presents the opening a second time');
  assert.deepEqual(snapshot(real),snapshot(chosen.scene));assert.equal(dream.phase,'awakening');assert.ok(real.paused);
  assert.equal(M.getRunModifiers(run).dreamDuration,8);
  run.cardCruisingSpeedNext=6;
  assert.equal(M.getRunModifiers(run).speed,chosen.scene.mod.speed,'A speed scheduled during the real attempt waits for the next flight');
  const flaps=real.flaps,position=real.distance;real.step(1/60);assert.equal(real.distance,position);
  assert.ok(dream.resume());assert.equal(real.flaps,flaps);assert.equal(real.resumeScale,.1);assert.equal(real.resumeRemaining,3);
  real.step(1/60);assert.ok(real.distance>position);assert.ok(real.resumeScale<1);
  run.mountedCards[2]=makeSkillCard('field-impulse','new-field');
  const changed=create();
  assert.equal(validateDreamPreset(chosen.result.preset,changed),false,'A changed loadout must rehearse new inputs for its new build');
  assert.equal(attachDream(changed,{mode:'replay',preset:chosen.result.preset}),null);
  first.scene.destroy();chosen.scene.destroy();real.destroy();changed.destroy();
});

// ── Devour (docs/card-proposals.md section 11) ─────────────────────────────────────────────────────────────────
import {previewBlackHoleMeals,consumeBlackHoles} from '../dist/card-black-hole.mjs';
import {cleanCardRun} from '../dist/skill-cards.mjs';
function devourRun(ids,seed='dream-devour') {
  const state=M.newState(),run=state.run=M.createRun(state.profile,seed,1,{cards:true,cardSlots:3});
  run.mountedCards=ids.map((id,i)=>id?makeSkillCard(id,`${seed}:${i}`):null);
  run.reserveCards=[];
  return run;
}
// A Dream only rehearses on the single route out of a visited Rest, so measure the duration there.
const dreamSeconds=run=>{
  run=structuredClone(run);visitRest(run);const [next]=M.getChoices(run);
  return dreamConfig(run,next).duration;
};

test('Dream devours the card to its right: +0.5 s Common, +1 s Rare, +3 s Legendary, stored on Dream',()=>{
  for(const [victim,seconds] of [['body-spark',0.5],['crescendo',1],['refrain',3]]) {
    const run=devourRun(['dream',victim,'lift-guide'],`dream-eat-${victim}`);
    assert.deepEqual(previewBlackHoleMeals(run.mountedCards).map(m=>[m.holeName,m.slot,m.growth]),[['Dream',1,seconds]]);
    const meals=consumeBlackHoles(run);
    assert.equal(meals.length,1);assert.equal(run.mountedCards[1],null);
    assert.deepEqual([run.mountedCards[0].eaten,run.mountedCards[0].eatenGrowth],[1,seconds]);
    assert.equal(run.cardBlackHoleGrowth,undefined);
    assert.equal(M.getRunModifiers(structuredClone(run)).dreamDuration,0,'only on a Dream route');
    assert.equal(dreamSeconds(run),8+seconds);
  }
});

test('Dream devour is capped at 40 s and a full Dream eats nothing',()=>{
  const run=devourRun(['dream','refrain','lift-guide']);
  run.mountedCards[0].eatenGrowth=31;
  const [meal]=previewBlackHoleMeals(run.mountedCards);
  assert.equal(meal.growth,1,'trimmed to the room left');
  consumeBlackHoles(run);
  assert.equal(run.mountedCards[0].eatenGrowth,32);assert.equal(dreamSeconds(run),40);
  run.mountedCards[1]=makeSkillCard('body-spark','dream-cap:extra');
  assert.deepEqual(previewBlackHoleMeals(run.mountedCards),[]);
  assert.deepEqual(consumeBlackHoles(run),[]);assert.equal(run.mountedCards[1].cardId,'body-spark');
  run.mountedCards[0].eatenGrowth=500;assert.equal(dreamSeconds(run),40,'never beyond 40 s');
});

test('Dream with nothing to its right (empty or last Slot) or a loaned card devours nothing',()=>{
  assert.deepEqual(previewBlackHoleMeals(devourRun(['dream',null,'body-spark']).mountedCards),[]);
  assert.deepEqual(previewBlackHoleMeals(devourRun(['body-spark','dream']).mountedCards),[]);
  const run=devourRun(['dream','body-spark']);run.mountedCards[1].instanceId='run:practice:body-spark';
  assert.deepEqual(consumeBlackHoles(run),[]);
  const tutorial=devourRun(['dream','body-spark']);tutorial.isTutorial=true;
  assert.deepEqual(consumeBlackHoles(tutorial),[]);
});

test('Dream time lives on the card: unmounting or melting it removes the time, old saves stay at 8 s',()=>{
  const run=devourRun(['dream','refrain','lift-guide']);
  consumeBlackHoles(run);
  const dream=run.mountedCards[0];
  assert.equal(dreamSeconds(run),11);
  run.mountedCards[0]=null;run.reserveCards.push(dream);
  assert.equal(M.getRunModifiers(run).cardDream,false);
  run.mountedCards[0]=makeSkillCard('dream','dream-fresh');
  assert.equal(dreamSeconds(run),8,'a different Dream has no growth; the melted one took it with it');
  const old=devourRun(['dream','spark-cache']);cleanCardRun(old);
  assert.equal(old.mountedCards[0].eatenGrowth,undefined);assert.equal(dreamSeconds(old),8);
  assert.equal(JSON.stringify(old.mountedCards[0]).includes('eaten'),false,'untouched saves stay byte-identical');
});

test('Dream face and glossary name Devour',()=>{
  const dream={...makeSkillCard('dream','face'),eaten:5,eatenGrowth:6.5};
  assert.match(cardFace(dream),/<b>Devoured 5<\/b> · Dream 14\.5 s/);
  assert.ok(CARD_TERMS.devour);assert.match(CARD_TERMS.dream[1],/Devour/);
});
