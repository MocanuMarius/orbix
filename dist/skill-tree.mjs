import {SKILLS} from './model.mjs?v=world-variety-1';
import {treeHeader,treeCanvas,treeDetail} from './living-tree.mjs?v=world-variety-1';
export function branchTreeMarkup({run,wallet,branch,canBuy,selected}){
 const skills=Object.values(SKILLS).filter(s=>s.branch===branch);
 const skill=skills.find(s=>s.id===selected)||skills.find(s=>!s.requires)||skills[0];
 return treeHeader(run,wallet,branch)+`<p class="tree-whisper">Tap a bud. Follow its branch.</p>`+treeCanvas({skills,wallet,selected:skill.id,action:'inspect-branch-skill',key:branch})+treeDetail({run,wallet,skill,canBuy});
}
