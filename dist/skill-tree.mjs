import {SKILLS} from './model.mjs?v=three-trees-balance-1';
import {treeHeader,treeCanvas,treeDetail} from './living-tree.mjs?v=three-trees-balance-1';
import {safeTreeSelection} from './skill-tree-state.mjs?v=three-trees-balance-1';
export function branchTreeMarkup({run,wallet,branch,canBuy,selected}){
 const skills=Object.values(SKILLS).filter(s=>!s.retired&&s.treeTab===branch&&(branch!=='companion'||s.branch===run.companions[0]));
 const skill=safeTreeSelection(skills,selected,{run,wallet,canBuy});
 if(!skill)return treeHeader(run,wallet,branch)+'<p class="tree-whisper">Grow a nearby branch to reveal this tree.</p>';
 return treeHeader(run,wallet,branch)+`<div class="tree-body">${treeCanvas({skills,wallet,run,canBuy,selected:skill.id,action:'inspect-branch-skill',key:branch})}<aside class="tree-side"><p class="tree-whisper">${branch==='mystic'?'Dream, risk or invest.':branch==='companion'?'Specialize your chosen companion.':'Choose a circle. Each rank is one purchase.'}</p>${treeDetail({run,wallet,skill,canBuy})}</aside></div>`;
}
