import {getCompanionAbility} from './companion-abilities.mjs?v=living-biomes-1';
import {glowText,getGlowCapacity} from './vitality.mjs?v=living-biomes-1';
import {SKILLS,getSkillCost,getSkillLockReason,canChooseStartingSkill,MAIN_WISP_BRANCHES} from './model.mjs?v=living-biomes-1';
import {skillIcon} from './upgrade-icons.mjs?v=living-biomes-1';
import {companionArtSvg} from './companion-art.mjs?v=living-biomes-1';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=s=>s.shortEffect||({'main-sight':'+35 sight','main-efficiency':'−12% cost','main-speed':'+8% pace','main-spare-spark':'+1 heart','main-deep-reserve':'+1 heart','main-bond':'+1 wisp'})[s.id]||s.name;
export function treeHeader(run,wallet,branch){
 const name=id=>id==='main'?'Wisp':id==='afterglow'?'Afterglow':getCompanionAbility(id).name;
 return `<header class="tree-crown"><h2>${branch==='main'?'Main wisp':name(branch)}</h2><span>${Math.floor(wallet.embers)} <small>EMBERS</small></span><button data-action="close-sheet" aria-label="Close skill tree">×</button></header><nav class="tree-tabs" aria-label="Skill trees">${['main',...run.companions,...(wallet.afterglowUnlocked?['afterglow']:[])].map(id=>`<button data-action="tree-branch" data-id="${id}" class="${id===branch?'selected':''}">${id!=='main'&&id!=='afterglow'?companionArtSvg(id):''}<span>${name(id)}</span></button>`).join('')}</nav>`;
}
// Three purchases remain separate skills; only their map marker is shared.
export function radialTreeLayout(skills,{width=560,height=320}={}){
 const groups=new Map(),skillGroup=new Map();
 for(const skill of skills){const id=skill.incrementBase||skill.id;if(!groups.has(id))groups.set(id,{id,skills:[],children:[]});groups.get(id).skills.push(skill);skillGroup.set(skill.id,id);}
 for(const group of groups.values()){group.skills.sort((a,b)=>(a.incrementStage||1)-(b.incrementStage||1));group.parent=skillGroup.get(group.skills[0].requires)||null;if(group.parent===group.id)group.parent=null;}
 const roots=[];for(const group of groups.values()){if(groups.has(group.parent))groups.get(group.parent).children.push(group);else roots.push(group);}
 const leaves=g=>Math.max(1,g.children.reduce((n,c)=>n+leaves(c),0));
 const cx=width/2,cy=height/2,rx=Math.max(50,cx-30),ry=Math.max(50,cy-30),points=new Map();
 const place=(g,start,end,depth)=>{const angle=(start+end)/2,radius=depth===0?0:depth===1?.47:depth===2?.79:.97;
  points.set(g.id,{x:cx+Math.cos(angle)*rx*radius,y:cy+Math.sin(angle)*ry*radius,anchorX:cx+Math.cos(angle)*rx*radius,anchorY:cy+Math.sin(angle)*ry*radius,depth});
  let cursor=start;const total=g.children.reduce((n,c)=>n+Math.sqrt(leaves(c)),0);for(const child of g.children){const stop=cursor+(end-start)*Math.sqrt(leaves(child))/total;place(child,cursor,stop,depth+1);cursor=stop;}
 };
 if(roots.length===1)place(roots[0],-Math.PI,Math.PI,0);else roots.forEach((root,i)=>place(root,-Math.PI+2*Math.PI*i/roots.length,-Math.PI+2*Math.PI*(i+1)/roots.length,1));
 // Layout work happens only when opening/changing a tree, never during flight.
 // Relax crowded sectors while keeping the root fixed and touch targets apart.
 const ids=[...points.keys()],gap=53;
 for(let pass=0;pass<110;pass++){
  for(const id of ids){const p=points.get(id);if(p.depth){p.x+=(p.anchorX-p.x)*.012;p.y+=(p.anchorY-p.y)*.012;}}
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
   const a=points.get(ids[i]),b=points.get(ids[j]);let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=gap)continue;if(d<.01){dx=1;dy=0;d=1;}const shift=(gap-d)*.52,ux=dx/d,uy=dy/d;
   if(a.depth){a.x-=ux*shift*(b.depth?1:2);a.y-=uy*shift*(b.depth?1:2);}if(b.depth){b.x+=ux*shift*(a.depth?1:2);b.y+=uy*shift*(a.depth?1:2);}
  }
  for(const p of points.values()){p.x=Math.max(28,Math.min(width-28,p.x));p.y=Math.max(28,Math.min(height-28,p.y));}
 }
 return {groups:[...groups.values()],points,skillGroup,width,height};
}
function treeViewport(){
 const w=globalThis.innerWidth||globalThis.window?.innerWidth||900,h=globalThis.innerHeight||globalThis.window?.innerHeight||480;
 if(w>h)return{width:Math.max(280,Math.min(w*.96,1100)-28-Math.min(235,w*.26)-14),height:Math.max(180,Math.min(h*.96,650)-116)};
 return {width:Math.max(280,Math.min(w*.96,480)-24),height:Math.max(260,Math.min(h*.43,390))};
}
export function treeCanvas({skills,wallet,selected,action,key,canBuy=true,run=wallet}){
 const {groups,points,skillGroup,width,height}=radialTreeLayout(skills,treeViewport()),ancestry=new Set();
 let ancestor=SKILLS[selected];while(ancestor&&!ancestry.has(ancestor.id)){ancestry.add(ancestor.id);ancestor=SKILLS[ancestor.requires];}
 const freeGift=canChooseStartingSkill(run),isFree=s=>freeGift&&MAIN_WISP_BRANCHES.some(b=>b.root===s.id);
 const ready=s=>isFree(s)||canBuy&&!getSkillLockReason(wallet,s.id)&&getSkillCost(wallet,s.id)!==null&&wallet.embers>=getSkillCost(wallet,s.id);
 const chosen=g=>g.skills.find(s=>s.id===selected)||g.skills.find(s=>!(wallet.skills[s.id]>0))||g.skills.at(-1);
 const inPath=g=>g.skills.some(s=>ancestry.has(s.id));
 const paths=groups.filter(g=>g.parent).map(g=>{const a=points.get(g.parent),b=points.get(g.id),s=chosen(g),dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),ux=dx/d,uy=dy/d;return `<path class="${g.skills.some(s=>wallet.skills[s.id]>0)?'grown':''} ${inPath(g)?'planned':''} ${ready(s)?'available':''}" d="M${a.x+ux*23} ${a.y+uy*23} Q${(a.x+b.x)/2-uy*7} ${(a.y+b.y)/2+ux*7} ${b.x-ux*23} ${b.y-uy*23}"/>`;}).join('');
 return `<div class="living-tree-scroll radial-tree-scroll" data-tree-key="${key}" tabindex="0" aria-label="Radial skill tree. Select a circle to inspect its path and ranks."><div class="living-tree radial-tree" style="--tree-ratio:${width}/${height}"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><ellipse class="tree-orbit" cx="${width/2}" cy="${height/2}" rx="${width*.34}" ry="${height*.34}"/><g class="branch-shadow">${paths}</g><g class="branch-light">${paths}</g></svg>${groups.map(g=>{const s=chosen(g),p=points.get(g.id),owned=g.skills.filter(s=>wallet.skills[s.id]>0).length,locked=getSkillLockReason(wallet,s.id),cost=getSkillCost(wallet,s.id),affordable=ready(s),free=isFree(s),active=skillGroup.get(selected)===g.id,name=s.baseName||s.name;return `<button class="tree-bud radial-bud ${p.depth===0?'root-bud':''} ${owned?'grown':''} ${affordable?'available':''} ${!locked&&!owned&&!affordable?'saving':''} ${inPath(g)?'planned':''} ${locked&&!owned?'dormant':''} ${active?'selected':''} ${s.choiceGroup?'fork-bud':''}" style="left:${p.x/width*100}%;top:${p.y/height*100}%" data-action="${action}" data-id="${s.id}" title="${esc(name)}" aria-label="${esc(name)}${g.skills.length>1?`, ${owned} of ${g.skills.length} ranks learned`:''}: ${owned===g.skills.length?'learned':affordable?'available to learn':locked?esc(locked):`save ${cost} Embers`}" aria-pressed="${active}">${skillIcon(s)}${g.skills.length>1?`<span class="bud-ranks" aria-hidden="true">${g.skills.map((rank,i)=>`<i class="${wallet.skills[rank.id]>0?'filled':''} ${s.id===rank.id?'current':''}"></i>`).join('')}</span>`:''}<span class="bud-effect">${esc(glowText(label(s),getGlowCapacity(wallet)))}</span><small class="bud-price">${owned===g.skills.length?'✦':free?'FREE':cost!==null?cost:s.cost}</small></button>`;}).join('')}</div></div>`;
}
export function treeDetail({run,wallet,skill,canBuy}){
 const owned=(wallet.skills[skill.id]||0)>=skill.maxRank,cost=getSkillCost(wallet,skill.id),reason=getSkillLockReason(wallet,skill.id);
 const track=skill.incrementBase?Object.values(SKILLS).filter(s=>s.incrementBase===skill.incrementBase).sort((a,b)=>a.incrementStage-b.incrementStage):[];
 const free=canChooseStartingSkill(run)&&MAIN_WISP_BRANCHES.some(b=>b.root===skill.id);
 const available=!owned&&(free||canBuy&&!reason&&cost!==null&&wallet.embers>=cost);
 return `<section class="tree-inspector" aria-live="polite"><div class="tree-inspector-title">${skillIcon(skill)}<h3>${esc(skill.baseName||skill.name)}</h3>${skill.incrementStage?`<span class="growth-steps" aria-label="Step ${skill.incrementStage} of 3">${[1,2,3].map(i=>`<i class="${i<=skill.incrementStage?'filled':''}"></i>`).join('')}</span>`:''}</div><p>${esc(glowText(skill.description||skill.consequence,getGlowCapacity(run)))}</p>${track.length?`<nav class="rank-choices" aria-label="Individual skill ranks">${track.map(s=>`<button data-action="inspect-branch-skill" data-id="${s.id}" class="${s.id===skill.id?'selected':''} ${wallet.skills[s.id]>0?'learned':''}" aria-pressed="${s.id===skill.id}" aria-label="${esc(s.name)}${wallet.skills[s.id]>0?', learned':''}">${s.incrementStage}<small>${wallet.skills[s.id]>0?'✓':`${s.cost}E`}</small></button>`).join('')}</nav>`:''}<button class="${available?'primary':'secondary'}" data-action="${free?'choose-start-skill':'buy-skill'}" data-id="${skill.id}" ${available?'':'disabled'}>${owned?'LEARNED':free?'CHOOSE FREE GIFT':reason?esc(reason):!canBuy?'LEARN AFTER A FLIGHT OR AT REST':`GROW · ${cost} EMBERS`}</button></section>`;
}
