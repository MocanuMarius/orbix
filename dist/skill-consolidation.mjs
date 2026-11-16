import {normalizeChapterPrerequisites} from './skill-chapters.mjs?v=relic-guide-1';
const groups=[
 ['main','Lift',['main-efficiency','main-lift']],
 ['main','Fourth Beat',['main-fourth-beat','main-fourth-beat-2']],
 ['main','Luminance',['main-sight','main-horizon']],
 ['main','Long Flash',['main-long-flash']],
 ['main','Resonant Harvest',['main-resonant-harvest']],
 ['main','Resonant Purification',['main-resonant-purification']],
 ['main','Resonant Bounty',['main-resonant-bounty']],
 ['main','Momentum',['main-speed','main-tailwind']],
 ['main','Last Glimmer',['main-last-glimmer']],
 ['main','Spark Vessel',['main-reservoir','main-vast-vessel']],
 ['main','Glide Regeneration',['main-glide-regen','main-glide-regen-2']],
 ['main','Renewal',['main-recovery','main-recovery-deep']],
 ['main','Last Spark',['main-recovery-rescue']],
 ['main','Earned Rest',['main-recovery-challenge']],
 ['main','Vitality',['main-spare-spark','main-deep-reserve']],
 ['main','Trajectory Guide',['main-drift-sense','main-drift-sense-2','main-drift-sense-3']],
 ['main','Spark Sense',['main-glow-sense','main-dawnburst']],
 ['mystic','Storage',['main-afterglow','afterglow-vessel']],
 ['mystic','Prismatic Yield',['afterglow-retention']],
 ['mystic','Trail Dividend',['main-clear-dividend']],
 ['mystic','Kept Light',['afterglow-anchor']],
 ['mystic','Hand Seal',['packing-hand-seal']],
 ['mystic','Deep Cache',['packing-deep-cache']],
 ['mystic','Dream',['main-dream','main-dream-long','main-dream-deep']],
 ['mystic','Proximity',['proximity-awakening','main-edging-attunement']],
 ['mystic','Lasting Pulse',['main-edging-lasting']],
 ['mystic','Regenerative Pulse',['main-edging-regeneration']],
 ['mystic','Light Aegis',['main-edging-tension','proximity-grace','proximity-light-shield']],
 ['mystic','Spacetime',['proximity-spacetime']],
];
export function consolidateSkills(definitions){
 const result={};for(const [id,s] of Object.entries(definitions)){
  const main=['main','proximity','afterglow'].includes(s.branch);
  result[id]={...s,retired:main,treeTab:main?'main':'companion',treeGroup:s.incrementBase||s.id,treeStage:s.incrementStage||1,treeName:s.baseName||s.name};
 }
 for(const [tab,name,ids]of groups)ids.forEach((id,index)=>{const s=result[id];if(!s)return;Object.assign(s,{retired:false,treeTab:tab,treeGroup:ids[0],treeStage:index+1,treeName:name,name:id==='main-dream-deep'?s.name:ids.length>1?`${name} ${index+1}`:name,treeIcon:({Lift:'lift',Luminance:'sight',Momentum:'swift','Spark Vessel':'reserve','Glide Regeneration':'regen',Vitality:'heart','Trajectory Guide':'trajectory','Spark Sense':'beacon'})[name]||s.icon});
  // Ranks on one marker are sequential; each keeps its own effect and price.
  if(index)s.requires=ids[index-1];
 });
 for(const role of ['collector','protector','swift','leveler'])for(const [i,id]of [`${role}-attunement`,`${role}-mastery`].entries())Object.assign(result[id],{treeGroup:`${role}-attunement`,treeStage:i+1,treeName:role==='collector'?'Search Spark':role==='protector'?'Ward Spark':role==='swift'?'Surge Spark':'Balance Spark'});
 for(const [i,id]of ['collector-last-orbit','collector-guard-repair'].entries())Object.assign(result[id],{treeGroup:'collector-guard',treeName:'Guard',treeStage:i+1});
 // Remove exclusions pointing to retired alternatives, never strand a live rank.
 for(const s of Object.values(result))if(!s.retired)s.excludes=(s.excludes||[]).filter(id=>!result[id]?.retired);
 return normalizeChapterPrerequisites(result);
}
export function refundRetiredSkills(run,definitions){
 if(!run?.skills)return 0;let refund=0;
 for(const id of Object.keys(run.skills))if(definitions[id]?.retired){refund+=Math.max(0,Number(run.skillPaid?.[id])||0);delete run.skills[id];if(run.skillPaid)delete run.skillPaid[id];if(run.attemptEntry?.skills)delete run.attemptEntry.skills[id];}
 if(refund){const key=run.isTutorial?'practiceCondensedGlow':'condensedGlow';run[key]=(run[key]||0)+refund;if(run.attemptEntry)run.attemptEntry.condensedGlow=(run.attemptEntry.condensedGlow||0)+refund;run.skillConsolidationRefund=(run.skillConsolidationRefund||0)+refund;}
 return refund;
}
