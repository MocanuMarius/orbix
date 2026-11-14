import {SKILLS} from './model.mjs?v=lantern-chapter-1';
import {skillTreeState,skillTreeStatus} from './skill-tree-state.mjs?v=lantern-chapter-1';
import {getCompanionAbility} from './companion-abilities.mjs?v=lantern-chapter-1';
import {skillIcon} from './upgrade-icons.mjs?v=lantern-chapter-1';
import {resourceSymbol} from './game-symbols.mjs?v=lantern-chapter-1';
import {glowText,getGlowCapacity} from './vitality.mjs?v=lantern-chapter-1';

const chapters=[
 ['wisp','Flight','main-efficiency'],['luminance','Luminance','main-sight'],
 ['companion','Companion',null],['proximity','Proximity','proximity-awakening'],
 ['dream','Dream','main-dream'],['packing','Storage','main-afterglow']
];
const chapterIds=chapters.map(([id])=>id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parents=skill=>[skill.requires].flat().filter(Boolean);
const groupId=skill=>skill.treeGroup||skill.id;
const art=skill=>skillIcon(skill);
const money=()=>resourceSymbol('packed');

export function skillBookChapter(skill){
 if(skill.treeTab==='companion')return 'companion';
 if(skill.branch==='proximity')return 'proximity';
 if(skill.branch==='afterglow'||skill.id==='main-afterglow')return 'packing';
 if(skill.treeGroup==='main-dream')return 'dream';
 if(['main-sight','main-glow-sense','main-long-flash'].includes(groupId(skill)))return 'luminance';
 return 'wisp';
}
function perkOrder(a,b){
 return (a.treeStage||1)-(b.treeStage||1)||(a.name||a.id).localeCompare(b.name||b.id);
}
function notice(view){
 if(view.complete)return '✓ Owned';
 if(view.free&&view.available)return '✦ Free';
 if(view.available)return money()+' '+view.price;
 if(view.closedBy)return '× Other path';
 if(view.disclosure==='preview')return '◇ Later';
 if(view.state==='saving')return money()+' '+view.price+' · Save';
 return '◇ Locked';
}
function perkButton(skill,view,selected,{track=false,numRanks=0,owned=0}={}){
 const title=track?(skill.treeName||skill.name):skill.name;
 const rank=numRanks>1?' <small class="book-ranks">'+owned+'/'+numRanks+'</small>':'';
 return '<button type="button" class="book-perk '+view.state+'" data-action="book-skill" data-id="'+skill.id+'" aria-pressed="'+(skill.id===selected)+'" aria-label="'+escape(title+', '+skillTreeStatus(view))+'">'+art(skill)+'<span class="book-perk-copy"><strong>'+escape(title)+'</strong><span>'+notice(view)+rank+'</span></span></button>';
}
function chapterMap(skills,views,selected){
 const groups=new Map();
 for(const skill of skills){
  const id=groupId(skill);
  if(!groups.has(id))groups.set(id,{id,ranks:[],children:[]});
  groups.get(id).ranks.push(skill);
 }
 const roots=[];
 for(const group of groups.values()){
  group.ranks.sort(perkOrder);
  const prerequisite=parents(group.ranks[0]).map(id=>SKILLS[id]).find(skill=>skill&&groups.has(groupId(skill))&&groupId(skill)!==group.id);
  if(prerequisite)groups.get(groupId(prerequisite)).children.push(group);
  else roots.push(group);
 }
 function branch(group){
  const inspectable=group.ranks.filter(skill=>views.get(skill.id).inspectable);
  if(!inspectable.length){
   const closed=group.ranks.some(skill=>views.get(skill.id).closedBy===skill.id);
   return '<li class="book-secret" aria-label="'+(closed?'Other path chosen':'Further upgrades')+'"><span>'+ (closed?'×':'···')+'</span></li>';
  }
  const choice=inspectable.find(skill=>skill.id===selected)||inspectable.find(skill=>!views.get(skill.id).complete)||inspectable.at(-1);
  const owned=group.ranks.reduce((sum,skill)=>sum+views.get(skill.id).rank,0),total=group.ranks.reduce((sum,skill)=>sum+skill.maxRank,0);
  return '<li>'+perkButton(choice,views.get(choice.id),selected,{track:true,owned,numRanks:total})+(group.children.length?'<ul>'+group.children.map(branch).join('')+'</ul>':'')+'</li>';
 }
 return '<ul class="book-trails">'+roots.sort((a,b)=>perkOrder(a.ranks[0],b.ranks[0])).map(branch).join('')+'</ul>';
}
function skillInspector(skill,views,chapterTitle,run,chapter){
 if(!skill)return '<aside class="book-inspector empty"><p>Explore a chapter to see its upgrades.</p></aside>';
 const view=views.get(skill.id),req=parents(skill),unlocks=(skill.excludes||[]).map(id=>SKILLS[id]?.name).filter(Boolean);
 const track=[...views.keys()].map(id=>SKILLS[id]).filter(s=>groupId(s)===groupId(skill)&&views.get(s.id).inspectable).sort(perkOrder);
 const ranks=chapter!=='available'&&track.length>1?'<nav class="book-stages" aria-label="Perk ranks">'+track.map((s,i)=>'<button type="button" data-action="book-skill" data-id="'+s.id+'" aria-pressed="'+(s.id===skill.id)+'" aria-label="'+escape(s.name)+'">'+(views.get(s.id).complete?'✓ ':'' )+(i+1)+'</button>').join('')+'</nav>':'';
 const path=!view.free&&req.length?'<div class="book-condition book-requires">Requires '+req.map(id=>{
  const parent=SKILLS[id], owned=!!run.skills?.[id];
  if(!parent)return '';
  const otherChapter=skillBookChapter(parent)!==skillBookChapter(skill);
  const mark=owned?'✓':'<svg viewBox="0 0 12 14" width="10" height="12" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M3 6V4a3 3 0 0 1 6 0v2 M1 6h10v7H1z"/></svg>';
  const state=owned?'Learned':'Locked';
  const label='<span aria-label="'+state+'">'+mark+'</span> '+escape(parent.name)+(parent.maxRank>1?' · Rank 1':'');
  if(otherChapter)return '<details class="book-inline-requirement"><summary>'+label+'</summary><p>'+escape(glowText(parent.description||parent.consequence,getGlowCapacity(run)))+'</p></details>';
  return views.get(id)?.inspectable?'<button type="button" class="book-link" data-action="book-skill" data-chapter="'+skillBookChapter(parent)+'" data-id="'+id+'">'+label+'</button>':label;
 }).join(' + ')+'</div>':'';
 const fork=unlocks.length&&!view.complete&&!view.closedBy?'<p class="book-condition">Closes '+unlocks.map(escape).join(' / ')+'</p>':'';
 const price=view.free?'Free':view.price===null?'':money()+' '+view.price;
 const purchase=view.available?'<button class="book-buy" type="button" data-action="'+(view.free?'choose-start-skill':'buy-skill')+'" data-id="'+skill.id+'">Learn <span>'+price+'</span></button>':'<p class="book-status '+view.state+'">'+escape(skillTreeStatus(view))+'</p>';
 return '<aside class="book-inspector" aria-live="polite"><div class="book-inspector-scroll"><span class="book-kicker">'+escape(chapterTitle)+'</span><div class="book-title">'+art(skill)+'<h3>'+escape(skill.name)+'</h3></div>'+ranks+'<p class="book-effect">'+escape(glowText(skill.description||skill.consequence,getGlowCapacity(run)))+'</p>'+path+fork+'</div>'+purchase+'</aside>';
}
export function skillBookMarkup({run,wallet,canBuy=true,variant='map',chapter,selected=null}){
 variant=variant==='index'?'index':'map';
 chapter=chapter|| (variant==='index'?'available':'wisp');
 if(chapter!=='available'&&!chapterIds.includes(chapter))chapter='wisp';
 const role=getCompanionAbility(run.companions?.[0]||run.companionRole);
 const skills=Object.values(SKILLS).filter(s=>!s.retired&&(s.treeTab!=='companion'||s.branch===role.id));
 const views=new Map(skills.map(s=>[s.id,skillTreeState({wallet,run,canBuy},s)]));
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
 return '<section class="skill-book" aria-label="Skills" data-variant="'+variant+'" data-chapter="'+chapter+'">'+titleBar+'<div class="book-spread">'+side+'<section class="book-page" aria-label="'+escape(title(chapter))+'"><h3>'+escape(title(chapter))+'</h3><div class="book-page-scroll" data-tree-key="'+variant+'-'+chapter+'">'+content+'</div></section>'+skillInspector(focus,views,focus?title(skillBookChapter(focus)):'',run,chapter)+'</div></section>';
}
