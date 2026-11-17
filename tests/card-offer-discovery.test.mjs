import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {SKILL_CARDS,makeSkillCard,getCardRowRule,drawSkillCard,drawSkillCardDraft,previewCardRow} from '../dist/skill-cards.mjs';
import {cardOfferMultiplier} from '../dist/card-offer-context.mjs';

const descriptor = id => {
  const def = SKILL_CARDS[id];return {def,rule:getCardRowRule(def,makeSkillCard(id,`context:${id}`))};
};
const multiplier = (id, ids = [], options) => cardOfferMultiplier(descriptor(id),ids.map(descriptor),options);
const broad = card => ['echo','chameleon','refrain','use-doubler','ember-feeder'].includes(SKILL_CARDS[card.cardId].kind)
  || SKILL_CARDS[card.cardId].row?.event === '*';

test('bounded context weights reward real owned partners and respect row and copying prerequisites', () => {
  assert.equal(multiplier('echo',['body-spark']),4);
  assert.equal(multiplier('echo',['lantern-lens']),1.5);
  assert.equal(multiplier('echo',['deep-vessel']),1.5);
  assert.equal(multiplier('chameleon',['lantern-lens']),4);
  assert.equal(multiplier('echo',['growth-seed-common']),1.5);
  assert.equal(multiplier('kindling-bead'),1.5,'another declined alternative cannot supply a payer');
  assert.equal(multiplier('kindling-bead',['body-spark']),4);
  // Crescendo no longer needs two earlier cards (designer, 2026-11-17): one real payer is enough.
  assert.equal(multiplier('crescendo'),1.5,'another declined alternative cannot supply a payer');
  assert.equal(multiplier('crescendo',['body-spark']),4);
  assert.equal(multiplier('crescendo',['body-spark','downbeat']),4);
  assert.equal(multiplier('crescendo',['cluster-heart','dusk-wick']),4);
  assert.equal(multiplier('crescendo',['body-spark','spark-cache']),4);
  assert.equal(multiplier('body-spark',['wick-doubler']),2,'an owned multiplier can find a new payer');
  assert.equal(multiplier('use-doubler',['spark-cache']),4);
  assert.equal(multiplier('use-doubler',['camp-kit']),1.5,'Rest cards cannot receive flight uses');
  assert.equal(multiplier('ember-feeder',['body-spark']),1.5);
  assert.equal(multiplier('ember-feeder',['body-spark','deep-vessel']),4);
  assert.equal(multiplier('ember-feeder',['body-spark','deep-vessel'],{slots:2}),1.5);
  for (const def of Object.values(SKILL_CARDS)) for (const mode of ['draft','forge']) {
    const weight=multiplier(def.id,['body-spark','spark-cache'],{mode});
    assert.ok(weight>=1&&weight<=4,`${def.id}/${mode} retains ordinary circulation`);
  }
});

test('context changes neither the first earned offer nor any seeded rarity, and ignores exhausted sources', () => {
  for(let seed=0;seed<350;seed++)for(const tier of ['normal','elite','boss']) {
    const node={id:'context-check',[tier]:true},run={campaignSeed:`context:${seed}`,mapIndex:2,cardSlots:3,
      mountedCards:[makeSkillCard('body-spark','body')],reserveCards:[makeSkillCard('spark-cache','pocket')]},
      before=structuredClone(run),offers=drawSkillCardDraft(run,node),bare={...run,mountedCards:[],reserveCards:[]};
    assert.deepEqual(run,before);assert.deepEqual(drawSkillCardDraft(run,node),offers);
    assert.deepEqual(offers[0],drawSkillCard(run,'flight',node));
    assert.deepEqual(offers.map(card=>SKILL_CARDS[card.cardId].rarity),[0,1,2].map(index=>
      SKILL_CARDS[drawSkillCard(bare,index?`flight-draft:${index}`:'flight',node).cardId].rarity));
    assert.equal(new Set(offers.map(card=>SKILL_CARDS[card.cardId].name)).size,3);
    assert.ok(offers.every(card=>!SKILL_CARDS[card.cardId].starterOnly));
    const exhausted={...bare,reserveCards:[{...makeSkillCard('spark-cache','empty'),charges:0}]};
    assert.deepEqual(drawSkillCardDraft(exhausted,node),drawSkillCardDraft(bare,node));
  }
});

test('seeded drafts increase executable body-row opportunities while retaining the complete ordinary catalog', () => {
  const owned=makeSkillCard('body-spark','owned'),event={kind:'body-spark',pickupKind:'light'},
    makesCombo=card=>[[owned,card],[card,owned]].some(row=>previewCardRow(row,event).sparks
      >previewCardRow([owned],event).sparks+previewCardRow([card],event).sparks),
    seen=new Set();let actual=0,ordinary=0,newCards=0,drafts=0;
  for(let seed=0;seed<1200;seed++)for(const tier of ['normal','elite','boss']) {
    const run={campaignSeed:`discovery:${seed}`,mapIndex:2,mountedCards:[owned],reserveCards:[],cardSlots:3},
      node={id:'body-checkpoint',[tier]:true},offers=drawSkillCardDraft(run,node),
      control=[0,1,2].map(index=>drawSkillCard(run,index?`flight-draft:${index}`:'flight',node));
    actual+=Number(offers.some(makesCombo));ordinary+=Number(control.some(makesCombo));drafts++;
    newCards+=Number(offers.some(card=>['use-doubler','ember-feeder'].includes(card.cardId)));
    for(const card of offers)seen.add(card.cardId);
  }
  assert.ok(actual>ordinary+drafts*.06,`executable combos ${actual}/${drafts} vs ordinary ${ordinary}/${drafts}`);
  assert.ok(newCards>drafts*.05,'new cards retain visible acquisition opportunities');
  for(const def of Object.values(SKILL_CARDS).filter(def=>!def.starterOnly&&!def.retired&&!def.unreleased))assert.ok(seen.has(def.id),`${def.id} remains obtainable`);
  for(const def of Object.values(SKILL_CARDS).filter(def=>def.unreleased))assert.ok(!seen.has(def.id),`${def.id} is unreleased and never offered`);
});

test('Forge broad-chain circulation is seeded independently of inventory, ordering and map changes', () => {
  const state=M.newState(),run=state.run=M.createRun(state.profile,'stable-chain-forge',1,{cards:true}),
    before=structuredClone(run),quote=M.getCardForgePreview(run),legendary=M.getCardForgePreview(run,'legendary');
  assert.deepEqual(run,before,'reading previews remains pure');
  run.mapIndex=2;run.mountedCards=[makeSkillCard('echo-ii','moved'),null,null];
  run.reserveCards=[makeSkillCard('spark-cache','found'),makeSkillCard('body-spark','body')];
  for(const [rarity,old] of [['rare',quote],['legendary',legendary]]) {
    const next=M.getCardForgePreview(run,rarity);
    assert.deepEqual(next.card,old.card);assert.equal(next.token,old.token);assert.equal(next.sequence,old.sequence);
  }
  let text;assert.ok(M.saveState(state,{setItem:(_,value)=>{text=value;}}));
  const restored=M.loadState({getItem:()=>text,setItem(){}}).run;
  assert.deepEqual(M.getCardForgePreview(restored).card,quote.card);
  for(const rarity of ['rare','legendary']) {
    let favored=0,ordinary=0;const seen=new Set();
    for(let seed=0;seed<1800;seed++) {
      const context={campaignSeed:`forge-discovery:${seed}`,mapIndex:0},
        card=drawSkillCard(context,`forge:v2:${rarity}:0`,null,rarity),
        control=drawSkillCard(context,`ordinary-forge:${rarity}:0`,null,rarity);
      favored+=Number(broad(card));ordinary+=Number(broad(control));seen.add(card.cardId);
      assert.equal(SKILL_CARDS[card.cardId].rarity,rarity);
    }
    assert.ok(favored>ordinary+1800*.15,`${rarity} broad chains ${favored}/1800 vs ordinary ${ordinary}/1800`);
    for(const def of Object.values(SKILL_CARDS).filter(def=>def.rarity===rarity&&!def.starterOnly&&!def.retired&&!def.unreleased))assert.ok(seen.has(def.id),`${def.id} still forges`);
  }
});

test('changing ownership after a clear never replaces saved draft alternatives', () => {
  const state=M.newState();state.profile.tutorialComplete=true;
  const run=state.run=M.createRun(state.profile,'held-chain-draft',1,{cards:true});
  assert.ok(M.chooseStartingGift(state,M.getStartingGiftOffers(run)[0].id));
  const node=M.getChoices(run).find(node=>node.type!=='support');
  assert.ok(M.selectNode(run,node.id));assert.ok(M.beginFlightAttempt(run));assert.ok(M.markFlightAttemptStarted(run));
  assert.ok(M.finishFlight(run,{success:true,flame:40}));M.settleCheckpoint(state);
  const draft=structuredClone(M.getCardDraft(run));
  run.mountedCards=[makeSkillCard('echo','changed'),null,null];run.reserveCards=[makeSkillCard('spark-cache','changed-pocket')];
  assert.deepEqual(M.getCardDraft(run),draft);
  let text;assert.ok(M.saveState(state,{setItem:(_,value)=>{text=value;}}));
  const restored=M.loadState({getItem:()=>text,setItem(){}});
  assert.deepEqual(M.getCardDraft(restored.run),draft);
  assert.ok(M.chooseCardDraft(restored,draft.id,draft.offers[1].instanceId));
  assert.equal(restored.run.cardReward.card.cardId,draft.offers[1].cardId);
});
