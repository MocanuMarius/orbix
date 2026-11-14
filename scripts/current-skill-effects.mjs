import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../dist/model.mjs';
import {getLifeCapacity} from '../dist/vitality.mjs';
const rows=[];
for(const skill of Object.values(M.SKILLS).filter(s=>!s.retired)){
 const state=M.newState();state.profile.difficulty=6;state.run=M.createRun(state.profile,'skill-effect-audit',1);
 const r=state.run;r.condensedGlow=100000;r.victoryPending=true;r.mapIndex=2;r.companions=[['main','proximity','afterglow'].includes(skill.branch)?'collector':skill.branch];
 const unlock=id=>{const s=M.SKILLS[id];if(s.branch==='afterglow'&&!r.skills['main-afterglow'])unlock('main-afterglow');for(const p of Array.isArray(s.requires)?s.requires:s.requires?[s.requires]:[])if(!r.skills[p])unlock(p);if(!r.skills[id])assert.ok(M.buyCheckpointSkill(state,id),id);};
 if(skill.branch==='afterglow')unlock('main-afterglow');for(const p of Array.isArray(skill.requires)?skill.requires:skill.requires?[skill.requires]:[])unlock(p);
 for(let i=0;i<skill.maxRank;i++){
  const signature=()=>({...M.getRunModifiers(r),lives:getLifeCapacity(r)}),before=signature();assert.ok(M.buyCheckpointSkill(state,skill.id),skill.id);const after=signature();
  const changes=Object.keys(after).filter(k=>JSON.stringify(before[k])!==JSON.stringify(after[k]));assert.ok(changes.length,skill.id+' has no effect');rows.push({id:skill.id,rank:i+1,changes});
 }
}
fs.writeFileSync('work/current-skill-effects.json',JSON.stringify(rows,null,2));console.log(JSON.stringify({checkedRanks:rows.length,noEffectRanks:0}));
