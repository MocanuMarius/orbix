import assert from 'node:assert/strict';
import {SKILLS,newState,createRun,chooseStartingSkill,getSkillWallet,getSkillPrice,getSkillLockReason} from '../dist/model.mjs';
import {skillTreeState,safeTreeSelection,skillTreeStatus} from '../dist/skill-tree-state.mjs';
import {mainWispTreeMarkup} from '../dist/wisp-tree.mjs';
import {branchTreeMarkup} from '../dist/skill-tree.mjs';
import {treeCanvas,treeDetail,radialTreeLayout} from '../dist/living-tree.mjs';

const state=newState();state.run=createRun(state.profile,'tree-clarity');
const context=()=>({run:state.run,wallet:getSkillWallet(state),canBuy:true});
const view=id=>skillTreeState(context(),id);
const light=Object.values(SKILLS).filter(skill=>{let root=skill;while(SKILLS[root.requires])root=SKILLS[root.requires];return root.id==='main-sight';});
const inspector=html=>html.slice(html.indexOf('<section class="tree-inspector'));
const node=(html,id)=>html.match(new RegExp(`<button[^>]*data-id="${id}"[^>]*>`))?.[0];

state.run.condensedGlow=0;
assert.equal(view('main-sight').state,'available');
assert.equal(view('main-sight').free,true,'Starting gifts use the model gift rule even at zero CG');
assert.equal(view('main-edging-attunement').state,'preview');
assert.equal(view('main-dream-deep').state,'distant');
let html=mainWispTreeMarkup({...context(),selected:'main-sight'});
assert.equal((html.match(/data-tree-state="available"/g)||[]).length,1,'Start presents one current choice in this limb');
assert.ok(!html.includes(SKILLS['main-edging-attunement'].name),'Unselected previews have no name, including in aria labels');
assert.ok(!html.includes('data-id="main-dream-deep"'));
assert.ok(!html.includes(SKILLS['main-dream-deep'].name));
assert.ok(!html.includes(SKILLS['main-dream-deep'].description));

chooseStartingSkill(state,'main-sight');
assert.equal(view('main-sight').state,'learned');
assert.equal(view('main-edging-attunement').state,'saving');
assert.equal(view('main-edging-attunement').shortfall,getSkillPrice(context().wallet,'main-edging-attunement'));
html=mainWispTreeMarkup({...context(),selected:'main-edging-attunement'});
assert.match(node(html,'main-edging-attunement'),/data-tree-state="saving"/);
assert.match(inspector(html),/Need 80 more Condensed Glow/);
assert.ok(inspector(html).includes('3.2s instead of 4s'),'Reachable unaffordable nodes remain fully inspectable');
assert.match(node(html,'main-sight'),/data-tree-state="learned"/);
assert.match(html,/bud-price">✓/);

html=mainWispTreeMarkup({...context(),selected:'main-edging-lasting'});
assert.match(node(html,'main-edging-lasting'),/data-tree-state="preview"/);
assert.ok(inspector(html).includes('Lasting Pulse'));
assert.ok(!inspector(html).includes(SKILLS['main-edging-lasting'].description));
assert.ok(!inspector(html).includes('buy-skill'),'Nearby previews disclose the title only, without price or purchase action');
assert.ok(!inspector(html).includes('data-icon'));
html=mainWispTreeMarkup({...context(),selected:'main-dream-deep'});
assert.ok(!html.includes(SKILLS['main-dream-deep'].name));
assert.ok(!html.includes(SKILLS['main-dream-deep'].description));
assert.ok(!treeDetail({...context(),skill:SKILLS['main-dream-deep']}).includes(SKILLS['main-dream-deep'].description),'Direct inspector entry also sanitizes hidden selection');

state.run.condensedGlow=1000;
assert.equal(view('main-edging-attunement').state,'available');
assert.equal(skillTreeState({...context(),canBuy:false},'main-edging-attunement').state,'locked','Checkpoint availability participates in node brightness');
assert.equal(skillTreeState({...context(),canBuy:false},'main-edging-attunement').available,false);
state.run.skills['main-horizon']=1;
for(const id of ['main-dawn','main-dawn-guard','main-dawn-fuel']){
 assert.equal(view(id).state,'excluded');
 assert.equal(view(id).inspectable,false);
}
html=mainWispTreeMarkup({...context(),selected:'main-dawn-fuel'});
for(const id of ['main-dawn','main-dawn-guard','main-dawn-fuel'])assert.ok(!node(html,id),'Closed forks and their descendants are not clickable');
assert.ok(!html.includes(SKILLS['main-dawn-fuel'].description));
assert.ok(html.includes('closed-root'));

state.run.skills['collector-attunement']=1;
state.run.skills['collector-reach-step-1']=1;
const collector=Object.values(SKILLS).filter(skill=>skill.branch==='collector');
html=treeCanvas({...context(),skills:collector,selected:'collector-reach-step-1',action:'inspect-branch-skill',key:'collector'});
assert.match(node(html,'collector-reach-step-2'),/data-tree-state="available"/,'A learned selected rank does not hide the next actionable rank');
assert.equal(safeTreeSelection(collector,'collector-reach',context()).id,'collector-reach-step-2','A future rank cannot replace its current reachable shared marker');
html=branchTreeMarkup({...context(),branch:'collector',selected:'collector-reach'});
assert.ok(!inspector(html).includes('data-id="collector-reach"'),'Future rank slot is anonymous and noninteractive');
assert.ok(inspector(html).includes('Future rank'));

state.run.testMode=true;state.run.condensedGlow=0;
const test=view('main-dream-deep');
assert.equal(test.disclosure,'full');
assert.equal(test.state,'saving');
assert.equal(test.shortfall,getSkillPrice(context().wallet,'main-dream-deep'));
assert.equal(getSkillLockReason(context().wallet,'main-dream-deep'),null);
assert.match(skillTreeStatus(test),new RegExp(`Need ${test.shortfall} more`));
assert.equal(view('main-dawn-fuel').disclosure,'full','TEST opens closed branches');
html=mainWispTreeMarkup({...context(),selected:'main-dream-deep'});
assert.ok(inspector(html).includes(SKILLS['main-dream-deep'].description));
assert.ok(html.includes('data-id="afterglow"'),'TEST can navigate to Condensation without its normal prerequisite');
assert.equal((html.match(/data-tree-state=/g)||[]).length,20,'TEST exposes all Light nodes');

globalThis.innerWidth=900;globalThis.innerHeight=405;
const layout=radialTreeLayout(light,{width:572,height:272.8}),points=[...layout.points.values()];
let minimum=Infinity;
for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)minimum=Math.min(minimum,Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y));
assert.ok(minimum>=50,'Full TEST Light tree preserves separation for 44px targets at 900×405');
console.log(JSON.stringify({freeGift:true,learned:true,affordable:true,shortfall:true,checkpointGate:true,previewWithoutSpoilers:true,distantSelectionSanitized:true,closedDescendants:true,rankProgress:true,testCostsReal:true,lightNodes:light.length,minimumSeparation:minimum}));
