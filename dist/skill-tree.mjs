import {SKILLS,getSkillCost,getSkillLockReason,isSkillRevealed} from './model.mjs?v=balance-health-1';
import {skillIcon} from './upgrade-icons.mjs?v=balance-health-1';
import {companionArtSvg} from './companion-art.mjs?v=balance-health-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function branchTreeMarkup({run,wallet,branch,canBuy,selected}){
 const skills=Object.values(SKILLS).filter(s=>s.branch===branch),byId=new Map(skills.map(s=>[s.id,s]));
 const parents=s=>(Array.isArray(s.requires)?s.requires:s.requires?[s.requires]:[]).filter(id=>byId.has(id));
 const depth=s=>parents(s).length?1+Math.max(...parents(s).map(id=>depth(byId.get(id)))):0;
 const visible=skills.filter(s=>wallet.testMode||!s.expansion||isSkillRevealed(wallet,s.id)||parents(s).some(id=>isSkillRevealed(wallet,id)));
 const rows=[];for(const s of visible)(rows[depth(s)]??=[]).push(s);
 const width=Math.max(330,...rows.map(row=>row.length*108));
 const points=new Map();rows.forEach((row,d)=>row.forEach((s,i)=>points.set(s.id,{x:width*(i+.5)/row.length,y:48+d*112})));
 const height=rows.length*112,skill=byId.get(selected)||skills.find(s=>!parents(s).length)||skills[0],rank=wallet.skills[skill.id]||0,cost=getSkillCost(wallet,skill.id),reason=getSkillLockReason(wallet,skill.id);
 const learned=rank>=skill.maxRank,available=canBuy&&!reason&&cost!==null&&wallet.embers>=cost;
 const branches=['main',...run.companions,...(wallet.afterglowUnlocked?['afterglow']:[])];
 const name=id=>id==='main'?'Main wisp':id[0].toUpperCase()+id.slice(1);
 const lines=visible.flatMap(s=>parents(s).map(id=>{const p=points.get(id),q=points.get(s.id);return `<path class="${wallet.skills[s.id]?'lit':''}" d="M${p.x} ${p.y+31} V${q.y-54} H${q.x} V${q.y-33}"/>`;})).join('');
 return `<div class="tree-heading"><h2>${name(branch)}</h2><span class="ember-wallet">${Math.floor(wallet.embers)} EMBERS</span></div><div class="tree-tabs">${branches.map(id=>`<button data-action="tree-branch" data-id="${id}" class="${id===branch?'selected':''}">${id==='main'?'':companionArtSvg(id)}<span>${name(id)}</span></button>`).join('')}</div><p class="wisp-tree-hint">${canBuy?'Follow the light. Grow your run.':'Inspect your paths · learn at a Rest'}</p><div class="skill-tree-pan"><div class="connected-skill-tree" style="width:${width}px;height:${height}px"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${visible.map(s=>{const p=points.get(s.id),owned=wallet.skills[s.id]||0,locked=getSkillLockReason(wallet,s.id);return `<button style="left:${p.x/width*100}%;top:${p.y}px" class="skill-orbit-node ${owned?'learned':''} ${s.id===skill.id?'inspected':''} ${locked&&!owned?'sealed':''}" data-action="inspect-branch-skill" data-id="${s.id}" aria-label="Inspect ${esc(s.name)}" aria-pressed="${s.id===skill.id}">${skillIcon(s)}<span>${esc(s.name)}</span><small>${owned?`${owned}/${s.maxRank}`:s.choiceGroup?'FORK':getSkillCost(wallet,s.id)??'LOCKED'}</small></button>`;}).join('')}</div></div>${width>330?'<p class="wisp-tree-hint">Swipe the branches to explore</p>':''}<section class="wisp-node-detail"><div>${skillIcon(skill)}<h3>${esc(skill.name)}</h3></div><p>${esc(skill.consequence||skill.description)}</p>${skill.choiceGroup?'<small>Choose one fork for this run.</small>':''}<button class="${available?'primary':'secondary'}" data-action="buy-skill" data-id="${skill.id}" ${available?'':'disabled'}>${learned?'LEARNED':reason?esc(reason):!canBuy?'LEARN AT A REST':`LEARN · ${cost} EMBERS`}</button></section><button class="primary" data-action="close-sheet">Done</button>`;
}
