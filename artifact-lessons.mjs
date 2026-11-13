import {getArtifactInfo} from './artifact-info.mjs?v=lantern-paths-1';
import {glowText} from './vitality.mjs?v=lantern-paths-1';

// One small first-use explanation per flight. Remaining discoveries stay
// eligible next flight rather than chaining several modal interruptions.
export function nextArtifactNotice(snapshot={},seen=[]){
 if(snapshot.dream?.active||snapshot.dying||snapshot.completing)return null;
 return (snapshot.artifactNotices||[]).find(n=>!seen.includes(n.artifactId))||null;
}
export function artifactUseLesson(notice,artifact,{maxGlow=100,charges={}}={}){
 const info=getArtifactInfo(notice.artifactId),remaining=charges[notice.artifactId]??notice.remaining;
 const lifetime=info.type==='consumable'
  ?remaining>0?`${remaining} ${remaining===1?'use remains':'uses remain'}. It disappears when empty.`:'Used up. Its slot opens after this flight.'
  :info.type==='triggered'?`It stays equipped. ${info.limit||info.lifetime}.`
  :'It stays active while mounted; it is not used up.';
 return {title:`${artifact?.name||'Artifact'} · ${notice.phase==='exhausted'?'used up':'active'}`,
  text:glowText(`${info.effect} ${lifetime}`,maxGlow),
  target:`.flight-artifact-bar [data-relic="${notice.artifactId}"]`,actionLabel:'Resume slowly'};
}
