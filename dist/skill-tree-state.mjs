import {SKILLS,MAIN_WISP_BRANCHES,getSkillLockReason,getSkillPrice,canChooseStartingSkill} from './model.mjs?v=ring-boons-1';

const parents=skill=>Array.isArray(skill?.requires)?skill.requires:skill?.requires?[skill.requires]:[];
const learned=(wallet,id)=>Number(wallet?.skills?.[id]||0);

// Count unlearned prerequisites, including prerequisites outside this diagram.
// A future node one purchase away may be previewed; deeper nodes stay anonymous.
function prerequisiteDistance(wallet,skill,seen=new Set()){
 if(!skill||seen.has(skill.id))return 0;
 const next=new Set(seen).add(skill.id);
 return Math.max(0,...parents(skill).map(id=>learned(wallet,id)>0?0:1+prerequisiteDistance(wallet,SKILLS[id],next)));
}
function closedAncestor(wallet,skill,seen=new Set()){
 if(!skill||wallet?.testMode===true||seen.has(skill.id))return null;
 const next=new Set(seen).add(skill.id);
 if(!learned(wallet,skill.id)&&(skill.excludes||[]).some(id=>learned(wallet,id)>0))return skill.id;
 return parents(skill).map(id=>closedAncestor(wallet,SKILLS[id],next)).find(Boolean)||null;
}

export function skillTreeState({wallet,run=wallet,canBuy=true},skill){
 skill=typeof skill==='string'?SKILLS[skill]:skill;
 if(!skill)return{state:'distant',disclosure:'hidden',inspectable:false};
 const rank=learned(wallet,skill.id),complete=rank>=skill.maxRank;
 const reason=getSkillLockReason(wallet,skill.id),price=getSkillPrice(wallet,skill.id);
 const free=!complete&&canChooseStartingSkill(run)&&MAIN_WISP_BRANCHES.some(branch=>branch.root===skill.id);
 const shortfall=price===null||free?0:Math.max(0,price-Number(wallet?.condensedGlow||0));
 const distance=prerequisiteDistance(wallet,skill),closedBy=closedAncestor(wallet,skill);
 const disclosure=complete||rank>0||free||wallet?.testMode===true?'full':closedBy||distance>1?'hidden':distance===1?'preview':'full';
 const available=!complete&&(free||canBuy&&!reason&&price!==null&&shortfall===0)&&!closedBy;
 const state=complete?'learned':closedBy?'excluded':disclosure==='hidden'?'distant':disclosure==='preview'?'preview':available?'available':reason||!canBuy?'locked':'saving';
 return {state,disclosure,inspectable:disclosure!=='hidden',rank,complete,reason,price,free,shortfall,distance,closedBy,available};
}

// Used by every rendering entry point, including direct inspector calls. A stale
// selection must never reveal a distant skill through descriptions or rank links.
export function safeTreeSelection(skills,selected,context){
 const allowed=new Map(skills.map(skill=>[skill.id,skill]));
 let skill=allowed.get(typeof selected==='string'?selected:selected?.id),seen=new Set();
 while(skill&&!seen.has(skill.id)){
  const view=skillTreeState(context,skill);
  // Shared rank markers keep their current purchase visible. Future rank slots
  // are anonymous until reachable, while learned ranks remain inspectable.
  if(view.disclosure==='preview'&&skill.incrementBase){
   const current=skills.find(s=>s.incrementBase===skill.incrementBase&&s.incrementStage<skill.incrementStage&&skillTreeState(context,s).disclosure==='full'&&!skillTreeState(context,s).complete);
   if(current)return current;
  }
  if(view.inspectable)return skill;
  seen.add(skill.id);skill=parents(skill).map(id=>allowed.get(id)).find(Boolean);
 }
 return skills.find(skill=>skillTreeState(context,skill).available)||skills.find(skill=>skillTreeState(context,skill).disclosure==='full')||skills.find(skill=>skillTreeState(context,skill).inspectable)||null;
}

export function skillTreeStatus(view){
 if(view.complete)return '✓ Learned';
 if(view.free)return 'Free starting gift';
 if(view.disclosure==='preview')return 'Locked · Learn the preceding skill to reveal';
 if(view.reason)return `Locked · ${view.reason}`;
 if(view.state==='locked')return `Locked · Learn after a flight or at rest${view.shortfall>0?` · Need ${view.shortfall} more PL`:''}`;
 if(view.shortfall>0)return `Need ${view.shortfall} more Packed Light`;
 return 'Ready to learn';
}
