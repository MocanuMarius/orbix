import assert from 'node:assert/strict';
import {SKILLS,SAVE_KEY,newState,createRun,chooseStartingSkill,getSkillWallet,getSkillPrice,getSkillLockReason,buyCheckpointSkill,getRunModifiers,saveState,loadState} from '../dist/model.mjs';
import {radialTreeLayout} from '../dist/living-tree.mjs';
import {mainWispTreeMarkup} from '../dist/wisp-tree.mjs';
import {skillIcon} from '../dist/upgrade-icons.mjs';

const charge='main-edging-attunement',lasting='main-edging-lasting',tension='main-edging-tension';
const state=()=>{const s=newState();s.run=createRun(s.profile,'edging-skills');s.run.condensedGlow=1000;return s;};
const pulse=m=>[m.edgingChargeRate,m.edgingDecayRate,m.edgingDuration,m.edgingRecovery];
assert.deepEqual(pulse(getRunModifiers()),[1,1,5,2],'Edging Pulse exists before any skill is learned');
for(const [chosen,other,expected,cost] of [[lasting,tension,[1.25,1,7,2],140],[tension,lasting,[1.25,.5,5,2],130]]){
 const s=state(),initial=getRunModifiers(s.run);
 assert.match(getSkillLockReason(getSkillWallet(s),charge),/Radiance/);
 assert.equal(buyCheckpointSkill(s,charge),false);
 assert.ok(chooseStartingSkill(s,'main-sight'));
 assert.equal(getSkillPrice(getSkillWallet(s),charge),80,'Free starter does not raise the first upgrade price');
 assert.ok(buyCheckpointSkill(s,charge));
 assert.deepEqual(pulse(getRunModifiers(s.run)),[1.25,1,5,2]);
 assert.equal(getSkillPrice(getSkillWallet(s),chosen),cost,'New skills follow the existing global purchase curve');
 assert.ok(buyCheckpointSkill(s,chosen));
 assert.deepEqual(pulse(getRunModifiers(s.run)),expected);
 assert.match(getSkillLockReason(getSkillWallet(s),other),/Other path chosen/);
 const money=s.run.condensedGlow;
 assert.equal(buyCheckpointSkill(s,other),false);assert.equal(s.run.condensedGlow,money);
 const built=getRunModifiers(s.run);
 for(const key of ['flapCost','cacheFuelBonus','reward','condensationBonus','condensationRules'])assert.deepEqual(built[key],initial[key],`${key} is unaffected by a sight skill`);
 const memory=new Map(),storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
 assert.ok(saveState(s,storage));const restored=loadState(storage);
 assert.equal(restored.version,7);assert.ok(memory.has(SAVE_KEY));
 assert.equal(restored.run.skills[charge],1);assert.equal(restored.run.skills[chosen],1);
 assert.equal(restored.run.condensedGlow,money);assert.deepEqual(pulse(getRunModifiers(restored.run)),expected);
}

const skills=Object.values(SKILLS).filter(s=>{let root=s;while(SKILLS[root.requires])root=SKILLS[root.requires];return root.id==='main-sight';});
let minimum=Infinity;
for(const [width,height] of [[588,272.8],[560,280],[400,244],[320,220],[350,270]]){
 const layout=radialTreeLayout(skills,{width,height}),points=[...layout.points.values()];
 for(const id of [charge,lasting,tension])assert.ok(layout.skillGroup.has(id));
 for(let i=0;i<points.length;i++){
  const a=points[i];assert.ok(a.x>=28&&a.x<=width-28&&a.y>=28&&a.y<=height-28);
  for(let j=i+1;j<points.length;j++){const d=Math.hypot(a.x-points[j].x,a.y-points[j].y);minimum=Math.min(minimum,d);assert.ok(d>=50,'Light tree keeps distinct touch targets');}
 }
}
const s=state();chooseStartingSkill(s,'main-sight');
globalThis.innerWidth=900;globalThis.innerHeight=405;
const html=mainWispTreeMarkup({run:s.run,wallet:getSkillWallet(s),canBuy:true,selected:charge});
for(const id of [charge,lasting,tension]){assert.ok(html.includes(`data-id="${id}"`));assert.match(SKILLS[id].description,/Edging Pulse/);assert.notEqual(skillIcon(SKILLS[id]),skillIcon({id:'fallback',branch:'main'}));}
assert.ok(html.includes('3.2s instead of 4s'));
console.log(JSON.stringify({innatePulse:true,prerequisites:true,exclusiveForks:true,progressivePrices:true,v7Persistence:true,sightOnly:true,lightNodes:skills.length,minimumSeparation:minimum,landscape:'900×405'}));
