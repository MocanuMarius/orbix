import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {CARD_SYSTEM,CARD_UNIT,CARD_ROW_EVENTS,CARD_ROW_LIMITS,CARD_REWARD_KINDS,SKILL_CARDS,makeSkillCard,createCardExecution,resolveCardRow,
  previewCardRow,getCardModifiers,getCardCapacityBonus,getCardPackingBonus,getAlwaysOnCardBoosts,getCardBoostFactors,getCardMeltValue,
  describeSkillCard,drawSkillCard,getMountedCards} from '../dist/skill-cards.mjs';
import {deckCardExplanationMarkup} from '../dist/deck-combos.mjs';
import {getGlowCapacity,getRawGlowCapacity,glowPoints,formatGlow,GLOW_DISPLAY_SCALE,GLOW_CAPACITY_LIMIT,GLOW_CAPACITY_LIMIT_UNITS,isGlowCapacityMaxed} from '../dist/vitality.mjs';
import {getEquippedCardStatuses} from '../dist/card-status.mjs';
import {getProximityClearance,EDGING_PULSE_TUNING} from '../dist/edging-pulse.mjs';
import {WispFlight} from '../dist/flight.mjs';

const near=(a,b,m='')=>assert.ok(Math.abs(a-b)<1e-9,`${m} ${a} != ${b}`);
const row=ids=>ids.map((id,i)=>id?makeSkillCard(id,`boost:${i}:${id}`):null);
const run=(ids,extra={})=>({skillSystem:CARD_SYSTEM,companions:['collector'],cardSlots:Math.max(3,ids.length),mountedCards:row(ids),reserveCards:[],...extra});
const quote=(ids,event)=>previewCardRow(row(ids),event);
const body={kind:CARD_ROW_EVENTS.body,pickupKind:'light',meterFraction:.5};
const clear={kind:CARD_ROW_EVENTS.clear,carriedStored:0};

// ── 1. Spark Meter cap ───────────────────────────────────────────────────────
test('the Spark Meter never exceeds exactly 100 printed Sparks, whatever the source',()=>{
  assert.equal(GLOW_CAPACITY_LIMIT,100);
  const huge=run(['deep-vessel','deep-vessel','deep-vessel','prism-lens-ii','crescendo'],{cardFutureCapacity:500,cardGrowUses:3,cardGrowCapacity:270,
    restGlowCapacity:30,treasureCapacity:200,skills:{'main-reservoir':1,'main-vast-vessel':1,'main-light-step':1}});
  assert.ok(getRawGlowCapacity(huge)>GLOW_CAPACITY_LIMIT_UNITS*3);
  assert.equal(getGlowCapacity(huge),GLOW_CAPACITY_LIMIT_UNITS);
  assert.equal(glowPoints(getGlowCapacity(huge)),100);assert.equal(formatGlow(getGlowCapacity(huge)),'100');
  near(getGlowCapacity(huge)*GLOW_DISPLAY_SCALE,100,'printed maximum');
  assert.ok(isGlowCapacityMaxed(huge));
  // Below the cap nothing changes; at the cap, one more capacity card adds nothing.
  const small=run(['deep-vessel']);assert.equal(getGlowCapacity(small),getRawGlowCapacity(small));
  assert.equal(formatGlow(getGlowCapacity(small)),'33');assert.ok(!isGlowCapacityMaxed(small));
  const atCap=run(['deep-vessel'],{cardFutureCapacity:70});
  assert.equal(formatGlow(getGlowCapacity(atCap)),'100');
  const more=run(['deep-vessel','deep-vessel'],{cardFutureCapacity:70});
  assert.equal(getGlowCapacity(more),getGlowCapacity(atCap));
  // Legacy book runs share the same ceiling.
  assert.ok(getGlowCapacity({treasureCapacity:10000})<=GLOW_CAPACITY_LIMIT_UNITS);
});

test('capacity cards that cannot add past the cap say Max 100 reached',()=>{
  const full=run(['deep-vessel','growth-ring','ember-feeder'],{cardFutureCapacity:80});
  full.mountedCards[2].fedCapacity=2;
  const status=getEquippedCardStatuses(full);
  assert.deepEqual(status.map(s=>s.label),['Max 100 reached','Max 100 reached','Max 100 reached']);
  assert.ok(status.every(s=>s.state==='shared'));
  const room=run(['deep-vessel','growth-ring'],{cardFutureCapacity:60});
  assert.deepEqual(getEquippedCardStatuses(room).map(s=>s.label),['Ready','Ready']);
  // A card that still adds part of its amount stays Ready.
  const partial=run(['deep-vessel'],{cardFutureCapacity:69});
  assert.equal(getEquippedCardStatuses(partial)[0].label,'Ready');
});

// ── 2. Crescendo ─────────────────────────────────────────────────────────────
test('Crescendo doubles whenever something is to its left, with no earlier-card requirement',()=>{
  assert.equal(SKILL_CARDS.crescendo.row.minimumEarlierPayers,undefined);
  assert.equal(quote(['body-spark','crescendo'],body).sparks,4);
  const lone=quote(['crescendo','body-spark'],body);
  assert.equal(lone.sparks,2);assert.equal(lone.steps[0].skipReason,'empty-subtotal');
  assert.equal(quote(['ring-spring','crescendo'],{kind:CARD_ROW_EVENTS.overfill,availableRecovery:10}).recoverySeconds,2);
  for(const ids of [['body-spark','crescendo'],['crescendo','body-spark'],['dusk-wick','cluster-heart','crescendo']])
    for(const step of quote(ids,body).steps)assert.notEqual(step.skipReason,'needs-two-earlier-payers');
  assert.equal(getEquippedCardStatuses(run(['body-spark','crescendo']))[1].state,'ready');
});

// ── 3. Multiplier ladder ─────────────────────────────────────────────────────
test('the multiplier ladder sets rarities, numbers, melt values and Evolve families',()=>{
  const ladder={'prism-lens':['common',1.25],'crescendo':['rare',2],'closing-chord':['rare',2.5],'second-sun':['legendary',2],'prism-lens-ii':['legendary',3]};
  for(const [id,[rarity,amount]]of Object.entries(ladder)){
    assert.equal(SKILL_CARDS[id].rarity,rarity,id);assert.equal(SKILL_CARDS[id].row.amount,amount,id);assert.equal(SKILL_CARDS[id].amount,amount,id);
    assert.equal(getCardMeltValue(makeSkillCard(id,'melt')),{common:10,rare:20,legendary:40}[rarity],id);
  }
  assert.equal(SKILL_CARDS['second-sun'].row.replayAmount,3);
  assert.equal(quote(['body-spark','second-sun','refrain'],body).sparks,2*2+2*3);
  assert.equal(quote(['body-spark','closing-chord'],body).sparks,5);
  assert.equal(quote(['body-spark','closing-chord','deep-vessel'],body).sparks,2,'Closing Chord must still be the last card');
  // Evolve already expresses Common → Legendary (Downbeat, Courier Tip), so the Prism family keeps its link.
  assert.equal(SKILL_CARDS['prism-lens'].evolvesTo,'prism-lens-ii');
  for(const id of ['downbeat','courier-tip','prism-lens'])assert.equal(SKILL_CARDS[SKILL_CARDS[id].evolvesTo].rarity,'legendary',id);
  // Pools follow the new rarities.
  const seen={common:new Set(),legendary:new Set()};
  for(let seed=0;seed<2500;seed++)for(const tier of ['common','legendary'])seen[tier].add(drawSkillCard({campaignSeed:`ladder:${seed}`,mapIndex:0},'ladder',{id:'n'},tier).cardId);
  assert.ok(seen.common.has('prism-lens'));assert.ok(seen.legendary.has('prism-lens-ii'));assert.ok(seen.legendary.has('second-sun'));
});

test('a save made before the ladder keeps every card instance once, with its new rarity and number',()=>{
  const state=M.newState();state.profile.tutorialComplete=true;
  state.run=M.createRun(state.profile,'ladder-migration',1,{cards:true});
  assert.ok(M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id));
  const r=state.run;r.cardSlots=5;
  r.mountedCards=[{instanceId:'old:prism',cardId:'prism-lens',rank:1},{instanceId:'old:cres',cardId:'crescendo',rank:1},
    {instanceId:'old:chord',cardId:'closing-chord',rank:1},null,null];
  r.reserveCards=[{instanceId:'old:prism2',cardId:'prism-lens-ii',rank:1},{instanceId:'old:sun',cardId:'second-sun',rank:1},
    {instanceId:'old:prism3',cardId:'prism-lens',rank:1}];
  // The fields an old save carried: per-Rest Forge pricing and no per-run tally.
  r.cardForgeCounts={rare:2,legendary:1};r.cardForgePricing={key:'0:x',counts:{rare:1,legendary:0}};delete r.cardForgeTally;
  let data;const storage={getItem:()=>data,setItem:(_,v)=>{data=v;}};
  assert.ok(M.saveState(state,storage));
  const old=JSON.parse(data);delete old.run.cardForgeTally;data=JSON.stringify(old);
  const loaded=M.loadState(storage).run;
  const owned=[...loaded.mountedCards,...loaded.reserveCards].filter(Boolean).filter(card=>card.instanceId.startsWith('old:'));
  assert.deepEqual(owned.map(card=>card.instanceId).sort(),['old:chord','old:cres','old:prism','old:prism2','old:prism3','old:sun']);
  assert.equal(new Set(owned.map(card=>card.instanceId)).size,owned.length,'no duplicate');
  const card=id=>describeSkillCard(owned.find(c=>c.instanceId===id));
  assert.deepEqual([card('old:prism').cardId,card('old:prism').rarity,card('old:prism').amount],['prism-lens','common',1.25]);
  assert.deepEqual([card('old:prism2').rarity,card('old:prism2').amount],['legendary',3]);
  assert.deepEqual([card('old:chord').rarity,card('old:chord').amount],['rare',2.5]);
  assert.deepEqual([card('old:sun').rarity,card('old:sun').amount],['legendary',2]);
  assert.deepEqual(loaded.cardForgeTally,{common:0,rare:0,legendary:0},'old runs start the escalating Forge price at zero');
  assert.deepEqual(M.loadState(storage).run.mountedCards.map(c=>c?.instanceId??null),loaded.mountedCards.map(c=>c?.instanceId??null));
});

// ── 4. Boost rules: every reward kind to the left ────────────────────────────
// Point 3 revised 2026-11-17: Boosts multiply Sparks and Collector time, never Stored Sparks or permanent gains.
test('a Boost strengthens Sparks and Collector time to its left, never Stored Sparks or permanent gains',()=>{
  assert.equal(quote(['body-spark','prism-lens-ii'],body).sparks,6,'Sparks');
  assert.equal(quote(['ring-spring','crescendo'],{kind:CARD_ROW_EVENTS.overfill,availableRecovery:10}).recoverySeconds,2,'recovery seconds');
  assert.equal(quote(['return-spring','prism-lens-ii'],{kind:CARD_ROW_EVENTS.attach,availableReel:5,availableRecovery:5}).reelSeconds,1.5,'reel seconds on Latch');
  const wave=quote(['harvest-legendary','crescendo'],{kind:CARD_ROW_EVENTS.wave,firstCrossing:true});
  assert.deepEqual([wave.sparks,wave.stored],[4,1],'Sparks doubled, the Stored Spark paid at base');
  assert.deepEqual(wave.cards[0].boostedByKind.stored,[]);assert.deepEqual(wave.cards[0].boostedByKind.sparks,[1]);
  assert.equal(wave.cards[0].effective.stored,wave.cards[0].base.stored);
  for(const [ids,kind,base] of [[['wayfarers-purse'],'stored',5],[['wind-feather'],'cruisingSpeed',1]])
    for(const boosts of [['crescendo'],['prism-lens-ii','crescendo','closing-chord'],['second-sun']]){
      const r=quote([...ids,...boosts],clear);
      assert.equal(r[kind],base,`${ids} ${boosts} pays base`);
      assert.equal(r.cards[0].effective[kind],r.cards[0].base[kind]);assert.deepEqual(r.cards[0].boostedBy,[]);
      assert.equal(r.steps.find(step=>step.operation==='multiply').skipReason,'not-boostable');
    }
  assert.equal(quote(['nest-egg','crescendo'],{...clear,carriedStored:50}).stored,5,'Nest Egg pays its base 5');
  // Repeats and the Encore are firings, not Boosts: they still count.
  assert.equal(quote(['echo-iii','wayfarers-purse','prism-lens-ii','crescendo','closing-chord'],clear).stored,20);
  // Growth Ring keeps its +1 on its own card (tally); Boosts never touch it and a wildcard + card does nothing on Clear.
  for(const boosts of [['crescendo'],['prism-lens-ii','crescendo','closing-chord']]){const ring=run(['growth-ring',...boosts]);ring.mountedCards[0].tally=0;const r=quote(['growth-ring',...boosts],clear);assert.equal(r.futureCapacity,0);assert.equal(r.steps.find(step=>step.operation==='multiply').skipReason,'empty-subtotal');}
  assert.equal(quote(['growth-ring','kindling-bead','crescendo'],clear).steps.filter(step=>step.tallyCapacity).length,1);
});

test('several Boosts multiply together, and Echo or Encore firings are boosted and credited to the real card',()=>{
  const stacked=quote(['body-spark','prism-lens','crescendo'],body);
  assert.equal(stacked.sparks,5);assert.deepEqual(stacked.cards[0].boostedBy,[1,2]);
  assert.equal(quote(['body-spark','prism-lens','prism-lens-ii','crescendo','closing-chord'],body).sparks,Math.ceil(2*1.25*3*2*2.5-1e-9),'37.5 rounds up');
  const echo=quote(['echo','spark-cache','prism-lens'],body);
  assert.equal(echo.sparks,10);assert.equal(echo.cards[1].base.sparks,4);assert.equal(echo.cards[1].effective.sparks,10);
  assert.equal(echo.cards[0].effective.sparks,0);assert.equal(echo.cards[1].fired,2);
  assert.deepEqual(echo.steps.filter(step=>step.success).map(step=>step.creditSlot),[1,1,2]);
  const encore=quote(['harvest-rare','prism-lens','refrain'],{kind:CARD_ROW_EVENTS.wave,firstCrossing:true});
  assert.equal(encore.sparks,6);assert.equal(encore.cards[0].effective.sparks,6);assert.equal(encore.sparksExact,5); // 2.5 → 3 per firing
  // A Boost only reaches cards to its LEFT.
  assert.equal(quote(['prism-lens-ii','body-spark'],body).sparks,2);
});

test('Boosted seconds never bring Collector below half a second; unboosted savings keep their rule',()=>{
  assert.equal(CARD_ROW_LIMITS.collectorFloor,.5);
  const overfill=availableRecovery=>quote(['ring-spring','crescendo'],{kind:CARD_ROW_EVENTS.overfill,availableRecovery});
  near(overfill(10).recoverySeconds,2);
  near(overfill(2.2).recoverySeconds,1.7);near(overfill(2.2).steps.at(-1).recoveryAfter,.5);
  near(overfill(1.5).recoverySeconds,1);assert.equal(overfill(1.5).steps[1].skipReason,'boost-capped');
  near(quote(['ring-spring'],{kind:CARD_ROW_EVENTS.overfill,availableRecovery:.75}).recoverySeconds,.75,'a lone card may still finish recovery');
  const latch=(availableReel)=>quote(['return-spring','crescendo'],{kind:CARD_ROW_EVENTS.attach,availableReel,availableRecovery:5});
  near(latch(2).reelSeconds,1);near(latch(.8).reelSeconds,.5);
  near(latch(1.2).reelSeconds,.7);near(latch(1.2).steps.at(-1).reelAfter,.5);
});

test('per-card effective amounts sum exactly to the totals for every reward kind',()=>{
  // Stored Sparks and permanent gains are never boosted, so effective = base × firings.
  const pool=['body-spark','spark-cache','echo','echo-iii','chameleon','prism-lens','prism-lens-ii','crescendo','closing-chord','second-sun',
    'refrain','kindling-bead','mirror-grain','harvest-legendary','ring-spring','glass-spool','wayfarers-purse','growth-ring','wind-feather',
    'nest-egg','return-spring','fast-spool','wick-doubler','dusk-wick',null];
  const events=[body,{...body,pickupKind:'dusk',availableRecovery:3,availableReel:2,collectorReeling:true},
    {kind:CARD_ROW_EVENTS.wave,firstCrossing:true},{kind:CARD_ROW_EVENTS.overfill,availableRecovery:4},
    {...clear,carriedStored:80,cruisingSpeedRoom:3},{kind:CARD_ROW_EVENTS.attach,availableReel:3,availableRecovery:3}];
  let s=7,checked=0;const next=()=>(s=(s*1103515245+12345)%2147483648)/2147483648;
  for(let i=0;i<600;i++){
    const ids=Array.from({length:5},()=>pool[Math.floor(next()*pool.length)]);
    for(const event of events){
      const r=quote(ids,event);
      for(const kind of CARD_REWARD_KINDS){
        assert.equal(r.cards.reduce((sum,card)=>sum+(card?card.effective[kind]:0),0),r[kind],`${ids} ${event.kind} ${kind}`);
        near(r.steps.reduce((sum,step)=>sum+(step[{sparks:'amount'}[kind]||kind]||0),0),kind==='sparks'?r.sparksExact:r[kind],`${ids} ${event.kind} steps ${kind}`);
      }
      for(const kind of ['stored','futureCapacity','cruisingSpeed'])assert.ok(Number.isInteger(r[kind]),`${ids} ${kind} whole`);
      checked++;
    }
  }
  assert.equal(checked,3600);
});

// ── 4b. Boosts on always-on cards ────────────────────────────────────────────
test('only Boosts without a Trigger or limited Uses strengthen always-on cards to their left',()=>{
  const lens=ids=>getCardModifiers(run(ids)).cardLuminancePercent;
  assert.equal(lens(['lantern-lens']),20);
  assert.equal(lens(['lantern-lens','crescendo']),40,'+20% ×2 = +40%, bonus part only');
  assert.equal(lens(['crescendo','lantern-lens']),20,'a Boost reaches only its left');
  assert.equal(lens(['lantern-lens','prism-lens','crescendo']),50,'Boosts multiply together');
  assert.equal(lens(['lantern-lens','prism-lens-ii']),60);
  assert.equal(lens(['lantern-lens','closing-chord']),50);
  assert.equal(lens(['lantern-lens','closing-chord','deep-vessel']),20,'Closing Chord must be the last card');
  for(const id of ['wick-doubler','ripple-glass','glide-prism','courier-glass','clear-prism','second-sun'])
    assert.equal(lens(['lantern-lens',id]),20,`${id} does not boost always-on cards`);
  assert.equal(lens(['chameleon','lantern-lens','crescendo']),80,'a borrowed copy is boosted too');
  assert.equal(getCardCapacityBonus(run(['deep-vessel','prism-lens-ii'])),9*CARD_UNIT);
  const feeder=run(['ember-feeder','crescendo']);feeder.mountedCards[0].fedCapacity=3;
  assert.equal(getCardCapacityBonus(feeder),6*CARD_UNIT);
  assert.equal(getCardModifiers(run(['tight-packing','crescendo'])).cardPackingSources,4);
  assert.equal(getCardModifiers(run(['tight-packing','prism-lens'])).cardPackingSources,2.5);
  assert.deepEqual(getCardPackingBonus(4,2.5),{amount:2,remainder:2});
  assert.equal(getCardModifiers(run(['echo-iii','tight-packing-iii','echo-iii','tight-packing-iii','tight-packing-iii'])).cardPackingSources,36);
  assert.deepEqual(getCardPackingBonus(10,99),{amount:90,remainder:0},'boosted packing stays capped at the maximum weight');
  const reach=getCardModifiers(run(['edge-reach','prism-lens'])).cardProximitySources;
  assert.equal(reach,1.25);near(getProximityClearance({cardProximitySources:reach}),EDGING_PULSE_TUNING.clearance*1.625);
  // An Encore never re-applies always-on cards.
  assert.equal(lens(['lantern-lens','refrain','crescendo']),40);
});

test('always-on boosts expose base, boosted value and the Boosts behind them',()=>{
  const entries=getAlwaysOnCardBoosts(row(['lantern-lens','deep-vessel','prism-lens','crescendo']));
  const lens=entries.find(e=>e.cardId==='lantern-lens');
  assert.deepEqual([lens.base,lens.boosted,lens.multiplier,lens.unit],[20,50,2.5,'% Luminance']);
  assert.deepEqual(lens.boostedBy.map(b=>[b.slot,b.name,b.multiplier]),[[2,'Prism Lens',1.25],[3,'Crescendo',2]]);
  assert.deepEqual(getCardBoostFactors(row(['lantern-lens','crescendo'])).map(f=>f.multiplier),[2,1]);
  const statuses=getEquippedCardStatuses(run(['lantern-lens','prism-lens']));
  assert.equal(statuses[1].state,'ready','a Boost that strengthens an always-on card is useful');
});

test('a boosted Collector reach extends only the extra reach in a real flight',()=>{
  const mods=getCardModifiers(run(['long-spool','crescendo']));
  const e=new WispFlight({canvas:{getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:430})},
    seed:'boost-reach',preflight:true,companions:['collector'],modifiers:mods});
  try{near(e.collectorRangeSources(e.wisp)[0].multiplier,1.7);}finally{e.destroy();}
});

// ── 4c. Economy paths under the Boost rules ──────────────────────────────────
function fresh(ids){
  const state=M.newState();state.profile.tutorialComplete=true;state.run=M.createRun(state.profile,'boost-economy',1,{cards:true});
  assert.ok(M.chooseStartingGift(state,M.getStartingGiftOffers(state.run)[0].id));
  state.run.mountedCards=row(ids);state.run.cardSlots=Math.max(3,ids.length);return state;
}
function clearOne(state){
  const r=state.run,node=M.getChoices(r).find(n=>n.type!=='support'&&!n.elite)||M.getChoices(r)[0];
  assert.ok(M.selectNode(r,node.id));assert.ok(M.beginFlightAttempt(r));assert.ok(M.markFlightAttemptStarted(r));
  assert.ok(M.finishFlight(r,{success:true,flame:0,collected:4}));
}
test('clear income and permanent gains settle at base value beside Boosts, once, across reload',()=>{
  let state=fresh(['wayfarers-purse','growth-ring','prism-lens-ii']);
  clearOne(state);const receipt=state.run.lastFlight.cardClearReceipt;
  assert.equal(receipt.stored,5);assert.equal(receipt.futureCapacity,0);assert.equal(receipt.tallyCapacity,1);
  assert.equal(receipt.cards.reduce((sum,card)=>sum+(card?.effective.stored||0),0),5);
  M.settleCheckpoint(state);assert.equal(state.profile.cardFutureCapacity,0);
  const wallet=state.run.condensedGlow;
  let data;const storage={getItem:()=>data,setItem:(_,v)=>{data=v;}};assert.ok(M.saveState(state,storage));
  state=M.loadState(storage);
  assert.equal(state.run.cardClearReceipts.length,1,'the receipt passes the save validation');
  assert.ok(Object.isFrozen(state.run.cardClearReceipts[0].cards));
  assert.equal(M.settleCheckpoint(state),0);assert.equal(state.run.condensedGlow,wallet);assert.equal(state.profile.cardFutureCapacity,0);assert.equal(state.run.mountedCards[1].tally,1);
});

// The designer overruled a wave-reach ceiling (2026-11-17): broken combos stay discoverable.
test('wave reach has no ceiling: boosted copies keep their full value',()=>{
  const boosted=run(['chameleon','edge-reach','prism-lens-ii','crescendo','closing-chord']);
  assert.equal(getCardModifiers(boosted).cardProximitySources,30,'2 sources ×15 = +1500%');
  near(getProximityClearance(getCardModifiers(boosted)),EDGING_PULSE_TUNING.clearance*16);
  near(getAlwaysOnCardBoosts(boosted.mountedCards).filter(entry=>entry.kind==='proximity-range').reduce((sum,entry)=>sum+entry.boosted,0),1500);
  assert.match(getMountedCards(boosted)[1].effectiveSummary,/\+1500% of normal reach/);
  assert.doesNotMatch(deckCardExplanationMarkup(boosted,{...getMountedCards(boosted)[1],mounted:true,slot:1}),/\(max\)/);
  const five=run(['chameleon','edge-reach','edge-reach','chameleon','edge-reach']);
  assert.equal(getCardModifiers(five).cardProximitySources,5,'five unboosted copies give +250% as before');
  near(getProximityClearance(getCardModifiers(five)),EDGING_PULSE_TUNING.clearance*3.5);
});

// Whole Sparks (2026-11-17): a firing's Spark total rounds UP once (owner: always round up), at its end.
test('a fractional firing rounds up, keeps the exact figure, and the cards still add up',()=>{
  const half=quote(['body-spark','prism-lens'],body);
  assert.deepEqual([half.sparks,half.sparksExact],[3,2.5]);
  assert.deepEqual(half.firings,[{pass:1,sparksExact:2.5,sparks:3}]);
  assert.deepEqual([half.cards[0].effective.sparks,half.cards[0].sparksExact],[3,2.5]);
  assert.equal(quote(['spark-cache','prism-lens'],body).sparks,5,'4 × 1.25 = 5 stays 5');
  // The rounding gain goes onto the last card that changed the total; the others keep their share.
  const two=quote(['echo','body-spark','body-spark','prism-lens'],body);
  assert.equal(two.sparksExact,7.5);assert.equal(two.sparks,8);
  assert.deepEqual(two.cards.map(card=>card.effective.sparks),[0,5,3,0]);
  assert.equal(two.cards.reduce((sum,card)=>sum+card.effective.sparks,0),two.sparks);
  // Collector seconds keep their decimals.
  near(quote(['glass-spool','prism-lens'],{kind:CARD_ROW_EVENTS.body,availableRecovery:5}).recoverySeconds,.625);
});

test('an Encore rounds its own firing, and the event total is the sum of the rounded firings',()=>{
  const r=quote(['harvest-common','prism-lens','second-sun','refrain'],{kind:CARD_ROW_EVENTS.wave,firstCrossing:true});
  // Firing 1: 1 × 1.25 × 2 = 2.5 → 3. Encore: 1 × 1.25 × 3 = 3.75 → 4.
  assert.deepEqual(r.firings,[{pass:1,sparksExact:2.5,sparks:3},{pass:2,sparksExact:3.75,sparks:4}]);
  assert.equal(r.sparks,7);assert.equal(r.sparksExact,6.25);
  assert.equal(r.cards[0].effective.sparks,7);assert.equal(r.cards[0].sparksExact,6.25);
});
