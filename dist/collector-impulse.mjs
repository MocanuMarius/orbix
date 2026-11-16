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
  const sources=clamp(Math.floor(Number(engine.mod.cardFieldSources)||Number(engine.mod.cardFieldMultiplier)||1),1,9);
  // Every effective source adds one base duration. Physics still runs once at
  // its native ring-scaled strength, with one ring spend and one recovery.
  const duration=FIELD_IMPULSE_TUNING.duration*strength*sources;
  engine.fieldImpulse={direction,strength,sources,multiplier:sources,duration,startedAt:engine.time,until:engine.time+duration,targetY:engine.player.y};
  const wisp=engine.wisp;
  wisp.phase='cooldown';wisp.cooldownMax=wisp.cooldown=wisp.recoveryDuration(engine);
  wisp.contacts.length=0;wisp.contactTimes.clear();
  engine._auraUntil=-1;
  engine.lastHintInputTime=engine.time;
  if(direction==='up')engine.player.vy*=1-strength;
  else if(direction==='down')engine.player.vy=Math.max(engine.player.vy,FIELD_IMPULSE_TUNING.dive*strength*engine.scaleY);
  engine.activation('collector-field-impulse',{outcome:{direction,duration,strength,sources,multiplier:sources}});
  engine.setEvent(`Field Impulse · ${direction==='up'?'levitate':direction==='down'?'dive':'surge'} · ${Number(duration.toFixed(2))}s`);
  engine.burst(engine.player.x,engine.player.y,5,'#b9dfa0');
  engine.sound('boost');
  return true;
}

export function fieldImpulseSpeed(engine){
  const impulse=engine.fieldImpulse;
  return impulse?.direction==='right'&&impulse.until>engine.time?1+FIELD_IMPULSE_TUNING.surge*impulse.strength:1;
}

// Apply after all wind/other acceleration and before the normal terminal clamp.
// This keeps Dive useful throughout its duration without amplifying its force.
export function fieldImpulseVelocity(engine,velocity){
  const impulse=engine.fieldImpulse;
  return impulse?.direction==='down'&&impulse.until>engine.time
    ?Math.max(velocity,FIELD_IMPULSE_TUNING.dive*impulse.strength*engine.scaleY):velocity;
}

export function fieldImpulseGravity(engine,gravity){
  const impulse=engine.fieldImpulse;
  if(impulse?.direction!=='up'||impulse.until<=engine.time)return gravity;
  const hold=clamp((impulse.targetY-engine.player.y)*26-engine.player.vy*9,-350*engine.scaleY,350*engine.scaleY);
  return gravity+(hold-gravity)*impulse.strength;
}
