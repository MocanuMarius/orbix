const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
export const FIELD_IMPULSE_TUNING=Object.freeze({minimumRecovery:.25,duration:.8,surge:.48,dive:200});

export function fieldImpulseStrength(engine){
  const wisp=engine.wisp;
  if(!engine.mod.collectorFieldImpulse||!engine.hasCompanion('collector')||!wisp
    ||!engine.running||engine.paused||engine.finished||engine.destroyed||!engine.alive
    ||engine.dying||engine.completing||engine.tutorial||engine.tutorialAwaitingLift||engine.liftHeld
    ||!['ready','cooldown'].includes(wisp.phase)||wisp.target||wisp.cargo||wisp.leg
    ||(engine.fieldImpulse?.until||0)>engine.time
    ||wisp.recoveryFraction()+1e-7<FIELD_IMPULSE_TUNING.minimumRecovery)return 0;
  // The recovering field has a nonzero minimum radius. Charge gates activation;
  // the actual visible radius determines the strength available on this swipe.
  return clamp(wisp.currentRange(engine)/Math.max(.001,wisp.range(engine)),0,1);
}

export function activateFieldImpulse(engine,direction){
  if(!['up','down','right'].includes(direction))return false;
  const strength=fieldImpulseStrength(engine);
  if(!strength)return false;
  const duration=FIELD_IMPULSE_TUNING.duration*strength;
  engine.fieldImpulse={direction,strength,startedAt:engine.time,until:engine.time+duration,targetY:engine.player.y};
  const wisp=engine.wisp;
  wisp.phase='cooldown';wisp.cooldownMax=wisp.cooldown=wisp.recoveryDuration(engine);
  wisp.contacts.length=0;wisp.contactTimes.clear();
  engine._auraUntil=-1;
  engine.lastHintInputTime=engine.time;
  if(direction==='up')engine.player.vy*=1-strength;
  else if(direction==='down')engine.player.vy=Math.max(engine.player.vy,FIELD_IMPULSE_TUNING.dive*strength*engine.scaleY);
  engine.activation('collector-field-impulse',{outcome:{direction,duration,strength}});
  engine.setEvent(`Field Impulse · ${direction==='up'?'levitate':direction==='down'?'dive':'surge'}`);
  engine.burst(engine.player.x,engine.player.y,5,'#b9dfa0');
  engine.sound('boost');engine.notify();
  return true;
}

export function fieldImpulseSpeed(engine){
  const impulse=engine.fieldImpulse;
  return impulse?.direction==='right'&&impulse.until>engine.time?1+FIELD_IMPULSE_TUNING.surge*impulse.strength:1;
}

export function fieldImpulseGravity(engine,gravity){
  const impulse=engine.fieldImpulse;
  if(impulse?.direction!=='up'||impulse.until<=engine.time)return gravity;
  const hold=clamp((impulse.targetY-engine.player.y)*26-engine.player.vy*9,-350*engine.scaleY,350*engine.scaleY);
  return gravity+(hold-gravity)*impulse.strength;
}
