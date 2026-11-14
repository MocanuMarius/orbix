import test from 'node:test';import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {skillBookMarkup,luminancePreview} from '../dist/skill-book.mjs';
import {formatLuminance} from '../dist/luminance-units.mjs';
const setup=()=>{const s=M.newState();s.run=M.createRun(s.profile,'reach-preview');s.run.condensedGlow=500;return s;};
test('Luminance chapter shows actual radius in body widths and the selected gain',()=>{
 const s=setup(),p=luminancePreview(s.run,M.SKILLS['main-sight']);
 assert.equal(p.before,145);assert.equal(p.after,180);assert.equal(p.prerequisites,false);
 const html=skillBookMarkup({run:s.run,wallet:M.getSkillWallet(s),chapter:'luminance',selected:'main-sight'});
 assert.match(html,/Base Luminance radius/);assert.match(html,/4\.1 wisp widths/);assert.match(html,/5\.1 wisp widths/);assert.doesNotMatch(html,/radius by 35/);
 assert.equal(formatLuminance(145),'4.1 wisp widths');
});
test('locked later perks include their prerequisite path; learned perks show no extra purchase',()=>{
 const s=setup(),far=M.SKILLS['main-horizon'];
 assert.deepEqual(luminancePreview(s.run,far),{before:145,after:225,prerequisites:true});
 assert.ok(M.buyCheckpointSkill(s,'main-sight'));
 assert.deepEqual(luminancePreview(s.run,far),{before:180,after:225,prerequisites:false});
 assert.ok(M.buyCheckpointSkill(s,'main-horizon'));
 assert.deepEqual(luminancePreview(s.run,far),{before:225,after:225,prerequisites:false});
});
