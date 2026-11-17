// Shared triggers make artifacts combine with skills, pickups and every base
// companion. Effects never manufacture another pickup or dispatch a fuel event.
import {CONSUMABLE_ARTIFACTS,EVOLVING_ARTIFACTS} from './artifact-info.mjs?v=biomes-1';
import {GuardianReactions} from './guardian-reactions.mjs?v=biomes-1';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const ARTIFACT_ENGINE_RULES=Object.freeze({
  'wayward-seed':Object.freeze({name:'Wayward Seed',color:'#c6dc99',trigger:'Three consecutive body Spark pickups.',effect:'Restore up to 3.34 Sparks.',limits:'Five activations per flight. Collector deliveries break the chain.'}),
  'hearth-bloom':Object.freeze({name:'Hearth Bloom',color:'#ecc98e',trigger:'Three consecutive body Spark pickups.',effect:'Restore up to 10 Sparks.',limits:'Five activations per flight. Collector deliveries break the chain. Bonus fuel cannot become Stored Sparks.'}),
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
    trigger:'Collect a natural Spark.',effect:'Restore up to 10 extra Sparks.',
    limits:'3 automatic uses. Consumed when empty. Bonus fuel cannot become Stored Sparks.'}),
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
    this.storedLift=null;this.liftGrants=0;this.liftReadyAt=0;this.lastProc=null;
    this.procCounts={'overflow-coil':0,'echo-bell':0,'dawn-loom':0,sunspool:0};
    this.activationCounts = {};
    this.mounted=new Set(engine.mod.artifactIds||[]);
    this.guardian=new GuardianReactions(this);
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
    this.guardian.start();
    this.notice('ember-lens','passive');
    this.notice('dream-sovereign','passive');
  }
  onFlap(paid){
    if(paid&&this.guardian.held.size)this.guardian.lift();
    if(paid){this.notice('quiet-cinder','passive');this.notice('glass-lantern','passive');this.notice('hollow-covenant','passive');}
    this.notice('silver-feather','passive');
  }
  activate(id,outcome={},detail={}){
    if(!this.mounted.has(id))return;
    this.activationCounts[id] = (this.activationCounts[id] || 0) + 1;
    this.engine.activation?.(id,{kind:'artifact',outcome,...detail});
  }
  useCharge(id,outcome={}){
    if(!(this.charges[id]>0))return false;
    this.charges[id]--;
    this.cue(id,'triggered',outcome);
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
    const wickBonus=Math.min(10,Math.max(0,e.maxFlame-e.flame));
    if(e.flame<e.maxFlame-1e-7&&this.useCharge('glow-wick',{fuel:wickBonus})){
      const bonus=wickBonus;
      restored+=bonus;e.flame+=bonus;e.flameRestored+=bonus;
    }
    if(this.useCharge('flash-stone',{reveal:1.5}))e.revealFromPickup(true,{id:'flash-stone',sourceKind:'relic',follow:'wisp'});
    return restored;
  }
  applySeed(packet){
    if(!this.seedId||this.seedProcs>=5)return 0;
    if(packet.deliveredByWisp){this.seedCharge=0;return 0;}
    if(++this.seedCharge<3)return 0;
    this.seedCharge=0;this.seedProcs++;
    const e=this.engine;
    if(this.seedId==='lantern-bloom'){this.cue(this.seedId,'triggered',{reveal:1.5});e.revealFromPickup(true,{id:this.seedId,sourceKind:'relic',follow:'wisp'});return 0;}
    // This restoration occurs after natural overflow accounting and dispatches
    // no fuel event: a charge cannot create currency or charge itself again.
    const bonus=Math.min(this.seedId==='hearth-bloom'?10:10/3,Math.max(0,e.maxFlame-e.flame));
    e.flame+=bonus;e.flameRestored+=bonus;this.cue(this.seedId,'triggered',{fuel:bonus});return bonus;
  }
  enabled(id){return Number(this.engine.mod[MODIFIERS[id]])>0;}
  cue(id,phase='triggered',outcome={}){
    const e=this.engine,rule=ARTIFACT_ENGINE_RULES[id];
    const sourceIds=e.mod.artifactEngineSources?.[id]||[id];
    this.lastProc={id:sourceIds[0]||id,engineId:id,sourceIds:[...sourceIds],phase,color:rule.color,time:e.time};
    for(const source of sourceIds)this.activate(source,outcome,{phase});
    if(phase==='triggered'){
      if(Object.hasOwn(this.procCounts,id))this.procCounts[id]++;
      for(const source of sourceIds)this.notice(source,'triggered',Object.hasOwn(this.charges,source)?{remaining:this.charges[source]}:{});
    }
    // A few short pixel sparks share the existing bounded particle pool.
    e.burst(e.player.x,e.player.y,phase==='primed'?3:5,rule.color);
  }
  onWork(){
    this.guardian.companion();
    if(!this.enabled('echo-bell')||this.workUses>=5)return;
    const wasPrimed=this.workUntil>this.engine.time;
    this.workUntil=this.engine.time+8;
    if(!wasPrimed)this.cue('echo-bell','primed');
  }
  fuelBonus(packet,spec){
    if(!this.enabled('echo-bell')||!naturalFuel(packet,spec)||packet.deliveredByWisp
      ||this.workUntil<=this.engine.time||this.workUses>=5)return 0;
    this.workUntil=-Infinity;this.workUses++;
    const e=this.engine,bonus=clamp(Number(e.mod.workFuel)||0,0,16);
    const base=spec.fuel+(Number(e.fuelBonus)||0)+clamp(Number(e.mod.cacheFuelBonus)||0,0,32)
      +(spec.id==='cache'?Number(e.mod.richFuelBonus)||0:0)
      +(!packet.deliveredByWisp&&(e.mod.mainKindler||e.hasCompanion?.('kindler'))?clamp(Number(e.mod.kindlerBonus)||(e.mod.mainKindler?6:10),0,30):0);
    const actual=Math.max(0,Math.min(bonus,e.maxFlame-e.flame-base));
    this.cue('echo-bell','triggered',{fuel:actual});
    return bonus;
  }
  onRecharge(seconds){
    const e=this.engine;
    if(seconds<=0||!this.enabled('dawn-loom')||e.time<this.sightReadyAt)return;
    if(this.sightUntil<=e.time)this.sightStartedAt=e.time;
    this.sightUntil=Math.max(this.sightUntil,e.time+clamp(Number(e.mod.rechargeSight)||1.5,.5,3));
    e.radiateLight?.({once:true,source:'dawn-loom',sourceKind:'relic',reveal:true,
      radius:Math.max(e.getLightState?.().radius||145,Number(e.mod.seerRadius)||230)});
    this.sightReadyAt=e.time+4;this.cue('dawn-loom','triggered',{reveal:this.sightUntil-e.time});
  }
  get temporarilyLit(){
    const e=this.engine;
    return e.pickupRevealHoldUntil>e.time||e.pickupRevealStrength>0||e.sightUntil>e.time
      ||e.mainSeerUntil>e.time||this.sightUntil>e.time||Number(e.edgingPulse?.strength)>0||e.fleet.some(item=>item.role==='seer'&&item.remaining>0);
  }
  onFuel(packet,spec,surplus,cleansed=false){
    if(!naturalFuel(packet,spec))return 0;
    const e=this.engine;
    const restored=this.guardian.held.size?this.guardian.pickup(packet,spec,surplus,cleansed):0;
    if(this.enabled('overflow-coil')&&surplus>0&&this.overflowUsed<12){
      const requested=Math.min(2,12-this.overflowUsed,surplus*clamp(Number(e.mod.overflowRecharge)||0,0,.2));
      const restored=e.quickenCompanionRecovery(null,requested);
      if(restored>0){this.overflowUsed=Math.min(12,this.overflowUsed+restored);this.cue('overflow-coil','triggered',{recovery:restored});}
    }
    // Recovery can create light above, and that light can charge a Lift here.
    // Neither resulting effect re-enters this method or creates more fuel.
    if(this.enabled('sunspool')&&!this.storedLift&&this.liftGrants<4&&e.time>=this.liftReadyAt&&this.temporarilyLit){
      this.freeLift=true;this.liftGrants++;this.liftReadyAt=e.time+4;this.cue('sunspool','triggered',{lifts:1});
    }
    return restored;
  }
  get freeLiftCount(){return this.guardian.openingLifts+Number(!!this.storedLift);}
  get freeLift(){return this.freeLiftCount>0;}
  set freeLift(value){this.storedLift=value?'sunspool':null;}
  consumeLift(){
    if(this.guardian.openingLifts>0){this.guardian.openingLifts--;this.activate('first-light-standard',{usedLift:true},{phase:'spent'});return true;}
    if(!this.freeLift)return false;
    const id=this.storedLift;this.storedLift=null;
    if(id==='sunspool')this.cue(id,'spent',{usedLift:true});
    else this.activate(id,{usedLift:true},{phase:'spent'});
    return true;
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
