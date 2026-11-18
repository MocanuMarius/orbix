import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {makeSkillCard,CARD_ECONOMY} from '../dist/skill-cards.mjs';
import {cardWorkshopMarkup,cardRefillMarkup} from '../dist/card-workshop.mjs';

function camp(){
  const state=M.newState(), run=state.run=M.createRun(state.profile,'workshop-services',1,{cards:true});
  run.current=run.map[4][0];run.step=4;run.path=[run.current.id];run.phase='support';run.condensedGlow=100;
  run.reserveCards=[{...makeSkillCard('spark-cache','pocket'),charges:1},makeSkillCard('camp-kit','ember'),makeSkillCard('twin-wick','twin'),makeSkillCard('growth-ring','future')];
  return {state,run};
}
function reload(state){let data;M.saveState(state,{setItem:(_,text)=>{data=text;}});return M.loadState({getItem:()=>data,setItem(){}});}

test('refill quotes exact prorated uses, costs no Rest action and persists the same source',()=>{
  let {state,run}=camp();
  const before=structuredClone(run),quote=M.getCardRefillPreview(run,'pocket');
  assert.deepEqual(run,before);assert.equal(quote.price,13);assert.equal(quote.fullPrice,CARD_ECONOMY.improve.common);
  assert.equal(quote.before.charges,1);assert.equal(quote.after.charges,6);
  const actions=structuredClone(run.cardRest),vitals=[run.lives,run.flame,run.cardGrowUses];
  assert.ok(M.refillOwnedCard(state,'pocket',quote.token));
  assert.equal(run.condensedGlow,87);assert.equal(run.reserveCards[0].charges,6);
  assert.deepEqual(run.cardRest,actions);assert.deepEqual([run.lives,run.flame,run.cardGrowUses],vitals);
  assert.equal(M.refillOwnedCard(state,'pocket',quote.token),false);
  state=reload(state);run=state.run;assert.equal(run.reserveCards.find(card=>card.instanceId==='pocket').charges,6);
  assert.equal(M.getCardRefillPreview(run,'pocket').reason,'Uses are already full');
});

test('refill refuses absent, consumed, one-use and lasting cards, and rejects changed quotes',()=>{
  const {state,run}=camp();
  for(const id of ['missing','ember','twin','future']){
    const before=structuredClone(run),quote=M.getCardRefillPreview(run,id);
    assert.equal(quote.eligible,false);assert.equal(M.refillOwnedCard(state,id,quote.token),false);assert.deepEqual(run,before);
  }
  const quote=M.getCardRefillPreview(run,'pocket');run.condensedGlow--;
  const before=structuredClone(run);assert.equal(M.refillOwnedCard(state,'pocket',quote.token),false);assert.deepEqual(run,before);
  run.reserveCards[0].charges=0;
  assert.equal(M.getCardRefillPreview(run,'pocket').eligible,false);
  M.commitCardCharges(run,{pocket:0});assert.equal(M.getCardRefillPreview(run,'pocket').before,null);
  assert.equal(M.refillOwnedCard(state,'pocket',quote.token),false);
});

test('refill is restricted to real live or completed Rest and stops when choosing its exit',()=>{
  const {state,run}=camp(),node=run.current;
  for(const phase of ['briefing','retry','map-clear']){
    run.phase=phase;const before=structuredClone(run),quote=M.getCardRefillPreview(run,'pocket');
    assert.equal(quote.eligible,false);assert.equal(M.refillOwnedCard(state,'pocket',quote.token),false);assert.deepEqual(run,before);
  }
  run.phase='support';
  assert.ok(M.resolveSupport(run,M.getSupportChoices(run).findIndex(choice=>choice.effect?.restContinue)));
  const quote=M.getCardRefillPreview(run,'pocket');assert.equal(quote.eligible,true);
  assert.ok(M.refillOwnedCard(state,'pocket',quote.token));
  assert.ok(M.selectNode(run,node.nextIds[0]));run.reserveCards[0].charges=1;
  const next=M.getCardRefillPreview(run,'pocket');assert.equal(next.reason,'Refill is available at Rest');
  assert.equal(M.refillOwnedCard(state,'pocket',next.token),false);
});

test('Workshop compares named choices and confirmation shows exact before and after',()=>{
  const {run}=camp(),hub=cardWorkshopMarkup(run),quote=M.getCardRefillPreview(run,'pocket');
  for(const text of ['Improve','Refill','Forge','data-service="improve"','data-service="refill"','data-service="forge"','Rank up a card or evolve it','A surprise new card'])assert.ok(hub.includes(text),text);
  assert.equal((hub.match(/class="wk-tile[ "]/g)||[]).length,3,'three large tiles');assert.doesNotMatch(hub,/data-tap-pick/);for(const html of [hub,cardWorkshopMarkup(run,{view:'refill'}),cardWorkshopMarkup(run,{view:'forge'})])assert.doesNotMatch(html.replace(/<[^>]*>/g,' '),/-\d|wallet|reserve/i,'visible text');
  const poor=structuredClone(run);poor.condensedGlow=5;const poorHub=cardWorkshopMarkup(poor);assert.match(poorHub,/Needs 8 more/);assert.equal((poorHub.match(/class="wk-tile wk-off"/g)||[]).length,3,'dimmed tiles stay visible with their reason');assert.doesNotMatch(poorHub,/<button[^>]* disabled/,'hub tiles stay openable');const poorPick=cardWorkshopMarkup(poor,{view:'improve'});assert.match(poorPick,/Needs \d+ more Stored Sparks/);assert.match(poorPick,/wk-pick wk-off" disabled/,'unaffordable offers cannot be taken');
  const refill=cardWorkshopMarkup(run,{view:'refill'}),improve=cardWorkshopMarkup(run,{view:'improve'}),forge=cardWorkshopMarkup(run,{view:'forge'});
  for(const text of ['Pocket Sparks','Uses 1 → 6','Refill','data-action="card-workshop-refill"','data-tap-pick','data-action="card-workshop-hub"'])assert.ok(refill.includes(text),text);
  for(const text of ['data-action="card-workshop-improve"','Improve','data-tap-pick'])assert.ok(improve.includes(text),text);
  for(const text of ['data-action="card-workshop-forge"','Surprise Rare card','Revealed after you pay'])assert.ok(forge.includes(text),text);
  assert.ok(refill.includes('wk-cost">Refill')&&refill.includes('<b>13</b>'),'price shown on the tile');
  assert.match(cardRefillMarkup(run,quote),/Costs 13 Stored Sparks/);
  const offers=['rare','legendary'].map(rarity=>M.getCardForgePreview(run,rarity));
  const restored=reload({ ...M.newState(),run }).run;
  assert.deepEqual(['rare','legendary'].map(rarity=>M.getCardForgePreview(restored,rarity).card),offers.map(preview=>preview.card));
});
