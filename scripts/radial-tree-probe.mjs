import assert from 'node:assert/strict';
import {SKILLS,newState,createRun,getSkillWallet,chooseStartingSkill,buyCheckpointSkill} from '../dist/model.mjs';
import {radialTreeLayout,treeCanvas,treeDetail} from '../dist/living-tree.mjs';
const all=Object.values(SKILLS),keys=['main-sight','main-speed','main-efficiency','main-bond','collector','protector','leveler','swift','seer','kindler','afterglow'];let diagrams=0;
for(const key of keys){const skills=all.filter(s=>{if(!key.startsWith('main-'))return s.branch===key;let root=s;while(SKILLS[root.requires])root=SKILLS[root.requires];return root.id===key;});
 for(const [width,height] of [[560,280],[400,244],[320,220],[350,270]]){
  const layout=radialTreeLayout(skills,{width,height});assert.equal(layout.skillGroup.size,skills.length);
  for(const skill of skills){const group=layout.groups.find(g=>g.id===layout.skillGroup.get(skill.id));assert.ok(group.skills.some(s=>s.id===skill.id));if(skill.requires&&layout.skillGroup.has(skill.requires)&&layout.skillGroup.get(skill.requires)!==group.id)assert.equal(group.parent,layout.skillGroup.get(skill.requires));}
  const points=[...layout.points.values()];for(let i=0;i<points.length;i++){const a=points[i];assert.ok(a.x>=28&&a.x<=width-28&&a.y>=28&&a.y<=height-28);for(let j=i+1;j<points.length;j++)assert.ok(Math.hypot(a.x-points[j].x,a.y-points[j].y)>=50,'44px targets need separation');}
  diagrams++;
 }
}
const state=newState();state.run=createRun(state.profile,'radial-probe');chooseStartingSkill(state,'main-efficiency');state.run.embers=100;
const skills=all.filter(s=>s.branch==='collector'),wallet=getSkillWallet(state);let html=treeCanvas({skills,wallet,run:state.run,selected:'collector-far-search-step-2',action:'inspect-branch-skill',key:'collector'});
assert.ok(html.includes('data-id="collector-far-search-step-2"'));assert.ok(html.includes('aria-pressed="true"'));assert.ok(html.includes('planned'));assert.equal((html.match(/class="tree-bud /g)||[]).length,8);
let detail=treeDetail({run:state.run,wallet,skill:SKILLS['collector-far-search-step-2'],canBuy:true});for(const id of ['collector-far-search-step-1','collector-far-search-step-2','collector-far-search'])assert.ok(detail.includes(`data-id="${id}"`));assert.ok(detail.includes('disabled'));
assert.ok(buyCheckpointSkill(state,'collector-attunement'));assert.ok(buyCheckpointSkill(state,'collector-reach-step-1'));
html=treeCanvas({skills,wallet:getSkillWallet(state),run:state.run,selected:'collector-attunement',action:'inspect-branch-skill',key:'collector'});assert.ok(html.includes('data-id="collector-reach-step-2"'),'Track marker advances to the next unlearned rank');
console.log(JSON.stringify({diagrams,allSkillsReachable:true,prerequisitesPreserved:true,minimumTouchSeparation:50,rankSelection:true}));
