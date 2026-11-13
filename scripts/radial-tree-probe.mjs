import assert from 'node:assert/strict';
import {SKILLS,newState,createRun,getSkillWallet,chooseStartingSkill,buyCheckpointSkill} from '../dist/model.mjs';
import {radialTreeLayout,treeCanvas,treeDetail} from '../dist/living-tree.mjs';
const all=Object.values(SKILLS),keys=['main-sight','main-speed','main-efficiency','main-bond','collector','protector','leveler','swift','seer','kindler','afterglow'];let diagrams=0;
for(const key of keys){const skills=all.filter(s=>{if(!key.startsWith('main-'))return s.branch===key;let root=s;while(SKILLS[root.requires])root=SKILLS[root.requires];return root.id===key;});
 for(const [width,height] of [[560,280],[400,244],[320,220],[350,270],[437,208],[423,155]]){
  const layout=radialTreeLayout(skills,{width,height});assert.equal(layout.skillGroup.size,skills.length);
  for(const skill of skills){const group=layout.groups.find(g=>g.id===layout.skillGroup.get(skill.id));assert.ok(group.skills.some(s=>s.id===skill.id));if(skill.requires&&layout.skillGroup.has(skill.requires)&&layout.skillGroup.get(skill.requires)!==group.id)assert.equal(group.parent,layout.skillGroup.get(skill.requires));}
  const points=[...layout.points.values()];for(let i=0;i<points.length;i++){const a=points[i];assert.ok(a.x>=28&&a.x<=layout.width-28&&a.y>=28&&a.y<=layout.height-28);for(let j=i+1;j<points.length;j++)assert.ok(Math.abs(a.x-points[j].x)>=49.5||Math.abs(a.y-points[j].y)>=49.5,'44px rectangular targets need a 6px gap');}
  diagrams++;
 }
}
const state=newState();state.run=createRun(state.profile,'radial-probe');chooseStartingSkill(state,'main-efficiency');state.run.condensedGlow=5000;
const skills=all.filter(s=>s.branch==='collector');
assert.ok(buyCheckpointSkill(state,'collector-attunement'));
let html=treeCanvas({skills,wallet:getSkillWallet(state),run:state.run,selected:'collector-attunement',action:'inspect-branch-skill',key:'collector'});
assert.ok(html.includes('data-id="collector-reach-step-1"'));assert.ok(html.includes('aria-pressed="true"'));
let detail=treeDetail({run:state.run,wallet:getSkillWallet(state),skill:SKILLS['collector-attunement'],canBuy:true});assert.ok(detail.includes('OWNED'));assert.ok(detail.includes('disabled'));
assert.ok(buyCheckpointSkill(state,'collector-reach-step-1'));
html=treeCanvas({skills,wallet:getSkillWallet(state),run:state.run,selected:'collector-attunement',action:'inspect-branch-skill',key:'collector'});assert.ok(html.includes('data-id="collector-reach-step-2"'),'Track marker advances to the next unlearned rank');
console.log(JSON.stringify({diagrams,allSkillsReachable:true,prerequisitesPreserved:true,minimumRectangularGap:6,rankSelection:true}));
