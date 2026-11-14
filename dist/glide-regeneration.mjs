export function updateGlideRegeneration(e,dt){
 const rank=e.mod.glideRegenRank||0;e.glidingRegen=false;
 if(!rank||!e.alive||e.paused||e.dying||e.completing||e.finished)return;
 const assisted=e.liftHeld||e.boostTime>0||e.abilityTime>0||e.dream?.active||e.dream?.freeGlow;
 const idle=e.time-(e.lastFlapTime||0),delay=rank>1?1:1.5;
 if(assisted||e.player.vy<=0||idle<delay)return;
 const remaining=(rank>1?30:20)-(e.glideRegenerated||0),amount=Math.max(0,Math.min((rank>1?20/3:10/3)*dt,remaining,e.maxFlame-e.flame));
 if(amount<=0)return;
 e.flame+=amount;e.glideRegenerated=(e.glideRegenerated||0)+amount;e.flameRestored+=amount;e.glidingRegen=true;
}
