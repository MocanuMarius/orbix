import {glowText,getGlowCapacity} from './vitality.mjs?v=drift-sense-1';
import {SKILLS,getSkillCost,getSkillLockReason,canChooseStartingSkill,MAIN_WISP_BRANCHES} from './model.mjs?v=drift-sense-1';
import {skillIcon} from './upgrade-icons.mjs?v=drift-sense-1';
import {companionArtSvg} from './companion-art.mjs?v=drift-sense-1';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=s=>s.shortEffect||({'main-sight':'+35 sight','main-efficiency':'−7% cost','main-speed':'+5% pace','main-spare-spark':'+1 heart','main-deep-reserve':'+1 heart','main-bond':'+1 wisp'})[s.id]||s.name;
export function treeHeader(run,wallet,branch){
 const name=id=>id==='main'?'Wisp':id==='afterglow'?'Afterglow':id[0].toUpperCase()+id.slice(1);
 return `<header class="tree-crown"><h2>${branch==='main'?'Main wisp':name(branch)}</h2><span>${Math.floor(wallet.embers)} <small>EMBERS</small></span><button data-action="close-sheet" aria-label="Close skill tree">×</button></header><nav class="tree-tabs" aria-label="Skill trees">${['main',...run.companions,...(wallet.afterglowUnlocked?['afterglow']:[])].map(id=>`<button data-action="tree-branch" data-id="${id}" class="${id===branch?'selected':''}">${id!=='main'&&id!=='afterglow'?companionArtSvg(id):''}<span>${name(id)}</span></button>`).join('')}</nav>`;
}
export function treeCanvas({skills,wallet,selected,action,key}){
 const byId=new Map(skills.map(s=>[s.id,s])),children=new Map(skills.map(s=>[s.id,[]]));
 const roots=[];for(const s of skills){if(byId.has(s.requires))children.get(s.requires).push(s);else roots.push(s);}
 const weight=s=>Math.max(1,children.get(s.id).reduce((sum,c)=>sum+weight(c),0));
 const total=roots.reduce((sum,s)=>sum+weight(s),0),width=Math.max(288,total*60),points=new Map();let maxDepth=0;
 function place(s,left,right,depth){const kids=children.get(s.id);maxDepth=Math.max(maxDepth,depth);let cursor=left;for(const c of kids){const end=cursor+(right-left)*weight(c)/weight(s);place(c,cursor,end,depth+1);cursor=end;}const x=kids.length?(points.get(kids[0].id).x+points.get(kids.at(-1).id).x)/2:(left+right)/2;points.set(s.id,{x,y:44+depth*80});}
 let cursor=0;for(const root of roots){const end=cursor+width*weight(root)/total;place(root,cursor,end,0);cursor=end;}
 const height=100+maxDepth*80;
 const paths=skills.filter(s=>byId.has(s.requires)).map(s=>{const a=points.get(s.requires),b=points.get(s.id),learned=wallet.skills[s.id]>0;return `<path class="${learned?'grown':''}" d="M${a.x} ${a.y+18} C${a.x} ${a.y+55} ${b.x} ${b.y-49} ${b.x} ${b.y-21}"/>`;}).join('');
 return `<div class="living-tree-scroll" data-tree-key="${key}" tabindex="0" aria-label="Branching skill tree. Scroll to explore."><div class="living-tree" style="width:${width}px;height:${height}px"><svg viewBox="0 0 ${width} ${height}" aria-hidden="true"><g class="branch-shadow">${paths}</g><g class="branch-light">${paths}</g></svg>${skills.map(s=>{const p=points.get(s.id),owned=wallet.skills[s.id]||0,locked=getSkillLockReason(wallet,s.id),cost=getSkillCost(wallet,s.id);return `<button class="tree-bud ${owned?'grown':''} ${locked&&!owned?'dormant':''} ${selected===s.id?'selected':''} ${s.choiceGroup?'fork-bud':''}" style="left:${p.x}px;top:${p.y}px" data-action="${action}" data-id="${s.id}" aria-label="Inspect ${esc(s.name)}" aria-pressed="${selected===s.id}">${skillIcon(s)}<span class="bud-effect">${esc(glowText(label(s),getGlowCapacity(wallet)))}</span><small class="bud-price">${owned?'✦':cost!==null?cost:s.cost}</small></button>`;}).join('')}</div></div>`;
}
export function treeDetail({run,wallet,skill,canBuy}){
 const owned=(wallet.skills[skill.id]||0)>=skill.maxRank,cost=getSkillCost(wallet,skill.id),reason=getSkillLockReason(wallet,skill.id);
 const free=canChooseStartingSkill(run)&&MAIN_WISP_BRANCHES.some(b=>b.root===skill.id);
 const available=!owned&&(free||canBuy&&!reason&&cost!==null&&wallet.embers>=cost);
 return `<section class="tree-inspector" aria-live="polite"><div class="tree-inspector-title">${skillIcon(skill)}<h3>${esc(skill.baseName||skill.name)}</h3>${skill.incrementStage?`<span class="growth-steps" aria-label="Step ${skill.incrementStage} of 3">${[1,2,3].map(i=>`<i class="${i<=skill.incrementStage?'filled':''}"></i>`).join('')}</span>`:''}</div><p>${esc(glowText(skill.description||skill.consequence,getGlowCapacity(run)))}</p><button class="${available?'primary':'secondary'}" data-action="${free?'choose-start-skill':'buy-skill'}" data-id="${skill.id}" ${available?'':'disabled'}>${owned?'LEARNED':free?'CHOOSE FREE GIFT':reason?esc(reason):!canBuy?'LEARN AT A REST':`GROW · ${cost} EMBERS`}</button></section>`;
}
