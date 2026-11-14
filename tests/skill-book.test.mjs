import assert from 'node:assert/strict';
import test from 'node:test';
import {createRun,newState,SKILLS,getSkillWallet,canChooseStartingSkill,buyCheckpointSkill} from '../dist/model.mjs';
import {skillBookMarkup,skillBookChapter} from '../dist/skill-book.mjs';

function sample(role){
 const s=newState();s.run=createRun(s.profile,'book-fixture');s.run.companions=[role];s.run.companionRole=role;s.run.condensedGlow=250;s.run.startingSkill='proximity-awakening';s.run.skills={'proximity-awakening':1};return s;
}
const html=(s,options)=>skillBookMarkup({run:s.run,wallet:getSkillWallet(s),...options});
const listIds=markup=>[...markup.matchAll(/class="book-perk [^"]+" data-action="book-skill" data-id="([^"]+)"/g)].map(match=>match[1]);

test('each companion’s Can learn page matches actual purchases across all chapters',()=>{
 for(const role of ['collector','protector','swift','leveler']){
  const s=sample(role);
  const expected=Object.values(SKILLS).filter(skill=>buyCheckpointSkill(structuredClone(s),skill.id)||canChooseStartingSkill(s.run,skill.id)).map(skill=>skill.id).sort();
  for(const variant of ['map','index'])assert.deepEqual(listIds(html(s,{chapter:'available',variant})).sort(),expected);
  s.run.condensedGlow=0;
  assert.deepEqual(listIds(html(s,{chapter:'available',variant:'index'})),[]);
  const companion=html(s,{chapter:'companion'});
  assert.ok(listIds(companion).every(id=>SKILLS[id].branch===role));
 }
});
test('chapter view offers reachable, owned and future perks and keeps closed paths out of the purchase index',()=>{
 const s=sample('collector');
 s.run.skills['collector-attunement']=1;
 const map=html(s,{chapter:'companion',selected:'collector-last-orbit'});
 assert.match(map,/class="book-trails"/);assert.match(map,/data-action="book-skill" data-chapter="companion" data-id="collector-mastery"/);
 assert.equal(skillBookChapter(SKILLS['main-dream']),'dream');assert.equal(skillBookChapter(SKILLS['main-long-flash']),'luminance');
 s.run.skills['collector-far-search']=1;
 assert.match(html(s,{chapter:'companion'}),/Other path chosen/);
 assert.ok(!listIds(html(s,{chapter:'available'})).includes('collector-rich-cargo'));
});