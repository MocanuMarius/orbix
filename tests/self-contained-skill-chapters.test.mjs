import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.mjs';
import {skillBookChapter,skillChapterKey,normalizeChapterPrerequisites} from '../dist/skill-chapters.mjs';

test('all live prerequisites stay in their chapter and companion role without cycles',()=>{
 const visit=(id,path=[])=>{
  const skill=M.SKILLS[id];assert.ok(skill&&!skill.retired,id+' is a live skill');assert.ok(!path.includes(id),'cycle: '+[...path,id]);
  for(const parent of [skill.requires].flat().filter(Boolean)){
   assert.equal(skillChapterKey(M.SKILLS[parent]),skillChapterKey(skill),id+' stays in its chapter');visit(parent,[...path,id]);
  }
 };
 for(const skill of Object.values(M.SKILLS).filter(s=>!s.retired))visit(skill.id);
 for(const id of ['main-sight','proximity-awakening','main-dream','main-afterglow','collector-attunement','protector-attunement','swift-attunement','leveler-attunement'])assert.equal(M.SKILLS[id].requires,null);
 assert.equal(M.SKILLS['collector-fetch-large'].requires,'collector-attunement');
});
test('every live skill can be bought using only its own chapter prerequisites',()=>{
 for(const skill of Object.values(M.SKILLS).filter(s=>!s.retired)){
  const state=M.newState(),run=state.run=M.createRun(state.profile,'local-chapter:'+skill.id);run.condensedGlow=10000000;
  if(skillBookChapter(skill)==='companion'){run.companions=[skill.branch];run.companionRole=skill.branch;}
  const buy=id=>{for(const parent of [M.SKILLS[id].requires].flat().filter(Boolean))if(!run.skills[parent])buy(parent);assert.ok(M.buyCheckpointSkill(state,id),id+' can be bought');};
  buy(skill.id);
  assert.ok(Object.keys(run.skills).every(id=>skillChapterKey(M.SKILLS[id])===skillChapterKey(skill)));
 }
});
test('normalization retains local gates and replaces foreign-only gates with the local entry',()=>{
 const definitions={
  'main-efficiency':{id:'main-efficiency',branch:'main',requires:null},
  'collector-attunement':{id:'collector-attunement',branch:'collector',treeTab:'companion',requires:null},
  cache:{id:'cache',branch:'collector',treeTab:'companion',requires:'main-efficiency'},
  target:{id:'target',branch:'collector',treeTab:'companion',requires:['cache','main-efficiency']},
 };
 normalizeChapterPrerequisites(definitions);
 assert.equal(definitions.cache.requires,'collector-attunement');assert.deepEqual(definitions.target.requires,['cache']);
});
