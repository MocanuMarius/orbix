// Shared triggers make artifacts combine with skills, pickups and every base
// companion. Effects never manufacture another pickup or dispatch a fuel event.
import {CONSUMABLE_ARTIFACTS} from './artifact-info.mjs?v=artifact-clarity-1';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const ARTIFACT_ENGINE_RULES=Object.freeze({
  'overflow-coil':Object.freeze({name:'Overflow Coil',color:'#87d9c4',
    trigger:'Natural fuel that overfills Glow.',effect:'Overflow also restores companion recovery.',
    limits:'Up to 2s per pickup and 12s per flight. Ready companions spend none of the limit.'}),
  'echo-bell':Object.freeze({name:'Echo Bell',color:'#e7c386',
    trigger:'A delivery, shield deflection, dash or start of levitation.',effect:'Your next direct fuel pickup within 8s gives +8 Glow.',
    limits:'One charge at a time; up to 5 empowered pickups per flight. Combined bonus caps at 16 Glow. Fetched fuel cannot spend it.'}),
  'dawn-loom':Object.freeze({name:'Dawn Loom',color:'#c0abef',
    trigger:'A pickup or effect actually restores companion recovery.',effect:'Shed a forward light for 1.5s.',
    limits:'4s between flashes; stacked light lasts at most 3s. Ordinary cooldown ticking does not trigger it.'}),
  sunspool:Object.freeze({name:'Sunspool',color:'#f5db92',
    trigger:'Collect natural fuel while temporary extra light shines.',effect:'Store one free Lift.',
    limits:'One stored Lift; 4s between grants; up to 4 grants per flight. Does not refill levitation.'}),
  'glow-wick':Object.freeze({name:'Glow Wick',color:'#edce8e',
    trigger:'Collect a natural fuel light.',effect:'Restore up to 10 extra Glow.',
    limits:'3 pickups, then consumed. Bonus fuel cannot become Packed Light.'}),
  'flash-stone':Object.freeze({name:'Flash Stone',color:'#c8c5f2',
    trigger:'Collect a natural fuel light.',effect:'Reveal the whole scene for 1.5s, then fade.',
    limits:'2 pickups, then consumed. Extra light does not stack.'}),
});
const MODIFIERS=Object.freeze({'overflow-coil':'overflowRecharge','echo-bell':'workFuel','dawn-loom':'rechargeSight',sunspool:'litLift'});
const naturalFuel=(packet,spec)=>!packet.generated&&!packet.harmful&&spec.fuel>0&&!spec.dim;

export class ArtifactEffects {
  constructor(engine){
    this.engine=engine;this.overflowUsed=0;this.workUntil=-Infinity;this.workUses=0;
    this.sightStartedAt=-Infinity;this.sightUntil=0;this.sightReadyAt=0;
    this.freeLift=false;this.liftGrants=0;this.liftReadyAt=0;this.lastProc=null;
    this.procCounts={'overflow-coil':0,'echo-bell':0,'dawn-loom':0,sunspool:0};
    this.mounted=new Set(engine.mod.artifactIds||[]);
    this.charges={};
    for(const [id,spec] of Object.entries(CONSUMABLE_ARTIFACTS))if(this.mounted.has(id)){
      const saved=Number(engine.mod.artifactCharges?.[id]);
      this.charges[id]=Number.isFinite(saved)?clamp(Math.floor(saved),0,spec.charges):spec.charges;
    }
    this.notices=[];this.noticeKeys=new Set();this.noticeSerial=0;
  }
  notice(artifactId,phase='triggered',detail={}){
    const key=`${artifactId}:${phase}`;
    if(!this.mounted.has(artifactId)||this.noticeKeys.has(key)||this.notices.length>=24)return;
    this.noticeKeys.add(key);
    this.notices.push({serial:++this.noticeSerial,artifactId,phase,time:this.engine.time,...detail});
  }
  onStart(){
    this.notice('ember-lens','passive');
    this.notice('dream-sovereign','passive');
  }
  onFlap(paid){
    if(paid){this.notice('quiet-cinder','passive');this.notice('glass-lantern','passive');this.notice('hollow-covenant','passive');}
    this.notice('silver-feather','passive');
  }
  useCharge(id){
    if(!(this.charges[id]>0))return false;
    this.charges[id]--;
    this.cue(id);
    if(this.charges[id]===0)this.notice(id,'exhausted',{remaining:0});
    return true;
  }
  applyConsumables(packet,spec){
    if(!naturalFuel(packet,spec))return 0;
    const e=this.engine;
    let restored=0;
    // Apply only after natural overflow is accounted for: this generated bonus
    // never mints currency or recursively triggers fuel/recovery artifacts.
    if(this.useCharge('glow-wick')){
      restored=Math.min(10,Math.max(0,e.maxFlame-e.flame));
      e.flame+=restored;e.flameRestored+=restored;
    }
    if(this.useCharge('flash-stone'))e.revealFromPickup(true);
    return restored;
  }
  enabled(id){return Number(this.engine.mod[MODIFIERS[id]])>0;}
  cue(id,phase='triggered'){
    const e=this.engine,rule=ARTIFACT_ENGINE_RULES[id];
    const sourceIds=e.mod.artifactEngineSources?.[id]||[id];
    this.lastProc={id:sourceIds[0]||id,engineId:id,sourceIds:[...sourceIds],phase,color:rule.color,time:e.time};
    if(phase==='triggered'){
      if(Object.hasOwn(this.procCounts,id))this.procCounts[id]++;
      for(const source of sourceIds)this.notice(source,'triggered',Object.hasOwn(this.charges,source)?{remaining:this.charges[source]}:{});
    }
    // A few short pixel sparks share the existing bounded particle pool.
    e.burst(e.player.x,e.player.y,phase==='primed'?3:5,rule.color);
  }
  onWork(){
    if(!this.enabled('echo-bell')||this.workUses>=5)return;
    const wasPrimed=this.workUntil>this.engine.time;
    this.workUntil=this.engine.time+8;
    if(!wasPrimed)this.cue('echo-bell','primed');
  }
  fuelBonus(packet,spec){
    if(!this.enabled('echo-bell')||!naturalFuel(packet,spec)||packet.deliveredByWisp
      ||this.workUntil<=this.engine.time||this.workUses>=5)return 0;
    this.workUntil=-Infinity;this.workUses++;this.cue('echo-bell');
    return clamp(Number(this.engine.mod.workFuel)||0,0,16);
  }
  onRecharge(seconds){
    const e=this.engine;
    if(seconds<=0||!this.enabled('dawn-loom')||e.time<this.sightReadyAt)return;
    this.sightStartedAt=e.time;this.sightUntil=e.time+clamp(Number(e.mod.rechargeSight)||1.5,.5,3);
    this.sightReadyAt=e.time+4;this.cue('dawn-loom');
  }
  get temporarilyLit(){
    const e=this.engine;
    return e.pickupRevealHoldUntil>e.time||e.pickupRevealStrength>0||e.sightUntil>e.time
      ||e.mainSeerUntil>e.time||this.sightUntil>e.time||Number(e.edgingPulse?.strength)>0||e.fleet.some(item=>item.role==='seer'&&item.remaining>0);
  }
  onFuel(packet,spec,surplus){
    if(!naturalFuel(packet,spec))return;
    const e=this.engine;
    if(this.enabled('overflow-coil')&&surplus>0&&this.overflowUsed<12){
      const requested=Math.min(2,12-this.overflowUsed,surplus*clamp(Number(e.mod.overflowRecharge)||0,0,.2));
      const restored=e.quickenCompanionRecovery(null,requested);
      if(restored>0){this.overflowUsed=Math.min(12,this.overflowUsed+restored);this.cue('overflow-coil');}
    }
    // Recovery can create light above, and that light can charge a Lift here.
    // Neither resulting effect re-enters this method or creates more fuel.
    if(this.enabled('sunspool')&&!this.freeLift&&this.liftGrants<4&&e.time>=this.liftReadyAt&&this.temporarilyLit){
      this.freeLift=true;this.liftGrants++;this.liftReadyAt=e.time+4;this.cue('sunspool');
    }
  }
  consumeLift(){
    if(!this.freeLift)return false;
    this.freeLift=false;this.cue('sunspool','spent');return true;
  }
  get state(){
    const time=this.engine.time;
    return {freeLift:this.freeLift,primed:Math.max(0,this.workUntil-time),
      forwardLight:Math.max(0,this.sightUntil-time),overflowUsed:this.overflowUsed,
      workUses:this.workUses,liftGrants:this.liftGrants,procCounts:{...this.procCounts},
      charges:{...this.charges},notices:this.notices.map(notice=>({...notice})),
      proc:this.lastProc&&time-this.lastProc.time<.85?{...this.lastProc}:null};
  }
}
