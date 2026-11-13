import {SKILLS} from './model.mjs?v=tutorial-context-1';
import {treeHeader,treeCanvas,treeDetail} from './living-tree.mjs?v=tutorial-context-1';
import {safeTreeSelection} from './skill-tree-state.mjs?v=tutorial-context-1';
export function branchTreeMarkup({run,wallet,branch,canBuy,selected}){
 const skills=Object.values(SKILLS).filter(s=>s.branch===branch);
 const skill=safeTreeSelection(skills,selected,{run,wallet,canBuy});
 if(!skill)return treeHeader(run,wallet,branch)+'<p class="tree-whisper">Grow a nearby branch to reveal this tree.</p>';
 return treeHeader(run,wallet,branch)+`<div class="tree-body">${treeCanvas({skills,wallet,run,canBuy,selected:skill.id,action:'inspect-branch-skill',key:branch})}<aside class="tree-side"><p class="tree-whisper">${branch==='afterglow'?'Turn surplus light into stronger choices.':'Choose a circle. Grow each rank.'}</p>${treeDetail({run,wallet,skill,canBuy})}</aside></div>`;
}
