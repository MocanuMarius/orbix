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
 assert.match(map,/class="book-trails"/);assert.match(map,/data-action="book-skill" data-id="collector-mastery"/);
 assert.equal(skillBookChapter(SKILLS['main-dream']),'dream');assert.equal(skillBookChapter(SKILLS['main-long-flash']),'luminance');
 s.run.skills['collector-far-search']=1;
 assert.match(html(s,{chapter:'companion'}),/Other path chosen/);
 assert.ok(!listIds(html(s,{chapter:'available'})).includes('collector-rich-cargo'));
});
test('a cross-chapter prerequisite can be bought inline without opening the other chapter',()=>{
 const s=sample('collector'),page=()=>html(s,{chapter:'dream',selected:'main-dream'});
 assert.match(page(),/book-inline-requirement[\s\S]+?Luminance[\s\S]+?class="book-buy-inline" data-action="buy-skill" data-id="main-sight"/);
 s.run.condensedGlow=0;
 assert.doesNotMatch(page(),/class="book-buy-inline"/);
 assert.match(page(),/Need \d+ more Stored Sparks/);
 s.run.condensedGlow=250;
 assert.equal(buyCheckpointSkill(s,'main-sight'),true);
 assert.match(page(),/data-chapter="dream"[\s\S]+?aria-label="Learned"[\s\S]+?class="book-buy"[^>]+?data-id="main-dream"/);
});
test('Regenerative Pulse explains recovery alongside the normal reveal',()=>{
 const s=sample('collector');
 const map=html(s,{chapter:'proximity',selected:'main-edging-regeneration'});
 assert.match(map,/restores 3 missing Sparks/);assert.match(map,/normal pulse effects remain/i);
 assert.doesNotMatch(map,/\+0 Sparks/);
});
test('each rank is a linked perk with its own price, state and purchase guard',()=>{
 const s=sample('collector');s.run.skills['main-afterglow']=1;
 const page=id=>html(s,{chapter:'packing',selected:id});
 const row=(markup,id)=>markup.match(new RegExp('<button type="button" class="book-perk [^"]+" data-action="book-skill" data-id="'+id+'"[^>]*>[\\s\\S]*?</button>'))?.[0];
 const initial=page('afterglow-anchor@2');
 assert.match(row(initial,'afterglow-anchor'),/Can learn/);
 assert.match(row(initial,'afterglow-anchor@2'),/Needs prerequisite/);
 assert.match(initial,/data-chapter="packing" data-id="afterglow-anchor"/);
 assert.doesNotMatch(initial,/book-stages|book-ranks/);
 assert.equal(buyCheckpointSkill(s,'afterglow-anchor',2),false);
 assert.equal(buyCheckpointSkill(s,'afterglow-anchor',1),true);
 assert.equal(buyCheckpointSkill(s,'afterglow-anchor',1),false);
 assert.match(row(page('afterglow-anchor@2'),'afterglow-anchor'),/Owned/);
 assert.match(page('afterglow-anchor@2'),/data-id="afterglow-anchor" data-rank="2"/);
 s.run.condensedGlow=0;
 assert.match(row(page('afterglow-anchor@2'),'afterglow-anchor@2'),/Save \d+ more/);
 assert.doesNotMatch(page('afterglow-anchor@2'),/class="book-buy"/);
 s.run.condensedGlow=250;
 assert.equal(buyCheckpointSkill(s,'afterglow-anchor',2),true);
 assert.match(row(page('afterglow-anchor@2'),'afterglow-anchor@2'),/Owned/);
 const dream=html(s,{chapter:'dream'});
 assert.ok(listIds(dream).includes('main-dream')&&listIds(dream).includes('main-dream-long'));
});
