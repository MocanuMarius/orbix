import {resourceSymbol} from './game-symbols.mjs?v=upgrade-wallet-1';
import {getCompanionAbility} from './companion-abilities.mjs?v=upgrade-wallet-1';
import {glowText,getGlowCapacity} from './vitality.mjs?v=upgrade-wallet-1';
import {SKILLS} from './model.mjs?v=upgrade-wallet-1';
import {skillIcon} from './upgrade-icons.mjs?v=upgrade-wallet-1';
import {companionArtSvg} from './companion-art.mjs?v=upgrade-wallet-1';
import {skillTreeState,safeTreeSelection,skillTreeStatus} from './skill-tree-state.mjs?v=upgrade-wallet-1';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lockIcon='<svg class="bud-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="6" y="10" width="12" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>';
const stateKey=`<div class="tree-state-key" aria-label="Skill states"><span class="learned"><i aria-hidden="true">✓</i> Owned</span><span class="available"><i aria-hidden="true">+</i> Can learn</span><span class="saving"><i aria-hidden="true"></i> Need light</span><span class="locked"><i aria-hidden="true">${lockIcon}</i> Locked</span></div>`;
export function treeHeader(run,wallet,branch){
 const name=id=>id==='main'?'Wisp':id==='afterglow'?'Condensation':getCompanionAbility(id).name;
 return `<header class="tree-crown"><h2>${branch==='main'?'Main wisp':name(branch)}</h2><span aria-label="${Math.floor(wallet.condensedGlow||0)} Packed Sparks">${resourceSymbol('packed')} ${Math.floor(wallet.condensedGlow||0)}</span><button data-action="close-sheet" aria-label="Close skill tree">×</button></header><nav class="tree-tabs" aria-label="Skill trees">${['main',...run.companions,...(wallet.testMode||wallet.skills?.['main-afterglow']?['afterglow']:[])].map(id=>`<button data-action="tree-branch" data-id="${id}" class="${id===branch?'selected':''}">${id!=='main'&&id!=='afterglow'?companionArtSvg(id):''}<span>${name(id)}</span></button>`).join('')}</nav>${stateKey}`;
}
// Three purchases remain separate skills; only their map marker is shared.
export function radialTreeLayout(skills,{width=560,height=320,sizes=new Map()}={}){
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
 const ids=[...points.keys()];
 for(let pass=0;pass<180;pass++){
  for(const id of ids){const p=points.get(id);if(p.depth&&pass<120){p.x+=(p.anchorX-p.x)*.008;p.y+=(p.anchorY-p.y)*.008;}}
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
   const a=points.get(ids[i]),b=points.get(ids[j]),gap=((sizes.get(ids[i])??44)+(sizes.get(ids[j])??44))/2+9;
   const dx=b.x-a.x,dy=b.y-a.y,overX=gap-Math.abs(dx),overY=gap-Math.abs(dy);if(overX<=0||overY<=0)continue;
   // Browser hit areas are squares even when the visible bud is circular.
   const horizontal=overX<overY,shift=(horizontal?overX:overY)*.52,ux=horizontal?(Math.sign(dx)||1):0,uy=horizontal?0:(Math.sign(dy)||1);
   if(a.depth){a.x-=ux*shift*(b.depth?1:2);a.y-=uy*shift*(b.depth?1:2);}if(b.depth){b.x+=ux*shift*(a.depth?1:2);b.y+=uy*shift*(a.depth?1:2);}
  }
  for(const p of points.values()){p.x=Math.max(28,Math.min(width-28,p.x));p.y=Math.max(28,Math.min(height-28,p.y));}
 }
 // Dense sectors can become pinned between the fixed root and the edge.
 // A nearest-anchor packing fallback guarantees separate touch rectangles.
 // Grow only the diagram when necessary; the inspector and purchase stay put.
 const collides=(a,b,gap)=>Math.abs(a.x-b.x)<gap-.25&&Math.abs(a.y-b.y)<gap-.25;
 const crowded=ids.some((id,i)=>ids.slice(i+1).some(other=>collides(points.get(id),points.get(other),((sizes.get(id)??44)+(sizes.get(other)??44))/2+6)));
 if(crowded){
  const pitch=56,cols=Math.max(1,Math.floor((width-56)/pitch)+1),rows=Math.ceil(ids.length/cols),oldHeight=height;
  height=Math.max(height,56+(rows-1)*pitch);
  const candidates=[],used=new Set(),countRows=Math.max(rows,Math.floor((height-56)/pitch)+1);
  for(let row=0;row<countRows;row++)for(let col=0;col<cols;col++)candidates.push({x:(width-(cols-1)*pitch)/2+col*pitch,y:(height-(countRows-1)*pitch)/2+row*pitch});
  for(const id of [...ids].sort((a,b)=>points.get(a).depth-points.get(b).depth)){
   const point=points.get(id);let best=-1,distance=Infinity;
   candidates.forEach((candidate,index)=>{const d=(candidate.x-point.anchorX)**2+(candidate.y-point.anchorY*height/oldHeight)**2;if(!used.has(index)&&d<distance){best=index;distance=d;}});
   used.add(best);Object.assign(point,candidates[best]);
  }
 }
 return {groups:[...groups.values()],points,skillGroup,width,height};
}
function treeViewport(){
 const pane=globalThis.document?.querySelector?.('dialog.tree-sheet[open] .radial-tree-scroll');
 if(pane?.clientWidth>0&&pane?.clientHeight>0)return{width:pane.clientWidth,height:pane.clientHeight};
 const w=globalThis.innerWidth||globalThis.window?.innerWidth||900,h=globalThis.innerHeight||globalThis.window?.innerHeight||480;
 if(w>h)return{width:Math.max(280,Math.min(w*.96,1100)-28-Math.min(250,w*.29)-14),height:Math.max(180,Math.min(h*.96,650)-140)};
 return {width:Math.max(280,Math.min(w*.96,480)-24),height:Math.max(260,Math.min(h*.43,390))};
}
export function treeCanvas({skills,wallet,selected,action,key,canBuy=true,run=wallet}){
 const context={wallet,run,canBuy};selected=safeTreeSelection(skills,selected,context)?.id;
 const views=new Map(skills.map(skill=>[skill.id,skillTreeState(context,skill)]));
 const sizes=new Map();for(const skill of skills){const key=skill.incrementBase||skill.id;sizes.set(key,Math.max(sizes.get(key)||0,views.get(skill.id).inspectable?44:8));}
 const {groups,points,skillGroup,width,height}=radialTreeLayout(skills,{...treeViewport(),sizes});
 const chosen=g=>g.skills.find(skill=>!views.get(skill.id).complete)||g.skills.at(-1);
 const ownedRanks=g=>g.skills.reduce((n,rank)=>n+Number(wallet.skills?.[rank.id]||0),0);
 const groupById=new Map(groups.map(g=>[g.id,g])),radius=g=>{const view=views.get(chosen(g).id);return view.closedBy===chosen(g).id?11:view.disclosure==='hidden'?3:view.disclosure==='preview'?14:23;};
 const paths=groups.filter(g=>g.parent).map(g=>{const a=points.get(g.parent),b=points.get(g.id),view=views.get(chosen(g).id),dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),ux=dx/d,uy=dy/d,start=radius(groupById.get(g.parent)),end=radius(g);return `<path class="tree-path ${view.state} ${ownedRanks(g)>0?'has-owned':''}" d="M${a.x+ux*start} ${a.y+uy*start} Q${(a.x+b.x)/2-uy*7} ${(a.y+b.y)/2+ux*7} ${b.x-ux*end} ${b.y-uy*end}"/>`;}).join('');
 return `<div class="living-tree-scroll radial-tree-scroll" data-tree-key="${esc(key)}" tabindex="0" aria-label="Skill tree. Blue checks are owned. Gold plus signs can be learned. Bronze prices need more Packed Sparks. Locks preview nearby paths; faint dots reveal as you grow."><div class="living-tree radial-tree" style="--tree-ratio:${width}/${height};min-height:${height}px"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><ellipse class="tree-orbit" cx="${width/2}" cy="${height/2}" rx="${width*.34}" ry="${height*.34}"/><g class="branch-shadow">${paths}</g><g class="branch-light">${paths}</g></svg>${groups.map(g=>{
  const s=chosen(g),p=points.get(g.id),view=views.get(s.id),active=skillGroup.get(selected)===g.id,name=s.baseName||s.name,position=`left:${p.x/width*100}%;top:${p.y/height*100}%`;
  if(!view.inspectable)return `<span class="tree-silhouette ${view.state} ${view.closedBy===s.id?'closed-root':''}" style="${position}" aria-hidden="true">${view.closedBy===s.id?lockIcon:''}</span>`;
  const preview=view.disclosure==='preview',owned=ownedRanks(g),total=g.skills.reduce((n,rank)=>n+rank.maxRank,0);
  const status=skillTreeStatus(view),accessibleName=preview&&!active?'Future skill':name;
  return `<button class="tree-bud radial-bud ${view.state} ${owned>0?'has-owned':''} ${active?'selected':''} ${s.choiceGroup?'fork-bud':''}" style="${position}" data-action="${action}" data-id="${s.id}" data-tree-state="${view.state}" data-owned-ranks="${owned}" ${preview?'':`title="${esc(name)}"`} aria-label="${esc(accessibleName)}${!preview&&total>1?`, ${owned} of ${total} ranks learned`:''}: ${esc(status)}" aria-pressed="${active}">${preview?lockIcon:skillIcon(s)}${!preview&&total>1?`<span class="bud-ranks" aria-hidden="true">${Array.from({length:total},(_,i)=>`<i class="${i<owned?'filled':''}"></i>`).join('')}</span>`:''}${owned>0&&!view.complete?`<span class="bud-owned" aria-hidden="true">✓ ${owned}/${total}</span>`:''}${!preview&&(view.state==='locked'||view.available)?`<span class="bud-state-mark" aria-hidden="true">${view.available?'+':lockIcon}</span>`:''}${!preview?`<small class="bud-price">${view.complete?'✓':view.free?'FREE':view.price??''}</small>`:''}</button>`;
 }).join('')}</div></div>`;
}
export function treeDetail({run,wallet,skill,canBuy}){
 const context={run,wallet,canBuy};skill=safeTreeSelection(Object.values(SKILLS).filter(s=>s.branch===skill?.branch),skill,context);
 if(!skill)return '<section class="tree-inspector"><p>Follow a nearby branch to reveal more skills.</p></section>';
 const view=skillTreeState(context,skill),preview=view.disclosure==='preview';
 const track=!preview&&skill.incrementBase?Object.values(SKILLS).filter(s=>s.incrementBase===skill.incrementBase&&skillTreeState(context,s).inspectable).sort((a,b)=>a.incrementStage-b.incrementStage):[];
 const status=`<p class="tree-selection-status ${view.state}">${esc(skillTreeStatus(view))}</p>`;
 if(preview)return `<section class="tree-inspector preview-inspector" aria-live="polite"><div class="tree-inspector-title">${lockIcon}<h3>${esc(skill.baseName||skill.name)}</h3></div>${status}</section>`;
 const ranks=track.length?`<nav class="rank-choices" aria-label="Individual skill ranks">${track.map(s=>{const rankView=skillTreeState(context,s);if(rankView.disclosure==='preview')return `<span class="future-rank" aria-label="Future rank">${s.incrementStage}<small aria-hidden="true">${lockIcon}</small></span>`;return `<button data-action="inspect-branch-skill" data-id="${s.id}" class="${s.id===skill.id?'selected':''} ${rankView.state}" aria-pressed="${s.id===skill.id}" aria-label="${esc(s.name)}: ${esc(skillTreeStatus(rankView))}">${s.incrementStage}<small>${rankView.complete?'✓':`${rankView.price}PL`}</small></button>`;}).join('')}</nav>`:'';
 return `<section class="tree-inspector" aria-live="polite"><div class="tree-inspector-title">${skillIcon(skill)}<h3>${esc(skill.baseName||skill.name)}</h3></div><p>${esc(glowText(skill.description||skill.consequence,getGlowCapacity(run)))}</p>${ranks}${status}<button class="skill-purchase ${view.state} ${view.available?'primary':'secondary'}" data-action="${view.free?'choose-start-skill':'buy-skill'}" data-id="${skill.id}" ${view.available?'':'disabled'}>${view.complete?'✓ OWNED':view.free?'CHOOSE FREE GIFT':`${view.available?'+ LEARN':view.state==='saving'?'SAVE FOR':'LOCKED'} · ${view.price} ${resourceSymbol('packed')}`}</button></section>`;
}
