import assert from 'node:assert/strict';
import {SKILLS,newState,createRun,getSkillWallet,getSkillPrice,buyCheckpointSkill} from '../dist/model.mjs';
import {skillTreeState,safeTreeSelection} from '../dist/skill-tree-state.mjs';
import {branchTreeMarkup} from '../dist/skill-tree.mjs';
import {radialTreeLayout} from '../dist/living-tree.mjs';

const state=newState(),run=state.run=createRun(state.profile,'tree-clarity');
const context=()=>({run,wallet:getSkillWallet(state),canBuy:true});
const view=id=>skillTreeState(context(),id);
const diagram=(branch,id)=>branchTreeMarkup({...context(),branch,selected:id});
const inspector=html=>html.slice(html.indexOf('<section class="tree-inspector'));
const marker=(html,id)=>html.match(new RegExp('<button class="tree-bud [^>]*data-id="'+id+'"[^>]*>'))?.[0];
const skills=Object.values(SKILLS).filter(s=>!s.retired);
const branchSkills=tab=>skills.filter(s=>s.treeTab===tab&&(tab!=='companion'||s.branch===run.companions[0]));

run.condensedGlow=0;
const starter=diagram('mystic','main-dream'),gift=inspector(starter);
assert.equal(view('main-dream').free,true);
assert.match(gift,/CHOOSE FREE GIFT/);
assert.match(gift,/class="rank-cost">FREE/);

const id='main-fourth-beat-2',first='main-fourth-beat';
assert.deepEqual([view(first).distance,view(id).distance],[1,2]);
assert.equal(safeTreeSelection(branchSkills('main'),id,context()).id,id);
let html=diagram('main',id),detail=inspector(html);
assert.ok(marker(html,first),'shared board marker points at the earliest unlearned rank');
assert.equal(marker(html,id),undefined);
assert.match(detail,/Fourth Beat 2/);
assert.match(detail,/Learn Lift 1 → Fourth Beat 1/);
assert.match(detail,/third Lift costs zero Sparks/);
assert.ok(detail.includes('data-id="'+first+'"')&&detail.includes('data-id="'+id+'"'));
assert.ok(!detail.includes('data-action="buy-skill"'));
assert.ok(!diagram('main','main-drift-sense').includes('data-id="main-drift-sense-3"'),'three prerequisites away remains hidden');
assert.equal(view('main-drift-sense-3').inspectable,false);

const roots=['main-speed','main-sight','main-efficiency'];
assert.deepEqual(roots.map(k=>getSkillPrice(context().wallet,k)),[30,45,90]);
const price=getSkillPrice(context().wallet,'main-sight');
run.condensedGlow=price-1;
detail=inspector(diagram('main','main-sight'));
assert.ok(detail.includes('Need 1 more Stored Sparks')&&detail.includes('SAVE FOR · '+price));
run.condensedGlow=price;
assert.ok(inspector(diagram('main','main-sight')).includes('+ LEARN · '+price));
assert.ok(buyCheckpointSkill(state,'main-sight'));
assert.equal(run.condensedGlow,0);
assert.ok(inspector(diagram('main','main-sight')).includes('✓ OWNED'));
const nextPrice=getSkillPrice(context().wallet,'main-horizon');
assert.ok(inspector(diagram('main','main-horizon')).includes('SAVE FOR · '+nextPrice));

run.condensedGlow=9999;
assert.ok(buyCheckpointSkill(state,'collector-attunement'));
assert.ok(buyCheckpointSkill(state,'collector-reach-step-1'));
html=diagram('companion','collector-reach');
assert.match(marker(html,'collector-reach-step-2'),/data-owned-ranks="1"/);
assert.ok(inspector(html).includes(SKILLS['collector-reach'].name));
assert.ok(!html.includes('data-id="collector-recovery-step-1"')&&!html.includes('data-id="collector-close-orbit"'));
assert.equal(view('collector-close-orbit').state,'excluded');
run.testMode=true;run.condensedGlow=0;
assert.equal(view('collector-close-orbit').disclosure,'full');
assert.ok(inspector(diagram('companion','collector-close-orbit')).includes('SAVE FOR'));
assert.equal(view('collector-close-orbit').available,false,'TEST still charges the real price');

let layouts=0;
for(const role of ['collector','protector','swift','leveler']){
 run.companions=[role];
 for(const tab of ['main','companion','mystic']){
  const list=branchSkills(tab),layout=radialTreeLayout(list,{width:424,height:221});
  const points=[...layout.points.values()];
  for(const [i,a] of points.entries()){
   assert.ok(a.x>=22&&a.x<=layout.width-22&&a.y>=22&&a.y<=layout.height-22);
   for(const b of points.slice(i+1))assert.ok(Math.abs(a.x-b.x)>=49.5||Math.abs(a.y-b.y)>=49.5,'44px square targets must not overlap');
  }
  layouts++;
 }
}
console.log(JSON.stringify({inspectablePrerequisites:2,closedBranchesHidden:true,sharedRankPreview:true,realPurchasePrices:[30,45,90],layouts,viewport:[740,333]}));
