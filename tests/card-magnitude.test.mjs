import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {CARD_UNIT,makeSkillCard,getEffectiveCardSources,getCardModifiers,getMountedCards,cleanCardRun,
  createCardExecution,executeCardBodyPickup,getCardPackingBonus} from '../dist/skill-cards.mjs';
import {WispFlight} from '../dist/flight.mjs';
import {getGlowCapacity} from '../dist/vitality.mjs';
import {fieldImpulseGravity,fieldImpulseSpeed} from '../dist/collector-impulse.mjs';
import {LuminanceWaves} from '../dist/luminance-waves.mjs';
import {CardRhythm} from '../dist/card-rhythm.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const fresh=(ids=[])=>{
  const state=M.newState();state.profile.tutorialComplete=true;
  state.run=M.createRun(state.profile,'magnitude-audit',1,{cards:true});
  state.run.cardSlots=Math.max(3,ids.length);
  state.run.mountedCards=Array.from({length:state.run.cardSlots},(_,i)=>ids[i]?makeSkillCard(ids[i],`mag:${i}:${ids[i]}`):null);
  return state;
};
const flight=run=>{
  const ctx=new Proxy({}, {get:(o,k)=>o[k]??=String(k).includes('Gradient')?()=>({addColorStop(){}}):()=>{}});
  const e=new WispFlight({canvas:{style:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:405})},
    seed:'magnitude-flight',terrain:'ruins',preflight:true,companions:['collector'],modifiers:M.getRunModifiers(run)});
  e.render=()=>{};e.notify=()=>{};e.layout.obstacles=[];e.layout.embers=[];e.running=true;
  return e;
};
const enterCamp=(state,index=0)=>{
  const run=state.run,node=run.map.flat().find(n=>n.kind==='camp');
  run.mapIndex=index;run.step=node.row;run.current=node;run.path=[node.id];run.phase='support';
  return M.getSupportChoices(run);
};
const choose=(run,id)=>M.resolveSupport(run,M.getSupportChoices(run).findIndex(c=>c.id===id));
const reload=state=>{
  let data;const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};
  assert.ok(M.saveState(state,storage));return M.loadState(storage);
};

test('Field duplicates and immediate-right copies add duration; reorder and reserve previews agree',()=>{
  const state=fresh(['echo','field-impulse','body-spark']),run=state.run;
  run.reserveCards=[makeSkillCard('field-impulse','reserve-field')];
  near(getCardModifiers(run).cardFieldMultiplier,2);
  assert.equal(getEffectiveCardSources(run).filter(s=>s.def.kind==='field').length,2);
  let cards=getMountedCards(run);
  near(cards[0].effectiveMultiplier,2);near(cards[1].effectiveMultiplier,2);
  assert.match(cards[1].effectiveSummary,/2 effective sources.*2× duration.*1\.6s.*48%/);
  assert.match(cards[0].copyPreview,/1 Field Impulse source.*0\.8s.*one ring/);
  assert.ok(M.moveMountedCard(run,0,1));
  near(getCardModifiers(run).cardFieldMultiplier,1);
  cards=getMountedCards(run);assert.match(cards[0].effectiveSummary,/1×.*0\.8s.*48%/);
  assert.equal(cards[1].copyPreview,'Repeats +2 Sparks');
  const five=fresh(['echo','field-impulse','field-impulse','chameleon','field-impulse']).run;
  near(getCardModifiers(five).cardFieldMultiplier,5);
  const chain=fresh(['echo','chameleon','field-impulse']).run;
  near(getCardModifiers(chain).cardFieldMultiplier,2);
  assert.match(getMountedCards(chain)[0].copyPreview,/Cannot repeat Chameleon/);
  const inactive=fresh().run;inactive.reserveCards=[makeSkillCard('field-impulse','reserve')];
  assert.equal(getCardModifiers(inactive).cardFieldImpulse,false);
});

test('Field stacks duration on every axis with native force, one ring spend and one activation',()=>{
  for(const [ids,multiplier] of [[['field-impulse'],1],[['field-impulse','field-impulse'],2],
    [['chameleon','field-impulse'],2],[['echo-ii','field-impulse'],3],[['echo-iii','field-impulse'],4],
    [['echo-iii','field-impulse','echo-iii','field-impulse','field-impulse'],9]]){
    for(const direction of ['up','down','right']){
      const e=flight(fresh(ids).run);
      try{
        e.flame=75;e.player.vy=60;const fuel=e.flame,recovery=e.wisp.recoveryDuration(e);
        assert.ok(e.activateFieldImpulse(direction));near(e.fieldImpulse.multiplier,multiplier);
        near(e.fieldImpulse.until-e.time,.8*multiplier);
        near(e.wisp.cooldown,recovery);assert.equal(e.flame,fuel);assert.equal(e.flaps,0);
        assert.equal(e.activationEvents.events.filter(a=>a.source==='collector-field-impulse').length,1);
        assert.equal(e.activateFieldImpulse(direction),false);near(e.wisp.cooldown,recovery);
        if(direction==='up'){
          near(e.player.vy,0);near(fieldImpulseGravity(e,500),0);
          e.player.y=e.fieldImpulse.targetY-1;e.player.vy=0;
          near(fieldImpulseGravity(e,500),26,'holding servo stays unchanged');
        }
        if(direction==='down')near(e.player.vy,200*e.scaleY);
        if(direction==='right')near(fieldImpulseSpeed(e),1.48);
      }finally{e.destroy();}
    }
  }
});

test('partially recovered Field scales native strength and the whole stacked duration by ring radius',()=>{
  const e=flight(fresh(['echo','field-impulse','field-impulse']).run);
  try{
    e.wisp.cooldownMax=e.wisp.recoveryDuration(e);e.wisp.cooldown=e.wisp.cooldownMax*.5;e.wisp.phase='cooldown';
    const strength=e.wisp.currentRange(e)/e.wisp.range(e);
    assert.ok(e.activateFieldImpulse('right'));near(e.fieldImpulse.strength,strength);
    near(fieldImpulseSpeed(e),1+.48*strength);near(e.fieldImpulse.until-e.time,.8*strength*3);
  }finally{e.destroy();}
});

test('moving Echo right-to-left changes the real Field action immediately',()=>{
  const run=fresh(['field-impulse','echo','body-spark']).run;
  const before=flight(run);
  try{assert.ok(before.activateFieldImpulse('up'));near(before.fieldImpulse.until-before.time,.8);}finally{before.destroy();}
  assert.ok(M.moveMountedCard(run,1,0),'dragging right-hand Echo to the left swaps its immediate target');
  const after=flight(run);
  try{
    assert.ok(after.activateFieldImpulse('up'));near(after.fieldImpulse.until-after.time,1.6);
    assert.equal(after.activationEvents.events.filter(a=>a.source==='collector-field-impulse').length,1);
  }finally{after.destroy();}
});

test('Rhythm activates one real wave; moving Echo across Harvest changes crossing payoff, not timing or Lift cost',()=>{
  const run=fresh(['harvest-common','echo','rhythm']).run;
  const perform=()=>{
    const e=flight(run);let now=0;e.fourthBeatNow=()=>now;e.flame=30;
    try{
      const packet={kind:'light',x:e.distance+e.player.x+90,y:e.player.y};e.layout.embers=[packet];
      e.getNearbyPickups=()=>e.layout.embers;
      for(const at of [0,.6,1.2]){
        now=at;e.time=at;assert.ok(e.beginLiftInput());e.endLiftInput();
      }
      assert.equal(e.flaps,3);assert.equal(e.luminanceWaves.waves.length,1);assert.equal(e.cardRhythm.state.waves,1);
      const spent=e.effortSpent;e.flame=0;e.luminanceWaves.update(.3);
      assert.equal(packet.collected,undefined,'the activated wave is distinct from collecting the Spark');
      return {fuel:e.flame,spent,waves:e.cardRhythm.state.waves};
    }finally{e.destroy();}
  };
  const right=perform();near(right.fuel,CARD_UNIT);
  assert.ok(M.moveMountedCard(run,1,0));
  const left=perform();near(left.fuel,2*CARD_UNIT);near(left.spent,right.spent);assert.equal(left.waves,right.waves);
  assert.match(getMountedCards(run)[0].copyPreview,/Repeats/);
});

test('Flash magnitude restores meter once per actual body/carrier pickup and never packs surplus',()=>{
  const layouts=[['flash-handling'],['flash-handling','flash-handling'],['echo','flash-handling','chameleon','flash-handling']];
  for(const ids of layouts)for(const delivered of [false,true]){
    const run=fresh(ids).run,mod=getCardModifiers(run),sources=ids.length;
    run.reserveCards=[makeSkillCard('flash-handling','inactive-flash')];
    assert.equal(mod.cardFlashSources,sources);near(mod.cardFlashMeter,6*sources*CARD_UNIT);
    assert.match(getMountedCards(run).find(c=>c.kind==='flash-handling').effectiveSummary,new RegExp(`${6*sources} missing`));
    const e=flight(run);
    try{
      e.flame=0;let radiations=0;const radiate=e.radiateLight.bind(e);
      e.radiateLight=options=>{radiations++;return radiate(options);};
      const packet={kind:'sight',x:e.player.x,y:e.player.y,deliveredByWisp:delivered};
      e.collect(packet);const tether=e.flashTether;e.collect(packet);
      near(e.flame,Math.min(e.maxFlame,6*sources*CARD_UNIT));assert.equal(e.flashTether,tether);assert.equal(radiations,1);
      assert.equal(e.cardExecutions,0);assert.equal(e.condensedGlow,0);
      e.flame=e.maxFlame-2;e.collect({...packet,collected:false});near(e.flame,e.maxFlame);
      assert.equal(e.pickupOverflow,0);assert.equal(e.condensedGlow,0);
    }finally{e.destroy();}
  }
});

test('Grow duplicates and copied sources scale one action/refill, preserve hearts and three shared uses',()=>{
  let state=fresh(['echo','growth-seed-common','growth-seed-common','chameleon','growth-seed-common']);
  let run=state.run;run.lives=2;run.flame=4;
  for(let action=0;action<3;action++){
    const offers=enterCamp(state,action),grow=offers.find(c=>c.id==='rest-grow');
    assert.match(grow.description,/\+15.*refill once/);assert.equal(grow.disabled,false);
    assert.ok(choose(run,'rest-grow'));
    assert.equal(run.cardGrowUses,action+1);near(run.cardGrowCapacity,50*(action+1));
    near(getGlowCapacity(run),100+50*(action+1));near(run.flame,getGlowCapacity(run));assert.equal(run.lives,2);
    assert.deepEqual(run.lastRest.actions,['grow']);
    state=reload(state);run=state.run;near(getGlowCapacity(run),100+50*(action+1));
  }
  enterCamp(state,3);assert.equal(M.getSupportChoices(run).find(c=>c.id==='rest-grow').disabled,true);
  assert.equal(choose(run,'rest-grow'),false);assert.equal(run.cardGrowUses,3);
});

test('Grow uses the equipped source and its current reordered magnitude at open Rest',()=>{
  const state=fresh(['echo','growth-seed-common','body-spark']),run=state.run;
  run.reserveCards=[makeSkillCard('growth-seed-common','reserve-grow')];
  enterCamp(state);assert.match(M.getSupportChoices(run).find(c=>c.id==='rest-grow').description,/\+6 /);
  assert.ok(M.moveMountedCard(run,0,1));
  assert.match(M.getSupportChoices(run).find(c=>c.id==='rest-grow').description,/\+3 /);
  assert.ok(choose(run,'rest-grow'));near(getGlowCapacity(run),110);
  const later=fresh(['body-spark']),old=later.run;enterCamp(later);
  old.reserveCards=[makeSkillCard('growth-seed-common','late-grow')];
  assert.ok(M.equipOwnedCard(old,'late-grow',1));assert.equal(choose(old,'rest-grow'),true);
});

test('legacy card Grow migrates recorded actions once, preserving unrelated capacity and active attempts',()=>{
  const state=fresh(['growth-seed-common']),run=state.run;
  delete run.cardGrowUses;delete run.cardGrowCapacity;
  run.restGlowCapacity=30;
  run.cardHistory=[{type:'camp',action:'grow',mapIndex:0,nodeId:'rest-a'},{type:'camp',action:'grow',mapIndex:1,nodeId:'rest-a'}];
  run.restVisits=[{key:'0:rest-a',nodeId:'rest-a',mapIndex:0,actions:['grow']}];
  run.attemptEntry={restGlowCapacity:30};
  cleanCardRun(run);assert.equal(run.cardGrowUses,2);assert.equal(run.cardGrowCapacity,20);assert.equal(run.restGlowCapacity,10);
  near(getGlowCapacity(run),130);assert.equal(run.attemptEntry.cardGrowUses,2);assert.equal(run.attemptEntry.restGlowCapacity,10);
  cleanCardRun(run);near(getGlowCapacity(run),130);assert.equal(run.cardGrowUses,2);
  const untouched=fresh().run;delete untouched.cardGrowUses;delete untouched.cardGrowCapacity;
  untouched.restGlowCapacity=20;cleanCardRun(untouched);assert.equal(untouched.cardGrowUses,0);assert.equal(untouched.restGlowCapacity,20);
});

test('body, finite uses and passive capacity share one nonrecursive source resolver',()=>{
  const run=fresh(['echo','spark-cache','chameleon','deep-vessel','deep-vessel']).run;
  run.mountedCards[1].charges=1;run.reserveCards=[makeSkillCard('deep-vessel','reserve-cap')];
  const described=getMountedCards(run);assert.match(described[1].effectiveSummary,/\+4 (?:extra )?Sparks/);
  const action=executeCardBodyPickup(createCardExecution(run));near(action.bonus,4*CARD_UNIT);assert.equal(action.executions,1);
  near(getGlowCapacity(run),130);assert.match(described[3].effectiveSummary,/\+9 maximum/);
  run.mountedCards[2]=makeSkillCard('echo','echo-passive');near(getGlowCapacity(run),120);
  assert.match(getMountedCards(run)[2].copyPreview,/Deep Vessel has no action to repeat/);
});

test('Harvest duplicates/copies add capped meter and existing Legendary per-wave awards once',()=>{
  const run=fresh(['echo','harvest-legendary','chameleon','harvest-legendary','harvest-common']).run;
  const mod=getCardModifiers(run);near(mod.cardHarvestMeter,9*CARD_UNIT);assert.equal(mod.cardHarvestStoredPerWave,4);
  const natural={kind:'light',x:90,y:50};
  const e={running:true,alive:true,mod,flame:95,maxFlame:100,width:900,height:405,distance:0,player:{x:0,y:50},
    layout:{embers:[natural,{kind:'light',x:90,y:50,generated:true}]}};
  const waves=new LuminanceWaves(e);waves.emit({x:0,y:50,radius:300});waves.update(.5);
  near(e.flame,100);assert.equal(e.resonanceStored,4);assert.equal(natural.collected,undefined);
  waves.update(.1);assert.equal(e.resonanceStored,4);
});

test('Echo packing contributes once with bounded integer carry, and unique abilities stay single',()=>{
  const run=fresh(['echo','tight-packing','tight-packing','chameleon','tight-packing']).run;
  assert.equal(getCardModifiers(run).cardPackingSources,10);
  assert.deepEqual(getCardPackingBonus(3,5,2),{amount:4,remainder:1});
  assert.deepEqual(getCardPackingBonus(3,100,2),{amount:27,remainder:2},'weighted copies are bounded by five slots, Echo III and tier-III packing');
  const unique=fresh(['rhythm','rhythm','lift-guide','lift-guide','cache-handling']).run,mod=getCardModifiers(unique);
  assert.equal(mod.cardRhythm,true);assert.equal(mod.cardLiftGuide,true);assert.equal(mod.cardCacheHandling,true);
  let waves=0;const e={mod,time:0,running:true,alive:true,player:{x:0,y:40},width:900,height:405,distance:0,
    luminanceWaves:{emit(){waves++;}}};
  const rhythm=new CardRhythm(e);
  for(const at of [0,.6,1.2]){e.time=at;rhythm.lift(at);}assert.equal(waves,1);assert.equal(rhythm.waves,1);rhythm.destroy();
  const second=fresh(['camp-kit','camp-kit','growth-seed-common']);second.run.flame=1;enterCamp(second);
  assert.ok(choose(second.run,'rest-recover'));assert.ok(choose(second.run,'rest-grow'));
  assert.equal(second.run.mountedCards[0],null);assert.equal(second.run.mountedCards[1].charges,1);
  assert.deepEqual(second.run.lastRest.actions,['recover','grow']);
});
