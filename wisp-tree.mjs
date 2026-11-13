import {STARTING_CONDENSED_GLOW} from './vitality.mjs?v=condensed-glow-1';
import {SKILLS,MAIN_WISP_BRANCHES,isSkillRevealed,canChooseStartingSkill} from './model.mjs?v=condensed-glow-1';
import {treeHeader,treeCanvas,treeDetail,esc} from './living-tree.mjs?v=condensed-glow-1';
export function mainWispTreeMarkup({run,wallet,canBuy,selected='main-efficiency'}){
 let skill=SKILLS[selected];if(!skill||skill.branch!=='main')skill=SKILLS['main-efficiency'];
 let root=skill;while(root.requires&&SKILLS[root.requires]?.branch==='main')root=SKILLS[root.requires];
 const includes=s=>{let n=s;while(n){if(n.id===root.id)return true;n=SKILLS[n.requires];}return false;};
 const skills=Object.values(SKILLS).filter(s=>s.branch==='main'&&includes(s));
 const names={'main-sight':'LIGHT','main-speed':'MOTION','main-efficiency':'GLOW','main-bond':'BONDS','main-artifact-slot-1':'RELICS'};
 const tabs=[...MAIN_WISP_BRANCHES.map(b=>b.root),...(isSkillRevealed(wallet,'main-bond')?['main-bond']:[]),'main-artifact-slot-1'];
 const limbs=`<nav class="tree-limbs" aria-label="Main wisp branches">${tabs.map(id=>`<button data-action="inspect-main-skill" data-id="${id}" class="${id===root.id?'selected':''}">${esc(names[id])}</button>`).join('')}</nav>`;
 return treeHeader(run,wallet,'main')+`<div class="tree-body">${treeCanvas({skills,wallet,run,canBuy,selected:skill.id,action:'inspect-main-skill',key:root.id})}<aside class="tree-side">${limbs}<p class="tree-whisper">${canChooseStartingSkill(run)?`One starter skill + ${STARTING_CONDENSED_GLOW} Condensed Glow`:'Follow a branch. Shape your flight.'}</p>${treeDetail({run,wallet,skill,canBuy})}</aside></div>`;
}
