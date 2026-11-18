import {drawCollectorGuard} from './collector-guard-art.mjs?v=fast-4';

// Reach is carried by the real Collector orbit. Only the discrete Last Orbit
// defense keeps a body cue; ordinary fetch and Field Impulse never paint a rim.
export function drawCollectorField(ctx,engine,{scale=1,playerY=engine.renderPlayerY??engine.player.y}={}){
  const aura=engine.getCollectorAuraState?.();
  if(!aura?.active)return;
  drawCollectorGuard(ctx,aura,engine.player.x*scale,playerY*scale,scale,engine.reducedMotion);
}
