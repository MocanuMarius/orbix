import test from 'node:test';
import assert from 'node:assert/strict';
import {WispFlight} from '../dist/flight.mjs';
import {BIOME_LEVELS} from '../dist/biomes.mjs';
import {canCompanionCollect,getPickupSpec} from '../dist/pickups.mjs';
import {CARD_SYSTEM,CARD_UNIT,SKILL_CARDS,makeSkillCard,getCardModifiers,drawSkillCard,drawSkillCardDraft,getMountedCards} from '../dist/skill-cards.mjs';
import {getRunModifiers} from '../dist/model.mjs';
import {pickupLesson} from '../dist/pickup-guide.mjs';
import {cardArt} from '../dist/card-art.mjs';
import {duskGlyphArt,DUSK_MOTIF_PIXELS} from '../dist/spark-symbol.mjs';

const canvas={getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:915,height:412})};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
const build=ids=>({skillSystem:CARD_SYSTEM,companions:['collector'],skills:{},mountedCards:ids.map((id,i)=>makeSkillCard(id,`dusk-luminance:${i}`))});
function flight(ids=[],options={}){
  const e=new WispFlight({canvas,preflight:true,seed:'dusk-live-cost',duration:55,
    node:{mapIndex:0,row:0,difficulty:1},modifiers:{...getCardModifiers(build(ids)),maxGlow:250},...options});
  e.running=true;e.render=()=>{};e.notify=()=>{};return e;
}

test('spawned Dusk debits once before its actual Wick payout, never pays native fuel or storage, and is retry-local',()=>{
  for(const [id,amount] of [[null,0],['dusk-wick',20],['dusk-wick-ii',30],['dusk-wick-iii',40]]){
    const e=flight(id?[id]:[]);
    try{
      const p=e.layout.embers.find(p=>p.kind==='dusk');assert.ok(p);assert.equal(canCompanionCollect(p),false);
      e.distance=p.x-e.player.x;e.player.y=p.y;e.flame=50;
      const packing=e.condensedTotal,overflow=e.pickupOverflow,sequence=e.cardRowSequence;
      e.collect(p);near(e.flame,40+amount*CARD_UNIT);
      assert.equal(e.pickupEffects.at(-1).drained,10);assert.equal(e.lightPenalties.length,1);
      assert.equal(e.cardRowSequence-sequence,id?1:0);near(e.condensedTotal,packing);near(e.pickupOverflow,overflow);
      const once=e.flame;e.collect(p);near(e.flame,once);assert.equal(e.lightPenalties.length,1);
      assert.equal(getPickupSpec(p).fuel,0);assert.match(e.pickupEffects.at(-1).text,/−3 Sparks/);
      e.flame=0;e.collect({kind:'dusk'});near(e.flame,amount*CARD_UNIT);assert.equal(e.pickupEffects.at(-1).drained,0);
      e.flame=5;e.collect({kind:'dusk',generated:true});near(e.flame,0);
      e.flame=50;e.collect({kind:'dusk',deliveredByWisp:true});near(e.flame,50);
      e.dream={phase:'recording',active:true};e.collect({kind:'dusk'});near(e.flame,40);
      assert.match(pickupLesson('dusk').text,/drains up to 3 Sparks/);
    }finally{e.destroy();}
    const retry=flight(id?[id]:[]);try{const p=retry.layout.embers.find(p=>p.kind==='dusk');assert.ok(!p.collected);assert.equal(retry.lightPenalties.length,0);}finally{retry.destroy();}
  }
});

test('Lantern Lens changes actual sustained light radius, adds Chameleon sources and keeps Echo passive exclusion',()=>{
  const base=flight([]),lens=flight(['lantern-lens']),copied=flight(['chameleon','lantern-lens']),echo=flight(['echo','lantern-lens']);
  try{
    near(lens.getLightState().baseRadius,base.getLightState().baseRadius*1.2);
    near(copied.getLightState().baseRadius,base.getLightState().baseRadius*1.4);
    near(echo.getLightState().baseRadius,lens.getLightState().baseRadius);
    lens.time=50;near(lens.getLightState().baseRadius,174);
    const r=build(['lantern-lens']),actual=flight([],{modifiers:getRunModifiers(r)});
    try{near(actual.getLightState().baseRadius,174);}finally{actual.destroy();}
    assert.match(getMountedCards(build(['echo','lantern-lens']))[0].copyPreview,/no action to repeat/);
    assert.match(getMountedCards(build(['chameleon','lantern-lens']))[0].effectiveSummary,/40% Luminance/);
  }finally{for(const e of [base,lens,copied,echo])e.destroy();}
});

test('early sustained-light pity preserves each rarity and Growth Seed, is seeded, and subsides after acquisition',()=>{
  const cumulative={0:[0,0,0],1:[0,0,0]},owned=[0,0],seeds=1000;
  for(const mapIndex of [0,1])for(let seed=0;seed<seeds;seed++){
    const run={campaignSeed:`lens-distribution:${seed}`,mapIndex,cardHistory:[]};let offered=false;
    for(let round=0;round<3;round++){
      const node={id:`flight-${round}`},before=JSON.stringify(run),offers=drawSkillCardDraft(run,node);
      assert.deepEqual(drawSkillCardDraft(run,node),offers);assert.equal(JSON.stringify(run),before);
      for(const [index,card] of offers.entries())assert.equal(SKILL_CARDS[card.cardId].rarity,
        SKILL_CARDS[drawSkillCard(run,index?`flight-draft:${index}`:'flight',node).cardId].rarity);
      if(offers.some(c=>c.cardId==='lantern-lens'))offered=true;
      if(offered)cumulative[mapIndex][round]++;
      const chosen=offers.find(c=>c.cardId!=='lantern-lens');
      run.cardHistory.push({type:'drop',mapIndex,nodeId:node.id,card:{...chosen,rarity:SKILL_CARDS[chosen.cardId].rarity},offeredCardIds:offers.map(c=>c.cardId)});
    }
    run.reserveCards=[makeSkillCard('lantern-lens','owned')];
    if(drawSkillCardDraft(run,{id:'owned-next'}).some(c=>c.cardId==='lantern-lens'))owned[mapIndex]++;
  }
  assert.ok(cumulative[0][1]>800);assert.ok(cumulative[0][2]>950);
  assert.ok(cumulative[1][1]>900);assert.ok(cumulative[1][2]>960);
  assert.ok(owned.every(n=>n<150));
});

test('all 48 early courses add visible bypassable Dusk without taking a single funded Spark',()=>{
  for(const level of BIOME_LEVELS)for(const mapIndex of [0,1]){
    const e=flight([],{seed:`dusk-supply:${level.id}`,terrain:level.terrain,duration:50,
      node:{levelId:level.id,mapIndex,row:0,difficulty:1}});
    try{
      const dusk=e.layout.embers.filter(p=>p.kind==='dusk'),s=e.layout.sparkSupply;
      assert.equal(dusk.length,2,`${level.id}:${mapIndex}`);
      assert.equal(s.available,e.layout.embers.reduce((n,p)=>n+(!p.generated&&!p.harmful?getPickupSpec(p).fuel:0),0));
      assert.equal(s.budgetDeficit,0);assert.equal(s.budgetExcess,0);assert.ok(s.maxGap<8);
      for(const p of dusk){assert.ok(e.objectiveBodyClear(p.x,p.y,32));assert.ok(e.objectiveBodyClear(p.x,p.bypassY,38));
        assert.ok(Math.abs(p.y-p.bypassY)>70);assert.ok(p.x>e.player.x+154*5);}
    }finally{e.destroy();}
  }
});

test('Dusk card art and glossary glyph share the native warning motif',()=>{
  const glyph=duskGlyphArt(),card=cardArt(makeSkillCard('dusk-wick','art'));
  assert.ok(DUSK_MOTIF_PIXELS.length>15);assert.match(glyph,/class="dusk-glyph"/);
  assert.match(card,/class="dusk-glyph"/);assert.match(card,/data-card-art="dusk-wick"/);
  assert.match(card,/#080c18/);assert.match(card,/rose Dusk crescent/);
});
