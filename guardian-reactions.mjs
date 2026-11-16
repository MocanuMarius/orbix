import {GUARDIAN_RELICS} from './guardian-artifacts.mjs?v=early-play-2';
import {GLOW_DISPLAY_SCALE} from './vitality.mjs?v=early-play-2';
import {sparkMass} from './spark-size.mjs?v=early-play-2';

// All counters belong to one attempt. No reaction dispatches a second pickup.
export class GuardianReactions {
  constructor(effects){
    this.effects=effects;this.engine=effects.engine;
    this.held=new Set([...effects.mounted].filter(id=>Object.hasOwn(GUARDIAN_RELICS,id)));
    this.uses={};this.last={};this.paid=0;this.work=0;
    this.chaliceMask=0;this.pendingChalice=false;this.twinTier=0;
    this.lastCoastLift=null;this.beacon=[];this.openingLifts=0;
  }
  proc(id,limit,action,interval=0){
    const e=this.engine;
    if(!this.held.has(id)||(this.uses[id]||0)>=limit||e.time-(this.last[id]??-Infinity)<interval)return 0;
    const beforeFuel=e.flame,beforeLift=this.effects.storedLift,beforeSight=Math.max(e.pickupRevealHoldUntil||0,this.effects.sightUntil||0);
    const value=action();
    if(!value)return 0;
    this.uses[id]=(this.uses[id]||0)+1;this.last[id]=e.time;
    const outcome={};
    if(e.flame>beforeFuel)outcome.fuel=e.flame-beforeFuel;
    if(!beforeLift&&this.effects.storedLift)outcome.lifts=1;
    const sight=Math.max(e.pickupRevealHoldUntil||0,this.effects.sightUntil||0);
    if(sight>beforeSight)outcome.reveal=Math.max(0,sight-e.time);
    if(['restless-feather','ascent-chime'].includes(id)&&typeof value==='number')outcome.recovery=value;
    this.effects.activate(id,outcome,{priority:id==='rescue-wick'?8:0});
    this.effects.notice(id);e.burst(e.player.x,e.player.y,4,'#e1bbef');
    return value;
  }
  restore(points){
    const e=this.engine,gain=Math.min(points/GLOW_DISPLAY_SCALE,Math.max(0,e.maxFlame-e.flame));
    e.flame+=gain;e.flameRestored+=gain;return gain;
  }
  storeLift(id){
    if(this.effects.storedLift)return false;
    this.effects.storedLift=id;return true;
  }
  start(){
    if(this.held.has('first-light-standard')){this.openingLifts=3;this.effects.notice('first-light-standard');this.effects.activate('first-light-standard',{lifts:3});}
    for(const id of ['black-atlas','storm-keel','sunken-vault'])if(this.held.has(id))this.effects.notice(id,'passive');
  }
  lift(){
    const e=this.engine;
    this.paid++;
    if(e.flame*GLOW_DISPLAY_SCALE<=3+1e-7)this.proc('rescue-wick',1,()=>this.restore(9));
    if(this.pendingChalice){this.proc('threefold-chalice',2,()=>this.restore(9));this.pendingChalice=false;}
    if(this.paid%5===0)this.proc('restless-feather',3,()=>e.quickenCompanionRecovery(null,4));
    if(e.blackHoles?.active&&e.blackHoles.rate>0)this.proc('undertow-pearl',2,()=>{
      this.restore(6);e.revealFromPickup(true);return true;
    },5);
    if(e.time>=15)this.proc('pilgrims-clock',3,()=>this.restore(6),15);
  }
  companion(){
    if(this.held.has('relay-moth')&&++this.work%2===0)this.proc('relay-moth',3,()=>this.restore(6));
  }
  pickup(packet,spec,surplus,cleansed){
    const e=this.engine,body=!packet.deliveredByWisp;
    if(!spec.plasma)return 0;
    let restored=0;
    if(body&&this.held.has('galespun-spindle')&&e.gustState().active)this.proc('galespun-spindle',3,()=>this.storeLift('galespun-spindle'));
    if(body&&e.player.vy>0)this.proc('moonwake-lens',3,()=>{e.revealFromPickup(true);return true;},6);
    if(body&&e.player.vy<0)this.proc('ascent-chime',4,()=>e.quickenCompanionRecovery(null,3));
    if(this.held.has('threefold-chalice')&&!this.pendingChalice){
      const mass=sparkMass(packet);
      if(mass>=1 && mass<=3){
        this.chaliceMask|=1<<(mass-1);
        if(this.chaliceMask===7){this.pendingChalice=true;this.chaliceMask=0;}
      }
    }
    if(surplus>0)this.proc('salt-crown',3,()=>this.storeLift('salt-crown'));
    if(this.held.has('twin-lanterns')){
      // Match the actual charge, not just the cached white plasma atlas shape.
      const mass=spec.fuel;
      if(this.twinTier===mass){restored+=this.proc('twin-lanterns',3,()=>this.restore(6));this.twinTier=0;}
      else this.twinTier=mass;
    }
    if(body&&e.lastFlapTime>=0&&e.time-e.lastFlapTime>=1.2&&e.lastFlapTime!==this.lastCoastLift){
      const bonus=this.proc('stillwater-bell',3,()=>this.restore(6));
      if(bonus){this.lastCoastLift=e.lastFlapTime;restored+=bonus;}
    }
    if(cleansed)this.proc('eclipse-mirror',3,()=>{restored+=this.restore(6);e.revealFromPickup(true);return true;});
    if(this.held.has('beacon-chain')){
      this.beacon=this.beacon.filter(at=>e.time-at<=5);this.beacon.push(e.time);
      if(this.beacon.length===3){
        this.proc('beacon-chain',3,()=>{
          if(this.effects.sightUntil<=e.time)this.effects.sightStartedAt=e.time;
          this.effects.sightUntil=Math.max(this.effects.sightUntil,e.time+5);return true;
        });this.beacon.length=0;
      }
    }
    return restored;
  }
}
