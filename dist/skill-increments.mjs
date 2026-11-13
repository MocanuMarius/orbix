import {tuneMainDefinition,priceSkillDefinition} from './main-tuning.mjs?v=relic-paths-1';
// Separate purchases along a path, not a repeatable stat allocation screen.
const styles={
 'main-lift':['−2% cost','Lift spends 2% less Glow.'],
 'main-horizon':['+15 sight','Light radius +15; forward sight +30.'],
 'main-dawn':['−13% dim','Dark Seed dimming reduced by 13.33 percentage points.'],
 'main-tailwind':['+1.3% pace','Forward speed +1.33%.'],
 'main-drift':['−3.3% fall','Gravity reduced by 3.33 percentage points.'],
 'main-kindling':['+1.3 Glow','Natural fuel pickups restore 1.33 extra Glow.'],
 'collector-reach':['+12% reach','Search reach +11.67%; recovery takes 6.67% longer.'],
 'collector-recovery':['−17% wait','Recovery is 16.67% shorter; reach is 6.67% smaller.'],
 'protector-recovery':['−9% wait','Shell recovery is 9.33% shorter; activation costs 8.33% more Glow.'],
 'leveler-steadiness':['+22% steady','Bobbing steadiness +21.67 percentage points; hold is 5% shorter.'],
 'swift-recovery':['−9% wait','Surge recovery is 9.33% shorter; burst is 8.33% shorter.'],
 'swift-resistance':['+6% resist','Draft resistance +6 percentage points; recovery takes 8.33% longer.'],
 'seer-duration':['+17% time','Reveal lasts 16.67% longer; reach is 6.67% smaller.'],
 'seer-recovery':['−12% wait','Reveal recovery and duration are each 11.67% shorter.'],
 'kindler-bonus':['+2 Glow','Direct fuel bonus +2 Glow; Lift costs 1.67% more.'],
};
export function skillProgress(skills,id){
 if(skills?.[id]>0)return skills[id];
 return skills?.[id+'-step-2']>0?2/3:skills?.[id+'-step-1']>0?1/3:0;
}
const names={lightRadius:'sight',darkResistance:'dim resistance',collectorFuelBonus:'fetched Glow',collectorMinimum:'minimum reach',attract:'reach',wispCooldown:'recovery time',protectorProtection:'protection seconds',protectorCost:'shell Glow cost',protectorRecovery:'shell recovery',levelerDuration:'hold time',levelerRecovery:'hold recovery',levelerDive:'dive strength',swiftDuration:'burst time',swiftRecovery:'burst recovery',swiftResistance:'wind resistance',seerRadius:'reveal range',seerDuration:'reveal time',seerRecovery:'reveal recovery',kindlerBonus:'direct Glow',flapCost:'Lift Glow cost',purifyCooldown:'purify seconds',purifyFuel:'purified Glow',flap:'Lift strength',gravity:'gravity',cacheFuelBonus:'pickup Glow'};
const fmt=n=>Number(Math.abs(n).toFixed(2)).toString(),signed=n=>(n>=0?'+':'−')+fmt(n);
function describe(s){
 const items=[...Object.entries(s.add||{}).map(([k,v])=>({key:k,value:v/3,percent:k==='darkResistance'||k==='swiftResistance'})),...Object.entries(s.multiply||{}).map(([k,v])=>({key:k,value:(v-1)/3,percent:true}))];
 const text=items.map(i=>`${signed(i.value*(i.percent?100:1))}${i.percent?'%':''} ${names[i.key]||i.key}`);
 const first=items[0],brief={flapCost:'cost',gravity:'fall',flap:'Lift',cacheFuelBonus:'Glow',collectorFuelBonus:'Glow',kindlerBonus:'Glow',purifyFuel:'Glow',collectorMinimum:'reach',lightRadius:'sight',seerRadius:'sight',darkResistance:'resist',swiftResistance:'resist',wispCooldown:'wait',protectorRecovery:'wait',levelerRecovery:'wait',swiftRecovery:'wait',seerRecovery:'wait',purifyCooldown:'wait',protectorProtection:'safe',protectorCost:'cost',levelerDuration:'time',swiftDuration:'time',seerDuration:'time',levelerDive:'dive',attract:'reach'};const short=first?`${signed(Number((first.value*(first.percent?100:1)).toFixed(1)))}${first.percent?'%':''} ${brief[first.key]||names[first.key]}`:'Grow';return [short,text.join(' · ')+'.'];
}
export function expandSkillSteps(definitions){
 const split=s=>s.branch!=='main'&&!!styles[s.id],out={};
 const entry=id=>definitions[id]&&split(definitions[id])?id+'-step-1':id;
 for(const raw of Object.values(definitions)){
  const s=tuneMainDefinition(raw);
  if(!split(s)){out[s.id]=Object.freeze({...s,...(s.excludes?{excludes:[...new Set(s.excludes.flatMap(other=>[entry(other),other]))]}: {})});continue;}
  const [shortEffect,stepDescription]=styles[s.id]||describe(s);
  for(let stage=1;stage<=3;stage++){
   const id=stage===3?s.id:s.id+'-step-'+stage;
   const excludes=[...new Set((s.excludes||[]).flatMap(other=>[entry(other),other]))];
   out[id]=Object.freeze({...s,id,name:s.name+' '+['I','II','III'][stage-1],
    baseName:s.name,incrementBase:s.id,incrementStage:stage,trackParent:s.requires,
    cost:(s.expansion?[35,40,45]:[20,25,30])[stage-1],maxRank:1,
    requires:stage===1?s.requires:s.id+'-step-'+(stage-1),
    description:stepDescription,consequence:stepDescription,fullEffect:s.description,
    shortEffect,excludes,choiceGroup:stage===1?s.choiceGroup:undefined,
   });
  }
 }
 return Object.fromEntries(Object.entries(out).map(([id,s])=>[id,Object.freeze(priceSkillDefinition(s))]));
}
