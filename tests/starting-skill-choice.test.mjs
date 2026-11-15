import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
const game=seed=>{const s=M.newState();s.run=M.createRun(s.profile,seed);return s;};
test('route selection closes both opening gift choices',()=>{
 const s=game('gift-close'),offers=M.getStartingGiftOffers(s.run);
 assert.ok(M.selectNode(s.run,M.getChoices(s.run)[0].id));
 assert.ok(offers.every(gift=>!M.chooseStartingGift(s,gift.id)));
});
test('Dream relics are available before Dream and a Dream gift immediately activates the skill',()=>{
 let s;
 for(let i=0;i<100;i++){
  const candidate=game('dream-starter-'+i);
  if(M.getStartingGiftOffers(candidate.run).some(g=>g.id==='main-dream')){s=candidate;break;}
 }
 assert.ok(s);const ids=['dreamcatcher','second-dawn','dream-sovereign'];
 assert.ok(ids.every(id=>M.artifactFitsRun(s.run,id)));
 assert.ok(M.chooseStartingGift(s,'main-dream'));
 assert.ok(ids.every(id=>M.artifactFitsRun(s.run,id)));
 assert.equal(M.getRunModifiers(s.run).dreamDuration,8);
});
