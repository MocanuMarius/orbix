import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
const game=seed=>{const s=M.newState();s.run=M.createRun(s.profile,seed);return s;};
test('route selection closes both opening gift choices',()=>{
 const s=game('gift-close'),offers=M.getStartingGiftOffers(s.run);
 assert.ok(M.selectNode(s.run,M.getChoices(s.run)[0].id));
 assert.ok(offers.every(gift=>!M.chooseStartingGift(s,gift.id)));
});
test('Dream stays a paid skill while its relics remain available before learning it',()=>{
 const s=game('paid-dream'),ids=['dreamcatcher','second-dawn','dream-sovereign'];
 assert.ok(ids.every(id=>M.artifactFitsRun(s.run,id)));
 assert.equal(M.chooseStartingGift(s,'main-dream'),false);
 s.run.condensedGlow=200;
 assert.ok(M.buyCheckpointSkill(s,'main-dream'));
 assert.ok(ids.every(id=>M.artifactFitsRun(s.run,id)));
 assert.equal(M.getRunModifiers(s.run).dreamDuration,8);
});
