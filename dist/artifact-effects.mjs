// Shared triggers make artifacts combine with skills, pickups and every base
// companion. Effects never manufacture another pickup or dispatch a fuel event.
import {CONSUMABLE_ARTIFACTS,EVOLVING_ARTIFACTS} from './artifact-info.mjs?v=depth-energy-1';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const ARTIFACT_ENGINE_RULES=Object.freeze({
  'wayward-seed':Object.freeze({name:'Wayward Seed',color:'#c6dc99',trigger:'Three consecutive body Spark pickups.',effect:'Restore up to 3.34 Energy.',limits:'Five activations per flight. Collector deliveries break the chain.'}),
  'hearth-bloom':Object.freeze({name:'Hearth Bloom',color:'#ecc98e',trigger:'Three consecutive body Spark pickups.',effect:'Restore up to 10 Energy.',limits:'Five activations per flight. Collector deliveries break the chain. Bonus fuel cannot become Packed Sparks.'}),
  'lantern-bloom':Object.freeze({name:'Lantern Bloom',color:'#b8cdeb',trigger:'Three consecutive body Spark pickups.',effect:'Reveal the scene for 1.5s.',limits:'Five activations per flight. Collector deliveries break the chain. Sunspool keeps its own cap.'}),
  'overflow-coil':Object.freeze({name:'Overflow Coil',color:'#87d9c4',
    trigger:'Natural fuel that overfills Sparks.',effect:'Overflow also restores companion recovery.',
    limits:'Up to 2s per pickup and 12s per flight. Ready companions spend none of the limit.'}),
  'echo-bell':Object.freeze({name:'Echo Bell',color:'#e7c386',
    trigger:'A delivery, shield deflection, dash or start of levitation.',effect:'Your next direct Spark pickup within 8s gives +8 Sparks.',
    limits:'One charge at a time; up to 5 empowered pickups per flight. Combined bonus caps at 16 Sparks. Fetched fuel cannot spend it.'}),
  'dawn-loom':Object.freeze({name:'Dawn Loom',color:'#c0abef',
    trigger:'A pickup or effect actually restores companion recovery.',effect:'Shed a forward light for 1.5s.',
    limits:'4s between flashes; stacked light lasts at most 3s. Ordinary cooldown ticking does not trigger it.'}),
  sunspool:Object.freeze({name:'Sunspool',color:'#f5db92',
    trigger:'Collect natural fuel while temporary extra light shines.',effect:'Store one free Lift.',
    limits:'One stored Lift; 4s between grants; up to 4 grants per flight. Does not refill levitation.'}),
  'glow-wick':Object.freeze({name:'Spark Wick',color:'#edce8e',
    trigger:'Collect a natural Spark.',effect:'Restore up to 10 extra Energy.',
    limits:'3 automatic uses. Consumed when empty. Bonus fuel cannot become Packed Sparks.'}),
  'flash-stone':Object.freeze({name:'Flash Stone',color:'#c8c5f2',
    trigger:'Collect a natural Spark.',effect:'Reveal the whole scene for 1.5s, then fade.',
    limits:'2 automatic uses. Consumed when empty. Extra light does not stack.'}),
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
    this.seedId=[...EVOLVING_ARTIFACTS].reverse().find(id=>this.mounted.has(id))||null;
    this.seedCharge=0;this.seedProcs=0;
    this.charges={};
    for(const [id,spec] of Object.entries(CONSUMABLE_ARTIFACTS))if(this.mounted.has(id)){
      const saved=Number(engine.mod.artifactCharges?.[id]);
      this.charges[id]=Number.isFinite(saved)?clamp(Math.floor(saved),0,spec.maxCharges):spec.charges;
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
    let restored=this.applySeed(packet);
    // Apply only after natural overflow is accounted for: this generated bonus
    // never mints currency or recursively triggers fuel/recovery artifacts.
    // Keep a finite use until it can restore fuel. A full natural pickup must
    // not silently burn the player's consumable or a Rest recharge.
    if(e.flame<e.maxFlame-1e-7&&this.useCharge('glow-wick')){
      const bonus=Math.min(10,Math.max(0,e.maxFlame-e.flame));
      restored+=bonus;e.flame+=bonus;e.flameRestored+=bonus;
    }
    if(this.useCharge('flash-stone'))e.revealFromPickup(true);
    return restored;
  }
  applySeed(packet){
    if(!this.seedId||this.seedProcs>=5)return 0;
    if(packet.deliveredByWisp){this.seedCharge=0;return 0;}
    if(++this.seedCharge<3)return 0;
    this.seedCharge=0;this.seedProcs++;this.cue(this.seedId);
    const e=this.engine;
    if(this.seedId==='lantern-bloom'){e.revealFromPickup(true);return 0;}
    // This restoration occurs after natural overflow accounting and dispatches
    // no fuel event: a charge cannot create currency or charge itself again.
    const bonus=Math.min(this.seedId==='hearth-bloom'?10:10/3,Math.max(0,e.maxFlame-e.flame));
    e.flame+=bonus;e.flameRestored+=bonus;return bonus;
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
      seed:this.seedId?{id:this.seedId,charge:this.seedCharge,needed:3,procs:this.seedProcs,limit:5}:null,
      forwardLight:Math.max(0,this.sightUntil-time),overflowUsed:this.overflowUsed,
      workUses:this.workUses,liftGrants:this.liftGrants,procCounts:{...this.procCounts},
      charges:{...this.charges},notices:this.notices.map(notice=>({...notice})),
      proc:this.lastProc&&time-this.lastProc.time<.85?{...this.lastProc}:null};
  }
}
