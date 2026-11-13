import {SKILLS} from './model.mjs?v=pixel-landscape-2';
import {treeHeader,treeCanvas,treeDetail} from './living-tree.mjs?v=pixel-landscape-2';
export function branchTreeMarkup({run,wallet,branch,canBuy,selected}){
 const skills=Object.values(SKILLS).filter(s=>s.branch===branch);
 const skill=skills.find(s=>s.id===selected)||skills.find(s=>!s.requires)||skills[0];
 return treeHeader(run,wallet,branch)+`<div class="tree-body">${treeCanvas({skills,wallet,run,canBuy,selected:skill.id,action:'inspect-branch-skill',key:branch})}<aside class="tree-side"><p class="tree-whisper">Choose a circle. Grow each rank.</p>${treeDetail({run,wallet,skill,canBuy})}</aside></div>`;
}
