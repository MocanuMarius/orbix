import {SKILLS,getRunModifiers} from './model.mjs?v=skills-cards-2';
import {collectorPreferenceMarkup} from './collector-preferences.mjs?v=skills-cards-2';
import {formatLuminance} from './luminance-units.mjs?v=skills-cards-2';
import {WISP_ART} from './companion-art.mjs?v=skills-cards-2';
import {skillTreeState,skillTreeStatus} from './skill-tree-state.mjs?v=skills-cards-2';
import {getCompanionAbility} from './companion-abilities.mjs?v=skills-cards-2';
import {skillIcon} from './upgrade-icons.mjs?v=skills-cards-2';
import {resourceSymbol} from './game-symbols.mjs?v=skills-cards-2';
import {glowText,getGlowCapacity} from './vitality.mjs?v=skills-cards-2';
import {skillBookChapter} from './skill-chapters.mjs?v=skills-cards-2';
export {skillBookChapter} from './skill-chapters.mjs?v=skills-cards-2';

const chapters=[
 ['wisp','Flight','main-efficiency'],['luminance','Luminance','main-sight'],
 ['companion','Companion',null],['proximity','Proximity','proximity-awakening'],
 ['dream','Dream','main-dream'],['packing','Storage','main-afterglow']
];
const chapterIds=chapters.map(([id])=>id);
const chapterNames=new Map(chapters.map(([id,name])=>[id,name]));
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parents=skill=>[skill.requires].flat().filter(Boolean);
const groupId=skill=>skill.treeGroup||skill.id;
const art=skill=>skillIcon(skill);
const money=()=>resourceSymbol('packed');

function perkOrder(a,b){
 return (a.treeStage||1)-(b.treeStage||1)||(a.name||a.id).localeCompare(b.name||b.id);
}
const rankId=(id,rank)=>rank===1?id:id+'@'+rank;
const lockMark=resourceSymbol('lock');
const rankEffects={
 'afterglow-anchor':[
  'On a clear, earn 5% of the Stored Sparks you carried into the flight, rounded down. Earn up to 5. The final guardian pays no interest.',
  'Double your clear dividend to 10% of the Stored Sparks you carried into the flight, rounded down. Earn up to 10. The final guardian pays no interest.'
 ],
 'afterglow-vessel':['Conversion +5 percentage points. Packing limit +5 Stored Sparks.','Conversion +5 more percentage points. Packing limit +5 more Stored Sparks.'],
 'afterglow-retention':['Conversion +5 percentage points. Packing limit +5 Stored Sparks.','Conversion +5 more percentage points. Packing limit +5 more Stored Sparks.']
};
function rankNodes(base){
 return Array.from({length:base.maxRank},(_,i)=>{
  const rank=i+1,stage=(base.treeStage||1)+i;
  const name=base.maxRank===1?base.name:(base.treeName||base.name)+' '+stage;
  return {...base,id:rankId(base.id,rank),baseId:base.id,rank,treeStage:stage,name,
   description:rankEffects[base.id]?.[i]||base.description,
   requires:i?rankId(base.id,i):base.requires};
 });
}
function rankView(skill,context){
 const view=skillTreeState(context,skill.baseId);
 if(skill.rank<=view.rank)return {...view,complete:true,available:false,free:false,state:'learned',inspectable:true,disclosure:'full'};
 if(skill.rank===view.rank+1)return view;
 const distance=view.distance+skill.rank-view.rank-1;
 const inspectable=!view.closedBy&&distance<=2;
 return {...view,distance,free:false,complete:false,available:false,price:null,inspectable,
  disclosure:inspectable?'preview':'hidden',state:inspectable?'preview':view.closedBy?'excluded':'distant'};
}
function notice(view){
 if(view.complete)return '✓ Owned';
 if(view.available)return 'Can learn · '+(view.free?'Free':money()+' '+view.price);
 if(view.closedBy)return '× Other path';
 if(view.state==='saving')return 'Save '+view.shortfall+' more';
 if(view.state==='locked'&&!view.reason)return 'Unavailable here';
 return lockMark+' Needs prerequisite';
}
function perkButton(skill,view,selected){
 return '<button type="button" class="book-perk '+view.state+'" data-action="book-skill" data-id="'+skill.id+'" aria-pressed="'+(skill.id===selected)+'" aria-label="'+escape(skill.name+', '+skillTreeStatus(view))+'">'+art(skill)+'<span class="book-perk-copy"><strong>'+escape(skill.name)+'</strong><span>'+notice(view)+'</span></span></button>';
}
function chapterMap(skills,views,selected){
 const local=new Set(skills.map(s=>s.id)),branches=new Map();
 for(const s of skills){
  const parent=parents(s).find(id=>local.has(id))||null;
  if(!branches.has(parent))branches.set(parent,[]);
  branches.get(parent).push(s);
 }
 function branch(skill){
  const view=views.get(skill.id);
  if(!view.inspectable)return '<li class="book-secret" aria-label="'+(view.closedBy?'Other path chosen':'Further upgrades')+'"><span>'+(view.closedBy?'×':'···')+'</span></li>';
  const children=branches.get(skill.id);
  return '<li>'+perkButton(skill,view,selected)+(children?'<ul>'+children.sort(perkOrder).map(branch).join('')+'</ul>':'')+'</li>';
 }
 return '<ul class="book-trails">'+(branches.get(null)||[]).sort(perkOrder).map(branch).join('')+'</ul>';
}
export function luminancePreview(run,skill){
 const before=getRunModifiers(run).lightRadius;
 if(!skill||Number(run.skills?.[skill.baseId||skill.id])>=(skill.rank||1))return{before,after:before,prerequisites:false};
 const skills={...run.skills},seen=new Set();let prerequisites=false;
 const add=id=>{
  if(!id||seen.has(id)||skills[id])return;
  const s=SKILLS[id];if(!s)return;seen.add(id);
  for(const parent of parents(s))add(parent);
  if(id!==(skill.baseId||skill.id))prerequisites=true;
  skills[id]=id===(skill.baseId||skill.id)?skill.rank||1:1;
 };
 add(skill.baseId||skill.id);
 return{before,after:getRunModifiers({...run,skills}).lightRadius,prerequisites};
}
function reachComparison(run,skill){
 const{before,after,prerequisites}=luminancePreview(run,skill);if(after<=before)return '';
 const oldR=(30*before/after).toFixed(2),bodyR=(30*WISP_ART.worldRadius/after).toFixed(2);
 return '<div class="book-reach-preview" aria-label="Luminance radius: '+formatLuminance(before)+' now, '+formatLuminance(after)+(prerequisites?' after the prerequisite path':' after this skill')+'">'+
  '<svg viewBox="0 0 150 76" aria-hidden="true" shape-rendering="crispEdges"><circle cx="75" cy="38" r="30" fill="#c3a46024" stroke="#8b6c36"/><circle cx="75" cy="38" r="'+oldR+'" fill="#5c8c6a44" stroke="#42694f"/><circle cx="75" cy="38" r="'+bodyR+'" fill="#fffceb" stroke="#70816a"/></svg>'+
  '<b>'+formatLuminance(before).replace(' wisp widths','')+' <i>→</i> '+formatLuminance(after)+'</b>'+(prerequisites?'<small>Including prerequisites</small>':'')+'</div>';
}
function skillInspector(skill,views,entries,chapterTitle,run){
 if(!skill)return '<aside class="book-inspector empty"><p>Explore a chapter to see its upgrades.</p></aside>';
 const view=views.get(skill.id),req=parents(skill),unlocks=(skill.excludes||[]).map(id=>SKILLS[id]?.name).filter(Boolean);
 const path=!view.free&&req.length?'<div class="book-condition book-requires">Requires '+req.map(id=>{
  const parent=entries.get(id),owned=views.get(id)?.complete;
  if(!parent)return '';
  const otherChapter=skillBookChapter(parent)!==skillBookChapter(skill);
  const mark=owned?'✓':lockMark;
  const state=owned?'Learned':'Locked';
  const label='<span aria-label="'+state+'">'+mark+'</span> '+escape(parent.name);
  if(otherChapter){
   const parentView=views.get(id),from=chapterNames.get(skillBookChapter(parent));
   let action='';
   if(!owned&&parentView?.available){
    const purchase=parentView.free?'choose-start-skill':'buy-skill';
    const cost=parentView.free?'Free':money()+' '+parentView.price;
    action='<button type="button" class="book-buy-inline" data-action="'+purchase+'" data-id="'+parent.baseId+'" data-rank="'+parent.rank+'">Learn '+escape(parent.name)+' <span>'+cost+'</span></button>';
   }else if(!owned&&parentView)action='<p class="book-requirement-status">'+escape(skillTreeStatus(parentView))+'</p>';
   return '<details class="book-inline-requirement"><summary>'+label+' <small>· '+escape(from)+'</small></summary><p>'+escape(glowText(parent.description||parent.consequence,getGlowCapacity(run)))+'</p>'+action+'</details>';
  }
  return views.get(id)?.inspectable?'<button type="button" class="book-link" data-action="book-skill" data-chapter="'+skillBookChapter(parent)+'" data-id="'+id+'">'+label+'</button>':label;
 }).join(' + ')+'</div>':'';
 const fork=unlocks.length&&!view.complete&&!view.closedBy?'<p class="book-condition">Closes '+unlocks.map(escape).join(' / ')+'</p>':'';
 const price=view.free?'Free':view.price===null?'':money()+' '+view.price;
 const purchase=view.available?'<button class="book-buy" type="button" data-action="'+(view.free?'choose-start-skill':'buy-skill')+'" data-id="'+skill.baseId+'" data-rank="'+skill.rank+'">Learn <span>'+price+'</span></button>':'<p class="book-status '+view.state+'">'+escape(skillTreeStatus(view))+'</p>';
 return '<aside class="book-inspector" aria-live="polite"><div class="book-inspector-scroll"><span class="book-kicker">'+escape(chapterTitle)+'</span><div class="book-title">'+art(skill)+'<h3>'+escape(skill.name)+'</h3></div>' +reachComparison(run,skill)+'<p class="book-effect">'+escape(glowText(skill.description||skill.consequence,getGlowCapacity(run)))+'</p>'+path+fork+'</div>'+purchase+'</aside>';
}
export function skillBookMarkup({run,wallet,canBuy=true,variant='map',chapter,selected=null}){
 variant=variant==='index'?'index':'map';
 chapter=chapter|| (variant==='index'?'available':'wisp');
 if(chapter!=='available'&&!chapterIds.includes(chapter))chapter='wisp';
 const role=getCompanionAbility(run.companions?.[0]||run.companionRole);
 const skills=Object.values(SKILLS).filter(s=>!s.retired&&(s.treeTab!=='companion'||s.branch===role.id)).flatMap(rankNodes);
 const entries=new Map(skills.map(s=>[s.id,s])),views=new Map(skills.map(s=>[s.id,rankView(s,{wallet,run,canBuy})]));
 const available=skills.filter(s=>views.get(s.id).available);
 const title=id=>id==='companion'?role.name:id==='available'?'Can learn':chapters.find(c=>c[0]===id)[1];
 const scope=chapter==='available'?available:skills.filter(s=>skillBookChapter(s)===chapter);
 const focus=scope.find(s=>s.id===selected&&views.get(s.id).inspectable)||scope.find(s=>views.get(s.id).available)||scope.find(s=>views.get(s.id).inspectable);
 const titleBar='<header class="book-header"><h2>Skills</h2><div class="book-switch" aria-label="Skill book view">'+[['map','Chapter map'],['index','Upgrade index']].map(([id,name])=>'<button type="button" data-action="book-variant" data-id="'+id+'" aria-pressed="'+(variant===id)+'">'+name+'</button>').join('')+'</div><span class="book-wallet" aria-label="'+Math.floor(wallet.condensedGlow||0)+' Stored Sparks">'+money()+' '+Math.floor(wallet.condensedGlow||0)+'</span><button type="button" class="book-close" data-action="close-sheet" aria-label="Close Skills">×</button></header>';
 const side='<nav class="book-chapters" aria-label="Skill chapters">'+[['available','Can learn',null],...chapters].map(([id,name,icon])=>{
  const count=available.filter(s=>id==='available'||skillBookChapter(s)===id).length,symbol=id==='available'?'<b class="book-plus" aria-hidden="true">+</b>':art(SKILLS[icon||role.id+'-attunement']);
  return '<button type="button" data-action="book-chapter" data-id="'+id+'" aria-pressed="'+(chapter===id)+'">'+symbol+'<span>'+escape(title(id))+'</span>'+(count?'<small aria-label="'+count+' available">'+count+'</small>':'')+'</button>';
 }).join('')+'</nav>';
 let content='';
 if(chapter==='available'){
  for(const id of chapterIds){
   const subset=available.filter(s=>skillBookChapter(s)===id).sort(perkOrder);
   if(subset.length)content+='<section class="book-group"><h4>'+escape(title(id))+'</h4><div class="book-grid">'+subset.map(s=>perkButton(s,views.get(s.id),focus?.id)).join('')+'</div></section>';
  }
  if(!available.length)content='<p class="book-empty">No upgrades in reach yet. Open a chapter to see the next cost or prerequisite.</p>';
 }else if(variant==='map')content=chapterMap(scope,views,focus?.id);
 else {
  const inspectable=scope.filter(s=>views.get(s.id).inspectable).sort(perkOrder);
  for(const [label,pick] of [['Can learn',v=>v.available],['Owned',v=>v.complete],['Prepare',v=>!v.available&&!v.complete]]){
   const subset=inspectable.filter(s=>pick(views.get(s.id)));
   if(subset.length)content+='<section class="book-group"><h4>'+label+'</h4><div class="book-grid">'+subset.map(s=>perkButton(s,views.get(s.id),focus?.id)).join('')+'</div></section>';
  }
  if(scope.some(s=>views.get(s.id).closedBy))content+='<p class="book-condition">× Alternate path closed</p>';
 }
 const reach=chapter==='luminance'?'<div class="book-current-reach"><span>Base Luminance radius</span><b>'+formatLuminance(getRunModifiers(run).lightRadius)+'</b><small>From your centre. Outer light gradually fades.</small></div>':'';
 return '<section class="skill-book" aria-label="Skills" data-variant="'+variant+'" data-chapter="'+chapter+'">'+titleBar+'<div class="book-spread">'+side+'<section class="book-page" aria-label="'+escape(title(chapter))+'"><h3>'+escape(title(chapter))+'</h3>'+reach+(chapter==='companion'?collectorPreferenceMarkup(run):'')+'<div class="book-page-scroll" data-tree-key="'+variant+'-'+chapter+'">'+content+'</div></section>'+skillInspector(focus,views,entries,focus?title(skillBookChapter(focus)):'',run)+'</div></section>';
}
